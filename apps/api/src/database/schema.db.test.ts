import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  addresses,
  favorites,
  heroSlides,
  materials,
  orderItems,
  orders,
  productImages,
  productVariants,
  products,
  stockNotifications,
  users,
} from './schema';
import { createTestDatabase, expectConstraintError } from './test-database';
import type { TestDatabase } from './test-database';

const UNIQUE = '23505';
const CHECK = '23514';
// ON DELETE RESTRICT отвечает restrict_violation, а не foreign_key_violation.
const RESTRICT = '23001';
const INVALID_ENUM = '22P02';

let testDb: TestDatabase;
let counter = 0;
const next = () => (counter += 1);

beforeAll(async () => {
  testDb = await createTestDatabase();
});

afterAll(async () => {
  await testDb.drop();
});

async function createMaterial() {
  const n = next();
  const [row] = await testDb.db
    .insert(materials)
    .values({ slug: `material-${n}`, name: `Материал ${n}`, swatchColor: '#292725' })
    .returning();
  if (!row) throw new Error('Материал не создан');
  return row;
}

async function createProduct(overrides: Partial<typeof products.$inferInsert> = {}) {
  const n = next();
  const material = await createMaterial();
  const [row] = await testDb.db
    .insert(products)
    .values({
      slug: `product-${n}`,
      specimenNumber: 100 + n,
      name: `Образец ${n}`,
      materialId: material.id,
      origin: 'вулканическое плато',
      density: 'high',
      concentration: 'парфюмерная вода',
      description: 'Описание',
      topMinutes: 15,
      heartMinutes: 180,
      baseMinutes: 480,
      ...overrides,
    })
    .returning();
  if (!row) throw new Error('Товар не создан');
  return row;
}

async function createVariant(
  productId: string,
  overrides: Partial<typeof productVariants.$inferInsert> = {},
) {
  const n = next();
  const [row] = await testDb.db
    .insert(productVariants)
    .values({
      productId,
      volumeMl: 50,
      sku: `SKU-${n}`,
      priceKopecks: 650_000,
      stock: 3,
      ...overrides,
    })
    .returning();
  if (!row) throw new Error('Вариант не создан');
  return row;
}

async function createUser(email = `user${next()}@nisha.test`) {
  const [row] = await testDb.db.insert(users).values({ email, name: 'Анна' }).returning();
  if (!row) throw new Error('Пользователь не создан');
  return row;
}

async function createOrder(userId: string, overrides: Partial<typeof orders.$inferInsert> = {}) {
  const [row] = await testDb.db
    .insert(orders)
    .values({
      userId,
      contactName: 'Анна',
      contactPhone: '+7 900 000-00-00',
      contactEmail: 'anna@nisha.test',
      deliveryMethod: 'boutique',
      itemsTotalKopecks: 650_000,
      deliveryPriceKopecks: 0,
      totalKopecks: 650_000,
      idempotencyKey: `key-${next()}`,
      ...overrides,
    })
    .returning();
  if (!row) throw new Error('Заказ не создан');
  return row;
}

