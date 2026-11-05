# ORCA Phase 6: Multi-Agent Intelligence, Evidence Correlation & Central Lead Orchestration

## Executive Overview
Phase 6 transforms ORCA from a collection of five independent marine monitoring modules into a unified, evidence-driven Marine Intelligence Platform. Under the leadership of the **Central Lead Orchestrator**, observational evidence from all 5 specialized agents—**SAR Agent** (Sentinel-1), **Optical Agent** (Sentinel-2), **Oceanographic Agent** (Copernicus Marine CMEMS), **AIS Agent** (Vessel Kinematics), and **IoT Agent** (Virtual ESP32 Marine Buoy)—is continuously synthesized, normalized, correlated, and submitted to the **Nugen Neural Deliberation Engine**.

---

## 1. Multi-Agent Fleet Integration & Responsibilities

| Agent Name | Sensory Domain | Real-World Platform | Native Metrics | Data Modes Supported |
| :--- | :--- | :--- | :--- | :--- |
| **Sentinel-1 SAR Agent** | Microwave Radar Imagery | Copernicus Sentinel-1 C-SAR (IW/EW) | Sigma-0 backscatter ($\text{dB}$), dark patch candidate bounding boxes, dampening ratio | `LIVE`, `MODEL_OUTPUT`, `DEMO` |
| **Sentinel-2 Optical Agent** | Multispectral Radiometry | Copernicus Sentinel-2 MSI | NDCI chlorophyll index, relative SPM/turbidity proxy, cloud cover percentage | `LIVE`, `MODEL_OUTPUT`, `DEMO` |
| **Copernicus Oceanographic Agent** | Numerical Ocean Physics | CMEMS Global Physical Analysis & Waves | Sea surface temperature ($^\circ\text{C}$), sea surface salinity ($\text{PSU}$), current vectors ($u, v$ in $\text{m/s}$), significant wave height ($H_s$ in $\text{m}$) | `MODEL_OUTPUT`, `LIVE` |
| **AIS Vessel Tracking Agent** | Vessel Transponder Kinematics | Datalastic / AISHub REST API | Speed over ground ($\text{knots}$), course over ground ($^\circ$), draft ($\text{m}$), vessel type, transponder gap / loitering events | `LIVE`, `DEMO`, `NOT_CONNECTED` |
| **Virtual ESP32 Marine Buoy Agent** | In-situ Hydrographic Mooring | Virtual FreeRTOS Dual-Core ESP32 | Water temperature ($^\circ\text{C}$), pH, dissolved oxygen ($\text{mg/L}$), turbidity ($\text{NTU}$), battery voltage ($\text{V}$) | `SIMULATED`, `NOT_CONNECTED` |

---

## 2. Unified Evidence Schema (`UnifiedEvidenceRecord`)
Every observation entering the Lead Orchestrator is converted into an immutable, strictly-typed evidence container with mandatory scientific provenance:

```python
class UnifiedEvidenceRecord(BaseModel):
    evidence_id: str                   # EVID-{UUID}
    agent_name: str                    # Reporting agent identifier
    evidence_type: str                 # Domain observation category
    source_name: str                   # Satellite sensor or instrument
    source_identifier: str             # Product ID, MMSI, or Device ID
    observation_timestamp: str         # ISO 8601 UTC timestamp of physical observation
    ingestion_timestamp: str           # ISO 8601 UTC timestamp of ingestion
    latitude: Optional[float]          # Centroid or observation latitude [-90.0, 90.0]
    longitude: Optional[float]         # Centroid or observation longitude [-180.0, 180.0]
    spatial_coverage: Optional[dict]   # Bounding box [w, s, e, n] or GeoJSON
    data_mode: DataModeType            # LIVE, HISTORICAL, MODEL_OUTPUT, SIMULATED, DEMO, NOT_CONNECTED
    is_simulated: bool                 # Strict synthetic data flag
    measurement_or_indicator: str      # Measured variable or bio-optical indicator
    value: Any                         # Physical value or structured finding
    unit: str                          # Engineering / scientific unit
    confidence: float                  # [0.0, 1.0] individual measurement confidence
    uncertainty: float                 # Standard deviation or uncertainty margin
    quality_status: QualityStatusType  # VERIFIED, CALIBRATED_ESTIMATE, UNCERTAIN, DEGRADED, SYNTHETIC
    processing_method: str             # Algorithmic method or sensor calibration model
    provenance: dict                   # Upstream license, provider, and resolution
    limitations: list[str]             # Physical limitations & calibration caveats
```

---

## 3. Geospatial Correlation Engine (`SpatialCorrelationEngine`)
- **Geodesic Distance:** Computed using the great-circle Haversine formula ($\text{Earth Radius} = 6371.0\text{ km}$).
- **Footprint Overlap:** Ray-casting and bounding-box intersection testing between raster swaths and discrete coordinate points.
- **Five Proximity Tiers:**
  1. `INTERSECTS`: Direct footprint overlap or zero distance separation ($0\text{ km}$).
  2. `WITHIN_IMMEDIATE_PROXIMITY`: Distance $\le 5.0\text{ km}$.
  3. `WITHIN_LOCAL_AREA`: Distance $\le \text{correlation\_radius\_km}$ (default: $25\text{ km}$).
  4. `DISTANT`: Distance $\le 100\text{ km}$ or $> \text{correlation\_radius\_km}$.
  5. `DISJOINT`: Distance $> 100\text{ km}$.
- **Mandatory Non-Causation Disclaimer:**
  > *"Scientific Notice: Spatial proximity is supporting contextual evidence, NOT empirical proof of causation or liability."*

