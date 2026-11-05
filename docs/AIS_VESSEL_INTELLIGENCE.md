# ORCA Phase 4: AIS Vessel Intelligence Agent Architecture & Specification

## 1. Executive Summary & Purpose
The **ORCA AIS Vessel Intelligence Agent** (`ORCA-AG-06 / AIS Surface Sentinel-06`) delivers automated surface vessel tracking, explainable maritime kinematic anomaly detection, and physics-informed multi-sensor cross-agent correlation for the ORCA Marine Intelligence platform. 

Operating under strict international maritime law frameworks (IMO ITU-R M.1371, UNCLOS Part XII, SOLAS V/19), this agent monitors vessel traffic across sensitive marine sanctuaries, assesses transponder transmission anomalies, and correlates vessel positions with:
- **Sentinel-1 SAR C-Band Radar**: Detects dark radar backscatter damping candidates (potential surface films / hydrocarbons).
- **Sentinel-2 MSI Optical Imagery**: Evaluates sediment plumes, turbidity proxies (SPM), and chlorophyll variations (NDCI).
- **Copernicus Marine Service (CMEMS)**: Models hydrodynamic ocean current drift vectors (NEMO / MFWAM) to evaluate physical transport plausibility.

---

## 2. ITU-R M.1371 Compliance & Transponder Telemetry Schema

The agent implements full decoding and normalization of Class A and Class B Automatic Identification System (AIS) broadcast messages under ITU-R M.1371 standards.

### Transponder Data Fields

| Field Name | Type | Standard / Format | Description |
| :--- | :--- | :--- | :--- |
| `mmsi` | `str` | 9-digit numeric string | Maritime Mobile Service Identity (unique ship transponder ID) |
| `vessel_name` | `str` | UTF-8 broadcast string | Static vessel name broadcast (defaults to `UNKNOWN`) |
| `vessel_type` | `str` | Textual description | Decoded vessel type (e.g. `Cargo`, `Tanker`, `Fishing`, `Tug`) |
| `vessel_category` | `str` | Category Enum | `CARGO`, `TANKER`, `FISHING`, `PASSENGER`, `TUG`, `SPECIAL`, `OTHER` |
| `latitude` | `float` | WGS84 (-90.0 to +90.0) | Latitude coordinate |
| `longitude` | `float` | WGS84 (-180.0 to +180.0) | Longitude coordinate |
| `sog_knots` | `float` | Knots (0.0 to 102.3) | Speed Over Ground |
| `cog_degrees` | `float` | Degrees (0.0 to 360.0) | Course Over Ground |
| `heading` | `Optional[float]` | Degrees (0.0 to 360.0) | True gyro/magnetic heading |
| `navigation_status` | `str` | ITU-R NAVSTAT | `Under way using engine`, `At anchor`, `Not under command`, etc. |
| `destination` | `Optional[str]` | Voyage report | Intended port of call or open sea sector |
| `last_received_timestamp` | `str` | ISO 8601 UTC | Timestamp of last received message |
| `signal_age_seconds` | `Optional[int]` | Integer seconds | Elapsed time since last received message |
| `data_freshness` | `str` | Freshness tier | `LIVE` (<5 min), `RECENT` (<30 min), `STALE` (>30 min) |
| `data_provider` | `str` | Provider attribution | Origin of feed (e.g. `AISHub Authorized`, `MarineTraffic Live`) |
| `data_mode` | `str` | Mode tier | `LIVE`, `HISTORICAL`, `DEMO`, `NOT_CONNECTED` |
| `data_source_type` | `str` | Channel type | `TERRESTRIAL_VHF`, `SATELLITE_AIS`, `DYNAMIC_TRANSPONDER`, `DEMO_FIXTURE` |
| `position_accuracy` | `Optional[str]` | RAIM/DGNSS | `HIGH (<10m DGNSS/RAIM)` or `STANDARD (>10m Autonomous)` |

---

## 3. Provider-Adapter Architecture & Secret Management

The service utilizes an extensible provider-adapter pattern in `backend/app/services/ais/`:

```
backend/app/services/ais/
├── __init__.py                # Package exports (ais_service, ais_anomaly_engine, ais_storage)
├── base_adapter.py            # Abstract Base Provider Adapter defining interface
├── aishub_adapter.py          # AISHub REST JSON adapter with rate-limit caching
├── marinetraffic_adapter.py   # MarineTraffic API adapter
├── demo_adapter.py            # Pre-configured demonstration fixtures
├── ais_storage.py             # Persistent JSON ledger & historical waypoint tracks
├── ais_anomaly_engine.py      # Behavioural detection & satellite correlation algorithms
└── ais_service.py             # Facade manager controlling provider switches & cache
```

### Environment Configuration & Secret Storage
All API credentials reside strictly in `backend/.env` (and are documented in `backend/.env.example`). No API keys or secrets are ever hardcoded or exposed in client payloads:

