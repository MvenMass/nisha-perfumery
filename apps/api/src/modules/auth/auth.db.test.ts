import {
  authResponseSchema,
  csrfResponseSchema,
  errorResponseSchema,
  meResponseSchema,
} from '@nisha/contracts';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { products, sessions, stockNotifications } from '../../database/schema';
import { requireAuth, requireRole } from '../../plugins/auth';
import { createTestApp, CSRF } from '../../shared/test-app';
import type { TestApp } from '../../shared/test-app';
import { hashToken } from '../../shared/token';
import { SESSION_COOKIE } from './session';

let ctx: TestApp;
let ip = 0;
const nextIp = () => `10.1.0.${(ip += 1)}`;

const ADMIN = { email: 'admin@nisha.test', password: 'correct-horse-battery' };

beforeAll(async () => {
  ctx = await createTestApp();
  // Маршруты админки появятся в этапе 8; права проверяем на тестовых маршрутах.
  ctx.app.get('/api/test/private', { preHandler: requireAuth }, async () => ({ ok: true }));
  ctx.app.get('/api/test/admin', { preHandler: requireRole('admin') }, async () => ({ ok: true }));
});

afterAll(async () => {
  await ctx.close();
});

type Cookies = Record<string, string>;

function sessionCookie(response: { cookies: Array<{ name: string; value: string }> }): string {
  const cookie = response.cookies.find((item) => item.name === SESSION_COOKIE);
  if (!cookie?.value) throw new Error('Ответ не установил cookie сессии');
  return cookie.value;
}

function post(url: string, payload: object, cookies: Cookies = {}, remoteAddress = nextIp()) {
  return ctx.app.inject({
    method: 'POST',
    url,
    payload,
    remoteAddress,
    headers: CSRF.headers,
    cookies: { ...CSRF.cookies, ...cookies },
  });
}

function get(url: string, cookies: Cookies = {}) {
  return ctx.app.inject({ method: 'GET', url, cookies });
}

async function me(token: string) {
  const response = await get('/api/auth/me', { [SESSION_COOKIE]: token });
  return meResponseSchema.parse(response.json()).user;
}

async function register(email: string, password = 'stone-and-smoke') {
  const response = await post('/api/auth/register', { email, password, name: 'Анна' });
  expect(response.statusCode).toBe(201);
  return { response, token: sessionCookie(response) };
}

describe('регистрация', () => {
  it('создаёт пользователя, открывает сессию и не отдаёт хеш пароля', async () => {
    const { response, token } = await register('anna@nisha.test');
    const body = authResponseSchema.parse(response.json());

    expect(body.user).toMatchObject({ email: 'anna@nisha.test', role: 'user', hasPassword: true });
    expect(response.body).not.toMatch(/argon2|passwordHash/);
    const cookie = response.cookies.find((item) => item.name === SESSION_COOKIE);
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' });
    expect((await me(token))?.email).toBe('anna@nisha.test');
  });

  it('отвечает 409 на занятый email, в том числе в другом регистре', async () => {
    await register('busy@nisha.test');
    const response = await post('/api/auth/register', {
      email: 'BUSY@Nisha.test',
      password: 'another-password',
      name: 'Борис',
    });
    expect(response.statusCode).toBe(409);
    expect(errorResponseSchema.parse(response.json()).error.code).toBe('CONFLICT');
  });

  it('отклоняет короткий пароль', async () => {
    const response = await post('/api/auth/register', {
      email: 'short@nisha.test',
      password: '1234',
      name: 'Анна',
    });
    expect(response.statusCode).toBe(400);
  });
});

