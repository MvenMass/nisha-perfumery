import { randomUUID } from 'node:crypto';

import { createOrderResponseSchema, errorResponseSchema, orderSchema } from '@nisha/contracts';
import type { CreateOrderResponse } from '@nisha/contracts';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  addresses,
  cartItems,
  orders,
  payments,
  productVariants,
  products,
  users,
} from '../../database/schema';
import { createTestApp, CSRF, signUp } from '../../shared/test-app';
import type { TestApp } from '../../shared/test-app';
import { SESSION_COOKIE } from '../auth/session';
import { cancelExpiredOrders } from './orders.service';

let ctx: TestApp;
let ip = 0;

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
  if (!row) throw new Error(`Нет варианта ${slug} ${volumeMl}`);
  return row;
}

async function stock(variantId: string): Promise<number> {
  const [row] = await ctx.testDb.db
    .select({ stock: productVariants.stock })
    .from(productVariants)
    .where(eq(productVariants.id, variantId));
  return row?.stock ?? -1;
}

const contact = (email: string) => ({ name: 'Анна', phone: '+7 900 000-00-00', email });

function post(url: string, payload: object, cookies: Cookies = CSRF.cookies) {
  return ctx.app.inject({
    method: 'POST',
    url,
    payload,
    cookies,
    headers: CSRF.headers,
    // Свой адрес на каждый запрос: у оформления лимит 10 в минуту с IP.
    remoteAddress: `10.7.${Math.floor((ip += 1) / 250)}.${ip % 250}`,
  });
}

function guestOrder(
  email: string,
  items: Array<{ variantId: string; quantity: number }>,
  extra = {},
) {
  return post('/api/orders', {
    contact: contact(email),
    delivery: { method: 'boutique' },
    idempotencyKey: randomUUID(),
    items,
    ...extra,
  });
}

function created(response: { statusCode: number; body: string; json: () => unknown }) {
  expect(response.statusCode, response.body).toBe(201);
  return createOrderResponseSchema.parse(response.json());
}

const pay = (order: CreateOrderResponse, result: 'succeeded' | 'failed', cookies?: Cookies) =>
  post(
    '/api/payments/mock/notify',
    { orderId: order.order.id, token: order.accessToken ?? undefined, result },
    cookies,
  );

async function putInCart(user: Cookies, variantId: string, quantity: number) {
  const response = await ctx.app.inject({
    method: 'PUT',
    url: '/api/cart/items',
    cookies: user,
    headers: CSRF.headers,
    payload: { variantId, quantity },
  });
  expect(response.statusCode).toBe(200);
}

