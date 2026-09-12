"""
ORBITALYTICS — PySpark ETL Pipeline (Windows-Compatible)
=========================================================
Production-style ETL using Apache Spark for computation,
PyArrow for Parquet I/O (bypasses Windows NativeIO issues).

Pipeline:
  Read CSV → Validate → Clean → Normalize → Deduplicate →
  Transform → Join → Feature Engineer → Aggregate →
  Write Parquet (via PyArrow) → Register Hive Views

Architecture note: On Linux/Hadoop clusters, replace write_parquet_pyarrow()
with Spark's native df.write.parquet(). The computation pipeline is identical.
"""

import os
import sys
import time
import logging
from pathlib import Path

# Apply Windows/Java compatibility patches first
sys.path.insert(0, str(Path(__file__).parent))
from java26_patch import apply_java26_patch
apply_java26_patch()

from pyspark.sql import SparkSession, DataFrame
from pyspark.sql import functions as F
from pyspark.sql.types import (
    StructType, StructField, StringType, IntegerType, DoubleType, BooleanType,
)
from pyspark.sql.window import Window
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [ETL] %(levelname)s %(message)s",
)
log = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).parent.parent.parent
DATA_RAW       = str(PROJECT_ROOT / "data" / "raw")
DATA_PROCESSED = str(PROJECT_ROOT / "data" / "processed")
DATA_ANALYTICS = str(PROJECT_ROOT / "data" / "analytics")
WAREHOUSE_DIR  = str(PROJECT_ROOT / "data" / "hive_warehouse")


# ── SparkSession factory ───────────────────────────────────────────────────────
def create_spark_session(
    app_name: str = "ORBITALYTICS_ETL",
    master: str = "local[*]",
    driver_memory: str = "4g",
    log_level: str = "WARN",
) -> SparkSession:
    """Create SparkSession in local mode (Windows-compatible, no native Hadoop IO)."""
    spark = (
        SparkSession.builder
        .appName(app_name)
        .master(master)
        .config("spark.driver.memory", driver_memory)
        .config("spark.sql.adaptive.enabled", "true")
        .config("spark.sql.adaptive.coalescePartitions.enabled", "true")
        .config("spark.sql.shuffle.partitions", "8")
        .config("spark.sql.warehouse.dir", WAREHOUSE_DIR)
        # In-memory catalog — Hive DDL executed via SparkSQL views
        .config("spark.sql.catalogImplementation", "in-memory")
        # Disable native Hadoop library (not needed for local mode)
        .config("spark.hadoop.io.native.lib.available", "false")
        .getOrCreate()
    )
    spark.sparkContext.setLogLevel(log_level)
    log.info(f"SparkSession created: version={spark.version} master={master}")
    return spark


# ── Schemas ────────────────────────────────────────────────────────────────────
MISSIONS_SCHEMA = StructType([
    StructField("mission_id",       StringType(),  True),
    StructField("mission_name",     StringType(),  True),
    StructField("launch_date",      StringType(),  True),
    StructField("year",             IntegerType(), True),
    StructField("quarter",          IntegerType(), True),
    StructField("month",            IntegerType(), True),
    StructField("country",          StringType(),  True),
    StructField("agency",           StringType(),  True),
    StructField("mission_type",     StringType(),  True),
    StructField("launch_vehicle",   StringType(),  True),
    StructField("orbit",            StringType(),  True),
    StructField("payload_mass_kg",  DoubleType(),  True),
    StructField("success",          StringType(),  True),
    StructField("cost_million_usd", DoubleType(),  True),
])
LAUNCHES_SCHEMA = StructType([
    StructField("launch_id",        StringType(),  True),
    StructField("mission_id",       StringType(),  True),
    StructField("launch_date",      StringType(),  True),
    StructField("year",             IntegerType(), True),
    StructField("quarter",          IntegerType(), True),
    StructField("launch_site",      StringType(),  True),
    StructField("country",          StringType(),  True),
    StructField("vehicle",          StringType(),  True),
    StructField("payload_mass_kg",  DoubleType(),  True),
    StructField("mission_type",     StringType(),  True),
    StructField("success",          StringType(),  True),
    StructField("cost_million_usd", DoubleType(),  True),
    StructField("orbit",            StringType(),  True),
])
SATELLITES_SCHEMA = StructType([
    StructField("satellite_id",   StringType(),  True),
    StructField("mission_id",     StringType(),  True),
    StructField("satellite_name", StringType(),  True),
    StructField("country",        StringType(),  True),
    StructField("operator",       StringType(),  True),
    StructField("purpose",        StringType(),  True),
    StructField("launch_date",    StringType(),  True),
    StructField("year",           IntegerType(), True),
    StructField("quarter",        IntegerType(), True),
    StructField("orbit_type",     StringType(),  True),
    StructField("mass_kg",        DoubleType(),  True),
    StructField("status",         StringType(),  True),
])
AGENCIES_SCHEMA = StructType([
    StructField("agency_id",    StringType(),  True),
    StructField("agency_name",  StringType(),  True),
    StructField("country",      StringType(),  True),
    StructField("agency_type",  StringType(),  True),
    StructField("founded_year", IntegerType(), True),
    StructField("active",       StringType(),  True),
])


