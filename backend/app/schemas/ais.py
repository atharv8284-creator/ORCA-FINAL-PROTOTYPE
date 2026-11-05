from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, field_validator, model_validator
from datetime import datetime, timezone

# Exact Connection Statuses as Required by Specification
AISConnectionStatus = Literal["REAL", "NOT CONNECTED", "OFFLINE", "NO DATA", "DEMO"]

# Required Informative Message when no API provider is configured
DEFAULT_UNCONFIGURED_MESSAGE = (
    "AIS provider not configured. Connect an authorized AIS data provider to receive vessel information."
)

# ITU-R M.1371 Navigational Status Mapping
NAV_STATUS_MAP: Dict[int, str] = {
    0: "Under way using engine",
    1: "At anchor",
    2: "Not under command",
    3: "Restricted manoeuvrability",
    4: "Constrained by her draught",
    5: "Moored",
    6: "Aground",
    7: "Engaged in fishing",
    8: "Under way sailing",
    9: "Reserved (HSC)",
    10: "Reserved (WIG)",
    11: "Towing astern",
    12: "Towing ahead/alongside",
    13: "Reserved for future use",
    14: "AIS-SART / Active SAR",
    15: "Undefined / Default"
}

# ITU-R M.1371 / IMO Vessel Type Mapping
def decode_vessel_type(type_code: Optional[int]) -> Dict[str, str]:
    if type_code is None:
        return {"category": "OTHER", "label": "Unknown Vessel Type"}
    
    tc = int(type_code)
    if tc == 30:
        return {"category": "FISHING", "label": "Fishing Vessel / Trawler"}
    elif tc in (31, 32):
        return {"category": "TUG", "label": "Towing Vessel / Tug"}
    elif tc == 33:
        return {"category": "OTHER", "label": "Dredger / Underwater Ops"}
    elif tc == 34:
        return {"category": "OTHER", "label": "Diving Operations Craft"}
    elif tc == 35:
        return {"category": "SPECIAL", "label": "Military Operations Vessel"}
    elif tc in (36, 37):
        return {"category": "PLEASURE", "label": "Sailing / Pleasure Craft"}
    elif 40 <= tc <= 49:
        return {"category": "HSC", "label": "High Speed Craft (HSC)"}
    elif tc == 50:
        return {"category": "PILOT", "label": "Pilot Vessel"}
    elif tc == 51:
        return {"category": "SAR", "label": "Search and Rescue (SAR) Vessel"}
    elif tc == 52:
        return {"category": "TUG", "label": "Tug Boat"}
    elif tc == 53:
        return {"category": "OTHER", "label": "Port Tender"}
    elif tc == 54:
        return {"category": "SPECIAL", "label": "Anti-Pollution Equipment"}
    elif tc == 55:
        return {"category": "LAW_ENFORCEMENT", "label": "Law Enforcement / Coast Guard"}
    elif tc == 58:
        return {"category": "SPECIAL", "label": "Medical Transport"}
    elif 60 <= tc <= 69:
        return {"category": "PASSENGER", "label": "Passenger Ferry / Cruise Liner"}
    elif 70 <= tc <= 79:
        return {"category": "CARGO", "label": "Cargo / Container / Bulk Carrier"}
    elif 80 <= tc <= 89:
        return {"category": "TANKER", "label": "Tanker (Crude Oil / Chemical / LNG)"}
    elif 90 <= tc <= 99:
        return {"category": "OTHER", "label": "Special Craft / Other"}
    else:
        return {"category": "OTHER", "label": f"Vessel Type ({tc})"}


