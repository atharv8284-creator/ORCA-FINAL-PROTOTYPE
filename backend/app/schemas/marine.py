from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime

# --- Marine Zones ---
class MarineZoneBase(BaseModel):
    code: str
    name: str
    designation: str
    description: Optional[str] = None
    area_sq_km: float
    health_score: float = Field(..., ge=0, le=100)
    risk_level: str = "LOW" # LOW, MODERATE, HIGH, CRITICAL
    latitude: float
    longitude: float

class MarineZone(MarineZoneBase):
    id: str
    boundary_coordinates: Optional[List[List[float]]] = None # [[lat, lng], ...]
    created_at: Optional[datetime] = None

# --- Autonomous Marine Agents ---
class MarineAgentBase(BaseModel):
    agent_id: str
    name: str
    agent_type: str # REEF_SENTINEL, THERMAL_SCANNER, ACOUSTIC_PROFILER, CARBON_SINK_OBSERVER, PATROL_SWARM
    status: str = "ACTIVE" # ACTIVE, INVESTIGATING, WARNING, IDLE
    battery_percentage: float = Field(..., ge=0, le=100)
    latitude: float
    longitude: float
    depth_meters: float = 10.0
    assigned_zone_id: Optional[str] = None
    capabilities: List[str] = []

class MarineAgent(MarineAgentBase):
    id: str
    last_heartbeat: Optional[datetime] = None
    metadata: Dict[str, Any] = {}

class MarineAgentDispatch(BaseModel):
    mission: str
    target_latitude: Optional[float] = None
    target_longitude: Optional[float] = None
    target_zone_id: Optional[str] = None

# --- Ecosystem Telemetry ---
class EcosystemTelemetryBase(BaseModel):
    zone_id: str
    water_temperature_c: float
    dissolved_oxygen_mg_l: float
    ph_level: float
    salinity_psu: float
    turbidity_ntu: float
    chlorophyll_mg_m3: float
    microplastics_index: float
    acoustic_noise_db: float

class EcosystemTelemetry(EcosystemTelemetryBase):
    id: str
    recorded_at: datetime

# --- Agent Collaborative Reasoning ---
class ReasoningChainStep(BaseModel):
    step: int
    agent: Optional[str] = None
    claim: Optional[str] = None
    consensus: Optional[str] = None

class AgentReasoningLog(BaseModel):
    id: str
    agent_id: str
    agent_name: str
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    timestamp: datetime
    observation: str
    hypothesis: str
    reasoning_chain: List[ReasoningChainStep] = []
    consensus_action: str
    confidence_score: float = Field(..., ge=0, le=100)
    severity: str = "INFO" # INFO, ADVISORY, ELEVATED, CRITICAL
    inference_mode: str = "HEURISTIC_RULE_BASED" # HEURISTIC_RULE_BASED or NUGEN_NEURAL_REASONING
    nugen_status: Optional[str] = "UNCONFIGURED" # UNCONFIGURED, MODEL_UNAVAILABLE, INFERENCE_FAILED, INFERENCE_SUCCESS, FALLBACK_RULE_BASED
    missing_evidence: List[str] = []
    nugen_error: Optional[str] = None

class DeliberationRequest(BaseModel):
    zone_id: str
    anomaly_type: str = "THERMAL_SPIKE" # THERMAL_SPIKE, OXYGEN_DROP, PH_ANOMALY, UNKNOWN_VESSEL
    notes: Optional[str] = None

# --- Ecological Alerts ---
class EcologicalAlert(BaseModel):
    id: str
    zone_id: str
    zone_name: str
    alert_type: str # CORAL_BLEACHING_RISK, HYPOXIC_DEAD_ZONE, OCEAN_ACIDIFICATION, UNREGULATED_VESSEL, PLASTIC_CONVERGENCE
    severity: str # LOW, MEDIUM, HIGH, CRITICAL
    title: str
    description: str
    recommended_mitigation: str
    status: str = "ACTIVE" # ACTIVE, ACKNOWLEDGED, RESOLVED
    triggered_by_agent: Optional[str] = None
    created_at: datetime

