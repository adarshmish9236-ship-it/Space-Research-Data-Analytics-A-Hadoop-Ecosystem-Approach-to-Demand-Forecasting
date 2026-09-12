"""ORBITALYTICS — Data Quality & Cleansing Center Route"""
import logging
from typing import Optional
from fastapi import APIRouter, Query, Depends
from app.services.quality_service import get_quality_service, DataQualityService

router = APIRouter()
log = logging.getLogger(__name__)


@router.get("/data-quality")
async def get_data_quality(
    dataset: str = Query("missions", description="Dataset name: missions | satellites | launches | resources | telemetry"),
    quality_svc: DataQualityService = Depends(get_quality_service),
):
    """
    Retrieve comprehensive data quality and validation funnel telemetry.
    Calculates null percentages, duplicates filtered, outliers handled, and completeness metrics.
    """
    return quality_svc.get_dataset_quality(dataset)
