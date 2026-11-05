# ORCA Marine Ecosystem Intelligence
## Phase 5: Virtual ESP32 Marine Monitoring Buoy & IoT Intelligence Agent
**Document Version:** 1.0.0 • **Date:** November 2026 • **System:** ORCA Autonomous Marine Swarm

---

### Executive Summary

ORCA's Phase 5 introduces the **Virtual ESP32 Marine Monitoring Buoy & IoT Intelligence Agent**, bridging synthetic in-situ sensor telemetry with satellite earth observation (SAR, optical, Copernicus Marine) and AIS maritime vessel surveillance. Designed for high-fidelity demonstration and future physical drop-in replacement, the agent simulates an industrial oceanographic buoy deployed at the **Great Barrier Reef Marine Park (Ribbon Reefs Sector: -16.8205°, 146.2150°)**.

The system features:
1. **Mathematical In-Situ Marine Physics Engine**: Deterministic diurnal and tidal wave harmonic simulation generating realistic sensor telemetry across 7 vital oceanographic parameters.
2. **Three Controllable Demonstration Scenarios**: `normal` (coral reef baseline), `anomaly` (turbidity spike, thermal pulse, hypoxic sag), and `offline` (telemetry freeze and transmitter power-down).
3. **Explainable Rule-Based Anomaly Detection Engine**: Transparent, deterministic heuristic evaluation with severity levels, confidence/uncertainty scoring, and scientific caveats.
4. **Strict Anti-Fabrication & Scientific Integrity Guardrails**: All simulated packets explicitly enforce `data_mode: "SIMULATED"` and `is_simulated: true`. Anomaly alerts include mandatory compliance disclaimers preventing misinterpretation as live pollution events.
5. **Nugen Neural Reasoning & Lead Orchestrator Integration**: Multi-agent evidence payload injection obeying Lead Orchestrator Rule 9.
6. **Future Physical ESP32 Adapter Interface**: Architectural blueprint and HMAC-SHA256 REST/MQTT gateway specification for seamless hardware drop-in (`POST /api/v1/telemetry/ingest`).

---

### 1. In-Situ Physical Transducers & Telemetry Envelopes

The virtual buoy models an industrial marine mooring equipped with standard oceanographic transducers:

| Sensor Channel | Modeled Transducer Equivalent | Measurement Unit | Normal Range | Anomaly Value (Demonstration) |
| :--- | :--- | :--- | :--- | :--- |
| **Water Temperature** | Dallas DS18B20 Marine Digital Thermometer | °C | 24.0 – 30.5 | 32.85 °C (Thermal pulse) |
| **pH Acidity** | Atlas Scientific Lab-Grade EZO pH Sensor | pH | 7.80 – 8.40 | 7.34 pH (Acidification / runoff) |
| **Turbidity** | DFRobot Industrial Optical Nephelometer | NTU | 0.0 – 5.0 | 28.45 NTU (Suspended sediment plume) |
| **Dissolved Oxygen** | Atlas Scientific Galvanic DO Probe | mg/L | 4.5 – 14.0 | 3.20 mg/L (Hypoxic sag) |
| **Practical Salinity** | Toroidal Induction Conductivity Cell | PSU | 32.0 – 38.0 | 30.80 PSU (Freshwater storm dilution) |
| **Battery Power** | TI INA219 Coulomb Counter & Voltage Meter | % (V) | 20.0 – 100.0 (3.6 – 4.2V) | 94% / 4.14V (Solar harvested) |
| **Radio Modem RSSI** | Semtech SX1262 LoRa / Quectel BG95 LTE-M | dBm | -95.0 – 0.0 | -68 dBm (High signal margin) |

---

### 2. Controllable Demonstration Scenarios

The virtual buoy provides three controllable operational states switched via REST API (`POST /api/v1/iot/scenario`):

