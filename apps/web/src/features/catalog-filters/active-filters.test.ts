import type { CatalogFiltersResponse } from '@nisha/contracts';
import { describe, expect, it } from 'vitest';

import { parseCatalogSearch } from '../../entities/product/lib/catalog-search';
import { NBSP as _ } from '../../shared/lib/typograph';
import { activeFilterChips } from './active-filters';

const facets: CatalogFiltersResponse = {
  categories: [{ slug: 'women', name: 'Женские ароматы', count: 7 }],
  materials: [{ slug: 'basalt', name: 'Базальт', swatchColor: '#292725', count: 4 }],
  collections: [],
  densities: [],
  volumes: [],
  price: null,
};

const chipsFor = (search: string) =>
  activeFilterChips(parseCatalogSearch(new URLSearchParams(search)), facets);

describe('activeFilterChips', () => {
  it('подписывает значения названиями из справочников, объёмы и плотность — по-русски', () => {
    expect(
      chipsFor('category=women&material=basalt&volume=50&density=high').map((c) => c.label),
    ).toEqual(['Женские ароматы', 'Базальт', 'Высокая плотность', `50${_}мл`]);
  });

  it('показывает slug, если справочник ещё не загрузился', () => {
    expect(
      activeFilterChips(parseCatalogSearch(new URLSearchParams('material=walnut')), undefined)[0]
        ?.label,
    ).toBe('walnut');
  });

  it('собирает диапазон цены в один чип', () => {
    expect(chipsFor('priceMin=4000&priceMax=9000').map((c) => c.label)).toEqual([
      `4${_}000${_}₽${_}— 9${_}000${_}₽`,
    ]);
    expect(chipsFor('priceMax=9000')[0]?.label).toBe(`до${_}9${_}000${_}₽`);
  });

  it('крестик убирает только своё значение', () => {
    const [basalt] = chipsFor('material=basalt,walnut&volume=50').filter(
      (c) => c.id === 'material:basalt',
    );
    expect(basalt?.without).toMatchObject({ material: ['walnut'], volume: [50] });
  });

  it('поиск — первым чипом', () => {
    expect(chipsFor('q=ладан&material=basalt')[0]).toMatchObject({
      id: 'q',
      label: 'Поиск: ладан',
    });
  });
});
