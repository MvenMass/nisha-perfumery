import {
  catalogFiltersResponseSchema,
  errorResponseSchema,
  productDetailSchema,
  productListResponseSchema,
  relatedProductsResponseSchema,
} from '@nisha/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp } from '../../shared/test-app';
import type { TestApp } from '../../shared/test-app';

let ctx: TestApp;

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(async () => {
  await ctx.close();
});

async function list(query: string) {
  const response = await ctx.app.inject({ method: 'GET', url: `/api/products?${query}` });
  expect(response.statusCode).toBe(200);
  return productListResponseSchema.parse(response.json());
}

const slugs = (result: { items: Array<{ slug: string }> }) => result.items.map((item) => item.slug);

describe('GET /api/products', () => {
  it('показывает только опубликованные товары', async () => {
    const result = await list('limit=48');
    expect(result.total).toBe(15);
    expect(slugs(result)).not.toContain('resin');
  });

  it('по умолчанию сортирует по популярности и считает «от» по минимальному объёму', async () => {
    const result = await list('limit=2');
    expect(result.items[0]).toMatchObject({
      slug: 'basalt',
      priceFromKopecks: 490_000,
      volumesMl: [30, 50, 100],
      inStock: true,
      isBestseller: true,
      keyNotes: ['чёрный перец', 'бергамот', 'ладан'],
      material: { slug: 'basalt', name: 'Базальт' },
      origin: 'вулканическое плато',
      density: 'high',
    });
  });

  it('фильтрует по категории, материалу и плотности', async () => {
    expect((await list('category=women&limit=48')).total).toBe(7);
    expect(slugs(await list('material=basalt&limit=48')).sort()).toEqual(
      ['ash', 'basalt', 'obsidian', 'specimen-set'].sort(),
    );
    expect((await list('density=high&limit=48')).total).toBe(5);
    expect(slugs(await list('category=women&material=walnut'))).toEqual(['workshop', 'cut']);
  });

  it('применяет объём и цену к одному и тому же варианту', async () => {
    // У «Известняка» до 5 000 ₽ только 30 мл, поэтому «50 мл до 5 000 ₽» его не находит.
    expect((await list('volume=50&priceMax=5000')).total).toBe(0);
    expect(slugs(await list('volume=30&priceMax=5000&limit=48'))).toContain('limestone');
    expect((await list('volume=30&priceMax=5000&limit=48')).total).toBe(6);
  });

  it('сортирует по цене и новизне', async () => {
    expect((await list('sort=price_asc&limit=1')).items[0]?.slug).toBe('sample-set');
    expect((await list('sort=price_desc&limit=1')).items[0]?.slug).toBe('specimen-set');
    expect((await list('sort=new&limit=1')).items[0]?.slug).toBe('cut');
  });

  it('пагинирует и сообщает общее число', async () => {
    const page = await list('limit=4&offset=12');
    expect(page).toMatchObject({ total: 15, limit: 4, offset: 12 });
    expect(page.items).toHaveLength(3);
    expect(await list('limit=4&offset=40')).toMatchObject({ total: 15, items: [] });
  });

  it('ищет по нотам, названию, материалу и номеру образца', async () => {
    expect(slugs(await list('q=ладан')).sort()).toEqual(['ash', 'basalt', 'specimen-set'].sort());
    expect(slugs(await list('q=обсид'))).toEqual(['obsidian']);
    expect(slugs(await list('q=03'))).toEqual(['basalt']);
    // % в запросе — обычный символ, а не шаблон «что угодно».
    expect((await list('q=%25%25')).total).toBe(0);
  });

  it('отвечает 400 на неверные параметры', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/products?sort=random' });
    expect(response.statusCode).toBe(400);
    expect(errorResponseSchema.parse(response.json()).error.code).toBe('VALIDATION_FAILED');
  });
});

describe('GET /api/catalog/filters', () => {
  it('возвращает значения фильтров со счётчиками по видимым товарам', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/catalog/filters' });
    const filters = catalogFiltersResponseSchema.parse(response.json());

    expect(filters.categories.find((c) => c.slug === 'women')?.count).toBe(7);
    expect(filters.materials.find((m) => m.slug === 'basalt')).toMatchObject({
      count: 4,
      swatchColor: '#292725',
    });
    expect(filters.densities).toEqual([
      { value: 'light', count: 5 },
      { value: 'medium', count: 5 },
      { value: 'high', count: 5 },
    ]);
    expect(filters.volumes.find((v) => v.volumeMl === 30)?.count).toBe(11);
    expect(filters.price).toEqual({ minKopecks: 190_000, maxKopecks: 1_150_000 });
  });
});

describe('GET /api/products/:slug', () => {
  it('отдаёт карточку с объёмами, нотами по уровням и подсказкой «мало осталось»', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/products/basalt' });
    const product = productDetailSchema.parse(response.json());

    expect(product.notes).toEqual({
      top: ['чёрный перец', 'бергамот'],
      heart: ['ладан', 'ирис'],
      base: ['ветивер', 'кожа', 'смолы'],
    });
    expect(product.variants.map((v) => [v.volumeMl, v.stock, v.isLowStock])).toEqual([
      [30, 10, false],
      [50, 3, true],
      [100, 6, false],
    ]);
    expect(product.collection).toEqual({ slug: 'poroda', name: 'Порода' });
    expect(product.categories).toEqual([{ slug: 'men', name: 'Мужские ароматы' }]);
  });

  it('не показывает черновики и неизвестные товары', async () => {
    for (const slug of ['resin', 'no-such-stone']) {
      const response = await ctx.app.inject({ method: 'GET', url: `/api/products/${slug}` });
      expect(response.statusCode).toBe(404);
      expect(errorResponseSchema.parse(response.json()).error.code).toBe('NOT_FOUND');
    }
  });
});

describe('GET /api/products/:slug/related', () => {
  it('сначала в наличии и того же материала, затем той же плотности', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/products/basalt/related' });
    const related = relatedProductsResponseSchema.parse(response.json());
    expect(slugs(related)).toEqual(['ash', 'specimen-set', 'walnut', 'amber']);
  });
});
