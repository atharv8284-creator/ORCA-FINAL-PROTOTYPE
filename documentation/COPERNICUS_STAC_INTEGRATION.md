# Copernicus Data Space Ecosystem STAC Integration

This document describes the real-world satellite data integration implemented in **ORCA (Marine Ecosystem Reasoning with Collaborative Autonomous Agents)**.

---

## 1. Overview & Data Source

- **Provider**: European Space Agency (ESA) & European Commission – **Copernicus Data Space Ecosystem (CDSE)**
- **STAC Catalog Root**: `https://stac.dataspace.copernicus.eu/v1/`
- **STAC Search Endpoint**: `https://stac.dataspace.copernicus.eu/v1/search`
- **Official Documentation**: [https://documentation.dataspace.copernicus.eu/APIs/STAC.html](https://documentation.dataspace.copernicus.eu/APIs/STAC.html)
- **Specification Standard**: SpatioTemporal Asset Catalog (STAC) v1.0.0

---

## 2. Integrated Missions & Collections

### A. Sentinel-1 SAR (Synthetic Aperture Radar)
- **Collection ID**: `sentinel-1-grd` (Ground Range Detected)
- **Sensor Type**: C-Band SAR (Center frequency: 5.405 GHz)
- **Primary Capabilities**: All-weather, day-and-night sea surface imaging; ocean surface roughness and capillary wave attenuation.
- **Key Metadata Extracted**:
  - `platform` (`sentinel-1a`, `sentinel-1b`, `sentinel-1c`)
  - `sar:instrument_mode` (`IW`, `EW`, `SM`, `WV`)
  - `s1:polarizations` (`VV`, `VH`, `HH`, `HV`)
  - `sat:orbit_state` (Ascending / Descending)
  - `sat:relative_orbit`
  - Asset inventory: `Product`, `thumbnail`, `vv`, `vh`, `safe_manifest`

### B. Sentinel-2 MSI (Multi-Spectral Instrument)
- **Collection ID**: `sentinel-2-l2a` (Surface Reflectance / Bottom-of-Atmosphere)
- **Sensor Type**: 13 Spectral Bands (Visible, NIR, SWIR: 443 nm – 2190 nm)
- **Primary Capabilities**: 10-meter ground resolution for coastal water quality, chlorophyll-a turbidity, sediment plumes, and macroalgae.
- **Key Metadata Extracted**:
  - `platform` (`sentinel-2a`, `sentinel-2b`, `sentinel-2c`)
  - `eo:cloud_cover` (Percentage $0\% - 100\%$)
  - `sat:orbit_state`
  - Asset inventory: `TCI_10m` (True Color Image), `B02_10m`, `B03_10m`, `B04_10m`, `B08_10m`, `CLD_20m`, `thumbnail`

---

## 3. Backend API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/satellite/copernicus/status` | Real-time health check, latency measurement, STAC version, and auth configuration. |
| `POST` | `/api/v1/satellite/sentinel-1/search` | Query real Sentinel-1 SAR observations by bounding box, date range, and product ID. |
| `GET` | `/api/v1/satellite/sentinel-1/search` | GET query parameter convenience endpoint for Sentinel-1 searches. |
| `POST` | `/api/v1/satellite/sentinel-2/search` | Query real Sentinel-2 MSI Level-2A observations with cloud cover filtering. |
| `GET` | `/api/v1/satellite/sentinel-2/search` | GET query parameter convenience endpoint for Sentinel-2 searches. |
| `GET` | `/api/v1/satellite/products/{product_id}` | Retrieve item metadata, footprint geometry, and asset download links by STAC item ID. |

---

## 4. Scientific Rigor & Multi-Stage Processing Lifecycle

In accordance with earth observation best practices, ORCA strictly **distinguishes satellite metadata discovery from image processing**. The existence of a satellite scene does **not** indicate an oil spill or ecological disaster.

Each satellite observation is categorized into a 5-stage lifecycle:

```
[1. Product Discovered] ──► [2. Asset Available] ──► [3. Image Downloaded] ──► [4. Image Processed] ──► [5. Anomaly Analysis Completed]
    (STAC Catalog)             (COG/XML Links)            (Staged Raster)         (Radiometric Cal)         (Nugen Neural Inference)
```

1. **Product Discovered**: Verified orbital acquisition covering the geographical coordinates within the specified temporal window.
2. **Asset Available**: STAC asset references (TCI, polarizations, manifests) verified in the CDSE catalog.
3. **Image Downloaded**: Full raw granule queued or staged into localized compute storage.
4. **Image Processed**: Radiometric calibration, speckle filtering, and atmospheric correction applied.
5. **Anomaly Analysis Completed**: Multimodal reasoning executed by the ORCA autonomous swarm (e.g. dark vessel acoustic cross-referencing, chlorophyll-a threshold detection).

---

## 5. Authentication Configuration

### STAC Metadata Discovery (Open & Free)
The Copernicus Data Space Ecosystem STAC API (`https://stac.dataspace.copernicus.eu/v1/search`) is open and allows unauthenticated searches. No API key or token is required for discovering products, inspecting cloud cover, or viewing thumbnails.

### Full Granule Downloads (OAuth2 Token Required)
Downloading full raster datasets (COG/SAFE format) requires a free account from [https://dataspace.copernicus.eu/](https://dataspace.copernicus.eu/).

To configure credentials, add the following to your `.env` file:
```bash
# Copernicus Data Space Ecosystem OAuth2 Credentials
COPERNICUS_CLIENT_ID=your_client_id_here
COPERNICUS_CLIENT_SECRET=your_client_secret_here

# Alternatively via Username/Password:
COPERNICUS_USERNAME=your_email@example.com
COPERNICUS_PASSWORD=your_password
```
Tokens are generated via:
`https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token`

---

## 6. Live API Verification Results

A live integration test was conducted against `https://stac.dataspace.copernicus.eu/v1/`:

- **Endpoint Ping**: `HTTP 200 OK`
- **Reported Latency**: $\approx 710 \text{ ms}$
- **STAC Version**: `1.0.0`
- **Sentinel-1 Query**: Successfully returned real GRD products (`S1A_IW_GRDH_1SDV_20240601T062804...`) with 11 assets listed.
- **Sentinel-2 Query**: Successfully returned real MSI Level-2A products (`S2A_MSIL2A_20240604T110621...`) with cloud cover percentage ($30.85\%$) and 47 assets listed.
