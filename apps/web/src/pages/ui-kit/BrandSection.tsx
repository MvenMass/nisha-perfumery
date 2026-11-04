import { Button, ButtonLink } from '../../shared/ui/Button/Button';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { SectionLabel } from '../../shared/ui/SectionLabel/SectionLabel';
import { Skeleton, SkeletonText } from '../../shared/ui/Skeleton/Skeleton';
import { SpecimenLabel } from '../../shared/ui/SpecimenLabel/SpecimenLabel';
import { StrataDivider } from '../../shared/ui/StrataDivider/StrataDivider';
import { ProductCard } from '../../widgets/product-card/ProductCard';
import type { ProductCardData } from '../../widgets/product-card/ProductCard';
import { Demo, kitStyles as styles, Section } from './Section';

const PRODUCTS: ProductCardData[] = [
  {
    href: '/catalog/basalt',
    number: '03',
    name: 'Базальт',
    materialName: 'Базальт',
    notes: 'перец, ладан, ветивер',
    priceFromKopecks: 650_000,
    badge: 'bestseller',
    inStock: true,
  },
  {
    href: '/catalog/walnut',
    number: '04',
    name: 'Орех',
    materialName: 'Орех',
    notes: 'кедр, табак, лабданум',
    priceFromKopecks: 690_000,
    placeholder: 'walnut',
    inStock: true,
  },
  {
    href: '/catalog/obsidian',
    number: '11',
    name: 'Обсидиан',
    materialName: 'Базальт',
    notes: 'уд, кардамон, амбра',
    priceFromKopecks: 820_000,
    badge: 'bestseller',
    inStock: false,
  },
  {
    href: '/catalog/srez',
    number: '12',
    name: 'Срез',
    materialName: 'Орех',
    notes: 'сандал, ваниль, кожа',
    priceFromKopecks: 710_050,
    placeholder: 'copperDark',
    badge: 'new',
    inStock: true,
  },
];

const noop = () => undefined;

export function BrandSection() {
  return (
    <Section id="brand" title="Фирменные элементы">
      <Demo title="SectionLabel">
        <SectionLabel>Коллекция образцов · бестселлеры</SectionLabel>
        <SectionLabel tone="muted">О&nbsp;нас пишут</SectionLabel>
      </Demo>

      <Demo title="StrataDivider (подпись породы скрыта до 768 px)">
        <StrataDivider
          depth="−040 м"
          label="Известняк"
          layers={[
            { height: 1, color: 'lineStrong' },
            { height: 5, color: 'walnut' },
            { height: 2, color: 'stone' },
            { height: 8, color: 'basalt' },
          ]}
        />
        <StrataDivider
          depth="−120 м"
          label="Базальт"
          layers={[
            { height: 3, color: 'stone' },
            { height: 1, color: 'lineStrong' },
            { height: 7, color: 'basalt' },
            { height: 2, color: 'accent' },
          ]}
        />
      </Demo>

      <Demo title="SpecimenLabel">
        <div className={styles.narrow}>
          <SpecimenLabel
            number="01"
            meta="50 мл"
            name="Известняк"
            rows={[
              { term: 'Происхождение', value: 'осадочное плато' },
              { term: 'Ноты', value: 'ирис, мускус' },
              { term: 'Плотность', value: 'лёгкая' },
            ]}
          />
        </div>
      </Demo>

      <Demo title="ProductCard: обычная, без бейджа, нет в наличии, новая">
        <div className={styles.grid}>
          {PRODUCTS.map((product, index) => (
            <ProductCard
              key={product.href}
              product={product}
              onChooseVolume={noop}
              onNotify={noop}
              favorite={index === 0 ? { active: false, onToggle: noop } : undefined}
            />
          ))}
        </div>
      </Demo>

      <Demo title="EmptyState">
        <EmptyState
          label="Пустое состояние · пример"
          title="Такой породы у&nbsp;нас пока нет"
          description="Попробуйте убрать часть фильтров."
          action={
            <Button variant="outline" size="md">
              Сбросить фильтры
            </Button>
          }
        />
        <EmptyState
          icon="bag"
          label="Пустая корзина · пример"
          title="Здесь пока ни&nbsp;одного образца"
          action={
            <ButtonLink to="/catalog" size="md">
              В&nbsp;каталог
            </ButtonLink>
          }
        />
      </Demo>

      <Demo title="Skeleton">
        <div className={styles.grid} role="status" aria-busy="true" aria-label="Загрузка каталога">
          {[0, 1].map((key) => (
            <div key={key} className={styles.stack}>
              <Skeleton height={300} />
              <Skeleton width={120} height={12} />
              <Skeleton width="60%" height={28} />
              <SkeletonText lines={2} />
            </div>
          ))}
        </div>
      </Demo>
    </Section>
  );
}
