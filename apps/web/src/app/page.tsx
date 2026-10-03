'use client';

import { useEffect } from 'react';
import { Icon } from '@iconify/react';

export default function Landing() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('active')),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

    const buttons = Array.from(document.querySelectorAll<HTMLElement>('.liquid-btn'));
    const cleanups: Array<() => void> = [];
    buttons.forEach((button) => {
      const move = (e: MouseEvent) => {
        const r = button.getBoundingClientRect();
        button.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.08}px, ${(e.clientY - r.top - r.height / 2) * 0.08}px) scale(1.04)`;
      };
      const leave = () => { button.style.transform = ''; };
      button.addEventListener('mousemove', move);
      button.addEventListener('mouseleave', leave);
      cleanups.push(() => {
        button.removeEventListener('mousemove', move);
        button.removeEventListener('mouseleave', leave);
      });
    });
    return () => {
      observer.disconnect();
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <div className="antialiased overflow-x-hidden relative">
      <div className="orb bg-primary/30 w-[500px] h-[500px] top-[-200px] right-[-100px]" />
      <div className="orb bg-cyan/20 w-[400px] h-[400px] bottom-[-160px] left-[-80px]" />

      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-8 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="glass border-flow rounded-[2rem] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl glass flex items-center justify-center">
                <Icon icon="solar:radar-bold-duotone" className="text-2xl text-primary" />
              </div>
              <div>
                <p className="font-semibold tracking-tight">FleetIQ</p>
                <p className="text-xs text-muted">Fleet command for African logistics</p>
              </div>
            </div>
            <nav className="hidden lg:flex items-center gap-2">
              <a href="#platform" className="px-4 py-2 rounded-full text-sm text-muted hover:text-white transition">Platform</a>
              <a href="#intelligence" className="px-4 py-2 rounded-full text-sm text-muted hover:text-white transition">Intelligence</a>
              <a href="#system" className="px-4 py-2 rounded-full text-sm text-muted hover:text-white transition">Fleet OS</a>
            </nav>
            <a href="/login" className="liquid-btn glass border-flow rounded-full px-6 py-3 text-sm font-medium hover:scale-105 transition inline-block">
              Open live demo
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* ── hero ─────────────────────────────────────────── */}
        <section className="min-h-screen relative flex items-center px-5 md:px-8 overflow-hidden">
          <div className="max-w-7xl mx-auto w-full grid xl:grid-cols-[.8fr_1.2fr] gap-20 items-center">
            <div className="relative z-10 pt-32">
              <div className="glass inline-flex items-center gap-3 px-4 py-2 rounded-full mb-8 border-flow">
                <div className="w-2 h-2 rounded-full bg-cyan animate-pulse" />
                <span className="text-sm text-muted">Live fleet operations · Johannesburg</span>
              </div>

              <h1 className="text-[3.2rem] sm:text-[4.6rem] lg:text-[6rem] leading-[.92] tracking-[-.07em] font-semibold max-w-4xl">
                Your entire fleet, <span className="kinetic">live</span> on one screen.
              </h1>

              <p className="mt-8 max-w-xl text-lg text-muted leading-relaxed">
                Realtime GPS tracking, smart dispatch, geofence alerts and fuel-theft
                detection — no hardware required, just your drivers' phones.
              </p>

              <div className="mt-12 flex flex-wrap gap-4">
                <a href="/login" className="liquid-btn glass border-flow rounded-full px-7 py-4 font-medium hover:scale-105 transition inline-block">
                  Launch the demo
                </a>
                <a href="#platform" className="rounded-full px-7 py-4 border border-white/10 bg-white/[.03] hover:bg-white/[.06] transition inline-block">
                  See the platform
                </a>
              </div>

              <div className="xl:hidden mt-10 glass border-flow noise rounded-[2rem] overflow-hidden relative">
                <video autoPlay muted loop playsInline className="w-full h-56 object-cover">
                  <source src="/video.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 glass rounded-full px-4 py-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs tracking-wide text-muted">Live fleet feed</span>
                </div>
              </div>

              <div className="mt-20 grid sm:grid-cols-3 gap-5">
                <div className="glass border-flow rounded-[2rem] p-5">
                  <p className="text-4xl font-semibold tracking-tight">15s</p>
                  <p className="text-sm text-muted mt-2">GPS refresh per vehicle</p>
                </div>
                <div className="glass border-flow rounded-[2rem] p-5">
                  <p className="text-4xl font-semibold tracking-tight">100m</p>
                  <p className="text-sm text-muted mt-2">fuel-fraud geo-tolerance</p>
                </div>
                <div className="glass border-flow rounded-[2rem] p-5">
                  <p className="text-4xl font-semibold tracking-tight">24/7</p>
                  <p className="text-sm text-muted mt-2">geofence &amp; OBD watch</p>
                </div>
              </div>
            </div>

            <div className="relative hidden xl:block min-h-[860px]">
              <div className="portal absolute right-[-80px] top-20 w-[760px] h-[760px]">
                <div className="absolute top-[-40px] left-[-60px] glass border-flow rounded-[2rem] p-5 z-30 floating-card">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-white/[.05] flex items-center justify-center">
                      <Icon icon="solar:fuel-bold-duotone" className="text-3xl text-cyan" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Fuel fraud flagged</p>
                      <p className="text-2xl font-semibold">FC-1002 · 16.7 km off</p>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-10 left-[-100px] w-[260px] glass border-flow rounded-[2rem] p-6 z-30">
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-sm text-muted">Fleet health</p>
                    <div className="w-3 h-3 rounded-full bg-cyan animate-pulse" />
                  </div>
                  <div className="space-y-4">
                    <div className="h-3 rounded-full bg-white/[.06] overflow-hidden">
                      <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-primary to-cyan" />
                    </div>
                    <div className="h-3 rounded-full bg-white/[.06] overflow-hidden">
                      <div className="h-full w-[74%] rounded-full bg-gradient-to-r from-pink to-primary" />
                    </div>
                    <div className="h-3 rounded-full bg-white/[.06] overflow-hidden">
                      <div className="h-full w-[88%] rounded-full bg-gradient-to-r from-cyan to-white" />
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-muted">JTR 452 GP · 64 km/h · en route</p>
                </div>

                <div className="glass border-flow noise rounded-[4rem] overflow-hidden absolute inset-0 shadow-liquid">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[.08] via-transparent to-transparent z-10" />
                  <video autoPlay muted loop playsInline className="w-full h-full object-cover mask-video">
                    <source src="/video.mp4" type="video/mp4" />
                  </video>
                  <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-10 right-10 z-20">
                    <div className="glass rounded-full px-5 py-3 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs tracking-wide text-muted">6 vehicles reporting</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── platform ─────────────────────────────────────── */}
        <section id="platform" className="relative py-40 px-5 md:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-20 reveal">
              <p className="uppercase tracking-[.25em] text-xs text-muted mb-5">Live Operations</p>
              <h2 className="text-5xl md:text-7xl tracking-[-.07em] leading-none font-semibold max-w-5xl">
                Dispatch that sees everything.
              </h2>
            </div>

            <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-7">
              <div className="glass border-flow rounded-[3rem] p-8 md:p-10 tilt reveal">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <p className="text-sm text-muted">Command Centre</p>
                    <h3 className="text-3xl font-semibold mt-2">Every job, every vehicle, one board</h3>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-white/[.04] flex items-center justify-center">
                    <Icon icon="solar:map-point-wave-bold-duotone" className="text-3xl text-primary" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="rounded-[2rem] bg-white/[.03] border border-white/[.06] p-6">
                    <p className="text-muted text-sm">Map latency</p>
                    <p className="mt-4 text-4xl tracking-tight font-semibold">&lt;3s</p>
                    <p className="mt-3 text-sm text-muted leading-relaxed">WebSocket push from driver phone to dispatch map.</p>
                  </div>
                  <div className="rounded-[2rem] bg-white/[.03] border border-white/[.06] p-6">
                    <p className="text-muted text-sm">Proof of delivery</p>
                    <p className="mt-4 text-4xl tracking-tight font-semibold">Photo + sign</p>
                    <p className="mt-3 text-sm text-muted leading-relaxed">Captured on the driver's phone, attached to the job instantly.</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-7">
                <div className="glass border-flow rounded-[2.5rem] p-8 reveal">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-muted text-sm">Driver App</p>
                      <h4 className="mt-3 text-2xl font-semibold">Accept → arrive → deliver</h4>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white/[.04] flex items-center justify-center">
                      <Icon icon="solar:phone-bold-duotone" className="text-2xl text-cyan" />
                    </div>
                  </div>
                  <p className="mt-6 text-muted leading-relaxed">
                    One-tap job flow with offline GPS queueing for coverage gaps on real South African routes.
                  </p>
                </div>

                <div className="glass border-flow rounded-[2.5rem] p-8 reveal">
                  <div className="flex items-center justify-between mb-8">
                    <p className="text-muted text-sm">Deliveries on time</p>
                    <p className="text-sm text-cyan">+24% this month</p>
                  </div>
                  <div className="h-44 flex items-end gap-3">
                    <div className="w-full rounded-t-[1.5rem] bg-white/[.06] h-[30%]" />
                    <div className="w-full rounded-t-[1.5rem] bg-white/[.08] h-[55%]" />
                    <div className="w-full rounded-t-[1.5rem] bg-white/[.1] h-[76%]" />
                    <div className="w-full rounded-t-[1.5rem] bg-gradient-to-t from-primary/70 to-cyan/70 h-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── intelligence ─────────────────────────────────── */}
        <section id="intelligence" className="relative py-36 px-5 md:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="reveal">
                <p className="uppercase tracking-[.25em] text-xs text-muted mb-5">Fleet Intelligence</p>
                <h2 className="text-5xl md:text-6xl tracking-[-.07em] leading-[.95] font-semibold">
                  Signals, not noise.
                </h2>
                <p className="mt-8 max-w-xl text-muted leading-relaxed text-lg">
                  The platform reconciles fuel swipes against GPS trails, decodes engine
                  faults into plain English and watches your zones around the clock.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6 reveal">
                {[
                  ['solar:card-transfer-bold-duotone', 'Fuel theft detection', 'Every card swipe is cross-checked against where the truck actually was.'],
                  ['solar:danger-triangle-bold-duotone', 'OBD-II in plain English', 'P0300 becomes "engine misfire — check spark plugs" before it strands a driver.'],
                  ['solar:map-arrow-square-bold-duotone', 'Geofences', 'Depot, customer and no-go zones with instant enter/exit alerts.'],
                  ['solar:document-medicine-bold-duotone', 'Compliance watch', 'Licence discs, roadworthy and PrDP expiries flagged before they lapse.'],
                ].map(([icon, title, body]) => (
                  <div key={title} className="glass border-flow rounded-[2rem] p-7">
                    <div className="w-14 h-14 rounded-2xl bg-white/[.05] flex items-center justify-center mb-8">
                      <Icon icon={icon} className="text-3xl text-cyan" />
                    </div>
                    <h4 className="text-2xl font-semibold">{title}</h4>
                    <p className="mt-4 text-muted text-sm leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── system ───────────────────────────────────────── */}
        <section id="system" className="relative py-40 px-5 md:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="glass border-flow rounded-[3rem] p-8 md:p-14 overflow-hidden relative">
              <div className="absolute top-[-100px] left-[-60px] w-[320px] h-[320px] rounded-full bg-primary/10 blur-[120px]" />
              <div className="grid lg:grid-cols-[1fr_.8fr] gap-12 items-center relative z-10">
                <div>
                  <p className="uppercase tracking-[.25em] text-xs text-muted mb-5">Built for African roads</p>
                  <h2 className="text-5xl md:text-7xl tracking-[-.07em] leading-none font-semibold max-w-3xl">
                    No hardware. No contracts. Just phones.
                  </h2>
                  <p className="mt-8 text-lg text-muted max-w-xl leading-relaxed">
                    The driver's phone is the tracker, the job terminal and the POD scanner.
                    Offline-first for dead zones, privacy-first for POPIA.
                  </p>
                </div>
                <div className="space-y-5">
                  {[
                    ['solar:wi-fi-router-bold-duotone', 'Offline queue', 'GPS fixes buffer on-device and flush when signal returns', 'text-cyan'],
                    ['solar:shield-user-bold-duotone', 'POPIA ready', 'Off-duty toggle pauses tracking — drivers own their location', 'text-pink'],
                    ['solar:route-bold-duotone', 'Roadmap', 'Driver scoring · route optimisation · SARS logbook · tracking links', 'text-primary'],
                  ].map(([icon, title, body, color]) => (
                    <div key={title} className="glass rounded-[2rem] p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted">{title}</p>
                          <h4 className="text-xl font-semibold mt-2">{body}</h4>
                        </div>
                        <Icon icon={icon} className={`text-4xl ${color} shrink-0 ml-4`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-5 md:px-8 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="glass border-flow rounded-[2rem] px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/[.05] flex items-center justify-center">
                <Icon icon="solar:radar-bold-duotone" className="text-2xl text-primary" />
              </div>
              <div>
                <p className="font-medium">FleetIQ</p>
                <p className="text-xs text-muted">Fleet command for African logistics</p>
              </div>
            </div>
            <p className="text-sm text-muted">© 2026 FleetIQ — Demo build · Johannesburg, ZA</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