describe('оформление пользователем', () => {
  it('создаёт заказ из серверной корзины, списывает остаток и очищает корзину', async () => {
    const user = await signUp(ctx.app, 'buyer@nisha.test');
    const limestone = await variant('limestone', 50);
    const before = await stock(limestone.id);
    await putInCart(user, limestone.id, 2);

    const body = created(
      await post(
        '/api/orders',
        {
          contact: contact('buyer@nisha.test'),
          delivery: {
            method: 'courier',
            address: {
              newAddress: { label: 'Дом', city: 'Москва', street: 'Тверская, 1', apartment: '5' },
              save: true,
            },
          },
          idempotencyKey: randomUUID(),
        },
        user,
      ),
    );

    expect(body.accessToken).toBeNull();
    expect(body.order).toMatchObject({
      status: 'pending',
      paymentStatus: 'pending',
      deliveryMethod: 'courier',
      itemsTotalKopecks: limestone.price * 2,
      deliveryPriceKopecks: 0,
      totalKopecks: limestone.price * 2,
      deliveryAddress: { kind: 'courier', city: 'Москва', street: 'Тверская, 1', apartment: '5' },
    });
    expect(body.order.history.map((event) => event.status)).toEqual(['pending']);
    expect(body.order.paymentExpiresAt).not.toBeNull();
    expect(await stock(limestone.id)).toBe(before - 2);
    expect(await ctx.testDb.db.select().from(cartItems)).toHaveLength(0);

    const saved = await ctx.testDb.db.select().from(addresses);
    expect(saved.map((row) => row.street)).toEqual(['Тверская, 1']);
    const [payment] = await ctx.testDb.db
      .select()
      .from(payments)
      .where(eq(payments.orderId, body.order.id));
    expect(payment).toMatchObject({
      provider: 'mock',
      status: 'pending',
      amountKopecks: body.order.totalKopecks,
    });
  });

  it('отказывает в пустой корзине', async () => {
    const user = await signUp(ctx.app, 'empty@nisha.test');
    const response = await post(
      '/api/orders',
      {
        contact: contact('empty@nisha.test'),
        delivery: { method: 'boutique' },
        idempotencyKey: randomUUID(),
      },
      user,
    );
    expect(response.statusCode).toBe(400);
  });

  it('чужой заказ не виден — 404', async () => {
    const owner = await signUp(ctx.app, 'owner@nisha.test');
    const walnut = await variant('walnut', 30);
    await putInCart(owner, walnut.id, 1);
    const body = created(
      await post(
        '/api/orders',
        {
          contact: contact('owner@nisha.test'),
          delivery: { method: 'boutique' },
          idempotencyKey: randomUUID(),
        },
        owner,
      ),
    );

    const stranger = await signUp(ctx.app, 'stranger@nisha.test');
    const foreign = await ctx.app.inject({
      method: 'GET',
      url: `/api/orders/${body.order.id}`,
      cookies: stranger,
    });
    expect(foreign.statusCode).toBe(404);
    const own = await ctx.app.inject({
      method: 'GET',
      url: `/api/orders/${body.order.id}`,
      cookies: owner,
    });
    expect(orderSchema.parse(own.json()).id).toBe(body.order.id);
  });
});

describe('цены и остатки', () => {
  it('игнорирует цену с клиента и считает по базе', async () => {
    const amber = await variant('amber', 30);
    const body = created(
      await guestOrder(
        'price@nisha.test',
        [{ variantId: amber.id, quantity: 1, priceKopecks: 1 } as never],
        {
          totalKopecks: 1,
        },
      ),
    );
    expect(body.order.itemsTotalKopecks).toBe(amber.price);
    expect(body.order.items[0]?.priceKopecks).toBe(amber.price);
  });

  it('не даёт заказать больше остатка и ничего не списывает', async () => {
    const ash = await variant('ash', 100);
    const before = await stock(ash.id);
    const response = await guestOrder('greedy@nisha.test', [
      { variantId: ash.id, quantity: before + 1 },
    ]);
    expect(response.statusCode).toBe(409);
    const { error } = errorResponseSchema.parse(response.json());
    expect(error.code).toBe('OUT_OF_STOCK');
    expect(error.details).toMatchObject({ lines: [{ variantId: ash.id, available: before }] });
    expect(await stock(ash.id)).toBe(before);
  });

  it('последний флакон достаётся ровно одному из двух одновременных заказов', async () => {
    const spring = await variant('spring', 100);
    await ctx.testDb.db
      .update(productVariants)
      .set({ stock: 1 })
      .where(eq(productVariants.id, spring.id));

    const responses = await Promise.all([
      guestOrder('race-a@nisha.test', [{ variantId: spring.id, quantity: 1 }]),
      guestOrder('race-b@nisha.test', [{ variantId: spring.id, quantity: 1 }]),
    ]);
    expect(responses.map((response) => response.statusCode).sort()).toEqual([201, 409]);
    expect(await stock(spring.id)).toBe(0);
  });

  it('повтор с тем же ключом возвращает тот же заказ и не списывает дважды', async () => {
    const chalk = await variant('chalk', 30);
    const before = await stock(chalk.id);
    const payload = {
      contact: contact('twice@nisha.test'),
      delivery: { method: 'boutique' },
      idempotencyKey: randomUUID(),
      items: [{ variantId: chalk.id, quantity: 1 }],
    };
    const [first, second] = await Promise.all([
      post('/api/orders', payload),
      post('/api/orders', payload),
    ]);
    const a = created(first);
    const b = created(second);
    expect(b.order.id).toBe(a.order.id);
    expect(await stock(chalk.id)).toBe(before - 1);
    // Ключ хранится только хешем, поэтому повтор выдаёт новый и прежний перестаёт работать:
    // из двух выданных ключей открывает заказ ровно один.
    const statuses = await Promise.all(
      [a.accessToken, b.accessToken].map(async (token) => {
        const view = await ctx.app.inject({
          method: 'GET',
          url: `/api/orders/${a.order.id}?token=${token ?? ''}`,
        });
        return view.statusCode;
      }),
    );
    expect(statuses.sort()).toEqual([200, 404]);
  });

  it('проверяет пункт выдачи', async () => {
    const walnut = await variant('walnut', 50);
    const response = await guestOrder('point@nisha.test', [{ variantId: walnut.id, quantity: 1 }], {
      delivery: { method: 'pickup_point', pickupPointId: 'nowhere' },
    });
    expect(response.statusCode).toBe(400);

    const ok = created(
      await guestOrder('point@nisha.test', [{ variantId: walnut.id, quantity: 1 }], {
        delivery: { method: 'pickup_point', pickupPointId: 'msk-01' },
      }),
    );
    expect(ok.order.deliveryAddress).toMatchObject({ kind: 'pickup_point', pointId: 'msk-01' });
    expect(ok.order.deliveryPriceKopecks).toBe(29_000);
  });
});

