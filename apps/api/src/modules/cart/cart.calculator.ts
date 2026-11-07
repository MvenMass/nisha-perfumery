import { CART_MAX_QUANTITY } from '@nisha/contracts';
import type { CartLine, CartLineStatus, CartResponse } from '@nisha/contracts';

import type { StoredItem, VariantRow } from './cart.repository';

/*
 * Единственное место, где считаются позиции и итоги корзины (CONVENTIONS.md, правило 4).
 * Позиция без остатка или снятая с продажи показывается, но не входит ни в сумму,
 * ни в счётчики (D-028); при нехватке остатка в сумму идёт то, что можно купить.
 */

function isSellable(variant: VariantRow): boolean {
  return variant.isPublished && variant.isActive;
}

export function lineStatus(variant: VariantRow, quantity: number): CartLineStatus {
  if (!isSellable(variant)) return 'unavailable';
  if (variant.stock === 0) return 'out_of_stock';
  if (variant.stock < quantity) return 'insufficient_stock';
  return 'available';
}

/** Сколько можно купить сейчас — граница степпера. */
export function availableQuantity(variant: VariantRow): number {
  return isSellable(variant) ? Math.min(variant.stock, CART_MAX_QUANTITY) : 0;
}

export function buildLine(variant: VariantRow, quantity: number): CartLine {
  const available = availableQuantity(variant);
  return {
    variantId: variant.variantId,
    productId: variant.productId,
    productSlug: variant.productSlug,
    productName: variant.productName,
    specimenNumber: variant.specimenNumber,
    volumeMl: variant.volumeMl,
    concentration: variant.concentration,
    priceKopecks: variant.priceKopecks,
    quantity,
    availableQuantity: available,
    status: lineStatus(variant, quantity),
    lineTotalKopecks: variant.priceKopecks * Math.min(quantity, available),
    image: variant.image,
  };
}

/** Повторы одного варианта складываются: гостевая корзина из localStorage может прийти с дублями. */
export function normalizeItems(items: StoredItem[]): StoredItem[] {
  const byVariant = new Map<string, number>();
  for (const item of items) {
    byVariant.set(item.variantId, (byVariant.get(item.variantId) ?? 0) + item.quantity);
  }
  return [...byVariant].map(([variantId, quantity]) => ({
    variantId,
    quantity: Math.min(quantity, CART_MAX_QUANTITY),
  }));
}

/** Позиции, варианта которых больше нет в базе, отбрасываются — показать их нечем. */
export function buildCart(items: StoredItem[], variants: VariantRow[]): CartResponse {
  const byId = new Map(variants.map((variant) => [variant.variantId, variant]));
  const lines: CartLine[] = [];
  for (const item of items) {
    const variant = byId.get(item.variantId);
    if (variant) lines.push(buildLine(variant, item.quantity));
  }

  let productsCount = 0;
  let bottlesCount = 0;
  let itemsTotalKopecks = 0;
  for (const line of lines) {
    const countable = Math.min(line.quantity, line.availableQuantity);
    if (countable === 0) continue;
    productsCount += 1;
    bottlesCount += countable;
    itemsTotalKopecks += line.lineTotalKopecks;
  }
  return { lines, summary: { productsCount, bottlesCount, itemsTotalKopecks } };
}

/**
 * Количество позиции после слияния гостевой корзины с серверной (D-015): сумма, обрезанная
 * остатком. Если остатка нет, позиция остаётся с пометкой «закончился» — берём большее из двух,
 * чтобы не потерять намерение покупателя. Снятое с продажи из гостевой корзины не переносится.
 * undefined — позицию не записывать.
 */
export function mergedQuantity(
  variant: VariantRow,
  existing: number,
  incoming: number,
): number | undefined {
  if (!isSellable(variant)) return existing > 0 ? existing : undefined;
  const limit = availableQuantity(variant);
  if (limit === 0) return Math.min(Math.max(existing, incoming), CART_MAX_QUANTITY);
  return Math.min(existing + incoming, limit);
}