class AISVesselPosition(BaseModel):
    """
    Standardized vessel kinematic and telemetry position.
    Supports all required fields:
    - MMSI
    - Vessel name
    - Vessel type
    - Latitude
    - Longitude
    - Speed over ground (SOG)
    - Course over ground (COG)
    - Heading
    - Navigation status
    - Last received timestamp
    - Data provider
    """
    mmsi: str = Field(..., description="9-digit Maritime Mobile Service Identity")
    vessel_name: str = Field("UNKNOWN", description="Vessel broadcast name")
    vessel_type: str = Field("Unknown", description="Decoded vessel type description")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="WGS84 latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="WGS84 longitude")
    
    # Speed over ground (SOG)
    sog_knots: float = Field(0.0, ge=0.0, le=102.3, description="Speed Over Ground in knots")
    speed_over_ground: Optional[float] = Field(None, description="Alias for Speed Over Ground (SOG)")
    
    # Course over ground (COG)
    cog_degrees: float = Field(0.0, ge=0.0, le=360.0, description="Course Over Ground in degrees")
    course_over_ground: Optional[float] = Field(None, description="Alias for Course Over Ground (COG)")
    
    # Heading
    heading: Optional[float] = Field(None, description="True heading in degrees")
    
    # Navigation status
    navigation_status: str = Field("Under way", description="Decoded navigation status")
    nav_status: Optional[str] = Field(None, description="Short alias for navigation status")
    nav_status_code: Optional[int] = Field(None, description="ITU-R M.1371 status code")
    
    # Timestamps & Freshness
    last_received_timestamp: str = Field(..., description="Last received observation timestamp")
    timestamp_utc: Optional[str] = Field(None, description="Alias for last received timestamp")
    signal_age_seconds: Optional[int] = Field(None, description="Elapsed seconds since last transponder ping")
    data_freshness: str = Field("RECENT", description="LIVE (<5m) | RECENT (<30m) | STALE (>30m)")
    
    # Attribution & Identification
    data_provider: str = Field("Authorized AIS Feed", description="Upstream AIS data provider attribution")
    data_source: Optional[str] = Field(None, description="Data feed channel")
    data_mode: Literal["LIVE", "HISTORICAL", "DEMO", "NOT_CONNECTED"] = Field(
        "LIVE",
        description="Data mode classification: LIVE | HISTORICAL | DEMO | NOT_CONNECTED"
    )
    data_source_type: Optional[str] = Field(
        "TERRESTRIAL_VHF",
        description="Physical transponder channel type: TERRESTRIAL_VHF, SATELLITE_AIS, DYNAMIC_TRANSPONDER, or DEMO_FIXTURE"
    )
    position_accuracy: Optional[str] = Field(
        None,
        description="Transponder RAIM / DGNSS position accuracy indication (e.g. HIGH <10m, STANDARD >10m)"
    )
    position_confidence_metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="Detailed position uncertainty metrics and coordinate quality parameters"
    )
    callsign: Optional[str] = Field(None, description="Radio callsign")
    imo: Optional[int] = Field(None, description="International Maritime Organization number")
    flag: Optional[str] = Field(None, description="Flag state nation")
    vessel_type_code: Optional[int] = Field(None, description="ITU-R M.1371 numeric type code")
    vessel_category: str = Field("OTHER", description="High-level category: CARGO, TANKER, FISHING, PASSENGER, TUG, OTHER")
    length_m: Optional[float] = Field(None, description="Vessel length in meters (A + B)")
    width_m: Optional[float] = Field(None, description="Vessel width in meters (C + D)")
    draught_m: Optional[float] = Field(None, description="Maximum static draught in meters")
    destination: Optional[str] = Field(None, description="Reported destination port")
    eta: Optional[str] = Field(None, description="Estimated time of arrival")
    
    # Flag to clearly label demonstration data
    is_simulated: bool = Field(False, description="True ONLY when user explicitly activates demonstration mode")

    @field_validator("mmsi")
    @classmethod
    def validate_mmsi(cls, v: str) -> str:
        clean = v.strip()
        if not clean.isdigit() or len(clean) != 9:
            raise ValueError(f"Invalid MMSI '{v}': Must be a 9-digit numeric maritime identifier")
        return clean

    @model_validator(mode="after")
    def sync_aliases(self) -> "AISVesselPosition":
        # Synchronize field aliases
        if self.speed_over_ground is None:
            self.speed_over_ground = self.sog_knots
        if self.course_over_ground is None:
            self.course_over_ground = self.cog_degrees
        if self.nav_status is None:
            self.nav_status = self.navigation_status
        if self.timestamp_utc is None:
            self.timestamp_utc = self.last_received_timestamp
        if self.data_source is None:
            self.data_source = self.data_provider

        # Strict data_mode consistency
        if self.is_simulated:
            self.data_mode = "DEMO"
            if not self.data_source_type or self.data_source_type == "TERRESTRIAL_VHF":
                self.data_source_type = "DEMO_FIXTURE"
        elif "DEMO" in (self.data_provider or "").upper() or "SIMULATED" in (self.data_provider or "").upper():
            self.data_mode = "DEMO"
            self.is_simulated = True
            self.data_source_type = "DEMO_FIXTURE"

        # Compute data freshness label if age is available
        if self.signal_age_seconds is not None:
            if self.signal_age_seconds <= 300:
                self.data_freshness = "LIVE"
            elif self.signal_age_seconds <= 1800:
                self.data_freshness = "RECENT"
            else:
                self.data_freshness = "STALE"
        return self


