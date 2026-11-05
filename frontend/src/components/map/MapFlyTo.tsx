import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface MapFlyToProps {
  coords: [number, number] | null;
  zoom?: number;
}

export const MapFlyTo: React.FC<MapFlyToProps> = ({ coords, zoom = 6 }) => {
  const map = useMap();

  useEffect(() => {
    if (coords) {
      map.flyTo(coords, zoom, {
        animate: true,
        duration: 1.5,
      });
    }
  }, [coords, zoom, map]);

  return null;
};
