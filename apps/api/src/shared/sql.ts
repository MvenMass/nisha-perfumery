/** Подстрока для ILIKE: % и _ во вводе пользователя — спецсимволы шаблона, их экранируем. */
export function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}
