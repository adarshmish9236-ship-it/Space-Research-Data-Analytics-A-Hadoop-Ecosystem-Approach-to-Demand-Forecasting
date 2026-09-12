"""
ORBITALYTICS 2.0 — Model Governance, Lineage & Experiment Registry API Routes
"""
from fastapi import APIRouter
from app.services.governance_service import get_governance_service

router = APIRouter()

@router.get("/governance/models")
async def get_model_trust_center():
    """Returns Model Trust Center with multi-criteria scores, backtesting horizons, and health status."""
    service = get_governance_service()
    return service.get_models_trust_center()

@router.get("/governance/lineage")
async def get_lineage_graph():
    """Returns end-to-end directed acyclic graph (DAG) data and ML lineage."""
    service = get_governance_service()
    return service.get_lineage_graph()

@router.get("/governance/experiments")
async def get_experiments_history():
    """Returns lightweight experiment tracking registry with hyperparameter and split comparisons."""
    service = get_governance_service()
    return service.get_experiments_history()

@router.get("/governance/reproducibility")
async def get_reproducibility_manifest():
    """Returns exact random seeds, pipeline version, and feature hashes for audit compliance."""
    service = get_governance_service()
    return service.get_reproducibility_manifest()
