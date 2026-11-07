import { buildApp } from '../app';
import type { App } from '../app';
import { loadEnv } from '../config/env';
import { runSeed } from '../database/seed';
import { createTestDatabase } from '../database/test-database';
import { SESSION_COOKIE } from '../modules/auth/session';
import type { TestDatabase } from '../database/test-database';

export type TestApp = {
  app: App;
  testDb: TestDatabase;
  close: () => Promise<void>;
};

/** Пара «cookie + заголовок» для double-submit CSRF: изменяющие запросы без неё получают 403. */
export const CSRF = {
  cookies: { nisha_csrf: 'test-csrf-token' },
  headers: { 'x-csrf-token': 'test-csrf-token' },
} as const;

/** Дата сида в тестах фиксирована: порядок «новинок» и даты публикации не плавают. */
export const SEED_NOW = new Date('2026-11-01T12:00:00Z');

// Приложение на временной базе с сидом — для тестов модулей через app.inject().
export async function createTestApp(): Promise<TestApp> {
  const testDb = await createTestDatabase();
  await runSeed(testDb.db, {
    adminEmail: 'admin@nisha.test',
    adminPassword: 'correct-horse-battery',
    now: SEED_NOW,
  });
  const env = loadEnv({
    NODE_ENV: 'test',
    WEB_ORIGIN: 'https://nisha.test',
    DATABASE_URL: testDb.url,
  });
  const app = await buildApp({ env, db: testDb.db });
  return {
    app,
    testDb,
    close: async () => {
      await app.close();
      await testDb.drop();
    },
  };
}

let signUpCounter = 0;

/**
 * Регистрирует покупателя и возвращает cookie вошедшего вместе с CSRF — для тестов модулей,
 * где вход только предусловие. Каждая регистрация — с нового IP, чтобы не упереться в лимит.
 */
export async function signUp(app: App, email: string): Promise<Record<string, string>> {
  signUpCounter += 1;
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'stone-and-smoke', name: 'Анна' },
    remoteAddress: `10.250.${Math.floor(signUpCounter / 250)}.${signUpCounter % 250}`,
    ...CSRF,
  });
  const token = response.cookies.find((cookie) => cookie.name === SESSION_COOKIE)?.value;
  if (response.statusCode !== 201 || !token) {
    throw new Error(`Регистрация ${email} не прошла: ${response.statusCode} ${response.body}`);
  }
  return { ...CSRF.cookies, [SESSION_COOKIE]: token };
}