# ── Read ───────────────────────────────────────────────────────────────────────
def read_csv(spark: SparkSession, path: str, schema: StructType) -> DataFrame:
    log.info(f"Reading: {os.path.basename(path)}")
    return (spark.read
        .option("header", "true")
        .option("nullValue", "")
        .option("mode", "PERMISSIVE")
        .schema(schema)
        .csv(path)
    )


# ── Clean/Validate ─────────────────────────────────────────────────────────────
def clean_missions(df: DataFrame) -> DataFrame:
    df = df.filter(
        F.col("mission_id").isNotNull() &
        F.col("year").isNotNull() &
        F.col("year").between(1950, 2030) &
        F.col("payload_mass_kg").isNotNull() &
        (F.col("payload_mass_kg") > 0) &
        (F.col("payload_mass_kg") < 100_000)
    )
    df = df.withColumn("success",
        F.when(F.upper(F.col("success")).isin("TRUE", "1"), True)
         .when(F.upper(F.col("success")).isin("FALSE", "0"), False)
         .otherwise(False)
    )
    df = df.withColumn("launch_date_parsed",
        F.to_date(F.col("launch_date"), "yyyy-MM-dd")
    ).filter(F.col("launch_date_parsed").isNotNull())
    df = df.withColumn("country",      F.trim(F.col("country")))
    df = df.withColumn("mission_type", F.trim(F.col("mission_type")))
    df = df.withColumn("agency",       F.trim(F.col("agency")))
    df = df.fillna({"cost_million_usd": 0.0})
    # Deduplicate by mission_id
    w = Window.partitionBy("mission_id").orderBy("year")
    df = df.withColumn("_rn", F.row_number().over(w)).filter(F.col("_rn") == 1).drop("_rn")
    return df


def clean_satellites(df: DataFrame) -> DataFrame:
    df = df.filter(
        F.col("satellite_id").isNotNull() &
        F.col("year").between(1950, 2030) &
        (F.col("mass_kg") > 0)
    )
    df = df.withColumn("country",    F.trim(F.col("country")))
    df = df.withColumn("orbit_type", F.trim(F.col("orbit_type")))
    w = Window.partitionBy("satellite_id").orderBy("year")
    df = df.withColumn("_rn", F.row_number().over(w)).filter(F.col("_rn") == 1).drop("_rn")
    return df


def clean_launches(df: DataFrame) -> DataFrame:
    df = df.filter(
        F.col("launch_id").isNotNull() &
        F.col("year").between(1950, 2030) &
        (F.col("payload_mass_kg") > 0)
    )
    df = df.withColumn("success",
        F.when(F.upper(F.col("success")).isin("TRUE", "1"), True)
         .otherwise(False)
    )
    return df


# ── Feature engineering ────────────────────────────────────────────────────────
def add_time_features(df: DataFrame) -> DataFrame:
    return df.withColumn("year_scaled",
        (F.col("year") - 1957.0) / (2025.0 - 1957.0)
    ).withColumn("decade",
        (F.floor(F.col("year") / 10) * 10).cast("int")
    )


