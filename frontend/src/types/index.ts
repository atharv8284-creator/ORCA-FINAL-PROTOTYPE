export interface MarineZone {
  id: string;
  code: string;
  name: string;
  designation: string;
  description?: string;
  area_sq_km: number;
  health_score: number;
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  latitude: number;
  longitude: number;
  boundary_coordinates?: [number, number][];
  created_at?: string;
}

export interface MarineAgent {
  id: string;
  agent_id: string;
  name: string;
  agent_type: 'REEF_SENTINEL' | 'THERMAL_SCANNER' | 'ACOUSTIC_PROFILER' | 'CARBON_SINK_OBSERVER' | 'PATROL_SWARM' | 'AIS_SURFACE_MONITOR';
  status: 'ACTIVE' | 'INVESTIGATING' | 'WARNING' | 'IDLE';
  battery_percentage: number;
  latitude: number;
  longitude: number;
  depth_meters: number;
  assigned_zone_id?: string;
  capabilities: string[];
  last_heartbeat?: string;
  metadata?: Record<string, any>;
}

export interface EcosystemTelemetry {
  id: string;
  zone_id: string;
  recorded_at: string;
  water_temperature_c: number;
  dissolved_oxygen_mg_l: number;
  ph_level: number;
  salinity_psu: number;
  turbidity_ntu: number;
  chlorophyll_mg_m3: number;
  microplastics_index: number;
  acoustic_noise_db: number;
}

export interface ReasoningChainStep {
  step: number;
  agent?: string;
  claim?: string;
  consensus?: string;
}

export interface AgentReasoningLog {
  id: string;
  agent_id: string;
  agent_name: string;
  zone_id?: string;
  zone_name?: string;
  timestamp: string;
  observation: string;
  hypothesis: string;
  reasoning_chain: ReasoningChainStep[];
  consensus_action: string;
  confidence_score: number;
  severity: 'INFO' | 'ADVISORY' | 'ELEVATED' | 'CRITICAL';
  inference_mode?: 'HEURISTIC_RULE_BASED' | 'NUGEN_NEURAL_REASONING';
  nugen_status?: 'UNCONFIGURED' | 'MODEL_UNAVAILABLE' | 'INFERENCE_FAILED' | 'INFERENCE_SUCCESS' | 'FALLBACK_RULE_BASED' | string;
  missing_evidence?: string[];
  nugen_error?: string | null;
}

export interface NugenIntegrationStatus {
  status: 'UNCONFIGURED' | 'MODEL_UNAVAILABLE' | 'INFERENCE_FAILED' | 'INFERENCE_SUCCESS' | 'FALLBACK_RULE_BASED' | string;
  is_configured: boolean;
  has_model_id: boolean;
  configured_model_id?: string | null;
  endpoint_configured: boolean;
  timeout_seconds: number;
  detail: string;
}


export interface EcologicalAlert {
  id: string;
  zone_id: string;
  zone_name: string;
  alert_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  recommended_mitigation: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  triggered_by_agent?: string;
  created_at: string;
}

export interface SystemHealth {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  database: string;
  active_agents: number;
  monitored_zones: number;
}

// Satellite Intelligence Types
export interface SatellitePass {
  id: string;
  satellite: 'Sentinel-1A (SAR)' | 'Sentinel-2B (MSI)' | 'Landsat-9 (OLI-2)' | 'MODIS Aqua' | 'VIIRS Suomi';
  sensor_type: 'SAR C-Band' | 'Multispectral Optical' | 'Thermal Infrared' | 'Ocean Color Radiometer';
  pass_timestamp: string;
  coverage_area: string;
  swath_width_km: number;
  resolution_meters: number;
  latitude?: number;
  longitude?: number;
  footprint_polygon?: [number, number][];
  cloud_cover_pct: number;
  anomaly_detected: boolean;
  anomaly_type?: 'Dark Vessel Echo' | 'Chlorophyll-a Plume' | 'Thermal Bleaching Anomaly' | 'Oil Slick Film' | 'None';
  status: 'PROCESSING' | 'COMPLETED' | 'SCHEDULED';
}

// Vessel & AIS Tracking Types
export interface AISVessel {
  mmsi: string;
  vessel_name: string;
  callsign: string;
  flag: string;
  vessel_type: string;
  speed_knots: number;
  course_deg: number;
  latitude: number;
  longitude: number;
  last_ping: string;
  ais_status: string;
  risk_level: string;
  proximity_zone?: string;
  heading?: number | null;
  navigation_status?: string;
  data_provider?: string;
  data_freshness?: string;
  is_simulated?: boolean;
  destination?: string | null;
}

// IoT Buoy Types
export interface IoTBuoy {
  buoy_id: string;
  station_name: string;
  deployment_program: 'NOAA NDBC' | 'Argo Float Array' | 'OceanSITES Mooring' | 'ORCA Custom Drone Buoy';
  latitude: number;
  longitude: number;
  battery_pct: number;
  solar_yield_watts: number;
  sea_surface_temp_c: number;
  wave_height_meters: number;
  wave_period_sec: number;
  wind_speed_knots: number;
  status: 'ONLINE' | 'STANDBY' | 'MAINTENANCE_REQUIRED' | 'OFFLINE';
  last_transmission: string;
}

