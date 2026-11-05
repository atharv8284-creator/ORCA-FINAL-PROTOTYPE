import React from 'react';
import type { MapActiveLayers } from '../../types';
import { Satellite, Ship, Waves, Radio, AlertTriangle, Layers, Eye, EyeOff } from 'lucide-react';

interface MapLayerControlsProps {
  activeLayers: MapActiveLayers;
  counts: {
    satellites: number;
    vessels: number;
    oceanographic: number;
    buoys: number;
    incidents: number;
  };
  aisStatus?: 'REAL' | 'NOT CONNECTED' | 'OFFLINE' | 'NO DATA' | 'DEMO';
  onToggleLayer: (layerKey: keyof MapActiveLayers) => void;
  onSetAllLayers: (enable: boolean) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const MapLayerControls: React.FC<MapLayerControlsProps> = ({
  activeLayers,
  counts,
  aisStatus,
  onToggleLayer,
  onSetAllLayers,
}) => {
  const layerDefs: Array<{
    key: keyof MapActiveLayers;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    count: number;
    activeColor: string;
    borderActive: string;
    bgActive: string;
    textColor: string;
  }> = [
    {
      key: 'satellites',
      label: 'Satellite Observations',
      description: 'SAR C-Band, MSI optical & radiometer swath footprints',
      icon: Satellite,
      count: counts.satellites,
      activeColor: 'bg-cyan-500',
      borderActive: 'border-cyan-500/50',
      bgActive: 'bg-cyan-950/40',
      textColor: 'text-cyan-300',
    },
    {
      key: 'vessels',
      label: 'AIS Vessels',
      description: 'Commercial vessels, patrol cutters & dark IUU contacts',
      icon: Ship,
      count: counts.vessels,
      activeColor: 'bg-amber-500',
      borderActive: 'border-amber-500/50',
      bgActive: 'bg-amber-950/40',
      textColor: 'text-amber-300',
    },
    {
      key: 'oceanographic',
      label: 'Oceanographic Stations',
      description: 'In-situ CTD profiles: temp, salinity, DO, chlorophyll & pH',
      icon: Waves,
      count: counts.oceanographic,
      activeColor: 'bg-teal-400',
      borderActive: 'border-teal-500/50',
      bgActive: 'bg-teal-950/40',
      textColor: 'text-teal-300',
    },
    {
      key: 'buoys',
      label: 'IoT Buoy Locations',
      description: 'NOAA NDBC moorings, Argo floats & wave gliders',
      icon: Radio,
      count: counts.buoys,
      activeColor: 'bg-purple-500',
      borderActive: 'border-purple-500/50',
      bgActive: 'bg-purple-950/40',
      textColor: 'text-purple-300',
    },
    {
      key: 'incidents',
      label: 'Environmental Incidents',
      description: 'Marine heatwaves, anoxia events & oil slick alerts',
      icon: AlertTriangle,
      count: counts.incidents,
      activeColor: 'bg-rose-500',
      borderActive: 'border-rose-500/50',
      bgActive: 'bg-rose-950/40',
      textColor: 'text-rose-300',
    },
  ];

  const totalVisible = Object.keys(activeLayers).reduce((acc, key) => {
    const k = key as keyof MapActiveLayers;
    return activeLayers[k] ? acc + (counts[k] || 0) : acc;
  }, 0);

  return (
    <div className="bg-navy-950/95 backdrop-blur-md border border-surface-border rounded-2xl p-3.5 shadow-2xl space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-border/70 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded-lg bg-ocean-900/60 border border-ocean-700/60">
            <Layers className="w-3.5 h-3.5 text-biolum-cyan" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide uppercase font-mono">
              Observation Layers
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              {totalVisible} active features
            </span>
          </div>
        </div>

        {/* Quick toggles */}
        <div className="flex items-center space-x-1 text-[10px] font-mono">
          <button
            type="button"
            onClick={() => onSetAllLayers(true)}
            className="flex items-center space-x-1 px-2 py-0.5 rounded text-slate-400 hover:text-biolum-cyan hover:bg-surface-elevated transition-colors"
            title="Enable all layers"
          >
            <Eye className="w-3 h-3" />
            <span>All</span>
          </button>
          <span className="text-slate-600">/</span>
          <button
            type="button"
            onClick={() => onSetAllLayers(false)}
            className="flex items-center space-x-1 px-2 py-0.5 rounded text-slate-400 hover:text-rose-400 hover:bg-surface-elevated transition-colors"
            title="Disable all layers"
          >
            <EyeOff className="w-3 h-3" />
            <span>None</span>
          </button>
        </div>
      </div>

      {/* 5 Layer Switches */}
      <div className="space-y-1.5">
        {layerDefs.map((layer) => {
          const isActive = activeLayers[layer.key];
          const Icon = layer.icon;

          return (
            <React.Fragment key={layer.key}>
              <button
                type="button"
              onClick={() => onToggleLayer(layer.key)}
              className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
                isActive
                  ? `${layer.bgActive} ${layer.borderActive} shadow-sm`
                  : 'bg-surface-card/40 border-surface-border/50 opacity-60 hover:opacity-100 hover:bg-surface-elevated/40'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                    isActive
                      ? `${layer.bgActive} ${layer.borderActive} ${layer.textColor}`
                      : 'bg-navy-900 border-surface-border text-slate-500'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-slate-400'}`}>
                      {layer.label}
                    </span>
                    {layer.key === 'vessels' && aisStatus && (
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase border ${
                        aisStatus === 'REAL' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' :
                        aisStatus === 'DEMO' ? 'bg-purple-950/80 text-purple-300 border-purple-800' :
                        aisStatus === 'NO DATA' ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800' :
                        aisStatus === 'OFFLINE' ? 'bg-rose-950/80 text-rose-300 border-rose-800' :
                        'bg-amber-950/80 text-amber-300 border-amber-800'
                      }`}>
                        {aisStatus}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate leading-tight font-mono">
                    {layer.description}
                  </span>
                </div>
              </div>

              {/* Count pill & Switch toggle */}
              <div className="flex items-center space-x-2 shrink-0">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                    isActive
                      ? `${layer.textColor} bg-navy-900/80 border border-current/30`
                      : 'text-slate-400 bg-navy-900/50'
                  }`}
                >
                  {layer.count}
                </span>

                <div
                  className={`w-8 h-4 rounded-full transition-colors relative p-0.5 ${
                    isActive ? layer.activeColor : 'bg-navy-800'
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white transition-transform ${
                      isActive ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            </button>

            {layer.key === 'vessels' && isActive && aisStatus === 'NOT CONNECTED' && (
              <div className="mx-1 p-2 rounded-lg bg-amber-950/30 border border-amber-900/50 text-[10px] text-amber-200/90 space-y-1">
                <div className="flex items-center space-x-1 font-semibold text-amber-300">
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>AIS Feed Notice</span>
                </div>
                <p className="leading-snug">
                  AIS provider not configured. Connect an authorized AIS data provider to receive vessel information.
                </p>
              </div>
            )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
