'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import MapView from '@/components/MapView';
import { api } from '@/lib/api';
import { useFleet } from '@/lib/ws';
import type { Geofence } from '@fleet/shared';

export default function Geofences() {
  const { vehicles } = useFleet();
  const [fences, setFences] = useState<Geofence[]>([]);
  const [pending, setPending] = useState<{ lng: number; lat: number } | null>(null);
  const [form, setForm] = useState({ name: '', type: 'depot', radius_m: 500 });
  const [events, setEvents] = useState<any[]>([]);

  async function refresh() {
    setFences(await api<Geofence[]>('/api/geofences').catch(() => []));
    setEvents(await api<any[]>('/api/geofence-events').catch(() => []));
  }
  useEffect(() => { refresh(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!pending) return;
    await api('/api/geofences', {
      method: 'POST',
      body: JSON.stringify({ ...form, lat: pending.lat, lng: pending.lng }),
    });
    setPending(null);
    setForm({ name: '', type: 'depot', radius_m: 500 });
    refresh();
  }

  return (
    <Shell title="Geofences">
      <div className="flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-140px)]">
        <div className="card h-[50vh] lg:h-auto flex-1 overflow-hidden relative">
          <MapView
            vehicles={[...vehicles.values()]}
            geofences={fences}
            pendingPoint={pending}
            onMapClick={(lng, lat) => setPending({ lng, lat })}
          />
          <div className="absolute left-3 top-3 rounded-lg bg-black/70 px-3 py-2 text-xs text-slate-300">
            Click the map to place a new geofence centre
          </div>
        </div>
        <div className="w-full lg:w-80 shrink-0 space-y-4 overflow-auto">
          {pending && (
            <form onSubmit={create} className="card space-y-3 p-4">
              <h3 className="text-sm font-semibold">New geofence</h3>
              <p className="font-mono text-[11px] text-slate-500">
                {pending.lat.toFixed(5)}, {pending.lng.toFixed(5)}
              </p>
              <input required placeholder="Name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" />
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full">
                <option value="depot">Depot</option>
                <option value="customer">Customer site</option>
                <option value="no_go">No-go zone</option>
              </select>
              <input type="number" min={50} required placeholder="Radius (m)" value={form.radius_m}
                onChange={(e) => setForm({ ...form, radius_m: Number(e.target.value) })} className="w-full" />
              <div className="flex gap-2">
                <button className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-xs font-semibold hover:bg-emerald-500">Create</button>
                <button type="button" onClick={() => setPending(null)}
                  className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs">Cancel</button>
              </div>
            </form>
          )}
          <div className="card">
            <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">Zones ({fences.length})</div>
            {fences.map((g) => (
              <div key={g.id} className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5 last:border-0">
                <div>
                  <div className="text-sm">{g.name}</div>
                  <div className="text-[11px] text-slate-500 capitalize">{g.type.replace('_', ' ')} · {g.radius_m} m</div>
                </div>
                <button onClick={async () => { await api(`/api/geofences/${g.id}`, { method: 'DELETE' }); refresh(); }}
                  className="text-xs text-red-400 hover:text-red-300">Delete</button>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">Recent events</div>
            {events.slice(0, 15).map((e) => (
              <div key={e.id} className="border-b border-[var(--border)] px-4 py-2 text-xs last:border-0">
                <span className={e.event === 'enter' ? 'text-emerald-400' : 'text-amber-400'}>
                  {e.event === 'enter' ? '→ entered' : '← left'}
                </span>{' '}
                <span className="font-medium">{e.reg_number}</span> · {e.geofence_name}
                <div className="text-[10px] text-slate-600">{new Date(e.at).toLocaleTimeString()}</div>
              </div>
            ))}
            {events.length === 0 && <p className="p-4 text-xs text-slate-500">No events yet.</p>}
          </div>
        </div>
      </div>
    </Shell>
  );
}
