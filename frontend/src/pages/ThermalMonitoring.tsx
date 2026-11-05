import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Thermometer, Flame } from 'lucide-react';

export const ThermalMonitoring: React.FC = () => {
  const [selectedBiome, setSelectedBiome] = useState<string>('GBR');

  // Degree Heating Week (DHW) accumulation data
  const dhwData = [
    { week: 'Week -6', sst: 28.8, dhw: 0.0, mmm: 29.2 },
    { week: 'Week -5', sst: 29.4, dhw: 0.2, mmm: 29.2 },
    { week: 'Week -4', sst: 30.1, dhw: 1.1, mmm: 29.2 },
    { week: 'Week -3', sst: 30.6, dhw: 2.5, mmm: 29.2 },
    { week: 'Week -2', sst: 31.0, dhw: 3.8, mmm: 29.2 },
    { week: 'Week -1', sst: 31.2, dhw: 4.2, mmm: 29.2 },
    { week: 'Current', sst: 31.4, dhw: 4.8, mmm: 29.2 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Thermal Monitoring & Coral Bleaching Early Warning
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            NOAA Coral Reef Watch Algorithm • Degree Heating Weeks (DHW) • Marine Heatwave (MHW) Severity Matrix
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-surface-card border border-surface-border p-1 rounded-xl text-xs">
          <button
            onClick={() => setSelectedBiome('GBR')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedBiome === 'GBR' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Great Barrier Reef (Alert Level 1)
          </button>
          <button
            onClick={() => setSelectedBiome('GAL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedBiome === 'GAL' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Galapagos (Thermal Upwelling)
          </button>
        </div>
      </div>

      {/* Bleaching Threshold Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400">Current SST Anomaly</span>
          <div className="text-2xl font-black text-rose-400 font-mono">+2.2°C</div>
          <p className="text-[11px] text-slate-400">Above Maximum Monthly Mean (29.2°C)</p>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-rose-900/60 bg-rose-950/20 space-y-1">
          <span className="text-[10px] uppercase font-mono text-rose-300">Degree Heating Weeks</span>
          <div className="text-2xl font-black text-rose-400 font-mono">4.8 °C-weeks</div>
          <p className="text-[11px] text-rose-300">Bleaching Alert Level 1 Triggered</p>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400">MHW Category</span>
          <div className="text-2xl font-black text-amber-400 font-mono">Category II</div>
          <p className="text-[11px] text-slate-400">Strong Marine Heatwave (18 days)</p>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400">Autonomous Countermeasure</span>
          <div className="text-2xl font-black text-biolum-teal font-mono">Active</div>
          <p className="text-[11px] text-slate-400">AUV surface micro-bubble shading</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SST vs MMM Chart */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <div className="flex items-center space-x-2">
              <Thermometer className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white">Sea Surface Temperature vs Climatology</h3>
            </div>
            <span className="text-[10px] font-mono text-ocean-300">Sentinel-3 SLSTR & VIIRS</span>
          </div>

          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dhwData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#162e54" />
                <XAxis dataKey="week" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[28, 33]} unit="°C" />
                <Tooltip contentStyle={{ backgroundColor: '#081324', borderColor: '#162e54', borderRadius: '0.75rem', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                <Line type="monotone" dataKey="sst" stroke="#f43f5e" strokeWidth={2.5} name="Recorded SST (°C)" />
                <Line type="monotone" dataKey="mmm" stroke="#00e5ff" strokeWidth={2} strokeDasharray="4 4" name="Max Monthly Mean (MMM)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DHW Accumulation */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Degree Heating Weeks Accumulation (DHW)</h3>
            </div>
            <span className="text-[10px] font-mono text-rose-400 font-bold">Level 1 Alert (DHW &ge; 4.0)</span>
          </div>

          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dhwData}>
                <defs>
                  <linearGradient id="dhwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#162e54" />
                <XAxis dataKey="week" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 8]} unit=" °C-wk" />
                <Tooltip contentStyle={{ backgroundColor: '#081324', borderColor: '#162e54', borderRadius: '0.75rem', fontSize: '12px' }} />
                <Area type="monotone" dataKey="dhw" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#dhwGrad)" name="DHW (°C-weeks)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
