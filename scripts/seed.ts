// Seeds the demo database: users, vehicles, geofences, jobs, documents,
// historical GPS (so fuel-fraud checks have data to work against) and a
// rigged sample fuel CSV. Safe to re-run — it clears demo data first.
import { db } from '../apps/server/src/db.js';
import { hashPassword } from '../apps/server/src/auth.js';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

console.log('Seeding demo data...');

for (const t of [
  'geofence_events', 'vehicle_geofence_state', 'fuel_transactions',
  'vehicle_positions', 'dtc_readings', 'alerts', 'documents',
  'geofences', 'jobs', 'vehicles', 'users',
]) {
  db.prepare(`DELETE FROM ${t}`).run();
}

const insUser = db.prepare(
  'INSERT INTO users (email, name, role, phone, password_hash) VALUES (?, ?, ?, ?, ?)'
);
const pw = hashPassword('demo123');
insUser.run('admin@fleet.demo', 'Thandi Mokoena', 'admin', '+27 82 111 0001', pw);
insUser.run('dispatch@fleet.demo', 'Pieter van Wyk', 'dispatcher', '+27 82 111 0002', pw);
const d1 = insUser.run('sipho@fleet.demo', 'Sipho Ndlovu', 'driver', '+27 82 111 0003', pw).lastInsertRowid as number;
const d2 = insUser.run('john@fleet.demo', 'John Petersen', 'driver', '+27 82 111 0004', pw).lastInsertRowid as number;
const d3 = insUser.run('amahle@fleet.demo', 'Amahle Dlamini', 'driver', '+27 82 111 0005', pw).lastInsertRowid as number;
const d4 = insUser.run('koos@fleet.demo', 'Koos Botha', 'driver', '+27 82 111 0006', pw).lastInsertRowid as number;

const insVehicle = db.prepare(
  `INSERT INTO vehicles (reg_number, make, model, year, fuel_tank_litres, fuel_card_number, driver_id, status)
   VALUES (?, ?, ?, ?, ?, ?, ?, 'idle')`
);
const v1 = insVehicle.run('JTR 452 GP', 'Toyota', 'Hilux 2.4', 2022, 80, 'FC-1001', d1).lastInsertRowid as number;
const v2 = insVehicle.run('KZN 881 GP', 'Isuzu', 'NPR 400', 2021, 100, 'FC-1002', d2).lastInsertRowid as number;
const v3 = insVehicle.run('GP 233 LK', 'Ford', 'Transit', 2023, 70, 'FC-1003', d3).lastInsertRowid as number;
const v4 = insVehicle.run('CA 902 114', 'Hino', '300 Series', 2020, 120, 'FC-1004', d4).lastInsertRowid as number;
insVehicle.run('GP 771 XM', 'Nissan', 'NP200', 2019, 60, 'FC-1005', null);
insVehicle.run('GP 118 RT', 'Mercedes-Benz', 'Sprinter', 2022, 90, 'FC-1006', null);

const insFence = db.prepare(
  'INSERT INTO geofences (name, type, lat, lng, radius_m) VALUES (?, ?, ?, ?, ?)'
);
insFence.run('Main Depot — Germiston', 'depot', -26.2178, 28.1696, 400);
insFence.run('Customer — Sandton DC', 'customer', -26.1076, 28.0567, 350);
insFence.run('Restricted — Industrial East', 'no_go', -26.2550, 28.2500, 600);

