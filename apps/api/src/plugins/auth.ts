import type { User, UserRole } from '@nisha/contracts';
import type { FastifyInstance, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';

import { findSession, SESSION_COOKIE, setSessionCookie } from '../modules/auth/session';
import { AppError } from '../shared/errors';

declare module 'fastify' {
  interface FastifyRequest {
    /** Текущий пользователь или null — гость. */
    user: User | null;
    /** Cookie была, но сессия истекла: можно честно сказать «войдите снова». */
    sessionExpired: boolean;
  }
}

// Каждый запрос узнаёт пользователя по cookie; права проверяют requireAuth / requireRole на маршрутах.
export function setupAuth(app: FastifyInstance, { secure }: { secure: boolean }): void {
  app.decorateRequest('user', null);
  app.decorateRequest('sessionExpired', false);

  app.addHook('onRequest', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (!token) return;
    const session = await findSession(app.db, token);
    if (session.status === 'active') {
      request.user = session.user;
      if (session.renewedUntil) setSessionCookie(reply, token, session.renewedUntil, secure);
    } else if (session.status === 'expired') {
      request.sessionExpired = true;
    }
  });
}

function unauthorized(request: FastifyRequest): AppError {
  return new AppError(
    'UNAUTHORIZED',
    request.sessionExpired ? 'Сессия истекла, войдите снова' : 'Нужно войти в аккаунт',
  );
}

/** preHandler: только для вошедших. */
export const requireAuth: preHandlerAsyncHookHandler = async (request) => {
  if (!request.user) throw unauthorized(request);
};

/** preHandler: только для роли. Без входа — 401, с другой ролью — 403. */
export function requireRole(role: UserRole): preHandlerAsyncHookHandler {
  return async (request) => {
    if (!request.user) throw unauthorized(request);
    if (request.user.role !== role) throw new AppError('FORBIDDEN', 'Недостаточно прав');
  };
}
