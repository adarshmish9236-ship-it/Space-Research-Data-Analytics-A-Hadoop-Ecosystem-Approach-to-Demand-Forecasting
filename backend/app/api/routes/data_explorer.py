"""ORBITALYTICS — Data Explorer Route"""
import time
import logging
from typing import Optional
from fastapi import APIRouter, Query, Depends
from app.models.schemas import DataExplorerResponse
from app.services.data_loader import get_data_loader, DataLoader

router = APIRouter()
log = logging.getLogger(__name__)

PROCESSING_METADATA = {
    "source":      "HDFS (local mirror)",
    "processing":  "Apache Spark ETL",
    "format":      "Apache Parquet (Snappy compression)",
    "query":       "Apache Hive SQL / Spark SQL",
    "catalog":     "space_analytics (Hive Derby metastore)",
    "pipeline":    "Raw CSV -> HDFS -> Hive External Table -> Spark ETL -> Parquet -> API",
}


@router.get("/data-explorer", response_model=DataExplorerResponse)
async def explore_data(
    dataset: str = Query("missions", description="Dataset: missions | demand | yearly | country | mission_type"),
    country: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    mission_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    loader: DataLoader = Depends(get_data_loader),
):
    """Query analytical data with filters. Shows technical metadata about processing."""
    t0 = time.time()

    if dataset == "missions":
        df = loader.get_missions_sample(n=limit, country=country, year=year, mission_type=mission_type)
        schema = [
            {"column": "mission_id",      "type": "STRING"},
            {"column": "mission_name",    "type": "STRING"},
            {"column": "launch_date",     "type": "DATE"},
            {"column": "year",            "type": "INT"},
            {"column": "country",         "type": "STRING"},
            {"column": "agency",          "type": "STRING"},
            {"column": "mission_type",    "type": "STRING"},
            {"column": "launch_vehicle",  "type": "STRING"},
            {"column": "orbit",           "type": "STRING"},
            {"column": "payload_mass_kg", "type": "DOUBLE"},
            {"column": "success",         "type": "BOOLEAN"},
        ]
    elif dataset == "demand":
        df = loader.get_demand_data(country=country, mission_type=mission_type, year_from=year, year_to=year)
        df = df.head(limit)
        schema = [
            {"column": "year",            "type": "INT"},
            {"column": "quarter",         "type": "INT"},
            {"column": "country",         "type": "STRING"},
            {"column": "mission_type",    "type": "STRING"},
            {"column": "mission_count",   "type": "INT"},
            {"column": "satellite_count", "type": "INT"},
            {"column": "launch_count",    "type": "INT"},
            {"column": "growth_rate",     "type": "DOUBLE"},
            {"column": "rolling_3_demand","type": "DOUBLE"},
            {"column": "rolling_5_demand","type": "DOUBLE"},
        ]
    elif dataset == "yearly":
        df = loader.get_yearly_analytics()
        if year:
            df = df[df["year"] == year]
        df = df.head(limit)
        schema = [
            {"column": "year",            "type": "INT"},
            {"column": "total_missions",  "type": "BIGINT"},
            {"column": "success_rate",    "type": "DOUBLE"},
            {"column": "total_payload_kg","type": "DOUBLE"},
            {"column": "total_cost_musd", "type": "DOUBLE"},
        ]
    elif dataset == "country":
        df = loader.get_country_yearly()
        if country:
            df = df[df["country"] == country]
        if year:
            df = df[df["year"] == year]
        df = df.head(limit)
        schema = [
            {"column": "country",         "type": "STRING"},
            {"column": "year",            "type": "INT"},
            {"column": "mission_count",   "type": "BIGINT"},
            {"column": "success_rate",    "type": "DOUBLE"},
            {"column": "total_payload_kg","type": "DOUBLE"},
        ]
    elif dataset == "mission_type":
        df = loader.get_mission_type_yearly()
        if mission_type:
            df = df[df["mission_type"] == mission_type]
        if year:
            df = df[df["year"] == year]
        df = df.head(limit)
        schema = [
            {"column": "mission_type",    "type": "STRING"},
            {"column": "year",            "type": "INT"},
            {"column": "mission_count",   "type": "BIGINT"},
            {"column": "success_rate",    "type": "DOUBLE"},
            {"column": "avg_payload_kg",  "type": "DOUBLE"},
        ]
    elif dataset == "satellites":
        df = loader.get_satellites_sample(n=limit, country=country)
        schema = [
            {"column": "satellite_id",   "type": "STRING"},
            {"column": "satellite_name", "type": "STRING"},
            {"column": "country",        "type": "STRING"},
            {"column": "operator",       "type": "STRING"},
            {"column": "purpose",        "type": "STRING"},
            {"column": "launch_date",    "type": "DATE"},
            {"column": "orbit_type",     "type": "STRING"},
            {"column": "mass_kg",        "type": "DOUBLE"},
            {"column": "status",         "type": "STRING"},
        ]
    elif dataset == "resources":
        df = loader.get_resources_sample(n=limit, country=country)
        schema = [
            {"column": "record_id",               "type": "STRING"},
            {"column": "mission_id",              "type": "STRING"},
            {"column": "satellite_id",            "type": "STRING"},
            {"column": "timestamp",               "type": "DATE"},
            {"column": "country",                 "type": "STRING"},
            {"column": "mission_type",            "type": "STRING"},
            {"column": "fuel_consumption_kg",     "type": "DOUBLE"},
            {"column": "energy_consumption_mwh",  "type": "DOUBLE"},
            {"column": "storage_usage_gb",        "type": "DOUBLE"},
            {"column": "bandwidth_usage_gbps",    "type": "DOUBLE"},
            {"column": "ground_station_hours",    "type": "DOUBLE"},
        ]
    elif dataset == "research":
        df = loader.get_research_sample(n=limit, country=country)
        schema = [
            {"column": "research_id",        "type": "STRING"},
            {"column": "mission_id",         "type": "STRING"},
            {"column": "experiment_type",    "type": "STRING"},
            {"column": "research_domain",    "type": "STRING"},
            {"column": "duration_days",      "type": "INT"},
            {"column": "data_generated_gb",  "type": "DOUBLE"},
            {"column": "personnel_required", "type": "INT"},
            {"column": "equipment_count",    "type": "INT"},
            {"column": "resource_cost_musd", "type": "DOUBLE"},
        ]
    elif dataset == "telemetry":
        df = loader.get_telemetry_sample(n=limit)
        schema = [
            {"column": "telemetry_id",            "type": "STRING"},
            {"column": "satellite_id",            "type": "STRING"},
            {"column": "timestamp",               "type": "DATE"},
            {"column": "temperature_c",           "type": "DOUBLE"},
            {"column": "power_usage_w",           "type": "DOUBLE"},
            {"column": "signal_strength_dbm",     "type": "DOUBLE"},
            {"column": "data_rate_mbps",          "type": "DOUBLE"},
            {"column": "storage_utilization_pct", "type": "DOUBLE"},
            {"column": "operational_status",      "type": "STRING"},
            {"column": "is_anomaly",              "type": "BOOLEAN"},
        ]
    else:
        df = loader.get_yearly_analytics().head(limit)
        schema = []

    query_ms = round((time.time() - t0) * 1000, 2)

    # Convert to list of dicts, handling NaN
    import math
    records = []
    for r in df.to_dict("records"):
        clean = {}
        for k, v in r.items():
            try:
                if isinstance(v, float) and math.isnan(v):
                    clean[k] = None
                else:
                    clean[k] = v
            except Exception:
                clean[k] = str(v) if v is not None else None
        records.append(clean)

    return DataExplorerResponse(
        dataset=dataset,
        records=records,
        total_records=len(records),
        returned_records=len(records),
        filters_applied={
            k: v for k, v in {
                "country": country, "year": year, "mission_type": mission_type
            }.items() if v is not None
        },
        query_time_ms=query_ms,
        processing_info=PROCESSING_METADATA,
        schema=schema,
    )


