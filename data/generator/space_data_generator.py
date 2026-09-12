"""
SpaceDemand — Synthetic Space Data Generator
==============================================
Generates realistic synthetic datasets for the space analytics pipeline.

IMPORTANT: This data is ENTIRELY SYNTHETIC and is NOT real-world data.
It is generated using statistical distributions calibrated to approximate
historical space industry patterns for educational/academic demonstration purposes.

Datasets generated:
  - missions.csv       : Space missions (primary entity)
  - launches.csv       : Launch events
  - satellites.csv     : Deployed satellites
  - agencies.csv       : Space agencies (reference)

Usage:
    python space_data_generator.py --scale 100000
    python space_data_generator.py --scale 500000 --seed 42
    python space_data_generator.py --scale 1000000 --output-dir /path/to/output
"""

import argparse
import os
import random
import math
import csv
import time
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional

# ── Reproducible randomness ───────────────────────────────────────────────────
DEFAULT_SEED = 42
rng = random.Random(DEFAULT_SEED)

# ── Space industry reference data ─────────────────────────────────────────────
COUNTRIES: List[Tuple[str, float]] = [
    ("USA", 0.32), ("Russia", 0.18), ("China", 0.16), ("ESA", 0.08),
    ("India", 0.06), ("Japan", 0.05), ("France", 0.03), ("Germany", 0.02),
    ("UK", 0.02), ("Israel", 0.01), ("South Korea", 0.01), ("UAE", 0.01),
    ("Canada", 0.01), ("Italy", 0.01), ("Brazil", 0.01), ("Other", 0.02),
]

AGENCIES: Dict[str, List[str]] = {
    "USA":         ["NASA", "SpaceX", "ULA", "Boeing", "Northrop Grumman", "Rocket Lab"],
    "Russia":      ["Roscosmos", "ISS-Reshetnev"],
    "China":       ["CNSA", "CASC", "CASIC", "GALACTIC ENERGY"],
    "ESA":         ["ESA", "Arianespace"],
    "India":       ["ISRO"],
    "Japan":       ["JAXA", "MHI"],
    "France":      ["CNES", "Arianespace"],
    "Germany":     ["DLR"],
    "UK":          ["UKSA", "OneWeb"],
    "Israel":      ["ISA"],
    "South Korea": ["KARI"],
    "UAE":         ["UAESA"],
    "Canada":      ["CSA"],
    "Italy":       ["ASI"],
    "Brazil":      ["AEB"],
    "Other":       ["Unknown Agency"],
}

AGENCY_TYPES = ["Government", "Commercial", "Military", "Academic", "Private"]

MISSION_TYPES: List[Tuple[str, float]] = [
    ("Earth Observation", 0.22),
    ("Communications", 0.20),
    ("Navigation", 0.10),
    ("Science", 0.14),
    ("Technology Demonstration", 0.08),
    ("Weather", 0.06),
    ("Crewed Mission", 0.03),
    ("Deep Space", 0.04),
    ("Military Reconnaissance", 0.07),
    ("Supply/Resupply", 0.04),
    ("Space Station", 0.02),
]

LAUNCH_VEHICLES: List[Tuple[str, str, float]] = [
    # (vehicle, country, relative_weight)
    ("Falcon 9", "USA", 0.18),
    ("Falcon Heavy", "USA", 0.04),
    ("Atlas V", "USA", 0.05),
    ("Delta IV", "USA", 0.03),
    ("Antares", "USA", 0.03),
    ("Electron", "USA", 0.04),
    ("Vulcan Centaur", "USA", 0.02),
    ("Soyuz", "Russia", 0.10),
    ("Proton-M", "Russia", 0.04),
    ("Angara", "Russia", 0.02),
    ("Long March 2", "China", 0.05),
    ("Long March 3", "China", 0.04),
    ("Long March 5", "China", 0.03),
    ("Long March 7", "China", 0.02),
    ("Ariane 5", "ESA", 0.05),
    ("Ariane 6", "ESA", 0.02),
    ("PSLV", "India", 0.04),
    ("GSLV", "India", 0.02),
    ("H-IIA", "Japan", 0.03),
    ("H3", "Japan", 0.01),
    ("Shavit", "Israel", 0.01),
    ("NURI", "South Korea", 0.01),
    ("Other", "Other", 0.02),
]

