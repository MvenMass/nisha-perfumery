import {
  addressesResponseSchema,
  addressInputSchema,
  addressParamsSchema,
  addressSchema,
} from '@nisha/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requireAuth, signedInUser } from '../../plugins/auth';
import { createAddress, deleteAddress, listAddresses, updateAddress } from './addresses.service';

export const addressesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.get('/addresses', { schema: { response: { 200: addressesResponseSchema } } }, (request) =>
    listAddresses(app.db, signedInUser(request).id),
  );

  app.post(
    '/addresses',
    { schema: { body: addressInputSchema, response: { 201: addressSchema } } },
    async (request, reply) => {
      const address = await createAddress(app.db, signedInUser(request).id, request.body);
      return reply.code(201).send(address);
    },
  );

  app.patch(
    '/addresses/:id',
    {
      schema: {
        params: addressParamsSchema,
        body: addressInputSchema,
        response: { 200: addressSchema },
      },
    },
    (request) => updateAddress(app.db, signedInUser(request).id, request.params.id, request.body),
  );

  app.delete(
    '/addresses/:id',
    { schema: { params: addressParamsSchema } },
    async (request, reply) => {
      await deleteAddress(app.db, signedInUser(request).id, request.params.id);
      return reply.code(204).send();
    },
  );
};
