import {
  articleParamsSchema,
  articleSchema,
  articlesQuerySchema,
  articlesResponseSchema,
  consultationRequestSchema,
} from '@nisha/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { createConsultation, getArticle, listArticles } from './content.service';

export const contentRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/articles',
    { schema: { querystring: articlesQuerySchema, response: { 200: articlesResponseSchema } } },
    async (request) => listArticles(app.db, request.query),
  );

  app.get(
    '/articles/:slug',
    { schema: { params: articleParamsSchema, response: { 200: articleSchema } } },
    async (request) => getArticle(app.db, request.params.slug),
  );

  app.post(
    '/consultations',
    {
      // Форма открыта гостям — ограничиваем частоту, чтобы её не использовали для спама.
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      schema: { body: consultationRequestSchema },
    },
    async (request, reply) => {
      await createConsultation(app.db, request.body);
      return reply.code(204).send();
    },
  );
};
