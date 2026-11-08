import { adminOrderListResponseSchema, adminOrderSchema } from '@nisha/contracts';
import type { AdminOrderListQuery, ChangeOrderStatus } from '@nisha/contracts';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { orderKeys } from '../../entities/order/queries';
import { apiRequest } from '../../shared/api/http';

export const adminOrderKeys = {
  all: ['admin', 'orders'] as const,
  list: (query: Partial<AdminOrderListQuery>) => ['admin', 'orders', 'list', query] as const,
  detail: (id: string) => ['admin', 'orders', 'detail', id] as const,
};

function listPath(query: Partial<AdminOrderListQuery>): string {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.q) params.set('q', query.q);
  params.set('limit', String(query.limit ?? 24));
  params.set('offset', String(query.offset ?? 0));
  return `/api/admin/orders?${params.toString()}`;
}

export function useAdminOrders(query: Partial<AdminOrderListQuery>) {
  return useQuery({
    queryKey: adminOrderKeys.list(query),
    queryFn: () => apiRequest(listPath(query), adminOrderListResponseSchema),
    placeholderData: keepPreviousData,
  });
}

export function useAdminOrder(id: string) {
  return useQuery({
    queryKey: adminOrderKeys.detail(id),
    queryFn: () => apiRequest(`/api/admin/orders/${id}`, adminOrderSchema),
  });
}

export function useChangeOrderStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangeOrderStatus) =>
      apiRequest(`/api/admin/orders/${id}/status`, adminOrderSchema, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (order) => {
      queryClient.setQueryData(adminOrderKeys.detail(id), order);
      void queryClient.invalidateQueries({ queryKey: adminOrderKeys.all });
      // Если администратор — ещё и покупатель этого заказа, кабинет тоже должен обновиться.
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}
