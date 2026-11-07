import type {
  CartItemInput,
  CartLine,
  CreateOrderRequest,
  CreateOrderResponse,
  DeliveryAddressSnapshot,
  Order,
  OrderListQuery,
  OrderListResponse,
  RepeatOrderResponse,
  User,
} from '@nisha/contracts';
import { and, eq } from 'drizzle-orm';

import type { Database, DbExecutor } from '../../database/client';
import { addresses, cartItems, orderItems, orders, payments, users } from '../../database/schema';
import { AppError } from '../../shared/errors';
import { hashToken, newToken } from '../../shared/token';
import { insertAddress } from '../addresses/addresses.service';
import { issuePasswordToken, sendSetPasswordMail } from '../auth/password-link';
import { findCartId, findVariants } from '../cart/cart.repository';
import { mergeCart } from '../cart/cart.service';
import { checkoutItems, quoteCheckout } from '../checkout/checkout.service';
import { findPickupPoint } from '../delivery/pickup-points';
import type { Mailer } from '../mailer/mailer';
import type { PaymentProvider } from '../payments/provider';
import { resolveGuestOwner } from './guest-account';
import { ACTIVE_STATUSES, assertTransition, DONE_STATUSES } from './order-status';
import {
  addHistory,
  changeStock,
  findExpiredOrderIds,
  findHistories,
  findItemsWithImages,
  findOrderByKey,
  findOrderItems,
  findOrderRow,
  findUserOrders,
  loadOrder,
  lockVariants,
} from './orders.repository';
import type { OrderRow } from './orders.repository';

/** Срок на оплату (D-016): после него заказ отменяется, остатки возвращаются. */
export const PAYMENT_WINDOW_MS = 5 * 60 * 1000;

export type OrderDeps = {
  db: Database;
  mailer: Mailer;
  provider: PaymentProvider;
  webOrigin: string;
};

type Delivery = {
  address: DeliveryAddressSnapshot | null;
  comment: string | null;
};

async function resolveDelivery(
  db: DbExecutor,
  request: CreateOrderRequest,
  viewer: User | null,
): Promise<Delivery> {
  const { delivery } = request;
  const comment = request.comment ?? null;
  if (delivery.method === 'boutique') return { address: null, comment };

  if (delivery.method === 'pickup_point') {
    const point = findPickupPoint(delivery.pickupPointId);
    if (!point) throw new AppError('VALIDATION_FAILED', 'Выберите пункт выдачи из списка');
    return {
      address: {
        kind: 'pickup_point',
        pointId: point.id,
        address: `${point.city}, ${point.address}`,
      },
      comment,
    };
  }

  if ('addressId' in delivery.address) {
    // Сохранённый адрес — только свой: у гостя сохранённых адресов нет.
    const [saved] = viewer
      ? await db
          .select()
          .from(addresses)
          .where(and(eq(addresses.id, delivery.address.addressId), eq(addresses.userId, viewer.id)))
      : [];
    if (!saved) throw new AppError('VALIDATION_FAILED', 'Выберите адрес доставки');
    return {
      address: {
        kind: 'courier',
        city: saved.city,
        street: saved.street,
        apartment: saved.apartment,
      },
      comment: comment ?? saved.comment,
    };
  }

  const { newAddress, save } = delivery.address;
  if (viewer && save) await insertAddress(db, viewer.id, newAddress, 'skip');
  return {
    address: {
      kind: 'courier',
      city: newAddress.city,
      street: newAddress.street,
      apartment: newAddress.apartment ?? null,
    },
    comment: comment ?? newAddress.comment ?? null,
  };
}

function unavailableLines(lines: CartLine[]) {
  return lines
    .filter((line) => line.status !== 'available')
    .map((line) => ({
      variantId: line.variantId,
      productName: line.productName,
      volumeMl: line.volumeMl,
      available: line.availableQuantity,
    }));
}

