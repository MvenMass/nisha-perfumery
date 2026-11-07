import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema';

type DatabaseOptions = {
  /**
   * Ошибка простаивающего соединения (БД перезапустили, соединение оборвали). Без обработчика
   * pg бросает её как необработанную и роняет процесс; пул сам заменит соединение при следующем запросе.
   */
  onIdleError?: (error: Error) => void;
};

export function createDatabase(
  connectionString: string,
  {
    onIdleError = (error) => console.error('Соединение с БД оборвалось', error),
  }: DatabaseOptions = {},
) {
  const pool = new Pool({ connectionString });
  pool.on('error', onIdleError);
  const db = drizzle({ client: pool, schema, casing: 'snake_case' });
  return { db, pool };
}

export type Database = ReturnType<typeof createDatabase>['db'];
