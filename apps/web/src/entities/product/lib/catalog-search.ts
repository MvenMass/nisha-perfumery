import { catalogQueryFieldsSchema } from '@nisha/contracts';
import type { CatalogQuery } from '@nisha/contracts';

/** Фильтры каталога без пагинации: страницы «Показать ещё» в URL не пишутся. */
export type CatalogFilters = Omit<CatalogQuery, 'limit' | 'offset'>;

const fields = catalogQueryFieldsSchema.shape;

const LIST_KEYS = ['category', 'material', 'collection', 'density', 'volume'] as const;
type ListKey = (typeof LIST_KEYS)[number];

// Порядок параметров в URL фиксирован: одинаковые фильтры дают одинаковую ссылку и ключ кеша.
const URL_ORDER = [
  'q',
  'category',
  'material',
  'collection',
  'density',
  'volume',
  'priceMin',
  'priceMax',
  'sort',
] as const;

function parseList<K extends ListKey>(params: URLSearchParams, key: K): CatalogFilters[K] {
  const schema = fields[key];
  const raw = params.getAll(key).flatMap((value) => value.split(','));
  // Каждое значение проверяется отдельно: одно испорченное не сбрасывает остальные.
  const valid = new Set<string | number>();
  for (const value of raw) {
    const parsed = schema.safeParse([value]);
    if (parsed.success) for (const item of parsed.data) valid.add(item);
  }
  return [...valid] as CatalogFilters[K];
}

function parseScalar<K extends 'priceMin' | 'priceMax' | 'q' | 'sort'>(
  params: URLSearchParams,
  key: K,
): CatalogFilters[K] {
  const schema = fields[key];
  const parsed = schema.safeParse(params.get(key) ?? undefined);
  return (parsed.success ? parsed.data : schema.parse(undefined)) as CatalogFilters[K];
}

/** URL → фильтры. Неверные параметры отбрасываются по одному, ручная правка адреса не ломает страницу. */
export function parseCatalogSearch(params: URLSearchParams): CatalogFilters {
  const filters: CatalogFilters = {
    category: parseList(params, 'category'),
    material: parseList(params, 'material'),
    collection: parseList(params, 'collection'),
    density: parseList(params, 'density'),
    volume: parseList(params, 'volume'),
    priceMin: parseScalar(params, 'priceMin'),
    priceMax: parseScalar(params, 'priceMax'),
    q: parseScalar(params, 'q'),
    sort: parseScalar(params, 'sort'),
  };
  // Перевёрнутый диапазон («от 9 000 до 4 000») — скорее опечатка: оставляем нижнюю границу.
  if (
    filters.priceMin !== undefined &&
    filters.priceMax !== undefined &&
    filters.priceMin > filters.priceMax
  ) {
    filters.priceMax = undefined;
  }
  return filters;
}

/** Фильтры → URL без значений по умолчанию. */
export function toCatalogSearch(filters: CatalogFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of URL_ORDER) {
    const value = filters[key];
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(','));
    } else if (!(key === 'sort' && value === 'popular')) {
      params.set(key, String(value));
    }
  }
  return params;
}

export const emptyCatalogFilters: CatalogFilters = parseCatalogSearch(new URLSearchParams());

/** Сколько фильтров выбрано — для кнопки «Фильтры · N». Сортировка и поиск фильтрами не считаются. */
export function countActiveFilters(filters: CatalogFilters): number {
  const lists = LIST_KEYS.reduce((sum, key) => sum + filters[key].length, 0);
  const price = filters.priceMin !== undefined || filters.priceMax !== undefined ? 1 : 0;
  return lists + price;
}
