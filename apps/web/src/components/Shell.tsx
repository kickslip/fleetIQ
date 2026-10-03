'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, getUser, logout } from '@/lib/api';
import { useFleet } from '@/lib/ws';

const NAV = [
  ['Dashboard', '/dashboard'],
  ['Live Map', '/map'],
  ['Dispatch', '/dispatch'],
  ['Vehicles', '/vehicles'],
  ['Fuel & Fraud', '/fuel'],
  ['Trips', '/trips'],
  ['Geofences', '/geofences'],
  ['Documents', '/documents'],
] as const;

export default function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { alerts, connected } = useFleet();
  const [sim, setSim] = useState<{ running: boolean; vehicles: number }>({ running: false, vehicles: 0 });
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    if (!localStorage.getItem('fleet_token')) router.replace('/login');
    setUser(getUser());
    api<{ running: boolean; vehicles: number }>('/api/sim/status').then(setSim).catch(() => {});
  }, [router]);

  const unread = alerts.filter((a) => !a.read).length;

  return (
    <div className="flex h-screen">
      <aside className="w-52 shrink-0 border-r border-[var(--border)] bg-[var(--panel)] flex flex-col">
        <div className="px-4 py-5">
          <div className="text-lg font-bold tracking-tight">Fleet<span className="text-sky-400">IQ</span></div>
          <div className="text-[11px] text-slate-500">Logistics Management · SA</div>
        </div>
        <nav className="flex-1 px-2 space-y-0.5">
          {NAV.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className={`block rounded-lg px-3 py-2 text-sm ${
                pathname === href ? 'bg-sky-600/20 text-sky-300' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-[var(--border)]">
          <div className="text-xs text-slate-400">{user?.name}</div>
          <div className="text-[11px] text-slate-600 capitalize">{user?.role}</div>
          <button onClick={logout} className="mt-1 text-[11px] text-slate-500 hover:text-red-400">
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/90 px-6 py-3 backdrop-blur">
          <h1 className="text-lg font-semibold">{title}</h1>
          <div className="flex items-center gap-4">
            <span className={`flex items-center gap-1.5 text-xs ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
              {connected ? 'Live' : 'Disconnected'}
            </span>
            {unread > 0 && (
              <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs text-red-300">
                {unread} alerts
              </span>
            )}
            <button
              onClick={async () => {
                const r = await api<{ running: boolean; vehicles: number }>(
                  sim.running ? '/api/sim/stop' : '/api/sim/start', { method: 'POST' });
                setSim({ running: r.running, vehicles: r.vehicles ?? 0 });
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                sim.running ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {sim.running ? `■ Stop demo fleet (${sim.vehicles})` : '▶ Start demo fleet'}
            </button>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
