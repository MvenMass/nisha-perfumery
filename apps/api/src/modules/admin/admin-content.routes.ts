import {
  adminArticleSchema,
  adminArticlesResponseSchema,
  adminConsultationsQuerySchema,
  adminConsultationsResponseSchema,
  adminHeroSlideSchema,
  adminHeroSlidesResponseSchema,
  adminStoreSettingsSchema,
  articleInputSchema,
  consultationStatusUpdateSchema,
  heroSlideInputSchema,
  idParamsSchema,
  slidesOrderSchema,
  storeSettingsInputSchema,
  uploadResponseSchema,
} from '@nisha/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { readUpload } from '../storage/upload';
import {
  deleteArticle,
  deleteSlide,
  getAdminArticle,
  getSettings,
  listAdminArticles,
  listConsultations,
  listSlides,
  reorderSlides,
  saveArticle,
  saveSlide,
  setConsultationStatus,
  updateSettings,
  uploadContentImage,
} from './content.service';

export const adminContentRoutes: FastifyPluginAsyncZod = async (app) => {
  // --- Слайды главной ---

  app.get(
    '/slides',
    { schema: { response: { 200: adminHeroSlidesResponseSchema } } },
    async () => ({
      items: await listSlides(app.db),
    }),
  );

  app.post(
    '/slides',
    { schema: { body: heroSlideInputSchema, response: { 201: adminHeroSlideSchema } } },
    async (request, reply) => reply.code(201).send(await saveSlide(app.db, null, request.body)),
  );

  app.put(
    '/slides/:id',
    {
      schema: {
        params: idParamsSchema,
        body: heroSlideInputSchema,
        response: { 200: adminHeroSlideSchema },
      },
    },
    async (request) => saveSlide(app.db, request.params.id, request.body),
  );

  app.patch(
    '/slides/order',
    { schema: { body: slidesOrderSchema, response: { 200: adminHeroSlidesResponseSchema } } },
    async (request) => ({ items: await reorderSlides(app.db, request.body.ids) }),
  );

  app.delete('/slides/:id', { schema: { params: idParamsSchema } }, async (request, reply) => {
    await deleteSlide(app.db, request.params.id);
    return reply.code(204).send();
  });

  // --- Журнал ---

  app.get(
    '/articles',
    { schema: { response: { 200: adminArticlesResponseSchema } } },
    async () => ({ items: await listAdminArticles(app.db) }),
  );

  app.get(
    '/articles/:id',
    { schema: { params: idParamsSchema, response: { 200: adminArticleSchema } } },
    async (request) => getAdminArticle(app.db, request.params.id),
  );

  app.post(
    '/articles',
    { schema: { body: articleInputSchema, response: { 201: adminArticleSchema } } },
    async (request, reply) => reply.code(201).send(await saveArticle(app.db, null, request.body)),
  );

  app.put(
    '/articles/:id',
    {
      schema: {
        params: idParamsSchema,
        body: articleInputSchema,
        response: { 200: adminArticleSchema },
      },
    },
    async (request) => saveArticle(app.db, request.params.id, request.body),
  );

  app.delete('/articles/:id', { schema: { params: idParamsSchema } }, async (request, reply) => {
    await deleteArticle(app.db, request.params.id);
    return reply.code(204).send();
  });

  // --- Заявки на консультацию ---

  app.get(
    '/consultations',
    {
      schema: {
        querystring: adminConsultationsQuerySchema,
        response: { 200: adminConsultationsResponseSchema },
      },
    },
    async (request) => ({ items: await listConsultations(app.db, request.query.status) }),
  );

  app.patch(
    '/consultations/:id',
    { schema: { params: idParamsSchema, body: consultationStatusUpdateSchema } },
    async (request, reply) => {
      await setConsultationStatus(app.db, request.params.id, request.body.status);
      return reply.code(204).send();
    },
  );

  // --- Настройки магазина ---

  app.get('/settings', { schema: { response: { 200: adminStoreSettingsSchema } } }, async () =>
    getSettings(app.db),
  );

  app.put(
    '/settings',
    { schema: { body: storeSettingsInputSchema, response: { 200: adminStoreSettingsSchema } } },
    async (request) => updateSettings(app.db, request.body),
  );

  // --- Снимки для слайдов и статей ---

  app.post('/uploads', { schema: { response: { 200: uploadResponseSchema } } }, async (request) => {
    const upload = await readUpload(request);
    return { url: await uploadContentImage(app.storage, upload.buffer) };
  });
};
