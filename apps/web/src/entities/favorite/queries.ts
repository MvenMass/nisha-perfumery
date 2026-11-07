import { favoritesResponseSchema } from '@nisha/contracts';
import type { FavoritesResponse, User } from '@nisha/contracts';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { apiRequest } from '../../shared/api/http';
import { useGuestFavorites } from './guest-favorites';

export const favoritesQueryKey = (user: User | null) => ['favorites', user?.id ?? 'guest'] as const;

const EMPTY: FavoritesResponse = { items: [] };

const fetchUserFavorites = () => apiRequest('/api/favorites', favoritesResponseSchema);

function fetchGuestFavorites(productIds: string[]): Promise<FavoritesResponse> {
  if (productIds.length === 0) return Promise.resolve(EMPTY);
  return apiRequest('/api/favorites/quote', favoritesResponseSchema, {
    method: 'POST',
    body: JSON.stringify({ productIds }),
  });
}

/** Карточки избранного: у вошедшего — с сервера, у гостя — по id из браузера (D-040). */
export function useFavorites(viewer: User | null | undefined) {
  const guestIds = useGuestFavorites((state) => state.productIds);
  return useQuery({
    queryKey: viewer ? favoritesQueryKey(viewer) : [...favoritesQueryKey(null), guestIds],
    queryFn: () => (viewer ? fetchUserFavorites() : fetchGuestFavorites(guestIds)),
    enabled: viewer !== undefined,
    // Снятое сердце не должно возвращать страницу к скелетону.
    placeholderData: keepPreviousData,
  });
}

/** Какие товары в избранном — для сердец на карточках и странице товара. */
export function useFavoriteIds(viewer: User | null | undefined): ReadonlySet<string> {
  const guestIds = useGuestFavorites((state) => state.productIds);
  const server = useQuery({
    queryKey: favoritesQueryKey(viewer ?? null),
    queryFn: fetchUserFavorites,
    enabled: Boolean(viewer),
  });
  const serverItems = server.data?.items;
  return useMemo(
    () => new Set(viewer ? (serverItems ?? []).map((item) => item.id) : guestIds),
    [viewer, serverItems, guestIds],
  );
}

/** Слияние гостевого избранного с аккаунтом после входа (D-040). */
export async function mergeGuestFavorites(queryClient: QueryClient, user: User): Promise<void> {
  const { productIds, clear } = useGuestFavorites.getState();
  if (productIds.length === 0) return;
  const favorites = await apiRequest('/api/favorites/merge', favoritesResponseSchema, {
    method: 'POST',
    body: JSON.stringify({ productIds }),
  });
  clear();
  queryClient.setQueryData(favoritesQueryKey(user), favorites);
}
