import { existsSync } from 'node:fs';
import path from 'node:path';

import { adminImageSchema } from '@nisha/contracts';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { products } from '../../database/schema';
import { createTestApp, CSRF, signInAdmin } from '../../shared/test-app';
import type { TestApp } from '../../shared/test-app';

let ctx: TestApp;
let admin: Record<string, string>;
let productId: string;

const imagesSchema = z.object({ images: z.array(adminImageSchema) });

beforeAll(async () => {
  ctx = await createTestApp();
  admin = await signInAdmin(ctx.app);
  const [row] = await ctx.testDb.db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, 'chalk'));
  if (!row) throw new Error('Нет товара chalk');
  productId = row.id;
});

afterAll(async () => {
  await ctx.close();
});

const photo = (width = 2000, height = 2500) =>
  sharp({ create: { width, height, channels: 3, background: '#4A3F36' } })
    .png()
    .toBuffer();

/** multipart/form-data руками: в тестах нет браузера, который соберёт форму сам. */
function upload(file: Buffer, alt: string | null, filename = 'photo.png') {
  const boundary = '----nisha-test-boundary';
  const parts: Buffer[] = [];
  if (alt !== null) {
    parts.push(
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="alt"\r\n\r\n${alt}\r\n`),
    );
  }
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`,
    ),
    file,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  );
  return ctx.app.inject({
    method: 'POST',
    url: `/api/admin/products/${productId}/images`,
    cookies: admin,
    headers: { ...CSRF.headers, 'content-type': `multipart/form-data; boundary=${boundary}` },
    payload: Buffer.concat(parts),
  });
}

const fileOf = (url: string) => path.join(ctx.uploadsDir, url.replace('/uploads/', ''));

describe('снимки товара', () => {
  it('нарезает снимок в три размера (JPEG и WebP) и раздаёт по /uploads', async () => {
    const response = await upload(await photo(), 'Флакон «Мела» на известняковой плите');
    expect(response.statusCode, response.body).toBe(200);
    const [image] = imagesSchema.parse(response.json()).images;
    expect(image).toMatchObject({ position: 0, alt: 'Флакон «Мела» на известняковой плите' });
    expect(image?.url).toMatch(/^\/uploads\/products\/.+-960\.jpg$/);

    const base = (image?.url ?? '').replace('-960.jpg', '');
    for (const suffix of ['480.jpg', '480.webp', '960.webp', '1600.jpg', '1600.webp']) {
      expect(existsSync(fileOf(`${base}-${suffix}`)), suffix).toBe(true);
    }
    expect((await sharp(fileOf(image?.url ?? '')).metadata()).width).toBe(960);

    const served = await ctx.app.inject({ method: 'GET', url: image?.url ?? '' });
    expect(served.statusCode).toBe(200);
    expect(served.headers['content-type']).toBe('image/jpeg');
  });

  it('не принимает не-картинку, даже с расширением .png', async () => {
    const response = await upload(Buffer.from('<?php echo 1; ?>'), 'Попытка', 'evil.png');
    expect(response.statusCode).toBe(400);
  });

  it('не принимает файл больше 10 МБ и снимок без подписи', async () => {
    const huge = await upload(Buffer.alloc(11 * 1024 * 1024, 1), 'Большой');
    expect(huge.statusCode).toBe(400);
    const noAlt = await upload(await photo(400, 500), null);
    expect(noAlt.statusCode).toBe(400);
  });

  it('меняет порядок и подписи, удаляет снимок вместе с файлами', async () => {
    await upload(await photo(400, 500), 'Второй снимок');
    const list = imagesSchema.parse(
      (
        await ctx.app.inject({
          method: 'GET',
          url: `/api/admin/products/${productId}`,
          cookies: admin,
        })
      ).json(),
    ).images;
    expect(list).toHaveLength(2);
    const [first, second] = list;

    const reordered = imagesSchema.parse(
      (
        await ctx.app.inject({
          method: 'PATCH',
          url: `/api/admin/products/${productId}/images`,
          cookies: admin,
          headers: CSRF.headers,
          payload: {
            images: [
              { id: second?.id, alt: 'Второй, теперь первый' },
              { id: first?.id, alt: first?.alt },
            ],
          },
        })
      ).json(),
    ).images;
    expect(reordered.map((image) => [image.id, image.position])).toEqual([
      [second?.id, 0],
      [first?.id, 1],
    ]);

    const remaining = imagesSchema.parse(
      (
        await ctx.app.inject({
          method: 'DELETE',
          url: `/api/admin/products/${productId}/images/${second?.id}`,
          cookies: admin,
          headers: CSRF.headers,
        })
      ).json(),
    ).images;
    expect(remaining.map((image) => [image.id, image.position])).toEqual([[first?.id, 0]]);
    expect(existsSync(fileOf(second?.url ?? ''))).toBe(false);
  });
});
