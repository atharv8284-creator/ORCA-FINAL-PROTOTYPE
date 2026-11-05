from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime

class OpticalAssetDetail(BaseModel):
    """
    Metadata describing an individual Sentinel-2 image asset or spectral band.
    """
    name: str
    title: str
    type: Optional[str] = None
    href: str
    roles: List[str] = Field(default_factory=list)
    is_downloadable_without_auth: bool = False
    band_identifier: Optional[str] = None
    central_wavelength_nm: Optional[float] = None
    bandwidth_nm: Optional[float] = None
    resolution_meters: Optional[float] = None

class OpticalProductAssetsResponse(BaseModel):
    """
    Discovery response containing all available multispectral bands, auxiliary layers,
    and download authorization states for a Sentinel-2 product.
    """
    product_id: str
    collection: str
    acquisition_timestamp: Optional[str] = None
    cloud_cover_pct: Optional[float] = None
    spatial_resolution_meters: float = 10.0
    bbox: Optional[List[float]] = None
    assets_count: int
    assets: Dict[str, OpticalAssetDetail] = Field(default_factory=dict)
    available_bands: List[str] = Field(default_factory=list)
    auth_required_for_full_raster: bool = True
    message: str

class OpticalDownloadRequest(BaseModel):
    asset_key: str = "thumbnail"

class OpticalDownloadResponse(BaseModel):
    status: Literal["DOWNLOADED", "PREVIEW_STAGED", "AUTH_REQUIRED_FOR_FULL_RASTER", "FAILED"]
    product_id: str
    asset_key: str
    local_path: Optional[str] = None
    size_bytes: Optional[int] = None
    message: str
    is_preview: bool = True
    auth_details: Optional[str] = None

class OpticalSpectralIndicators(BaseModel):
    """
    Spectral indicators extracted from calibrated Sentinel-2 MSI multispectral radiometry.
    Distinguishes direct satellite observations from derived bio-optical proxies.
    """
    ndci_chlorophyll_proxy: float = Field(..., description="Normalized Difference Chlorophyll Index (G - R) / (G + R)")
    turbidity_spm_index: float = Field(..., description="Suspended Particulate Matter proxy ratio R / (G + B)")
    ndwi_water_index: float = Field(..., description="Aquatic clarity index (G - B) / (G + B)")
    algal_bloom_risk: Literal["LOW", "MODERATE", "ELEVATED", "HIGH"] = "LOW"
    turbidity_severity: Literal["CLEAR", "SLIGHT_PLUME", "MODERATE_TURBIDITY", "HEAVY_SEDIMENT"] = "CLEAR"
    anomaly_coverage_sq_km: float = 0.0
    cloud_coverage_pct: float = 0.0
    valid_water_coverage_pct: float = 0.0
    mean_reflectance: Dict[str, float] = Field(default_factory=dict) # {"red": 0.12, "green": 0.18, "blue": 0.22}
    direct_observations: Dict[str, Any] = Field(default_factory=dict)
    derived_proxies: Dict[str, Any] = Field(default_factory=dict)

class OpticalProcessRequest(BaseModel):
    product_id: str
    zone_id: Optional[str] = None
    asset_key: str = "thumbnail" # public quicklook raster or specific band
    custom_image_base64: Optional[str] = None
    allow_synthetic_fallback: bool = True

class OpticalProcessingResult(BaseModel):
    """
    Structured outcome of Sentinel-2 MSI optical imagery processing.
    Preserves data provenance, processing status, uncertainty margins, and scientific disclaimers.
    """
    analysis_id: str
    product_id: str
    zone_id: Optional[str] = None
    acquisition_timestamp: Optional[str] = None
    processed_at: datetime
    execution_duration_ms: float
    data_tier: Literal[
        "FULL_MULTISPECTRAL_RASTER", 
        "CALIBRATED_PREVIEW_ANALYSIS", 
        "METADATA_DISCOVERY", 
        "SIMULATED", 
        "NOT_AVAILABLE"
    ] = "CALIBRATED_PREVIEW_ANALYSIS"
    is_preview: bool = True
    processing_status: Literal[
        "COMPLETED", 
        "HIGH_CLOUD_COVER", 
        "INSUFFICIENT_WATER_PIXELS", 
        "FAILED", 
        "DOWNLOAD_ERROR"
    ] = "COMPLETED"
    uncertainty_margin: float = 0.08
    spatial_coverage: Optional[Dict[str, Any]] = None
    source_attribution: str = "European Space Agency (ESA) Sentinel-2 MSI via Copernicus Data Space Ecosystem (CDSE)"
    spectral_indicators: OpticalSpectralIndicators
    visualizations: Dict[str, str] = Field(default_factory=dict) # base64 data URIs
    scientific_notes: str = (
        "Scientific Attribution: Spectral indicators are computed from calibrated Sentinel-2 MSI "
        "Top-of-Atmosphere/Bottom-of-Atmosphere radiometry. Green-to-Red reflectance ratio proxies algal chlorophyll "
        "pigmentation while Red-channel scattering estimates suspended sediment plumes."
    )
    scientific_disclaimer: str = (
        "Scientific Notice: Bio-optical spectral indicators (NDCI, SPM ratio) are empirical proxies for chlorophyll-a "
        "pigmentation and suspended particulate scattering. They indicate relative water-quality variations and MUST NOT "
        "be asserted as direct chemical pollutant concentrations or toxic algal species identifications without in-situ corroboration."
    )
    quality_flags: List[str] = Field(default_factory=list)
    processing_engine_info: Dict[str, Any] = Field(default_factory=dict)
    error_message: Optional[str] = None