// Nugen AI Model Types
export interface NugenModelMetrics {
  model_name: string;
  version: string;
  architecture: string;
  context_tokens: number;
  inference_latency_ms: number;
  zero_shot_anomaly_accuracy_pct: number;
  reasoning_coherence_score: number;
  hallucination_guardrail_rate_pct: number;
  active_reasoning_threads: number;
  daily_token_processed: number;
  last_checkpoint: string;
  engine_status: 'OPTIMAL' | 'COMPUTING' | 'RE-INDEXING' | 'DEGRADED';
}

// Data Source Health Types
export interface DataSourceHealth {
  id: string;
  name: string;
  provider: string;
  feed_type: 'Satellite Telemetry' | 'AIS Transponder' | 'Ocean Buoy Stream' | 'Spatial GIS Database' | 'Neural Reasoning Engine';
  latency_ms: number;
  uptime_pct: number;
  status: 'OPERATIONAL' | 'DEGRADED' | 'MAINTENANCE';
  last_sync: string;
  records_ingested_today: number;
}

// Oceanographic Station Observation Type
export interface OceanographicObservation {
  id: string;
  station_id: string;
  station_name: string;
  zone_id: string;
  latitude: number;
  longitude: number;
  depth_meters: number;
  recorded_at: string;
  water_temperature_c: number;
  dissolved_oxygen_mg_l: number;
  ph_level: number;
  salinity_psu: number;
  turbidity_ntu: number;
  chlorophyll_mg_m3: number;
  source: string;
}

// Map Layer & Filter State Types
export interface MapActiveLayers {
  satellites: boolean;
  vessels: boolean;
  oceanographic: boolean;
  buoys: boolean;
  incidents: boolean;
}

export type MapDateFilter = 'ALL' | 'LAST_24H' | 'LAST_7D' | 'LAST_30D';
export type MapSourceFilter = 'ALL' | 'POSTGIS' | 'COPERNICUS' | 'GFW_AIS' | 'NOAA_ARGO' | 'ORCA_SWARM';
export type MapFeedMode = 'INTELLIGENCE_DB' | 'LIVE_STREAM';

// --- Copernicus STAC Satellite Types ---

export interface ProcessingPipelineStatus {
  product_discovered: boolean;
  asset_available: boolean;
  image_downloaded: boolean;
  image_processed: boolean;
  anomaly_analysis_completed: boolean;
  status_summary: string;
}

export interface SatelliteAssetInfo {
  name: string;
  title?: string;
  type?: string;
  href: string;
  roles?: string[];
}

export interface CopernicusSatelliteProduct {
  id: string;
  collection: string;
  satellite: string;
  sensor_type: string;
  acquisition_timestamp?: string;
  platform?: string;
  constellation?: string;
  bbox?: [number, number, number, number];
  geometry?: any;
  cloud_cover_pct?: number;
  orbit_direction?: string;
  relative_orbit_number?: number;
  polarization?: string[];
  resolution_meters?: number;
  swath_identifier?: string;
  thumbnail_url?: string;
  assets_count: number;
  assets: Record<string, SatelliteAssetInfo>;
  properties: Record<string, any>;
  pipeline_status: ProcessingPipelineStatus;
  scientific_disclaimer: string;
}

export interface SatelliteSearchQuery {
  satellite: 'sentinel-1' | 'sentinel-2' | 'both';
  bbox?: [number, number, number, number];
  start_date?: string;
  end_date?: string;
  product_id?: string;
  max_cloud_cover?: number;
  limit: number;
}

export interface CopernicusSearchResponse {
  total_features: number;
  returned_features: number;
  collection: string;
  query_bbox?: [number, number, number, number];
  query_datetime?: string;
  features: CopernicusSatelliteProduct[];
  next_token?: string;
  stac_endpoint: string;
  executed_at: string;
  message?: string;
}

export interface CopernicusServiceHealth {
  status: 'OPERATIONAL' | 'DEGRADED' | 'UNREACHABLE';
  stac_endpoint: string;
  latency_ms: number;
  stac_version: string;
  conformance_count: number;
  supported_collections: string[];
  authentication_required_for_metadata: boolean;
  authentication_required_for_download: boolean;
  auth_configured: boolean;
  auth_instructions: string;
}

// --- Sentinel-1 SAR Monitoring Types ---

export interface SARAssetDetails {
  name: string;
  title?: string;
  type?: string;
  href: string;
  roles: string[];
  is_downloadable_without_auth: boolean;
}

export interface SARProductAssetResponse {
  product_id: string;
  collection: string;
  platform: string;
  acquisition_timestamp?: string;
  assets: Record<string, SARAssetDetails>;
  assets_count: number;
  download_permitted: boolean;
  auth_required: boolean;
  auth_message: string;
}

export interface SARDownloadRequest {
  product_id: string;
  asset_key: string;
}

export interface SARDownloadResponse {
  status: 'DOWNLOADED' | 'PREVIEW_STAGED' | 'AUTH_REQUIRED_FOR_FULL_RASTER' | 'AUTH_REQUIRED_FULL_RASTER' | 'FAILED' | 'UNAVAILABLE';
  product_id: string;
  asset_key: string;
  local_path?: string;
  size_bytes: number;
  message: string;
  is_preview: boolean;
  auth_details?: string;
}

