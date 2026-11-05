import React, { useState } from 'react';
import { useMapEvents } from 'react-leaflet';
import type { LeafletMouseEvent } from 'leaflet';
import { Compass, Crosshair } from 'lucide-react';

export const CoordinateTracker: React.FC = () => {
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(3);
  const [centerCoords, setCenterCoords] = useState<{ lat: number; lng: number }>({ lat: 10, lng: 20 });

  const map = useMapEvents({
    mousemove(e: LeafletMouseEvent) {
      setCursorCoords({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      });
    },
    zoomend() {
      setZoomLevel(map.getZoom());
      const center = map.getCenter();
      setCenterCoords({ lat: center.lat, lng: center.lng });
    },
    moveend() {
      const center = map.getCenter();
      setCenterCoords({ lat: center.lat, lng: center.lng });
    },
  });

  const formatCoord = (deg: number, isLat: boolean) => {
    const dir = isLat ? (deg >= 0 ? 'N' : 'S') : deg >= 0 ? 'E' : 'W';
    return `${Math.abs(deg).toFixed(4)}° ${dir}`;
  };

  return (
    <div className="absolute bottom-3 right-3 z-[1000] pointer-events-none select-none">
      <div className="bg-navy-950/90 backdrop-blur-md border border-surface-border text-slate-200 px-3 py-1.5 rounded-xl shadow-xl flex items-center space-x-3 text-[11px] font-mono">
        {cursorCoords ? (
          <div className="flex items-center space-x-1.5">
            <Crosshair className="w-3.5 h-3.5 text-biolum-cyan" />
            <span>
              Lat: <strong className="text-white">{formatCoord(cursorCoords.lat, true)}</strong>
            </span>
            <span className="text-slate-500">•</span>
            <span>
              Lon: <strong className="text-white">{formatCoord(cursorCoords.lng, false)}</strong>
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 text-slate-400">
            <Compass className="w-3.5 h-3.5 text-ocean-400" />
            <span>Center: {formatCoord(centerCoords.lat, true)}, {formatCoord(centerCoords.lng, false)}</span>
          </div>
        )}

        <div className="border-l border-surface-border pl-2.5 text-slate-400">
          <span>Zoom: <strong className="text-biolum-teal font-bold">{zoomLevel}</strong></span>
        </div>
      </div>
    </div>
  );
};
