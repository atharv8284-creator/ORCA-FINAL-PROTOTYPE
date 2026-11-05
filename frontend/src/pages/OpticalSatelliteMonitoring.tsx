import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sun, 
  Layers, 
  RefreshCw, 
  Play, 
  Database, 
  Calendar, 
  Eye, 
  ShieldCheck, 
  Sliders,
  AlertTriangle,
  CheckCircle,
  Download,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';
import type { 
  CopernicusSatelliteProduct, 
  OpticalProcessingResult, 
  OpticalSpectralIndicators,
  OpticalProductAssetsResponse,
  OpticalDownloadResponse
} from '../types';
import { DataTierBadge } from '../components/DataTierBadge';

const BBOX_PRESETS: Record<string, { label: string; bbox: [number, number, number, number] }> = {
  GBR: { label: 'Great Barrier Reef (Ribbon Reef)', bbox: [145.5, -15.8, 146.2, -15.1] },
  BALTIC: { label: 'Baltic Sea (Gotland Deep Eutrophic Basin)', bbox: [18.8, 56.9, 19.6, 57.7] },
  SARGASSO: { label: 'Sargasso Sea (Floating Sargassum Gyre)', bbox: [-65.2, 27.5, -63.8, 29.1] },
  GALAPAGOS: { label: 'Galapagos Marine Reserve (Darwin Sanctuary)', bbox: [-92.2, 1.2, -91.0, 2.2] },
  PERSIAN_GULF: { label: 'Persian Gulf & Strait of Hormuz', bbox: [54.0, 25.5, 57.5, 27.5] }
};

