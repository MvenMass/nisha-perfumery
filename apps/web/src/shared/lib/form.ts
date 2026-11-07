import type { z } from 'zod';

/**
 * Первая ошибка каждого поля — для подписи под полем. Путь склеивается точкой,
 * чтобы вложенные формы (контакты, адрес) различали поля: «contact.email».
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.map(String).join('.');
    result[field] ??= issue.message;
  }
  return result;
}
