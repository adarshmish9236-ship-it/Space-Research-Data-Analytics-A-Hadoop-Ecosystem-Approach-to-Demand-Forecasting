"""ORBITALYTICS — System & Health Routes"""
import os
import time
import platform
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter
from app.models.schemas import HealthResponse, SystemStatusResponse, HadoopComponentStatus
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent.parent


def _dir_size_str(path: str) -> str:
    """Compute directory size in human-readable format."""
    try:
        total = sum(
            f.stat().st_size
            for f in Path(path).rglob("*")
            if f.is_file()
        )
        if total < 1024:
            return f"{total} B"
        elif total < 1024**2:
            return f"{total/1024:.1f} KB"
        elif total < 1024**3:
            return f"{total/1024**2:.1f} MB"
        return f"{total/1024**3:.2f} GB"
    except Exception:
        return "Unavailable"


def _count_files(path: str, ext: str = ".parquet") -> int:
    try:
        return len(list(Path(path).rglob(f"*{ext}")))
    except Exception:
        return 0


def _record_count(path: str) -> int:
    """Estimate record count from Parquet file sizes (fast approximation)."""
    try:
        import pandas as pd
        p = Path(path)
        if not p.exists():
            return 0
        dfs = []
        for f in p.rglob("*.parquet"):
            try:
                dfs.append(pd.read_parquet(f))
            except Exception:
                pass
        if dfs:
            import pandas as pd
            return len(pd.concat(dfs, ignore_index=True))
        return 0
    except Exception:
        return 0


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Basic health check endpoint."""
    return HealthResponse(
        status="healthy",
        version=settings.APP_VERSION,
        environment=settings.APP_ENV,
        timestamp=datetime.utcnow().isoformat() + "Z",
    )


@router.get("/system-status", response_model=SystemStatusResponse)
async def system_status():
    """
    Detailed Hadoop ecosystem status.
    Returns actual status where detectable, 'Unavailable' otherwise.
    """
    # ── Check Spark (PySpark importable) ──────────────────────────────────
    spark_status = "unavailable"
    spark_version = None
    try:
        import pyspark
        spark_version = pyspark.__version__
        spark_status = "available"
    except ImportError:
        pass

    # ── Check HDFS directories ────────────────────────────────────────────
    analytics_path = settings.ANALYTICS_DATA_PATH
    processed_path = settings.PROCESSED_DATA_PATH
    raw_path = settings.RAW_DATA_PATH

    hdfs_online = os.path.exists(processed_path) and _count_files(processed_path) > 0
    hive_online = os.path.exists(str(PROJECT_ROOT / "data" / "hive_warehouse"))

    # ── Estimate records processed ────────────────────────────────────────
    try:
        import pandas as pd
        yearly_path = str(Path(analytics_path) / "yearly")
        yearly_df = pd.read_parquet(yearly_path) if os.path.exists(yearly_path) else None
        missions_total = int(yearly_df["total_missions"].sum()) if yearly_df is not None and not yearly_df.empty else 0
    except Exception:
        missions_total = 0

    components = [
        HadoopComponentStatus(
            name="HDFS",
            status="online" if hdfs_online else ("configured" if os.path.exists(raw_path) else "offline"),
            version="3.3.x (local mirror mode)",
            details={
                "mode":          "local_mirror" if not settings.USE_REAL_HDFS else "cluster",
                "raw_data":      _dir_size_str(raw_path),
                "processed_data": _dir_size_str(processed_path),
                "analytics_data": _dir_size_str(analytics_path),
                "namenode":      f"{settings.HDFS_NAMENODE_HOST}:{settings.HDFS_NAMENODE_PORT}" if settings.USE_REAL_HDFS else "N/A (local mode)",
                "parquet_files": _count_files(processed_path),
            },
            mode="local" if not settings.USE_REAL_HDFS else "cluster",
        ),
        HadoopComponentStatus(
            name="YARN",
            status="simulated" if not settings.USE_REAL_HDFS else "unavailable",
            version="3.3.x",
            details={
                "resource_manager": "N/A (local Spark mode)",
                "node_managers":    "1 (driver node)",
                "mode":             "Spark local[*] — uses all CPU cores",
            },
            mode="local",
        ),
        HadoopComponentStatus(
            name="Apache Spark",
            status=spark_status,
            version=spark_version,
            details={
                "master":           settings.SPARK_MASTER,
                "app_name":         settings.SPARK_APP_NAME,
                "hive_support":     "enabled (Derby metastore)",
                "parquet_codec":    "snappy",
                "adaptive_query":   "enabled",
            },
            mode="local",
        ),
        HadoopComponentStatus(
            name="Apache Hive",
            status="online" if hive_online else "configured",
            version="3.x (embedded Derby metastore)",
            details={
                "database":         settings.HIVE_DATABASE,
                "metastore_uri":    "thrift://localhost:9083" if settings.USE_REAL_HIVE else "Derby (embedded)",
                "warehouse":        str(PROJECT_ROOT / "data" / "hive_warehouse"),
                "tables":           "missions_processed, space_demand, analytics_*",
            },
            mode="local",
        ),
        HadoopComponentStatus(
            name="Apache Kafka",
            status="disabled" if not settings.KAFKA_ENABLED else "configured",
            version="3.x",
            details={
                "enabled":          settings.KAFKA_ENABLED,
                "bootstrap_servers": settings.KAFKA_BOOTSTRAP_SERVERS,
                "topic":            settings.KAFKA_TOPIC_SPACE_EVENTS,
            },
            mode="local",
        ),
    ]

    # ── ETL / ML last run timestamps ──────────────────────────────────────
    model_comparison = PROJECT_ROOT / "models" / "saved" / "model_comparison.json"
    etl_last_run = None
    ml_last_run = None
    try:
        if model_comparison.exists():
            import json
            with open(model_comparison) as f:
                data = json.load(f)
            ml_last_run = data.get("generated_at")
        processed_dir = Path(processed_path)
        if processed_dir.exists():
            parquet_files = list(processed_dir.rglob("*.parquet"))
            if parquet_files:
                latest_mtime = max(f.stat().st_mtime for f in parquet_files)
                etl_last_run = datetime.fromtimestamp(latest_mtime).isoformat()
    except Exception:
        pass

    return SystemStatusResponse(
        components=components,
        data_paths={
            "/space/raw":       raw_path,
            "/space/processed": processed_path,
            "/space/analytics": analytics_path,
            "/space/models":    str(PROJECT_ROOT / "models" / "saved"),
        },
        data_sizes={
            "raw":       _dir_size_str(raw_path),
            "processed": _dir_size_str(processed_path),
            "analytics": _dir_size_str(analytics_path),
            "models":    _dir_size_str(str(PROJECT_ROOT / "models" / "saved")),
        },
        etl_last_run=etl_last_run,
        ml_last_run=ml_last_run,
        records_processed={
            "missions_total": missions_total,
            "parquet_files":  _count_files(processed_path),
        },
        disclaimer=(
            "Running in PySpark local mode (pseudo-distributed). "
            "All Spark/Hive DDL and Parquet operations are genuine. "
            "Set USE_REAL_HDFS=true for cluster deployment."
        ),
    )


class FaultInjectionRequest:
    pass


from pydantic import BaseModel


class TelemetryFaultRequest(BaseModel):
    subsystem: str = "THERMAL"
    severity: str = "WARNING"
    message: str = "Thermal radiator temperature spike (+14.2°C)"


@router.post("/telemetry/inject-fault")
async def inject_telemetry_fault(req: TelemetryFaultRequest):
    """Operator endpoint to inject telemetry fault into the live WebSocket broadcast."""
    from app.services.telemetry_stream import get_telemetry_manager
    manager = get_telemetry_manager()
    manager.inject_fault(req.subsystem, req.severity, req.message)
    return {
        "status": "FAULT_INJECTED",
        "subsystem": req.subsystem,
        "severity": req.severity,
        "message": req.message,
    }


@router.post("/telemetry/clear-fault")
async def clear_telemetry_fault():
    """Operator endpoint to clear all active telemetry faults."""
    from app.services.telemetry_stream import get_telemetry_manager
    manager = get_telemetry_manager()
    manager.clear_fault()
    return {"status": "FAULTS_CLEARED", "message": "All subsystems restored to nominal telemetry."}

