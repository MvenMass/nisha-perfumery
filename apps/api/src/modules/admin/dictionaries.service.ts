import type {
  CategoryInput,
  CollectionInput,
  DictionariesResponse,
  DictionaryKind,
  MaterialInput,
} from '@nisha/contracts';
import { asc, count, eq } from 'drizzle-orm';

import type { Database } from '../../database/client';
import {
  categories,
  collections,
  materials,
  productCategories,
  products,
} from '../../database/schema';
import { AppError } from '../../shared/errors';
import { uniqueViolation } from '../../shared/pg';

export async function listDictionaries(db: Database): Promise<DictionariesResponse> {
  const [materialRows, categoryRows, collectionRows, byMaterial, byCategory, byCollection] =
    await Promise.all([
      db.select().from(materials).orderBy(asc(materials.position), asc(materials.name)),
      db.select().from(categories).orderBy(asc(categories.position), asc(categories.name)),
      db.select().from(collections).orderBy(asc(collections.position), asc(collections.name)),
      db
        .select({ id: products.materialId, value: count() })
        .from(products)
        .groupBy(products.materialId),
      db
        .select({ id: productCategories.categoryId, value: count() })
        .from(productCategories)
        .groupBy(productCategories.categoryId),
      db
        .select({ id: products.collectionId, value: count() })
        .from(products)
        .groupBy(products.collectionId),
    ]);
  const counter = (rows: Array<{ id: string | null; value: number }>) => {
    const map = new Map(rows.map((row) => [row.id, row.value]));
    return (id: string) => map.get(id) ?? 0;
  };
  const materialCount = counter(byMaterial);
  const categoryCount = counter(byCategory);
  const collectionCount = counter(byCollection);

  return {
    materials: materialRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      swatchColor: row.swatchColor,
      position: row.position,
      productsCount: materialCount(row.id),
    })),
    categories: categoryRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      position: row.position,
      productsCount: categoryCount(row.id),
    })),
    collections: collectionRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      position: row.position,
      productsCount: collectionCount(row.id),
    })),
  };
}

export type DictionaryChange =
  | { kind: 'materials'; input: MaterialInput }
  | { kind: 'categories'; input: CategoryInput }
  | { kind: 'collections'; input: CollectionInput };

const TABLES = { materials, categories, collections } as const;

async function write(db: Database, id: string | null, change: DictionaryChange) {
  switch (change.kind) {
    case 'materials':
      return id
        ? db.update(materials).set(change.input).where(eq(materials.id, id)).returning()
        : db.insert(materials).values(change.input).returning();
    case 'categories':
      return id
        ? db.update(categories).set(change.input).where(eq(categories.id, id)).returning()
        : db.insert(categories).values(change.input).returning();
    case 'collections':
      return id
        ? db.update(collections).set(change.input).where(eq(collections.id, id)).returning()
        : db.insert(collections).values(change.input).returning();
  }
}

/** Создание и правка записи справочника; id === null — новая запись. */
export async function saveDictionaryItem(
  db: Database,
  id: string | null,
  change: DictionaryChange,
): Promise<void> {
  let rows: unknown[];
  try {
    rows = await write(db, id, change);
  } catch (error) {
    if (uniqueViolation(error)?.endsWith('_slug_unique')) {
      throw new AppError('CONFLICT', 'Такой адрес уже занят', { field: 'slug' });
    }
    throw error;
  }
  if (rows.length === 0) throw new AppError('NOT_FOUND', 'Запись не найдена');
}

/** Удалить можно только неиспользуемую запись: иначе товары остались бы без материала или категории. */
export async function deleteDictionaryItem(
  db: Database,
  kind: DictionaryKind,
  id: string,
): Promise<void> {
  const usage = await listDictionaries(db);
  const item = usage[kind].find((row) => row.id === id);
  if (!item) throw new AppError('NOT_FOUND', 'Запись не найдена');
  if (item.productsCount > 0) {
    throw new AppError('CONFLICT', `Запись используется в ${item.productsCount} образцах`);
  }
  const table = TABLES[kind];
  await db.delete(table).where(eq(table.id, id));
}