function isUniqueViolation(error: unknown, constraint: string): boolean {
  const cause = error instanceof Error && 'cause' in error ? error.cause : error;
  return (
    typeof cause === 'object' &&
    cause !== null &&
    'code' in cause &&
    cause.code === '23505' &&
    'constraint' in cause &&
    cause.constraint === constraint
  );
}

type Created = { row: OrderRow; accessToken: string | null; ownerHasPassword: boolean };

/**
 * Оформление заказа в одной транзакции (D-016): блокировка вариантов, проверка остатков,
 * списание, снимок позиций и цен из базы, история, платёж, очистка корзины.
 * Цены клиента не участвуют: позиции пересчитываются тем же quoteCheckout, что и итог на экране.
 */
async function createInTransaction(
  deps: OrderDeps,
  viewer: User | null,
  request: CreateOrderRequest,
): Promise<Created> {
  return deps.db.transaction(async (tx) => {
    const owner = viewer
      ? { userId: viewer.id, hasPassword: viewer.hasPassword }
      : await resolveGuestOwner(tx, request.contact);

    // Повтор той же попытки (двойное нажатие, обрыв сети) возвращает уже созданный заказ.
    const existing = await findOrderByKey(tx, owner.userId, request.idempotencyKey);
    if (existing) return replay(tx, existing, viewer, owner.hasPassword);

    const items = await checkoutItems(tx, viewer?.id ?? null, request.items);
    if (items.length === 0) throw new AppError('VALIDATION_FAILED', 'Корзина пуста');

    await lockVariants(
      tx,
      items.map((item) => item.variantId),
    );
    const quote = await quoteCheckout(tx, items, request.delivery.method);
    const missing = unavailableLines(quote.cart.lines);
    if (missing.length > 0 || quote.cart.lines.length !== items.length) {
      throw new AppError('OUT_OF_STOCK', 'Часть образцов закончилась — проверьте корзину', {
        lines: missing,
      });
    }

    const delivery = await resolveDelivery(tx, request, viewer);
    for (const line of quote.cart.lines) await changeStock(tx, line.variantId, -line.quantity);

    const accessToken = viewer ? null : newToken();
    const [row] = await tx
      .insert(orders)
      .values({
        userId: owner.userId,
        contactName: request.contact.name,
        contactPhone: request.contact.phone,
        contactEmail: request.contact.email,
        deliveryMethod: request.delivery.method,
        deliveryAddress: delivery.address,
        deliveryComment: delivery.comment,
        itemsTotalKopecks: quote.cart.summary.itemsTotalKopecks,
        deliveryPriceKopecks: quote.deliveryPriceKopecks,
        totalKopecks: quote.totalKopecks,
        idempotencyKey: request.idempotencyKey,
        accessTokenHash: accessToken ? hashToken(accessToken) : null,
        paymentExpiresAt: new Date(Date.now() + PAYMENT_WINDOW_MS),
      })
      .returning();
    if (!row) throw new Error('Заказ не сохранился');

    await tx.insert(orderItems).values(
      quote.cart.lines.map((line) => ({
        orderId: row.id,
        variantId: line.variantId,
        productSlug: line.productSlug,
        productName: line.productName,
        specimenNumber: line.specimenNumber,
        volumeMl: line.volumeMl,
        priceKopecks: line.priceKopecks,
        quantity: line.quantity,
      })),
    );
    await addHistory(tx, row.id, 'pending', { changedBy: viewer?.id ?? null });

    const payment = await deps.provider.createPayment({
      orderId: row.id,
      amountKopecks: row.totalKopecks,
    });
    await tx.insert(payments).values({
      orderId: row.id,
      provider: deps.provider.name,
      externalId: payment.externalId,
      amountKopecks: row.totalKopecks,
    });

    if (viewer) {
      const cartId = await findCartId(tx, viewer.id);
      if (cartId) await tx.delete(cartItems).where(eq(cartItems.cartId, cartId));
      // Телефон из первого заказа запоминаем в профиле — в следующий раз форма подставит его сама.
      if (!viewer.phone) {
        await tx.update(users).set({ phone: request.contact.phone }).where(eq(users.id, viewer.id));
      }
    }
    return { row, accessToken, ownerHasPassword: owner.hasPassword };
  });
}

