"""
ORBITALYTICS 2.0 — Digital Twin State API Routes
"""
from fastapi import APIRouter
from app.services.digital_twin_service import get_digital_twin_service

router = APIRouter()

@router.get("/digital-twin/state")
async def get_digital_twin_state():
    """Returns real-time connected space-to-ground digital twin topology and operational metrics."""
    service = get_digital_twin_service()
    return service.get_digital_twin_state()

@router.get("/digital-twin/node/{node_id}")
async def get_digital_twin_node(node_id: str):
    """Returns detailed telemetry, pass windows, and prescriptive diagnosis for a specific digital twin node."""
    service = get_digital_twin_service()
    return service.get_node_details(node_id)
