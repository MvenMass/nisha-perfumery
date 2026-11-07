import { describe, expect, it } from 'vitest';

import { buildCart, mergedQuantity, normalizeItems } from './cart.calculator';
import type { VariantRow } from './cart.repository';

function variant(overrides: Partial<VariantRow> & { variantId: string }): VariantRow {
  return {
    productId: `product-${overrides.variantId}`,
    productSlug: 'basalt',
    productName: 'Базальт',
    specimenNumber: 3,
    volumeMl: 50,
    concentration: 'парфюмерная вода',
    priceKopecks: 1_000_000,
    stock: 10,
    isActive: true,
    isPublished: true,
    image: null,
    ...overrides,
  };
}

describe('buildCart', () => {
  it('считает сумму и счётчики только по тому, что можно купить (D-028)', () => {
    const cart = buildCart(
      [
        { variantId: 'a', quantity: 2 },
        { variantId: 'b', quantity: 5 },
        { variantId: 'c', quantity: 1 },
        { variantId: 'd', quantity: 1 },
      ],
      [
        variant({ variantId: 'a', priceKopecks: 1_200_000 }),
        variant({ variantId: 'b', priceKopecks: 500_000, stock: 3 }),
        variant({ variantId: 'c', stock: 0 }),
        variant({ variantId: 'd', isActive: false }),
      ],
    );

    expect(cart.lines.map((line) => [line.status, line.lineTotalKopecks])).toEqual([
      ['available', 2_400_000],
      ['insufficient_stock', 1_500_000],
      ['out_of_stock', 0],
      ['unavailable', 0],
    ]);
    expect(cart.lines[1]?.availableQuantity).toBe(3);
    expect(cart.summary).toEqual({
      productsCount: 2,
      bottlesCount: 5,
      itemsTotalKopecks: 3_900_000,
    });
  });

  it('считает черновик снятым с продажи и отбрасывает несуществующие варианты', () => {
    const cart = buildCart(
      [
        { variantId: 'draft', quantity: 1 },
        { variantId: 'gone', quantity: 1 },
      ],
      [variant({ variantId: 'draft', isPublished: false })],
    );
    expect(cart.lines.map((line) => line.status)).toEqual(['unavailable']);
    expect(cart.summary.itemsTotalKopecks).toBe(0);
  });

  it('держит порядок позиций таким, как пришёл', () => {
    const cart = buildCart(
      [
        { variantId: 'b', quantity: 1 },
        { variantId: 'a', quantity: 1 },
      ],
      [variant({ variantId: 'a' }), variant({ variantId: 'b' })],
    );
    expect(cart.lines.map((line) => line.variantId)).toEqual(['b', 'a']);
  });
});

describe('normalizeItems', () => {
  it('складывает дубли и обрезает предел 99', () => {
    expect(
      normalizeItems([
        { variantId: 'a', quantity: 60 },
        { variantId: 'b', quantity: 1 },
        { variantId: 'a', quantity: 60 },
      ]),
    ).toEqual([
      { variantId: 'a', quantity: 99 },
      { variantId: 'b', quantity: 1 },
    ]);
  });
});

describe('mergedQuantity', () => {
  it('суммирует и обрезает остатком', () => {
    expect(mergedQuantity(variant({ variantId: 'a', stock: 10 }), 2, 3)).toBe(5);
    expect(mergedQuantity(variant({ variantId: 'a', stock: 3 }), 2, 3)).toBe(3);
  });

  it('сохраняет закончившуюся позицию с большим из количеств', () => {
    expect(mergedQuantity(variant({ variantId: 'a', stock: 0 }), 0, 2)).toBe(2);
    expect(mergedQuantity(variant({ variantId: 'a', stock: 0 }), 3, 1)).toBe(3);
  });

  it('не переносит снятое с продажи, но не трогает то, что уже было', () => {
    expect(mergedQuantity(variant({ variantId: 'a', isActive: false }), 0, 2)).toBeUndefined();
    expect(mergedQuantity(variant({ variantId: 'a', isPublished: false }), 1, 2)).toBe(1);
  });
});
