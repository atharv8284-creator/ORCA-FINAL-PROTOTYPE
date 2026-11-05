import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from app.schemas.iot import (
    VirtualESP32Telemetry,
    VirtualESP32DeviceDetail,
    IoTStatusResponse,
    IoTAnomalyEvent,
    IoTScenarioChangeResponse,
    IoTHistoryResponse,
    IoTScenarioType
)
from app.services.iot.virtual_esp32_buoy import virtual_buoy
from app.services.iot.iot_anomaly_engine import iot_anomaly_engine

logger = logging.getLogger(__name__)


class IoTService:
    """
    Unified In-Situ IoT Intelligence & Virtual ESP32 Buoy Service Facade.
    Orchestrates virtual ocean buoy state, deterministic sensor simulations,
    and physics-informed anomaly evaluations.
    """

    def __init__(self):
        self.buoy = virtual_buoy
        self.anomaly_engine = iot_anomaly_engine

    def get_status(self) -> IoTStatusResponse:
        """Fetch current Virtual Buoy network and simulation state."""
        return self.buoy.get_status()

    def get_devices(self) -> List[Dict[str, Any]]:
        """List registered in-situ virtual and physical devices."""
        detail = self.buoy.get_device_detail()
        return [
            {
                "device_id": detail.device_id,
                "device_name": detail.device_name,
                "device_type": detail.device_type,
                "device_mode": detail.device_mode,
                "connectivity": detail.connectivity,
                "status": detail.status,
                "current_scenario": detail.current_scenario,
                "latitude": detail.latitude,
                "longitude": detail.longitude,
                "deployment_location": detail.deployment_location,
                "active_anomalies_count": detail.active_anomalies_count,
                "last_seen_timestamp": detail.last_seen_timestamp,
                "is_simulated": True,
                "data_mode": "SIMULATED"
            }
        ]

    def get_device_detail(self, device_id: str) -> Optional[VirtualESP32DeviceDetail]:
        """Fetch full hardware manifest and sensor specifications for a given device."""
        if device_id == self.buoy.device_id or device_id in ("ORCA-BUOY-001", "virtual-01", "buoy-01"):
            return self.buoy.get_device_detail()
        return None

    def get_latest_telemetry(self, device_id: Optional[str] = None) -> Optional[VirtualESP32Telemetry]:
        """Fetch latest verified simulated sensor readings."""
        return self.buoy.get_latest_telemetry()

    def get_anomalies(self, device_id: Optional[str] = None) -> List[IoTAnomalyEvent]:
        """Fetch active sensor anomalies detected on the virtual buoy."""
        return self.buoy.get_anomalies()

    def set_scenario(self, scenario: str, reason: Optional[str] = None) -> IoTScenarioChangeResponse:
        """
        Switch operational demonstration scenario:
        - normal: Standard healthy baseline
        - anomaly: Induced turbidity spike, heatwave pulse, and hypoxic sag
        - offline: Disconnected station simulation
        """
        valid_scenarios = ("normal", "anomaly", "offline")
        cleaned = scenario.strip().lower()
        if cleaned not in valid_scenarios:
            raise ValueError(f"Invalid scenario '{scenario}'. Accepted scenarios: {list(valid_scenarios)}")

        res = self.buoy.set_scenario(cleaned, reason=reason)  # type: ignore
        
        scenario_explanations = {
            "normal": "Restored baseline healthy reef monitoring. All parameters within standard envelopes.",
            "anomaly": "Deliberately induced multi-parameter demonstration anomaly: elevated turbidity (28.5 NTU), thermal spike (32.8°C), and hypoxic sag (3.2 mg/L).",
            "offline": "Simulated hardware communication disconnect. Station marked OFFLINE; telemetry generation paused."
        }

        return IoTScenarioChangeResponse(
            success=True,
            previous_scenario=res["previous_scenario"],
            new_scenario=cleaned,
            device_id=self.buoy.device_id,
            message=scenario_explanations[cleaned],
            timestamp=datetime.now(timezone.utc).isoformat()
        )

    def start_simulation(self) -> Dict[str, Any]:
        """Start or resume virtual buoy telemetry generation."""
        self.buoy.start_simulation()
        return {
            "status": "RUNNING",
            "is_generating_telemetry": True,
            "device_id": self.buoy.device_id,
            "scenario": self.buoy.scenario,
            "message": "Virtual ESP32 buoy telemetry generation started."
        }

    def stop_simulation(self) -> Dict[str, Any]:
        """Stop or pause virtual buoy telemetry generation."""
        self.buoy.stop_simulation()
        return {
            "status": "STOPPED",
            "is_generating_telemetry": False,
            "device_id": self.buoy.device_id,
            "scenario": self.buoy.scenario,
            "message": "Virtual ESP32 buoy telemetry generation stopped."
        }

    def get_history(self, device_id: Optional[str] = None, limit: int = 50) -> IoTHistoryResponse:
        """Retrieve recent historical telemetry points for charting."""
        return self.buoy.get_history(limit=limit)


iot_service = IoTService()
