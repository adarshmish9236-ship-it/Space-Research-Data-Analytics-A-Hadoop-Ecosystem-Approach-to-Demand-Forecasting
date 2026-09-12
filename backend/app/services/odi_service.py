"""
ORBITALYTICS — Orbital Demand Index (ODI) Service
=================================================
Calculates the project-defined Orbital Demand Index (ODI).

IMPORTANT DISCLAIMER:
This is a project-defined composite analytical indicator created for
academic demonstration purposes. It is NOT an official metric from NASA,
ISRO, ESA, or any other space agency.

ODI Formula:
  ODI = 0.35 × MissionGrowth
      + 0.25 × SatelliteActivity
      + 0.20 × LaunchFrequency
      + 0.20 × ResearchActivity

Each component is normalized to [0, 1] before weighting.

ODI Classification:
  0.00 – 0.25 → Dormant
  0.25 – 0.50 → Emerging
  0.50 – 0.70 → Active
  0.70 – 0.85 → Accelerating
  0.85 – 1.00 → Peak Demand
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np

log = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).parent.parent.parent
DATA_ANALYTICS = PROJECT_ROOT / "data" / "analytics"

# ODI component weights (must sum to 1.0)
ODI_WEIGHTS = {
    "mission_growth":     0.35,
    "satellite_activity": 0.25,
    "launch_frequency":   0.20,
    "research_activity":  0.20,
}

ODI_CLASSIFICATIONS = [
    (0.00, 0.25, "Dormant",      "#4B5563"),
    (0.25, 0.50, "Emerging",     "#6366F1"),
    (0.50, 0.70, "Active",       "#3B82F6"),
    (0.70, 0.85, "Accelerating", "#10B981"),
    (0.85, 1.00, "Peak Demand",  "#F59E0B"),
]


def normalize_min_max(value: float, min_val: float, max_val: float) -> float:
    """Normalize a value to [0, 1] using min-max scaling."""
    if max_val == min_val:
        return 0.5
    return max(0.0, min(1.0, (value - min_val) / (max_val - min_val)))


def classify_odi(odi_score: float) -> Tuple[str, str]:
    """Return (classification_label, color_hex) for an ODI score."""
    for lo, hi, label, color in ODI_CLASSIFICATIONS:
        if lo <= odi_score <= hi:
            return label, color
    return "Peak Demand", "#F59E0B"


def compute_mission_growth(yearly_df: pd.DataFrame) -> float:
    """
    Mission growth component.
    Uses compound annual growth rate (CAGR) over the last 5 years.
    Normalized against historical max CAGR.
    """
    recent = yearly_df.nlargest(5, "year")
    if len(recent) < 2:
        return 0.5

    oldest = recent["total_missions"].iloc[-1]
    newest = recent["total_missions"].iloc[0]

    if oldest <= 0:
        return 0.5

    n_years = len(recent) - 1
    cagr = (newest / oldest) ** (1.0 / n_years) - 1  # e.g., 0.15 = 15% per year

    # Normalize: 0% CAGR = 0.0, 30%+ CAGR = 1.0
    return normalize_min_max(cagr, -0.10, 0.30)


def compute_satellite_activity(
    yearly_df: pd.DataFrame,
    sat_df: Optional[pd.DataFrame] = None,
) -> float:
    """
    Satellite activity component.
    Based on 3-year rolling average of satellite deployments.
    """
    if sat_df is not None and not sat_df.empty and "total_satellites" in sat_df.columns:
        recent_sats = sat_df.nlargest(3, "year")["total_satellites"].mean()
        all_sats_max = sat_df["total_satellites"].max()
        if all_sats_max > 0:
            return normalize_min_max(recent_sats, 0, all_sats_max)

    # Fallback: use missions as proxy
    if "total_missions" not in yearly_df.columns:
        return 0.5
    recent = yearly_df.nlargest(3, "year")["total_missions"].mean()
    return normalize_min_max(recent, 0, yearly_df["total_missions"].max())


def compute_launch_frequency(yearly_df: pd.DataFrame) -> float:
    """
    Launch frequency component.
    Based on launches per year relative to historical maximum.
    """
    if "total_missions" not in yearly_df.columns:
        return 0.5
    recent_avg = yearly_df.nlargest(5, "year")["total_missions"].mean()
    max_ever = yearly_df["total_missions"].max()
    return normalize_min_max(recent_avg, 0, max_ever)


def compute_research_activity(
    mission_type_df: Optional[pd.DataFrame] = None,
    yearly_df: Optional[pd.DataFrame] = None,
) -> float:
    """
    Research activity component.
    Based on science/technology mission share in recent years.
    """
    research_types = {"Science", "Technology Demonstration", "Deep Space"}

    if mission_type_df is not None and not mission_type_df.empty:
        recent = mission_type_df[mission_type_df["year"] >= mission_type_df["year"].max() - 3]
        if not recent.empty and "mission_count" in recent.columns:
            total = recent["mission_count"].sum()
            research = recent[recent["mission_type"].isin(research_types)]["mission_count"].sum()
            if total > 0:
                share = research / total
                # Normalize: 0% research = 0.0, 30%+ research = 1.0
                return normalize_min_max(share, 0.0, 0.30)

    return 0.4  # Reasonable default


def calculate_odi(
    yearly_df: pd.DataFrame,
    sat_df: Optional[pd.DataFrame] = None,
    mission_type_df: Optional[pd.DataFrame] = None,
    country: Optional[str] = None,
) -> Dict:
    """
    Calculate the Orbital Demand Index (ODI).

    Args:
        yearly_df:       Yearly aggregated missions (from analytics/yearly parquet)
        sat_df:          Optional yearly satellite counts
        mission_type_df: Optional mission type breakdown (from analytics/mission_type)
        country:         If provided, filter to this country only

    Returns:
        ODI result dict with score, classification, components, and breakdown
    """
    if yearly_df.empty:
        return {
            "odi_score":      0.0,
            "classification": "Dormant",
            "color":          "#4B5563",
            "components":     {k: 0.0 for k in ODI_WEIGHTS},
            "weights":        ODI_WEIGHTS,
            "disclaimer":     _disclaimer(),
        }

    # Component calculations
    components = {
        "mission_growth":     compute_mission_growth(yearly_df),
        "satellite_activity": compute_satellite_activity(yearly_df, sat_df),
        "launch_frequency":   compute_launch_frequency(yearly_df),
        "research_activity":  compute_research_activity(mission_type_df, yearly_df),
    }

    # Weighted sum
    odi_score = sum(
        components[k] * ODI_WEIGHTS[k] for k in ODI_WEIGHTS
    )
    odi_score = round(max(0.0, min(1.0, odi_score)), 4)

    classification, color = classify_odi(odi_score)

    # Year-over-year trend for context
    yearly_sorted = yearly_df.sort_values("year")
    if len(yearly_sorted) >= 2:
        last_year_demand = int(yearly_sorted["total_missions"].iloc[-1])
        prev_year_demand = int(yearly_sorted["total_missions"].iloc[-2])
        yoy_growth = ((last_year_demand - prev_year_demand) / max(prev_year_demand, 1)) * 100
    else:
        last_year_demand = 0
        yoy_growth = 0.0

    return {
        "odi_score":          odi_score,
        "classification":     classification,
        "color":              color,
        "components":         {k: round(v, 4) for k, v in components.items()},
        "weights":            ODI_WEIGHTS,
        "country":            country or "Global",
        "data_points":        len(yearly_df),
        "latest_year_demand": last_year_demand,
        "yoy_growth_pct":     round(yoy_growth, 2),
        "disclaimer":         _disclaimer(),
    }


def _disclaimer() -> str:
    return (
        "The Orbital Demand Index (ODI) is a project-defined composite analytical "
        "indicator created for the ORBITALYTICS academic project. It is NOT an "
        "official metric from NASA, ISRO, ESA, or any government space agency."
    )
