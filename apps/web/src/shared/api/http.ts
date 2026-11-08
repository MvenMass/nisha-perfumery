import { csrfResponseSchema, errorResponseSchema } from '@nisha/contracts';
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

const CSRF_COOKIE = 'nisha_csrf';
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const prefix = `${name}=`;
  const found = document.cookie.split('; ').find((part) => part.startsWith(prefix));
  return found ? decodeURIComponent(found.slice(prefix.length)) : undefined;
}

// Double-submit CSRF (D-006): токен из cookie повторяется в заголовке. Если cookie ещё нет
// (первый визит), сервер выдаёт её по GET /api/auth/csrf.
async function csrfToken(): Promise<string> {
  return readCookie(CSRF_COOKIE) ?? (await apiRequest('/api/auth/csrf', csrfResponseSchema)).token;
}

// Все запросы к api идут через эту функцию: cookie сессии, CSRF-заголовок, единый разбор ошибок,
// проверка ответа схемой из contracts.
export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  // FormData (загрузка снимков) браузер оформляет сам — с границей multipart в заголовке.
  if (init.body !== undefined && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (UNSAFE_METHODS.has((init.method ?? 'GET').toUpperCase())) {
    headers.set('x-csrf-token', await csrfToken());
  }

  let response: Response;
  try {
    response = await fetch(path, { ...init, headers, credentials: 'include' });
  } catch (error) {
    throw new ApiError(0, 'NETWORK', 'Нет соединения с сервером', error);
  }

  // 204 — успех без тела (выход): схема ответа в этом случае z.undefined().
  const data = response.status === 204 ? undefined : await readJson(response);

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
