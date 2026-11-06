import { homeResponseSchema, storeInfoSchema } from '@nisha/contracts';
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

describe('GET /api/home', () => {
  it('отдаёт четыре бестселлера по популярности и аромат для «Среза»', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/home' });
    const home = homeResponseSchema.parse(response.json());

    expect(home.bestsellers.map((item) => item.slug)).toEqual([
      'basalt',
      'walnut',
      'obsidian',
      'limestone',
    ]);
    expect(home.featured?.slug).toBe('basalt');
    expect(home.featured?.notes.base).toEqual(['ветивер', 'кожа', 'смолы']);
  });
});

describe('GET /api/store', () => {
  it('отдаёт публичные настройки без внутреннего порога остатка', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/store' });
    const body: unknown = response.json();

    expect(storeInfoSchema.parse(body)).toMatchObject({
      freeDeliveryThresholdKopecks: 1_000_000,
      courierDays: '1–5',
    });
    expect(body).not.toHaveProperty('lowStockThreshold');
  });
});
