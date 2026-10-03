import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { db } from './db.js';
import type { User } from '@fleet/shared';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fleet-demo-secret-change-in-production'
);

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
}

export async function signToken(user: User): Promise<string> {
  return new SignJWT({ sub: String(user.id), role: user.role, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SECRET);
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: number; role: string; name: string };
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Missing token' });
  }
  try {
    const { payload } = await jwtVerify(header.slice(7), SECRET);
    req.user = { id: Number(payload.sub), role: payload.role as string, name: payload.name as string };
  } catch {
    return reply.code(401).send({ error: 'Invalid token' });
  }
}

export function getUser(id: number): User | undefined {
  return db
    .prepare('SELECT id, email, name, role, phone, created_at FROM users WHERE id = ?')
    .get(id) as unknown as User | undefined;
}
