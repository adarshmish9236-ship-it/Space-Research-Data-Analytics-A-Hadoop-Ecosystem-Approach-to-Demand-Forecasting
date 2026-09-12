"""
ORBITALYTICS 2.0 — Prescriptive Analytics API Routes
"""
from fastapi import APIRouter, Query
from app.services.prescriptive_service import get_prescriptive_engine

router = APIRouter()

@router.get("/prescriptions")
async def get_prescriptive_recommendations(horizon_years: int = Query(3, ge=1, le=10)):
    """Generates prioritized prescriptive recommendations to mitigate forecasted capacity gaps and operational risks."""
    engine = get_prescriptive_engine()
    return engine.generate_prescriptions(horizon_years=horizon_years)
