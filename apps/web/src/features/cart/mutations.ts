import { cartResponseSchema } from '@nisha/contracts';
import type { CartItemInput, CartResponse } from '@nisha/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useGuestCart } from '../../entities/cart/guest-cart';
import { cartQueryKey, fetchCart } from '../../entities/cart/queries';
import { useViewer } from '../../entities/user/queries';
import { apiRequest } from '../../shared/api/http';

type CartChange =
  { type: 'set'; variantId: string; quantity: number } | { type: 'remove'; variantId: string };

/**
 * Оптимистично меняется только количество или состав позиций — суммы и статусы
 * не пересчитываются на клиенте (CLAUDE.md, правило 4): их пришлёт сервер.
 */
export function applyOptimistic(cart: CartResponse, change: CartChange): CartResponse {
  if (change.type === 'remove') {
    return { ...cart, lines: cart.lines.filter((line) => line.variantId !== change.variantId) };
  }
  return {
    ...cart,
    lines: cart.lines.map((line) =>
      line.variantId === change.variantId ? { ...line, quantity: change.quantity } : line,
    ),
  };
}

/**
 * Любое изменение корзины. Изменения выполняются строго по очереди (scope): быстрые нажатия
 * на «+» иначе могли бы прийти на сервер не в том порядке и вернуть старое количество.
 */
export function useChangeCart() {
  const queryClient = useQueryClient();
  const viewer = useViewer() ?? null;
  const key = cartQueryKey(viewer);

  return useMutation({
    scope: { id: 'cart' },
    mutationFn: async (change: CartChange): Promise<CartResponse> => {
      if (viewer) {
        return change.type === 'set'
          ? apiRequest('/api/cart/items', cartResponseSchema, {
              method: 'PUT',
              body: JSON.stringify({
                variantId: change.variantId,
                quantity: change.quantity,
              } satisfies CartItemInput),
            })
          : apiRequest(`/api/cart/items/${change.variantId}`, cartResponseSchema, {
              method: 'DELETE',
            });
      }
      const guest = useGuestCart.getState();
      if (change.type === 'set') guest.setQuantity(change.variantId, change.quantity);
      else guest.remove(change.variantId);
      return fetchCart(null);
    },
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CartResponse>(key);
      const previousGuest = useGuestCart.getState().items;
      if (previous) queryClient.setQueryData(key, applyOptimistic(previous, change));
      return { previous, previousGuest };
    },
    onError: (_error, _change, context) => {
      if (!context) return;
      queryClient.setQueryData(key, context.previous);
      if (!viewer) useGuestCart.getState().replace(context.previousGuest);
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(key, cart);
    },
  });
}
