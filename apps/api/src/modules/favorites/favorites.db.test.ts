import { favoritesResponseSchema } from '@nisha/contracts';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { products } from '../../database/schema';
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

async function productId(slug: string): Promise<string> {
  const [row] = await ctx.testDb.db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, slug));
  if (!row) throw new Error(`Нет товара ${slug}`);
  return row.id;
}

const newUser = (): Promise<Cookies> => signUp(ctx.app, `fan${(users += 1)}@nisha.test`);

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

async function slugs(cookies: Cookies): Promise<string[]> {
  const response = await request('GET', '/api/favorites', cookies);
  expect(response.statusCode).toBe(200);
  return favoritesResponseSchema.parse(response.json()).items.map((item) => item.slug);
}

describe('избранное пользователя', () => {
  it('добавляет идемпотентно, показывает новые сверху и удаляет', async () => {
    const user = await newUser();
    const basalt = await productId('basalt');
    const walnut = await productId('walnut');

    expect((await request('PUT', `/api/favorites/${basalt}`, user)).statusCode).toBe(204);
    expect((await request('PUT', `/api/favorites/${walnut}`, user)).statusCode).toBe(204);
    expect((await request('PUT', `/api/favorites/${basalt}`, user)).statusCode).toBe(204);
    expect(await slugs(user)).toEqual(['walnut', 'basalt']);

    expect((await request('DELETE', `/api/favorites/${walnut}`, user)).statusCode).toBe(204);
    expect(await slugs(user)).toEqual(['basalt']);
  });

  it('не добавляет черновик', async () => {
    const response = await request(
      'PUT',
      `/api/favorites/${await productId('resin')}`,
      await newUser(),
    );
    expect(response.statusCode).toBe(404);
  });

  it('у каждого своё избранное', async () => {
    const anna = await newUser();
    await request('PUT', `/api/favorites/${await productId('basalt')}`, anna);
    expect(await slugs(await newUser())).toEqual([]);
  });

  it('без входа — 401, без CSRF — 403', async () => {
    expect((await request('GET', '/api/favorites', {})).statusCode).toBe(401);
    const user = await newUser();
    const noCsrf = await ctx.app.inject({
      method: 'PUT',
      url: `/api/favorites/${await productId('basalt')}`,
      cookies: user,
    });
    expect(noCsrf.statusCode).toBe(403);
  });
});

describe('слияние и гостевое избранное', () => {
  it('объединяет без дублей и пропускает черновик', async () => {
    const user = await newUser();
    const basalt = await productId('basalt');
    await request('PUT', `/api/favorites/${basalt}`, user);

    const response = await request('POST', '/api/favorites/merge', user, {
      productIds: [basalt, await productId('amber'), await productId('resin')],
    });
    expect(response.statusCode).toBe(200);
    const merged = favoritesResponseSchema.parse(response.json()).items.map((item) => item.slug);
    expect([...merged].sort()).toEqual(['amber', 'basalt']);
    expect(await slugs(user)).toHaveLength(2);
  });

  it('отдаёт гостю карточки в его порядке без дублей и черновиков', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/favorites/quote',
      ...CSRF,
      payload: {
        productIds: [
          await productId('walnut'),
          await productId('resin'),
          await productId('limestone'),
          await productId('walnut'),
        ],
      },
    });
    expect(response.statusCode).toBe(200);
    const body = favoritesResponseSchema.parse(response.json());
    expect(body.items.map((item) => item.slug)).toEqual(['walnut', 'limestone']);
  });
});
