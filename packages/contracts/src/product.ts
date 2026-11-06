import { z } from 'zod';

import { productListItemSchema } from './catalog';
import {
  densitySchema,
  emailSchema,
  imageSchema,
  positiveKopecksSchema,
  referenceSchema,
  slugSchema,
  uuidSchema,
} from './common';

export const noteLevelSchema = z.enum(['top', 'heart', 'base']);
export type NoteLevel = z.infer<typeof noteLevelSchema>;

export const productVariantSchema = z.object({
  id: uuidSchema,
  volumeMl: z.number().int().positive(),
  sku: z.string(),
  priceKopecks: positiveKopecksSchema,
  stock: z.number().int().nonnegative(),
  /** Остаток не больше порога из настроек магазина — подсказка «Осталось N». */
  isLowStock: z.boolean(),
});
export type ProductVariant = z.infer<typeof productVariantSchema>;

/** GET /products/:slug */
export const productDetailSchema = z.object({
  id: uuidSchema,
  slug: slugSchema,
  specimenNumber: z.number().int().positive(),
  name: z.string(),
  collection: referenceSchema.nullable(),
  material: referenceSchema,
  categories: z.array(referenceSchema),
  origin: z.string(),
  density: densitySchema,
  concentration: z.string(),
  longevityHours: z.number().int().positive().nullable(),
  description: z.string(),
  story: z.string().nullable(),
  notes: z.object({
    top: z.array(z.string()),
    heart: z.array(z.string()),
    base: z.array(z.string()),
  }),
  /** Сколько звучит каждый слой — толщина слоёв и шкала пирамиды. */
  layers: z.object({
    topMinutes: z.number().int().positive(),
    heartMinutes: z.number().int().positive(),
    baseMinutes: z.number().int().positive(),
  }),
  variants: z.array(productVariantSchema),
  images: z.array(imageSchema),
  isBestseller: z.boolean(),
  isNew: z.boolean(),
});
export type ProductDetail = z.infer<typeof productDetailSchema>;

/** «Из той же породы» (D-026). */
export const relatedProductsResponseSchema = z.object({
  items: z.array(productListItemSchema),
});
export type RelatedProductsResponse = z.infer<typeof relatedProductsResponseSchema>;

/**
 * POST /stock-notifications — подписка на товар целиком (D-029).
 * У вошедшего пользователя email можно не передавать: сервер подставит адрес из аккаунта.
 */
export const stockNotificationRequestSchema = z.object({
  productId: uuidSchema,
  email: emailSchema.optional(),
});
export type StockNotificationRequest = z.infer<typeof stockNotificationRequestSchema>;

export const stockNotificationResponseSchema = z.object({
  status: z.enum(['subscribed', 'already_subscribed']),
});
export type StockNotificationResponse = z.infer<typeof stockNotificationResponseSchema>;
