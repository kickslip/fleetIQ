import { db } from './db.js';
import { haversineM } from './geo.js';
import { broadcast } from './ws.js';
import { createAlert } from './alerts.js';
import type { Geofence, PositionIngest, Vehicle } from '@fleet/shared';

export function getVehicle(id: number): Vehicle | undefined {
  return db
    .prepare(
      `SELECT v.*, u.name AS driver_name FROM vehicles v
       LEFT JOIN users u ON u.id = v.driver_id WHERE v.id = ?`
    )
    .get(id) as unknown as Vehicle | undefined;
}

export function listVehicles(): Vehicle[] {
  return db
    .prepare(
      `SELECT v.*, u.name AS driver_name FROM vehicles v
       LEFT JOIN users u ON u.id = v.driver_id ORDER BY v.id`
    )
    .all() as unknown as Vehicle[];
}

const getFences = () =>
  db.prepare('SELECT * FROM geofences').all() as unknown as Geofence[];
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
  for (const fence of getFences()) {
    const inside = haversineM(lat, lng, fence.lat, fence.lng) <= fence.radius_m;
    const was = now.has(fence.id);
    if (inside && !was) {
      db.prepare(
        'INSERT OR IGNORE INTO vehicle_geofence_state (vehicle_id, geofence_id) VALUES (?, ?)'
      ).run(vehicle.id, fence.id);
      db.prepare(
        'INSERT INTO geofence_events (geofence_id, vehicle_id, event, at) VALUES (?, ?, ?, ?)'
      ).run(fence.id, vehicle.id, 'enter', at);
      createAlert({
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
        'INSERT INTO geofence_events (geofence_id, vehicle_id, event, at) VALUES (?, ?, ?, ?)'
      ).run(fence.id, vehicle.id, 'exit', at);
      createAlert({
        type: 'geofence',
        severity: 'info',
        title: `${vehicle.reg_number} left ${fence.name}`,
        vehicle_id: vehicle.id,
      });
    }
  }
}

export function ingestPositions(positions: PositionIngest[]) {
  const insert = db.prepare(
    `INSERT INTO vehicle_positions (vehicle_id, lat, lng, speed, heading, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const update = db.prepare(
    `UPDATE vehicles SET current_lat = ?, current_lng = ?, current_speed = ?,
       current_heading = ?, last_seen_at = ?, status = 'active' WHERE id = ?`
  );

  for (const p of positions) {
    const at = p.recorded_at ?? new Date().toISOString();
    insert.run(p.vehicle_id, p.lat, p.lng, p.speed ?? null, p.heading ?? null, at);
    update.run(p.lat, p.lng, p.speed ?? null, p.heading ?? null, at, p.vehicle_id);
    const vehicle = getVehicle(p.vehicle_id);
    if (!vehicle) continue;
    checkGeofences(vehicle, p.lat, p.lng, at);
    broadcast({ type: 'position', vehicle });
  }
  return { ingested: positions.length };
}
