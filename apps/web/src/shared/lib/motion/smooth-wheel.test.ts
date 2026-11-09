import { describe, expect, it } from 'vitest';

import { approach, wheelPixels } from './smooth-wheel';

describe('wheelPixels', () => {
  it('пиксели, строки и страницы приводит к пикселям', () => {
    expect(wheelPixels({ deltaY: 100, deltaMode: 0 }, 900)).toBe(100);
    expect(wheelPixels({ deltaY: 3, deltaMode: 1 }, 900)).toBe(48);
    expect(wheelPixels({ deltaY: -1, deltaMode: 2 }, 900)).toBe(-900);
  });
});

describe('approach', () => {
  it('приближается к цели, не перескакивая её', () => {
    const next = approach(0, 1000, 16);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(1000);
    expect(approach(1000, 0, 16)).toBeLessThan(1000);
  });

  it('не зависит от частоты кадров', () => {
    let at60 = 0;
    for (let frame = 0; frame < 30; frame++) at60 = approach(at60, 1000, 1000 / 60);
    let at120 = 0;
    for (let frame = 0; frame < 60; frame++) at120 = approach(at120, 1000, 1000 / 120);
    expect(Math.abs(at60 - at120)).toBeLessThan(1);
  });

  it('у самой цели встаёт ровно на неё — ticker можно отпускать', () => {
    expect(approach(999.8, 1000, 16)).toBe(1000);
  });
});
