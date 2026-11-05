import React, { useState, useEffect } from 'react';
import type { MarineZone } from '../types';
import { api } from '../services/api';
import { MapPin, Waves, Search, Filter } from 'lucide-react';

export const MarineZones: React.FC = () => {
  const [zones, setZones] = useState<MarineZone[]>([]);
  const [selectedRisk, setSelectedRisk] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const fetchZones = async () => {
      const riskParam = selectedRisk === 'ALL' ? undefined : selectedRisk;
      const data = await api.getZones(riskParam);
      setZones(data);
    };
    fetchZones();
  }, [selectedRisk]);

  const filteredZones = zones.filter(z =>
    z.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    z.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    z.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRiskColor = (risk: string) => {
    switch (risk.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-950/60 text-rose-400 border-rose-800';
      case 'HIGH':
        return 'bg-amber-950/60 text-amber-400 border-amber-800';
      case 'MODERATE':
        return 'bg-ocean-950/60 text-ocean-400 border-ocean-800';
      default:
        return 'bg-emerald-950/60 text-emerald-400 border-emerald-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Filter bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Marine Protected Areas & Biome Explorer
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            PostGIS spatial boundaries, health scores, and risk classifications for global marine reserves.
          </p>
        </div>

        {/* Search and Risk Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search biome name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-abyss-900 border border-ocean-900 text-xs text-slate-200 rounded-lg pl-9 pr-3 py-2 w-64 focus:outline-none focus:border-biolum-cyan"
            />
          </div>

          <div className="flex items-center space-x-1.5 bg-abyss-900 border border-ocean-900 rounded-lg p-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            {['ALL', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'].map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRisk(r)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  selectedRisk === r
                    ? 'bg-ocean-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Biomes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredZones.map((zone) => (
          <div
            key={zone.id}
            className="p-5 rounded-2xl bg-abyss-900/80 border border-ocean-900/80 hover:border-ocean-600/60 transition-all duration-300 shadow-xl space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono text-ocean-400 font-bold block">
                    {zone.code}
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {zone.name}
                  </h3>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    {zone.designation}
                  </span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase shrink-0 ${getRiskColor(zone.risk_level)}`}>
                  {zone.risk_level}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {zone.description}
              </p>
            </div>

            <div className="space-y-3 pt-3 border-t border-ocean-900/80">
              {/* Health Score Meter */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400">Biome Health Index</span>
                  <span className="font-bold text-white">{zone.health_score} / 100</span>
                </div>
                <div className="w-full h-2 rounded-full bg-abyss-950 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      zone.health_score > 80
                        ? 'bg-emerald-400'
                        : zone.health_score > 60
                        ? 'bg-ocean-400'
                        : zone.health_score > 45
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${zone.health_score}%` }}
                  ></div>
                </div>
              </div>

              {/* Geographic Coordinates & Area */}
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                <div className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-biolum-cyan" />
                  <span>
                    {zone.latitude.toFixed(2)}°, {zone.longitude.toFixed(2)}°
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Waves className="w-3.5 h-3.5 text-ocean-400" />
                  <span>{zone.area_sq_km.toLocaleString()} km²</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
