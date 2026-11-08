import { deliveryMethodSchema } from '@nisha/contracts';
import type { CartItemInput, CheckoutQuote, DeliveryMethod } from '@nisha/contracts';

import type { DbExecutor } from '../../database/client';
import { buildCart, normalizeItems } from '../cart/cart.calculator';
import { findCartId, findCartItems, findVariants } from '../cart/cart.repository';
import { findStoreSettings } from '../catalog/catalog.repository';
import { deliveryPrice } from '../delivery/delivery';

/**
 * Позиции, которые оформляются: у вошедшего — его серверная корзина, у гостя — переданные
 * в запросе (D-047). Гостю items обязательны, иначе оформлять нечего.
 */
export async function checkoutItems(
  db: DbExecutor,
  userId: string | null,
  guestItems: CartItemInput[] | undefined,
): Promise<CartItemInput[]> {
  if (!userId) return normalizeItems(guestItems ?? []);
  const cartId = await findCartId(db, userId);
  return cartId ? findCartItems(db, cartId) : [];
}

/** Итог оформления: корзина по ценам базы и доставка — одно правило для расчёта и для заказа. */
export async function quoteCheckout(
  db: DbExecutor,
  items: CartItemInput[],
  method: DeliveryMethod,
): Promise<CheckoutQuote> {
  // По очереди, не через Promise.all: функция работает и внутри транзакции заказа,
  // а у транзакции одно соединение — параллельные запросы в нём pg запрещает.
  const variants = await findVariants(
    db,
    items.map((item) => item.variantId),
  );
  const settings = await findStoreSettings(db);
  const cart = buildCart(items, variants);
  const delivery = deliveryPrice(method, cart.summary.itemsTotalKopecks, settings);
  return {
    cart,
    deliveryPriceKopecks: delivery.priceKopecks,
    untilFreeDeliveryKopecks: delivery.untilFreeKopecks,
    totalKopecks: cart.summary.itemsTotalKopecks + delivery.priceKopecks,
    options: deliveryMethodSchema.options.map((option) => ({
      method: option,
      priceKopecks: deliveryPrice(option, cart.summary.itemsTotalKopecks, settings).priceKopecks,
    })),
  };
}
