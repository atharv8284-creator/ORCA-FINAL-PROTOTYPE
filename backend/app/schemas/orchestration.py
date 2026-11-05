import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field, model_validator

DataModeType = Literal["LIVE", "HISTORICAL", "MODEL_OUTPUT", "SIMULATED", "DEMO", "NOT_CONNECTED"]
AgentExecutionStatus = Literal["PENDING", "RUNNING", "SUCCESS", "PARTIAL", "FAILED", "NOT_CONNECTED", "SKIPPED"]
QualityStatusType = Literal["VERIFIED", "CALIBRATED_ESTIMATE", "UNCERTAIN", "DEGRADED", "SYNTHETIC"]
SpatialRelationshipType = Literal["INTERSECTS", "WITHIN_IMMEDIATE_PROXIMITY", "WITHIN_LOCAL_AREA", "DISTANT", "DISJOINT"]
TemporalCompatibilityType = Literal["COINCIDENT", "HIGH", "MODERATE", "LOW", "INCOMPATIBLE"]

IncidentCategory = Literal[
    "POSSIBLE_OIL_SPILL_SURFACE_ANOMALY",
    "POSSIBLE_WATER_QUALITY_ANOMALY",
    "POSSIBLE_UNUSUAL_VESSEL_ACTIVITY",
    "POSSIBLE_MARINE_ENVIRONMENTAL_STRESS",
    "BASELINE_EVALUATION"
]


class UnifiedEvidenceRecord(BaseModel):
    """
    Standardized cross-agent evidence container.
    Guarantees strict provenance, scientific limitations, and data-mode isolation.
    """
    evidence_id: str = Field(default_factory=lambda: f"EVID-{uuid.uuid4().hex[:8].upper()}")
    agent_name: str = Field(..., description="Reporting agent name (e.g. SAR Agent, Optical Agent)")
    evidence_type: str = Field(..., description="Categorical type of observation or indicator")
    source_name: str = Field(..., description="Sensory instrument or platform (e.g. Sentinel-1 C-SAR, CMEMS)")
    source_identifier: str = Field(..., description="Product ID, MMSI, device ID, or record ID")
    observation_timestamp: str = Field(..., description="UTC ISO timestamp of physical observation")
    ingestion_timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="UTC ISO timestamp when data was ingested into ORCA"
    )
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    spatial_coverage: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Bounding box [w, s, e, n], GeoJSON geometry, or footprint"
    )
    data_mode: DataModeType = Field("LIVE", description="Explicit operational data tier")
    is_simulated: bool = Field(False, description="Flag indicating synthetic or demo data")
    measurement_or_indicator: str = Field(..., description="Physical variable or derived metric")
    value: Any = Field(..., description="Empirical measurement value, ratio, or structured object")
    unit: str = Field("", description="Measurement unit (e.g. dB, °C, NTU, knots)")
    confidence: float = Field(0.85, ge=0.0, le=1.0, description="Measurement or detection confidence")
    uncertainty: float = Field(0.15, ge=0.0, le=1.0, description="Standard uncertainty margin")
    quality_status: QualityStatusType = Field("VERIFIED", description="Evidence quality tier")
    processing_method: str = Field(..., description="Documented algorithmic pipeline or sensor model")
    provenance: Dict[str, Any] = Field(default_factory=dict, description="Upstream origin metadata and licensing")
    limitations: List[str] = Field(default_factory=list, description="Known physical and scientific constraints")

    @model_validator(mode="after")
    def enforce_simulation_consistency(self) -> "UnifiedEvidenceRecord":
        if self.is_simulated and self.data_mode not in ["SIMULATED", "DEMO"]:
            self.data_mode = "SIMULATED"
        if self.data_mode in ["SIMULATED", "DEMO"]:
            self.is_simulated = True
        return self


class SpatialCorrelationRecord(BaseModel):
    """
    Geospatial proximity relationship between two observations from different agents.
    """
    correlation_id: str = Field(default_factory=lambda: f"SPAT-{uuid.uuid4().hex[:8].upper()}")
    evidence_id_a: str
    evidence_id_b: str
    agent_a: str
    agent_b: str
    distance_km: float
    spatial_relationship: SpatialRelationshipType
    correlation_radius_km: float
    proximity_summary: str
    spatial_confidence_factor: float = Field(..., ge=0.0, le=1.0)
    causation_disclaimer: str = (
        "Scientific Notice: Spatial proximity is supporting contextual evidence, "
        "NOT empirical proof of causation or liability."
    )


