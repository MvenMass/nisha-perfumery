import { storeInfoSchema } from '@nisha/contracts';
import type { StoreInfo } from '@nisha/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import type { Database } from '../../database/client';
import { findStoreSettings } from '../catalog/catalog.repository';

// Порог «Осталось N» — внутренняя настройка, наружу не отдаём.
export async function getStoreInfo(db: Database): Promise<StoreInfo> {
  const {
    id: _id,
    lowStockThreshold: _threshold,
    updatedAt: _updatedAt,
    ...info
  } = await findStoreSettings(db);
  return info;
}

export const storeRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/store', { schema: { response: { 200: storeInfoSchema } } }, () => getStoreInfo(app.db));
};
