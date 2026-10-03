import { db } from './db.js';
import { ingestPositions, listVehicles } from './ingest.js';
import type { PositionIngest } from '@fleet/shared';

// Johannesburg CBD — demo fleet drives around here.
const CENTER = { lat: -26.2041, lng: 28.0473 };
const TICK_MS = 3000;

interface SimVehicle {
  orgId: number;
  vehicleId: number;
  route: { lat: number; lng: number }[];
  segment: number;
  t: number; // 0..1 progress along current segment
  speedKmh: number;
}

let timer: NodeJS.Timeout | null = null;
let sims: SimVehicle[] = [];

function makeRoute(via?: { lat: number; lng: number }): { lat: number; lng: number }[] {
  // Random polygon loop 3–9 km across around the city centre.
  const points: { lat: number; lng: number }[] = [];
  const n = 4 + Math.floor(Math.random() * 4);
  const baseAngle = Math.random() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const angle = baseAngle + (i / n) * Math.PI * 2;
    const r = 0.02 + Math.random() * 0.05; // ~2–6 km in degrees
    points.push({
      lat: CENTER.lat + r * Math.cos(angle),
      lng: CENTER.lng + r * Math.sin(angle),
    });
  }
  // Route through a geofence: start ~800 m outside it, drive in on leg 1,
  // so entry/exit alerts fire within about a minute of starting the sim.
  if (via) {
    const jitter = 0.008;
    return [
      { lat: via.lat + jitter * (Math.random() - 0.3), lng: via.lng + jitter * (Math.random() + 0.5) },
      { ...via },
      ...points,
    ];
  }
  return points;
}

function tick() {
  const byOrg = new Map<number, PositionIngest[]>();
  for (const s of sims) {
    const a = s.route[s.segment];
    const b = s.route[(s.segment + 1) % s.route.length];
    s.t += (s.speedKmh / 3600) * (TICK_MS / 1000) / (dist(a, b) / 1000 || 1);
    if (s.t >= 1) {
      s.t = 0;
      s.segment = (s.segment + 1) % s.route.length;
    }
    const lat = a.lat + (b.lat - a.lat) * s.t;
    const lng = a.lng + (b.lng - a.lng) * s.t;
    const heading = Math.atan2(b.lng - a.lng, b.lat - a.lat) * (180 / Math.PI);
    const batch = byOrg.get(s.orgId) ?? [];
    batch.push({ vehicle_id: s.vehicleId, lat, lng, speed: s.speedKmh, heading });
    byOrg.set(s.orgId, batch);
  }
  for (const [orgId, positions] of byOrg) ingestPositions(orgId, positions);
}

function dist(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function startSim(): { running: boolean; vehicles: number } {
  if (timer) return { running: true, vehicles: sims.length };
  const orgs = db.prepare('SELECT DISTINCT org_id FROM vehicles').all() as unknown as { org_id: number }[];
  sims = [];
  for (const { org_id } of orgs) {
    const vehicles = listVehicles(org_id);
    const fences = db
      .prepare('SELECT lat, lng FROM geofences WHERE org_id = ? ORDER BY RANDOM()')
      .all(org_id) as unknown as { lat: number; lng: number }[];
    for (const [i, v] of vehicles.entries()) {
      sims.push({
        orgId: org_id,
        vehicleId: v.id,
        // Every 3rd vehicle is routed through a geofence — guarantees demo alerts
        route: makeRoute(fences.length && i % 3 === 0 ? fences[i % fences.length] : undefined),
        segment: 0,
        t: 0,
        speedKmh: 25 + Math.random() * 45,
      });
    }
  }
  timer = setInterval(tick, TICK_MS);
  return { running: true, vehicles: sims.length };
}

export function stopSim() {
  if (timer) clearInterval(timer);
  timer = null;
  sims = [];
  db.prepare(`UPDATE vehicles SET status = 'idle'`).run();
  return { running: false };
}

export function simStatus() {
  return { running: timer !== null, vehicles: sims.length };
}
