'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { api, getUser, logout } from '@/lib/api';
import { useFleet } from '@/lib/ws';

const NAV = [
  ['Dashboard', '/dashboard', 'solar:widget-5-bold-duotone'],
  ['Live Map', '/map', 'solar:map-point-wave-bold-duotone'],
  ['Dispatch', '/dispatch', 'solar:clipboard-list-bold-duotone'],
  ['Vehicles', '/vehicles', 'solar:bus-bold-duotone'],
  ['Fuel & Fraud', '/fuel', 'solar:fuel-bold-duotone'],
  ['Trips', '/trips', 'solar:route-bold-duotone'],
  ['Geofences', '/geofences', 'solar:map-arrow-square-bold-duotone'],
  ['Documents', '/documents', 'solar:document-medicine-bold-duotone'],
] as const;

export default function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { alerts, connected } = useFleet();
  const [sim, setSim] = useState<{ running: boolean; vehicles: number }>({ running: false, vehicles: 0 });
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('fleet_token')) router.replace('/login');
    setUser(getUser());
    api<{ running: boolean; vehicles: number }>('/api/sim/status').then(setSim).catch(() => {});
  }, [router]);

  // Close the drawer whenever the route changes
  useEffect(() => setMenuOpen(false), [pathname]);

  const unread = alerts.filter((a) => !a.read).length;

  const nav = (
    <>
      <div className="px-5 py-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl glass flex items-center justify-center shrink-0">
          <Icon icon="solar:radar-bold-duotone" className="text-xl text-primary" />
        </div>
        <div>
          <div className="text-lg font-bold tracking-tight leading-none">FleetIQ</div>
          <div className="text-[10px] text-muted mt-1 tracking-wide uppercase">Operations</div>
        </div>
      </div>
      <nav className="flex-1 px-3 space-y-1 overflow-auto">
        {NAV.map(([label, href, icon]) => {
          const active = pathname === href;
          return (
            <a
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${
                active
                  ? 'bg-primary/20 text-white border border-primary/30'
                  : 'text-muted hover:bg-white/[.05] hover:text-white border border-transparent'
              }`}
            >
              <Icon icon={icon} className={`text-lg ${active ? 'text-cyan' : ''}`} />
              {label}
            </a>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-white/[.06]">
        <div className="text-xs text-slate-300 font-medium">{user?.name}</div>
        <div className="text-[10px] text-muted capitalize mt-0.5">{user?.role}</div>
        <button onClick={logout} className="mt-1.5 text-[11px] text-muted hover:text-pink transition">
          Sign out →
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen relative z-10">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-white/[.06] bg-white/[.02] backdrop-blur-2xl flex-col">
        {nav}
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-[oklch(11%_.015_250)] border-r border-white/[.08] flex flex-col">
            {nav}
          </aside>
        </div>
      )}

      <main className="flex-1 overflow-auto min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/[.06] bg-[oklch(11%_.015_250/.75)] px-4 md:px-6 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="md:hidden rounded-lg p-2 text-muted hover:text-white hover:bg-white/[.06]"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Icon icon="solar:hamburger-menu-bold-duotone" className="text-xl" />
            </button>
            <h1 className="text-base md:text-lg font-semibold tracking-tight truncate">{title}</h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <span className={`hidden sm:flex items-center gap-1.5 text-xs ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              {connected ? 'Live' : 'Disconnected'}
            </span>
            {unread > 0 && (
              <span className="rounded-full bg-pink/20 border border-pink/30 px-2.5 py-0.5 text-xs text-pink">
                {unread}<span className="hidden sm:inline"> alerts</span>
              </span>
            )}
            <button
              onClick={async () => {
                const r = await api<{ running: boolean; vehicles: number }>(
                  sim.running ? '/api/sim/stop' : '/api/sim/start', { method: 'POST' });
                setSim({ running: r.running, vehicles: r.vehicles ?? 0 });
              }}
              className={`liquid-btn glass border-flow rounded-full px-3 md:px-4 py-2 text-xs font-semibold transition whitespace-nowrap ${
                sim.running ? 'text-amber-300' : 'text-emerald-300'
              }`}
            >
              {sim.running ? `■ Stop (${sim.vehicles})` : '▶ Demo fleet'}
            </button>
          </div>
        </header>
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