@router.get("/data-explorer/stats")
async def get_dataset_stats(
    dataset: str = Query("missions", description="Dataset to compute stats for"),
    loader: DataLoader = Depends(get_data_loader),
):
    """Compute per-column summary statistics for a dataset: min, max, mean, std, null count, unique count."""
    import math
    import numpy as np

    t0 = time.time()

    # Resolve dataset to dataframe
    if dataset == "missions":
        df = loader.get_missions_sample(n=100_000)
    elif dataset == "satellites":
        df = loader.get_satellites_sample(n=100_000)
    elif dataset == "resources":
        df = loader.get_resources_sample(n=100_000)
    elif dataset == "research":
        df = loader.get_research_sample(n=100_000)
    elif dataset == "telemetry":
        df = loader.get_telemetry_sample(n=100_000)
    elif dataset == "demand":
        df = loader.get_demand_data()
    elif dataset == "yearly":
        df = loader.get_yearly_analytics()
    else:
        df = loader.get_yearly_analytics()

    total_rows = len(df)

    def _to_py(v):
        """Convert numpy scalar to native Python type for JSON serialization."""
        if v is None:
            return None
        try:
            if isinstance(v, (np.integer,)):
                return int(v)
            if isinstance(v, (np.floating,)):
                f = float(v)
                return None if math.isnan(f) or math.isinf(f) else f
            if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                return None
            return v
        except Exception:
            return None

    stats = []

    for col in df.columns:
        series = df[col]
        dtype = str(series.dtype)
        null_count = int(series.isna().sum())
        null_pct = round(null_count / max(total_rows, 1) * 100, 1)

        col_stat: dict = {
            "column": col,
            "dtype": dtype,
            "null_count": null_count,
            "null_pct": null_pct,
            "total_count": total_rows,
        }

        if dtype in ("int32", "int64", "float32", "float64"):
            col_stat["type_class"] = "numeric"
            non_null = series.dropna()
            col_stat["min"] = _to_py(non_null.min()) if len(non_null) > 0 else None
            col_stat["max"] = _to_py(non_null.max()) if len(non_null) > 0 else None
            col_stat["mean"] = _to_py(round(float(non_null.mean()), 4)) if len(non_null) > 0 else None
            col_stat["std"] = _to_py(round(float(non_null.std()), 4)) if len(non_null) > 1 else None
            col_stat["unique_count"] = int(series.nunique())
        elif dtype == "bool":
            col_stat["type_class"] = "boolean"
            non_null = series.dropna()
            true_count = int(non_null.sum()) if len(non_null) > 0 else 0
            false_count = len(non_null) - true_count
            col_stat["true_count"] = true_count
            col_stat["false_count"] = false_count
            col_stat["true_pct"] = round(true_count / max(len(non_null), 1) * 100, 1)
            col_stat["unique_count"] = 2
        elif str(dtype).startswith("category") or dtype == "object":
            col_stat["type_class"] = "categorical"
            vc = series.value_counts().head(5)
            col_stat["top_values"] = [
                {"value": str(k), "count": int(v)} for k, v in vc.items()
            ]
            col_stat["unique_count"] = int(series.nunique())
        else:
            col_stat["type_class"] = "other"
            col_stat["unique_count"] = int(series.nunique())

        stats.append(col_stat)

    query_ms = round((time.time() - t0) * 1000, 2)
    return {
        "dataset": dataset,
        "total_rows": total_rows,
        "total_columns": len(df.columns),
        "query_time_ms": query_ms,
        "columns": stats,
    }


