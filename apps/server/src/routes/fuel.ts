import type { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { haversineM } from '../geo.js';
import { createAlert } from '../alerts.js';
import Papa from 'papaparse';
import type { FuelTransaction } from '@fleet/shared';

const PROXIMITY_M = 100;       // vehicle must be within 100 m of station
const WINDOW_MIN = 20;         // within ±20 min of the card swipe

function checkTransaction(txn: FuelTransaction): Pick<FuelTransaction, 'status' | 'flag_reason' | 'distance_m'> {
  if (!txn.vehicle_id) {
    return { status: 'suspicious', flag_reason: 'Card not linked to any vehicle', distance_m: null };
  }
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(txn.vehicle_id) as
    | { reg_number: string; fuel_tank_litres: number | null }
    | undefined;
  if (vehicle?.fuel_tank_litres && txn.litres > vehicle.fuel_tank_litres) {
    return {
      status: 'suspicious',
      flag_reason: `${txn.litres}L exceeds ${vehicle.fuel_tank_litres}L tank capacity`,
      distance_m: null,
    };
  }
  // Nearest GPS fix within the swipe window
  const pos = db
    .prepare(
      `SELECT lat, lng, recorded_at,
         ABS(strftime('%s', recorded_at) - strftime('%s', ?)) AS gap_s
       FROM vehicle_positions
       WHERE vehicle_id = ? AND gap_s <= ?
       ORDER BY gap_s ASC LIMIT 1`
    )
    .get(txn.txn_at, txn.vehicle_id, WINDOW_MIN * 60) as
    | { lat: number; lng: number; recorded_at: string; gap_s: number }
    | undefined;
  if (!pos) {
    return { status: 'suspicious', flag_reason: 'No GPS data near swipe time — vehicle location unknown', distance_m: null };
  }
  const d = haversineM(txn.station_lat, txn.station_lng, pos.lat, pos.lng);
  if (d > PROXIMITY_M) {
    return {
      status: 'suspicious',
      flag_reason: `Vehicle was ${(d / 1000).toFixed(1)} km from station at swipe time`,
      distance_m: Math.round(d),
    };
  }
  return { status: 'ok', flag_reason: null, distance_m: Math.round(d) };
}

export function runFraudCheck(txnId: number) {
  const txn = db.prepare('SELECT * FROM fuel_transactions WHERE id = ?').get(txnId) as unknown as
    FuelTransaction | undefined;
  if (!txn) return;
  const verdict = checkTransaction(txn);
  db.prepare('UPDATE fuel_transactions SET status = ?, flag_reason = ?, distance_m = ? WHERE id = ?')
    .run(verdict.status, verdict.flag_reason, verdict.distance_m, txnId);
  if (verdict.status === 'suspicious') {
    const reg = txn.vehicle_id
      ? (db.prepare('SELECT reg_number FROM vehicles WHERE id = ?').get(txn.vehicle_id) as { reg_number: string }).reg_number
      : txn.card_number;
    createAlert({
      type: 'fuel_fraud',
      severity: 'critical',
      title: `Suspicious fuel purchase — ${reg}`,
      body: `${txn.station_name}: ${verdict.flag_reason}`,
      vehicle_id: txn.vehicle_id,
    });
  }
}

export default async function fuelRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/api/fuel/transactions', async () => {
    return db
      .prepare(
        `SELECT f.*, v.reg_number FROM fuel_transactions f
         LEFT JOIN vehicles v ON v.id = f.vehicle_id
         ORDER BY f.txn_at DESC LIMIT 200`
      )
      .all();
  });

  // CSV columns: card_number, station_name, station_lat, station_lng, litres, amount, txn_at
  app.post('/api/fuel/import', async (req, reply) => {
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: 'No CSV file uploaded' });
    const text = (await file.toBuffer()).toString('utf8');
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
    });
    const insert = db.prepare(
      `INSERT INTO fuel_transactions
         (card_number, station_name, station_lat, station_lng, litres, amount, currency, txn_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const cardToVehicle = db.prepare('SELECT id FROM vehicles WHERE fuel_card_number = ?');
    const ids: number[] = [];
    for (const row of parsed.data) {
      const card = row.card_number?.trim();
      const vehicle = card ? (cardToVehicle.get(card) as { id: number } | undefined) : undefined;
      const res = insert.run(
        card ?? null,
        row.station_name ?? 'Unknown station',
        Number(row.station_lat), Number(row.station_lng),
        Number(row.litres), Number(row.amount),
        row.currency ?? 'ZAR',
        row.txn_at ?? new Date().toISOString()
      );
      const id = res.lastInsertRowid as number;
      if (vehicle) db.prepare('UPDATE fuel_transactions SET vehicle_id = ? WHERE id = ?').run(vehicle.id, id);
      ids.push(id);
    }
    for (const id of ids) runFraudCheck(id);
    return { imported: ids.length };
  });
}
