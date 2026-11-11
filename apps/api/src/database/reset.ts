import { loadDatabaseEnv } from '../config/env';
import { recreateDatabase } from './recreate';
import { seedFromEnv } from './seed';

/*
 * pnpm db:reset -- --yes — рабочая база с нуля: миграции и свежий сид. Нужен, когда
 * изменились тексты слайдов и статей: обычный сид их не перезаписывает, чтобы не стереть
 * правки из админки. Заказы, пользователи и правки в админке пропадут.
 */
if (import.meta.main) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Отказ: db:reset не запускается в production');
  }
  if (!process.argv.includes('--yes')) {
    throw new Error(
      'db:reset удалит рабочую базу целиком (заказы, пользователи, правки в админке). Чтобы подтвердить: pnpm db:reset -- --yes',
    );
  }
  const { DATABASE_URL } = loadDatabaseEnv();
  await recreateDatabase(DATABASE_URL);
  await seedFromEnv(DATABASE_URL);
  console.info('База пересоздана');
}
