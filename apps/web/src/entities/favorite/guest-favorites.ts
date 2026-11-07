import { favoriteIdsRequestSchema, FAVORITES_LIMIT } from '@nisha/contracts';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '../../shared/lib/persist-storage';

/** Избранное гостя (D-040): только id товаров, новые — в начале списка. */
type GuestFavoritesState = {
  productIds: string[];
  set: (productId: string, active: boolean) => void;
  clear: () => void;
};

export const useGuestFavorites = create<GuestFavoritesState>()(
  persist(
    (set) => ({
      productIds: [],
      set: (productId, active) =>
        set(({ productIds }) => {
          const rest = productIds.filter((id) => id !== productId);
          if (!active) return { productIds: rest };
          return { productIds: [productId, ...rest].slice(0, FAVORITES_LIMIT) };
        }),
      clear: () => set({ productIds: [] }),
    }),
    {
      name: 'nisha-favorites',
      version: 1,
      storage: persistStorage,
      partialize: ({ productIds }) => ({ productIds }),
      merge: (persisted, current) => {
        const parsed = favoriteIdsRequestSchema.safeParse(persisted);
        return { ...current, productIds: parsed.success ? parsed.data.productIds : [] };
      },
    },
  ),
);
