import type {
  MarineZone,
  MarineAgent,
  EcosystemTelemetry,
  AgentReasoningLog,
  EcologicalAlert,
  SystemHealth,
  SatellitePass,
  AISVessel,
  IoTBuoy,
  NugenModelMetrics,
  DataSourceHealth,
  OceanographicObservation,
  SatelliteSearchQuery,
  CopernicusSearchResponse,
  CopernicusSatelliteProduct,
  CopernicusServiceHealth,
  SARDependencyStatus,
  SARProductAssetResponse,
  SARDownloadResponse,
  SARProcessingRequest,
  SARProcessingResult,
  CopernicusMarineHealth,
  CopernicusMarineDataset,
  CopernicusMarineVariable,
  OceanographicQueryRequest,
  OceanographicProfileResponse,
  OceanographicTimeSeriesResponse,
  MaritimePreset,
  SAROceanContextRequest,
  SAROceanContext,
  AISProviderStatus,
  AISVesselPosition,
  AISVesselMovement,
  AISQueryFilter,
  AISVesselResponse,
  AISVesselDetailedView,
  AISAnomalyReport,
  AISCrossAgentCorrelation,
  AISAnalyzeRequest,
  AISAnalyzeResponse,
  NugenIntegrationStatus,
  OpticalProcessingResult,
  OpticalProcessRequest,
  OpticalProductAssetsResponse,
  OpticalDownloadResponse,
  IoTDeviceStatusResponse,
  IoTBuoyItem,
  VirtualESP32Telemetry,
  IoTAnomalyEvent,
  VirtualESP32DeviceDetail,
  IoTStatusResponse,
  IoTScenarioType,
  IoTScenarioChangeResponse,
  IoTHistoryResponse,
  MultiAgentInvestigationRequest,
  FinalMarineIntelligenceAssessment,
  OrchestrationStatusResponse,
  OrchestrationHistoryResponse,
  UnifiedEvidenceRecord
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

async function fetchJson<T>(endpoint: string, fallback: T, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {})
      }
    });
    if (!res.ok) {
      console.warn(`API call ${endpoint} returned status ${res.status}`);
      return fallback;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.info(`Backend API unavailable at ${endpoint}, serving local intelligence dataset:`, err);
    return fallback;
  }
}

// ============================================================================
// CLEARLY LABELLED SAMPLE DATASETS (FOR SATELLITE, AIS, BUOY & NUGEN AI STACKS)
// ============================================================================

export const SAMPLE_SATELLITE_PASSES: SatellitePass[] = [
  {
    id: "SAT-S1A-20261031-01",
    satellite: "Sentinel-1A (SAR)",
    sensor_type: "SAR C-Band",
    pass_timestamp: "2026-10-31T09:42:15Z",
    coverage_area: "Galapagos Marine Reserve Corridor",
    swath_width_km: 250,
    resolution_meters: 10,
    latitude: 1.6800,
    longitude: -91.8200,
    footprint_polygon: [
      [1.40, -92.20],
      [1.40, -91.40],
      [1.95, -91.40],
      [1.95, -92.20],
      [1.40, -92.20]
    ],
    cloud_cover_pct: 0,
    anomaly_detected: true,
    anomaly_type: "Dark Vessel Echo",
    status: "COMPLETED"
  },
  {
    id: "SAT-S2B-20261031-02",
    satellite: "Sentinel-2B (MSI)",
    sensor_type: "Multispectral Optical",
    pass_timestamp: "2026-10-31T08:15:30Z",
    coverage_area: "Great Barrier Reef - Ribbon Reef",
    swath_width_km: 290,
    resolution_meters: 10,
    latitude: -15.4200,
    longitude: 145.8500,
    footprint_polygon: [
      [-15.15, 145.55],
      [-15.15, 146.15],
      [-15.70, 146.15],
      [-15.70, 145.55],
      [-15.15, 145.55]
    ],
    cloud_cover_pct: 12,
    anomaly_detected: true,
    anomaly_type: "Thermal Bleaching Anomaly",
    status: "COMPLETED"
  },
  {
    id: "SAT-L9-20261031-03",
    satellite: "Landsat-9 (OLI-2)",
    sensor_type: "Thermal Infrared",
    pass_timestamp: "2026-10-31T06:50:00Z",
    coverage_area: "Baltic Sea Gotland Deep Basin",
    swath_width_km: 185,
    resolution_meters: 30,
    latitude: 57.3000,
    longitude: 19.2000,
    footprint_polygon: [
      [57.05, 18.80],
      [57.05, 19.60],
      [57.55, 19.60],
      [57.55, 18.80],
      [57.05, 18.80]
    ],
    cloud_cover_pct: 24,
    anomaly_detected: true,
    anomaly_type: "Chlorophyll-a Plume",
    status: "COMPLETED"
  },
  {
    id: "SAT-MODIS-20261031-04",
    satellite: "MODIS Aqua",
    sensor_type: "Ocean Color Radiometer",
    pass_timestamp: "2026-10-31T05:12:45Z",
    coverage_area: "Sargasso Sea North Atlantic Gyre",
    swath_width_km: 2330,
    resolution_meters: 250,
    latitude: 28.3000,
    longitude: -64.5000,
    footprint_polygon: [
      [27.50, -65.20],
      [27.50, -63.80],
      [29.10, -63.80],
      [29.10, -65.20],
      [27.50, -65.20]
    ],
    cloud_cover_pct: 8,
    anomaly_detected: true,
    anomaly_type: "Oil Slick Film",
    status: "COMPLETED"
  },
  {
    id: "SAT-S1A-20261031-05",
    satellite: "Sentinel-1A (SAR)",
    sensor_type: "SAR C-Band",
    pass_timestamp: "2026-10-31T12:30:00Z",
    coverage_area: "Raja Ampat Misool Sanctuary",
    swath_width_km: 250,
    resolution_meters: 10,
    latitude: -2.1500,
    longitude: 130.2500,
    footprint_polygon: [
      [-1.90, 129.95],
      [-1.90, 130.55],
      [-2.40, 130.55],
      [-2.40, 129.95],
      [-1.90, 129.95]
    ],
    cloud_cover_pct: 0,
    anomaly_detected: false,
    anomaly_type: "None",
    status: "SCHEDULED"
  }
];

