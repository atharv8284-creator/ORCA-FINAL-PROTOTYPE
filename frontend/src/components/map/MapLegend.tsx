import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info, Satellite, Ship, Waves, Radio, AlertTriangle } from 'lucide-react';

export const MapLegend: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'VESSELS' | 'SATELLITES' | 'INCIDENTS'>('ALL');

  return (
    <div className="bg-navy-950/95 backdrop-blur-md border border-surface-border rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 max-w-xs sm:max-w-sm">
      {/* Legend Header */}
      <div className="flex items-center justify-between p-2.5 px-3 border-b border-surface-border/70 bg-navy-900/60">
        <div className="flex items-center space-x-2">
          <Info className="w-3.5 h-3.5 text-biolum-cyan" />
          <span className="text-[11px] font-bold text-white tracking-wide uppercase font-mono">
            Cartographic Legend
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg hover:bg-surface-elevated text-slate-400 hover:text-white transition-colors"
          title={collapsed ? 'Expand Legend' : 'Collapse Legend'}
        >
          {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-3 text-xs">
          {/* Tab selector for dense categorization */}
          <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-navy-900/90 border border-surface-border text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`flex-1 py-1 rounded transition-colors ${
                activeTab === 'ALL' ? 'bg-biolum-cyan/20 text-biolum-cyan font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('VESSELS')}
              className={`flex-1 py-1 rounded transition-colors ${
                activeTab === 'VESSELS' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              AIS
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SATELLITES')}
              className={`flex-1 py-1 rounded transition-colors ${
                activeTab === 'SATELLITES' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sats
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('INCIDENTS')}
              className={`flex-1 py-1 rounded transition-colors ${
                activeTab === 'INCIDENTS' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Alerts
            </button>
          </div>

          {/* Section: AIS Vessels */}
          {(activeTab === 'ALL' || activeTab === 'VESSELS') && (
            <div className="space-y-1.5">
              <div className="flex items-center space-x-1.5 text-[10px] font-mono uppercase text-ocean-400 font-semibold">
                <Ship className="w-3 h-3 text-amber-400" />
                <span>AIS Vessels & IUU Risk</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-sans">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-emerald-300/60 shadow-[0_0_6px_rgba(52,211,153,0.6)]"></span>
                  <span className="text-slate-300">Normal Commercial</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-300/60 shadow-[0_0_6px_rgba(251,191,36,0.6)]"></span>
                  <span className="text-slate-300">Elevated Scrutiny</span>
                </div>
                <div className="flex items-center space-x-1.5 col-span-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-400/80 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse"></span>
                  <span className="text-slate-300">High-Risk IUU / Dark Vessel (Silent AIS)</span>
                </div>
              </div>
            </div>
          )}

          {/* Section: Satellite Sensors */}
          {(activeTab === 'ALL' || activeTab === 'SATELLITES') && (
            <div className="space-y-1.5 pt-1.5 border-t border-surface-border/60">
              <div className="flex items-center space-x-1.5 text-[10px] font-mono uppercase text-ocean-400 font-semibold">
                <Satellite className="w-3 h-3 text-cyan-400" />
                <span>Satellite Sensors & Footprints</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-sans">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 border border-cyan-200"></span>
                  <span className="text-slate-300">SAR C-Band (Radar)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 border border-emerald-200"></span>
                  <span className="text-slate-300">MSI Optical</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 border border-amber-200"></span>
                  <span className="text-slate-300">Thermal Infrared</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-purple-400 border border-purple-200"></span>
                  <span className="text-slate-300">Ocean Radiometer</span>
                </div>
              </div>
            </div>
          )}

          {/* Section: Oceanographic Stations & Buoys */}
          {activeTab === 'ALL' && (
            <div className="space-y-1.5 pt-1.5 border-t border-surface-border/60">
              <div className="flex items-center space-x-1.5 text-[10px] font-mono uppercase text-ocean-400 font-semibold">
                <Waves className="w-3 h-3 text-teal-400" />
                <span>Oceanographic Stations & IoT Buoys</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-sans">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-400 border border-teal-200 shadow-[0_0_6px_rgba(45,212,191,0.6)]"></span>
                  <span className="text-slate-300">In-situ CTD Station</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Radio className="w-3 h-3 text-purple-400 shrink-0" />
                  <span className="text-slate-300">IoT Mooring Buoy</span>
                </div>
              </div>
            </div>
          )}

          {/* Section: Environmental Incidents */}
          {(activeTab === 'ALL' || activeTab === 'INCIDENTS') && (
            <div className="space-y-1.5 pt-1.5 border-t border-surface-border/60">
              <div className="flex items-center space-x-1.5 text-[10px] font-mono uppercase text-ocean-400 font-semibold">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>Ecological Incident Severity</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-sans">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  <span className="text-rose-300 font-semibold">Critical Threat</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span className="text-amber-300">High Stress</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                  <span className="text-sky-300">Moderate Advisory</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-emerald-300">Normal Monitoring</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
