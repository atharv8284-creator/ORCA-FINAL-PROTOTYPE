import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.optical import (
    OpticalProcessRequest,
    OpticalProcessingResult,
    OpticalProductAssetsResponse,
    OpticalDownloadRequest,
    OpticalDownloadResponse
)
from app.services.optical_engine import optical_engine
from app.services.optical_storage import optical_storage

router = APIRouter()
logger = logging.getLogger("orca.api.optical")

@router.get("/health", summary="Get Optical Processing Engine Health & Status")
def get_optical_health():
    """
    Check availability of the Sentinel-2 optical processing pipeline.
    """
    return {
        "status": "OPERATIONAL",
        "engine": "ORCA MultiSpectral Optical Aquatic Processor v2.0",
        "supported_indicators": [
            "NDCI (Normalized Difference Chlorophyll Index)",
            "SPM / Turbidity Suspended Particulate Matter Ratio",
            "NDWI Aquatic Water Clarity Index",
            "Cloud, Sun Glint, and Coastal Land Radiance Masking"
        ],
        "data_tier": "CALIBRATED_PREVIEW_ANALYSIS",
        "source_attribution": "European Space Agency (ESA) Sentinel-2 MSI via Copernicus Data Space Ecosystem (CDSE)"
    }

@router.get("/products/{product_id}/assets", response_model=OpticalProductAssetsResponse, summary="Get Sentinel-2 Image Assets & Spectral Bands")
def get_optical_product_assets(product_id: str):
    """
    Retrieve available image assets, spectral bands (B01-B12, TCI, SCL),
    and download authorization rules for a Sentinel-2 MSI product.
    """
    try:
        return optical_engine.get_product_assets(product_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error inspecting assets for Sentinel-2 product {product_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to inspect product assets: {str(e)}")

@router.post("/products/{product_id}/download-asset", response_model=OpticalDownloadResponse, summary="Download / Stage Sentinel-2 Image Asset")
def download_optical_asset(product_id: str, req: OpticalDownloadRequest):
    """
    Download or stage a Sentinel-2 image asset into local processing cache.
    Permits public preview assets and validates credentials for full rasters.
    """
    try:
        return optical_engine.download_asset(product_id, asset_key=req.asset_key)
    except Exception as e:
        logger.error(f"Error downloading asset for {product_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Download failed: {str(e)}")

@router.post("/process", response_model=OpticalProcessingResult, summary="Process Sentinel-2 Optical Imagery")
def process_sentinel2_optical(req: OpticalProcessRequest):
    """
    Download and execute calibrated bio-optical processing on a Sentinel-2 MSI product:
    - Normalizes Top-of-Atmosphere RGB radiometry
    - Masks cloud, glint, and terrestrial interference
    - Computes pixel-wise Chlorophyll-a (NDCI), Turbidity (SPM), and Clarity (NDWI)
    - Estimates anomaly plume coverage area (sq km)
    - Generates True Color and Spectral Index heatmaps
    - Strictly rejects synthetic substitution when allow_synthetic_fallback=False
    """
    try:
        custom_bytes = None
        if req.custom_image_base64:
            import base64
            raw_b64 = req.custom_image_base64.split(",")[-1]
            custom_bytes = base64.b64decode(raw_b64)

        result = optical_engine.process_optical_product(
            product_id=req.product_id,
            zone_id=req.zone_id,
            asset_key=req.asset_key,
            custom_image_bytes=custom_bytes,
            allow_synthetic_fallback=req.allow_synthetic_fallback
        )
        return result
    except ValueError as e:
        # Strict validation or prohibition of silent synthetic substitution
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Optical processing failed for {req.product_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Optical processing failed: {str(e)}")

@router.get("/analyses", response_model=List[OpticalProcessingResult], summary="List Previous Sentinel-2 Optical Analyses")
def list_optical_analyses(limit: int = Query(default=20, ge=1, le=100)):
    """
    Retrieve previous Sentinel-2 optical multispectral analysis ledger ordered by most recent.
    """
    return optical_storage.list_analyses(limit=limit)

@router.get("/analyses/{analysis_id}", response_model=OpticalProcessingResult, summary="Get Specific Optical Analysis")
def get_optical_analysis(analysis_id: str):
    """
    Retrieve details, spectral indicators, and base64 visualizations for a specific optical analysis run.
    """
    analysis = optical_storage.get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Optical analysis '{analysis_id}' not found.")
    return analysis

@router.delete("/analyses/{analysis_id}", summary="Delete Optical Analysis Run")
def delete_optical_analysis(analysis_id: str):
    """
    Delete an optical analysis record from persistent storage.
    """
    success = optical_storage.delete_analysis(analysis_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Analysis '{analysis_id}' not found.")
    return {"status": "DELETED", "analysis_id": analysis_id}
