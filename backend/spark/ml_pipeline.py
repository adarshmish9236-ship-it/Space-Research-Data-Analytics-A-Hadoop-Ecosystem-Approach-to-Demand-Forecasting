"""
ORBITALYTICS — Spark MLlib Forecasting Pipeline
================================================
Implements three ML models for space demand forecasting:
  1. Linear Regression (baseline)
  2. Random Forest Regression
  3. Gradient Boosted Trees (GBT)

Pipeline:
  Load demand data -> Feature Assembly -> Train/Test Split (time-based) ->
  Train 3 models -> Evaluate (MAE, RMSE, R², MAPE) ->
  Compare -> Auto-select best -> Generate forecasts -> Save

NOTE: Uses Spark MLlib exclusively. No scikit-learn for model training.
"""

import os
import sys
import json
import time
import math
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

sys.path.insert(0, str(Path(__file__).parent))
from etl_pipeline import create_spark_session, DATA_PROCESSED, DATA_ANALYTICS

from pyspark.sql import SparkSession, DataFrame
from pyspark.sql import functions as F
from pyspark.sql.types import (
    StructType, StructField, StringType, IntegerType,
    DoubleType, BooleanType,
)
from pyspark.ml import Pipeline, PipelineModel
from pyspark.ml.feature import VectorAssembler, StringIndexer, StandardScaler
from pyspark.ml.regression import (
    LinearRegression,
    RandomForestRegressor,
    GBTRegressor,
)
from pyspark.ml.evaluation import RegressionEvaluator
from pyspark.ml.tuning import CrossValidator, ParamGridBuilder

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [ML] %(levelname)s %(message)s",
)
log = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).parent.parent.parent
MODELS_DIR = str(PROJECT_ROOT / "models" / "saved")
DATA_ANALYTICS = str(PROJECT_ROOT / "data" / "analytics")
DATA_PROCESSED = str(PROJECT_ROOT / "data" / "processed")

# Feature columns used for training (no data leakage - no future-only info)
FEATURE_COLS = [
    "year_scaled",
    "quarter",
    "prev_1_demand",
    "prev_2_demand",
    "prev_4_demand",
    "rolling_3_demand",
    "rolling_5_demand",
    "rolling_8_demand",
    "growth_rate",
    "satellite_count",
    "success_rate",
    "payload_total_kg_scaled",
    "country_idx",
    "mission_type_idx",
    "decade_scaled",
]

TARGET_COL = "mission_count"


def load_demand_data(spark: SparkSession) -> DataFrame:
    """Load the processed demand table from Parquet via Pandas (bypasses Windows Hadoop NativeIO)."""
    import pandas as pd
    demand_path = f"{DATA_ANALYTICS}/demand"
    log.info(f"Loading demand data from: {demand_path}")
    
    # Use pandas/pyarrow to read the parquet directory, then convert to Spark DataFrame
    pdf = pd.read_parquet(demand_path, engine="pyarrow")
    
    # Ensure types match before creating Spark DataFrame
    # Sometimes pyarrow reads integers as int64, which Spark translates to LongType
    # but the ML pipeline expects IntegerType or DoubleType for certain features
    
    df = spark.createDataFrame(pdf)
    count = df.count()
    log.info(f"  Loaded {count:,} demand rows via PyArrow")
    return df


