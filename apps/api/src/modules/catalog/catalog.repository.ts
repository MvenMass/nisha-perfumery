import type { CatalogQuery } from '@nisha/contracts';
import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import type { Database, DbExecutor } from '../../database/client';
import {
  categories,
  collections,
  fragranceNotes,
  materials,
  productCategories,
  productImages,
  productNotes,
  productVariants,
  products,
  storeSettings,
} from '../../database/schema';

// --- Подзапросы по вариантам и нотам: используются и в списке, и в карточке, и в «похожих» ---

const hasActiveVariant = sql`EXISTS (
  SELECT 1 FROM ${productVariants}
  WHERE ${productVariants.productId} = ${products.id} AND ${productVariants.isActive}
)`;

/** Товар виден покупателю: опубликован и есть хотя бы один активный объём. */
const isVisible = and(eq(products.isPublished, true), hasActiveVariant);

const priceFrom = sql<number>`(
  SELECT min(${productVariants.priceKopecks}) FROM ${productVariants}
  WHERE ${productVariants.productId} = ${products.id} AND ${productVariants.isActive}
)`.mapWith(Number);

const inStock = sql<boolean>`EXISTS (
  SELECT 1 FROM ${productVariants}
  WHERE ${productVariants.productId} = ${products.id}
    AND ${productVariants.isActive} AND ${productVariants.stock} > 0
)`;

const volumes = sql<number[]>`ARRAY(
  SELECT ${productVariants.volumeMl} FROM ${productVariants}
  WHERE ${productVariants.productId} = ${products.id} AND ${productVariants.isActive}
  ORDER BY ${productVariants.volumeMl}
)`;

// Enum note_level упорядочен как объявлен: top, heart, base.
const keyNotes = sql<string[]>`ARRAY(
  SELECT ${fragranceNotes.name} FROM ${productNotes}
  JOIN ${fragranceNotes} ON ${fragranceNotes.id} = ${productNotes.noteId}
  WHERE ${productNotes.productId} = ${products.id}
  ORDER BY ${productNotes.level}, ${productNotes.position}
  LIMIT 3
)`;

/** Обложка товара; нужна и корзине, поэтому экспортируется. */
export const firstImage = sql<{ url: string; alt: string } | null>`(
  SELECT json_build_object('url', ${productImages.url}, 'alt', ${productImages.alt})
  FROM ${productImages}
  WHERE ${productImages.productId} = ${products.id}
  ORDER BY ${productImages.position}
  LIMIT 1
)`;

const listItemFields = {
  id: products.id,
  slug: products.slug,
  specimenNumber: products.specimenNumber,
  name: products.name,
  materialSlug: materials.slug,
  materialName: materials.name,
  origin: products.origin,
  density: products.density,
  keyNotes,
  priceFromKopecks: priceFrom,
  volumesMl: volumes,
  inStock,
  isBestseller: products.isBestseller,
  isNew: products.isNew,
  image: firstImage,
};

export type ListItemRow = {
  id: string;
  slug: string;
  specimenNumber: number;
  name: string;
  materialSlug: string;
  materialName: string;
  origin: string;
  density: 'light' | 'medium' | 'high';
  keyNotes: string[];
  priceFromKopecks: number;
  volumesMl: number[];
  inStock: boolean;
  isBestseller: boolean;
  isNew: boolean;
  image: { url: string; alt: string } | null;
};

// Пользовательский ввод в ILIKE: % и _ — спецсимволы шаблона.
function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

