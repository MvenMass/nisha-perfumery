import { orderSchema } from '@nisha/contracts';
import type { MockPaymentNotify } from '@nisha/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { orderKeys } from '../../entities/order/queries';
import { apiRequest } from '../../shared/api/http';

/**
 * Мок-оплата (D-060): страница сама присылает то, что прислал бы провайдер, — успех или отказ.
 * Ответ — заказ в новом статусе; его кладём в кеш, чтобы подтверждение открылось без запроса.
 */
export function useMockPayment(orderId: string, token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (result: MockPaymentNotify['result']) =>
      apiRequest('/api/payments/mock/notify', orderSchema, {
        method: 'POST',
        body: JSON.stringify({ orderId, result, ...(token ? { token } : {}) }),
      }),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
    // Ошибка (срок истёк, заказ уже обработан) — значит, статус на экране устарел.
    onError: () => queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) }),
  });
}
