import { buildApp } from '../app';
import type { App } from '../app';
import { loadEnv } from '../config/env';
import { runSeed } from '../database/seed';
import { createTestDatabase } from '../database/test-database';
import type { TestDatabase } from '../database/test-database';
import { SESSION_COOKIE } from '../modules/auth/session';
import { createMemoryMailer } from '../modules/mailer/mailer';
import type { Mail } from '../modules/mailer/mailer';

export type TestApp = {
  app: App;
  testDb: TestDatabase;
  /** Письма, «отправленные» приложением за время теста. */
  mails: Mail[];
  close: () => Promise<void>;
};

/** Пара «cookie + заголовок» для double-submit CSRF: изменяющие запросы без неё получают 403. */
export const CSRF = {
  cookies: { nisha_csrf: 'test-csrf-token' },
  headers: { 'x-csrf-token': 'test-csrf-token' },
} as const;

/** Дата сида в тестах фиксирована: порядок «новинок» и даты публикации не плавают. */
export const SEED_NOW = new Date('2026-11-01T12:00:00Z');

/** Администратор из сида тестовой базы. */
export const TEST_ADMIN = { email: 'admin@nisha.test', password: 'correct-horse-battery' };

// Приложение на временной базе с сидом — для тестов модулей через app.inject().
export async function createTestApp(): Promise<TestApp> {
  const testDb = await createTestDatabase();
  await runSeed(testDb.db, {
    adminEmail: TEST_ADMIN.email,
    adminPassword: TEST_ADMIN.password,
    now: SEED_NOW,
  });
  const env = loadEnv({
    NODE_ENV: 'test',
    WEB_ORIGIN: 'https://nisha.test',
    DATABASE_URL: testDb.url,
  });
  const mailer = createMemoryMailer();
  const app = await buildApp({ env, db: testDb.db, mailer });
  return {
    app,
    testDb,
    mails: mailer.sent,
    close: async () => {
      await app.close();
      await testDb.drop();
    },
  };
}

let addressCounter = 0;

/** Свой IP на каждый вход и регистрацию: у них лимит частоты по адресу. */
function nextAddress(): string {
  addressCounter += 1;
  return `10.250.${Math.floor(addressCounter / 250)}.${addressCounter % 250}`;
}

function sessionCookies(
  response: { statusCode: number; body: string; cookies: Array<{ name: string; value: string }> },
  what: string,
): Record<string, string> {
  const token = response.cookies.find((cookie) => cookie.name === SESSION_COOKIE)?.value;
  if (response.statusCode >= 300 || !token) {
    throw new Error(`${what} не прошёл: ${response.statusCode} ${response.body}`);
  }
  return { ...CSRF.cookies, [SESSION_COOKIE]: token };
}

/**
 * Регистрирует покупателя и возвращает cookie вошедшего вместе с CSRF — для тестов модулей,
 * где вход только предусловие.
 */
export async function signUp(app: App, email: string): Promise<Record<string, string>> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'stone-and-smoke', name: 'Анна' },
    remoteAddress: nextAddress(),
    ...CSRF,
  });
  return sessionCookies(response, `Регистрация ${email}`);
}

/** Вход администратором из сида. */
export async function signInAdmin(app: App): Promise<Record<string, string>> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: TEST_ADMIN,
    remoteAddress: nextAddress(),
    ...CSRF,
  });
  return sessionCookies(response, 'Вход администратора');
}
