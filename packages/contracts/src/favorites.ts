import { z } from 'zod';

import { productListItemSchema } from './catalog';
import { uuidSchema } from './common';

export const FAVORITES_LIMIT = 100;

export const favoriteParamsSchema = z.object({ productId: uuidSchema });

/** POST /favorites/merge (избранное гостя при входе) и POST /favorites/quote (карточки для гостя). */
export const favoriteIdsRequestSchema = z.object({
  productIds: z.array(uuidSchema).max(FAVORITES_LIMIT),
});
export type FavoriteIdsRequest = z.infer<typeof favoriteIdsRequestSchema>;

// Только товары, которые сейчас видны в каталоге: снятые с продажи из списка пропадают.
export const favoritesResponseSchema = z.object({
  items: z.array(productListItemSchema),
});
export type FavoritesResponse = z.infer<typeof favoritesResponseSchema>;
