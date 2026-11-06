import type { CatalogFiltersResponse, CatalogSort } from '@nisha/contracts';
import { useState } from 'react';

import { useProductsCount } from '../../entities/product/api/queries';
import { countActiveFilters, emptyCatalogFilters } from '../../entities/product/lib/catalog-search';
import type { CatalogFilters } from '../../entities/product/lib/catalog-search';
import { specimensCount } from '../../entities/product/lib/format';
import { Button } from '../../shared/ui/Button/Button';
import { Chip } from '../../shared/ui/Chip/Chip';
import { Sheet } from '../../shared/ui/Sheet/Sheet';
import { FiltersForm, filterFormStyles } from './FiltersForm';

const SORTS: Array<{ value: CatalogSort; label: string }> = [
  { value: 'popular', label: 'Популярные' },
  { value: 'price_asc', label: 'Дешевле' },
  { value: 'price_desc', label: 'Дороже' },
  { value: 'new', label: 'Новинки' },
];

type MobileFiltersProps = {
  filters: CatalogFilters;
  facets: CatalogFiltersResponse;
  onApply: (next: CatalogFilters) => void;
  className?: string | undefined;
};

/**
 * Шторка фильтров по catalog-filters-mobile.html. Выбор копится в черновике и применяется
 * кнопкой «Показать N образцов»: на телефоне перезагрузка сетки на каждое нажатие мешала бы.
 */
export function MobileFilters({ filters, facets, onApply, className }: MobileFiltersProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const count = useProductsCount(draft, open);
  const active = countActiveFilters(filters);

  const openSheet = () => {
    setDraft(filters);
    setOpen(true);
  };

  return (
    <>
      <Button
        variant="outline"
        size="md"
        className={className}
        aria-haspopup="dialog"
        onClick={openSheet}
      >
        {active > 0 ? `Фильтры · ${active}` : 'Фильтры'}
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Фильтры"
        closeLabel="Закрыть фильтры"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setDraft({ ...emptyCatalogFilters, sort: draft.sort, q: draft.q })}
            >
              Сбросить
            </Button>
            <Button
              fullWidth
              onClick={() => {
                onApply(draft);
                setOpen(false);
              }}
            >
              {count.data === undefined
                ? 'Показать'
                : count.data === 0
                  ? 'Ничего не найдено'
                  : `Показать ${specimensCount(count.data)}`}
            </Button>
          </>
        }
      >
        <fieldset className={filterFormStyles.group}>
          <legend className={filterFormStyles.legend}>Сортировка</legend>
          <div className={filterFormStyles.wrap}>
            {SORTS.map((sort) => (
              <Chip
                key={sort.value}
                pressed={draft.sort === sort.value}
                onClick={() => setDraft({ ...draft, sort: sort.value })}
              >
                {sort.label}
              </Chip>
            ))}
          </div>
        </fieldset>
        <FiltersForm value={draft} onChange={setDraft} facets={facets} layout="sheet" />
      </Sheet>
    </>
  );
}