export interface SARPreprocessingParams {
  calibration_mode: 'SIGMA_NAUGHT_DB' | 'GAMMA_NAUGHT' | 'BETA_NAUGHT';
  calibration_factor: number;
  speckle_filter: 'REFINED_LEE' | 'FROST' | 'MEDIAN' | 'NONE';
  filter_window_size: number;
  enable_land_masking: boolean;
  land_mask_threshold_db: number;
  adaptive_threshold_sigma: number;
  min_cluster_pixels: number;
  max_cluster_pixels: number;
}

export interface SARAnomalyCandidate {
  candidate_id: string;
  label: string;
  anomaly_type: 'LOW_BACKSCATTER_CANDIDATE' | 'DARK_FORMATION_LOOKALIKE' | 'METALLIC_POINT_ECHO';
  confidence_score: number;
  uncertainty?: number;
  damping_ratio_db: number;
  area_sq_km: number;
  perimeter_km: number;
  circularity: number;
  elongation: number;
  centroid_lat: number;
  centroid_lon: number;
  bounding_box: [number, number, number, number];
  geometry_type?: string;
  geojson_geometry?: Record<string, any>;
  verification_status: 'UNVERIFIED_CANDIDATE' | 'CORROBORATED_BY_AIS' | 'CORROBORATED_BY_OPTICAL' | 'FLAGGED_AS_LOOKALIKE' | 'AUV_DISPATCHED';
  recommended_verification: string[];
}

export interface SARPipelineStageResult {
  stage_name: string;
  status: 'COMPLETED' | 'SKIPPED' | 'DEGRADED' | 'FAILED';
  execution_time_ms: number;
  details: string;
}

export interface SARProcessingRequest {
  product_id: string;
  asset_key?: string;
  params: SARPreprocessingParams;
  custom_image_base64?: string;
  allow_synthetic_fallback?: boolean;
}

export interface SARProcessingResult {
  analysis_id: string;
  product_id: string;
  source_attribution?: string;
  acquisition_timestamp?: string;
  timestamp: string;
  execution_duration_ms: number;
  data_tier?: 'LIVE_PROCESSED_IMAGERY' | 'FULL_RASTER_PROCESSED' | 'PREVIEW' | 'CALIBRATED_PREVIEW_ANALYSIS' | 'METADATA_ONLY' | 'METADATA_DISCOVERY' | 'SIMULATED' | 'UNAVAILABLE';
  processing_status?: 'COMPLETED' | 'DEGRADED' | 'FAILED' | 'METADATA_ONLY';
  is_preview?: boolean;
  uncertainty?: number;
  error_message?: string;
  pipeline_stages: SARPipelineStageResult[];
  backscatter_statistics: Record<string, number>;
  anomaly_candidates: SARAnomalyCandidate[];
  total_candidates_found: number;
  visualizations: {
    calibrated_backscatter_png?: string;
    speckle_filtered_png?: string;
    anomaly_candidate_mask_png?: string;
    [key: string]: string | undefined;
  };
  scientific_disclaimer: string;
  processing_engine_info: Record<string, any>;
}

export interface SARDependencyStatus {
  engine_name: string;
  active_runtime: string;
  installed_libraries: Record<string, string>;
  specialized_libraries: Record<string, {
    installed: boolean;
    purpose: string;
    status_note: string;
  }>;
  system_notes: string;
}

// --- Copernicus Marine Service (CMS / CMEMS) Types ---

export type CopernicusMarineProductCategory = 
  | 'MODEL_ANALYSIS_FORECAST'
  | 'SATELLITE_OBSERVATION'
  | 'IN_SITU_OBSERVATION';

export interface CopernicusMarineVariable {
  variable_id: string;
  name: string;
  standard_name?: string;
  units: string;
  category: 'TEMPERATURE' | 'SALINITY' | 'CURRENTS' | 'WAVES' | 'SURFACE_PHYSICS' | 'BIOGEOCHEMISTRY' | 'OTHER';
  valid_min?: number;
  valid_max?: number;
  description?: string;
  dimensions?: string[];
  has_layer?: boolean;
}

export interface CopernicusMarineDataset {
  dataset_id: string;
  title: string;
  product_id: string;
  product_type: CopernicusMarineProductCategory;
  product_type_label: string;
  description: string;
  temporal_resolution: string;
  spatial_resolution: string;
  doi?: string;
  variables: CopernicusMarineVariable[];
  wmts_endpoint?: string;
}

export interface OceanographicQueryRequest {
  latitude: number;
  longitude: number;
  zone_name?: string;
  target_date?: string;
  dataset_id?: string;
  requested_variables?: string[];
}

export interface OceanographicObservationItem {
  observation_id: string;
  variable_id: string;
  variable_name: string;
  category: string;
  raw_value: number;
  raw_units: string;
  converted_value: number;
  converted_units: string;
  latitude: number;
  longitude: number;
  location_name: string;
  timestamp: string;
  dataset_id: string;
  dataset_title: string;
  product_id?: string;
  product_type: CopernicusMarineProductCategory;
  product_type_label: string;
  data_classification: 'OBSERVATION' | 'MODEL_ANALYSIS' | 'FORECAST';
  forecast_reference_time?: string;
  retrieval_status: 'RETRIEVED' | 'CACHED' | 'UNAVAILABLE' | 'OUT_OF_BOUNDS' | 'FILL_VALUE_FILTERED' | 'MASKED_LAND';
  data_freshness: 'LIVE' | 'RECENT' | 'STALE' | 'HISTORICAL';
  uncertainty?: number | null;
  data_source: string;
  last_successful_update: string;
  validation_status: 'VALIDATED_PHYSICAL_RANGE' | 'OUT_OF_BOUNDS' | 'FILL_VALUE_FILTERED';
  validation_notes: string;
  secondary_metrics?: Record<string, any>;
}

