import { randomUUID } from 'node:crypto';

import {
  addressesResponseSchema,
  addressSchema,
  createOrderResponseSchema,
  orderListResponseSchema,
  repeatOrderResponseSchema,
} from '@nisha/contracts';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { orders, productVariants, products } from '../../database/schema';
import { createTestApp, CSRF, signUp } from '../../shared/test-app';
import type { TestApp } from '../../shared/test-app';

let ctx: TestApp;

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(async () => {
  await ctx.close();
});

type Cookies = Record<string, string>;

async function variant(slug: string, volumeMl: number) {
  const [row] = await ctx.testDb.db
    .select({ id: productVariants.id })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(and(eq(products.slug, slug), eq(productVariants.volumeMl, volumeMl)));
  if (!row) throw new Error(`Нет варианта ${slug} ${volumeMl}`);
  return row.id;
}

function request(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
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

async function placeOrder(user: Cookies, email: string, items: Array<[string, number]>) {
  for (const [variantId, quantity] of items) {
    await request('PUT', '/api/cart/items', user, { variantId, quantity });
  }
  const response = await request('POST', '/api/orders', user, {
    contact: { name: 'Анна', phone: '+7 900 000-00-00', email },
    delivery: { method: 'boutique' },
    idempotencyKey: randomUUID(),
  });
  expect(response.statusCode, response.body).toBe(201);
  return createOrderResponseSchema.parse(response.json()).order;
}

describe('история заказов', () => {
  it('делит заказы на активные и завершённые, новые — сверху', async () => {
    const user = await signUp(ctx.app, 'history@nisha.test');
    const first = await placeOrder(user, 'history@nisha.test', [
      [await variant('limestone', 30), 2],
    ]);
    const second = await placeOrder(user, 'history@nisha.test', [
      [await variant('walnut', 30), 1],
      [await variant('amber', 30), 1],
    ]);
    await ctx.testDb.db.update(orders).set({ status: 'delivered' }).where(eq(orders.id, first.id));

    const all = orderListResponseSchema.parse((await request('GET', '/api/orders', user)).json());
    expect(all.total).toBe(2);
    expect(all.items.map((item) => item.id)).toEqual([second.id, first.id]);
    expect(all.items[0]).toMatchObject({ productNames: ['Орех', 'Янтарь'], bottlesCount: 2 });

    const active = orderListResponseSchema.parse(
      (await request('GET', '/api/orders?filter=active', user)).json(),
    );
    expect(active.items.map((item) => item.id)).toEqual([second.id]);
    const done = orderListResponseSchema.parse(
      (await request('GET', '/api/orders?filter=done', user)).json(),
    );
    expect(done.items.map((item) => item.id)).toEqual([first.id]);

    const stranger = await signUp(ctx.app, 'history-other@nisha.test');
    const foreign = orderListResponseSchema.parse(
      (await request('GET', '/api/orders', stranger)).json(),
    );
    expect(foreign.total).toBe(0);
  });
});

describe('«Повторить заказ»', () => {
  it('кладёт доступное в корзину и называет недоступное с причиной', async () => {
    const user = await signUp(ctx.app, 'repeat@nisha.test');
    const travertine = await variant('travertine', 50);
    const chalk = await variant('chalk', 50);
    const ash = await variant('ash', 50);
    const order = await placeOrder(user, 'repeat@nisha.test', [
      [travertine, 2],
      [chalk, 1],
      [ash, 1],
    ]);

    await ctx.testDb.db
      .update(productVariants)
      .set({ stock: 0 })
      .where(eq(productVariants.id, chalk));
    await ctx.testDb.db
      .update(productVariants)
      .set({ isActive: false })
      .where(eq(productVariants.id, ash));

    const response = await request('POST', `/api/orders/${order.id}/repeat`, user);
    expect(response.statusCode, response.body).toBe(200);
    const body = repeatOrderResponseSchema.parse(response.json());
    expect(body.cart.lines.map((line) => [line.variantId, line.quantity])).toEqual([
      [travertine, 2],
    ]);
    expect(body.unavailable).toEqual([
      { productName: 'Мел', volumeMl: 50, reason: 'out_of_stock' },
      { productName: 'Пепел', volumeMl: 50, reason: 'unpublished' },
    ]);
  });

  it('чужой заказ повторить нельзя', async () => {
    const owner = await signUp(ctx.app, 'repeat-owner@nisha.test');
    const order = await placeOrder(owner, 'repeat-owner@nisha.test', [
      [await variant('spring', 30), 1],
    ]);
    const stranger = await signUp(ctx.app, 'repeat-stranger@nisha.test');
    expect((await request('POST', `/api/orders/${order.id}/repeat`, stranger)).statusCode).toBe(
      404,
    );
  });
});

describe('адреса', () => {
  const input = (label: string, isDefault = false) => ({
    label,
    city: 'Москва',
    street: `${label}, 1`,
    apartment: '',
    isDefault,
  });

  it('первый адрес — по умолчанию, новый «по умолчанию» снимает прежний', async () => {
    const user = await signUp(ctx.app, 'addresses@nisha.test');
    const home = addressSchema.parse(
      (await request('POST', '/api/addresses', user, input('Дом'))).json(),
    );
    expect(home).toMatchObject({ isDefault: true, apartment: null });
    const work = addressSchema.parse(
      (await request('POST', '/api/addresses', user, input('Работа', true))).json(),
    );

    const list = addressesResponseSchema.parse(
      (await request('GET', '/api/addresses', user)).json(),
    );
    expect(list.items.map((item) => [item.id, item.isDefault])).toEqual([
      [work.id, true],
      [home.id, false],
    ]);

    await request('PATCH', `/api/addresses/${home.id}`, user, input('Дом', true));
    const after = addressesResponseSchema.parse(
      (await request('GET', '/api/addresses', user)).json(),
    );
    expect(after.items.filter((item) => item.isDefault).map((item) => item.id)).toEqual([home.id]);

    expect((await request('DELETE', `/api/addresses/${work.id}`, user)).statusCode).toBe(204);
  });

  it('чужие адреса недоступны, без входа — 401', async () => {
    const owner = await signUp(ctx.app, 'address-owner@nisha.test');
    const address = addressSchema.parse(
      (await request('POST', '/api/addresses', owner, input('Дача'))).json(),
    );
    const stranger = await signUp(ctx.app, 'address-stranger@nisha.test');
    expect(
      (await request('PATCH', `/api/addresses/${address.id}`, stranger, input('Чужое'))).statusCode,
    ).toBe(404);
    expect((await request('DELETE', `/api/addresses/${address.id}`, stranger)).statusCode).toBe(
      404,
    );
    expect((await request('GET', '/api/addresses', CSRF.cookies)).statusCode).toBe(401);

    // Чужой сохранённый адрес нельзя подставить и в заказ.
    await request('PUT', '/api/cart/items', stranger, {
      variantId: await variant('limestone', 100),
      quantity: 1,
    });
    const order = await request('POST', '/api/orders', stranger, {
      contact: { name: 'Вор', phone: '+7 900 000-00-00', email: 'address-stranger@nisha.test' },
      delivery: { method: 'courier', address: { addressId: address.id } },
      idempotencyKey: randomUUID(),
    });
    expect(order.statusCode).toBe(400);
  });
});
