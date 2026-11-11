import type { MockPaymentNotify, Order, User } from '@nisha/contracts';
import { and, eq, sql } from 'drizzle-orm';

import type { Database } from '../../database/client';
import { orders, payments, productVariants, products } from '../../database/schema';
import { AppError } from '../../shared/errors';
import { formatRubles } from '../../shared/money';
import type { Mailer } from '../mailer/mailer';
import { assertTransition } from '../orders/order-status';
import { addHistory, findOrderItems, findOrderRow, loadOrder } from '../orders/orders.repository';
import { cancelIfExpired, cancelLockedOrder, findAccessibleOrder } from '../orders/orders.service';

type PaymentResult = 'succeeded' | 'failed';

/**
 * Результат оплаты от провайдера (D-043). Успех: платёж и заказ «оплачены», растёт популярность
 * товаров. Отказ: заказ отменяется, остатки возвращаются. Повторное уведомление по уже
 * обработанному заказу — 409: провайдеры шлют уведомления повторно, состояние не должно меняться.
 */
export async function applyPaymentResult(
  db: Database,
  orderId: string,
  result: PaymentResult,
): Promise<{ order: Order; paid: boolean }> {
  // Просроченный заказ отменяется отдельной транзакцией: ошибка ниже не должна откатить отмену.
  if (await cancelIfExpired(db, orderId)) {
    throw new AppError(
      'CONFLICT',
      'Время на оплату истекло — заказ отменён, образцы вернулись в продажу',
    );
  }

  const row = await db.transaction(async (tx) => {
    const locked = await findOrderRow(tx, orderId, { forUpdate: true });
    if (!locked) throw new AppError('NOT_FOUND', 'Заказ не найден');
    if (locked.status !== 'pending' || locked.paymentStatus !== 'pending') {
      throw new AppError('CONFLICT', 'Этот заказ уже не ждёт оплаты');
    }

    if (result === 'failed') {
      await cancelLockedOrder(tx, locked, { comment: 'Оплата отклонена' });
    } else {
      assertTransition(locked.status, 'paid', locked.deliveryMethod);
      await tx
        .update(orders)
        .set({ status: 'paid', paymentStatus: 'succeeded', paymentExpiresAt: null })
        .where(eq(orders.id, locked.id));
      await tx
        .update(payments)
        .set({ status: 'succeeded' })
        .where(and(eq(payments.orderId, locked.id), eq(payments.status, 'pending')));
      await addHistory(tx, locked.id, 'paid');
      // Сортировка «популярные» растёт от оплаченных флаконов.
      for (const item of await findOrderItems(tx, locked.id)) {
        if (!item.variantId) continue;
        await tx
          .update(products)
          .set({ popularity: sql`${products.popularity} + ${item.quantity}` })
          .where(
            eq(
              products.id,
              tx
                .select({ id: productVariants.productId })
                .from(productVariants)
                .where(eq(productVariants.id, item.variantId)),
            ),
          );
      }
    }
    const updated = await findOrderRow(tx, locked.id);
    if (!updated) throw new Error('Заказ пропал внутри транзакции');
    return updated;
  });

  return { order: await loadOrder(db, row), paid: result === 'succeeded' };
}

/**
 * Мок-уведомление со страницы оплаты. Нажать «Оплатить» может только тот, кто видит заказ:
 * владелец по сессии или гость по ключу из ссылки.
 */
export async function notifyMockPayment(
  deps: { db: Database; mailer: Mailer },
  input: MockPaymentNotify,
  viewer: User | null,
): Promise<Order> {
  await findAccessibleOrder(deps.db, input.orderId, viewer, input.token);
  const { order, paid } = await applyPaymentResult(deps.db, input.orderId, input.result);
  if (paid) {
    await deps.mailer.send({
      to: order.contact.email,
      subject: `Заказ № ${order.number} оплачен`,
      text: `Спасибо! Мы получили оплату ${formatRubles(order.totalKopecks)} и уже собираем заказ.
Упакуем его вручную и напишем, когда передадим в доставку.`,
    });
  }
  return order;
}
