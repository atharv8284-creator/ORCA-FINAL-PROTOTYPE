from fastapi import APIRouter, Query
from typing import List, Dict, Any, Optional
from app.schemas.marine import AgentReasoningLog, DeliberationRequest
from app.schemas.nugen import MultimodalEvidencePayload
from app.services.data_store import data_store
from app.services.agent_engine import agent_engine
from app.services.nugen_service import nugen_service

router = APIRouter()

@router.get("/logs", response_model=List[AgentReasoningLog], summary="Get autonomous agent reasoning logs")
def get_reasoning_logs(limit: int = Query(10, ge=1, le=50)):
    """
    Returns explainable multi-agent collaborative reasoning chains, hypotheses, and consensus actions.
    """
    return data_store.get_reasoning_logs(limit=limit)

@router.get("/status", summary="Check Nugen neural reasoning integration status")
def get_nugen_status() -> Dict[str, Any]:
    """
    Returns safe server-side operational status for Nugen inference without exposing credentials.
    """
    return nugen_service.get_service_status()

@router.get("/evidence/{zone_id}", response_model=MultimodalEvidencePayload, summary="Inspect aggregated evidence payload")
def get_evidence_payload(
    zone_id: str,
    anomaly_type: str = Query("THERMAL_SPIKE", description="Anomaly type context")
) -> MultimodalEvidencePayload:
    """
    Inspect the assembled multimodal evidence across SAR, Optical, AIS, Oceanographic,
    Thermal, and IoT sensor layers for a specific marine zone.
    """
    return nugen_service.compile_evidence_payload(zone_id=zone_id, anomaly_type=anomaly_type)

@router.post("/deliberate", response_model=AgentReasoningLog, summary="Trigger autonomous multi-agent deliberation cycle")
async def trigger_deliberation(req: DeliberationRequest):
    """
    Executes collaborative reasoning across autonomous agents on an ecological anomaly,
    dispatching multimodal evidence to server-side Nugen neural inference with deterministic fallback.
    """
    return await agent_engine.deliberate_on_anomaly(req)

