"""ORBITALYTICS — Dashboard Route"""
import logging
from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from app.models.schemas import DashboardResponse, KPIMetric
from app.services.data_loader import get_data_loader, DataLoader

router = APIRouter()
log = logging.getLogger(__name__)


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(loader: DataLoader = Depends(get_data_loader)):
    """Overview dashboard data: KPIs, trend, top countries/mission types."""
    stats = loader.get_summary_stats()
    trend_df = loader.get_global_demand_trend()
    countries_df = loader.get_country_analytics()
    mission_types_df = loader.get_mission_type_analytics()
    model_data = loader.get_model_comparison()

    # KPIs
    demand_growth = stats.get("demand_growth_pct", 0.0)
    kpis = [
        KPIMetric(
            label="Missions Analyzed",
            value=f"{stats.get('total_missions', 0):,}",
            unit="missions",
            change_pct=demand_growth,
            trend="up" if demand_growth >= 0 else "down",
        ),
        KPIMetric(
            label="Satellites Tracked",
            value=f"{stats.get('total_satellites', 0):,}",
            unit="satellites",
        ),
        KPIMetric(
            label="Demand Growth",
            value=f"{demand_growth:+.1f}",
            unit="%  YoY",
            trend="up" if demand_growth >= 0 else "down",
        ),
        KPIMetric(
            label="Forecast Confidence",
            value=f"{stats.get('forecast_confidence', 0):.1f}",
            unit="% (R²)",
            trend="up",
        ),
    ]

    # Demand trend data
    demand_trend = []
    if not trend_df.empty:
        for _, row in trend_df.iterrows():
            demand_trend.append({
                "year":             int(row["year"]),
                "mission_count":    int(row.get("mission_count", 0)),
                "satellite_count":  int(row.get("satellite_count", 0)),
                "is_forecast":      False,
            })

    # Top 8 countries
    top_countries = []
    if not countries_df.empty:
        for _, row in countries_df.head(8).iterrows():
            top_countries.append({
                "country":        str(row["country"]),
                "mission_count":  int(row["mission_count"]),
                "market_share_pct": float(row.get("market_share_pct", 0)),
                "success_rate":   round(float(row.get("success_rate", 0)) * 100, 1),
            })

    # Top mission types
    top_mission_types = []
    if not mission_types_df.empty:
        for _, row in mission_types_df.head(6).iterrows():
            top_mission_types.append({
                "mission_type": str(row["mission_type"]),
                "count":        int(row["mission_count"]),
                "success_rate": round(float(row.get("success_rate", 0)) * 100, 1),
            })

    # Recent analytics summary
    recent_analytics = {
        "years_covered":        f"{stats.get('data_years', {}).get('min', 1957)}-{stats.get('data_years', {}).get('max', 2025)}",
        "unique_countries":     stats.get("unique_countries", 0),
        "unique_mission_types": stats.get("unique_mission_types", 0),
        "best_model":           stats.get("best_model", "Not trained"),
        "avg_success_rate":     f"{stats.get('avg_success_rate', 0):.1f}%",
        "data_source":          "Synthetic (clearly labeled)",
        "processing":           "Apache Spark → Parquet → FastAPI",
    }

    # System health
    has_data = stats.get("total_missions", 0) > 0
    has_model = bool(stats.get("best_model"))
    system_health = "operational" if (has_data and has_model) else ("partial" if has_data else "initializing")

    return DashboardResponse(
        kpis=kpis,
        demand_trend=demand_trend,
        top_countries=top_countries,
        top_mission_types=top_mission_types,
        recent_analytics=recent_analytics,
        system_health=system_health,
    )
