"""ORBITALYTICS — Forecast Routes"""
import logging
import time
from typing import Optional
from fastapi import APIRouter, Query, Depends
from app.models.schemas import ForecastResponse, ForecastConfig, ForecastPoint
from app.services.data_loader import get_data_loader, DataLoader

router = APIRouter()
log = logging.getLogger(__name__)


def _build_forecast_response(
    loader: DataLoader,
    country: str,
    mission_type: str,
    horizon_years: int,
    model_name: Optional[str] = None,
) -> ForecastResponse:
    """Common logic for building forecast responses."""
    model_data = loader.get_model_comparison()
    available_models = model_data.get("models", {})
    best_model = model_data.get("best_model", "Linear Regression")

    # Select model: user-specified if available, else best
    active_model_name = model_name if model_name and model_name in available_models else best_model
    active_metrics = available_models.get(active_model_name, {}).get("metrics", {})

    forecast_df = loader.get_forecast(
        country=country if country.lower() not in ("all", "global") else None,
        mission_type=mission_type if mission_type.lower() != "all" else None,
        include_historical=True,
    )

    if forecast_df.empty:
        return ForecastResponse(
            config=ForecastConfig(country=country, mission_type=mission_type, horizon_years=horizon_years),
            data=[],
            model_used=active_model_name,
            model_metrics=active_metrics,
            forecast_growth_pct=0.0,
            confidence_info="No forecast data available. Run the ML pipeline first.",
            historical_count=0,
            forecast_count=0,
            processing_info={"status": "no_data", "hint": "Run backend/spark/ml_pipeline.py"},
        )

    # If model is different from default, rescale confidence bounds based on selected model RMSE
    model_rmse = float(active_metrics.get("rmse", 1.2))

    # Aggregate across country/mission_type if "All" selected
    if mission_type.lower() == "all":
        grouped = forecast_df.groupby(["year", "is_forecast"]).agg(
            forecast_value=("forecast_value", "sum"),
            actual_demand=("actual_demand", "sum"),
            lower_bound=("lower_bound", "sum"),
            upper_bound=("upper_bound", "sum"),
        ).reset_index()
        grouped["country"] = country
        grouped["mission_type"] = "All"
        grouped["model_used"] = active_model_name
        grouped["model_rmse"] = model_rmse
        forecast_df = grouped

    # Recalculate dynamic bounds based on active model RMSE
    forecast_df["lower_bound"] = (forecast_df["forecast_value"] - model_rmse * 1.5).clip(lower=0.0)
    forecast_df["upper_bound"] = forecast_df["forecast_value"] + model_rmse * 1.5

    # Limit to max_year in historical + horizon years
    if not forecast_df.empty:
        import pandas as pd
        historical = forecast_df[forecast_df["is_forecast"] == False]
        future = forecast_df[forecast_df["is_forecast"] == True]
        if not historical.empty:
            max_hist_year = int(historical["year"].max())
            future = future[future["year"] <= max_hist_year + horizon_years]
        forecast_df = pd.concat([historical, future], ignore_index=True).sort_values("year")

    # Compute growth
    hist_vals = forecast_df[forecast_df["is_forecast"] == False]["actual_demand"].dropna()
    fore_vals = forecast_df[forecast_df["is_forecast"] == True]["forecast_value"].dropna()
    forecast_growth = 0.0
    if not hist_vals.empty and not fore_vals.empty:
        baseline = float(hist_vals.iloc[-1]) if len(hist_vals) > 0 else 1.0
        final_forecast = float(fore_vals.iloc[-1]) if len(fore_vals) > 0 else baseline
        if baseline > 0:
            forecast_growth = round((final_forecast - baseline) / baseline * 100, 2)

    points = []
    for _, row in forecast_df.iterrows():
        is_fc = bool(row.get("is_forecast", False))
        pts_country = str(row.get("country", country))
        pts_mtype = str(row.get("mission_type", mission_type))
        points.append(ForecastPoint(
            year=int(row["year"]),
            quarter=int(row["quarter"]) if "quarter" in row and row.get("quarter") is not None else None,
            country=pts_country if pts_country and pts_country != "nan" else country,
            mission_type=pts_mtype if pts_mtype and pts_mtype != "nan" else mission_type,
            forecast_value=round(float(row.get("forecast_value", 0)), 2),
            lower_bound=round(float(row["lower_bound"]), 2) if row.get("lower_bound") is not None else None,
            upper_bound=round(float(row["upper_bound"]), 2) if row.get("upper_bound") is not None else None,
            actual_demand=round(float(row["actual_demand"]), 2) if not is_fc and row.get("actual_demand") is not None else None,
            is_forecast=is_fc,
        ))

    hist_count = len([p for p in points if not p.is_forecast])
    fore_count = len([p for p in points if p.is_forecast])

    return ForecastResponse(
        config=ForecastConfig(country=country, mission_type=mission_type, horizon_years=horizon_years),
        data=points,
        model_used=active_model_name,
        model_metrics=active_metrics,
        forecast_growth_pct=forecast_growth,
        confidence_info=(
            f"Confidence bounds = forecast ± {active_metrics.get('rmse', 'N/A')} × 1.5 (RMSE-based). "
            f"R²={active_metrics.get('r2', 'N/A')}"
        ),
        historical_count=hist_count,
        forecast_count=fore_count,
        processing_info={
            "model": active_model_name,
            "source": "Spark MLlib → Parquet",
            "pipeline": "PySpark feature engineering → MLlib → forecast Parquet",
        },
    )


@router.get("/forecast", response_model=ForecastResponse)
async def get_forecast(
    country: str = Query("Global", description="Country or 'Global'"),
    mission_type: str = Query("All", description="Mission type or 'All'"),
    horizon_years: int = Query(3, ge=1, le=5, description="Forecast horizon in years"),
    model_name: Optional[str] = Query(None, description="Select model: 'Linear Regression', 'Random Forest', or 'Gradient Boosted Trees'"),
    loader: DataLoader = Depends(get_data_loader),
):
    """Generate demand forecast for given region, mission type, and Spark MLlib model."""
    return _build_forecast_response(loader, country, mission_type, horizon_years, model_name)


@router.get("/forecast/{country}", response_model=ForecastResponse)
async def get_country_forecast(
    country: str,
    mission_type: str = Query("All"),
    horizon_years: int = Query(3, ge=1, le=5),
    model_name: Optional[str] = Query(None),
    loader: DataLoader = Depends(get_data_loader),
):
    """Get forecast for a specific country with optional model selection."""
    return _build_forecast_response(loader, country, mission_type, horizon_years, model_name)
