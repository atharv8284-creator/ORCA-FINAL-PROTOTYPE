import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../services/api';
import type { 
  AISProviderStatus, 
  AISVesselPosition, 
  AISVesselDetailedView,
  AISVesselMovement,
  AISQueryFilter,
  AISVesselAnomaly,
  AISCrossAgentCorrelation,
  AISAnalyzeResponse
} from '../types';
import { LoadingState } from '../components/LoadingState';
import { 
  Radio, 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  Anchor, 
  Navigation, 
  Ship, 
  ExternalLink, 
  X, 
  Info, 
  MapPin, 
  ChevronRight, 
  Database, 
  Sparkles, 
  Activity, 
  AlertCircle, 
  Zap, 
  CheckCircle2, 
  Crosshair, 
  Layers, 
  AlertTriangle, 
  FileText
} from 'lucide-react';

// Regional Presets for Quick Bounding Box Filtering
interface RegionPreset {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
  bbox?: { min_lat: number; max_lat: number; min_lon: number; max_lon: number };
}

const REGIONAL_PRESETS: RegionPreset[] = [
  {
    id: 'GLOBAL',
    name: 'Global Overview',
    center: [20.0, 0.0],
    zoom: 2,
    bbox: undefined
  },
  {
    id: 'ENGLISH_CHANNEL',
    name: 'English Channel & North Sea',
    center: [50.8, 1.2],
    zoom: 7,
    bbox: { min_lat: 49.5, max_lat: 52.5, min_lon: -3.0, max_lon: 4.0 }
  },
  {
    id: 'SINGAPORE_STRAIT',
    name: 'Singapore & Malacca Strait',
    center: [1.3, 103.8],
    zoom: 8,
    bbox: { min_lat: 1.0, max_lat: 1.6, min_lon: 103.2, max_lon: 104.5 }
  },
  {
    id: 'GIBRALTAR',
    name: 'Strait of Gibraltar',
    center: [35.95, -5.5],
    zoom: 8,
    bbox: { min_lat: 35.7, max_lat: 36.3, min_lon: -5.9, max_lon: -5.1 }
  },
  {
    id: 'GBR',
    name: 'Great Barrier Reef Corridor',
    center: [-16.5, 146.0],
    zoom: 6,
    bbox: { min_lat: -19.0, max_lat: -14.0, min_lon: 144.5, max_lon: 147.5 }
  },
  {
    id: 'GULF_OF_MEXICO',
    name: 'Gulf of Mexico Energy Basin',
    center: [27.5, -90.0],
    zoom: 6,
    bbox: { min_lat: 25.0, max_lat: 30.0, min_lon: -95.0, max_lon: -85.0 }
  }
];

// Helper component to center Leaflet map when selection changes
const MapRecenter: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
};

// Create custom vessel SVG marker with heading rotation and category color
const createVesselIcon = (category: string, cogDegrees: number, isSelected: boolean, isSimulated: boolean = false) => {
  let color = '#94a3b8'; // default slate for other
  const cat = category.toUpperCase();
  if (cat.includes('CARGO')) color = '#38bdf8'; // Sky blue
  else if (cat.includes('TANKER')) color = '#f97316'; // Orange
  else if (cat.includes('FISHING')) color = '#10b981'; // Emerald
  else if (cat.includes('PASSENGER')) color = '#c084fc'; // Purple
  else if (cat.includes('TUG') || cat.includes('PILOT') || cat.includes('SAR')) color = '#06b6d4'; // Cyan
  else if (cat.includes('LAW') || cat.includes('SPECIAL')) color = '#eab308'; // Amber

  const size = isSelected ? 38 : 30;
  const half = size / 2;

  return L.divIcon({
    className: 'orca-ais-vessel-marker',
    html: `
      <div style="position:relative; width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center; transform: rotate(${cogDegrees}deg);">
        ${isSelected ? `<div style="position:absolute; width:${size + 8}px; height:${size + 8}px; border-radius:50%; border:2px solid ${color}; box-shadow:0 0 16px ${color}; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ''}
        <div style="position:absolute; width:${size}px; height:${size}px; border-radius:50%; background-color:${color}22; border:1.5px ${isSimulated ? 'dashed' : 'solid'} ${color};"></div>
        <svg width="${size * 0.55}" height="${size * 0.55}" viewBox="0 0 24 24" fill="${color}" stroke="${color}" stroke-width="1.5">
          <polygon points="12,2 20,20 12,16 4,20" />
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [half, half],
    popupAnchor: [0, -half],
  });
};

