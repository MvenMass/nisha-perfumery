import { CART_MAX_LINES, CART_MAX_QUANTITY, cartItemsRequestSchema } from '@nisha/contracts';
import type { CartItemInput } from '@nisha/contracts';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '../../shared/lib/persist-storage';

/**
 * Корзина гостя (D-015): в браузере только вариант и количество. Цены, остатки и итоги
 * присылает сервер по POST /api/cart/quote — клиентской цене не доверяем.
 */
type GuestCartState = {
  items: CartItemInput[];
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  /** Оставить только позиции, которые сервер ещё знает (вариант мог быть удалён). */
  keepOnly: (variantIds: ReadonlySet<string>) => void;
  replace: (items: CartItemInput[]) => void;
  clear: () => void;
};

const clampQuantity = (quantity: number) =>
  Math.min(Math.max(Math.trunc(quantity), 1), CART_MAX_QUANTITY);

export const useGuestCart = create<GuestCartState>()(
  persist(
    (set) => ({
      items: [],
      setQuantity: (variantId, quantity) =>
        set(({ items }) => {
          const next = clampQuantity(quantity);
          if (items.some((item) => item.variantId === variantId)) {
            return {
              items: items.map((item) =>
                item.variantId === variantId ? { variantId, quantity: next } : item,
              ),
            };
          }
          if (items.length >= CART_MAX_LINES) return { items };
          return { items: [...items, { variantId, quantity: next }] };
        }),
      remove: (variantId) =>
        set(({ items }) => ({ items: items.filter((item) => item.variantId !== variantId) })),
      keepOnly: (variantIds) =>
        set(({ items }) => {
          const kept = items.filter((item) => variantIds.has(item.variantId));
          return kept.length === items.length ? { items } : { items: kept };
        }),
      replace: (items) => set({ items }),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'nisha-cart',
      version: 1,
      storage: persistStorage,
      partialize: ({ items }) => ({ items }),
      // Данные из localStorage могли испортить руками или старой версией сайта:
      // всё, что не проходит схему контракта, отбрасывается.
      merge: (persisted, current) => {
        const parsed = cartItemsRequestSchema.safeParse(persisted);
        return { ...current, items: parsed.success ? parsed.data.items : [] };
      },
    },
  ),
);