class TemporalCorrelationRecord(BaseModel):
    """
    Temporal compatibility relationship between two observations from different agents.
    """
    correlation_id: str = Field(default_factory=lambda: f"TEMP-{uuid.uuid4().hex[:8].upper()}")
    evidence_id_a: str
    evidence_id_b: str
    agent_a: str
    agent_b: str
    time_difference_hours: float
    applicable_window_hours: float
    temporal_compatibility: TemporalCompatibilityType
    freshness_status_a: str
    freshness_status_b: str
    drift_analysis: Optional[Dict[str, Any]] = None


class EvidenceQualityAssessment(BaseModel):
    """
    Transparent quality and uncertainty breakdown for the entire evidence corpus.
    """
    overall_quality_score: float = Field(..., ge=0.0, le=1.0)
    data_reliability_score: float = Field(..., ge=0.0, le=1.0)
    freshness_score: float = Field(..., ge=0.0, le=1.0)
    spatial_relevance_score: float = Field(..., ge=0.0, le=1.0)
    temporal_relevance_score: float = Field(..., ge=0.0, le=1.0)
    missing_evidence_count: int = 0
    simulated_evidence_count: int = 0
    quality_rules_applied: List[str] = Field(default_factory=list)


class MultiAgentInvestigationRequest(BaseModel):
    """
    User-initiated or automated marine investigation query.
    """
    zone_id: str = Field("zone-01", description="Marine zone identifier")
    bbox: Optional[List[float]] = Field(None, description="Optional bounding box [min_lon, min_lat, max_lon, max_lat]")
    time_range_hours: int = Field(48, ge=1, le=168, description="Temporal window to search (1 - 168 hours)")
    incident_hint: Optional[str] = Field(None, description="Optional operator hint (e.g. 'Possible oil slick', 'Thermal spike')")
    enabled_agents: Optional[List[str]] = Field(
        default_factory=lambda: ["SAR", "OPTICAL", "OCEANOGRAPHIC", "AIS", "IOT"],
        description="Sub-agents to engage in this investigation"
    )
    correlation_radius_km: float = Field(25.0, ge=1.0, le=200.0, description="Spatial correlation radius")
    temporal_window_hours: float = Field(24.0, ge=1.0, le=72.0, description="Temporal compatibility window")


class FinalMarineIntelligenceAssessment(BaseModel):
    """
    Final synthesized marine intelligence assessment produced by the Lead Orchestrator
    and Nugen neural deliberation engine.
    """
    assessment_id: str = Field(default_factory=lambda: f"ORCA-ASSESS-{uuid.uuid4().hex[:8].upper()}")
    status: Literal["COMPLETED", "PARTIAL", "FAILED"] = "COMPLETED"
    incident_category: IncidentCategory = "BASELINE_EVALUATION"
    assessment_label: str = Field(..., description="High-level operational classification")
    geographic_area: Dict[str, Any] = Field(..., description="Target zone, centroid, and bounding box")
    observation_period: Dict[str, Any] = Field(..., description="Earliest to latest observation timestamps")
    agent_statuses: Dict[str, AgentExecutionStatus] = Field(default_factory=dict)
    agent_execution_times_ms: Dict[str, float] = Field(default_factory=dict)
    evidence_summary: List[UnifiedEvidenceRecord] = Field(default_factory=list)
    spatial_correlations: List[SpatialCorrelationRecord] = Field(default_factory=list)
    temporal_correlations: List[TemporalCorrelationRecord] = Field(default_factory=list)
    supporting_evidence: List[Dict[str, Any]] = Field(default_factory=list)
    contradicting_evidence: List[Dict[str, Any]] = Field(default_factory=list)
    missing_evidence: List[str] = Field(default_factory=list)
    data_quality: EvidenceQualityAssessment
    confidence: Dict[str, Any] = Field(..., description="Assessment confidence score, tier, and factors")
    uncertainty: List[str] = Field(default_factory=list, description="Explicit uncertainty caveats")
    alternative_explanations: List[str] = Field(default_factory=list, description="Plausible non-polluting mechanisms")
    nugen_reasoning: Dict[str, Any] = Field(default_factory=dict, description="Nugen neural deliberation breakdown")
    recommended_follow_up: List[str] = Field(default_factory=list, description="Actionable interventions")
    data_mode_summary: Dict[str, int] = Field(default_factory=dict, description="Counts of evidence per data mode")
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class OrchestrationStatusResponse(BaseModel):
    """
    Lightweight status and agent lifecycle summary for an in-flight or completed assessment.
    """
    assessment_id: str
    status: Literal["RUNNING", "COMPLETED", "PARTIAL", "FAILED"]
    total_agents: int
    completed_agents: int
    agent_statuses: Dict[str, AgentExecutionStatus]
    elapsed_time_ms: float
    incident_category: Optional[str] = None
    generated_at: str


class OrchestrationHistoryResponse(BaseModel):
    """
    List of past synthesized assessments.
    """
    total_assessments: int
    assessments: List[FinalMarineIntelligenceAssessment]