export const SAMPLE_AIS_VESSELS: AISVessel[] = [
  {
    mmsi: "412389102",
    vessel_name: "HAI LONG 818",
    callsign: "BXZ9",
    flag: "International Registry",
    vessel_type: "Fishing Trawler",
    speed_knots: 8.4,
    course_deg: 215,
    latitude: 1.6920,
    longitude: -91.8350,
    last_ping: "2026-10-31T10:15:00Z",
    ais_status: "SILENT_AIS_DISABLED",
    risk_level: "HIGH_RISK_IUU",
    proximity_zone: "Galapagos Marine Reserve"
  },
  {
    mmsi: "503921000",
    vessel_name: "PACIFIC SENTINEL",
    callsign: "VHE8",
    flag: "Australia",
    vessel_type: "Patrol Cutter",
    speed_knots: 16.2,
    course_deg: 142,
    latitude: -15.4120,
    longitude: 145.8600,
    last_ping: "2026-10-31T10:40:00Z",
    ais_status: "TRANSMITTING",
    risk_level: "NORMAL",
    proximity_zone: "Great Barrier Reef - Ribbon Sector"
  },
  {
    mmsi: "354128990",
    vessel_name: "OCEANIC VOYAGER",
    callsign: "HP41",
    flag: "Panama",
    vessel_type: "Cargo / Container",
    speed_knots: 19.5,
    course_deg: 88,
    latitude: 28.3200,
    longitude: -64.4800,
    last_ping: "2026-10-31T10:42:00Z",
    ais_status: "TRANSMITTING",
    risk_level: "NORMAL",
    proximity_zone: "Sargasso Sea Sanctuary"
  },
  {
    mmsi: "276891002",
    vessel_name: "BALTIC EXPLORER",
    callsign: "EST3",
    flag: "Estonia",
    vessel_type: "Reefer Vessel",
    speed_knots: 11.0,
    course_deg: 320,
    latitude: 57.2800,
    longitude: 19.1800,
    last_ping: "2026-10-31T09:55:00Z",
    ais_status: "TRANSMITTING",
    risk_level: "NORMAL",
    proximity_zone: "Baltic Gotland Basin"
  },
  {
    mmsi: "000998811",
    vessel_name: "UNKNOWN_RADAR_CONTACT_04",
    callsign: "UNREGISTERED",
    flag: "No Broadcast Flag",
    vessel_type: "Unflagged / Suspicious",
    speed_knots: 14.8,
    course_deg: 180,
    latitude: -2.1800,
    longitude: 130.2200,
    last_ping: "2026-10-31T08:30:00Z",
    ais_status: "SILENT_AIS_DISABLED",
    risk_level: "HIGH_RISK_IUU",
    proximity_zone: "Raja Ampat Coral Triangle"
  }
];

export const SAMPLE_IOT_BUOYS: IoTBuoy[] = [
  {
    buoy_id: "NDBC-41048",
    station_name: "West Bermuda Deep Pelagic Mooring",
    deployment_program: "NOAA NDBC",
    latitude: 28.2800,
    longitude: -64.5200,
    battery_pct: 92.4,
    solar_yield_watts: 48.5,
    sea_surface_temp_c: 26.8,
    wave_height_meters: 1.8,
    wave_period_sec: 7.2,
    wind_speed_knots: 14.2,
    status: "ONLINE",
    last_transmission: "2026-10-31T10:35:00Z"
  },
  {
    buoy_id: "ARGO-5906421",
    station_name: "Coral Sea Biogeochemical Profiler",
    deployment_program: "Argo Float Array",
    latitude: -15.4400,
    longitude: 145.8700,
    battery_pct: 88.0,
    solar_yield_watts: 32.0,
    sea_surface_temp_c: 31.1,
    wave_height_meters: 0.9,
    wave_period_sec: 5.4,
    wind_speed_knots: 8.5,
    status: "ONLINE",
    last_transmission: "2026-10-31T10:20:00Z"
  },
  {
    buoy_id: "OS-GOTLAND-01",
    station_name: "Gotland Deep Benthic Lander Array",
    deployment_program: "OceanSITES Mooring",
    latitude: 57.3200,
    longitude: 19.2200,
    battery_pct: 76.5,
    solar_yield_watts: 18.0,
    sea_surface_temp_c: 16.4,
    wave_height_meters: 1.2,
    wave_period_sec: 4.8,
    wind_speed_knots: 18.4,
    status: "ONLINE",
    last_transmission: "2026-10-31T10:12:00Z"
  },
  {
    buoy_id: "ORCA-GLIDER-09",
    station_name: "Darwin Arch Autonomous Wave Glider",
    deployment_program: "ORCA Custom Drone Buoy",
    latitude: 1.6850,
    longitude: -91.8250,
    battery_pct: 95.8,
    solar_yield_watts: 64.0,
    sea_surface_temp_c: 22.5,
    wave_height_meters: 2.1,
    wave_period_sec: 9.1,
    wind_speed_knots: 12.0,
    status: "ONLINE",
    last_transmission: "2026-10-31T10:44:00Z"
  }
];

