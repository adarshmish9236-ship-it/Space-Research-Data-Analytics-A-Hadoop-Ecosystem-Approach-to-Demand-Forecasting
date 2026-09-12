"""
SpaceDemand — Pattern Discovery, Anomaly Detection & Clustering API Routes
==========================================================================
Endpoints:
  GET /api/patterns   — Calculated trend analysis & growth trajectories
  GET /api/correlations — Pearson correlation matrix
  GET /api/clusters   — K-Means mission archetype clustering
  GET /api/anomalies  — Real-time detected resource & telemetry anomalies
"""

from fastapi import APIRouter, Depends
from app.services.pattern_service import PatternService, get_pattern_service

router = APIRouter()


@router.get("/patterns")
async def get_patterns(patterns: PatternService = Depends(get_pattern_service)):
    """Retrieve dynamic multi-year trend patterns."""
    return patterns.get_trend_analysis()


@router.get("/correlations")
async def get_correlations(patterns: PatternService = Depends(get_pattern_service)):
    """Retrieve multi-variate correlation matrix."""
    return patterns.get_correlations()


@router.get("/clusters")
async def get_clusters(patterns: PatternService = Depends(get_pattern_service)):
    """Retrieve K-Means mission archetype clusters."""
    return patterns.get_clusters()


@router.get("/anomalies")
async def get_anomalies(patterns: PatternService = Depends(get_pattern_service)):
    """Retrieve detected anomalies."""
    return {"anomalies": patterns.get_anomalies(), "total": len(patterns.get_anomalies())}
