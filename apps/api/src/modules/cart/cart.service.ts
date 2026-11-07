import { CART_MAX_LINES } from '@nisha/contracts';
import type { CartItemInput, CartResponse } from '@nisha/contracts';

import type { Database } from '../../database/client';
import { AppError } from '../../shared/errors';
import { availableQuantity, buildCart, mergedQuantity, normalizeItems } from './cart.calculator';
import {
  deleteCartItem,
  findCartId,
  findCartItems,
  findVariants,
  getOrCreateCartId,
  upsertCartItem,
} from './cart.repository';
import type { Executor } from './cart.repository';

const variantIds = (items: Array<{ variantId: string }>) => items.map((item) => item.variantId);

async function cartFor(db: Executor, cartId: string | undefined): Promise<CartResponse> {
  const items = cartId ? await findCartItems(db, cartId) : [];
  return buildCart(items, await findVariants(db, variantIds(items)));
}

export async function getCart(db: Database, userId: string): Promise<CartResponse> {
  return cartFor(db, await findCartId(db, userId));
}

/** Расчёт гостевой корзины: ничего не пишет, цены берёт только из базы. */
export async function quoteCart(db: Database, items: CartItemInput[]): Promise<CartResponse> {
  const normalized = normalizeItems(items);
  return buildCart(normalized, await findVariants(db, variantIds(normalized)));
}

/** Устанавливает количество позиции. Больше остатка положить нельзя — это ошибка, а не обрезка. */
export async function setCartItem(
  db: Database,
  userId: string,
  input: CartItemInput,
): Promise<CartResponse> {
  return db.transaction(async (tx) => {
    const [variant] = await findVariants(tx, [input.variantId]);
    if (!variant || !variant.isPublished || !variant.isActive) {
      throw new AppError('NOT_FOUND', 'Этот объём больше не продаётся');
    }
    const available = availableQuantity(variant);
    if (input.quantity > available) {
      throw new AppError(
        'OUT_OF_STOCK',
        available === 0 ? 'Этот объём закончился' : `Осталось только ${available} шт.`,
        { available },
      );
    }

    const cartId = await getOrCreateCartId(tx, userId);
    const items = await findCartItems(tx, cartId);
    const isNew = !items.some((item) => item.variantId === input.variantId);
    if (isNew && items.length >= CART_MAX_LINES) {
      throw new AppError('CONFLICT', `В корзине может быть не больше ${CART_MAX_LINES} позиций`);
    }
    await upsertCartItem(tx, cartId, input);
    return cartFor(tx, cartId);
  });
}

export async function removeCartItem(
  db: Database,
  userId: string,
  variantId: string,
): Promise<CartResponse> {
  const cartId = await findCartId(db, userId);
  if (cartId) await deleteCartItem(db, cartId, variantId);
  return cartFor(db, cartId);
}

/** Переносит гостевую корзину в аккаунт при входе (D-015). */
export async function mergeCart(
  db: Database,
  userId: string,
  incoming: CartItemInput[],
): Promise<CartResponse> {
  return db.transaction(async (tx) => {
    const cartId = await getOrCreateCartId(tx, userId);
    const current = new Map(
      (await findCartItems(tx, cartId)).map((item) => [item.variantId, item.quantity]),
    );
    const guest = normalizeItems(incoming);
    const rows = await findVariants(tx, variantIds(guest));
    const variants = new Map(rows.map((row) => [row.variantId, row]));

    for (const item of guest) {
      const variant = variants.get(item.variantId);
      if (!variant) continue;
      const before = current.get(item.variantId);
      if (before === undefined && current.size >= CART_MAX_LINES) continue;
      const quantity = mergedQuantity(variant, before ?? 0, item.quantity);
      if (quantity === undefined || quantity === before) continue;
      await upsertCartItem(tx, cartId, { variantId: item.variantId, quantity });
      current.set(item.variantId, quantity);
    }
    return cartFor(tx, cartId);
  });
}
