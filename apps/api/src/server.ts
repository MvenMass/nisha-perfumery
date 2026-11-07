import { buildApp } from './app';
import { loadEnv } from './config/env';
import { createDatabase } from './database/client';
import { cancelExpiredOrders } from './modules/orders/orders.service';

const env = loadEnv();
const { db, pool } = createDatabase(env.DATABASE_URL, {
  onIdleError: (error) => app.log.error({ err: error }, 'Соединение с БД оборвалось'),
});
const app = await buildApp({ env, db });

// Неоплаченные заказы старше 5 минут отменяются, остатки возвращаются (D-016). Чтение заказа
// и оплата проверяют срок сами, так что задача нужна, чтобы флаконы вернулись в продажу вовремя.
const EXPIRY_INTERVAL_MS = 30_000;
const expiryTimer = setInterval(() => {
  cancelExpiredOrders(db).then(
    (count) => {
      if (count > 0) app.log.info({ count }, 'Отменены неоплаченные заказы');
    },
    (error: unknown) => app.log.error({ err: error }, 'Не удалось отменить просроченные заказы'),
  );
}, EXPIRY_INTERVAL_MS);

app.addHook('onClose', async () => {
  clearInterval(expiryTimer);
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
