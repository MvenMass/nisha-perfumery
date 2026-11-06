import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { loadDatabaseEnv } from '../config/env';
import { createDatabase } from './client';

export const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));

export async function runMigrations(connectionString: string): Promise<void> {
  const { db, pool } = createDatabase(connectionString);
  try {
    await migrate(db, { migrationsFolder });
  } finally {
    await pool.end();
  }
}

// Запуск как скрипта: pnpm db:migrate.
if (import.meta.main) {
  const { DATABASE_URL } = loadDatabaseEnv();
  await runMigrations(DATABASE_URL);
  console.info('Миграции применены');
}
