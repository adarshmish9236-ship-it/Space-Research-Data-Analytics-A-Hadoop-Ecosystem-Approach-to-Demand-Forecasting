"""
ORBITALYTICS 2.0 — Space Resource Stress Testing API Routes
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.services.stress_testing_service import get_stress_engine

router = APIRouter()

@router.get("/stress-testing/scenarios")
async def get_stress_scenarios():
    """Returns evaluated multi-resource stress testing results across all 8 crisis scenarios."""
    engine = get_stress_engine()
    return engine.get_all_scenarios()
