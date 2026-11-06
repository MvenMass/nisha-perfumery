import type { ProductListItem } from '@nisha/contracts';

import { formatSpecimenNumber, productHref } from '../../entities/product/lib/format';
import type { ProductCardData } from './ProductCard';

// Фон-заглушка, пока у товара нет снимка, — по тону материала, как в макетах.
const PLACEHOLDER_BY_MATERIAL: Record<string, ProductCardData['placeholder']> = {
  limestone: 'basalt',
  basalt: 'basalt',
  travertine: 'walnut',
  walnut: 'walnut',
  amber: 'copperDark',
};

export function toProductCard(item: ProductListItem): ProductCardData {
  return {
    href: productHref(item.slug),
    number: formatSpecimenNumber(item.specimenNumber),
    name: item.name,
    materialName: item.material.name,
    notes: item.keyNotes.join(', '),
    priceFromKopecks: item.priceFromKopecks,
    image: item.image ? { src: item.image.url, alt: item.image.alt } : undefined,
    placeholder: PLACEHOLDER_BY_MATERIAL[item.material.slug] ?? 'basalt',
    // «Новый образец» важнее «Бестселлера»: новинку иначе не заметят.
    badge: item.isNew ? 'new' : item.isBestseller ? 'bestseller' : undefined,
    inStock: item.inStock,
  };
}
