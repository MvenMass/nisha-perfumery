import type { ProductListItem } from '@nisha/contracts';
import { useState } from 'react';

import { VolumePickerSheet } from '../../features/cart/VolumePickerSheet';
import { useToggleFavorite } from '../../features/favorite/useToggleFavorite';
import { ProductCard } from './ProductCard';
import { toProductCard } from './to-product-card';

type ShopProductCardProps = {
  item: ProductListItem;
  /** Ряды этикетки — «Образцы породы» на главной. */
  specimenRows?: boolean | undefined;
  /** Сердце — только там, где оно есть в макетах: главная и избранное. */
  withFavorite?: boolean | undefined;
  headingLevel?: 'h2' | 'h3' | undefined;
};

/** Карточка с работающими действиями: выбор объёма в корзину и избранное. */
export function ShopProductCard({
  item,
  specimenRows,
  withFavorite,
  headingLevel,
}: ShopProductCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const favorite = useToggleFavorite(item.id);

  return (
    <>
      <ProductCard
        product={toProductCard(item, { specimenRows })}
        headingLevel={headingLevel}
        onChooseVolume={() => setPickerOpen(true)}
        favorite={
          withFavorite
            ? { active: favorite.active, disabled: favorite.disabled, onToggle: favorite.toggle }
            : undefined
        }
      />
      <VolumePickerSheet
        slug={item.slug}
        name={item.name}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}
