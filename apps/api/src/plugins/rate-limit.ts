import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

import { AppError } from '../shared/errors';

// Лимит включается только на маршрутах, где он нужен (подписки, вход, регистрация):
// каталог читают часто, и общий лимит мешал бы обычным покупателям.
export async function setupRateLimit(app: FastifyInstance): Promise<void> {
  await app.register(rateLimit, {
    global: false,
    errorResponseBuilder: (_request, context) =>
      new AppError(
        'RATE_LIMITED',
        `Слишком много запросов. Попробуйте через ${Math.ceil(context.ttl / 1000)} с`,
      ),
  });
}
