import type { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { verifyPassword, signToken, requireAuth, getUser } from '../auth.js';
import type { User } from '@fleet/shared';

export default async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/login', async (req, reply) => {
    const { email, password } = req.body as { email: string; password: string };
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email?.toLowerCase?.() ?? '') as
      | (User & { password_hash: string })
      | undefined;
    if (!row || !verifyPassword(password, row.password_hash)) {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }
    const user: User = {
      id: row.id, email: row.email, name: row.name, role: row.role,
      phone: row.phone, created_at: row.created_at,
    };
    return { token: await signToken(user), user };
  });

  app.get('/api/me', { preHandler: requireAuth }, async (req) => getUser(req.user!.id));
}