def build_demand_table(missions: DataFrame, launches: DataFrame, satellites: DataFrame) -> DataFrame:
    m_agg = missions.groupBy("year", "quarter", "country", "mission_type").agg(
        F.count("mission_id").alias("mission_count"),
        F.sum("payload_mass_kg").alias("payload_total_kg"),
        F.avg("payload_mass_kg").alias("avg_payload_kg"),
        F.avg(F.col("success").cast("int")).alias("success_rate"),
        F.sum("cost_million_usd").alias("total_cost_musd"),
    )
    s_agg = satellites.groupBy("year", "quarter", "country").agg(
        F.count("satellite_id").alias("satellite_count"),
    )
    l_agg = launches.groupBy("year", "quarter", "country", "mission_type").agg(
        F.count("launch_id").alias("launch_count"),
    )
    demand = m_agg.join(s_agg, on=["year", "quarter", "country"], how="left")
    demand = demand.join(l_agg, on=["year", "quarter", "country", "mission_type"], how="left")
    demand = demand.fillna({"satellite_count": 0, "launch_count": 0, "success_rate": 0.0})
    return demand


def add_lag_features(df: DataFrame) -> DataFrame:
    pw = Window.partitionBy("country", "mission_type").orderBy("year", "quarter")
    df = (df
        .withColumn("prev_1_demand",    F.lag("mission_count", 1).over(pw))
        .withColumn("prev_2_demand",    F.lag("mission_count", 2).over(pw))
        .withColumn("prev_4_demand",    F.lag("mission_count", 4).over(pw))
        .withColumn("rolling_3_demand", F.avg("mission_count").over(pw.rowsBetween(-2, 0)))
        .withColumn("rolling_5_demand", F.avg("mission_count").over(pw.rowsBetween(-4, 0)))
        .withColumn("rolling_8_demand", F.avg("mission_count").over(pw.rowsBetween(-7, 0)))
        .withColumn("growth_rate",
            F.when((F.col("prev_1_demand").isNotNull()) & (F.col("prev_1_demand") > 0),
                (F.col("mission_count") - F.col("prev_1_demand")) / F.col("prev_1_demand")
            ).otherwise(0.0)
        )
        .withColumn("cumulative_missions",
            F.sum("mission_count").over(pw.rowsBetween(Window.unboundedPreceding, 0))
        )
    )
    return df.fillna({
        "prev_1_demand": 0.0, "prev_2_demand": 0.0, "prev_4_demand": 0.0,
        "rolling_3_demand": 0.0, "rolling_5_demand": 0.0, "rolling_8_demand": 0.0,
        "growth_rate": 0.0,
    })


# ── Write Parquet via PyArrow (Windows NativeIO workaround) ───────────────────
def write_parquet_pyarrow(df: DataFrame, output_path: str, partition_cols: list = None) -> None:
    """
    Convert Spark DataFrame to Pandas then write Parquet via PyArrow.
    This is the Windows-compatible approach — avoids Hadoop NativeIO.
    On a real Linux cluster: use df.write.parquet(path, partitionBy=partition_cols)
    """
    log.info(f"Writing Parquet: {output_path}")
    os.makedirs(output_path, exist_ok=True)

    pdf = df.toPandas()

    if partition_cols:
        for val_combo, group in pdf.groupby(partition_cols):
            if not isinstance(val_combo, tuple):
                val_combo = (val_combo,)
            # Build partition directory path
            parts = []
            for col, val in zip(partition_cols, val_combo):
                parts.append(f"{col}={val}")
            part_dir = os.path.join(output_path, *parts)
            os.makedirs(part_dir, exist_ok=True)
            table = pa.Table.from_pandas(group.drop(columns=partition_cols, errors='ignore'))
            pq.write_table(table, os.path.join(part_dir, "part-0.parquet"),
                           compression="snappy")
    else:
        table = pa.Table.from_pandas(pdf)
        pq.write_table(table, os.path.join(output_path, "part-0.parquet"), compression="snappy")

    log.info(f"  -> Written {len(pdf):,} rows to {output_path}")


