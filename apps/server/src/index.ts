import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import { UPLOADS_DIR } from './db.js';
import { dbIsEmpty, seed } from './seed.js';
import { addClient } from './ws.js';
import authRoutes from './routes/auth.js';
import vehicleRoutes from './routes/vehicles.js';
import jobRoutes from './routes/jobs.js';
import opsRoutes from './routes/ops.js';
import fuelRoutes from './routes/fuel.js';
import adminRoutes from './routes/admin.js';

// Auto-seed on boot when the DB is empty (hosted demos have no shell access)
if (process.env.SEED_ON_BOOT === '1' && dbIsEmpty()) {
  console.log('SEED_ON_BOOT: empty database — seeding demo data');
  seed();
}

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
await app.register(websocket);
await app.register(fastifyStatic, { root: UPLOADS_DIR, prefix: '/uploads/' });

app.get('/api/health', async () => ({ ok: true, ts: new Date().toISOString() }));

// WS clients must authenticate (?token=JWT) and join their org's room —
// no cross-tenant data leaks over the live feed.
app.get('/ws', { websocket: true }, (socket, req) => {
  const { token } = req.query as { token?: string };
  void addClient(socket, token);
});

await app.register(authRoutes);
await app.register(vehicleRoutes);
await app.register(jobRoutes);
await app.register(opsRoutes);
await app.register(fuelRoutes);
await app.register(adminRoutes);

const port = Number(process.env.PORT ?? 4000);
await app.listen({ port, host: '0.0.0.0' });
console.log(`Fleet server listening on http://0.0.0.0:${port}`);
