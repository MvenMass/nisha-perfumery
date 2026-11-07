import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import type { DbExecutor } from '../../database/client';
import { cartItems, carts, productVariants, products } from '../../database/schema';
import { firstImage } from '../catalog/catalog.repository';

/** Всё, что нужно для расчёта позиции: актуальные цена, остаток и доступность. */
export type VariantRow = {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  specimenNumber: number;
  volumeMl: number;
  concentration: string;
  priceKopecks: number;
  stock: number;
  isActive: boolean;
  isPublished: boolean;
  image: { url: string; alt: string } | null;
};

export type StoredItem = { variantId: string; quantity: number };

export async function findVariants(db: DbExecutor, variantIds: string[]): Promise<VariantRow[]> {
  if (variantIds.length === 0) return [];
  return db
    .select({
      variantId: productVariants.id,
      productId: products.id,
      productSlug: products.slug,
      productName: products.name,
      specimenNumber: products.specimenNumber,
      volumeMl: productVariants.volumeMl,
      concentration: products.concentration,
      priceKopecks: productVariants.priceKopecks,
      stock: productVariants.stock,
      isActive: productVariants.isActive,
      isPublished: products.isPublished,
      image: firstImage,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(inArray(productVariants.id, variantIds));
}

export async function findCartId(db: DbExecutor, userId: string): Promise<string | undefined> {
  const [row] = await db.select({ id: carts.id }).from(carts).where(eq(carts.userId, userId));
  return row?.id;
}

/** Корзина создаётся при первом изменении: у пользователя, который только смотрит, строки нет. */
export async function getOrCreateCartId(db: DbExecutor, userId: string): Promise<string> {
  const [created] = await db
    .insert(carts)
    .values({ userId })
    .onConflictDoNothing({ target: carts.userId })
    .returning({ id: carts.id });
  if (created) return created.id;
  const existing = await findCartId(db, userId);
  if (!existing) throw new Error('Корзина пользователя не создалась');
  return existing;
}

// Порядок позиций — порядок добавления: так список не «прыгает» при изменении количества.
export async function findCartItems(db: DbExecutor, cartId: string): Promise<StoredItem[]> {
  return db
    .select({ variantId: cartItems.variantId, quantity: cartItems.quantity })
    .from(cartItems)
    .where(eq(cartItems.cartId, cartId))
    .orderBy(asc(cartItems.addedAt), asc(cartItems.variantId));
}

export async function upsertCartItem(
  db: DbExecutor,
  cartId: string,
  item: StoredItem,
): Promise<void> {
  await db
    .insert(cartItems)
    // clock_timestamp, а не now(): now() одинаков на всю транзакцию, и позиции, перенесённые
    // одним слиянием, потеряли бы порядок добавления.
    .values({
      cartId,
      variantId: item.variantId,
      quantity: item.quantity,
      addedAt: sql`clock_timestamp()`,
    })
    .onConflictDoUpdate({
      target: [cartItems.cartId, cartItems.variantId],
      set: { quantity: item.quantity },
    });
  await touchCart(db, cartId);
}

export async function deleteCartItem(
  db: DbExecutor,
  cartId: string,
  variantId: string,
): Promise<void> {
  await db
    .delete(cartItems)
    .where(and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId)));
  await touchCart(db, cartId);
}

async function touchCart(db: DbExecutor, cartId: string): Promise<void> {
  await db
    .update(carts)
    .set({ updatedAt: sql`now()` })
    .where(eq(carts.id, cartId));
}
