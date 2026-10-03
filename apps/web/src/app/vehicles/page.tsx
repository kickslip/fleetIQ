'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';
import { useFleet } from '@/lib/ws';
import { VEHICLE_COLORS, timeAgo } from '@/lib/fmt';
import type { Vehicle } from '@fleet/shared';

const EMPTY = { reg_number: '', make: '', model: '', year: 2023, fuel_tank_litres: 80, fuel_card_number: '' };

export default function Vehicles() {
  const { vehicles } = useFleet();
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [fallback, setFallback] = useState<Vehicle[]>([]);

  useEffect(() => {
    api<Vehicle[]>('/api/vehicles').then(setFallback).catch(() => {});
  }, []);
  const list = vehicles.size ? [...vehicles.values()] : fallback;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await api('/api/vehicles', { method: 'POST', body: JSON.stringify(form) });
    setForm(EMPTY);
    setShowForm(false);
    setFallback(await api<Vehicle[]>('/api/vehicles'));
  }

  return (
    <Shell title="Vehicles">
      <div className="mb-4 flex justify-between">
        <p className="text-sm text-slate-400">{list.length} vehicles</p>
        <button onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold hover:bg-sky-500">
          + Add vehicle
        </button>
      </div>

      {showForm && (
        <form onSubmit={add} className="card mb-4 grid grid-cols-2 gap-3 p-4 md:grid-cols-3">
          {(['reg_number', 'make', 'model', 'fuel_card_number'] as const).map((f) => (
            <input key={f} required placeholder={f.replace(/_/g, ' ')} value={form[f]}
              onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
          ))}
          {(['year', 'fuel_tank_litres'] as const).map((f) => (
            <input key={f} type="number" required placeholder={f.replace(/_/g, ' ')} value={form[f]}
              onChange={(e) => setForm({ ...form, [f]: Number(e.target.value) })} />
          ))}
          <button className="rounded-lg bg-emerald-600 py-2 text-sm font-semibold hover:bg-emerald-500">
            Add
          </button>
        </form>
      )}

      {/* mobile: card list */}
      <div className="md:hidden space-y-3">
        {list.map((v) => (
          <div key={v.id} className="card p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-semibold">{v.reg_number}</span>
              <span className="flex items-center gap-1.5 text-xs capitalize">
                <span className="h-2 w-2 rounded-full" style={{ background: VEHICLE_COLORS[v.status] }} />
                {v.status}
              </span>
            </div>
            <div className="mt-1 text-sm">{v.make} {v.model} {v.year ? `(${v.year})` : ''}</div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>{v.driver_name ?? 'unassigned'}</span>
              <span className="font-mono">{(v as any).fuel_card_number ?? '—'}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>{v.current_speed ? `${Math.round(v.current_speed)} km/h` : 'stationary'}</span>
              <span>seen {timeAgo(v.last_seen_at)}</span>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="card p-6 text-center text-sm text-slate-500">No vehicles.</p>}
      </div>

      {/* desktop: table */}
      <div className="card overflow-x-auto hidden md:block">
        <table className="w-full">
          <thead><tr>
            <th>Reg</th><th>Vehicle</th><th>Driver</th><th>Fuel card</th><th>Status</th><th>Speed</th><th>Last seen</th>
          </tr></thead>
          <tbody>
            {list.map((v) => (
              <tr key={v.id}>
                <td className="font-mono text-xs font-semibold">{v.reg_number}</td>
                <td>{v.make} {v.model} {v.year ? `(${v.year})` : ''}</td>
                <td className="text-slate-400">{v.driver_name ?? '—'}</td>
                <td className="font-mono text-xs text-slate-400">{(v as any).fuel_card_number ?? '—'}</td>
                <td>
                  <span className="flex items-center gap-1.5 text-xs capitalize">
                    <span className="h-2 w-2 rounded-full" style={{ background: VEHICLE_COLORS[v.status] }} />
                    {v.status}
                  </span>
                </td>
                <td>{v.current_speed ? `${Math.round(v.current_speed)} km/h` : '—'}</td>
                <td className="text-xs text-slate-500">{timeAgo(v.last_seen_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