ORBIT_TYPES: List[Tuple[str, float]] = [
    ("LEO", 0.48),   # Low Earth Orbit
    ("GEO", 0.22),   # Geostationary
    ("MEO", 0.08),   # Medium Earth Orbit
    ("SSO", 0.12),   # Sun-synchronous
    ("HEO", 0.04),   # Highly Elliptical
    ("GTO", 0.03),   # Geostationary Transfer
    ("Heliocentric", 0.02),
    ("Lunar", 0.01),
]

LAUNCH_SITES: List[Tuple[str, str]] = [
    ("Kennedy Space Center", "USA"),
    ("Vandenberg SFB", "USA"),
    ("Cape Canaveral", "USA"),
    ("Baikonur Cosmodrome", "Russia"),
    ("Vostochny Cosmodrome", "Russia"),
    ("Plesetsk Cosmodrome", "Russia"),
    ("Jiuquan Satellite Launch Center", "China"),
    ("Xichang Satellite Launch Center", "China"),
    ("Taiyuan Satellite Launch Center", "China"),
    ("Wenchang Space Launch Site", "China"),
    ("Satish Dhawan Space Centre", "India"),
    ("Tanegashima Space Center", "Japan"),
    ("Guiana Space Centre", "ESA"),
    ("Palmachim Air Base", "Israel"),
    ("Naro Space Center", "South Korea"),
    ("Al Anbar", "UAE"),
]

SATELLITE_PURPOSES: List[Tuple[str, float]] = [
    ("Communications", 0.28),
    ("Earth Observation", 0.24),
    ("Navigation", 0.12),
    ("Scientific Research", 0.12),
    ("Weather Monitoring", 0.08),
    ("Technology Testing", 0.07),
    ("Military", 0.06),
    ("Space Exploration", 0.03),
]

SATELLITE_STATUSES: List[Tuple[str, float]] = [
    ("Operational", 0.55),
    ("Retired", 0.25),
    ("Failed", 0.10),
    ("Partially Operational", 0.07),
    ("In Testing", 0.03),
]


def weighted_choice(options: List[Tuple], rng_instance: random.Random) -> str:
    """Pick a weighted random choice from a list of (value, weight) tuples."""
    values, weights = zip(*options)
    total = sum(weights)
    r = rng_instance.random() * total
    cumulative = 0.0
    for value, weight in zip(values, weights):
        cumulative += weight
        if r <= cumulative:
            return value
    return values[-1]


def random_date(start_year: int, end_year: int, rng_instance: random.Random) -> datetime:
    """Generate a random date with realistic growth trend (more recent years have more launches)."""
    # Weight towards more recent years (exponential growth in space activity)
    year_range = end_year - start_year
    # Use a power distribution to skew towards recent years
    u = rng_instance.random()
    # Skew: more launches in recent years
    skewed_u = u ** 0.5  # Square root skews towards 1.0 (recent)
    year = start_year + int(skewed_u * year_range)
    year = max(start_year, min(end_year, year))
    month = rng_instance.randint(1, 12)
    day = rng_instance.randint(1, 28)  # Safe for all months
    return datetime(year, month, day)


def payload_mass_for_mission_type(mission_type: str, rng_instance: random.Random) -> float:
    """Generate realistic payload mass based on mission type (kg)."""
    distributions = {
        "Crewed Mission":              (15000, 5000),
        "Space Station":               (20000, 8000),
        "Supply/Resupply":             (8000, 2000),
        "Communications":              (5000, 2000),
        "Deep Space":                  (3000, 1500),
        "Earth Observation":           (1500, 800),
        "Military Reconnaissance":     (4000, 2000),
        "Navigation":                  (2000, 800),
        "Science":                     (1800, 900),
        "Weather":                     (1200, 500),
        "Technology Demonstration":    (500, 300),
    }
    mean, std = distributions.get(mission_type, (2000, 1000))
    mass = rng_instance.gauss(mean, std)
    return max(50.0, round(mass, 1))