// Johannesburg-area job coordinates
const jobs = [
  ['JOB-1001', 'Pallet delivery — Sandton', 'Sandton DC', -26.1076, 28.0567, 'Rosebank Hub', -26.1464, 28.0436, 'assigned', d1, v1],
  ['JOB-1002', 'Spare parts — Germiston', 'Germiston Depot', -26.2178, 28.1696, 'Jet Park Warehouse', -26.1500, 28.2200, 'en_route', d2, v2],
  ['JOB-1003', 'Documents — Rosebank', 'Rosebank Hub', -26.1464, 28.0436, 'Parktown Office', -26.1790, 28.0380, 'pending', null, null],
  ['JOB-1004', 'Cold chain — Midrand', 'Midrand Coldstore', -25.9950, 28.1200, 'Centurion Retail', -25.8600, 28.1890, 'pending', null, null],
  ['JOB-1005', 'Returns — OR Tambo', 'OR Tambo Cargo', -26.1392, 28.2460, 'Germiston Depot', -26.2178, 28.1696, 'assigned', d3, v3],
] as const;
const insJob = db.prepare(
  `INSERT INTO jobs (ref, title, pickup_address, pickup_lat, pickup_lng,
     dropoff_address, dropoff_lat, dropoff_lng, status, driver_id, vehicle_id)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
for (const j of jobs) {
  insJob.run(j[0], j[1], j[2], j[3], j[4], j[5], j[6], j[7], j[8], j[9] as number | null, j[10] as number | null);
}

const insDoc = db.prepare(
  'INSERT INTO documents (entity_type, entity_id, doc_type, expiry_date, notes) VALUES (?, ?, ?, ?, ?)'
);
const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
insDoc.run('vehicle', v1, 'license_disc', inDays(12), 'GP licence disc renewal');
insDoc.run('vehicle', v2, 'roadworthy', inDays(45), null);
insDoc.run('vehicle', v3, 'insurance', inDays(200), 'Santam commercial policy');
insDoc.run('vehicle', v4, 'license_disc', inDays(-5), 'EXPIRED — renew urgently');
insDoc.run('driver', d1, 'driver_license', inDays(400), null);
insDoc.run('driver', d1, 'prdp', inDays(28), 'Professional Driving Permit — goods');
insDoc.run('driver', d2, 'prdp', inDays(9), 'Expires soon — book renewal');
insDoc.run('driver', d4, 'driver_license', inDays(180), null);

// --- Historical GPS so the fuel-fraud demo has evidence ------------------
const insPos = db.prepare(
  'INSERT INTO vehicle_positions (vehicle_id, lat, lng, speed, recorded_at) VALUES (?, ?, ?, ?, ?)'
);
const t = (minsAgo: number) => new Date(Date.now() - minsAgo * 60000).toISOString();

// v1 was AT Engen Sandton (legit swipe)
insPos.run(v1, -26.1080, 28.0570, 0, t(120));
// v2 was 8 km away in Germiston when its card was used in Sandton (FRAUD)
insPos.run(v2, -26.2190, 28.1700, 12, t(95));
// v3 was at Shell Rosebank (legit swipe)
insPos.run(v3, -26.1460, 28.0440, 0, t(60));
// v4 has NO recent GPS (flagged: location unknown)
// A little general history for trips playback
for (let i = 0; i < 30; i++) {
  insPos.run(v1, -26.2041 + i * 0.001, 28.0473 + i * 0.0008, 30 + (i % 10), t(300 - i * 5));
  insPos.run(v2, -26.2300 - i * 0.0009, 28.1500 + i * 0.0005, 40, t(280 - i * 4));
}

// --- Rigged fuel CSV ------------------------------------------------------
const swipe = (minsAgo: number) => t(minsAgo);
const csv = `card_number,station_name,station_lat,station_lng,litres,amount,txn_at
FC-1001,Engen Sandton,-26.1080,28.0570,52.4,1250.00,${swipe(120)}
FC-1002,Engen Sandton,-26.1080,28.0570,65.0,1550.00,${swipe(95)}
FC-1003,Shell Rosebank,-26.1460,28.0440,41.2,985.50,${swipe(60)}
FC-1004,Total Edenvale,-26.1400,28.1600,78.9,1870.00,${swipe(45)}
FC-1002,Engen Sandton,-26.1080,28.0570,140.0,3350.00,${swipe(30)}
`;
writeFileSync(path.join(here, 'sample-fuel.csv'), csv);

console.log(`
Seed complete. Login credentials (all passwords: demo123):
  admin@fleet.demo     — admin portal
  dispatch@fleet.demo  — dispatcher
  sipho@fleet.demo     — driver (vehicle JTR 452 GP)
  john@fleet.demo      — driver (vehicle KZN 881 GP)
  amahle@fleet.demo    — driver (vehicle GP 233 LK)
  koos@fleet.demo      — driver (vehicle CA 902 114)

Upload scripts/sample-fuel.csv on the Fuel page to see fraud detection:
  - FC-1002 swipe in Sandton while vehicle was in Germiston → SUSPICIOUS
  - FC-1004 swipe with no GPS coverage → SUSPICIOUS
  - FC-1002 second swipe of 140L > 100L tank → SUSPICIOUS
`);
