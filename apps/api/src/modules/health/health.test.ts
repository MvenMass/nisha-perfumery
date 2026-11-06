import { errorResponseSchema, healthResponseSchema } from '@nisha/contracts';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { buildApp } from '../../app';
import type { App } from '../../app';
import { loadEnv } from '../../config/env';
import { createDatabase } from '../../database/client';

const env = loadEnv({
  NODE_ENV: 'test',
  WEB_ORIGIN: 'https://nisha.test',
  DATABASE_URL: 'postgres://unused@localhost:5432/unused',
});
// Пул pg не подключается, пока нет запросов: маршрутам каркаса база не нужна.
const { db, pool } = createDatabase(env.DATABASE_URL);
let app: App | undefined;

afterAll(async () => {
  await pool.end();
});

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe('api: каркас', () => {
  it('GET /api/health отвечает 200 и схемой из contracts', async () => {
    app = await buildApp({ env, db });
    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(healthResponseSchema.parse(response.json())).toEqual({ status: 'ok' });
  });

  it('неизвестный маршрут → 404 в едином формате', async () => {
    app = await buildApp({ env, db });
    const response = await app.inject({ method: 'GET', url: '/api/nope' });

    expect(response.statusCode).toBe(404);
    expect(errorResponseSchema.parse(response.json()).error.code).toBe('NOT_FOUND');
  });

  it('ошибка валидации → 400 VALIDATION_FAILED с деталями', async () => {
    app = await buildApp({ env, db });
    app.get(
      '/api/test-validation',
      { schema: { querystring: z.object({ n: z.coerce.number().int() }) } },
      async () => ({ ok: true }),
    );
    const response = await app.inject({ method: 'GET', url: '/api/test-validation?n=abc' });

    expect(response.statusCode).toBe(400);
    const body = errorResponseSchema.parse(response.json());
    expect(body.error.code).toBe('VALIDATION_FAILED');
    expect(body.error.details).toBeInstanceOf(Array);
  });

  it('битый JSON в теле → 400 VALIDATION_FAILED', async () => {
    app = await buildApp({ env, db });
    app.post('/api/test-json', async () => ({ ok: true }));
    const response = await app.inject({
      method: 'POST',
      url: '/api/test-json',
      headers: { 'content-type': 'application/json' },
      payload: '{"broken":',
    });

    expect(response.statusCode).toBe(400);
    expect(errorResponseSchema.parse(response.json()).error.code).toBe('VALIDATION_FAILED');
  });

  it('внутренняя ошибка → 500 INTERNAL без деталей исключения', async () => {
    app = await buildApp({ env, db });
    app.get('/api/test-crash', async () => {
      throw new Error('секретная деталь');
    });
    const response = await app.inject({ method: 'GET', url: '/api/test-crash' });

    expect(response.statusCode).toBe(500);
    expect(errorResponseSchema.parse(response.json()).error.code).toBe('INTERNAL');
    expect(response.body).not.toContain('секретная деталь');
  });

  it('ставит заголовки Helmet', async () => {
    app = await buildApp({ env, db });
    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toBeDefined();
  });

  it('CORS разрешает только свой origin', async () => {
    app = await buildApp({ env, db });
    const own = await app.inject({
      method: 'GET',
      url: '/api/health',
      headers: { origin: 'https://nisha.test' },
    });
    const foreign = await app.inject({
      method: 'GET',
      url: '/api/health',
      headers: { origin: 'https://evil.test' },
    });

    expect(own.headers['access-control-allow-origin']).toBe('https://nisha.test');
    expect(own.headers['access-control-allow-credentials']).toBe('true');
    expect(foreign.headers['access-control-allow-origin']).not.toBe('https://evil.test');
  });
});

describe('loadEnv', () => {
  it('падает с понятным сообщением на неверном порте', () => {
    expect(() => loadEnv({ API_PORT: 'abc' })).toThrow(/API_PORT/);
  });
});