export const SAMPLE_OCEANOGRAPHIC_OBSERVATIONS: OceanographicObservation[] = [
  {
    id: "OBS-GBR-CTD-01",
    station_id: "STN-GBR-RIBBON",
    station_name: "Ribbon Reef Northern Shelf CTD Station",
    zone_id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01",
    latitude: -15.4200,
    longitude: 145.8500,
    depth_meters: 22.0,
    recorded_at: "2026-10-31T10:30:00Z",
    water_temperature_c: 31.1,
    dissolved_oxygen_mg_l: 5.8,
    ph_level: 8.04,
    salinity_psu: 35.1,
    turbidity_ntu: 0.8,
    chlorophyll_mg_m3: 1.82,
    source: "PostGIS Spatial DB"
  },
  {
    id: "OBS-GAL-CTD-02",
    station_id: "STN-GAL-DARWIN",
    station_name: "Darwin & Wolf Pelagic Upwelling Hydrostation",
    zone_id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c02",
    latitude: 1.6800,
    longitude: -91.8200,
    depth_meters: 45.0,
    recorded_at: "2026-10-31T10:15:00Z",
    water_temperature_c: 22.4,
    dissolved_oxygen_mg_l: 6.4,
    ph_level: 8.16,
    salinity_psu: 34.8,
    turbidity_ntu: 0.4,
    chlorophyll_mg_m3: 2.45,
    source: "PostGIS Spatial DB"
  },
  {
    id: "OBS-RAJA-CTD-03",
    station_id: "STN-RAJA-MISOOL",
    station_name: "Misool Coral Benthic Sensor Cast",
    zone_id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c03",
    latitude: -2.1500,
    longitude: 130.2500,
    depth_meters: 18.0,
    recorded_at: "2026-10-31T09:50:00Z",
    water_temperature_c: 29.2,
    dissolved_oxygen_mg_l: 6.1,
    ph_level: 8.18,
    salinity_psu: 34.6,
    turbidity_ntu: 0.5,
    chlorophyll_mg_m3: 1.65,
    source: "PostGIS Spatial DB"
  },
  {
    id: "OBS-SAR-CTD-04",
    station_id: "STN-SAR-BATS",
    station_name: "Sargasso Central Gyre Hydrostation",
    zone_id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c04",
    latitude: 28.3000,
    longitude: -64.5000,
    depth_meters: 15.0,
    recorded_at: "2026-10-31T09:20:00Z",
    water_temperature_c: 26.5,
    dissolved_oxygen_mg_l: 6.9,
    ph_level: 8.12,
    salinity_psu: 36.8,
    turbidity_ntu: 0.2,
    chlorophyll_mg_m3: 0.42,
    source: "PostGIS Spatial DB"
  },
  {
    id: "OBS-BAL-CTD-05",
    station_id: "STN-BAL-GOTLAND",
    station_name: "Gotland Deep Anoxia Benthic Profiler",
    zone_id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c05",
    latitude: 57.3000,
    longitude: 19.2000,
    depth_meters: 75.0,
    recorded_at: "2026-10-31T10:05:00Z",
    water_temperature_c: 6.2,
    dissolved_oxygen_mg_l: 1.4,
    ph_level: 7.42,
    salinity_psu: 12.2,
    turbidity_ntu: 3.8,
    chlorophyll_mg_m3: 3.10,
    source: "PostGIS Spatial DB"
  }
];

export const SAMPLE_NUGEN_METRICS: NugenModelMetrics = {
  model_name: "Nugen Marine Reasoner 3.4-Flash",
  version: "v3.4.1-marine-spatial",
  architecture: "Multi-Modal Mixture of Ocean Experts (MoOE)",
  context_tokens: 128000,
  inference_latency_ms: 38.4,
  zero_shot_anomaly_accuracy_pct: 96.8,
  reasoning_coherence_score: 9.4,
  hallucination_guardrail_rate_pct: 99.7,
  active_reasoning_threads: 18,
  daily_token_processed: 4829100,
  last_checkpoint: "2026-10-30T23:00:00Z",
  engine_status: "OPTIMAL"
};

export const SAMPLE_DATA_SOURCES: DataSourceHealth[] = [
  {
    id: "SRC-COP-01",
    name: "Copernicus Sentinel Hub (ESA)",
    provider: "European Space Agency",
    feed_type: "Satellite Telemetry",
    latency_ms: 124,
    uptime_pct: 99.94,
    status: "OPERATIONAL",
    last_sync: "2026-10-31T10:40:00Z",
    records_ingested_today: 18450
  },
  {
    id: "SRC-NOAA-02",
    name: "NOAA CoastWatch & Coral Reef Watch",
    provider: "NOAA Ocean Service",
    feed_type: "Ocean Buoy Stream",
    latency_ms: 95,
    uptime_pct: 99.88,
    status: "OPERATIONAL",
    last_sync: "2026-10-31T10:35:00Z",
    records_ingested_today: 34100
  },
  {
    id: "SRC-GFW-03",
    name: "Global Fishing Watch AIS Feed",
    provider: "Global Fishing Watch",
    feed_type: "AIS Transponder",
    latency_ms: 210,
    uptime_pct: 99.75,
    status: "OPERATIONAL",
    last_sync: "2026-10-31T10:44:00Z",
    records_ingested_today: 92400
  },
  {
    id: "SRC-ARGO-04",
    name: "Argo Global Ocean Profiling Array",
    provider: "UNESCO-IOC / WMO",
    feed_type: "Ocean Buoy Stream",
    latency_ms: 145,
    uptime_pct: 99.91,
    status: "OPERATIONAL",
    last_sync: "2026-10-31T10:20:00Z",
    records_ingested_today: 12800
  },
  {
    id: "SRC-POSTGIS-05",
    name: "ORCA PostGIS Spatial Engine",
    provider: "Local Geospatial Cluster (EPSG:4326)",
    feed_type: "Spatial GIS Database",
    latency_ms: 8,
    uptime_pct: 100.0,
    status: "OPERATIONAL",
    last_sync: "2026-10-31T10:45:00Z",
    records_ingested_today: 142000
  }
];