```bash
# AIS Surface Vessel Intelligence Agent (ORCA-AG-06)
AIS_PROVIDER=aishub               # Options: aishub, marinetraffic, custom
AIS_API_KEY=                      # Set your authorized API key (keep blank if unconfigured)
AIS_API_ENDPOINT=https://data.aishub.net/ws.php
AIS_CACHE_TTL_SECONDS=60          # Cache duration adhering to provider rate limits
AIS_DEMO_MODE=false               # Explicit toggle for demonstration mode
```

### Unconfigured State (`NOT_CONNECTED`)
When `AIS_API_KEY` is absent and `AIS_DEMO_MODE=false`, the system strictly reports:
```json
{
  "is_connected": false,
  "connection_status": "NOT CONNECTED",
  "message": "AIS provider not configured. Connect an authorized AIS data provider to receive vessel information."
}
```
No synthetic positions are ever returned or disguised as real measurements.

---

## 4. Explicit Data Modes & Anti-Fabrication Safeguards

ORCA enforces strict isolation between four operational data modes:
1. **`LIVE`**: Verified observations fetched from an authorized upstream API within the active caching window (`is_simulated=False`).
2. **`HISTORICAL`**: Valid historical telemetry stored in the local persistent ledger from previous authenticated sessions (`is_simulated=False`).
3. **`DEMO`**: Synthetic demonstration scenarios explicitly activated by the operator (`is_simulated=True`, `data_source_type="DEMO_FIXTURE"`).
4. **`NOT_CONNECTED`**: Safe idle state when credentials are unconfigured or upstream servers are unreachable.

### Schema Anti-Fabrication Validator
A Pydantic root validator in `AISVesselPosition` prevents any data contamination:
```python
@model_validator(mode="after")
def enforce_anti_fabrication_rules(self) -> "AISVesselPosition":
    if self.is_simulated:
        self.data_mode = "DEMO"
        self.data_source_type = "DEMO_FIXTURE"
    return self
```
Any attempt to label simulated fixture data as `LIVE` is automatically overridden.

---

## 5. Vessel Behavioural Anomaly Detection Engine

The `AISAnomalyEngine` runs rule-based kinematic algorithms against current telemetry and historical waypoint tracks:

### 1. Unusual Loitering (`UNUSUAL_LOITERING`)
- **Criteria**: Vessel stays within a tight convex radius ($R \le 2.5\text{ km}$) for $>45$ minutes with mean speed $<2.0\text{ knots}$ in open ocean sectors.
- **Physical Caveat**: Commercial fishing trawlers, pilot cutters, and survey ships routinely loiter during normal operations.

### 2. Repeated Course Changes (`REPEATED_COURSE_CHANGES`)
- **Criteria**: Vessel cruising at speed ($>5\text{ knots}$) exhibits two or more abrupt course alterations ($|\Delta\text{COG}| \ge 40^\circ$) within consecutive track points.
- **Physical Caveat**: Maneuvers may reflect heavy weather routing, traffic separation scheme collision avoidance, or counter-current optimization.

### 3. Unexpected Route Deviation (`UNEXPECTED_ROUTE_DEVIATION`)
- **Criteria**: Transiting vessel deviates $>45^\circ$ from its broadcast voyage destination bearing.
- **Physical Caveat**: Route changes are routinely commanded by vessel masters to avoid cyclonic squalls or container lash adjustments.

### 4. Unusual Speed Patterns (`UNUSUAL_SPEED_PATTERN`)
- **Criteria**: Sudden speed reduction ($\Delta\text{SOG} \ge 6\text{ knots}$) within an active transit corridor.
- **Physical Caveat**: Controlled crash stops, traffic congestion slowdowns, or engine maintenance.

### 5. Prolonged Stationary in Open Sea (`PROLONGED_STATIONARY_OPEN_SEA`)
- **Criteria**: SOG $<0.5\text{ knots}$ while navigational status claims "Under way using engine" ($NAVSTAT=0$) for $>30$ minutes outside harbors.
- **Physical Caveat**: Drifting while awaiting pilotage, bunkering, or undergoing sea trials.

### 6. Transponder Reporting Gaps (`TRANSPONDER_REPORTING_GAP`)
- **Criteria**: No transponder message received for $>1800\text{ seconds}$ (30 minutes).
- **Physical & Technical Explanations Cataloged**:
  - Terrestrial line-of-sight VHF propagation limits (typically 25–35 nautical miles).
  - Low Earth Orbit (LEO) satellite constellation orbital revisit interval (30–90 min).
  - Atmospheric ducting collapse, severe rain squall fade, or high sea-clutter RF attenuation.
  - Transceiver antenna cable check or power bus maintenance.
  - Master safety protocol in designated high-risk security corridors (SOLAS V/19.2.4).

### 7. Sensitive Marine Protected Area Activity (`SENSITIVE_AREA_ACTIVITY`)
- **Criteria**: Vessel polygon intersection against designated UNESCO and international MPAs:
  - **Great Barrier Reef Marine Park** (Ribbon Reefs Sector, Australia)
  - **Galapagos Marine Reserve** (Ecuador)
  - **Raja Ampat Misool Marine Sanctuary** (Indonesia)
  - **Sargasso Sea Conservation Area** (High Seas)

