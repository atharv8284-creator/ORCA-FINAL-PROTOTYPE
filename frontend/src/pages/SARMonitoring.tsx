import React, { useState, useEffect, useCallback } from 'react';
import {
  Radar,
  Layers,
  Activity,
  CheckCircle2,
  Download,
  Play,
  Sliders,
  Database,
  Eye,
  RefreshCw,
  ShieldAlert,
  Compass,
  Crosshair,
  Calendar
} from 'lucide-react';
import { api } from '../services/api';
import type {
  CopernicusSatelliteProduct,
  SARProductAssetResponse,
  SARPreprocessingParams,
  SARProcessingResult,
  SARDependencyStatus
} from '../types';
import { DataTierBadge } from '../components/DataTierBadge';

const BBOX_PRESETS: Record<string, { label: string; bbox: [number, number, number, number] }> = {
  PERSIAN_GULF: { label: 'Persian Gulf & Strait of Hormuz (Heavy Tanker Traffic)', bbox: [54.0, 25.5, 57.5, 27.5] },
  MALACCA_STRAIT: { label: 'Strait of Malacca (Bunkering & Shipping Lane)', bbox: [101.5, 1.8, 104.0, 3.2] },
  GALAPAGOS: { label: 'Galapagos Marine Reserve (Darwin Sanctuary)', bbox: [-92.2, 1.2, -91.0, 2.2] },
  NORTH_SEA: { label: 'North Sea (Offshore Energy Platform Zone)', bbox: [2.0, 54.0, 5.5, 57.0] },
  MEDITERRANEAN: { label: 'Sicily Channel (Central Mediterranean)', bbox: [11.5, 36.0, 14.5, 38.0] }
};