def prepare_features(df: DataFrame) -> DataFrame:
    """
    Prepare features for ML training.

    Key decisions:
    - StringIndexer for country and mission_type (ordinal encoding)
    - Scaled payload (payload_total_kg / 1000 to normalize magnitude)
    - decade_scaled = (decade - 1950) / 80 (normalize to [0,1])
    - All lag/rolling features already computed in ETL
    """
    # String indexers for categorical columns
    country_indexer = StringIndexer(
        inputCol="country",
        outputCol="country_idx",
        handleInvalid="keep",
    )
    mission_type_indexer = StringIndexer(
        inputCol="mission_type",
        outputCol="mission_type_idx",
        handleInvalid="keep",
    )

    df = df.withColumn(
        "payload_total_kg_scaled",
        F.col("payload_total_kg") / 1000.0
    ).withColumn(
        "decade_scaled",
        (F.col("decade") - 1950.0) / 80.0
    )

    # Apply string indexers
    country_model = country_indexer.fit(df)
    df = country_model.transform(df)

    mission_type_model = mission_type_indexer.fit(df)
    df = mission_type_model.transform(df)

    # Fill nulls in feature columns
    fill_vals = {c: 0.0 for c in FEATURE_COLS}
    df = df.fillna(fill_vals)

    return df, country_model, mission_type_model


def time_based_split(df: DataFrame, split_year: int = 2020) -> Tuple[DataFrame, DataFrame]:
    """
    Split data temporally to prevent data leakage.
    Training: year <= split_year
    Test:     year >  split_year
    """
    train = df.filter(F.col("year") <= split_year)
    test  = df.filter(F.col("year") >  split_year)
    train_count = train.count()
    test_count  = test.count()
    log.info(
        f"Train/test split at year {split_year}: "
        f"train={train_count:,}, test={test_count:,}"
    )
    return train, test


def build_model_pipeline(
    model_type: str,
    feature_cols: List[str] = FEATURE_COLS,
) -> Pipeline:
    """
    Build a Spark ML Pipeline for a given model type.

    Args:
        model_type: 'linear', 'random_forest', or 'gbt'

    Returns:
        Configured Pipeline
    """
    assembler = VectorAssembler(
        inputCols=feature_cols,
        outputCol="features_raw",
        handleInvalid="keep",
    )
    scaler = StandardScaler(
        inputCol="features_raw",
        outputCol="features",
        withMean=True,
        withStd=True,
    )

    if model_type == "linear":
        regressor = LinearRegression(
            featuresCol="features",
            labelCol=TARGET_COL,
            predictionCol="prediction",
            maxIter=200,
            regParam=0.01,
            elasticNetParam=0.0,
        )
    elif model_type == "random_forest":
        regressor = RandomForestRegressor(
            featuresCol="features",
            labelCol=TARGET_COL,
            predictionCol="prediction",
            numTrees=100,
            maxDepth=8,
            seed=42,
        )
    elif model_type == "gbt":
        regressor = GBTRegressor(
            featuresCol="features",
            labelCol=TARGET_COL,
            predictionCol="prediction",
            maxIter=100,
            maxDepth=6,
            stepSize=0.1,
            seed=42,
        )
    else:
        raise ValueError(f"Unknown model type: {model_type}")

    return Pipeline(stages=[assembler, scaler, regressor])


def compute_metrics(
    predictions: DataFrame,
    target_col: str = TARGET_COL,
) -> Dict[str, float]:
    """
    Compute regression metrics: MAE, RMSE, R², MAPE.
    All computed in Spark (distributed).
    """
    evaluator_rmse = RegressionEvaluator(
        labelCol=target_col, predictionCol="prediction", metricName="rmse"
    )
    evaluator_mae = RegressionEvaluator(
        labelCol=target_col, predictionCol="prediction", metricName="mae"
    )
    evaluator_r2 = RegressionEvaluator(
        labelCol=target_col, predictionCol="prediction", metricName="r2"
    )

    rmse = evaluator_rmse.evaluate(predictions)
    mae  = evaluator_mae.evaluate(predictions)
    r2   = evaluator_r2.evaluate(predictions)

    # MAPE = mean |actual - predicted| / |actual| * 100
    # Only where actual > 0 to avoid division by zero
    mape_df = predictions.filter(
        F.col(target_col) > 0
    ).select(
        F.avg(
            F.abs(F.col(target_col) - F.col("prediction")) / F.col(target_col)
        ).alias("mape")
    )
    mape_row = mape_df.collect()
    mape = mape_row[0]["mape"] * 100 if mape_row and mape_row[0]["mape"] is not None else None

    return {
        "rmse": round(rmse, 4),
        "mae":  round(mae, 4),
        "r2":   round(r2, 4),
        "mape": round(mape, 2) if mape is not None else None,
    }


