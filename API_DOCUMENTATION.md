# ORCA REST API Documentation & Endpoint Reference
**Indradhanu Hackathon 2026: AI for Greener Tomorrow**  
*Marine Ecosystem Reasoning with Collaborative Autonomous Agents*

---

## 1. Overview & Base Configuration

- **Base URL**: `http://127.0.0.1:8000/api/v1`
- **Interactive OpenAPI Documentation (Swagger UI)**: `http://127.0.0.1:8000/docs`
- **Alternative ReDoc Documentation**: `http://127.0.0.1:8000/redoc`
- **Authentication**: Public endpoints operate openly. Hardware telemetry ingestion requires header `X-ORCA-DEVICE-KEY`.

---

## 2. System & Health Endpoints

### `GET /api/v1/health`
Returns the operational health and connectivity status of the backend API.
```json
{
  "status": "HEALTHY",
  "version": "1.0.0",
  "timestamp": "2026-11-04T05:30:00Z",
  "components": {
    "sar_agent": "ONLINE",
    "optical_agent": "ONLINE",
    "oceanographic_agent": "ONLINE",
    "ais_agent": "ONLINE",
    "iot_agent": "ONLINE",
    "orchestrator": "ONLINE"
  }
}
```

---

## 3. Sentinel-1 SAR Radar Agent Endpoints (`/api/v1/sar`)

### `GET /api/v1/sar/products`
Searches Copernicus Data Space Ecosystem (CDSE) for Sentinel-1 Level-1 GRD SAR products.
- **Query Parameters**:
  - `limit` (integer, default: 10): Max number of products.
  - `zone_id` (string, optional): Target ocean monitoring zone.

### `GET /api/v1/sar/products/{product_id}/assets`
Inspects available assets for a Sentinel-1 product, distinguishing between public quicklook thumbnails and authenticated S3 raster granules.

### `POST /api/v1/sar/products/{product_id}/download-asset`
Stages or downloads a SAR asset.
- **Request Body**:
  ```json
  {
    "product_id": "S1A_IW_GRDH_1SDV_...",
    "asset_key": "thumbnail"
  }
  ```

### `POST /api/v1/sar/process`
Executes radar backscatter calibration, speckle filtering, and dark slick candidate extraction.
- **Request Body**:
  ```json
  {
    "product_id": "S1A_IW_GRDH_1SDV_...",
    "zone_id": "zone-01",
    "asset_key": "thumbnail",
    "allow_synthetic_fallback": false
  }
  ```

### `GET /api/v1/sar/analyses`
Lists persistent SAR analysis history with extracted slick candidates and radar statistics.

---

## 4. Sentinel-2 Optical Agent Endpoints (`/api/v1/optical`)

### `GET /api/v1/optical/products`
Discovers Sentinel-2 Level-2A multispectral products from Copernicus STAC.

### `GET /api/v1/optical/products/{product_id}/assets`
Inspects available optical spectral bands (B02 Blue, B03 Green, B04 Red, B08 NIR, B05/B06 Red Edge) and preview visualizer assets.

### `POST /api/v1/optical/products/{product_id}/download-asset`
Stages an optical asset from CDSE OData.

### `POST /api/v1/optical/process`
Performs multispectral aquatic extraction, cloud screening, and NDCI / SPM proxy calculations.
- **Request Body**:
  ```json
  {
    "product_id": "S2A_MSIL2A_...",
    "zone_id": "zone-02",
    "asset_key": "thumbnail",
    "allow_synthetic_fallback": false
  }
  ```

### `GET /api/v1/optical/analyses`
Retrieves past optical multispectral processing runs with generated PNG visualizations and indicator summaries.

---

## 5. Copernicus Marine Oceanographic Endpoints (`/api/v1/oceanographic`)

### `GET /api/v1/oceanographic/datasets`
Lists available Copernicus Marine Service (CMEMS) numerical models and in-situ products.

### `GET /api/v1/oceanographic/presets`
Lists maritime preset zones (Persian Gulf, Great Barrier Reef, North Sea, Strait of Malacca, Gulf of Mexico).

### `POST /api/v1/oceanographic/point-query`
Queries real-time oceanographic physical parameters at specific coordinates.
- **Request Body**:
  ```json
  {
    "latitude": 26.5,
    "longitude": 53.0,
    "location_name": "Persian Gulf"
  }
  ```

