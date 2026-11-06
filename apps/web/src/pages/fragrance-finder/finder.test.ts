import { describe, expect, it } from 'vitest';

import { toCatalogSearch } from '../../entities/product/lib/catalog-search';
import { answersToFilters } from './finder';

describe('answersToFilters', () => {
  it('переводит ответы в фильтры каталога', () => {
    const filters = answersToFilters({ mood: 'rain', density: 'light', for: 'women' });
    expect(toCatalogSearch(filters).toString()).toBe(
      new URLSearchParams({
        category: 'women',
        material: 'limestone,travertine',
        density: 'light',
      }).toString(),
    );
  });

  it('«не знаю» и пропущенные вопросы не сужают выбор', () => {
    expect(toCatalogSearch(answersToFilters({ mood: 'smoke', density: 'any' })).toString()).toBe(
      'material=basalt',
    );
    expect(toCatalogSearch(answersToFilters({})).toString()).toBe('');
  });
});
