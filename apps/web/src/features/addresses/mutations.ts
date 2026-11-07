import { addressSchema } from '@nisha/contracts';
import type { AddressInput } from '@nisha/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { addressesQueryKey } from '../../entities/address/queries';
import { apiRequest } from '../../shared/api/http';

/** Создание, правка и удаление адреса; список после любого изменения перечитывается целиком. */
export function useSaveAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: AddressInput }) =>
      apiRequest(id ? `/api/addresses/${id}` : '/api/addresses', addressSchema, {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: addressesQueryKey }),
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/addresses/${id}`, z.undefined(), { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: addressesQueryKey }),
  });
}
