'use client';

import { useEffect, useRef } from 'react';
import maplibregl, { Map, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Geofence, Vehicle, VehiclePosition } from '@fleet/shared';
import { VEHICLE_COLORS } from '@/lib/fmt';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const JOBURG: [number, number] = [28.0473, -26.2041];

// Approximate a geofence circle as a 64-point polygon (in degrees)
function circleFeature(g: Geofence) {
  const pts: [number, number][] = [];
  const dLat = g.radius_m / 111320;
  const dLng = g.radius_m / (111320 * Math.cos((g.lat * Math.PI) / 180));
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    pts.push([g.lng + dLng * Math.cos(a), g.lat + dLat * Math.sin(a)]);
  }
  return {
    type: 'Feature' as const,
    properties: { name: g.name, type: g.type },
    geometry: { type: 'Polygon' as const, coordinates: [pts] },
  };
}

const FENCE_COLORS: Record<Geofence['type'], string> = {
  depot: '#38bdf8',
  customer: '#34d399',
  no_go: '#f87171',
};

interface Props {
  vehicles?: Vehicle[];
  geofences?: Geofence[];
  trail?: VehiclePosition[];          // polyline to draw
  onVehicleClick?: (v: Vehicle) => void;
  onMapClick?: (lng: number, lat: number) => void;
  pendingPoint?: { lng: number; lat: number } | null;
  className?: string;
}

export default function MapView({
  vehicles = [], geofences = [], trail, onVehicleClick, onMapClick, pendingPoint, className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<globalThis.Map<number, Marker>>(new globalThis.Map());
  const pendingRef = useRef<Marker | null>(null);
  const clickRef = useRef(onVehicleClick);
  clickRef.current = onVehicleClick;

  // Init map once
  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current!,
      style: STYLE_URL,
      center: JOBURG,
      zoom: 11,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.on('load', () => {
      map.addSource('geofences', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'geofences-fill', type: 'fill', source: 'geofences',
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.12 },
      });
      map.addLayer({
        id: 'geofences-line', type: 'line', source: 'geofences',
        paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-dasharray': [2, 1] },
      });
      map.addSource('trail', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'trail-line', type: 'line', source: 'trail',
        paint: { 'line-color': '#818cf8', 'line-width': 3, 'line-opacity': 0.85 },
      });
    });
    map.on('click', (e) => onMapClick?.(e.lngLat.lng, e.lngLat.lat));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Geofences → geojson
  useEffect(() => {
    const src = mapRef.current?.getSource('geofences') as maplibregl.GeoJSONSource | undefined;
    src?.setData({
      type: 'FeatureCollection',
      features: geofences.map((g) => ({
        ...circleFeature(g),
        properties: { name: g.name, color: FENCE_COLORS[g.type] },
      })),
    });
  }, [geofences]);

  // Trail → geojson
  useEffect(() => {
    const src = mapRef.current?.getSource('trail') as maplibregl.GeoJSONSource | undefined;
    src?.setData({
      type: 'FeatureCollection',
      features: trail?.length
        ? [{
            type: 'Feature', properties: {},
            geometry: { type: 'LineString', coordinates: trail.map((p) => [p.lng, p.lat]) },
          }]
        : [],
    });
  }, [trail]);

  // Vehicles → markers (create/update/remove diffing)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set<number>();
    for (const v of vehicles) {
      if (v.current_lat == null || v.current_lng == null) continue;
      seen.add(v.id);
      let m = markersRef.current.get(v.id);
      if (!m) {
        const el = document.createElement('div');
        el.style.position = 'relative';
        const dot = document.createElement('div');
        dot.className = 'veh-marker';
        const label = document.createElement('div');
        label.className = 'veh-label';
        el.append(dot, label);
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          clickRef.current?.(v);
        });
        m = new maplibregl.Marker({ element: el }).setLngLat([v.current_lng, v.current_lat]).addTo(map);
        markersRef.current.set(v.id, m);
      }
      m.setLngLat([v.current_lng, v.current_lat]);
      const dot = m.getElement().querySelector('.veh-marker') as HTMLElement;
      const label = m.getElement().querySelector('.veh-label') as HTMLElement;
      dot.style.background = VEHICLE_COLORS[v.status] ?? '#94a3b8';
      label.textContent = `${v.reg_number}${v.current_speed ? ` · ${Math.round(v.current_speed)}km/h` : ''}`;
    }
    for (const [id, m] of markersRef.current) {
      if (!seen.has(id)) {
        m.remove();
        markersRef.current.delete(id);
      }
    }
  }, [vehicles]);

  // Pending geofence point marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (pendingPoint) {
      if (!pendingRef.current) pendingRef.current = new maplibregl.Marker({ color: '#f472b6' });
      pendingRef.current.setLngLat([pendingPoint.lng, pendingPoint.lat]).addTo(map);
    } else {
      pendingRef.current?.remove();
      pendingRef.current = null;
    }
  }, [pendingPoint]);

  return <div ref={containerRef} className={className ?? 'h-full w-full rounded-xl overflow-hidden'} />;
}
