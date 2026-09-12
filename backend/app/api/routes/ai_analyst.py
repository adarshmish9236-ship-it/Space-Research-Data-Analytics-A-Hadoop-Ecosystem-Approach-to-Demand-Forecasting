"""
ORBITALYTICS 2.0 — Autonomous AI Analyst API Routes
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.services.ai_analyst_service import get_ai_analyst

router = APIRouter()

class AIQueryRequest(BaseModel):
    query: str = Field(..., description="Natural language space intelligence question")

@router.post("/ai/query")
async def process_ai_query(request: AIQueryRequest):
    """Processes natural language questions via structured tool calling with zero hallucination."""
    analyst = get_ai_analyst()
    return analyst.process_query(request.query)

@router.get("/ai/tools")
async def get_ai_tools():
    """Lists all available analytical tools registered in the AI Analyst engine."""
    analyst = get_ai_analyst()
    return {"tools": analyst.get_available_tools()}
