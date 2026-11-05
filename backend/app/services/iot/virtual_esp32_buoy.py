import math
import random
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta

from app.core.config import settings
from app.schemas.iot import (
    VirtualESP32Telemetry,
    IoTSensorReading,
    VirtualESP32DeviceDetail,
    IoTScenarioType,
    IoTHistoryResponse
)
from app.services.iot.base_adapter import BaseIoTAdapter
from app.services.iot.iot_anomaly_engine import iot_anomaly_engine, IoTAnomalyEvent

logger = logging.getLogger(__name__)


class VirtualESP32Buoy(BaseIoTAdapter):
    """
    Virtual ESP32 Marine Monitoring Buoy Simulator.
    Implements a realistic oceanographic floating surface mooring:
    - Simulates 7 core oceanographic and hardware parameters.
    - Manages three operator-controllable scenarios: NORMAL, ANOMALY, OFFLINE.
    - Maintains chronological time-series history ring-buffer.
    - Strictly preserves data_mode='SIMULATED' and is_simulated=True.
    """

    def __init__(
        self,
        device_id: Optional[str] = None,
        seed: int = 42
    ):
        self._device_id = device_id or getattr(settings, "IOT_DEVICE_ID", "ORCA-BUOY-001")
        self._device_name = "ORCA Virtual ESP32 Reef Mooring"
        self._latitude = -16.8205
        self._longitude = 146.2150
        self._deployment_location = "Great Barrier Reef Marine Park (Ribbon Reefs Sector)"
        
        # State management
        self._scenario: IoTScenarioType = getattr(settings, "IOT_DEFAULT_SCENARIO", "normal")  # type: ignore
        self._is_generating: bool = getattr(settings, "IOT_SIMULATION_ENABLED", True)
        self._packet_seq: int = 1
        self._rng = random.Random(seed)
        self._time_step: float = 0.0
        
        # History & Caching
        self._history: List[VirtualESP32Telemetry] = []
        self._last_telemetry: Optional[VirtualESP32Telemetry] = None
        self._last_seen_timestamp: Optional[str] = None
        
        # Initialize initial history with baseline points
        self._bootstrap_initial_history()

    @property
    def device_id(self) -> str:
        return self._device_id

    @property
    def is_physical_device(self) -> bool:
        return False

    @property
    def scenario(self) -> IoTScenarioType:
        return self._scenario

    @property
    def is_generating(self) -> bool:
        return self._is_generating

    def set_scenario(self, scenario: IoTScenarioType, reason: Optional[str] = None) -> Dict[str, Any]:
        """
        Operator-controlled switch between demonstration scenarios:
        - normal: Standard healthy reef baseline
        - anomaly: Deliberately induced multi-parameter stress anomaly
        - offline: Station disconnect simulation
        """
        prev = self._scenario
        self._scenario = scenario
        
        if scenario == "offline":
            self._is_generating = False
            logger.info(f"Virtual Buoy {self._device_id} entered OFFLINE scenario. Telemetry generation paused.")
        else:
            self._is_generating = True
            logger.info(f"Virtual Buoy {self._device_id} switched from {prev} to {scenario} scenario.")

        # If transitioning from offline back to normal or anomaly, produce a fresh packet
        if prev == "offline" and scenario != "offline":
            self.generate_telemetry()

        return {
            "previous_scenario": prev,
            "new_scenario": scenario,
            "device_id": self._device_id,
            "reason": reason
        }

    def start_simulation(self) -> bool:
        """Start or resume telemetry packet generation."""
        if self._scenario == "offline":
            self._scenario = "normal"
        self._is_generating = True
        self.generate_telemetry()
        return True

    def stop_simulation(self) -> bool:
        """Pause telemetry packet generation."""
        self._is_generating = False
        return True

    def generate_telemetry(self, forced_dt: Optional[datetime] = None) -> Optional[VirtualESP32Telemetry]:
        """
        Generate a single telemetry packet adhering to current scenario parameters.
        Returns the new packet, or the frozen last packet if offline.
        """
        if not self._is_generating or self._scenario == "offline":
            # OFFLINE: Return existing frozen telemetry without advancing sequence or timestamp
            return self._last_telemetry

        now_dt = forced_dt or datetime.now(timezone.utc)
        now_ts = now_dt.isoformat()
        self._time_step += 0.1
        t = self._time_step

        # Smooth sine-wave tidal/diurnal baseline oscillations
        diurnal_sine = math.sin(t * 0.5)
        tidal_cosine = math.cos(t * 0.8)

        # ----------------------------------------------------------------------
        # SCENARIO PARAMETER ENGINES
        # ----------------------------------------------------------------------
        if self._scenario == "normal":
            # Baseline Healthy Marine Biome Parameters
            water_temp = round(27.4 + 0.6 * diurnal_sine + self._rng.uniform(-0.15, 0.15), 2)
            ph = round(8.18 + 0.04 * tidal_cosine + self._rng.uniform(-0.02, 0.02), 2)
            turbidity = round(max(0.5, 1.4 + 0.3 * tidal_cosine + self._rng.uniform(-0.15, 0.2)), 2)
            dissolved_oxygen = round(7.2 + 0.3 * diurnal_sine + self._rng.uniform(-0.1, 0.1), 2)
            salinity = round(35.2 + 0.15 * tidal_cosine + self._rng.uniform(-0.05, 0.05), 2)
            battery = round(max(70.0, min(100.0, 94.5 + 2.0 * diurnal_sine + self._rng.uniform(-0.5, 0.5))), 1)
            signal_dbm = round(-72.0 + self._rng.uniform(-3.0, 3.0), 1)
            solar_watts = round(max(0.0, 18.5 + 8.0 * max(0.0, diurnal_sine) + self._rng.uniform(-1.0, 1.0)), 1)
            quality_flag = "SIMULATED_NORMAL"

        elif self._scenario == "anomaly":
            # Controlled Multi-Parameter Sensor Anomaly Demonstration:
            # - Turbidity Spike (Simulating coastal sediment plume or resuspension)
            # - Thermal Heatwave Surge (Simulating localized sea-surface heating)
            # - Hypoxic Sag (Simulating dissolved oxygen drop)
            # - Acidification Drop (Simulating localized pH depression)
            water_temp = round(32.8 + 0.8 * diurnal_sine + self._rng.uniform(-0.2, 0.3), 2)
            turbidity = round(28.5 + 5.0 * math.sin(t * 1.2) + self._rng.uniform(-2.0, 3.0), 2)
            dissolved_oxygen = round(max(1.8, 3.2 - 0.4 * diurnal_sine + self._rng.uniform(-0.15, 0.15)), 2)
            ph = round(7.34 + 0.05 * tidal_cosine + self._rng.uniform(-0.03, 0.03), 2)
            salinity = round(35.0 + 0.2 * tidal_cosine + self._rng.uniform(-0.1, 0.1), 2)
            battery = round(max(60.0, min(100.0, 88.0 + 1.5 * diurnal_sine + self._rng.uniform(-0.5, 0.5))), 1)
            signal_dbm = round(-75.0 + self._rng.uniform(-4.0, 4.0), 1)
            solar_watts = round(max(0.0, 16.0 + 7.0 * max(0.0, diurnal_sine) + self._rng.uniform(-1.0, 1.0)), 1)
            quality_flag = "SIMULATED_ANOMALY"

        else:
            # Fallback to normal
            water_temp = 27.5
            ph = 8.15
            turbidity = 1.2
            dissolved_oxygen = 7.0
            salinity = 35.0
            battery = 95.0
            signal_dbm = -70.0
            solar_watts = 20.0
            quality_flag = "SIMULATED_NORMAL"

        # Construct granular sensor objects
        sensors = {
            "water_temperature": IoTSensorReading(
                sensor_name="Water Temperature",
                sensor_type="Digital Thermometer (DS18B20)",
                value=water_temp,
                unit="°C",
                expected_range={"min": 22.0, "max": 31.5},
                status="ANOMALY" if water_temp > 31.5 else "NORMAL"
            ),
            "ph_level": IoTSensorReading(
                sensor_name="Seawater pH",
                sensor_type="Atlas Scientific Lab-Grade pH EZO",
                value=ph,
                unit="pH units",
                expected_range={"min": 7.6, "max": 8.5},
                status="ANOMALY" if (ph < 7.6 or ph > 8.5) else "NORMAL"
            ),
            "turbidity": IoTSensorReading(
                sensor_name="Optical Turbidity",
                sensor_type="Optical Infrared Nephelometer",
                value=turbidity,
                unit="NTU",
                expected_range={"min": 0.0, "max": 10.0},
                status="ANOMALY" if turbidity > 10.0 else "NORMAL"
            ),
            "dissolved_oxygen": IoTSensorReading(
                sensor_name="Dissolved Oxygen",
                sensor_type="Galvanic Dissolved Oxygen Sensor",
                value=dissolved_oxygen,
                unit="mg/L",
                expected_range={"min": 4.5, "max": 14.0},
                status="ANOMALY" if dissolved_oxygen < 4.5 else "NORMAL"
            ),
            "salinity": IoTSensorReading(
                sensor_name="Practical Salinity",
                sensor_type="Toroidal Induction Conductivity Cell",
                value=salinity,
                unit="PSU",
                expected_range={"min": 32.0, "max": 38.0},
                status="ANOMALY" if (salinity < 32.0 or salinity > 38.0) else "NORMAL"
            ),
            "battery_level": IoTSensorReading(
                sensor_name="Battery Level",
                sensor_type="TI INA219 Coulomb Counter & Voltage Meter",
                value=battery,
                unit="%",
                expected_range={"min": 20.0, "max": 100.0},
                status="ANOMALY" if battery < 20.0 else "NORMAL"
            ),
            "signal_strength": IoTSensorReading(
                sensor_name="Signal Strength",
                sensor_type="Semtech SX1262 LoRa RSSI Receiver",
                value=signal_dbm,
                unit="dBm",
                expected_range={"min": -95.0, "max": 0.0},
                status="ANOMALY" if signal_dbm < -95.0 else "NORMAL"
            )
        }

        battery_voltage = round(3.2 + (battery / 100.0) * 1.0, 2)

        telemetry = VirtualESP32Telemetry(
            device_id=self._device_id,
            device_name=self._device_name,
            timestamp=now_ts,
            latitude=self._latitude,
            longitude=self._longitude,
            deployment_location=self._deployment_location,
            water_temperature_c=water_temp,
            ph_level=ph,
            turbidity_ntu=turbidity,
            dissolved_oxygen_mg_l=dissolved_oxygen,
            salinity_psu=salinity,
            battery_percentage=battery,
            signal_strength_dbm=signal_dbm,
            battery_voltage_volts=battery_voltage,
            solar_yield_watts=solar_watts,
            packet_sequence_number=self._packet_seq,
            microcontroller="ESP32-WROOM-32 (Dual-Core 240MHz, 520KB SRAM)",
            firmware_version="v2.4.0-orca-virtual-esp32",
            data_mode="SIMULATED",
            is_simulated=True,
            simulation_scenario=self._scenario,
            quality_status=quality_flag,
            sensors=sensors
        )

        self._packet_seq += 1
        self._last_telemetry = telemetry
        self._last_seen_timestamp = now_ts

        # Append to history ring-buffer (max 100 entries)
        self._history.append(telemetry)
        if len(self._history) > 100:
            self._history.pop(0)

        return telemetry

    def get_latest_telemetry(self) -> Optional[VirtualESP32Telemetry]:
        """
        Fetch latest simulated telemetry packet.
        If generation is running, advances by producing current packet.
        """
        if self._is_generating and self._scenario != "offline":
            return self.generate_telemetry()
        return self._last_telemetry

    def get_history(self, limit: int = 50) -> IoTHistoryResponse:
        """Retrieve recent historical telemetry points."""
        subset = self._history[-limit:] if self._history else []
        return IoTHistoryResponse(
            device_id=self._device_id,
            data_mode="SIMULATED",
            is_simulated=True,
            total_records=len(subset),
            history=subset
        )

    def get_anomalies(self) -> List[IoTAnomalyEvent]:
        """Detect and return anomalies on the latest telemetry packet."""
        latest = self._last_telemetry
        if not latest:
            return []
        return iot_anomaly_engine.evaluate_telemetry(latest)

    def get_device_detail(self) -> VirtualESP32DeviceDetail:
        """Fetch comprehensive device hardware manifest and status."""
        anomalies = self.get_anomalies()
        status_label = "OFFLINE" if self._scenario == "offline" else ("DEGRADED" if anomalies else "ONLINE")
        return VirtualESP32DeviceDetail(
            device_id=self._device_id,
            device_name=self._device_name,
            device_type="ESP32 Marine Monitoring Buoy",
            device_mode="SIMULATED",
            connectivity="OFFLINE" if self._scenario == "offline" else "VIRTUAL",
            status=status_label,
            current_scenario=self._scenario,
            latitude=self._latitude,
            longitude=self._longitude,
            deployment_location=self._deployment_location,
            microcontroller="ESP32-WROOM-32 (Xtensa Dual-Core 32-bit LX6, 240MHz)",
            firmware_version="v2.4.0-orca-virtual-esp32",
            antenna_type="Helical Dipole 868MHz LoRaWAN + Multi-Band 4G LTE-M / NB-IoT",
            battery_capacity_mah=12000,
            solar_panel_spec="12V 25W Monocrystalline Photovoltaic Solar Panel (PV) with MPPT",
            sensors_installed=[
                "Water Temperature (Dallas DS18B20 Marine Digital Thermometer)",
                "pH Sensor (Atlas Scientific Lab-Grade pH EZO Transducer)",
                "Turbidity Sensor (DFRobot Industrial Optical Nephelometer)",
                "Dissolved Oxygen (Atlas Scientific Galvanic DO Probe)",
                "Salinity Sensor (Toroidal Induction Conductivity Cell)",
                "Battery Voltage & Coulomb Counter (TI INA219 Power Monitor)",
                "RF Communication Modem (Semtech SX1262 LoRa / Quectel BG95)"
            ],
            last_seen_timestamp=self._last_seen_timestamp,
            last_telemetry=self._last_telemetry,
            active_anomalies_count=len(anomalies),
            is_simulated=True,
            data_mode="SIMULATED"
        )

    def get_status(self) -> Any:
        """High-level summary of buoy simulation status."""
        from app.schemas.iot import IoTStatusResponse
        anomalies = self.get_anomalies()
        status_label = "OFFLINE" if self._scenario == "offline" else ("DEGRADED" if anomalies else "ONLINE")
        return IoTStatusResponse(
            device_id=self._device_id,
            device_name=self._device_name,
            device_status=status_label,
            data_mode="SIMULATED",
            is_simulated=True,
            scenario=self._scenario,
            last_seen_timestamp=self._last_seen_timestamp,
            connectivity_status="OFFLINE" if self._scenario == "offline" else "VIRTUAL",
            is_generating_telemetry=self._is_generating and self._scenario != "offline",
            telemetry_interval_seconds=int(getattr(settings, "IOT_UPDATE_INTERVAL_SECONDS", 5)),
            active_anomalies_count=len(anomalies),
            total_packets_generated=self._packet_seq - 1
        )

    def _bootstrap_initial_history(self, count: int = 20):
        """Seed initial chronological history for dashboard charting."""
        base_time = datetime.now(timezone.utc) - timedelta(minutes=count * 2)
        orig_scenario = self._scenario
        orig_gen = self._is_generating
        self._is_generating = True

        for i in range(count):
            point_dt = base_time + timedelta(minutes=i * 2)
            self.generate_telemetry(forced_dt=point_dt)

        self._scenario = orig_scenario
        self._is_generating = orig_gen


virtual_buoy = VirtualESP32Buoy()
