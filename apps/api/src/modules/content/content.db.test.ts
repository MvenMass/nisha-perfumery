import {
  adminArticleSchema,
  adminConsultationsResponseSchema,
  adminHeroSlidesResponseSchema,
  articleSchema,
  articlesResponseSchema,
  homeResponseSchema,
  storeInfoSchema,
} from '@nisha/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

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

function call(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  options: { cookies?: Record<string, string>; payload?: object; remoteAddress?: string } = {},
) {
  return ctx.app.inject({
    method,
    url,
    cookies: options.cookies ?? CSRF.cookies,
    headers: CSRF.headers,
    remoteAddress: options.remoteAddress ?? `10.12.${Math.floor((ip += 1) / 250)}.${ip % 250}`,
    ...(options.payload ? { payload: options.payload } : {}),
  });
}

const article = (overrides: object = {}) => ({
  slug: 'new-article',
  tag: 'Мастерская',
  title: 'Новая статья',
  lead: 'Лид статьи',
  body: 'Первый абзац.\n\nВторой абзац.',
  coverUrl: null,
  coverAlt: '',
  isPublished: false,
  ...overrides,
});

describe('главная и журнал', () => {
  it('главная отдаёт слайды и три последние статьи из БД', async () => {
    const home = homeResponseSchema.parse((await call('GET', '/api/home')).json());
    expect(home.slides).toHaveLength(3);
    expect(home.slides[0]?.ctaHref).toBe('/catalog');
    expect(home.articles.map((item) => item.slug)).toEqual([
      'concrete-courtyard',
      'amber-glass',
      'perfumer-interview',
    ]);
  });

  it('черновик статьи не виден, опубликованная — с абзацами и датой', async () => {
    const draft = await call('POST', '/api/admin/articles', { cookies: admin, payload: article() });
    expect(draft.statusCode, draft.body).toBe(201);
    expect(adminArticleSchema.parse(draft.json()).publishedAt).toBeNull();
    expect((await call('GET', '/api/articles/new-article')).statusCode).toBe(404);
    const list = articlesResponseSchema.parse((await call('GET', '/api/articles')).json());
    expect(list.items.map((item) => item.slug)).not.toContain('new-article');

    const { id } = adminArticleSchema.parse(draft.json());
    const published = adminArticleSchema.parse(
      (
        await call('PUT', `/api/admin/articles/${id}`, {
          cookies: admin,
          payload: article({ isPublished: true }),
        })
      ).json(),
    );
    expect(published.publishedAt).not.toBeNull();

    const page = articleSchema.parse((await call('GET', '/api/articles/new-article')).json());
    expect(page.paragraphs).toEqual(['Первый абзац.', 'Второй абзац.']);
  });

  it('адрес статьи уникален', async () => {
    const response = await call('POST', '/api/admin/articles', {
      cookies: admin,
      payload: article({ slug: 'amber-glass' }),
    });
    expect(response.statusCode).toBe(409);
  });
});

describe('слайды', () => {
  it('кнопка слайда ведёт только внутрь сайта; порядок и скрытие работают', async () => {
    const external = await call('POST', '/api/admin/slides', {
      cookies: admin,
      payload: {
        label: 'Глубина 0 м',
        title: 'Ловушка',
        text: 'Текст',
        ctaLabel: 'Уйти',
        ctaHref: 'https://evil.test',
        imageUrl: null,
        imageAlt: 'Снимок',
        isPublished: true,
      },
    });
    expect(external.statusCode).toBe(400);

    const slides = adminHeroSlidesResponseSchema.parse(
      (await call('GET', '/api/admin/slides', { cookies: admin })).json(),
    ).items;
    const reversed = [...slides].reverse().map((slide) => slide.id);
    const reordered = adminHeroSlidesResponseSchema.parse(
      (
        await call('PATCH', '/api/admin/slides/order', {
          cookies: admin,
          payload: { ids: reversed },
        })
      ).json(),
    ).items;
    expect(reordered.map((slide) => slide.id)).toEqual(reversed);

    const [first] = reordered;
    if (!first) throw new Error('Нет слайдов');
    const { id: _id, position: _position, ...input } = first;
    await call('PUT', `/api/admin/slides/${first.id}`, {
      cookies: admin,
      payload: { ...input, isPublished: false },
    });
    const home = homeResponseSchema.parse((await call('GET', '/api/home')).json());
    expect(home.slides.map((slide) => slide.id)).not.toContain(first.id);
    expect(home.slides).toHaveLength(2);
  });
});

describe('консультации', () => {
  it('принимает заявку, проверяет поля и держит лимит частоты', async () => {
    const address = '10.13.0.1';
    const ok = await call('POST', '/api/consultations', {
      remoteAddress: address,
      payload: {
        name: 'Вера',
        phone: '+7 900 111-22-33',
        email: '',
        preferredTime: 'суббота днём',
      },
    });
    expect(ok.statusCode, ok.body).toBe(204);

    const bad = await call('POST', '/api/consultations', {
      remoteAddress: address,
      payload: { name: '', phone: '12' },
    });
    expect(bad.statusCode).toBe(400);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await call('POST', '/api/consultations', {
        remoteAddress: address,
        payload: { name: 'Вера', phone: '+7 900 111-22-33' },
      });
    }
    const limited = await call('POST', '/api/consultations', {
      remoteAddress: address,
      payload: { name: 'Вера', phone: '+7 900 111-22-33' },
    });
    expect(limited.statusCode).toBe(429);

    const requests = adminConsultationsResponseSchema.parse(
      (await call('GET', '/api/admin/consultations?status=new', { cookies: admin })).json(),
    ).items;
    const vera = requests.find((item) => item.preferredTime === 'суббота днём');
    expect(vera).toMatchObject({ name: 'Вера', email: null, status: 'new' });

    await call('PATCH', `/api/admin/consultations/${vera?.id}`, {
      cookies: admin,
      payload: { status: 'contacted' },
    });
    const fresh = adminConsultationsResponseSchema.parse(
      (await call('GET', '/api/admin/consultations?status=new', { cookies: admin })).json(),
    ).items;
    expect(fresh.map((item) => item.id)).not.toContain(vera?.id);
  });
});

describe('настройки магазина', () => {
  it('меняют доставку на витрине', async () => {
    const response = await call('PUT', '/api/admin/settings', {
      cookies: admin,
      payload: {
        freeDeliveryThresholdKopecks: 2_000_000,
        courierPriceKopecks: 59_000,
        pickupPointPriceKopecks: 39_000,
        courierDays: '2–4',
        pickupPointDays: '3–7',
        lowStockThreshold: 2,
        boutiqueAddress: 'Москва, Хитровский пер., 3',
        boutiqueHours: 'ежедневно 12:00–21:00',
      },
    });
    expect(response.statusCode, response.body).toBe(200);
    const store = storeInfoSchema.parse((await call('GET', '/api/store')).json());
    expect(store).toMatchObject({ courierPriceKopecks: 59_000, courierDays: '2–4' });
  });
});
