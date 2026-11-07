import {
  checkoutQuoteSchema,
  createOrderResponseSchema,
  pickupPointsResponseSchema,
} from '@nisha/contracts';
import type { CreateOrderRequest, DeliveryMethod, User } from '@nisha/contracts';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useGuestCart } from '../../entities/cart/guest-cart';
import { cartQueryKey } from '../../entities/cart/queries';
import { addressesQueryKey } from '../../entities/address/queries';
import { orderKeys } from '../../entities/order/queries';
import { meQueryKey } from '../../entities/user/queries';
import { apiRequest } from '../../shared/api/http';

/**
 * Итог оформления при выбранной доставке — считает сервер (D-030). Гость передаёт позиции
 * из браузера, вошедший — ничего: сервер берёт его корзину.
 */
export function useCheckoutQuote(viewer: User | null | undefined, method: DeliveryMethod) {
  const guestItems = useGuestCart((state) => state.items);
  return useQuery({
    queryKey: ['checkout-quote', viewer?.id ?? 'guest', method, viewer ? null : guestItems],
    queryFn: () =>
      apiRequest('/api/checkout/quote', checkoutQuoteSchema, {
        method: 'POST',
        body: JSON.stringify({ method, ...(viewer ? {} : { items: guestItems }) }),
      }),
    enabled: viewer !== undefined,
    // При смене способа доставки итог не должен мигать скелетоном.
    placeholderData: keepPreviousData,
  });
}

export function usePickupPoints(city: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['pickup-points', city ?? 'all'],
    queryFn: () =>
      apiRequest(
        city ? `/api/pickup-points?city=${encodeURIComponent(city)}` : '/api/pickup-points',
        pickupPointsResponseSchema,
      ),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

/**
 * Создание заказа. После успеха корзина пуста: у вошедшего её очистил сервер,
 * у гостя очищаем локальную копию — заказ уже держит остатки.
 */
export function useCreateOrder(viewer: User | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateOrderRequest) =>
      apiRequest('/api/orders', createOrderResponseSchema, {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    onSuccess: ({ order }) => {
      if (!viewer) useGuestCart.getState().clear();
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      void queryClient.invalidateQueries({ queryKey: cartQueryKey(viewer) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
      void queryClient.invalidateQueries({ queryKey: addressesQueryKey });
      // Сервер мог запомнить телефон из заказа в профиле.
      if (viewer) void queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
  });
}
