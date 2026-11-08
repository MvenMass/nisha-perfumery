import {
  adminProductInputSchema,
  adminProductListQuerySchema,
  adminProductListResponseSchema,
  adminProductSchema,
  categoryInputSchema,
  collectionInputSchema,
  dictionariesResponseSchema,
  idParamsSchema,
  materialInputSchema,
} from '@nisha/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { notifyRestock } from '../stock-notifications/notify';
import { deleteDictionaryItem, listDictionaries, saveDictionaryItem } from './dictionaries.service';
import type { DictionaryChange } from './dictionaries.service';
import {
  deleteProduct,
  getAdminProduct,
  listAdminProducts,
  listNoteNames,
  saveProduct,
} from './products.service';

export const adminCatalogRoutes: FastifyPluginAsyncZod = async (app) => {
  /**
   * Письма «Снова в наличии» уходят после ответа: сохранение товара не ждёт почту (D-029).
   * Неотправленные подписки остаются активными и попадут в следующую рассылку.
   */
  function sendRestockMails(productId: string) {
    notifyRestock(
      { db: app.db, mailer: app.mailer, webOrigin: app.env.WEB_ORIGIN },
      productId,
    ).then(
      ({ sent, failed }) => {
        if (sent > 0) app.log.info({ productId, sent }, 'Отправлены письма «Снова в наличии»');
        for (const { email, error } of failed) {
          app.log.error({ err: error, productId, email }, 'Письмо «Снова в наличии» не ушло');
        }
      },
      (error: unknown) =>
        app.log.error({ err: error, productId }, 'Рассылка «Снова в наличии» упала'),
    );
  }

  app.get(
    '/products',
    {
      schema: {
        querystring: adminProductListQuerySchema,
        response: { 200: adminProductListResponseSchema },
      },
    },
    async (request) => listAdminProducts(app.db, request.query),
  );

  app.get(
    '/products/:id',
    { schema: { params: idParamsSchema, response: { 200: adminProductSchema } } },
    async (request) => getAdminProduct(app.db, request.params.id),
  );

  app.post(
    '/products',
    { schema: { body: adminProductInputSchema, response: { 201: adminProductSchema } } },
    async (request, reply) => {
      const { product, restocked } = await saveProduct(app.db, null, request.body);
      if (restocked) sendRestockMails(product.id);
      return reply.code(201).send(product);
    },
  );

  app.put(
    '/products/:id',
    {
      schema: {
        params: idParamsSchema,
        body: adminProductInputSchema,
        response: { 200: adminProductSchema },
      },
    },
    async (request) => {
      const { product, restocked } = await saveProduct(app.db, request.params.id, request.body);
      if (restocked) sendRestockMails(product.id);
      return product;
    },
  );

  app.delete('/products/:id', { schema: { params: idParamsSchema } }, async (request, reply) => {
    await deleteProduct(app.db, request.params.id);
    return reply.code(204).send();
  });

  app.get(
    '/notes',
    { schema: { response: { 200: z.object({ names: z.array(z.string()) }) } } },
    async () => ({ names: await listNoteNames(app.db) }),
  );

  // --- Справочники: у каждого вида своя схема, поэтому и свои маршруты ---

  app.get(
    '/dictionaries',
    { schema: { response: { 200: dictionariesResponseSchema } } },
    async () => listDictionaries(app.db),
  );

  // Тело уже проверено схемой маршрута; повторный parse лишь возвращает точный тип для toChange.
  function dictionaryRoutes<T>(
    kind: DictionaryChange['kind'],
    schema: z.ZodType<T>,
    toChange: (input: T) => DictionaryChange,
  ) {
    app.post(`/dictionaries/${kind}`, { schema: { body: schema } }, async (request, reply) => {
      await saveDictionaryItem(app.db, null, toChange(schema.parse(request.body)));
      return reply.code(204).send();
    });
    app.put(
      `/dictionaries/${kind}/:id`,
      { schema: { params: idParamsSchema, body: schema } },
      async (request, reply) => {
        await saveDictionaryItem(app.db, request.params.id, toChange(schema.parse(request.body)));
        return reply.code(204).send();
      },
    );
    app.delete(
      `/dictionaries/${kind}/:id`,
      { schema: { params: idParamsSchema } },
      async (request, reply) => {
        await deleteDictionaryItem(app.db, kind, request.params.id);
        return reply.code(204).send();
      },
    );
  }

  dictionaryRoutes('materials', materialInputSchema, (input) => ({ kind: 'materials', input }));
  dictionaryRoutes('categories', categoryInputSchema, (input) => ({ kind: 'categories', input }));
  dictionaryRoutes('collections', collectionInputSchema, (input) => ({
    kind: 'collections',
    input,
  }));
};
