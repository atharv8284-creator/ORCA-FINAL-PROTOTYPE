from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime

class SARAssetDetails(BaseModel):
    name: str
    title: Optional[str] = None
    type: Optional[str] = None
    href: str
    roles: List[str] = []
    is_downloadable_without_auth: bool = False

class SARProductAssetResponse(BaseModel):
    product_id: str
    collection: str
    platform: str
    acquisition_timestamp: Optional[str] = None
    assets: Dict[str, SARAssetDetails]
    assets_count: int
    download_permitted: bool
    auth_required: bool
    auth_message: str

class SARDownloadRequest(BaseModel):
    product_id: str
    asset_key: str = "thumbnail" # default to preview/thumbnail asset

class SARDownloadResponse(BaseModel):
    status: Literal["DOWNLOADED", "PREVIEW_STAGED", "AUTH_REQUIRED_FULL_RASTER", "AUTH_REQUIRED_FOR_FULL_RASTER", "FAILED", "UNAVAILABLE"]
    product_id: str
    asset_key: str
    local_path: Optional[str] = None
    size_bytes: int = 0
    message: str
    is_preview: bool = True
    auth_details: Optional[str] = None

class SARPreprocessingParams(BaseModel):
    calibration_mode: Literal["SIGMA_NAUGHT_DB", "GAMMA_NAUGHT", "BETA_NAUGHT"] = "SIGMA_NAUGHT_DB"
    calibration_factor: float = 1.0
    speckle_filter: Literal["REFINED_LEE", "FROST", "MEDIAN", "NONE"] = "REFINED_LEE"
    filter_window_size: int = Field(default=5, ge=3, le=9)
    enable_land_masking: bool = True
    land_mask_threshold_db: float = -5.0
    adaptive_threshold_sigma: float = Field(default=2.5, ge=1.5, le=4.5)
    min_cluster_pixels: int = Field(default=15, ge=5)
    max_cluster_pixels: int = Field(default=50000, ge=100)

class SARAnomalyCandidate(BaseModel):
    candidate_id: str
    label: str = "Candidate Anomaly (Requires Multimodal Verification)"
    anomaly_type: Literal[
        "LOW_BACKSCATTER_CANDIDATE", 
        "DARK_FORMATION_LOOKALIKE", 
        "METALLIC_POINT_ECHO"
    ] = "LOW_BACKSCATTER_CANDIDATE"
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    uncertainty: float = Field(default=0.15, ge=0.0, le=1.0, description="Estimated measurement uncertainty based on raster resolution and speckle contrast")
    damping_ratio_db: float # Contrast compared to ambient sea in dB
    area_sq_km: float
    perimeter_km: float
    circularity: float # 4*pi*area / perimeter^2
    elongation: float
    centroid_lat: float
    centroid_lon: float
    bounding_box: List[float] # [min_lon, min_lat, max_lon, max_lat]
    geometry_type: str = "Polygon"
    geojson_geometry: Optional[Dict[str, Any]] = None
    verification_status: Literal[
        "UNVERIFIED_CANDIDATE", 
        "CORROBORATED_BY_AIS", 
        "CORROBORATED_BY_OPTICAL", 
        "FLAGGED_AS_LOOKALIKE",
        "AUV_DISPATCHED"
    ] = "UNVERIFIED_CANDIDATE"
    recommended_verification: List[str]

class SARPipelineStageResult(BaseModel):
    stage_name: str
    status: Literal["COMPLETED", "SKIPPED", "DEGRADED", "FAILED"]
    execution_time_ms: float
    details: str

class SARProcessingRequest(BaseModel):
    product_id: str
    asset_key: str = "thumbnail" # or "vh", "vv"
    params: SARPreprocessingParams = Field(default_factory=SARPreprocessingParams)
    custom_image_base64: Optional[str] = None # Support uploading or injecting custom raster
    allow_synthetic_fallback: bool = Field(default=False, description="When False, raises error if image download fails instead of silently generating synthetic raster")

class SARProcessingResult(BaseModel):
    analysis_id: str
    product_id: str
    source_attribution: str = "European Space Agency (ESA) Sentinel-1 C-SAR via Copernicus Data Space Ecosystem (CDSE)"
    acquisition_timestamp: Optional[str] = None
    timestamp: datetime
    execution_duration_ms: float
    pipeline_stages: List[SARPipelineStageResult]
    backscatter_statistics: Dict[str, float]
    anomaly_candidates: List[SARAnomalyCandidate]
    total_candidates_found: int = 0
    data_tier: Literal[
        "LIVE_PROCESSED_IMAGERY", 
        "FULL_RASTER_PROCESSED", 
        "PREVIEW", 
        "CALIBRATED_PREVIEW_ANALYSIS", 
        "METADATA_ONLY", 
        "METADATA_DISCOVERY", 
        "SIMULATED", 
        "UNAVAILABLE"
    ] = "PREVIEW"
    processing_status: Literal["COMPLETED", "DEGRADED", "FAILED", "METADATA_ONLY"] = "COMPLETED"
    is_preview: bool = True
    uncertainty: float = Field(default=0.15, description="Overall pipeline uncertainty (0.05 for full raster, 0.15 for preview, 0.40 for simulated)")
    error_message: Optional[str] = None
    visualizations: Dict[str, str] = Field(default_factory=dict) # base64 data URIs: calibrated, filtered, mask
    scientific_disclaimer: str = (
        "Scientific Integrity Notice: Anomaly candidates detected through SAR backscatter damping "
        "represent surface capillary wave attenuation. They must be treated strictly as unverified candidates. "
        "Separation of real hydrocarbon films from natural look-alikes (low-wind zones, biogenic slicks, internal waves) "
        "requires multimodal corroboration via AIS vessel tracking, optical radiometry, or in-situ AUV telemetry."
    )
    processing_engine_info: Dict[str, Any] = Field(default_factory=dict)

class SARDependencyStatus(BaseModel):
    engine_name: str
    active_runtime: str
    installed_libraries: Dict[str, str]
    specialized_libraries: Dict[str, Dict[str, Any]]
    system_notes: str