# ── Benchmark: CSV vs Parquet ─────────────────────────────────────────────────
def benchmark_csv_vs_parquet(
    spark: SparkSession,
    csv_path: str,
    parquet_path: str,
    schema: StructType,
) -> dict:
    """Compare CSV vs Parquet read performance (demonstrates columnar format advantage)."""
    t0 = time.time()
    csv_count = spark.read.option("header", "true").schema(schema).csv(csv_path).filter("year > 2010").count()
    csv_time = round(time.time() - t0, 3)

    t0 = time.time()
    # Read back the pyarrow-written parquet
    pq_df = spark.read.parquet(parquet_path)
    pq_count = pq_df.filter("year > 2010").count()
    pq_time = round(time.time() - t0, 3)

    speedup = round(csv_time / max(pq_time, 0.001), 2)
    log.info(f"Benchmark → CSV:{csv_time}s  Parquet:{pq_time}s  Speedup:{speedup}x")
    return {"csv_time_s": csv_time, "parquet_time_s": pq_time, "speedup_factor": speedup,
            "csv_count": csv_count, "parquet_count": pq_count}


# ── Register Hive-style views ──────────────────────────────────────────────────
def register_spark_sql_views(spark: SparkSession, dfs: dict) -> None:
    """
    Register DataFrames as Spark SQL temporary views.
    These are equivalent to Hive external tables for academic demonstration.
    The actual Hive DDL (create_tables.sql) shows the production schema.
    """
    for name, df in dfs.items():
        df.createOrReplaceTempView(name)
        count = df.count()
        log.info(f"  Hive view registered: space_analytics.{name} ({count:,} rows)")

    # Execute a sample Hive-equivalent query to demonstrate SQL analytics
    try:
        result = spark.sql("""
            SELECT country, COUNT(*) AS missions, AVG(payload_mass_kg) AS avg_payload
            FROM missions_processed
            GROUP BY country
            ORDER BY missions DESC
            LIMIT 5
        """)
        log.info("Sample Hive SQL query executed successfully:")
        for row in result.collect():
            log.info(f"  {row['country']}: {row['missions']} missions, {row['avg_payload']:.0f}kg avg")
    except Exception as e:
        log.warning(f"Sample SQL query skipped: {e}")


