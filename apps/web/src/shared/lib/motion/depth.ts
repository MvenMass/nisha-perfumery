/**
 * Счётчик глубины на разделителе: «−040 м» разбирается на число и формат, чтобы при
 * анимации показывать промежуточные значения той же ширины: −000, −013, −027, −040 м.
 */
export function parseDepth(
  text: string,
): { value: number; format: (value: number) => string } | undefined {
  const match = /^(\D*?)(\d+)(.*)$/.exec(text);
  if (!match) return undefined;
  const [, prefix = '', digits = '', suffix = ''] = match;
  return {
    value: Number(digits),
    format: (value) =>
      `${prefix}${String(Math.round(value)).padStart(digits.length, '0')}${suffix}`,
  };
}
