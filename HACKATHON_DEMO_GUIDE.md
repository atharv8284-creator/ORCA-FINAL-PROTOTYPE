# ORCA Hackathon Live Demonstration Guide
**Indradhanu Hackathon 2026: AI for Greener Tomorrow**  
*Marine Ecosystem Reasoning with Collaborative Autonomous Agents*

---

## Executive Pitch (60 Seconds)

> "Marine monitoring today is fragmented. Satellites capture radar backscatter, optical sensors track chlorophyll, ocean models simulate currents, AIS tracks commercial ships, and coastal buoys measure water chemistry. When a marine disaster happens—an oil spill, toxic algal bloom, or industrial runoff—scientists and maritime authorities have to manually stitch together these disparate feeds across multiple portals.
>
> **ORCA** changes this. ORCA is an autonomous multi-agent intelligence platform that unifies 5 specialized agents under a central **Nugen-aligned Lead Orchestrator**. ORCA cross-correlates multi-sensor evidence across space, time, and physical hydrodynamics, isolates synthetic data from real observations, verifies vessel kinematic anomalies under international maritime law, and generates comprehensive, legally grounded intelligence dossiers in real time."

---

## Live Demonstration Script (Step-by-Step)

### Demo 1: The Command Center & Fleet Telemetry Overview
1. Open the browser to `http://127.0.0.1:5173`.
2. **Highlight the Dashboard**:
   - Point out the **Top Navigation Bar** with direct links to all specialized agent panels and the Central Lead Orchestrator.
   - Show the **8 System Overview Metrics** loaded dynamically from the live backend: Active Swarm Agents (5/5), Tracked Vessels (18), Virtual IoT Buoys (1), Optical S2 Analyses (14), SAR S1 Analyses (23), Oceanographic Datasets (4), System Health (99.8%), and Active Marine Anomalies.
   - Highlight the **Data Mode Indicators**: Transparent badges designating whether a feed is `LIVE`, `DEMO`, or `SIMULATED`.
   - Point out the **Agent Swarm Capability Cards**: Each card details real hardware/satellite dependencies, processing workflows, and explicit scientific limitations.
   - Show the **Central Intelligence Summary**: Displays the most recent Lead Orchestrator multi-agent correlation score, anomaly classification, and corroboration confidence.

### Demo 2: The Marine Intelligence GIS Map
1. Scroll down to the interactive **Leaflet Marine Intelligence Map** on the Dashboard (or click *Satellite Mapping*).
2. Demonstrate the **5 Layer Toggles** in the top-right corner of the map:
   - **Sentinel-1 SAR Radar Footprints**: Shows synthetic aperture radar swaths with detected low-backscatter oil slick candidates.
   - **Sentinel-2 Optical Footprints**: Shows optical multispectral footprints with high-turbidity sediment and chlorophyll plume vectors.
   - **AIS Surface Vessels**: Shows real-time vessel positions with custom directional SVG arrows colored by risk level (green for normal, amber for loitering, red for unauthorized transit).
   - **IoT Buoy Network**: Shows in-situ buoys with pulse animation and live sensor readouts.
   - **Copernicus Current Vectors**: Shows hydrodynamic drift arrows indicating physical ocean transport direction.
3. Click on any vessel or anomaly marker to inspect the popup showing exact coordinates, speed, heading, MMSI, and scientific provenance.

### Demo 3: Sentinel-1 SAR Oil Slick Anomaly Detection
1. Click **SAR Monitoring** in the top navigation or sidebar (`/sar`).
2. Show the active SAR catalog querying Copernicus Data Space Ecosystem (CDSE) open STAC API.
3. Demonstrate selecting a product (e.g. Persian Gulf or North Sea) and running sigma-0 backscatter analysis:
   - Lee speckle filtering
   - Decibel backscatter calibration ($\sigma^0$)
   - Adaptive Otsu thresholding for dark slick candidate extraction
   - Geometric feature extraction (area in $\text{km}^2$, perimeter, centroid, contrast dB)
4. Highlight that full S3 rasters require authenticated ESA credentials, while public quicklooks are staged transparently without silent mock substitution.

### Demo 4: Sentinel-2 Multispectral Water Quality & Optical Indicators
1. Click **Optical Satellite** in the top navigation (`/optical`).
2. Show how Sentinel-2 Level-2A imagery is processed:
   - Multi-channel radiometric normalization
   - Cloud masking and aquatic pixel extraction
   - **NDCI (Normalized Difference Chlorophyll Index)** proxy calculation for algal bloom risk
   - **SPM (Suspended Particulate Matter)** turbidity proxy calculation