export interface OceanographicProfileResponse {
  query_latitude: number;
  query_longitude: number;
  location_name: string;
  query_timestamp: string;
  data_source: string;
  data_source_url: string;
  service_status: string;
  data_tier: 'LIVE_COPERNICUS_MARINE_OBSERVATIONS' | 'NUMERICAL_MODEL_ANALYSIS' | 'FORECAST' | 'SIMULATED' | 'UNAVAILABLE';
  retrieval_status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'EMPTY' | 'MASKED_TERRESTRIAL';
  spatial_coverage?: Record<string, any>;
  temporal_range?: Record<string, string>;
  error_message?: string | null;
  authentication_status: Record<string, any>;
  observations: OceanographicObservationItem[];
  summary_card: {
    sea_surface_temp_c?: number | null;
    sea_surface_salinity_psu?: number | null;
    sea_bottom_temp_c?: number | null;
    sea_bottom_salinity_psu?: number | null;
    salinity_psu?: number | null;
    mixed_layer_depth_m?: number | null;
    sea_surface_height_m?: number | null;
    ocean_currents?: {
      u_eastward_ms?: number;
      v_northward_ms?: number;
      current_speed_ms?: number;
      current_speed_knots?: number;
      current_direction_deg?: number;
      drift_direction_cardinal?: string;
    };
    waves?: {
      significant_wave_height_m?: number;
      wave_peak_period_s?: number;
      mean_wave_direction_deg?: number;
      wave_direction_cardinal?: string;
    };
    total_variables_retrieved?: number;
  };
  retrieved_at: string;
}

export interface SAROceanContextRequest {
  sar_product_id: string;
  candidate_id?: string;
  latitude: number;
  longitude: number;
  sar_acquisition_timestamp?: string;
}

export interface SAROceanContext {
  sar_product_id: string;
  candidate_id?: string;
  candidate_lat: number;
  candidate_lon: number;
  sar_acquisition_timestamp?: string;
  ocean_data_timestamp?: string;
  temporal_delta_hours?: number | null;
  spatial_distance_km: number;
  data_freshness: 'LIVE' | 'RECENT' | 'STALE' | 'HISTORICAL_TOO_OLD' | 'UNAVAILABLE';
  surface_current_speed_knots?: number | null;
  surface_current_direction_deg?: number | null;
  u_eastward_ms?: number | null;
  v_northward_ms?: number | null;
  significant_wave_height_m?: number | null;
  sea_surface_temp_c?: number | null;
  sea_surface_salinity_psu?: number | null;
  data_classification: 'OBSERVATION' | 'MODEL_ANALYSIS' | 'FORECAST' | 'UNAVAILABLE';
  drift_direction_cardinal?: string | null;
  environmental_context_summary: string;
  scientific_disclaimer: string;
}

export interface OceanographicTimeSeriesPoint {
  timestamp: string;
  sst_c?: number | null;
  bottom_temp_c?: number | null;
  salinity_psu?: number | null;
  wave_height_m?: number | null;
  wave_period_s?: number | null;
  current_speed_knots?: number | null;
  current_direction_deg?: number | null;
  mld_m?: number | null;
  ssh_m?: number | null;
}

export interface OceanographicTimeSeriesResponse {
  latitude: number;
  longitude: number;
  location_name: string;
  temporal_coverage: string;
  points: OceanographicTimeSeriesPoint[];
  dataset_id: string;
  product_type_label: string;
}

export interface CopernicusMarineHealth {
  status: 'OPERATIONAL' | 'DEGRADED' | 'UNREACHABLE';
  stac_endpoint: string;
  wmts_endpoint: string;
  latency_ms: number;
  stac_catalog_available: boolean;
  available_datasets_count: number;
  auth_configured: boolean;
  auth_username?: string | null;
  toolbox_installed: boolean;
  auth_instructions: string;
}

export interface MaritimePreset {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  description: string;
}

// ============================================================================
// Real-World AIS Vessel Tracking Types
// ============================================================================

export interface AISProviderStatus {
  provider_name: string;
  is_connected: boolean;
  connection_status: 'REAL' | 'NOT CONNECTED' | 'OFFLINE' | 'NO DATA' | 'DEMO';
  message: string;
  api_endpoint: string;
  api_key_configured: boolean;
  total_vessels_tracked: number;
  last_query_timestamp: string | null;
  cache_ttl_seconds: number;
  cache_ttl_remaining_seconds: number;
  demo_mode_active?: boolean;
  rate_limit_notice: string;
  instructions: string;
}

