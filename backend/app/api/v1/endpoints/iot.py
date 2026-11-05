from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional, Dict, Any

from app.schemas.iot import (
    VirtualESP32Telemetry,
    VirtualESP32DeviceDetail,
    IoTStatusResponse,
    IoTAnomalyEvent,
    IoTScenarioChangeRequest,
    IoTScenarioChangeResponse,
    IoTHistoryResponse
)
from app.services.iot import iot_service

router = APIRouter()


@router.get(
    "/status",
    response_model=IoTStatusResponse,
    summary="Get Virtual ESP32 Buoy Simulation & Connectivity Status"
)
def get_iot_status():
    """
    Returns high-level status of the Virtual ESP32 Marine Buoy:
    - Device identifier and current status (ONLINE / OFFLINE / DEGRADED)
    - Active demonstration scenario (normal / anomaly / offline)
    - Strict data mode indicator ('SIMULATED')
    - Timestamp of last emitted packet
    - Active anomaly count
    """
    return iot_service.get_status()


@router.get(
    "/devices",
    response_model=List[Dict[str, Any]],
    summary="List Registered Virtual & In-Situ Marine Buoys"
)
def get_iot_devices():
    """
    Returns list of registered virtual and in-situ marine monitoring buoys.
    """
    return iot_service.get_devices()


@router.get(
    "/devices/{device_id}",
    response_model=VirtualESP32DeviceDetail,
    summary="Get Detailed Hardware Manifest & Telemetry for a Virtual Buoy"
)
def get_device_detail(device_id: str):
    """
    Returns detailed physical specifications, hardware component models,
    sensor calibration suite, and current telemetry state for a specific device.
    """
    detail = iot_service.get_device_detail(device_id)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Virtual IoT device '{device_id}' not found in registry."
        )
    return detail


@router.get(
    "/telemetry",
    response_model=VirtualESP32Telemetry,
    summary="Get Latest Virtual Buoy Sensor Telemetry"
)
def get_latest_telemetry(device_id: Optional[str] = Query(None, description="Optional target device ID filter")):
    """
    Fetch the latest verified simulated sensor readings:
    - Water Temperature (°C)
    - Seawater pH (pH units)
    - Optical Turbidity (NTU)
    - Dissolved Oxygen (mg/L)
    - Practical Salinity (PSU)
    - Battery Level (%) & Voltage (V)
    - Signal Strength RSSI (dBm)
    """
    telemetry = iot_service.get_latest_telemetry(device_id=device_id)
    if not telemetry:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No telemetry currently available from virtual buoy network."
        )
    return telemetry


@router.get(
    "/anomalies",
    response_model=List[IoTAnomalyEvent],
    summary="Get Active IoT Sensor Anomalies"
)
def get_iot_anomalies(device_id: Optional[str] = Query(None, description="Optional target device ID filter")):
    """
    Returns explainable rule-based sensor anomalies detected on the virtual buoy.
    Adheres strictly to scientific caveats: sensor anomalies do NOT prove oil contamination.
    """
    return iot_service.get_anomalies(device_id=device_id)


@router.post(
    "/scenario",
    response_model=IoTScenarioChangeResponse,
    summary="Switch Controllable Simulation Scenario"
)
def switch_simulation_scenario(request: IoTScenarioChangeRequest):
    """
    Operator control to switch demonstration scenarios:
    - **normal**: Stable healthy baseline monitoring (all parameters within standard marine envelopes)
    - **anomaly**: Deliberately induced multi-parameter anomaly (turbidity spike 28.5 NTU, thermal pulse 32.8°C, hypoxic sag 3.2 mg/L)
    - **offline**: Hardware disconnect simulation (station marked OFFLINE, packet generation paused)
    """
    try:
        return iot_service.set_scenario(request.scenario, reason=request.reason)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )


@router.post(
    "/simulation/start",
    summary="Start or Resume Virtual Buoy Telemetry Generation"
)
def start_simulation():
    """
    Start or resume synthetic telemetry generation for the virtual buoy.
    """
    return iot_service.start_simulation()


@router.post(
    "/simulation/stop",
    summary="Stop or Pause Virtual Buoy Telemetry Generation"
)
def stop_simulation():
    """
    Stop or pause synthetic telemetry generation for the virtual buoy.
    """
    return iot_service.stop_simulation()


@router.get(
    "/history",
    response_model=IoTHistoryResponse,
    summary="Get Chronological Telemetry History for Time-Series Charting"
)
def get_telemetry_history(
    device_id: Optional[str] = Query(None, description="Optional target device ID filter"),
    limit: int = Query(50, ge=1, le=100, description="Maximum chronological history records to retrieve")
):
    """
    Returns time-series historical telemetry points for dashboard visualization.
    """
    return iot_service.get_history(device_id=device_id, limit=limit)
