import { z } from 'zod';

import {
  densitySchema,
  imageSchema,
  kopecksSchema,
  paginationSchema,
  queryListSchema,
  referenceSchema,
  slugSchema,
  uuidSchema,
} from './common';

export const catalogSortSchema = z.enum(['popular', 'price_asc', 'price_desc', 'new']);
export type CatalogSort = z.infer<typeof catalogSortSchema>;

// Цена в URL — в целых рублях: `?priceMin=4000` читается человеком. Сервер переводит в копейки.
const rublesSchema = z.coerce.number().int().nonnegative().max(10_000_000);

// Пустой параметр в URL (`?q=`) означает «нет фильтра», а не ошибку.
const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

/**
 * Поля фильтра по отдельности: клиент разбирает URL поле за полем и отбрасывает только неверное,
 * а не весь запрос (ручная правка адреса не должна сбрасывать остальные фильтры).
 */
export const catalogQueryFieldsSchema = z
  .object({
    category: queryListSchema(slugSchema),
    material: queryListSchema(slugSchema),
    collection: queryListSchema(slugSchema),
    density: queryListSchema(densitySchema),
    volume: queryListSchema(z.coerce.number().int().positive()),
    priceMin: z.preprocess(emptyToUndefined, rublesSchema.optional()),
    priceMax: z.preprocess(emptyToUndefined, rublesSchema.optional()),
    /** Поиск по названию, номеру образца, материалу и нотам. */
    q: z.preprocess(emptyToUndefined, z.string().trim().min(2).max(60).optional()),
    sort: catalogSortSchema.default('popular'),
  })
  .extend(paginationSchema.shape);

/** GET /products — фильтры каталога. Объём и цена применяются к одному варианту (D-025). */
export const catalogQuerySchema = catalogQueryFieldsSchema.refine(
  ({ priceMin, priceMax }) =>
    priceMin === undefined || priceMax === undefined || priceMin <= priceMax,
  { message: 'Нижняя граница цены больше верхней', path: ['priceMin'] },
);
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
/** Сырые параметры до разбора — то, что лежит в URL. */
export type CatalogQueryInput = z.input<typeof catalogQuerySchema>;

export const productListItemSchema = z.object({
  id: uuidSchema,
  slug: slugSchema,
  specimenNumber: z.number().int().positive(),
  name: z.string(),
  material: referenceSchema,
  /** Для этикетки образца на главной: «вулканическое плато». */
  origin: z.string(),
  density: densitySchema,
  /** Первые ноты пирамиды для карточки: «перец, ладан, ветивер». */
  keyNotes: z.array(z.string()),
  /** Минимальная цена среди активных объёмов (D-025). */
  priceFromKopecks: kopecksSchema,
  volumesMl: z.array(z.number().int().positive()),
  inStock: z.boolean(),
  isBestseller: z.boolean(),
  isNew: z.boolean(),
  image: imageSchema.nullable(),
});
export type ProductListItem = z.infer<typeof productListItemSchema>;

export const productListResponseSchema = z.object({
  items: z.array(productListItemSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});
export type ProductListResponse = z.infer<typeof productListResponseSchema>;

const facetSchema = referenceSchema.extend({ count: z.number().int().nonnegative() });

/** GET /catalog/filters — доступные значения фильтров со счётчиками. */
export const catalogFiltersResponseSchema = z.object({
  categories: z.array(facetSchema),
  materials: z.array(facetSchema.extend({ swatchColor: z.string() })),
  collections: z.array(facetSchema),
  densities: z.array(z.object({ value: densitySchema, count: z.number().int().nonnegative() })),
  volumes: z.array(
    z.object({ volumeMl: z.number().int().positive(), count: z.number().int().nonnegative() }),
  ),
  /** null — в каталоге нет ни одного активного варианта. */
  price: z.object({ minKopecks: kopecksSchema, maxKopecks: kopecksSchema }).nullable(),
});
export type CatalogFiltersResponse = z.infer<typeof catalogFiltersResponseSchema>;
