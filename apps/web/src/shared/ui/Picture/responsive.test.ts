import { describe, expect, it } from 'vitest';

import { responsiveSources } from './responsive';

describe('responsiveSources', () => {
  it('собирает srcset WebP и JPEG для снимка из админки', () => {
    expect(responsiveSources('/uploads/products/p1/i1-960.jpg')).toEqual({
      webp: '/uploads/products/p1/i1-480.webp 480w, /uploads/products/p1/i1-960.webp 960w, /uploads/products/p1/i1-1600.webp 1600w',
      jpeg: '/uploads/products/p1/i1-480.jpg 480w, /uploads/products/p1/i1-960.jpg 960w, /uploads/products/p1/i1-1600.jpg 1600w',
    });
  });

  it('так же нарезанную статику витрины', () => {
    expect(responsiveSources('/images/boutique-960.jpg')?.webp).toBe(
      '/images/boutique-480.webp 480w, /images/boutique-960.webp 960w, /images/boutique-1600.webp 1600w',
    );
  });

  it('прочие адреса оставляет без srcset', () => {
    expect(responsiveSources('https://cdn.test/photo.jpg')).toBeUndefined();
    expect(responsiveSources('/uploads/products/p1/i1-480.jpg')).toBeUndefined();
  });
});
