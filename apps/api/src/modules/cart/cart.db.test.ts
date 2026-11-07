import { cartResponseSchema, errorResponseSchema } from '@nisha/contracts';
import type { CartResponse } from '@nisha/contracts';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { cartItems, carts, productVariants, products } from '../../database/schema';
import { createTestApp, CSRF, signUp } from '../../shared/test-app';
import type { TestApp } from '../../shared/test-app';

let ctx: TestApp;
let users = 0;

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(async () => {
  await ctx.close();
});

type Cookies = Record<string, string>;

async function variant(slug: string, volumeMl: number) {
  const [row] = await ctx.testDb.db
    .select({ id: productVariants.id, price: productVariants.priceKopecks })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(and(eq(products.slug, slug), eq(productVariants.volumeMl, volumeMl)));
  if (!row) throw new Error(`Нет варианта ${slug} ${volumeMl} мл`);
  return row;
}

async function setVariant(id: string, values: { stock?: number; isActive?: boolean }) {
  await ctx.testDb.db.update(productVariants).set(values).where(eq(productVariants.id, id));
}

function newUser(): Promise<Cookies> {
  return signUp(ctx.app, `buyer${(users += 1)}@nisha.test`);
}

function request(
  method: 'GET' | 'PUT' | 'POST' | 'DELETE',
  url: string,
  cookies: Cookies,
  payload?: object,
) {
  return ctx.app.inject({
    method,
    url,
    cookies,
    headers: CSRF.headers,
    ...(payload ? { payload } : {}),
  });
}

async function cart(response: { statusCode: number; json: () => unknown }): Promise<CartResponse> {
  expect(response.statusCode).toBe(200);
  return cartResponseSchema.parse(response.json());
}

const put = (cookies: Cookies, variantId: string, quantity: number) =>
  request('PUT', '/api/cart/items', cookies, { variantId, quantity });

describe('корзина пользователя', () => {
  it('пустая у нового пользователя', async () => {
    const body = await cart(await request('GET', '/api/cart', await newUser()));
    expect(body).toEqual({
      lines: [],
      summary: { productsCount: 0, bottlesCount: 0, itemsTotalKopecks: 0 },
    });
  });

  it('считает итог по ценам из базы и меняет количество', async () => {
    const user = await newUser();
    const basalt = await variant('basalt', 30);
    const walnut = await variant('walnut', 100);

    await put(user, basalt.id, 1);
    await put(user, walnut.id, 1);
    const body = await cart(await put(user, basalt.id, 2));

    expect(body.lines.map((line) => [line.productSlug, line.quantity])).toEqual([
      ['basalt', 2],
      ['walnut', 1],
    ]);
    expect(body.summary).toEqual({
      productsCount: 2,
      bottlesCount: 3,
      itemsTotalKopecks: basalt.price * 2 + walnut.price,
    });
    // GET отдаёт то же, что вернул последний PUT.
    expect(await cart(await request('GET', '/api/cart', user))).toEqual(body);
  });

  it('не даёт положить больше остатка и говорит, сколько осталось', async () => {
    const user = await newUser();
    const basalt50 = await variant('basalt', 50);
    const response = await put(user, basalt50.id, 4);

    expect(response.statusCode).toBe(409);
    const { error } = errorResponseSchema.parse(response.json());
    expect(error).toMatchObject({ code: 'OUT_OF_STOCK', details: { available: 3 } });
    expect((await cart(await put(user, basalt50.id, 3))).lines[0]?.quantity).toBe(3);
  });

  it('отвечает 404 на черновик, закончившийся объём — 409', async () => {
    const user = await newUser();
    const draft = await put(user, (await variant('resin', 50)).id, 1);
    expect(draft.statusCode).toBe(404);
    const empty = await put(user, (await variant('obsidian', 50)).id, 1);
    expect(empty.statusCode).toBe(409);
  });

  it('показывает закончившуюся и снятую позицию, но не считает их', async () => {
    const user = await newUser();
    const limestone = await variant('limestone', 30);
    const travertine = await variant('travertine', 30);
    const amber = await variant('amber', 30);
    await put(user, limestone.id, 1);
    await put(user, travertine.id, 2);
    await put(user, amber.id, 1);

    await setVariant(travertine.id, { stock: 0 });
    await setVariant(amber.id, { isActive: false });
    try {
      const body = await cart(await request('GET', '/api/cart', user));
      expect(
        body.lines.map((line) => [line.productSlug, line.status, line.lineTotalKopecks]),
      ).toEqual([
        ['limestone', 'available', limestone.price],
        ['travertine', 'out_of_stock', 0],
        ['amber', 'unavailable', 0],
      ]);
      expect(body.summary).toEqual({
        productsCount: 1,
        bottlesCount: 1,
        itemsTotalKopecks: limestone.price,
      });
    } finally {
      await setVariant(travertine.id, { stock: 6 });
      await setVariant(amber.id, { isActive: true });
    }
  });

  it('удаляет позицию', async () => {
    const user = await newUser();
    const basalt = await variant('basalt', 30);
    await put(user, basalt.id, 1);
    const body = await cart(await request('DELETE', `/api/cart/items/${basalt.id}`, user));
    expect(body.lines).toEqual([]);
  });

  it('у каждого своя корзина', async () => {
    const anna = await newUser();
    const boris = await newUser();
    await put(anna, (await variant('basalt', 30)).id, 1);
    expect((await cart(await request('GET', '/api/cart', boris))).lines).toEqual([]);
  });

  it('без входа — 401, без CSRF — 403', async () => {
    const guest = await request('GET', '/api/cart', {});
    expect(guest.statusCode).toBe(401);

    const user = await newUser();
    const noCsrf = await ctx.app.inject({
      method: 'PUT',
      url: '/api/cart/items',
      cookies: user,
      payload: { variantId: (await variant('basalt', 30)).id, quantity: 1 },
    });
    expect(noCsrf.statusCode).toBe(403);
  });
});

