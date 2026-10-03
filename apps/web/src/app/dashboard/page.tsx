'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import MapView from '@/components/MapView';
import { api } from '@/lib/api';
import { useFleet } from '@/lib/ws';
import { SEVERITY_COLORS, timeAgo } from '@/lib/fmt';
import type { Geofence, Stats } from '@fleet/shared';

export default function Dashboard() {
  const { vehicles, alerts } = useFleet();
  const [stats, setStats] = useState<Stats | null>(null);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [dtcBusy, setDtcBusy] = useState(false);

  useEffect(() => {
    api<Stats>('/api/stats').then(setStats).catch(() => {});
    api<Geofence[]>('/api/geofences').then(setGeofences).catch(() => {});
    const t = setInterval(() => api<Stats>('/api/stats').then(setStats).catch(() => {}), 15000);
    return () => clearInterval(t);
  }, []);

  const cards: [string, string | number][] = stats
    ? [
        ['Active vehicles', `${stats.vehicles_active}/${stats.vehicles_total}`],
        ['Jobs active', stats.jobs_active],
        ['Completed today', stats.jobs_completed_today],
        ['km driven today', stats.km_today],
        ['Suspicious fuel txns', stats.suspicious_fuel],
        ['Unread alerts', stats.unread_alerts],
      ]
    : [];

  return (
    <Shell title="Operations Dashboard">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map(([label, v]) => (
          <div key={label} className="card p-4">
            <div className="text-2xl font-bold">{v}</div>
            <div className="mt-1 text-xs text-slate-400">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="card xl:col-span-2 h-[480px] overflow-hidden">
          <MapView vehicles={[...vehicles.values()]} geofences={geofences} />
        </div>
        <div className="card flex h-[480px] flex-col">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-sm font-semibold">Live alerts</h2>
            <button
              disabled={dtcBusy}
              onClick={async () => {
                setDtcBusy(true);
                await api('/api/dtc/simulate', { method: 'POST', body: '{}' }).catch(() => {});
                setDtcBusy(false);
              }}
              className="rounded bg-violet-600 px-2 py-1 text-[11px] font-semibold hover:bg-violet-500 disabled:opacity-50"
            >
              Simulate OBD fault
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-auto p-3">
            {alerts.length === 0 && (
              <p className="p-4 text-sm text-slate-500">
                No alerts yet — start the demo fleet or simulate an OBD fault.
              </p>
            )}
            {alerts.map((a) => (
              <div key={a.id} className="rounded-lg border border-[var(--border)] bg-black/20 p-3">
                <div className={`text-sm font-medium ${SEVERITY_COLORS[a.severity]}`}>{a.title}</div>
                {a.body && <div className="mt-0.5 text-xs text-slate-400">{a.body}</div>}
                <div className="mt-1 text-[10px] text-slate-600">{timeAgo(a.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
