"""
ORBITALYTICS 2.0 — Capacity Planning API Routes
"""
from fastapi import APIRouter, Query
from app.services.capacity_service import get_capacity_service

router = APIRouter()

@router.get("/capacity/plan")
async def get_capacity_plan(horizon_years: int = Query(3, ge=1, le=10)):
    """Computes comprehensive capacity planning metrics across Storage, Compute, Bandwidth, Ground Stations, and Ingestion."""
    service = get_capacity_service()
    return service.get_capacity_plan(horizon_years=horizon_years)

@router.get("/capacity/resources")
async def get_capacity_resources():
    """Returns granular list of monitored resources with utilization and time-to-capacity metrics."""
    service = get_capacity_service()
    data = service.get_capacity_plan(horizon_years=3)
    return {"resources": data.get("resources", [])}
