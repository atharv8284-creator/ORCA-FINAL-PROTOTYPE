import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type {
  CopernicusSatelliteProduct,
  CopernicusServiceHealth,
  SatelliteSearchQuery
} from '../types';
import {
  Satellite,
  Radar,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Search,
  ExternalLink,
  Wifi,
  WifiOff,
  Clock,
  ChevronDown,
  ChevronUp,
  Info,
  Lock,
  RefreshCw,
  FileCode,
  Check
} from 'lucide-react';

interface BBoxPreset {
  name: string;
  category: string;
  bbox: [number, number, number, number]; // [min_lon, min_lat, max_lon, max_lat]
}

const PRESET_BBOXES: BBoxPreset[] = [
  { name: 'Gibraltar Strait (Mediterranean Gateway)', category: 'Maritime Chokepoint', bbox: [-6.0, 35.5, -5.0, 36.5] },
  { name: 'Galapagos Marine Reserve (Darwin & Wolf)', category: 'Pelagic Sanctuary', bbox: [-92.2, 1.3, -91.3, 2.0] },
  { name: 'Great Barrier Reef (Ribbon Sector)', category: 'Coral Sanctuary', bbox: [145.5, -16.0, 146.5, -15.0] },
  { name: 'Baltic Gotland Basin (Anoxia Zone)', category: 'Hypoxic Basin', bbox: [18.5, 56.8, 19.8, 57.8] },
  { name: 'Sargasso Sea Floating Forest', category: 'Pelagic Gyre', bbox: [-65.5, 27.5, -63.5, 29.0] },
  { name: 'Raja Ampat Coral Triangle (Misool)', category: 'Biodiversity Hotspot', bbox: [129.8, -2.5, 130.6, -1.8] },
];