export interface AISVesselPosition {
  mmsi: string;
  vessel_name: string;
  vessel_type: string;
  latitude: number;
  longitude: number;
  sog_knots: number;
  speed_over_ground?: number | null;
  cog_degrees: number;
  course_over_ground?: number | null;
  heading?: number | null;
  navigation_status: string;
  nav_status?: string | null;
  nav_status_code?: number | null;
  last_received_timestamp: string;
  timestamp_utc?: string | null;
  signal_age_seconds?: number | null;
  data_provider: string;
  data_source?: string | null;
  data_mode?: 'LIVE' | 'HISTORICAL' | 'DEMO' | 'NOT_CONNECTED';
  data_source_type?: string | null;
  data_freshness?: 'LIVE' | 'RECENT' | 'STALE' | string;
  position_accuracy?: string | null;
  position_confidence_metadata?: Record<string, any> | null;
  is_simulated?: boolean;
  callsign?: string | null;
  imo?: number | null;
  flag?: string | null;
  vessel_type_code?: number | null;
  vessel_category: 'CARGO' | 'TANKER' | 'FISHING' | 'PASSENGER' | 'TUG' | 'HSC' | 'PILOT' | 'SAR' | 'PLEASURE' | 'SPECIAL' | 'LAW_ENFORCEMENT' | 'OTHER' | string;
  length_m?: number | null;
  width_m?: number | null;
  draught_m?: number | null;
  destination?: string | null;
  eta?: string | null;
}

export interface AISVesselMovement {
  mmsi: string;
  vessel_name: string;
  latitude: number;
  longitude: number;
  speed_over_ground: number;
  course_over_ground: number;
  heading?: number | null;
  navigation_status: string;
  last_received_timestamp: string;
  data_provider: string;
  is_simulated?: boolean;
  movement_vector?: {
    speed_knots: number;
    course_degrees: number;
    status: string;
  };
  recent_waypoints?: Array<{
    timestamp: string;
    latitude: number;
    longitude: number;
    sog: number;
    cog: number;
  }>;
}

export interface AISSignalGapAnalysis {
  mmsi: string;
  vessel_name: string;
  last_received_utc?: string | null;
  gap_duration_seconds?: number | null;
  has_signal_gap: boolean;
  threshold_seconds: number;
  risk_assessment: 'NORMAL' | 'MONITORED_GAP' | 'EXTENDED_ABSENCE';
  compliance_disclaimer: string;
  plausible_technical_causes: string[];
}

export interface AISQueryFilter {
  min_lat?: number;
  max_lat?: number;
  min_lon?: number;
  max_lon?: number;
  mmsi?: string;
  vessel_name?: string;
  vessel_categories?: string[];
  min_speed_knots?: number;
  max_speed_knots?: number;
  nav_status_codes?: number[];
  limit?: number;
  demo?: boolean;
}

export interface AISVesselResponse {
  provider_status: AISProviderStatus;
  vessels: AISVesselPosition[];
  total_count: number;
  filtered_count: number;
  query_timestamp: string;
  bounding_box?: { min_lat: number; max_lat: number; min_lon: number; max_lon: number } | null;
  compliance_notice: string;
}

export interface AISVesselDetailedView {
  vessel: AISVesselPosition;
  track_history: Array<{
    timestamp_utc: string;
    latitude: number;
    longitude: number;
    sog_knots: number;
    cog_degrees: number;
    nav_status: string;
    nav_status_code?: number;
  }>;
  signal_gap_analysis: AISSignalGapAnalysis;
}

export interface AISVesselAnomaly {
  anomaly_id: string;
  anomaly_type: 
    | 'UNUSUAL_LOITERING'
    | 'REPEATED_COURSE_CHANGES'
    | 'UNEXPECTED_ROUTE_DEVIATION'
    | 'UNUSUAL_SPEED_PATTERN'
    | 'PROLONGED_STATIONARY_OPEN_SEA'
    | 'TRANSPONDER_REPORTING_GAP'
    | 'PROXIMITY_TO_MARINE_ANOMALY'
    | 'SENSITIVE_AREA_ACTIVITY';
  mmsi: string;
  vessel_name: string;
  vessel_type: string;
  vessel_category: string;
  latitude: number;
  longitude: number;
  observation_time_window: {
    start_utc: string;
    end_utc: string;
    duration_minutes: number;
  };
  evidence_used: string[];
  detection_method: string;
  severity: 'LOW' | 'MODERATE' | 'ELEVATED' | 'CRITICAL';
  confidence: number;
  uncertainty: number;
  explanation: string;
  data_limitations: string[];
  compliance_disclaimer: string;
  data_mode: 'LIVE' | 'HISTORICAL' | 'DEMO' | 'NOT_CONNECTED';
}

export interface AISAnomalyReport {
  total_anomalies: number;
  anomalies: AISVesselAnomaly[];
  generated_at: string;
  data_mode: string;
  compliance_notice: string;
}

export interface AISCrossAgentCorrelation {
  correlation_id: string;
  vessel_mmsi: string;
  vessel_name: string;
  vessel_category: string;
  vessel_coordinates: { latitude: number; longitude: number };
  vessel_timestamp_utc: string;
  vessel_sog_knots: number;
  vessel_cog_degrees: number;
  anomaly_source: 'SENTINEL_1_SAR' | 'SENTINEL_2_OPTICAL' | 'COPERNICUS_MARINE';
  target_id: string;
  target_coordinates: { latitude: number; longitude: number };
  target_timestamp_utc: string;
  target_type: string;
  spatial_separation_km: number;
  spatial_separation_nm: number;
  temporal_separation_hours: number;
  drift_current_speed_knots?: number | null;
  drift_current_direction_deg?: number | null;
  hydrodynamic_alignment_angle_deg?: number | null;
  hydrodynamic_plausibility: 'HIGH' | 'MODERATE' | 'LOW' | 'INCONCLUSIVE';
  correlation_status: 
    | 'SPATIAL_TEMPORAL_CONVERGENCE'
    | 'TRANSITING_CORRIDOR'
    | 'STATIONARY_VICINITY'
    | 'INCONCLUSIVE_PROXIMITY';
  confidence_score: number;
  uncertainty_score: number;
  findings_summary: string;
  limitations: string[];
  compliance_disclaimer: string;
}

