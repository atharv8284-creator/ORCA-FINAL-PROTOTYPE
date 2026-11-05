import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.oceanographic import (
    CopernicusMarineHealth,
    CopernicusMarineDataset,
    CopernicusMarineVariable,
    OceanographicQueryRequest,
    OceanographicProfileResponse,
    OceanographicTimeSeriesResponse,
    SAROceanContextRequest,
    SAROceanContext
)
from app.services.copernicus_marine_service import copernicus_marine_service
from app.services.oceanographic_storage import oceanographic_storage

router = APIRouter()
logger = logging.getLogger("orca.api.oceanographic")

@router.get("/health", response_model=CopernicusMarineHealth)
def get_copernicus_marine_health():
    """
    Check the connectivity, latency, and authentication status of Copernicus Marine Service APIs.
    Validates STAC catalog and OGC WMTS endpoints.
    """
    try:
        return copernicus_marine_service.get_health()
    except Exception as e:
        logger.error(f"Error checking Copernicus Marine health: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Copernicus Marine Service unreachable: {str(e)}"
        )

@router.get("/datasets", response_model=List[CopernicusMarineDataset])
def list_datasets(
    product_type: Optional[str] = Query(
        default=None, 
        description="Filter by category: MODEL_ANALYSIS_FORECAST, SATELLITE_OBSERVATION, IN_SITU_OBSERVATION"
    )
):
    """
    Discover available oceanographic datasets from Copernicus Marine Data Store.
    Includes physics, waves, biogeochemistry, and in-situ observations.
    """
    try:
        return copernicus_marine_service.list_datasets(product_type=product_type)
    except Exception as e:
        logger.error(f"Error listing datasets: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to discover datasets: {str(e)}"
        )

@router.get("/datasets/{dataset_id}/variables", response_model=List[CopernicusMarineVariable])
def get_dataset_variables(dataset_id: str):
    """
    Discover all oceanographic variables for a specific Copernicus Marine dataset.
    Returns names, standard names, physical units, valid ranges, and categories.
    """
    vars = copernicus_marine_service.get_dataset_variables(dataset_id)
    if not vars:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found in Copernicus Marine catalog."
        )
    return vars

@router.post("/observations/point", response_model=OceanographicProfileResponse)
def query_point_observations(req: OceanographicQueryRequest):
    """
    Query real oceanographic observations and numerical model forecast values from
    Copernicus Marine Service for a geographical point (latitude, longitude).
    
    Retrieves:
    - Sea Surface Temperature (SST) & Bottom Temperature
    - Salinity (Practical Salinity PSU)
    - Ocean Currents (u, v vectors, total speed knots, flow direction)
    - Wave Information (Significant wave height Hs, peak period Tp, mean direction)
    - Surface Physics (Mixed Layer Depth MLD, Sea Surface Height SSH)
    
    Converts units, validates physical ranges, and persists observation metadata.
    """
    try:
        profile = copernicus_marine_service.query_point_observations(
            latitude=req.latitude,
            longitude=req.longitude,
            target_date=req.target_date,
            location_name=req.zone_name,
            requested_variables=req.requested_variables
        )
        # Persist observation profile to storage ledger
        oceanographic_storage.save_profile(profile)
        return profile
    except Exception as e:
        logger.error(f"Error querying Copernicus Marine observations at ({req.latitude}, {req.longitude}): {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve oceanographic observations: {str(e)}"
        )

@router.post("/observations/timeseries", response_model=OceanographicTimeSeriesResponse)
def query_timeseries_profile(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    days: int = Query(default=7, ge=3, le=30),
    location_name: Optional[str] = Query(default=None)
):
    """
    Retrieve a multi-day subset time-series profile for oceanographic variables
    at the specified coordinates.
    """
    try:
        return copernicus_marine_service.query_timeseries_profile(
            latitude=latitude,
            longitude=longitude,
            days=days,
            location_name=location_name
        )
    except Exception as e:
        logger.error(f"Error querying oceanographic timeseries at ({latitude}, {longitude}): {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate timeseries profile: {str(e)}"
        )

@router.get("/observations/history", response_model=List[Dict[str, Any]])
def list_observation_history(limit: int = Query(default=25, ge=1, le=100)):
    """
    Retrieve persistent storage ledger of past oceanographic queries and observation metadata.
    """
    return oceanographic_storage.list_saved_profiles(limit=limit)

@router.get("/observations/history/{record_id}", response_model=Dict[str, Any])
def get_observation_record(record_id: str):
    """
    Retrieve details of a specific saved observation run by Record ID.
    """
    rec = oceanographic_storage.get_saved_profile(record_id)
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation record '{record_id}' not found."
        )
    return rec

@router.get("/presets", response_model=List[Dict[str, Any]])
def get_maritime_presets():
    """
    Return predefined major global marine corridors and sanctuaries
    (e.g. Persian Gulf, Malacca Strait, Galapagos, North Sea, Mediterranean, Baltic Sea).
    """
    return copernicus_marine_service.get_maritime_presets()

@router.post("/context/sar", response_model=SAROceanContext)
def get_sar_ocean_context(req: SAROceanContextRequest):
    """
    Retrieve physical environmental context (currents, waves, drift vectors)
    for a SAR candidate detection from Copernicus Marine Service.
    Respects temporal acquisition time deltas and supplies scientific disclaimers.
    """
    try:
        return copernicus_marine_service.get_ocean_context_for_sar_candidate(
            sar_product_id=req.sar_product_id,
            candidate_lat=req.latitude,
            candidate_lon=req.longitude,
            sar_acquisition_timestamp=req.sar_acquisition_timestamp,
            candidate_id=req.candidate_id
        )
    except Exception as e:
        logger.error(f"Error computing SAR ocean context for {req.sar_product_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate ocean context for SAR candidate: {str(e)}"
        )
