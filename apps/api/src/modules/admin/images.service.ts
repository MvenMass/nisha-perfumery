import { randomUUID } from 'node:crypto';

import type { AdminImage, ImagesUpdate } from '@nisha/contracts';
import { and, asc, eq, max, sql } from 'drizzle-orm';

import type { Database, DbExecutor } from '../../database/client';
import { productImages, products } from '../../database/schema';
import { AppError } from '../../shared/errors';
import { imageKeys, MAIN_WIDTH, prepareImage } from '../storage/images';
import type { Storage } from '../storage/storage';

type Deps = { db: Database; storage: Storage };

async function listImages(db: DbExecutor, productId: string): Promise<AdminImage[]> {
  const rows = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.position));
  return rows.map((row) => ({ id: row.id, url: row.url, alt: row.alt, position: row.position }));
}

/** products/<товар>/<снимок> — общее начало имён всех размеров одного снимка. */
const baseKey = (productId: string, imageId: string) => `products/${productId}/${imageId}`;

/** Загрузка: нарезка, файлы в хранилище, запись в конец галереи. */
export async function uploadProductImage(
  deps: Deps,
  productId: string,
  buffer: Buffer,
  alt: string,
): Promise<AdminImage[]> {
  const [product] = await deps.db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, productId));
  if (!product) throw new AppError('NOT_FOUND', 'Образец не найден');

  const files = await prepareImage(buffer);
  const imageId = randomUUID();
  const base = baseKey(productId, imageId);
  for (const file of files) await deps.storage.put(`${base}-${file.suffix}`, file.data);

  try {
    await deps.db.transaction(async (tx) => {
      const [last] = await tx
        .select({ value: max(productImages.position) })
        .from(productImages)
        .where(eq(productImages.productId, productId));
      await tx.insert(productImages).values({
        id: imageId,
        productId,
        url: deps.storage.url(`${base}-${MAIN_WIDTH}.jpg`),
        alt,
        position: (last?.value ?? -1) + 1,
      });
    });
  } catch (error) {
    // Запись не сохранилась — файлы без записи никому не нужны.
    await deps.storage.remove(imageKeys(base));
    throw error;
  }
  return listImages(deps.db, productId);
}

/** Новый порядок и подписи: список должен содержать ровно все снимки товара. */
export async function updateProductImages(
  db: Database,
  productId: string,
  update: ImagesUpdate,
): Promise<AdminImage[]> {
  return db.transaction(async (tx) => {
    const current = await listImages(tx, productId);
    const ids = new Set(current.map((image) => image.id));
    const incoming = update.images.map((image) => image.id);
    if (incoming.length !== ids.size || incoming.some((id) => !ids.has(id))) {
      throw new AppError('VALIDATION_FAILED', 'Передайте все снимки образца ровно по одному разу');
    }
    // Позиции уникальны внутри товара: сначала уводим их за пределы, потом ставим новые.
    await tx
      .update(productImages)
      .set({ position: sql`${productImages.position} + 1000` })
      .where(eq(productImages.productId, productId));
    for (const [position, image] of update.images.entries()) {
      await tx
        .update(productImages)
        .set({ position, alt: image.alt })
        .where(and(eq(productImages.id, image.id), eq(productImages.productId, productId)));
    }
    return listImages(tx, productId);
  });
}

export async function deleteProductImage(
  deps: Deps,
  productId: string,
  imageId: string,
): Promise<AdminImage[]> {
  const remaining = await deps.db.transaction(async (tx) => {
    const deleted = await tx
      .delete(productImages)
      .where(and(eq(productImages.id, imageId), eq(productImages.productId, productId)))
      .returning({ id: productImages.id });
    if (deleted.length === 0) throw new AppError('NOT_FOUND', 'Снимок не найден');
    const rest = await listImages(tx, productId);
    await tx
      .update(productImages)
      .set({ position: sql`${productImages.position} + 1000` })
      .where(eq(productImages.productId, productId));
    for (const [position, image] of rest.entries()) {
      await tx.update(productImages).set({ position }).where(eq(productImages.id, image.id));
    }
    return listImages(tx, productId);
  });
  // Файлы удаляем после фиксации: откат транзакции не должен оставить запись без файлов.
  await deps.storage.remove(imageKeys(baseKey(productId, imageId)));
  return remaining;
}
