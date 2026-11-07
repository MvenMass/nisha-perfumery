import {
  checkoutQuoteRequestSchema,
  checkoutQuoteSchema,
  pickupPointsQuerySchema,
  pickupPointsResponseSchema,
} from '@nisha/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { findPickupPoints, pickupCities } from '../delivery/pickup-points';
import { checkoutItems, quoteCheckout } from './checkout.service';

export const checkoutRoutes: FastifyPluginAsyncZod = async (app) => {
  // Итог пересчитывается при смене способа доставки (D-030): цену знает только сервер.
  app.post(
    '/checkout/quote',
    { schema: { body: checkoutQuoteRequestSchema, response: { 200: checkoutQuoteSchema } } },
    async (request) => {
      const items = await checkoutItems(app.db, request.user?.id ?? null, request.body.items);
      return quoteCheckout(app.db, items, request.body.method);
    },
  );

  app.get(
    '/pickup-points',
    {
      schema: {
        querystring: pickupPointsQuerySchema,
        response: { 200: pickupPointsResponseSchema },
      },
    },
    async (request) => ({
      cities: pickupCities(),
      points: findPickupPoints(request.query.city),
    }),
  );
};