describe('гостевой заказ', () => {
  it('создаёт аккаунт без пароля, шлёт ссылку и открывает заказ только по ключу', async () => {
    const travertine = await variant('travertine', 30);
    const response = await guestOrder('newguest@nisha.test', [
      { variantId: travertine.id, quantity: 1 },
    ]);
    const body = created(response);

    // Гость не входит автоматически.
    expect(response.cookies.find((cookie) => cookie.name === SESSION_COOKIE)).toBeUndefined();
    const [user] = await ctx.testDb.db
      .select()
      .from(users)
      .where(eq(users.email, 'newguest@nisha.test'));
    expect(user?.passwordHash).toBeNull();

    const mail = ctx.mails.find((item) => item.to === 'newguest@nisha.test');
    expect(mail?.text).toMatch(/https:\/\/nisha\.test\/set-password\?token=/);
    expect(mail?.text).toContain(`№ ${body.order.number}`);

    expect(body.accessToken).not.toBeNull();
    const without = await ctx.app.inject({ method: 'GET', url: `/api/orders/${body.order.id}` });
    expect(without.statusCode).toBe(404);
    const wrong = await ctx.app.inject({
      method: 'GET',
      url: `/api/orders/${body.order.id}?token=${'x'.repeat(43)}`,
    });
    expect(wrong.statusCode).toBe(404);
    const withToken = await ctx.app.inject({
      method: 'GET',
      url: `/api/orders/${body.order.id}?token=${body.accessToken ?? ''}`,
    });
    expect(withToken.statusCode).toBe(200);
  });

  it('привязывает заказ к существующему аккаунту без входа и без ссылки на пароль', async () => {
    const user = await signUp(ctx.app, 'registered@nisha.test');
    const mailsBefore = ctx.mails.length;
    const travertine = await variant('travertine', 50);
    const response = await guestOrder('registered@nisha.test', [
      { variantId: travertine.id, quantity: 1 },
    ]);
    const body = created(response);

    expect(response.cookies.find((cookie) => cookie.name === SESSION_COOKIE)).toBeUndefined();
    expect(ctx.mails.slice(mailsBefore).some((mail) => mail.subject.includes('пароль'))).toBe(
      false,
    );
    const own = await ctx.app.inject({
      method: 'GET',
      url: `/api/orders/${body.order.id}`,
      cookies: user,
    });
    expect(own.statusCode).toBe(200);
  });
});

