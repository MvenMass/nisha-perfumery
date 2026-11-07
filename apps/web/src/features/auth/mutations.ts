import { authResponseSchema } from '@nisha/contracts';
import type { LoginRequest, RegisterRequest, User } from '@nisha/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { mergeGuestCart } from '../../entities/cart/queries';
import { mergeGuestFavorites } from '../../entities/favorite/queries';
import { meQueryKey } from '../../entities/user/queries';
import { apiRequest } from '../../shared/api/http';

/**
 * Переносит гостевые корзину и избранное в аккаунт (D-015, D-040) до того, как интерфейс
 * переключится на пользователя, — иначе на миг показалась бы корзина без гостевых позиций.
 * Ошибка слияния не мешает входу: гостевые данные остаются в браузере до следующего входа.
 */
async function syncGuestData(queryClient: QueryClient, user: User): Promise<void> {
  const results = await Promise.allSettled([
    mergeGuestCart(queryClient, user),
    mergeGuestFavorites(queryClient, user),
  ]);
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('Не удалось перенести гостевые данные в аккаунт', result.reason);
    }
  }
}

function useSetUser() {
  const queryClient = useQueryClient();
  return (user: User | null) => {
    queryClient.setQueryData(meQueryKey, user);
  };
}

export function useLogin() {
  const queryClient = useQueryClient();
  const setUser = useSetUser();
  return useMutation({
    mutationFn: async (input: LoginRequest) => {
      const response = await apiRequest('/api/auth/login', authResponseSchema, {
        method: 'POST',
        body: JSON.stringify(input),
      });
      await syncGuestData(queryClient, response.user);
      return response;
    },
    onSuccess: ({ user }) => setUser(user),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const setUser = useSetUser();
  return useMutation({
    mutationFn: async (input: RegisterRequest) => {
      const response = await apiRequest('/api/auth/register', authResponseSchema, {
        method: 'POST',
        body: JSON.stringify(input),
      });
      await syncGuestData(queryClient, response.user);
      return response;
    },
    onSuccess: ({ user }) => setUser(user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest('/api/auth/logout', z.undefined(), { method: 'POST' }),
    onSuccess: () => {
      // Личные данные прошлого пользователя не должны остаться в кеше вкладки.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'products' });
      queryClient.setQueryData(meQueryKey, null);
    },
  });
}
