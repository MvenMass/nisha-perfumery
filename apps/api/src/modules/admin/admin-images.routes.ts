import {
  adminImageSchema,
  idParamsSchema,
  imageParamsSchema,
  imagesUpdateSchema,
} from '@nisha/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { AppError } from '../../shared/errors';
import { readUpload } from '../storage/upload';
import { deleteProductImage, updateProductImages, uploadProductImage } from './images.service';

const imagesResponse = { 200: z.object({ images: z.array(adminImageSchema) }) };

const altSchema = z.string().trim().min(1, 'Опишите снимок').max(300);

export const adminImagesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/products/:id/images',
    { schema: { params: idParamsSchema, response: imagesResponse } },
    async (request) => {
      const upload = await readUpload(request);
      const alt = altSchema.safeParse(upload.field('alt') ?? '');
      if (!alt.success)
        throw new AppError('VALIDATION_FAILED', 'Опишите снимок: подпись нужна для alt');
      const images = await uploadProductImage(
        { db: app.db, storage: app.storage },
        request.params.id,
        upload.buffer,
        alt.data,
      );
      return { images };
    },
  );

  app.patch(
    '/products/:id/images',
    { schema: { params: idParamsSchema, body: imagesUpdateSchema, response: imagesResponse } },
    async (request) => ({
      images: await updateProductImages(app.db, request.params.id, request.body),
    }),
  );

  app.delete(
    '/products/:id/images/:imageId',
    { schema: { params: imageParamsSchema, response: imagesResponse } },
    async (request) => ({
      images: await deleteProductImage(
        { db: app.db, storage: app.storage },
        request.params.id,
        request.params.imageId,
      ),
    }),
  );
};