export interface AISAnalyzeRequest {
  zone_id?: string;
  min_lat?: number;
  max_lat?: number;
  min_lon?: number;
  max_lon?: number;
  correlate_with_sar?: boolean;
  correlate_with_optical?: boolean;
  correlate_with_ocean?: boolean;
  demo?: boolean;
}

export interface AISAnalyzeResponse {
  analysis_id: string;
  analyzed_at: string;
  data_mode: string;
  vessels_analyzed: number;
  anomalies_detected: number;
  anomalies: AISVesselAnomaly[];
  correlations: AISCrossAgentCorrelation[];
  orchestrator_evidence_payload: Record<string, any>;
  compliance_statement: string;
}


// ============================================================================
// Sentinel-2 Optical Satellite Types
// ============================================================================

export interface OpticalAssetDetail {
  key: string;
  name: string;
  href: string;
  media_type: string;
  role: string;
  band_name?: string | null;
  central_wavelength_nm?: number | null;
  bandwidth_nm?: number | null;
  spatial_resolution_m?: number | null;
  is_downloadable: boolean;
  requires_auth: boolean;
  file_size_bytes?: number | null;
}

export interface OpticalProductAssetsResponse {
  product_id: string;
  assets_count: number;
  available_bands: string[];
  public_previews: OpticalAssetDetail[];
  scientific_rasters: OpticalAssetDetail[];
  auth_configured: boolean;
  auth_status: string;
}

export interface OpticalDownloadResponse {
  product_id: string;
  asset_key: string;
  status: 'DOWNLOADED' | 'ALREADY_CACHED' | 'AUTH_REQUIRED_FOR_FULL_RASTER' | 'FAILED';
  file_path?: string | null;
  file_size_bytes: number;
  is_preview: boolean;
  media_type: string;
  download_duration_ms: number;
  auth_instructions?: string | null;
  message: string;
}

export interface OpticalSpectralIndicators {
  ndci_chlorophyll_proxy: number;
  turbidity_spm_index: number;
  ndwi_water_index: number;
  algal_bloom_risk: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH';
  turbidity_severity: 'CLEAR' | 'SLIGHT_PLUME' | 'MODERATE_TURBIDITY' | 'HEAVY_SEDIMENT';
  anomaly_coverage_sq_km: number;
  cloud_coverage_pct: number;
  valid_water_coverage_pct?: number;
  mean_reflectance: Record<string, number>;
  direct_observations?: {
    calibrated_radiometry?: string;
    mean_surface_reflectance_toa?: Record<string, number>;
    screened_cloud_pixels_pct?: number;
    screened_water_pixels_pct?: number;
    screening_method?: string;
  };
  derived_proxies?: {
    chlorophyll_ndci_proxy?: number;
    turbidity_spm_proxy?: number;
    water_delineation_ndwi?: number;
    bloom_risk_classification?: string;
    turbidity_severity_classification?: string;
  };
}

export interface OpticalProcessRequest {
  product_id: string;
  zone_id?: string;
  asset_key?: string;
  custom_image_base64?: string;
  allow_synthetic_fallback?: boolean;
}

export interface OpticalProcessingResult {
  analysis_id: string;
  product_id: string;
  zone_id?: string;
  acquisition_timestamp?: string;
  processed_at: string;
  execution_duration_ms: number;
  data_tier: 'FULL_MULTISPECTRAL_RASTER' | 'CALIBRATED_PREVIEW_ANALYSIS' | 'METADATA_DISCOVERY' | 'SIMULATED' | 'NOT_AVAILABLE';
  is_preview: boolean;
  source_attribution: string;
  spectral_indicators: OpticalSpectralIndicators;
  uncertainty_margin?: number;
  processing_status?: 'COMPLETED' | 'HIGH_CLOUD_COVER' | 'INSUFFICIENT_WATER_PIXELS' | 'FAILED' | 'DOWNLOAD_ERROR' | string;
  spatial_coverage?: {
    bbox?: number[];
    crs?: string;
    pixel_width?: number;
    pixel_height?: number;
    [key: string]: any;
  };
  scientific_disclaimer?: string;
  quality_flags?: string[];
  error_message?: string | null;
  visualizations: {
    true_color_rgb_png?: string;
    chlorophyll_ndci_png?: string;
    turbidity_spm_png?: string;
    [key: string]: string | undefined;
  };
  scientific_notes: string;
  processing_engine_info?: Record<string, any>;
}

// ============================================================================
// IoT Buoy & Hardware Telemetry Types
// ============================================================================