export const SARMonitoring: React.FC = () => {
  // Navigation / Tab state within SAR Workbench
  const [activeTab, setActiveTab] = useState<'WORKBENCH' | 'ANALYSES_LEDGER' | 'DEPENDENCY_AUDIT'>('WORKBENCH');

  // Dependencies state
  const [dependencies, setDependencies] = useState<SARDependencyStatus | null>(null);
  const [loadingDependencies, setLoadingDependencies] = useState<boolean>(false);

  // Step 1: Product Selection
  const [products, setProducts] = useState<CopernicusSatelliteProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<CopernicusSatelliteProduct | null>(null);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [productSearchError, setProductSearchError] = useState<string | null>(null);

  // Search parameters for Sentinel-1
  const [bboxPreset, setBboxPreset] = useState<string>('PERSIAN_GULF');
  const [customBbox, setCustomBbox] = useState<string>('50.0, 24.5, 57.0, 29.5');
  const [startDate, setStartDate] = useState<string>('2024-05-01');
  const [endDate, setEndDate] = useState<string>('2024-06-30');
  const [directProductId, setDirectProductId] = useState<string>('');

  // Step 2: Asset Retrieval
  const [assetData, setAssetData] = useState<SARProductAssetResponse | null>(null);
  const [selectedAssetKey, setSelectedAssetKey] = useState<string>('thumbnail');
  const [loadingAssets, setLoadingAssets] = useState<boolean>(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  // Step 3: Pipeline Parameters
  const [params, setParams] = useState<SARPreprocessingParams>({
    calibration_mode: 'SIGMA_NAUGHT_DB',
    calibration_factor: 1.0,
    speckle_filter: 'REFINED_LEE',
    filter_window_size: 5,
    enable_land_masking: true,
    land_mask_threshold_db: -5.0,
    adaptive_threshold_sigma: 2.5,
    min_cluster_pixels: 15,
    max_cluster_pixels: 50000
  });

  // Step 4 & 5: Pipeline Processing & Visualization
  const [processing, setProcessing] = useState<boolean>(false);
  const [allowSyntheticFallback, setAllowSyntheticFallback] = useState<boolean>(false);
  const [currentResult, setCurrentResult] = useState<SARProcessingResult | null>(null);
  const [activeVisualization, setActiveVisualization] = useState<'MASK' | 'FILTERED' | 'CALIBRATED'>('MASK');
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  // Step 7: Historical Analyses Ledger
  const [analysesLedger, setAnalysesLedger] = useState<SARProcessingResult[]>([]);
  const [loadingLedger, setLoadingLedger] = useState<boolean>(false);

  const fetchDependencies = useCallback(async () => {
    setLoadingDependencies(true);
    try {
      const data = await api.getSARDependencies();
      setDependencies(data);
    } catch (err: any) {
      console.warn('Unable to retrieve SAR dependencies:', err);
    } finally {
      setLoadingDependencies(false);
    }
  }, []);

  const loadAnalysesLedger = useCallback(async () => {
    setLoadingLedger(true);
    try {
      const list = await api.getSARAnalyses();
      setAnalysesLedger(list);
      if (list.length > 0) {
        setCurrentResult((prev) => prev || list[0]);
      }
    } catch (err) {
      console.warn('Unable to load SAR analyses ledger:', err);
    } finally {
      setLoadingLedger(false);
    }
  }, []);

  const selectProduct = useCallback(async (product: CopernicusSatelliteProduct) => {
    setSelectedProductId(product.id);
    setSelectedProduct(product);
    setAssetData(null);
    setDownloadStatus(null);
    setLoadingAssets(true);

    try {
      const assetResp = await api.getSARProductAssets(product.id);
      setAssetData(assetResp);
      if (assetResp.assets['thumbnail']) {
        setSelectedAssetKey('thumbnail');
      } else {
        const firstKey = Object.keys(assetResp.assets)[0];
        if (firstKey) setSelectedAssetKey(firstKey);
      }
    } catch (err: any) {
      console.error('Failed to retrieve assets for product:', err);
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  const fetchSentinel1Products = useCallback(async (overrideProdId?: string) => {
    setLoadingProducts(true);
    setProductSearchError(null);
    try {
      let queryBbox: [number, number, number, number] | undefined = undefined;
      const targetId = overrideProdId || (directProductId.trim() ? directProductId.trim() : undefined);

      if (!targetId) {
        if (bboxPreset !== 'CUSTOM' && BBOX_PRESETS[bboxPreset]) {
          queryBbox = BBOX_PRESETS[bboxPreset].bbox;
        } else if (customBbox.trim()) {
          const parts = customBbox.split(',').map((p) => parseFloat(p.trim()));
          if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
            queryBbox = parts as [number, number, number, number];
          }
        }
      }

      const res = await api.getSARProducts({
        limit: 10,
        min_lon: queryBbox ? queryBbox[0] : undefined,
        min_lat: queryBbox ? queryBbox[1] : undefined,
        max_lon: queryBbox ? queryBbox[2] : undefined,
        max_lat: queryBbox ? queryBbox[3] : undefined,
        start_date: targetId ? undefined : startDate,
        end_date: targetId ? undefined : endDate,
        product_id: targetId
      });

      setProducts(res.features);
      if (res.features.length > 0) {
        selectProduct(res.features[0]);
      } else {
        setSelectedProductId('');
        setSelectedProduct(null);
        setAssetData(null);
      }
    } catch (err: any) {
      setProductSearchError(err.message || 'Failed to query Copernicus STAC for Sentinel-1 products');
    } finally {
      setLoadingProducts(false);
    }
  }, [directProductId, bboxPreset, customBbox, startDate, endDate, selectProduct]);

  // Initial load: Fetch dependencies and any persisted analyses
  useEffect(() => {
    fetchDependencies();
    loadAnalysesLedger();
    fetchSentinel1Products();
  }, [fetchDependencies, loadAnalysesLedger, fetchSentinel1Products]);



  const handleDownloadAsset = async () => {
    if (!selectedProductId || !selectedAssetKey) return;
    setDownloadStatus('Downloading / caching asset on server...');
    try {
      const resp = await api.downloadSARAsset(selectedProductId, selectedAssetKey);
      if (resp.status === 'AUTH_REQUIRED_FOR_FULL_RASTER') {
        setDownloadStatus(`Notice: ${resp.message}`);
      } else {
        setDownloadStatus(`Success: ${resp.message} (${Math.round(resp.size_bytes / 1024)} KB)`);
      }
    } catch (err: any) {
      setDownloadStatus(`Error downloading asset: ${err.message}`);
    }
  };

  const handleExecutePipeline = async () => {
    if (!selectedProductId) return;
    setProcessing(true);
    setPipelineError(null);

    try {
      const result = await api.processSARPipeline({
        product_id: selectedProductId,
        asset_key: selectedAssetKey,
        params: params,
        allow_synthetic_fallback: allowSyntheticFallback
      });
      setCurrentResult(result);
      // Refresh ledger
      await loadAnalysesLedger();
    } catch (err: any) {
      setPipelineError(err.message || 'Error occurred during SAR pipeline execution');
    } finally {
      setProcessing(false);
    }
  };

  const handleRestoreAnalysis = (analysis: SARProcessingResult) => {
    setCurrentResult(analysis);
    setSelectedProductId(analysis.product_id);
    setActiveTab('WORKBENCH');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-surface-border pb-5">
        <div>
          <div className="flex items-center space-x-2 text-biolum-cyan text-xs font-mono font-bold tracking-widest uppercase mb-1">
            <Radar className="w-4 h-4 animate-pulse" />
            <span>Copernicus Sentinel-1 C-Band SAR Suite</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            SAR Marine Surface Anomaly Analysis & Preprocessing
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Scientific high-resolution SAR pipeline utilizing coherent radar backscatter damping to isolate capillary
            wave attenuation. Configured for Sentinel-1 GRD IW multi-look radar products with calibrated matrix processing.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center space-x-2 bg-surface-card border border-surface-border p-1.5 rounded-xl self-start">
          <button
            onClick={() => setActiveTab('WORKBENCH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'WORKBENCH'
                ? 'bg-biolum-cyan text-navy-950 shadow-md shadow-biolum-cyan/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>SAR Workbench</span>
          </button>

          <button
            onClick={() => setActiveTab('ANALYSES_LEDGER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'ANALYSES_LEDGER'
                ? 'bg-ocean-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Saved Runs ({analysesLedger.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('DEPENDENCY_AUDIT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'DEPENDENCY_AUDIT'
                ? 'bg-navy-800 text-amber-300 border border-amber-600/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Scientific Diagnostics</span>
          </button>
        </div>
      </div>

      {/* Scientific Integrity Disclaimer Banner */}
      <div className="p-3.5 rounded-xl bg-navy-900/80 border border-amber-500/30 flex items-start space-x-3 text-xs">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-amber-300 uppercase tracking-wide text-[11px] font-mono">
            Scientific Integrity Protocol
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            SAR capillary wave damping represents physical surface tension suppression caused by natural surfactants,
            grease ice, internal waves, or low-wind shadows as well as anthropogenic hydrocarbons. All detections are
            strictly classified as <strong className="text-amber-200">Candidate Anomalies</strong> requiring multimodal
            corroboration (AIS vessel tracking, optical multi-spectral chlorophyll validation, and oceanographic buoy wind confirmation)
            before confirmation.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SAR WORKBENCH                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'WORKBENCH' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Steps 1, 2, 3 Controls */}
          <div className="lg:col-span-5 space-y-6">
            {/* Step 1: Sentinel-1 Product Selection */}
            <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-surface-border pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-ocean-600/30 text-ocean-400 border border-ocean-500/40 flex items-center justify-center font-mono font-bold text-xs">
                    1
                  </span>
                  <h3 className="font-bold text-white text-sm">Sentinel-1 Product Discovery</h3>
                </div>
                <button
                  onClick={() => fetchSentinel1Products()}
                  disabled={loadingProducts}
                  className="px-2.5 py-1 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 border border-surface-border text-xs flex items-center space-x-1.5 transition-all"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingProducts ? 'animate-spin text-biolum-cyan' : ''}`} />
                  <span>Query STAC</span>
                </button>
              </div>

              {/* Geographic Presets & Bounding Box */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Maritime Geographic Corridor:
                  </label>
                  <select
                    value={bboxPreset}
                    onChange={(e) => setBboxPreset(e.target.value)}
                    className="w-full bg-navy-950 border border-surface-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-biolum-cyan"
                  >
                    {Object.entries(BBOX_PRESETS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                    <option value="CUSTOM">Custom Geographic BBOX [min_lon, min_lat, max_lon, max_lat]</option>
                  </select>
                </div>

                {bboxPreset === 'CUSTOM' && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Custom Bounding Box Coordinates:
                    </label>
                    <input
                      type="text"
                      value={customBbox}
                      onChange={(e) => setCustomBbox(e.target.value)}
                      placeholder="e.g. 54.0, 25.5, 57.5, 27.5"
                      className="w-full bg-navy-950 border border-surface-border rounded-lg px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1 mb-1">
                      <Calendar className="w-3 h-3 text-biolum-cyan" />
                      <span>Start Date:</span>
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-navy-950 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1 mb-1">
                      <Calendar className="w-3 h-3 text-biolum-teal" />
                      <span>End Date:</span>
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-navy-950 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Direct Product ID Input */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Or Direct Sentinel-1 Product ID:
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={directProductId}
                      onChange={(e) => setDirectProductId(e.target.value)}
                      placeholder="S1A_IW_GRDH_1SDV_..."
                      className="flex-1 bg-navy-950 border border-surface-border rounded-lg px-3 py-1.5 text-xs text-white font-mono truncate"
                    />
                    <button
                      onClick={() => fetchSentinel1Products(directProductId)}
                      className="px-3 py-1.5 bg-ocean-600 hover:bg-ocean-500 text-white rounded-lg text-xs font-semibold"
                    >
                      Search
                    </button>
                  </div>
                </div>
              </div>

              {/* Product Selection List */}
              {productSearchError && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-lg text-xs text-rose-300">
                  {productSearchError}
                </div>
              )}

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {loadingProducts ? (
                  <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-biolum-cyan" />
                    <span>Connecting to Copernicus STAC...</span>
                  </div>
                ) : products.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-surface-border rounded-xl">
                    No Sentinel-1 products found for current parameters.
                  </div>
                ) : (
                  products.map((p) => {
                    const isSelected = selectedProductId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => selectProduct(p)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-navy-900 border-biolum-cyan ring-1 ring-biolum-cyan/50'
                            : 'bg-navy-950 border-surface-border hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold text-biolum-cyan truncate max-w-[240px]">
                            {p.id}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-ocean-950 text-ocean-300 border border-ocean-800">
                            {p.properties?.['sat:orbit_state'] || 'ASCENDING'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                          <span>Acquisition: {new Date(p.acquisition_timestamp || '').toLocaleDateString()}</span>
                          <span className="font-mono text-slate-300">
                            Rel Orbit: {p.relative_orbit_number || 'N/A'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Step 2: Available Image Asset Retrieval */}
            <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-surface-border pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-ocean-600/30 text-ocean-400 border border-ocean-500/40 flex items-center justify-center font-mono font-bold text-xs">
                    2
                  </span>
                  <h3 className="font-bold text-white text-sm">Image Asset Inspection & Staging</h3>
                  {selectedProduct && (
                    <span className="text-[10px] text-biolum-cyan font-mono truncate max-w-[120px]">
                      {selectedProduct.platform}
                    </span>
                  )}
                </div>
                {assetData && (
                  <span className="text-[10px] font-mono text-slate-400">
                    {assetData.assets_count} Assets Listed
                  </span>
                )}
              </div>

              {loadingAssets ? (
                <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-biolum-teal" />
                  <span>Retrieving product assets...</span>
                </div>
              ) : !assetData ? (
                <div className="text-xs text-slate-400 text-center p-3 border border-dashed border-surface-border rounded-xl">
                  Select a product to view available radar raster assets.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {Object.entries(assetData.assets).map(([key, asset]) => {
                      const isSelected = selectedAssetKey === key;
                      const isPreview = key.toLowerCase().includes('thumbnail') || key.toLowerCase().includes('preview');
                      return (
                        <div
                          key={key}
                          onClick={() => setSelectedAssetKey(key)}
                          className={`p-2.5 rounded-xl border cursor-pointer text-xs transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-navy-900 border-biolum-teal ring-1 ring-biolum-teal/40'
                              : 'bg-navy-950 border-surface-border hover:border-slate-700'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white font-mono text-[11px]">{key}</span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                  isPreview
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                                }`}
                              >
                                {isPreview ? 'Public Access' : 'Auth Required'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate max-w-[260px]">{asset.title || asset.type}</p>
                          </div>
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      );
                    })}
                  </div>

                  {/* Asset download action */}
                  <div className="pt-2 border-t border-surface-border flex items-center justify-between">
                    <button
                      onClick={handleDownloadAsset}
                      className="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-slate-200 border border-surface-border rounded-lg text-xs font-semibold flex items-center space-x-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-biolum-cyan" />
                      <span>Cache Asset Locally</span>
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Target: {selectedAssetKey}
                    </span>
                  </div>

                  {downloadStatus && (
                    <div className="p-2.5 bg-navy-950 border border-surface-border rounded-lg text-[11px] text-slate-300">
                      {downloadStatus}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 3: Scientific Preprocessing Pipeline Parameters */}
            <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
              <div className="flex items-center space-x-2 border-b border-surface-border pb-3">
                <span className="w-6 h-6 rounded-full bg-ocean-600/30 text-ocean-400 border border-ocean-500/40 flex items-center justify-center font-mono font-bold text-xs">
                  3
                </span>
                <h3 className="font-bold text-white text-sm">Preprocessing Calibration & Filtering</h3>
              </div>

              <div className="space-y-4 text-xs">
                {/* Calibration Mode */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-300">Radiometric Calibration:</label>
                    <span className="font-mono text-biolum-cyan text-[11px]">{params.calibration_mode}</span>
                  </div>
                  <select
                    value={params.calibration_mode}
                    onChange={(e: any) => setParams({ ...params, calibration_mode: e.target.value })}
                    className="w-full bg-navy-950 border border-surface-border rounded-lg px-3 py-2 text-white"
                  >
                    <option value="SIGMA_NAUGHT_DB">Sigma-Naught dB (σ⁰ dB: Radar Cross Section)</option>
                    <option value="GAMMA_NAUGHT">Gamma-Naught (γ⁰: Area Projected to Line of Sight)</option>
                    <option value="BETA_NAUGHT">Beta-Naught (β⁰: Radar Brightness DN)</option>
                  </select>
                </div>

                {/* Speckle Filter */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-300">Speckle Reduction Filter:</label>
                    <span className="font-mono text-biolum-teal text-[11px]">{params.speckle_filter}</span>
                  </div>
                  <select
                    value={params.speckle_filter}
                    onChange={(e: any) => setParams({ ...params, speckle_filter: e.target.value })}
                    className="w-full bg-navy-950 border border-surface-border rounded-lg px-3 py-2 text-white"
                  >
                    <option value="REFINED_LEE">Refined Lee Filter (Adaptive Edge-Preserving Kernel)</option>
                    <option value="FROST">Frost Filter (Exponential Damping Model)</option>
                    <option value="MEDIAN">Median 2D Filter (Speckle Suppression)</option>
                    <option value="NONE">None (Raw Radiometric Backscatter)</option>
                  </select>
                </div>

                {/* Filter Window Size */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-300">Kernel Window Size:</label>
                    <span className="font-mono text-slate-300 text-[11px]">{params.filter_window_size} × {params.filter_window_size} px</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="9"
                    step="2"
                    value={params.filter_window_size}
                    onChange={(e) => setParams({ ...params, filter_window_size: parseInt(e.target.value) })}
                    className="w-full accent-biolum-cyan cursor-pointer"
                  />
                </div>

                {/* Land Masking */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-navy-950 border border-surface-border">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-white text-[11px]">Terrestrial Land Masking</div>
                    <div className="text-[10px] text-slate-400">Eliminates landmass echoes (&gt; -5.0 dB)</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={params.enable_land_masking}
                    onChange={(e) => setParams({ ...params, enable_land_masking: e.target.checked })}
                    className="w-4 h-4 accent-biolum-cyan rounded cursor-pointer"
                  />
                </div>

                {/* Adaptive Threshold Sigma */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-300">
                      Adaptive Threshold Damping (k · σ):
                    </label>
                    <span className="font-mono text-amber-400 text-[11px]">
                      {params.adaptive_threshold_sigma} σ below μ_sea
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.5"
                    max="4.0"
                    step="0.1"
                    value={params.adaptive_threshold_sigma}
                    onChange={(e) => setParams({ ...params, adaptive_threshold_sigma: parseFloat(e.target.value) })}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                    <span>1.5σ (Higher Sensitivity)</span>
                    <span>4.0σ (Strict Outliers)</span>
                  </div>
                </div>

                {/* Fallback Mode Toggle */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-navy-950 border border-surface-border">
                  <div className="space-y-0.5 max-w-[280px]">
                    <div className="font-semibold text-white text-[11px] flex items-center space-x-1.5">
                      <span>Strict Real Satellite Imagery Only</span>
                      {!allowSyntheticFallback && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                          ENFORCED
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">
                      {allowSyntheticFallback
                        ? "Permits synthetic test raster if remote asset download fails (labeled SIMULATED)."
                        : "Prohibits synthetic substitution. Fails with error if real Sentinel-1 raster is unavailable."}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!allowSyntheticFallback}
                    onChange={(e) => setAllowSyntheticFallback(!e.target.checked)}
                    className="w-4 h-4 accent-biolum-cyan rounded cursor-pointer"
                  />
                </div>

                {/* Execution Button */}
                <button
                  onClick={handleExecutePipeline}
                  disabled={processing || !selectedProductId}
                  className="w-full py-3 px-4 bg-gradient-to-r from-ocean-600 via-biolum-cyan to-biolum-teal hover:opacity-95 text-navy-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-biolum-cyan/20 transition-all disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-navy-950" />
                      <span>Executing Mathematical Pipeline...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Execute Scientific SAR Pipeline</span>
                    </>
                  )}
                </button>

                {pipelineError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs">
                    {pipelineError}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Pipeline Results, Multi-Layer Visualizations & Candidates */}
          <div className="lg:col-span-7 space-y-6">
            {!currentResult ? (
              <div className="p-12 rounded-2xl bg-surface-card border border-dashed border-surface-border text-center space-y-4">
                <Radar className="w-16 h-16 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">No SAR Analysis Active</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Select a Sentinel-1 product on the left and click "Execute Scientific SAR Pipeline" to begin
                    radiometric calibration, Refined Lee speckle reduction, and capillary wave anomaly extraction.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Pipeline Execution Stages Bar */}
                <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-surface-border pb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono text-biolum-cyan font-bold uppercase tracking-wider">
                          Run ID: {currentResult.analysis_id}
                        </span>
                        <DataTierBadge tier={currentResult.data_tier || (currentResult.is_preview ? 'CALIBRATED_PREVIEW_ANALYSIS' : 'FULL_RASTER_PROCESSED')} />
                        {currentResult.processing_status && (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-navy-900 border border-surface-border text-slate-300">
                            {currentResult.processing_status}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-white text-sm mt-0.5">SAR Preprocessing Execution Record</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 mt-1">
                        {currentResult.source_attribution && (
                          <span className="text-slate-300">
                            Source: <span className="text-biolum-teal font-mono">{currentResult.source_attribution}</span>
                          </span>
                        )}
                        {currentResult.acquisition_timestamp && (
                          <span>
                            Acquired: <span className="text-slate-300 font-mono">{new Date(currentResult.acquisition_timestamp).toUTCString()}</span>
                          </span>
                        )}
                        {currentResult.uncertainty !== undefined && (
                          <span className="text-amber-300 font-mono">
                            Uncertainty: ±{(currentResult.uncertainty * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {currentResult.execution_duration_ms} ms total
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(currentResult.timestamp).toLocaleTimeString()} UTC
                      </div>
                    </div>
                  </div>

                  {/* Stage Chips */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {currentResult.pipeline_stages.map((stage, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-navy-950 border border-surface-border space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200 text-[11px] truncate">{stage.stage_name}</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{stage.details}</div>
                        <div className="text-[9px] text-biolum-teal font-mono">{stage.execution_time_ms} ms</div>
                      </div>
                    ))}
                  </div>

                  {/* Backscatter Statistics Row */}
                  <div className="p-3 rounded-xl bg-navy-900 border border-surface-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Sea Mean (μ_sea):</span>
                      <span className="font-mono font-bold text-biolum-cyan text-xs">
                        {currentResult.backscatter_statistics?.mean_sea_backscatter_db?.toFixed(2)} dB
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Sea StdDev (σ_sea):</span>
                      <span className="font-mono font-bold text-biolum-teal text-xs">
                        {currentResult.backscatter_statistics?.std_sea_backscatter_db?.toFixed(2)} dB
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Damping Threshold:</span>
                      <span className="font-mono font-bold text-amber-400 text-xs">
                        {currentResult.backscatter_statistics?.threshold_cutoff_db?.toFixed(2)} dB
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Sea Fraction:</span>
                      <span className="font-mono font-bold text-white text-xs">
                        {((currentResult.backscatter_statistics?.sea_pixels_fraction || 1) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Multi-Layer SAR Image Viewer */}
                <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border pb-3">
                    <div className="flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-biolum-cyan" />
                      <h3 className="font-bold text-white text-sm">Calibrated SAR Multi-Layer Visualizer</h3>
                    </div>

                    {/* Layer Switcher */}
                    <div className="flex items-center space-x-1.5 bg-navy-950 p-1 rounded-xl text-xs border border-surface-border">
                      <button
                        onClick={() => setActiveVisualization('MASK')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          activeVisualization === 'MASK'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Damping Candidates ({currentResult.total_candidates_found})
                      </button>
                      <button
                        onClick={() => setActiveVisualization('FILTERED')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          activeVisualization === 'FILTERED'
                            ? 'bg-ocean-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Refined Lee Radar
                      </button>
                      <button
                        onClick={() => setActiveVisualization('CALIBRATED')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          activeVisualization === 'CALIBRATED'
                            ? 'bg-slate-700 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Raw σ⁰ (dB)
                      </button>
                    </div>
                  </div>

                  {/* Image Display Canvas */}
                  <div className="relative rounded-xl overflow-hidden bg-navy-950 border border-surface-border aspect-video flex items-center justify-center">
                    {activeVisualization === 'MASK' && currentResult.visualizations?.anomaly_candidate_mask_png && (
                      <img
                        src={currentResult.visualizations.anomaly_candidate_mask_png}
                        alt="Anomaly Candidate Mask"
                        className="w-full h-full object-contain"
                      />
                    )}
                    {activeVisualization === 'FILTERED' && currentResult.visualizations?.speckle_filtered_png && (
                      <img
                        src={currentResult.visualizations.speckle_filtered_png}
                        alt="Speckle Filtered Radar"
                        className="w-full h-full object-contain"
                      />
                    )}
                    {activeVisualization === 'CALIBRATED' && currentResult.visualizations?.calibrated_backscatter_png && (
                      <img
                        src={currentResult.visualizations.calibrated_backscatter_png}
                        alt="Calibrated Backscatter"
                        className="w-full h-full object-contain"
                      />
                    )}

                    {/* Footprint badge overlay */}
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-navy-950/80 backdrop-blur-md border border-surface-border text-[10px] font-mono text-slate-300">
                      Product: {currentResult.product_id}
                    </div>
                  </div>
                </div>

                {/* Candidate Anomaly Analysis & Multimodal Verification Interface */}
                <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-surface-border pb-3">
                    <div className="flex items-center space-x-2">
                      <Crosshair className="w-4 h-4 text-amber-400" />
                      <h3 className="font-bold text-white text-sm">
                        Detected Surface Anomaly Candidates ({currentResult.total_candidates_found})
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                      Unverified Radar Damping
                    </span>
                  </div>

                  {currentResult.anomaly_candidates.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-surface-border rounded-xl">
                      No capillary wave damping clusters found exceeding the {params.adaptive_threshold_sigma}σ
                      threshold in this scene.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {currentResult.anomaly_candidates.map((candidate) => (
                        <div
                          key={candidate.candidate_id}
                          className="p-4 rounded-xl bg-navy-950 border border-surface-border space-y-3"
                        >
                          {/* Candidate Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-xs font-bold text-biolum-cyan">
                                {candidate.candidate_id}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                                {candidate.label}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-amber-400">
                              Peak Damping: {candidate.damping_ratio_db.toFixed(1)} dB contrast
                            </div>
                          </div>

                          {/* Candidate Metrics Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div className="p-2 rounded-lg bg-navy-900 border border-surface-border/60">
                              <span className="text-[10px] text-slate-400 block">Surface Area:</span>
                              <span className="font-mono font-bold text-slate-200">
                                {candidate.area_sq_km.toFixed(2)} km²
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-navy-900 border border-surface-border/60">
                              <span className="text-[10px] text-slate-400 block">Circularity / Form:</span>
                              <span className="font-mono font-bold text-slate-200">
                                {candidate.circularity.toFixed(3)}
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-navy-900 border border-surface-border/60">
                              <span className="text-[10px] text-slate-400 block">Centroid Coordinates:</span>
                              <span className="font-mono font-bold text-biolum-teal text-[11px]">
                                {candidate.centroid_lat.toFixed(3)}°, {candidate.centroid_lon.toFixed(3)}°
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-navy-900 border border-surface-border/60">
                              <span className="text-[10px] text-slate-400 block">Radar Confidence:</span>
                              <span className="font-mono font-bold text-amber-300">
                                {(candidate.confidence_score * 100).toFixed(1)}%
                                {candidate.uncertainty !== undefined && (
                                  <span className="text-[10px] text-slate-400 ml-1">
                                    (±{(candidate.uncertainty * 100).toFixed(0)}%)
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Candidate Geometry & Bounding Box */}
                          <div className="p-2.5 rounded-lg bg-navy-900/60 border border-surface-border/60 text-[11px] font-mono space-y-1">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] text-slate-400">
                              <span>Geometry: <span className="text-slate-200">{candidate.geometry_type || 'Polygon'}</span></span>
                              <span>BBox: [{candidate.bounding_box.map(b => b.toFixed(3)).join(', ')}]</span>
                            </div>
                            {candidate.geojson_geometry && (
                              <div className="text-[10px] text-biolum-cyan/80 truncate">
                                GeoJSON Ring: {JSON.stringify(candidate.geojson_geometry.coordinates)}
                              </div>
                            )}
                          </div>

                          {/* Recommended Multimodal Protocol Checklist */}
                          <div className="p-3 rounded-lg bg-navy-900/90 border border-amber-500/20 space-y-1.5">
                            <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wide font-mono flex items-center space-x-1">
                              <Compass className="w-3 h-3" />
                              <span>Required Multimodal Corroboration Protocol:</span>
                            </div>
                            <ul className="space-y-1 text-[11px] text-slate-300">
                              {candidate.recommended_verification.map((rec, rIdx) => (
                                <li key={rIdx} className="flex items-start space-x-2">
                                  <span className="text-amber-400 font-mono mt-0.5">•</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SAVED ANALYSES LEDGER                                              */}
      {/* ========================================================================= */}
      {activeTab === 'ANALYSES_LEDGER' && (
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-surface-border pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Historical SAR Analysis Ledger</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Persistent storage of completed SAR preprocessing runs and candidate anomaly extractions.
              </p>
            </div>
            <button
              onClick={loadAnalysesLedger}
              className="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-slate-300 border border-surface-border rounded-lg text-xs font-semibold flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLedger ? 'animate-spin text-biolum-cyan' : ''}`} />
              <span>Refresh Ledger</span>
            </button>
          </div>

          {loadingLedger ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading saved analyses...</div>
          ) : analysesLedger.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-surface-border rounded-xl">
              No previous analyses found in storage. Run a SAR preprocessing pipeline to persist results.
            </div>
          ) : (
            <div className="space-y-3">
              {analysesLedger.map((item) => (
                <div
                  key={item.analysis_id}
                  className="p-4 rounded-xl bg-navy-950 border border-surface-border hover:border-slate-600 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-biolum-cyan">{item.analysis_id}</span>
                      <DataTierBadge tier={item.data_tier || (item.is_preview ? 'CALIBRATED_PREVIEW_ANALYSIS' : 'FULL_RASTER_PROCESSED')} />
                      <span className="text-[10px] px-2 py-0.5 rounded bg-ocean-950 text-ocean-300 border border-ocean-800">
                        {item.total_candidates_found} Candidates
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 font-mono truncate max-w-xl">
                      Product: {item.product_id}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Processed: {new Date(item.timestamp).toLocaleString()} • Duration: {item.execution_duration_ms} ms
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleRestoreAnalysis(item)}
                      className="px-3 py-1.5 bg-ocean-600 hover:bg-ocean-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Load into Workbench</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SCIENTIFIC DEPENDENCY AUDIT                                        */}
      {/* ========================================================================= */}
      {activeTab === 'DEPENDENCY_AUDIT' && (
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-6">
          <div className="border-b border-surface-border pb-4">
            <h2 className="text-lg font-bold text-white">Scientific Geospatial & SAR Dependencies Diagnostic</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Transparent reporting of active mathematical kernels versus specialized native SAR processing libraries.
            </p>
          </div>

          {loadingDependencies || !dependencies ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading diagnostics...</div>
          ) : (
            <div className="space-y-6">
              {/* Active Runtime Card */}
              <div className="p-4 rounded-xl bg-navy-950 border border-emerald-500/30 space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Active Engine: {dependencies.engine_name}</span>
                </div>
                <p className="text-xs text-slate-300 font-mono">{dependencies.active_runtime}</p>
                <div className="pt-2 border-t border-surface-border flex flex-wrap gap-2 text-xs">
                  {Object.entries(dependencies.installed_libraries).map(([lib, ver]) => (
                    <span
                      key={lib}
                      className="px-2.5 py-1 rounded-md bg-navy-900 border border-surface-border font-mono text-[11px] text-biolum-cyan"
                    >
                      {lib}: v{ver}
                    </span>
                  ))}
                </div>
              </div>

              {/* Specialized Libraries Diagnostic Grid */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white">Specialized Native SAR Libraries Status:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(dependencies.specialized_libraries).map(([name, spec]) => (
                    <div
                      key={name}
                      className="p-4 rounded-xl bg-navy-950 border border-surface-border space-y-2.5 flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-slate-200 text-xs">{name}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              spec.installed
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {spec.installed ? 'ACTIVE' : 'NOT INSTALLED'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{spec.purpose}</p>
                      </div>
                      <div className="p-2 rounded bg-navy-900 border border-surface-border text-[10px] font-mono text-amber-300">
                        {spec.status_note}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Note */}
              <div className="p-4 rounded-xl bg-navy-900 border border-surface-border text-xs text-slate-300 leading-relaxed">
                <div className="font-bold text-white mb-1">Architecture & Operational Scope:</div>
                {dependencies.system_notes}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
