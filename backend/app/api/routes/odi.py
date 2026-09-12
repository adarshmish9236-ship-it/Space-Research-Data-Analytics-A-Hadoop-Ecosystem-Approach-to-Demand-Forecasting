"""ORBITALYTICS — ODI Route"""
import logging
from typing import Optional
from fastapi import APIRouter, Query, Depends
from app.models.schemas import ODIResponse, ODIComponent
from app.services.data_loader import get_data_loader, DataLoader
from app.services.odi_service import calculate_odi, ODI_WEIGHTS

router = APIRouter()
log = logging.getLogger(__name__)

ODI_FORMULA = (
    "ODI = 0.35 × MissionGrowth + 0.25 × SatelliteActivity "
    "+ 0.20 × LaunchFrequency + 0.20 × ResearchActivity"
)
ODI_DISCLAIMER = (
    "The Orbital Demand Index (ODI) is a project-defined composite analytical "
    "indicator for the ORBITALYTICS academic project. It is NOT an official metric "
    "from NASA, ISRO, ESA, or any government space agency."
)

COMPONENT_DISPLAY = {
    "mission_growth":     "Mission Growth",
    "satellite_activity": "Satellite Activity",
    "launch_frequency":   "Launch Frequency",
    "research_activity":  "Research Activity",
}


@router.get("/odi", response_model=ODIResponse)
async def get_odi(
    country: Optional[str] = Query(None, description="Country filter (omit for global)"),
    loader: DataLoader = Depends(get_data_loader),
):
    """Calculate the Orbital Demand Index (ODI) for global or country-level view."""
    yearly_df = loader.get_yearly_analytics()
    mission_type_df = loader.get_mission_type_analytics()

    # Apply country filter if provided
    if country and country.lower() not in ("all", "global"):
        country_yearly = loader.get_country_yearly()
        if not country_yearly.empty:
            country_yearly = country_yearly[country_yearly["country"] == country]
            if not country_yearly.empty:
                # Rename for ODI calculation compatibility
                yearly_df = country_yearly.rename(columns={"mission_count": "total_missions"})

    odi_result = calculate_odi(
        yearly_df=yearly_df,
        mission_type_df=mission_type_df if not mission_type_df.empty else None,
        country=country,
    )

    # Build component list
    components = []
    for key, weight in ODI_WEIGHTS.items():
        score = odi_result["components"].get(key, 0.0)
        components.append(ODIComponent(
            name=key,
            display_name=COMPONENT_DISPLAY.get(key, key.replace("_", " ").title()),
            score=score,
            weight=weight,
            weighted_contribution=round(score * weight, 4),
        ))

    return ODIResponse(
        odi_score=odi_result["odi_score"],
        classification=odi_result["classification"],
        color=odi_result["color"],
        components=components,
        country=odi_result.get("country", "Global"),
        data_points=odi_result.get("data_points", 0),
        latest_year_demand=odi_result.get("latest_year_demand", 0),
        yoy_growth_pct=odi_result.get("yoy_growth_pct", 0.0),
        formula=ODI_FORMULA,
        disclaimer=ODI_DISCLAIMER,
    )