export interface IoTDeviceStatusResponse {
  hardware_connection_status: 'LIVE' | 'NOT CONNECTED';
  active_hardware_devices_count: number;
  registered_devices: Array<Record<string, any>>;
  last_hardware_heartbeat?: string | null;
  telemetry_source: 'REAL_HARDWARE_INGESTION' | 'SIMULATED_BASELINE_MODEL';
  data_mode: 'LIVE' | 'SIMULATED' | 'NOT CONNECTED';
  instructions: string;
}

export interface IoTBuoyItem {
  buoy_id: string;
  station_name: string;
  deployment_program: string;
  latitude: number;
  longitude: number;
  battery_pct: number;
  solar_yield_watts: number;
  sea_surface_temp_c: number;
  wave_height_meters: number;
  wave_period_sec: number;
  wind_speed_knots: number;
  status: 'LIVE' | 'SIMULATED' | 'OFFLINE' | 'NOT CONNECTED';
  data_mode: 'LIVE' | 'SIMULATED' | 'NOT CONNECTED';
  last_transmission?: string | null;
}

export interface ESP32TelemetryIngestPayload {
  device_id: string;
  hardware_mac?: string;
  firmware_version?: string;
  zone_id: string;
  latitude?: number;
  longitude?: number;
  water_temperature_c: number;
  dissolved_oxygen_mg_l: number;
  ph_level: number;
  salinity_psu: number;
  turbidity_ntu: number;
  battery_percentage?: number;
  solar_charge_watts?: number;
  timestamp?: string;
}

export interface ESP32IngestResponse {
  status: 'INGESTED' | 'REJECTED' | 'UNAUTHORIZED';
  device_id: string;
  record_id: string;
  message: string;
  received_at: string;
}

// ============================================================================
// Phase 5: Virtual ESP32 Buoy & IoT Intelligence Types
// ============================================================================

export type IoTScenarioType = 'normal' | 'anomaly' | 'offline';
export type IoTSeverityType = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface IoTSensorReading {
  sensor_name: string;
  sensor_type: string;
  value: number;
  unit: string;
  expected_range: { min: number; max: number };
  status: 'NORMAL' | 'ANOMALY' | 'WARNING';
}

export interface VirtualESP32Telemetry {
  device_id: string;
  device_name: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  deployment_location: string;
  water_temperature_c: number;
  ph_level: number;
  turbidity_ntu: number;
  dissolved_oxygen_mg_l: number;
  salinity_psu: number;
  battery_percentage: number;
  signal_strength_dbm: number;
  packet_sequence: number;
  battery_voltage_v: number;
  current_scenario: IoTScenarioType;
  is_simulated: boolean;
  data_mode: 'SIMULATED' | 'LIVE' | 'NOT_CONNECTED';
  sensors: Record<string, IoTSensorReading>;
}

export interface IoTAnomalyEvent {
  anomaly_id: string;
  device_id: string;
  sensor_name: string;
  observed_value: number;
  expected_range: { min: number; max: number };
  unit: string;
  severity: IoTSeverityType;
  timestamp: string;
  detection_rule: string;
  explanation: string;
  confidence: number;
  uncertainty: number;
  data_mode: 'SIMULATED' | 'LIVE' | 'NOT_CONNECTED';
  is_simulated: boolean;
  compliance_disclaimer: string;
}

export interface VirtualESP32DeviceDetail {
  device_id: string;
  device_name: string;
  device_type: string;
  device_mode: 'SIMULATED' | 'LIVE' | 'NOT_CONNECTED';
  connectivity: 'VIRTUAL' | 'SIMULATED_ONLINE' | 'OFFLINE';
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  current_scenario: IoTScenarioType;
  latitude: number;
  longitude: number;
  deployment_location: string;
  microcontroller: string;
  firmware_version: string;
  antenna_type: string;
  battery_capacity_mah: number;
  solar_panel_spec: string;
  sensors_installed: string[];
  last_seen_timestamp: string | null;
  last_telemetry: VirtualESP32Telemetry | null;
  active_anomalies_count: number;
  is_simulated: boolean;
  data_mode: string;
}

export interface IoTStatusResponse {
  device_id: string;
  device_name: string;
  device_status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  data_mode: 'SIMULATED' | 'LIVE' | 'NOT_CONNECTED';
  is_simulated: boolean;
  scenario: IoTScenarioType;
  last_seen_timestamp: string | null;
  connectivity_status: 'VIRTUAL' | 'SIMULATED_ONLINE' | 'OFFLINE';
  is_generating_telemetry: boolean;
  telemetry_interval_seconds: number;
  active_anomalies_count: number;
  total_packets_generated: number;
  instructions: string;
}

export interface IoTScenarioChangeResponse {
  device_id: string;
  previous_scenario: string;
  current_scenario: IoTScenarioType;
  status: string;
  message: string;
  timestamp: string;
  is_simulated: boolean;
  data_mode: string;
}

export interface IoTHistoryResponse {
  device_id: string;
  data_mode: string;
  is_simulated: boolean;
  total_records: number;
  history: VirtualESP32Telemetry[];
}

// ============================================================================
// Phase 6: Multi-Agent Intelligence & Lead Orchestrator Types
// ============================================================================

