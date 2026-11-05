import React from 'react';
import type { MapDateFilter, MapSourceFilter, MapFeedMode } from '../../types';
import { Calendar, Filter, Database, Wifi, RotateCcw, Map as MapIcon } from 'lucide-react';

interface MapFilterBarProps {
  dateFilter: MapDateFilter;
  sourceFilter: MapSourceFilter;
  feedMode: MapFeedMode;
  basemap: 'OSM' | 'CARTO_DARK';
  onChangeDateFilter: (filter: MapDateFilter) => void;
  onChangeSourceFilter: (filter: MapSourceFilter) => void;
  onChangeFeedMode: (mode: MapFeedMode) => void;
  onChangeBasemap: (basemap: 'OSM' | 'CARTO_DARK') => void;
  onResetFilters: () => void;
}

export const MapFilterBar: React.FC<MapFilterBarProps> = ({
  dateFilter,
  sourceFilter,
  feedMode,
  basemap,
  onChangeDateFilter,
  onChangeSourceFilter,
  onChangeFeedMode,
  onChangeBasemap,
  onResetFilters,
}) => {
  return (
    <div className="bg-navy-950/90 backdrop-blur-md border border-surface-border rounded-2xl p-3 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Date, Source & Feed Mode */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Feed Mode Selector (DB vs Live Stream) */}
          <div className="flex items-center rounded-xl bg-navy-900 border border-surface-border p-0.5 text-xs">
            <button
              type="button"
              onClick={() => onChangeFeedMode('INTELLIGENCE_DB')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-mono text-[11px] font-semibold transition-all ${
                feedMode === 'INTELLIGENCE_DB'
                  ? 'bg-biolum-cyan text-navy-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Intelligence DB</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeFeedMode('LIVE_STREAM')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-mono text-[11px] font-semibold transition-all ${
                feedMode === 'LIVE_STREAM'
                  ? 'bg-amber-500 text-navy-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
              title="Real-time live external telemetry stream"
            >
              <Wifi className="w-3.5 h-3.5 animate-pulse" />
              <span>Live External Feed</span>
            </button>
          </div>

          {/* Date & Time Filter Dropdown */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-navy-900 border border-surface-border text-xs">
            <Calendar className="w-3.5 h-3.5 text-biolum-teal shrink-0" />
            <span className="text-[10px] uppercase font-mono text-slate-400 hidden sm:inline">Time:</span>
            <select
              value={dateFilter}
              onChange={(e) => onChangeDateFilter(e.target.value as MapDateFilter)}
              className="bg-transparent text-[11px] font-mono text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-navy-950 text-slate-200">All Recorded Data</option>
              <option value="LAST_24H" className="bg-navy-950 text-slate-200">Last 24 Hours</option>
              <option value="LAST_7D" className="bg-navy-950 text-slate-200">Last 7 Days</option>
              <option value="LAST_30D" className="bg-navy-950 text-slate-200">Last 30 Days</option>
            </select>
          </div>

          {/* Data Source Filter Dropdown */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-navy-900 border border-surface-border text-xs">
            <Filter className="w-3.5 h-3.5 text-biolum-cyan shrink-0" />
            <span className="text-[10px] uppercase font-mono text-slate-400 hidden sm:inline">Source:</span>
            <select
              value={sourceFilter}
              onChange={(e) => onChangeSourceFilter(e.target.value as MapSourceFilter)}
              className="bg-transparent text-[11px] font-mono text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-navy-950 text-slate-200">All Data Sources</option>
              <option value="POSTGIS" className="bg-navy-950 text-slate-200">PostGIS Marine DB</option>
              <option value="COPERNICUS" className="bg-navy-950 text-slate-200">ESA Copernicus Sentinel</option>
              <option value="GFW_AIS" className="bg-navy-950 text-slate-200">Global Fishing Watch AIS</option>
              <option value="NOAA_ARGO" className="bg-navy-950 text-slate-200">NOAA NDBC / Argo</option>
              <option value="ORCA_SWARM" className="bg-navy-950 text-slate-200">ORCA Swarm Telemetry</option>
            </select>
          </div>
        </div>

        {/* Right Side: Basemap & Reset */}
        <div className="flex items-center space-x-2">
          {/* Basemap Switcher */}
          <div className="flex items-center space-x-1 px-2 py-1 rounded-xl bg-navy-900 border border-surface-border text-[11px] font-mono">
            <MapIcon className="w-3.5 h-3.5 text-ocean-400 shrink-0" />
            <span className="text-[10px] uppercase text-slate-400 hidden md:inline">Basemap:</span>
            <button
              type="button"
              onClick={() => onChangeBasemap('OSM')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                basemap === 'OSM'
                  ? 'bg-biolum-cyan/20 text-biolum-cyan border border-biolum-cyan/40'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="OpenStreetMap Standard Basemap"
            >
              OSM
            </button>
            <button
              type="button"
              onClick={() => onChangeBasemap('CARTO_DARK')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                basemap === 'CARTO_DARK'
                  ? 'bg-ocean-600/30 text-ocean-300 border border-ocean-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="CartoDB Dark Matter Oceanic Basemap"
            >
              Dark
            </button>
          </div>

          {/* Reset Filters */}
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-surface-card hover:bg-surface-elevated text-slate-400 hover:text-white border border-surface-border text-[11px] font-mono transition-colors"
            title="Reset all filters to default"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};
