import { orderListResponseSchema, orderSchema } from '@nisha/contracts';
import type { OrderListQuery } from '@nisha/contracts';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiRequest } from '../../shared/api/http';

export const orderKeys = {
  all: ['orders'] as const,
  list: (filter: OrderListQuery['filter']) => ['orders', 'list', filter] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
};

/** Ключ гостевого доступа (D-060) идёт в запрос, но не в ключ кеша: заказ один и тот же. */
export function orderPath(id: string, token?: string | null): string {
  return token ? `/api/orders/${id}?token=${encodeURIComponent(token)}` : `/api/orders/${id}`;
}

export function useOrder(id: string, token?: string | null) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => apiRequest(orderPath(id, token), orderSchema),
  });
}

export function useOrders(filter: OrderListQuery['filter']) {
  return useQuery({
    queryKey: orderKeys.list(filter),
    queryFn: () => apiRequest(`/api/orders?filter=${filter}&limit=48`, orderListResponseSchema),
    placeholderData: keepPreviousData,
  });
}