function filterConditions(query: CatalogQuery): SQL[] {
  const conditions: SQL[] = [];
  const push = (condition: SQL | undefined) => {
    if (condition) conditions.push(condition);
  };
  push(isVisible);

  if (query.category.length > 0) {
    push(sql`EXISTS (
      SELECT 1 FROM ${productCategories}
      JOIN ${categories} ON ${categories.id} = ${productCategories.categoryId}
      WHERE ${productCategories.productId} = ${products.id}
        AND ${inArray(categories.slug, query.category)}
    )`);
  }
  if (query.material.length > 0) push(inArray(materials.slug, query.material));
  if (query.collection.length > 0) {
    push(
      inArray(
        products.collectionId,
        sql`(SELECT ${collections.id} FROM ${collections} WHERE ${inArray(collections.slug, query.collection)})`,
      ),
    );
  }
  if (query.density.length > 0) push(inArray(products.density, query.density));

  // Объём и цена — условия на ОДИН и тот же вариант (D-025): «50 мл до 5 000 ₽»
  // не должен находить товар, у которого до 5 000 ₽ только 30 мл.
  const variantConditions: SQL[] = [];
  if (query.volume.length > 0)
    variantConditions.push(inArray(productVariants.volumeMl, query.volume));
  // Цена в запросе — рубли (D-046), в базе — копейки.
  if (query.priceMin !== undefined) {
    variantConditions.push(sql`${productVariants.priceKopecks} >= ${query.priceMin * 100}`);
  }
  if (query.priceMax !== undefined) {
    variantConditions.push(sql`${productVariants.priceKopecks} <= ${query.priceMax * 100}`);
  }
  if (variantConditions.length > 0) {
    push(sql`EXISTS (
      SELECT 1 FROM ${productVariants}
      WHERE ${productVariants.productId} = ${products.id} AND ${productVariants.isActive}
        AND ${and(...variantConditions)}
    )`);
  }

  if (query.q !== undefined) {
    const pattern = likePattern(query.q);
    const number = /^\d+$/.test(query.q) ? Number(query.q) : undefined;
    push(sql`(
      ${products.name} ILIKE ${pattern}
      OR ${materials.name} ILIKE ${pattern}
      OR EXISTS (
        SELECT 1 FROM ${productNotes}
        JOIN ${fragranceNotes} ON ${fragranceNotes.id} = ${productNotes.noteId}
        WHERE ${productNotes.productId} = ${products.id} AND ${fragranceNotes.name} ILIKE ${pattern}
      )
      ${number === undefined ? sql`` : sql`OR ${products.specimenNumber} = ${number}`}
    )`);
  }

  return conditions;
}

const ORDER_BY: Record<CatalogQuery['sort'], SQL[]> = {
  popular: [desc(products.popularity), asc(products.specimenNumber)],
  price_asc: [asc(priceFrom), asc(products.specimenNumber)],
  price_desc: [desc(priceFrom), asc(products.specimenNumber)],
  new: [sql`${products.publishedAt} DESC NULLS LAST`, asc(products.specimenNumber)],
};

export async function findProducts(
  db: Database,
  query: CatalogQuery,
): Promise<{ rows: ListItemRow[]; total: number }> {
  const rows = await db
    .select({ ...listItemFields, total: sql<number>`count(*) OVER ()`.mapWith(Number) })
    .from(products)
    .innerJoin(materials, eq(materials.id, products.materialId))
    .where(and(...filterConditions(query)))
    .orderBy(...ORDER_BY[query.sort])
    .limit(query.limit)
    .offset(query.offset);

  // count(*) OVER () считается до LIMIT. Если страница пустая (offset за концом), считаем отдельно.
  let total = rows[0]?.total;
  if (total === undefined) {
    if (query.offset === 0) {
      total = 0;
    } else {
      const [counted] = await db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(products)
        .innerJoin(materials, eq(materials.id, products.materialId))
        .where(and(...filterConditions(query)));
      total = counted?.count ?? 0;
    }
  }

  return { rows: rows.map(({ total: _total, ...row }) => row), total };
}

export async function findBestsellers(db: Database, limit: number): Promise<ListItemRow[]> {
  return db
    .select(listItemFields)
    .from(products)
    .innerJoin(materials, eq(materials.id, products.materialId))
    .where(and(isVisible, eq(products.isBestseller, true)))
    .orderBy(desc(products.popularity), asc(products.specimenNumber))
    .limit(limit);
}

/** Карточки по списку id — для избранного; невидимые в каталоге товары отбрасываются. */
export async function findListItemsByIds(db: Database, ids: string[]): Promise<ListItemRow[]> {
  if (ids.length === 0) return [];
  return db
    .select(listItemFields)
    .from(products)
    .innerJoin(materials, eq(materials.id, products.materialId))
    .where(and(isVisible, inArray(products.id, ids)));
}

/** «Из той же породы» (D-026): в наличии — раньше, затем материал, плотность, общая категория. */
export async function findRelated(
  db: Database,
  product: { id: string; materialId: string; density: 'light' | 'medium' | 'high' },
  limit: number,
): Promise<ListItemRow[]> {
  const sharesCategory = sql`EXISTS (
    SELECT 1 FROM ${productCategories} AS own
    JOIN ${productCategories} AS other ON other.category_id = own.category_id
    WHERE own.product_id = ${product.id} AND other.product_id = ${products.id}
  )`;
  return db
    .select(listItemFields)
    .from(products)
    .innerJoin(materials, eq(materials.id, products.materialId))
    .where(and(isVisible, ne(products.id, product.id)))
    .orderBy(
      desc(inStock),
      desc(sql`${products.materialId} = ${product.materialId}`),
      desc(sql`${products.density} = ${product.density}`),
      desc(sharesCategory),
      desc(products.popularity),
    )
    .limit(limit);
}

// --- Карточка товара ---

