import {
  createOrderRequestSchema,
  createOrderResponseSchema,
  orderAccessQuerySchema,
  orderListQuerySchema,
  orderListResponseSchema,
  orderParamsSchema,
  orderSchema,
  repeatOrderResponseSchema,
} from '@nisha/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requireAuth, signedInUser } from '../../plugins/auth';
import { mockPaymentProvider } from '../payments/provider';
import { createOrder, getOrder, listOrders, repeatOrder } from './orders.service';

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

  app.get(
    '/orders',
    {
      preHandler: requireAuth,
      schema: { querystring: orderListQuerySchema, response: { 200: orderListResponseSchema } },
    },
    async (request) => listOrders(app.db, signedInUser(request).id, request.query),
  );

  app.post(
    '/orders/:id/repeat',
    {
      preHandler: requireAuth,
      schema: { params: orderParamsSchema, response: { 200: repeatOrderResponseSchema } },
    },
    async (request) => repeatOrder(app.db, request.params.id, signedInUser(request)),
  );
};
