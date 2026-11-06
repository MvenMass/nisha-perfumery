import { stockNotificationRequestSchema, stockNotificationResponseSchema } from '@nisha/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { subscribeToRestock } from './stock-notifications.service';

export const stockNotificationRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/stock-notifications',
    {
      // Форма доступна без входа — ограничиваем частоту, чтобы её не использовали для спама.
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      schema: {
        body: stockNotificationRequestSchema,
        response: { 200: stockNotificationResponseSchema, 201: stockNotificationResponseSchema },
      },
    },
    async (request, reply) => {
      const { created, body } = await subscribeToRestock(app.db, request.body);
      return reply.code(created ? 201 : 200).send(body);
    },
  );
};
