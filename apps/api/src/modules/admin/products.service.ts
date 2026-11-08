import type {
  AdminProduct,
  AdminProductInput,
  AdminProductListQuery,
  AdminProductListResponse,
} from '@nisha/contracts';
import { and, asc, count, eq, ilike, inArray, or, sql } from 'drizzle-orm';

import type { Database, DbExecutor } from '../../database/client';
import {
  fragranceNotes,
  materials,
  orderItems,
  productCategories,
  productImages,
  productNotes,
  productVariants,
  products,
} from '../../database/schema';
import { AppError } from '../../shared/errors';
import { uniqueViolation } from '../../shared/pg';
import { likePattern } from '../../shared/sql';
import { firstImage } from '../catalog/catalog.repository';

const LEVELS = ['top', 'heart', 'base'] as const;

/** Ограничение уникальности → поле формы и понятный текст. */
const UNIQUE_FIELDS: Record<string, { field: string; message: string }> = {
  products_slug_unique: { field: 'slug', message: 'Такой адрес уже занят другим образцом' },
  products_specimen_number_unique: {
    field: 'specimenNumber',
    message: 'Такой номер образца уже есть',
  },
  product_variants_sku_unique: {
    field: 'variants',
    message: 'Такой SKU уже есть у другого объёма',
  },
};

export async function listAdminProducts(
  db: Database,
  query: AdminProductListQuery,
): Promise<AdminProductListResponse> {
  const search = query.q
    ? /^\d+$/.test(query.q)
      ? eq(products.specimenNumber, Number(query.q))
      : or(ilike(products.name, likePattern(query.q)), ilike(products.slug, likePattern(query.q)))
    : undefined;
  const status =
    query.status === 'published'
      ? eq(products.isPublished, true)
      : query.status === 'draft'
        ? eq(products.isPublished, false)
        : undefined;
  const where = and(search, status);

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: products.id,
        slug: products.slug,
        specimenNumber: products.specimenNumber,
        name: products.name,
        materialName: materials.name,
        isPublished: products.isPublished,
        isFeatured: products.isFeatured,
        priceFromKopecks: sql<number | null>`(
          SELECT min(${productVariants.priceKopecks}) FROM ${productVariants}
          WHERE ${productVariants.productId} = ${products.id} AND ${productVariants.isActive}
        )`,
        totalStock: sql<number>`(
          SELECT coalesce(sum(${productVariants.stock}), 0) FROM ${productVariants}
          WHERE ${productVariants.productId} = ${products.id} AND ${productVariants.isActive}
        )`.mapWith(Number),
        variantsCount: sql<number>`(
          SELECT count(*) FROM ${productVariants}
          WHERE ${productVariants.productId} = ${products.id} AND ${productVariants.isActive}
        )`.mapWith(Number),
        image: firstImage,
      })
      .from(products)
      .innerJoin(materials, eq(materials.id, products.materialId))
      .where(where)
      .orderBy(asc(products.specimenNumber))
      .limit(query.limit)
      .offset(query.offset),
    db.select({ value: count() }).from(products).where(where),
  ]);
  return {
    items: rows.map((row) => ({
      ...row,
      priceFromKopecks: row.priceFromKopecks === null ? null : Number(row.priceFromKopecks),
    })),
    total: total?.value ?? 0,
  };
}

async function hasOrders(db: DbExecutor, productId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: orderItems.id })
    .from(orderItems)
    .innerJoin(productVariants, eq(productVariants.id, orderItems.variantId))
    .where(eq(productVariants.productId, productId))
    .limit(1);
  return row !== undefined;
}

