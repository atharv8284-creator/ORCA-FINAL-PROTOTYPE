from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.ais import (
    AISProviderStatus,
    AISQueryFilter,
    AISVesselResponse,
    AISVesselPosition,
    AISVesselMovement,
    AISAnomalyReport,
    AISCrossAgentCorrelation,
    AISAnalyzeRequest,
    AISAnalyzeResponse
)
from app.services.ais import ais_service, ais_storage

router = APIRouter()


@router.get("/status", response_model=AISProviderStatus, summary="Check AIS Provider Connection Status")
@router.get("/health", response_model=AISProviderStatus, summary="Check AIS Provider Health")
async def get_ais_status(demo: Optional[bool] = Query(None, description="Check status under demonstration mode")):
    """
    Returns operational connection status of configured AIS provider:
    - REAL: Actual data received from an authorized provider.
    - NOT CONNECTED: No provider credentials configured.
    - OFFLINE: Configured provider is unavailable.
    - NO DATA: Provider is connected but returned no vessel records.
    - DEMO: Only when user explicitly activates demonstration mode.
    """
    return ais_service.get_provider_status(demo=demo)


@router.post("/test-connection", summary="Test Live AIS Provider Connection")
async def test_ais_connection(demo: Optional[bool] = Query(None, description="Test demo mode connection")):
    """
    Initiates an explicit live connectivity test with the upstream AIS provider.
    Verifies network reachability and authentication token validity.
    """
    return await ais_service.check_connection(demo=demo)


@router.get("/vessels", response_model=AISVesselResponse, summary="Fetch Available Vessel Data with Geographic Filter")
async def get_vessels(
    min_lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Southern bounding latitude"),
    max_lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Northern bounding latitude"),
    min_lon: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Western bounding longitude"),
    max_lon: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Eastern bounding longitude"),
    mmsi: Optional[str] = Query(None, description="Search by 9-digit MMSI"),
    vessel_name: Optional[str] = Query(None, description="Search by vessel name substring"),
    limit: int = Query(100, ge=1, le=500, description="Max vessels to return"),
    demo: bool = Query(False, description="Activate demonstration mode with labeled simulated vessels")
):
    """
    Retrieve live AIS vessel positions with geographic bounding box filtering.
    - In REAL mode: returns authentic observations from authorized provider.
    - If unconfigured: returns empty list with NOT CONNECTED status.
    - In DEMO mode: returns labeled simulated profiles.
    """
    filters = AISQueryFilter(
        min_lat=min_lat,
        max_lat=max_lat,
        min_lon=min_lon,
        max_lon=max_lon,
        mmsi=mmsi,
        vessel_name=vessel_name,
        limit=limit,
        demo=demo
    )
    return await ais_service.get_vessels(filters)


@router.post("/vessels", response_model=AISVesselResponse, summary="Query and Filter AIS Vessels via Body")
async def query_vessels(filters: Optional[AISQueryFilter] = None):
    """
    Retrieve live AIS vessel positions with optional spatial bounding box, 
    speed, category, and navigational status filters.
    """
    return await ais_service.get_vessels(filters)


@router.get("/vessels/{mmsi}", summary="Get Detailed Vessel Telemetry and Signal Gap Analysis")
async def get_vessel_details(
    mmsi: str,
    demo: Optional[bool] = Query(None, description="Inspect under demonstration mode")
):
    """
    Retrieve full telemetry, historical waypoint track, and scientific signal gap analysis 
    for a specific vessel identified by its 9-digit MMSI.
    
    Includes IMO compliance disclaimer: An AIS signal gap must not automatically be classified as illegal activity.
    """
    clean_mmsi = mmsi.strip()
    if not clean_mmsi.isdigit() or len(clean_mmsi) != 9:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid MMSI '{mmsi}': Must be a 9-digit numeric maritime identifier"
        )

    details = await ais_service.get_vessel_details(clean_mmsi, demo=demo)
    if not details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vessel with MMSI '{clean_mmsi}' was not found in current AIS transponder register"
        )
    return details


