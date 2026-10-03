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

export async function signToken(user: User & { org_id: number }): Promise<string> {
  return new SignJWT({
    sub: String(user.id),
    role: user.role,
    name: user.name,
    org: user.org_id,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SECRET);
}

export interface AuthUser {
  id: number;
  role: string;
  name: string;
  orgId: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      id: Number(payload.sub),
      role: payload.role as string,
      name: payload.name as string,
      orgId: Number(payload.org ?? 1),
    };
  } catch {
    return null;
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Missing token' });
  }
  const user = await verifyToken(header.slice(7));
  if (!user) return reply.code(401).send({ error: 'Invalid token' });
  req.user = user;
}

export function getUser(id: number): (User & { org_name?: string }) | undefined {
  return db
    .prepare(
      `SELECT u.id, u.org_id, u.email, u.name, u.role, u.phone, u.created_at, o.name AS org_name
       FROM users u JOIN organizations o ON o.id = u.org_id WHERE u.id = ?`
    )
    .get(id) as unknown as (User & { org_name?: string }) | undefined;
}
