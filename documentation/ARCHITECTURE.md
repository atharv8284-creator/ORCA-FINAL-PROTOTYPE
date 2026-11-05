# ORCA System Architecture

## Marine Ecosystem Reasoning with Collaborative Autonomous Agents
**Hackathon:** Indradhanu Hackathon 2026: AI for Greener Tomorrow

---

## 1. High-Level Architecture Overview

ORCA is an autonomous multi-agent ecological intelligence platform engineered to observe, reason about, and safeguard vulnerable marine biomes (coral reefs, oceanic trenches, coastal wetlands, and hypoxic basins).

```
                      +------------------------------------------+
                      |         ORCA Command Center (UI)         |
                      |   React 19 + TypeScript + Vite + Tailwind|
                      |   Leaflet GIS Maps + Recharts Analytics   |
                      +--------------------+---------------------+
                                           |  REST API & State
                                           v
                      +------------------------------------------+
                      |          FastAPI Application Core        |
                      |       (Pydantic Validation & Async)      |
                      +----+--------------------------------+----+
                           |                                |
            +--------------v-------------+     +------------v--------------+
            |  Multi-Agent Engine        |     |  Telemetry Simulator &    |
            |  Collaborative Deliberation|     |  Hydrographic Streamer    |
            |  - Reef Sentinel           |     |  - Temperature & Anomaly  |
            |  - Thermal Recon           |     |  - Dissolved Oxygen (DO)  |
            |  - Acoustic Profiler       |     |  - Ocean pH & Salinity    |
            |  - Blue Carbon Observer    |     |  - Microplastics Index    |
            +--------------+-------------+     +------------+--------------+
                           |                                |
                           +---------------+----------------+
                                           |
                                           v
                      +------------------------------------------+
                      |        PostgreSQL + PostGIS Database     |
                      |   - Spatial Point & Polygon Boundaries   |
                      |   - GiST Spatial Indices (EPSG:4326)     |
                      |   - Time-series Telemetry & Alert Logs   |
                      +------------------------------------------+
```

---

## 2. Collaborative Autonomous Agent Architecture

ORCA employs a decentralized reasoning network of autonomous marine agents operating with distinct specializations:

1. **Reef Sentinel (`REEF_SENTINEL`)**:
   - Focuses on shallow benthic ecosystems.
   - Monitors coral bleaching, zooxanthellae expulsion, and calcification rates.
   - Triggers localized shading protocols and automated reef triage.

2. **Thermal Recon (`THERMAL_SCANNER`)**:
   - Analyzes Sea Surface Temperature (SST) and thermocline compression.
   - Calculates Degree Heating Weeks (DHW) to forecast thermal mortality thresholds.

3. **Acoustic Profiler (`ACOUSTIC_PROFILER`)**:
   - Performs passive acoustic hydrophone monitoring.
   - Detects illegal, unreported, and unregulated (IUU) fishing vessels operating with AIS transmitters disabled ("dark vessels") and tracks cetacean vocalizations.

4. **Blue Carbon Observer (`CARBON_SINK_OBSERVER`)**:
   - Profiles seagrass meadows, mangrove margins, and dissolved inorganic carbon fluxes.
   - Quantifies blue carbon sequestration and ocean acidification stress.

5. **Patrol Swarm (`PATROL_SWARM`)**:
   - Deep benthic anoxia sensors detecting oxygen depletion zones (ODZs) and toxic hydrogen sulfide plumes.

---

## 3. PostGIS Geospatial Engine

The data layer models marine geographies natively:
- **Marine Protected Area (MPA) boundaries** stored as PostGIS `POLYGON` geometries in WGS 84 (`SRID=4326`).
- **Centroids and dynamic agent positions** stored as `POINT` geometries.
- **Spatial queries**:
  - `ST_DWithin` calculates nearby agents within a threat radius.
  - `ST_Contains` verifies whether anomalous telemetry falls within protected sanctuary boundaries.
  - `ST_Area` evaluates affected coral zones.

---

## 4. Frontend Design System

- **Dark Oceanic Palette**: Abyss Navy (`#050c18`, `#0a1628`), Ocean Blue (`#0ea5e9`), and Bioluminescent highlights (Cyan `#00e5ff`, Teal `#0df2c9`, Amber `#f59e0b`, Crimson `#f43f5e`).
- **GIS Cartography**: Leaflet interactive map with custom colored biome boundaries, live agent telemetry pulses, and status popups.
- **Analytics Visualization**: Recharts time-series charting showing temperature anomalies, dissolved oxygen, and pH shifts.
- **Autonomous Reasoning Feed**: Transparent, step-by-step consensus logs displaying how multiple agents form hypotheses and decide on ecological interventions.
