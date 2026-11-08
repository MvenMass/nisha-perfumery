import { emailSchema, passwordSchema } from '@nisha/contracts';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { z } from 'zod';

import { loadDatabaseEnv } from '../config/env';
import { hashPassword } from '../shared/password';
import { createDatabase } from './client';
import type { Database } from './client';
import {
  articles,
  categories,
  collections,
  fragranceNotes,
  heroSlides,
  materials,
  productCategories,
  productNotes,
  productVariants,
  products,
  storeSettings,
  users,
} from './schema';
import {
  ARTICLES,
  CATEGORIES,
  COLLECTIONS,
  HERO_SLIDES,
  MATERIALS,
  PRODUCTS,
  STORE_SETTINGS,
} from './seed-data';
import type { SeedProduct } from './seed-data';

export type SeedOptions = {
  adminEmail: string;
  adminPassword: string;
  /** Точка отсчёта для дат публикации — в тестах фиксируется. */
  now?: Date;
};

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

const DAY_MS = 24 * 60 * 60 * 1000;

async function idsBySlug(
  tx: Transaction,
  table: typeof materials | typeof categories | typeof collections,
): Promise<Map<string, string>> {
  const rows = await tx.select({ id: table.id, slug: table.slug }).from(table);
  return new Map(rows.map((row) => [row.slug, row.id]));
}

function requireId(map: Map<string, string>, key: string, what: string): string {
  const value = map.get(key);
  if (!value) throw new Error(`В сиде нет ${what} «${key}»`);
  return value;
}

// Справочники: upsert по естественному ключу — повторный сид обновляет, а не дублирует.
async function seedDictionaries(tx: Transaction) {
  for (const [position, material] of MATERIALS.entries()) {
    await tx
      .insert(materials)
      .values({ ...material, position })
      .onConflictDoUpdate({
        target: materials.slug,
        set: { name: material.name, swatchColor: material.swatchColor, position },
      });
  }
  for (const [position, category] of CATEGORIES.entries()) {
    await tx
      .insert(categories)
      .values({ ...category, position })
      .onConflictDoUpdate({ target: categories.slug, set: { name: category.name, position } });
  }
  for (const [position, collection] of COLLECTIONS.entries()) {
    await tx
      .insert(collections)
      .values({ ...collection, position })
      .onConflictDoUpdate({
        target: collections.slug,
        set: { name: collection.name, description: collection.description, position },
      });
  }

  const noteNames = [
    ...new Set(
      PRODUCTS.flatMap((product) => [
        ...product.notes.top,
        ...product.notes.heart,
        ...product.notes.base,
      ]),
    ),
  ];
  await tx
    .insert(fragranceNotes)
    .values(noteNames.map((name) => ({ name })))
    .onConflictDoNothing({ target: fragranceNotes.name });

  await tx
    .insert(storeSettings)
    .values({ id: 1, ...STORE_SETTINGS })
    .onConflictDoUpdate({ target: storeSettings.id, set: STORE_SETTINGS });
}

async function seedProduct(
  tx: Transaction,
  product: SeedProduct,
  refs: {
    materials: Map<string, string>;
    categories: Map<string, string>;
    collections: Map<string, string>;
    notes: Map<string, string>;
  },
  now: Date,
) {
  const isPublished = product.publishedDaysAgo !== null;
  const values = {
    slug: product.slug,
    specimenNumber: product.specimenNumber,
    name: product.name,
    materialId: requireId(refs.materials, product.material, 'материала'),
    collectionId: product.collection
      ? requireId(refs.collections, product.collection, 'коллекции')
      : null,
    origin: product.origin,
    density: product.density,
    concentration: product.concentration,
    longevityHours: product.longevityHours,
    description: product.description,
    story: product.story,
    ...product.layers,
    isPublished,
    publishedAt: isPublished
      ? new Date(now.getTime() - (product.publishedDaysAgo ?? 0) * DAY_MS)
      : null,
    isBestseller: product.isBestseller ?? false,
    isNew: product.isNew ?? false,
    isFeatured: product.isFeatured ?? false,
    popularity: product.popularity,
  };

  const [row] = await tx
    .insert(products)
    .values(values)
    .onConflictDoUpdate({ target: products.slug, set: values })
    .returning({ id: products.id });
  if (!row) throw new Error(`Товар «${product.slug}» не сохранился`);

  for (const variant of product.variants) {
    const sku = `${product.slug.toUpperCase()}-${variant.volumeMl}`;
    await tx
      .insert(productVariants)
      .values({ productId: row.id, sku, ...variant })
      .onConflictDoUpdate({
        target: productVariants.sku,
        set: { priceKopecks: variant.priceKopecks, stock: variant.stock, isActive: true },
      });
  }

  // Ноты и категории товара пересобираются целиком: так сид повторяем и после правок данных.
  await tx.delete(productNotes).where(eq(productNotes.productId, row.id));
  const levels = ['top', 'heart', 'base'] as const;
  await tx.insert(productNotes).values(
    levels.flatMap((level) =>
      product.notes[level].map((name, position) => ({
        productId: row.id,
        noteId: requireId(refs.notes, name, 'ноты'),
        level,
        position,
      })),
    ),
  );

  await tx.delete(productCategories).where(eq(productCategories.productId, row.id));
  await tx.insert(productCategories).values(
    product.categories.map((slug) => ({
      productId: row.id,
      categoryId: requireId(refs.categories, slug, 'категории'),
    })),
  );
}

