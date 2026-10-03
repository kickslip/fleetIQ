import type { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { getVehicle, listVehicles } from '../ingest.js';
import type { User, VehiclePosition } from '@fleet/shared';

export default async function vehicleRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/api/vehicles', async (req) => listVehicles(req.user!.orgId));

  app.post('/api/vehicles', async (req, reply) => {
    const orgId = req.user!.orgId;
    const b = req.body as {
      reg_number: string; make: string; model: string;
      year?: number; fuel_tank_litres?: number; fuel_card_number?: string; driver_id?: number;
    };
    if (b.driver_id != null) {
      const d = db.prepare(`SELECT id FROM users WHERE id = ? AND org_id = ?`).get(b.driver_id, orgId);
      if (!d) return reply.code(400).send({ error: 'Driver not found in your organization' });
    }
    const res = db
      .prepare(
        `INSERT INTO vehicles (org_id, reg_number, make, model, year, fuel_tank_litres, fuel_card_number, driver_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(orgId, b.reg_number, b.make, b.model, b.year ?? null, b.fuel_tank_litres ?? 80,
           b.fuel_card_number ?? null, b.driver_id ?? null);
    return reply.code(201).send(getVehicle(res.lastInsertRowid as number, orgId));
  });

  app.patch('/api/vehicles/:id', async (req, reply) => {
    const orgId = req.user!.orgId;
    const id = Number((req.params as any).id);
    if (!getVehicle(id, orgId)) return reply.code(404).send({ error: 'Vehicle not found' });
    const b = req.body as Record<string, unknown>;
    if (b.driver_id != null) {
      const d = db.prepare('SELECT id FROM users WHERE id = ? AND org_id = ?').get(b.driver_id as number, orgId);
      if (!d) return reply.code(400).send({ error: 'Driver not found in your organization' });
    }
    const fields = ['reg_number', 'make', 'model', 'year', 'fuel_tank_litres', 'fuel_card_number', 'driver_id', 'status'];
    const sets = fields.filter((f) => f in b).map((f) => `${f} = ?`);
    if (sets.length) {
      db.prepare(`UPDATE vehicles SET ${sets.join(', ')} WHERE id = ? AND org_id = ?`).run(
        ...fields.filter((f) => f in b).map((f) => b[f] as string | number | null), id, orgId);
    }
    return getVehicle(id, orgId);
  });

  app.get('/api/drivers', async (req) => {
    return db
      .prepare(
        `SELECT u.id, u.email, u.name, u.role, u.phone, u.created_at, v.reg_number AS vehicle_reg, v.id AS vehicle_id
         FROM users u LEFT JOIN vehicles v ON v.driver_id = u.id
         WHERE u.role = 'driver' AND u.org_id = ? ORDER BY u.name`
      )
      .all(req.user!.orgId) as unknown as (User & { vehicle_reg: string | null; vehicle_id: number | null })[];
  });

  app.get('/api/vehicles/:id/positions', async (req, reply) => {
    const orgId = req.user!.orgId;
    const id = Number((req.params as any).id);
    if (!getVehicle(id, orgId)) return reply.code(404).send({ error: 'Vehicle not found' });
    const { from, to, limit } = req.query as { from?: string; to?: string; limit?: string };
    const clauses = ['vehicle_id = ?'];
    const params: (string | number)[] = [id];
    if (from) { clauses.push('recorded_at >= ?'); params.push(from); }
    if (to) { clauses.push('recorded_at <= ?'); params.push(to); }
    return db
      .prepare(
        `SELECT * FROM vehicle_positions WHERE ${clauses.join(' AND ')}
         ORDER BY recorded_at ASC LIMIT ?`
      )
      .all(...params, Number(limit) || 5000) as unknown as VehiclePosition[];
  });
}
