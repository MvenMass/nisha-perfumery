import multipart from '@fastify/multipart';
import {
  adminImageSchema,
  idParamsSchema,
  imageParamsSchema,
  imagesUpdateSchema,
} from '@nisha/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { AppError } from '../../shared/errors';
import { MAX_IMAGE_BYTES } from '../storage/images';
import { deleteProductImage, updateProductImages, uploadProductImage } from './images.service';

const imagesResponse = { 200: z.object({ images: z.array(adminImageSchema) }) };

const altSchema = z.string().trim().min(1, 'Опишите снимок').max(300);

export const adminImagesRoutes: FastifyPluginAsyncZod = async (app) => {
  // Один файл до 10 МБ: больше для снимка товара не нужно, а память api не резиновая.
  await app.register(multipart, { limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 2 } });

  app.post(
    '/products/:id/images',
    { schema: { params: idParamsSchema, response: imagesResponse } },
    async (request) => {
      const file = await request.file();
      if (!file) throw new AppError('VALIDATION_FAILED', 'Выберите файл снимка');
      let buffer: Buffer;
      try {
        buffer = await file.toBuffer();
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'FST_REQ_FILE_TOO_LARGE') {
          throw new AppError('VALIDATION_FAILED', 'Файл больше 10 МБ');
        }
        throw error;
      }
      const altField = file.fields.alt;
      const alt = altSchema.safeParse(
        altField && !Array.isArray(altField) && altField.type === 'field' ? altField.value : '',
      );
      if (!alt.success)
        throw new AppError('VALIDATION_FAILED', 'Опишите снимок: подпись нужна для alt');
      const images = await uploadProductImage(
        { db: app.db, storage: app.storage },
        request.params.id,
        buffer,
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
