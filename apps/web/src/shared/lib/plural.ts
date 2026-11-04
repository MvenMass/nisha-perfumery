// Формы для 1, 2–4 и 5+ («товар», «товара», «товаров»).
export type PluralForms = readonly [one: string, few: string, many: string];

export function plural(count: number, [one, few, many]: PluralForms): string {
  const n = Math.abs(count) % 100;
  const last = n % 10;
  if (n > 10 && n < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}
