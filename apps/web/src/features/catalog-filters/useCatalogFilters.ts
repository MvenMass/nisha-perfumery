import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

import {
  emptyCatalogFilters,
  parseCatalogSearch,
  toCatalogSearch,
} from '../../entities/product/lib/catalog-search';
import type { CatalogFilters } from '../../entities/product/lib/catalog-search';

/**
 * Фильтры каталога живут в URL (D-011): ссылкой можно поделиться, «назад» возвращает прошлые фильтры,
 * перезагрузка их не теряет. Каждое изменение — новая запись в истории.
 */
export function useCatalogFilterState() {
  const [params, setParams] = useSearchParams();
  const search = params.toString();
  const filters = useMemo(() => parseCatalogSearch(new URLSearchParams(search)), [search]);

  const setFilters = useCallback(
    (next: CatalogFilters) => {
      setParams(toCatalogSearch(next), { preventScrollReset: true });
    },
    [setParams],
  );

  const reset = useCallback(() => {
    // Сортировка — не фильтр: «Сбросить всё» её сохраняет.
    setFilters({ ...emptyCatalogFilters, sort: filters.sort });
  }, [filters.sort, setFilters]);

  return { filters, setFilters, reset };
}
