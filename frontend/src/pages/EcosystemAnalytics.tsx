import React, { useState, useEffect } from 'react';
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
import type { MarineZone, EcosystemTelemetry } from '../types';
import { api } from '../services/api';
import { Activity, Thermometer, Droplets, Wind } from 'lucide-react';

export const EcosystemAnalytics: React.FC = () => {
  const [zones, setZones] = useState<MarineZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01');
  const [telemetry, setTelemetry] = useState<EcosystemTelemetry[]>([]);

  useEffect(() => {
    api.getZones().then((data) => {
      setZones(data);
      if (data.length > 0) {
        setSelectedZoneId(prev => prev || data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedZoneId) {
      api.getZoneTelemetry(selectedZoneId).then((data) => {
        setTelemetry(data);
      });
    }
  }, [selectedZoneId]);

  // Format chart time
  const chartData = telemetry.map((t, index) => ({
    time: `T-${11 - index}h`,
    temperature: t.water_temperature_c,
    dissolvedOxygen: t.dissolved_oxygen_mg_l,
    ph: t.ph_level,
    salinity: t.salinity_psu,
    microplastics: t.microplastics_index,
    turbidity: t.turbidity_ntu
  }));

  const selectedZone = zones.find(z => z.id === selectedZoneId);

  return (
    <div className="space-y-6">
      {/* Header and Zone selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Hydrographic & Ecosystem Telemetry Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Sensor time-series for ocean temperature anomalies, dissolved oxygen, pH acidification, and microplastics.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs text-slate-400">Target Biome:</label>
          <select
            value={selectedZoneId}
            onChange={(e) => setSelectedZoneId(e.target.value)}
            className="bg-abyss-900 border border-ocean-900 text-xs text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-biolum-cyan"
          >
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name} ({z.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Biome Summary Card */}
      {selectedZone && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-ocean-950/60 to-abyss-900 border border-ocean-900/60 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-ocean-500/10 text-biolum-cyan">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block">
                {selectedZone.name}
              </span>
              <span className="text-slate-400">
                Designation: {selectedZone.designation} • Area: {selectedZone.area_sq_km.toLocaleString()} km²
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Health Score</span>
              <span className="font-bold text-emerald-400 text-sm">{selectedZone.health_score} / 100</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Risk Level</span>
              <span className="font-bold text-white text-sm uppercase">{selectedZone.risk_level}</span>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Water Temperature & Thermal Stress */}
        <div className="p-5 rounded-2xl bg-abyss-900/80 border border-ocean-900/80 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-ocean-900 pb-3">
            <div className="flex items-center space-x-2">
              <Thermometer className="w-4 h-4 text-rose-400" />
              <h3 className="font-bold text-white text-sm">
                Sea Surface Temperature (°C) Anomaly
              </h3>
            </div>
            <span className="text-[10px] font-mono text-ocean-400">
              Bleaching Threshold: &gt; 30.5°C
            </span>
          </div>

          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={['auto', 'auto']} unit="°C" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a1628', borderColor: '#1e3a5f', borderRadius: '0.5rem', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="temperature" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#tempGradient)" name="Water Temp (°C)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Dissolved Oxygen & Hypoxia */}
        <div className="p-5 rounded-2xl bg-abyss-900/80 border border-ocean-900/80 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-ocean-900 pb-3">
            <div className="flex items-center space-x-2">
              <Droplets className="w-4 h-4 text-biolum-cyan" />
              <h3 className="font-bold text-white text-sm">
                Dissolved Oxygen (DO) & Hypoxia Profiling
              </h3>
            </div>
            <span className="text-[10px] font-mono text-rose-400 font-bold">
              Dead Zone: &lt; 2.0 mg/L
            </span>
          </div>

          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="doGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00e5ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 8]} unit="mg/L" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a1628', borderColor: '#1e3a5f', borderRadius: '0.5rem', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="dissolvedOxygen" stroke="#00e5ff" strokeWidth={2} fillOpacity={1} fill="url(#doGradient)" name="Dissolved O2 (mg/L)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Ocean Acidification (pH level) */}
        <div className="p-5 rounded-2xl bg-abyss-900/80 border border-ocean-900/80 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-ocean-900 pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">
                Ocean pH (Acidification Tracking)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Optimal: 8.1 - 8.2
            </span>
          </div>

          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[7.2, 8.4]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a1628', borderColor: '#1e3a5f', borderRadius: '0.5rem', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="ph" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="pH Level" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Microplastics & Turbidity Index */}
        <div className="p-5 rounded-2xl bg-abyss-900/80 border border-ocean-900/80 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-ocean-900 pb-3">
            <div className="flex items-center space-x-2">
              <Wind className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-white text-sm">
                Microplastics Index & Turbidity
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Index: 0-100 scale
            </span>
          </div>

          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a1628', borderColor: '#1e3a5f', borderRadius: '0.5rem', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                <Line type="monotone" dataKey="microplastics" stroke="#f59e0b" strokeWidth={2} name="Microplastics Index" />
                <Line type="monotone" dataKey="turbidity" stroke="#38bdf8" strokeWidth={2} strokeDasharray="4 4" name="Turbidity (NTU)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
