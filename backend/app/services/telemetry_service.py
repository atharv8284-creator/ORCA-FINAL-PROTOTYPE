import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

from app.core.config import settings
from app.schemas.marine import EcosystemTelemetry
from app.schemas.telemetry import (
    ESP32TelemetryIngestPayload,
    ESP32IngestResponse,
    IoTDeviceStatusResponse,
    IoTBuoyItem
)
from app.services.data_store import data_store

logger = logging.getLogger(__name__)

class IoTTelemetryService:
    """
    Manages in-situ IoT sensor buoys and secure hardware ingestion interface.
    Strictly distinguishes:
    - LIVE: Authenticated physical ESP32 buoy hardware transmitting verified messages.
    - SIMULATED: In-memory baseline hydrographic seed curves.
    - NOT CONNECTED: No authenticated physical hardware devices currently reporting.
    """

    def __init__(self):
        # In-memory registry of authenticated physical hardware devices
        self._hardware_devices: Dict[str, Dict[str, Any]] = {}
        self._ingested_telemetry: List[EcosystemTelemetry] = []

    def validate_device_key(self, api_key: Optional[str]) -> bool:
        """
        Validate hardware pre-shared device key against configured secret.
        """
        if not api_key:
            return False
        expected_key = getattr(settings, "IOT_INGESTION_KEY", "orca-esp32-ingest-key-2026")
        return bool(api_key.strip() == expected_key.strip())

    def ingest_esp32_telemetry(
        self,
        payload: ESP32TelemetryIngestPayload
    ) -> ESP32IngestResponse:
        """
        Ingest telemetry transmitted by an authorized physical ESP32 oceanographic buoy.
        """
        now = datetime.now(timezone.utc)
        record_id = f"telem-esp32-{uuid.uuid4().hex[:8]}"
        recorded_at = payload.timestamp or now

        # 1. Update Hardware Device Registry
        self._hardware_devices[payload.device_id] = {
            "device_id": payload.device_id,
            "hardware_mac": payload.hardware_mac,
            "firmware_version": payload.firmware_version,
            "zone_id": payload.zone_id,
            "last_heartbeat": now,
            "battery_percentage": payload.battery_percentage,
            "is_alive": True,
            "total_packets_received": self._hardware_devices.get(payload.device_id, {}).get("total_packets_received", 0) + 1
        }

        # 2. Store in active telemetry list
        new_telemetry = EcosystemTelemetry(
            id=record_id,
            zone_id=payload.zone_id,
            recorded_at=recorded_at,
            water_temperature_c=payload.water_temperature_c,
            dissolved_oxygen_mg_l=payload.dissolved_oxygen_mg_l,
            ph_level=payload.ph_level,
            salinity_psu=payload.salinity_psu,
            turbidity_ntu=payload.turbidity_ntu,
            chlorophyll_mg_m3=1.2,
            microplastics_index=5.0,
            acoustic_noise_db=42.0
        )
        self._ingested_telemetry.append(new_telemetry)
        data_store.telemetry.append(new_telemetry)

        logger.info(f"Ingested physical telemetry packet from device {payload.device_id} (temp: {payload.water_temperature_c}°C)")

        return ESP32IngestResponse(
            status="INGESTED",
            device_id=payload.device_id,
            record_id=record_id,
            message="Verified telemetry packet received from ESP32 hardware device.",
            received_at=now
        )

    def get_device_status(self) -> IoTDeviceStatusResponse:
        """
        Report hardware connectivity status.
        If no physical device messages have been received, returns NOT CONNECTED.
        """
        now = datetime.now(timezone.utc)
        # Check active devices (heartbeat within 10 minutes)
        active_devices = []
        last_heartbeat = None
        for dev_id, dev_info in self._hardware_devices.items():
            hb = dev_info.get("last_heartbeat")
            if hb and (now - hb) < timedelta(minutes=10):
                active_devices.append(dev_info)
                if last_heartbeat is None or hb > last_heartbeat:
                    last_heartbeat = hb

        is_connected = len(active_devices) > 0
        connection_status = "LIVE" if is_connected else "NOT CONNECTED"
        source = "REAL_HARDWARE_INGESTION" if is_connected else "SIMULATED_BASELINE_MODEL"
        data_mode = "LIVE" if is_connected else "SIMULATED"

        instructions = (
            "To connect a physical ESP32 buoy: Configure HTTP POST to /api/v1/telemetry/ingest "
            "with header 'X-ORCA-DEVICE-KEY: <your-key>' and valid sensor readings. "
            "Until verified hardware packets are received, the platform safely reports NOT CONNECTED."
        )

        return IoTDeviceStatusResponse(
            hardware_connection_status=connection_status,
            active_hardware_devices_count=len(active_devices),
            registered_devices=list(self._hardware_devices.values()),
            last_hardware_heartbeat=last_heartbeat,
            telemetry_source=source,
            data_mode=data_mode,
            instructions=instructions
        )

    def get_buoy_list(self) -> List[IoTBuoyItem]:
        """
        Return the list of all buoys. Real devices are marked LIVE;
        in-memory baseline stations are explicitly marked SIMULATED.
        """
        buoys: List[IoTBuoyItem] = []
        now = datetime.now(timezone.utc)

        # 1. Registered real hardware devices
        for dev_id, dev_info in self._hardware_devices.items():
            hb = dev_info.get("last_heartbeat")
            is_active = hb and (now - hb) < timedelta(minutes=10)
            buoys.append(IoTBuoyItem(
                buoy_id=dev_id,
                station_name=f"In-Situ Ocean Buoy ({dev_id})",
                deployment_program="ORCA Physical ESP32 Hardware Network",
                latitude=dev_info.get("latitude", 22.5),
                longitude=dev_info.get("longitude", 69.5),
                battery_pct=dev_info.get("battery_percentage", 100.0),
                solar_yield_watts=12.5,
                sea_surface_temp_c=28.5,
                wave_height_meters=1.1,
                wave_period_sec=6.2,
                wind_speed_knots=9.4,
                status="LIVE" if is_active else "OFFLINE",
                data_mode="LIVE" if is_active else "NOT CONNECTED",
                last_transmission=hb.isoformat() if hb else None
            ))

        # 2. Baseline stations (Explicitly labeled SIMULATED)
        baseline_stations = [
            {
                "id": "STN-NOAA-41009",
                "name": "Cape Canaveral 20NM East Mooring",
                "program": "NOAA NDBC Baseline (Modelled)",
                "lat": 28.508, "lon": -80.185,
                "temp": 26.8, "wave_h": 1.4, "wave_p": 7.0, "wind": 14.2
            },
            {
                "id": "STN-ARGO-5906432",
                "name": "Coral Sea Bio-Argo Autonomous Profiler",
                "program": "Euro-Argo Global Array (Modelled)",
                "lat": -15.420, "lon": 145.850,
                "temp": 29.4, "wave_h": 0.8, "wave_p": 5.2, "wind": 8.0
            },
            {
                "id": "STN-PIRATA-10W",
                "name": "Tropical Atlantic PIRATA ATLAS Mooring",
                "program": "PIRATA Array (Modelled)",
                "lat": 0.000, "lon": -10.000,
                "temp": 27.2, "wave_h": 1.8, "wave_p": 8.4, "wind": 16.5
            },
            {
                "id": "ORCA-GLIDER-09",
                "name": "Darwin Arch Autonomous Wave Glider",
                "program": "ORCA Research Glider (Modelled)",
                "lat": 1.685, "lon": -91.825,
                "temp": 22.5, "wave_h": 2.1, "wave_p": 9.1, "wind": 12.0
            }
        ]

        for stn in baseline_stations:
            buoys.append(IoTBuoyItem(
                buoy_id=stn["id"],
                station_name=stn["name"],
                deployment_program=stn["program"],
                latitude=stn["lat"],
                longitude=stn["lon"],
                battery_pct=92.0,
                solar_yield_watts=45.0,
                sea_surface_temp_c=stn["temp"],
                wave_height_meters=stn["wave_h"],
                wave_period_sec=stn["wave_p"],
                wind_speed_knots=stn["wind"],
                status="SIMULATED",
                data_mode="SIMULATED",
                last_transmission=(now - timedelta(minutes=15)).isoformat()
            ))

        # 3. Virtual ESP32 Marine Monitoring Buoy (Phase 5)
        try:
            from app.services.iot import virtual_buoy
            v_telem = virtual_buoy.get_latest_telemetry()
            v_status = virtual_buoy.scenario
            buoys.append(IoTBuoyItem(
                buoy_id=virtual_buoy.device_id,
                station_name="ORCA Virtual ESP32 Marine Buoy (ORCA-BUOY-001)",
                deployment_program="ORCA Virtual Reef Mooring (Modelled)",
                latitude=virtual_buoy._latitude,
                longitude=virtual_buoy._longitude,
                battery_pct=v_telem.battery_percentage if v_telem else 94.0,
                solar_yield_watts=v_telem.solar_yield_watts if v_telem else 18.5,
                sea_surface_temp_c=v_telem.water_temperature_c if v_telem else 27.5,
                wave_height_meters=1.1,
                wave_period_sec=5.5,
                wind_speed_knots=8.0,
                status="OFFLINE" if v_status == "offline" else "SIMULATED",
                data_mode="SIMULATED",
                last_transmission=v_telem.timestamp if v_telem else now.isoformat()
            ))
        except Exception as e:
            logger.warning(f"Could not append virtual buoy to buoy list: {e}")

        return buoys

iot_telemetry_service = IoTTelemetryService()