describe('оплата', () => {
  it('успех: заказ оплачен, история и популярность обновлены, письмо отправлено', async () => {
    const workshop = await variant('workshop', 30);
    const [before] = await ctx.testDb.db
      .select({ popularity: products.popularity })
      .from(products)
      .where(eq(products.slug, 'workshop'));
    const order = created(
      await guestOrder('payer@nisha.test', [{ variantId: workshop.id, quantity: 2 }]),
    );

    const response = await pay(order, 'succeeded');
    expect(response.statusCode, response.body).toBe(200);
    const paid = orderSchema.parse(response.json());
    expect(paid).toMatchObject({
      status: 'paid',
      paymentStatus: 'succeeded',
      paymentExpiresAt: null,
    });
    expect(paid.history.map((event) => event.status)).toEqual(['pending', 'paid']);

    const [after] = await ctx.testDb.db
      .select({ popularity: products.popularity })
      .from(products)
      .where(eq(products.slug, 'workshop'));
    expect(after?.popularity).toBe((before?.popularity ?? 0) + 2);
    expect(ctx.mails.some((mail) => mail.subject === `Заказ № ${paid.number} оплачен`)).toBe(true);

    // Повторное уведомление не меняет состояние.
    expect((await pay(order, 'failed')).statusCode).toBe(409);
  });

  it('отказ: заказ отменён, остатки вернулись', async () => {
    const limestone = await variant('limestone', 100);
    const before = await stock(limestone.id);
    const order = created(
      await guestOrder('declined@nisha.test', [{ variantId: limestone.id, quantity: 2 }]),
    );
    expect(await stock(limestone.id)).toBe(before - 2);

    const response = await pay(order, 'failed');
    const cancelled = orderSchema.parse(response.json());
    expect(cancelled).toMatchObject({ status: 'cancelled', paymentStatus: 'failed' });
    expect(await stock(limestone.id)).toBe(before);
  });

  it('оплатить без доступа к заказу нельзя', async () => {
    const amber = await variant('amber', 50);
    const order = created(
      await guestOrder('nokey@nisha.test', [{ variantId: amber.id, quantity: 1 }]),
    );
    const response = await post('/api/payments/mock/notify', {
      orderId: order.order.id,
      result: 'succeeded',
    });
    expect(response.statusCode).toBe(404);
  });
});

describe('срок оплаты', () => {
  async function expire(orderId: string) {
    await ctx.testDb.db
      .update(orders)
      .set({ paymentExpiresAt: new Date(Date.now() - 1000) })
      .where(eq(orders.id, orderId));
  }

  it('просроченный заказ нельзя оплатить: он отменяется и возвращает остатки', async () => {
    const basalt = await variant('basalt', 100);
    const before = await stock(basalt.id);
    const order = created(
      await guestOrder('late@nisha.test', [{ variantId: basalt.id, quantity: 1 }]),
    );
    await expire(order.order.id);

    const response = await pay(order, 'succeeded');
    expect(response.statusCode).toBe(409);
    expect(await stock(basalt.id)).toBe(before);
    const view = await ctx.app.inject({
      method: 'GET',
      url: `/api/orders/${order.order.id}?token=${order.accessToken ?? ''}`,
    });
    expect(orderSchema.parse(view.json()).status).toBe('cancelled');
  });

  it('периодическая задача отменяет все просроченные и не трогает остальные', async () => {
    const chalk = await variant('chalk', 100);
    const before = await stock(chalk.id);
    const late = created(
      await guestOrder('job-a@nisha.test', [{ variantId: chalk.id, quantity: 1 }]),
    );
    const fresh = created(
      await guestOrder('job-b@nisha.test', [{ variantId: chalk.id, quantity: 1 }]),
    );
    await expire(late.order.id);

    expect(await cancelExpiredOrders(ctx.testDb.db)).toBeGreaterThanOrEqual(1);
    const [lateRow] = await ctx.testDb.db.select().from(orders).where(eq(orders.id, late.order.id));
    const [freshRow] = await ctx.testDb.db
      .select()
      .from(orders)
      .where(eq(orders.id, fresh.order.id));
    expect(lateRow?.status).toBe('cancelled');
    expect(freshRow?.status).toBe('pending');
    expect(await stock(chalk.id)).toBe(before - 1);
  });
});