export const SatelliteIntelligence: React.FC = () => {
  // Service Health & Operational Status
  const [healthLoading, setHealthLoading] = useState<boolean>(true);
  const [health, setHealth] = useState<CopernicusServiceHealth | null>(null);
  const [showAuthConfig, setShowAuthConfig] = useState<boolean>(false);

  // Search Parameters
  const [mission, setMission] = useState<'sentinel-1' | 'sentinel-2'>('sentinel-1');
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESET_BBOXES[0].name);
  const [bbox, setBbox] = useState<[number, number, number, number]>(PRESET_BBOXES[0].bbox);
  const [startDate, setStartDate] = useState<string>('2024-06-01');
  const [endDate, setEndDate] = useState<string>('2024-06-10');
  const [maxCloudCover, setMaxCloudCover] = useState<number>(30);
  const [productIdFilter, setProductIdFilter] = useState<string>('');
  const [limit, setLimit] = useState<number>(10);

  // Results & UI State
  const [searching, setSearching] = useState<boolean>(false);
  const [products, setProducts] = useState<CopernicusSatelliteProduct[]>([]);
  const [searchMeta, setSearchMeta] = useState<{
    total: number;
    returned: number;
    executedAt: string;
    endpoint: string;
  } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Selected Product for Asset Inspector Modal
  const [inspectProduct, setInspectProduct] = useState<CopernicusSatelliteProduct | null>(null);

  const executeSearch = async (
    targetMission = mission,
    targetBbox = bbox,
    targetStart = startDate,
    targetEnd = endDate,
    targetCloud = maxCloudCover,
    targetId = productIdFilter,
    targetLimit = limit
  ) => {
    try {
      setSearching(true);
      setSearchError(null);

      const query: SatelliteSearchQuery = {
        satellite: targetMission,
        bbox: targetBbox,
        start_date: targetStart || undefined,
        end_date: targetEnd || undefined,
        product_id: targetId.trim() || undefined,
        max_cloud_cover: targetMission === 'sentinel-2' ? targetCloud : undefined,
        limit: targetLimit,
      };

      const response = targetMission === 'sentinel-1'
        ? await api.searchSentinel1(query)
        : await api.searchSentinel2(query);

      setProducts(response.features);
      setSearchMeta({
        total: response.total_features,
        returned: response.returned_features,
        executedAt: response.executed_at,
        endpoint: response.stac_endpoint,
      });

      if (response.returned_features === 0 && !response.message) {
        setSearchError('No satellite observation products matched the selected coordinates and date filter.');
      } else if (response.message && response.returned_features === 0) {
        setSearchError(response.message);
      }
    } catch (err: any) {
      setSearchError(err.message || 'An unexpected error occurred while querying Copernicus STAC API.');
      setProducts([]);
    } finally {
      setSearching(false);
    }
  };

  const fetchHealthStatus = async () => {
    try {
      setHealthLoading(true);
      const res = await api.getCopernicusStatus();
      setHealth(res);
      return res;
    } catch (err: any) {
      const fallback: CopernicusServiceHealth = {
        status: 'UNREACHABLE',
        stac_endpoint: 'https://stac.dataspace.copernicus.eu/v1',
        latency_ms: 0,
        stac_version: 'N/A',
        conformance_count: 0,
        supported_collections: ['sentinel-1-grd', 'sentinel-2-l2a'],
        authentication_required_for_metadata: false,
        authentication_required_for_download: true,
        auth_configured: false,
        auth_instructions: err.message || 'Failed to reach Copernicus Data Space STAC service.'
      };
      setHealth(fallback);
      return fallback;
    } finally {
      setHealthLoading(false);
    }
  };

  // Check live connection on mount and perform initial discovery
  useEffect(() => {
    const init = async () => {
      const h = await fetchHealthStatus();
      if (h && h.status === 'OPERATIONAL') {
        executeSearch();
      }
    };
    init();
  }, []);

  const handlePresetChange = (presetName: string) => {
    const found = PRESET_BBOXES.find(p => p.name === presetName);
    if (found) {
      setSelectedPreset(found.name);
      setBbox(found.bbox);
    }
  };

  return (
    <div className="space-y-6">
      {/* =================================================================== */}
      {/* 1. PAGE HEADER & SERVICE TELEMETRY BANNER                           */}
      {/* =================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-black tracking-tight text-white">
              Satellite Intelligence & STAC Ingestion
            </h1>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-biolum-cyan/15 text-biolum-cyan border border-biolum-cyan/30 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-biolum-cyan animate-pulse"></span>
              <span>Copernicus STAC v1.0</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Official Data Source: Copernicus Data Space Ecosystem (CDSE) • Real-world Sentinel-1 SAR & Sentinel-2 MSI Discovery
          </p>
        </div>

        {/* Live Health Status Pill */}
        <div className="flex items-center space-x-2">
          {healthLoading ? (
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-navy-950 border border-surface-border text-xs text-slate-400 font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-biolum-cyan" />
              <span>Checking STAC Gateway...</span>
            </div>
          ) : health?.status === 'OPERATIONAL' ? (
            <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-700/60 text-xs font-mono shadow-md">
              <div className="flex items-center space-x-1.5 text-emerald-300">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold">CDSE STAC Live</span>
              </div>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">{health.latency_ms.toFixed(0)}ms latency</span>
              <span className="text-slate-500">•</span>
              <button
                type="button"
                onClick={() => setShowAuthConfig(!showAuthConfig)}
                className="text-biolum-cyan hover:underline flex items-center space-x-1"
              >
                <span>Auth Info</span>
                {showAuthConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-rose-950/70 border border-rose-800 text-xs font-mono text-rose-300 shadow-md">
              <WifiOff className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-bold">CDSE Unreachable</span>
              <button
                type="button"
                onClick={fetchHealthStatus}
                className="ml-2 text-biolum-cyan underline"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. AUTHENTICATION & SCIENTIFIC INTEGRITY BANNERS                    */}
      {/* =================================================================== */}
      {showAuthConfig && health && (
        <div className="p-4 rounded-2xl bg-surface-card border border-surface-border text-xs space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-surface-border pb-2">
            <div className="flex items-center space-x-2 text-white font-bold">
              <Lock className="w-4 h-4 text-biolum-cyan" />
              <span>Copernicus Data Space Ecosystem Authentication Architecture</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
              health.auth_configured ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-navy-900 text-slate-300 border border-surface-border'
            }`}>
              {health.auth_configured ? 'Credentials Configured' : 'Open Metadata Mode'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300">
            <div className="space-y-1.5">
              <h4 className="font-semibold text-biolum-cyan text-xs">Metadata Discovery (Zero Credentials Required)</h4>
              <p className="text-[11px] leading-relaxed text-slate-400 font-sans">
                The STAC API specification at <code className="text-slate-200 bg-navy-900 px-1 py-0.5 rounded">https://stac.dataspace.copernicus.eu/v1/</code> is public and open. You can search bounding boxes, filter by time, inspect metadata, examine cloud cover, and list asset URLs without an API key or token.
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-semibold text-amber-400 text-xs">Full Granule Raster Downloads (OAuth2 Token Required)</h4>
              <p className="text-[11px] leading-relaxed text-slate-400 font-sans">
                Downloading full multi-gigabyte SAFE/COG rasters requires a free account from <a href="https://dataspace.copernicus.eu/" target="_blank" rel="noreferrer" className="text-biolum-cyan underline">dataspace.copernicus.eu</a>. Configure your credentials in <code className="text-slate-200 bg-navy-900 px-1 py-0.5 rounded">.env</code>:
              </p>
              <pre className="p-2 rounded bg-navy-950 font-mono text-[10px] text-slate-300 border border-surface-border">
COPERNICUS_CLIENT_ID=your_client_id_here
COPERNICUS_CLIENT_SECRET=your_client_secret_here
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Scientific Integrity Disclaimer */}
      <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-ocean-950/60 border border-ocean-700/50 text-xs text-slate-300">
        <Info className="w-4 h-4 text-biolum-cyan shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-white block">
            Scientific Rigor & Satellite Data Governance:
          </span>
          <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
            Observation metadata discovery confirms that a satellite pass captured the target marine coordinates. 
            <strong> Discovery alone does not constitute detection of an oil spill, dark vessel, or ecological disaster.</strong> In ORCA, anomalies require calibrated radiometric/SAR processing, speckle filtering, and multi-agent neural reasoning before any ecological incident is confirmed.
          </p>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. INTERACTIVE COPERNICUS STAC SEARCH QUERY BUILDER                 */}
      {/* =================================================================== */}
      <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-biolum-cyan" />
            <h3 className="font-bold text-white text-sm">
              Copernicus STAC Query Interface
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Targeting STAC Collection: <strong className="text-biolum-teal">{mission === 'sentinel-1' ? 'sentinel-1-grd' : 'sentinel-2-l2a'}</strong>
          </span>
        </div>

        {/* Form Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Mission Selector */}
          <div className="space-y-1">
            <label className="block text-[11px] font-mono text-slate-400 uppercase">
              Constellation & Sensor:
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-navy-950 border border-surface-border">
              <button
                type="button"
                onClick={() => setMission('sentinel-1')}
                className={`flex items-center justify-center space-x-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mission === 'sentinel-1'
                    ? 'bg-biolum-cyan text-navy-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radar className="w-3.5 h-3.5" />
                <span>Sentinel-1 (SAR)</span>
              </button>
              <button
                type="button"
                onClick={() => setMission('sentinel-2')}
                className={`flex items-center justify-center space-x-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mission === 'sentinel-2'
                    ? 'bg-emerald-400 text-navy-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Sentinel-2 (MSI)</span>
              </button>
            </div>
          </div>

          {/* Marine Coordinate BBox Preset */}
          <div className="space-y-1">
            <label className="block text-[11px] font-mono text-slate-400 uppercase">
              Marine Bounding Box Preset:
            </label>
            <div className="relative">
              <select
                value={selectedPreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full bg-navy-950 border border-surface-border text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-biolum-cyan cursor-pointer font-mono"
              >
                {PRESET_BBOXES.map((preset) => (
                  <option key={preset.name} value={preset.name}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range Picker (Start & End) */}
          <div className="space-y-1">
            <label className="block text-[11px] font-mono text-slate-400 uppercase">
              Acquisition Window:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-navy-950 border border-surface-border text-xs text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-biolum-cyan font-mono"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-navy-950 border border-surface-border text-xs text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-biolum-cyan font-mono"
              />
            </div>
          </div>

          {/* Sentinel-2 Cloud Cover or Sentinel-1 Polarization Filter */}
          <div className="space-y-1">
            {mission === 'sentinel-2' ? (
              <>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 uppercase">
                  <span>Max Cloud Cover:</span>
                  <span className="text-biolum-cyan font-bold">{maxCloudCover}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={maxCloudCover}
                  onChange={(e) => setMaxCloudCover(Number(e.target.value))}
                  className="w-full accent-biolum-cyan cursor-pointer mt-2"
                />
              </>
            ) : (
              <>
                <label className="block text-[11px] font-mono text-slate-400 uppercase">
                  Results Limit:
                </label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full bg-navy-950 border border-surface-border text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-biolum-cyan cursor-pointer font-mono"
                >
                  <option value={5}>Top 5 Products</option>
                  <option value={10}>Top 10 Products</option>
                  <option value={20}>Top 20 Products</option>
                  <option value={50}>Top 50 Products</option>
                </select>
              </>
            )}
          </div>
        </div>

        {/* Custom Bounding Box & Specific Product ID override */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-surface-border">
          <div className="md:col-span-2 flex items-center space-x-2 text-xs font-mono">
            <span className="text-[10px] text-slate-400 uppercase shrink-0">WGS84 Coordinates:</span>
            <span className="p-1.5 px-2.5 rounded-lg bg-navy-950 border border-surface-border text-slate-300 text-[11px] truncate flex-1">
              [{bbox.map(n => n.toFixed(2)).join(', ')}]
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Filter by Product ID (optional)..."
              value={productIdFilter}
              onChange={(e) => setProductIdFilter(e.target.value)}
              className="w-full bg-navy-950 border border-surface-border text-xs text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-biolum-cyan font-mono placeholder:text-slate-500"
            />
            <button
              type="button"
              disabled={searching}
              onClick={() => executeSearch()}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-biolum-cyan text-navy-950 font-bold text-xs hover:bg-biolum-teal transition-all shrink-0 shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {searching ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Execute Search</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4. REAL COPERNICUS SEARCH RESULTS                                   */}
      {/* =================================================================== */}
      {searchError && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/80 text-xs text-amber-200 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-white text-sm">Query Status Feedback</h4>
            <p className="leading-relaxed">{searchError}</p>
          </div>
        </div>
      )}

      {/* Search Metadata Header */}
      {searchMeta && (
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
          <span>
            Discovered <strong className="text-white">{searchMeta.returned}</strong> of{' '}
            <strong className="text-biolum-cyan">{searchMeta.total}</strong> products in Copernicus catalog
          </span>
          <span className="text-[11px] text-slate-500">
            Query executed at {new Date(searchMeta.executedAt).toLocaleTimeString()} UTC
          </span>
        </div>
      )}

      {/* Product Grid / Cards */}
      <div className="grid grid-cols-1 gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl hover:border-surface-border/90 transition-all space-y-4"
          >
            {/* Top Bar: Satellite Tag, Timestamp, Cloud Cover, Asset Count */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-surface-border pb-3">
              <div className="flex items-center space-x-2.5">
                <div className={`p-2 rounded-xl border ${
                  product.sensor_type.includes('SAR')
                    ? 'bg-cyan-950/50 border-cyan-700/50 text-cyan-300'
                    : 'bg-emerald-950/50 border-emerald-700/50 text-emerald-300'
                }`}>
                  {product.sensor_type.includes('SAR') ? <Radar className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-base">
                      {product.satellite}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-900 border border-surface-border text-slate-300">
                      {product.collection}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-ocean-400 block mt-0.5">
                    {product.id}
                  </span>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                {product.cloud_cover_pct !== undefined && product.cloud_cover_pct !== null && (
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                    product.cloud_cover_pct < 20
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : product.cloud_cover_pct < 50
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                      : 'bg-rose-950/80 text-rose-300 border-rose-800'
                  }`}>
                    Cloud: {product.cloud_cover_pct}%
                  </span>
                )}

                {product.orbit_direction && (
                  <span className="px-2 py-0.5 rounded text-[11px] bg-navy-900 text-slate-300 border border-surface-border capitalize">
                    {product.orbit_direction} Orbit
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setInspectProduct(product)}
                  className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-ocean-600/30 text-ocean-300 hover:bg-ocean-600/50 hover:text-white border border-ocean-500/40 text-[11px] font-semibold transition-all cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Assets ({product.assets_count})</span>
                </button>
              </div>
            </div>

            {/* Middle Grid: Coordinates, Timestamp, Polarizations, Thumbnail */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Thumbnail / Quicklook Preview */}
              <div className="md:col-span-1">
                {product.thumbnail_url ? (
                  <div className="relative rounded-xl overflow-hidden border border-surface-border bg-navy-950 aspect-video flex items-center justify-center group">
                    <img
                      src={product.thumbnail_url}
                      alt={product.id}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        // In case remote token is needed for thumbnail
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-transparent flex items-end p-2">
                      <span className="text-[10px] font-mono text-slate-300 flex items-center space-x-1">
                        <Check className="w-3 h-3 text-biolum-cyan" />
                        <span>Browse Thumbnail</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-surface-border bg-navy-950/60 p-4 text-center text-xs text-slate-500 aspect-video flex flex-col items-center justify-center space-y-1">
                    <Satellite className="w-5 h-5 text-slate-600" />
                    <span className="text-[10px] font-mono">No Thumbnail Asset</span>
                  </div>
                )}
              </div>

              {/* Observation Properties */}
              <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="block text-[10px] font-mono text-slate-400 uppercase">
                    Acquisition Time (UTC)
                  </span>
                  <span className="font-mono text-white font-semibold">
                    {product.acquisition_timestamp
                      ? new Date(product.acquisition_timestamp).toUTCString()
                      : 'N/A'}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="block text-[10px] font-mono text-slate-400 uppercase">
                    Sensor Mode / Resolution
                  </span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {product.swath_identifier || product.sensor_type} ({product.resolution_meters}m)
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="block text-[10px] font-mono text-slate-400 uppercase">
                    Platform / Constellation
                  </span>
                  <span className="font-mono text-biolum-cyan font-semibold">
                    {product.platform} • {product.constellation}
                  </span>
                </div>

                {product.bbox && (
                  <div className="space-y-0.5 col-span-2">
                    <span className="block text-[10px] font-mono text-slate-400 uppercase">
                      Geographical Footprint BBox
                    </span>
                    <span className="font-mono text-slate-300 text-[11px]">
                      SW: ({product.bbox[1].toFixed(2)}°, {product.bbox[0].toFixed(2)}°) • NE: ({product.bbox[3].toFixed(2)}°, {product.bbox[2].toFixed(2)}°)
                    </span>
                  </div>
                )}

                {product.polarization && product.polarization.length > 0 && (
                  <div className="space-y-0.5">
                    <span className="block text-[10px] font-mono text-slate-400 uppercase">
                      SAR Polarization
                    </span>
                    <span className="font-mono text-white font-semibold">
                      {product.polarization.join(' + ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* =============================================================== */}
            {/* 5-STAGE SEPARATE PIPELINE STATUS TRACKER                        */}
            {/* =============================================================== */}
            <div className="pt-3 border-t border-surface-border">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-2">
                Copernicus Ingestion & Scientific Processing Lifecycle:
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {/* Stage 1: Product Discovered */}
                <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[11px] font-bold text-white block leading-tight">
                      1. Discovered
                    </span>
                    <span className="text-[9px] text-emerald-300 font-mono">STAC Catalog</span>
                  </div>
                </div>

                {/* Stage 2: Asset Available */}
                <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[11px] font-bold text-white block leading-tight">
                      2. Asset Ready
                    </span>
                    <span className="text-[9px] text-emerald-300 font-mono">{product.assets_count} Links</span>
                  </div>
                </div>

                {/* Stage 3: Image Downloaded */}
                <div className="p-2 rounded-xl bg-navy-950 border border-surface-border flex items-center space-x-2 opacity-70">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[11px] font-bold text-slate-300 block leading-tight">
                      3. Downloaded
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">In Staging Queue</span>
                  </div>
                </div>

                {/* Stage 4: Image Processed */}
                <div className="p-2 rounded-xl bg-navy-950 border border-surface-border flex items-center space-x-2 opacity-70">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[11px] font-bold text-slate-300 block leading-tight">
                      4. Processed
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">Pending Compute</span>
                  </div>
                </div>

                {/* Stage 5: Anomaly Analysis */}
                <div className="p-2 rounded-xl bg-navy-950 border border-surface-border flex items-center space-x-2 opacity-70">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[11px] font-bold text-slate-300 block leading-tight">
                      5. Analysis
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">Pending Nugen AI</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* =================================================================== */}
      {/* 5. MODAL: ASSET INVENTORY & DIRECT CDSE DOWNLOAD LINKS              */}
      {/* =================================================================== */}
      {inspectProduct && (
        <div className="fixed inset-0 z-[2000] bg-navy-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-navy-900 border border-surface-border rounded-2xl shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div>
                <span className="text-[10px] font-mono text-ocean-400 uppercase">
                  Available STAC Asset Inventory
                </span>
                <h3 className="font-bold text-white text-base leading-tight mt-0.5">
                  {inspectProduct.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectProduct(null)}
                className="p-1 rounded-lg hover:bg-surface-elevated text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs text-slate-300 block">
                Total Assets: <strong className="text-biolum-cyan">{inspectProduct.assets_count}</strong> available directly from the Copernicus Data Space Ecosystem:
              </span>

              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {Object.entries(inspectProduct.assets).map(([key, asset]) => (
                  <div
                    key={key}
                    className="p-2.5 rounded-xl bg-navy-950 border border-surface-border flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white font-mono">{asset.name}</span>
                        {asset.type && (
                          <span className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]">
                            {asset.type}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block truncate">
                        {asset.href}
                      </span>
                    </div>

                    <a
                      href={asset.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-ocean-600/40 text-biolum-cyan text-[11px] font-mono shrink-0 border border-surface-border"
                    >
                      <span>Open Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-surface-border flex items-center justify-between text-xs text-slate-400">
              <span className="text-[11px]">Direct links resolve to the Copernicus Data Space STAC asset repository.</span>
              <button
                type="button"
                onClick={() => setInspectProduct(null)}
                className="px-4 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-card text-white text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
