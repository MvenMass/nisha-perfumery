import { addressesResponseSchema } from '@nisha/contracts';
import { useQuery } from '@tanstack/react-query';

import { apiRequest } from '../../shared/api/http';

export const addressesQueryKey = ['addresses'] as const;

/** Сохранённые адреса вошедшего; у гостя их нет, запрос не выполняется. */
export function useAddresses(enabled: boolean) {
  return useQuery({
    queryKey: addressesQueryKey,
    queryFn: () => apiRequest('/api/addresses', addressesResponseSchema),
    enabled,
  });
}
