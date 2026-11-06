import { buildApp } from '../app';
import type { App } from '../app';
import { loadEnv } from '../config/env';
import { runSeed } from '../database/seed';
import { createTestDatabase } from '../database/test-database';
import type { TestDatabase } from '../database/test-database';

export type TestApp = {
  app: App;
  testDb: TestDatabase;
  close: () => Promise<void>;
};

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
