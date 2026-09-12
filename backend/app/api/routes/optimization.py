"""
ORBITALYTICS 2.0 — Resource Optimization API Routes
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.services.optimization_service import get_optimization_engine

router = APIRouter()

class OptimizationRequest(BaseModel):
    cost_weight: float = Field(0.25, ge=0.0, le=1.0)
    shortage_weight: float = Field(0.35, ge=0.0, le=1.0)
    risk_weight: float = Field(0.25, ge=0.0, le=1.0)
    overutil_weight: float = Field(0.15, ge=0.0, le=1.0)
    target_demand_multiplier: float = Field(1.0, ge=0.5, le=3.0)

@router.post("/optimization/solve")
async def solve_resource_optimization(request: OptimizationRequest):
    """Executes multi-objective resource balancing optimization solver."""
    engine = get_optimization_engine()
    return engine.solve_allocation(
        cost_weight=request.cost_weight,
        shortage_weight=request.shortage_weight,
        risk_weight=request.risk_weight,
        overutil_weight=request.overutil_weight,
        target_demand_multiplier=request.target_demand_multiplier,
    )

@router.get("/optimization/allocations")
async def get_default_allocations():
    """Returns baseline vs. optimized resource allocations under standard weights."""
    engine = get_optimization_engine()
    return engine.solve_allocation()