@router.get("/data-explorer/export")
async def export_dataset(
    dataset: str = Query("missions", description="Dataset to export"),
    export_format: str = Query("csv", pattern="^(csv|parquet)$"),
    country: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    mission_type: Optional[str] = Query(None),
    limit: int = Query(5000, ge=1, le=50000),
    loader: DataLoader = Depends(get_data_loader),
):
    """Direct export of raw/processed HDFS analytical datasets as CSV or Parquet."""
    import io
    from fastapi.responses import StreamingResponse

    if dataset == "missions":
        df = loader.get_missions_sample(n=limit, country=country, year=year, mission_type=mission_type)
    elif dataset == "demand":
        df = loader.get_demand_data(country=country, mission_type=mission_type, year_from=year, year_to=year)
    elif dataset == "yearly":
        df = loader.get_yearly_analytics()
        if year:
            df = df[df["year"] == year]
    elif dataset == "satellites":
        df = loader.get_satellites_sample(n=limit, country=country)
    elif dataset == "resources":
        df = loader.get_resources_sample(n=limit, country=country)
    elif dataset == "telemetry":
        df = loader.get_telemetry_sample(n=limit)
    elif dataset == "research":
        df = loader.get_research_sample(n=limit, country=country)
    else:
        df = loader.get_yearly_analytics()

    df = df.head(limit)
    filename = f"orbitalytics_{dataset}_{int(time.time())}"

    if export_format == "parquet":
        buffer = io.BytesIO()
        df.to_parquet(buffer, index=False, engine="pyarrow")
        buffer.seek(0)
        return StreamingResponse(
            buffer,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{filename}.parquet"'},
        )
    else:
        csv_str = df.to_csv(index=False)
        return StreamingResponse(
            io.StringIO(csv_str),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}.csv"'},
        )

