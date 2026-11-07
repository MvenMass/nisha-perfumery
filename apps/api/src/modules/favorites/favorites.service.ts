import { FAVORITES_LIMIT } from '@nisha/contracts';
import type { FavoritesResponse } from '@nisha/contracts';
import { and, asc, count, desc, eq } from 'drizzle-orm';

import type { Database } from '../../database/client';
import { favorites } from '../../database/schema';
import { AppError } from '../../shared/errors';
import { findListItemsByIds } from '../catalog/catalog.repository';
import { toListItem } from '../catalog/catalog.service';

/** Карточки в порядке переданных id: у пользователя — новые сверху, у гостя — как в его списке. */
async function itemsInOrder(db: Database, ids: string[]): Promise<FavoritesResponse> {
  const rows = await findListItemsByIds(db, ids);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const items = ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [toListItem(row)] : [];
  });
  return { items };
}

async function favoriteIds(db: Database, userId: string): Promise<string[]> {
  const rows = await db
    .select({ productId: favorites.productId })
    .from(favorites)
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt), asc(favorites.productId));
  return rows.map((row) => row.productId);
}

export async function listFavorites(db: Database, userId: string): Promise<FavoritesResponse> {
  return itemsInOrder(db, await favoriteIds(db, userId));
}

/** Карточки для гостевого избранного из localStorage (D-040). */
export async function quoteFavorites(db: Database, ids: string[]): Promise<FavoritesResponse> {
  return itemsInOrder(db, [...new Set(ids)]);
}

/** Повторное добавление — не ошибка: сердце могли нажать в двух вкладках. */
export async function addFavorite(db: Database, userId: string, productId: string): Promise<void> {
  const [visible] = await findListItemsByIds(db, [productId]);
  if (!visible) throw new AppError('NOT_FOUND', 'Такого образца нет');

  const [total] = await db
    .select({ value: count() })
    .from(favorites)
    .where(eq(favorites.userId, userId));
  if ((total?.value ?? 0) >= FAVORITES_LIMIT) {
    throw new AppError('CONFLICT', `В избранном может быть не больше ${FAVORITES_LIMIT} образцов`);
  }
  await db.insert(favorites).values({ userId, productId }).onConflictDoNothing();
}

export async function removeFavorite(
  db: Database,
  userId: string,
  productId: string,
): Promise<void> {
  await db
    .delete(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.productId, productId)));
}

/** Слияние при входе (D-040): объединение множеств; невидимые в каталоге товары пропускаются. */
export async function mergeFavorites(
  db: Database,
  userId: string,
  ids: string[],
): Promise<FavoritesResponse> {
  const existing = new Set(await favoriteIds(db, userId));
  const visible = await findListItemsByIds(db, ids);
  const room = Math.max(FAVORITES_LIMIT - existing.size, 0);
  const incoming = visible.filter((row) => !existing.has(row.id)).slice(0, room);
  if (incoming.length > 0) {
    await db
      .insert(favorites)
      .values(incoming.map((row) => ({ userId, productId: row.id })))
      .onConflictDoNothing();
  }
  return listFavorites(db, userId);
}