@router.get("/vessels/{mmsi}/movement", response_model=AISVesselMovement, summary="Get Vessel Movement Information")
async def get_vessel_movement(
    mmsi: str,
    demo: Optional[bool] = Query(None, description="Inspect movement under demo mode")
):
    """
    Retrieve kinematic and movement information (speed over ground, course over ground,
    heading, navigation status, movement vector) for a specific vessel.
    """
    clean_mmsi = mmsi.strip()
    if not clean_mmsi.isdigit() or len(clean_mmsi) != 9:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid MMSI '{mmsi}': Must be a 9-digit numeric maritime identifier"
        )

    movement = await ais_service.get_vessel_movement(clean_mmsi, demo=demo)
    if not movement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vessel movement for MMSI '{clean_mmsi}' is currently unavailable"
        )
    return movement


@router.post("/demo/toggle", summary="Toggle Demonstration Mode")
async def toggle_demo_mode(enabled: Optional[bool] = None):
    """
    Explicitly enable or disable demonstration mode.
    Demonstration mode displays labeled simulated vessels for UI evaluation 
    without requiring physical receiver hardware or active provider subscriptions.
    """
    new_state = ais_service.toggle_demo_mode(enabled)
    return {
        "demo_mode_active": new_state,
        "status": "DEMO" if new_state else "NOT CONNECTED",
        "message": "Demonstration mode activated" if new_state else "Demonstration mode deactivated"
    }


@router.get("/search", response_model=List[AISVesselPosition], summary="Search Vessels by MMSI or Name")
async def search_vessels(
    q: str = Query(..., min_length=1, description="MMSI number, vessel name, or callsign fragment"),
    limit: int = Query(20, ge=1, le=100, description="Max results"),
    demo: Optional[bool] = Query(None, description="Search demo vessels")
):
    """
    Search across live cached and historically stored vessels by MMSI or vessel name.
    """
    return ais_service.search_vessels(q, limit=limit, demo=demo)


@router.get("/history", response_model=List[AISVesselPosition], summary="Get Stored Vessel Ledger")
async def get_stored_vessels():
    """
    Retrieve the persistent vessel location ledger from local disk storage.
    """
    return ais_storage.get_all_latest()


@router.get("/anomalies", response_model=AISAnomalyReport, summary="Get Explainable Vessel Behaviour Anomalies")
async def get_ais_anomalies(
    min_lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Southern bounding latitude"),
    max_lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Northern bounding latitude"),
    min_lon: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Western bounding longitude"),
    max_lon: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Eastern bounding longitude"),
    mmsi: Optional[str] = Query(None, description="Search anomalies for specific 9-digit MMSI"),
    demo: Optional[bool] = Query(None, description="Inspect anomalies under demonstration mode")
):
    """
    Retrieve explainable vessel behaviour and spatial anomaly indicators.
    Strictly complies with scientific and legal caveats:
    - An AIS reporting gap does NOT prove illegal activity.
    - A stationary vessel does NOT automatically indicate suspicious behaviour.
    - Route deviation does NOT prove pollution or criminal activity.
    """
    filters = AISQueryFilter(
        min_lat=min_lat,
        max_lat=max_lat,
        min_lon=min_lon,
        max_lon=max_lon,
        mmsi=mmsi,
        demo=demo or False
    )
    return await ais_service.get_anomalies(filters=filters, demo=demo)


@router.post("/analyze", response_model=AISAnalyzeResponse, summary="Execute Vessel Intelligence Analysis & Orchestrator Correlation")
async def analyze_ais_vessels(req: AISAnalyzeRequest):
    """
    Run full vessel intelligence analysis:
    - Evaluates behavioural and kinematic anomalies (loitering, erratic course, speed drops, reporting gaps).
    - Correlates with Sentinel-1 SAR and Sentinel-2 optical environmental anomalies.
    - Generates structured multimodal evidence for the Lead Orchestrator.
    """
    return await ais_service.analyze_vessels(req)


@router.get("/correlations", response_model=List[AISCrossAgentCorrelation], summary="Get Cross-Agent Satellite & Ocean Correlations")
async def get_ais_correlations(demo: Optional[bool] = Query(None, description="Inspect correlations under demo mode")):
    """
    Retrieve spatial and temporal multi-sensor cross-agent correlations between AIS vessels
    and Sentinel-1 SAR, Sentinel-2 Optical, and Copernicus Marine conditions.
    """
    return await ais_service.get_correlations(demo=demo)

