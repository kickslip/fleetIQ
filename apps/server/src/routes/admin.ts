import type { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { haversineM } from '../geo.js';
import { createAlert } from '../alerts.js';
import { randomDtc } from '../dtc.js';
import { startSim, stopSim, simStatus } from '../simulator.js';
import type { DtcReading, Stats } from '@fleet/shared';

export default async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/api/documents', async (req) => {
    const docs = db
      .prepare(
        `SELECT d.*,
           CASE d.entity_type
             WHEN 'vehicle' THEN (SELECT reg_number FROM vehicles WHERE id = d.entity_id AND org_id = d.org_id)
             WHEN 'driver' THEN (SELECT name FROM users WHERE id = d.entity_id AND org_id = d.org_id)
           END AS entity_name
         FROM documents d WHERE d.org_id = ? ORDER BY d.expiry_date ASC`
      )
      .all(req.user!.orgId) as unknown as { expiry_date: string }[];
    return docs.map((d) => ({
      ...d,
      days_left: Math.ceil(
        (new Date(d.expiry_date).getTime() - Date.now()) / 86400000
      ),
    }));
  });

  app.post('/api/documents', async (req, reply) => {
    const orgId = req.user!.orgId;
    const b = req.body as { entity_type: string; entity_id: number; doc_type: string; expiry_date: string; notes?: string };
    const entity = b.entity_type === 'vehicle'
      ? db.prepare('SELECT id FROM vehicles WHERE id = ? AND org_id = ?').get(b.entity_id, orgId)
      : db.prepare('SELECT id FROM users WHERE id = ? AND org_id = ?').get(b.entity_id, orgId);
    if (!entity) return reply.code(400).send({ error: 'Entity not found in your organization' });
    const res = db
      .prepare('INSERT INTO documents (org_id, entity_type, entity_id, doc_type, expiry_date, notes) VALUES (?, ?, ?, ?, ?, ?)')
      .run(orgId, b.entity_type, b.entity_id, b.doc_type, b.expiry_date, b.notes ?? null);
    return reply.code(201).send(db.prepare('SELECT * FROM documents WHERE id = ?').get(res.lastInsertRowid as number));
  });

  app.delete('/api/documents/:id', async (req, reply) => {
    const res = db.prepare('DELETE FROM documents WHERE id = ? AND org_id = ?')
      .run(Number((req.params as any).id), req.user!.orgId);
    if (!res.changes) return reply.code(404).send({ error: 'Document not found' });
    return { ok: true };
  });

  app.get('/api/dtc', async (req) => {
    return db
      .prepare(
        `SELECT d.*, v.reg_number FROM dtc_readings d
         JOIN vehicles v ON v.id = d.vehicle_id WHERE d.org_id = ?
         ORDER BY d.read_at DESC LIMIT 100`
      )
      .all(req.user!.orgId) as unknown as DtcReading[];
  });

  // Simulate an OBD-II dongle reading (real BLE pairing is post-funding work)
  app.post('/api/dtc/simulate', async (req, reply) => {
    const orgId = req.user!.orgId;
    const vehicleId = (req.body as { vehicle_id?: number })?.vehicle_id;
    const vehicle = vehicleId
      ? db.prepare('SELECT * FROM vehicles WHERE id = ? AND org_id = ?').get(vehicleId, orgId)
      : (db.prepare('SELECT * FROM vehicles WHERE org_id = ? ORDER BY RANDOM() LIMIT 1').get(orgId) as { id: number } | undefined);
    if (!vehicle) return reply.code(400).send({ error: 'No vehicles' });
    const v = vehicle as { id: number; reg_number: string };
    const dtc = randomDtc();
    const res = db
      .prepare('INSERT INTO dtc_readings (org_id, vehicle_id, code, description, severity) VALUES (?, ?, ?, ?, ?)')
      .run(orgId, v.id, dtc.code, dtc.description, dtc.severity);
    if (dtc.severity !== 'low') {
      createAlert({
        org_id: orgId,
        type: 'dtc',
        severity: dtc.severity === 'high' ? 'critical' : 'warning',
        title: `${dtc.code} on ${v.reg_number}`,
        body: dtc.description,
        vehicle_id: v.id,
      });
    }
    return db.prepare('SELECT * FROM dtc_readings WHERE id = ?').get(res.lastInsertRowid as number);
  });

  app.post('/api/dtc/:id/ack', async (req) => {
    db.prepare('UPDATE dtc_readings SET acknowledged = 1 WHERE id = ? AND org_id = ?')
      .run(Number((req.params as any).id), req.user!.orgId);
    return { ok: true };
  });

  app.get('/api/stats', async (req) => {
    const orgId = req.user!.orgId;
    const today = new Date().toISOString().slice(0, 10);
    const q = (sql: string, ...p: (string | number)[]) =>
      (db.prepare(sql).get(...p, orgId) as Record<string, number>);
    const positions = db
      .prepare(
        `SELECT vehicle_id, lat, lng FROM vehicle_positions
         WHERE org_id = ? AND recorded_at >= ? ORDER BY vehicle_id, recorded_at`
      )
      .all(orgId, today) as unknown as { vehicle_id: number; lat: number; lng: number }[];
    let km = 0;
    let prev: { vehicle_id: number; lat: number; lng: number } | null = null;
    for (const p of positions) {
      if (prev && prev.vehicle_id === p.vehicle_id) km += haversineM(prev.lat, prev.lng, p.lat, p.lng);
      prev = p;
    }
    const stats: Stats = {
      vehicles_total: q('SELECT COUNT(*) c FROM vehicles WHERE org_id = ?').c,
      vehicles_active: q(`SELECT COUNT(*) c FROM vehicles WHERE status = 'active' AND org_id = ?`).c,
      jobs_today: q(`SELECT COUNT(*) c FROM jobs WHERE created_at >= ? AND org_id = ?`, today).c,
      jobs_active: q(`SELECT COUNT(*) c FROM jobs WHERE status IN ('assigned','accepted','en_route','arrived') AND org_id = ?`).c,
      jobs_completed_today: q(`SELECT COUNT(*) c FROM jobs WHERE completed_at >= ? AND org_id = ?`, today).c,
      unread_alerts: q('SELECT COUNT(*) c FROM alerts WHERE read = 0 AND org_id = ?').c,
      suspicious_fuel: q(`SELECT COUNT(*) c FROM fuel_transactions WHERE status = 'suspicious' AND org_id = ?`).c,
      km_today: Math.round(km / 100) / 10,
    };
    return stats;
  });

  app.post('/api/sim/start', async () => startSim());
  app.post('/api/sim/stop', async () => stopSim());
  app.get('/api/sim/status', async () => simStatus());
}
