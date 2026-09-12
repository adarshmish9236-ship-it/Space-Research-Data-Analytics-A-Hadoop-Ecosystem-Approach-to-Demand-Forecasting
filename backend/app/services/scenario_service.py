"""
ORBITALYTICS — Scenario Lab Service
=====================================
Generates scenario-based demand forecasts by applying
multipliers to the baseline ML model forecast.

Scenarios:
  Conservative: Applies reduced growth assumptions
  Baseline:     Uses model forecast as-is
  Optimistic:   Applies amplified growth assumptions
  Custom:       User-defined multipliers

IMPORTANT: Scenario outputs are model-derived simulations based on 
parameterized adjustments to historical relationships. They do not 
represent guaranteed future outcomes.
"""

import logging
from typing import Dict, List, Optional
import pandas as pd
import numpy as np

log = logging.getLogger(__name__)


# Scenario presets (multipliers relative to baseline)
SCENARIO_PRESETS = {
    "conservative": {
        "satellite_growth":  -0.10,  # -10% satellites
        "launch_capacity":   -0.05,  # -5% launches
        "research_activity": -0.10,  # -10% research
        "mission_growth":    -0.15,  # -15% missions
        "description": "Reduced investment and activity assumptions",
        "color": "#6366F1",
    },
    "baseline": {
        "satellite_growth":  0.0,
        "launch_capacity":   0.0,
        "research_activity": 0.0,
        "mission_growth":    0.0,
        "description": "Model forecast with no adjustments applied",
        "color": "#3B82F6",
    },
    "optimistic": {
        "satellite_growth":  0.20,   # +20% satellites
        "launch_capacity":   0.15,   # +15% launches
        "research_activity": 0.25,   # +25% research
        "mission_growth":    0.20,   # +20% missions
        "description": "Elevated investment and technology advancement",
        "color": "#10B981",
    },
}


def apply_scenario_multipliers(
    baseline_forecast: List[Dict],
    satellite_growth: float = 0.0,
    launch_capacity: float = 0.0,
    research_activity: float = 0.0,
    mission_growth: float = 0.0,
) -> List[Dict]:
    """
    Apply scenario multipliers to a baseline forecast.

    Each parameter is a fractional adjustment (e.g., +0.15 = +15%).
    Multipliers are applied progressively over forecast horizon.

    The compound effect formula:
      adjusted_value = baseline × (1 + mission_growth) × activity_factor
    
    where activity_factor combines the other multipliers proportionally.
    """
    results = []
    forecast_only = [r for r in baseline_forecast if r.get("is_forecast", False)]
    n_periods = len(forecast_only)

    if n_periods == 0:
        return baseline_forecast

    # Compute combined activity factor
    # Weights match ODI weights for consistency
    activity_factor = (
        0.35 * mission_growth +
        0.25 * satellite_growth +
        0.20 * launch_capacity +
        0.20 * research_activity
    )

    for idx, row in enumerate(baseline_forecast):
        new_row = dict(row)
        if row.get("is_forecast", False):
            # Progressive application: effect accumulates over time
            period_fraction = (idx + 1) / max(n_periods, 1)
            period_factor = 1.0 + activity_factor * period_fraction

            base_val = float(row.get("forecast_value", 0))
            adjusted = max(0.0, base_val * period_factor)

            # Adjust confidence bounds proportionally
            lower = row.get("lower_bound", base_val * 0.85)
            upper = row.get("upper_bound", base_val * 1.15)
            if lower is not None:
                new_row["lower_bound"] = max(0.0, float(lower) * period_factor)
            if upper is not None:
                new_row["upper_bound"] = float(upper) * period_factor

            new_row["forecast_value"] = round(adjusted, 2)
            new_row["scenario_factor"] = round(period_factor, 4)
            new_row["adjustment_pct"] = round(activity_factor * period_fraction * 100, 2)
        results.append(new_row)

    return results


def generate_all_scenarios(
    baseline_forecast: List[Dict],
    custom_params: Optional[Dict] = None,
) -> Dict[str, List[Dict]]:
    """
    Generate Conservative, Baseline, Optimistic, and Custom scenarios.

    Args:
        baseline_forecast: List of forecast dicts from ML model
        custom_params:     User-defined params dict with keys:
                           satellite_growth, launch_capacity,
                           research_activity, mission_growth

    Returns:
        Dict of {scenario_name: adjusted_forecast_list}
    """
    scenarios = {}

    for name, preset in SCENARIO_PRESETS.items():
        scenarios[name] = apply_scenario_multipliers(
            baseline_forecast,
            satellite_growth=preset["satellite_growth"],
            launch_capacity=preset["launch_capacity"],
            research_activity=preset["research_activity"],
            mission_growth=preset["mission_growth"],
        )

    # Custom scenario
    if custom_params:
        scenarios["custom"] = apply_scenario_multipliers(
            baseline_forecast,
            satellite_growth=float(custom_params.get("satellite_growth", 0)),
            launch_capacity=float(custom_params.get("launch_capacity", 0)),
            research_activity=float(custom_params.get("research_activity", 0)),
            mission_growth=float(custom_params.get("mission_growth", 0)),
        )
    else:
        scenarios["custom"] = scenarios["baseline"]

    return scenarios


def compute_scenario_summary(
    scenarios: Dict[str, List[Dict]],
    horizon_years: int = 3,
) -> Dict[str, Dict]:
    """
    Summarize scenarios by computing total projected demand
    and growth compared to baseline.

    Returns:
        Dict with scenario summaries
    """
    summary = {}
    baseline_total = sum(
        r.get("forecast_value", 0)
        for r in scenarios.get("baseline", [])
        if r.get("is_forecast", False)
    )

    for name, forecast in scenarios.items():
        forecast_rows = [r for r in forecast if r.get("is_forecast", False)]
        total = sum(r.get("forecast_value", 0) for r in forecast_rows)
        avg = total / max(len(forecast_rows), 1)

        growth_vs_baseline = (
            ((total - baseline_total) / baseline_total * 100)
            if baseline_total > 0 else 0.0
        )

        preset = SCENARIO_PRESETS.get(name, {})
        summary[name] = {
            "total_demand":          round(total, 2),
            "avg_demand_per_period": round(avg, 2),
            "growth_vs_baseline_pct": round(growth_vs_baseline, 2),
            "description":           preset.get("description", "Custom scenario"),
            "color":                 preset.get("color", "#94A3B8"),
            "forecast_periods":      len(forecast_rows),
        }

    return summary


SCENARIO_DISCLAIMER = (
    "Scenario outputs are simulations based on parameterized adjustments "
    "to the ML model's baseline forecast. They reflect hypothetical conditions "
    "and do not represent guaranteed future outcomes."
)
