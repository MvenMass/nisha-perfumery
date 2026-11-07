const rublesFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

/** Сумма для писем: «12 300 ₽». Копейки целые (D-003), дробная часть в каталоге не встречается. */
export function formatRubles(kopecks: number): string {
  const rest = kopecks % 100;
  const rubles = rublesFormat.format(Math.floor(kopecks / 100));
  return `${rubles}${rest === 0 ? '' : `,${String(rest).padStart(2, '0')}`} ₽`;
}
