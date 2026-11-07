import {
  authResponseSchema,
  csrfResponseSchema,
  loginRequestSchema,
  meResponseSchema,
  registerRequestSchema,
  setPasswordRequestSchema,
  updateProfileRequestSchema,
} from '@nisha/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requireAuth, signedInUser } from '../../plugins/auth';
import { issueCsrfToken } from '../../plugins/csrf';
import { authenticate, registerUser, setPasswordByToken, updateProfile } from './auth.service';
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  setSessionCookie,
} from './session';

type AuthRoutesOptions = { secure: boolean };

export const authRoutes: FastifyPluginAsyncZod<AuthRoutesOptions> = async (app, { secure }) => {
  // Новая сессия при каждом входе: прежняя (если была) удаляется — защита от фиксации сессии.
  async function startSession(request: FastifyRequest, reply: FastifyReply, userId: string) {
    const previous = request.cookies[SESSION_COOKIE];
    if (previous) await deleteSession(app.db, previous);
    const { token, expiresAt } = await createSession(app.db, userId);
    setSessionCookie(reply, token, expiresAt, secure);
  }

  app.get(
    '/auth/csrf',
    { schema: { response: { 200: csrfResponseSchema } } },
    (request, reply) => ({
      token: issueCsrfToken(request, reply, secure),
    }),
  );

  app.post(
    '/auth/register',
    {
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      schema: { body: registerRequestSchema, response: { 201: authResponseSchema } },
    },
    async (request, reply) => {
      const user = await registerUser(
        { db: app.db, mailer: app.mailer, webOrigin: app.env.WEB_ORIGIN },
        request.body,
      );
      await startSession(request, reply, user.id);
      return reply.code(201).send({ user });
    },
  );

  app.post(
    '/auth/login',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: { body: loginRequestSchema, response: { 200: authResponseSchema } },
    },
    async (request, reply) => {
      const user = await authenticate(app.db, request.body);
      await startSession(request, reply, user.id);
      return { user };
    },
  );

  app.post('/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) await deleteSession(app.db, token);
    clearSessionCookie(reply, secure);
    return reply.code(204).send();
  });

  app.get('/auth/me', { schema: { response: { 200: meResponseSchema } } }, (request) => ({
    user: request.user,
  }));

  app.patch(
    '/auth/me',
    {
      preHandler: requireAuth,
      schema: { body: updateProfileRequestSchema, response: { 200: authResponseSchema } },
    },
    async (request) => ({
      user: await updateProfile(app.db, signedInUser(request).id, request.body),
    }),
  );

  app.post(
    '/auth/set-password',
    {
      // Токен из ссылки — 32 случайных байта, но частоту всё равно ограничиваем, как вход.
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: { body: setPasswordRequestSchema, response: { 200: authResponseSchema } },
    },
    async (request, reply) => {
      const user = await setPasswordByToken(app.db, request.body);
      await startSession(request, reply, user.id);
      return { user };
    },
  );
};