def success_rate_for_year(year: int) -> float:
    """Success rate improved over time (historical trend)."""
    if year < 1970:
        return 0.50
    elif year < 1980:
        return 0.62
    elif year < 1990:
        return 0.72
    elif year < 2000:
        return 0.82
    elif year < 2010:
        return 0.91
    elif year < 2020:
        return 0.95
    else:
        return 0.97


def generate_agencies(rng_instance: random.Random) -> List[Dict]:
    """Generate the agencies reference table (small, deterministic)."""
    records = []
    agency_id = 1
    for country, agency_list in AGENCIES.items():
        for agency_name in agency_list:
            agency_type = rng_instance.choice(
                ["Government", "Government", "Government", "Commercial", "Military"]
                if "NASA" in agency_name or "ISRO" in agency_name or "JAXA" in agency_name
                   or country in ["Russia", "China", "India", "Japan", "ESA"]
                else ["Commercial", "Commercial", "Government", "Private", "Academic"]
            )
            records.append({
                "agency_id": f"AGY-{agency_id:04d}",
                "agency_name": agency_name,
                "country": country,
                "agency_type": agency_type,
                "founded_year": rng_instance.randint(1950, 2015),
                "active": True,
            })
            agency_id += 1
    return records


def generate_missions(
    n: int,
    agencies: List[Dict],
    rng_instance: random.Random,
    start_year: int = 1957,
    end_year: int = 2025,
) -> List[Dict]:
    """Generate n synthetic mission records."""
    agency_by_country: Dict[str, List[str]] = {}
    for a in agencies:
        agency_by_country.setdefault(a["country"], []).append(a["agency_name"])

    records = []
    for i in range(1, n + 1):
        country = weighted_choice(COUNTRIES, rng_instance)
        mission_type = weighted_choice(MISSION_TYPES, rng_instance)
        launch_dt = random_date(start_year, end_year, rng_instance)
        vehicle_data = rng_instance.choice(LAUNCH_VEHICLES)
        vehicle_name = vehicle_data[0]
        orbit = weighted_choice(ORBIT_TYPES, rng_instance)
        payload = payload_mass_for_mission_type(mission_type, rng_instance)
        sr = success_rate_for_year(launch_dt.year)
        success = rng_instance.random() < sr

        agency_list = agency_by_country.get(country, ["Unknown Agency"])
        agency = rng_instance.choice(agency_list)

        records.append({
            "mission_id":     f"MSN-{i:07d}",
            "mission_name":   f"{country}-{mission_type[:3].upper()}-{launch_dt.year}-{i:04d}",
            "launch_date":    launch_dt.strftime("%Y-%m-%d"),
            "year":           launch_dt.year,
            "quarter":        (launch_dt.month - 1) // 3 + 1,
            "month":          launch_dt.month,
            "country":        country,
            "agency":         agency,
            "mission_type":   mission_type,
            "launch_vehicle": vehicle_name,
            "orbit":          orbit,
            "payload_mass_kg": payload,
            "success":        success,
            "cost_million_usd": round(payload * rng_instance.uniform(0.5, 3.0) / 1000, 2),
        })

    return records


