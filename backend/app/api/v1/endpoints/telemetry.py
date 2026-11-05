from fastapi import APIRouter, HTTPException, Header, status
from typing import List, Optional
from app.schemas.marine import EcosystemTelemetry
from app.schemas.telemetry import (
    ESP32TelemetryIngestPayload,
    ESP32IngestResponse,
    IoTDeviceStatusResponse,
    IoTBuoyItem
)
from app.services.data_store import data_store
from app.services.telemetry_service import iot_telemetry_service

router = APIRouter()

@router.get("/latest", response_model=List[EcosystemTelemetry], summary="Get latest telemetry readings across all zones")
def get_latest_telemetry():
    """
    Returns latest water temperature, dissolved oxygen, pH, salinity, and microplastic index.
    """
    return data_store.get_latest_telemetry()

@router.get("/zone/{zone_id}/history", response_model=List[EcosystemTelemetry], summary="Get time-series telemetry for a zone")
def get_zone_telemetry(zone_id: str):
    """
    Returns historical telemetry time-series points for charting and analytics.
    """
    zone = data_store.get_zone(zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail=f"Marine zone '{zone_id}' not found")
    return data_store.get_telemetry_for_zone(zone_id)

@router.post("/ingest", response_model=ESP32IngestResponse, summary="Secure Ingest for ESP32 Oceanographic Buoy Telemetry")
def ingest_esp32_telemetry(
    payload: ESP32TelemetryIngestPayload,
    x_orca_device_key: Optional[str] = Header(None, alias="X-ORCA-DEVICE-KEY")
):
    """
    Secure ingestion endpoint for physical ESP32 oceanographic buoys.
    Requires pre-shared X-ORCA-DEVICE-KEY header.
    Rejects unauthorized telemetry with HTTP 401 Unauthorized.
    """
    if not iot_telemetry_service.validate_device_key(x_orca_device_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Invalid or missing X-ORCA-DEVICE-KEY header."
        )
    return iot_telemetry_service.ingest_esp32_telemetry(payload)

@router.get("/device/status", response_model=IoTDeviceStatusResponse, summary="Get In-Situ IoT Hardware Connection Status")
def get_iot_device_status():
    """
    Check if physical in-situ ESP32 buoys are actively connected and transmitting.
    Returns NOT CONNECTED if no physical devices have reported.
    """
    return iot_telemetry_service.get_device_status()

@router.get("/buoys", response_model=List[IoTBuoyItem], summary="Get In-Situ Buoy Network with Explicit Data Modes")
def get_buoy_stations():
    """
    Returns list of in-situ oceanographic buoys, distinguishing LIVE hardware from SIMULATED baseline models.
    """
    return iot_telemetry_service.get_buoy_list()

