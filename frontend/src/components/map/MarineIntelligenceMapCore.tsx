import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import type {
  SatellitePass,
  AISVessel,
  IoTBuoy,
  OceanographicObservation,
  EcologicalAlert,
  MarineZone,
  MapActiveLayers,
  MapFeedMode
} from '../../types';
import { ObservationPopup } from './ObservationPopup';
import { CoordinateTracker } from './CoordinateTracker';
import { MapFlyTo } from './MapFlyTo';
import { AlertCircle, WifiOff, Layers, RotateCcw } from 'lucide-react';

interface MarineIntelligenceMapCoreProps {
  satellites: SatellitePass[];
  vessels: AISVessel[];
  oceanographic: OceanographicObservation[];
  buoys: IoTBuoy[];
  incidents: EcologicalAlert[];
  zones?: MarineZone[];
  activeLayers: MapActiveLayers;
  feedMode: MapFeedMode;
  basemap: 'OSM' | 'CARTO_DARK';
  focusCoords: [number, number] | null;
  focusZoom?: number;
  aisStatus?: 'REAL' | 'NOT CONNECTED' | 'OFFLINE' | 'NO DATA' | 'DEMO';
  aisProviderName?: string;
  onSelectFeature?: (category: string, feature: any) => void;
  onResetFilters?: () => void;
}