class AISVesselMovement(BaseModel):
    """
    Dedicated vessel kinematics and movement information response.
    """
    mmsi: str
    vessel_name: str
    latitude: float
    longitude: float
    speed_over_ground: float = Field(..., description="SOG in knots")
    course_over_ground: float = Field(..., description="COG in degrees")
    heading: Optional[float] = None
    navigation_status: str
    last_received_timestamp: str
    data_provider: str
    is_simulated: bool = False
    movement_vector: Dict[str, Any] = Field(
        default_factory=dict,
        description="Kinematic vector components: speed_knots, course_deg, lat_delta, lon_delta"
    )
    recent_waypoints: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Recent chronological positions"
    )


class AISSignalGapAnalysis(BaseModel):
    mmsi: str
    vessel_name: str
    last_received_utc: Optional[str] = None
    gap_duration_seconds: Optional[float] = None
    has_signal_gap: bool = False
    threshold_seconds: int = 1800
    risk_assessment: str = "NORMAL"
    compliance_disclaimer: str = (
        "An AIS signal gap must not automatically be classified as illegal activity. "
        "Signal latency and gaps routinely occur due to terrestrial VHF horizon line-of-sight limits, "
        "LEO satellite constellation orbital pass revisit schedules, atmospheric/squall attenuation, "
        "or legitimate transponder power reboots."
    )
    plausible_technical_causes: List[str] = Field(
        default_factory=lambda: [
            "Terrestrial line-of-sight VHF propagation limits (typically 25-35 nautical miles from nearest coastal receiver).",
            "Low Earth Orbit (LEO) satellite constellation orbital pass interval (typical revisit cycle 30-90 minutes).",
            "Atmospheric ducting collapse, severe rain squall fade, or high sea-clutter RF attenuation.",
            "Vessel power bus maintenance, transceiver antenna cable check, or firmware reboot.",
            "Legitimate master safety protocol in designated security corridors (SOLAS V/19.2.4)."
        ]
    )


class AISProviderStatus(BaseModel):
    provider_name: str = Field("Authorized AIS Provider", description="Configured AIS provider adapter name")
    is_connected: bool = Field(False, description="True if provider is reachable with valid credentials")
    connection_status: str = Field("NOT CONNECTED", description="REAL | NOT CONNECTED | OFFLINE | NO DATA | DEMO")
    message: str = Field(
        DEFAULT_UNCONFIGURED_MESSAGE,
        description="Human-readable connection or guidance notice"
    )
    api_endpoint: str = Field(..., description="Provider API endpoint URL")
    api_key_configured: bool = Field(False, description="Whether API credentials are configured in backend environment")
    total_vessels_tracked: int = Field(0, description="Count of currently tracked vessels in cache/ledger")
    last_query_timestamp: Optional[str] = Field(None, description="ISO timestamp of last successful API query")
    cache_ttl_seconds: int = Field(60, description="Provider rate-limit caching window")
    cache_ttl_remaining_seconds: int = Field(0, description="Seconds remaining before next live query can be made")
    demo_mode_active: bool = Field(False, description="True if demonstration mode is explicitly active")
    rate_limit_notice: str = Field("Adheres to provider rate-limit conditions. Responses are automatically cached.")
    instructions: str = Field(
        "To connect live AIS feeds: Set your authorized API key in backend/.env (e.g. AIS_API_KEY, MARINETRAFFIC_API_KEY). "
        "Physical receiver ownership is NOT required. If unconfigured, ORCA safely reports NOT CONNECTED."
    )


