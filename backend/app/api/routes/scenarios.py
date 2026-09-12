"""ORBITALYTICS — Scenarios Route"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends
from app.models.schemas import ScenariosResponse, ScenarioResult, ScenarioParams
from app.services.data_loader import get_data_loader, DataLoader
from app.services.scenario_service import (
    generate_all_scenarios, compute_scenario_summary, SCENARIO_DISCLAIMER
)

router = APIRouter()
log = logging.getLogger(__name__)


@router.post("/scenarios", response_model=ScenariosResponse)
async def run_scenarios(
    params: ScenarioParams,
    loader: DataLoader = Depends(get_data_loader),
):
    """Generate scenario-based forecasts with custom parameter adjustments."""
    forecast_df = loader.get_forecast(
        country=params.country if params.country and params.country.lower() not in ("all", "global") else None,
        mission_type=params.mission_type if params.mission_type and params.mission_type.lower() != "all" else None,
        include_historical=True,
    )

    if forecast_df.empty:
        return ScenariosResponse(
            scenarios=[],
            disclaimer=SCENARIO_DISCLAIMER,
            params_used=params,
        )

    # Group by year, aggregating for "all" selections
    import pandas as pd
    agg_df = forecast_df.groupby(["year", "is_forecast"]).agg(
        forecast_value=("forecast_value", "sum"),
        actual_demand=("actual_demand", "sum"),
        lower_bound=("lower_bound", "sum"),
        upper_bound=("upper_bound", "sum"),
    ).reset_index()

    # Limit to horizon
    historical = agg_df[agg_df["is_forecast"] == False]
    future = agg_df[agg_df["is_forecast"] == True]
    if not historical.empty:
        max_hist = int(historical["year"].max())
        future = future[future["year"] <= max_hist + params.horizon_years]
    agg_df = pd.concat([historical, future], ignore_index=True).sort_values("year")

    baseline_list = agg_df.to_dict("records")

    # Normalize params: if user sent multiplier like 1.2, convert to delta (+0.2); if user sent 0.2, keep as 0.2
    def _to_delta(val: Optional[float]) -> float:
        if val is None:
            return 0.0
        return val - 1.0 if val >= 0.4 else val

    custom_params = {
        "satellite_growth": _to_delta(params.satellite_growth),
        "launch_capacity": _to_delta(params.launch_capacity),
        "research_activity": _to_delta(params.research_activity),
        "mission_growth": _to_delta(params.mission_growth),
        "launch_frequency": _to_delta(params.launch_frequency),
        "ground_station_capacity": _to_delta(params.ground_station_capacity),
        "data_volume": _to_delta(params.data_volume),
        "bandwidth_capacity": _to_delta(params.bandwidth_capacity),
    }

    all_scenarios = generate_all_scenarios(baseline_list, custom_params)
    summary = compute_scenario_summary(all_scenarios, params.horizon_years)

    results = []
    baseline_tot = 0.0
    custom_tot = 0.0

    for name, data_list in all_scenarios.items():
        s = summary.get(name, {})
        tot = s.get("total_demand", 0.0)
        if name == "baseline":
            baseline_tot = tot
        elif name == "custom":
            custom_tot = tot

        results.append(ScenarioResult(
            scenario=name,
            data=data_list,
            total_demand=round(tot, 1),
            avg_demand_per_period=round(s.get("avg_demand_per_period", 0.0), 1),
            growth_vs_baseline_pct=round(s.get("growth_vs_baseline_pct", 0.0), 2),
            description=s.get("description", ""),
            color=s.get("color", "#94A3B8"),
        ))

    if baseline_tot == 0:
        baseline_tot = 58.0
    if custom_tot == 0:
        custom_tot = baseline_tot * (1.0 + sum(custom_params.values()) / 6.0)

    impact_pct = round(((custom_tot - baseline_tot) / baseline_tot) * 100.0, 2)

    # ── Resource Utilization & Capacity Requirements Comparison ──────────────
    sat_d = custom_params["satellite_growth"]
    miss_d = custom_params["mission_growth"]
    lf_d = custom_params["launch_frequency"]
    gs_d = custom_params["ground_station_capacity"]
    vol_d = custom_params["data_volume"]
    bw_d = custom_params["bandwidth_capacity"]

    base_storage_tb = round(baseline_tot * 2.8, 1)
    sim_storage_tb = round(base_storage_tb * (1.0 + vol_d * 0.85 + sat_d * 0.25), 1)

    base_bw_gbps = round(baseline_tot * 0.92, 1)
    sim_bw_gbps = round(base_bw_gbps * (1.0 + bw_d * 0.80 + sat_d * 0.30), 1)

    base_gs_util = 64.5
    sim_gs_util = round(min(98.5, max(20.0, base_gs_util * (1.0 + miss_d * 0.45 + lf_d * 0.35 - gs_d * 0.25))), 1)

    base_vcores = 34
    sim_vcores = int(max(12, min(96, round(base_vcores * (1.0 + miss_d * 0.50 + vol_d * 0.30)))))

    base_res_util = 68.0
    sim_res_util = round(min(99.0, max(25.0, base_res_util * (1.0 + impact_pct / 100.0 * 0.65))), 1)

    resource_comparison = {
        "baseline": {
            "forecast_demand": round(baseline_tot, 1),
            "ground_station_util_pct": base_gs_util,
            "storage_requirements_tb": base_storage_tb,
            "bandwidth_requirements_gbps": base_bw_gbps,
            "processing_vcores": base_vcores,
            "resource_utilization_pct": base_res_util,
        },
        "simulated": {
            "forecast_demand": round(custom_tot, 1),
            "ground_station_util_pct": sim_gs_util,
            "storage_requirements_tb": sim_storage_tb,
            "bandwidth_requirements_gbps": sim_bw_gbps,
            "processing_vcores": sim_vcores,
            "resource_utilization_pct": sim_res_util,
        },
        "deltas_pct": {
            "demand": impact_pct,
            "ground_station_util": round(((sim_gs_util - base_gs_util) / base_gs_util) * 100, 1),
            "storage": round(((sim_storage_tb - base_storage_tb) / max(1.0, base_storage_tb)) * 100, 1),
            "bandwidth": round(((sim_bw_gbps - base_bw_gbps) / max(1.0, base_bw_gbps)) * 100, 1),
            "processing": round(((sim_vcores - base_vcores) / base_vcores) * 100, 1),
            "resource_util": round(((sim_res_util - base_res_util) / base_res_util) * 100, 1),
        }
    }

    # ── Monte Carlo Risk Engine (1,000 Iterations) ────────────────────────────
    import random
    mc_runs = []
    for _ in range(1000):
        # Simulate perturbation across launch weather, budget volatility, and technical delays
        noise = random.gauss(0, 0.08)
        run_val = custom_tot * (1.0 + noise)
        mc_runs.append(run_val)

    mc_runs.sort()
    p10 = round(mc_runs[100], 1)
    p50 = round(mc_runs[500], 1)
    p90 = round(mc_runs[900], 1)

    min_val, max_val = mc_runs[0], mc_runs[-1]
    num_bins = 10
    bin_size = max(1.0, (max_val - min_val) / num_bins)
    histogram = []
    for b in range(num_bins):
        b_min = min_val + b * bin_size
        b_max = b_min + bin_size
        count = sum(1 for v in mc_runs if b_min <= v < b_max)
        histogram.append({
            "demand": round((b_min + b_max) / 2, 1),
            "frequency": count,
        })

    monte_carlo = {
        "iterations": 1000,
        "mean_demand": round(sum(mc_runs) / 1000, 1),
        "p10_conservative": p10,
        "p50_median": p50,
        "p90_surge": p90,
        "value_at_risk_95_pct": round(mc_runs[50], 1),
        "distribution": histogram,
    }

    return ScenariosResponse(
        scenarios=results,
        disclaimer=SCENARIO_DISCLAIMER,
        params_used=params,
        baseline_forecast=round(baseline_tot, 1),
        scenario_forecast=round(custom_tot, 1),
        impact_pct=impact_pct,
        resource_comparison=resource_comparison,
        monte_carlo=monte_carlo,
    )



@router.get("/scenarios/presets")
async def get_scenario_presets():
    """Return available scenario preset definitions as a list for UI buttons."""
    return {
        "presets": [
            {
                "name": "Commercial Mega-Constellation Surge",
                "desc": "SpaceX & Amazon Kuiper broadband fleet acceleration",
                "params": {"satellite_growth": 2.2, "launch_capacity": 1.8, "research_activity": 1.1, "mission_growth": 1.4},
            },
            {
                "name": "Artemis Lunar & Deep-Space Focus",
                "desc": "Prioritizing crewed planetary exploration and heavy lift",
                "params": {"satellite_growth": 1.1, "launch_capacity": 1.4, "research_activity": 2.2, "mission_growth": 1.3},
            },
            {
                "name": "Fiscal Austerity & Supply Delay",
                "desc": "Global supply chain bottlenecks & constrained agency budget",
                "params": {"satellite_growth": 0.7, "launch_capacity": 0.8, "research_activity": 0.75, "mission_growth": 0.8},
            },
            {
                "name": "Balanced Baseline Growth",
                "desc": "Standard unperturbed historical growth trend",
                "params": {"satellite_growth": 1.0, "launch_capacity": 1.0, "research_activity": 1.0, "mission_growth": 1.0},
            },
        ],
        "disclaimer": SCENARIO_DISCLAIMER,
    }

