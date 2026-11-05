from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, model_validator
from datetime import datetime, timezone

IoTScenarioType = Literal["normal", "anomaly", "offline"]
IoTSeverityType = Literal["LOW", "MODERATE", "ELEVATED", "CRITICAL"]

class IoTSensorReading(BaseModel):
    """
    Standardized individual sensor measurement from Virtual ESP32 Buoy.
    """
    sensor_name: str = Field(..., description="Standardized sensor identifier")
    sensor_type: str = Field(..., description="Physical sensor transducer type")
    value: float = Field(..., description="Observed measurement value")
    unit: str = Field(..., description="Physical measurement unit")
    expected_range: Dict[str, float] = Field(..., description="Normal operational bounds: min, max")
    status: Literal["NORMAL", "WARNING", "ANOMALY"] = Field("NORMAL", description="Threshold evaluation")
    data_mode: Literal["SIMULATED", "LIVE", "NOT_CONNECTED"] = "SIMULATED"
    is_simulated: bool = True
    quality_status: str = "SIMULATED_PHYSICAL_VALIDATED"

    @model_validator(mode="after")
    def enforce_simulated_flags(self) -> "IoTSensorReading":
        if self.is_simulated:
            self.data_mode = "SIMULATED"
        return self


class VirtualESP32Telemetry(BaseModel):
    """
    Full telemetry packet produced by the Virtual ESP32 Marine Monitoring Buoy.
    Preserves all 7 required core measurements, hardware indicators, and provenance.
    """
    device_id: str = Field("ORCA-BUOY-001", description="Unique virtual buoy identifier")
    device_name: str = Field("ORCA Virtual ESP32 Reef Mooring", description="Human-readable station label")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat(), description="Observation UTC timestamp")
    latitude: float = Field(-16.8205, ge=-90.0, le=90.0, description="Station WGS84 latitude")
    longitude: float = Field(146.2150, ge=-180.0, le=180.0, description="Station WGS84 longitude")
    deployment_location: str = Field("Great Barrier Reef (Ribbon Reefs Sector)", description="Mooring location description")
    
    # Core Sensor Suite
    water_temperature_c: float = Field(..., description="Sea surface water temperature in °C")
    ph_level: float = Field(..., description="Water hydrogen ion potential in pH units")
    turbidity_ntu: float = Field(..., description="Nephelometric Turbidity Units (optical backscatter)")
    dissolved_oxygen_mg_l: float = Field(..., description="Dissolved Oxygen concentration in mg/L")
    salinity_psu: float = Field(..., description="Practical Salinity Units (conductivity-derived)")
    battery_percentage: float = Field(..., ge=0.0, le=100.0, description="Battery charge level in %")
    signal_strength_dbm: float = Field(..., ge=-140.0, le=0.0, description="LoRa/Cellular RSSI signal strength in dBm")

    # Auxiliary Hardware Telemetry
    battery_voltage_volts: float = Field(4.12, description="LiFePO4 battery terminal voltage")
    solar_yield_watts: float = Field(18.5, ge=0.0, description="Photovoltaic solar generation yield in Watts")
    packet_sequence_number: int = Field(1, ge=1, description="Monotonically increasing transmission packet counter")
    microcontroller: str = Field("ESP32-WROOM-32 (Dual-Core 240MHz)", description="Simulated MCU hardware spec")
    firmware_version: str = Field("v2.4.0-orca-virtual-esp32", description="Embedded firmware revision")
    
    # Data Mode & Integrity Enforcements
    data_mode: Literal["SIMULATED", "LIVE", "NOT_CONNECTED"] = Field("SIMULATED", description="Data integrity tier")
    is_simulated: bool = Field(True, description="Strict boolean indicating simulated demonstration data")
    simulation_scenario: IoTScenarioType = Field("normal", description="Active simulation scenario: normal | anomaly | offline")
    quality_status: str = Field("SIMULATED_NORMAL", description="Quality flag: SIMULATED_NORMAL | SIMULATED_ANOMALY | STALE")
    
    # Granular Sensor Breakdown
    sensors: Dict[str, IoTSensorReading] = Field(default_factory=dict, description="Dictionary of individual sensor objects")

    @model_validator(mode="after")
    def enforce_anti_fabrication(self) -> "VirtualESP32Telemetry":
        if self.is_simulated:
            self.data_mode = "SIMULATED"
        return self