---

## 6. Physics-Informed Multi-Sensor Cross-Agent Correlation

The correlation engine integrates outputs from three distinct spatial intelligence layers:

### Distance & Bearing Formulation
Using the Great-Circle Haversine formula on a spherical Earth ($R = 6371\text{ km}$):
$$\Delta\sigma = 2 \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1 \cos\phi_2 \sin^2\left(\frac{\Delta\lambda}{2}\right)} \right)$$
$$D_{\text{km}} = R \Delta\sigma, \quad D_{\text{nm}} = \frac{D_{\text{km}}}{1.852}$$

Initial compass bearing $\theta$ from vessel to candidate:
$$\theta = \text{atan2}\left(\sin\Delta\lambda \cos\phi_2, \; \cos\phi_1\sin\phi_2 - \sin\phi_1\cos\phi_2\cos\Delta\lambda\right)$$

### Hydrodynamic Drift Alignment
Coupled with ocean current vectors $(\mathbf{u}, \mathbf{v})$ from Copernicus Marine models:
$$\Delta\theta_{\text{drift}} = \min\left(|\theta_{\text{bearing}} - \theta_{\text{current}}|, \; 360^\circ - |\theta_{\text{bearing}} - \theta_{\text{current}}|\right)$$

- **$\Delta\theta_{\text{drift}} \le 35^\circ$**: `HIGH` hydrodynamic plausibility (slick lies directly down-current from vessel trajectory).
- **$35^\circ < \Delta\theta_{\text{drift}} \le 65^\circ$**: `MODERATE` plausibility.
- **$\Delta\theta_{\text{drift}} > 65^\circ$**: `LOW` plausibility (slick location opposes prevailing ocean surface drift).
- **No Current Data Available**: `INCONCLUSIVE`.

---

## 7. Maritime Legal Guardrails & Lead Orchestrator Prompt Rule 8

The system enforces strict legal caveats in compliance with international maritime law:

> **Scientific & Legal Compliance Principle**:
> An AIS behavioural anomaly or transponder reporting gap must **NEVER** automatically be classified as illegal activity, criminal evasion, or proof of an intentional discharge. Spatial proximity to a detected satellite anomaly does **NOT** prove causation, liability, or intentional discharge without verified hydrodynamic drift corroboration and forensic in-situ verification.

### Lead Orchestrator Prompt Rule 8
The Nugen Lead Orchestrator includes the following rule in its deliberate reasoning prompt:
```
8. AIS vessel proximity to a detected marine anomaly (SAR slick candidate or optical turbidity plume)
   does NOT prove causation, liability, or intentional discharge. Slicks drift down-current from their
   origin point. An AIS signal gap can be caused by terrestrial line-of-sight VHF range limits, satellite
   revisit gaps, or severe weather attenuation, and must NEVER automatically be classified as illegal activity.
```

---

## 8. API Endpoints Specification

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/ais/status` | Current provider connection status, cache TTL, and data mode |
| `GET` | `/api/v1/ais/vessels` | Filterable list of tracked vessels with spatial bounds and categories |
| `GET` | `/api/v1/ais/vessels/{mmsi}` | Full ITU-R M.1371 detail for an individual vessel |
| `GET` | `/api/v1/ais/vessels/{mmsi}/movement`| Kinematic vector, course, speed, and recent waypoints |
| `GET` | `/api/v1/ais/search` | Search vessels by MMSI or vessel name fragment |
| `POST` | `/api/v1/ais/test-connection` | Health check against configured upstream AIS provider |
| `POST` | `/api/v1/ais/demo/toggle` | Operator toggle for synthetic demonstration mode |
| `GET` | `/api/v1/ais/anomalies` | Active behavioural anomaly reports with explainable reasons |
| `GET` | `/api/v1/ais/correlations` | Cross-agent correlations with SAR, Optical, and Ocean currents |
| `POST` | `/api/v1/ais/analyze` | Triggers comprehensive multi-sensor correlation analysis |

---

## 9. Frontend User Interface (`AISVesselTracking.tsx`)

The frontend console features a tabbed navigation architecture:
- **`RADAR` (Live Radar & Register)**: Interactive Leaflet map displaying vessel markers colored by category, live AIS stats counter, and detailed inspection drawer (showing `Data Mode`, `Transponder Source`, and `DGNSS Accuracy`).
- **`ANOMALIES` (Behavioural Indicators)**: Cards for loitering, course zigzagging, route deviations, speed drops, and MPA boundary intersections with explainable rationale and physical data limitations.
- **`CORRELATIONS` (Multi-Sensor Satellite Correlation)**: Visual cards matching AIS vessels to Sentinel-1 SAR dark spots and Sentinel-2 plumes with calculated hydrodynamic drift alignment angles ($\Delta\theta$), physical transport plausibility badges, and an interactive **Lead Orchestrator Evidence Payload JSON Viewer**.