describe('миграции', () => {
  it('создают все таблицы на чистой базе', async () => {
    const result = await testDb.db.execute<{ count: string }>(
      sql`SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    expect(Number(result.rows[0]?.count)).toBe(25);
  });
});

describe('ограничения контента', () => {
  it('ссылка кнопки слайда — только путь внутри сайта', async () => {
    const slide = (ctaHref: string) =>
      testDb.db.insert(heroSlides).values({
        position: 0,
        label: 'Глубина 0 м',
        title: 'Заголовок',
        text: 'Текст',
        ctaLabel: 'Кнопка',
        ctaHref,
        imageAlt: 'Описание',
      });
    await expectConstraintError(slide('https://evil.test'), 'hero_slides_internal_link');
    await expectConstraintError(slide('//evil.test'), 'hero_slides_internal_link');
    await expect(slide('/catalog')).resolves.toBeDefined();
  });
});

describe('ограничения товаров и вариантов', () => {
  it('отклоняют нулевую цену, отрицательный остаток и нулевой объём', async () => {
    const product = await createProduct();
    expect(
      await expectConstraintError(
        createVariant(product.id, { priceKopecks: 0 }),
        'product_variants_price_positive',
      ),
    ).toBe(CHECK);
    await expectConstraintError(
      createVariant(product.id, { stock: -1 }),
      'product_variants_stock_non_negative',
    );
    await expectConstraintError(
      createVariant(product.id, { volumeMl: 0 }),
      'product_variants_volume_positive',
    );
  });

  it('отклоняют дубли slug, номера образца, sku и объёма у одного товара', async () => {
    const product = await createProduct();
    expect(await expectConstraintError(createProduct({ slug: product.slug }))).toBe(UNIQUE);
    await expectConstraintError(createProduct({ specimenNumber: product.specimenNumber }));

    const variant = await createVariant(product.id);
    await expectConstraintError(createVariant(product.id, { sku: variant.sku, volumeMl: 100 }));
    await expectConstraintError(
      createVariant(product.id, { volumeMl: 50 }),
      'product_variants_product_volume_unique',
    );
  });

  it('не дают опубликовать товар без даты публикации', async () => {
    await expectConstraintError(
      createProduct({ isPublished: true }),
      'products_published_has_date',
    );
  });

  it('разрешают только один аромат для «Среза» на главной', async () => {
    await createProduct({ isFeatured: true });
    await expectConstraintError(createProduct({ isFeatured: true }), 'products_one_featured');
  });

  it('проверяют формат цвета свотча', async () => {
    await expectConstraintError(
      testDb.db.insert(materials).values({ slug: 'bad', name: 'Плохой', swatchColor: 'red' }),
      'materials_swatch_color_hex',
    );
  });

  it('запрещают удалять материал, из которого есть ароматы', async () => {
    const product = await createProduct();
    expect(
      await expectConstraintError(
        testDb.db.delete(materials).where(eq(materials.id, product.materialId)),
      ),
    ).toBe(RESTRICT);
  });

  it('удаление товара уносит варианты, изображения и избранное', async () => {
    const product = await createProduct();
    const user = await createUser();
    await createVariant(product.id);
    await testDb.db
      .insert(productImages)
      .values({ productId: product.id, url: '/a.jpg', alt: 'Флакон', position: 0 });
    await testDb.db.insert(favorites).values({ userId: user.id, productId: product.id });

    await testDb.db.delete(products).where(eq(products.id, product.id));

    const left = await Promise.all([
      testDb.db.select().from(productVariants).where(eq(productVariants.productId, product.id)),
      testDb.db.select().from(productImages).where(eq(productImages.productId, product.id)),
      testDb.db.select().from(favorites).where(eq(favorites.productId, product.id)),
    ]);
    expect(left.map((rows) => rows.length)).toEqual([0, 0, 0]);
  });
});

describe('ограничения пользователей', () => {
  it('хранят email только в нижнем регистре и уникально', async () => {
    expect(
      await expectConstraintError(createUser('Anna@Nisha.test'), 'users_email_lowercase'),
    ).toBe(CHECK);
    await createUser('same@nisha.test');
    expect(await expectConstraintError(createUser('same@nisha.test'), 'users_email_unique')).toBe(
      UNIQUE,
    );
  });

  it('не дают добавить товар в избранное дважды', async () => {
    const user = await createUser();
    const product = await createProduct();
    await testDb.db.insert(favorites).values({ userId: user.id, productId: product.id });
    expect(
      await expectConstraintError(
        testDb.db.insert(favorites).values({ userId: user.id, productId: product.id }),
      ),
    ).toBe(UNIQUE);
  });

  it('разрешают только один адрес по умолчанию', async () => {
    const user = await createUser();
    const address = {
      userId: user.id,
      label: 'Дом',
      city: 'Москва',
      street: 'Тверская, 1',
      isDefault: true,
    };
    await testDb.db.insert(addresses).values(address);
    await expectConstraintError(
      testDb.db.insert(addresses).values({ ...address, label: 'Работа' }),
      'addresses_one_default_per_user',
    );
  });

  it('держат один активный запрос «Сообщить» на товар и email, но разрешают повтор после письма', async () => {
    const product = await createProduct();
    const request = { productId: product.id, email: 'wait@nisha.test' };
    const [first] = await testDb.db.insert(stockNotifications).values(request).returning();
    await expectConstraintError(
      testDb.db.insert(stockNotifications).values(request),
      'stock_notifications_active_unique',
    );

    await testDb.db
      .update(stockNotifications)
      .set({ notifiedAt: new Date() })
      .where(eq(stockNotifications.id, first?.id ?? ''));
    await expect(testDb.db.insert(stockNotifications).values(request)).resolves.toBeDefined();
  });
});

describe('ограничения заказов', () => {
  it('требуют, чтобы итог был суммой товаров и доставки', async () => {
    const user = await createUser();
    await expectConstraintError(createOrder(user.id, { totalKopecks: 1 }), 'orders_total_matches');
  });

  it('требуют адрес для курьера и пункта выдачи', async () => {
    const user = await createUser();
    await expectConstraintError(
      createOrder(user.id, { deliveryMethod: 'courier' }),
      'orders_address_required',
    );
  });

  it('не принимают неизвестный статус', async () => {
    const user = await createUser();
    const order = await createOrder(user.id);
    expect(
      await expectConstraintError(
        testDb.db.execute(sql`UPDATE orders SET status = 'lost' WHERE id = ${order.id}`),
      ),
    ).toBe(INVALID_ENUM);
  });

  it('не принимают повторный ключ идемпотентности от того же пользователя', async () => {
    const user = await createUser();
    const order = await createOrder(user.id);
    await expectConstraintError(
      createOrder(user.id, { idempotencyKey: order.idempotencyKey }),
      'orders_user_idempotency_unique',
    );
  });

  it('отклоняют нулевое количество в позиции', async () => {
    const user = await createUser();
    const order = await createOrder(user.id);
    await expectConstraintError(
      testDb.db.insert(orderItems).values({
        orderId: order.id,
        productSlug: 'basalt',
        productName: 'Базальт',
        specimenNumber: 3,
        volumeMl: 50,
        priceKopecks: 650_000,
        quantity: 0,
      }),
      'order_items_quantity_positive',
    );
  });

  it('при удалении варианта сохраняют снимок позиции в заказе', async () => {
    const user = await createUser();
    const product = await createProduct();
    const variant = await createVariant(product.id);
    const order = await createOrder(user.id);
    await testDb.db.insert(orderItems).values({
      orderId: order.id,
      variantId: variant.id,
      productSlug: product.slug,
      productName: product.name,
      specimenNumber: product.specimenNumber,
      volumeMl: 50,
      priceKopecks: 650_000,
      quantity: 1,
    });

    await testDb.db.delete(productVariants).where(eq(productVariants.id, variant.id));

    const [item] = await testDb.db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    expect(item).toMatchObject({
      variantId: null,
      productName: product.name,
      priceKopecks: 650_000,
    });
  });

  it('запрещают удалять пользователя с заказами', async () => {
    const user = await createUser();
    await createOrder(user.id);
    expect(await expectConstraintError(testDb.db.delete(users).where(eq(users.id, user.id)))).toBe(
      RESTRICT,
    );
  });

  it('нумеруют заказы по порядку', async () => {
    const user = await createUser();
    const first = await createOrder(user.id);
    const second = await createOrder(user.id);
    expect(second.number).toBe(first.number + 1);
  });
});
