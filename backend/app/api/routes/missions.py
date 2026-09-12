"""ORBITALYTICS — Missions Route"""
import logging
from typing import Optional
from fastapi import APIRouter, Query, Depends, HTTPException
from app.models.schemas import MissionsResponse, MissionRecord
from app.services.data_loader import get_data_loader, DataLoader
import math

router = APIRouter()
log = logging.getLogger(__name__)


@router.get("/missions", response_model=MissionsResponse)
async def get_missions(
    country: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    mission_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    loader: DataLoader = Depends(get_data_loader),
):
    """Paginated mission records from processed Parquet data."""
    df = loader.get_missions_sample(
        n=10000,
        country=country,
        year=year,
        mission_type=mission_type,
    )

    total = len(df)
    start = (page - 1) * page_size
    end = start + page_size
    page_df = df.iloc[start:end]

    records = []
    for _, row in page_df.iterrows():
        records.append(MissionRecord(
            mission_id=str(row.get("mission_id", "")),
            mission_name=str(row.get("mission_name", "")) if row.get("mission_name") else None,
            launch_date=str(row.get("launch_date", "")) if row.get("launch_date") else None,
            year=int(row["year"]) if row.get("year") is not None else None,
            country=str(row.get("country", "")) if row.get("country") else None,
            agency=str(row.get("agency", "")) if row.get("agency") else None,
            mission_type=str(row.get("mission_type", "")) if row.get("mission_type") else None,
            launch_vehicle=str(row.get("launch_vehicle", "")) if row.get("launch_vehicle") else None,
            orbit=str(row.get("orbit", "")) if row.get("orbit") else None,
            payload_mass_kg=float(row["payload_mass_kg"]) if row.get("payload_mass_kg") is not None else None,
            success=bool(row["success"]) if row.get("success") is not None else None,
        ))

    return MissionsResponse(
        data=records,
        total_count=total,
        filtered_count=total,
        page=page,
        page_size=page_size,
        filters_applied={k: v for k, v in {"country": country, "year": year, "mission_type": mission_type}.items() if v},
        source="HDFS (local mirror) -> Spark ETL -> Parquet",
    )
