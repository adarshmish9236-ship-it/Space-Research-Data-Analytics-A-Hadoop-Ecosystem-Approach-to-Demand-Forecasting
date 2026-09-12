"""
ORBITALYTICS 2.0 — Space Resource Stress Testing Engine
=======================================================
Simulates 8 distinct stress-testing scenarios across the Big Data infrastructure:

1. Baseline (Normal Expected Demand)
2. High Growth (+50% Mission Activity)
3. Extreme Mission Surge (+100% Launch Cadence)
4. Data Explosion (+120% Telemetry Data Ingress)
5. Capacity Reduction (-30% Infrastructure Outage)
6. Processing Bottleneck (-40% YARN Compute Availability)
7. Ground Station Constraint (-50% Polar Tracking Windows)
8. Combined Stress (Compound Multi-Resource Crisis)

Calculates for each scenario:
  - Demand index
  - Capacity limit
  - Utilization %
  - Capacity gap
  - Stress Risk Score (0-100)
  - Resource requirement
  - Operational impact summary
"""

from typing import Dict, Any, List, Optional
from app.services.capacity_service import get_capacity_service


class StressTestingEngine:
    def __init__(self):
        self.capacity_service = get_capacity_service()

    def get_all_scenarios(self) -> Dict[str, Any]:
        """
        Returns pre-evaluated analytics across all 8 standard stress testing scenarios.
        """
        plan = self.capacity_service.get_capacity_plan()
        
        base_demand = 348.0 # missions/yr
        storage_cap = 120.0 # TB
        compute_cap = 96    # Vcores
        bandwidth_cap = 25.0 # Gbps
        stations_cap = 1008.0 # Hrs/Wk

        scenarios_def = [
            {
                "id": "scenario_baseline",
                "name": "Baseline Trajectory",
                "category": "NOMINAL",
                "description": "Standard projected space research and constellation maintenance demand.",
                "demand_mult": 1.0,
                "storage_mult": 1.0,
                "compute_mult": 1.0,
                "bandwidth_mult": 1.0,
                "stations_mult": 1.0,
                "infrastructure_availability": 1.0,
            },
            {
                "id": "scenario_high_growth",
                "name": "High Commercial Growth",
                "category": "DEMAND_SURGE",
                "description": "Commercial space operators accelerate rideshare launches and orbital constellation expansion by +50%.",
                "demand_mult": 1.5,
                "storage_mult": 1.45,
                "compute_mult": 1.4,
                "bandwidth_mult": 1.5,
                "stations_mult": 1.4,
                "infrastructure_availability": 1.0,
            },
            {
                "id": "scenario_extreme_surge",
                "name": "Extreme Mission Surge",
                "category": "CRISIS_PEAK",
                "description": "Sudden concurrent international lunar and multi-agency exploration campaigns double launch cadence.",
                "demand_mult": 2.0,
                "storage_mult": 1.85,
                "compute_mult": 1.9,
                "bandwidth_mult": 1.95,
                "stations_mult": 1.8,
                "infrastructure_availability": 1.0,
            },
            {
                "id": "scenario_data_explosion",
                "name": "Payload Data Explosion",
                "category": "STORAGE_BANDWIDTH",
                "description": "Hyperspectral imaging and synthetic aperture radar (SAR) satellites increase sensor bitrates by 120%.",
                "demand_mult": 1.25,
                "storage_mult": 2.2,
                "compute_mult": 1.6,
                "bandwidth_mult": 2.4,
                "stations_mult": 1.3,
                "infrastructure_availability": 1.0,
            },
            {
                "id": "scenario_capacity_reduction",
                "name": "Infrastructure Hardware Loss",
                "category": "HARDWARE_FAILURE",
                "description": "Simultaneous DataNode disk rack loss and optical ground network fiber disruption reduce cluster capacity by 30%.",
                "demand_mult": 1.1,
                "storage_mult": 1.1,
                "compute_mult": 1.1,
                "bandwidth_mult": 1.1,
                "stations_mult": 1.1,
                "infrastructure_availability": 0.70, # 30% reduction
            },
            {
                "id": "scenario_processing_bottleneck",
                "name": "Compute & YARN Bottleneck",
                "category": "PROCESSING_FAILURE",
                "description": "YARN NodeManager nodes experience high memory thrashing, reducing concurrent Spark vcores by 40%.",
                "demand_mult": 1.35,
                "storage_mult": 1.3,
                "compute_mult": 1.8,
                "bandwidth_mult": 1.3,
                "stations_mult": 1.2,
                "infrastructure_availability": 0.75,
            },
            {
                "id": "scenario_station_constraint",
                "name": "Ground Network Constraint",
                "category": "GROUND_SEGMENT",
                "description": "Extreme solar geomagnetic storms disrupt high-latitude polar ground stations (Kiruna & Svalbard), halving Arctic passes.",
                "demand_mult": 1.3,
                "storage_mult": 1.2,
                "compute_mult": 1.2,
                "bandwidth_mult": 1.2,
                "stations_mult": 1.7,
                "infrastructure_availability": 0.65, # Station capacity drops
            },
            {
                "id": "scenario_combined_stress",
                "name": "Compound Mega-Stress Crisis",
                "category": "COMPOUND_CATASTROPHIC",
                "description": "Simultaneous +80% launch surge combined with 25% ground antenna outage and high telemetry data volumes.",
                "demand_mult": 1.8,
                "storage_mult": 1.9,
                "compute_mult": 1.85,
                "bandwidth_mult": 2.1,
                "stations_mult": 1.9,
                "infrastructure_availability": 0.75,
            },
        ]

        evaluated_scenarios: List[Dict[str, Any]] = []

        for sc in scenarios_def:
            avail = sc["infrastructure_availability"]
            
            # Adjusted resource capacities
            adj_storage_cap = round(storage_cap * avail, 1)
            adj_compute_cap = int(compute_cap * avail)
            adj_bandwidth_cap = round(bandwidth_cap * avail, 1)
            adj_stations_cap = round(stations_cap * avail, 1)

            # Simulated resource utilization
            sim_demand = round(base_demand * sc["demand_mult"], 1)
            sim_storage_used = round(42.6 * sc["storage_mult"], 1)
            sim_compute_used = int(min(adj_compute_cap * 1.5, 64 * sc["compute_mult"]))
            sim_bandwidth_used = round(16.4 * sc["bandwidth_mult"], 1)
            sim_stations_used = round(732.0 * sc["stations_mult"], 1)

            # Utilization percentages
            util_storage = round((sim_storage_used / max(adj_storage_cap, 1.0)) * 100, 1)
            util_compute = round((sim_compute_used / max(adj_compute_cap, 1)) * 100, 1)
            util_bandwidth = round((sim_bandwidth_used / max(adj_bandwidth_cap, 0.1)) * 100, 1)
            util_stations = round((sim_stations_used / max(adj_stations_cap, 1.0)) * 100, 1)

            max_util = max(util_storage, util_compute, util_bandwidth, util_stations)
            
            # Composite stress risk score (0 - 100)
            risk_score = round(min(100.0, (max_util * 0.65) + (sc["demand_mult"] * 15.0) + ((1.0 - avail) * 30.0)), 1)
            severity = "CRITICAL" if risk_score >= 85.0 else ("HIGH" if risk_score >= 70.0 else ("MODERATE" if risk_score >= 50.0 else "NOMINAL"))

            # Bottleneck identified
            bottlenecks = []
            if util_stations > 90.0: bottlenecks.append(f"Ground Stations ({util_stations}%)")
            if util_bandwidth > 90.0: bottlenecks.append(f"Bandwidth ({util_bandwidth}%)")
            if util_compute > 90.0: bottlenecks.append(f"Compute ({util_compute}%)")
            if util_storage > 85.0: bottlenecks.append(f"Storage ({util_storage}%)")
            bottleneck_str = " & ".join(bottlenecks) if bottlenecks else "None (System Headroom Sufficient)"

            evaluated_scenarios.append({
                "id": sc["id"],
                "name": sc["name"],
                "category": sc["category"],
                "description": sc["description"],
                "demand_missions_yr": sim_demand,
                "demand_surge_pct": round((sc["demand_mult"] - 1.0) * 100, 1),
                "infrastructure_availability_pct": round(avail * 100, 1),
                "stress_risk_score": risk_score,
                "severity": severity,
                "max_utilization_pct": max_util,
                "primary_bottleneck": bottleneck_str,
                "resources": {
                    "storage": {
                        "capacity_tb": adj_storage_cap,
                        "used_tb": sim_storage_used,
                        "util_pct": util_storage,
                        "gap_tb": max(0.0, round(sim_storage_used - adj_storage_cap, 1)),
                    },
                    "compute": {
                        "capacity_vcores": adj_compute_cap,
                        "used_vcores": sim_compute_used,
                        "util_pct": util_compute,
                        "gap_vcores": max(0, sim_compute_used - adj_compute_cap),
                    },
                    "bandwidth": {
                        "capacity_gbps": adj_bandwidth_cap,
                        "used_gbps": sim_bandwidth_used,
                        "util_pct": util_bandwidth,
                        "gap_gbps": max(0.0, round(sim_bandwidth_used - adj_bandwidth_cap, 1)),
                    },
                    "ground_stations": {
                        "capacity_hrs_wk": adj_stations_cap,
                        "used_hrs_wk": sim_stations_used,
                        "util_pct": util_stations,
                        "gap_hrs_wk": max(0.0, round(sim_stations_used - adj_stations_cap, 1)),
                    },
                },
                "operational_impact": f"Under '{sc['name']}', infrastructure operates at {max_util}% peak saturation. Primary constraint: {bottleneck_str}.",
                "recommended_mitigation": "Activate dynamic workload balancing and pre-reserve auxiliary commercial ground antennas." if risk_score > 65.0 else "Monitor routine telemetry queues.",
            })

        return {
            "total_scenarios": len(evaluated_scenarios),
            "critical_scenarios_count": sum(1 for s in evaluated_scenarios if s["severity"] == "CRITICAL"),
            "highest_risk_scenario": max(evaluated_scenarios, key=lambda s: s["stress_risk_score"])["name"],
            "scenarios": evaluated_scenarios,
            "engine": "Deterministic Space Infrastructure Stress Simulation Model",
        }


_stress_engine: Optional[StressTestingEngine] = None

def get_stress_engine() -> StressTestingEngine:
    global _stress_engine
    if _stress_engine is None:
        _stress_engine = StressTestingEngine()
    return _stress_engine