// Fallback baseline for zones
const FALLBACK_ZONES: MarineZone[] = [
  {
    id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01",
    code: "ZONE-GBR-01",
    name: "Great Barrier Reef - Ribbon Reef Sector",
    designation: "Coral Reef Sanctuary",
    description: "Northern outer shelf coral ecosystem subjected to recurrent thermal anomalies and marine heatwaves.",
    area_sq_km: 2840.50,
    health_score: 72.4,
    risk_level: "MODERATE",
    latitude: -15.4200,
    longitude: 145.8500,
    boundary_coordinates: [
      [-15.30, 145.70],
      [-15.30, 146.00],
      [-15.55, 146.00],
      [-15.55, 145.70],
      [-15.30, 145.70]
    ]
  },
  {
    id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c02",
    code: "ZONE-GAL-02",
    name: "Galapagos Marine Reserve - Darwin & Wolf Sanctuary",
    designation: "Marine Protected Area",
    description: "High-biodiversity pelagic hub for apex predators and hammerhead shark migrations.",
    area_sq_km: 4120.00,
    health_score: 91.8,
    risk_level: "LOW",
    latitude: 1.6800,
    longitude: -91.8200,
    boundary_coordinates: [
      [1.50, -92.00],
      [1.50, -91.60],
      [1.85, -91.60],
      [1.85, -92.00],
      [1.50, -92.00]
    ]
  },
  {
    id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c03",
    code: "ZONE-RAJA-03",
    name: "Raja Ampat Coral Triangle - Misool Biome",
    designation: "Benthic Coral Hotspot",
    description: "World epicenter of marine biodiversity, monitored for ocean acidification and blue carbon sinks.",
    area_sq_km: 1950.25,
    health_score: 88.5,
    risk_level: "LOW",
    latitude: -2.1500,
    longitude: 130.2500,
    boundary_coordinates: [
      [-2.00, 130.10],
      [-2.00, 130.40],
      [-2.30, 130.40],
      [-2.30, 130.10],
      [-2.00, 130.10]
    ]
  },
  {
    id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c04",
    code: "ZONE-SAR-04",
    name: "Sargasso Sea Floating Forest Sanctuary",
    designation: "Pelagic Gyre Conservation Area",
    description: "Open ocean floating sargassum nursery, under heavy stress from plastic convergence and warming SST.",
    area_sq_km: 6500.00,
    health_score: 58.2,
    risk_level: "HIGH",
    latitude: 28.3000,
    longitude: -64.5000,
    boundary_coordinates: [
      [27.80, -65.00],
      [27.80, -64.00],
      [28.80, -64.00],
      [28.80, -65.00],
      [27.80, -65.00]
    ]
  },
  {
    id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c05",
    code: "ZONE-BALT-05",
    name: "Baltic Gotland Basin Dead Zone",
    designation: "Hypoxic Remediation Area",
    description: "Stratified seabed experiencing acute seasonal hypoxia and low dissolved oxygen.",
    area_sq_km: 3200.75,
    health_score: 44.1,
    risk_level: "CRITICAL",
    latitude: 57.3000,
    longitude: 19.2000,
    boundary_coordinates: [
      [56.90, 18.80],
      [56.90, 19.60],
      [57.70, 19.60],
      [57.70, 18.80],
      [56.90, 18.80]
    ]
  }
];

const FALLBACK_AGENTS: MarineAgent[] = [
  {
    id: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d01",
    agent_id: "ORCA-AG-01",
    name: "Nautilus Sentinel-Alpha",
    agent_type: "REEF_SENTINEL",
    status: "ACTIVE",
    battery_percentage: 94.5,
    latitude: -15.4150,
    longitude: 145.8320,
    depth_meters: 12.4,
    assigned_zone_id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01",
    capabilities: [
      "Multi-spectral coral scanning",
      "Zooxanthellae density estimation",
      "Turbidity profiling"
    ]
  },
  {
    id: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d02",
    agent_id: "ORCA-AG-02",
    name: "HydroThermal Recon-02",
    agent_type: "THERMAL_SCANNER",
    status: "INVESTIGATING",
    battery_percentage: 82.0,
    latitude: -15.4380,
    longitude: 145.8650,
    depth_meters: 25.0,
    assigned_zone_id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01",
    capabilities: [
      "Thermocline inversion tracking",
      "Degree Heating Week (DHW) calculation",
      "Internal wave detection"
    ]
  },
  {
    id: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d03",
    agent_id: "ORCA-AG-03",
    name: "Apex Acoustic Glider-03",
    agent_type: "ACOUSTIC_PROFILER",
    status: "ACTIVE",
    battery_percentage: 89.2,
    latitude: 1.6920,
    longitude: -91.8350,
    depth_meters: 45.5,
    assigned_zone_id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c02",
    capabilities: [
      "Passive hydrophone beamforming",
      "Cetacean vocalization classifier",
      "Vessel propeller acoustic signature"
    ]
  },
  {
    id: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d04",
    agent_id: "ORCA-AG-04",
    name: "Blue Carbon Observer-04",
    agent_type: "CARBON_SINK_OBSERVER",
    status: "ACTIVE",
    battery_percentage: 96.0,
    latitude: -2.1420,
    longitude: 130.2650,
    depth_meters: 18.0,
    assigned_zone_id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c03",
    capabilities: [
      "Dissolved inorganic carbon profiling",
      "Seagrass bed biomass assessment",
      "pH fluctuation analysis"
    ]
  },
  {
    id: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d05",
    agent_id: "ORCA-AG-05",
    name: "Anoxia Profiler Drone-05",
    agent_type: "PATROL_SWARM",
    status: "WARNING",
    battery_percentage: 68.5,
    latitude: 57.3100,
    longitude: 19.2150,
    depth_meters: 75.0,
    assigned_zone_id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c05",
    capabilities: [
      "Dissolved oxygen gradient probing",
      "Benthic methane sniff",
      "Hydrogen sulfide sensor array"
    ]
  }
];

