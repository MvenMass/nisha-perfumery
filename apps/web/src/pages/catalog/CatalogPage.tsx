import { catalogSortSchema } from '@nisha/contracts';
import type { CatalogSort } from '@nisha/contracts';

import { useCatalogFilters, useInfiniteProducts } from '../../entities/product/api/queries';
import { specimensCount } from '../../entities/product/lib/format';
import { activeFilterChips } from '../../features/catalog-filters/active-filters';
import { FiltersForm } from '../../features/catalog-filters/FiltersForm';
import { MobileFilters } from '../../features/catalog-filters/MobileFilters';
import { useCatalogFilterState } from '../../features/catalog-filters/useCatalogFilters';
import { useMeta } from '../../shared/lib/useMeta';
import { Breadcrumbs } from '../../shared/ui/Breadcrumbs/Breadcrumbs';
import { Button } from '../../shared/ui/Button/Button';
import { RemovableChip } from '../../shared/ui/Chip/Chip';
import { Container } from '../../shared/ui/Container/Container';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { Select } from '../../shared/ui/Field/Select';
import { Skeleton, SkeletonText } from '../../shared/ui/Skeleton/Skeleton';
import { ShopProductCard } from '../../widgets/product-card/ShopProductCard';
import styles from './CatalogPage.module.css';

const SORT_OPTIONS: Array<{ value: CatalogSort; label: string }> = [
  { value: 'popular', label: 'Популярные' },
  { value: 'price_asc', label: 'Сначала дешевле' },
  { value: 'price_desc', label: 'Сначала дороже' },
  { value: 'new', label: 'Новинки' },
];

function GridSkeleton() {
  return (
    <div className={styles.grid} role="status" aria-busy="true" aria-label="Загружаем образцы">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className={styles.skeletonCard}>
          <Skeleton height={300} />
          <Skeleton width="40%" height={12} />
          <Skeleton width="60%" height={28} />
          <SkeletonText lines={2} />
        </div>
      ))}
    </div>
  );
}

export function CatalogPage() {
  useMeta(
    'Каталог образцов',
    'Ароматы «Ниши» по материалам: известняк, травертин, базальт, орех и янтарь. Фильтры по объёму, цене и плотности.',
  );
  const { filters, setFilters, reset } = useCatalogFilterState();
  const facets = useCatalogFilters();
  const products = useInfiniteProducts(filters);

  const items = products.data?.pages.flatMap((page) => page.items) ?? [];
  const total = products.data?.pages[0]?.total;
  const chips = activeFilterChips(filters, facets.data);
  const shownPercent = total ? Math.round((items.length / total) * 100) : 0;

  let body;
  if (products.isPending) {
    body = <GridSkeleton />;
  } else if (products.isError) {
    body = (
      <EmptyState
        icon="alert"
        title="Не удалось загрузить каталог"
        description="Проверьте соединение и попробуйте ещё раз."
        action={
          <Button variant="outline" size="md" onClick={() => void products.refetch()}>
            Повторить
          </Button>
        }
      />
    );
  } else if (items.length === 0) {
    body = (
      <EmptyState
        title="Такой породы у&nbsp;нас пока нет"
        description="Попробуйте убрать часть фильтров."
        action={
          <Button variant="outline" size="md" onClick={reset}>
            Сбросить фильтры
          </Button>
        }
      />
    );
  } else {
    body = (
      <>
        <ul className={styles.grid} aria-busy={products.isFetching && !products.isFetchingNextPage}>
          {items.map((item) => (
            <li key={item.id}>
              <ShopProductCard item={item} headingLevel="h2" />
            </li>
          ))}
        </ul>
        {total !== undefined && (
          <div className={styles.more}>
            <p className={styles.shown}>
              Показано {items.length}&nbsp;из&nbsp;{total}
            </p>
            <div aria-hidden="true" className={styles.progress}>
              <div className={styles.progressFill} style={{ width: `${shownPercent}%` }} />
            </div>
            {products.hasNextPage && (
              <Button
                variant="outline"
                disabled={products.isFetchingNextPage}
                onClick={() => void products.fetchNextPage()}
              >
                {products.isFetchingNextPage ? 'Загружаем…' : 'Показать ещё'}
              </Button>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <section className={styles.hero}>
        <Container className={styles.heroInner}>
          <Breadcrumbs items={[{ label: 'Главная', to: '/' }, { label: 'Каталог' }]} />
          <div className={styles.heroRow}>
            <h1 className={styles.title}>Каталог образцов</h1>
            <p className={styles.found} aria-live="polite">
              {total === undefined ? '\u00A0' : `Найдено: ${specimensCount(total)}`}
            </p>
          </div>
          <div aria-hidden="true" className={styles.strata}>
            <span style={{ height: 1, background: 'var(--color-line-strong)' }} />
            <span style={{ height: 4, background: 'var(--color-walnut)' }} />
            <span style={{ height: 2, background: 'var(--color-stone)' }} />
          </div>
        </Container>
      </section>

      <Container className={styles.layout}>
        {facets.data && (
          <aside aria-label="Фильтры" className={styles.aside}>
            <FiltersForm
              value={filters}
              onChange={setFilters}
              facets={facets.data}
              layout="panel"
            />
          </aside>
        )}

        <div className={styles.content}>
          <div className={styles.toolbar}>
            {chips.length > 0 && (
              <div className={styles.chips}>
                {chips.map((chip) => (
                  <RemovableChip
                    key={chip.id}
                    label={chip.label}
                    onClick={() => setFilters(chip.without)}
                  />
                ))}
                <button type="button" className={styles.resetAll} onClick={reset}>
                  Сбросить всё
                </button>
              </div>
            )}
            <div className={styles.controls}>
              {facets.data && (
                <MobileFilters
                  filters={filters}
                  facets={facets.data}
                  onApply={setFilters}
                  className={styles.mobileOnly}
                />
              )}
              <div className={styles.sortWide}>
                <Select
                  label="Сортировка"
                  compact
                  value={filters.sort}
                  onChange={(event) => {
                    const sort = catalogSortSchema.safeParse(event.target.value);
                    if (sort.success) setFilters({ ...filters, sort: sort.data });
                  }}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
          {body}
        </div>
      </Container>
    </>
  );
}