def generate_launches(
    missions: List[Dict],
    rng_instance: random.Random,
) -> List[Dict]:
    """Generate launch records linked to missions (1:1 with some extras)."""
    records = []
    used_sites: Dict[str, str] = {}  # site -> country mapping

    site_by_country: Dict[str, List[str]] = {}
    for site, country in LAUNCH_SITES:
        site_by_country.setdefault(country, []).append(site)
    site_by_country["Other"] = ["Unknown Launch Site"]

    for idx, m in enumerate(missions, 1):
        country = m["country"]
        sites = site_by_country.get(country, site_by_country.get("USA", ["Kennedy Space Center"]))
        site = rng_instance.choice(sites)

        records.append({
            "launch_id":       f"LCH-{idx:07d}",
            "mission_id":      m["mission_id"],
            "launch_date":     m["launch_date"],
            "year":            m["year"],
            "quarter":         m["quarter"],
            "launch_site":     site,
            "country":         country,
            "vehicle":         m["launch_vehicle"],
            "payload_mass_kg": m["payload_mass_kg"],
            "mission_type":    m["mission_type"],
            "success":         m["success"],
            "cost_million_usd": m["cost_million_usd"],
            "orbit":           m["orbit"],
        })

    return records


def generate_satellites(
    missions: List[Dict],
    rng_instance: random.Random,
) -> List[Dict]:
    """Generate satellite records. Not every mission deploys a satellite; some deploy multiples."""
    records = []
    sat_id = 1
    no_sat_types = {"Crewed Mission", "Supply/Resupply", "Deep Space"}

    for m in missions:
        if m["mission_type"] in no_sat_types:
            continue
        if not m["success"] and rng_instance.random() < 0.7:
            continue  # failed missions usually don't deploy working satellites

        # Some missions deploy multiple satellites (e.g., rideshare)
        if m["mission_type"] == "Communications" and rng_instance.random() < 0.15:
            count = rng_instance.randint(2, 8)
        elif m["mission_type"] == "Earth Observation" and rng_instance.random() < 0.10:
            count = rng_instance.randint(2, 4)
        else:
            count = 1

        for _ in range(count):
            purpose = weighted_choice(SATELLITE_PURPOSES, rng_instance)
            status = weighted_choice(SATELLITE_STATUSES, rng_instance)
            orbit_type = m["orbit"]
            mass = payload_mass_for_mission_type(m["mission_type"], rng_instance) / count
            mass = max(10.0, round(mass * rng_instance.uniform(0.6, 1.4), 1))

            records.append({
                "satellite_id":   f"SAT-{sat_id:07d}",
                "mission_id":     m["mission_id"],
                "satellite_name": f"{m['country'][:2].upper()}-SAT-{sat_id:06d}",
                "country":        m["country"],
                "operator":       m["agency"],
                "purpose":        purpose,
                "launch_date":    m["launch_date"],
                "year":           m["year"],
                "quarter":        m["quarter"],
                "orbit_type":     orbit_type,
                "mass_kg":        mass,
                "status":         status,
            })
            sat_id += 1

    return records


def generate_resources(
    missions: List[Dict],
    satellites: List[Dict],
    rng_instance: random.Random,
) -> List[Dict]:
    """Generate resource consumption records with realistic physical dependencies."""
    records = []
    rec_id = 1
    sample_missions = missions[:min(len(missions), 50000)]
    sat_map = {s["mission_id"]: s["satellite_id"] for s in satellites}

    for m in sample_missions:
        payload = m["payload_mass_kg"]
        m_type = m["mission_type"]
        sat_id = sat_map.get(m["mission_id"], f"SAT-VIRT-{rec_id:05d}")
        
        # Physical relationships:
        # Higher payload -> more fuel & energy
        fuel = round(payload * rng_instance.uniform(0.08, 0.25) + rng_instance.uniform(10, 50), 2)
        energy_mwh = round((payload / 100) * rng_instance.uniform(0.5, 2.2) + rng_instance.uniform(5, 30), 2)
        
        # Sensor/mission complexity -> data generation -> storage & bandwidth
        data_mult = 3.5 if m_type in ["Earth Observation", "Science"] else (2.0 if m_type == "Weather" else 1.0)
        storage_gb = round(rng_instance.uniform(500, 3500) * data_mult, 1)
        bandwidth_gbps = round(rng_instance.uniform(1.2, 18.5) * (data_mult * 0.8), 2)
        
        # Ground station and maintenance requirements
        ground_hrs = round(rng_instance.uniform(12.0, 96.0) * (data_mult * 0.7), 1)
        maint_hrs = round(rng_instance.uniform(4.0, 48.0), 1)

        records.append({
            "record_id":               f"RES-{rec_id:07d}",
            "mission_id":              m["mission_id"],
            "satellite_id":            sat_id,
            "timestamp":               m["launch_date"],
            "year":                    m["year"],
            "country":                 m["country"],
            "mission_type":            m_type,
            "fuel_consumption_kg":     fuel,
            "energy_consumption_mwh":  energy_mwh,
            "storage_usage_gb":        storage_gb,
            "bandwidth_usage_gbps":    bandwidth_gbps,
            "ground_station_hours":    ground_hrs,
            "maintenance_hours":       maint_hrs,
        })
        rec_id += 1

    return records


