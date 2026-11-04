import { errorResponseSchema } from '@nisha/contracts';
import type { ErrorCode } from '@nisha/contracts';
import type { z } from 'zod';

// Кроме кодов сервера: NETWORK — запрос не дошёл, BAD_RESPONSE — ответ не по контракту.
export type ApiErrorCode = ErrorCode | 'NETWORK' | 'BAD_RESPONSE';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details: unknown;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch (error) {
    throw new ApiError(response.status, 'BAD_RESPONSE', 'Сервер вернул не JSON', error);
  }
}

// Все запросы к api идут через эту функцию: cookie сессии, единый разбор ошибок,
// проверка ответа схемой из contracts.
export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(path, { ...init, headers, credentials: 'include' });
  } catch (error) {
    throw new ApiError(0, 'NETWORK', 'Нет соединения с сервером', error);
  }

  const data = await readJson(response);

  if (!response.ok) {
    const parsed = errorResponseSchema.safeParse(data);
    if (parsed.success) {
      const { code, message, details } = parsed.data.error;
      throw new ApiError(response.status, code, message, details);
    }
    throw new ApiError(response.status, 'BAD_RESPONSE', 'Неожиданный ответ сервера', data);
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError(
      response.status,
      'BAD_RESPONSE',
      'Ответ не совпадает с контрактом',
      parsed.error,
    );
  }
  return parsed.data;
}