describe('вход', () => {
  it('одинаково отвечает на неверный пароль и неизвестный email', async () => {
    await register('login@nisha.test', 'right-password');
    const wrongPassword = await post('/api/auth/login', {
      email: 'login@nisha.test',
      password: 'wrong-password',
    });
    const unknownEmail = await post('/api/auth/login', {
      email: 'nobody@nisha.test',
      password: 'wrong-password',
    });

    expect(wrongPassword.statusCode).toBe(401);
    expect(unknownEmail.statusCode).toBe(401);
    expect(wrongPassword.json()).toEqual(unknownEmail.json());
    expect(errorResponseSchema.parse(wrongPassword.json()).error.code).toBe('UNAUTHORIZED');
  });

  it('меняет сессию при входе: старая cookie перестаёт работать', async () => {
    const { token: before } = await register('rotate@nisha.test', 'right-password');
    const response = await post(
      '/api/auth/login',
      { email: 'rotate@nisha.test', password: 'right-password' },
      { [SESSION_COOKIE]: before },
    );
    expect(response.statusCode).toBe(200);
    const after = sessionCookie(response);

    expect(after).not.toBe(before);
    expect(await me(before)).toBeNull();
    expect((await me(after))?.email).toBe('rotate@nisha.test');
  });

  it('ограничивает число попыток с одного адреса', async () => {
    const address = '10.9.9.9';
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 11; attempt += 1) {
      const response = await post(
        '/api/auth/login',
        { email: 'nobody@nisha.test', password: 'guess' },
        {},
        address,
      );
      statuses.push(response.statusCode);
    }
    expect(statuses.slice(0, 10).every((status) => status === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

describe('выход и срок жизни сессии', () => {
  it('выход удаляет сессию', async () => {
    const { token } = await register('logout@nisha.test');
    const response = await post('/api/auth/logout', {}, { [SESSION_COOKIE]: token });
    expect(response.statusCode).toBe(204);
    expect(await me(token)).toBeNull();
  });

  it('истёкшая сессия: me пустой, защищённый маршрут — 401 «сессия истекла»', async () => {
    const { token } = await register('expired@nisha.test');
    await ctx.testDb.db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(sessions.id, hashToken(token)));

    const response = await get('/api/test/private', { [SESSION_COOKIE]: token });
    expect(response.statusCode).toBe(401);
    expect(errorResponseSchema.parse(response.json()).error.message).toMatch(/истекла/);
    expect(await me(token)).toBeNull();
  });
});

describe('права доступа', () => {
  it('requireAuth: без входа — 401', async () => {
    const response = await get('/api/test/private');
    expect(response.statusCode).toBe(401);
  });

  it('requireRole(admin): гость — 401, пользователь — 403, администратор — 200', async () => {
    const { token: userToken } = await register('plain@nisha.test');
    const login = await post('/api/auth/login', ADMIN);
    const adminToken = sessionCookie(login);

    expect((await get('/api/test/admin')).statusCode).toBe(401);
    const forbidden = await get('/api/test/admin', { [SESSION_COOKIE]: userToken });
    expect(forbidden.statusCode).toBe(403);
    expect(errorResponseSchema.parse(forbidden.json()).error.code).toBe('FORBIDDEN');
    expect((await get('/api/test/admin', { [SESSION_COOKIE]: adminToken })).statusCode).toBe(200);
  });
});

describe('CSRF', () => {
  const payload = { email: 'csrf@nisha.test', password: 'whatever' };

  it('выдаёт токен и ставит такую же cookie', async () => {
    const response = await get('/api/auth/csrf');
    const { token } = csrfResponseSchema.parse(response.json());
    expect(response.cookies.find((item) => item.name === 'nisha_csrf')?.value).toBe(token);
  });

  it('отклоняет изменяющий запрос без токена, с чужим токеном и с чужого Origin', async () => {
    const noToken = await ctx.app.inject({ method: 'POST', url: '/api/auth/login', payload });
    const mismatch = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload,
      cookies: { nisha_csrf: 'one' },
      headers: { 'x-csrf-token': 'two' },
    });
    const foreign = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload,
      ...CSRF,
      headers: { ...CSRF.headers, origin: 'https://evil.test' },
    });

    for (const response of [noToken, mismatch, foreign]) {
      expect(response.statusCode).toBe(403);
      expect(errorResponseSchema.parse(response.json()).error.code).toBe('FORBIDDEN');
    }
  });

  it('пропускает запрос с совпадающим токеном и нашим Origin', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: ADMIN,
      remoteAddress: nextIp(),
      ...CSRF,
      headers: { ...CSRF.headers, origin: 'https://nisha.test' },
    });
    expect(response.statusCode).toBe(200);
  });
});

describe('«Сообщить о поступлении» для вошедшего', () => {
  it('подставляет email аккаунта, если его нет в запросе', async () => {
    const { token } = await register('waiting@nisha.test');
    const [obsidian] = await ctx.testDb.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, 'obsidian'));

    const response = await post(
      '/api/stock-notifications',
      { productId: obsidian?.id },
      { [SESSION_COOKIE]: token },
    );
    expect(response.statusCode).toBe(201);
    const rows = await ctx.testDb.db
      .select()
      .from(stockNotifications)
      .where(eq(stockNotifications.email, 'waiting@nisha.test'));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.userId).not.toBeNull();
  });
});
