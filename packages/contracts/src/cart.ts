import { z } from 'zod';

import {
  imageSchema,
  kopecksSchema,
  positiveKopecksSchema,
  slugSchema,
  uuidSchema,
} from './common';

// Клиент передаёт только вариант и количество: цены и итоги считает сервер (CLAUDE.md, D-007).
export const cartItemInputSchema = z.object({
  variantId: uuidSchema,
  quantity: z.number().int().min(1).max(99),
});
export type CartItemInput = z.infer<typeof cartItemInputSchema>;

/** POST /cart/merge (гостевая корзина при входе) и POST /cart/quote (расчёт гостевой корзины). */
export const cartItemsRequestSchema = z.object({
  items: z.array(cartItemInputSchema).max(50),
});
export type CartItemsRequest = z.infer<typeof cartItemsRequestSchema>;

/**
 * available — можно купить в нужном количестве;
 * insufficient_stock — остатка меньше, чем в корзине (в сумму идёт доступное количество);
 * out_of_stock — закончился; unavailable — снят с продажи.
 */
export const cartLineStatusSchema = z.enum([
  'available',
  'insufficient_stock',
  'out_of_stock',
  'unavailable',
]);
export type CartLineStatus = z.infer<typeof cartLineStatusSchema>;

export const cartLineSchema = z.object({
  variantId: uuidSchema,
  productId: uuidSchema,
  productSlug: slugSchema,
  productName: z.string(),
  specimenNumber: z.number().int().positive(),
  volumeMl: z.number().int().positive(),
  concentration: z.string(),
  priceKopecks: positiveKopecksSchema,
  quantity: z.number().int().positive(),
  /** Сколько можно купить сейчас — граница для степпера. */
  availableQuantity: z.number().int().nonnegative(),
  status: cartLineStatusSchema,
  /** 0 для позиций, которые не входят в сумму (D-028). */
  lineTotalKopecks: kopecksSchema,
  image: imageSchema.nullable(),
});
export type CartLine = z.infer<typeof cartLineSchema>;

export const cartResponseSchema = z.object({
  lines: z.array(cartLineSchema),
  // Счётчики и сумма — только по доступным позициям, по одному правилу везде (D-028).
  summary: z.object({
    productsCount: z.number().int().nonnegative(),
    bottlesCount: z.number().int().nonnegative(),
    itemsTotalKopecks: kopecksSchema,
  }),
});
export type CartResponse = z.infer<typeof cartResponseSchema>;
