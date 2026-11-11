import { randomUUID } from 'node:crypto';

import {
  adminProductSchema,
  dictionariesResponseSchema,
  errorResponseSchema,
  productDetailSchema,
} from '@nisha/contracts';
import type { AdminProduct, AdminProductInput } from '@nisha/contracts';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { products, stockNotifications } from '../../database/schema';
import { createTestApp, CSRF, signInAdmin } from '../../shared/test-app';
import type { TestApp } from '../../shared/test-app';

let ctx: TestApp;
let admin: Record<string, string>;
let ip = 0;

beforeAll(async () => {
  ctx = await createTestApp();
  admin = await signInAdmin(ctx.app);
});

afterAll(async () => {
  await ctx.close();
});

function call(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, payload?: object) {
  return ctx.app.inject({
    method,
    url,
    cookies: admin,
    headers: CSRF.headers,
    remoteAddress: `10.11.${Math.floor((ip += 1) / 250)}.${ip % 250}`,
    ...(payload ? { payload } : {}),
  });
}

async function dictionaries() {
  return dictionariesResponseSchema.parse((await call('GET', '/api/admin/dictionaries')).json());
}

async function productId(slug: string): Promise<string> {
  const [row] = await ctx.testDb.db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, slug));
  if (!row) throw new Error(`Нет товара ${slug}`);
  return row.id;
}

async function adminProduct(id: string): Promise<AdminProduct> {
  return adminProductSchema.parse((await call('GET', `/api/admin/products/${id}`)).json());
}

/** Карточка из админки → тело PUT: то, что форма отправила бы без изменений. */
function toInput(product: AdminProduct): AdminProductInput {
  const { id: _id, images: _images, hasOrders: _hasOrders, ...rest } = product;
  return rest;
}

async function newInput(overrides: Partial<AdminProductInput> = {}): Promise<AdminProductInput> {
  const dict = await dictionaries();
  const suffix = randomUUID().slice(0, 6);
  return {
    slug: `test-${suffix}`,
    specimenNumber: 100 + Math.floor(Math.random() * 800),
    name: 'Сланец',
    materialId: dict.materials[0]?.id ?? '',
    collectionId: null,
    categoryIds: dict.categories.slice(0, 1).map((category) => category.id),
    origin: 'горный карьер',
    density: 'medium',
    concentration: 'парфюмерная вода',
    longevityHours: 8,
    description: 'Холодный серый камень после дождя.',
    story: null,
    topMinutes: 15,
    heartMinutes: 180,
    baseMinutes: 480,
    notes: { top: ['бергамот'], heart: ['ирис', 'мокрый камень'], base: ['ветивер'] },
    variants: [
      {
        volumeMl: 30,
        sku: `SL-${suffix}-30`.toUpperCase(),
        priceKopecks: 450_000,
        stock: 5,
        isActive: true,
      },
      {
        volumeMl: 50,
        sku: `SL-${suffix}-50`.toUpperCase(),
        priceKopecks: 650_000,
        stock: 0,
        isActive: true,
      },
    ],
    isBestseller: false,
    isNew: true,
    isFeatured: false,
    isPublished: true,
    ...overrides,
  };
}

