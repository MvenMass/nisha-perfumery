import cookie from '@fastify/cookie';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { cookieSecure } from './config/env';
import type { Env } from './config/env';
import type { Database } from './database/client';
import { authRoutes } from './modules/auth/auth.routes';
import { cartRoutes } from './modules/cart/cart.routes';
import { catalogRoutes } from './modules/catalog/catalog.routes';
import { favoritesRoutes } from './modules/favorites/favorites.routes';
import { healthRoutes } from './modules/health/health.routes';
import { homeRoutes } from './modules/home/home.routes';
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
  }
}

type AppDeps = {
  env: Env;
  /** Пулом владеет вызывающий код: сервер закрывает его при остановке, тесты — вместе с базой. */
  db: Database;
};

export async function buildApp({ env, db }: AppDeps) {
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

  setupErrorHandling(app);
  await setupSecurity(app, env.WEB_ORIGIN);
  await setupRateLimit(app);
  await app.register(cookie);
  setupAuth(app, { secure: cookieSecure(env) });
  setupCsrf(app, { webOrigin: env.WEB_ORIGIN });

  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api', secure: cookieSecure(env) });
  await app.register(catalogRoutes, { prefix: '/api' });
  await app.register(homeRoutes, { prefix: '/api' });
  await app.register(storeRoutes, { prefix: '/api' });
  await app.register(stockNotificationRoutes, { prefix: '/api' });
  await app.register(cartRoutes, { prefix: '/api' });
  await app.register(favoritesRoutes, { prefix: '/api' });

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
