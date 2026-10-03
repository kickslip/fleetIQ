'use client';

import { useEffect, useRef, useState } from 'react';
import Shell from '@/components/Shell';
import MapView from '@/components/MapView';
import { api } from '@/lib/api';
import type { Vehicle, VehiclePosition } from '@fleet/shared';

export default function Trips() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [positions, setPositions] = useState<VehiclePosition[]>([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    api<Vehicle[]>('/api/vehicles').then(setVehicles).catch(() => {});
  }, []);

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setIdx((i) => {
        if (i >= positions.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 250);
    return () => clearInterval(timer.current!);
  }, [playing, positions.length]);

  async function load() {
    if (!vehicleId) return;
    const from = new Date(Date.now() - 12 * 3600_000).toISOString();
    const pos = await api<VehiclePosition[]>(
      `/api/vehicles/${vehicleId}/positions?from=${encodeURIComponent(from)}`
    ).catch(() => []);
    setPositions(pos);
    setIdx(0);
    setPlaying(false);
  }

  const current = positions[idx];
  const playbackVehicle: Vehicle | undefined = current
    ? ({
        id: Number(vehicleId), reg_number: vehicles.find((v) => v.id === Number(vehicleId))?.reg_number ?? '',
        make: '', model: '', year: null, fuel_tank_litres: null, status: 'active',
        driver_id: null, current_lat: current.lat, current_lng: current.lng,
        current_speed: current.speed, current_heading: current.heading, last_seen_at: current.recorded_at,
      } as Vehicle)
    : undefined;

  return (
    <Shell title="Trip History & Playback">
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-4">
        <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
          <option value="">Select vehicle…</option>
          {vehicles.map((v) => <option key={v.id} value={v.id}>{v.reg_number}</option>)}
        </select>
        <button onClick={load} className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold hover:bg-sky-500">
          Load last 12 h
        </button>
        {positions.length > 0 && (
          <>
            <button onClick={() => setPlaying(!playing)}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-500">
              {playing ? 'Pause' : 'Play'}
            </button>
            <input type="range" min={0} max={positions.length - 1} value={idx}
              onChange={(e) => setIdx(Number(e.target.value))} className="w-64" />
            <span className="text-xs text-slate-400">
              {idx + 1}/{positions.length} · {new Date(current.recorded_at).toLocaleTimeString()}
              {current.speed != null && ` · ${Math.round(current.speed)} km/h`}
            </span>
          </>
        )}
      </div>
      <div className="card" style={{ height: 'calc(100vh - 220px)' }}>
        <MapView
          vehicles={playbackVehicle ? [playbackVehicle] : []}
          trail={positions.slice(0, idx + 1)}
        />
      </div>
    </Shell>
  );
}
