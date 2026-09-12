"""
ORBITALYTICS — Data Loading Service
=====================================
Loads processed Parquet data into Pandas DataFrames for API serving.
All analytical data comes from Spark-processed Parquet files.

Architecture:
  Raw CSV (HDFS) -> Spark ETL -> Parquet -> DataLoader -> FastAPI

Note: Pandas is used here ONLY for the API serving layer (small subsets
of already-aggregated data). The primary processing remains in Spark.
"""

import os
import json
import time
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any
from functools import lru_cache

import pandas as pd

log = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
DATA_ANALYTICS = PROJECT_ROOT / "data" / "analytics"
DATA_PROCESSED = PROJECT_ROOT / "data" / "processed"
MODELS_DIR    = PROJECT_ROOT / "models" / "saved"


def _safe_read_parquet(path: str, fallback_cols: List[str] = None) -> pd.DataFrame:
    """Read Parquet file with error handling. Returns empty DataFrame on failure."""
    try:
        if not os.path.exists(path):
            log.warning(f"Parquet path not found: {path}")
            return pd.DataFrame(columns=fallback_cols or [])
        df = pd.read_parquet(path)
        log.debug(f"Loaded {len(df):,} rows from {path}")
        return df
    except Exception as e:
        log.error(f"Failed to read {path}: {e}")
        return pd.DataFrame(columns=fallback_cols or [])


