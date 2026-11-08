import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requireRole } from '../../plugins/auth';
import { adminCatalogRoutes } from './admin-catalog.routes';
import { adminImagesRoutes } from './admin-images.routes';
import { adminOrdersRoutes } from './admin-orders.routes';

/**
 * Все маршруты /api/admin/* (D-033). Роль проверяется один раз на весь плагин и до разбора тела:
 * новый маршрут нельзя забыть защитить, а гость получает 401, а не ошибку валидации.
 */
export const adminRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', requireRole('admin'));
  await app.register(adminOrdersRoutes);
  await app.register(adminCatalogRoutes);
  await app.register(adminImagesRoutes);
};
