import multipart from '@fastify/multipart';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requireRole } from '../../plugins/auth';
import { MAX_IMAGE_BYTES } from '../storage/images';
import { adminCatalogRoutes } from './admin-catalog.routes';
import { adminContentRoutes } from './admin-content.routes';
import { adminImagesRoutes } from './admin-images.routes';
import { adminOrdersRoutes } from './admin-orders.routes';

/**
 * Все маршруты /api/admin/* (D-033). Роль проверяется один раз на весь плагин и до разбора тела:
 * новый маршрут нельзя забыть защитить, а гость получает 401, а не ошибку валидации.
 */
export const adminRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', requireRole('admin'));
  // Загрузка снимков: один файл до 10 МБ — больше для витрины не нужно, а память api не резиновая.
  await app.register(multipart, { limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 2 } });
  await app.register(adminOrdersRoutes);
  await app.register(adminCatalogRoutes);
  await app.register(adminImagesRoutes);
  await app.register(adminContentRoutes);
};
