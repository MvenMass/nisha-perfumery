import { randomUUID } from 'node:crypto';

import {
  adminOrderListResponseSchema,
  adminOrderSchema,
  createOrderResponseSchema,
  errorResponseSchema,
} from '@nisha/contracts';
import type { CreateOrderResponse } from '@nisha/contracts';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { productVariants, products } from '../../database/schema';
import { createTestApp, CSRF, signInAdmin, signUp } from '../../shared/test-app';
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

type Cookies = Record<string, string>;

function call(method: string, url: string, cookies: Cookies, payload?: object) {
  return ctx.app.inject({
    method: method as 'GET',
    url,
    cookies,
    headers: CSRF.headers,
    remoteAddress: `10.9.${Math.floor((ip += 1) / 250)}.${ip % 250}`,
    ...(payload ? { payload } : {}),
  });
}

async function variant(slug: string, volumeMl: number) {
  const [row] = await ctx.testDb.db
    .select({ id: productVariants.id, stock: productVariants.stock })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(and(eq(products.slug, slug), eq(productVariants.volumeMl, volumeMl)));
  if (!row) throw new Error(`Нет варианта ${slug} ${volumeMl}`);
  return row;
}

async function paidOrder(
  slug: string,
  volumeMl: number,
  method: 'boutique' | 'pickup_point' = 'boutique',
): Promise<CreateOrderResponse> {
  const { id } = await variant(slug, volumeMl);
  const created = createOrderResponseSchema.parse(
    (
      await call('POST', '/api/orders', CSRF.cookies, {
        contact: {
          name: 'Анна',
          phone: '+7 900 000-00-00',
          email: `buyer-${randomUUID()}@nisha.test`,
        },
        delivery: method === 'boutique' ? { method } : { method, pickupPointId: 'msk-01' },
        idempotencyKey: randomUUID(),
        items: [{ variantId: id, quantity: 1 }],
      })
    ).json(),
  );
  await call('POST', '/api/payments/mock/notify', CSRF.cookies, {
    orderId: created.order.id,
    token: created.accessToken ?? undefined,
    result: 'succeeded',
  });
  return created;
}

describe('доступ к админке', () => {
  const adminRoutes = () =>
    ctx.app.routeList
      .filter((route) => route.split(' ')[1]?.startsWith('/api/admin'))
      .map((route) => {
        const [method = 'GET', url = ''] = route.split(' ');
        return { method, url: url.replace(/:\w+/g, randomUUID()) };
      });

  it('маршруты админки есть, и каждый закрыт для гостя (401) и покупателя (403)', async () => {
    const routes = adminRoutes();
    expect(routes.length).toBeGreaterThan(0);
    const user = await signUp(ctx.app, 'not-admin@nisha.test');

    for (const route of routes) {
      const guest = await call(route.method, route.url, CSRF.cookies, {});
      expect(guest.statusCode, `${route.method} ${route.url} без входа`).toBe(401);
      const customer = await call(route.method, route.url, user, {});
      expect(customer.statusCode, `${route.method} ${route.url} покупателем`).toBe(403);
    }
  });
});

describe('заказы в админке', () => {
  it('ищет по номеру и email, фильтрует по статусу', async () => {
    const order = await paidOrder('limestone', 30);
    const byNumber = adminOrderListResponseSchema.parse(
      (await call('GET', `/api/admin/orders?q=${order.order.number}`, admin)).json(),
    );
    expect(byNumber.items.map((item) => item.id)).toEqual([order.order.id]);

    const byEmail = adminOrderListResponseSchema.parse(
      (
        await call(
          'GET',
          `/api/admin/orders?q=${encodeURIComponent(order.order.contact.email.slice(0, 12))}`,
          admin,
        )
      ).json(),
    );
    expect(byEmail.items.map((item) => item.id)).toContain(order.order.id);

    const pending = adminOrderListResponseSchema.parse(
      (await call('GET', '/api/admin/orders?status=pending', admin)).json(),
    );
    expect(pending.items.some((item) => item.id === order.order.id)).toBe(false);
  });

  it('ведёт заказ по допустимым статусам и пишет автора в историю', async () => {
    const order = await paidOrder('walnut', 30, 'pickup_point');
    const before = adminOrderSchema.parse(
      (await call('GET', `/api/admin/orders/${order.order.id}`, admin)).json(),
    );
    expect(before.allowedStatuses).toEqual(['shipped', 'cancelled']);

    const shipped = await call('PATCH', `/api/admin/orders/${order.order.id}/status`, admin, {
      status: 'shipped',
    });
    expect(shipped.statusCode, shipped.body).toBe(200);
    expect(adminOrderSchema.parse(shipped.json()).allowedStatuses).toEqual(['delivered']);

    // Пропустить шаг или вернуться назад нельзя.
    const back = await call('PATCH', `/api/admin/orders/${order.order.id}/status`, admin, {
      status: 'paid',
    });
    expect(back.statusCode).toBe(409);
    expect(errorResponseSchema.parse(back.json()).error.code).toBe('CONFLICT');
    const cancel = await call('PATCH', `/api/admin/orders/${order.order.id}/status`, admin, {
      status: 'cancelled',
    });
    expect(cancel.statusCode).toBe(409);

    const delivered = adminOrderSchema.parse(
      (
        await call('PATCH', `/api/admin/orders/${order.order.id}/status`, admin, {
          status: 'delivered',
        })
      ).json(),
    );
    expect(delivered.history.map((event) => event.status)).toEqual([
      'pending',
      'paid',
      'shipped',
      'delivered',
    ]);
  });

  it('самовывоз нельзя «передать в доставку»', async () => {
    const order = await paidOrder('amber', 30);
    const response = await call('PATCH', `/api/admin/orders/${order.order.id}/status`, admin, {
      status: 'shipped',
    });
    expect(response.statusCode).toBe(409);
  });

  it('отмена оплаченного возвращает остаток и деньги', async () => {
    const before = (await variant('travertine', 30)).stock;
    const order = await paidOrder('travertine', 30);
    expect((await variant('travertine', 30)).stock).toBe(before - 1);

    const response = await call('PATCH', `/api/admin/orders/${order.order.id}/status`, admin, {
      status: 'cancelled',
      comment: 'Покупатель передумал',
    });
    expect(adminOrderSchema.parse(response.json())).toMatchObject({
      status: 'cancelled',
      paymentStatus: 'refunded',
      allowedStatuses: [],
    });
    expect((await variant('travertine', 30)).stock).toBe(before);
  });
});