class AISQueryFilter(BaseModel):
    min_lat: Optional[float] = Field(None, ge=-90.0, le=90.0, description="Southern bounding latitude")
    max_lat: Optional[float] = Field(None, ge=-90.0, le=90.0, description="Northern bounding latitude")
    min_lon: Optional[float] = Field(None, ge=-180.0, le=180.0, description="Western bounding longitude")
    max_lon: Optional[float] = Field(None, ge=-180.0, le=180.0, description="Eastern bounding longitude")
    mmsi: Optional[str] = Field(None, description="Search by specific 9-digit MMSI")
    vessel_name: Optional[str] = Field(None, description="Search by vessel name substring")
    vessel_categories: Optional[List[str]] = Field(None, description="Filter categories: CARGO, TANKER, FISHING, PASSENGER, TUG, OTHER")
    min_speed_knots: Optional[float] = Field(None, ge=0.0, description="Minimum SOG in knots")
    max_speed_knots: Optional[float] = Field(None, ge=0.0, description="Maximum SOG in knots")
    nav_status_codes: Optional[List[int]] = Field(None, description="List of NAVSTAT codes to filter")
    limit: int = Field(100, ge=1, le=500, description="Maximum vessel contacts to return")
    demo: bool = Field(False, description="Set True only when user explicitly activates demonstration mode")


class AISVesselResponse(BaseModel):
    provider_status: AISProviderStatus
    vessels: List[AISVesselPosition] = Field(default_factory=list)
    total_count: int = 0
    filtered_count: int = 0
    query_timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    bounding_box: Optional[Dict[str, float]] = None
    compliance_notice: str = (
        "ORCA AIS Vessel Intelligence complies with IMO ITU-R M.1371 standards. "
        "An AIS signal gap must not automatically be classified as illegal activity."
    )


# ==============================================================================
# Vessel Behaviour & Anomaly Detection Schemas (Phase 4 Specification)
# ==============================================================================

class AISVesselAnomaly(BaseModel):
    """
    Explainable vessel behaviour and spatial anomaly indicator.
    Strictly complies with scientific and legal caveats:
    - An AIS reporting gap does not prove illegal activity.
    - A stationary vessel does not automatically indicate suspicious behaviour.
    - Route deviation does not prove pollution or crime.
    - Proximity to an environmental anomaly does not prove causation or guilt.
    """
    anomaly_id: str = Field(..., description="Unique anomaly record identifier")
    anomaly_type: Literal[
        "UNUSUAL_LOITERING",
        "REPEATED_COURSE_CHANGES",
        "UNEXPECTED_ROUTE_DEVIATION",
        "UNUSUAL_SPEED_PATTERN",
        "PROLONGED_STATIONARY_OPEN_SEA",
        "TRANSPONDER_REPORTING_GAP",
        "PROXIMITY_TO_MARINE_ANOMALY",
        "SENSITIVE_AREA_ACTIVITY"
    ] = Field(..., description="Specific standardized anomaly classification")
    mmsi: str = Field(..., description="9-digit Maritime Mobile Service Identity")
    vessel_name: str = Field("UNKNOWN", description="Vessel broadcast name")
    vessel_type: str = Field("Unknown", description="Decoded vessel type description")
    vessel_category: str = Field("OTHER", description="High-level vessel category")
    latitude: float = Field(..., description="Latitude of detected event")
    longitude: float = Field(..., description="Longitude of detected event")
    observation_time_window: Dict[str, Any] = Field(
        ...,
        description="Observation window: start_utc, end_utc, duration_minutes"
    )
    evidence_used: List[str] = Field(
        ...,
        description="Empirical kinematic/sensor inputs evaluated (SOG variance, COG delta, waypoint history)"
    )
    detection_method: str = Field(
        ...,
        description="Scientific or rule-based detection methodology"
    )
    severity: Literal["LOW", "MODERATE", "ELEVATED", "CRITICAL"] = Field(
        "MODERATE",
        description="Operational severity tier"
    )
    confidence: float = Field(..., ge=0.0, le=1.0, description="Algorithmic confidence score (0.0 - 1.0)")
    uncertainty: float = Field(..., ge=0.0, le=1.0, description="Estimated measurement uncertainty (0.0 - 1.0)")
    explanation: str = Field(
        ...,
        description="Clear, explainable reasoning describing the behavioural indicator"
    )
    data_limitations: List[str] = Field(
        ...,
        description="Documented technical caveats (VHF range, satellite revisit, squalls, single-sensor observation)"
    )
    compliance_disclaimer: str = Field(
        "Scientific & Legal Compliance: An AIS behavioural anomaly or transponder reporting gap must NEVER "
        "automatically be classified as illegal activity, legal liability, criminal evasion, or proof of a discharge. "
        "Observations are technical indicators requiring corroboration from SAR radar backscatter damping, "
        "optical multispectral imagery, and in-situ validation.",
        description="Mandatory legal disclaimer adhering to maritime law"
    )
    data_mode: Literal["LIVE", "HISTORICAL", "DEMO", "NOT_CONNECTED"] = Field(
        "LIVE",
        description="Data mode of the underlying evidence"
    )


