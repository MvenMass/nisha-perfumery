import { createHash, randomBytes } from 'node:crypto';

/** Случайный секрет для cookie и ссылок: 32 байта, безопасен в URL. */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Секреты уходят только клиенту; в БД — их SHA-256, чтобы утечка таблицы не давала рабочих ключей. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
