/**
 * Нарушение уникальности PostgreSQL (23505) и имя ограничения. Drizzle заворачивает ошибку
 * драйвера в свою, поэтому смотрим и на саму ошибку, и на её cause.
 */
export function uniqueViolation(error: unknown): string | undefined {
  for (const candidate of [error, error instanceof Error ? error.cause : undefined]) {
    if (
      typeof candidate === 'object' &&
      candidate !== null &&
      'code' in candidate &&
      candidate.code === '23505' &&
      'constraint' in candidate &&
      typeof candidate.constraint === 'string'
    ) {
      return candidate.constraint;
    }
  }
  return undefined;
}
