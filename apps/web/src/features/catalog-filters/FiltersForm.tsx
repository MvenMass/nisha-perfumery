import type { CatalogFiltersResponse, Density } from '@nisha/contracts';
import type { ReactNode } from 'react';

import type { CatalogFilters } from '../../entities/product/lib/catalog-search';
import { DENSITY_BARS, DENSITY_LABELS, formatVolume } from '../../entities/product/lib/format';
import { cx } from '../../shared/lib/cx';
import { Accordion } from '../../shared/ui/Accordion/Accordion';
import { Checkbox } from '../../shared/ui/Checkbox/Checkbox';
import { Chip } from '../../shared/ui/Chip/Chip';
import styles from './FiltersForm.module.css';
import { PriceRange } from './PriceRange';

type FiltersFormProps = {
  value: CatalogFilters;
  onChange: (next: CatalogFilters) => void;
  facets: CatalogFiltersResponse;
  /** panel — боковая панель каталога; sheet — мобильная шторка, часть групп свёрнута (как в макете). */
  layout: 'panel' | 'sheet';
};

function toggle<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
}

function Group({
  title,
  count,
  collapsible,
  children,
}: {
  title: string;
  count: number;
  collapsible: boolean;
  children: ReactNode;
}) {
  if (collapsible) {
    return (
      <Accordion title={title} count={count} variant="filter" className={styles.accordionGroup}>
        {children}
      </Accordion>
    );
  }
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{title}</legend>
      {children}
    </fieldset>
  );
}

function DensityBars({ density }: { density: Density }) {
  return (
    <span aria-hidden="true" className={styles.bars}>
      {Array.from({ length: DENSITY_BARS[density] }, (_, index) => (
        <span key={index} className={styles.bar} />
      ))}
    </span>
  );
}

export function FiltersForm({ value, onChange, facets, layout }: FiltersFormProps) {
  const inSheet = layout === 'sheet';
  // Коллекция в фильтрах имеет смысл, только когда их больше одной.
  const showCollections = facets.collections.filter((item) => item.count > 0).length > 1;

  const categories = (
    <Group title="Категория" count={value.category.length} collapsible={inSheet}>
      <div className={styles.column}>
        {facets.categories
          .filter((item) => item.count > 0)
          .map((item) => (
            <Checkbox
              key={item.slug}
              label={item.name}
              count={item.count}
              checked={value.category.includes(item.slug)}
              onChange={() => onChange({ ...value, category: toggle(value.category, item.slug) })}
            />
          ))}
      </div>
    </Group>
  );

  const materials = (
    <Group title="Материал" count={value.material.length} collapsible={false}>
      <div className={styles.wrap}>
        {facets.materials.map((item) => (
          <Chip
            key={item.slug}
            swatch={item.swatchColor}
            pressed={value.material.includes(item.slug)}
            onClick={() => onChange({ ...value, material: toggle(value.material, item.slug) })}
          >
            {item.name}
          </Chip>
        ))}
      </div>
    </Group>
  );

  const volumes = (
    <Group title="Объём" count={value.volume.length} collapsible={false}>
      <div className={cx(styles.wrap, styles.segments)}>
        {facets.volumes
          .filter((item) => item.count > 1)
          .map((item) => (
            <Chip
              key={item.volumeMl}
              variant="segment"
              pressed={value.volume.includes(item.volumeMl)}
              onClick={() => onChange({ ...value, volume: toggle(value.volume, item.volumeMl) })}
            >
              {formatVolume(item.volumeMl)}
            </Chip>
          ))}
      </div>
    </Group>
  );

  const priceCount = value.priceMin !== undefined || value.priceMax !== undefined ? 1 : 0;
  const price = facets.price && (
    <Group title="Цена, ₽" count={priceCount} collapsible={inSheet}>
      <PriceRange
        bounds={facets.price}
        min={value.priceMin}
        max={value.priceMax}
        onChange={(priceMin, priceMax) => onChange({ ...value, priceMin, priceMax })}
      />
    </Group>
  );

  const densities = (
    <Group title="Плотность" count={value.density.length} collapsible={inSheet}>
      <div className={styles.column}>
        {facets.densities.map((item) => (
          <Checkbox
            key={item.value}
            label={DENSITY_LABELS[item.value].replace(/^./, (char) => char.toUpperCase())}
            adornment={<DensityBars density={item.value} />}
            checked={value.density.includes(item.value)}
            onChange={() => onChange({ ...value, density: toggle(value.density, item.value) })}
          />
        ))}
      </div>
    </Group>
  );

  const collections = showCollections && (
    <Group title="Коллекция" count={value.collection.length} collapsible={inSheet}>
      <div className={styles.column}>
        {facets.collections.map((item) => (
          <Checkbox
            key={item.slug}
            label={item.name}
            count={item.count}
            checked={value.collection.includes(item.slug)}
            onChange={() => onChange({ ...value, collection: toggle(value.collection, item.slug) })}
          />
        ))}
      </div>
    </Group>
  );

  // Порядок групп — как в макетах: на десктопе категория первой, в шторке — материал и объём сверху.
  return (
    <div className={cx(styles.form, !inSheet && styles.panel)}>
      {inSheet ? (
        <>
          {materials}
          {volumes}
          {categories}
          {collections}
          {price}
          {densities}
        </>
      ) : (
        <>
          {categories}
          {collections}
          {materials}
          {volumes}
          {price}
          {densities}
        </>
      )}
    </div>
  );
}

export { styles as filterFormStyles };
