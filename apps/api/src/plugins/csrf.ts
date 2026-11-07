import { randomBytes, timingSafeEqual } from 'node:crypto';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AppError } from '../shared/errors';

export const CSRF_COOKIE = 'nisha_csrf';
export const CSRF_HEADER = 'x-csrf-token';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const YEAR_SECONDS = 365 * 24 * 60 * 60;

function sameToken(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Cookie с токеном: читает её только наш фронт (JS чужого сайта не видит наши cookie). */
export function issueCsrfToken(
  request: FastifyRequest,
  reply: FastifyReply,
  secure: boolean,
): string {
  const existing = request.cookies[CSRF_COOKIE];
  if (existing) return existing;
  const token = randomBytes(32).toString('base64url');
  void reply.setCookie(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: YEAR_SECONDS,
  });
  return token;
}

/**
 * Double-submit CSRF (D-006): изменяющий запрос должен повторить токен из cookie в заголовке.
 * Чужой сайт может заставить браузер отправить cookie, но не может их прочитать и подставить в заголовок.
 * Дополнительно проверяем Origin, если браузер его прислал.
 */
export function setupCsrf(app: FastifyInstance, { webOrigin }: { webOrigin: string }): void {
  app.addHook('onRequest', async (request) => {
    if (!UNSAFE_METHODS.has(request.method)) return;

    const origin = request.headers.origin;
    if (origin !== undefined && origin !== webOrigin) {
      throw new AppError('FORBIDDEN', 'Запрос с чужого сайта отклонён');
    }

    const cookie = request.cookies[CSRF_COOKIE];
    const header = request.headers[CSRF_HEADER];
    if (!cookie || typeof header !== 'string' || !sameToken(cookie, header)) {
      throw new AppError('FORBIDDEN', 'Не прошла защита формы. Обновите страницу и повторите');
    }
  });
}
