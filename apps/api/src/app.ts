import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { cookieSecure } from './config/env';
import type { Env } from './config/env';
import type { Database } from './database/client';
import { addressesRoutes } from './modules/addresses/addresses.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { cartRoutes } from './modules/cart/cart.routes';
import { catalogRoutes } from './modules/catalog/catalog.routes';
import { checkoutRoutes } from './modules/checkout/checkout.routes';
import { contentRoutes } from './modules/content/content.routes';
import { favoritesRoutes } from './modules/favorites/favorites.routes';
import { healthRoutes } from './modules/health/health.routes';
import { homeRoutes } from './modules/home/home.routes';
import { createConsoleMailer } from './modules/mailer/mailer';
import type { Mailer } from './modules/mailer/mailer';
import { ordersRoutes } from './modules/orders/orders.routes';
import { createLocalStorage, UPLOADS_PREFIX } from './modules/storage/storage';
import type { Storage } from './modules/storage/storage';
import { mockPaymentRoutes } from './modules/payments/payments.routes';
import { stockNotificationRoutes } from './modules/stock-notifications/stock-notifications.routes';
import { storeRoutes } from './modules/store/store.routes';
import { setupAuth } from './plugins/auth';
import { setupCsrf } from './plugins/csrf';
import { setupErrorHandling } from './plugins/error-handler';
import { setupRateLimit } from './plugins/rate-limit';
import { setupSecurity } from './plugins/security';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
    env: Env;
    mailer: Mailer;
    storage: Storage;
    /** «METHOD /url» всех маршрутов: тест прав проверяет, что каждый /api/admin/* закрыт. */
    routeList: string[];
  }
}

type AppDeps = {
  env: Env;
  /** Пулом владеет вызывающий код: сервер закрывает его при остановке, тесты — вместе с базой. */
  db: Database;
  /** По умолчанию письма пишутся в лог; тесты подставляют mailer, который их запоминает. */
  mailer?: Mailer;
};

export async function buildApp({ env, db, mailer }: AppDeps) {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'test'
        ? false
        : {
            level: env.LOG_LEVEL,
            redact: ['req.headers.cookie', 'req.headers.authorization'],
          },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorate('db', db);
  app.decorate('env', env);
  app.decorate('mailer', mailer ?? createConsoleMailer(app.log));
  const uploadsDir = path.resolve(env.UPLOADS_DIR);
  await mkdir(uploadsDir, { recursive: true });
  app.decorate('storage', createLocalStorage(uploadsDir));
  app.decorate('routeList', []);
  app.addHook('onRoute', (route) => {
    for (const method of [route.method].flat()) {
      if (method !== 'HEAD') app.routeList.push(`${method} ${route.url}`);
    }
  });

  setupErrorHandling(app);
  await setupSecurity(app, env.WEB_ORIGIN);
  await setupRateLimit(app);
  await app.register(cookie);
  setupAuth(app, { secure: cookieSecure(env) });
  setupCsrf(app, { webOrigin: env.WEB_ORIGIN });

  // Имена файлов уникальны (id снимка), поэтому их можно кешировать навсегда.
  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: UPLOADS_PREFIX,
    decorateReply: false,
    immutable: true,
    maxAge: '365d',
  });
  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api', secure: cookieSecure(env) });
  await app.register(catalogRoutes, { prefix: '/api' });
  await app.register(homeRoutes, { prefix: '/api' });
  await app.register(contentRoutes, { prefix: '/api' });
  await app.register(storeRoutes, { prefix: '/api' });
  await app.register(stockNotificationRoutes, { prefix: '/api' });
  await app.register(cartRoutes, { prefix: '/api' });
  await app.register(favoritesRoutes, { prefix: '/api' });
  await app.register(checkoutRoutes, { prefix: '/api' });
  await app.register(ordersRoutes, { prefix: '/api' });
  await app.register(addressesRoutes, { prefix: '/api' });
  await app.register(adminRoutes, { prefix: '/api/admin' });
  if (env.PAYMENT_PROVIDER === 'mock') await app.register(mockPaymentRoutes, { prefix: '/api' });

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