export async function findProductBySlug(db: Database, slug: string) {
  const [row] = await db
    .select({
      product: products,
      material: { slug: materials.slug, name: materials.name },
      collection: { slug: collections.slug, name: collections.name },
    })
    .from(products)
    .innerJoin(materials, eq(materials.id, products.materialId))
    .leftJoin(collections, eq(collections.id, products.collectionId))
    .where(and(eq(products.slug, slug), isVisible))
    .limit(1);
  return row;
}

export async function findProductParts(db: Database, productId: string) {
  const [variants, notes, images, productCategoryRows] = await Promise.all([
    db
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.productId, productId), eq(productVariants.isActive, true)))
      .orderBy(asc(productVariants.volumeMl)),
    db
      .select({ level: productNotes.level, name: fragranceNotes.name })
      .from(productNotes)
      .innerJoin(fragranceNotes, eq(fragranceNotes.id, productNotes.noteId))
      .where(eq(productNotes.productId, productId))
      .orderBy(asc(productNotes.level), asc(productNotes.position)),
    db
      .select({ url: productImages.url, alt: productImages.alt })
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(asc(productImages.position)),
    db
      .select({ slug: categories.slug, name: categories.name })
      .from(productCategories)
      .innerJoin(categories, eq(categories.id, productCategories.categoryId))
      .where(eq(productCategories.productId, productId))
      .orderBy(asc(categories.position)),
  ]);
  return { variants, notes, images, categories: productCategoryRows };
}

export async function findFeaturedSlug(db: Database): Promise<string | undefined> {
  const [row] = await db
    .select({ slug: products.slug })
    .from(products)
    .where(and(isVisible, eq(products.isFeatured, true)))
    .limit(1);
  return row?.slug;
}

export async function findStoreSettings(db: DbExecutor) {
  const [row] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1));
  // Строку создаёт сид; без неё магазин не может посчитать доставку и «Осталось N».
  if (!row)
    throw new Error('Не заданы настройки магазина (store_settings): запустите pnpm db:seed');
  return row;
}

// --- Фильтры каталога ---

export async function findFilterFacets(db: Database) {
  // Счётчики — по видимым товарам; значения без товаров тоже возвращаются, клиент решает, показывать ли.
  const visibleProductIds = db.select({ id: products.id }).from(products).where(isVisible);

  const [categoryRows, materialRows, collectionRows, densityRows, volumeRows, priceRows] =
    await Promise.all([
      db
        .select({
          slug: categories.slug,
          name: categories.name,
          count: sql<number>`count(${productCategories.productId}) FILTER (
            WHERE ${inArray(productCategories.productId, visibleProductIds)}
          )`.mapWith(Number),
        })
        .from(categories)
        .leftJoin(productCategories, eq(productCategories.categoryId, categories.id))
        .groupBy(categories.id)
        .orderBy(asc(categories.position)),
      db
        .select({
          slug: materials.slug,
          name: materials.name,
          swatchColor: materials.swatchColor,
          count: sql<number>`count(${products.id}) FILTER (WHERE ${isVisible})`.mapWith(Number),
        })
        .from(materials)
        .leftJoin(products, eq(products.materialId, materials.id))
        .groupBy(materials.id)
        .orderBy(asc(materials.position)),
      db
        .select({
          slug: collections.slug,
          name: collections.name,
          count: sql<number>`count(${products.id}) FILTER (WHERE ${isVisible})`.mapWith(Number),
        })
        .from(collections)
        .leftJoin(products, eq(products.collectionId, collections.id))
        .groupBy(collections.id)
        .orderBy(asc(collections.position)),
      db
        .select({ value: products.density, count: sql<number>`count(*)`.mapWith(Number) })
        .from(products)
        .where(isVisible)
        .groupBy(products.density)
        .orderBy(asc(products.density)),
      db
        .select({
          volumeMl: productVariants.volumeMl,
          count: sql<number>`count(DISTINCT ${productVariants.productId})`.mapWith(Number),
        })
        .from(productVariants)
        .where(
          and(
            eq(productVariants.isActive, true),
            inArray(productVariants.productId, visibleProductIds),
          ),
        )
        .groupBy(productVariants.volumeMl)
        .orderBy(asc(productVariants.volumeMl)),
      db
        .select({
          min: sql<number | null>`min(${productVariants.priceKopecks})`,
          max: sql<number | null>`max(${productVariants.priceKopecks})`,
        })
        .from(productVariants)
        .where(
          and(
            eq(productVariants.isActive, true),
            inArray(productVariants.productId, visibleProductIds),
          ),
        ),
    ]);

  return {
    categoryRows,
    materialRows,
    collectionRows,
    densityRows,
    volumeRows,
    price: priceRows[0],
  };
}
