import { Pool } from 'pg';

import { loadDatabaseEnv } from '../config/env';
import { createDatabase } from './client';
import { runMigrations } from './migrate';
import { runSeed } from './seed';

/*
 * Пересоздаёт базу для e2e перед каждым прогоном: заказы меняют остатки, и без этого
 * прогоны зависели бы друг от друга и от ручных проверок в dev-базе.
 * Работает только с базой, имя которой кончается на _e2e, — рабочую базу так не стереть.
 */

export const E2E_ADMIN = { email: 'admin@nisha.test', password: 'e2e-admin-password' };

export async function resetE2eDatabase(url: string): Promise<void> {
  const target = new URL(url);
  const name = target.pathname.slice(1);
  if (!/^[a-z0-9_]+_e2e$/.test(name)) {
    throw new Error(`Отказ: база «${name}» не похожа на e2e (ожидается имя *_e2e)`);
  }

  const maintenance = new URL(url);
  maintenance.pathname = '/postgres';
  const admin = new Pool({ connectionString: maintenance.toString(), max: 1 });
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${name}`);
  } finally {
    await admin.end();
  }

  await runMigrations(url);
  const { db, pool } = createDatabase(url);
  try {
    await runSeed(db, { adminEmail: E2E_ADMIN.email, adminPassword: E2E_ADMIN.password });
  } finally {
    await pool.end();
  }
}

if (import.meta.main) {
  const { DATABASE_URL } = loadDatabaseEnv();
  await resetE2eDatabase(DATABASE_URL);
  console.log('База для e2e пересоздана');
}
