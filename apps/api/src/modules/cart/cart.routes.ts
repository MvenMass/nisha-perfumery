import {
  cartItemInputSchema,
  cartItemParamsSchema,
  cartItemsRequestSchema,
  cartResponseSchema,
} from '@nisha/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requireAuth, signedInUser } from '../../plugins/auth';
import { getCart, mergeCart, quoteCart, removeCartItem, setCartItem } from './cart.service';

const response = { 200: cartResponseSchema };

export const cartRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/cart', { preHandler: requireAuth, schema: { response } }, async (request) =>
    getCart(app.db, signedInUser(request).id),
  );

  app.put(
    '/cart/items',
    { preHandler: requireAuth, schema: { body: cartItemInputSchema, response } },
    async (request) => setCartItem(app.db, signedInUser(request).id, request.body),
  );

  app.delete(
    '/cart/items/:variantId',
    { preHandler: requireAuth, schema: { params: cartItemParamsSchema, response } },
    async (request) => removeCartItem(app.db, signedInUser(request).id, request.params.variantId),
  );

  app.post(
    '/cart/merge',
    { preHandler: requireAuth, schema: { body: cartItemsRequestSchema, response } },
    async (request) => mergeCart(app.db, signedInUser(request).id, request.body.items),
  );

  // Гостевая корзина живёт в браузере (D-015): сервер только считает её по актуальным ценам.
  app.post('/cart/quote', { schema: { body: cartItemsRequestSchema, response } }, async (request) =>
    quoteCart(app.db, request.body.items),
  );
};
