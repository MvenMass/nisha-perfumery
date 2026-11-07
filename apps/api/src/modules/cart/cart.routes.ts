import {
  cartItemInputSchema,
  cartItemParamsSchema,
  cartItemsRequestSchema,
  cartResponseSchema,
} from '@nisha/contracts';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requireAuth } from '../../plugins/auth';
import { getCart, mergeCart, quoteCart, removeCartItem, setCartItem } from './cart.service';

// После requireAuth пользователь есть всегда; проверка оставлена, чтобы не полагаться на порядок хуков молча.
function userId(request: FastifyRequest): string {
  if (!request.user) throw new Error('requireAuth не выполнился перед обработчиком корзины');
  return request.user.id;
}

const response = { 200: cartResponseSchema };

export const cartRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/cart', { preHandler: requireAuth, schema: { response } }, async (request) =>
    getCart(app.db, userId(request)),
  );

  app.put(
    '/cart/items',
    { preHandler: requireAuth, schema: { body: cartItemInputSchema, response } },
    async (request) => setCartItem(app.db, userId(request), request.body),
  );

  app.delete(
    '/cart/items/:variantId',
    { preHandler: requireAuth, schema: { params: cartItemParamsSchema, response } },
    async (request) => removeCartItem(app.db, userId(request), request.params.variantId),
  );

  app.post(
    '/cart/merge',
    { preHandler: requireAuth, schema: { body: cartItemsRequestSchema, response } },
    async (request) => mergeCart(app.db, userId(request), request.body.items),
  );

  // Гостевая корзина живёт в браузере (D-015): сервер только считает её по актуальным ценам.
  app.post('/cart/quote', { schema: { body: cartItemsRequestSchema, response } }, async (request) =>
    quoteCart(app.db, request.body.items),
  );
};
