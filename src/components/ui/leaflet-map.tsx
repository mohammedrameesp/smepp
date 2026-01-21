'use client';

/**
 * @file leaflet-map.tsx
 * @description Leaflet map component for displaying location markers
 * @module components/ui
 *
 * This component must be dynamically imported with SSR disabled
 * because Leaflet requires the window object.
 *
 * Usage:
 * const LeafletMap = dynamic(() => import('@/components/ui/leaflet-map'), { ssr: false });
 */

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with webpack/bundlers
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LeafletMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  height?: string;
  className?: string;
}

export default function LeafletMap({
  latitude,
  longitude,
  zoom = 17,
  height = '200px',
  className = '',
}: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Initialize map on mount only
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom,
      scrollWheelZoom: false,
      dragging: true,
      zoomControl: true,
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapRef.current);

    // Add marker
    markerRef.current = L.marker([latitude, longitude]).addTo(mapRef.current);

    // Cleanup on unmount only
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

  // Update map view and marker when coordinates change
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;

    mapRef.current.setView([latitude, longitude], zoom);
    markerRef.current.setLatLng([latitude, longitude]);
  }, [latitude, longitude, zoom]);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className={`w-full rounded-lg overflow-hidden border border-slate-200 ${className}`}
    />
  );
}
