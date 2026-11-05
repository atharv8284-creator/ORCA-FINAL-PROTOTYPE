from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime

CopernicusMarineProductCategory = Literal[
    "MODEL_ANALYSIS_FORECAST",
    "SATELLITE_OBSERVATION",
    "IN_SITU_OBSERVATION"
]

class CopernicusMarineVariable(BaseModel):
    variable_id: str
    name: str
    standard_name: Optional[str] = None
    units: str
    category: Literal[
        "TEMPERATURE", 
        "SALINITY", 
        "CURRENTS", 
        "WAVES", 
        "SURFACE_PHYSICS", 
        "BIOGEOCHEMISTRY", 
        "OTHER"
    ]
    valid_min: Optional[float] = None
    valid_max: Optional[float] = None
    description: Optional[str] = None
    dimensions: List[str] = Field(default_factory=list)
    has_layer: bool = True

class CopernicusMarineDataset(BaseModel):
    dataset_id: str
    title: str
    product_id: str
    product_type: CopernicusMarineProductCategory
    product_type_label: str
    description: str
    temporal_resolution: str
    spatial_resolution: str
    doi: Optional[str] = None
    variables: List[CopernicusMarineVariable] = Field(default_factory=list)
    wmts_endpoint: Optional[str] = None

class OceanographicQueryRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    zone_name: Optional[str] = None
    target_date: Optional[str] = None # ISO format YYYY-MM-DD
    dataset_id: Optional[str] = None
    requested_variables: Optional[List[str]] = None

class OceanographicObservationItem(BaseModel):
    observation_id: str
    variable_id: str
    variable_name: str
    category: str
    raw_value: float
    raw_units: str
    converted_value: float
    converted_units: str
    latitude: float
    longitude: float
    location_name: str
    timestamp: str
    dataset_id: str
    dataset_title: str
    product_id: Optional[str] = None
    product_type: CopernicusMarineProductCategory
    product_type_label: str
    data_classification: Literal["OBSERVATION", "MODEL_ANALYSIS", "FORECAST"] = "MODEL_ANALYSIS"
    forecast_reference_time: Optional[str] = None
    retrieval_status: Literal["RETRIEVED", "CACHED", "UNAVAILABLE", "OUT_OF_BOUNDS", "FILL_VALUE_FILTERED", "MASKED_LAND"] = "RETRIEVED"
    data_freshness: Literal["LIVE", "RECENT", "STALE", "HISTORICAL"] = "RECENT"
    uncertainty: Optional[float] = Field(default=None, description="Physical measurement or model uncertainty margin")
    data_source: str = "Copernicus Marine Service (marine.copernicus.eu)"
    last_successful_update: str
    validation_status: Literal["VALIDATED_PHYSICAL_RANGE", "OUT_OF_BOUNDS", "FILL_VALUE_FILTERED"]
    validation_notes: str
    secondary_metrics: Dict[str, Any] = Field(default_factory=dict)

class OceanographicProfileResponse(BaseModel):
    query_latitude: float
    query_longitude: float
    location_name: str
    query_timestamp: str
    data_source: str = "Copernicus Marine Service (marine.copernicus.eu)"
    data_source_url: str = "https://marine.copernicus.eu/"
    service_status: str = "OPERATIONAL"
    data_tier: Literal["LIVE_COPERNICUS_MARINE_OBSERVATIONS", "NUMERICAL_MODEL_ANALYSIS", "FORECAST", "SIMULATED", "UNAVAILABLE"] = "NUMERICAL_MODEL_ANALYSIS"
    retrieval_status: Literal["SUCCESS", "PARTIAL", "FAILED", "EMPTY", "MASKED_TERRESTRIAL"] = "SUCCESS"
    spatial_coverage: Optional[Dict[str, Any]] = None
    temporal_range: Optional[Dict[str, str]] = None
    error_message: Optional[str] = None
    authentication_status: Dict[str, Any]
    observations: List[OceanographicObservationItem]
    summary_card: Dict[str, Any] = Field(default_factory=dict)
    retrieved_at: str

class SAROceanContextRequest(BaseModel):
    sar_product_id: str
    candidate_id: Optional[str] = None
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    sar_acquisition_timestamp: Optional[str] = None

class SAROceanContext(BaseModel):
    sar_product_id: str
    candidate_id: Optional[str] = None
    candidate_lat: float
    candidate_lon: float
    sar_acquisition_timestamp: Optional[str] = None
    ocean_data_timestamp: Optional[str] = None
    temporal_delta_hours: Optional[float] = None
    spatial_distance_km: float = 0.0
    data_freshness: Literal["LIVE", "RECENT", "STALE", "HISTORICAL_TOO_OLD", "UNAVAILABLE"]
    surface_current_speed_knots: Optional[float] = None
    surface_current_direction_deg: Optional[float] = None
    u_eastward_ms: Optional[float] = None
    v_northward_ms: Optional[float] = None
    significant_wave_height_m: Optional[float] = None
    sea_surface_temp_c: Optional[float] = None
    sea_surface_salinity_psu: Optional[float] = None
    data_classification: Literal["OBSERVATION", "MODEL_ANALYSIS", "FORECAST", "UNAVAILABLE"]
    drift_direction_cardinal: Optional[str] = None
    environmental_context_summary: str
    scientific_disclaimer: str = (
        "Environmental Context Disclaimer: Surface currents, winds, and wave action transport "
        "buoyant surface films and guide trajectory modeling. Ocean current alignment alone does NOT "
        "confirm an oil spill, verify contamination, or prove vessel culpability without multi-source "
        "corroboration (SAR backscatter damping, optical radiometry, in-situ sampling)."
    )

class OceanographicTimeSeriesPoint(BaseModel):
    timestamp: str
    sst_c: Optional[float] = None
    bottom_temp_c: Optional[float] = None
    salinity_psu: Optional[float] = None
    wave_height_m: Optional[float] = None
    wave_period_s: Optional[float] = None
    current_speed_knots: Optional[float] = None
    current_direction_deg: Optional[float] = None
    mld_m: Optional[float] = None
    ssh_m: Optional[float] = None

class OceanographicTimeSeriesResponse(BaseModel):
    latitude: float
    longitude: float
    location_name: str
    temporal_coverage: str
    points: List[OceanographicTimeSeriesPoint]
    dataset_id: str
    product_type_label: str

class CopernicusMarineHealth(BaseModel):
    status: Literal["OPERATIONAL", "DEGRADED", "UNREACHABLE"]
    stac_endpoint: str
    wmts_endpoint: str
    latency_ms: float
    stac_catalog_available: bool
    available_datasets_count: int
    auth_configured: bool
    auth_username: Optional[str] = None
    toolbox_installed: bool = False
    auth_instructions: str
