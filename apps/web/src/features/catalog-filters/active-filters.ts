import type { CatalogFiltersResponse } from '@nisha/contracts';

import type { CatalogFilters } from '../../entities/product/lib/catalog-search';
import { DENSITY_LABELS, formatVolume } from '../../entities/product/lib/format';
import { formatPrice } from '../../shared/lib/money';
import { NBSP } from '../../shared/lib/typograph';

export type ActiveFilterChip = {
  id: string;
  label: string;
  /** Фильтры без этого значения — то, что станет после нажатия на крестик. */
  without: CatalogFilters;
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const rubles = (value: number) => formatPrice(value * 100);

/** Чипы над сеткой каталога: каждое выбранное значение — отдельный чип со сбросом. */
export function activeFilterChips(
  filters: CatalogFilters,
  facets: CatalogFiltersResponse | undefined,
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  const nameOf = (list: Array<{ slug: string; name: string }> | undefined, slug: string) =>
    list?.find((item) => item.slug === slug)?.name ?? slug;

  if (filters.q !== undefined) {
    chips.push({ id: 'q', label: `Поиск: ${filters.q}`, without: { ...filters, q: undefined } });
  }

  const lists = [
    ['category', (slug: string) => nameOf(facets?.categories, slug)],
    ['material', (slug: string) => nameOf(facets?.materials, slug)],
    ['collection', (slug: string) => nameOf(facets?.collections, slug)],
  ] as const;
  for (const [key, label] of lists) {
    for (const slug of filters[key]) {
      chips.push({
        id: `${key}:${slug}`,
        label: label(slug),
        without: { ...filters, [key]: filters[key].filter((item) => item !== slug) },
      });
    }
  }

  for (const density of filters.density) {
    chips.push({
      id: `density:${density}`,
      label: `${capitalize(DENSITY_LABELS[density])} плотность`,
      without: { ...filters, density: filters.density.filter((item) => item !== density) },
    });
  }

  for (const volume of filters.volume) {
    chips.push({
      id: `volume:${volume}`,
      label: formatVolume(volume),
      without: { ...filters, volume: filters.volume.filter((item) => item !== volume) },
    });
  }

  const { priceMin, priceMax } = filters;
  if (priceMin !== undefined || priceMax !== undefined) {
    let label: string;
    if (priceMin !== undefined && priceMax !== undefined) {
      label = `${rubles(priceMin)} — ${rubles(priceMax)}`.replace(' —', `${NBSP}—`);
    } else if (priceMin !== undefined) {
      label = `от${NBSP}${rubles(priceMin)}`;
    } else {
      label = `до${NBSP}${rubles(priceMax ?? 0)}`;
    }
    chips.push({
      id: 'price',
      label,
      without: { ...filters, priceMin: undefined, priceMax: undefined },
    });
  }

  return chips;
}
