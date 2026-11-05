import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MarineIntelligenceMapCore } from '../components/map/MarineIntelligenceMapCore';
import { MapLayerControls } from '../components/map/MapLayerControls';
import { MapFilterBar } from '../components/map/MapFilterBar';
import { MapLegend } from '../components/map/MapLegend';
import { GeographicalSearch } from '../components/map/GeographicalSearch';
import { LoadingState } from '../components/LoadingState';
import { api } from '../services/api';
import type {
  MarineZone,
  SatellitePass,
  AISVessel,
  IoTBuoy,
  OceanographicObservation,
  EcologicalAlert,
  MapActiveLayers,
  MapDateFilter,
  MapSourceFilter,
  MapFeedMode
} from '../types';
import {
  Layers,
  SlidersHorizontal,
  X,
  Compass,
  MapPin,
  Ship,
  AlertCircle,
  ExternalLink,
  Radio,
  Sparkles,
} from 'lucide-react';

export const MarineIntelligenceMap: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);

  // Raw data sets
  const [zones, setZones] = useState<MarineZone[]>([]);
  const [satellites, setSatellites] = useState<SatellitePass[]>([]);
  const [vessels, setVessels] = useState<AISVessel[]>([]);
  const [oceanographic, setOceanographic] = useState<OceanographicObservation[]>([]);
  const [buoys, setBuoys] = useState<IoTBuoy[]>([]);
  const [incidents, setIncidents] = useState<EcologicalAlert[]>([]);

  // AIS Real-world provider state
  const [aisStatus, setAisStatus] = useState<'REAL' | 'NOT CONNECTED' | 'OFFLINE' | 'NO DATA' | 'DEMO'>('NOT CONNECTED');
  const [aisProviderName, setAisProviderName] = useState<string>('AISHub / Authorized Providers');
  const [aisMessage, setAisMessage] = useState<string>('AIS provider not configured. Connect an authorized AIS data provider to receive vessel information.');
  const [demoActive, setDemoActive] = useState<boolean>(false);

  // 5 Layer Toggles
  const [activeLayers, setActiveLayers] = useState<MapActiveLayers>({
    satellites: true,
    vessels: true,
    oceanographic: true,
    buoys: true,
    incidents: true,
  });

  // Filter State
  const [dateFilter, setDateFilter] = useState<MapDateFilter>('ALL');
  const [sourceFilter, setSourceFilter] = useState<MapSourceFilter>('ALL');
  const [feedMode, setFeedMode] = useState<MapFeedMode>('INTELLIGENCE_DB');
  const [basemap, setBasemap] = useState<'OSM' | 'CARTO_DARK'>('OSM');

  // Focus & Navigation State
  const [focusCoords, setFocusCoords] = useState<[number, number] | null>(null);
  const [focusZoom, setFocusZoom] = useState<number>(6);
  const [selectedLocationName, setSelectedLocationName] = useState<string>('');

  // Selected Feature Detail Inspector
  const [selectedFeature, setSelectedFeature] = useState<{ category: string; data: any } | null>(null);

  // Mobile drawer controls
  const [showMobileLayers, setShowMobileLayers] = useState<boolean>(false);

  const handleToggleAISDemo = async () => {
    try {
      const res = await api.toggleAISDemoMode(!demoActive);
      setDemoActive(res.demo_mode_active);
      const updatedStatus = await api.getAISProviderStatus();
      setAisStatus(updatedStatus.connection_status);
      setAisMessage(updatedStatus.message);
      setAisProviderName(updatedStatus.provider_name);

      if (updatedStatus.connection_status === 'DEMO' || updatedStatus.connection_status === 'REAL') {
        const live = await api.getLiveAISVessels({ demo: updatedStatus.connection_status === 'DEMO' });
        const mapped: AISVessel[] = (live.vessels || []).map((vp) => ({
          mmsi: vp.mmsi,
          vessel_name: vp.vessel_name,
          callsign: vp.callsign || 'N/A',
          flag: vp.flag || 'Unknown',
          vessel_type: vp.vessel_type || vp.vessel_category || 'Commercial Vessel',
          speed_knots: vp.sog_knots,
          course_deg: vp.cog_degrees,
          latitude: vp.latitude,
          longitude: vp.longitude,
          last_ping: vp.last_received_timestamp,
          ais_status: vp.navigation_status.toLowerCase().includes('silent') ? 'SILENT_AIS_DISABLED' : 'TRANSMITTING',
          risk_level: 'NORMAL',
          proximity_zone: 'Monitored Waters',
          heading: vp.heading,
          navigation_status: vp.navigation_status,
          data_provider: vp.data_provider,
          data_freshness: vp.data_freshness || 'LIVE',
          is_simulated: vp.is_simulated,
          destination: vp.destination,
        }));
        setVessels(mapped);
      } else {
        setVessels([]);
      }
    } catch (err) {
      console.error('Failed to toggle demo mode on map:', err);
    }
  };

  useEffect(() => {
    let active = true;

    const loadAllGeospatialData = async () => {
      try {
        setLoading(true);
        const [z, s, o, b, i, aisStatusRes] = await Promise.all([
          api.getZones(),
          api.getSatellitePasses(),
          api.getOceanographicObservations(),
          api.getIoTBuoys(),
          api.getAlerts(),
          api.getAISProviderStatus().catch(() => null),
        ]);

        if (!active) return;
        setZones(z);
        setSatellites(s);
        setOceanographic(o);
        setBuoys(b);
        setIncidents(i);

        let vesselList: AISVessel[] = [];
        if (aisStatusRes) {
          setAisStatus(aisStatusRes.connection_status);
          setAisProviderName(aisStatusRes.provider_name);
          setAisMessage(aisStatusRes.message);
          setDemoActive(Boolean(aisStatusRes.demo_mode_active));

          if (aisStatusRes.connection_status === 'REAL' || aisStatusRes.connection_status === 'DEMO') {
            try {
              const live = await api.getLiveAISVessels({ demo: aisStatusRes.connection_status === 'DEMO' });
              vesselList = (live.vessels || []).map((vp) => ({
                mmsi: vp.mmsi,
                vessel_name: vp.vessel_name,
                callsign: vp.callsign || 'N/A',
                flag: vp.flag || 'Unknown',
                vessel_type: vp.vessel_type || vp.vessel_category || 'Commercial Vessel',
                speed_knots: vp.sog_knots,
                course_deg: vp.cog_degrees,
                latitude: vp.latitude,
                longitude: vp.longitude,
                last_ping: vp.last_received_timestamp,
                ais_status: vp.navigation_status.toLowerCase().includes('silent') ? 'SILENT_AIS_DISABLED' : 'TRANSMITTING',
                risk_level: 'NORMAL',
                proximity_zone: 'Monitored Waters',
                heading: vp.heading,
                navigation_status: vp.navigation_status,
                data_provider: vp.data_provider,
                data_freshness: vp.data_freshness || 'LIVE',
                is_simulated: vp.is_simulated,
                destination: vp.destination,
              }));
            } catch (err) {
              console.warn('Failed to fetch live AIS vessels:', err);
              vesselList = [];
            }
          }
        } else {
          setAisStatus('NOT CONNECTED');
          setAisMessage('AIS provider not configured. Connect an authorized AIS data provider to receive vessel information.');
        }

        setVessels(vesselList);

        // Pre-select first marine zone as initial inspector context
        if (z.length > 0) {
          setSelectedFeature({ category: 'BIOME', data: z[0] });
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadAllGeospatialData();

    return () => {
      active = false;
    };
  }, []);

  // Filter Logic:
  // If feedMode === 'LIVE_STREAM', since no external live streaming socket is connected,
  // return empty arrays to display the clear required empty map message.
  const filteredSatellites = feedMode === 'LIVE_STREAM'
    ? []
    : satellites.filter(() => {
        if (sourceFilter !== 'ALL' && sourceFilter !== 'COPERNICUS') return false;
        return true;
      });

  const filteredVessels = feedMode === 'LIVE_STREAM'
    ? []
    : vessels.filter(() => {
        if (sourceFilter !== 'ALL' && sourceFilter !== 'GFW_AIS') return false;
        return true;
      });

  const filteredOceanographic = feedMode === 'LIVE_STREAM'
    ? []
    : oceanographic.filter(() => {
        if (sourceFilter !== 'ALL' && sourceFilter !== 'POSTGIS') return false;
        return true;
      });

  const filteredBuoys = feedMode === 'LIVE_STREAM'
    ? []
    : buoys.filter(() => {
        if (sourceFilter !== 'ALL' && sourceFilter !== 'NOAA_ARGO') return false;
        return true;
      });

  const filteredIncidents = feedMode === 'LIVE_STREAM'
    ? []
    : incidents.filter(() => {
        if (sourceFilter !== 'ALL' && sourceFilter !== 'ORCA_SWARM') return false;
        return true;
      });

  // Layer toggle handler
  const handleToggleLayer = (layerKey: keyof MapActiveLayers) => {
    setActiveLayers((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey],
    }));
  };

  // Bulk layer toggle handler
  const handleSetAllLayers = (enable: boolean) => {
    setActiveLayers({
      satellites: enable,
      vessels: enable,
      oceanographic: enable,
      buoys: enable,
      incidents: enable,
    });
  };

  // Geographical search / preset selection
  const handleSelectLocation = (name: string, coords: [number, number], zoom: number) => {
    setSelectedLocationName(name);
    setFocusCoords(coords);
    setFocusZoom(zoom);
  };

  // Reset filters
  const handleResetFilters = () => {
    setDateFilter('ALL');
    setSourceFilter('ALL');
    setFeedMode('INTELLIGENCE_DB');
    handleSetAllLayers(true);
  };

  // Feature selection handler from popup or list
  const handleSelectFeature = (category: string, feature: any) => {
    setSelectedFeature({ category, data: feature });
    if (feature.latitude !== undefined && feature.longitude !== undefined) {
      setFocusCoords([feature.latitude, feature.longitude]);
      setFocusZoom(8);
    }
  };

  if (loading) {
    return (
      <LoadingState
        message="Initializing ORCA Marine Intelligence GIS Map..."
        subtext="Loading OpenStreetMap basemap tiles and rendering 5 multi-spectral geospatial observation layers"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* =================================================================== */}
      {/* HEADER: TITLE, CARTOGRAPHIC PROJECTION & GEOGRAPHICAL SEARCH       */}
      {/* =================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black tracking-tight text-white">
              Marine Intelligence Map
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-biolum-cyan/15 text-biolum-cyan border border-biolum-cyan/30">
              EPSG:4326 (WGS 84)
            </span>
            <Link
              to="/ais-tracking"
              className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border transition-all ${
                aisStatus === 'REAL' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80 hover:bg-emerald-900/60' :
                aisStatus === 'DEMO' ? 'bg-purple-950/80 text-purple-300 border-purple-700/80 hover:bg-purple-900/60' :
                aisStatus === 'NO DATA' ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/80 hover:bg-cyan-900/60' :
                aisStatus === 'OFFLINE' ? 'bg-rose-950/80 text-rose-300 border-rose-700/80 hover:bg-rose-900/60' :
                'bg-amber-950/80 text-amber-300 border-amber-700/80 hover:bg-amber-900/60'
              }`}
              title="Inspect Real-time AIS Vessel Telemetry and Provider Status"
            >
              <Ship className="w-3 h-3" />
              <span>AIS: {aisStatus}</span>
            </Link>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Initial Basemap: OpenStreetMap • Real-time Multimodal Satellite, AIS, CTD & Buoy Overlays
          </p>
        </div>

        {/* Geographical Search with coordinate input & preset biomes */}
        <div className="flex items-center space-x-2 w-full lg:w-auto">
          <GeographicalSearch onSelectLocation={handleSelectLocation} />

          {/* Mobile drawer toggle */}
          <button
            type="button"
            onClick={() => setShowMobileLayers(!showMobileLayers)}
            className="lg:hidden p-2 rounded-xl bg-surface-card border border-surface-border text-slate-300 hover:text-white"
            title="Toggle Layer Controls"
          >
            <SlidersHorizontal className="w-4 h-4 text-biolum-cyan" />
          </button>
        </div>
      </div>

      {/* AIS Provider Notice when Not Connected */}
      {activeLayers.vessels && aisStatus === 'NOT CONNECTED' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-950/30 border border-amber-900/60 text-xs">
          <div className="flex items-start sm:items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-bold text-amber-300 font-mono text-[11px] uppercase mr-2">
                [AIS Status: NOT CONNECTED]
              </span>
              <span className="text-slate-300">
                {aisMessage}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleAISDemo}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-800/80 text-purple-300 hover:text-white hover:bg-purple-900/80 font-mono text-[11px] font-bold transition-all shadow-md"
            >
              <Sparkles className="w-3 h-3" />
              <span>Activate Demo Mode</span>
            </button>
            <Link
              to="/ais-tracking"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-ocean-700/40 border border-surface-border text-slate-200 hover:text-white font-mono text-[11px] transition-all"
            >
              <span>Configure Provider</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* AIS Demo Mode Active Notice Banner */}
      {activeLayers.vessels && aisStatus === 'DEMO' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-purple-950/30 border border-purple-900/60 text-xs">
          <div className="flex items-center space-x-2.5">
            <Radio className="w-4 h-4 text-purple-400 shrink-0 animate-pulse" />
            <div>
              <span className="font-bold text-purple-300 font-mono text-[11px] uppercase mr-2">
                [AIS Status: DEMO MODE]
              </span>
              <span className="text-slate-300">
                Displaying clearly labelled simulated vessel profiles. No physical receiver hardware required.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleAISDemo}
            className="self-start sm:self-center px-3 py-1 rounded-xl bg-navy-900 border border-surface-border text-slate-300 hover:text-white font-mono text-[11px] transition-all"
          >
            Deactivate Demo
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* FILTER BAR: DATE/TIME, SOURCE, STREAM MODE & BASEMAP               */}
      {/* =================================================================== */}
      <MapFilterBar
        dateFilter={dateFilter}
        sourceFilter={sourceFilter}
        feedMode={feedMode}
        basemap={basemap}
        onChangeDateFilter={setDateFilter}
        onChangeSourceFilter={setSourceFilter}
        onChangeFeedMode={setFeedMode}
        onChangeBasemap={setBasemap}
        onResetFilters={handleResetFilters}
      />

      {/* =================================================================== */}
      {/* MAIN GIS WORKSPACE: MAP CANVAS + LAYER CONTROLS + INSPECTOR        */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Central Map Canvas (8 cols on lg) */}
        <div className="lg:col-span-8 relative">
          <MarineIntelligenceMapCore
            satellites={filteredSatellites}
            vessels={filteredVessels}
            oceanographic={filteredOceanographic}
            buoys={filteredBuoys}
            incidents={filteredIncidents}
            zones={zones}
            activeLayers={activeLayers}
            feedMode={feedMode}
            basemap={basemap}
            focusCoords={focusCoords}
            focusZoom={focusZoom}
            aisStatus={aisStatus}
            aisProviderName={aisProviderName}
            onSelectFeature={handleSelectFeature}
            onResetFilters={handleResetFilters}
          />

          {/* Floating Collapsible Cartographic Legend on bottom-left */}
          <div className="absolute bottom-3 left-3 z-[1000]">
            <MapLegend />
          </div>

          {/* Centered Location Banner if jumping via search */}
          {selectedLocationName && (
            <div className="absolute top-3 left-3 z-[1000] bg-navy-950/90 backdrop-blur-md border border-surface-border text-slate-200 px-3 py-1.5 rounded-xl shadow-xl flex items-center space-x-2 text-xs font-mono">
              <Compass className="w-3.5 h-3.5 text-biolum-cyan animate-spin" />
              <span>
                Target: <strong className="text-white">{selectedLocationName}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedLocationName('')}
                className="text-slate-500 hover:text-white ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Controls & Inspector (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Layer Controls Panel (Desktop & Tablet) */}
          <div className="hidden lg:block">
            <MapLayerControls
              activeLayers={activeLayers}
              counts={{
                satellites: filteredSatellites.length,
                vessels: filteredVessels.length,
                oceanographic: filteredOceanographic.length,
                buoys: filteredBuoys.length,
                incidents: filteredIncidents.length,
              }}
              aisStatus={aisStatus}
              onToggleLayer={handleToggleLayer}
              onSetAllLayers={handleSetAllLayers}
            />
          </div>

          {/* Spatial Feature Detail Inspector */}
          <div className="p-4 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-biolum-cyan animate-pulse"></span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-ocean-400 font-bold">
                  Spatial Feature Inspector
                </span>
              </div>
              {selectedFeature && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-900 border border-surface-border text-slate-300">
                  {selectedFeature.category}
                </span>
              )}
            </div>

            {selectedFeature ? (
              <div className="space-y-3 text-xs">
                {/* Header Information */}
                <div>
                  <h3 className="font-bold text-white text-base leading-snug">
                    {selectedFeature.data.name ||
                      selectedFeature.data.vessel_name ||
                      selectedFeature.data.station_name ||
                      selectedFeature.data.satellite ||
                      selectedFeature.data.title ||
                      'Marine Feature'}
                  </h3>
                  <span className="text-[11px] text-biolum-teal block mt-0.5 font-mono">
                    {selectedFeature.data.code ||
                      selectedFeature.data.mmsi ||
                      selectedFeature.data.station_id ||
                      selectedFeature.data.id ||
                      selectedFeature.data.designation}
                  </span>
                </div>

                {/* Description / Summary */}
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {selectedFeature.data.description ||
                    selectedFeature.data.coverage_area ||
                    `Monitored feature recorded in ${selectedFeature.data.proximity_zone || 'sanctuary boundary'}.`}
                </p>

                {/* Metric breakdown */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-navy-950/80 border border-surface-border">
                  {selectedFeature.data.latitude !== undefined && (
                    <div>
                      <span className="block text-[9px] font-mono text-slate-400 uppercase">Latitude</span>
                      <span className="font-mono text-biolum-cyan font-bold text-[11px]">
                        {selectedFeature.data.latitude.toFixed(4)}°
                      </span>
                    </div>
                  )}
                  {selectedFeature.data.longitude !== undefined && (
                    <div>
                      <span className="block text-[9px] font-mono text-slate-400 uppercase">Longitude</span>
                      <span className="font-mono text-biolum-cyan font-bold text-[11px]">
                        {selectedFeature.data.longitude.toFixed(4)}°
                      </span>
                    </div>
                  )}
                  {selectedFeature.data.speed_knots !== undefined && (
                    <div>
                      <span className="block text-[9px] font-mono text-slate-400 uppercase">Speed</span>
                      <span className="font-mono text-white font-bold text-[11px]">
                        {selectedFeature.data.speed_knots} kts
                      </span>
                    </div>
                  )}
                  {selectedFeature.data.water_temperature_c !== undefined && (
                    <div>
                      <span className="block text-[9px] font-mono text-slate-400 uppercase">Water Temp</span>
                      <span className="font-mono text-emerald-400 font-bold text-[11px]">
                        {selectedFeature.data.water_temperature_c}°C
                      </span>
                    </div>
                  )}
                  {selectedFeature.data.wave_height_meters !== undefined && (
                    <div>
                      <span className="block text-[9px] font-mono text-slate-400 uppercase">Wave Height</span>
                      <span className="font-mono text-cyan-300 font-bold text-[11px]">
                        {selectedFeature.data.wave_height_meters}m
                      </span>
                    </div>
                  )}
                  {selectedFeature.data.health_score !== undefined && (
                    <div>
                      <span className="block text-[9px] font-mono text-slate-400 uppercase">Health Score</span>
                      <span className="font-mono text-emerald-400 font-bold text-[11px]">
                        {selectedFeature.data.health_score} / 100
                      </span>
                    </div>
                  )}
                  {selectedFeature.data.risk_level && (
                    <div>
                      <span className="block text-[9px] font-mono text-slate-400 uppercase">Risk Level</span>
                      <span className="font-mono text-amber-400 font-bold text-[11px]">
                        {selectedFeature.data.risk_level}
                      </span>
                    </div>
                  )}
                  {selectedFeature.data.severity && (
                    <div>
                      <span className="block text-[9px] font-mono text-slate-400 uppercase">Severity</span>
                      <span className="font-mono text-rose-400 font-bold text-[11px]">
                        {selectedFeature.data.severity}
                      </span>
                    </div>
                  )}
                </div>

                {/* Mitigation / Recommended Action */}
                {selectedFeature.data.recommended_mitigation && (
                  <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-900/50 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block">
                      Recommended Mitigation
                    </span>
                    <p className="text-[11px] text-amber-200/90 leading-snug">
                      {selectedFeature.data.recommended_mitigation}
                    </p>
                  </div>
                )}

                {/* AIS Vessel Specific Sentinel Deep-Dive */}
                {selectedFeature.category === 'VESSEL' && (
                  <div className="p-2.5 rounded-xl bg-navy-900/90 border border-surface-border space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400">PROVIDER:</span>
                      <span className="text-biolum-cyan font-semibold truncate max-w-[170px]">
                        {selectedFeature.data.data_provider || 'AIS Transponder Stream'}
                      </span>
                    </div>
                    {selectedFeature.data.navigation_status && (
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-400">NAV STATUS:</span>
                        <span className="text-slate-200">{selectedFeature.data.navigation_status}</span>
                      </div>
                    )}
                    {selectedFeature.data.heading !== undefined && selectedFeature.data.heading !== null && (
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-400">HEADING:</span>
                        <span className="text-slate-200">{selectedFeature.data.heading}°</span>
                      </div>
                    )}
                    {selectedFeature.data.is_simulated && (
                      <div className="px-2 py-1 rounded bg-purple-950/60 border border-purple-800/60 text-[10px] text-purple-300">
                        * Demonstration object generated for testing without physical AIS receiver.
                      </div>
                    )}
                    <Link
                      to={`/ais-tracking?mmsi=${selectedFeature.data.mmsi}`}
                      className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg bg-biolum-cyan/15 hover:bg-biolum-cyan/25 text-biolum-cyan border border-biolum-cyan/30 text-[11px] font-mono font-bold transition-all"
                    >
                      <Ship className="w-3.5 h-3.5" />
                      <span>Inspect in AIS Sentinel</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </Link>
                  </div>
                )}

                {/* Centering Action */}
                {selectedFeature.data.latitude !== undefined && selectedFeature.data.longitude !== undefined && (
                  <button
                    type="button"
                    onClick={() => {
                      setFocusCoords([selectedFeature.data.latitude, selectedFeature.data.longitude]);
                      setFocusZoom(8);
                    }}
                    className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-surface-elevated hover:bg-ocean-600/30 text-slate-200 hover:text-white border border-surface-border text-xs font-semibold transition-all"
                  >
                    <MapPin className="w-3.5 h-3.5 text-biolum-cyan" />
                    <span>Center Map on Coordinates</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                <Compass className="w-6 h-6 text-slate-600 mx-auto" />
                <p>Click any marker or polygon on the map to inspect its spatial and oceanographic telemetry.</p>
              </div>
            )}

            {/* Quick Biome Select Dropdown */}
            <div className="pt-2 border-t border-surface-border">
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                Quick Jump to Marine Biome:
              </label>
              <select
                value={selectedFeature?.data?.id || ''}
                onChange={(e) => {
                  const z = zones.find((item) => item.id === e.target.value);
                  if (z) handleSelectFeature('BIOME', z);
                }}
                className="w-full bg-navy-900 border border-surface-border text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-biolum-cyan cursor-pointer"
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} ({z.risk_level})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* MOBILE DRAWER MODAL FOR LAYER CONTROLS                              */}
      {/* =================================================================== */}
      {showMobileLayers && (
        <div className="lg:hidden fixed inset-0 z-[2000] bg-navy-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-navy-900 border border-surface-border rounded-2xl p-4 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-border pb-2">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-biolum-cyan" />
                <h3 className="font-bold text-white text-sm">Observation Layer Controls</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileLayers(false)}
                className="p-1 rounded-lg hover:bg-surface-elevated text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <MapLayerControls
              activeLayers={activeLayers}
              counts={{
                satellites: filteredSatellites.length,
                vessels: filteredVessels.length,
                oceanographic: filteredOceanographic.length,
                buoys: filteredBuoys.length,
                incidents: filteredIncidents.length,
              }}
              aisStatus={aisStatus}
              onToggleLayer={handleToggleLayer}
              onSetAllLayers={handleSetAllLayers}
            />

            <button
              type="button"
              onClick={() => setShowMobileLayers(false)}
              className="w-full py-2.5 rounded-xl bg-biolum-cyan text-navy-950 font-bold text-xs hover:bg-biolum-teal transition-colors"
            >
              Apply Layer Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
