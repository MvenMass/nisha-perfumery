import { buildApp } from './app';
import { loadEnv } from './config/env';
import { createDatabase } from './database/client';

const env = loadEnv();
const { db, pool } = createDatabase(env.DATABASE_URL, {
  onIdleError: (error) => app.log.error({ err: error }, 'Соединение с БД оборвалось'),
});
const app = await buildApp({ env, db });
app.addHook('onClose', async () => {
  await pool.end();
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, 'Остановка сервера');
    app.close().then(
      () => process.exit(0),
      (error: unknown) => {
        app.log.error({ err: error }, 'Ошибка при остановке сервера');
        process.exit(1);
      },
    );
  });
}

try {
  await app.listen({ host: env.API_HOST, port: env.API_PORT });
} catch (error) {
  app.log.error({ err: error }, 'Не удалось запустить сервер');
  process.exit(1);
}
