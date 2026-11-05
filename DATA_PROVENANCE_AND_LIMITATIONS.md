# Data Provenance, Limitations & Scientific Integrity Disclosures
**Indradhanu Hackathon 2026: AI for Greener Tomorrow**  
*Marine Ecosystem Reasoning with Collaborative Autonomous Agents*

---

## 1. Principles of Scientific Integrity in ORCA

ORCA is engineered around three non-negotiable principles of scientific and legal integrity:

1. **Anti-Fabrication & Zero Silent Substitution**:
   When an external data provider or physical hardware sensor is offline or unconfigured, ORCA **strictly reports `NOT CONNECTED` or `FAILED`**. Under no circumstances does the platform silently substitute fake or synthetic data under the guise of live telemetry.

2. **Explicit Data Mode Tiering**:
   Every piece of evidence, API payload, and user interface element carries an explicit provenance badge:
   - `LIVE`: Verified telemetry from authenticated physical hardware or live satellite/oceanographic API feeds.
   - `DEMO`: Controlled demonstration fixtures clearly labeled for feature verification.
   - `SIMULATED`: In-memory physics-based mathematical models and synthetic scenarios.
   - `NOT CONNECTED`: Honest notification of missing external credentials or offline transceivers.

3. **Separation of Proxies from Ground Truth**:
   Satellite remote sensing calculates radiometric proxies of surface conditions. ORCA never presents optical or radar indices as certified laboratory ground truth.

---

## 2. Sensor Capabilities, Provenance & Scientific Disclosures

### A. Sentinel-1 Synthetic Aperture Radar (SAR)
- **Data Source**: European Space Agency (ESA) Sentinel-1 C-SAR via Copernicus Data Space Ecosystem (CDSE).
- **Measurement**: Radar backscatter in decibels ($\sigma^0\text{ dB}$).
- **Scientific Reality**:
  - Oil slicks dampen capillary-gravity waves on the sea surface, appearing as dark regions with decreased backscatter.
  - **Look-Alike Ambiguity**: Natural look-alikes (low wind areas $< 3\text{ m/s}$, biogenic grease slicks, algal scum, internal waves, rain cells) produce dark radar signatures nearly identical to crude oil.
  - **Platform Policy**: Low-backscatter candidates are classified as *Dark Slick Candidates* and require multi-sensor cross-corroboration (optical, currents, vessel proximity) before confirming a petroleum spill.

### B. Sentinel-2 Multispectral Optical Remote Sensing
- **Data Source**: European Space Agency (ESA) Sentinel-2 MSI via Copernicus Data Space Ecosystem.
- **Measurements**: Top-of-Atmosphere (TOA) and Bottom-of-Atmosphere (BOA) surface reflectance.
- **Derived Indices**:
  - **NDCI (Normalized Difference Chlorophyll Index)**: Evaluates relative surface phytoplankton density.
  - **SPM (Suspended Particulate Matter)**: Evaluates relative coastal turbidity and sediment runoff.
- **Scientific Reality**:
  - Optical sensors cannot penetrate cloud cover, heavy maritime fog, or night-time conditions.
  - Relative spectral indices reflect surface optical properties only and **do NOT represent direct measurements of chemical toxins, heavy metals, microplastics, or laboratory-certified coliform counts**.

### C. Copernicus Marine Service (CMEMS) Hydrodynamics
- **Data Source**: Mercator Ocean International / Copernicus Marine Environment Monitoring Service.
- **Measurements**: NEMO numerical model assimilations and MFWAM wave spectrum forecasts.
- **Classification**:
  - Real-time in-situ/satellite observations are classified as `OBSERVATION`.
  - Reanalysis model physics are classified as `MODEL_ANALYSIS`.
  - Future projections are classified as `FORECAST`.
- **Limitation**: Model grid resolutions (typically $1/12^\circ \approx 9\text{ km}$) may smooth hyper-localized coastal boundary currents and harbor eddies.

### D. Automatic Identification System (AIS) Vessel Tracking
- **Data Source**: Terrestrial VHF receiver stations and Low Earth Orbit (LEO) satellite transponder networks.
- **Measurements**: Speed Over Ground (SOG), Course Over Ground (COG), Navigational Status, MMSI, Lat/Lon.
- **Rule 8 Maritime Law Guardrail**:
  > *"AIS signal gaps or kinematic anomalies (e.g. loitering, speed drops) frequently occur due to line-of-sight propagation cutoffs, squall RF attenuation, or standard SOLAS safety maneuvers. Under international maritime law, spatial proximity of a vessel to a marine anomaly does NOT prove causation, liability, or intentional discharge."*

### E. In-Situ IoT Marine Buoy (Virtual ESP32)
- **Data Source**: ORCA Virtual ESP32 Buoy simulator & physical ESP32 hardware ingest endpoint.
- **Measurements**: DO ($\text{mg/L}$), pH, Turbidity ($\text{NTU}$), Salinity ($\text{PSU}$), Temperature ($^\circ\text{C}$).
- **Isolation Policy**:
  > *"Virtual ESP32 buoy telemetry is strictly marked `SIMULATED`. Parameter spikes demonstrate anomaly detection logic and must NEVER be reported as real environmental pollution."*
