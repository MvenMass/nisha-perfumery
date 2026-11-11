import { Pool } from 'pg';

import { runMigrations } from './migrate';

/** Удаляет базу из адреса, создаёт заново и накатывает миграции. Решение «можно ли» — у вызывающего. */
export async function recreateDatabase(url: string): Promise<void> {
  const name = new URL(url).pathname.slice(1);
  if (!/^[a-z0-9_]+$/.test(name)) throw new Error(`Странное имя базы: «${name}»`);
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
}
