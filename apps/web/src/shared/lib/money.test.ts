import { describe, expect, it } from 'vitest';

import { formatPrice } from './money';
import { NBSP as _ } from './typograph';

describe('formatPrice', () => {
  it('форматирует рубли с разделителем разрядов', () => {
    expect(formatPrice(450_000)).toBe(`4${_}500${_}₽`);
    expect(formatPrice(1_234_567_00)).toBe(`1${_}234${_}567${_}₽`);
  });

  it('показывает копейки, только если они есть', () => {
    expect(formatPrice(450_050)).toBe(`4${_}500,50${_}₽`);
    expect(formatPrice(5)).toBe(`0,05${_}₽`);
    expect(formatPrice(0)).toBe(`0${_}₽`);
  });

  it('отклоняет нецелые и отрицательные суммы', () => {
    expect(() => formatPrice(10.5)).toThrow(RangeError);
    expect(() => formatPrice(-100)).toThrow(RangeError);
  });
});
