from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime

class ESP32TelemetryIngestPayload(BaseModel):
    """
    Validated hardware ingestion payload sent by in-situ ESP32 oceanographic buoys.
    """
    device_id: str
    hardware_mac: Optional[str] = None
    firmware_version: Optional[str] = "v1.0.0-esp32-orca"
    zone_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    water_temperature_c: float = Field(..., ge=-2.0, le=45.0)
    dissolved_oxygen_mg_l: float = Field(..., ge=0.0, le=20.0)
    ph_level: float = Field(..., ge=5.0, le=10.0)
    salinity_psu: float = Field(..., ge=0.0, le=50.0)
    turbidity_ntu: float = Field(..., ge=0.0, le=100.0)
    battery_percentage: Optional[float] = Field(100.0, ge=0.0, le=100.0)
    solar_charge_watts: Optional[float] = Field(0.0, ge=0.0)
    timestamp: Optional[datetime] = None

class ESP32IngestResponse(BaseModel):
    status: Literal["INGESTED", "REJECTED", "UNAUTHORIZED"]
    device_id: str
    record_id: str
    message: str
    received_at: datetime

class IoTDeviceStatusResponse(BaseModel):
    hardware_connection_status: Literal["LIVE", "NOT CONNECTED"]
    active_hardware_devices_count: int
    registered_devices: List[Dict[str, Any]] = Field(default_factory=list)
    last_hardware_heartbeat: Optional[datetime] = None
    telemetry_source: Literal["REAL_HARDWARE_INGESTION", "SIMULATED_BASELINE_MODEL"]
    data_mode: Literal["LIVE", "SIMULATED", "NOT CONNECTED"]
    instructions: str

class IoTBuoyItem(BaseModel):
    buoy_id: str
    station_name: str
    deployment_program: str
    latitude: float
    longitude: float
    battery_pct: float
    solar_yield_watts: float
    sea_surface_temp_c: float
    wave_height_meters: float
    wave_period_sec: float
    wind_speed_knots: float
    status: Literal["LIVE", "SIMULATED", "OFFLINE", "NOT CONNECTED"]
    data_mode: Literal["LIVE", "SIMULATED", "NOT CONNECTED"]
    last_transmission: Optional[str] = None
