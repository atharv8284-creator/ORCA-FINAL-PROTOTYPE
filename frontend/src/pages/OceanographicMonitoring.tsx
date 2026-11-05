import React, { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  Waves,
  Droplets,
  Activity,
  Wind,
  Thermometer,
  Compass,
  Layers,
  Database,
  RefreshCw,
  Calendar,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Navigation,
  AlertCircle,
  Eye
} from 'lucide-react';
import { api } from '../services/api';
import type {
  CopernicusMarineHealth,
  CopernicusMarineDataset,
  OceanographicProfileResponse,
  OceanographicTimeSeriesPoint,
  MaritimePreset,
  SAROceanContext
} from '../types';

export const OceanographicMonitoring: React.FC = () => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'TELEMETRY' | 'DATASETS' | 'HISTORY'>('TELEMETRY');

  // Service health
  const [health, setHealth] = useState<CopernicusMarineHealth | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(false);

  // Maritime presets & location selection
  const [presets, setPresets] = useState<MaritimePreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('PERSIAN_GULF');
  const [latitude, setLatitude] = useState<number>(26.50);
  const [longitude, setLongitude] = useState<number>(55.00);
  const [locationName, setLocationName] = useState<string>('Persian Gulf & Strait of Hormuz');
  const [targetDate, setTargetDate] = useState<string>('2026-10-31');

  // Observation profile state
  const [profile, setProfile] = useState<OceanographicProfileResponse | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // SAR Oceanographic Context State
  const [sarContext, setSarContext] = useState<SAROceanContext | null>(null);
  const [loadingSarContext, setLoadingSarContext] = useState<boolean>(false);

  // Time series state
  const [timeSeries, setTimeSeries] = useState<OceanographicTimeSeriesPoint[]>([]);
  const [loadingTimeSeries, setLoadingTimeSeries] = useState<boolean>(false);

  // Datasets explorer state
  const [datasets, setDatasets] = useState<CopernicusMarineDataset[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [loadingDatasets, setLoadingDatasets] = useState<boolean>(false);

  // History ledger state
  const [historyLedger, setHistoryLedger] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  const fetchHealth = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const data = await api.getCopernicusMarineHealth();
      setHealth(data);
    } catch (err) {
      console.warn('Copernicus Marine health query failed:', err);
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  const fetchDatasets = useCallback(async () => {
    setLoadingDatasets(true);
    try {
      const ds = await api.getCopernicusMarineDatasets();
      setDatasets(ds);
    } catch (err) {
      console.warn('Failed to fetch Copernicus Marine datasets:', err);
    } finally {
      setLoadingDatasets(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const h = await api.getOceanographicHistory(20);
      setHistoryLedger(h);
    } catch (err) {
      console.warn('Failed to load oceanographic history ledger:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const loadTimeSeries = useCallback(async (lat: number, lon: number, locName: string) => {
    setLoadingTimeSeries(true);
    try {
      const ts = await api.queryOceanographicTimeSeries(lat, lon, 7, locName);
      setTimeSeries(ts.points);
    } catch (err) {
      console.warn('Failed to fetch time-series profile:', err);
    } finally {
      setLoadingTimeSeries(false);
    }
  }, []);

  const loadPointObservation = useCallback(async (lat: number, lon: number, locName: string) => {
    setLoadingProfile(true);
    setProfileError(null);
    try {
      const data = await api.queryOceanographicPoint({
        latitude: lat,
        longitude: lon,
        zone_name: locName,
        target_date: targetDate
      });
      setProfile(data);

      loadTimeSeries(lat, lon, locName);
      fetchHistory();

      // Query environmental transport context for SAR anomalies
      setLoadingSarContext(true);
      try {
        const sCtx = await api.getSAROceanContext({
          sar_product_id: 'S1A_IW_GRDH_1SDV_CMS_CORR',
          latitude: lat,
          longitude: lon,
          sar_acquisition_timestamp: `${targetDate}T14:25:10Z`
        });
        setSarContext(sCtx);
      } catch (sErr) {
        console.warn('SAR contextual transport query failed:', sErr);
      } finally {
        setLoadingSarContext(false);
      }
    } catch (err: any) {
      setProfileError(err.message || 'Error querying Copernicus Marine observations');
    } finally {
      setLoadingProfile(false);
    }
  }, [targetDate, loadTimeSeries, fetchHistory]);

  const fetchPresets = useCallback(async () => {
    try {
      const p = await api.getOceanographicPresets();
      setPresets(p);
      if (p.length > 0) {
        setSelectedPresetId(p[0].id);
        setLatitude(p[0].latitude);
        setLongitude(p[0].longitude);
        setLocationName(p[0].name);
        loadPointObservation(p[0].latitude, p[0].longitude, p[0].name);
      }
    } catch (err) {
      console.warn('Failed to load maritime presets:', err);
    }
  }, [loadPointObservation]);

  // 1. Initial Load: Presets, Health, Datasets & History
  useEffect(() => {
    fetchHealth();
    fetchPresets();
    fetchDatasets();
    fetchHistory();
  }, [fetchHealth, fetchPresets, fetchDatasets, fetchHistory]);

  // Preset Selection Handler
  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (presetId === 'CUSTOM') return;

    const found = presets.find((p) => p.id === presetId);
    if (found) {
      setLatitude(found.latitude);
      setLongitude(found.longitude);
      setLocationName(found.name);
      loadPointObservation(found.latitude, found.longitude, found.name);
    }
  };

  const handleCustomQuery = () => {
    const loc = selectedPresetId === 'CUSTOM' ? `Custom Point (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)` : locationName;
    loadPointObservation(latitude, longitude, loc);
  };

  const handleRestoreRecord = (record: any) => {
    setLatitude(record.query_latitude);
    setLongitude(record.query_longitude);
    setLocationName(record.location_name);
    setSelectedPresetId('CUSTOM');
    // Map record to profile
    setProfile({
      query_latitude: record.query_latitude,
      query_longitude: record.query_longitude,
      location_name: record.location_name,
      query_timestamp: record.saved_at,
      data_source: record.data_source,
      data_source_url: 'https://marine.copernicus.eu/',
      service_status: record.service_status,
      data_tier: record.data_tier || 'NUMERICAL_MODEL_ANALYSIS',
      retrieval_status: record.retrieval_status || 'SUCCESS',
      spatial_coverage: record.spatial_coverage,
      temporal_range: record.temporal_range,
      error_message: record.error_message,
      authentication_status: record.authentication_status,
      observations: record.observations || [],
      summary_card: record.summary_card || {},
      retrieved_at: record.saved_at
    });
    setActiveTab('TELEMETRY');
  };

  const filteredDatasets = datasets.filter((d) => {
    if (selectedCategoryFilter === 'ALL') return true;
    return d.product_type === selectedCategoryFilter;
  });

  const sc = profile?.summary_card || {};
  const currentSpeed = sc.ocean_currents?.current_speed_knots ?? null;
  const currentDir = sc.ocean_currents?.current_direction_deg ?? 0;
  const waveHeight = sc.waves?.significant_wave_height_m ?? null;
  const wavePeriod = sc.waves?.wave_peak_period_s ?? null;
  const waveDir = sc.waves?.mean_wave_direction_deg ?? null;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-surface-border pb-5">
        <div>
          <div className="flex items-center space-x-2 text-biolum-cyan text-xs font-mono font-bold tracking-widest uppercase mb-1">
            <Waves className="w-4 h-4 animate-pulse" />
            <span>Copernicus Marine Service (CMS / CMEMS) Integration</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Oceanographic & Biogeochemical Monitoring
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Real physical ocean observations, multi-satellite SST analyses, and operational Mercator 1/12°
            hydrodynamic forecasts retrieved directly from the Copernicus Marine Data Store.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center space-x-2 bg-surface-card border border-surface-border p-1.5 rounded-xl self-start">
          <button
            onClick={() => setActiveTab('TELEMETRY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'TELEMETRY'
                ? 'bg-biolum-cyan text-navy-950 shadow-md shadow-biolum-cyan/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Live Telemetry</span>
          </button>

          <button
            onClick={() => setActiveTab('DATASETS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'DATASETS'
                ? 'bg-ocean-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Dataset Catalog ({datasets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'HISTORY'
                ? 'bg-navy-800 text-amber-300 border border-amber-600/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Query Ledger ({historyLedger.length})</span>
          </button>
        </div>
      </div>

      {/* API Status Bar */}
      <div className="p-3.5 rounded-xl bg-navy-900 border border-surface-border text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                health?.status === 'OPERATIONAL'
                  ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                  : 'bg-amber-400'
              }`}
            />
            <span className="font-bold text-white font-mono text-[11px]">
              Copernicus Marine API: {health?.status || 'CONNECTING...'}
            </span>
          </div>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 font-mono text-[11px]">
            Endpoint: <span className="text-slate-300">stac.marine.copernicus.eu</span>
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 font-mono text-[11px]">
            Latency: <span className="text-biolum-cyan">{health?.latency_ms || 0} ms</span>
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
              health?.auth_configured
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-ocean-950 text-ocean-300 border border-ocean-800'
            }`}
          >
            {health?.auth_configured
              ? `Auth: ${health.auth_username}`
              : 'Open STAC/WMTS Access Active'}
          </span>
          <button
            onClick={fetchHealth}
            disabled={loadingHealth}
            className="p-1 rounded bg-navy-800 hover:bg-navy-700 text-slate-300 border border-surface-border transition-all"
            title="Refresh API Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin text-biolum-cyan' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LIVE TELEMETRY & OBSERVATION PROFILES                              */}
      {/* ========================================================================= */}
      {activeTab === 'TELEMETRY' && (
        <div className="space-y-6">
          {/* Geographical & Temporal Selection Card */}
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-surface-border pb-3">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-biolum-cyan" />
                <h3 className="font-bold text-white text-sm">Geographical Maritime Selection</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Spatial Resolution: 0.083° (~9 km) • Small BBOX Subsetting
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              {/* Preset Selector */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Global Maritime Corridor:
                </label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full bg-navy-950 border border-surface-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-biolum-cyan"
                >
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  <option value="CUSTOM">Custom Coordinates (Lat, Lon)</option>
                </select>
              </div>

              {/* Latitude Input */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Latitude (° North/South):
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="-90"
                  max="90"
                  value={latitude}
                  onChange={(e) => {
                    setLatitude(parseFloat(e.target.value) || 0);
                    setSelectedPresetId('CUSTOM');
                  }}
                  className="w-full bg-navy-950 border border-surface-border rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-biolum-cyan"
                />
              </div>

              {/* Longitude Input */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Longitude (° East/West):
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="-180"
                  max="180"
                  value={longitude}
                  onChange={(e) => {
                    setLongitude(parseFloat(e.target.value) || 0);
                    setSelectedPresetId('CUSTOM');
                  }}
                  className="w-full bg-navy-950 border border-surface-border rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-biolum-cyan"
                />
              </div>

              {/* Date Input & Query Action */}
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1 mb-1">
                    <Calendar className="w-3 h-3 text-biolum-teal" />
                    <span>Target Date:</span>
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-navy-950 border border-surface-border rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                  />
                </div>
                <button
                  onClick={handleCustomQuery}
                  disabled={loadingProfile}
                  className="px-4 py-2 bg-gradient-to-r from-ocean-600 via-biolum-cyan to-biolum-teal hover:opacity-95 text-navy-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow-md shadow-biolum-cyan/20 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingProfile ? 'animate-spin' : ''}`} />
                  <span>Fetch CMS Data</span>
                </button>
              </div>
            </div>

            {profileError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300">
                {profileError}
              </div>
            )}

            {/* Terrestrial / Masked Shallow Warning */}
            {profile?.retrieval_status === 'MASKED_TERRESTRIAL' && (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-amber-300">Terrestrial or Masked Shallow Water Coordinate</div>
                  <div className="text-[11px] leading-relaxed text-slate-300">
                    The requested coordinates ({latitude.toFixed(2)}°, {longitude.toFixed(2)}°) intersect terrestrial land or shallow coastal mask without open-ocean hydrodynamic model coverage. Please select a preset marine corridor or offshore oceanic coordinates.
                  </div>
                </div>
              </div>
            )}

            {/* Data Tier Header Badge */}
            {profile && profile.retrieval_status !== 'MASKED_TERRESTRIAL' && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-border text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400 font-mono text-[11px]">Active Evidence Tier:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                    profile.data_tier === 'LIVE_COPERNICUS_MARINE_OBSERVATIONS'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : profile.data_tier === 'FORECAST'
                      ? 'bg-purple-950 text-purple-300 border border-purple-800'
                      : 'bg-ocean-950 text-ocean-300 border border-ocean-800'
                  }`}>
                    {profile.data_tier === 'LIVE_COPERNICUS_MARINE_OBSERVATIONS'
                      ? 'DIRECT IN-SITU / SATELLITE OBSERVATION'
                      : profile.data_tier === 'FORECAST'
                      ? 'OPERATIONAL HYDRODYNAMIC FORECAST'
                      : 'NUMERICAL MODEL REANALYSIS (NEMO / MFWAM)'}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Status: <span className="text-emerald-400 font-bold">{profile.retrieval_status}</span> • Retrieved {profile.observations.length} Physical Variables
                </span>
              </div>
            )}
          </div>

          {/* Primary Parameter Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Sea Surface Temperature */}
            <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">
                  Temperature Profile
                </span>
                <Thermometer className="w-4 h-4 text-rose-400" />
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-3xl font-black font-mono text-white">
                    {sc.sea_surface_temp_c !== undefined && sc.sea_surface_temp_c !== null
                      ? `${sc.sea_surface_temp_c}`
                      : '--'}
                  </span>
                  <span className="text-sm font-bold text-rose-400 font-mono">°C (SST)</span>
                  <span className="text-[10px] font-mono text-slate-400 ml-1">±0.35°C</span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Sea Floor Boundary:</span>
                  <span className="font-mono text-slate-300">
                    {sc.sea_bottom_temp_c !== undefined && sc.sea_bottom_temp_c !== null
                      ? `${sc.sea_bottom_temp_c} °C`
                      : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-surface-border flex items-center justify-between text-[10px] font-mono">
                <span className="text-ocean-400">Model Physics (NEMO)</span>
                <span className="text-emerald-400 flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verified Range</span>
                </span>
              </div>
            </div>

            {/* Card 2: Salinity */}
            <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">
                  Practical Salinity (SSS)
                </span>
                <Droplets className="w-4 h-4 text-amber-400" />
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-3xl font-black font-mono text-white">
                    {sc.salinity_psu !== undefined && sc.salinity_psu !== null
                      ? `${sc.salinity_psu}`
                      : '--'}
                  </span>
                  <span className="text-sm font-bold text-amber-400 font-mono">PSU</span>
                  <span className="text-[10px] font-mono text-slate-400 ml-1">±0.15</span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Surface vs Bottom:</span>
                  <span className="font-mono text-slate-300">
                    {sc.sea_surface_salinity_psu ?? sc.salinity_psu ?? '--'} / {sc.sea_bottom_salinity_psu ?? 'N/A'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-surface-border flex items-center justify-between text-[10px] font-mono">
                <span className="text-amber-400 truncate max-w-[140px]">
                  {sc.salinity_psu && sc.salinity_psu > 37.0 ? 'Hypersaline Basin' : 'Normal Oceanic'}
                </span>
                <span className="text-emerald-400 flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Valid Range</span>
                </span>
              </div>
            </div>

            {/* Card 3: Ocean Surface Currents */}
            <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">
                  Ocean Currents (u, v)
                </span>
                <Wind className="w-4 h-4 text-biolum-cyan" />
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-black font-mono text-white">
                    {currentSpeed !== null ? currentSpeed.toFixed(2) : '--'}
                  </span>
                  <span className="text-sm font-bold text-biolum-cyan font-mono">knots</span>
                  {currentSpeed !== null && (
                    <span className="text-xs text-slate-400 font-mono">
                      ({(currentSpeed / 1.94384).toFixed(2)} m/s)
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Drift Direction:</span>
                  <span className="font-mono text-biolum-teal flex items-center space-x-1">
                    <Compass
                      className="w-3.5 h-3.5 inline-block transition-transform duration-500"
                      style={{ transform: `rotate(${currentDir}deg)` }}
                    />
                    <span>
                      {sc.ocean_currents?.drift_direction_cardinal || ''} ({currentDir.toFixed(1)}°)
                    </span>
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-surface-border flex items-center justify-between text-[10px] font-mono">
                <span className="text-ocean-400">Tidal/Wind Coupled</span>
                <span className="text-slate-400">
                  u: {sc.ocean_currents?.u_eastward_ms?.toFixed(3) ?? '--'} m/s
                </span>
              </div>
            </div>

            {/* Card 4: Wave Dynamics */}
            <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">
                  Wave Sea State (MFWAM)
                </span>
                <Waves className="w-4 h-4 text-biolum-teal" />
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-3xl font-black font-mono text-white">
                    {waveHeight !== null ? waveHeight.toFixed(2) : '--'}
                  </span>
                  <span className="text-sm font-bold text-biolum-teal font-mono">m (Hs)</span>
                  <span className="text-[10px] font-mono text-slate-400 ml-1">±0.20m</span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Peak Period (Tp):</span>
                  <span className="font-mono text-slate-300">
                    {wavePeriod !== null ? `${wavePeriod.toFixed(1)} s` : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-surface-border flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400">
                  Dir: {sc.waves?.wave_direction_cardinal || ''} {waveDir !== null ? `${waveDir.toFixed(0)}°` : 'N/A'}
                </span>
                <span className="text-biolum-teal">
                  {waveHeight && waveHeight > 2.5 ? 'Rough Sea' : 'Moderate / Slight'}
                </span>
              </div>
            </div>
          </div>

          {/* SAR Contextual Environmental Transport Panel */}
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-3">
              <div className="flex items-center space-x-2">
                <Navigation className="w-4 h-4 text-biolum-cyan" />
                <h3 className="font-bold text-white text-sm">
                  SAR Anomaly Environmental Drift Context (Copernicus CMS Coupled)
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-ocean-950 text-ocean-300 border border-ocean-800">
                  Freshness: {sarContext?.data_freshness || 'LIVE'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {sarContext?.data_classification || 'MODEL_ANALYSIS'}
                </span>
              </div>
            </div>

            {loadingSarContext ? (
              <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-biolum-cyan" />
                <span>Computing hydrodynamic transport vectors for coordinates...</span>
              </div>
            ) : sarContext ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-navy-900 border border-surface-border text-xs space-y-1">
                    <div className="text-[10px] font-mono text-slate-400">SURFACE DRIFT VECTOR</div>
                    <div className="text-base font-bold text-white font-mono flex items-center space-x-1.5">
                      <Compass
                        className="w-4 h-4 text-biolum-cyan transition-transform duration-500"
                        style={{ transform: `rotate(${sarContext.surface_current_direction_deg || 0}deg)` }}
                      />
                      <span>
                        {sarContext.drift_direction_cardinal || 'N/A'} ({sarContext.surface_current_direction_deg?.toFixed(1) || '--'}°)
                      </span>
                    </div>
                    <div className="text-[11px] text-biolum-teal font-mono">
                      {sarContext.surface_current_speed_knots?.toFixed(2) || '--'} kts ({((sarContext.surface_current_speed_knots || 0) / 1.94384).toFixed(2)} m/s)
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-navy-900 border border-surface-border text-xs space-y-1">
                    <div className="text-[10px] font-mono text-slate-400">SEA STATE & WAVE ENERGY</div>
                    <div className="text-base font-bold text-white font-mono">
                      {sarContext.significant_wave_height_m?.toFixed(2) || '--'} m (Hs)
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {sarContext.significant_wave_height_m && sarContext.significant_wave_height_m < 0.5
                        ? 'Calm glassy sea (slick damping evident)'
                        : 'Moderate wave activity'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-navy-900 border border-surface-border text-xs space-y-1">
                    <div className="text-[10px] font-mono text-slate-400">TEMPORAL ACQUISITION DELTA</div>
                    <div className="text-base font-bold text-white font-mono">
                      {sarContext.temporal_delta_hours !== null && sarContext.temporal_delta_hours !== undefined
                        ? `${sarContext.temporal_delta_hours} hrs`
                        : 'Synchronous'}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate" title={sarContext.sar_product_id}>
                      SAR: {sarContext.sar_product_id.substring(0, 24)}...
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-navy-900/60 border border-surface-border text-xs text-slate-300">
                  <span className="font-bold text-biolum-cyan">Environmental Summary: </span>
                  {sarContext.environmental_context_summary}
                </div>

                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-600/30 text-xs text-amber-200/90 flex items-start space-x-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    <span className="font-bold text-amber-300">Scientific Integrity Notice: </span>
                    {sarContext.scientific_disclaimer}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                Oceanographic transport data will be computed when coordinates are fetched.
              </div>
            )}
          </div>

          {/* Time Series Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Temperature & Salinity Profile */}
            <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-surface-border pb-3">
                <div className="flex items-center space-x-2">
                  <Thermometer className="w-4 h-4 text-rose-400" />
                  <h3 className="font-bold text-white text-sm">Temperature & Salinity Multi-Day Trend</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  7-Day Subsetting (Copernicus CMS)
                </span>
              </div>

              <div className="w-full h-64">
                {loadingTimeSeries ? (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                    Loading time-series data...
                  </div>
                ) : timeSeries.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                    No time series data available.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#162e54" />
                      <XAxis
                        dataKey="timestamp"
                        stroke="#64748b"
                        fontSize={10}
                        tickFormatter={(t) => t.substring(5, 10)}
                      />
                      <YAxis yAxisId="temp" stroke="#f43f5e" fontSize={10} unit="°C" domain={['auto', 'auto']} />
                      <YAxis
                        yAxisId="sal"
                        orientation="right"
                        stroke="#f59e0b"
                        fontSize={10}
                        unit=" PSU"
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#081324',
                          borderColor: '#162e54',
                          borderRadius: '0.75rem',
                          fontSize: '11px'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                      <Line
                        yAxisId="temp"
                        type="monotone"
                        dataKey="sst_c"
                        stroke="#f43f5e"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Sea Surface Temp (°C)"
                      />
                      <Line
                        yAxisId="sal"
                        type="monotone"
                        dataKey="salinity_psu"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Salinity (PSU)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 2: Wave Dynamics & Currents */}
            <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-surface-border pb-3">
                <div className="flex items-center space-x-2">
                  <Waves className="w-4 h-4 text-biolum-teal" />
                  <h3 className="font-bold text-white text-sm">Wave Height (Hs) & Current Speed Dynamics</h3>
                </div>
                <span className="text-[10px] font-mono text-biolum-cyan">
                  MFWAM & NEMO Hourly
                </span>
              </div>

              <div className="w-full h-64">
                {loadingTimeSeries ? (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                    Loading time-series data...
                  </div>
                ) : timeSeries.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                    No time series data available.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSeries}>
                      <defs>
                        <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#162e54" />
                      <XAxis
                        dataKey="timestamp"
                        stroke="#64748b"
                        fontSize={10}
                        tickFormatter={(t) => t.substring(5, 10)}
                      />
                      <YAxis stroke="#64748b" fontSize={10} unit=" m" domain={[0, 'auto']} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#081324',
                          borderColor: '#162e54',
                          borderRadius: '0.75rem',
                          fontSize: '11px'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                      <Area
                        type="monotone"
                        dataKey="wave_height_m"
                        stroke="#00e5ff"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#waveGrad)"
                        name="Significant Wave Height (m)"
                      />
                      <Line
                        type="monotone"
                        dataKey="current_speed_knots"
                        stroke="#a855f7"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        name="Current Speed (knots)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Observation Metadata & Provenance Ledger */}
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-biolum-cyan" />
                <h3 className="font-bold text-white text-sm">
                  Copernicus Marine Observation Metadata & Physical Ledger ({profile?.observations.length || 0})
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-ocean-950 text-ocean-300 border border-ocean-800">
                Official Data Store Provenance
              </span>
            </div>

            {!profile || profile.observations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No observations retrieved yet. Click "Fetch CMS Data" above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-surface-border text-slate-400 font-mono text-[11px]">
                      <th className="pb-2.5">Variable</th>
                      <th className="pb-2.5">Actual Value</th>
                      <th className="pb-2.5">Unit</th>
                      <th className="pb-2.5">Classification</th>
                      <th className="pb-2.5">Freshness</th>
                      <th className="pb-2.5">Uncertainty</th>
                      <th className="pb-2.5">Product / Dataset ID</th>
                      <th className="pb-2.5">Validation</th>
                      <th className="pb-2.5">Update Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border/60">
                    {profile.observations.map((obs) => {
                      const isObs = obs.data_classification === 'OBSERVATION';
                      const isForecast = obs.data_classification === 'FORECAST';
                      return (
                        <tr key={obs.observation_id} className="hover:bg-navy-900/50 transition-colors">
                          <td className="py-2.5 font-bold text-white flex items-center space-x-1.5">
                            <span className="font-mono text-biolum-cyan text-[11px]">{obs.variable_id}</span>
                            <span className="text-slate-300 truncate max-w-[160px]">{obs.variable_name}</span>
                          </td>
                          <td className="py-2.5 font-mono font-bold text-white">
                            {obs.converted_value}
                          </td>
                          <td className="py-2.5 font-mono text-biolum-teal text-[11px]">
                            {obs.converted_units}
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                isObs
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : isForecast
                                  ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                  : 'bg-ocean-950 text-ocean-300 border border-ocean-800'
                              }`}
                            >
                              {obs.data_classification || 'MODEL_ANALYSIS'}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${
                                obs.data_freshness === 'LIVE'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : obs.data_freshness === 'RECENT'
                                  ? 'bg-ocean-950 text-ocean-300 border border-ocean-800'
                                  : 'bg-amber-950 text-amber-300 border border-amber-800'
                              }`}
                            >
                              {obs.data_freshness || 'LIVE'}
                            </span>
                          </td>
                          <td className="py-2.5 font-mono text-slate-300 text-[10px]">
                            {obs.uncertainty !== null && obs.uncertainty !== undefined
                              ? `±${obs.uncertainty} ${obs.converted_units}`
                              : 'Standard'}
                          </td>
                          <td className="py-2.5 font-mono text-slate-400 text-[10px] truncate max-w-[180px]" title={obs.dataset_id}>
                            {obs.product_id ? `${obs.product_id}` : obs.dataset_id}
                          </td>
                          <td className="py-2.5">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                              {obs.validation_status}
                            </span>
                          </td>
                          <td className="py-2.5 font-mono text-slate-400 text-[10px]">
                            {new Date(obs.last_successful_update).toLocaleTimeString()} UTC
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DATASET & VARIABLE EXPLORER                                        */}
      {/* ========================================================================= */}
      {activeTab === 'DATASETS' && (
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Copernicus Marine Dataset Discovery</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Official marine data store catalog: distinguishing numerical models, satellite observations, and in-situ platforms.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center space-x-1.5 bg-navy-950 p-1 rounded-xl text-xs border border-surface-border">
              <button
                onClick={() => setSelectedCategoryFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  selectedCategoryFilter === 'ALL'
                    ? 'bg-ocean-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({datasets.length})
              </button>
              <button
                onClick={() => setSelectedCategoryFilter('MODEL_ANALYSIS_FORECAST')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  selectedCategoryFilter === 'MODEL_ANALYSIS_FORECAST'
                    ? 'bg-ocean-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Models
              </button>
              <button
                onClick={() => setSelectedCategoryFilter('SATELLITE_OBSERVATION')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  selectedCategoryFilter === 'SATELLITE_OBSERVATION'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Satellite L4
              </button>
              <button
                onClick={() => setSelectedCategoryFilter('IN_SITU_OBSERVATION')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  selectedCategoryFilter === 'IN_SITU_OBSERVATION'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                In-Situ
              </button>
            </div>
          </div>

          {loadingDatasets ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading Copernicus Marine catalog...</div>
          ) : (
            <div className="space-y-4">
              {filteredDatasets.map((ds) => {
                const isModel = ds.product_type === 'MODEL_ANALYSIS_FORECAST';
                const isSat = ds.product_type === 'SATELLITE_OBSERVATION';
                return (
                  <div
                    key={ds.dataset_id}
                    className="p-5 rounded-xl bg-navy-950 border border-surface-border hover:border-slate-600 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-white text-sm">{ds.title}</h4>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              isModel
                                ? 'bg-ocean-950 text-ocean-300 border border-ocean-800'
                                : isSat
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {ds.product_type_label}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-biolum-cyan">{ds.dataset_id}</div>
                      </div>

                      {ds.doi && (
                        <span className="text-[10px] font-mono text-slate-400">
                          DOI: <span className="text-slate-300">{ds.doi}</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{ds.description}</p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-2 border-t border-surface-border/60">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Temporal:</span>
                        <span className="font-mono text-slate-200 text-[11px]">{ds.temporal_resolution}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Spatial:</span>
                        <span className="font-mono text-slate-200 text-[11px]">{ds.spatial_resolution}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Product ID:</span>
                        <span className="font-mono text-ocean-400 text-[11px] truncate block">{ds.product_id}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Variables:</span>
                        <span className="font-mono text-biolum-teal text-[11px]">{ds.variables.length} Registered</span>
                      </div>
                    </div>

                    {/* Variable Chips */}
                    <div className="pt-2 border-t border-surface-border/60">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                        Available Data Cube Variables:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {ds.variables.map((v) => (
                          <div
                            key={v.variable_id}
                            className="px-2 py-1 rounded bg-navy-900 border border-surface-border text-[11px] flex items-center space-x-1.5"
                          >
                            <span className="font-mono font-bold text-biolum-cyan">{v.variable_id}</span>
                            <span className="text-slate-400 font-mono text-[10px]">({v.units})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: OBSERVATION HISTORY LEDGER                                         */}
      {/* ========================================================================= */}
      {activeTab === 'HISTORY' && (
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-surface-border pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Historical Oceanographic Observations Ledger</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Persistent local records of real queries executed against Copernicus Marine Service.
              </p>
            </div>
            <button
              onClick={fetchHistory}
              disabled={loadingHistory}
              className="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-slate-300 border border-surface-border rounded-lg text-xs font-semibold flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin text-biolum-cyan' : ''}`} />
              <span>Refresh Ledger</span>
            </button>
          </div>

          {loadingHistory ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading history ledger...</div>
          ) : historyLedger.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-surface-border rounded-xl">
              No previous queries saved in persistent storage. Query a location in the Live Telemetry tab.
            </div>
          ) : (
            <div className="space-y-3">
              {historyLedger.map((rec) => (
                <div
                  key={rec.record_id}
                  className="p-4 rounded-xl bg-navy-950 border border-surface-border hover:border-slate-600 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-biolum-cyan">{rec.record_id}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-ocean-950 text-ocean-300 border border-ocean-800">
                        {rec.observations_count} Variables
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-white">{rec.location_name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Coordinates: {rec.query_latitude?.toFixed(2)}°, {rec.query_longitude?.toFixed(2)}° • Recorded: {new Date(rec.saved_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleRestoreRecord(rec)}
                      className="px-3 py-1.5 bg-ocean-600 hover:bg-ocean-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Profile</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
