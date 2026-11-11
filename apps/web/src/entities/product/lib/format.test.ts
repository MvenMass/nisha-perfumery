import { describe, expect, it } from 'vitest';

import { productTypeLine } from './format';

const NBSP = '\u00A0';

describe('productTypeLine', () => {
  it('тип и объёмы по возрастанию', () => {
    expect(productTypeLine('парфюмерная вода', [100, 30, 50])).toBe(
      `Парфюмерная вода · 30 / 50 / 100${NBSP}мл`,
    );
    expect(productTypeLine('аромат для дома', [100, 250])).toBe(
      `Аромат для дома · 100 / 250${NBSP}мл`,
    );
  });

  it('у набора объём берётся из концентрации', () => {
    expect(productTypeLine('набор: 5 × 10 мл', [50])).toBe('Набор · 5 × 10 мл');
  });

  it('без объёмов — только тип', () => {
    expect(productTypeLine('диффузор', [])).toBe('Диффузор');
  });
});