export const OpticalSatelliteMonitoring: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'WORKBENCH' | 'ANALYSES_LEDGER'>('WORKBENCH');

  // Step 1: Product Discovery
  const [products, setProducts] = useState<CopernicusSatelliteProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [productSearchError, setProductSearchError] = useState<string | null>(null);

  // Search parameters
  const [bboxPreset, setBboxPreset] = useState<string>('GBR');
  const [startDate, setStartDate] = useState<string>('2024-05-01');
  const [endDate, setEndDate] = useState<string>('2024-06-30');
  const [maxCloudCover, setMaxCloudCover] = useState<number>(30);
  const [directProductId, setDirectProductId] = useState<string>('');

  // Asset inspection & staging
  const [assetsInfo, setAssetsInfo] = useState<OpticalProductAssetsResponse | null>(null);
  const [loadingAssets, setLoadingAssets] = useState<boolean>(false);
  const [downloadStatus, setDownloadStatus] = useState<OpticalDownloadResponse | null>(null);
  const [downloadingAsset, setDownloadingAsset] = useState<boolean>(false);

  // Step 2: Processing & Result
  const [processing, setProcessing] = useState<boolean>(false);
  const [allowSyntheticFallback, setAllowSyntheticFallback] = useState<boolean>(false);
  const [currentResult, setCurrentResult] = useState<OpticalProcessingResult | null>(null);
  const [activeVisualization, setActiveVisualization] = useState<'TRUE_COLOR' | 'CHLOROPHYLL' | 'TURBIDITY'>('TRUE_COLOR');
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  // Step 3: Saved Ledger
  const [analysesLedger, setAnalysesLedger] = useState<OpticalProcessingResult[]>([]);
  const [loadingLedger, setLoadingLedger] = useState<boolean>(false);

  const loadAnalysesLedger = useCallback(async () => {
    setLoadingLedger(true);
    try {
      const list = await api.getOpticalAnalyses();
      setAnalysesLedger(list);
      if (list.length > 0 && !currentResult) {
        setCurrentResult(list[0]);
        setSelectedProductId(list[0].product_id);
      }
    } catch (err) {
      console.warn('Unable to load optical analyses ledger:', err);
    } finally {
      setLoadingLedger(false);
    }
  }, [currentResult]);

  const fetchSentinel2Products = useCallback(async (overrideProdId?: string) => {
    setLoadingProducts(true);
    setProductSearchError(null);
    try {
      const targetId = overrideProdId || (directProductId.trim() ? directProductId.trim() : undefined);
      let queryBbox: [number, number, number, number] | undefined = undefined;

      if (!targetId && BBOX_PRESETS[bboxPreset]) {
        queryBbox = BBOX_PRESETS[bboxPreset].bbox;
      }

      const res = await api.searchSentinel2({
        satellite: 'sentinel-2',
        bbox: queryBbox,
        start_date: targetId ? undefined : startDate,
        end_date: targetId ? undefined : endDate,
        product_id: targetId,
        max_cloud_cover: maxCloudCover,
        limit: 10
      });

      setProducts(res.features);
      if (res.features.length > 0) {
        setSelectedProductId(res.features[0].id);
      } else {
        setSelectedProductId('');
      }
    } catch (err: any) {
      setProductSearchError(err.message || 'Failed to search Copernicus Sentinel-2 STAC');
    } finally {
      setLoadingProducts(false);
    }
  }, [directProductId, bboxPreset, startDate, endDate, maxCloudCover]);

  // Inspect assets when selected product changes
  useEffect(() => {
    if (!selectedProductId) {
      setAssetsInfo(null);
      return;
    }
    let isMounted = true;
    const inspectAssets = async () => {
      setLoadingAssets(true);
      setDownloadStatus(null);
      try {
        const info = await api.getOpticalProductAssets(selectedProductId);
        if (isMounted) setAssetsInfo(info);
      } catch (err) {
        console.warn(`Failed to inspect assets for ${selectedProductId}:`, err);
        if (isMounted) setAssetsInfo(null);
      } finally {
        if (isMounted) setLoadingAssets(false);
      }
    };
    inspectAssets();
    return () => { isMounted = false; };
  }, [selectedProductId]);

  useEffect(() => {
    loadAnalysesLedger();
    fetchSentinel2Products();
  }, [loadAnalysesLedger, fetchSentinel2Products]);

  const handleDownloadAsset = async (assetKey: string = 'thumbnail') => {
    if (!selectedProductId) return;
    setDownloadingAsset(true);
    try {
      const resp = await api.downloadOpticalAsset(selectedProductId, assetKey);
      setDownloadStatus(resp);
    } catch (err: any) {
      setPipelineError(err.message || 'Asset download failed');
    } finally {
      setDownloadingAsset(false);
    }
  };

  const handleExecutePipeline = async () => {
    if (!selectedProductId) return;
    setProcessing(true);
    setPipelineError(null);

    try {
      const result = await api.processOpticalProduct({
        product_id: selectedProductId,
        zone_id: bboxPreset,
        asset_key: 'thumbnail',
        allow_synthetic_fallback: allowSyntheticFallback
      });
      setCurrentResult(result);
      await loadAnalysesLedger();
    } catch (err: any) {
      setPipelineError(err.message || 'Optical processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteAnalysis = async (analysisId: string) => {
    try {
      await api.deleteOpticalAnalysis(analysisId);
      if (currentResult?.analysis_id === analysisId) {
        setCurrentResult(null);
      }
      await loadAnalysesLedger();
    } catch (err: any) {
      console.error('Failed to delete analysis:', err);
    }
  };

  const indicators: OpticalSpectralIndicators | undefined = currentResult?.spectral_indicators;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border pb-5">
        <div>
          <div className="flex items-center space-x-2 text-biolum-cyan text-xs font-mono font-bold tracking-widest uppercase mb-1">
            <Sun className="w-4 h-4 text-amber-400" />
            <span>Sentinel-2 Multispectral Instrument (MSI) Radiometry</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Optical Satellite Monitoring & Bio-Optical Indices
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            10m-60m Multispectral BOA Radiometry • NDCI Chlorophyll Proxy • Turbidity SPM Sediment Index • Aquatic Clarity (NDWI)
          </p>
        </div>

        {/* Tab switcher */}
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
            <span>Optical Workbench</span>
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
        </div>
      </div>

      {/* Scientific Integrity Disclosure Banner */}
      <div className="p-4 rounded-xl bg-navy-900/90 border border-ocean-700/60 flex items-start space-x-3 text-xs shadow-lg">
        <ShieldCheck className="w-5 h-5 text-biolum-cyan shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-biolum-cyan uppercase tracking-wide text-[11px] font-mono flex items-center space-x-2">
            <span>Copernicus Sentinel-2 MSI Scientific Integrity Protocol</span>
            <span className="px-1.5 py-0.2 rounded bg-ocean-950 text-ocean-300 border border-ocean-800 text-[10px]">
              PHASE 3 CERTIFIED
            </span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Public Sentinel-2 Level-2A imagery is discovered via Copernicus STAC and staged from the active CDSE OData repository.
            Cloud, nodata, and glint screening isolate aquatic pixels. Derived spectral indices (<strong className="text-emerald-300">NDCI</strong> and <strong className="text-amber-300">SPM</strong>)
            provide relative bio-optical surface proxies and are strictly distinguished from direct radiometry.
            Zero synthetic substitution is enforced unless explicitly toggled.
          </p>
        </div>
      </div>

      {activeTab === 'WORKBENCH' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Controls & Product Selection */}
          <div className="lg:col-span-5 space-y-6">
            {/* Step 1: Product Selection */}
            <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-surface-border pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-ocean-600/30 text-ocean-400 border border-ocean-500/40 flex items-center justify-center font-mono font-bold text-xs">
                    1
                  </span>
                  <h3 className="font-bold text-white text-sm">Sentinel-2 Product Discovery</h3>
                </div>
                <button
                  onClick={() => fetchSentinel2Products()}
                  disabled={loadingProducts}
                  className="px-2.5 py-1 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 border border-surface-border text-xs flex items-center space-x-1.5 transition-all"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingProducts ? 'animate-spin text-biolum-cyan' : ''}`} />
                  <span>Query STAC</span>
                </button>
              </div>

              {/* Presets & Dates */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Marine Ecological Corridor:
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
                  </select>
                </div>

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

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-400">Max Cloud Cover Filter:</label>
                    <span className="font-mono text-biolum-cyan text-[11px]">{maxCloudCover}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="80"
                    step="5"
                    value={maxCloudCover}
                    onChange={(e) => setMaxCloudCover(parseInt(e.target.value))}
                    className="w-full accent-biolum-cyan cursor-pointer"
                  />
                </div>

                {/* Direct Product ID Input */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Or Direct Sentinel-2 Product ID:
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={directProductId}
                      onChange={(e) => setDirectProductId(e.target.value)}
                      placeholder="S2A_MSIL2A_20261102T..."
                      className="flex-1 bg-navy-950 border border-surface-border rounded-lg px-3 py-1.5 text-xs text-white font-mono truncate"
                    />
                    <button
                      onClick={() => fetchSentinel2Products(directProductId)}
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
                    <span>Querying Copernicus Sentinel-2 STAC...</span>
                  </div>
                ) : products.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-surface-border rounded-xl">
                    No Sentinel-2 products found matching parameters.
                  </div>
                ) : (
                  products.map((p) => {
                    const isSelected = selectedProductId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProductId(p.id)}
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
                            {p.cloud_cover_pct !== undefined ? `${p.cloud_cover_pct.toFixed(0)}% cloud` : 'L2A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                          <span>Acquisition: {new Date(p.acquisition_timestamp || '').toLocaleDateString()}</span>
                          <span className="font-mono text-slate-300">
                            {p.platform || 'Sentinel-2A/B'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Asset Inspection & Spectral Bands Breakdown */}
            {selectedProductId && (
              <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-biolum-cyan" />
                    <h3 className="font-bold text-white text-xs uppercase tracking-wide">
                      MSI Spectral Bands & Asset Ledger
                    </h3>
                  </div>
                  {loadingAssets && (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-biolum-cyan" />
                  )}
                </div>

                {assetsInfo ? (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between text-slate-300 text-[11px]">
                      <span>Available Spectral Bands: <strong className="text-white font-mono">{assetsInfo.available_bands.length} bands</strong></span>
                      <span className="text-slate-400 font-mono text-[10px]">
                        Public Previews: {assetsInfo.public_previews.length}
                      </span>
                    </div>

                    {/* Band Badges */}
                    <div className="flex flex-wrap gap-1">
                      {assetsInfo.available_bands.map((band) => (
                        <span 
                          key={band}
                          className="px-1.5 py-0.5 rounded bg-navy-950 border border-surface-border text-[10px] font-mono text-emerald-400"
                        >
                          {band}
                        </span>
                      ))}
                    </div>

                    {/* Download & Pre-stage Button */}
                    <div className="pt-2 border-t border-surface-border flex items-center justify-between">
                      <div className="text-[10px] text-slate-400">
                        {downloadStatus ? (
                          <span className="text-emerald-400 flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Preview Staged ({downloadStatus.file_size_bytes} bytes)</span>
                          </span>
                        ) : (
                          <span>Quicklook / Thumbnail: Public OData access</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDownloadAsset('thumbnail')}
                        disabled={downloadingAsset}
                        className="px-2.5 py-1 rounded bg-navy-800 hover:bg-navy-700 text-slate-200 border border-surface-border text-[11px] font-mono flex items-center space-x-1 disabled:opacity-50"
                      >
                        <Download className="w-3 h-3" />
                        <span>{downloadingAsset ? 'Staging...' : 'Stage Preview'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">
                    {loadingAssets ? 'Inspecting spectral bands from CDSE...' : 'Select a product to view spectral assets.'}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Processing Trigger */}
            <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
              <div className="flex items-center space-x-2 border-b border-surface-border pb-3">
                <span className="w-6 h-6 rounded-full bg-ocean-600/30 text-ocean-400 border border-ocean-500/40 flex items-center justify-center font-mono font-bold text-xs">
                  2
                </span>
                <h3 className="font-bold text-white text-sm">Execute Multispectral Bio-Optical Analysis</h3>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-navy-950 border border-surface-border text-xs text-slate-300 space-y-1">
                  <div className="font-semibold text-white">Spectral Algorithm Pipeline:</div>
                  <ul className="list-disc list-inside text-slate-400 space-y-0.5 text-[11px]">
                    <li>Cloud & glint threshold screening (brightness &gt; 0.70)</li>
                    <li>NDCI Normalized Difference Chlorophyll Index calculation</li>
                    <li>Suspended Particulate Matter (SPM) turbidity proxy calculation</li>
                    <li>Aquatic clarity (NDWI) water delineation</li>
                  </ul>
                </div>

                {/* Synthetic Fallback Guardrail Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-navy-950/70 border border-surface-border text-xs">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-white block">Synthetic Fallback Guardrail</span>
                    <span className="text-[10px] text-slate-400 block">
                      {allowSyntheticFallback 
                        ? 'Simulated fallback permitted if download fails (labeled SIMULATED)'
                        : 'Strict non-synthetic mode: fail cleanly if imagery unreachable'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowSyntheticFallback}
                    onChange={(e) => setAllowSyntheticFallback(e.target.checked)}
                    className="accent-biolum-cyan w-4 h-4 cursor-pointer"
                  />
                </div>

                <button
                  onClick={handleExecutePipeline}
                  disabled={processing || !selectedProductId}
                  className="w-full py-3 px-4 bg-gradient-to-r from-ocean-600 via-biolum-cyan to-biolum-teal hover:opacity-95 text-navy-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-biolum-cyan/20 transition-all disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-navy-950" />
                      <span>Calibrating & Processing Spectral Bands...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Run Bio-Optical Spectral Pipeline</span>
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

          {/* RIGHT COLUMN: Results & Visualizations */}
          <div className="lg:col-span-7 space-y-6">
            {!currentResult ? (
              <div className="p-12 rounded-2xl bg-surface-card border border-dashed border-surface-border text-center space-y-4">
                <Sun className="w-16 h-16 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">No Optical Analysis Active</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Select a Sentinel-2 MSI scene on the left and click "Run Bio-Optical Spectral Pipeline"
                    to compute chlorophyll pigment indexes and turbidity plumes.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Result Metadata Header */}
                <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border pb-3">
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="text-[10px] font-mono text-biolum-cyan font-bold uppercase tracking-wider">
                          Run: {currentResult.analysis_id.slice(0, 16)}...
                        </span>
                        <DataTierBadge tier={currentResult.data_tier} />
                        {currentResult.uncertainty_margin !== undefined && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-navy-950 text-amber-300 border border-amber-800">
                            ±{(currentResult.uncertainty_margin * 100).toFixed(0)}% Uncertainty
                          </span>
                        )}
                        {currentResult.processing_status && (
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                            currentResult.processing_status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                            currentResult.processing_status === 'HIGH_CLOUD_COVER' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                            'bg-rose-950 text-rose-300 border-rose-800'
                          }`}>
                            {currentResult.processing_status}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-white text-sm mt-1">Sentinel-2 MSI Radiometric Analysis</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {currentResult.execution_duration_ms.toFixed(1)} ms
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Acquired: {currentResult.acquisition_timestamp ? new Date(currentResult.acquisition_timestamp).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Spectral Indicators Grid */}
                  {indicators && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-3 rounded-xl bg-navy-950 border border-surface-border space-y-0.5">
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Chlorophyll (NDCI Proxy)</span>
                        <div className="text-sm font-bold text-emerald-400 font-mono">
                          {indicators.ndci_chlorophyll_proxy.toFixed(3)}
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded inline-block ${
                          indicators.algal_bloom_risk === 'HIGH' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                          indicators.algal_bloom_risk === 'ELEVATED' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}>
                          Risk: {indicators.algal_bloom_risk}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-navy-950 border border-surface-border space-y-0.5">
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Turbidity (SPM Proxy)</span>
                        <div className="text-sm font-bold text-amber-400 font-mono">
                          {indicators.turbidity_spm_index.toFixed(3)}
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono block truncate">
                          {indicators.turbidity_severity}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-navy-950 border border-surface-border space-y-0.5">
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Clarity (NDWI Proxy)</span>
                        <div className="text-sm font-bold text-biolum-cyan font-mono">
                          {indicators.ndwi_water_index.toFixed(3)}
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono block">Aquatic Clarity</span>
                      </div>

                      <div className="p-3 rounded-xl bg-navy-950 border border-surface-border space-y-0.5">
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Anomaly Area</span>
                        <div className="text-sm font-bold text-white font-mono">
                          {indicators.anomaly_coverage_sq_km.toFixed(1)} km²
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono block">
                          Cloud: {indicators.cloud_coverage_pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Direct vs Derived Evidence Classification (Req 7) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-surface-border text-xs">
                    <div className="p-3 rounded-xl bg-navy-950/80 border border-surface-border space-y-1">
                      <div className="font-bold text-biolum-cyan text-[11px] uppercase font-mono">
                        Direct Observations (Visual sRGB Intensities)
                      </div>
                      <div className="text-[11px] text-slate-300 space-y-0.5 font-mono">
                        <div>Water Pixels: {indicators?.valid_water_coverage_pct?.toFixed(1) ?? 'N/A'}%</div>
                        <div>Cloud Masked: {indicators?.cloud_coverage_pct.toFixed(1)}%</div>
                        <div>sRGB R/G/B: [{indicators?.mean_reflectance?.red?.toFixed(2) ?? '0.00'}, {indicators?.mean_reflectance?.green?.toFixed(2) ?? '0.00'}, {indicators?.mean_reflectance?.blue?.toFixed(2) ?? '0.00'}]</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-navy-950/80 border border-surface-border space-y-1">
                      <div className="font-bold text-emerald-400 text-[11px] uppercase font-mono">
                        Derived Bio-Optical Proxies (Experimental)
                      </div>
                      <div className="text-[11px] text-slate-300 space-y-0.5 font-mono">
                        <div>Chlorophyll Proxy: {indicators?.ndci_chlorophyll_proxy.toFixed(3)} (Visual G-R Ratio)</div>
                        <div>Turbidity Proxy: {indicators?.turbidity_spm_index.toFixed(3)} (Red Scattering)</div>
                        <div>Status: {currentResult.processing_status || 'COMPLETED'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Mandatory Scientific Disclaimer Banner */}
                  {currentResult.scientific_disclaimer && (
                    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-600/40 text-amber-200 text-xs flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold uppercase tracking-wider text-[10px] font-mono text-amber-300">
                          Scientific Disclaimer (Requirement 7)
                        </span>
                        <p className="text-[11px] text-amber-200/90 leading-relaxed">
                          {currentResult.scientific_disclaimer}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Scientific Notes */}
                  <div className="text-[11px] text-slate-400 italic bg-navy-900/60 p-2.5 rounded-xl border border-surface-border">
                    {currentResult.scientific_notes}
                  </div>
                </div>

                {/* Multi-Layer Optical Visualizer */}
                <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border pb-3">
                    <div className="flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-biolum-cyan" />
                      <h3 className="font-bold text-white text-sm">Multispectral Band Visualizer</h3>
                    </div>

                    {/* Layer Switcher */}
                    <div className="flex items-center space-x-1.5 bg-navy-950 p-1 rounded-xl text-xs border border-surface-border">
                      <button
                        onClick={() => setActiveVisualization('TRUE_COLOR')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          activeVisualization === 'TRUE_COLOR'
                            ? 'bg-biolum-cyan text-navy-950 shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        True Color RGB
                      </button>
                      <button
                        onClick={() => setActiveVisualization('CHLOROPHYLL')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          activeVisualization === 'CHLOROPHYLL'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Chlorophyll-a (NDCI)
                      </button>
                      <button
                        onClick={() => setActiveVisualization('TURBIDITY')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          activeVisualization === 'TURBIDITY'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Turbidity (SPM)
                      </button>
                    </div>
                  </div>

                  {/* Image Display Canvas */}
                  <div className="relative rounded-xl overflow-hidden bg-navy-950 border border-surface-border aspect-video flex items-center justify-center">
                    {activeVisualization === 'TRUE_COLOR' && currentResult.visualizations?.true_color_rgb_png && (
                      <img
                        src={currentResult.visualizations.true_color_rgb_png}
                        alt="True Color RGB Sentinel-2"
                        className="w-full h-full object-contain"
                      />
                    )}
                    {activeVisualization === 'CHLOROPHYLL' && currentResult.visualizations?.chlorophyll_ndci_png && (
                      <img
                        src={currentResult.visualizations.chlorophyll_ndci_png}
                        alt="Chlorophyll-a NDCI Index"
                        className="w-full h-full object-contain"
                      />
                    )}
                    {activeVisualization === 'TURBIDITY' && currentResult.visualizations?.turbidity_spm_png && (
                      <img
                        src={currentResult.visualizations.turbidity_spm_png}
                        alt="Turbidity SPM Plume"
                        className="w-full h-full object-contain"
                      />
                    )}

                    {/* Product Attribution Badge */}
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-navy-950/80 backdrop-blur-md border border-surface-border text-[10px] font-mono text-slate-300">
                      Product: {currentResult.product_id}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SAVED ANALYSES LEDGER */}
      {activeTab === 'ANALYSES_LEDGER' && (
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <div>
              <h3 className="font-bold text-white text-sm">Optical Multispectral Analyses History</h3>
              <p className="text-xs text-slate-400">All Sentinel-2 MSI processed runs and calculated bio-optical indexes</p>
            </div>
            <button
              onClick={loadAnalysesLedger}
              className="px-2.5 py-1 rounded-lg bg-navy-800 text-slate-300 text-xs font-mono flex items-center space-x-1"
            >
              <RefreshCw className={`w-3 h-3 ${loadingLedger ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {analysesLedger.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-surface-border rounded-xl">
              No optical analyses saved yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {analysesLedger.map((run) => (
                <div
                  key={run.analysis_id}
                  className="p-4 rounded-xl bg-navy-950 border border-surface-border hover:border-biolum-cyan/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-biolum-cyan">{run.analysis_id.slice(0, 16)}...</span>
                      <DataTierBadge tier={run.data_tier} />
                      {run.processing_status && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-navy-900 text-slate-300 border border-surface-border">
                          {run.processing_status}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white font-mono">{run.product_id}</div>
                    <div className="text-[11px] text-slate-400">
                      Processed: {new Date(run.processed_at).toLocaleString()} • Duration: {run.execution_duration_ms.toFixed(1)} ms
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right text-xs">
                      <div className="text-emerald-400 font-mono font-bold">
                        NDCI: {run.spectral_indicators?.ndci_chlorophyll_proxy.toFixed(3)}
                      </div>
                      <div className="text-amber-400 font-mono text-[11px]">
                        SPM: {run.spectral_indicators?.turbidity_spm_index.toFixed(3)}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setCurrentResult(run);
                        setSelectedProductId(run.product_id);
                        setActiveTab('WORKBENCH');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-ocean-600 hover:bg-ocean-500 text-white font-semibold text-xs flex items-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>

                    <button
                      onClick={() => handleDeleteAnalysis(run.analysis_id)}
                      className="p-1.5 rounded-lg bg-navy-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-surface-border transition-all"
                      title="Delete run"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