export const MarineIntelligenceMapCore: React.FC<MarineIntelligenceMapCoreProps> = ({
  satellites,
  vessels,
  oceanographic,
  buoys,
  incidents,
  zones = [],
  activeLayers,
  feedMode,
  basemap,
  focusCoords,
  focusZoom = 6,
  aisStatus,
  aisProviderName,
  onSelectFeature,
  onResetFilters,
}) => {
  // Basemap URLs
  // OpenStreetMap is the initial default basemap as strictly requested
  const tileUrl = basemap === 'OSM'
    ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  const tileAttribution = basemap === 'OSM'
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    : '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors';

  // Total visible observation count across all active layers
  const visibleCount =
    (activeLayers.satellites ? satellites.length : 0) +
    (activeLayers.vessels ? vessels.length : 0) +
    (activeLayers.oceanographic ? oceanographic.length : 0) +
    (activeLayers.buoys ? buoys.length : 0) +
    (activeLayers.incidents ? incidents.length : 0);

  const allLayersOff =
    !activeLayers.satellites &&
    !activeLayers.vessels &&
    !activeLayers.oceanographic &&
    !activeLayers.buoys &&
    !activeLayers.incidents;

  // Custom SVG Markers
  const createSatelliteIcon = (sensorType: string, anomaly: boolean) => {
    const isRadar = sensorType.includes('SAR');
    const color = isRadar ? '#00e5ff' : anomaly ? '#f59e0b' : '#10b981';

    return L.divIcon({
      className: 'orca-satellite-marker',
      html: `
        <div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center;">
          <div style="position:absolute; width:32px; height:32px; border-radius:50%; background-color:${color}18; border:2px dashed ${color}; box-shadow:0 0 12px ${color}88;"></div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13 7 9 3 5 7l4 4"></path>
            <path d="m17 11 4 4-4 4-4-4"></path>
            <path d="m8 12 4 4 6-6-4-4Z"></path>
            <path d="m16 8 3-3"></path>
            <path d="M9 21a6 6 0 0 0-6-6"></path>
          </svg>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -18],
    });
  };

  const createVesselIcon = (riskLevel: string, headingDeg: number) => {
    const isHighRisk = riskLevel === 'HIGH_RISK_IUU';
    const isElevated = riskLevel === 'ELEVATED';
    const color = isHighRisk ? '#f43f5e' : isElevated ? '#f59e0b' : '#38bdf8';

    return L.divIcon({
      className: 'orca-vessel-marker',
      html: `
        <div style="position:relative; width:32px; height:32px; display:flex; align-items:center; justify-content:center; transform: rotate(${headingDeg}deg);">
          <div style="position:absolute; width:28px; height:28px; border-radius:50%; background-color:${color}22; border:1.5px solid ${color}; ${isHighRisk ? `box-shadow:0 0 14px ${color};` : ''}"></div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${color}" stroke="${color}" stroke-width="1.5">
            <polygon points="12,2 20,20 12,16 4,20" />
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  };

  const createOceanographicIcon = () => {
    const color = '#2dd4bf'; // Teal
    return L.divIcon({
      className: 'orca-ocean-station-marker',
      html: `
        <div style="position:relative; width:30px; height:30px; display:flex; align-items:center; justify-content:center;">
          <div style="position:absolute; width:26px; height:26px; border-radius:50%; background-color:${color}22; border:1.8px solid ${color}; box-shadow:0 0 10px ${color}88;"></div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path>
            <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path>
            <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path>
          </svg>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15],
    });
  };

  const createBuoyIcon = (status: string) => {
    const isOnline = status === 'ONLINE';
    const color = isOnline ? '#a855f7' : '#94a3b8';

    return L.divIcon({
      className: 'orca-buoy-marker',
      html: `
        <div style="position:relative; width:30px; height:30px; display:flex; align-items:center; justify-content:center;">
          <div style="position:absolute; width:26px; height:26px; border-radius:50%; background-color:${color}22; border:1.5px solid ${color};"></div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"></path>
            <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"></path>
            <circle cx="12" cy="12" r="2"></circle>
            <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"></path>
            <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"></path>
          </svg>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15],
    });
  };

  const createIncidentIcon = (severity: string) => {
    const isCritical = severity === 'CRITICAL';
    const isHigh = severity === 'HIGH';
    const color = isCritical ? '#f43f5e' : isHigh ? '#f59e0b' : '#38bdf8';

    return L.divIcon({
      className: 'orca-incident-marker',
      html: `
        <div style="position:relative; width:36px; height:36px; display:flex; align-items:center; justify-content:center;">
          <div style="position:absolute; width:34px; height:34px; border-radius:50%; background-color:${color}25; border:2px solid ${color}; ${isCritical ? `animation: pulse 1.5s infinite; box-shadow:0 0 16px ${color};` : ''}"></div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${color}" stroke="#0b132b" stroke-width="1.5">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
            <line x1="12" y1="9" x2="12" y2="13" stroke="#fff" stroke-width="2"></line>
            <line x1="12" y1="17" x2="12.01" y2="17" stroke="#fff" stroke-width="2"></line>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18],
    });
  };

  // Helper to resolve zone coordinate for incidents
  const getZoneCoords = (zoneId: string): [number, number] => {
    const found = zones.find((z) => z.id === zoneId);
    if (found) return [found.latitude, found.longitude];
    // Fallback known zone coordinates
    if (zoneId.includes('GBR') || zoneId.includes('01')) return [-15.42, 145.85];
    if (zoneId.includes('GAL') || zoneId.includes('02')) return [1.68, -91.82];
    if (zoneId.includes('RAJA') || zoneId.includes('03')) return [-2.15, 130.25];
    if (zoneId.includes('SAR') || zoneId.includes('04')) return [28.3, -64.5];
    if (zoneId.includes('BAL') || zoneId.includes('05')) return [57.3, 19.2];
    return [0, 0];
  };

  return (
    <div className="relative w-full h-[580px] lg:h-[660px] rounded-2xl overflow-hidden border border-surface-border shadow-2xl bg-navy-950">
      <MapContainer
        center={[15.0, 10.0]}
        zoom={3}
        minZoom={2}
        maxZoom={12}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        {/* Tile Layer: OpenStreetMap is the initial default basemap */}
        <TileLayer
          attribution={tileAttribution}
          url={tileUrl}
        />

        {/* Map Programmatic Center / Fly-to Controller */}
        <MapFlyTo coords={focusCoords} zoom={focusZoom} />

        {/* Real-time Cursor & Center Coordinate Tracker */}
        <CoordinateTracker />

        {/* Monitored Marine Protected Zones / Biomes */}
        {zones.map((zone) => {
          const color =
            zone.risk_level === 'CRITICAL' ? '#f43f5e' :
            zone.risk_level === 'HIGH' ? '#f59e0b' :
            zone.risk_level === 'MODERATE' ? '#38bdf8' : '#10b981';

          return (
            <React.Fragment key={zone.id}>
              {zone.boundary_coordinates && zone.boundary_coordinates.length > 0 && (
                <Polygon
                  positions={zone.boundary_coordinates}
                  pathOptions={{
                    color,
                    weight: 1.5,
                    fillColor: color,
                    fillOpacity: 0.12,
                    dashArray: '3, 4',
                  }}
                  eventHandlers={{
                    click: () => onSelectFeature && onSelectFeature('BIOME', zone),
                  }}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* =================================================================== */}
        {/* LAYER 1: SATELLITE OBSERVATIONS (FOOTPRINT POLYGONS + MARKERS)       */}
        {/* =================================================================== */}
        {activeLayers.satellites &&
          satellites.map((sat) => {
            const lat = sat.latitude ?? 0;
            const lng = sat.longitude ?? 0;
            const hasCoords = sat.latitude !== undefined && sat.longitude !== undefined;

            return (
              <React.Fragment key={sat.id}>
                {/* Satellite Swath Footprint Polygon */}
                {sat.footprint_polygon && sat.footprint_polygon.length > 0 && (
                  <Polygon
                    positions={sat.footprint_polygon}
                    pathOptions={{
                      color: sat.sensor_type.includes('SAR') ? '#00e5ff' : '#10b981',
                      weight: 1.5,
                      fillColor: sat.sensor_type.includes('SAR') ? '#00e5ff' : '#10b981',
                      fillOpacity: 0.14,
                      dashArray: '4, 4',
                    }}
                  />
                )}

                {/* Satellite Sensor Nadir / Center Marker */}
                {hasCoords && (
                  <Marker
                    position={[lat, lng]}
                    icon={createSatelliteIcon(sat.sensor_type, sat.anomaly_detected)}
                  >
                    <Popup>
                      <ObservationPopup
                        category="SATELLITE"
                        title={sat.satellite}
                        subtitle={`${sat.sensor_type} • ${sat.coverage_area}`}
                        badgeText={sat.status}
                        badgeColor={sat.status === 'COMPLETED' ? 'emerald' : 'cyan'}
                        coordinates={[lat, lng]}
                        fields={[
                          { label: 'Sensor Type', value: sat.sensor_type },
                          { label: 'Swath Width', value: sat.swath_width_km, unit: 'km' },
                          { label: 'Ground Res', value: sat.resolution_meters, unit: 'm' },
                          { label: 'Cloud Cover', value: `${sat.cloud_cover_pct}%` },
                          {
                            label: 'Anomaly',
                            value: sat.anomaly_detected ? sat.anomaly_type || 'Detected' : 'None Detected',
                            highlight: sat.anomaly_detected ? 'amber' : 'emerald',
                          },
                        ]}
                        source="ESA Copernicus / NASA EarthData"
                        timestamp={sat.pass_timestamp}
                        onInspect={() => onSelectFeature && onSelectFeature('SATELLITE', sat)}
                      />
                    </Popup>
                  </Marker>
                )}
              </React.Fragment>
            );
          })}

        {/* =================================================================== */}
        {/* LAYER 2: AIS VESSELS (DYNAMIC HEADING VECTOR + RISK MARKERS)       */}
        {/* =================================================================== */}
        {activeLayers.vessels &&
          vessels.map((vessel) => (
            <Marker
              key={vessel.mmsi}
              position={[vessel.latitude, vessel.longitude]}
              icon={createVesselIcon(vessel.risk_level, vessel.course_deg)}
            >
              <Popup>
                <ObservationPopup
                  category="VESSEL"
                  title={vessel.vessel_name}
                  subtitle={`MMSI: ${vessel.mmsi} • Callsign: ${vessel.callsign || 'N/A'} • Flag: ${vessel.flag || 'Unknown'}`}
                  badgeText={vessel.is_simulated ? 'DEMO (SIMULATED)' : (vessel.data_freshness ? `${vessel.data_freshness} AIS` : vessel.risk_level.replace(/_/g, ' '))}
                  badgeColor={vessel.is_simulated ? 'purple' : vessel.risk_level === 'HIGH_RISK_IUU' ? 'rose' : vessel.risk_level === 'ELEVATED' ? 'amber' : 'emerald'}
                  coordinates={[vessel.latitude, vessel.longitude]}
                  fields={[
                    { label: 'Vessel Type', value: vessel.vessel_type },
                    { label: 'Speed (SOG)', value: vessel.speed_knots, unit: 'knots', highlight: 'cyan' },
                    { label: 'Course (COG)', value: `${vessel.course_deg}°` },
                    { label: 'Heading', value: vessel.heading !== null && vessel.heading !== undefined ? `${vessel.heading}°` : 'N/A' },
                    {
                      label: 'Nav Status',
                      value: vessel.navigation_status || vessel.ais_status.replace(/_/g, ' '),
                      highlight: vessel.ais_status === 'SILENT_AIS_DISABLED' ? 'rose' : 'slate',
                    },
                    { label: 'Destination', value: vessel.destination || 'Unreported' },
                  ]}
                  source={vessel.data_provider || 'AIS Transponder Stream'}
                  timestamp={vessel.last_ping}
                  onInspect={() => onSelectFeature && onSelectFeature('VESSEL', vessel)}
                />
              </Popup>
            </Marker>
          ))}

        {/* =================================================================== */}
        {/* LAYER 3: OCEANOGRAPHIC IN-SITU STATIONS (CTD CASTS)                 */}
        {/* =================================================================== */}
        {activeLayers.oceanographic &&
          oceanographic.map((obs) => (
            <Marker
              key={obs.id}
              position={[obs.latitude, obs.longitude]}
              icon={createOceanographicIcon()}
            >
              <Popup>
                <ObservationPopup
                  category="OCEANOGRAPHIC"
                  title={obs.station_name}
                  subtitle={`Station ID: ${obs.station_id} • Depth: ${obs.depth_meters}m`}
                  badgeText="IN-SITU CTD"
                  badgeColor="emerald"
                  coordinates={[obs.latitude, obs.longitude]}
                  fields={[
                    { label: 'Water Temp', value: `${obs.water_temperature_c}°C`, highlight: 'cyan' },
                    { label: 'Dissolved O₂', value: obs.dissolved_oxygen_mg_l, unit: 'mg/L', highlight: obs.dissolved_oxygen_mg_l < 2.0 ? 'rose' : 'slate' },
                    { label: 'pH Level', value: obs.ph_level, highlight: obs.ph_level < 7.8 ? 'amber' : 'slate' },
                    { label: 'Salinity', value: obs.salinity_psu, unit: 'PSU' },
                    { label: 'Chlorophyll-a', value: obs.chlorophyll_mg_m3, unit: 'mg/m³' },
                    { label: 'Turbidity', value: obs.turbidity_ntu, unit: 'NTU' },
                  ]}
                  source={obs.source}
                  timestamp={obs.recorded_at}
                  onInspect={() => onSelectFeature && onSelectFeature('OCEANOGRAPHIC', obs)}
                />
              </Popup>
            </Marker>
          ))}

        {/* =================================================================== */}
        {/* LAYER 4: IOT BUOY LOCATIONS (NOAA NDBC / ARGO / WAVE GLIDERS)       */}
        {/* =================================================================== */}
        {activeLayers.buoys &&
          buoys.map((buoy) => (
            <React.Fragment key={buoy.buoy_id}>
              <Marker
                position={[buoy.latitude, buoy.longitude]}
                icon={createBuoyIcon(buoy.status)}
              >
                <Popup>
                  <ObservationPopup
                    category="BUOY"
                    title={buoy.station_name}
                    subtitle={`ID: ${buoy.buoy_id} • Program: ${buoy.deployment_program}`}
                    badgeText={buoy.status}
                    badgeColor={buoy.status === 'ONLINE' ? 'emerald' : 'amber'}
                    coordinates={[buoy.latitude, buoy.longitude]}
                    fields={[
                      { label: 'Wave Height', value: buoy.wave_height_meters, unit: 'm', highlight: 'cyan' },
                      { label: 'Wave Period', value: buoy.wave_period_sec, unit: 's' },
                      { label: 'Sea Temp', value: `${buoy.sea_surface_temp_c}°C` },
                      { label: 'Wind Speed', value: buoy.wind_speed_knots, unit: 'knots' },
                      { label: 'Battery / Solar', value: `${buoy.battery_pct}% (${buoy.solar_yield_watts}W)` },
                    ]}
                    source={buoy.deployment_program}
                    timestamp={buoy.last_transmission}
                    onInspect={() => onSelectFeature && onSelectFeature('BUOY', buoy)}
                  />
                </Popup>
              </Marker>
              <CircleMarker
                center={[buoy.latitude, buoy.longitude]}
                radius={12}
                pathOptions={{
                  color: '#a855f7',
                  weight: 1,
                  fillColor: '#a855f7',
                  fillOpacity: 0.08,
                }}
              />
            </React.Fragment>
          ))}

        {/* =================================================================== */}
        {/* LAYER 5: ENVIRONMENTAL INCIDENTS (ANOMALIES & ECOLOGICAL ALERTS)   */}
        {/* =================================================================== */}
        {activeLayers.incidents &&
          incidents.map((incident) => {
            const coords = getZoneCoords(incident.zone_id);

            return (
              <Marker
                key={incident.id}
                position={coords}
                icon={createIncidentIcon(incident.severity)}
              >
                <Popup>
                  <ObservationPopup
                    category="INCIDENT"
                    title={incident.title}
                    subtitle={`Zone: ${incident.zone_name} • Alert Code: ${incident.alert_type}`}
                    badgeText={`${incident.severity} SEVERITY`}
                    badgeColor={incident.severity === 'CRITICAL' ? 'rose' : incident.severity === 'HIGH' ? 'amber' : 'cyan'}
                    coordinates={coords}
                    fields={[
                      { label: 'Status', value: incident.status, highlight: 'rose' },
                      { label: 'Agent Trigger', value: incident.triggered_by_agent || 'Autonomous Swarm' },
                      { label: 'Mitigation', value: incident.recommended_mitigation },
                    ]}
                    source="ORCA Swarm Multi-Agent Reasoning Engine"
                    timestamp={incident.created_at}
                    onInspect={() => onSelectFeature && onSelectFeature('INCIDENT', incident)}
                  />
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>

      {/* AIS Provider Floating Telemetry Status Chip */}
      {activeLayers.vessels && aisStatus && (
        <div className="absolute top-3 right-3 z-[1000] pointer-events-auto">
          <div className={`px-2.5 py-1 rounded-xl backdrop-blur-md border text-[11px] font-mono shadow-xl flex items-center space-x-1.5 ${
            aisStatus === 'REAL' ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40' :
            aisStatus === 'DEMO' ? 'bg-purple-950/90 text-purple-300 border-purple-500/40' :
            aisStatus === 'NO DATA' ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/40' :
            aisStatus === 'OFFLINE' ? 'bg-rose-950/90 text-rose-300 border-rose-500/40' :
            'bg-amber-950/90 text-amber-300 border-amber-500/40'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              aisStatus === 'REAL' ? 'bg-emerald-400 animate-ping' :
              aisStatus === 'DEMO' ? 'bg-purple-400 animate-pulse' :
              aisStatus === 'NO DATA' ? 'bg-cyan-400' :
              aisStatus === 'OFFLINE' ? 'bg-rose-400' :
              'bg-amber-400 animate-pulse'
            }`} />
            <span>
              AIS: <strong className="text-white">{aisStatus}</strong>
              {aisProviderName && aisProviderName !== 'None' ? ` • ${aisProviderName}` : ''}
            </span>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* CLEAR EMPTY STATE OVERLAY (WHEN NO REAL DATA CONNECTED / FILTERED) */}
      {/* =================================================================== */}
      {(feedMode === 'LIVE_STREAM' || visibleCount === 0 || allLayersOff) && (
        <div className="absolute inset-0 z-[1100] flex items-center justify-center p-4 bg-navy-950/75 backdrop-blur-sm pointer-events-none select-none">
          <div className="max-w-md w-full p-6 rounded-2xl bg-surface-card/95 border border-surface-border shadow-2xl text-center space-y-4 pointer-events-auto">
            {feedMode === 'LIVE_STREAM' ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-amber-950/60 border border-amber-600/40 text-amber-400 mx-auto flex items-center justify-center shadow-lg">
                  <WifiOff className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">
                    No Live External Feed Connected
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    ORCA does not display randomly generated or fabricated coordinates as live sensor telemetry.
                    Live external WebSockets for satellite downlinks and AIS transponders are currently disconnected.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-navy-900/80 border border-surface-border text-left space-y-1 text-[11px] font-mono text-slate-400">
                  <div className="flex items-center space-x-2 text-ocean-300 font-semibold">
                    <span>Integration Readiness:</span>
                  </div>
                  <div>• WebSocket streaming gateway: <span className="text-slate-500">Standby</span></div>
                  <div>• ESA Copernicus API token: <span className="text-slate-500">Pending user key</span></div>
                  <div>• AIS provider adapter: <span className="text-slate-300">{aisStatus || 'NOT CONNECTED'} ({aisProviderName || 'AISHub/MarineTraffic'})</span></div>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl bg-biolum-cyan text-navy-950 font-semibold text-xs hover:bg-biolum-teal transition-all shadow-lg"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Switch to Verified Intelligence Database</span>
                  </button>
                </div>
              </>
            ) : allLayersOff ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-ocean-950/60 border border-ocean-600/40 text-biolum-cyan mx-auto flex items-center justify-center shadow-lg">
                  <Layers className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">
                    All GIS Layers Disabled
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    Toggle one or more observation layers (Satellite, AIS Vessels, Oceanographic, IoT Buoys, or Incidents) in the Layer Controls panel to view marine geospatial data.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl bg-ocean-600/30 text-ocean-200 border border-ocean-500/40 font-semibold text-xs hover:bg-ocean-600/50 hover:text-white transition-all shadow-lg"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Enable All Observation Layers</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-ocean-950/60 border border-ocean-600/40 text-ocean-400 mx-auto flex items-center justify-center shadow-lg">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">
                    No Matching Observations
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    No observations match the selected date or data source filters. Adjust your filters or reset to view all available verified records.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl bg-biolum-cyan text-navy-950 font-semibold text-xs hover:bg-biolum-teal transition-all shadow-lg"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset All Filters</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
