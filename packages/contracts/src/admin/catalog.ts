import { z } from 'zod';

import {
  densitySchema,
  imageSchema,
  kopecksSchema,
  paginationSchema,
  positiveKopecksSchema,
  slugSchema,
  uuidSchema,
} from '../common';

const requiredText = (max: number, message: string) => z.string().trim().min(1, message).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullable();

// --- Справочники ---

export const materialInputSchema = z.object({
  slug: slugSchema,
  name: requiredText(60, 'Укажите название'),
  // Цвет свотча в фильтрах хранится у материала (CONVENTIONS.md), формат как в БД.
  swatchColor: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^#[0-9A-F]{6}$/, 'Цвет в формате #A1B2C3'),
  position: z.number().int().min(0).max(999),
});
export type MaterialInput = z.infer<typeof materialInputSchema>;

export const categoryInputSchema = z.object({
  slug: slugSchema,
  name: requiredText(60, 'Укажите название'),
  position: z.number().int().min(0).max(999),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const collectionInputSchema = categoryInputSchema.extend({
  description: optionalText(500),
});
export type CollectionInput = z.infer<typeof collectionInputSchema>;

export const dictionaryKindSchema = z.enum(['materials', 'categories', 'collections']);
export type DictionaryKind = z.infer<typeof dictionaryKindSchema>;

// Схемы ответа без transform: Zod 4 не умеет «кодировать» ответ обратно через преобразования.
const dictionaryItemSchema = z.object({
  id: uuidSchema,
  slug: slugSchema,
  name: z.string(),
  position: z.number().int(),
  productsCount: z.number().int(),
});

export const dictionariesResponseSchema = z.object({
  materials: z.array(dictionaryItemSchema.extend({ swatchColor: z.string() })),
  categories: z.array(dictionaryItemSchema),
  collections: z.array(dictionaryItemSchema.extend({ description: z.string().nullable() })),
});
export type DictionariesResponse = z.infer<typeof dictionariesResponseSchema>;

export const dictionaryParamsSchema = z.object({ kind: dictionaryKindSchema, id: uuidSchema });

// --- Товар ---

const noteNamesSchema = z
  .array(z.string().trim().toLowerCase().min(1).max(60))
  .min(1, 'Хотя бы одна нота')
  .max(8);

export const adminVariantInputSchema = z.object({
  /** Есть id — правка существующего объёма, нет — новый. */
  id: uuidSchema.optional(),
  volumeMl: z.number().int().positive().max(5000),
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{2,40}$/, 'Латиница, цифры и дефис'),
  priceKopecks: positiveKopecksSchema,
  stock: z.number().int().min(0).max(100_000),
  isActive: z.boolean(),
});
export type AdminVariantInput = z.infer<typeof adminVariantInputSchema>;

/**
 * Товар целиком (POST /admin/products, PUT /admin/products/:id). Объём, которого нет в списке,
 * не удаляется, а отключается: на него ссылаются заказы и корзины.
 */
export const adminProductInputSchema = z
  .object({
    slug: slugSchema,
    specimenNumber: z.number().int().positive().max(9999),
    name: requiredText(80, 'Укажите название'),
    materialId: uuidSchema,
    collectionId: uuidSchema.nullable(),
    categoryIds: z.array(uuidSchema).max(10),
    origin: requiredText(120, 'Укажите происхождение'),
    density: densitySchema,
    concentration: requiredText(60, 'Укажите концентрацию'),
    longevityHours: z.number().int().positive().max(72).nullable(),
    description: requiredText(2000, 'Нужно описание'),
    story: optionalText(4000),
    // Время, когда слой затихает (D-048): верх раньше сердца, сердце раньше базы.
    topMinutes: z.number().int().positive().max(10_000),
    heartMinutes: z.number().int().positive().max(10_000),
    baseMinutes: z.number().int().positive().max(10_000),
    notes: z.object({ top: noteNamesSchema, heart: noteNamesSchema, base: noteNamesSchema }),
    variants: z.array(adminVariantInputSchema).min(1, 'Нужен хотя бы один объём').max(10),
    isBestseller: z.boolean(),
    isNew: z.boolean(),
    isFeatured: z.boolean(),
    isPublished: z.boolean(),
  })
  .superRefine((product, ctx) => {
    if (!(
      product.topMinutes < product.heartMinutes && product.heartMinutes < product.baseMinutes
    )) {
      ctx.addIssue({
        code: 'custom',
        path: ['baseMinutes'],
        message: 'Слои затихают по порядку: верх раньше сердца, сердце раньше базы',
      });
    }
    const volumes = product.variants.map((variant) => variant.volumeMl);
    if (new Set(volumes).size !== volumes.length) {
      ctx.addIssue({ code: 'custom', path: ['variants'], message: 'Объёмы не должны повторяться' });
    }
    const notes = [...product.notes.top, ...product.notes.heart, ...product.notes.base];
    if (new Set(notes).size !== notes.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['notes'],
        message: 'Одна нота — только в одном слое',
      });
    }
    if (product.isPublished && !product.variants.some((variant) => variant.isActive)) {
      ctx.addIssue({
        code: 'custom',
        path: ['isPublished'],
        message: 'Для публикации нужен хотя бы один включённый объём',
      });
    }
  });
