import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.schemas.iot import (
    VirtualESP32Telemetry,
    IoTAnomalyEvent,
    IoTSeverityType
)

logger = logging.getLogger(__name__)

# Default Configurable Operational Thresholds for Marine Environmental Telemetry
DEFAULT_THRESHOLDS: Dict[str, Dict[str, Any]] = {
    "turbidity_ntu": {
        "min": 0.0,
        "max": 10.0,
        "unit": "NTU",
        "name": "Optical Turbidity",
        "rule_id": "RULE-IOT-01",
        "description": "Suspended particulate scattering above baseline coral lagoon threshold (10 NTU)"
    },
    "water_temperature_c": {
        "min": 22.0,
        "max": 31.5,
        "unit": "°C",
        "name": "Sea Surface Temperature",
        "rule_id": "RULE-IOT-02",
        "description": "Thermal stress threshold capable of inducing coral bleaching (>31.5°C) or cold shock (<22°C)"
    },
    "dissolved_oxygen_mg_l": {
        "min": 4.5,
        "max": 14.0,
        "unit": "mg/L",
        "name": "Dissolved Oxygen",
        "rule_id": "RULE-IOT-03",
        "description": "Hypoxic depression threshold (<4.5 mg/L) threatening benthic fish and crustacean respiration"
    },
    "ph_level": {
        "min": 7.6,
        "max": 8.5,
        "unit": "pH units",
        "name": "Seawater Acidity (pH)",
        "rule_id": "RULE-IOT-04",
        "description": "Ocean acidification / hyper-alkaline divergence beyond standard marine buffer (7.6 - 8.5)"
    },
    "salinity_psu": {
        "min": 32.0,
        "max": 38.0,
        "unit": "PSU",
        "name": "Practical Salinity",
        "rule_id": "RULE-IOT-05",
        "description": "Freshwater riverine plume intrusion (<32 PSU) or hyper-saline evaporation (>38 PSU)"
    },
    "battery_percentage": {
        "min": 20.0,
        "max": 100.0,
        "unit": "%",
        "name": "Buoy Battery State of Charge",
        "rule_id": "RULE-IOT-06",
        "description": "Depleted battery storage threatening station power rail shutdown (<20%)"
    },
    "signal_strength_dbm": {
        "min": -95.0,
        "max": 0.0,
        "unit": "dBm",
        "name": "RF Signal Strength (RSSI)",
        "rule_id": "RULE-IOT-07",
        "description": "Severe RF signal fade approaching receiver noise floor (-95 dBm)"
    }
}


