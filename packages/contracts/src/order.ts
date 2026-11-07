import { z } from 'zod';

import { addressInputSchema } from './address';
import { personNameSchema } from './auth';
import { CART_MAX_LINES, cartItemInputSchema, cartResponseSchema } from './cart';
import {
  emailSchema,
  imageSchema,
  isoDateTimeSchema,
  kopecksSchema,
  paginationSchema,
  phoneSchema,
  positiveKopecksSchema,
  slugSchema,
  uuidSchema,
} from './common';

export const orderStatusSchema = z.enum([
  'pending',
  'paid',
  'shipped',
  'ready_for_pickup',
  'delivered',
  'cancelled',
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const paymentStatusSchema = z.enum(['pending', 'succeeded', 'failed', 'refunded']);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const deliveryMethodSchema = z.enum(['courier', 'pickup_point', 'boutique']);
export type DeliveryMethod = z.infer<typeof deliveryMethodSchema>;

export const contactSchema = z.object({
  name: personNameSchema,
  phone: phoneSchema,
  email: emailSchema,
});
export type Contact = z.infer<typeof contactSchema>;

/** Куда везти: сохранённый адрес, новый адрес (с сохранением или без), пункт СДЭК или бутик. */
export const deliveryTargetSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('courier'),
    address: z.union([
      z.object({ addressId: uuidSchema }),
      z.object({ newAddress: addressInputSchema, save: z.boolean().default(false) }),
    ]),
  }),
  z.object({ method: z.literal('pickup_point'), pickupPointId: z.string().min(1).max(64) }),
  z.object({ method: z.literal('boutique') }),
]);
export type DeliveryTarget = z.infer<typeof deliveryTargetSchema>;

/**
 * POST /orders. Цен здесь нет намеренно: сервер пересчитывает всё по актуальным данным (D-007),
 * а лишние поля из запроса отбрасываются схемой.
 */
export const createOrderRequestSchema = z.object({
  contact: contactSchema,
  delivery: deliveryTargetSchema,
  comment: z.string().trim().max(500).optional(),
  /** Повторная отправка с тем же ключом вернёт уже созданный заказ (D-016). */
  idempotencyKey: uuidSchema,
  /** Только для гостя: корзина живёт в браузере. У вошедшего берётся серверная корзина. */
  items: z.array(cartItemInputSchema).min(1).max(CART_MAX_LINES).optional(),
});
export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;

export const deliveryAddressSnapshotSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('courier'),
    city: z.string(),
    street: z.string(),
    apartment: z.string().nullable(),
  }),
  z.object({ kind: z.literal('pickup_point'), pointId: z.string(), address: z.string() }),
]);
export type DeliveryAddressSnapshot = z.infer<typeof deliveryAddressSnapshotSchema>;

export const orderItemSchema = z.object({
  /** null — вариант удалён из каталога, позиция осталась только в истории. */
  variantId: uuidSchema.nullable(),
  productSlug: slugSchema,
  productName: z.string(),
  specimenNumber: z.number().int().positive(),
  volumeMl: z.number().int().positive(),
  priceKopecks: positiveKopecksSchema,
  quantity: z.number().int().positive(),
  lineTotalKopecks: positiveKopecksSchema,
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderStatusEventSchema = z.object({
  status: orderStatusSchema,
  at: isoDateTimeSchema,
});

export const orderSchema = z.object({
  id: uuidSchema,
  number: z.number().int().positive(),
  status: orderStatusSchema,
  paymentStatus: paymentStatusSchema,
  createdAt: isoDateTimeSchema,
  contact: contactSchema,
  deliveryMethod: deliveryMethodSchema,
  deliveryAddress: deliveryAddressSnapshotSchema.nullable(),
  deliveryComment: z.string().nullable(),
  items: z.array(orderItemSchema),
  itemsTotalKopecks: positiveKopecksSchema,
  deliveryPriceKopecks: kopecksSchema,
  totalKopecks: positiveKopecksSchema,
  /** Даты для шкалы статуса в кабинете. */
  history: z.array(orderStatusEventSchema),
  paymentExpiresAt: isoDateTimeSchema.nullable(),
});
export type Order = z.infer<typeof orderSchema>;

/**
 * Ответ POST /orders. accessToken — только для заказа без входа: по нему гость открывает
 * оплату и подтверждение (D-060). У вошедшего — null, доступ даёт сессия.
 */
export const createOrderResponseSchema = z.object({
  order: orderSchema,
  accessToken: z.string().nullable(),
});
export type CreateOrderResponse = z.infer<typeof createOrderResponseSchema>;

export const orderParamsSchema = z.object({ id: uuidSchema });

/** GET /orders/:id?token=… — ключ гостевого доступа к заказу. */
export const orderAccessQuerySchema = z.object({
  token: z.string().min(16).max(128).optional(),
});

/**
 * POST /payments/mock/notify — аналог уведомления платёжного провайдера для мок-оплаты.
 * Настоящий провайдер присылает такое уведомление сам; здесь его отправляет страница оплаты.
 */
export const mockPaymentNotifySchema = z.object({
  orderId: uuidSchema,
  token: z.string().min(16).max(128).optional(),
  result: z.enum(['succeeded', 'failed']),
});
export type MockPaymentNotify = z.infer<typeof mockPaymentNotifySchema>;

/** Вкладки кабинета: активные — до «Доставлен», завершённые — доставленные и отменённые (D-017). */
export const orderListQuerySchema = z
  .object({ filter: z.enum(['all', 'active', 'done']).default('all') })
  .extend(paginationSchema.shape);
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

export const orderListItemSchema = z.object({
  id: uuidSchema,
  number: z.number().int().positive(),
  status: orderStatusSchema,
  createdAt: isoDateTimeSchema,
  deliveryMethod: deliveryMethodSchema,
  totalKopecks: positiveKopecksSchema,
  productNames: z.array(z.string()),
  bottlesCount: z.number().int().positive(),
  images: z.array(imageSchema),
  /** Для шкалы статуса активного заказа прямо в списке, как в account.html. */
  history: z.array(orderStatusEventSchema),
});
export type OrderListItem = z.infer<typeof orderListItemSchema>;

export const orderListResponseSchema = z.object({
  items: z.array(orderListItemSchema),
  total: z.number().int().nonnegative(),
});
export type OrderListResponse = z.infer<typeof orderListResponseSchema>;

/** POST /orders/:id/repeat — что добавилось и что нет (D-041). */
export const repeatOrderResponseSchema = z.object({
  cart: cartResponseSchema,
  unavailable: z.array(
    z.object({
      productName: z.string(),
      volumeMl: z.number().int().positive(),
      reason: z.enum(['removed', 'unpublished', 'out_of_stock']),
    }),
  ),
});
export type RepeatOrderResponse = z.infer<typeof repeatOrderResponseSchema>;
