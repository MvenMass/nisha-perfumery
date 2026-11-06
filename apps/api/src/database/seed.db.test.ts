import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { verifyPassword } from '../shared/password';
import { productVariants, products, users } from './schema';
import { runSeed } from './seed';
import { PRODUCTS } from './seed-data';
import { createTestDatabase } from './test-database';
import type { TestDatabase } from './test-database';

const options = { adminEmail: 'admin@nisha.test', adminPassword: 'correct-horse-battery' };
const TABLES = [
  'materials',
  'categories',
  'collections',
  'fragrance_notes',
  'products',
  'product_variants',
  'product_notes',
  'product_categories',
  'users',
  'store_settings',
];

let testDb: TestDatabase;

async function countRows(): Promise<Record<string, number>> {
  const entries = await Promise.all(
    TABLES.map(async (table) => {
      const result = await testDb.db.execute<{ count: string }>(
        sql`SELECT count(*) FROM ${sql.identifier(table)}`,
      );
      return [table, Number(result.rows[0]?.count)] as const;
    }),
  );
  return Object.fromEntries(entries);
}

beforeAll(async () => {
  testDb = await createTestDatabase();
});

afterAll(async () => {
  await testDb.drop();
});

describe('сид', () => {
  it('идемпотентен: повторный запуск не создаёт дублей', async () => {
    await runSeed(testDb.db, options);
    const first = await countRows();
    await runSeed(testDb.db, options);
    expect(await countRows()).toEqual(first);
    expect(first.products).toBe(PRODUCTS.length);
  });

  it('создаёт администратора с хешем argon2id', async () => {
    const [admin] = await testDb.db.select().from(users).where(eq(users.email, options.adminEmail));
    expect(admin?.role).toBe('admin');
    expect(admin?.passwordHash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(admin?.passwordHash ?? '', options.adminPassword)).resolves.toBe(
      true,
    );
  });

  it('содержит состояния из макетов: срез на главной, нет в наличии, мало остатка, черновик', async () => {
    const [featured] = await testDb.db.select().from(products).where(eq(products.isFeatured, true));
    expect(featured?.slug).toBe('basalt');

    const obsidianStock = await testDb.db
      .select({ stock: productVariants.stock })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(eq(products.slug, 'obsidian'));
    expect(obsidianStock.every((row) => row.stock === 0)).toBe(true);

    const [basalt50] = await testDb.db
      .select()
      .from(productVariants)
      .where(eq(productVariants.sku, 'BASALT-50'));
    expect(basalt50?.stock).toBe(3);

    const [draft] = await testDb.db.select().from(products).where(eq(products.slug, 'resin'));
    expect(draft).toMatchObject({ isPublished: false, publishedAt: null });
  });
});