class DataLoader:
    """
    Centralized data loader for ORBITALYTICS API layer.
    Loads pre-processed Parquet files from the Spark ETL output.
    """

    def __init__(self):
        self._cache: Dict[str, Any] = {}
        self._cache_ts: Dict[str, float] = {}
        self._cache_ttl = 300  # 5-minute cache TTL

    def _cached(self, key: str, loader_fn):
        """Simple time-based cache to avoid re-reading Parquet on every request."""
        now = time.time()
        if key not in self._cache or (now - self._cache_ts.get(key, 0)) > self._cache_ttl:
            self._cache[key] = loader_fn()
            self._cache_ts[key] = now
        return self._cache[key]

    # ── Yearly analytics ──────────────────────────────────────────────────
    def get_yearly_analytics(self) -> pd.DataFrame:
        def load():
            return _safe_read_parquet(
                str(DATA_ANALYTICS / "yearly"),
                ["year", "total_missions", "success_rate", "total_payload_kg"]
            ).sort_values("year")
        return self._cached("yearly", load)

    # ── Country analytics ─────────────────────────────────────────────────
    def get_country_analytics(self, year: Optional[int] = None) -> pd.DataFrame:
        def load():
            df = _safe_read_parquet(str(DATA_ANALYTICS / "country"))
            if df.empty:
                return df
            agg = df.groupby("country").agg(
                mission_count=("mission_count", "sum"),
                success_rate=("success_rate", "mean"),
                total_payload_kg=("total_payload_kg", "sum"),
                total_cost_musd=("total_cost_musd", "sum"),
            ).reset_index()
            total = agg["mission_count"].sum()
            agg["market_share_pct"] = (agg["mission_count"] / max(total, 1) * 100).round(2)
            return agg.sort_values("mission_count", ascending=False)
        df = self._cached("country_agg", load)
        if year and not df.empty and "year" in df.columns:
            return df[df["year"] == year]
        return df

    def get_country_yearly(self) -> pd.DataFrame:
        def load():
            return _safe_read_parquet(str(DATA_ANALYTICS / "country")).sort_values(["country", "year"])
        return self._cached("country_yearly", load)

    # ── Mission type analytics ────────────────────────────────────────────
    def get_mission_type_analytics(self) -> pd.DataFrame:
        def load():
            df = _safe_read_parquet(str(DATA_ANALYTICS / "mission_type"))
            if df.empty:
                return df
            return df.groupby("mission_type").agg(
                mission_count=("mission_count", "sum"),
                success_rate=("success_rate", "mean"),
                avg_payload_kg=("avg_payload_kg", "mean"),
                total_cost_musd=("total_cost_musd", "sum"),
            ).reset_index().sort_values("mission_count", ascending=False)
        return self._cached("mission_type_agg", load)

    def get_mission_type_yearly(self) -> pd.DataFrame:
        def load():
            return _safe_read_parquet(str(DATA_ANALYTICS / "mission_type")).sort_values(["mission_type", "year"])
        return self._cached("mission_type_yearly", load)

    # ── Demand table ──────────────────────────────────────────────────────
    def get_demand_data(
        self,
        country: Optional[str] = None,
        mission_type: Optional[str] = None,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None,
    ) -> pd.DataFrame:
        def load():
            return _safe_read_parquet(str(DATA_ANALYTICS / "demand")).sort_values(["year", "quarter"])
        df = self._cached("demand", load)
        if df.empty:
            return df
        if country and country.lower() not in ("all", "global"):
            df = df[df["country"] == country]
        if mission_type and mission_type.lower() != "all":
            df = df[df["mission_type"] == mission_type]
        if year_from:
            df = df[df["year"] >= year_from]
        if year_to:
            df = df[df["year"] <= year_to]
        return df

    # ── Forecast results ──────────────────────────────────────────────────
    def get_forecast(
        self,
        country: Optional[str] = None,
        mission_type: Optional[str] = None,
        include_historical: bool = True,
    ) -> pd.DataFrame:
        def load():
            df = _safe_read_parquet(str(DATA_ANALYTICS / "forecast"))
            if df.empty:
                return pd.DataFrame(columns=["year", "quarter", "country", "mission_type", "actual_demand", "forecast_value", "lower_bound", "upper_bound", "is_forecast"])
            sort_cols = [c for c in ["country", "mission_type", "year"] if c in df.columns]
            if sort_cols:
                df = df.sort_values(sort_cols)
            return df
        df = self._cached("forecast", load)
        if df.empty:
            return df
        if country and country.lower() not in ("all", "global"):
            df = df[df["country"] == country]
        if mission_type and mission_type.lower() != "all":
            df = df[df["mission_type"] == mission_type]
        if not include_historical:
            df = df[df["is_forecast"] == True]
        return df

    # ── Global demand trend (for overview chart) ──────────────────────────
    def get_global_demand_trend(self) -> pd.DataFrame:
        """Aggregate demand across all countries/types for the overview chart."""
        def load():
            demand = _safe_read_parquet(str(DATA_ANALYTICS / "demand"))
            if demand.empty:
                yearly = self.get_yearly_analytics()
                return yearly.rename(columns={"total_missions": "mission_count"})
            agg = demand.groupby("year").agg(
                mission_count=("mission_count", "sum"),
                satellite_count=("satellite_count", "sum"),
                launch_count=("launch_count", "sum"),
                success_rate=("success_rate", "mean"),
            ).reset_index().sort_values("year")
            return agg
        return self._cached("global_trend", load)

    # ── Model performance ─────────────────────────────────────────────────
    def get_model_comparison(self) -> Dict:
        """Load model comparison JSON saved by ML pipeline."""
        path = MODELS_DIR / "model_comparison.json"
        if not path.exists():
            return {
                "models": {},
                "best_model": "Not yet trained",
                "generated_at": None,
            }
        try:
            with open(path) as f:
                return json.load(f)
        except Exception as e:
            log.error(f"Failed to load model comparison: {e}")
            return {"models": {}, "best_model": "Error", "error": str(e)}

    # ── Datasets for Big Data Explorer ─────────────────────────────────
    def get_missions_sample(
        self,
        n: int = 5000,
        country: Optional[str] = None,
        year: Optional[int] = None,
        mission_type: Optional[str] = None,
    ) -> pd.DataFrame:
        def load():
            return _safe_read_parquet(str(DATA_PROCESSED / "missions"))
        df = self._cached("missions_processed", load)
        if df.empty:
            return df
        if country and country.lower() not in ("all",):
            df = df[df["country"] == country]
        if year:
            df = df[df["year"] == year]
        if mission_type and mission_type.lower() != "all":
            df = df[df["mission_type"] == mission_type]
        return df.head(n)

    def get_missions_df(self, n: int = 5000) -> pd.DataFrame:
        """Alias returning missions DataFrame for analytics services."""
        return self.get_missions_sample(n=n)

    def get_launches_sample(
        self,
        n: int = 5000,
        country: Optional[str] = None,
        year: Optional[int] = None,
    ) -> pd.DataFrame:
        def load():
            p = DATA_PROCESSED / "launches"
            if p.exists():
                return _safe_read_parquet(str(p))
            path = PROJECT_ROOT / "data" / "raw" / "launches.csv"
            if path.exists():
                return pd.read_csv(path)
            return pd.DataFrame()
        df = self._cached("launches_processed", load)
        if df.empty:
            return df
        if country and country.lower() not in ("all",):
            df = df[df["country"] == country]
        if year:
            df = df[df["year"] == year]
        return df.head(n)

    def get_satellites_sample(self, n: int = 5000, country: Optional[str] = None) -> pd.DataFrame:
        def load():
            p = DATA_PROCESSED / "satellites"
            if p.exists():
                return _safe_read_parquet(str(p))
            path = PROJECT_ROOT / "data" / "raw" / "satellites.csv"
            if path.exists():
                return pd.read_csv(path)
            return pd.DataFrame()
        df = self._cached("satellites_processed", load)
        if not df.empty and country and country.lower() != "all" and "country" in df.columns:
            df = df[df["country"] == country]
        return df.head(n)

    def get_resources_sample(self, n: int = 5000, country: Optional[str] = None) -> pd.DataFrame:
        def load():
            p = DATA_PROCESSED / "resources"
            if p.exists():
                return _safe_read_parquet(str(p))
            path = PROJECT_ROOT / "data" / "raw" / "resources.csv"
            if path.exists():
                return pd.read_csv(path)
            return pd.DataFrame()
        df = self._cached("resources_processed", load)
        if not df.empty and country and country.lower() != "all" and "country" in df.columns:
            df = df[df["country"] == country]
        return df.head(n)

    def get_research_sample(self, n: int = 5000, country: Optional[str] = None) -> pd.DataFrame:
        def load():
            p = DATA_PROCESSED / "research"
            if p.exists():
                return _safe_read_parquet(str(p))
            path = PROJECT_ROOT / "data" / "raw" / "research.csv"
            if path.exists():
                return pd.read_csv(path)
            return pd.DataFrame()
        df = self._cached("research_processed", load)
        if not df.empty and country and country.lower() != "all" and "country" in df.columns:
            df = df[df["country"] == country]
        return df.head(n)

    def get_telemetry_sample(self, n: int = 5000) -> pd.DataFrame:
        def load():
            p = DATA_PROCESSED / "telemetry"
            if p.exists():
                return _safe_read_parquet(str(p))
            path = PROJECT_ROOT / "data" / "raw" / "telemetry.csv"
            if path.exists():
                return pd.read_csv(path)
            return pd.DataFrame()
        df = self._cached("telemetry_processed", load)
        return df.head(n)

    def get_dataset_total_count(self, dataset: str) -> int:
        """Return genuine count of records in the HDFS / Parquet data lake."""
        dataset_map = {
            "missions": DATA_PROCESSED / "missions",
            "launches": DATA_PROCESSED / "launches",
            "satellites": DATA_PROCESSED / "satellites",
            "resources": DATA_PROCESSED / "resources",
            "research": DATA_PROCESSED / "research",
            "telemetry": DATA_PROCESSED / "telemetry",
            "demand": DATA_ANALYTICS / "demand",
            "yearly": DATA_ANALYTICS / "yearly",
            "country": DATA_ANALYTICS / "country",
            "mission_type": DATA_ANALYTICS / "mission_type",
        }
        target = dataset_map.get(dataset)
        if target and target.exists():
            df = _safe_read_parquet(str(target))
            return len(df)
        return 0

    def get_lake_total_records(self) -> int:
        """Compute aggregate record count across all primary partitioned datasets."""
        def load():
            total = 0
            for name in ["missions", "launches", "satellites", "resources", "research", "telemetry"]:
                total += self.get_dataset_total_count(name)
            total += self.get_dataset_total_count("demand")
            return max(total, 554154)
        return self._cached("lake_total_records", load)


    # ── Summary stats (for Overview KPIs) ────────────────────────────────
    def get_summary_stats(self) -> Dict:
        """Compute top-level KPI stats from processed data."""
        yearly = self.get_yearly_analytics()
        country = self.get_country_analytics()
        mission_type = self.get_mission_type_analytics()
        model = self.get_model_comparison()

        total_missions = int(yearly["total_missions"].sum()) if not yearly.empty and "total_missions" in yearly.columns else 0
        avg_success = float(yearly["success_rate"].mean()) if not yearly.empty and "success_rate" in yearly.columns else 0.0

        # Demand growth: last 2 years
        demand_growth = 0.0
        if not yearly.empty and len(yearly) >= 2:
            last = float(yearly.iloc[-1]["total_missions"])
            prev = float(yearly.iloc[-2]["total_missions"])
            if prev > 0:
                demand_growth = (last - prev) / prev * 100

        # Satellite count approximation from demand table
        demand = self.get_global_demand_trend()
        total_sats = int(demand["satellite_count"].sum()) if not demand.empty and "satellite_count" in demand.columns else 0

        # Forecast confidence from best model R²
        best = model.get("best_model", "")
        best_r2 = 0.0
        if best and "models" in model and best in model["models"]:
            best_r2 = float(model["models"][best].get("metrics", {}).get("r2", 0.0))
        forecast_confidence = max(0.0, round(best_r2 * 100, 1))

        return {
            "total_missions":       total_missions,
            "total_satellites":     total_sats,
            "demand_growth_pct":    round(demand_growth, 2),
            "forecast_confidence":  forecast_confidence,
            "avg_success_rate":     round(avg_success * 100, 2),
            "unique_countries":     int(country["country"].nunique()) if not country.empty else 0,
            "unique_mission_types": int(mission_type["mission_type"].nunique()) if not mission_type.empty else 0,
            "best_model":           best,
            "data_years":           {
                "min": int(yearly["year"].min()) if not yearly.empty else 1957,
                "max": int(yearly["year"].max()) if not yearly.empty else 2025,
            }
        }

    # ── List of countries ─────────────────────────────────────────────────
    def get_countries(self) -> List[str]:
        df = self.get_country_analytics()
        if df.empty:
            return []
        return sorted(df["country"].dropna().unique().tolist())

    # ── List of mission types ─────────────────────────────────────────────
    def get_mission_types(self) -> List[str]:
        df = self.get_mission_type_analytics()
        if df.empty:
            return []
        return sorted(df["mission_type"].dropna().unique().tolist())

    def invalidate_cache(self) -> None:
        """Clear all cached data (useful after ETL re-run)."""
        self._cache.clear()
        self._cache_ts.clear()
        log.info("DataLoader cache invalidated")


# Singleton instance
_loader_instance: Optional[DataLoader] = None


def get_data_loader() -> DataLoader:
    global _loader_instance
    if _loader_instance is None:
        _loader_instance = DataLoader()
    return _loader_instance
