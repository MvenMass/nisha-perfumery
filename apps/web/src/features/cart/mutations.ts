import { CART_MAX_QUANTITY, cartResponseSchema } from '@nisha/contracts';
import type { CartItemInput, CartResponse, User } from '@nisha/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import { useGuestCart } from '../../entities/cart/guest-cart';
import { cartQueryKey, fetchCart } from '../../entities/cart/queries';
import { useViewer } from '../../entities/user/queries';
import { ApiError, apiRequest } from '../../shared/api/http';

export type CartChange =
  | { type: 'set'; variantId: string; quantity: number }
  | { type: 'remove'; variantId: string }
  /** «В корзину»: прибавить к тому, что уже лежит; stock — остаток, известный странице. */
  | { type: 'add'; variantId: string; quantity: number; stock: number };

/**
 * Оптимистично меняется только количество или состав позиций — суммы и статусы
 * не пересчитываются на клиенте (CLAUDE.md, правило 4): их пришлёт сервер.
 */
export function applyOptimistic(cart: CartResponse, change: CartChange): CartResponse {
  if (change.type === 'remove') {
    return { ...cart, lines: cart.lines.filter((line) => line.variantId !== change.variantId) };
  }
  if (change.type === 'add') return cart;
  return {
    ...cart,
    lines: cart.lines.map((line) =>
      line.variantId === change.variantId ? { ...line, quantity: change.quantity } : line,
    ),
  };
}

/** Новое количество для «В корзину»; если добавить уже нечего — понятная ошибка, а не тихий no-op. */
export function quantityAfterAdd(current: number, change: { quantity: number; stock: number }) {
  const next = Math.min(current + change.quantity, change.stock, CART_MAX_QUANTITY);
  if (next <= current) {
    throw new ApiError(409, 'OUT_OF_STOCK', 'В корзине уже весь доступный остаток');
  }
  return next;
}

async function currentQuantity(
  queryClient: QueryClient,
  viewer: User | null,
  variantId: string,
): Promise<number> {
  if (!viewer) {
    return (
      useGuestCart.getState().items.find((item) => item.variantId === variantId)?.quantity ?? 0
    );
  }
  // Количество берём из корзины сервера: если кеш ещё пуст, PUT с одной «+1» затёр бы позицию.
  const cart = await queryClient.ensureQueryData({
    queryKey: cartQueryKey(viewer),
    queryFn: () => fetchCart(viewer),
  });
  return cart.lines.find((line) => line.variantId === variantId)?.quantity ?? 0;
}

function putItem(item: CartItemInput): Promise<CartResponse> {
  return apiRequest('/api/cart/items', cartResponseSchema, {
    method: 'PUT',
    body: JSON.stringify(item),
  });
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
      const quantity =
        change.type === 'add'
          ? quantityAfterAdd(await currentQuantity(queryClient, viewer, change.variantId), change)
          : change.type === 'set'
            ? change.quantity
            : undefined;

      if (viewer) {
        return quantity === undefined
          ? apiRequest(`/api/cart/items/${change.variantId}`, cartResponseSchema, {
              method: 'DELETE',
            })
          : putItem({ variantId: change.variantId, quantity });
      }
      const guest = useGuestCart.getState();
      if (quantity === undefined) guest.remove(change.variantId);
      else guest.setQuantity(change.variantId, quantity);
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

/** Текст ошибки изменения корзины для покупателя. */
export function cartErrorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'OUT_OF_STOCK' || error.code === 'NOT_FOUND' || error.code === 'CONFLICT') {
      return error.message;
    }
    if (error.code === 'NETWORK') return 'Нет соединения. Попробуйте ещё раз.';
  }
  return 'Не получилось изменить корзину. Попробуйте ещё раз.';
}
