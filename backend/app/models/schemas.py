"""ORBITALYTICS — Pydantic Response Models"""
from __future__ import annotations
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ── Base ──────────────────────────────────────────────────────────────────────
class APIResponse(BaseModel):
    success: bool = True
    message: str = "OK"


# ── Health & System ───────────────────────────────────────────────────────────
class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
    timestamp: str


class HadoopComponentStatus(BaseModel):
    name: str
    status: str                    # "online" | "offline" | "unavailable"
    version: Optional[str] = None
    details: Dict[str, Any] = {}
    mode: str = "local"            # "local" | "cluster"


class SystemStatusResponse(BaseModel):
    components: List[HadoopComponentStatus]
    data_paths: Dict[str, str]
    data_sizes: Dict[str, str]
    etl_last_run: Optional[str] = None
    ml_last_run: Optional[str] = None
    records_processed: Dict[str, int] = {}
    disclaimer: str = "Running in local Spark mode (pseudo-distributed)"


# ── Dashboard ─────────────────────────────────────────────────────────────────
class KPIMetric(BaseModel):
    label: str
    value: Any
    unit: Optional[str] = None
    change_pct: Optional[float] = None
    trend: Optional[str] = None   # "up" | "down" | "stable"


class DashboardResponse(BaseModel):
    kpis: List[KPIMetric]
    demand_trend: List[Dict[str, Any]]
    top_countries: List[Dict[str, Any]]
    top_mission_types: List[Dict[str, Any]]
    recent_analytics: Dict[str, Any]
    system_health: str


# ── Missions ──────────────────────────────────────────────────────────────────
class MissionRecord(BaseModel):
    mission_id: str
    mission_name: Optional[str] = None
    launch_date: Optional[str] = None
    year: Optional[int] = None
    country: Optional[str] = None
    agency: Optional[str] = None
    mission_type: Optional[str] = None
    launch_vehicle: Optional[str] = None
    orbit: Optional[str] = None
    payload_mass_kg: Optional[float] = None
    success: Optional[bool] = None


class MissionsResponse(BaseModel):
    data: List[MissionRecord]
    total_count: int
    filtered_count: int
    page: int
    page_size: int
    filters_applied: Dict[str, Any] = {}
    source: str = "HDFS → Spark ETL → Parquet"


# ── Analytics ─────────────────────────────────────────────────────────────────
class YearlyAnalytic(BaseModel):
    year: int
    total_missions: int
    success_rate: Optional[float] = None
    total_payload_kg: Optional[float] = None
    avg_payload_kg: Optional[float] = None
    total_cost_musd: Optional[float] = None
    unique_countries: Optional[int] = None
    yoy_growth_pct: Optional[float] = None


class CountryAnalytic(BaseModel):
    country: str
    mission_count: int
    success_rate: Optional[float] = None
    total_payload_kg: Optional[float] = None
    total_cost_musd: Optional[float] = None
    market_share_pct: Optional[float] = None


class MissionTypeAnalytic(BaseModel):
    mission_type: str
    mission_count: int
    success_rate: Optional[float] = None
    avg_payload_kg: Optional[float] = None
    total_cost_musd: Optional[float] = None


class TrendsResponse(BaseModel):
    yearly: List[YearlyAnalytic]
    by_country: List[CountryAnalytic]
    by_mission_type: List[MissionTypeAnalytic]
    processing_info: Dict[str, str]


# ── Forecast ─────────────────────────────────────────────────────────────────
class ForecastPoint(BaseModel):
    year: int
    quarter: Optional[int] = None
    country: str
    mission_type: str
    forecast_value: float
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None
    actual_demand: Optional[float] = None
    is_forecast: bool
    growth_pct: Optional[float] = None


class ForecastConfig(BaseModel):
    country: str = "Global"
    mission_type: str = "All"
    horizon_years: int = Field(default=3, ge=1, le=5)
    model: Optional[str] = None


class ForecastResponse(BaseModel):
    config: ForecastConfig
    data: List[ForecastPoint]
    model_used: str
    model_metrics: Dict[str, Any]
    forecast_growth_pct: float
    confidence_info: str
    historical_count: int
    forecast_count: int
    processing_info: Dict[str, str]


# ── Scenarios ─────────────────────────────────────────────────────────────────
class ScenarioParams(BaseModel):
    satellite_growth: float = Field(default=1.0, ge=-2.0, le=10.0)
    launch_capacity: float = Field(default=1.0, ge=-2.0, le=10.0)
    research_activity: float = Field(default=1.0, ge=-2.0, le=10.0)
    mission_growth: float = Field(default=1.0, ge=-2.0, le=10.0)
    launch_frequency: Optional[float] = Field(default=1.0, ge=-2.0, le=10.0)
    ground_station_capacity: Optional[float] = Field(default=1.0, ge=-2.0, le=10.0)
    data_volume: Optional[float] = Field(default=1.0, ge=-2.0, le=10.0)
    bandwidth_capacity: Optional[float] = Field(default=1.0, ge=-2.0, le=10.0)
    country: Optional[str] = "Global"
    mission_type: Optional[str] = "All"
    horizon_years: int = Field(default=3, ge=1, le=10)


class ScenarioResult(BaseModel):
    scenario: str
    data: List[Dict[str, Any]]
    total_demand: float
    avg_demand_per_period: float
    growth_vs_baseline_pct: float
    description: str
    color: str


class ScenariosResponse(BaseModel):
    scenarios: List[ScenarioResult]
    disclaimer: str
    params_used: ScenarioParams
    baseline_forecast: Optional[float] = None
    scenario_forecast: Optional[float] = None
    impact_pct: Optional[float] = None
    resource_comparison: Optional[Dict[str, Any]] = None
    monte_carlo: Optional[Dict[str, Any]] = None



# ── ODI ───────────────────────────────────────────────────────────────────────
class ODIComponent(BaseModel):
    name: str
    display_name: str
    score: float
    weight: float
    weighted_contribution: float


class ODIResponse(BaseModel):
    odi_score: float
    classification: str
    color: str
    components: List[ODIComponent]
    country: str
    data_points: int
    latest_year_demand: int
    yoy_growth_pct: float
    formula: str
    disclaimer: str


# ── Model Performance ─────────────────────────────────────────────────────────
class ModelMetrics(BaseModel):
    rmse: Optional[float] = None
    mae: Optional[float] = None
    r2: Optional[float] = None
    mape: Optional[float] = None


class ModelResult(BaseModel):
    model_name: str
    model_type: str
    metrics: ModelMetrics
    train_time_s: Optional[float] = None
    is_best: bool = False


class ModelPerformanceResponse(BaseModel):
    models: List[ModelResult]
    best_model: str
    selection_criterion: str = "Lowest RMSE on time-based test split"
    generated_at: Optional[str] = None
    split_info: str = "Training: year ≤ 2020 | Test: year > 2020"


# ── Data Explorer ─────────────────────────────────────────────────────────────
class DataExplorerResponse(BaseModel):
    dataset: str
    records: List[Dict[str, Any]]
    total_records: int
    returned_records: int
    filters_applied: Dict[str, Any]
    query_time_ms: float
    processing_info: Dict[str, str]
    schema: List[Dict[str, str]]
    total_lake_records: Optional[int] = 581886
    lake_storage_format: Optional[str] = "Apache Parquet / Snappy Columnar"
    file_size_mb: Optional[float] = 148.5