def generate_research(
    missions: List[Dict],
    rng_instance: random.Random,
) -> List[Dict]:
    """Generate space research and scientific experiment activities."""
    domains = [
        "Astrophysics", "Planetary Geology", "Microgravity Biology",
        "Materials Science", "Atmospheric Physics", "Quantum Communications",
        "Solar Dynamics", "Exoplanetology"
    ]
    exp_types = [
        "Spectroscopic Survey", "Orbital Crystallography", "Radiation Profiling",
        "Thermal Imaging", "Autonomous Navigation", "Lidar Surface Mapping",
        "Gravitational Wave Detection", "Plasma Physics"
    ]
    records = []
    res_id = 1
    sample_missions = [m for m in missions if m["mission_type"] in ["Science", "Earth Observation", "Deep Space", "Space Station", "Weather"]][:30000]

    for m in sample_missions:
        domain = rng_instance.choice(domains)
        exp = rng_instance.choice(exp_types)
        duration = rng_instance.randint(15, 720)
        data_gen_gb = round(duration * rng_instance.uniform(10.0, 85.0), 1)
        personnel = rng_instance.randint(3, 45)
        equip_count = rng_instance.randint(2, 12)
        cost_musd = round(rng_instance.uniform(1.5, 38.0), 2)

        records.append({
            "research_id":        f"RSC-{res_id:07d}",
            "mission_id":         m["mission_id"],
            "experiment_type":    exp,
            "research_domain":    domain,
            "duration_days":      duration,
            "data_generated_gb":  data_gen_gb,
            "personnel_required": personnel,
            "equipment_count":    equip_count,
            "resource_cost_musd": cost_musd,
            "country":            m["country"],
            "year":               m["year"],
        })
        res_id += 1

    return records


def generate_telemetry(
    satellites: List[Dict],
    rng_instance: random.Random,
) -> List[Dict]:
    """Generate high-frequency satellite telemetry logs with anomaly injection."""
    records = []
    tel_id = 1
    sample_sats = satellites[:min(len(satellites), 10000)]

    for s in sample_sats:
        # Controlled anomalies in 3% of readings
        is_anomaly = rng_instance.random() < 0.03
        
        temp = round(rng_instance.uniform(15.0, 45.0) + (rng_instance.uniform(30.0, 60.0) if is_anomaly else 0.0), 1)
        power_w = round(rng_instance.uniform(350.0, 2400.0) + (rng_instance.uniform(800.0, 1500.0) if is_anomaly else 0.0), 1)
        signal_dbm = round(rng_instance.uniform(-110.0, -65.0) - (rng_instance.uniform(25.0, 45.0) if is_anomaly else 0.0), 1)
        data_rate_mbps = round(rng_instance.uniform(50.0, 1200.0), 1)
        storage_pct = round(min(99.5, rng_instance.uniform(20.0, 85.0) + (20.0 if is_anomaly else 0.0)), 1)
        status = "Anomaly" if is_anomaly else ("Nominal" if s["status"] == "Operational" else s["status"])

        records.append({
            "telemetry_id":            f"TLM-{tel_id:07d}",
            "satellite_id":            s["satellite_id"],
            "timestamp":               s["launch_date"],
            "temperature_c":           temp,
            "power_usage_w":           power_w,
            "signal_strength_dbm":     signal_dbm,
            "data_rate_mbps":          data_rate_mbps,
            "storage_utilization_pct": storage_pct,
            "operational_status":      status,
            "is_anomaly":              is_anomaly,
        })
        tel_id += 1

    return records


