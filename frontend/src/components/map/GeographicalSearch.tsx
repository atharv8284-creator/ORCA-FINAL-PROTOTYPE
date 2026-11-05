import React, { useState } from 'react';
import { Search, MapPin, X } from 'lucide-react';

interface GeographicalSearchProps {
  onSelectLocation: (name: string, coords: [number, number], zoom: number) => void;
}

interface PredefinedLocation {
  name: string;
  category: string;
  coords: [number, number];
  zoom: number;
}

const PRESET_LOCATIONS: PredefinedLocation[] = [
  { name: 'Great Barrier Reef (Ribbon Sector)', category: 'Coral Sanctuary', coords: [-15.4200, 145.8500], zoom: 8 },
  { name: 'Galapagos Marine Reserve (Darwin & Wolf)', category: 'Pelagic Sanctuary', coords: [1.6800, -91.8200], zoom: 8 },
  { name: 'Raja Ampat Coral Triangle (Misool)', category: 'Biodiversity Hotspot', coords: [-2.1500, 130.2500], zoom: 8 },
  { name: 'Sargasso Sea Floating Forest', category: 'Pelagic Gyre', coords: [28.3000, -64.5000], zoom: 6 },
  { name: 'Baltic Gotland Basin (Anoxia Zone)', category: 'Hypoxic Basin', coords: [57.3000, 19.2000], zoom: 7 },
  { name: 'Chagos Archipelago Marine Reserve', category: 'Indian Ocean MPA', coords: [-6.0000, 71.5000], zoom: 7 },
  { name: 'Palau National Marine Sanctuary', category: 'Pacific Sanctuary', coords: [7.5000, 134.5000], zoom: 7 },
  { name: 'Ross Sea Marine Protected Area', category: 'Antarctic Biosphere', coords: [-75.0000, 175.0000], zoom: 5 },
];

export const GeographicalSearch: React.FC<GeographicalSearchProps> = ({ onSelectLocation }) => {
  const [query, setQuery] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Check if input is decimal coordinates: "lat, lng" (e.g. "15.42, 145.85" or "-1.5, 92.0")
    const coordMatch = query.match(/^([-+]?[0-9]*\.?[0-9]+)\s*,\s*([-+]?[0-9]*\.?[0-9]+)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        onSelectLocation(`Coordinates (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`, [lat, lng], 8);
        setIsOpen(false);
        return;
      }
    }

    // Match preset locations
    const found = PRESET_LOCATIONS.find(loc =>
      loc.name.toLowerCase().includes(query.toLowerCase()) ||
      loc.category.toLowerCase().includes(query.toLowerCase())
    );

    if (found) {
      onSelectLocation(found.name, found.coords, found.zoom);
      setIsOpen(false);
    }
  };

  const filteredPresets = PRESET_LOCATIONS.filter(loc =>
    loc.name.toLowerCase().includes(query.toLowerCase()) ||
    loc.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative w-full max-w-md">
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Search marine biome, reserve, or lat, lon (e.g. 15.42, 145.85)..."
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          className="w-full bg-navy-950/95 backdrop-blur-md border border-surface-border text-xs text-slate-200 rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:border-biolum-cyan shadow-xl font-mono placeholder:text-slate-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </form>

      {/* Dropdown Suggestions */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-navy-950/95 backdrop-blur-md border border-surface-border rounded-xl shadow-2xl z-[1500] max-h-64 overflow-y-auto p-1.5 space-y-1">
          <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-ocean-400 font-bold border-b border-surface-border flex items-center justify-between">
            <span>Marine Protected Areas & Hotspots</span>
            <span className="text-slate-500">Jump to Coordinates</span>
          </div>

          {filteredPresets.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400 font-mono">
              Press Enter to jump to coordinates: <strong className="text-biolum-cyan">{query}</strong>
            </div>
          ) : (
            filteredPresets.map((loc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onSelectLocation(loc.name, loc.coords, loc.zoom);
                  setQuery(loc.name);
                  setIsOpen(false);
                }}
                className="w-full text-left p-2 rounded-lg hover:bg-surface-elevated transition-colors flex items-center justify-between text-xs group"
              >
                <div className="flex items-center space-x-2">
                  <MapPin className="w-3.5 h-3.5 text-biolum-cyan shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-200 group-hover:text-white block">
                      {loc.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {loc.category}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-ocean-400 shrink-0">
                  {loc.coords[0].toFixed(2)}°, {loc.coords[1].toFixed(2)}°
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
