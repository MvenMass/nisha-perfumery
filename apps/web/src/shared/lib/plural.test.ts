import { describe, expect, it } from 'vitest';

import { plural } from './plural';

const forms = ['товар', 'товара', 'товаров'] as const;

describe('plural', () => {
  it.each([
    [0, 'товаров'],
    [1, 'товар'],
    [2, 'товара'],
    [4, 'товара'],
    [5, 'товаров'],
    [11, 'товаров'],
    [12, 'товаров'],
    [14, 'товаров'],
    [21, 'товар'],
    [22, 'товара'],
    [111, 'товаров'],
    [101, 'товар'],
  ])('%i → %s', (count, expected) => {
    expect(plural(count, forms)).toBe(expected);
  });
});
