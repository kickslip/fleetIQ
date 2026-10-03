import { db } from './db.js';
import { haversineM } from './geo.js';
import { broadcast } from './ws.js';
import { createAlert } from './alerts.js';
import type { Geofence, PositionIngest, Vehicle } from '@fleet/shared';

export function getVehicle(id: number, orgId: number): Vehicle | undefined {
  return db
    .prepare(
      `SELECT v.*, u.name AS driver_name FROM vehicles v
       LEFT JOIN users u ON u.id = v.driver_id WHERE v.id = ? AND v.org_id = ?`
    )
    .get(id, orgId) as unknown as Vehicle | undefined;
}

export function listVehicles(orgId: number): Vehicle[] {
  return db
    .prepare(
      `SELECT v.*, u.name AS driver_name FROM vehicles v
       LEFT JOIN users u ON u.id = v.driver_id WHERE v.org_id = ? ORDER BY v.id`
    )
    .all(orgId) as unknown as Vehicle[];
}

const getFences = (orgId: number) =>
  db.prepare('SELECT * FROM geofences WHERE org_id = ?').all(orgId) as unknown as Geofence[];
const insideSet = (vehicleId: number) =>
  new Set(
    (
      db
        .prepare('SELECT geofence_id FROM vehicle_geofence_state WHERE vehicle_id = ?')
        .all(vehicleId) as unknown as { geofence_id: number }[]
    ).map((r) => r.geofence_id)
  );

function checkGeofences(vehicle: Vehicle, lat: number, lng: number, at: string) {
  const now = insideSet(vehicle.id);
  for (const fence of getFences(vehicle.org_id)) {
    const inside = haversineM(lat, lng, fence.lat, fence.lng) <= fence.radius_m;
    const was = now.has(fence.id);
    if (inside && !was) {
      db.prepare(
        'INSERT OR IGNORE INTO vehicle_geofence_state (vehicle_id, geofence_id) VALUES (?, ?)'
      ).run(vehicle.id, fence.id);
      db.prepare(
        'INSERT INTO geofence_events (org_id, geofence_id, vehicle_id, event, at) VALUES (?, ?, ?, ?, ?)'
      ).run(vehicle.org_id, fence.id, vehicle.id, 'enter', at);
      createAlert({
        org_id: vehicle.org_id,
        type: 'geofence',
        severity: fence.type === 'no_go' ? 'critical' : 'info',
        title: `${vehicle.reg_number} entered ${fence.name}`,
        body: fence.type === 'no_go' ? 'Vehicle entered a restricted zone' : `Arrived at ${fence.name}`,
        vehicle_id: vehicle.id,
      });
    } else if (!inside && was) {
      db.prepare(
        'DELETE FROM vehicle_geofence_state WHERE vehicle_id = ? AND geofence_id = ?'
      ).run(vehicle.id, fence.id);
      db.prepare(
        'INSERT INTO geofence_events (org_id, geofence_id, vehicle_id, event, at) VALUES (?, ?, ?, ?, ?)'
      ).run(vehicle.org_id, fence.id, vehicle.id, 'exit', at);
      createAlert({
        org_id: vehicle.org_id,
        type: 'geofence',
        severity: 'info',
        title: `${vehicle.reg_number} left ${fence.name}`,
        vehicle_id: vehicle.id,
      });
    }
  }
}

// Idempotent: a fix with the same (vehicle_id, client_id) is ignored on retry,
// so offline queue flushes can safely be resent.
export function ingestPositions(orgId: number, positions: PositionIngest[]) {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO vehicle_positions
       (org_id, vehicle_id, client_id, lat, lng, speed, heading, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const update = db.prepare(
    `UPDATE vehicles SET current_lat = ?, current_lng = ?, current_speed = ?,
       current_heading = ?, last_seen_at = ?, status = 'active' WHERE id = ? AND org_id = ?`
  );
  const owns = db.prepare('SELECT 1 FROM vehicles WHERE id = ? AND org_id = ?');

  let ingested = 0;
  let duplicates = 0;
  let rejected = 0;
  for (const p of positions) {
    // Tenant check: silently drop positions for vehicles outside this org
    if (!owns.get(p.vehicle_id, orgId)) { rejected++; continue; }
    const at = p.recorded_at ?? new Date().toISOString();
    const res = insert.run(orgId, p.vehicle_id, p.client_id ?? null, p.lat, p.lng,
      p.speed ?? null, p.heading ?? null, at);
    if (res.changes === 0) { duplicates++; continue; }
    ingested++;
    update.run(p.lat, p.lng, p.speed ?? null, p.heading ?? null, at, p.vehicle_id, orgId);
    const vehicle = getVehicle(p.vehicle_id, orgId);
    if (!vehicle) continue;
    checkGeofences(vehicle, p.lat, p.lng, at);
    broadcast({ type: 'position', vehicle }, orgId);
  }
  return { ingested, duplicates, rejected };
}
