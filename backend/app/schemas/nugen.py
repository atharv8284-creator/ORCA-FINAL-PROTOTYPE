from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

FindingClassification = Literal["OBSERVATION", "INFERENCE", "HYPOTHESIS", "MODEL_ANALYSIS", "FORECAST"]
NugenInferenceMode = Literal["HEURISTIC_RULE_BASED", "NUGEN_NEURAL_REASONING"]
NugenServiceStatus = Literal[
    "UNCONFIGURED",
    "MODEL_UNAVAILABLE",
    "INFERENCE_FAILED",
    "INFERENCE_SUCCESS",
    "FALLBACK_RULE_BASED"
]

class AgentEvidenceRecord(BaseModel):
    """
    Validated finding representation preserving provenance, physical units, 
    quality indicators, uncertainty, and explicit absence/missing reasons.
    """
    agent_id: str
    agent_name: str
    sensor_or_capability: str
    finding_type: FindingClassification
    source: str
    provider: str
    acquisition_timestamp: Optional[str] = None
    retrieval_timestamp: str
    geographic_area: Optional[Dict[str, Any]] = None
    processing_status: str
    measurement_units: Optional[str] = None
    quality_indicator: Optional[str] = None
    uncertainty_margin: Optional[float] = None
    is_available: bool = True
    missing_data_reason: Optional[str] = None
    metrics: Dict[str, Any] = Field(default_factory=dict)

class MultimodalEvidencePayload(BaseModel):
    """
    Structured evidence payload assembled by the Lead Orchestrator
    across SAR, Optical, AIS, Oceanographic, Thermal, and IoT layers.
    """
    zone_id: str
    zone_name: str
    anomaly_type: str
    operator_notes: Optional[str] = None
    compiled_at: str
    sar_evidence: Optional[AgentEvidenceRecord] = None
    optical_evidence: Optional[AgentEvidenceRecord] = None
    ais_evidence: Optional[AgentEvidenceRecord] = None
    oceanographic_evidence: Optional[AgentEvidenceRecord] = None
    thermal_evidence: Optional[AgentEvidenceRecord] = None
    iot_evidence: Optional[AgentEvidenceRecord] = None
    evidence_items: List[AgentEvidenceRecord] = Field(default_factory=list)
    available_sources: List[str] = Field(default_factory=list)
    missing_sources: List[str] = Field(default_factory=list)

    def __getitem__(self, item: str) -> Any:
        if item == "ais":
            if self.ais_evidence:
                m = self.ais_evidence.metrics or {}
                return {
                    "tracked_vessels_count": m.get("total_tracked_vessels", m.get("vessel_count", 0)),
                    "data_mode": m.get("data_mode", "NOT_CONNECTED"),
                    "disclaimer": m.get("maritime_legal_disclaimer", self.ais_evidence.missing_data_reason or "Proximity does not establish causation."),
                    **m
                }
            return {
                "tracked_vessels_count": 0,
                "data_mode": "NOT_CONNECTED",
                "disclaimer": "AIS provider not configured. Proximity does not prove causation or liability."
            }
        if hasattr(self, item):
            return getattr(self, item)
        raise KeyError(item)

    def __contains__(self, item: object) -> bool:
        if item == "ais":
            return bool(self.ais_evidence is not None)
        return hasattr(self, str(item))

class NugenDeliberationResponse(BaseModel):
    """
    Structured result returned by the Nugen Service to the Lead Orchestrator.
    Distinguishes neural inference from heuristic fallback.
    """
    inference_mode: NugenInferenceMode
    service_status: NugenServiceStatus
    model_id: Optional[str] = None
    execution_latency_ms: Optional[float] = None
    observation: str
    hypothesis: str
    reasoning_chain: List[Any] = Field(default_factory=list)
    consensus_action: str
    confidence_score: float = Field(..., ge=0, le=100)
    severity: str = "INFO"
    alert_type: Optional[str] = None
    missing_evidence: List[str] = Field(default_factory=list)
    error_message: Optional[str] = None
    raw_model_response: Optional[Dict[str, Any]] = None
