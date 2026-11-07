import {
  favoriteIdsRequestSchema,
  favoriteParamsSchema,
  favoritesResponseSchema,
} from '@nisha/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requireAuth, signedInUser } from '../../plugins/auth';
import {
  addFavorite,
  listFavorites,
  mergeFavorites,
  quoteFavorites,
  removeFavorite,
} from './favorites.service';

const response = { 200: favoritesResponseSchema };

export const favoritesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/favorites', { preHandler: requireAuth, schema: { response } }, async (request) =>
    listFavorites(app.db, signedInUser(request).id),
  );

  app.put(
    '/favorites/:productId',
    { preHandler: requireAuth, schema: { params: favoriteParamsSchema } },
    async (request, reply) => {
      await addFavorite(app.db, signedInUser(request).id, request.params.productId);
      return reply.code(204).send();
    },
  );

  app.delete(
    '/favorites/:productId',
    { preHandler: requireAuth, schema: { params: favoriteParamsSchema } },
    async (request, reply) => {
      await removeFavorite(app.db, signedInUser(request).id, request.params.productId);
      return reply.code(204).send();
    },
  );

  app.post(
    '/favorites/merge',
    { preHandler: requireAuth, schema: { body: favoriteIdsRequestSchema, response } },
    async (request) => mergeFavorites(app.db, signedInUser(request).id, request.body.productIds),
  );

  // Гостевое избранное живёт в браузере (D-040): сервер только отдаёт карточки.
  app.post(
    '/favorites/quote',
    { schema: { body: favoriteIdsRequestSchema, response } },
    async (request) => quoteFavorites(app.db, request.body.productIds),
  );
};