def train_and_evaluate(
    spark: SparkSession,
    train_df: DataFrame,
    test_df: DataFrame,
) -> Dict[str, dict]:
    """
    Train all three models and evaluate on test set.

    Returns:
        Dict of {model_name: {"metrics": {...}, "model": PipelineModel, "train_time_s": float}}
    """
    models_config = [
        ("Linear Regression", "linear"),
        ("Random Forest",     "random_forest"),
        ("Gradient Boosted Trees", "gbt"),
    ]
    results = {}

    for display_name, model_type in models_config:
        log.info(f"\nTraining: {display_name}")
        t0 = time.time()

        pipeline = build_model_pipeline(model_type)

        try:
            model = pipeline.fit(train_df)
            train_time = round(time.time() - t0, 2)

            predictions = model.transform(test_df)
            metrics = compute_metrics(predictions)

            log.info(
                f"  {display_name}: "
                f"RMSE={metrics['rmse']:.4f}  "
                f"MAE={metrics['mae']:.4f}  "
                f"R2={metrics['r2']:.4f}  "
                f"MAPE={metrics['mape']}%  "
                f"[{train_time}s]"
            )

            results[display_name] = {
                "model_type": model_type,
                "model": model,
                "metrics": metrics,
                "train_time_s": train_time,
            }
        except Exception as e:
            log.error(f"  {display_name} failed: {e}")
            results[display_name] = {
                "model_type": model_type,
                "model": None,
                "metrics": {"rmse": 999.0, "mae": 999.0, "r2": -999.0, "mape": None},
                "train_time_s": 0.0,
                "error": str(e),
            }

    return results


def select_best_model(results: Dict[str, dict]) -> str:
    """
    Auto-select the best model based on lowest RMSE on test set.

    Returns:
        Name of the best model
    """
    best_name = min(
        [name for name, r in results.items() if r["model"] is not None],
        key=lambda name: results[name]["metrics"]["rmse"],
    )
    log.info(f"Best model selected: {best_name} (RMSE={results[best_name]['metrics']['rmse']})")
    return best_name


