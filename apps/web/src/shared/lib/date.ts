const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const dayMonthYear = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** «12 ноября»; год — только если дата не из текущего года. */
export function formatDate(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const format = date.getFullYear() === now.getFullYear() ? dayMonth : dayMonthYear;
  // Год Intl пишет как «2025 г.» — сокращение не нужно в подписи к заказу.
  return format.format(date).replace(/\s?г\.$/, '');
}
