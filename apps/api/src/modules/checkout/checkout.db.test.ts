import { checkoutQuoteSchema, pickupPointsResponseSchema } from '@nisha/contracts';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { productVariants, products } from '../../database/schema';
import { createTestApp, CSRF, signUp } from '../../shared/test-app';
import type { TestApp } from '../../shared/test-app';

let ctx: TestApp;

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(async () => {
  await ctx.close();
});

async function variant(slug: string, volumeMl: number) {
  const [row] = await ctx.testDb.db
    .select({ id: productVariants.id, price: productVariants.priceKopecks })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(and(eq(products.slug, slug), eq(productVariants.volumeMl, volumeMl)));
  if (!row) throw new Error(`Нет варианта ${slug} ${volumeMl}`);
  return row;
}

function quote(payload: object, cookies: Record<string, string> = CSRF.cookies) {
  return ctx.app.inject({
    method: 'POST',
    url: '/api/checkout/quote',
    payload,
    cookies,
    headers: CSRF.headers,
  });
}

describe('POST /api/checkout/quote', () => {
  it('считает доставку гостю по позициям из запроса', async () => {
    const basalt = await variant('basalt', 30);
    const items = [{ variantId: basalt.id, quantity: 1 }];

    const courier = checkoutQuoteSchema.parse((await quote({ method: 'courier', items })).json());
    expect(courier.deliveryPriceKopecks).toBe(49_000);
    expect(courier.totalKopecks).toBe(basalt.price + 49_000);
    expect(courier.untilFreeDeliveryKopecks).toBe(1_000_000 - basalt.price);

    const boutique = checkoutQuoteSchema.parse((await quote({ method: 'boutique', items })).json());
    expect(boutique.deliveryPriceKopecks).toBe(0);
    expect(boutique.totalKopecks).toBe(basalt.price);
  });

  it('делает доставку бесплатной от порога', async () => {
    const basalt = await variant('basalt', 100);
    const body = checkoutQuoteSchema.parse(
      (
        await quote({
          method: 'pickup_point',
          items: [{ variantId: basalt.id, quantity: 2 }],
        })
      ).json(),
    );
    expect(body.cart.summary.itemsTotalKopecks).toBeGreaterThanOrEqual(1_000_000);
    expect(body.deliveryPriceKopecks).toBe(0);
  });

  it('у вошедшего считает его корзину и игнорирует items из запроса', async () => {
    const user = await signUp(ctx.app, 'quote@nisha.test');
    const walnut = await variant('walnut', 30);
    await ctx.app.inject({
      method: 'PUT',
      url: '/api/cart/items',
      cookies: user,
      headers: CSRF.headers,
      payload: { variantId: walnut.id, quantity: 1 },
    });
    const basalt = await variant('basalt', 30);
    const body = checkoutQuoteSchema.parse(
      (
        await quote({ method: 'boutique', items: [{ variantId: basalt.id, quantity: 5 }] }, user)
      ).json(),
    );
    expect(body.cart.lines.map((line) => line.variantId)).toEqual([walnut.id]);
  });
});

describe('GET /api/pickup-points', () => {
  it('отдаёт города и пункты выбранного города', async () => {
    const response = await ctx.app.inject({
      method: 'GET',
      url: `/api/pickup-points?city=${encodeURIComponent('Москва')}`,
    });
    const body = pickupPointsResponseSchema.parse(response.json());
    expect(body.cities).toEqual(['Москва', 'Санкт-Петербург']);
    expect(body.points.length).toBeGreaterThan(0);
    expect(body.points.every((point) => point.city === 'Москва')).toBe(true);
  });
});
