import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import type { MarineZone, MarineAgent } from '../types';
import { Battery, Waves } from 'lucide-react';
import { AgentStatusBadge } from './AgentStatusBadge';

interface MarineMapProps {
  zones: MarineZone[];
  agents: MarineAgent[];
  selectedZoneId?: string | null;
  onSelectZone?: (zone: MarineZone) => void;
}

export const MarineMap: React.FC<MarineMapProps> = ({
  zones,
  agents,
  selectedZoneId,
  onSelectZone
}) => {
  const getRiskColor = (risk: string) => {
    switch (risk.toUpperCase()) {
      case 'CRITICAL':
        return '#f43f5e'; // Rose
      case 'HIGH':
        return '#f59e0b'; // Amber
      case 'MODERATE':
        return '#38bdf8'; // Ocean blue
      case 'LOW':
      default:
        return '#10b981'; // Emerald
    }
  };

  const createAgentIcon = (status: string) => {
    const isWarning = status === 'WARNING';
    const isInvestigating = status === 'INVESTIGATING';
    const color = isWarning ? '#f59e0b' : isInvestigating ? '#00e5ff' : '#10b981';

    return L.divIcon({
      className: 'custom-marine-agent-icon',
      html: `
        <div style="
          position: relative;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            position: absolute;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: ${color}22;
            border: 2px solid ${color};
            box-shadow: 0 0 14px ${color}aa;
          "></div>
          <div style="
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: ${color};
          "></div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -18]
    });
  };

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-ocean-900/80 shadow-2xl">
      <MapContainer
        center={[15.0, 10.0]}
        zoom={2}
        minZoom={2}
        maxZoom={10}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        {/* Dark oceanic map tile basemap */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Monitored Marine Biome Polygons */}
        {zones.map((zone) => {
          const color = getRiskColor(zone.risk_level);
          const isSelected = selectedZoneId === zone.id;

          return (
            <React.Fragment key={zone.id}>
              {zone.boundary_coordinates && zone.boundary_coordinates.length > 0 && (
                <Polygon
                  positions={zone.boundary_coordinates}
                  pathOptions={{
                    color: color,
                    weight: isSelected ? 3 : 1.5,
                    fillColor: color,
                    fillOpacity: isSelected ? 0.35 : 0.18,
                    dashArray: zone.risk_level === 'CRITICAL' ? '4, 4' : undefined
                  }}
                  eventHandlers={{
                    click: () => onSelectZone && onSelectZone(zone)
                  }}
                >
                  <Popup>
                    <div className="p-1 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2 border-b border-ocean-900 pb-1.5">
                        <span className="font-bold text-white text-sm">{zone.name}</span>
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                          style={{ backgroundColor: `${color}25`, color }}
                        >
                          {zone.risk_level} RISK
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {zone.description}
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-ocean-900 text-slate-400">
                        <div>
                          <span className="block text-[10px] uppercase">Health Score</span>
                          <span className="font-bold text-white text-xs">{zone.health_score} / 100</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase">Protected Area</span>
                          <span className="font-bold text-white text-xs">{zone.area_sq_km.toLocaleString()} km²</span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Polygon>
              )}

              {/* Centroid indicator */}
              <CircleMarker
                center={[zone.latitude, zone.longitude]}
                radius={4}
                pathOptions={{
                  color: color,
                  fillColor: '#ffffff',
                  fillOpacity: 0.9,
                  weight: 1
                }}
              />
            </React.Fragment>
          );
        })}

        {/* Autonomous Swarm Marine Agents */}
        {agents.map((agent) => (
          <Marker
            key={agent.id}
            position={[agent.latitude, agent.longitude]}
            icon={createAgentIcon(agent.status)}
          >
            <Popup>
              <div className="p-1.5 space-y-2.5 text-xs min-w-[210px]">
                <div className="flex items-center justify-between border-b border-ocean-900 pb-1.5">
                  <div>
                    <h4 className="font-bold text-white text-sm">{agent.name}</h4>
                    <span className="text-[10px] text-ocean-400 font-mono">{agent.agent_id}</span>
                  </div>
                  <AgentStatusBadge status={agent.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px]">
                  <div className="flex items-center space-x-1.5">
                    <Battery className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{agent.battery_percentage}%</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Waves className="w-3.5 h-3.5 text-ocean-400" />
                    <span>{agent.depth_meters}m Depth</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-wide text-slate-400 block mb-1">
                    Specialized Sensors
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities.map((cap, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 rounded bg-ocean-950 border border-ocean-800 text-ocean-300 text-[9px]"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-abyss-900/90 border border-ocean-900/80 backdrop-blur-md rounded-xl p-3 text-xs shadow-xl space-y-2">
        <span className="font-semibold text-slate-200 block text-[11px] uppercase tracking-wider">
          Biome Risk Tiers (PostGIS)
        </span>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-slate-300">Low Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-ocean-400"></span>
            <span className="text-slate-300">Moderate</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span className="text-slate-300">High Stress</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span className="text-slate-300">Critical Anoxia</span>
          </div>
        </div>
      </div>
    </div>
  );
};
