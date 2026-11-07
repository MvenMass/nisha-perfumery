import type { Order, OrderStatus } from '@nisha/contracts';
import { and, asc, count, desc, eq, inArray, lt, sql } from 'drizzle-orm';

import type { DbExecutor } from '../../database/client';
import {
  orderItems,
  orderStatusHistory,
  orders,
  productImages,
  productVariants,
  products,
} from '../../database/schema';

export type OrderRow = typeof orders.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;

/**
 * Блокирует строки вариантов до конца транзакции (D-016). Порядок по id одинаков у всех
 * транзакций — два заказа с общими вариантами не ждут друг друга по кругу.
 */
export async function lockVariants(db: DbExecutor, variantIds: string[]): Promise<void> {
  if (variantIds.length === 0) return;
  await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(inArray(productVariants.id, variantIds))
    .orderBy(asc(productVariants.id))
    .for('update');
}

export async function changeStock(db: DbExecutor, variantId: string, delta: number) {
  await db
    .update(productVariants)
    .set({ stock: sql`${productVariants.stock} + ${delta}` })
    .where(eq(productVariants.id, variantId));
}

export async function findOrderRow(
  db: DbExecutor,
  orderId: string,
  options: { forUpdate?: boolean } = {},
): Promise<OrderRow | undefined> {
  const query = db.select().from(orders).where(eq(orders.id, orderId));
  const [row] = options.forUpdate ? await query.for('update') : await query;
  return row;
}

export async function findOrderByKey(
  db: DbExecutor,
  userId: string,
  idempotencyKey: string,
): Promise<OrderRow | undefined> {
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.idempotencyKey, idempotencyKey)));
  return row;
}

export async function findOrderItems(db: DbExecutor, orderId: string): Promise<OrderItemRow[]> {
  return db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .orderBy(asc(orderItems.id));
}

export async function addHistory(
  db: DbExecutor,
  orderId: string,
  status: OrderStatus,
  options: { changedBy?: string | null; comment?: string | null } = {},
) {
  await db.insert(orderStatusHistory).values({
    orderId,
    status,
    changedBy: options.changedBy ?? null,
    comment: options.comment ?? null,
    // clock_timestamp: несколько смен в одной транзакции должны идти по порядку.
    createdAt: sql`clock_timestamp()`,
  });
}

/** Заказ целиком для покупателя: позиции и история статусов. */
export async function loadOrder(db: DbExecutor, row: OrderRow): Promise<Order> {
  const [items, history] = await Promise.all([
    findOrderItems(db, row.id),
    db
      .select({ status: orderStatusHistory.status, at: orderStatusHistory.createdAt })
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, row.id))
      .orderBy(asc(orderStatusHistory.createdAt)),
  ]);
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    paymentStatus: row.paymentStatus,
    createdAt: row.createdAt.toISOString(),
    contact: { name: row.contactName, phone: row.contactPhone, email: row.contactEmail },
    deliveryMethod: row.deliveryMethod,
    deliveryAddress: row.deliveryAddress ?? null,
    deliveryComment: row.deliveryComment,
    items: items.map((item) => ({
      variantId: item.variantId,
      productSlug: item.productSlug,
      productName: item.productName,
      specimenNumber: item.specimenNumber,
      volumeMl: item.volumeMl,
      priceKopecks: item.priceKopecks,
      quantity: item.quantity,
      lineTotalKopecks: item.priceKopecks * item.quantity,
    })),
    itemsTotalKopecks: row.itemsTotalKopecks,
    deliveryPriceKopecks: row.deliveryPriceKopecks,
    totalKopecks: row.totalKopecks,
    history: history.map((event) => ({ status: event.status, at: event.at.toISOString() })),
    paymentExpiresAt:
      row.status === 'pending' && row.paymentExpiresAt ? row.paymentExpiresAt.toISOString() : null,
  };
}

export async function findExpiredOrderIds(db: DbExecutor, now: Date): Promise<string[]> {
  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.status, 'pending'), lt(orders.paymentExpiresAt, now)));
  return rows.map((row) => row.id);
}

export async function findUserOrders(
  db: DbExecutor,
  userId: string,
  statuses: readonly OrderStatus[] | undefined,
  page: { limit: number; offset: number },
) {
  const where = and(
    eq(orders.userId, userId),
    statuses ? inArray(orders.status, [...statuses]) : undefined,
  );
  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(page.limit)
      .offset(page.offset),
    db.select({ value: count() }).from(orders).where(where),
  ]);
  return { rows, total: total?.value ?? 0 };
}

/** Позиции нескольких заказов с обложками товаров — для списка в кабинете одним запросом. */
export async function findItemsWithImages(db: DbExecutor, orderIds: string[]) {
  if (orderIds.length === 0) return [];
  return db
    .select({
      orderId: orderItems.orderId,
      productName: orderItems.productName,
      quantity: orderItems.quantity,
      image: sql<{ url: string; alt: string } | null>`(
        SELECT json_build_object('url', ${productImages.url}, 'alt', ${productImages.alt})
        FROM ${productImages}
        WHERE ${productImages.productId} = ${products.id}
        ORDER BY ${productImages.position}
        LIMIT 1
      )`,
    })
    .from(orderItems)
    .leftJoin(products, eq(products.slug, orderItems.productSlug))
    .where(inArray(orderItems.orderId, orderIds))
    .orderBy(asc(orderItems.id));
}

export async function findHistories(db: DbExecutor, orderIds: string[]) {
  if (orderIds.length === 0) return [];
  return db
    .select({
      orderId: orderStatusHistory.orderId,
      status: orderStatusHistory.status,
      at: orderStatusHistory.createdAt,
    })
    .from(orderStatusHistory)
    .where(inArray(orderStatusHistory.orderId, orderIds))
    .orderBy(asc(orderStatusHistory.createdAt));
}
