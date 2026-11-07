import { authResponseSchema } from '@nisha/contracts';
import type { LoginRequest, RegisterRequest, User } from '@nisha/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { meQueryKey } from '../../entities/user/queries';
import { apiRequest } from '../../shared/api/http';

function useSetUser() {
  const queryClient = useQueryClient();
  return (user: User | null) => {
    queryClient.setQueryData(meQueryKey, user);
  };
}

export function useLogin() {
  const setUser = useSetUser();
  return useMutation({
    mutationFn: (input: LoginRequest) =>
      apiRequest('/api/auth/login', authResponseSchema, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: ({ user }) => setUser(user),
  });
}

export function useRegister() {
  const setUser = useSetUser();
  return useMutation({
    mutationFn: (input: RegisterRequest) =>
      apiRequest('/api/auth/register', authResponseSchema, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
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
