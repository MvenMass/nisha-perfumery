import { z } from 'zod';

import { cartItemInputSchema, cartResponseSchema, CART_MAX_LINES } from './cart';
import { kopecksSchema } from './common';
import { deliveryMethodSchema } from './order';

/** Пункт выдачи СДЭК (D-031). x и y — положение на карте-заглушке, доли от 0 до 1. */
export const pickupPointSchema = z.object({
  id: z.string(),
  city: z.string(),
  name: z.string(),
  address: z.string(),
  hours: z.string(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});
export type PickupPoint = z.infer<typeof pickupPointSchema>;

export const pickupPointsQuerySchema = z.object({
  city: z.string().trim().max(100).optional(),
});

export const pickupPointsResponseSchema = z.object({
  cities: z.array(z.string()),
  points: z.array(pickupPointSchema),
});
export type PickupPointsResponse = z.infer<typeof pickupPointsResponseSchema>;

/**
 * POST /checkout/quote — итог оформления при выбранном способе доставки.
 * items — только у гостя, как в POST /orders (D-047).
 */
export const checkoutQuoteRequestSchema = z.object({
  method: deliveryMethodSchema,
  items: z.array(cartItemInputSchema).max(CART_MAX_LINES).optional(),
});
export type CheckoutQuoteRequest = z.infer<typeof checkoutQuoteRequestSchema>;

export const checkoutQuoteSchema = z.object({
  cart: cartResponseSchema,
  deliveryPriceKopecks: kopecksSchema,
  /** Сколько осталось до бесплатной доставки; 0 — уже бесплатно или способ бесплатный. */
  untilFreeDeliveryKopecks: kopecksSchema,
  totalKopecks: kopecksSchema,
});
export type CheckoutQuote = z.infer<typeof checkoutQuoteSchema>;
