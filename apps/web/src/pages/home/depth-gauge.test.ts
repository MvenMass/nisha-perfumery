import { describe, expect, it } from 'vitest';

import { depthAt, SURFACE_LABEL } from './depth-gauge';

const anchors = [
  { y: 1000, depth: 40, label: 'Известняк' },
  { y: 3000, depth: 120, label: 'Базальт' },
  { y: 5000, depth: 180, label: 'Травертин' },
];

describe('depthAt', () => {
  it('в начале страницы — поверхность, 0 м', () => {
    expect(depthAt(0, anchors)).toEqual({ depth: 0, label: SURFACE_LABEL });
  });

  it('до первого слоя глубина растёт от нуля', () => {
    expect(depthAt(500, anchors)).toEqual({ depth: 20, label: SURFACE_LABEL });
  });

  it('между слоями — линейно, подпись — пройденный слой', () => {
    expect(depthAt(2000, anchors)).toEqual({ depth: 80, label: 'Известняк' });
    expect(depthAt(3000, anchors)).toEqual({ depth: 120, label: 'Базальт' });
  });

  it('после последнего слоя глубина не растёт', () => {
    expect(depthAt(9000, anchors)).toEqual({ depth: 180, label: 'Травертин' });
  });

  it('без слоёв — поверхность', () => {
    expect(depthAt(400, [])).toEqual({ depth: 0, label: SURFACE_LABEL });
  });
});