class IoTAnomalyEvent(BaseModel):
    """
    Explainable rule-based anomaly detection record for virtual buoy telemetry.
    Adheres strictly to scientific and maritime caveats.
    """
    anomaly_id: str = Field(..., description="Unique anomaly record identifier")
    device_id: str = Field("ORCA-BUOY-001", description="Originating virtual device ID")
    sensor_name: str = Field(..., description="Sensor exhibiting anomalous behavior")
    observed_value: float = Field(..., description="Empirical measured value")
    expected_range: Dict[str, float] = Field(..., description="Configured normal threshold limits: min, max")
    unit: str = Field(..., description="Physical measurement unit")
    severity: IoTSeverityType = Field("MODERATE", description="Operational severity tier")
    timestamp: str = Field(..., description="Detection UTC ISO timestamp")
    detection_rule: str = Field(..., description="Explainable deterministic rule violated")
    explanation: str = Field(..., description="Clear scientific reasoning explaining the indicator")
    confidence: float = Field(0.92, ge=0.0, le=1.0, description="Algorithmic confidence (0.0 - 1.0)")
    uncertainty: float = Field(0.08, ge=0.0, le=1.0, description="Measurement uncertainty (0.0 - 1.0)")
    data_mode: Literal["SIMULATED", "LIVE", "NOT_CONNECTED"] = "SIMULATED"
    is_simulated: bool = True
    compliance_disclaimer: str = Field(
        "Scientific Integrity Notice: This anomaly is generated in SIMULATED demonstration mode. "
        "Elevated turbidity, thermal shifts, or low dissolved oxygen represent synthetic scenario indicators "
        "and must NEVER be asserted as proof of an actual marine pollution incident, oil spill, or chemical discharge.",
        description="Mandatory scientific disclaimer"
    )

    @model_validator(mode="after")
    def enforce_simulated_anomaly(self) -> "IoTAnomalyEvent":
        if self.is_simulated:
            self.data_mode = "SIMULATED"
        return self


class VirtualESP32DeviceDetail(BaseModel):
    """
    Comprehensive physical specification and telemetry state of a virtual marine buoy.
    """
    device_id: str = "ORCA-BUOY-001"
    device_name: str = "ORCA Virtual ESP32 Reef Mooring"
    device_type: str = "ESP32 Marine Monitoring Buoy"
    device_mode: Literal["SIMULATED", "LIVE", "NOT_CONNECTED"] = "SIMULATED"
    connectivity: Literal["VIRTUAL", "SIMULATED_ONLINE", "OFFLINE"] = "VIRTUAL"
    status: Literal["ONLINE", "OFFLINE", "DEGRADED"] = "ONLINE"
    current_scenario: IoTScenarioType = "normal"
    latitude: float = -16.8205
    longitude: float = 146.2150
    deployment_location: str = "Great Barrier Reef Marine Park (Ribbon Reefs Sector)"
    microcontroller: str = "ESP32-WROOM-32 (Xtensa Dual-Core 32-bit LX6, 240MHz)"
    firmware_version: str = "v2.4.0-orca-virtual-esp32"
    antenna_type: str = "Helical Dipole 868MHz LoRaWAN + Multi-Band 4G LTE-M / NB-IoT"
    battery_capacity_mah: int = 12000
    solar_panel_spec: str = "12V 25W Monocrystalline Photovoltaic Solar Panel (PV) with MPPT"
    sensors_installed: List[str] = Field(
        default_factory=lambda: [
            "Water Temperature (Dallas DS18B20 Marine Digital Thermometer)",
            "pH Sensor (Atlas Scientific Lab-Grade pH EZO Transducer)",
            "Turbidity Sensor (DFRobot Industrial Optical Nephelometer)",
            "Dissolved Oxygen (Atlas Scientific Galvanic DO Probe)",
            "Salinity Sensor (Toroidal Induction Conductivity Cell)",
            "Battery Voltage & Coulomb Counter (TI INA219 Power Monitor)",
            "RF Communication Modem (Semtech SX1262 LoRa / Quectel BG95)"
        ]
    )
    last_seen_timestamp: Optional[str] = None
    last_telemetry: Optional[VirtualESP32Telemetry] = None
    active_anomalies_count: int = 0
    is_simulated: bool = True
    data_mode: str = "SIMULATED"


class IoTStatusResponse(BaseModel):
    """
    High-level operational summary of the virtual buoy network.
    """
    device_id: str = "ORCA-BUOY-001"
    device_name: str = "ORCA Virtual ESP32 Reef Mooring"
    device_status: Literal["ONLINE", "OFFLINE", "DEGRADED"] = "ONLINE"
    data_mode: Literal["SIMULATED", "LIVE", "NOT_CONNECTED"] = "SIMULATED"
    is_simulated: bool = True
    scenario: IoTScenarioType = "normal"
    last_seen_timestamp: Optional[str] = None
    connectivity_status: Literal["VIRTUAL", "SIMULATED_ONLINE", "OFFLINE"] = "VIRTUAL"
    is_generating_telemetry: bool = True
    telemetry_interval_seconds: int = 5
    active_anomalies_count: int = 0
    total_packets_generated: int = 0
    instructions: str = (
        "Operating Virtual ESP32 Marine Monitoring Buoy. Switch controllable scenarios using "
        "POST /api/v1/iot/scenario with 'normal', 'anomaly', or 'offline'. "
        "All generated readings are explicitly marked SIMULATED."
    )


class IoTScenarioChangeRequest(BaseModel):
    scenario: IoTScenarioType = Field(..., description="Target simulation scenario: normal | anomaly | offline")
    reason: Optional[str] = Field(None, description="Optional operator reason for triggering scenario change")


class IoTScenarioChangeResponse(BaseModel):
    success: bool
    previous_scenario: str
    new_scenario: str
    device_id: str
    message: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class IoTHistoryResponse(BaseModel):
    device_id: str
    data_mode: str = "SIMULATED"
    is_simulated: bool = True
    total_records: int
    history: List[VirtualESP32Telemetry]
    query_timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