class AISAnomalyReport(BaseModel):
    """
    Collection response of detected vessel behaviour anomalies.
    """
    total_anomalies: int
    anomalies: List[AISVesselAnomaly] = Field(default_factory=list)
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    data_mode: str = "LIVE"
    compliance_notice: str = (
        "ORCA AIS Vessel Intelligence complies with IMO ITU-R M.1371 standards. "
        "An AIS anomaly or signal gap must not automatically be classified as illegal activity."
    )


# ==============================================================================
# Cross-Agent Correlation Schemas (SAR / Optical / Oceanographic / AIS)
# ==============================================================================

class AISCrossAgentCorrelation(BaseModel):
    """
    Multi-sensor spatial and temporal correlation between AIS vessel positions
    and satellite/oceanographic observations (Sentinel-1 SAR, Sentinel-2 Optical, CMEMS).
    """
    correlation_id: str
    vessel_mmsi: str
    vessel_name: str
    vessel_category: str
    vessel_coordinates: Dict[str, float]  # latitude, longitude
    vessel_timestamp_utc: str
    vessel_sog_knots: float
    vessel_cog_degrees: float
    
    # Environmental anomaly target
    anomaly_source: Literal["SENTINEL_1_SAR", "SENTINEL_2_OPTICAL", "COPERNICUS_MARINE"]
    target_id: str
    target_coordinates: Dict[str, float]  # latitude, longitude
    target_timestamp_utc: str
    target_type: str  # e.g. "OIL_SLICK_CANDIDATE", "TURBIDITY_PLUME", "ALGAL_BLOOM_RISK"
    
    # Spatial & Temporal metrics
    spatial_separation_km: float
    spatial_separation_nm: float
    temporal_separation_hours: float
    
    # Hydrodynamic drift vector
    drift_current_speed_knots: Optional[float] = None
    drift_current_direction_deg: Optional[float] = None
    hydrodynamic_alignment_angle_deg: Optional[float] = None
    hydrodynamic_plausibility: Literal["HIGH", "MODERATE", "LOW", "INCONCLUSIVE"] = "INCONCLUSIVE"
    
    correlation_status: Literal[
        "SPATIAL_TEMPORAL_CONVERGENCE",
        "TRANSITING_CORRIDOR",
        "STATIONARY_VICINITY",
        "INCONCLUSIVE_PROXIMITY"
    ]
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    uncertainty_score: float = Field(..., ge=0.0, le=1.0)
    findings_summary: str
    limitations: List[str]
    compliance_disclaimer: str = (
        "Maritime Law & Environmental Disclaimer: Spatial proximity to a detected marine anomaly "
        "does NOT prove causation, liability, or intentional discharge. Marine current drift, "
        "historical transit vectors, and verified physical backscatter damping must be jointly evaluated."
    )


class AISAnalyzeRequest(BaseModel):
    """
    Request to execute vessel intelligence analysis and cross-agent correlation.
    """
    zone_id: Optional[str] = None
    min_lat: Optional[float] = None
    max_lat: Optional[float] = None
    min_lon: Optional[float] = None
    max_lon: Optional[float] = None
    correlate_with_sar: bool = True
    correlate_with_optical: bool = True
    correlate_with_ocean: bool = True
    demo: Optional[bool] = None


class AISAnalyzeResponse(BaseModel):
    """
    Full vessel intelligence analysis response for the Lead Orchestrator.
    """
    analysis_id: str
    analyzed_at: str
    data_mode: str
    vessels_analyzed: int
    anomalies_detected: int
    anomalies: List[AISVesselAnomaly] = Field(default_factory=list)
    correlations: List[AISCrossAgentCorrelation] = Field(default_factory=list)
    orchestrator_evidence_payload: Dict[str, Any] = Field(default_factory=dict)
    compliance_statement: str

