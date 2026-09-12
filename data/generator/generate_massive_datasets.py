"""
ORBITALYTICS — Big Data Generator for Processed Parquet Datasets
Generates 100,000 resources, 60,000 research activities, and 100,000 telemetry records.
Writes Hive/HDFS partition-compatible Snappy Parquet (partitioned by year) and CSV backups.
"""
import os
import shutil
import time
import random
import numpy as np
import pandas as pd

def main():
    t0 = time.time()
    rng = random.Random(42)
    np.random.seed(42)

    missions_path = "data/processed/missions"
    satellites_path = "data/processed/satellites"
    
    print(f"Reading base entities from {missions_path} and {satellites_path}...")
    missions = pd.read_parquet(missions_path)
    satellites = pd.read_parquet(satellites_path)
    
    n_missions = len(missions)
    n_satellites = len(satellites)
    print(f"Base entities: {n_missions:,} missions, {n_satellites:,} satellites.")

    # Clean up any partial output directories
    for d in ["data/processed/resources", "data/processed/research", "data/processed/telemetry"]:
        if os.path.exists(d):
            shutil.rmtree(d, ignore_errors=True)

    # ──────────────────────────────────────────────────────────────────────────
    # 1. Generate 100,000 Resource Consumption Records
    # ──────────────────────────────────────────────────────────────────────────
    print("\nGenerating 100,000 resource consumption records...")
    t1 = time.time()
    
    res_n = 100_000
    res_m = missions.sample(res_n, replace=True if res_n > n_missions else False, random_state=42).reset_index(drop=True)
    
    sat_map = dict(zip(satellites['mission_id'], satellites['satellite_id']))
    record_ids = [f"RES-{i:07d}" for i in range(1, res_n + 1)]
    sat_ids = [sat_map.get(m_id, f"SAT-VIRT-{rng.randint(1000, 99999):05d}") for m_id in res_m['mission_id']]
    
    payloads = res_m['payload_mass_kg'].values
    m_types = res_m['mission_type'].values
    
    data_mult = np.where(np.isin(m_types, ["Earth Observation", "Science"]), 3.5,
                np.where(m_types == "Weather", 2.0, 1.0))
    
    fuel = np.round(payloads * np.random.uniform(0.08, 0.25, res_n) + np.random.uniform(10, 50, res_n), 2)
    energy_mwh = np.round((payloads / 100.0) * np.random.uniform(0.5, 2.2, res_n) + np.random.uniform(5, 30, res_n), 2)
    storage_gb = np.round(np.random.uniform(500, 3500, res_n) * data_mult, 1)
    bandwidth_gbps = np.round(np.random.uniform(1.2, 18.5, res_n) * (data_mult * 0.8), 2)
    ground_hrs = np.round(np.random.uniform(12.0, 96.0, res_n) * (data_mult * 0.7), 1)
    maint_hrs = np.round(np.random.uniform(4.0, 48.0, res_n), 1)

    df_resources = pd.DataFrame({
        "record_id": record_ids,
        "mission_id": res_m["mission_id"],
        "satellite_id": sat_ids,
        "timestamp": res_m["launch_date"],
        "country": res_m["country"],
        "mission_type": res_m["mission_type"],
        "fuel_consumption_kg": fuel,
        "energy_consumption_mwh": energy_mwh,
        "storage_usage_gb": storage_gb,
        "bandwidth_usage_gbps": bandwidth_gbps,
        "ground_station_hours": ground_hrs,
        "maintenance_hours": maint_hrs,
        "year": res_m["year"],
    })
    
    df_resources.to_parquet("data/processed/resources", partition_cols=["year"], index=False, compression="snappy")
    df_resources.to_csv("data/raw/resources.csv", index=False)
    print(f"[OK] Saved 100,000 resources (partitioned by year) in {time.time()-t1:.2f}s")

    # ──────────────────────────────────────────────────────────────────────────
    # 2. Generate 60,000 Scientific Research & Microgravity Experiment Records
    # ──────────────────────────────────────────────────────────────────────────
    print("\nGenerating 60,000 scientific research records...")
    t2 = time.time()
    
    rsh_n = 60_000
    rsh_candidates = missions[missions["mission_type"].isin([
        "Science", "Earth Observation", "Deep Space", "Space Station", "Weather", "Technology Demonstration"
    ])]
    if len(rsh_candidates) < rsh_n:
        rsh_m = rsh_candidates.sample(rsh_n, replace=True, random_state=42).reset_index(drop=True)
    else:
        rsh_m = rsh_candidates.sample(rsh_n, random_state=42).reset_index(drop=True)

    domains = [
        "Astrophysics", "Planetary Geology", "Microgravity Biology",
        "Materials Science", "Atmospheric Physics", "Quantum Communications",
        "Solar Dynamics", "Exoplanetology", "Relativistic Physics", "Space Botany"
    ]
    exp_types = [
        "Spectroscopic Survey", "Orbital Crystallography", "Radiation Profiling",
        "Thermal Imaging", "Autonomous Navigation", "Lidar Surface Mapping",
        "Gravitational Wave Detection", "Plasma Physics", "Fluid Dynamics", "Cosmic Dust Analysis"
    ]
    
    df_research = pd.DataFrame({
        "research_id": [f"RSH-{i:07d}" for i in range(1, rsh_n + 1)],
        "mission_id": rsh_m["mission_id"],
        "country": rsh_m["country"],
        "experiment_type": np.random.choice(exp_types, rsh_n),
        "research_domain": np.random.choice(domains, rsh_n),
        "duration_days": np.random.randint(15, 720, rsh_n),
        "data_generated_gb": np.round(np.random.exponential(1200, rsh_n) + 150, 1),
        "personnel_required": np.random.randint(2, 45, rsh_n),
        "equipment_count": np.random.randint(1, 16, rsh_n),
        "resource_cost_musd": np.round(np.random.uniform(0.8, 48.5, rsh_n), 2),
        "success": np.random.choice([True, True, True, True, False], rsh_n),
        "year": rsh_m["year"],
    })
    
    df_research.to_parquet("data/processed/research", partition_cols=["year"], index=False, compression="snappy")
    df_research.to_csv("data/raw/research.csv", index=False)
    print(f"[OK] Saved 60,000 research records (partitioned by year) in {time.time()-t2:.2f}s")

    # ──────────────────────────────────────────────────────────────────────────
    # 3. Generate 100,000 High-Frequency Satellite Telemetry Logs
    # ──────────────────────────────────────────────────────────────────────────
    print("\nGenerating 100,000 high-frequency telemetry logs...")
    t3 = time.time()
    
    tel_n = 100_000
    tel_sats = satellites.sample(tel_n, replace=True, random_state=42).reset_index(drop=True)
    
    is_anomaly = np.random.random(tel_n) < 0.035  # 3.5% anomalies
    temp = np.round(np.random.uniform(15.0, 45.0, tel_n) + np.where(is_anomaly, np.random.uniform(30.0, 65.0, tel_n), 0.0), 1)
    power_w = np.round(np.random.uniform(350.0, 2400.0, tel_n) + np.where(is_anomaly, np.random.uniform(750.0, 1600.0, tel_n), 0.0), 1)
    signal_dbm = np.round(np.random.uniform(-110.0, -65.0, tel_n) - np.where(is_anomaly, np.random.uniform(25.0, 45.0, tel_n), 0.0), 1)
    data_rate = np.round(np.random.uniform(50.0, 1250.0, tel_n), 1)
    storage_pct = np.round(np.clip(np.random.uniform(20.0, 85.0, tel_n) + np.where(is_anomaly, 20.0, 0.0), 5.0, 99.8), 1)
    voltage = np.round(np.random.uniform(27.8, 28.6, tel_n) + np.where(is_anomaly, np.random.uniform(-4.0, 4.0, tel_n), 0.0), 2)
    solar_flux = np.round(np.random.uniform(1280.0, 1420.0, tel_n), 1)
    
    status = np.where(is_anomaly, "Anomaly", 
             np.where(tel_sats["status"] == "Operational", "Nominal", tel_sats["status"]))

    df_telemetry = pd.DataFrame({
        "telemetry_id": [f"TLM-{i:07d}" for i in range(1, tel_n + 1)],
        "satellite_id": tel_sats["satellite_id"],
        "timestamp": tel_sats["launch_date"],
        "temperature_c": temp,
        "power_usage_w": power_w,
        "signal_strength_dbm": signal_dbm,
        "data_rate_mbps": data_rate,
        "storage_utilization_pct": storage_pct,
        "voltage_v": voltage,
        "solar_flux_w_m2": solar_flux,
        "operational_status": status,
        "is_anomaly": is_anomaly,
        "year": tel_sats["year"],
    })
    
    df_telemetry.to_parquet("data/processed/telemetry", partition_cols=["year"], index=False, compression="snappy")
    df_telemetry.to_csv("data/raw/telemetry.csv", index=False)
    print(f"[OK] Saved 100,000 telemetry records (partitioned by year) in {time.time()-t3:.2f}s")

    print("\n" + "="*60)
    print(f"DATA GENERATION COMPLETE in {time.time()-t0:.2f}s!")
    print(f"  Missions:     {n_missions:,} records")
    print(f"  Launches:     100,000 records")
    print(f"  Satellites:   {n_satellites:,} records")
    print(f"  Resources:    100,000 records")
    print(f"  Research:      60,000 records")
    print(f"  Telemetry:    100,000 records")
    print(f"  Total Lake:   {n_missions + 100000 + n_satellites + 100000 + 60000 + 100000:,} records")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