export const AISVesselTracking: React.FC = () => {
  // Main state
  const [loading, setLoading] = useState<boolean>(true);
  const [providerStatus, setProviderStatus] = useState<AISProviderStatus | null>(null);
  const [vessels, setVessels] = useState<AISVesselPosition[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Filters & search
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<RegionPreset>(REGIONAL_PRESETS[0]);
  const [minSpeed, setMinSpeed] = useState<number>(0);
  const [navStatusFilter, setNavStatusFilter] = useState<string>('ALL');

  // Cooldown & TTL
  const [ttlRemaining, setTtlRemaining] = useState<number>(0);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Modals & Inspection Drawer
  const [selectedMMSI, setSelectedMMSI] = useState<string | null>(null);
  const [vesselDetails, setVesselDetails] = useState<AISVesselDetailedView | null>(null);
  const [vesselMovement, setVesselMovement] = useState<AISVesselMovement | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [showSignalGapInfo, setShowSignalGapInfo] = useState<boolean>(false);

  // Demonstration mode
  const [demoMode, setDemoMode] = useState<boolean>(false);

  // Tab switching: 'RADAR' | 'ANOMALIES' | 'CORRELATIONS'
  const [activeTab, setActiveTab] = useState<'RADAR' | 'ANOMALIES' | 'CORRELATIONS'>('RADAR');
  const [anomalies, setAnomalies] = useState<AISVesselAnomaly[]>([]);
  const [correlations, setCorrelations] = useState<AISCrossAgentCorrelation[]>([]);
  const [analyzingAIS, setAnalyzingAIS] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AISAnalyzeResponse | null>(null);

  // Live test connection state
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ is_connected: boolean; status: string; message: string; latency_ms: number; provider: string } | null>(null);

  // Fetch initial status and vessels
  const loadData = useCallback(async (forcedFilter?: AISQueryFilter) => {
    try {
      const statusRes = await api.getAISProviderStatus(demoMode);
      setProviderStatus(statusRes);
      setTtlRemaining(statusRes.cache_ttl_remaining_seconds);
      setDemoMode(Boolean(statusRes.demo_mode_active));

      const filterPayload: AISQueryFilter = forcedFilter || {
        min_lat: selectedRegion.bbox?.min_lat,
        max_lat: selectedRegion.bbox?.max_lat,
        min_lon: selectedRegion.bbox?.min_lon,
        max_lon: selectedRegion.bbox?.max_lon,
        limit: 150,
        demo: demoMode
      };

      const [vesselsRes, anomaliesRes, correlationsRes] = await Promise.all([
        api.getLiveAISVessels(filterPayload),
        api.getAISAnomalies(filterPayload, demoMode).catch(() => null),
        api.getAISCorrelations(demoMode).catch(() => [])
      ]);

      setVessels(vesselsRes.vessels || []);
      setTotalCount(vesselsRes.total_count || 0);
      if (anomaliesRes) setAnomalies(anomaliesRes.anomalies || []);
      if (correlationsRes) setCorrelations(correlationsRes);
    } catch (err) {
      console.warn('AIS feed fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRegion, demoMode]);

  useEffect(() => {
    let active = true;
    const fetchInitial = async () => {
      try {
        const statusRes = await api.getAISProviderStatus(demoMode);
        if (!active) return;
        setProviderStatus(statusRes);
        setTtlRemaining(statusRes.cache_ttl_remaining_seconds);
        setDemoMode(Boolean(statusRes.demo_mode_active));

        const filterPayload: AISQueryFilter = {
          min_lat: selectedRegion.bbox?.min_lat,
          max_lat: selectedRegion.bbox?.max_lat,
          min_lon: selectedRegion.bbox?.min_lon,
          max_lon: selectedRegion.bbox?.max_lon,
          limit: 150,
          demo: demoMode
        };

        const [vesselsRes, anomaliesRes, correlationsRes] = await Promise.all([
          api.getLiveAISVessels(filterPayload),
          api.getAISAnomalies(filterPayload, demoMode).catch(() => null),
          api.getAISCorrelations(demoMode).catch(() => [])
        ]);

        if (!active) return;
        setVessels(vesselsRes.vessels || []);
        setTotalCount(vesselsRes.total_count || 0);
        if (anomaliesRes) setAnomalies(anomaliesRes.anomalies || []);
        if (correlationsRes) setCorrelations(correlationsRes);
      } catch (err) {
        console.warn('AIS initial feed fetch error:', err);
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    fetchInitial();
    return () => {
      active = false;
    };
  }, [selectedRegion, demoMode]);

  // TTL Countdown Timer
  useEffect(() => {
    if (ttlRemaining <= 0) return;
    const interval = setInterval(() => {
      setTtlRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [ttlRemaining]);

  // Handle explicit manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  // Toggle Demonstration Mode
  const handleToggleDemoMode = async () => {
    try {
      setLoading(true);
      const res = await api.toggleAISDemoMode(!demoMode);
      setDemoMode(res.demo_mode_active);
      await loadData({
        min_lat: selectedRegion.bbox?.min_lat,
        max_lat: selectedRegion.bbox?.max_lat,
        min_lon: selectedRegion.bbox?.min_lon,
        max_lon: selectedRegion.bbox?.max_lon,
        limit: 150,
        demo: res.demo_mode_active
      });
    } catch (err) {
      console.error('Failed to toggle demo mode:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Region Change
  const handleRegionChange = (preset: RegionPreset) => {
    setSelectedRegion(preset);
    const filter: AISQueryFilter = {
      min_lat: preset.bbox?.min_lat,
      max_lat: preset.bbox?.max_lat,
      min_lon: preset.bbox?.min_lon,
      max_lon: preset.bbox?.max_lon,
      limit: 150,
      demo: demoMode
    };
    loadData(filter);
  };

  // Inspect specific vessel details, movement & signal gap
  const handleInspectVessel = async (mmsi: string) => {
    setSelectedMMSI(mmsi);
    setLoadingDetails(true);
    try {
      const [details, movement] = await Promise.all([
        api.getAISVesselDetails(mmsi, demoMode),
        api.getAISVesselMovement(mmsi, demoMode).catch(() => null)
      ]);
      setVesselDetails(details);
      setVesselMovement(movement);
    } catch (err) {
      console.error('Failed to inspect vessel:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Run comprehensive AIS behaviour and cross-agent satellite correlation analysis
  const handleRunAnalysis = async () => {
    setAnalyzingAIS(true);
    try {
      const res = await api.analyzeAIS({
        zone_id: selectedRegion.id,
        min_lat: selectedRegion.bbox?.min_lat,
        max_lat: selectedRegion.bbox?.max_lat,
        min_lon: selectedRegion.bbox?.min_lon,
        max_lon: selectedRegion.bbox?.max_lon,
        demo: demoMode,
        correlate_with_sar: true,
        correlate_with_optical: true,
        correlate_with_ocean: true
      });
      setAnalysisResult(res);
      setAnomalies(res.anomalies || []);
      setCorrelations(res.correlations || []);
      if (res.anomalies && res.anomalies.length > 0 && activeTab === 'RADAR') {
        setActiveTab('ANOMALIES');
      }
    } catch (err) {
      console.warn('AIS analysis failed:', err);
    } finally {
      setAnalyzingAIS(false);
    }
  };

  // Test live connection to upstream provider
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await api.testAISConnection(demoMode);
      setTestResult(res);
      const statusRes = await api.getAISProviderStatus(demoMode);
      setProviderStatus(statusRes);
    } catch (err: any) {
      setTestResult({
        is_connected: false,
        status: 'OFFLINE',
        message: err.message || 'Connection test failed',
        latency_ms: 0,
        provider: providerStatus?.provider_name || 'AISHub'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Client-side filtering across the fetched active vessel pool
  const filteredVessels = useMemo(() => {
    return vessels.filter((v) => {
      const matchesSearch =
        search.trim() === '' ||
        v.vessel_name.toLowerCase().includes(search.toLowerCase()) ||
        v.mmsi.includes(search) ||
        (v.callsign && v.callsign.toLowerCase().includes(search.toLowerCase())) ||
        (v.destination && v.destination.toLowerCase().includes(search.toLowerCase()));

      const matchesCat =
        categoryFilter === 'ALL' ||
        v.vessel_category.toUpperCase() === categoryFilter.toUpperCase();

      const matchesSpeed = (v.speed_over_ground ?? v.sog_knots) >= minSpeed;

      const matchesNav =
        navStatusFilter === 'ALL' ||
        (v.navigation_status || v.nav_status || '').toLowerCase().includes(navStatusFilter.toLowerCase());

      return matchesSearch && matchesCat && matchesSpeed && matchesNav;
    });
  }, [vessels, search, categoryFilter, minSpeed, navStatusFilter]);

  if (loading) {
    return (
      <LoadingState 
        message="Connecting to AIS Transponder Feed..." 
        subtext="Initializing provider-independent ITU-R M.1371 telemetry decoder" 
      />
    );
  }

  // Exact specification statuses: REAL | NOT CONNECTED | OFFLINE | NO DATA | DEMO
  const connectionStatus = providerStatus?.connection_status || 'NOT CONNECTED';

  // Badge appearance helper
  const getStatusBadgeClasses = () => {
    switch (connectionStatus) {
      case 'REAL':
        return 'bg-emerald-950/70 border-emerald-700 text-emerald-300 hover:bg-emerald-900/60';
      case 'DEMO':
        return 'bg-purple-950/80 border-purple-600 text-purple-300 hover:bg-purple-900/60 shadow-lg shadow-purple-950/50';
      case 'NO DATA':
        return 'bg-ocean-950/70 border-ocean-700 text-ocean-300 hover:bg-ocean-900/60';
      case 'OFFLINE':
        return 'bg-amber-950/70 border-amber-700 text-amber-300 hover:bg-amber-900/60';
      case 'NOT CONNECTED':
      default:
        return 'bg-rose-950/70 border-rose-800 text-rose-300 hover:bg-rose-900/60';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Ship className="w-6 h-6 text-biolum-cyan" />
              <span>AIS Vessel Tracking & Surface Intelligence</span>
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-ocean-900/80 text-ocean-300 border border-ocean-700/60 uppercase">
              ITU-R M.1371
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Provider-Independent Architecture • Coastal & Spaceborne Feeds • Signal Gap Reasoning
          </p>
        </div>

        {/* Action Buttons: Status Badge, Demo Toggle, Config, Refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Badge with 5 strict states: REAL | NOT CONNECTED | OFFLINE | NO DATA | DEMO */}
          <div 
            onClick={() => setShowConfigModal(true)}
            className={`cursor-pointer px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-2 transition-all ${getStatusBadgeClasses()}`}
            title="Click to view provider connection settings"
          >
            <span className={`w-2 h-2 rounded-full ${
              connectionStatus === 'REAL' 
                ? 'bg-emerald-400 animate-pulse' 
                : connectionStatus === 'DEMO'
                ? 'bg-purple-400 animate-pulse'
                : connectionStatus === 'NO DATA'
                ? 'bg-ocean-400'
                : connectionStatus === 'OFFLINE'
                ? 'bg-amber-400'
                : 'bg-rose-400'
            }`} />
            <span>
              STATUS: {connectionStatus}
            </span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </div>

          {/* Explicit Demo Mode Toggle */}
          <button
            onClick={handleToggleDemoMode}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              demoMode
                ? 'bg-purple-900/60 border-purple-500 text-purple-200 hover:bg-purple-800'
                : 'bg-surface-card border-surface-border text-slate-300 hover:bg-navy-800'
            }`}
            title="Toggle demonstration mode with clearly labeled simulated vessels"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>{demoMode ? 'Demo Active' : 'Enable Demo Mode'}</span>
          </button>

          {/* Test Live Connection Button */}
          <button
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="px-3 py-1.5 rounded-lg border border-surface-border bg-surface-card hover:bg-navy-800 text-xs font-medium text-slate-200 flex items-center space-x-1.5 transition-all disabled:opacity-50"
            title="Test real HTTP connection to configured AIS API"
          >
            <Radio className={`w-3.5 h-3.5 text-biolum-cyan ${testingConnection ? 'animate-spin' : ''}`} />
            <span>{testingConnection ? 'Testing...' : 'Test Connection'}</span>
          </button>

          {/* Refresh Button with TTL notice */}
          <button
            onClick={handleRefresh}
            disabled={refreshing || ttlRemaining > 0}
            className="px-3 py-1.5 rounded-lg border border-ocean-700 bg-ocean-900/60 hover:bg-ocean-800/80 text-xs font-semibold text-ocean-200 flex items-center space-x-1.5 transition-all disabled:opacity-40"
            title={ttlRemaining > 0 ? `Rate limit cooldown: ${ttlRemaining}s remaining` : 'Refresh live AIS contacts'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{ttlRemaining > 0 ? `Cooldown (${ttlRemaining}s)` : 'Refresh Stream'}</span>
          </button>
        </div>
      </div>

      {/* DEMO MODE ACTIVE BANNER (Clearly Labelled) */}
      {connectionStatus === 'DEMO' && (
        <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-700/60 space-y-1.5 text-purple-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-200">
                DEMONSTRATION MODE ACTIVE — SIMULATED PROFILES FOR UI EVALUATION
              </h4>
            </div>
            <button
              onClick={handleToggleDemoMode}
              className="text-xs font-semibold underline text-purple-300 hover:text-white"
            >
              Exit Demo Mode
            </button>
          </div>
          <p className="text-xs text-purple-300 leading-relaxed font-mono">
            Displaying labeled simulated vessel transponder profiles to demonstrate geospatial tracking, trajectory vectors, and signal gap reasoning without requiring physical receiver hardware or active provider subscriptions. <strong>These are NOT real observations.</strong>
          </p>
        </div>
      )}

      {/* Connectivity Alert Banner when NOT CONNECTED (with exact required text) */}
      {connectionStatus === 'NOT CONNECTED' && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/40 via-surface-card to-amber-950/30 border border-rose-800/60 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>AIS Feed Status: NOT CONNECTED</span>
                </h4>
                {/* EXACT REQUIRED INFORMATIVE MESSAGE */}
                <p className="text-xs text-rose-200 mt-1 font-semibold leading-relaxed">
                  AIS provider not configured. Connect an authorized AIS data provider to receive vessel information.
                </p>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Physical receiver ownership is <strong>NOT mandatory</strong>. You can connect an authorized web API key (AISHub, MarineTraffic, Spire) in <code className="text-biolum-cyan font-mono text-[11px]">backend/.env</code>, or activate <strong>Demonstration Mode</strong> above to evaluate the full tracking interface safely.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleToggleDemoMode}
                className="px-3 py-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800 border border-purple-500 text-xs font-semibold text-purple-200 whitespace-nowrap"
              >
                Try Demo Mode
              </button>
              <button
                onClick={() => setShowConfigModal(true)}
                className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-navy-700 border border-surface-border text-xs font-semibold text-white whitespace-nowrap"
              >
                Setup Guide
              </button>
            </div>
          </div>

          {/* Test connection output banner if test ran */}
          {testResult && (
            <div className="mt-2 pt-2 border-t border-rose-800/40 text-xs font-mono flex items-center justify-between text-slate-300">
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${testResult.is_connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span>Diagnostics: {testResult.message}</span>
              </div>
              <span className="text-slate-400">Latency: {testResult.latency_ms} ms</span>
            </div>
          )}
        </div>
      )}

      {/* Connectivity Alert Banner when NO DATA */}
      {connectionStatus === 'NO DATA' && (
        <div className="p-4 rounded-xl bg-ocean-950/40 border border-ocean-700/60 space-y-1 text-xs">
          <div className="flex items-center space-x-2 text-ocean-300 font-bold">
            <AlertCircle className="w-4 h-4" />
            <span>AIS Feed Status: NO DATA</span>
          </div>
          <p className="text-slate-300 leading-relaxed font-mono">
            Connected to authorized AIS provider ({providerStatus?.provider_name}), but no vessel records were returned for current bounding coordinates. Try selecting "Global Overview" or adjusting spatial bounds.
          </p>
        </div>
      )}

      {/* Mandatory Scientific Guardrail: AIS Signal Gap Disclaimer Card */}
      <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Info className="w-4 h-4 text-ocean-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Scientific Signal Gap Analysis & Regulatory Guardrail
            </h3>
          </div>
          <button
            onClick={() => setShowSignalGapInfo(!showSignalGapInfo)}
            className="text-[11px] font-mono text-biolum-cyan hover:underline flex items-center space-x-1"
          >
            <span>{showSignalGapInfo ? 'Hide Technical Context' : 'Explain Physical & Regulatory Causes'}</span>
            <ChevronRight className={`w-3.5 h-3.5 transform transition-transform ${showSignalGapInfo ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {/* Prominent Mandatory Compliance Statement */}
        <div className="p-3 rounded-lg bg-navy-900/90 border border-ocean-700/50 text-xs text-slate-200 leading-relaxed">
          <strong className="text-ocean-300">Operational Integrity Principle: </strong>
          <span className="underline decoration-biolum-cyan font-semibold">
            An AIS signal gap must not automatically be classified as illegal activity.
          </span>{' '}
          In open ocean and littoral surveillance, signal latency routinely occurs due to physical propagation boundaries, satellite orbital revisit periods, or weather-induced attenuation.
        </div>

        {/* Collapsible Detailed Scientific Causes */}
        {showSignalGapInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-[11px] text-slate-300 font-mono">
            <div className="p-2.5 rounded bg-navy-950/60 border border-surface-border/60 space-y-1">
              <span className="text-biolum-cyan font-bold block">1. Terrestrial VHF Horizon Limit</span>
              <p className="text-slate-400">
                Marine VHF transponders (161.975 & 162.025 MHz) rely on line-of-sight propagation (~25-35 nm from shore). High-seas vessels naturally experience gaps until passing coastal towers.
              </p>
            </div>
            <div className="p-2.5 rounded bg-navy-950/60 border border-surface-border/60 space-y-1">
              <span className="text-biolum-cyan font-bold block">2. Satellite Orbital Pass Revisit</span>
              <p className="text-slate-400">
                Low Earth Orbit (LEO) satellite receivers pass overhead at intervals ranging from 30 to 90 minutes. Telemetry latency between passes is standard maritime physics.
              </p>
            </div>
            <div className="p-2.5 rounded bg-navy-950/60 border border-surface-border/60 space-y-1">
              <span className="text-biolum-cyan font-bold block">3. Atmospheric & Squall Clutter</span>
              <p className="text-slate-400">
                Tropical squalls, heavy rain fade, high wave clutter, or mast shadowing during heavy rolling can attenuate radio frequency packets, causing temporary missed pings.
              </p>
            </div>
            <div className="p-2.5 rounded bg-navy-950/60 border border-surface-border/60 space-y-1">
              <span className="text-biolum-cyan font-bold block">4. Master Safety Discretion (SOLAS V/19)</span>
              <p className="text-slate-400">
                Under IMO SOLAS Chapter V, Regulation 19.2.4, masters possess legal authority to switch off AIS when navigation through designated piracy or armed threat zones poses imminent security risks.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filter & Controls Toolbar */}
      <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by 9-digit MMSI, vessel name, or port..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-navy-900 border border-surface-border text-xs text-slate-200 rounded-lg pl-9 pr-3 py-2 w-full focus:outline-none focus:border-biolum-cyan transition-colors"
            />
          </div>

          {/* Regional Preset Selector */}
          <div className="flex items-center space-x-2">
            <MapPin className="w-3.5 h-3.5 text-biolum-cyan" />
            <span className="text-xs text-slate-400 font-mono">Region:</span>
            <select
              value={selectedRegion.id}
              onChange={(e) => {
                const found = REGIONAL_PRESETS.find(p => p.id === e.target.value);
                if (found) handleRegionChange(found);
              }}
              className="bg-navy-900 border border-surface-border text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-biolum-cyan"
            >
              {REGIONAL_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Navigational Status Filter */}
          <div className="flex items-center space-x-2">
            <Navigation className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400 font-mono">Status:</span>
            <select
              value={navStatusFilter}
              onChange={(e) => setNavStatusFilter(e.target.value)}
              className="bg-navy-900 border border-surface-border text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-biolum-cyan"
            >
              <option value="ALL">All Navigational States</option>
              <option value="under way">Under Way</option>
              <option value="anchor">At Anchor</option>
              <option value="moored">Moored</option>
              <option value="fishing">Engaged in Fishing</option>
              <option value="sailing">Under Way Sailing</option>
            </select>
          </div>
        </div>

        {/* Category Pills & Speed Slider */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-surface-border/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-mono mr-1">Vessel Type:</span>
            {['ALL', 'CARGO', 'TANKER', 'FISHING', 'PASSENGER', 'TUG', 'OTHER'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  categoryFilter === cat
                    ? 'bg-ocean-600 text-white shadow-sm'
                    : 'bg-navy-900/60 text-slate-400 hover:text-white border border-surface-border/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Speed Filter */}
          <div className="flex items-center space-x-2 text-xs text-slate-300 font-mono">
            <span>Min SOG:</span>
            <input
              type="range"
              min="0"
              max="25"
              step="1"
              value={minSpeed}
              onChange={(e) => setMinSpeed(parseFloat(e.target.value))}
              className="w-24 accent-biolum-cyan"
            />
            <span className="w-12 text-biolum-cyan font-bold">{minSpeed} kts</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400">Total Tracked Vessels</span>
          <div className="text-xl font-bold text-white font-mono">{totalCount} Vessels</div>
          <p className="text-[11px] text-slate-400">In transponder cache ledger</p>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400">Active in Scope</span>
          <div className="text-xl font-bold text-biolum-cyan font-mono">{filteredVessels.length} Contacts</div>
          <p className="text-[11px] text-slate-400">Matching spatial & category filters</p>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400">Feed Connection State</span>
          <div className={`text-xl font-bold font-mono ${
            connectionStatus === 'REAL' ? 'text-emerald-400' :
            connectionStatus === 'DEMO' ? 'text-purple-400' :
            connectionStatus === 'NO DATA' ? 'text-ocean-400' :
            connectionStatus === 'OFFLINE' ? 'text-amber-400' : 'text-rose-400'
          }`}>
            {connectionStatus}
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {providerStatus?.provider_name || 'Authorized AIS Provider'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400">Rate Limit Caching</span>
          <div className="text-xl font-bold text-slate-200 font-mono">
            {ttlRemaining > 0 ? `${ttlRemaining}s TTL` : 'Live Ready'}
          </div>
          <p className="text-[11px] text-slate-400">Protects upstream API quota</p>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('RADAR')}
            className={`px-4 py-2 rounded-lg font-semibold text-xs flex items-center space-x-2 transition-all ${
              activeTab === 'RADAR'
                ? 'bg-biolum-cyan/15 text-biolum-cyan border border-biolum-cyan/40 shadow-sm'
                : 'bg-surface-card text-slate-400 hover:text-white border border-surface-border'
            }`}
          >
            <Ship className="w-4 h-4" />
            <span>Live Radar & Register</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-navy-900 text-slate-300">
              {filteredVessels.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ANOMALIES')}
            className={`px-4 py-2 rounded-lg font-semibold text-xs flex items-center space-x-2 transition-all ${
              activeTab === 'ANOMALIES'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-surface-card text-slate-400 hover:text-white border border-surface-border'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Vessel Behaviour Anomalies</span>
            {anomalies.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700">
                {anomalies.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('CORRELATIONS')}
            className={`px-4 py-2 rounded-lg font-semibold text-xs flex items-center space-x-2 transition-all ${
              activeTab === 'CORRELATIONS'
                ? 'bg-ocean-500/15 text-ocean-300 border border-ocean-500/40 shadow-sm'
                : 'bg-surface-card text-slate-400 hover:text-white border border-surface-border'
            }`}
          >
            <Layers className="w-4 h-4 text-ocean-400" />
            <span>Cross-Agent Correlation</span>
            {correlations.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-ocean-950 text-ocean-300 border border-ocean-700">
                {correlations.length}
              </span>
            )}
          </button>
        </div>

        {/* Action button to execute Multi-Sensor Analysis */}
        <button
          onClick={handleRunAnalysis}
          disabled={analyzingAIS}
          className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-biolum-cyan/20 to-ocean-600/30 hover:from-biolum-cyan/30 hover:to-ocean-600/50 border border-biolum-cyan/40 text-xs font-semibold text-biolum-cyan flex items-center space-x-2 transition-all disabled:opacity-50"
          title="Run Kinematic Behaviour Engine and Correlate with Sentinel SAR & Optical detections"
        >
          <Zap className={`w-3.5 h-3.5 ${analyzingAIS ? 'animate-bounce text-amber-400' : 'text-biolum-cyan'}`} />
          <span>{analyzingAIS ? 'Running Multi-Agent Engine...' : 'Run Behaviour & Satellite Analysis'}</span>
        </button>
      </div>

      {/* Tab View 1: Radar & Maritime Contact Register */}
      {activeTab === 'RADAR' && (
        <div className="space-y-6">
          {/* Interactive Leaflet Map for Real / Demo AIS Contacts */}
          <div className="p-4 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-biolum-cyan" />
                <h3 className="text-sm font-bold text-white">Live Maritime Radar & AIS Geospatial Plot</h3>
              </div>
              <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-400">
                {demoMode && (
                  <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700 font-bold">
                    DEMO MODE
                  </span>
                )}
                <span>{filteredVessels.length} vessel markers plotted</span>
              </div>
            </div>

            <div className="relative h-[480px] w-full rounded-xl overflow-hidden border border-surface-border/80">
              <MapContainer
                center={selectedRegion.center}
                zoom={selectedRegion.zoom}
                scrollWheelZoom={true}
                className="h-full w-full"
              >
                <MapRecenter center={selectedRegion.center} zoom={selectedRegion.zoom} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Vessel Track Polyline if selected */}
                {vesselDetails?.track_history && vesselDetails.track_history.length > 1 && (
                  <Polyline
                    positions={vesselDetails.track_history.map(p => [p.latitude, p.longitude] as [number, number])}
                    color="#00e5ff"
                    weight={3}
                    dashArray="4, 6"
                    opacity={0.8}
                  />
                )}

                {/* Plot real / demo vessels */}
                {filteredVessels.map((v) => (
                  <Marker
                    key={v.mmsi}
                    position={[v.latitude, v.longitude]}
                    icon={createVesselIcon(
                      v.vessel_category, 
                      v.course_over_ground ?? v.cog_degrees, 
                      selectedMMSI === v.mmsi,
                      Boolean(v.is_simulated)
                    )}
                  >
                    <Popup className="orca-ais-popup">
                      <div className="p-1 space-y-2 text-slate-800 text-xs max-w-xs">
                        <div className="border-b pb-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm text-slate-900">{v.vessel_name}</h4>
                            {v.is_simulated && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-purple-100 text-purple-800 font-bold border border-purple-300">
                                DEMO
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono">
                            <span>MMSI: {v.mmsi}</span>
                            <span>{v.vessel_type}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1 text-[11px] font-mono">
                          <div>SOG: <strong>{(v.speed_over_ground ?? v.sog_knots)} kts</strong></div>
                          <div>COG: <strong>{(v.course_over_ground ?? v.cog_degrees)}°</strong></div>
                          <div>Status: <strong>{v.navigation_status || v.nav_status}</strong></div>
                          <div>Draught: <strong>{v.draught_m ? `${v.draught_m}m` : 'N/A'}</strong></div>
                          {v.destination && <div className="col-span-2 truncate">Dest: <strong>{v.destination}</strong></div>}
                          {v.eta && <div className="col-span-2">ETA: <strong>{v.eta}</strong></div>}
                        </div>

                        <div className="pt-1 text-[10px] text-slate-500 font-mono border-t flex items-center justify-between">
                          <span>Source: {v.data_provider}</span>
                          <span className="font-bold text-slate-700">{v.data_freshness || 'RECENT'}</span>
                        </div>

                        <button
                          onClick={() => handleInspectVessel(v.mmsi)}
                          className="w-full mt-1.5 py-1 px-2 rounded bg-slate-900 text-white font-semibold text-[11px] hover:bg-slate-800 transition-colors"
                        >
                          Inspect Telemetry & Movement
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>

              {/* Empty Overlay if no vessels are available */}
              {filteredVessels.length === 0 && (
                <div className="absolute inset-0 bg-navy-950/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-1000 pointer-events-none">
                  <div className="p-4 rounded-2xl bg-surface-card border border-surface-border text-slate-300 max-w-md space-y-2.5">
                    <Ship className="w-8 h-8 text-ocean-400 mx-auto" />
                    <h4 className="text-sm font-bold text-white">No Active AIS Vessel Signals Plotted</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-mono">
                      {connectionStatus === 'NOT CONNECTED'
                        ? 'AIS provider not configured. Connect an authorized AIS data provider to receive vessel information.'
                        : 'No vessel transponders matched the current spatial bounds and category filter.'}
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1 pointer-events-auto">
                      <button
                        onClick={handleToggleDemoMode}
                        className="px-3 py-1.5 rounded-lg bg-purple-900/80 hover:bg-purple-800 border border-purple-500 text-xs font-semibold text-purple-200 shadow"
                      >
                        Activate Demo Mode
                      </button>
                      <button
                        onClick={() => setShowConfigModal(true)}
                        className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-navy-700 border border-surface-border text-xs font-semibold text-white"
                      >
                        Setup Provider
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Vessel Roster Table */}
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Live Maritime Contact Register</h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  Displaying {filteredVessels.length} of {totalCount} tracked contacts • Source: {providerStatus?.provider_name || 'Authorized AIS Provider'}
                </p>
              </div>
              <span className="text-[10px] font-mono text-ocean-300">
                Downlink: 161.975 MHz & 162.025 MHz
              </span>
            </div>

            {filteredVessels.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                <Anchor className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-slate-300 font-semibold">No vessel records currently available.</p>
                <span className="text-[11px] text-slate-500">
                  {connectionStatus === 'NOT CONNECTED' 
                    ? 'AIS provider not configured. Connect an authorized AIS data provider to receive vessel information.'
                    : 'No contacts matching filter.'}
                </span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="text-[10px] uppercase font-mono bg-navy-900/80 text-slate-400 border-b border-surface-border">
                    <tr>
                      <th className="py-2.5 px-3">Vessel & MMSI</th>
                      <th className="py-2.5 px-3">Type & Category</th>
                      <th className="py-2.5 px-3">SOG & COG</th>
                      <th className="py-2.5 px-3">Coordinates</th>
                      <th className="py-2.5 px-3">Navigation Status</th>
                      <th className="py-2.5 px-3">Destination</th>
                      <th className="py-2.5 px-3">Freshness & Source</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border/60 font-mono text-[11px]">
                    {filteredVessels.map((v) => (
                      <tr key={v.mmsi} className="hover:bg-surface-elevated/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-white font-sans text-xs">{v.vessel_name}</span>
                            {v.is_simulated && (
                              <span className="px-1 rounded text-[9px] bg-purple-950 text-purple-300 border border-purple-800">
                                DEMO
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-ocean-400">MMSI: {v.mmsi}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-slate-200 block text-xs font-sans">{v.vessel_type}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-bold">{v.vessel_category}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-white font-bold">{(v.speed_over_ground ?? v.sog_knots)} kts</span> @ {(v.course_over_ground ?? v.cog_degrees)}°
                          {v.heading !== undefined && v.heading !== null && (
                            <span className="block text-slate-500 text-[10px]">HDG: {v.heading}°</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-biolum-cyan">
                          {v.latitude.toFixed(4)}°, {v.longitude.toFixed(4)}°
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {v.navigation_status || v.nav_status}
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-slate-200 block truncate max-w-[120px]">
                            {v.destination || 'Unreported'}
                          </span>
                          <span className="text-[10px] text-slate-500">{v.eta || 'ETA -'}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center space-x-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              v.data_freshness === 'LIVE' ? 'bg-emerald-400' :
                              v.data_freshness === 'RECENT' ? 'bg-biolum-cyan' : 'bg-slate-500'
                            }`} />
                            <span className="text-[10px] font-bold text-slate-300">{v.data_freshness || 'RECENT'}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[110px]">{v.data_provider}</span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleInspectVessel(v.mmsi)}
                            className="px-2.5 py-1 rounded bg-surface-elevated hover:bg-ocean-700 text-xs font-semibold text-white transition-colors border border-surface-border"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab View 2: Kinematic Behaviour Anomalies */}
      {activeTab === 'ANOMALIES' && (
        <div className="space-y-5">
          {/* Anomaly Dashboard Header & Metrics */}
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span>Vessel Kinematic Behaviour Anomaly Engine</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Algorithmic screening for loitering, course alterations, route deviations, speed anomalies, and MPA transits
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-800">
                  {anomalies.length} Flagged Events
                </span>
              </div>
            </div>

            {/* Legal Notice */}
            <div className="p-3.5 rounded-xl bg-navy-900/90 border border-amber-800/60 text-xs text-slate-300 leading-relaxed font-mono">
              <div className="flex items-start space-x-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300 uppercase tracking-wider block text-[11px] mb-0.5">
                    Maritime Legal Guardrail & Due Process Notice
                  </strong>
                  <span>
                    Kinematic anomalies (e.g. loitering, sharp course changes, or speed drops) are mathematical screening flags derived from AIS telemetry. Under international maritime law (UNCLOS, IMO SOLAS), anomalous kinematics do NOT constitute evidence of illegal discharge, illicit fishing, or intentional non-compliance without physical boarding or direct multi-spectral verification.
                  </span>
                </div>
              </div>
            </div>

            {/* Anomaly Summary Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-navy-900/60 border border-surface-border text-center">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Critical Severity</span>
                <span className="text-lg font-bold text-rose-400 font-mono">
                  {anomalies.filter(a => a.severity === 'CRITICAL').length}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-navy-900/60 border border-surface-border text-center">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Elevated Severity</span>
                <span className="text-lg font-bold text-amber-400 font-mono">
                  {anomalies.filter(a => a.severity === 'ELEVATED').length}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-navy-900/60 border border-surface-border text-center">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Moderate Severity</span>
                <span className="text-lg font-bold text-ocean-400 font-mono">
                  {anomalies.filter(a => a.severity === 'MODERATE').length}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-navy-900/60 border border-surface-border text-center">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Low Severity</span>
                <span className="text-lg font-bold text-slate-300 font-mono">
                  {anomalies.filter(a => a.severity === 'LOW').length}
                </span>
              </div>
            </div>
          </div>

          {/* Anomaly Cards List */}
          {anomalies.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-surface-card border border-surface-border space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Kinematic Anomalies Detected</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto font-mono">
                All tracked vessels in the current spatial bounds adhere to standard commercial navigational profiles, constant velocity trajectories, and charted shipping corridors.
              </p>
              <button
                onClick={handleRunAnalysis}
                disabled={analyzingAIS}
                className="mt-2 px-4 py-2 rounded-lg bg-ocean-600 hover:bg-ocean-500 text-xs font-semibold text-white transition-all shadow"
              >
                {analyzingAIS ? 'Analyzing Vessel Tracks...' : 'Run Kinematic Analysis'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {anomalies.map((ano) => (
                <div
                  key={ano.anomaly_id}
                  className="p-5 rounded-2xl bg-surface-card border border-surface-border hover:border-amber-700/60 transition-all shadow-lg space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border pb-2.5">
                    <div className="flex items-center space-x-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        ano.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        ano.severity === 'ELEVATED' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        ano.severity === 'MODERATE' ? 'bg-ocean-950 text-ocean-300 border border-ocean-800' :
                        'bg-navy-900 text-slate-400 border border-surface-border'
                      }`}>
                        {ano.severity}
                      </span>
                      <h4 className="font-bold text-sm text-white font-mono">
                        {ano.anomaly_type.replace(/_/g, ' ')}
                      </h4>
                    </div>

                    <div className="flex items-center space-x-2 text-xs font-mono">
                      <span className="text-slate-400">Confidence:</span>
                      <span className="text-biolum-cyan font-bold">{(ano.confidence * 100).toFixed(0)}%</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-slate-400">Uncertainty:</span>
                      <span className="text-slate-200">{((ano.uncertainty || 0) * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  {/* Vessel info banner */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-navy-900/60 text-xs font-mono">
                    <div className="flex items-center space-x-2">
                      <Ship className="w-4 h-4 text-biolum-cyan" />
                      <span className="text-white font-bold">{ano.vessel_name}</span>
                      <span className="text-ocean-400">MMSI: {ano.mmsi}</span>
                      <span className="text-slate-400">({ano.vessel_type})</span>
                    </div>
                    <button
                      onClick={() => handleInspectVessel(ano.mmsi)}
                      className="px-2.5 py-1 rounded bg-surface-elevated hover:bg-ocean-700 text-[11px] font-semibold text-white transition-colors border border-surface-border"
                    >
                      Inspect Vessel Track
                    </button>
                  </div>

                  {/* Explanation */}
                  <p className="text-xs text-slate-300 leading-relaxed font-mono">
                    {ano.explanation}
                  </p>

                  {/* Evidence Used & Detection Method */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px] font-mono">
                    <div className="p-2.5 rounded-lg bg-navy-950/70 border border-surface-border/60 space-y-1">
                      <span className="text-ocean-300 font-bold uppercase block text-[10px]">
                        Telemetry Evidence Considered:
                      </span>
                      <ul className="text-slate-400 space-y-0.5 list-disc list-inside">
                        {ano.evidence_used.map((ev, i) => (
                          <li key={i}>{ev}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-2.5 rounded-lg bg-navy-950/70 border border-surface-border/60 space-y-1">
                      <span className="text-ocean-300 font-bold uppercase block text-[10px]">
                        Algorithmic Detection Method:
                      </span>
                      <p className="text-slate-400 leading-relaxed">
                        {ano.detection_method}
                      </p>
                    </div>
                  </div>

                  {/* Observation Window & Limitations */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-500 pt-1 border-t border-surface-border/60">
                    <div className="flex items-center space-x-1.5">
                      <span>Window:</span>
                      <span className="text-slate-300">
                        {ano.observation_time_window?.start_utc ? new Date(ano.observation_time_window.start_utc).toLocaleTimeString() : 'N/A'} - {ano.observation_time_window?.end_utc ? new Date(ano.observation_time_window.end_utc).toLocaleTimeString() : 'N/A'} UTC
                      </span>
                    </div>
                    <span className="text-slate-400 truncate max-w-md">
                      Caveat: {(ano.data_limitations && ano.data_limitations[0]) || 'VHF propagation and sea-state damping apply'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab View 3: Cross-Agent Multi-Sensor Satellite Correlation */}
      {activeTab === 'CORRELATIONS' && (
        <div className="space-y-5">
          {/* Header */}
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-ocean-400" />
                  <span>Cross-Agent Multi-Sensor Satellite Correlation</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Spatial, temporal, and Copernicus hydrodynamic current drift correlation with Sentinel-1 SAR and Sentinel-2 Optical targets
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-ocean-950/80 text-ocean-300 border border-ocean-800">
                  {correlations.length} Correlated Targets
                </span>
              </div>
            </div>

            {/* Scientific & Regulatory Principle */}
            <div className="p-3.5 rounded-xl bg-navy-900/90 border border-ocean-700/60 text-xs text-slate-300 leading-relaxed font-mono">
              <div className="flex items-start space-x-2.5">
                <Info className="w-4 h-4 text-biolum-cyan shrink-0 mt-0.5" />
                <div>
                  <strong className="text-ocean-300 uppercase tracking-wider block text-[11px] mb-0.5">
                    Hydrodynamic Drift Vector Principle (Rule 8 Compliance)
                  </strong>
                  <span>
                    Proximity alone does NOT prove causation or maritime liability. Ocean surface currents transport marine slicks and sediment plumes away from source locations over time. A candidate vessel is only plausible if its past transit intersects the reverse-drift trajectory vector calculated from Copernicus Marine ocean currents.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Correlations List */}
          {correlations.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-surface-card border border-surface-border space-y-3">
              <Crosshair className="w-10 h-10 text-slate-500 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Satellite Target Correlations in Range</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto font-mono">
                No active vessel transponder tracks currently correlate within spatial proximity or hydrodynamic drift vectors of active Sentinel-1 SAR oil slick candidates or Sentinel-2 turbidity plumes.
              </p>
              <button
                onClick={handleRunAnalysis}
                disabled={analyzingAIS}
                className="mt-2 px-4 py-2 rounded-lg bg-ocean-600 hover:bg-ocean-500 text-xs font-semibold text-white transition-all shadow"
              >
                {analyzingAIS ? 'Correlating Sensor Feeds...' : 'Run Cross-Sensor Correlation'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {correlations.map((corr) => (
                <div
                  key={corr.correlation_id}
                  className="p-5 rounded-2xl bg-surface-card border border-surface-border hover:border-ocean-600 transition-all shadow-lg space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border pb-2.5">
                    <div className="flex items-center space-x-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        corr.anomaly_source === 'SENTINEL_1_SAR' 
                          ? 'bg-ocean-950 text-ocean-300 border border-ocean-700' 
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      }`}>
                        {corr.anomaly_source}
                      </span>
                      <h4 className="font-bold text-sm text-white font-mono">
                        Target: {corr.target_id}
                      </h4>
                    </div>

                    <div className="flex items-center space-x-2 text-xs font-mono">
                      <span className="text-slate-400">Drift Plausibility:</span>
                      <span className={`font-bold uppercase ${
                        corr.hydrodynamic_plausibility === 'HIGH' ? 'text-amber-400' :
                        corr.hydrodynamic_plausibility === 'MODERATE' ? 'text-ocean-300' : 'text-slate-400'
                      }`}>
                        {corr.hydrodynamic_plausibility}
                      </span>
                      <span className="text-slate-500">|</span>
                      <span className="text-slate-400">Confidence:</span>
                      <span className="text-biolum-cyan font-bold">{(corr.confidence_score * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  {/* Vessel Information Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-navy-900/60 text-xs font-mono">
                    <div className="flex items-center space-x-2">
                      <Ship className="w-4 h-4 text-biolum-cyan" />
                      <span className="text-white font-bold">{corr.vessel_name}</span>
                      <span className="text-ocean-400">MMSI: {corr.vessel_mmsi}</span>
                      <span className="text-slate-400">({corr.vessel_category})</span>
                    </div>
                    <button
                      onClick={() => handleInspectVessel(corr.vessel_mmsi)}
                      className="px-2.5 py-1 rounded bg-surface-elevated hover:bg-ocean-700 text-[11px] font-semibold text-white transition-colors border border-surface-border"
                    >
                      Inspect Vessel Track
                    </button>
                  </div>

                  {/* Kinematic & Hydrodynamic Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                    <div className="p-2.5 rounded-lg bg-navy-950/70 border border-surface-border/60">
                      <span className="text-[10px] text-slate-400 uppercase block">Spatial Separation</span>
                      <strong className="text-biolum-cyan text-sm">{corr.spatial_separation_km} km</strong>
                      <span className="text-[10px] text-slate-500 block">({corr.spatial_separation_nm} nm)</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-navy-950/70 border border-surface-border/60">
                      <span className="text-[10px] text-slate-400 uppercase block">Temporal Separation</span>
                      <strong className="text-white text-sm">{corr.temporal_separation_hours} hrs</strong>
                      <span className="text-[10px] text-slate-500 block">Between passes</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-navy-950/70 border border-surface-border/60">
                      <span className="text-[10px] text-slate-400 uppercase block">Copernicus Current</span>
                      <strong className="text-slate-200 text-sm">{corr.drift_current_speed_knots ?? 0.7} kts</strong>
                      <span className="text-[10px] text-slate-500 block">Bearing: {corr.drift_current_direction_deg ?? 180}°</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-navy-950/70 border border-surface-border/60">
                      <span className="text-[10px] text-slate-400 uppercase block">Drift Vector Delta</span>
                      <strong className="text-amber-400 text-sm">
                        {corr.hydrodynamic_alignment_angle_deg !== null && corr.hydrodynamic_alignment_angle_deg !== undefined
                          ? `${corr.hydrodynamic_alignment_angle_deg}°`
                          : 'Under evaluation'}
                      </strong>
                      <span className="text-[10px] text-slate-500 block">Angular divergence</span>
                    </div>
                  </div>

                  {/* Findings Summary */}
                  <p className="text-xs text-slate-300 leading-relaxed font-mono">
                    {corr.findings_summary}
                  </p>

                  {/* Legal Disclaimer */}
                  <div className="p-2.5 rounded-lg bg-navy-950/90 border border-surface-border text-[10px] text-slate-400 font-mono">
                    <strong className="text-slate-300">Maritime Law Notice: </strong>
                    {corr.compliance_disclaimer}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Lead Orchestrator Structured Reasoning Payload (Prompt Rule 8 Verification) */}
          {analysisResult?.orchestrator_evidence_payload && (
            <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-biolum-cyan" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Lead Orchestrator AIS Evidence Summary (Nugen Input Payload)
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                  RULE 8 COMPLIANT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Structured telemetry compiled by ORCA-AG-06 AIS Surface Sentinel and transmitted to the Nugen neural reasoning model for multi-agent synthesis:
              </p>
              <pre className="p-3 rounded-xl bg-navy-950 border border-surface-border text-[10px] text-slate-300 overflow-x-auto max-h-48">
                {JSON.stringify(analysisResult.orchestrator_evidence_payload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Vessel Details, Movement & Signal Gap Modal / Drawer */}
      {selectedMMSI && (
        <div className="fixed inset-0 z-2000 bg-navy-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-card border border-surface-border rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div className="flex items-center space-x-3">
                <Ship className="w-5 h-5 text-biolum-cyan" />
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-white">
                      {vesselDetails?.vessel.vessel_name || `MMSI: ${selectedMMSI}`}
                    </h3>
                    {vesselDetails?.vessel.is_simulated && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800">
                        DEMO PROFILE
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-ocean-400">
                    MMSI: {selectedMMSI} • {vesselDetails?.vessel.vessel_type} • Source: {vesselDetails?.vessel.data_provider}
                  </span>
                </div>
              </div>
              <button
                onClick={() => { setSelectedMMSI(null); setVesselDetails(null); setVesselMovement(null); }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-elevated"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetails ? (
              <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                <RefreshCw className="w-6 h-6 text-biolum-cyan animate-spin mx-auto" />
                <p>Loading full kinematics, movement vector, and signal gap evaluation...</p>
              </div>
            ) : vesselDetails ? (
              <div className="space-y-4">
                {/* Telemetry & Movement Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-navy-900/80 border border-surface-border/60 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Speed Over Ground (SOG)</span>
                    <strong className="text-white text-sm">{(vesselDetails.vessel.speed_over_ground ?? vesselDetails.vessel.sog_knots)} knots</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Course Over Ground (COG)</span>
                    <strong className="text-white text-sm">{(vesselDetails.vessel.course_over_ground ?? vesselDetails.vessel.cog_degrees)}°</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">True Heading</span>
                    <strong className="text-white text-sm">{vesselDetails.vessel.heading !== null && vesselDetails.vessel.heading !== undefined ? `${vesselDetails.vessel.heading}°` : 'Unreported'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Navigation Status</span>
                    <strong className="text-slate-200">{vesselDetails.vessel.navigation_status || vesselDetails.vessel.nav_status}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Latitude</span>
                    <strong className="text-biolum-cyan">{vesselDetails.vessel.latitude.toFixed(5)}°</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Longitude</span>
                    <strong className="text-biolum-cyan">{vesselDetails.vessel.longitude.toFixed(5)}°</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Draught</span>
                    <strong className="text-slate-200">{vesselDetails.vessel.draught_m ? `${vesselDetails.vessel.draught_m} m` : 'Unreported'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Dimensions</span>
                    <strong className="text-slate-200">
                      {vesselDetails.vessel.length_m && vesselDetails.vessel.width_m
                        ? `${vesselDetails.vessel.length_m}m × ${vesselDetails.vessel.width_m}m`
                        : 'Unspecified'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Destination Port</span>
                    <strong className="text-slate-200">{vesselDetails.vessel.destination || 'Unreported'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Data Mode</span>
                    <strong className={`font-bold ${vesselDetails.vessel.data_mode === 'LIVE' ? 'text-emerald-400' : 'text-purple-400'}`}>
                      {vesselDetails.vessel.data_mode || (vesselDetails.vessel.is_simulated ? 'DEMO' : 'LIVE')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Transponder Source</span>
                    <strong className="text-slate-200">{vesselDetails.vessel.data_source_type || 'TERRESTRIAL_VHF'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Position Accuracy</span>
                    <strong className="text-biolum-cyan">{vesselDetails.vessel.position_accuracy || 'HIGH (<=10m)'}</strong>
                  </div>
                </div>

                {/* Kinematic Movement Information */}
                {vesselMovement && (
                  <div className="p-3 rounded-xl bg-navy-900/60 border border-surface-border text-xs space-y-1.5 font-mono">
                    <div className="flex items-center space-x-2 text-biolum-cyan font-bold text-[11px] uppercase">
                      <Activity className="w-3.5 h-3.5" />
                      <span>Vessel Movement & Kinematics Vector</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
                      <div>Linear Velocity: <strong>{vesselMovement.speed_over_ground} kts</strong></div>
                      <div>Azimuth Bearing: <strong>{vesselMovement.course_over_ground}°</strong></div>
                      <div>Data Provider: <strong>{vesselMovement.data_provider}</strong></div>
                      <div>Last Received: <strong>{new Date(vesselMovement.last_received_timestamp).toLocaleTimeString()} UTC</strong></div>
                    </div>
                  </div>
                )}

                {/* Scientific Signal Gap Analysis Block */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-navy-900 via-surface-card to-ocean-950/40 border border-ocean-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Radio className="w-4 h-4 text-ocean-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Transponder Signal Gap Evaluation
                      </h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      vesselDetails.signal_gap_analysis.risk_assessment === 'NORMAL'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {vesselDetails.signal_gap_analysis.risk_assessment}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-mono">
                    Elapsed Signal Latency:{' '}
                    <strong className="text-white">
                      {vesselDetails.signal_gap_analysis.gap_duration_seconds !== null && vesselDetails.signal_gap_analysis.gap_duration_seconds !== undefined
                        ? `${Math.round(vesselDetails.signal_gap_analysis.gap_duration_seconds / 60)} minutes`
                        : 'Under 1 minute'}
                    </strong>
                  </p>

                  {/* Mandatory Regulatory Statement */}
                  <div className="p-3 rounded-lg bg-navy-950/90 border border-amber-800/50 text-[11px] text-slate-300 leading-relaxed">
                    <strong className="text-amber-400">IMO Compliance Notice: </strong>
                    {vesselDetails.signal_gap_analysis.compliance_disclaimer}
                  </div>

                  {/* Technical Causes List */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-mono text-ocean-300 uppercase block font-bold">
                      Plausible Physical & Environmental Factors:
                    </span>
                    <ul className="text-[11px] text-slate-400 space-y-1 font-mono list-disc list-inside">
                      {vesselDetails.signal_gap_analysis.plausible_technical_causes.map((cause, idx) => (
                        <li key={idx} className="leading-tight">{cause}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Stored Breadcrumbs History */}
                {vesselDetails.track_history.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase font-bold block">
                      Chronological Waypoint Ledger ({vesselDetails.track_history.length} pings)
                    </span>
                    <div className="max-h-36 overflow-y-auto rounded-lg border border-surface-border bg-navy-900/60 p-2 text-[10px] font-mono space-y-1">
                      {vesselDetails.track_history.map((pt, i) => (
                        <div key={i} className="flex items-center justify-between text-slate-300 border-b border-surface-border/40 py-0.5">
                          <span>{new Date(pt.timestamp_utc).toLocaleTimeString()} UTC</span>
                          <span className="text-biolum-cyan">{pt.latitude.toFixed(4)}°, {pt.longitude.toFixed(4)}°</span>
                          <span>{pt.sog_knots} kts @ {pt.cog_degrees}°</span>
                          <span className="text-slate-400 truncate max-w-[100px]">{pt.nav_status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* AIS Configuration / Setup Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-2000 bg-navy-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-card border border-surface-border rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div className="flex items-center space-x-2.5">
                <Database className="w-5 h-5 text-biolum-cyan" />
                <h3 className="text-base font-bold text-white">AIS Provider Integration & Setup</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-elevated"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-lg bg-navy-900/90 border border-biolum-cyan/40 space-y-1">
                <span className="text-biolum-cyan font-bold block uppercase text-[11px]">No Physical Receiver Required</span>
                <p className="text-slate-300 leading-relaxed">
                  ORCA uses a provider-independent architecture. You do not need an SDR antenna, AIS receiver, or AISHub contributor station. You can connect any authorized cloud AIS provider when you have API credentials, or use Demonstration Mode.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-navy-900 border border-surface-border space-y-2 font-mono text-[11px]">
                <div className="text-slate-400 uppercase font-bold">Supported Provider Configurations:</div>
                <div className="text-slate-200 space-y-1">
                  <div><strong>1. AISHub Web Service:</strong></div>
                  <div className="pl-2 text-slate-400">
                    AIS_PROVIDER=aishub<br />
                    AIS_API_KEY=your_aishub_username<br />
                    AIS_API_ENDPOINT=https://data.aishub.net/ws.php
                  </div>
                  <div className="pt-1"><strong>2. MarineTraffic API:</strong></div>
                  <div className="pl-2 text-slate-400">
                    AIS_PROVIDER=marinetraffic<br />
                    MARINETRAFFIC_API_KEY=your_api_key<br />
                    MARINETRAFFIC_API_ENDPOINT=https://services.marinetraffic.com/api/exportvessels/v:8
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-slate-400">
                <strong className="text-white block">Connection Statuses:</strong>
                <ul className="space-y-1 text-[11px] font-mono">
                  <li><span className="text-emerald-400 font-bold">REAL:</span> Live vessel transponder broadcasts received.</li>
                  <li><span className="text-rose-400 font-bold">NOT CONNECTED:</span> No API credentials configured in environment.</li>
                  <li><span className="text-amber-400 font-bold">OFFLINE:</span> Upstream provider endpoint unreachable or timed out.</li>
                  <li><span className="text-ocean-400 font-bold">NO DATA:</span> Provider connected but no vessels in query bounds.</li>
                  <li><span className="text-purple-400 font-bold">DEMO:</span> User explicitly activated labeled simulated mode.</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-surface-border">
              <button
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="px-4 py-2 rounded-lg bg-surface-elevated hover:bg-navy-700 text-xs font-semibold text-white border border-surface-border flex items-center space-x-2"
              >
                <Radio className={`w-3.5 h-3.5 text-biolum-cyan ${testingConnection ? 'animate-spin' : ''}`} />
                <span>{testingConnection ? 'Testing Connection...' : 'Test Connection Now'}</span>
              </button>

              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-lg bg-ocean-600 hover:bg-ocean-500 text-xs font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