async function seedContent(tx: Transaction, now: Date) {
  const [anySlide] = await tx.select({ id: heroSlides.id }).from(heroSlides).limit(1);
  if (!anySlide) {
    await tx
      .insert(heroSlides)
      .values(HERO_SLIDES.map((slide, position) => ({ ...slide, position })));
  }
  await tx
    .insert(articles)
    .values(
      ARTICLES.map(({ body, publishedDaysAgo, ...article }) => ({
        ...article,
        body: body.join('\n\n'),
        isPublished: true,
        publishedAt: new Date(now.getTime() - publishedDaysAgo * DAY_MS),
      })),
    )
    .onConflictDoNothing({ target: articles.slug });
}

async function seedAdmin(tx: Transaction, email: string, password: string) {
  const passwordHash = await hashPassword(password);
  await tx
    .insert(users)
    .values({ email, name: 'Администратор', passwordHash, role: 'admin' })
    .onConflictDoUpdate({ target: users.email, set: { passwordHash, role: 'admin' } });
}

export async function runSeed(db: Database, options: SeedOptions): Promise<void> {
  const now = options.now ?? new Date();
  await db.transaction(async (tx) => {
    await seedDictionaries(tx);

    const noteRows = await tx
      .select({ id: fragranceNotes.id, name: fragranceNotes.name })
      .from(fragranceNotes);
    const refs = {
      materials: await idsBySlug(tx, materials),
      categories: await idsBySlug(tx, categories),
      collections: await idsBySlug(tx, collections),
      notes: new Map(noteRows.map((note) => [note.name, note.id])),
    };

    // «Срез» на главной может быть только один: снимаем флаг с тех, кто не помечен в сиде.
    const featured = PRODUCTS.filter((product) => product.isFeatured).map((p) => p.slug);
    await tx
      .update(products)
      .set({ isFeatured: false })
      .where(
        and(
          eq(products.isFeatured, true),
          featured.length > 0 ? sql`${products.slug} NOT IN ${featured}` : undefined,
        ),
      );

    for (const product of PRODUCTS) {
      await seedProduct(tx, product, refs, now);
    }

    // Объём, убранный из данных сида, выключаем, а не удаляем: на него могут ссылаться заказы.
    const seededSkus = PRODUCTS.flatMap((product) =>
      product.variants.map((variant) => `${product.slug.toUpperCase()}-${variant.volumeMl}`),
    );
    const seededSlugs = PRODUCTS.map((product) => product.slug);
    const seededProductIds = await tx
      .select({ id: products.id })
      .from(products)
      .where(inArray(products.slug, seededSlugs));
    await tx
      .update(productVariants)
      .set({ isActive: false })
      .where(
        and(
          inArray(
            productVariants.productId,
            seededProductIds.map((row) => row.id),
          ),
          sql`${productVariants.sku} NOT IN ${seededSkus}`,
          ne(productVariants.isActive, false),
        ),
      );

    await seedContent(tx, now);
    await seedAdmin(tx, options.adminEmail, options.adminPassword);
  });
}

const seedEnvSchema = z.object({
  ADMIN_EMAIL: emailSchema,
  ADMIN_PASSWORD: passwordSchema,
});

// Запуск как скрипта: pnpm db:seed.
if (import.meta.main) {
  const { DATABASE_URL } = loadDatabaseEnv();
  const env = seedEnvSchema.safeParse(process.env);
  if (!env.success) {
    throw new Error(
      `Для сида нужны ADMIN_EMAIL и ADMIN_PASSWORD (см. .env.example):\n${z.prettifyError(env.error)}`,
    );
  }
  const { db, pool } = createDatabase(DATABASE_URL);
  try {
    await runSeed(db, { adminEmail: env.data.ADMIN_EMAIL, adminPassword: env.data.ADMIN_PASSWORD });
    console.info(`Сид применён: ${PRODUCTS.length} товаров, администратор ${env.data.ADMIN_EMAIL}`);
  } finally {
    await pool.end();
  }
}
