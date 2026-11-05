import React, { useState } from 'react';
import { 
  Save, 
  CheckCircle2, 
  Sliders, 
  MapPin, 
  ShieldCheck
} from 'lucide-react';

export const Settings: React.FC = () => {
  const [dhwThreshold, setDhwThreshold] = useState<number>(4.0);
  const [doThreshold, setDoThreshold] = useState<number>(2.0);
  const [sarThresholdDb, setSarThresholdDb] = useState<number>(14.0);
  const [agentHeartbeatSec, setAgentHeartbeatSec] = useState<number>(10);
  const [crs, setCrs] = useState<string>('EPSG:4326');
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMsg("ORCA telemetry thresholds and PostGIS spatial parameters saved to local configuration.");
    setTimeout(() => setSavedMsg(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            ORCA Platform & Neural Engine Settings
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Geospatial Spatial Engine Parameters • Ecological Alert Thresholds • Autonomous Swarm Polling
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-biolum-cyan bg-surface-card border border-surface-border px-3.5 py-1.5 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Local Configuration Profile</span>
        </div>
      </div>

      {savedMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Ecological Threat Thresholds */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-surface-border pb-3">
            <Sliders className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-white">Ecological Anomaly Trigger Thresholds</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* DHW Bleaching Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-300">Degree Heating Weeks (DHW) Alert Level 1</label>
                <span className="font-mono text-biolum-cyan font-bold">{dhwThreshold.toFixed(1)} °C-weeks</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="8.0"
                step="0.5"
                value={dhwThreshold}
                onChange={(e) => setDhwThreshold(parseFloat(e.target.value))}
                className="w-full accent-biolum-cyan bg-navy-900"
              />
              <p className="text-[11px] text-slate-400">
                Accumulated heat stress above localized Maximum Monthly Mean triggering coral shading.
              </p>
            </div>

            {/* DO Hypoxia Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-300">Hypoxic Dead Zone Threshold (DO)</label>
                <span className="font-mono text-biolum-cyan font-bold">{doThreshold.toFixed(1)} mg/L</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="4.0"
                step="0.1"
                value={doThreshold}
                onChange={(e) => setDoThreshold(parseFloat(e.target.value))}
                className="w-full accent-biolum-cyan bg-navy-900"
              />
              <p className="text-[11px] text-slate-400">
                Lethal dissolved oxygen threshold below which benthic fauna suffocation alerts dispatch.
              </p>
            </div>

            {/* SAR Radar Backscatter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-300">Dark Vessel SAR Sigma-0 Backscatter</label>
                <span className="font-mono text-amber-400 font-bold">+{sarThresholdDb.toFixed(1)} dB</span>
              </div>
              <input
                type="range"
                min="8.0"
                max="24.0"
                step="1.0"
                value={sarThresholdDb}
                onChange={(e) => setSarThresholdDb(parseFloat(e.target.value))}
                className="w-full accent-amber-400 bg-navy-900"
              />
              <p className="text-[11px] text-slate-400">
                Minimum metallic radar reflection echo required to flag silent non-AIS targets.
              </p>
            </div>

            {/* Agent Swarm Heartbeat */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-300">Agent Telemetry Heartbeat Interval</label>
                <span className="font-mono text-emerald-400 font-bold">{agentHeartbeatSec} Seconds</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={agentHeartbeatSec}
                onChange={(e) => setAgentHeartbeatSec(parseInt(e.target.value))}
                className="w-full accent-emerald-400 bg-navy-900"
              />
              <p className="text-[11px] text-slate-400">
                Sampling cadence for autonomous underwater gliders and CTD sensors.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: GIS Spatial Engine & Coordinate System */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-surface-border pb-3">
            <MapPin className="w-4 h-4 text-biolum-cyan" />
            <h3 className="text-sm font-bold text-white">Geospatial Cartography & Coordinate Systems</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                PostGIS Coordinate Reference System (CRS):
              </label>
              <select
                value={crs}
                onChange={(e) => setCrs(e.target.value)}
                className="w-full bg-navy-900 border border-surface-border text-xs text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-biolum-cyan"
              >
                <option value="EPSG:4326">EPSG:4326 - WGS 84 (Standard Geodetic Lat/Lon)</option>
                <option value="EPSG:3857">EPSG:3857 - WGS 84 / Pseudo-Mercator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                FastAPI Backend Endpoint:
              </label>
              <input
                type="text"
                disabled
                value="http://localhost:8000/api/v1"
                className="w-full bg-navy-900/60 border border-surface-border text-xs text-slate-400 rounded-lg px-3 py-2 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center space-x-2 bg-gradient-to-r from-ocean-600 to-biolum-teal hover:brightness-110 text-navy-950 font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-ocean-500/20"
          >
            <Save className="w-4 h-4" />
            <span>Save Platform Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
