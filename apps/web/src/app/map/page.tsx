'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import MapView from '@/components/MapView';
import { api } from '@/lib/api';
import { useFleet } from '@/lib/ws';
import { timeAgo, VEHICLE_COLORS } from '@/lib/fmt';
import type { Geofence, Vehicle, VehiclePosition } from '@fleet/shared';

export default function LiveMap() {
  const { vehicles } = useFleet();
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [trail, setTrail] = useState<VehiclePosition[]>([]);

  useEffect(() => {
    api<Geofence[]>('/api/geofences').then(setGeofences).catch(() => {});
  }, []);

  const list = [...vehicles.values()];

  async function showTrail(v: Vehicle) {
    setSelected(v);
    const from = new Date(Date.now() - 2 * 3600_000).toISOString();
    const pos = await api<VehiclePosition[]>(
      `/api/vehicles/${v.id}/positions?from=${encodeURIComponent(from)}`
    ).catch(() => []);
    setTrail(pos);
  }

  return (
    <Shell title="Live Vehicle Map">
      <div className="flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-140px)]">
        <div className="card h-[55vh] lg:h-auto flex-1 overflow-hidden">
          <MapView vehicles={list} geofences={geofences} trail={trail} onVehicleClick={showTrail} />
        </div>
        <div className="card w-full lg:w-72 shrink-0 overflow-auto max-h-[35vh] lg:max-h-none">
          <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">Fleet</div>
          {list.map((v) => (
            <button
              key={v.id}
              onClick={() => showTrail(v)}
              className={`block w-full border-b border-[var(--border)] px-4 py-3 text-left hover:bg-white/5 ${
                selected?.id === v.id ? 'bg-sky-600/10' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: VEHICLE_COLORS[v.status] }}
                />
                <span className="text-sm font-medium">{v.reg_number}</span>
              </div>
              <div className="mt-0.5 pl-4 text-xs text-slate-400">
                {v.make} {v.model} · {v.driver_name ?? 'unassigned'}
              </div>
              <div className="pl-4 text-[10px] text-slate-600">
                {v.current_speed ? `${Math.round(v.current_speed)} km/h · ` : ''}seen {timeAgo(v.last_seen_at)}
              </div>
            </button>
          ))}
          {list.length === 0 && <p className="p-4 text-sm text-slate-500">No vehicles reporting.</p>}
        </div>
      </div>
    </Shell>
  );
}
