import { describe, expect, it } from 'vitest';

import { countActiveFilters, parseCatalogSearch, toCatalogSearch } from './catalog-search';

const parse = (search: string) => parseCatalogSearch(new URLSearchParams(search));

describe('parseCatalogSearch', () => {
  it('возвращает значения по умолчанию для пустого адреса', () => {
    expect(parse('')).toEqual({
      category: [],
      material: [],
      collection: [],
      density: [],
      volume: [],
      priceMin: undefined,
      priceMax: undefined,
      q: undefined,
      sort: 'popular',
    });
  });

  it('понимает списки через запятую и повтором параметра', () => {
    expect(parse('material=basalt,walnut&category=women&category=men&volume=50')).toMatchObject({
      material: ['basalt', 'walnut'],
      category: ['women', 'men'],
      volume: [50],
    });
  });

  it('отбрасывает только испорченные значения, а не весь фильтр', () => {
    expect(
      parse('material=basalt,Bad!&volume=50,abc&density=high,heavy&sort=random'),
    ).toMatchObject({ material: ['basalt'], volume: [50], density: ['high'], sort: 'popular' });
  });

  it('убирает дубли и пустые значения', () => {
    expect(parse('material=basalt,,basalt').material).toEqual(['basalt']);
    expect(parse('q=&priceMin=').q).toBeUndefined();
  });

  it('при перевёрнутом диапазоне цены оставляет нижнюю границу', () => {
    expect(parse('priceMin=9000&priceMax=4000')).toMatchObject({
      priceMin: 9000,
      priceMax: undefined,
    });
  });
});

describe('toCatalogSearch', () => {
  it('не пишет значения по умолчанию и держит стабильный порядок', () => {
    const filters = parse('sort=price_asc&material=walnut,basalt&q=ладан&priceMax=9000');
    expect(toCatalogSearch(filters).toString()).toBe(
      new URLSearchParams({
        q: 'ладан',
        material: 'walnut,basalt',
        priceMax: '9000',
        sort: 'price_asc',
      }).toString(),
    );
    expect(toCatalogSearch(parse('sort=popular')).toString()).toBe('');
  });

  it('разбор и сборка взаимно обратны', () => {
    const search =
      'category=women&material=basalt&density=high&volume=30,50&priceMin=4000&sort=new';
    expect(toCatalogSearch(parse(search)).toString()).toBe(new URLSearchParams(search).toString());
  });
});

describe('countActiveFilters', () => {
  it('считает значения списков и диапазон цены как один фильтр, без сортировки и поиска', () => {
    expect(
      countActiveFilters(
        parse('material=basalt,walnut&volume=50&priceMin=1&priceMax=2&sort=new&q=ладан'),
      ),
    ).toBe(4);
  });
});