export async function getAdminProduct(db: DbExecutor, id: string): Promise<AdminProduct> {
  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) throw new AppError('NOT_FOUND', 'Образец не найден');

  // По очереди: функцию вызывают и внутри транзакции сохранения, где соединение одно.
  const categoryRows = await db
    .select({ id: productCategories.categoryId })
    .from(productCategories)
    .where(eq(productCategories.productId, id));
  const noteRows = await db
    .select({ level: productNotes.level, name: fragranceNotes.name })
    .from(productNotes)
    .innerJoin(fragranceNotes, eq(fragranceNotes.id, productNotes.noteId))
    .where(eq(productNotes.productId, id))
    .orderBy(asc(productNotes.level), asc(productNotes.position));
  const variantRows = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, id))
    .orderBy(asc(productVariants.volumeMl));
  const imageRows = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, id))
    .orderBy(asc(productImages.position));
  const ordered = await hasOrders(db, id);

  const notes = { top: [] as string[], heart: [] as string[], base: [] as string[] };
  for (const note of noteRows) notes[note.level].push(note.name);

  return {
    id: product.id,
    slug: product.slug,
    specimenNumber: product.specimenNumber,
    name: product.name,
    materialId: product.materialId,
    collectionId: product.collectionId,
    categoryIds: categoryRows.map((row) => row.id),
    origin: product.origin,
    density: product.density,
    concentration: product.concentration,
    longevityHours: product.longevityHours,
    description: product.description,
    story: product.story,
    topMinutes: product.topMinutes,
    heartMinutes: product.heartMinutes,
    baseMinutes: product.baseMinutes,
    notes,
    variants: variantRows.map((variant) => ({
      id: variant.id,
      volumeMl: variant.volumeMl,
      sku: variant.sku,
      priceKopecks: variant.priceKopecks,
      stock: variant.stock,
      isActive: variant.isActive,
    })),
    isBestseller: product.isBestseller,
    isNew: product.isNew,
    isFeatured: product.isFeatured,
    isPublished: product.isPublished,
    images: imageRows.map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.alt,
      position: image.position,
    })),
    hasOrders: ordered,
  };
}

/** Объёмы, которые покупатель может заказать прямо сейчас. */
async function availableVariantIds(db: DbExecutor, productId: string): Promise<Set<string>> {
  const rows = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(
      and(
        eq(productVariants.productId, productId),
        eq(products.isPublished, true),
        eq(productVariants.isActive, true),
        sql`${productVariants.stock} > 0`,
      ),
    );
  return new Set(rows.map((row) => row.id));
}

async function noteIds(db: DbExecutor, names: string[]): Promise<Map<string, string>> {
  await db
    .insert(fragranceNotes)
    .values(names.map((name) => ({ name })))
    .onConflictDoNothing({ target: fragranceNotes.name });
  const rows = await db
    .select({ id: fragranceNotes.id, name: fragranceNotes.name })
    .from(fragranceNotes)
    .where(inArray(fragranceNotes.name, names));
  return new Map(rows.map((row) => [row.name, row.id]));
}

