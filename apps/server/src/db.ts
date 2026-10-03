import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.join(root, '..', 'data');
export const UPLOADS_DIR = path.join(root, '..', 'uploads');
mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(UPLOADS_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, 'fleet.db'));

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','dispatcher','driver')),
  phone TEXT,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id),
  reg_number TEXT UNIQUE NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  fuel_tank_litres INTEGER DEFAULT 80,
  fuel_card_number TEXT,
  status TEXT NOT NULL DEFAULT 'offline',
  driver_id INTEGER REFERENCES users(id),
  current_lat REAL,
  current_lng REAL,
  current_speed REAL,
  current_heading REAL,
  last_seen_at TEXT
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id),
  ref TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  pickup_address TEXT NOT NULL,
  pickup_lat REAL NOT NULL,
  pickup_lng REAL NOT NULL,
  dropoff_address TEXT NOT NULL,
  dropoff_lat REAL NOT NULL,
  dropoff_lng REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','assigned','accepted','en_route','arrived','completed','cancelled')),
  driver_id INTEGER REFERENCES users(id),
  vehicle_id INTEGER REFERENCES vehicles(id),
  scheduled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  pod_photo_path TEXT,
  pod_signature_path TEXT,
  pod_notes TEXT,
  UNIQUE (org_id, ref)
);

CREATE TABLE IF NOT EXISTS vehicle_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id),
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  client_id TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  speed REAL,
  heading REAL,
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_positions_vehicle_time ON vehicle_positions(vehicle_id, recorded_at);

CREATE TABLE IF NOT EXISTS fuel_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id),
  vehicle_id INTEGER REFERENCES vehicles(id),
  card_number TEXT,
  station_name TEXT NOT NULL,
  station_lat REAL NOT NULL,
  station_lng REAL NOT NULL,
  litres REAL NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  txn_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unchecked',
  flag_reason TEXT,
  distance_m REAL,
  dedupe_key TEXT
);

CREATE TABLE IF NOT EXISTS geofences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'depot' CHECK(type IN ('depot','customer','no_go')),
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  radius_m REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicle_geofence_state (
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  geofence_id INTEGER NOT NULL REFERENCES geofences(id),
  PRIMARY KEY (vehicle_id, geofence_id)
);

CREATE TABLE IF NOT EXISTS geofence_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id),
  geofence_id INTEGER NOT NULL REFERENCES geofences(id),
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  event TEXT NOT NULL CHECK(event IN ('enter','exit')),
  at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id),
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT,
  vehicle_id INTEGER,
  job_id INTEGER,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id),
  entity_type TEXT NOT NULL CHECK(entity_type IN ('vehicle','driver')),
  entity_id INTEGER NOT NULL,
  doc_type TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS dtc_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id),
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  read_at TEXT NOT NULL DEFAULT (datetime('now')),
  acknowledged INTEGER NOT NULL DEFAULT 0
);
`);

// Lightweight migration: add org_id / dedupe columns to DBs created before
// multi-tenancy existed. Backfills everything to org 1.
function ensureColumn(table: string, column: string, ddl: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as unknown as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}
for (const t of [
  'users', 'vehicles', 'jobs', 'vehicle_positions', 'fuel_transactions',
  'geofences', 'geofence_events', 'alerts', 'documents', 'dtc_readings',
]) {
  // NB: SQLite forbids REFERENCES + non-NULL default in ALTER — plain column only.
  ensureColumn(t, 'org_id', 'org_id INTEGER NOT NULL DEFAULT 1');
}
ensureColumn('vehicle_positions', 'client_id', 'client_id TEXT');
ensureColumn('fuel_transactions', 'dedupe_key', 'dedupe_key TEXT');

// Idempotency indexes — created after migrations so the columns always exist.
db.exec(`
CREATE UNIQUE INDEX IF NOT EXISTS idx_positions_client_id
  ON vehicle_positions(vehicle_id, client_id) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_fuel_dedupe
  ON fuel_transactions(org_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
`);
