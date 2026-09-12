"""
ORBITALYTICS 2.0 — Unified Forecast Risk API Routes
"""
from fastapi import APIRouter
from app.services.risk_service import get_risk_service

router = APIRouter()

@router.get("/risk/score")
async def get_forecast_risk_score():
    """Computes unified 0-100 Forecast Risk Score with explainable factor decomposition."""
    service = get_risk_service()
    return service.get_risk_score()

@router.get("/risk/factors")
async def get_risk_factors():
    """Returns granular contributing factors and statistical evidence driving the current risk score."""
    service = get_risk_service()
    data = service.get_risk_score()
    return {"risk_score": data["risk_score"], "contributing_factors": data.get("contributing_factors", [])}
