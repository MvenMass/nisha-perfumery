import type { StockNotificationRequest, StockNotificationResponse } from '@nisha/contracts';
import { and, eq, sql } from 'drizzle-orm';

import type { Database } from '../../database/client';
import { productVariants, products, stockNotifications } from '../../database/schema';
import { AppError } from '../../shared/errors';

/**
 * Подписка на товар целиком (D-029). Письмо уйдёт, когда закончившийся объём снова появится
 * (этап 8). Подписаться можно, только если чего-то действительно нет в наличии.
 */
export async function subscribeToRestock(
  db: Database,
  request: StockNotificationRequest,
): Promise<{ created: boolean; body: StockNotificationResponse }> {
  // До появления сессий (этап 5) email обязателен; потом вошедшему подставим адрес аккаунта.
  if (!request.email) throw new AppError('VALIDATION_FAILED', 'Укажите email для уведомления');

  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, request.productId), eq(products.isPublished, true)));
  if (!product) throw new AppError('NOT_FOUND', 'Такого образца нет');

  // Отдельный запрос, а не подзапрос в SELECT: в запросе по одной таблице Drizzle
  // не ставит имя таблицы перед колонками в списке полей, и EXISTS сравнил бы не те колонки.
  const [missingVolume] = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(
      and(
        eq(productVariants.productId, product.id),
        eq(productVariants.isActive, true),
        eq(productVariants.stock, 0),
      ),
    )
    .limit(1);
  if (!missingVolume) {
    throw new AppError('CONFLICT', 'Этот образец есть в наличии — его можно заказать сейчас');
  }

  // Частичный уникальный индекс держит один активный запрос на пару (товар, email):
  // повтор не ошибка, а «уже подписаны».
  const inserted = await db
    .insert(stockNotifications)
    .values({ productId: product.id, email: request.email })
    .onConflictDoNothing({
      target: [stockNotifications.productId, stockNotifications.email],
      where: sql`${stockNotifications.notifiedAt} IS NULL`,
    })
    .returning({ id: stockNotifications.id });

  const created = inserted.length > 0;
  return { created, body: { status: created ? 'subscribed' : 'already_subscribed' } };
}
