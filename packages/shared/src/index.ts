export type Role = 'admin' | 'dispatcher' | 'driver';

export interface User {
  id: number;
  org_id: number;
  email: string;
  name: string;
  role: Role;
  phone: string | null;
  created_at: string;
}

export type VehicleStatus = 'active' | 'idle' | 'offline' | 'maintenance';

export interface Vehicle {
  id: number;
  org_id: number;
  reg_number: string;
  make: string;
  model: string;
  year: number | null;
  fuel_tank_litres: number | null;
  status: VehicleStatus;
  driver_id: number | null;
  driver_name?: string | null;
  current_lat: number | null;
  current_lng: number | null;
  current_speed: number | null;
  current_heading: number | null;
  last_seen_at: string | null;
}

export type JobStatus =
  | 'pending'
  | 'assigned'
  | 'accepted'
  | 'en_route'
  | 'arrived'
  | 'completed'
  | 'cancelled';

export interface Job {
  id: number;
  ref: string;
  title: string;
  description: string | null;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  status: JobStatus;
  driver_id: number | null;
  driver_name?: string | null;
  vehicle_id: number | null;
  scheduled_at: string | null;
  created_at: string;
  completed_at: string | null;
  pod_photo_path: string | null;
  pod_signature_path: string | null;
  pod_notes: string | null;
}

export interface VehiclePosition {
  id: number;
  vehicle_id: number;
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  recorded_at: string;
}

export type FuelStatus = 'ok' | 'suspicious' | 'unchecked';

export interface FuelTransaction {
  id: number;
  vehicle_id: number | null;
  card_number: string | null;
  station_name: string;
  station_lat: number;
  station_lng: number;
  litres: number;
  amount: number;
  currency: string;
  txn_at: string;
  status: FuelStatus;
  flag_reason: string | null;
  distance_m: number | null;
}

export interface Geofence {
  id: number;
  name: string;
  type: 'depot' | 'customer' | 'no_go';
  lat: number;
  lng: number;
  radius_m: number;
}

export interface Alert {
  id: number;
  type: 'geofence' | 'fuel_fraud' | 'dtc' | 'document' | 'job' | 'system';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  body: string | null;
  vehicle_id: number | null;
  job_id: number | null;
  read: number;
  created_at: string;
}

export interface Document {
  id: number;
  entity_type: 'vehicle' | 'driver';
  entity_id: number;
  entity_name?: string;
  doc_type: string;
  expiry_date: string;
  days_left?: number;
}

export interface DtcReading {
  id: number;
  vehicle_id: number;
  reg_number?: string;
  code: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  read_at: string;
  acknowledged: number;
}

export interface Stats {
  vehicles_total: number;
  vehicles_active: number;
  jobs_today: number;
  jobs_active: number;
  jobs_completed_today: number;
  unread_alerts: number;
  suspicious_fuel: number;
  km_today: number;
}

// WebSocket broadcast payloads
export type WsEvent =
  | { type: 'position'; vehicle: Vehicle }
  | { type: 'alert'; alert: Alert }
  | { type: 'job'; job: Job };

// Position ingest payload from driver app / simulator
export interface PositionIngest {
  vehicle_id: number;
  client_id?: string;   // idempotency key — retries with same key are ignored
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  recorded_at?: string;
}