class IoTAnomalyEngine:
    """
    Explainable, rule-based anomaly detection engine for in-situ oceanographic buoys.
    Evaluates empirical telemetry against configurable physical envelopes.
    """

    def __init__(self, thresholds: Optional[Dict[str, Dict[str, Any]]] = None):
        self.thresholds = thresholds or DEFAULT_THRESHOLDS.copy()

    def update_threshold(self, metric: str, min_val: Optional[float] = None, max_val: Optional[float] = None) -> bool:
        """Allow runtime reconfiguration of operational thresholds."""
        if metric in self.thresholds:
            if min_val is not None:
                self.thresholds[metric]["min"] = min_val
            if max_val is not None:
                self.thresholds[metric]["max"] = max_val
            return True
        return False

    def evaluate_telemetry(self, telemetry: VirtualESP32Telemetry) -> List[IoTAnomalyEvent]:
        """
        Evaluate a complete virtual buoy telemetry packet for physical and operational anomalies.
        """
        anomalies: List[IoTAnomalyEvent] = []
        now_ts = datetime.now(timezone.utc).isoformat()

        # 1. Optical Turbidity Spike
        t_cfg = self.thresholds["turbidity_ntu"]
        if telemetry.turbidity_ntu > t_cfg["max"]:
            severity: IoTSeverityType = "CRITICAL" if telemetry.turbidity_ntu > 25.0 else "MODERATE"
            anomalies.append(
                IoTAnomalyEvent(
                    anomaly_id=f"ANOM-IOT-TURB-{telemetry.device_id}-{int(datetime.now(timezone.utc).timestamp())}",
                    device_id=telemetry.device_id,
                    sensor_name="Optical Turbidity",
                    observed_value=telemetry.turbidity_ntu,
                    expected_range={"min": t_cfg["min"], "max": t_cfg["max"]},
                    unit=t_cfg["unit"],
                    severity=severity,
                    timestamp=now_ts,
                    detection_rule=f"{t_cfg['rule_id']}: Turbidity > {t_cfg['max']} NTU",
                    explanation=(
                        f"Observed turbidity of {telemetry.turbidity_ntu:.1f} NTU exceeds normal reef threshold ({t_cfg['max']} NTU). "
                        "May indicate sediment resuspension, dredging runoff, intense algal bloom scattering, or storm swell. "
                        "Does NOT prove hydrocarbon pollution without optical spectral or SAR corroboration."
                    ),
                    confidence=0.94,
                    uncertainty=0.06,
                    data_mode=telemetry.data_mode,
                    is_simulated=telemetry.is_simulated
                )
            )

        # 2. Water Temperature Anomaly (Thermal Stress / Cold Upwelling)
        temp_cfg = self.thresholds["water_temperature_c"]
        if telemetry.water_temperature_c > temp_cfg["max"] or telemetry.water_temperature_c < temp_cfg["min"]:
            severity = "CRITICAL" if telemetry.water_temperature_c > 33.0 else "MODERATE"
            is_high = telemetry.water_temperature_c > temp_cfg["max"]
            condition = "elevated thermal heatwave" if is_high else "abnormal thermal depression"
            bound_val = temp_cfg["max"] if is_high else temp_cfg["min"]
            anomalies.append(
                IoTAnomalyEvent(
                    anomaly_id=f"ANOM-IOT-TEMP-{telemetry.device_id}-{int(datetime.now(timezone.utc).timestamp())}",
                    device_id=telemetry.device_id,
                    sensor_name="Water Temperature",
                    observed_value=telemetry.water_temperature_c,
                    expected_range={"min": temp_cfg["min"], "max": temp_cfg["max"]},
                    unit=temp_cfg["unit"],
                    severity=severity,
                    timestamp=now_ts,
                    detection_rule=f"{temp_cfg['rule_id']}: Water Temperature outside [{temp_cfg['min']}, {temp_cfg['max']}] °C",
                    explanation=(
                        f"Water temperature of {telemetry.water_temperature_c:.1f} °C reflects {condition} "
                        f"beyond baseline envelope ({bound_val} °C). Coral reefs risk thermal bleaching under prolonged exposure."
                    ),
                    confidence=0.91,
                    uncertainty=0.09,
                    data_mode=telemetry.data_mode,
                    is_simulated=telemetry.is_simulated
                )
            )

        # 3. Dissolved Oxygen Depletion (Hypoxia)
        do_cfg = self.thresholds["dissolved_oxygen_mg_l"]
        if telemetry.dissolved_oxygen_mg_l < do_cfg["min"]:
            severity = "CRITICAL" if telemetry.dissolved_oxygen_mg_l < 3.2 else "ELEVATED"
            anomalies.append(
                IoTAnomalyEvent(
                    anomaly_id=f"ANOM-IOT-DO-{telemetry.device_id}-{int(datetime.now(timezone.utc).timestamp())}",
                    device_id=telemetry.device_id,
                    sensor_name="Dissolved Oxygen",
                    observed_value=telemetry.dissolved_oxygen_mg_l,
                    expected_range={"min": do_cfg["min"], "max": do_cfg["max"]},
                    unit=do_cfg["unit"],
                    severity=severity,
                    timestamp=now_ts,
                    detection_rule=f"{do_cfg['rule_id']}: Dissolved Oxygen < {do_cfg['min']} mg/L",
                    explanation=(
                        f"Dissolved oxygen concentration of {telemetry.dissolved_oxygen_mg_l:.1f} mg/L represents a hypoxic sag "
                        f"below baseline threshold ({do_cfg['min']} mg/L). Indicates biological oxygen demand (BOD) surge, "
                        "organic decomposition, or nocturnal reef respiration."
                    ),
                    confidence=0.93,
                    uncertainty=0.07,
                    data_mode=telemetry.data_mode,
                    is_simulated=telemetry.is_simulated
                )
            )

        # 4. Abnormal pH (Acidification or Alkaline Influx)
        ph_cfg = self.thresholds["ph_level"]
        if telemetry.ph_level < ph_cfg["min"] or telemetry.ph_level > ph_cfg["max"]:
            severity = "MODERATE"
            is_acidic = telemetry.ph_level < ph_cfg["min"]
            anomalies.append(
                IoTAnomalyEvent(
                    anomaly_id=f"ANOM-IOT-PH-{telemetry.device_id}-{int(datetime.now(timezone.utc).timestamp())}",
                    device_id=telemetry.device_id,
                    sensor_name="Seawater pH",
                    observed_value=telemetry.ph_level,
                    expected_range={"min": ph_cfg["min"], "max": ph_cfg["max"]},
                    unit=ph_cfg["unit"],
                    severity=severity,
                    timestamp=now_ts,
                    detection_rule=f"{ph_cfg['rule_id']}: pH outside [{ph_cfg['min']}, {ph_cfg['max']}]",
                    explanation=(
                        f"Seawater pH level {telemetry.ph_level:.2f} deviates from oceanic buffer equilibrium "
                        f"({'acidic shift' if is_acidic else 'alkaline surge'}). Affects calcification of marine organisms."
                    ),
                    confidence=0.88,
                    uncertainty=0.12,
                    data_mode=telemetry.data_mode,
                    is_simulated=telemetry.is_simulated
                )
            )

        # 5. Salinity Variation
        sal_cfg = self.thresholds["salinity_psu"]
        if telemetry.salinity_psu < sal_cfg["min"] or telemetry.salinity_psu > sal_cfg["max"]:
            severity = "LOW"
            anomalies.append(
                IoTAnomalyEvent(
                    anomaly_id=f"ANOM-IOT-SAL-{telemetry.device_id}-{int(datetime.now(timezone.utc).timestamp())}",
                    device_id=telemetry.device_id,
                    sensor_name="Practical Salinity",
                    observed_value=telemetry.salinity_psu,
                    expected_range={"min": sal_cfg["min"], "max": sal_cfg["max"]},
                    unit=sal_cfg["unit"],
                    severity=severity,
                    timestamp=now_ts,
                    detection_rule=f"{sal_cfg['rule_id']}: Salinity outside [{sal_cfg['min']}, {sal_cfg['max']}] PSU",
                    explanation=(
                        f"Measured salinity of {telemetry.salinity_psu:.1f} PSU diverges from marine baseline. "
                        "Typically caused by river discharge, extreme rainfall, or coastal freshwater lens breach."
                    ),
                    confidence=0.89,
                    uncertainty=0.11,
                    data_mode=telemetry.data_mode,
                    is_simulated=telemetry.is_simulated
                )
            )

        # 6. Battery Depletion
        bat_cfg = self.thresholds["battery_percentage"]
        if telemetry.battery_percentage < bat_cfg["min"]:
            severity = "CRITICAL" if telemetry.battery_percentage < 10.0 else "MODERATE"
            anomalies.append(
                IoTAnomalyEvent(
                    anomaly_id=f"ANOM-IOT-BAT-{telemetry.device_id}-{int(datetime.now(timezone.utc).timestamp())}",
                    device_id=telemetry.device_id,
                    sensor_name="Battery State of Charge",
                    observed_value=telemetry.battery_percentage,
                    expected_range={"min": bat_cfg["min"], "max": bat_cfg["max"]},
                    unit=bat_cfg["unit"],
                    severity=severity,
                    timestamp=now_ts,
                    detection_rule=f"{bat_cfg['rule_id']}: Battery < {bat_cfg['min']}%",
                    explanation=(
                        f"Buoy battery reserve depleted to {telemetry.battery_percentage:.1f}%. "
                        "Station risks entering autonomous shutdown if solar harvesting remains insufficient."
                    ),
                    confidence=0.99,
                    uncertainty=0.01,
                    data_mode=telemetry.data_mode,
                    is_simulated=telemetry.is_simulated
                )
            )

        # 7. Communication Fade
        sig_cfg = self.thresholds["signal_strength_dbm"]
        if telemetry.signal_strength_dbm < sig_cfg["min"]:
            severity = "LOW"
            anomalies.append(
                IoTAnomalyEvent(
                    anomaly_id=f"ANOM-IOT-SIG-{telemetry.device_id}-{int(datetime.now(timezone.utc).timestamp())}",
                    device_id=telemetry.device_id,
                    sensor_name="Communication Signal RSSI",
                    observed_value=telemetry.signal_strength_dbm,
                    expected_range={"min": sig_cfg["min"], "max": sig_cfg["max"]},
                    unit=sig_cfg["unit"],
                    severity=severity,
                    timestamp=now_ts,
                    detection_rule=f"{sig_cfg['rule_id']}: Signal Strength < {sig_cfg['min']} dBm",
                    explanation=(
                        f"RSSI signal strength degraded to {telemetry.signal_strength_dbm:.1f} dBm. "
                        "May result in packet loss due to heavy sea spray, swell shadow, or squalls."
                    ),
                    confidence=0.85,
                    uncertainty=0.15,
                    data_mode=telemetry.data_mode,
                    is_simulated=telemetry.is_simulated
                )
            )

        return anomalies


iot_anomaly_engine = IoTAnomalyEngine()
