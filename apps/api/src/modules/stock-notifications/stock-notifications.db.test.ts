import { errorResponseSchema, stockNotificationResponseSchema } from '@nisha/contracts';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { products, stockNotifications } from '../../database/schema';
import { createTestApp, CSRF } from '../../shared/test-app';
import type { TestApp } from '../../shared/test-app';

let ctx: TestApp;
let ip = 0;

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(async () => {
  await ctx.close();
});

async function productId(slug: string): Promise<string> {
  const [row] = await ctx.testDb.db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, slug));
  if (!row) throw new Error(`Нет товара ${slug}`);
  return row.id;
}

// Лимит считается по IP: каждый тест — со своего адреса, чтобы не делить общий бюджет запросов.
function subscribe(payload: object, remoteAddress = `10.0.0.${(ip += 1)}`) {
  return ctx.app.inject({
    method: 'POST',
    url: '/api/stock-notifications',
    payload,
    remoteAddress,
    ...CSRF,
  });
}

describe('POST /api/stock-notifications', () => {
  it('подписывает на товар без остатка, а повтор отвечает «уже подписаны»', async () => {
    const id = await productId('obsidian');
    const first = await subscribe({ productId: id, email: ' Anna@Nisha.test ' });
    expect(first.statusCode).toBe(201);
    expect(stockNotificationResponseSchema.parse(first.json()).status).toBe('subscribed');

    const repeat = await subscribe({ productId: id, email: 'anna@nisha.test' });
    expect(repeat.statusCode).toBe(200);
    expect(stockNotificationResponseSchema.parse(repeat.json()).status).toBe('already_subscribed');

    const rows = await ctx.testDb.db
      .select()
      .from(stockNotifications)
      .where(eq(stockNotifications.productId, id));
    expect(rows.map((row) => row.email)).toEqual(['anna@nisha.test']);
  });

  it('разрешает подписку, если закончился хотя бы один объём', async () => {
    // У «Среза» нет 100 мл, остальные объёмы в наличии.
    const response = await subscribe({ productId: await productId('cut'), email: 'b@nisha.test' });
    expect(response.statusCode).toBe(201);
  });

  it('отвечает 409, если в наличии все объёмы', async () => {
    const response = await subscribe({
      productId: await productId('basalt'),
      email: 'c@nisha.test',
    });
    expect(response.statusCode).toBe(409);
    expect(errorResponseSchema.parse(response.json()).error.code).toBe('CONFLICT');
  });

  it('отвечает 404 для черновика и 400 без email', async () => {
    const draft = await subscribe({ productId: await productId('resin'), email: 'd@nisha.test' });
    expect(draft.statusCode).toBe(404);

    const noEmail = await subscribe({ productId: await productId('obsidian') });
    expect(noEmail.statusCode).toBe(400);
    expect(errorResponseSchema.parse(noEmail.json()).error.code).toBe('VALIDATION_FAILED');
  });

  it('ограничивает частоту: шестой запрос за минуту с одного адреса — 429', async () => {
    const id = await productId('obsidian');
    const address = '10.0.1.1';
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await subscribe(
        { productId: id, email: `spam${attempt}@nisha.test` },
        address,
      );
      statuses.push(response.statusCode);
    }
    expect(statuses.slice(0, 5).every((status) => status === 201)).toBe(true);
    expect(statuses[5]).toBe(429);

    const limited = await subscribe({ productId: id, email: 'last@nisha.test' }, address);
    expect(errorResponseSchema.parse(limited.json()).error.code).toBe('RATE_LIMITED');
  });
});
