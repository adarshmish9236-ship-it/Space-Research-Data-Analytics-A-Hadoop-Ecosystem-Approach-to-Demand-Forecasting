"""
ORBITALYTICS — FastAPI Application Entry Point
"""
import logging
import time
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.api.routes import (
    auth, dashboard, missions, analytics, forecast,
    scenarios, odi, model_performance, system, data_explorer,
    hadoop, patterns, reports, ml_routes, conjunctions, orbital_tracker,
    pipeline, quality, alerts,
    capacity, prescriptions, optimization, risk, stress_testing,
    root_cause, drift, governance, ai_analyst, digital_twin
)
from app.services.telemetry_stream import get_telemetry_manager

settings = get_settings()

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
)
log = logging.getLogger("spacedemand")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info(f"Starting SpaceDemand v{settings.APP_VERSION}")
    log.info(f"Environment: {settings.APP_ENV}")
    log.info(f"Data path: {settings.ANALYTICS_DATA_PATH}")
    yield
    log.info("Shutting down SpaceDemand")


app = FastAPI(
    title="SpaceDemand API",
    description="Space Research Intelligence & Resource Demand Forecasting — Hadoop Ecosystem Platform",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request timing middleware ─────────────────────────────────────────────────
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    process_ms = round((time.time() - start) * 1000, 2)
    response.headers["X-Process-Time-Ms"] = str(process_ms)
    response.headers["X-SpaceDemand-Version"] = settings.APP_VERSION
    return response


# ── Global error handler ──────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.error(f"Unhandled error on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "detail": str(exc) if settings.DEBUG else "Contact administrator",
        }
    )


# ── Routes ────────────────────────────────────────────────────────────────────
PREFIX = settings.API_PREFIX

app.include_router(auth.router,              prefix=PREFIX, tags=["Authentication & RBAC"])
app.include_router(system.router,            prefix=PREFIX, tags=["System"])
app.include_router(hadoop.router,            prefix=PREFIX, tags=["Hadoop Cluster"])
app.include_router(dashboard.router,         prefix=PREFIX, tags=["Mission Control"])
app.include_router(missions.router,          prefix=PREFIX, tags=["Missions"])
app.include_router(analytics.router,         prefix=PREFIX, tags=["Analytics Studio"])
app.include_router(patterns.router,          prefix=PREFIX, tags=["Pattern Discovery"])
app.include_router(forecast.router,          prefix=PREFIX, tags=["Forecasting Lab"])
app.include_router(scenarios.router,         prefix=PREFIX, tags=["Scenario Simulator"])
app.include_router(odi.router,               prefix=PREFIX, tags=["ODI"])
app.include_router(model_performance.router,  prefix=PREFIX, tags=["ML Models"])
app.include_router(ml_routes.router,          prefix=PREFIX, tags=["ML Pipelines & Retraining"])
app.include_router(data_explorer.router,     prefix=PREFIX, tags=["Data Explorer"])
app.include_router(quality.router,           prefix=PREFIX, tags=["Data Quality"])
app.include_router(pipeline.router,          prefix=PREFIX, tags=["Big Data Pipeline"])
app.include_router(alerts.router,            prefix=PREFIX, tags=["Forecast Alerts"])
app.include_router(reports.router,           prefix=PREFIX, tags=["Reports"])
app.include_router(conjunctions.router,      prefix=PREFIX, tags=["Space Situational Awareness (SSA)"])
app.include_router(orbital_tracker.router,   prefix=PREFIX, tags=["Orbital Tracking & Ground Stations"])
app.include_router(capacity.router,          prefix=PREFIX, tags=["Capacity Planning"])
app.include_router(prescriptions.router,     prefix=PREFIX, tags=["Prescriptive Analytics"])
app.include_router(optimization.router,      prefix=PREFIX, tags=["Resource Optimization"])
app.include_router(risk.router,              prefix=PREFIX, tags=["Risk Intelligence"])
app.include_router(stress_testing.router,    prefix=PREFIX, tags=["Stress Testing"])
app.include_router(root_cause.router,        prefix=PREFIX, tags=["AI Root Cause"])
app.include_router(drift.router,             prefix=PREFIX, tags=["Data & Concept Drift"])
app.include_router(governance.router,        prefix=PREFIX, tags=["Model Governance & Lineage"])
app.include_router(ai_analyst.router,        prefix=PREFIX, tags=["Autonomous AI Analyst"])
app.include_router(digital_twin.router,      prefix=PREFIX, tags=["Digital Twin State"])


# ── Real-Time WebSockets ──────────────────────────────────────────────────────
@app.websocket("/api/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    """High-frequency satellite constellation telemetry WebSocket endpoint."""
    manager = get_telemetry_manager()
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and accept client pings/messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


@app.get("/", include_in_schema=False)
async def root():
    return {
        "name":    "SpaceDemand",
        "tagline": "Space Research Intelligence & Resource Demand Forecasting",
        "version": settings.APP_VERSION,
        "docs":    "/docs",
        "status":  "operational",
    }

