"""
ORBITALYTICS 2.0 — Data & Concept Drift API Routes
"""
from fastapi import APIRouter
from app.services.drift_service import get_drift_service

router = APIRouter()

@router.get("/drift/status")
async def get_drift_status():
    """Returns feature distribution drift metrics, Population Stability Index (PSI), and KS tests."""
    service = get_drift_service()
    return service.get_drift_status()
