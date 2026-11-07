import { createHash, randomBytes } from 'node:crypto';

import type { User } from '@nisha/contracts';
import { eq } from 'drizzle-orm';
import type { FastifyReply } from 'fastify';

import type { Database } from '../../database/client';
import { sessions, users } from '../../database/schema';

export const SESSION_COOKIE = 'nisha_session';

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = 30 * DAY_MS;
// Продлеваем не на каждый запрос, а раз в сутки: иначе каждая страница писала бы в БД.
const RENEW_AFTER_MS = DAY_MS;

/** Токен уходит только в cookie; в БД — его SHA-256, чтобы утечка таблицы не давала рабочих сессий. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function toPublicUser(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    role: row.role,
    hasPassword: row.passwordHash !== null,
  };
}

export async function createSession(
  db: Database,
  userId: string,
  now = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    createdAt: now,
    lastSeenAt: now,
    expiresAt,
  });
  return { token, expiresAt };
}

export type SessionLookup =
  | { status: 'none' }
  | { status: 'expired' }
  | { status: 'active'; user: User; renewedUntil: Date | undefined };

export async function findSession(
  db: Database,
  token: string,
  now = new Date(),
): Promise<SessionLookup> {
  const id = hashToken(token);
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id));

  if (!row) return { status: 'none' };
  if (row.session.expiresAt.getTime() <= now.getTime()) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return { status: 'expired' };
  }

  let renewedUntil: Date | undefined;
  if (now.getTime() - row.session.lastSeenAt.getTime() >= RENEW_AFTER_MS) {
    renewedUntil = new Date(now.getTime() + SESSION_TTL_MS);
    await db
      .update(sessions)
      .set({ lastSeenAt: now, expiresAt: renewedUntil })
      .where(eq(sessions.id, id));
  }
  return { status: 'active', user: toPublicUser(row.user), renewedUntil };
}

export async function deleteSession(db: Database, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

export function setSessionCookie(
  reply: FastifyReply,
  token: string,
  expiresAt: Date,
  secure: boolean,
): void {
  void reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    expires: expiresAt,
  });
}

export function clearSessionCookie(reply: FastifyReply, secure: boolean): void {
  void reply.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure, path: '/' });
}
