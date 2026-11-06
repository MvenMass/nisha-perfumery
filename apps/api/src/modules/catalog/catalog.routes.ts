import {
  catalogFiltersResponseSchema,
  catalogQuerySchema,
  productDetailSchema,
  productListResponseSchema,
  relatedProductsResponseSchema,
  slugSchema,
} from '@nisha/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { getCatalogFilters, getProduct, getRelatedProducts, listProducts } from './catalog.service';

const slugParamsSchema = z.object({ slug: slugSchema });

export const catalogRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/products',
    { schema: { querystring: catalogQuerySchema, response: { 200: productListResponseSchema } } },
    (request) => listProducts(app.db, request.query),
  );

  app.get('/catalog/filters', { schema: { response: { 200: catalogFiltersResponseSchema } } }, () =>
    getCatalogFilters(app.db),
  );

  app.get(
    '/products/:slug',
    { schema: { params: slugParamsSchema, response: { 200: productDetailSchema } } },
    (request) => getProduct(app.db, request.params.slug),
  );

  app.get(
    '/products/:slug/related',
    { schema: { params: slugParamsSchema, response: { 200: relatedProductsResponseSchema } } },
    async (request) => ({ items: await getRelatedProducts(app.db, request.params.slug) }),
  );
};