describe('слияние гостевой корзины', () => {
  it('суммирует, обрезает остатком, переносит новое и пропускает снятое', async () => {
    const user = await newUser();
    const basalt30 = await variant('basalt', 30);
    const basalt50 = await variant('basalt', 50);
    const walnut = await variant('walnut', 30);
    const resin = await variant('resin', 50);
    await put(user, basalt30.id, 2);
    await put(user, basalt50.id, 2);

    const body = await cart(
      await request('POST', '/api/cart/merge', user, {
        items: [
          { variantId: basalt30.id, quantity: 3 },
          { variantId: basalt50.id, quantity: 2 },
          { variantId: walnut.id, quantity: 1 },
          { variantId: resin.id, quantity: 1 },
        ],
      }),
    );

    expect(body.lines.map((line) => [line.variantId, line.quantity])).toEqual([
      [basalt30.id, 5],
      // Остаток 3: 2 + 2 обрезано до 3.
      [basalt50.id, 3],
      [walnut.id, 1],
    ]);
  });

  it('сохраняет закончившуюся позицию с пометкой', async () => {
    const user = await newUser();
    const obsidian = await variant('obsidian', 30);
    const body = await cart(
      await request('POST', '/api/cart/merge', user, {
        items: [{ variantId: obsidian.id, quantity: 2 }],
      }),
    );
    expect(body.lines[0]).toMatchObject({ status: 'out_of_stock', quantity: 2 });
    expect(body.summary.itemsTotalKopecks).toBe(0);
  });

  it('повтор с теми же данными не удваивает, если упёрлись в остаток', async () => {
    const user = await newUser();
    const basalt50 = await variant('basalt', 50);
    const payload = { items: [{ variantId: basalt50.id, quantity: 3 }] };
    await request('POST', '/api/cart/merge', user, payload);
    const body = await cart(await request('POST', '/api/cart/merge', user, payload));
    expect(body.lines[0]?.quantity).toBe(3);
  });
});

describe('POST /api/cart/quote', () => {
  it('считает гостевую корзину по ценам базы и ничего не пишет', async () => {
    const basalt = await variant('basalt', 30);
    const count = async () => ({
      carts: (await ctx.testDb.db.select().from(carts)).length,
      items: (await ctx.testDb.db.select().from(cartItems)).length,
    });
    const before = await count();

    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/cart/quote',
      ...CSRF,
      // Цена с клиента не входит в контракт и игнорируется.
      payload: {
        items: [
          { variantId: basalt.id, quantity: 1, priceKopecks: 1 },
          { variantId: basalt.id, quantity: 1 },
        ],
      },
    });
    const body = await cart(response);
    expect(body.lines).toHaveLength(1);
    expect(body.lines[0]).toMatchObject({ quantity: 2, priceKopecks: basalt.price });
    expect(body.summary.itemsTotalKopecks).toBe(basalt.price * 2);

    expect(await count()).toEqual(before);
  });

  it('отклоняет количество больше 99', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/cart/quote',
      ...CSRF,
      payload: { items: [{ variantId: (await variant('basalt', 30)).id, quantity: 100 }] },
    });
    expect(response.statusCode).toBe(400);
  });
});