/** Ключ доступа хранится только хешем, поэтому при повторе гостю выдаётся новый. */
async function replay(
  db: DbExecutor,
  row: OrderRow,
  viewer: User | null,
  ownerHasPassword: boolean,
): Promise<Created> {
  if (viewer) return { row, accessToken: null, ownerHasPassword };
  const accessToken = newToken();
  await db
    .update(orders)
    .set({ accessTokenHash: hashToken(accessToken) })
    .where(eq(orders.id, row.id));
  return { row, accessToken, ownerHasPassword };
}

export async function createOrder(
  deps: OrderDeps,
  viewer: User | null,
  request: CreateOrderRequest,
): Promise<CreateOrderResponse> {
  let created: Created;
  try {
    created = await createInTransaction(deps, viewer, request);
  } catch (error) {
    // Два одинаковых запроса одновременно: второй упрётся в уникальный ключ — отдаём первый.
    if (!isUniqueViolation(error, 'orders_user_idempotency_unique')) throw error;
    created = await createInTransaction(deps, viewer, request);
  }

  const { row, accessToken, ownerHasPassword } = created;
  // Письмо — после фиксации транзакции: откат не должен оставлять отправленных ссылок.
  if (!viewer && !ownerHasPassword) {
    const token = await issuePasswordToken(deps.db, row.userId);
    await sendSetPasswordMail(deps.mailer, {
      email: row.contactEmail,
      token,
      webOrigin: deps.webOrigin,
      orderNumber: row.number,
    });
  }
  return { order: await loadOrder(deps.db, row), accessToken };
}

/**
 * Отмена с возвратом остатков (D-016). Вызывается при отказе оплаты, по истечении срока,
 * а в этапе 8 — из админки. Заказ должен быть заблокирован вызывающим кодом.
 */
export async function cancelLockedOrder(
  db: DbExecutor,
  row: OrderRow,
  options: { comment: string; changedBy?: string | null; paymentFailed?: boolean },
): Promise<void> {
  assertTransition(row.status, 'cancelled', row.deliveryMethod);
  for (const item of await findOrderItems(db, row.id)) {
    if (item.variantId) await changeStock(db, item.variantId, item.quantity);
  }
  await db
    .update(orders)
    .set({
      status: 'cancelled',
      paymentExpiresAt: null,
      ...(row.paymentStatus === 'pending' ? { paymentStatus: 'failed' as const } : {}),
    })
    .where(eq(orders.id, row.id));
  if (row.paymentStatus === 'pending') {
    await db
      .update(payments)
      .set({ status: 'failed' })
      .where(and(eq(payments.orderId, row.id), eq(payments.status, 'pending')));
  }
  await addHistory(db, row.id, 'cancelled', {
    changedBy: options.changedBy ?? null,
    comment: options.comment,
  });
}

const isExpired = (row: OrderRow, now: Date) =>
  row.status === 'pending' && row.paymentExpiresAt !== null && row.paymentExpiresAt < now;

/** Отменяет заказ, если срок оплаты прошёл. true — отменили сейчас. */
export async function cancelIfExpired(db: Database, orderId: string, now = new Date()) {
  return db.transaction(async (tx) => {
    const row = await findOrderRow(tx, orderId, { forUpdate: true });
    if (!row || !isExpired(row, now)) return false;
    await cancelLockedOrder(tx, row, { comment: 'Истёк срок оплаты' });
    return true;
  });
}

