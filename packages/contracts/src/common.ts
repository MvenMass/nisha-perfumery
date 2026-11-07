import { z } from 'zod';

export const uuidSchema = z.uuid();

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Только латиница в нижнем регистре, цифры и дефисы');

// Деньги — целые копейки (D-003). В JSON это обычные числа: до 2^53 точность не теряется.
export const kopecksSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const positiveKopecksSchema = kopecksSchema.positive();

// Email сравнивается без учёта регистра, поэтому нормализуется до проверки — так же, как в БД.
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Проверьте адрес почты').max(254, 'Слишком длинный адрес'));

export const isoDateTimeSchema = z.iso.datetime({ offset: true });

export const densitySchema = z.enum(['light', 'medium', 'high']);
export type Density = z.infer<typeof densitySchema>;

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(48).default(12),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Список значений из query-строки: принимает `?a=x&a=y`, `?a=x,y` и отсутствие параметра.
 * Так один и тот же URL каталога разбирается и на сервере, и на клиенте.
 */
export function queryListSchema<T extends z.ZodType>(item: T) {
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return [];
    const values = Array.isArray(value) ? value : [value];
    return values
      .flatMap((entry: unknown) => (typeof entry === 'string' ? entry.split(',') : [entry]))
      .map((entry: unknown) => (typeof entry === 'string' ? entry.trim() : entry))
      .filter((entry: unknown) => entry !== '');
  }, z.array(item).max(20));
}

/** Ссылка на запись справочника в ответах: материал, категория, коллекция. */
export const referenceSchema = z.object({
  slug: slugSchema,
  name: z.string(),
});
export type Reference = z.infer<typeof referenceSchema>;

export const imageSchema = z.object({
  url: z.string(),
  alt: z.string(),
});
export type Image = z.infer<typeof imageSchema>;