# ── Main ETL orchestrator ──────────────────────────────────────────────────────
def run_etl(spark: SparkSession) -> dict:
    stats = {}
    t_total = time.time()

    # ── Stage 1: Read ─────────────────────────────────────────────────────
    log.info("=" * 60)
    log.info("STAGE 1: Read raw CSV data from HDFS (local mirror)")
    t = time.time()
    missions_raw   = read_csv(spark, f"{DATA_RAW}/missions.csv",   MISSIONS_SCHEMA)
    launches_raw   = read_csv(spark, f"{DATA_RAW}/launches.csv",   LAUNCHES_SCHEMA)
    satellites_raw = read_csv(spark, f"{DATA_RAW}/satellites.csv", SATELLITES_SCHEMA)
    stats["raw_missions"]   = missions_raw.count()
    stats["raw_launches"]   = launches_raw.count()
    stats["raw_satellites"] = satellites_raw.count()
    stats["read_s"] = round(time.time() - t, 2)
    log.info(f"  Missions: {stats['raw_missions']:,} | Launches: {stats['raw_launches']:,} | Satellites: {stats['raw_satellites']:,}")

    # ── Stage 2: Validate + Clean ─────────────────────────────────────────
    log.info("STAGE 2: Validate + Clean + Normalize")
    t = time.time()
    missions_clean   = clean_missions(missions_raw)
    launches_clean   = clean_launches(launches_raw)
    satellites_clean = clean_satellites(satellites_raw)
    missions_clean   = add_time_features(missions_clean)
    stats["clean_missions"]   = missions_clean.count()
    stats["clean_satellites"] = satellites_clean.count()
    stats["clean_s"] = round(time.time() - t, 2)
    log.info(f"  Clean missions: {stats['clean_missions']:,} (dropped {stats['raw_missions']-stats['clean_missions']:,})")

    # ── Stage 3: Write processed Parquet (via PyArrow for Windows compat) ─
    log.info("STAGE 3: Write processed Parquet (HDFS /space/processed/)")
    t = time.time()
    write_parquet_pyarrow(missions_clean,   f"{DATA_PROCESSED}/missions",   partition_cols=["year"])
    write_parquet_pyarrow(satellites_clean, f"{DATA_PROCESSED}/satellites", partition_cols=["year"])
    write_parquet_pyarrow(launches_clean,   f"{DATA_PROCESSED}/launches",   partition_cols=["year"])
    stats["write_processed_s"] = round(time.time() - t, 2)

    # ── Stage 4: Build demand table ───────────────────────────────────────
    log.info("STAGE 4: Build space_demand analytical table")
    t = time.time()
    demand = build_demand_table(missions_clean, launches_clean, satellites_clean)
    demand = add_time_features(demand)
    demand = add_lag_features(demand)
    stats["demand_rows"] = demand.count()
    stats["demand_s"] = round(time.time() - t, 2)
    log.info(f"  Demand table: {stats['demand_rows']:,} rows")

    # ── Stage 5: Write analytics Parquet ──────────────────────────────────
    log.info("STAGE 5: Write analytics Parquet (HDFS /space/analytics/)")
    t = time.time()
    write_parquet_pyarrow(demand, f"{DATA_ANALYTICS}/demand", partition_cols=["year", "country"])

    # Yearly aggregation (Hive Query Q1 equivalent)
    yearly = missions_clean.groupBy("year").agg(
        F.count("mission_id").alias("total_missions"),
        F.avg(F.col("success").cast("int")).alias("success_rate"),
        F.sum("payload_mass_kg").alias("total_payload_kg"),
        F.avg("payload_mass_kg").alias("avg_payload_kg"),
        F.sum("cost_million_usd").alias("total_cost_musd"),
        F.countDistinct("country").alias("unique_countries"),
    ).orderBy("year")
    write_parquet_pyarrow(yearly, f"{DATA_ANALYTICS}/yearly")

    # Country aggregation (Hive Query Q2 equivalent)
    country_agg = missions_clean.groupBy("country", "year").agg(
        F.count("mission_id").alias("mission_count"),
        F.avg(F.col("success").cast("int")).alias("success_rate"),
        F.sum("payload_mass_kg").alias("total_payload_kg"),
        F.sum("cost_million_usd").alias("total_cost_musd"),
    )
    write_parquet_pyarrow(country_agg, f"{DATA_ANALYTICS}/country", partition_cols=["year"])

    # Mission-type aggregation (Hive Query Q3 equivalent)
    mt_agg = missions_clean.groupBy("mission_type", "year").agg(
        F.count("mission_id").alias("mission_count"),
        F.avg(F.col("success").cast("int")).alias("success_rate"),
        F.avg("payload_mass_kg").alias("avg_payload_kg"),
        F.sum("cost_million_usd").alias("total_cost_musd"),
    )
    write_parquet_pyarrow(mt_agg, f"{DATA_ANALYTICS}/mission_type")
    stats["write_analytics_s"] = round(time.time() - t, 2)

    # ── Stage 6: Register Hive-equivalent views ───────────────────────────
    log.info("STAGE 6: Register Hive SQL views (space_analytics database)")
    register_spark_sql_views(spark, {
        "missions_processed":   missions_clean,
        "satellites_processed": satellites_clean,
        "launches_processed":   launches_clean,
        "space_demand":         demand,
        "analytics_yearly":     yearly,
    })

    # ── Stage 7: Performance benchmark ───────────────────────────────────
    log.info("STAGE 7: CSV vs Parquet benchmark")
    benchmark = benchmark_csv_vs_parquet(
        spark,
        f"{DATA_RAW}/missions.csv",
        f"{DATA_PROCESSED}/missions",
        MISSIONS_SCHEMA,
    )
    stats["benchmark"] = benchmark

    stats["total_s"] = round(time.time() - t_total, 2)
    log.info("=" * 60)
    log.info(f"ETL COMPLETE in {stats['total_s']}s")
    log.info(f"  Benchmark speedup: {benchmark['speedup_factor']}x (Parquet vs CSV)")
    log.info("=" * 60)
    return stats


if __name__ == "__main__":
    spark = create_spark_session()
    try:
        result = run_etl(spark)
        import json
        print("\nETL Pipeline Statistics:")
        print(json.dumps(result, indent=2))
    finally:
        spark.stop()
