import type { ErrorResponse } from '@nisha/contracts';
import type { FastifyInstance } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

function clientErrorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) return undefined;
  const { statusCode } = error;
  return typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500
    ? statusCode
    : undefined;
}

// Единый формат ошибок API (D-018). Регистрируется на корневом экземпляре,
// поэтому действует для всех маршрутов.
export function setupErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      const body: ErrorResponse = {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Неверные данные запроса',
          details: error.validation.map((issue) => ({
            path: issue.instancePath,
            message: issue.message,
          })),
        },
      };
      return reply.code(400).send(body);
    }

    // Ошибки клиента от самого Fastify (битый JSON, неверный Content-Type и т. п.).
    const statusCode = clientErrorStatus(error);
    if (statusCode !== undefined) {
      const body: ErrorResponse = {
        error: {
          code: statusCode === 404 ? 'NOT_FOUND' : 'VALIDATION_FAILED',
          message: error instanceof Error ? error.message : 'Некорректный запрос',
        },
      };
      return reply.code(statusCode).send(body);
    }

    // Детали внутренней ошибки остаются в логе и не уходят клиенту.
    request.log.error({ err: error }, 'Необработанная ошибка');
    const body: ErrorResponse = {
      error: { code: 'INTERNAL', message: 'Внутренняя ошибка сервера' },
    };
    return reply.code(500).send(body);
  });

  app.setNotFoundHandler((request, reply) => {
    const body: ErrorResponse = {
      error: { code: 'NOT_FOUND', message: `Маршрут ${request.method} ${request.url} не найден` },
    };
    return reply.code(404).send(body);
  });
}