export const api = {
  // System Health
  async getHealth(): Promise<SystemHealth> {
    return fetchJson<SystemHealth>('/health', {
      status: 'healthy (active standby)',
      service: 'ORCA Marine Ecosystem Reasoning API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: 'PostgreSQL/PostGIS Spatial Engine',
      active_agents: 5,
      monitored_zones: 5
    });
  },

  // Marine Zones
  async getZones(riskLevel?: string): Promise<MarineZone[]> {
    const query = riskLevel ? `?risk_level=${riskLevel}` : '';
    return fetchJson<MarineZone[]>(`/zones${query}`, FALLBACK_ZONES);
  },

  async getZone(id: string): Promise<MarineZone | null> {
    const found = FALLBACK_ZONES.find(z => z.id === id) || null;
    return fetchJson<MarineZone | null>(`/zones/${id}`, found);
  },

  // Agents
  async getAgents(): Promise<MarineAgent[]> {
    return fetchJson<MarineAgent[]>('/agents', FALLBACK_AGENTS);
  },

  async dispatchAgent(agentId: string, mission: string): Promise<MarineAgent | null> {
    const agent = FALLBACK_AGENTS.find(a => a.agent_id === agentId || a.id === agentId) || null;
    return fetchJson<MarineAgent | null>(`/agents/${agentId}/dispatch`, agent, {
      method: 'POST',
      body: JSON.stringify({ mission })
    });
  },

  // Telemetry
  async getLatestTelemetry(): Promise<EcosystemTelemetry[]> {
    return fetchJson<EcosystemTelemetry[]>('/telemetry/latest', []);
  },

  async getZoneTelemetry(zoneId: string): Promise<EcosystemTelemetry[]> {
    return fetchJson<EcosystemTelemetry[]>(`/telemetry/zone/${zoneId}/history`, []);
  },

  // Agent Reasoning
  async getReasoningLogs(limit: number = 10): Promise<AgentReasoningLog[]> {
    return fetchJson<AgentReasoningLog[]>(`/reasoning/logs?limit=${limit}`, []);
  },

  async triggerDeliberation(zoneId: string, anomalyType: string): Promise<AgentReasoningLog | null> {
    return fetchJson<AgentReasoningLog | null>('/reasoning/deliberate', null, {
      method: 'POST',
      body: JSON.stringify({ zone_id: zoneId, anomaly_type: anomalyType })
    });
  },

  async getNugenStatus(): Promise<NugenIntegrationStatus> {
    return fetchJson<NugenIntegrationStatus>('/reasoning/status', {
      status: 'UNCONFIGURED',
      is_configured: false,
      has_model_id: false,
      endpoint_configured: false,
      timeout_seconds: 30,
      detail: 'Nugen inference credentials or endpoint not configured in backend environment.'
    });
  },


  // Ecological Alerts
  async getAlerts(status?: string): Promise<EcologicalAlert[]> {
    const query = status ? `?status=${status}` : '';
    return fetchJson<EcologicalAlert[]>(`/alerts${query}`, []);
  },

  async updateAlertStatus(alertId: string, status: string): Promise<EcologicalAlert | null> {
    return fetchJson<EcologicalAlert | null>(`/alerts/${alertId}/status`, null, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  // Satellite Passes (Sample Data)
  async getSatellitePasses(): Promise<SatellitePass[]> {
    return Promise.resolve(SAMPLE_SATELLITE_PASSES);
  },

  // AIS Vessels (Sample Data)
  async getAISVessels(): Promise<AISVessel[]> {
    return Promise.resolve(SAMPLE_AIS_VESSELS);
  },

  // IoT Buoys (Sample Data)
  async getIoTBuoys(): Promise<IoTBuoy[]> {
    return Promise.resolve(SAMPLE_IOT_BUOYS);
  },

  // Oceanographic Observations (Sample Data / Telemetry Stations)
  async getOceanographicObservations(): Promise<OceanographicObservation[]> {
    return Promise.resolve(SAMPLE_OCEANOGRAPHIC_OBSERVATIONS);
  },

  // Nugen Model Status (Sample Data)
  async getNugenMetrics(): Promise<NugenModelMetrics> {
    return Promise.resolve(SAMPLE_NUGEN_METRICS);
  },

  // Data Sources (Sample Data)
  async getDataSources(): Promise<DataSourceHealth[]> {
    return Promise.resolve(SAMPLE_DATA_SOURCES);
  },

  // Copernicus Data Space Ecosystem Real-World STAC API
  async getCopernicusStatus(): Promise<CopernicusServiceHealth> {
    const res = await fetch(`${API_BASE}/satellite/copernicus/status`);
    if (!res.ok) {
      throw new Error(`Copernicus status check failed with HTTP ${res.status}`);
    }
    return (await res.json()) as CopernicusServiceHealth;
  },

  async searchSentinel1(query: SatelliteSearchQuery): Promise<CopernicusSearchResponse> {
    const res = await fetch(`${API_BASE}/satellite/sentinel-1/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Copernicus Sentinel-1 STAC search failed (HTTP ${res.status}): ${errText}`);
    }
    return (await res.json()) as CopernicusSearchResponse;
  },

  async searchSentinel2(query: SatelliteSearchQuery): Promise<CopernicusSearchResponse> {
    const res = await fetch(`${API_BASE}/satellite/sentinel-2/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Copernicus Sentinel-2 STAC search failed (HTTP ${res.status}): ${errText}`);
    }
    return (await res.json()) as CopernicusSearchResponse;
  },

  async getCopernicusProduct(productId: string): Promise<CopernicusSatelliteProduct> {
    const res = await fetch(`${API_BASE}/satellite/products/${encodeURIComponent(productId)}`);
    if (!res.ok) {
      throw new Error(`Product '${productId}' not found in Copernicus STAC catalog`);
    }
    return (await res.json()) as CopernicusSatelliteProduct;
  },

  // SAR Monitoring & Preprocessing Pipeline Endpoints
  async getSARDependencies(): Promise<SARDependencyStatus> {
    const res = await fetch(`${API_BASE}/sar/dependencies`);
    if (!res.ok) {
      throw new Error(`Failed to fetch SAR dependencies: HTTP ${res.status}`);
    }
    return (await res.json()) as SARDependencyStatus;
  },

  async getSARProducts(params?: {
    limit?: number;
    min_lon?: number;
    min_lat?: number;
    max_lon?: number;
    max_lat?: number;
    start_date?: string;
    end_date?: string;
    product_id?: string;
  }): Promise<CopernicusSearchResponse> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.min_lon !== undefined) query.set('min_lon', params.min_lon.toString());
    if (params?.min_lat !== undefined) query.set('min_lat', params.min_lat.toString());
    if (params?.max_lon !== undefined) query.set('max_lon', params.max_lon.toString());
    if (params?.max_lat !== undefined) query.set('max_lat', params.max_lat.toString());
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    if (params?.product_id) query.set('product_id', params.product_id);
    const qs = query.toString() ? `?${query.toString()}` : '';

    const res = await fetch(`${API_BASE}/sar/products${qs}`);
    if (!res.ok) {
      throw new Error(`Failed to list SAR products: HTTP ${res.status}`);
    }
    return (await res.json()) as CopernicusSearchResponse;
  },

  async getSARProductAssets(productId: string): Promise<SARProductAssetResponse> {
    const res = await fetch(`${API_BASE}/sar/products/${encodeURIComponent(productId)}/assets`);
    if (!res.ok) {
      throw new Error(`Failed to retrieve assets for product ${productId}: HTTP ${res.status}`);
    }
    return (await res.json()) as SARProductAssetResponse;
  },

  async downloadSARAsset(productId: string, assetKey: string = 'thumbnail'): Promise<SARDownloadResponse> {
    const res = await fetch(`${API_BASE}/sar/products/${encodeURIComponent(productId)}/download-asset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, asset_key: assetKey })
    });
    if (!res.ok) {
      throw new Error(`Asset download failed: HTTP ${res.status}`);
    }
    return (await res.json()) as SARDownloadResponse;
  },

  async processSARPipeline(request: SARProcessingRequest): Promise<SARProcessingResult> {
    const res = await fetch(`${API_BASE}/sar/pipeline/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`SAR processing pipeline failed (HTTP ${res.status}): ${errText}`);
    }
    return (await res.json()) as SARProcessingResult;
  },

  async getSARAnalyses(): Promise<SARProcessingResult[]> {
    const res = await fetch(`${API_BASE}/sar/analyses`);
    if (!res.ok) {
      throw new Error(`Failed to fetch SAR analyses ledger: HTTP ${res.status}`);
    }
    return (await res.json()) as SARProcessingResult[];
  },

  async getSARAnalysis(analysisId: string): Promise<SARProcessingResult> {
    const res = await fetch(`${API_BASE}/sar/analyses/${encodeURIComponent(analysisId)}`);
    if (!res.ok) {
      throw new Error(`SAR analysis '${analysisId}' not found: HTTP ${res.status}`);
    }
    return (await res.json()) as SARProcessingResult;
  },

  // Copernicus Marine Service (CMS / CMEMS) Endpoints
  async getCopernicusMarineHealth(): Promise<CopernicusMarineHealth> {
    const res = await fetch(`${API_BASE}/oceanographic/health`);
    if (!res.ok) {
      throw new Error(`Copernicus Marine health check failed: HTTP ${res.status}`);
    }
    return (await res.json()) as CopernicusMarineHealth;
  },

  async getCopernicusMarineDatasets(productType?: string): Promise<CopernicusMarineDataset[]> {
    const qs = productType ? `?product_type=${encodeURIComponent(productType)}` : '';
    const res = await fetch(`${API_BASE}/oceanographic/datasets${qs}`);
    if (!res.ok) {
      throw new Error(`Failed to list Copernicus Marine datasets: HTTP ${res.status}`);
    }
    return (await res.json()) as CopernicusMarineDataset[];
  },

  async getCopernicusMarineDatasetVariables(datasetId: string): Promise<CopernicusMarineVariable[]> {
    const res = await fetch(`${API_BASE}/oceanographic/datasets/${encodeURIComponent(datasetId)}/variables`);
    if (!res.ok) {
      throw new Error(`Failed to retrieve variables for dataset '${datasetId}': HTTP ${res.status}`);
    }
    return (await res.json()) as CopernicusMarineVariable[];
  },

  async queryOceanographicPoint(req: OceanographicQueryRequest): Promise<OceanographicProfileResponse> {
    const res = await fetch(`${API_BASE}/oceanographic/observations/point`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Copernicus Marine point query failed (HTTP ${res.status}): ${errText}`);
    }
    return (await res.json()) as OceanographicProfileResponse;
  },

  async queryOceanographicTimeSeries(
    latitude: number, 
    longitude: number, 
    days: number = 7, 
    locationName?: string
  ): Promise<OceanographicTimeSeriesResponse> {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      days: days.toString()
    });
    if (locationName) params.set('location_name', locationName);

    const res = await fetch(`${API_BASE}/oceanographic/observations/timeseries?${params.toString()}`, {
      method: 'POST'
    });
    if (!res.ok) {
      throw new Error(`Failed to retrieve oceanographic time-series: HTTP ${res.status}`);
    }
    return (await res.json()) as OceanographicTimeSeriesResponse;
  },

  async getOceanographicHistory(limit: number = 25): Promise<any[]> {
    const res = await fetch(`${API_BASE}/oceanographic/observations/history?limit=${limit}`);
    if (!res.ok) {
      throw new Error(`Failed to retrieve oceanographic history: HTTP ${res.status}`);
    }
    return (await res.json()) as any[];
  },

  async getOceanographicPresets(): Promise<MaritimePreset[]> {
    const res = await fetch(`${API_BASE}/oceanographic/presets`);
    if (!res.ok) {
      throw new Error(`Failed to retrieve maritime presets: HTTP ${res.status}`);
    }
    return (await res.json()) as MaritimePreset[];
  },

  async getSAROceanContext(req: SAROceanContextRequest): Promise<SAROceanContext> {
    const res = await fetch(`${API_BASE}/oceanographic/context/sar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to retrieve SAR oceanographic context (HTTP ${res.status}): ${errText}`);
    }
    return (await res.json()) as SAROceanContext;
  },

  // ==========================================================================
  // Real-World AIS Vessel Tracking Endpoints
  // ==========================================================================
  async getAISProviderStatus(demo?: boolean): Promise<AISProviderStatus> {
    const qs = demo !== undefined ? `?demo=${demo}` : '';
    const res = await fetch(`${API_BASE}/ais/status${qs}`);
    if (!res.ok) {
      throw new Error(`Failed to check AIS provider status: HTTP ${res.status}`);
    }
    return (await res.json()) as AISProviderStatus;
  },

  async testAISConnection(demo?: boolean): Promise<{ is_connected: boolean; status: string; message: string; latency_ms: number; provider: string; endpoint?: string }> {
    const qs = demo !== undefined ? `?demo=${demo}` : '';
    const res = await fetch(`${API_BASE}/ais/test-connection${qs}`, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`AIS live test connection request failed with HTTP ${res.status}`);
    }
    return await res.json();
  },

  async getLiveAISVessels(filter?: AISQueryFilter): Promise<AISVesselResponse> {
    const res = await fetch(`${API_BASE}/ais/vessels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filter || {})
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to query AIS vessels (HTTP ${res.status}): ${errText}`);
    }
    return (await res.json()) as AISVesselResponse;
  },

  async getAISVesselDetails(mmsi: string, demo?: boolean): Promise<AISVesselDetailedView> {
    const qs = demo !== undefined ? `?demo=${demo}` : '';
    const res = await fetch(`${API_BASE}/ais/vessels/${encodeURIComponent(mmsi)}${qs}`);
    if (!res.ok) {
      throw new Error(`Vessel details for MMSI ${mmsi} unavailable: HTTP ${res.status}`);
    }
    return (await res.json()) as AISVesselDetailedView;
  },

  async getAISVesselMovement(mmsi: string, demo?: boolean): Promise<AISVesselMovement> {
    const qs = demo !== undefined ? `?demo=${demo}` : '';
    const res = await fetch(`${API_BASE}/ais/vessels/${encodeURIComponent(mmsi)}/movement${qs}`);
    if (!res.ok) {
      throw new Error(`Vessel movement for MMSI ${mmsi} unavailable: HTTP ${res.status}`);
    }
    return (await res.json()) as AISVesselMovement;
  },

  async toggleAISDemoMode(enabled?: boolean): Promise<{ demo_mode_active: boolean; status: string; message: string }> {
    const qs = enabled !== undefined ? `?enabled=${enabled}` : '';
    const res = await fetch(`${API_BASE}/ais/demo/toggle${qs}`, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`Failed to toggle AIS demo mode: HTTP ${res.status}`);
    }
    return await res.json();
  },

  async searchAISVessels(query: string, limit: number = 20, demo?: boolean): Promise<AISVesselPosition[]> {
    const qs = new URLSearchParams({
      q: query,
      limit: limit.toString()
    });
    if (demo !== undefined) qs.set('demo', demo.toString());
    const res = await fetch(`${API_BASE}/ais/search?${qs.toString()}`);
    if (!res.ok) {
      throw new Error(`Failed to search AIS vessels: HTTP ${res.status}`);
    }
    return (await res.json()) as AISVesselPosition[];
  },

  async getAISHistory(): Promise<AISVesselPosition[]> {
    const res = await fetch(`${API_BASE}/ais/history`);
    if (!res.ok) {
      throw new Error(`Failed to retrieve AIS history: HTTP ${res.status}`);
    }
    return (await res.json()) as AISVesselPosition[];
  },

  async getAISAnomalies(filter?: AISQueryFilter, demo?: boolean): Promise<AISAnomalyReport> {
    const qs = new URLSearchParams();
    if (demo !== undefined) qs.set('demo', demo.toString());
    if (filter?.min_lat !== undefined) qs.set('min_lat', filter.min_lat.toString());
    if (filter?.max_lat !== undefined) qs.set('max_lat', filter.max_lat.toString());
    if (filter?.min_lon !== undefined) qs.set('min_lon', filter.min_lon.toString());
    if (filter?.max_lon !== undefined) qs.set('max_lon', filter.max_lon.toString());
    if (filter?.mmsi) qs.set('mmsi', filter.mmsi);
    const queryString = qs.toString() ? `?${qs.toString()}` : '';

    const res = await fetch(`${API_BASE}/ais/anomalies${queryString}`);
    if (!res.ok) {
      throw new Error(`Failed to retrieve AIS vessel anomalies: HTTP ${res.status}`);
    }
    return (await res.json()) as AISAnomalyReport;
  },

  async getAISCorrelations(demo?: boolean): Promise<AISCrossAgentCorrelation[]> {
    const qs = demo !== undefined ? `?demo=${demo}` : '';
    const res = await fetch(`${API_BASE}/ais/correlations${qs}`);
    if (!res.ok) {
      throw new Error(`Failed to retrieve AIS cross-agent correlations: HTTP ${res.status}`);
    }
    return (await res.json()) as AISCrossAgentCorrelation[];
  },

  async analyzeAIS(req: AISAnalyzeRequest): Promise<AISAnalyzeResponse> {
    const res = await fetch(`${API_BASE}/ais/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to execute AIS analysis (HTTP ${res.status}): ${errText}`);
    }
    return (await res.json()) as AISAnalyzeResponse;
  },


  // ==========================================================================
  // Sentinel-2 Optical Processing Pipeline Endpoints
  // ==========================================================================
  async getOpticalAnalyses(): Promise<OpticalProcessingResult[]> {
    const res = await fetch(`${API_BASE}/optical/analyses`);
    if (!res.ok) {
      throw new Error(`Failed to fetch Optical analyses ledger: HTTP ${res.status}`);
    }
    return (await res.json()) as OpticalProcessingResult[];
  },

  async getOpticalAnalysis(analysisId: string): Promise<OpticalProcessingResult> {
    const res = await fetch(`${API_BASE}/optical/analyses/${encodeURIComponent(analysisId)}`);
    if (!res.ok) {
      throw new Error(`Optical analysis '${analysisId}' not found: HTTP ${res.status}`);
    }
    return (await res.json()) as OpticalProcessingResult;
  },

  async processOpticalProduct(request: OpticalProcessRequest): Promise<OpticalProcessingResult> {
    const res = await fetch(`${API_BASE}/optical/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Optical processing failed (HTTP ${res.status}): ${errText}`);
    }
    return (await res.json()) as OpticalProcessingResult;
  },

  async getOpticalProductAssets(productId: string): Promise<OpticalProductAssetsResponse> {
    const res = await fetch(`${API_BASE}/optical/products/${encodeURIComponent(productId)}/assets`);
    if (!res.ok) {
      throw new Error(`Failed to inspect assets for product ${productId}: HTTP ${res.status}`);
    }
    return (await res.json()) as OpticalProductAssetsResponse;
  },

  async downloadOpticalAsset(productId: string, assetKey: string = 'thumbnail'): Promise<OpticalDownloadResponse> {
    const res = await fetch(`${API_BASE}/optical/products/${encodeURIComponent(productId)}/download-asset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, asset_key: assetKey })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Asset download failed (HTTP ${res.status}): ${errText}`);
    }
    return (await res.json()) as OpticalDownloadResponse;
  },

  async deleteOpticalAnalysis(analysisId: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/optical/analyses/${encodeURIComponent(analysisId)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error(`Failed to delete optical analysis: HTTP ${res.status}`);
    }
    return await res.json();
  },

  // ==========================================================================
  // IoT Buoy & Hardware Telemetry Endpoints
  // ==========================================================================
  async getIoTDeviceStatus(): Promise<IoTDeviceStatusResponse> {
    const res = await fetch(`${API_BASE}/telemetry/device/status`);
    if (!res.ok) {
      return {
        hardware_connection_status: 'NOT CONNECTED',
        active_hardware_devices_count: 0,
        registered_devices: [],
        last_hardware_heartbeat: null,
        telemetry_source: 'SIMULATED_BASELINE_MODEL',
        data_mode: 'NOT CONNECTED',
        instructions: 'ESP32 buoy hardware offline. Ingest endpoint: POST /api/v1/telemetry/ingest'
      };
    }
    return (await res.json()) as IoTDeviceStatusResponse;
  },

  async getIoTBuoysLive(): Promise<IoTBuoyItem[]> {
    const res = await fetch(`${API_BASE}/telemetry/buoys`);
    if (!res.ok) {
      throw new Error(`Failed to fetch IoT buoys: HTTP ${res.status}`);
    }
    return (await res.json()) as IoTBuoyItem[];
  },

  // ==========================================================================
  // Phase 5: Virtual ESP32 Buoy Operations Center Endpoints
  // ==========================================================================
  async getVirtualBuoyStatus(): Promise<IoTStatusResponse> {
    const res = await fetch(`${API_BASE}/iot/status`);
    if (!res.ok) {
      throw new Error(`Failed to fetch virtual buoy status: HTTP ${res.status}`);
    }
    return (await res.json()) as IoTStatusResponse;
  },

  async getVirtualBuoyTelemetry(): Promise<VirtualESP32Telemetry> {
    const res = await fetch(`${API_BASE}/iot/telemetry`);
    if (!res.ok) {
      throw new Error(`Failed to fetch virtual buoy telemetry: HTTP ${res.status}`);
    }
    return (await res.json()) as VirtualESP32Telemetry;
  },

  async getVirtualBuoyAnomalies(): Promise<IoTAnomalyEvent[]> {
    const res = await fetch(`${API_BASE}/iot/anomalies`);
    if (!res.ok) {
      throw new Error(`Failed to fetch virtual buoy anomalies: HTTP ${res.status}`);
    }
    return (await res.json()) as IoTAnomalyEvent[];
  },

  async getVirtualBuoyDeviceDetail(deviceId: string = 'ORCA-BUOY-001'): Promise<VirtualESP32DeviceDetail> {
    const res = await fetch(`${API_BASE}/iot/devices/${encodeURIComponent(deviceId)}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch device detail: HTTP ${res.status}`);
    }
    return (await res.json()) as VirtualESP32DeviceDetail;
  },

  async switchVirtualBuoyScenario(scenario: IoTScenarioType, reason?: string): Promise<IoTScenarioChangeResponse> {
    const res = await fetch(`${API_BASE}/iot/scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario, reason })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to switch scenario: HTTP ${res.status} - ${err}`);
    }
    return (await res.json()) as IoTScenarioChangeResponse;
  },

  async startVirtualBuoySimulation(): Promise<{ status: string; message: string; is_generating_telemetry: boolean }> {
    const res = await fetch(`${API_BASE}/iot/simulation/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      throw new Error(`Failed to start simulation: HTTP ${res.status}`);
    }
    return await res.json();
  },

  async stopVirtualBuoySimulation(): Promise<{ status: string; message: string; is_generating_telemetry: boolean }> {
    const res = await fetch(`${API_BASE}/iot/simulation/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      throw new Error(`Failed to stop simulation: HTTP ${res.status}`);
    }
    return await res.json();
  },

  async getVirtualBuoyHistory(limit: number = 30): Promise<IoTHistoryResponse> {
    const res = await fetch(`${API_BASE}/iot/history?limit=${limit}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch telemetry history: HTTP ${res.status}`);
    }
    return (await res.json()) as IoTHistoryResponse;
  },

  // ==========================================================================
  // Phase 6: Multi-Agent Intelligence & Lead Orchestrator Endpoints
  // ==========================================================================
  async startInvestigation(req: MultiAgentInvestigationRequest): Promise<FinalMarineIntelligenceAssessment> {
    const res = await fetch(`${API_BASE}/orchestration/investigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Investigation failed (HTTP ${res.status}): ${err}`);
    }
    return (await res.json()) as FinalMarineIntelligenceAssessment;
  },

  async getOrchestrationStatus(assessmentId: string): Promise<OrchestrationStatusResponse> {
    const res = await fetch(`${API_BASE}/orchestration/status/${encodeURIComponent(assessmentId)}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch orchestration status: HTTP ${res.status}`);
    }
    return (await res.json()) as OrchestrationStatusResponse;
  },

  async getOrchestrationAssessment(assessmentId: string): Promise<FinalMarineIntelligenceAssessment> {
    const res = await fetch(`${API_BASE}/orchestration/assessment/${encodeURIComponent(assessmentId)}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch assessment: HTTP ${res.status}`);
    }
    return (await res.json()) as FinalMarineIntelligenceAssessment;
  },

  async getOrchestrationEvidence(assessmentId: string): Promise<{
    assessment_id: string;
    total_records: number;
    data_mode_summary: Record<string, number>;
    data_quality: any;
    evidence: UnifiedEvidenceRecord[];
  }> {
    const res = await fetch(`${API_BASE}/orchestration/evidence/${encodeURIComponent(assessmentId)}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch evidence: HTTP ${res.status}`);
    }
    return await res.json();
  },

  async getOrchestrationHistory(limit: number = 25): Promise<OrchestrationHistoryResponse> {
    const res = await fetch(`${API_BASE}/orchestration/history?limit=${limit}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch orchestration history: HTTP ${res.status}`);
    }
    return (await res.json()) as OrchestrationHistoryResponse;
  },

  async exportOrchestrationReport(assessmentId: string, format: 'markdown' | 'json' = 'markdown'): Promise<string> {
    const res = await fetch(`${API_BASE}/orchestration/export/${encodeURIComponent(assessmentId)}?format=${format}`);
    if (!res.ok) {
      throw new Error(`Failed to export report: HTTP ${res.status}`);
    }
    return await res.text();
  }
};



