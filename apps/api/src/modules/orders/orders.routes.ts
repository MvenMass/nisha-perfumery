import {
  createOrderRequestSchema,
  createOrderResponseSchema,
  orderAccessQuerySchema,
  orderParamsSchema,
  orderSchema,
} from '@nisha/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { mockPaymentProvider } from '../payments/provider';
import { createOrder, getOrder } from './orders.service';

export const ordersRoutes: FastifyPluginAsyncZod = async (app) => {
  const deps = () => ({
    db: app.db,
    mailer: app.mailer,
    provider: mockPaymentProvider,
    webOrigin: app.env.WEB_ORIGIN,
  });

  // Без requireAuth: гость оформляет заказ, передавая позиции из браузера (D-047).
  app.post(
    '/orders',
    {
      // Заказ без входа создаёт аккаунт и письмо — ограничиваем частоту, чтобы это не стало спамом.
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: { body: createOrderRequestSchema, response: { 201: createOrderResponseSchema } },
    },
    async (request, reply) => {
      const created = await createOrder(deps(), request.user, request.body);
      return reply.code(201).send(created);
    },
  );

  app.get(
    '/orders/:id',
    {
      schema: {
        params: orderParamsSchema,
        querystring: orderAccessQuerySchema,
        response: { 200: orderSchema },
      },
    },
    async (request) => getOrder(app.db, request.params.id, request.user, request.query.token),
  );
};
