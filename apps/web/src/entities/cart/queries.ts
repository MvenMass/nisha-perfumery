import { cartResponseSchema } from '@nisha/contracts';
import type { CartResponse, User } from '@nisha/contracts';
import { useQuery } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import { apiRequest } from '../../shared/api/http';
import { useGuestCart } from './guest-cart';

/** Ключ кеша корзины: у каждого пользователя свой, у гостя — общий для вкладки. */
export const cartQueryKey = (user: User | null) => ['cart', user?.id ?? 'guest'] as const;

export const EMPTY_CART: CartResponse = {
  lines: [],
  summary: { productsCount: 0, bottlesCount: 0, itemsTotalKopecks: 0 },
};

/**
 * Корзина в одном виде для всех: у вошедшего — серверная, у гостя — позиции из браузера,
 * посчитанные сервером (D-015).
 */
export async function fetchCart(user: User | null): Promise<CartResponse> {
  if (user) return apiRequest('/api/cart', cartResponseSchema);

  const { items, keepOnly } = useGuestCart.getState();
  if (items.length === 0) return EMPTY_CART;
  const cart = await apiRequest('/api/cart/quote', cartResponseSchema, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
  keepOnly(new Set(cart.lines.map((line) => line.variantId)));
  return cart;
}

/** viewer — из useViewer(): undefined, пока неизвестно, гость ли это. */
export function useCart(viewer: User | null | undefined) {
  return useQuery({
    queryKey: cartQueryKey(viewer ?? null),
    queryFn: () => fetchCart(viewer ?? null),
    enabled: viewer !== undefined,
  });
}

/**
 * Переносит гостевую корзину в аккаунт после входа (D-015). Локальная копия очищается
 * только после ответа сервера: если слияние не прошло, оно повторится при следующем входе.
 */
export async function mergeGuestCart(queryClient: QueryClient, user: User): Promise<void> {
  const { items, clear } = useGuestCart.getState();
  if (items.length === 0) return;
  const cart = await apiRequest('/api/cart/merge', cartResponseSchema, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
  clear();
  queryClient.setQueryData(cartQueryKey(user), cart);
  queryClient.removeQueries({ queryKey: cartQueryKey(null) });
}
