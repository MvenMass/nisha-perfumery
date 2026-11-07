import { mockPaymentNotifySchema, orderSchema } from '@nisha/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { notifyMockPayment } from './payments.service';

/**
 * Регистрируется только при PAYMENT_PROVIDER=mock. У настоящего провайдера здесь будет
 * вебхук с проверкой подписи, а не запрос из браузера покупателя.
 */
export const mockPaymentRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/payments/mock/notify',
    { schema: { body: mockPaymentNotifySchema, response: { 200: orderSchema } } },
    async (request) =>
      notifyMockPayment({ db: app.db, mailer: app.mailer }, request.body, request.user),
  );
};