async function writeProduct(
  db: DbExecutor,
  id: string | null,
  input: AdminProductInput,
): Promise<string> {
  // «Срез» на главной — только один (частичный уникальный индекс): прежний снимается.
  if (input.isFeatured) {
    await db
      .update(products)
      .set({ isFeatured: false })
      .where(and(eq(products.isFeatured, true), id ? sql`${products.id} <> ${id}` : undefined));
  }

  const values = {
    slug: input.slug,
    specimenNumber: input.specimenNumber,
    name: input.name,
    materialId: input.materialId,
    collectionId: input.collectionId,
    origin: input.origin,
    density: input.density,
    concentration: input.concentration,
    longevityHours: input.longevityHours,
    description: input.description,
    story: input.story,
    topMinutes: input.topMinutes,
    heartMinutes: input.heartMinutes,
    baseMinutes: input.baseMinutes,
    isBestseller: input.isBestseller,
    isNew: input.isNew,
    isFeatured: input.isFeatured,
    isPublished: input.isPublished,
    // Дата публикации ставится при первой публикации и дальше не меняется: от неё «новинки».
    publishedAt: input.isPublished
      ? sql`coalesce(${products.publishedAt}, now())`
      : sql`${products.publishedAt}`,
  };

  let productId: string;
  if (id) {
    const [updated] = await db
      .update(products)
      .set(values)
      .where(eq(products.id, id))
      .returning({ id: products.id });
    if (!updated) throw new AppError('NOT_FOUND', 'Образец не найден');
    productId = updated.id;
  } else {
    const [created] = await db
      .insert(products)
      .values({ ...values, publishedAt: input.isPublished ? sql`now()` : null })
      .returning({ id: products.id });
    if (!created) throw new Error('Образец не сохранился');
    productId = created.id;
  }

  await db.delete(productCategories).where(eq(productCategories.productId, productId));
  if (input.categoryIds.length > 0) {
    await db
      .insert(productCategories)
      .values(input.categoryIds.map((categoryId) => ({ productId, categoryId })));
  }

  const ids = await noteIds(db, [...input.notes.top, ...input.notes.heart, ...input.notes.base]);
  await db.delete(productNotes).where(eq(productNotes.productId, productId));
  await db.insert(productNotes).values(
    LEVELS.flatMap((level) =>
      input.notes[level].map((name, position) => {
        const noteId = ids.get(name);
        if (!noteId) throw new Error(`Нота «${name}» не сохранилась`);
        return { productId, noteId, level, position };
      }),
    ),
  );

  const existing = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(eq(productVariants.productId, productId));
  const own = new Set(existing.map((row) => row.id));
  const kept = new Set<string>();
  for (const variant of input.variants) {
    const fields = {
      volumeMl: variant.volumeMl,
      sku: variant.sku,
      priceKopecks: variant.priceKopecks,
      stock: variant.stock,
      isActive: variant.isActive,
    };
    if (variant.id) {
      if (!own.has(variant.id)) {
        throw new AppError('VALIDATION_FAILED', 'Объём не принадлежит этому образцу');
      }
      await db.update(productVariants).set(fields).where(eq(productVariants.id, variant.id));
      kept.add(variant.id);
    } else {
      await db.insert(productVariants).values({ ...fields, productId });
    }
  }
  // Убранный из формы объём отключается, а не удаляется: на него ссылаются заказы и корзины.
  const removed = [...own].filter((variantId) => !kept.has(variantId));
  if (removed.length > 0) {
    await db
      .update(productVariants)
      .set({ isActive: false })
      .where(inArray(productVariants.id, removed));
  }
  return productId;
}

/**
 * Сохраняет товар целиком. restocked — у товара появился объём, которого раньше нельзя было
 * купить: подписчикам «Сообщить о поступлении» пора писать (решает вызывающий код).
 */
export async function saveProduct(
  db: Database,
  id: string | null,
  input: AdminProductInput,
): Promise<{ product: AdminProduct; restocked: boolean }> {
  try {
    return await db.transaction(async (tx) => {
      const before = id ? await availableVariantIds(tx, id) : new Set<string>();
      const productId = await writeProduct(tx, id, input);
      const after = await availableVariantIds(tx, productId);
      const restocked = [...after].some((variantId) => !before.has(variantId));
      return { product: await getAdminProduct(tx, productId), restocked };
    });
  } catch (error) {
    const constraint = uniqueViolation(error);
    const known = constraint ? UNIQUE_FIELDS[constraint] : undefined;
    if (known) throw new AppError('CONFLICT', known.message, { field: known.field });
    if (constraint === 'product_variants_product_volume_unique') {
      throw new AppError('CONFLICT', 'Такой объём у образца уже есть', { field: 'variants' });
    }
    throw error;
  }
}

/** Удалить можно только черновик без заказов; остальное — снять с публикации. */
export async function deleteProduct(db: Database, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [product] = await tx
      .select({ isPublished: products.isPublished })
      .from(products)
      .where(eq(products.id, id))
      .for('update');
    if (!product) throw new AppError('NOT_FOUND', 'Образец не найден');
    if (product.isPublished) {
      throw new AppError(
        'CONFLICT',
        'Опубликованный образец нельзя удалить — снимите его с публикации',
      );
    }
    if (await hasOrders(tx, id)) {
      throw new AppError(
        'CONFLICT',
        'По образцу есть заказы — его можно только снять с публикации',
      );
    }
    await tx.delete(products).where(eq(products.id, id));
  });
}

/** Ноты для подсказок в форме товара. */
export async function listNoteNames(db: Database): Promise<string[]> {
  const rows = await db
    .select({ name: fragranceNotes.name })
    .from(fragranceNotes)
    .orderBy(asc(fragranceNotes.name));
  return rows.map((row) => row.name);
}
