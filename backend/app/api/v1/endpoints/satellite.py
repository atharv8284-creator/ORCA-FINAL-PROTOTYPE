from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException, status
from app.schemas.marine import (
    SatelliteSearchQuery,
    CopernicusSearchResponse,
    CopernicusSatelliteProduct,
    CopernicusServiceHealth
)
from app.services.copernicus_service import copernicus_service

router = APIRouter()

@router.get("/copernicus/status", response_model=CopernicusServiceHealth, summary="Check Copernicus STAC Health & Auth")
async def get_copernicus_status() -> CopernicusServiceHealth:
    """
    Check live connectivity, latency, and conformance of the official
    Copernicus Data Space Ecosystem (CDSE) STAC API, and verify authentication configuration.
    """
    return copernicus_service.check_health()

@router.post("/sentinel-1/search", response_model=CopernicusSearchResponse, summary="Search Sentinel-1 SAR Observations")
async def search_sentinel_1(query: SatelliteSearchQuery) -> CopernicusSearchResponse:
    """
    Retrieve real Sentinel-1 SAR Ground Range Detected (GRD) observation metadata
    from Copernicus Data Space Ecosystem using geographical bounding box and date filters.
    """
    query.satellite = "sentinel-1"
    return copernicus_service.search_sentinel1(query)

@router.get("/sentinel-1/search", response_model=CopernicusSearchResponse, summary="Search Sentinel-1 SAR Observations (GET)")
async def search_sentinel_1_get(
    min_lon: Optional[float] = Query(None, description="Bounding box minimum longitude (-180 to 180)"),
    min_lat: Optional[float] = Query(None, description="Bounding box minimum latitude (-90 to 90)"),
    max_lon: Optional[float] = Query(None, description="Bounding box maximum longitude (-180 to 180)"),
    max_lat: Optional[float] = Query(None, description="Bounding box maximum latitude (-90 to 90)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    product_id: Optional[str] = Query(None, description="Specific product identifier"),
    limit: int = Query(10, ge=1, le=50, description="Maximum products to return")
) -> CopernicusSearchResponse:
    """
    GET convenience endpoint to search Sentinel-1 SAR products from Copernicus Data Space.
    """
    bbox = [min_lon, min_lat, max_lon, max_lat] if all(v is not None for v in [min_lon, min_lat, max_lon, max_lat]) else None
    query = SatelliteSearchQuery(
        satellite="sentinel-1",
        bbox=bbox,
        start_date=start_date,
        end_date=end_date,
        product_id=product_id,
        limit=limit
    )
    return copernicus_service.search_sentinel1(query)

@router.post("/sentinel-2/search", response_model=CopernicusSearchResponse, summary="Search Sentinel-2 Optical Observations")
async def search_sentinel_2(query: SatelliteSearchQuery) -> CopernicusSearchResponse:
    """
    Retrieve real Sentinel-2 MSI Level-2A surface reflectance observation metadata
    from Copernicus Data Space Ecosystem, including cloud cover metadata and asset inventories.
    """
    query.satellite = "sentinel-2"
    return copernicus_service.search_sentinel2(query)

@router.get("/sentinel-2/search", response_model=CopernicusSearchResponse, summary="Search Sentinel-2 Optical Observations (GET)")
async def search_sentinel_2_get(
    min_lon: Optional[float] = Query(None, description="Bounding box minimum longitude (-180 to 180)"),
    min_lat: Optional[float] = Query(None, description="Bounding box minimum latitude (-90 to 90)"),
    max_lon: Optional[float] = Query(None, description="Bounding box maximum longitude (-180 to 180)"),
    max_lat: Optional[float] = Query(None, description="Bounding box maximum latitude (-90 to 90)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    max_cloud_cover: Optional[float] = Query(None, ge=0, le=100, description="Maximum cloud cover percentage"),
    product_id: Optional[str] = Query(None, description="Specific product identifier"),
    limit: int = Query(10, ge=1, le=50, description="Maximum products to return")
) -> CopernicusSearchResponse:
    """
    GET convenience endpoint to search Sentinel-2 MSI Level-2A products from Copernicus Data Space.
    """
    bbox = [min_lon, min_lat, max_lon, max_lat] if all(v is not None for v in [min_lon, min_lat, max_lon, max_lat]) else None
    query = SatelliteSearchQuery(
        satellite="sentinel-2",
        bbox=bbox,
        start_date=start_date,
        end_date=end_date,
        max_cloud_cover=max_cloud_cover,
        product_id=product_id,
        limit=limit
    )
    return copernicus_service.search_sentinel2(query)

@router.get("/products/{product_id}", response_model=CopernicusSatelliteProduct, summary="Get Copernicus Product by ID")
async def get_product_details(product_id: str) -> CopernicusSatelliteProduct:
    """
    Retrieve complete STAC metadata, asset references, and observation footprint
    for a specific Copernicus product identifier.
    """
    product = copernicus_service.get_product(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with identifier '{product_id}' not found in Copernicus Data Space STAC catalog."
        )
    return product