3. Point out the mandatory scientific integrity disclosure: *"Optical indices represent relative surface proxies, NOT direct lab-certified toxin concentrations."*

### Demo 5: AIS Vessel Behavioral Analytics & Maritime Law Guardrails
1. Click **AIS Vessel Tracking** (`/ais`).
2. Toggle between **Unconfigured** (honest `NOT CONNECTED` status) and **Demonstration Mode** (`DEMO`).
3. Show the **Kinematic Anomaly Detection Engine**:
   - `UNUSUAL_LOITERING`: Speed < 2.0 kts in open sea for commercial cargo/tankers.
   - `SIGNAL_GAP_DARK_ACTIVITY`: Transponder silence exceeding ITU-R reporting intervals.
   - `REPEATED_COURSE_CHANGES`: Sharp zig-zagging indicating maneuvers or evasive routing.
   - `SENSITIVE_AREA_ACTIVITY`: Unauthorized entry into Marine Protected Areas (e.g. Great Barrier Reef).
4. Highlight the **Rule 8 Maritime Law Guardrail**:
   - The platform strictly states: *"Spatial proximity to an anomaly does NOT prove causation or intentional discharge liability under international maritime law."*

### Demo 6: Virtual ESP32 Marine Buoy & Hardware Ingestion
1. Click **IoT Buoy Monitoring** (`/iot`).
2. Point out the Virtual ESP32 Buoy (`ORCA-BUOY-001`) with all 7 physical water parameters (DO, pH, Turbidity, Salinity, Temperature, Battery, Signal).
3. Demonstrate live scenario switching:
   - Switch from `NORMAL` $\to$ `ANOMALY`: Turbidity surges (>25 NTU), water temperature spikes, and hypoxia triggers instant anomaly alerts.
   - Switch to `OFFLINE`: Telemetry safely freezes, packet sequence stops, and status shows `OFFLINE`.
   - Switch back to `NORMAL`: Baseline restored.
4. Highlight the **Hardware Ingestion Interface**: Show that physical ESP32 buoys can post to `/api/v1/telemetry/ingest` with `X-ORCA-DEVICE-KEY` to flip status to `LIVE`.

### Demo 7: Central Lead Orchestration & Multi-Agent Intelligence Dossiers
1. Click **Lead Orchestrator** in the top navigation (`/orchestration`).
2. Trigger an **Autonomous Multi-Agent Investigation**:
   - Select a target zone (e.g. `zone-01` Persian Gulf or `zone-02` Great Barrier Reef) and incident scenario (`OIL_SPILL_SUSPECTED` or `REEF_STRESS_ANOMALY`).
   - Click **Run Multi-Agent Investigation**.
   - Watch the orchestrator query all 5 agents concurrently.
   - Inspect the **Spatial Proximity Engine**: Computes exact Haversine distances between satellite slicks and nearby vessels.
   - Inspect the **Temporal Compatibility Engine**: Evaluates time windows and freshness.
   - Inspect the **Physical Drift Engine**: Uses Copernicus Marine current vectors to test whether a slick could physically drift from a vessel's prior track.
   - Inspect the **Nugen Neural Deliberation**: Generates hypothesis scoring, conflicting evidence isolation, and prioritized response recommendations.
3. Go to **Incident Reports & Dossiers** (`/reports`).
4. Click **View Full Dossier** on any investigation to inspect the complete multi-sensor evidence table, reasoning narrative, and legal disclaimers.
5. Click **Download Markdown (.md)** or **Download JSON (.json)** to export a publication-ready investigation dossier.

---

## Key Differentiators to Emphasize to Judges

| Feature | Legacy Systems | ORCA Innovation |
| :--- | :--- | :--- |
| **Data Integrity** | Silently mocks missing data | **Zero silent substitution**: Transparently flags `SIMULATED`, `DEMO`, and `LIVE` |
| **Agent Coordination** | Siloed standalone dashboards | **Central Lead Orchestrator** with multi-agent evidence correlation |
| **Scientific Honesty** | Claims satellite proxies are lab truth | Distinguishes optical proxies from direct chemical measurements |
| **Legal Compliance** | Blames nearest vessel for spills | Enforces Rule 8: proximity $\neq$ causation without hydrodynamic proof |
| **Deployment** | Complex multi-cluster cloud required | **100% locally runnable** with lightweight FastAPI + Vite |