/** Периодическая задача: все просроченные неоплаченные заказы. Возвращает число отменённых. */
export async function cancelExpiredOrders(db: Database, now = new Date()): Promise<number> {
  let cancelled = 0;
  for (const id of await findExpiredOrderIds(db, now)) {
    if (await cancelIfExpired(db, id, now)) cancelled += 1;
  }
  return cancelled;
}

/**
 * Заказ для покупателя: свой по сессии или гостевой по ключу из ссылки.
 * Чужой и несуществующий неразличимы — 404 в обоих случаях.
 */
export async function findAccessibleOrder(
  db: Database,
  orderId: string,
  viewer: User | null,
  token: string | undefined,
): Promise<OrderRow> {
  await cancelIfExpired(db, orderId);
  const row = await findOrderRow(db, orderId);
  const allowed =
    row !== undefined &&
    ((viewer !== null && row.userId === viewer.id) ||
      (token !== undefined && row.accessTokenHash === hashToken(token)));
  if (!row || !allowed) throw new AppError('NOT_FOUND', 'Заказ не найден');
  return row;
}

export async function getOrder(
  db: Database,
  orderId: string,
  viewer: User | null,
  token: string | undefined,
): Promise<Order> {
  return loadOrder(db, await findAccessibleOrder(db, orderId, viewer, token));
}

/** История в кабинете с вкладками «Все / Активные / Завершённые» (D-017). */
export async function listOrders(
  db: Database,
  userId: string,
  query: OrderListQuery,
): Promise<OrderListResponse> {
  const statuses =
    query.filter === 'active'
      ? ACTIVE_STATUSES
      : query.filter === 'done'
        ? DONE_STATUSES
        : undefined;
  const { rows, total } = await findUserOrders(db, userId, statuses, query);
  const ids = rows.map((row) => row.id);
  const [items, histories] = await Promise.all([
    findItemsWithImages(db, ids),
    findHistories(db, ids),
  ]);
  return {
    total,
    items: rows.map((row) => {
      const own = items.filter((item) => item.orderId === row.id);
      return {
        id: row.id,
        number: row.number,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        deliveryMethod: row.deliveryMethod,
        totalKopecks: row.totalKopecks,
        productNames: [...new Set(own.map((item) => item.productName))],
        bottlesCount: own.reduce((sum, item) => sum + item.quantity, 0),
        images: own.flatMap((item) => (item.image ? [item.image] : [])).slice(0, 3),
        history: histories
          .filter((event) => event.orderId === row.id)
          .map((event) => ({ status: event.status, at: event.at.toISOString() })),
      };
    }),
  };
}

/**
 * «Повторить заказ» (D-041): доступное кладётся в корзину по текущим ценам по правилам
 * слияния (сумма с тем, что уже лежит, с обрезкой остатком); недоступное возвращается с причиной.
 */
export async function repeatOrder(
  db: Database,
  orderId: string,
  user: User,
): Promise<RepeatOrderResponse> {
  const row = await findAccessibleOrder(db, orderId, user, undefined);
  const items = await findOrderItems(db, row.id);
  const variants = new Map(
    (
      await findVariants(
        db,
        items.flatMap((item) => (item.variantId ? [item.variantId] : [])),
      )
    ).map((variant) => [variant.variantId, variant]),
  );

  const available: CartItemInput[] = [];
  const unavailable: RepeatOrderResponse['unavailable'] = [];
  for (const item of items) {
    const variant = item.variantId ? variants.get(item.variantId) : undefined;
    const base = { productName: item.productName, volumeMl: item.volumeMl };
    if (!variant) unavailable.push({ ...base, reason: 'removed' });
    else if (!variant.isPublished || !variant.isActive)
      unavailable.push({ ...base, reason: 'unpublished' });
    else if (variant.stock === 0) unavailable.push({ ...base, reason: 'out_of_stock' });
    else available.push({ variantId: variant.variantId, quantity: item.quantity });
  }

  const cart = await mergeCart(db, user.id, available);
  return { cart, unavailable };
}