describe('товары в админке', () => {
  it('создаёт образец с нотами, вариантами и категорией — он появляется в каталоге', async () => {
    const input = await newInput();
    const response = await call('POST', '/api/admin/products', input);
    expect(response.statusCode, response.body).toBe(201);
    const created = adminProductSchema.parse(response.json());
    expect(created.notes).toEqual(input.notes);
    expect(created.variants.map((variant) => variant.volumeMl)).toEqual([30, 50]);

    const page = await ctx.app.inject({ method: 'GET', url: `/api/products/${input.slug}` });
    expect(page.statusCode).toBe(200);
    expect(productDetailSchema.parse(page.json()).name).toBe('Сланец');
  });

  it('черновик не виден в каталоге', async () => {
    const input = await newInput({ isPublished: false });
    await call('POST', '/api/admin/products', input);
    const page = await ctx.app.inject({ method: 'GET', url: `/api/products/${input.slug}` });
    expect(page.statusCode).toBe(404);
  });

  it('проверяет порядок слоёв и занятый адрес', async () => {
    const broken = await call(
      'POST',
      '/api/admin/products',
      await newInput({ topMinutes: 500, heartMinutes: 180 }),
    );
    expect(broken.statusCode).toBe(400);

    const taken = await call('POST', '/api/admin/products', await newInput({ slug: 'basalt' }));
    expect(taken.statusCode).toBe(409);
    expect(errorResponseSchema.parse(taken.json()).error.details).toEqual({ field: 'slug' });
  });

  it('убранный из формы объём отключается, а не удаляется', async () => {
    const created = adminProductSchema.parse(
      (await call('POST', '/api/admin/products', await newInput())).json(),
    );
    const input = toInput(created);
    const updated = adminProductSchema.parse(
      (
        await call('PUT', `/api/admin/products/${created.id}`, {
          ...input,
          variants: input.variants.slice(0, 1),
        })
      ).json(),
    );
    expect(updated.variants.map((variant) => [variant.volumeMl, variant.isActive])).toEqual([
      [30, true],
      [50, false],
    ]);
  });

  it('«Срез на главной» может быть только у одного образца', async () => {
    const walnutId = await productId('walnut');
    const walnut = await adminProduct(walnutId);
    const response = await call('PUT', `/api/admin/products/${walnutId}`, {
      ...toInput(walnut),
      isFeatured: true,
    });
    expect(response.statusCode, response.body).toBe(200);
    const featured = await ctx.testDb.db
      .select({ slug: products.slug })
      .from(products)
      .where(eq(products.isFeatured, true));
    expect(featured.map((row) => row.slug)).toEqual(['walnut']);
  });

  it('удаляет только черновик без заказов', async () => {
    const published = adminProductSchema.parse(
      (await call('POST', '/api/admin/products', await newInput())).json(),
    );
    expect((await call('DELETE', `/api/admin/products/${published.id}`)).statusCode).toBe(409);

    const draft = adminProductSchema.parse(
      (await call('POST', '/api/admin/products', await newInput({ isPublished: false }))).json(),
    );
    expect((await call('DELETE', `/api/admin/products/${draft.id}`)).statusCode).toBe(204);
    expect((await call('GET', `/api/admin/products/${draft.id}`)).statusCode).toBe(404);
  });
});

describe('«Снова в наличии»', () => {
  it('пополнение закончившегося образца пишет подписчикам один раз', async () => {
    const id = await productId('obsidian');
    await ctx.app.inject({
      method: 'POST',
      url: '/api/stock-notifications',
      ...CSRF,
      payload: { productId: id, email: 'waiting@nisha.test' },
    });
    const obsidian = await adminProduct(id);
    const input = toInput(obsidian);

    const restocked = {
      ...input,
      variants: input.variants.map((variant, index) => ({
        ...variant,
        stock: index === 0 ? 3 : 0,
      })),
    };
    expect((await call('PUT', `/api/admin/products/${id}`, restocked)).statusCode).toBe(200);

    // Письмо и отметка о нём пишутся уже после ответа (D-071): под нагрузкой полного прогона
    // на это уходит больше секунды по умолчанию, и отметка появляется позже письма.
    await vi.waitFor(
      async () => {
        expect(ctx.mails.filter((mail) => mail.to === 'waiting@nisha.test')).toHaveLength(1);
        const [subscription] = await ctx.testDb.db
          .select()
          .from(stockNotifications)
          .where(eq(stockNotifications.email, 'waiting@nisha.test'));
        expect(subscription?.notifiedAt).not.toBeNull();
      },
      { timeout: 5000 },
    );

    // Остаток N → M не повод писать снова.
    const more = {
      ...restocked,
      variants: restocked.variants.map((variant, index) => ({
        ...variant,
        stock: index === 0 ? 7 : 0,
      })),
    };
    await call('PUT', `/api/admin/products/${id}`, more);
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(ctx.mails.filter((mail) => mail.to === 'waiting@nisha.test')).toHaveLength(1);
  });
});

describe('справочники', () => {
  it('создаёт, не даёт занять адрес и удалить используемое', async () => {
    const created = await call('POST', '/api/admin/dictionaries/materials', {
      slug: 'slate',
      name: 'Сланец',
      swatchColor: '#5a5f63',
      position: 10,
    });
    expect(created.statusCode, created.body).toBe(204);
    const slate = (await dictionaries()).materials.find((item) => item.slug === 'slate');
    expect(slate).toMatchObject({ swatchColor: '#5A5F63', productsCount: 0 });

    const duplicate = await call('POST', '/api/admin/dictionaries/materials', {
      slug: 'slate',
      name: 'Ещё сланец',
      swatchColor: '#000000',
      position: 0,
    });
    expect(duplicate.statusCode).toBe(409);

    const basalt = (await dictionaries()).materials.find((item) => item.slug === 'basalt');
    expect(
      (await call('DELETE', `/api/admin/dictionaries/materials/${basalt?.id}`)).statusCode,
    ).toBe(409);
    expect(
      (await call('DELETE', `/api/admin/dictionaries/materials/${slate?.id}`)).statusCode,
    ).toBe(204);
  });
});
