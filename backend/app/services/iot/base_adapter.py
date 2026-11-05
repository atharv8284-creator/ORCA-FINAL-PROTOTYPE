from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from app.schemas.iot import (
    VirtualESP32Telemetry,
    VirtualESP32DeviceDetail,
    IoTStatusResponse,
    IoTAnomalyEvent,
    IoTHistoryResponse
)

class BaseIoTAdapter(ABC):
    """
    Abstract IoT Provider Architecture defining standardized interface
    for in-situ marine monitoring devices.
    
    Supports:
    - Virtual Simulated Buoy Adapter (Phase 5 Hackathon Implementation)
    - Future Physical ESP32 Hardware Adapter (MQTT / REST Ingestion)
    """

    @property
    @abstractmethod
    def device_id(self) -> str:
        """Unique hardware or virtual station identifier."""
        pass

    @property
    @abstractmethod
    def is_physical_device(self) -> bool:
        """True if backed by authenticated physical hardware."""
        pass

    @abstractmethod
    def get_status(self) -> IoTStatusResponse:
        """Return high-level device and simulation connectivity state."""
        pass

    @abstractmethod
    def get_latest_telemetry(self) -> Optional[VirtualESP32Telemetry]:
        """Fetch latest verified or simulated telemetry packet."""
        pass

    @abstractmethod
    def get_device_detail(self) -> VirtualESP32DeviceDetail:
        """Fetch full hardware specification and sensor manifest."""
        pass

    @abstractmethod
    def get_history(self, limit: int = 50) -> IoTHistoryResponse:
        """Fetch historical time-series telemetry records."""
        pass

    @abstractmethod
    def get_anomalies(self) -> List[IoTAnomalyEvent]:
        """Fetch active sensor anomalies detected on this device."""
        pass


class PhysicalESP32ArchitectureSpec:
    """
    Specification Blueprint for Future Physical ESP32 In-Situ Buoy Deployment.
    
    Documents the hardware and cryptographic contracts required when
    connecting physical field hardware in post-hackathon ocean deployments:
    
    1. Transport Protocols:
       - Primary: MQTT over TLS 1.3 (Port 8883) with Client X.509 Certificate
       - Fallback: HTTPS REST POST to /api/v1/telemetry/ingest
       - Satellite Fallback: Iridium Short Burst Data (SBD) / Swarm Space L-Band
       
    2. Authentication & Integrity:
       - Hardware Cryptographic Element: Microchip ATECC608A Secure Element
       - Pre-shared Header Token: X-ORCA-DEVICE-KEY with HMAC-SHA256 Signature
       - Replay Attack Mitigation: Monotonic 32-bit hardware packet counter
       
    3. Hardware Watchdog & Power Management:
       - MCU: ESP32-WROOM-32E (Deep sleep duty cycle: 55s sleep, 5s wake/transmit)
       - Power Subsystem: 18650 LiFePO4 4S2P Battery Pack (12.8V 6.4Ah) + 25W Solar MPPT
       - Sensor Bus: Isolated I2C / RS-485 Modbus via optocoupled galvanic isolators
       
    4. Quality & Calibration Metadata:
       - Calibration Coefficients: Linear slope (m) and intercept (b) stored in EEPROM
       - Zero-Point Drift Compensation: Monthly calibration offset vector
    """
    PROTOCOL_VERSION = "ORCA-IOT-PHYS-2.0"
    SUPPORTED_TRANSPORTS = ["MQTT_TLS_8883", "HTTPS_REST_POST", "IRIDIUM_SBD"]
    REQUIRED_AUTH_HEADERS = ["X-ORCA-DEVICE-KEY", "X-ORCA-SIGNATURE", "X-ORCA-TIMESTAMP"]