export type OrchestrationDataMode = 'LIVE' | 'HISTORICAL' | 'MODEL_OUTPUT' | 'SIMULATED' | 'DEMO' | 'NOT_CONNECTED';
export type OrchestrationAgentStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'NOT_CONNECTED' | 'SKIPPED';
export type OrchestrationQualityStatus = 'VERIFIED' | 'CALIBRATED_ESTIMATE' | 'UNCERTAIN' | 'DEGRADED' | 'SYNTHETIC';
export type OrchestrationSpatialRelationship = 'INTERSECTS' | 'WITHIN_IMMEDIATE_PROXIMITY' | 'WITHIN_LOCAL_AREA' | 'DISTANT' | 'DISJOINT';
export type OrchestrationTemporalCompatibility = 'COINCIDENT' | 'HIGH' | 'MODERATE' | 'LOW' | 'INCOMPATIBLE';

export type IncidentCategoryType = 
  | 'POSSIBLE_OIL_SPILL_SURFACE_ANOMALY'
  | 'POSSIBLE_WATER_QUALITY_ANOMALY'
  | 'POSSIBLE_UNUSUAL_VESSEL_ACTIVITY'
  | 'POSSIBLE_MARINE_ENVIRONMENTAL_STRESS'
  | 'BASELINE_EVALUATION';

export interface UnifiedEvidenceRecord {
  evidence_id: string;
  agent_name: string;
  evidence_type: string;
  source_name: string;
  source_identifier: string;
  observation_timestamp: string;
  ingestion_timestamp: string;
  latitude?: number | null;
  longitude?: number | null;
  spatial_coverage?: Record<string, any> | null;
  data_mode: OrchestrationDataMode;
  is_simulated: boolean;
  measurement_or_indicator: string;
  value: any;
  unit: string;
  confidence: number;
  uncertainty: number;
  quality_status: OrchestrationQualityStatus;
  processing_method: string;
  provenance: Record<string, any>;
  limitations: string[];
}

export interface SpatialCorrelationRecord {
  correlation_id: string;
  evidence_id_a: string;
  evidence_id_b: string;
  agent_a: string;
  agent_b: string;
  distance_km: number;
  spatial_relationship: OrchestrationSpatialRelationship;
  correlation_radius_km: number;
  proximity_summary: string;
  spatial_confidence_factor: number;
  causation_disclaimer: string;
}

export interface TemporalCorrelationRecord {
  correlation_id: string;
  evidence_id_a: string;
  evidence_id_b: string;
  agent_a: string;
  agent_b: string;
  time_difference_hours: number;
  applicable_window_hours: number;
  temporal_compatibility: OrchestrationTemporalCompatibility;
  freshness_status_a: string;
  freshness_status_b: string;
  drift_analysis?: Record<string, any> | null;
}

export interface EvidenceQualityAssessment {
  overall_quality_score: number;
  data_reliability_score: number;
  freshness_score: number;
  spatial_relevance_score: number;
  temporal_relevance_score: number;
  missing_evidence_count: number;
  simulated_evidence_count: number;
  quality_rules_applied: string[];
}

export interface MultiAgentInvestigationRequest {
  zone_id: string;
  bbox?: number[] | null;
  time_range_hours?: number;
  incident_hint?: string | null;
  enabled_agents?: string[];
  correlation_radius_km?: number;
  temporal_window_hours?: number;
}

export interface FinalMarineIntelligenceAssessment {
  assessment_id: string;
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
  incident_category: IncidentCategoryType;
  assessment_label: string;
  geographic_area: {
    zone_id?: string;
    zone_name?: string;
    centroid_latitude?: number;
    centroid_longitude?: number;
    boundary_or_bbox?: any;
  };
  observation_period: {
    earliest_observation?: string;
    latest_observation?: string;
    time_span_hours?: number;
  };
  agent_statuses: Record<string, OrchestrationAgentStatus>;
  agent_execution_times_ms: Record<string, number>;
  evidence_summary: UnifiedEvidenceRecord[];
  spatial_correlations: SpatialCorrelationRecord[];
  temporal_correlations: TemporalCorrelationRecord[];
  supporting_evidence: Array<{
    agent?: string;
    evidence_id?: string;
    finding: string;
    significance?: string;
  }>;
  contradicting_evidence: Array<{
    agent?: string;
    finding: string;
    significance?: string;
  }>;
  missing_evidence: string[];
  data_quality: EvidenceQualityAssessment;
  confidence: {
    confidence_score: number;
    confidence_tier: string;
    corroboration_level: string;
    contributing_real_agents?: string[];
    positive_factors?: string[];
    penalties_applied?: number;
    basis?: string;
  };
  uncertainty: string[];
  alternative_explanations: string[];
  nugen_reasoning: {
    inference_mode?: string;
    service_status?: string;
    observation?: string;
    hypothesis?: string;
    consensus_action?: string;
    confidence_score?: number;
    severity?: string;
    error_message?: string | null;
  };
  recommended_follow_up: string[];
  data_mode_summary: Record<string, number>;
  generated_at: string;
}

export interface OrchestrationStatusResponse {
  assessment_id: string;
  status: 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';
  total_agents: number;
  completed_agents: number;
  agent_statuses: Record<string, OrchestrationAgentStatus>;
  elapsed_time_ms: number;
  incident_category?: string | null;
  generated_at: string;
}

export interface OrchestrationHistoryResponse {
  total_assessments: number;
  assessments: FinalMarineIntelligenceAssessment[];
}

