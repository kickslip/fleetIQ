import type { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { getVehicle, listVehicles } from '../ingest.js';
import type { User, VehiclePosition } from '@fleet/shared';

export default async function vehicleRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/api/vehicles', async () => listVehicles());

  app.post('/api/vehicles', async (req, reply) => {
    const b = req.body as {
      reg_number: string; make: string; model: string;
      year?: number; fuel_tank_litres?: number; fuel_card_number?: string; driver_id?: number;
    };
    const res = db
      .prepare(
        `INSERT INTO vehicles (reg_number, make, model, year, fuel_tank_litres, fuel_card_number, driver_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(b.reg_number, b.make, b.model, b.year ?? null, b.fuel_tank_litres ?? 80,
           b.fuel_card_number ?? null, b.driver_id ?? null);
    return reply.code(201).send(getVehicle(res.lastInsertRowid as number));
  });

  app.patch('/api/vehicles/:id', async (req) => {
    const id = Number((req.params as any).id);
    const b = req.body as Record<string, unknown>;
    const fields = ['reg_number', 'make', 'model', 'year', 'fuel_tank_litres', 'fuel_card_number', 'driver_id', 'status'];
    const sets = fields.filter((f) => f in b).map((f) => `${f} = ?`);
    if (sets.length) {
      db.prepare(`UPDATE vehicles SET ${sets.join(', ')} WHERE id = ?`).run(
        ...fields.filter((f) => f in b).map((f) => b[f] as string | number | null), id);
    }
    return getVehicle(id);
  });

  app.get('/api/drivers', async () => {
    return db
      .prepare(
        `SELECT u.id, u.email, u.name, u.role, u.phone, u.created_at, v.reg_number AS vehicle_reg, v.id AS vehicle_id
         FROM users u LEFT JOIN vehicles v ON v.driver_id = u.id WHERE u.role = 'driver' ORDER BY u.name`
      )
      .all() as unknown as (User & { vehicle_reg: string | null; vehicle_id: number | null })[];
  });

  app.get('/api/vehicles/:id/positions', async (req) => {
    const id = Number((req.params as any).id);
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