```
                       ┌───────────────────────────────┐
                       │        Virtual ESP32          │
                       │     ORCA-BUOY-001 Mooring     │
                       └──────────────┬────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
     │ 1. normal       │     │ 2. anomaly      │     │ 3. offline      │
     ├─────────────────┤     ├─────────────────┤     ├─────────────────┤
     │ • Stable reef   │     │ • Turbidity     │     │ • Freezes last  │
     │   baseline      │     │   spike: 28.5   │     │   known packet  │
     │ • Diurnal waves │     │ • Thermal       │     │ • Status:       │
     │ • All 7 sensors │     │   pulse: 32.8°C │     │   OFFLINE       │
     │   NOMINAL       │     │ • Hypoxic sag:  │     │ • Transmission  │
     │ • 0 Anomalies   │     │   3.2 mg/L      │     │   paused        │
     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

#### A. Scenario `normal`
- Simulates nominal environmental equilibrium in a pristine coral reef ecosystem.
- Sensor parameters oscillate with diurnal day/night cycles and semi-diurnal tides:
  $$\Delta T = 0.4 \cdot \sin\left(\frac{2\pi t}{86400}\right) + \epsilon$$
- Generates 0 anomaly alerts; device status is `ONLINE`.

#### B. Scenario `anomaly`
- Injects a multi-parameter ecological event representing a localized sediment plume, thermal buildup, and organic decomposition:
  - **Turbidity:** ~28.5 NTU (Exceeds 5.0 NTU threshold → `RULE_TURBIDITY_CRITICAL_HIGH`)
  - **Water Temperature:** ~32.8°C (Exceeds 30.5°C threshold → `RULE_THERMAL_STRESS_HIGH`)
  - **Dissolved Oxygen:** ~3.2 mg/L (Drops below 4.5 mg/L threshold → `RULE_HYPOXIA_CRITICAL_LOW`)
  - **pH Level:** ~7.34 pH (Drops below 7.80 threshold → `RULE_PH_ACIDIFICATION_LOW`)
- Anomaly engine generates structured `IoTAnomalyEvent` records with scientific reasoning; device status is `DEGRADED`.

#### C. Scenario `offline`
- Simulates transmitter power loss, radio link dropout, or maintenance outage.
- Freezes the last generated packet, flags status as `OFFLINE`, and suspends packet counter increments.

---

### 3. Explainable Anomaly Detection Engine

The anomaly detection engine (`app/services/iot/iot_anomaly_engine.py`) operates deterministically without opaque black-box heuristics:

```python
DEFAULT_THRESHOLDS = {
    "turbidity_ntu": {"min": 0.0, "max": 5.0},
    "water_temperature_c": {"min": 24.0, "max": 30.5},
    "dissolved_oxygen_mg_l": {"min": 4.5, "max": 14.0},
    "ph_level": {"min": 7.80, "max": 8.40},
    "salinity_psu": {"min": 32.0, "max": 38.0},
    "battery_percentage": {"min": 20.0, "max": 100.0},
    "signal_strength_dbm": {"min": -95.0, "max": 0.0},
}
```

#### Rule Enforcement & Scientific Explanations:
1. **`RULE_TURBIDITY_CRITICAL_HIGH`**:
   - *Trigger:* `turbidity_ntu > 5.0 NTU` (e.g. 28.45 NTU).
   - *Explanation:* Severe optical attenuation detected. Correlates with localized dredge plumes, riverine stormwater runoff, or sediment resuspension.
2. **`RULE_HYPOXIA_CRITICAL_LOW`**:
   - *Trigger:* `dissolved_oxygen_mg_l < 4.5 mg/L` (e.g. 3.20 mg/L).
   - *Explanation:* Acute hypoxic condition detected. Sub-critical dissolved oxygen concentration poses imminent physiological asphyxiation risk to reef fauna.
3. **`RULE_THERMAL_STRESS_HIGH`**:
   - *Trigger:* `water_temperature_c > 30.5 °C` (e.g. 32.85 °C).
   - *Explanation:* Thermal pulse exceeding regional summertime Degree Heating Week (DHW) coral bleaching threshold.
4. **`RULE_PH_ACIDIFICATION_LOW`**:
   - *Trigger:* `ph_level < 7.80` (e.g. 7.34 pH).
   - *Explanation:* Localized acidification or freshwater storm discharge depressing seawater buffer capacity.

---

### 4. REST API Endpoints Specification

All virtual buoy endpoints are mounted under `/api/v1/iot/*`:

| HTTP Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/iot/status` | Network status, packet count, active scenario, connectivity |
| `GET` | `/api/v1/iot/devices` | Registered buoy fleet summary |
| `GET` | `/api/v1/iot/devices/{device_id}` | Complete hardware manifest, firmware, transducers, and telemetry |
| `GET` | `/api/v1/iot/telemetry` | Latest 7-parameter sensor packet |
| `GET` | `/api/v1/iot/anomalies` | Active explainable anomaly events with compliance notices |
| `POST` | `/api/v1/iot/scenario` | Switch operational scenario (`normal`, `anomaly`, `offline`) |
| `POST` | `/api/v1/iot/simulation/start` | Resume continuous telemetry generation |
| `POST` | `/api/v1/iot/simulation/stop` | Pause telemetry generation |
| `GET` | `/api/v1/iot/history` | Historical circular buffer of recent telemetry readings |

#### Sample Telemetry Response (`GET /api/v1/iot/telemetry`):
```json
{
  "device_id": "ORCA-BUOY-001",
  "device_name": "ORCA Virtual ESP32 Reef Mooring",
  "timestamp": "2026-11-04T03:30:00Z",
  "latitude": -16.8205,
  "longitude": 146.2150,
  "deployment_location": "Great Barrier Reef Marine Park (Ribbon Reefs Sector)",
  "water_temperature_c": 26.54,
  "ph_level": 8.18,
  "turbidity_ntu": 1.21,
  "dissolved_oxygen_mg_l": 6.82,
  "salinity_psu": 35.21,
  "battery_percentage": 94.0,
  "signal_strength_dbm": -68.0,
  "packet_sequence": 142,
  "battery_voltage_v": 4.14,
  "current_scenario": "normal",
  "is_simulated": true,
  "data_mode": "SIMULATED",
  "sensors": {
    "turbidity": {
      "sensor_name": "Turbidity",
      "sensor_type": "DFRobot Industrial Optical Nephelometer",
      "value": 1.21,
      "unit": "NTU",
      "expected_range": { "min": 0.0, "max": 5.0 },
      "status": "NORMAL"
    }
  }
}
```

---

### 5. Nugen Neural Reasoning & Lead Orchestrator Integration

In accordance with Lead Orchestrator **System Prompt Rule 9**:

> **Rule 9: Virtual ESP32 Buoy Simulation & In-Situ IoT Caveats**  
> If in-situ buoy telemetry or IoT sensor anomalies originate from a virtual or simulated ESP32 device (`data_mode: "SIMULATED"`, `is_simulated: true`), the Lead Orchestrator MUST:
> 1. Clearly state that the in-situ measurements are synthetic demonstration data.
> 2. NEVER assert that a simulated turbidity spike, thermal rise, or low dissolved oxygen reading constitutes verified empirical proof of an active marine pollution disaster or oil spill.
> 3. Cross-reference simulated IoT findings with Copernicus Marine models, Sentinel-1 SAR observations, or Sentinel-2 optical spectral indices when formulating operational assessments.

The orchestrator compiles IoT evidence in `compile_evidence_payload()`:
```python
evidence["evidence_streams"]["iot_in_situ_sensors"] = {
    "device_id": "ORCA-BUOY-001",
    "device_name": "ORCA Virtual ESP32 Reef Mooring",
    "data_mode": "SIMULATED",
    "is_simulated": True,
    "scenario": "normal",
    "measurements": {
        "water_temperature_c": 26.54,
        "ph_level": 8.18,
        "turbidity_ntu": 1.21,
        "dissolved_oxygen_mg_l": 6.82,
        "salinity_psu": 35.21,
        "battery_percentage": 94.0,
        "signal_strength_dbm": -68.0
    },
    "anomalies_detected": []
}
```

---

### 6. Physical ESP32 Hardware Adapter Specification

For physical hardware deployment, `app/services/iot/base_adapter.py` establishes the `BaseIoTAdapter` contract and `PhysicalESP32ArchitectureSpec`:

```
┌────────────────────────────────────────────────────────┐
│             Physical ESP32-WROOM-32 Buoy               │
│                                                        │
│  [DS18B20 Temp]   [EZO pH]   [Nephelometer Turbidity]  │
│  [Galvanic DO]    [Toroidal Salinity]   [INA219 Power] │
└──────────────────────────┬─────────────────────────────┘
                           │
             FreeRTOS Telemetry Task (5s)
                           │
             ATECC608A Cryptographic Sign
                           │
        ┌──────────────────┴──────────────────┐
        ▼                                     ▼
 4G LTE-M / NB-IoT                      868MHz LoRaWAN
 (Quectel BG95)                         (Semtech SX1262)
        │                                     │
   HTTPS POST                              Gateway
        │                                     │
        ▼                                     ▼
┌────────────────────────────────────────────────────────┐
│             ORCA Backend Ingest Gateway                │
│             POST /api/v1/telemetry/ingest              │
│             Header: X-ORCA-DEVICE-KEY                  │
└────────────────────────────────────────────────────────┘
```

#### Physical Security Architecture:
- **Hardware Crypto**: Microchip ATECC608A crypto element stores ECC P-256 private key.
- **Message Signing**: Telemetry frames signed using HMAC-SHA256 (`X-ORCA-DEVICE-KEY`).
- **Telemetry Ingestion API**: `POST /api/v1/telemetry/ingest` verifies bearer token and persists live readings into the time-series store.

---

### 7. Frontend Operations Center & Map Integration

The frontend (`frontend/src/pages/IoTBuoyMonitoring.tsx`) features:
1. **Interactive SVG Buoy Model**:
   - Floating buoy with buoyancy wave physics.
   - Antenna mast radiating active wireless RF pulse rings.
   - Microcontroller enclosure with blinking status LED (Green for normal, pulsating Amber for anomaly, Grey for offline).
   - Solar panel with irradiance flare animation.
2. **Scenario Controller**:
   - Quick-action buttons to toggle between `Normal`, `Anomaly`, and `Offline`.
   - Simulation Start/Pause button and packet polling trigger.
3. **Sensor Matrix**:
   - 7 distinct real-time cards with values, measurement units, sensor models, and `NORMAL`/`ANOMALY` badges.
4. **Interactive SVG History Chart**:
   - Multi-metric time-series curves plotting recent packets for Turbidity, Temperature, DO, and pH.
5. **Explainable Anomaly Alerts**:
   - Cards showing the violated rule, observed vs expected bounds, scientific rationale, and mandatory compliance banner.
6. **Leaflet Map Integration**:
   - Virtual buoy `ORCA-BUOY-001` is plotted on `MarineIntelligenceMapCore.tsx` at (-16.8205°, 146.2150°) with an interactive inspection popup.

---

### 8. Acceptance Test Results

| Test Category | Tested Feature | Result |
| :--- | :--- | :--- |
| **Device Registration** | `GET /api/v1/iot/devices` returns `ORCA-BUOY-001` | **PASS** |
| **Hardware Manifest** | `GET /api/v1/iot/devices/ORCA-BUOY-001` returns full specs | **PASS** |
| **Telemetry Bounds** | Sensor values in `normal` scenario stay within physical boundaries | **PASS** |
| **Units & Precision** | °C, pH, NTU, mg/L, PSU, %, dBm, V verified | **PASS** |
| **Anti-Fabrication** | `data_mode="SIMULATED"` and `is_simulated=True` present on all endpoints | **PASS** |
| **Anomaly Generation** | Switching to `anomaly` generates turbidity spike, hypoxia, and thermal pulse | **PASS** |
| **Explainable Rules** | `RULE_TURBIDITY_CRITICAL_HIGH`, `RULE_HYPOXIA_CRITICAL_LOW` triggered | **PASS** |
| **Compliance Notices** | Anomaly responses include mandatory scientific integrity caveats | **PASS** |
| **Offline Scenario** | Freezes telemetry, marks status `OFFLINE`, pauses packet counter | **PASS** |
| **Input Validation** | Rejects invalid scenario strings with HTTP 422 | **PASS** |
| **Simulation Controls** | `POST /simulation/stop` and `POST /simulation/start` function cleanly | **PASS** |
| **History Buffer** | `GET /api/v1/iot/history` returns chronological sliding window | **PASS** |
| **Lead Orchestrator** | `compile_evidence_payload()` preserves `SIMULATED` IoT telemetry | **PASS** |
| **Rule 9 Compliance** | Nugen Lead Orchestrator prompt enforces Rule 9 simulation caveats | **PASS** |
| **Frontend Build** | `npm run build` succeeds in 1.96s with 0 errors | **PASS** |

---
*Signed by ORCA Marine Intelligence Engineering Team — Phase 5 Completed.*
