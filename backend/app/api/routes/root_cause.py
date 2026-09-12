"""
ORBITALYTICS 2.0 — AI Root-Cause Analysis API Routes
"""
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.services.root_cause_service import get_root_cause_service

router = APIRouter()

class RootCauseRequest(BaseModel):
    event_type: str = Field("CAPACITY_BOTTLENECK", description="Event category: CAPACITY_BOTTLENECK | DEMAND_SPIKE | ANOMALY")
    target_resource: str = Field("ground_stations", description="Resource or domain affected: ground_stations | storage | compute | demand")
    observed_value: Optional[float] = Field(None, description="Observed numerical value during event")

@router.post("/root-cause/analyze")
async def analyze_root_cause(request: RootCauseRequest):
    """Performs statistical feature attribution and driver identification for an observed event."""
    service = get_root_cause_service()
    return service.analyze_event(
        event_type=request.event_type,
        target_resource=request.target_resource,
        observed_value=request.observed_value,
    )