export type AdminProductInput = z.infer<typeof adminProductInputSchema>;

export const adminImageSchema = imageSchema.extend({
  id: uuidSchema,
  position: z.number().int().nonnegative(),
});
export type AdminImage = z.infer<typeof adminImageSchema>;

export const adminProductSchema = z.object({
  id: uuidSchema,
  slug: slugSchema,
  specimenNumber: z.number().int().positive(),
  name: z.string(),
  materialId: uuidSchema,
  collectionId: uuidSchema.nullable(),
  categoryIds: z.array(uuidSchema),
  origin: z.string(),
  density: densitySchema,
  concentration: z.string(),
  longevityHours: z.number().int().positive().nullable(),
  description: z.string(),
  story: z.string().nullable(),
  topMinutes: z.number().int().positive(),
  heartMinutes: z.number().int().positive(),
  baseMinutes: z.number().int().positive(),
  notes: z.object({
    top: z.array(z.string()),
    heart: z.array(z.string()),
    base: z.array(z.string()),
  }),
  variants: z.array(
    adminVariantInputSchema.extend({ id: uuidSchema, priceKopecks: positiveKopecksSchema }),
  ),
  isBestseller: z.boolean(),
  isNew: z.boolean(),
  isFeatured: z.boolean(),
  isPublished: z.boolean(),
  images: z.array(adminImageSchema),
  /** Товар с заказами не удаляется — только снимается с публикации. */
  hasOrders: z.boolean(),
});
export type AdminProduct = z.infer<typeof adminProductSchema>;

export const adminProductListQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(100).optional(),
    status: z.enum(['published', 'draft']).optional(),
  })
  .extend(paginationSchema.shape);
export type AdminProductListQuery = z.infer<typeof adminProductListQuerySchema>;

export const adminProductListItemSchema = z.object({
  id: uuidSchema,
  slug: slugSchema,
  specimenNumber: z.number().int().positive(),
  name: z.string(),
  materialName: z.string(),
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
  priceFromKopecks: kopecksSchema.nullable(),
  totalStock: z.number().int().nonnegative(),
  variantsCount: z.number().int().nonnegative(),
  image: imageSchema.nullable(),
});
export type AdminProductListItem = z.infer<typeof adminProductListItemSchema>;

export const adminProductListResponseSchema = z.object({
  items: z.array(adminProductListItemSchema),
  total: z.number().int().nonnegative(),
});
export type AdminProductListResponse = z.infer<typeof adminProductListResponseSchema>;

export const idParamsSchema = z.object({ id: uuidSchema });

export const imageParamsSchema = z.object({ id: uuidSchema, imageId: uuidSchema });

/** PATCH /admin/products/:id/images — порядок и подписи снимков. */
export const imagesUpdateSchema = z.object({
  images: z.array(z.object({ id: uuidSchema, alt: requiredText(300, 'Опишите снимок') })).max(20),
});
export type ImagesUpdate = z.infer<typeof imagesUpdateSchema>;
