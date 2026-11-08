import { z } from 'zod';

import { isoDateTimeSchema, kopecksSchema, paginationSchema, uuidSchema } from '../common';
import {
  deliveryMethodSchema,
  orderSchema,
  orderStatusSchema,
  paymentStatusSchema,
} from '../order';

/** GET /admin/orders — фильтр по статусу и поиск по номеру, email или имени. */
export const adminOrderListQuerySchema = z
  .object({
    status: orderStatusSchema.optional(),
    q: z.string().trim().min(1).max(100).optional(),
  })
  .extend(paginationSchema.shape);
export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;

export const adminOrderListItemSchema = z.object({
  id: uuidSchema,
  number: z.number().int().positive(),
  status: orderStatusSchema,
  paymentStatus: paymentStatusSchema,
  createdAt: isoDateTimeSchema,
  contactName: z.string(),
  contactEmail: z.string(),
  deliveryMethod: deliveryMethodSchema,
  totalKopecks: kopecksSchema,
});
export type AdminOrderListItem = z.infer<typeof adminOrderListItemSchema>;

export const adminOrderListResponseSchema = z.object({
  items: z.array(adminOrderListItemSchema),
  total: z.number().int().nonnegative(),
});
export type AdminOrderListResponse = z.infer<typeof adminOrderListResponseSchema>;

/** Заказ для администратора: то же, что видит покупатель, плюс допустимые следующие статусы (D-043). */
export const adminOrderSchema = orderSchema.extend({
  allowedStatuses: z.array(orderStatusSchema),
});
export type AdminOrder = z.infer<typeof adminOrderSchema>;

export const changeOrderStatusSchema = z.object({
  status: orderStatusSchema,
  comment: z.string().trim().max(500).optional(),
});
export type ChangeOrderStatus = z.infer<typeof changeOrderStatusSchema>;
