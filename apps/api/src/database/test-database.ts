import { randomUUID } from 'node:crypto';

import { Pool } from 'pg';

import { loadDatabaseEnv } from '../config/env';
import { createDatabase } from './client';
import type { Database } from './client';
import { runMigrations } from './migrate';

export type TestDatabase = {
  db: Database;
  url: string;
  drop: () => Promise<void>;
};

// Тесты БД работают с настоящим PostgreSQL: CHECK, внешние ключи и частичные индексы
// на моках не проверить. Каждый файл получает свою чистую базу с применёнными миграциями.
export async function createTestDatabase(): Promise<TestDatabase> {
  let baseUrl: string;
  try {
    baseUrl = loadDatabaseEnv().DATABASE_URL;
  } catch (error) {
    throw new Error(
      'Для тестов БД нужен DATABASE_URL: запустите `docker compose up -d postgres` и создайте .env из .env.example',
      { cause: error },
    );
  }

  const name = `nisha_test_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  const admin = new Pool({ connectionString: baseUrl, max: 1 });
  await admin.query(`CREATE DATABASE ${name}`);

  const url = new URL(baseUrl);
  url.pathname = `/${name}`;
  await runMigrations(url.toString());
  // DROP … WITH (FORCE) обрывает соединения, которые pg ещё не успел закрыть, — это ожидаемо
  // (код 57P01) и только во время удаления базы. Остальные ошибки пишем в лог.
  let dropping = false;
  const { db, pool } = createDatabase(url.toString(), {
    onIdleError: (error) => {
      if (dropping && 'code' in error && error.code === '57P01') return;
      console.error('Соединение с тестовой БД оборвалось', error);
    },
  });

  return {
    db,
    url: url.toString(),
    drop: async () => {
      dropping = true;
      await pool.end();
      await admin.query(`DROP DATABASE ${name} WITH (FORCE)`);
      await admin.end();
    },
  };
}

type PgError = { code: string; constraint?: string };

function findPgError(error: unknown): PgError | undefined {
  let current: unknown = error;
  // Drizzle оборачивает ошибку драйвера в DrizzleQueryError, исходная лежит в cause.
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (typeof current === 'object' && 'code' in current && typeof current.code === 'string') {
      return current as PgError;
    }
    current = typeof current === 'object' && 'cause' in current ? current.cause : undefined;
  }
  return undefined;
}

/** Ждёт, что запрос упадёт на конкретном ограничении БД, и возвращает код ошибки PostgreSQL. */
export async function expectConstraintError(
  query: Promise<unknown>,
  constraint?: string,
): Promise<string> {
  try {
    await query;
  } catch (error) {
    const pgError = findPgError(error);
    if (!pgError) throw error;
    if (constraint !== undefined && pgError.constraint !== constraint) {
      throw new Error(
        `Ожидалось ограничение ${constraint}, сработало ${pgError.constraint ?? '—'}`,
        {
          cause: error,
        },
      );
    }
    return pgError.code;
  }
  throw new Error(`Запрос прошёл, хотя должен был нарушить ${constraint ?? 'ограничение'}`);
}
