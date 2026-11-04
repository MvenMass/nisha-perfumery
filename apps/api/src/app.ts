import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { Env } from './config/env';
import { healthRoutes } from './modules/health/health.routes';
import { setupErrorHandling } from './plugins/error-handler';
import { setupSecurity } from './plugins/security';

export async function buildApp(env: Env) {
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

  setupErrorHandling(app);
  await setupSecurity(app, env.WEB_ORIGIN);

  await app.register(healthRoutes, { prefix: '/api' });

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