def write_csv(records: List[Dict], filepath: str) -> int:
    """Write records to CSV, return count."""
    if not records:
        return 0
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=records[0].keys())
        writer.writeheader()
        writer.writerows(records)
    return len(records)


def generate_all(
    scale: int = 100_000,
    output_dir: str = "../data/raw",
    seed: int = DEFAULT_SEED,
    verbose: bool = True,
) -> Dict[str, int]:
    """
    Main entry point. Generates all datasets at the requested scale.
    """
    rng_instance = random.Random(seed)
    counts: Dict[str, int] = {}
    t0 = time.time()

    if verbose:
        print(f"\n{'='*60}")
        print(f"  SpaceDemand Synthetic Data Generator")
        print(f"  Scale: {scale:,} missions | Seed: {seed}")
        print(f"  NOTE: Data is SYNTHETIC space research data")
        print(f"{'='*60}\n")

    # Agencies
    if verbose:
        print("  [1/7] Generating agencies...")
    agencies = generate_agencies(rng_instance)
    counts["agencies"] = write_csv(agencies, os.path.join(output_dir, "agencies.csv"))

    # Missions
    if verbose:
        print(f"  [2/7] Generating {scale:,} missions...")
    missions = generate_missions(scale, agencies, rng_instance)
    counts["missions"] = write_csv(missions, os.path.join(output_dir, "missions.csv"))

    # Launches
    if verbose:
        print(f"  [3/7] Generating launches...")
    launches = generate_launches(missions, rng_instance)
    counts["launches"] = write_csv(launches, os.path.join(output_dir, "launches.csv"))

    # Satellites
    if verbose:
        print(f"  [4/7] Generating satellites...")
    satellites = generate_satellites(missions, rng_instance)
    counts["satellites"] = write_csv(satellites, os.path.join(output_dir, "satellites.csv"))

    # Resource Consumption
    if verbose:
        print(f"  [5/7] Generating resource consumption...")
    resources = generate_resources(missions, satellites, rng_instance)
    counts["resources"] = write_csv(resources, os.path.join(output_dir, "resources.csv"))

    # Research Activities
    if verbose:
        print(f"  [6/7] Generating research activities...")
    research = generate_research(missions, rng_instance)
    counts["research"] = write_csv(research, os.path.join(output_dir, "research.csv"))

    # Telemetry
    if verbose:
        print(f"  [7/7] Generating telemetry streams...")
    telemetry = generate_telemetry(satellites, rng_instance)
    counts["telemetry"] = write_csv(telemetry, os.path.join(output_dir, "telemetry.csv"))

    elapsed = time.time() - t0
    if verbose:
        print(f"\n{'='*60}")
        print(f"  Generation complete in {elapsed:.1f}s")
        total_records = sum(counts.values())
        print(f"  Total records: {total_records:,}")
        print(f"  Output directory: {os.path.abspath(output_dir)}")
        print(f"{'='*60}\n")

    return counts


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="SpaceDemand Synthetic Space Data Generator"
    )
    parser.add_argument(
        "--scale",
        type=int,
        default=100_000,
        help="Number of mission records to generate (default: 100000)",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=os.path.join(os.path.dirname(__file__), "..", "raw"),
        help="Output directory for CSV files",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=DEFAULT_SEED,
        help="Random seed for reproducibility (default: 42)",
    )
    args = parser.parse_args()

    generate_all(scale=args.scale, output_dir=args.output_dir, seed=args.seed)

