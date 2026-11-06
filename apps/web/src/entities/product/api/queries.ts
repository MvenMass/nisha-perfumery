import {
  catalogFiltersResponseSchema,
  homeResponseSchema,
  productDetailSchema,
  productListResponseSchema,
  relatedProductsResponseSchema,
} from '@nisha/contracts';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { apiRequest } from '../../../shared/api/http';
import { toCatalogSearch } from '../lib/catalog-search';
import type { CatalogFilters } from '../lib/catalog-search';

export const CATALOG_PAGE_SIZE = 12;

// Ключи кеша строятся из той же строки, что и URL: одинаковые фильтры — один кеш.
export const productKeys = {
  list: (search: string) => ['products', 'list', search] as const,
  count: (search: string) => ['products', 'count', search] as const,
  detail: (slug: string) => ['products', 'detail', slug] as const,
  related: (slug: string) => ['products', 'related', slug] as const,
  filters: ['catalog', 'filters'] as const,
  home: ['home'] as const,
};

function productsPath(filters: CatalogFilters, limit: number, offset: number): string {
  const params = toCatalogSearch(filters);
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return `/api/products?${params.toString()}`;
}

/** Каталог страницами для «Показать ещё». */
export function useInfiniteProducts(filters: CatalogFilters) {
  const search = toCatalogSearch(filters).toString();
  return useInfiniteQuery({
    queryKey: productKeys.list(search),
    queryFn: ({ pageParam }) =>
      apiRequest(productsPath(filters, CATALOG_PAGE_SIZE, pageParam), productListResponseSchema),
    initialPageParam: 0,
    getNextPageParam: (last) => {
      const next = last.offset + last.items.length;
      return next < last.total ? next : undefined;
    },
    // При смене фильтра старая сетка остаётся на экране, пока грузится новая, — без мигания скелетона.
    placeholderData: keepPreviousData,
  });
}

/** Сколько товаров даст набор фильтров — для «Показать N образцов» в мобильной шторке. */
export function useProductsCount(filters: CatalogFilters, enabled: boolean) {
  const search = toCatalogSearch(filters).toString();
  return useQuery({
    queryKey: productKeys.count(search),
    queryFn: () => apiRequest(productsPath(filters, 1, 0), productListResponseSchema),
    select: (response) => response.total,
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Быстрый поиск в шапке: несколько первых результатов. */
export function useProductSearch(q: string, limit: number) {
  const filters = { q } as const;
  return useQuery({
    queryKey: ['products', 'search', q, limit],
    queryFn: () =>
      apiRequest(
        `/api/products?${new URLSearchParams({ ...filters, limit: String(limit) }).toString()}`,
        productListResponseSchema,
      ),
    enabled: q.length >= 2,
    placeholderData: keepPreviousData,
  });
}

export function useCatalogFilters() {
  return useQuery({
    queryKey: productKeys.filters,
    queryFn: () => apiRequest('/api/catalog/filters', catalogFiltersResponseSchema),
    // Справочники фильтров меняются редко — не перезапрашиваем при каждом заходе в каталог.
    staleTime: 5 * 60_000,
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: productKeys.detail(slug),
    queryFn: () => apiRequest(`/api/products/${encodeURIComponent(slug)}`, productDetailSchema),
  });
}

export function useRelatedProducts(slug: string) {
  return useQuery({
    queryKey: productKeys.related(slug),
    queryFn: () =>
      apiRequest(
        `/api/products/${encodeURIComponent(slug)}/related`,
        relatedProductsResponseSchema,
      ),
    select: (response) => response.items,
  });
}

export function useHome() {
  return useQuery({
    queryKey: productKeys.home,
    queryFn: () => apiRequest('/api/home', homeResponseSchema),
  });
}