---

## 4. Temporal Correlation & Hydrodynamic Transport Engine (`TemporalCorrelationEngine`)
- **UTC Normalization:** All observational timestamps are converted to timezone-aware UTC `datetime` objects.
- **Freshness Classification:**
  - `REAL_TIME`: Age $< 30\text{ minutes}$.
  - `CURRENT`: Age between $0.5$ and $6.0\text{ hours}$.
  - `RECENT`: Age between $6.0$ and $24.0\text{ hours}$.
  - `HISTORICAL`: Age between $24.0$ and $72.0\text{ hours}$.
  - `STALE`: Age $> 72.0\text{ hours}$.
- **Compatibility Tiers:**
  - `COINCIDENT`: $\Delta t \le 1.0\text{ hour}$.
  - `HIGH`: $\Delta t \le 6.0\text{ hours}$.
  - `MODERATE`: $\Delta t \le \text{window\_hours}$ (default: $24\text{ hours}$).
  - `LOW`: $\Delta t \le 2 \times \text{window\_hours}$ ($48\text{ hours}$).
  - `INCOMPATIBLE`: $\Delta t > 2 \times \text{window\_hours}$.
- **Passive Hydrodynamic Drift Transport:**
  Calculates potential advection displacement of surface slicks using CMEMS surface current velocity ($u, v$ components):
  $$\text{Displacement (km)} = \text{Current Speed (m/s)} \times 3.6 \times \Delta t\text{ (hours)}$$

---

## 5. Quality, Uncertainty & Anti-Hallucination Framework (`QualityUncertaintyEngine`)
To protect against scientific false positives, four concepts are strictly separated:
1. **Data Quality:** Individual sensor accuracy, spatial resolution, and atmospheric interference.
2. **Evidence Confidence:** Degree of certainty that an observed physical anomaly is genuine.
3. **Correlation Strength:** Geospatial proximity factor combined with temporal synchronization weight.
4. **Overall Incident Assessment Confidence:** Final composite certainty in the cross-agent synthesis.

### Strict Simulation Isolation:
- Telemetry from `ORCA-BUOY-001` has `data_mode="SIMULATED"`, `is_simulated=True`, and `quality_status="SYNTHETIC"`.
- If an investigation contains **only** simulated evidence, the overall assessment confidence is capped at $\le 0.35$ and assigned the tier `DEMONSTRATION_ONLY` with an explicit notice that synthetic data cannot trigger physical deployment.

---

## 6. Cross-Agent Anomaly Scenarios & Conflict Detection (`CrossAgentAnomalyEngine`)

The engine identifies 4 primary operational incidents and 1 baseline equilibrium:
1. `POSSIBLE_OIL_SPILL_SURFACE_ANOMALY`:
   - Corroborated when SAR dark backscatter candidates align with favorable oceanographic wind ranges ($3\text{--}12\text{ m/s}$) and nearby vessel transits.
   - **Conflict Detection:** If ocean wind speed is $< 3.0\text{ m/s}$, the engine flags a **Low Wind Calm Look-alike** conflict and adds natural slick alternatives (biogenic films, internal waves).
2. `POSSIBLE_WATER_QUALITY_ANOMALY`:
   - Triggered when Sentinel-2 optical proxies show elevated SPM/turbidity ($> 2.0$) or high chlorophyll ($> 0.15$), supported by in-situ dissolved oxygen depletion.
3. `POSSIBLE_UNUSUAL_VESSEL_ACTIVITY`:
   - Triggered by AIS transponder gaps ($> 3\text{ hours}$) or vessel loitering ($< 2\text{ knots}$) near marine protected zones or dark patches.
4. `POSSIBLE_MARINE_ENVIRONMENTAL_STRESS`:
   - Triggered by sea surface temperatures exceeding local bleaching thresholds ($> 30.5^\circ\text{C}$).
5. `BASELINE_EVALUATION`:
   - Default condition when all sensors report nominal background parameters.

---

## 7. Nugen Neural Deliberation Integration
The Lead Orchestrator packages the multi-agent evidence summary, spatial correlations, and environmental context into a prompt submitted to `nugen_service.deliberate()`.
- **Primary Mode:** `NUGEN_NEURAL_REASONING` using the fine-tuned aligned reasoning model.
- **Fail-Safe Fallback:** If the neural inference service times out or is unconfigured, the orchestrator automatically generates a deterministic `HEURISTIC_RULE_BASED` deliberation report without interruption.

---

## 8. REST API Endpoints (`/api/v1/orchestration/*`)
- `POST /api/v1/orchestration/investigate`: Triggers an evidence-based multi-agent investigation.
- `GET /api/v1/orchestration/status/{id}`: Returns real-time execution status and agent execution latencies.
- `GET /api/v1/orchestration/assessment/{id}`: Retrieves complete assessment with full correlations and reasoning.
- `GET /api/v1/orchestration/evidence/{id}`: Returns normalized evidence records, data tier counts, and provenance.
- `GET /api/v1/orchestration/history`: Lists chronological investigation history with search filters.
- `GET /api/v1/orchestration/export/{id}?format=markdown|json`: Downloads a formatted intelligence report.

---

## 9. Verification & Acceptance Summary
- **Backend Test Suite:** 22/22 tests passing in `backend/tests/test_orchestration.py`.
- **Regression Suite:** 100% pass across IoT, AIS, Data Integrity, SAR Phase 1, Nugen, and Oceanographic Phase 2.
- **Frontend Production Build:** `tsc -b && vite build` succeeded in 1.54s with zero errors.