class AlertStatusUpdate(BaseModel):
    status: str # ACTIVE, ACKNOWLEDGED, RESOLVED

# --- Health Schema ---
class SystemHealth(BaseModel):
    status: str
    service: str
    version: str
    timestamp: datetime
    database: str
    active_agents: int
    monitored_zones: int

# --- Copernicus Data Space Ecosystem STAC Schemas ---

class ProcessingPipelineStatus(BaseModel):
    """
    Explicit multi-stage status for satellite data processing.
    Distinguishes metadata discovery from actual downloaded and processed imagery.
    """
    product_discovered: bool = True
    asset_available: bool = True
    image_downloaded: bool = False
    image_processed: bool = False
    anomaly_analysis_completed: bool = False
    status_summary: str = "Product metadata and asset inventory discovered via Copernicus STAC. Raw granule download and radiometric calibration pending compute task."

class SatelliteAssetInfo(BaseModel):
    name: str
    title: Optional[str] = None
    type: Optional[str] = None
    href: str
    roles: Optional[List[str]] = []

class CopernicusSatelliteProduct(BaseModel):
    id: str
    collection: str
    satellite: str
    sensor_type: str
    acquisition_timestamp: Optional[str] = None
    platform: Optional[str] = None
    constellation: Optional[str] = None
    bbox: Optional[List[float]] = None # [min_lon, min_lat, max_lon, max_lat]
    geometry: Optional[Dict[str, Any]] = None # GeoJSON Geometry
    cloud_cover_pct: Optional[float] = None
    orbit_direction: Optional[str] = None
    relative_orbit_number: Optional[int] = None
    polarization: Optional[List[str]] = None
    resolution_meters: Optional[float] = None
    swath_identifier: Optional[str] = None
    thumbnail_url: Optional[str] = None
    assets_count: int = 0
    assets: Dict[str, SatelliteAssetInfo] = {}
    properties: Dict[str, Any] = {}
    pipeline_status: ProcessingPipelineStatus = Field(default_factory=ProcessingPipelineStatus)
    scientific_disclaimer: str = (
        "Observation Discovered: Satellite metadata presence confirms orbital coverage over the area of interest. "
        "It does NOT indicate or confirm an environmental anomaly, oil spill, or pollution event without calibrated radiometric/SAR processing."
    )

class SatelliteSearchQuery(BaseModel):
    satellite: str = "sentinel-1" # sentinel-1, sentinel-2, or both
    bbox: Optional[List[float]] = None # [min_lon, min_lat, max_lon, max_lat]
    start_date: Optional[str] = None # YYYY-MM-DD
    end_date: Optional[str] = None # YYYY-MM-DD
    product_id: Optional[str] = None
    max_cloud_cover: Optional[float] = None # 0 - 100 for Sentinel-2
    limit: int = Field(default=10, ge=1, le=50)
    next_token: Optional[str] = None

class CopernicusSearchResponse(BaseModel):
    total_features: int
    returned_features: int
    collection: str
    query_bbox: Optional[List[float]] = None
    query_datetime: Optional[str] = None
    features: List[CopernicusSatelliteProduct] = []
    next_token: Optional[str] = None
    stac_endpoint: str
    executed_at: str
    message: Optional[str] = None

class CopernicusServiceHealth(BaseModel):
    status: str # OPERATIONAL, DEGRADED, UNREACHABLE
    stac_endpoint: str
    latency_ms: float
    stac_version: str
    conformance_count: int
    supported_collections: List[str] = ["sentinel-1-grd", "sentinel-2-l2a"]
    authentication_required_for_metadata: bool = False
    authentication_required_for_download: bool = True
    auth_configured: bool = False
    auth_instructions: str