### `POST /api/v1/oceanographic/sar-context`
Computes oceanographic current vectors, waves, and sea surface temperature directly at a detected SAR oil slick candidate location.

---

## 6. AIS Vessel Intelligence Endpoints (`/api/v1/ais`)

### `GET /api/v1/ais/status`
Reports AIS provider configuration, connection mode (`NOT CONNECTED`, `DEMO`, or `LIVE`), and cached vessel counts.

### `POST /api/v1/ais/toggle-demo`
Toggles controlled demonstration mode on or off:
```json
{
  "demo_mode": true
}
```

### `GET /api/v1/ais/vessels`
Returns tracked vessel positions with kinematic data, navigation status, data mode, and timestamp freshness.

### `GET /api/v1/ais/vessels/{mmsi}`
Returns individual vessel detail with historical track breadcrumbs.

### `POST /api/v1/ais/analyze`
Executes kinematic behavioral anomaly detection across the tracked fleet.

### `GET /api/v1/ais/anomalies`
Returns active behavioral anomalies (`UNUSUAL_LOITERING`, `SIGNAL_GAP_DARK_ACTIVITY`, `REPEATED_COURSE_CHANGES`, `SENSITIVE_AREA_ACTIVITY`).

### `GET /api/v1/ais/correlations`
Returns cross-agent correlations between AIS vessels and satellite targets (SAR slicks / optical plumes).

---

## 7. In-Situ IoT & Virtual ESP32 Buoy Endpoints (`/api/v1/iot` & `/api/v1/telemetry`)

### `GET /api/v1/iot/devices`
Lists registered IoT buoy devices and their operational status.

### `GET /api/v1/iot/status`
Returns current Virtual ESP32 Buoy state (`RUNNING`, `STOPPED`, `OFFLINE`) and active simulation scenario.

### `GET /api/v1/iot/telemetry`
Returns the latest multi-parameter CTD reading (temperature, pH, dissolved oxygen, salinity, turbidity, battery, signal).

### `POST /api/v1/iot/scenario`
Switches the virtual buoy simulation scenario:
- **Scenarios**: `normal`, `anomaly`, `offline`.
```json
{
  "scenario": "anomaly",
  "reason": "Simulated coastal sediment discharge"
}
```

### `POST /api/v1/iot/simulation/start` & `POST /api/v1/iot/simulation/stop`
Starts or halts automated simulated packet generation.

### `POST /api/v1/telemetry/ingest`
Secure hardware ingestion endpoint for physical ESP32 buoys transmitting real sensor readings.
- **Headers**: `X-ORCA-DEVICE-KEY: <key>`
- **Request Body**:
  ```json
  {
    "device_id": "ESP32-ORCA-BUOY-REAL-01",
    "hardware_mac": "30:AE:A4:01:23:45",
    "firmware_version": "v1.2.0-esp32-orca",
    "zone_id": "zone-01",
    "water_temperature_c": 29.1,
    "dissolved_oxygen_mg_l": 5.9,
    "ph_level": 8.05,
    "salinity_psu": 35.2,
    "turbidity_ntu": 1.5,
    "battery_percentage": 97.5
  }
  ```

---

## 8. Multi-Agent Lead Orchestration Endpoints (`/api/v1/orchestration`)

### `GET /api/v1/orchestration/status`
Returns swarm agent availability, registered models, and health diagnostics.

### `POST /api/v1/orchestration/investigate`
Triggers an autonomous multi-agent cross-correlation deliberation for a specific zone and incident type.
- **Request Body**:
  ```json
  {
    "zone_id": "zone-01",
    "anomaly_type": "OIL_SPILL_SUSPECTED",
    "operator_notes": "Rapid multi-sensor response run"
  }
  ```

### `GET /api/v1/orchestration/evidence`
Retrieves compiled multi-agent evidence payload prior to neural reasoning deliberation.

### `GET /api/v1/orchestration/history`
Retrieves completed multi-agent marine intelligence assessments ordered by most recent first.

### `GET /api/v1/orchestration/export/{assessment_id}`
Exports a publication-ready marine intelligence dossier in `markdown` or `json` format:
- **Query Parameter**: `format=markdown` or `format=json`.
