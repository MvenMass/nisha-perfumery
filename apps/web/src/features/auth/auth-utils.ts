import { ApiError } from '../../shared/api/http';

const DEFAULT_NEXT = '/account';

/**
 * Куда вернуть после входа. Только пути нашего сайта: `//evil.test` и `/\evil.test` браузер
 * считает адресом другого домена — открытый редирект для фишинга.
 */
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return DEFAULT_NEXT;
  }
  return value;
}

/** Ответ сервера → текст над кнопкой и, если понятно, ошибка конкретного поля. */
export function authErrorMessage(error: unknown): { message: string; field?: string } {
  if (error instanceof ApiError) {
    if (error.code === 'CONFLICT') return { message: error.message, field: 'email' };
    if (error.code === 'UNAUTHORIZED' || error.code === 'RATE_LIMITED') {
      return { message: error.message };
    }
    if (error.code === 'NETWORK') {
      return { message: 'Нет соединения. Проверьте интернет и повторите.' };
    }
  }
  return { message: 'Не получилось. Попробуйте ещё раз чуть позже.' };
}
