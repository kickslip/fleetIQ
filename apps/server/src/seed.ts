// Demo seed — shared by scripts/seed.ts and the SEED_ON_BOOT server flag.
// Creates TWO organizations (proves tenant isolation), users, vehicles,
// geofences, jobs, documents and historical GPS for the fuel-fraud demo.
import { db } from './db.js';
import { hashPassword } from './auth.js';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export function dbIsEmpty(): boolean {
  const row = db.prepare('SELECT COUNT(*) c FROM users').get() as { c: number };
  return row.c === 0;
}

export function seed() {
  for (const t of [
    'geofence_events', 'vehicle_geofence_state', 'fuel_transactions',
    'vehicle_positions', 'dtc_readings', 'alerts', 'documents',
    'geofences', 'jobs', 'vehicles', 'users', 'organizations',
  ]) {
    db.prepare(`DELETE FROM ${t}`).run();
  }

  const insOrg = db.prepare('INSERT INTO organizations (name) VALUES (?)');
  const org1 = insOrg.run('Velocity Logistics (Pty) Ltd').lastInsertRowid as number;
  const org2 = insOrg.run('Cape Couriers CC').lastInsertRowid as number;

  const insUser = db.prepare(
    'INSERT INTO users (org_id, email, name, role, phone, password_hash) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const pw = hashPassword('demo123');
  insUser.run(org1, 'admin@fleet.demo', 'Thandi Mokoena', 'admin', '+27 82 111 0001', pw);
  insUser.run(org1, 'dispatch@fleet.demo', 'Pieter van Wyk', 'dispatcher', '+27 82 111 0002', pw);
  const d1 = insUser.run(org1, 'sipho@fleet.demo', 'Sipho Ndlovu', 'driver', '+27 82 111 0003', pw).lastInsertRowid as number;
  const d2 = insUser.run(org1, 'john@fleet.demo', 'John Petersen', 'driver', '+27 82 111 0004', pw).lastInsertRowid as number;
  const d3 = insUser.run(org1, 'amahle@fleet.demo', 'Amahle Dlamini', 'driver', '+27 82 111 0005', pw).lastInsertRowid as number;
  const d4 = insUser.run(org1, 'koos@fleet.demo', 'Koos Botha', 'driver', '+27 82 111 0006', pw).lastInsertRowid as number;

  // Second org — different company, must never see org1 data
  insUser.run(org2, 'admin@cape.demo', 'Lerato Jacobs', 'admin', '+27 83 222 0001', pw);
  const cd1 = insUser.run(org2, 'driver@cape.demo', 'Marius Smit', 'driver', '+27 83 222 0002', pw).lastInsertRowid as number;

  const insVehicle = db.prepare(
    `INSERT INTO vehicles (org_id, reg_number, make, model, year, fuel_tank_litres, fuel_card_number, driver_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'idle')`
  );
  const v1 = insVehicle.run(org1, 'JTR 452 GP', 'Toyota', 'Hilux 2.4', 2022, 80, 'FC-1001', d1).lastInsertRowid as number;
  const v2 = insVehicle.run(org1, 'KZN 881 GP', 'Isuzu', 'NPR 400', 2021, 100, 'FC-1002', d2).lastInsertRowid as number;
  const v3 = insVehicle.run(org1, 'GP 233 LK', 'Ford', 'Transit', 2023, 70, 'FC-1003', d3).lastInsertRowid as number;
  const v4 = insVehicle.run(org1, 'CA 902 114', 'Hino', '300 Series', 2020, 120, 'FC-1004', d4).lastInsertRowid as number;
  insVehicle.run(org1, 'GP 771 XM', 'Nissan', 'NP200', 2019, 60, 'FC-1005', null);
  insVehicle.run(org1, 'GP 118 RT', 'Mercedes-Benz', 'Sprinter', 2022, 90, 'FC-1006', null);
  const cv1 = insVehicle.run(org2, 'CF 221 904', 'Kia', 'K2500', 2021, 65, 'CC-9001', cd1).lastInsertRowid as number;
  insVehicle.run(org2, 'CF 332 118', 'Toyota', 'Quantum', 2023, 70, 'CC-9002', null);

  const insFence = db.prepare(
    'INSERT INTO geofences (org_id, name, type, lat, lng, radius_m) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insFence.run(org1, 'Main Depot — Germiston', 'depot', -26.2178, 28.1696, 400);
  insFence.run(org1, 'Customer — Sandton DC', 'customer', -26.1076, 28.0567, 350);
  insFence.run(org1, 'Restricted — Industrial East', 'no_go', -26.2550, 28.2500, 600);
  insFence.run(org2, 'Cape Depot — Montague Gardens', 'depot', -26.19, 28.10, 500);

  const jobs = [
    [org1, 'JOB-1001', 'Pallet delivery — Sandton', 'Sandton DC', -26.1076, 28.0567, 'Rosebank Hub', -26.1464, 28.0436, 'assigned', d1, v1],
    [org1, 'JOB-1002', 'Spare parts — Germiston', 'Germiston Depot', -26.2178, 28.1696, 'Jet Park Warehouse', -26.1500, 28.2200, 'en_route', d2, v2],
    [org1, 'JOB-1003', 'Documents — Rosebank', 'Rosebank Hub', -26.1464, 28.0436, 'Parktown Office', -26.1790, 28.0380, 'pending', null, null],
    [org1, 'JOB-1004', 'Cold chain — Midrand', 'Midrand Coldstore', -25.9950, 28.1200, 'Centurion Retail', -25.8600, 28.1890, 'pending', null, null],
    [org1, 'JOB-1005', 'Returns — OR Tambo', 'OR Tambo Cargo', -26.1392, 28.2460, 'Germiston Depot', -26.2178, 28.1696, 'assigned', d3, v3],
    [org2, 'CC-1042', 'Parcels — Parktown', 'Parktown Office', -26.1790, 28.0380, 'Braamfontein Depot', -26.1950, 28.0350, 'assigned', cd1, null],
  ] as const;
  const insJob = db.prepare(
    `INSERT INTO jobs (org_id, ref, title, pickup_address, pickup_lat, pickup_lng,
       dropoff_address, dropoff_lat, dropoff_lng, status, driver_id, vehicle_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const j of jobs) {
    insJob.run(j[0], j[1], j[2], j[3], j[4], j[5], j[6], j[7], j[8], j[9], j[10] as number | null, j[11] as number | null);
  }
  db.prepare('UPDATE jobs SET vehicle_id = (SELECT id FROM vehicles WHERE driver_id = ?) WHERE ref = ?').run(cd1, 'CC-1042');

  const insDoc = db.prepare(
    'INSERT INTO documents (org_id, entity_type, entity_id, doc_type, expiry_date, notes) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  insDoc.run(org1, 'vehicle', v1, 'license_disc', inDays(12), 'GP licence disc renewal');
  insDoc.run(org1, 'vehicle', v2, 'roadworthy', inDays(45), null);
  insDoc.run(org1, 'vehicle', v3, 'insurance', inDays(200), 'Santam commercial policy');
  insDoc.run(org1, 'vehicle', v4, 'license_disc', inDays(-5), 'EXPIRED — renew urgently');
  insDoc.run(org1, 'driver', d1, 'driver_license', inDays(400), null);
  insDoc.run(org1, 'driver', d1, 'prdp', inDays(28), 'Professional Driving Permit — goods');
  insDoc.run(org1, 'driver', d2, 'prdp', inDays(9), 'Expires soon — book renewal');
  insDoc.run(org1, 'driver', d4, 'driver_license', inDays(180), null);
  insDoc.run(org2, 'vehicle', cv1, 'roadworthy', inDays(60), null);

  // Historical GPS so the fuel-fraud demo has evidence
  const insPos = db.prepare(
    'INSERT INTO vehicle_positions (org_id, vehicle_id, lat, lng, speed, recorded_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const t = (minsAgo: number) => new Date(Date.now() - minsAgo * 60000).toISOString();
  insPos.run(org1, v1, -26.1080, 28.0570, 0, t(120));
  insPos.run(org1, v2, -26.2190, 28.1700, 12, t(95));
  insPos.run(org1, v3, -26.1460, 28.0440, 0, t(60));
  for (let i = 0; i < 30; i++) {
    insPos.run(org1, v1, -26.2041 + i * 0.001, 28.0473 + i * 0.0008, 30 + (i % 10), t(300 - i * 5));
    insPos.run(org1, v2, -26.2300 - i * 0.0009, 28.1500 + i * 0.0005, 40, t(280 - i * 4));
  }

  // Rigged fuel CSV next to the seed (kept for local upload demos)
  const swipe = (minsAgo: number) => t(minsAgo);
  const csv = `card_number,station_name,station_lat,station_lng,litres,amount,txn_at
FC-1001,Engen Sandton,-26.1080,28.0570,52.4,1250.00,${swipe(120)}
FC-1002,Engen Sandton,-26.1080,28.0570,65.0,1550.00,${swipe(95)}
FC-1003,Shell Rosebank,-26.1460,28.0440,41.2,985.50,${swipe(60)}
FC-1004,Total Edenvale,-26.1400,28.1600,78.9,1870.00,${swipe(45)}
FC-1002,Engen Sandton,-26.1080,28.0570,140.0,3350.00,${swipe(30)}
`;
  try {
    writeFileSync(path.join(here, '..', '..', '..', 'scripts', 'sample-fuel.csv'), csv);
  } catch { /* read-only fs on hosts — fine, CSV is a local convenience */ }
}
