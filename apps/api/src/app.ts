import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { Env } from './config/env';
import type { Database } from './database/client';
import { catalogRoutes } from './modules/catalog/catalog.routes';
import { healthRoutes } from './modules/health/health.routes';
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

  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(catalogRoutes, { prefix: '/api' });

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
