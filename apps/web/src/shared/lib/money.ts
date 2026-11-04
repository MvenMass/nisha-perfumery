import { NBSP } from './typograph';

const rublesFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

// Деньги приходят с сервера в копейках (D-003). Считаем целыми числами,
// чтобы не получить 4499,999 из-за деления float.
export function formatPrice(kopecks: number): string {
  if (!Number.isSafeInteger(kopecks) || kopecks < 0) {
    throw new RangeError(
      `Сумма должна быть неотрицательным целым числом копеек, получено: ${kopecks}`,
    );
  }

  const rubles = Math.floor(kopecks / 100);
  const rest = kopecks % 100;
  // Разделитель разрядов в разных движках разный (U+00A0 или U+202F) — приводим к одному.
  const rublesText = rublesFormat.format(rubles).replace(/\s/g, NBSP);
  const restText = rest === 0 ? '' : `,${String(rest).padStart(2, '0')}`;

  return `${rublesText}${restText}${NBSP}₽`;
}
