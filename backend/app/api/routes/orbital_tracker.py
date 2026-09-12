"""ORBITALYTICS — Orbital Constellation & Ground Station Telemetry API
Calculates real-time satellite positions, ground footprints, and ground station link budgets.
"""
import math
import time
from typing import Optional
from fastapi import APIRouter

router = APIRouter()

GROUND_STATIONS = [
    {"id": "GS-NOR-01", "name": "Svalbard Satellite Station", "country": "Norway", "lat": 78.229, "lon": 15.407, "status": "ONLINE", "uplink_band": "S/X-Band", "elevation_limit_deg": 5},
    {"id": "GS-USA-01", "name": "Goldstone Deep Space Comm", "country": "USA", "lat": 35.426, "lon": -116.890, "status": "ONLINE", "uplink_band": "S/X/Ka-Band", "elevation_limit_deg": 10},
    {"id": "GS-ESP-01", "name": "Madrid Deep Space Comm", "country": "Spain", "lat": 40.427, "lon": -4.249, "status": "ONLINE", "uplink_band": "S/X/Ka-Band", "elevation_limit_deg": 10},
    {"id": "GS-AUS-01", "name": "Canberra Deep Space Comm", "country": "Australia", "lat": -35.401, "lon": 148.981, "status": "ONLINE", "uplink_band": "S/X/Ka-Band", "elevation_limit_deg": 10},
    {"id": "GS-IND-01", "name": "ISTRAC Bengaluru", "country": "India", "lat": 13.033, "lon": 77.564, "status": "ONLINE", "uplink_band": "S/X-Band", "elevation_limit_deg": 5},
    {"id": "GS-GUF-01", "name": "Kourou Tracking Station", "country": "French Guiana", "lat": 5.251, "lon": -52.804, "status": "ONLINE", "uplink_band": "S-Band", "elevation_limit_deg": 5},
]

SATELLITE_CATALOG = [
    {
        "id": "ISS-25544",
        "name": "International Space Station (ISS)",
        "orbit": "LEO",
        "altitude_km": 418.0,
        "velocity_kms": 7.66,
        "inclination_deg": 51.64,
        "period_min": 92.9,
        "operator": "NASA / ESA / JAXA / CSA",
        "purpose": "Human Spaceflight & Microgravity Lab",
        "color": "#00C8E8",
    },
    {
        "id": "HST-20580",
        "name": "Hubble Space Telescope",
        "orbit": "LEO",
        "altitude_km": 538.0,
        "velocity_kms": 7.59,
        "inclination_deg": 28.47,
        "period_min": 95.4,
        "operator": "NASA / ESA",
        "purpose": "Deep Astrophysics Observatory",
        "color": "#818CF8",
    },
    {
        "id": "STARLINK-3142",
        "name": "Starlink-3142 (Constellation)",
        "orbit": "LEO",
        "altitude_km": 550.0,
        "velocity_kms": 7.58,
        "inclination_deg": 53.05,
        "period_min": 95.6,
        "operator": "SpaceX",
        "purpose": "Global Broadband Mega-Constellation",
        "color": "#10B981",
    },
    {
        "id": "NAVSTAR-82",
        "name": "GPS Block IIF (Navstar 82)",
        "orbit": "MEO",
        "altitude_km": 20200.0,
        "velocity_kms": 3.87,
        "inclination_deg": 55.0,
        "period_min": 718.0,
        "operator": "US Space Force",
        "purpose": "Global Positioning Navigation",
        "color": "#F59E0B",
    },
    {
        "id": "ASTRAEA-3",
        "name": "Astraea-3 Telecom",
        "orbit": "GEO",
        "altitude_km": 35786.0,
        "velocity_kms": 3.07,
        "inclination_deg": 0.05,
        "period_min": 1436.0,
        "operator": "Orbitalytics Comm Fleet",
        "purpose": "High-Throughput Geostationary Relay",
        "color": "#EC4899",
    },
    {
        "id": "SENTINEL-3A",
        "name": "Sentinel-3A (Polar / SSO)",
        "orbit": "LEO-Polar",
        "altitude_km": 814.5,
        "velocity_kms": 7.44,
        "inclination_deg": 98.65,
        "period_min": 101.0,
        "operator": "ESA / Copernicus",
        "purpose": "Ocean Topography & Polar Climate Observation",
        "color": "#06B6D4",
    },
    {
        "id": "TIANGONG-48274",
        "name": "Tiangong Space Station",
        "orbit": "LEO",
        "altitude_km": 390.0,
        "velocity_kms": 7.68,
        "inclination_deg": 41.47,
        "period_min": 92.2,
        "operator": "CMSA",
        "purpose": "Modular Orbital Station",
        "color": "#F43F5E",
    },
]


@router.get("/orbit/satellites")
async def get_live_satellites():
    """Calculate and return live sub-satellite geographic coordinates and telemetry."""
    now = time.time()
    satellites_live = []

    for sat in SATELLITE_CATALOG:
        period_sec = sat["period_min"] * 60.0
        phase = (now % period_sec) / period_sec * 2 * math.pi

        # Dynamic latitude oscillating between -inclination and +inclination
        lat = round(sat["inclination_deg"] * math.sin(phase), 3)

        # Longitude drifting westward with Earth's rotation
        earth_rot_rate = 360.0 / 86400.0  # deg/sec
        orb_rate = 360.0 / period_sec     # deg/sec
        net_lon_rate = orb_rate - earth_rot_rate
        lon = round(((now * net_lon_rate) % 360.0) - 180.0, 3)

        # Footprint radius in km based on altitude
        earth_radius = 6371.0
        alt = sat["altitude_km"]
        horizon_angle = math.acos(earth_radius / (earth_radius + alt))
        footprint_km = round(earth_radius * horizon_angle, 1)

        satellites_live.append({
            **sat,
            "latitude": lat,
            "longitude": lon,
            "footprint_radius_km": footprint_km,
            "ground_track_history": [
                {
                    "lat": round(sat["inclination_deg"] * math.sin(phase - (i * 0.15)), 2),
                    "lon": round((((now - i * 180) * net_lon_rate) % 360.0) - 180.0, 2),
                }
                for i in range(12)
            ],
            "next_pass": {
                "ground_station": "Svalbard (Norway)" if lat > 40 else "Canberra (Australia)" if lat < -20 else "Goldstone (USA)",
                "minutes_remaining": round(15.0 + 35.0 * math.cos(phase), 1),
                "max_elevation_deg": round(45.0 + 40.0 * math.sin(phase), 1),
            }
        })

    return {
        "count": len(satellites_live),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)),
        "satellites": satellites_live,
    }


@router.get("/orbit/ground-stations")
async def get_ground_stations():
    """Retrieve global ground tracking station network."""
    return {
        "count": len(GROUND_STATIONS),
        "network": "Deep Space & Near-Earth Tracking Array",
        "stations": GROUND_STATIONS,
    }
