import type { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { ingestPositions } from '../ingest.js';
import type { Alert, Geofence, PositionIngest } from '@fleet/shared';

export default async function opsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // Batch GPS ingest from driver app / simulator
  app.post('/api/positions', async (req) => {
    const positions = (req.body as { positions: PositionIngest[] }).positions ?? [];
    return ingestPositions(positions.filter((p) => p.lat && p.lng && p.vehicle_id));
  });

  app.get('/api/geofences', async () => {
    return db.prepare('SELECT * FROM geofences ORDER BY id').all() as unknown as Geofence[];
  });

  app.post('/api/geofences', async (req, reply) => {
    const b = req.body as { name: string; type?: Geofence['type']; lat: number; lng: number; radius_m?: number };
    const res = db
      .prepare('INSERT INTO geofences (name, type, lat, lng, radius_m) VALUES (?, ?, ?, ?, ?)')
      .run(b.name, b.type ?? 'depot', b.lat, b.lng, b.radius_m ?? 500);
    return reply.code(201).send(
      db.prepare('SELECT * FROM geofences WHERE id = ?').get(res.lastInsertRowid as number)
    );
  });

  app.delete('/api/geofences/:id', async (req) => {
    const id = Number((req.params as any).id);
    db.prepare('DELETE FROM vehicle_geofence_state WHERE geofence_id = ?').run(id);
    db.prepare('DELETE FROM geofences WHERE id = ?').run(id);
    return { ok: true };
  });

  app.get('/api/geofence-events', async () => {
    return db
      .prepare(
        `SELECT e.*, g.name AS geofence_name, v.reg_number
         FROM geofence_events e
         JOIN geofences g ON g.id = e.geofence_id
         JOIN vehicles v ON v.id = e.vehicle_id
         ORDER BY e.at DESC LIMIT 100`
      )
      .all();
  });

  app.get('/api/alerts', async (req) => {
    const { unread } = req.query as { unread?: string };
    return db
      .prepare(
        `SELECT * FROM alerts ${unread === '1' ? 'WHERE read = 0' : ''}
         ORDER BY created_at DESC LIMIT 100`
      )
      .all() as unknown as Alert[];
  });

  app.post('/api/alerts/:id/read', async (req) => {
    db.prepare('UPDATE alerts SET read = 1 WHERE id = ?').run(Number((req.params as any).id));
    return { ok: true };
  });

  app.post('/api/alerts/read-all', async () => {
    db.prepare('UPDATE alerts SET read = 1').run();
    return { ok: true };
  });
}
