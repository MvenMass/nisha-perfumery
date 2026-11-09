import { describe, expect, it } from 'vitest';

import { parseDepth } from './depth';

describe('parseDepth', () => {
  it('сохраняет знак, нули и единицы при промежуточных значениях', () => {
    const depth = parseDepth('−040 м');
    expect(depth?.value).toBe(40);
    expect(depth?.format(0)).toBe('−000 м');
    expect(depth?.format(13.4)).toBe('−013 м');
    expect(depth?.format(40)).toBe('−040 м');
  });

  it('без числа — нечего анимировать', () => {
    expect(parseDepth('поверхность')).toBeUndefined();
  });
});