def generate_future_features(
    spark: SparkSession,
    demand_df: DataFrame,
    country_model,
    mission_type_model,
    horizon_years: int = 3,
) -> DataFrame:
    """
    Generate feature rows for future years (forecast input).

    Strategy: For each (country, mission_type) combination,
    extrapolate features forward using the last known values.
    """
    # Get the max year in the data
    max_year_row = demand_df.agg(F.max("year")).collect()
    max_year = max_year_row[0][0] if max_year_row else 2025

    # Get distinct country/mission_type combinations with their latest stats
    latest_stats = demand_df.groupBy("country", "mission_type").agg(
        F.last("year").alias("last_year"),
        F.last("rolling_5_demand", ignorenulls=True).alias("base_demand"),
        F.last("growth_rate", ignorenulls=True).alias("base_growth"),
        F.last("satellite_count", ignorenulls=True).alias("satellite_count"),
        F.last("success_rate", ignorenulls=True).alias("success_rate"),
        F.last("payload_total_kg", ignorenulls=True).alias("payload_total_kg"),
        F.last("rolling_3_demand", ignorenulls=True).alias("rolling_3_demand"),
        F.last("rolling_5_demand", ignorenulls=True).alias("rolling_5_demand"),
        F.last("rolling_8_demand", ignorenulls=True).alias("rolling_8_demand"),
        F.last("mission_count", ignorenulls=True).alias("prev_1_demand"),
    ).fillna({"base_demand": 0.0, "base_growth": 0.0})

    # Create future rows: for each combination, generate next N years
    future_rows = []
    latest_list = latest_stats.collect()

    for row in latest_list:
        base_d = float(row["base_demand"] or 0)
        growth = float(row["base_growth"] or 0)

        for y_offset in range(1, horizon_years + 1):
            future_year = max_year + y_offset
            # Project demand forward using rolling average + growth trend
            projected = base_d * (1 + growth * 0.5) ** y_offset
            projected = max(0.0, projected)

            future_rows.append({
                "country":       row["country"],
                "mission_type":  row["mission_type"],
                "year":          int(future_year),
                "quarter":       2,  # Use Q2 as representative
                "year_scaled":   (future_year - 1957.0) / (2025.0 - 1957.0),
                "decade":        int(future_year // 10 * 10),
                "decade_scaled": (float(future_year // 10 * 10) - 1950.0) / 80.0,
                "prev_1_demand": float(row["prev_1_demand"] or 0),
                "prev_2_demand": float(row["rolling_3_demand"] or 0),
                "prev_4_demand": float(row["rolling_5_demand"] or 0),
                "rolling_3_demand": float(row["rolling_3_demand"] or 0),
                "rolling_5_demand": float(row["rolling_5_demand"] or 0),
                "rolling_8_demand": float(row["rolling_8_demand"] or 0),
                "growth_rate":   float(row["base_growth"] or 0),
                "satellite_count": float(row["satellite_count"] or 0),
                "success_rate":  float(row["success_rate"] or 0.9),
                "payload_total_kg": float(row["payload_total_kg"] or 0),
                "payload_total_kg_scaled": float(row["payload_total_kg"] or 0) / 1000.0,
                "is_forecast":   True,
            })

    future_df = spark.createDataFrame(future_rows)

    # Apply string indexers (use same fitted models)
    future_df = country_model.transform(future_df)
    future_df = mission_type_model.transform(future_df)
    future_df = future_df.fillna({c: 0.0 for c in FEATURE_COLS})

    return future_df


def save_model_comparison(results: Dict[str, dict], best_name: str) -> str:
    """Save model comparison results to JSON."""
    os.makedirs(MODELS_DIR, exist_ok=True)
    comparison = {
        "models": {},
        "best_model": best_name,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }
    for name, r in results.items():
        comparison["models"][name] = {
            "model_type":    r["model_type"],
            "metrics":       r["metrics"],
            "train_time_s":  r.get("train_time_s", 0),
            "is_best":       name == best_name,
        }

    path = os.path.join(MODELS_DIR, "model_comparison.json")
    with open(path, "w") as f:
        json.dump(comparison, f, indent=2)
    log.info(f"Model comparison saved: {path}")
    return path


def save_forecast_results(
    spark: SparkSession,
    demand_df: DataFrame,
    best_model: PipelineModel,
    best_name: str,
    best_metrics: dict,
    future_df: DataFrame,
    horizon_years: int = 3,
) -> None:
    """Combine historical + forecast results and write to Parquet."""
    # Historical predictions on full demand dataset
    hist_preds = best_model.transform(demand_df).select(
        "year", "quarter", "country", "mission_type",
        F.col(TARGET_COL).alias("actual_demand"),
        F.col("prediction").alias("forecast_value"),
    ).withColumn("is_forecast", F.lit(False))

    # Future predictions
    future_preds = best_model.transform(future_df).select(
        "year", "quarter", "country", "mission_type",
        F.lit(None).cast("double").alias("actual_demand"),
        F.col("prediction").alias("forecast_value"),
    ).withColumn("is_forecast", F.lit(True))

    rmse = best_metrics["rmse"]
    confidence_factor = 1.5

    all_preds = hist_preds.union(future_preds).withColumn(
        "lower_bound",
        F.col("forecast_value") - rmse * confidence_factor
    ).withColumn(
        "upper_bound",
        F.col("forecast_value") + rmse * confidence_factor
    ).withColumn(
        "model_used", F.lit(best_name)
    ).withColumn(
        "model_rmse", F.lit(float(rmse))
    ).withColumn(
        "model_r2", F.lit(float(best_metrics["r2"]))
    ).withColumn(
        "created_at", F.lit(time.strftime("%Y-%m-%dT%H:%M:%S"))
    )

    forecast_path = f"{DATA_ANALYTICS}/forecast"
    
    # Save via PyArrow (Pandas) to bypass Hadoop NativeIO
    pdf = all_preds.toPandas()
    import pyarrow as pa
    import pyarrow.parquet as pq
    import os
    
    os.makedirs(forecast_path, exist_ok=True)
    table = pa.Table.from_pandas(pdf)
    pq.write_table(table, os.path.join(forecast_path, "part-0.parquet"), compression="snappy")
    log.info(f"Forecast results written to: {forecast_path} (via PyArrow)")


def run_ml_pipeline(spark: SparkSession, horizon_years: int = 3) -> dict:
    """
    Execute the full ML forecasting pipeline.

    Returns:
        Pipeline results dict
    """
    overall_start = time.time()

    # ── Load data ──────────────────────────────────────────────────────────
    log.info("=" * 60)
    log.info("ML Pipeline: Loading demand data")
    log.info("=" * 60)
    demand_df = load_demand_data(spark)

    # ── Prepare features ───────────────────────────────────────────────────
    log.info("ML Pipeline: Preparing features")
    demand_featured, country_model, mission_type_model = prepare_features(demand_df)

    # Cache for reuse across model training
    demand_featured.cache()

    # ── Train/test split (time-based) ─────────────────────────────────────
    train_df, test_df = time_based_split(demand_featured, split_year=2020)

    # ── Train and evaluate all models ─────────────────────────────────────
    log.info("ML Pipeline: Training models")
    results = train_and_evaluate(spark, train_df, test_df)

    # ── Select best model ─────────────────────────────────────────────────
    best_name = select_best_model(results)
    best_model = results[best_name]["model"]
    best_metrics = results[best_name]["metrics"]

    # ── Save model comparison ─────────────────────────────────────────────
    comparison_path = save_model_comparison(results, best_name)

    # ── Save best model ───────────────────────────────────────────────────
    best_model_path = os.path.join(MODELS_DIR, "best_model")
    best_model.write().overwrite().save(best_model_path)
    log.info(f"Best model saved: {best_model_path}")

    # ── Generate future features ──────────────────────────────────────────
    log.info(f"ML Pipeline: Generating {horizon_years}-year forecast")
    future_df = generate_future_features(
        spark, demand_featured, country_model, mission_type_model, horizon_years
    )

    # ── Save forecast results ─────────────────────────────────────────────
    save_forecast_results(
        spark, demand_featured, best_model, best_name, best_metrics, future_df, horizon_years
    )

    total_time = round(time.time() - overall_start, 2)

    summary = {
        "best_model": best_name,
        "best_metrics": best_metrics,
        "model_comparison": {
            name: r["metrics"] for name, r in results.items()
        },
        "horizon_years": horizon_years,
        "total_time_s": total_time,
        "comparison_saved": comparison_path,
    }

    log.info("=" * 60)
    log.info("ML Pipeline complete")
    log.info(f"  Best model: {best_name}")
    log.info(f"  RMSE: {best_metrics['rmse']}  R2: {best_metrics['r2']}")
    log.info(f"  Total time: {total_time}s")
    log.info("=" * 60)

    return summary


if __name__ == "__main__":
    spark = create_spark_session(app_name="ORBITALYTICS_ML")
    try:
        summary = run_ml_pipeline(spark, horizon_years=3)
        print("\nML Pipeline Summary:")
        print(json.dumps(summary, indent=2, default=str))
    finally:
        spark.stop()
