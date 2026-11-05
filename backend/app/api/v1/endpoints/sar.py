from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from app.schemas.sar import (
    SARProductAssetResponse,
    SARDownloadRequest,
    SARDownloadResponse,
    SARProcessingRequest,
    SARProcessingResult,
    SARDependencyStatus
)
from app.schemas.marine import (
    SatelliteSearchQuery,
    CopernicusSearchResponse
)
from app.services.sar_engine import sar_engine
from app.services.sar_storage import sar_storage
from app.services.copernicus_service import copernicus_service

router = APIRouter()

@router.get("/products", response_model=CopernicusSearchResponse, summary="List Sentinel-1 SAR Products")
async def list_sentinel1_products(
    min_lon: Optional[float] = Query(None, description="BBox Min Lon"),
    min_lat: Optional[float] = Query(None, description="BBox Min Lat"),
    max_lon: Optional[float] = Query(None, description="BBox Max Lon"),
    max_lat: Optional[float] = Query(None, description="BBox Max Lat"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(10, ge=1, le=50)
) -> CopernicusSearchResponse:
    """
    Query available Sentinel-1 SAR products from Copernicus Data Space for SAR processing.
    """
    bbox = [min_lon, min_lat, max_lon, max_lat] if all(v is not None for v in [min_lon, min_lat, max_lon, max_lat]) else [-6.0, 35.5, -5.0, 36.5]
    query = SatelliteSearchQuery(
        satellite="sentinel-1",
        bbox=bbox,
        start_date=start_date or "2024-06-01",
        end_date=end_date or "2024-06-10",
        limit=limit
    )
    return copernicus_service.search_sentinel1(query)

@router.get("/products/{product_id}/assets", response_model=SARProductAssetResponse, summary="Get Sentinel-1 Image Assets")
async def get_sar_product_assets(product_id: str) -> SARProductAssetResponse:
    """
    Retrieve available image assets and download authorization rules for a Sentinel-1 product.
    """
    try:
        return sar_engine.get_product_assets(product_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post("/products/{product_id}/download-asset", response_model=SARDownloadResponse, summary="Download / Stage SAR Image Asset")
async def download_sar_asset(product_id: str, request: SARDownloadRequest) -> SARDownloadResponse:
    """
    Download or stage a Sentinel-1 image asset into the local processing cache.
    Permits public preview assets and validates credentials for full rasters.
    """
    return sar_engine.download_asset(product_id, request.asset_key)

@router.post("/pipeline/process", response_model=SARProcessingResult, summary="Execute Scientific SAR Preprocessing Pipeline")
async def process_sar_pipeline(req: SARProcessingRequest) -> SARProcessingResult:
    """
    Execute the calibrated 6-stage SAR mathematical pipeline on a Sentinel-1 product:
    - Radiometric Calibration (Sigma-0 dB)
    - Speckle Filtering (Refined Lee / Frost)
    - Georeferencing
    - Land & Coastal Masking
    - Statistical Backscatter Analysis
    - Surface Anomaly Candidate Detection
    """
    try:
        custom_bytes = None
        if req.custom_image_base64:
            import base64
            # Strip data URI prefix if present
            raw_b64 = req.custom_image_base64.split(",")[-1]
            custom_bytes = base64.b64decode(raw_b64)

        result = sar_engine.process_sar_product(
            product_id=req.product_id,
            asset_key=req.asset_key,
            params=req.params,
            custom_image_bytes=custom_bytes,
            allow_synthetic_fallback=req.allow_synthetic_fallback
        )

        # Store analysis run
        sar_storage.save_analysis(result)
        return result
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SAR processing failed: {str(e)}"
        )

@router.get("/analyses", response_model=List[SARProcessingResult], summary="List Previous SAR Analysis Runs")
async def list_sar_analyses(limit: int = Query(20, ge=1, le=100)) -> List[SARProcessingResult]:
    """
    Retrieve history of previous SAR analysis runs from persistent storage.
    """
    return sar_storage.list_analyses(limit)

@router.get("/analyses/{analysis_id}", response_model=SARProcessingResult, summary="Get Specific SAR Analysis Run")
async def get_sar_analysis(analysis_id: str) -> SARProcessingResult:
    """
    Retrieve complete outputs and candidate logs for a specific SAR analysis run.
    """
    analysis = sar_storage.get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"SAR analysis '{analysis_id}' not found.")
    return analysis

@router.delete("/analyses/{analysis_id}", summary="Delete SAR Analysis Run")
async def delete_sar_analysis(analysis_id: str):
    """
    Delete a saved SAR analysis run.
    """
    deleted = sar_storage.delete_analysis(analysis_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found.")
    return {"status": "DELETED", "analysis_id": analysis_id}

@router.get("/dependencies", response_model=SARDependencyStatus, summary="Check SAR Library & Engine Dependencies")
async def check_sar_dependencies() -> SARDependencyStatus:
    """
    Diagnostic status of geospatial and SAR processing dependencies (NumPy, SciPy, Pillow, SNAP).
    """
    return sar_engine.get_dependency_status()
