import { describe, expect, it } from 'vitest';

import { emptyDraft, rublesToKopecks, validateProduct } from './product-form';
import type { ProductDraft } from './product-form';

const MATERIAL = '0190a6f0-0000-7000-8000-000000000001';

const filled = (overrides: Partial<ProductDraft> = {}): ProductDraft => ({
  ...emptyDraft(MATERIAL),
  slug: 'slate',
  specimenNumber: '17',
  name: 'Сланец',
  origin: 'горный карьер',
  description: 'Холодный серый камень.',
  notes: { top: 'бергамот', heart: 'Ирис, мокрый камень', base: 'ветивер' },
  variants: [{ volumeMl: '50', sku: 'sl-50', priceRubles: '6 500', stock: '4', isActive: true }],
  ...overrides,
});

describe('rublesToKopecks', () => {
  it('переводит рубли в копейки без float', () => {
    expect(rublesToKopecks('4500')).toBe(450_000);
    expect(rublesToKopecks('4\u00A0500')).toBe(450_000);
    expect(rublesToKopecks('4500,5')).toBe(450_050);
    expect(rublesToKopecks('0.29')).toBe(29);
    expect(rublesToKopecks('4500,555')).toBeNaN();
    expect(rublesToKopecks('')).toBeNaN();
  });
});

describe('validateProduct', () => {
  it('собирает тело запроса: числа, копейки, ноты в нижнем регистре, SKU заглавными', () => {
    const result = validateProduct(filled());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input).toMatchObject({
      specimenNumber: 17,
      collectionId: null,
      longevityHours: null,
      story: null,
      notes: { top: ['бергамот'], heart: ['ирис', 'мокрый камень'], base: ['ветивер'] },
      variants: [{ volumeMl: 50, sku: 'SL-50', priceKopecks: 650_000, stock: 4 }],
    });
  });

  it('подписывает ошибки по полям, включая строки объёмов', () => {
    const result = validateProduct(
      filled({
        specimenNumber: 'семнадцать',
        notes: { top: '', heart: 'ирис', base: 'ветивер' },
        variants: [
          { volumeMl: '50', sku: 'sl-50', priceRubles: 'дорого', stock: '4', isActive: true },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors)).toEqual(
      expect.arrayContaining(['specimenNumber', 'notes.top', 'variants.0.priceKopecks']),
    );
    expect(result.errors.specimenNumber).toBe('Введите целое число');
  });

  it('не публикует образец без включённого объёма и следит за порядком слоёв', () => {
    const noVolume = validateProduct(
      filled({
        isPublished: true,
        variants: [
          { volumeMl: '50', sku: 'sl-50', priceRubles: '6500', stock: '4', isActive: false },
        ],
      }),
    );
    expect(noVolume.ok ? {} : noVolume.errors).toHaveProperty('isPublished');

    const layers = validateProduct(filled({ topMinutes: '500' }));
    expect(layers.ok ? {} : layers.errors).toHaveProperty('baseMinutes');
  });
});
