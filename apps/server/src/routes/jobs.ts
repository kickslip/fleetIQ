import type { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { broadcast } from '../ws.js';
import { createAlert } from '../alerts.js';
import { UPLOADS_DIR } from '../db.js';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Job, JobStatus } from '@fleet/shared';

const FLOW: JobStatus[] = ['pending', 'assigned', 'accepted', 'en_route', 'arrived', 'completed'];

function getJob(id: number, orgId: number): Job | undefined {
  return db
    .prepare(
      `SELECT j.*, u.name AS driver_name FROM jobs j
       LEFT JOIN users u ON u.id = j.driver_id WHERE j.id = ? AND j.org_id = ?`
    )
    .get(id, orgId) as unknown as Job | undefined;
}

function notify(job: Job, orgId: number) {
  broadcast({ type: 'job', job }, orgId);
}

export default async function jobRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/api/jobs', async (req) => {
    const orgId = req.user!.orgId;
    const { status, driver_id } = req.query as { status?: string; driver_id?: string };
    const clauses: string[] = ['j.org_id = ?'];
    const params: (string | number)[] = [orgId];
    if (status) { clauses.push('j.status = ?'); params.push(status); }
    if (driver_id) { clauses.push('j.driver_id = ?'); params.push(Number(driver_id)); }
    return db
      .prepare(
        `SELECT j.*, u.name AS driver_name FROM jobs j
         LEFT JOIN users u ON u.id = j.driver_id
         WHERE ${clauses.join(' AND ')}
         ORDER BY j.created_at DESC LIMIT 200`
      )
      .all(...params) as unknown as Job[];
  });

  // Idempotent on (org_id, ref): retrying the same create returns the existing job.
  app.post('/api/jobs', async (req, reply) => {
    const orgId = req.user!.orgId;
    const b = req.body as {
      ref?: string; title: string; description?: string;
      pickup_address: string; pickup_lat: number; pickup_lng: number;
      dropoff_address: string; dropoff_lat: number; dropoff_lng: number;
      scheduled_at?: string;
    };
    const ref = b.ref ?? `JOB-${Date.now().toString(36).toUpperCase()}`;
    const existing = db
      .prepare('SELECT id FROM jobs WHERE org_id = ? AND ref = ?')
      .get(orgId, ref) as { id: number } | undefined;
    if (existing) return getJob(existing.id, orgId);
    const res = db
      .prepare(
        `INSERT INTO jobs (org_id, ref, title, description, pickup_address, pickup_lat, pickup_lng,
           dropoff_address, dropoff_lat, dropoff_lng, scheduled_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(orgId, ref, b.title, b.description ?? null, b.pickup_address, b.pickup_lat, b.pickup_lng,
           b.dropoff_address, b.dropoff_lat, b.dropoff_lng, b.scheduled_at ?? null);
    const job = getJob(res.lastInsertRowid as number, orgId)!;
    notify(job, orgId);
    return reply.code(201).send(job);
  });

  app.post('/api/jobs/:id/assign', async (req, reply) => {
    const orgId = req.user!.orgId;
    const id = Number((req.params as any).id);
    const { driver_id } = req.body as { driver_id: number };
    if (!getJob(id, orgId)) return reply.code(404).send({ error: 'Job not found' });
    // Driver must belong to the same org
    const vehicle = db
      .prepare('SELECT id FROM vehicles WHERE driver_id = ? AND org_id = ?')
      .get(driver_id, orgId) as { id: number } | undefined;
    const driver = db
      .prepare(`SELECT id FROM users WHERE id = ? AND org_id = ? AND role = 'driver'`)
      .get(driver_id, orgId);
    if (!driver) return reply.code(400).send({ error: 'Driver not found in your organization' });
    db.prepare(
      `UPDATE jobs SET driver_id = ?, vehicle_id = ?, status = 'assigned' WHERE id = ? AND org_id = ?`
    ).run(driver_id, vehicle?.id ?? null, id, orgId);
    const job = getJob(id, orgId)!;
    notify(job, orgId);
    return job;
  });

  // Idempotent: repeating the current status is a no-op, not an error.
  app.post('/api/jobs/:id/status', async (req, reply) => {
    const orgId = req.user!.orgId;
    const id = Number((req.params as any).id);
    const { status } = req.body as { status: JobStatus };
    const job = getJob(id, orgId);
    if (!job) return reply.code(404).send({ error: 'Job not found' });
    if (job.status === status) return job;
    const cur = FLOW.indexOf(job.status);
    const next = FLOW.indexOf(status);
    if (status !== 'cancelled' && next !== cur + 1) {
      return reply.code(400).send({ error: `Cannot move job from ${job.status} to ${status}` });
    }
    db.prepare(
      `UPDATE jobs SET status = ?, completed_at = CASE WHEN ? = 'completed' THEN datetime('now') ELSE completed_at END
       WHERE id = ? AND org_id = ?`
    ).run(status, status, id, orgId);
    const updated = getJob(id, orgId)!;
    notify(updated, orgId);
    return updated;
  });

  // Proof of delivery — multipart: photo (file), signature (file), notes (field)
  app.post('/api/jobs/:id/pod', async (req, reply) => {
    const orgId = req.user!.orgId;
    const id = Number((req.params as any).id);
    const job = getJob(id, orgId);
    if (!job) return reply.code(404).send({ error: 'Job not found' });

    let photoPath: string | null = null;
    let sigPath: string | null = null;
    let notes: string | null = null;

    for await (const part of req.parts()) {
      if (part.type === 'file') {
        const buf = await part.toBuffer();
        const ext = part.filename?.split('.').pop() ?? 'bin';
        const fname = `job${id}-${part.fieldname}-${Date.now()}.${ext}`;
        writeFileSync(path.join(UPLOADS_DIR, fname), buf);
        if (part.fieldname === 'photo') photoPath = `/uploads/${fname}`;
        if (part.fieldname === 'signature') sigPath = `/uploads/${fname}`;
      } else if (part.fieldname === 'notes') {
        notes = String(part.value);
      }
    }

    db.prepare(
      `UPDATE jobs SET pod_photo_path = COALESCE(?, pod_photo_path),
         pod_signature_path = COALESCE(?, pod_signature_path),
         pod_notes = COALESCE(?, pod_notes),
         status = 'completed', completed_at = datetime('now')
       WHERE id = ? AND org_id = ?`
    ).run(photoPath, sigPath, notes, id, orgId);
    const updated = getJob(id, orgId)!;
    notify(updated, orgId);
    createAlert({
      org_id: orgId,
      type: 'job', severity: 'info',
      title: `Job ${updated.ref} completed`,
      body: `POD captured for ${updated.dropoff_address}`,
      job_id: id, vehicle_id: updated.vehicle_id,
    });
    return updated;
  });
}
