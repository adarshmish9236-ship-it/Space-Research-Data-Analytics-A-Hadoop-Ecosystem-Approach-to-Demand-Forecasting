"""ORBITALYTICS — Model Performance Route"""
import logging
from fastapi import APIRouter, Depends
from app.models.schemas import ModelPerformanceResponse, ModelResult, ModelMetrics
from app.services.data_loader import get_data_loader, DataLoader

router = APIRouter()
log = logging.getLogger(__name__)


@router.get("/model-performance", response_model=ModelPerformanceResponse)
async def get_model_performance(loader: DataLoader = Depends(get_data_loader)):
    """Return ML model comparison results from the Spark MLlib training run."""
    data = loader.get_model_comparison()

    models_list = []
    for name, info in data.get("models", {}).items():
        metrics = info.get("metrics", {})
        models_list.append(ModelResult(
            model_name=name,
            model_type=info.get("model_type", "unknown"),
            metrics=ModelMetrics(
                rmse=metrics.get("rmse"),
                mae=metrics.get("mae"),
                r2=metrics.get("r2"),
                mape=metrics.get("mape"),
            ),
            train_time_s=info.get("train_time_s"),
            is_best=info.get("is_best", False),
        ))

    # Sort: best first, then by RMSE
    models_list.sort(key=lambda m: (not m.is_best, m.metrics.rmse or 999))

    return ModelPerformanceResponse(
        models=models_list,
        best_model=data.get("best_model", "Not trained"),
        generated_at=data.get("generated_at"),
        split_info="Training: year <= 2020 | Test: year > 2020 (time-based, no leakage)",
    )
