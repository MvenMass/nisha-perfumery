import type { ErrorCode } from '@nisha/contracts';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  OUT_OF_STOCK: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

/** Ошибка, которую модули бросают намеренно: обработчик отдаёт её клиенту как есть (D-018). */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = STATUS_BY_CODE[code];
    this.details = details;
  }
}

/** Код ответа Fastify и плагинов → код ошибки контракта. */
export function codeForStatus(statusCode: number): ErrorCode {
  const byStatus: Partial<Record<number, ErrorCode>> = {
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    429: 'RATE_LIMITED',
  };
  return byStatus[statusCode] ?? 'VALIDATION_FAILED';
}
