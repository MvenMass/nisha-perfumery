import { meResponseSchema } from '@nisha/contracts';
import type { User } from '@nisha/contracts';
import { useQuery } from '@tanstack/react-query';

import { apiRequest } from '../../shared/api/http';

export const meQueryKey = ['me'] as const;

/** Текущий пользователь; null — гость. Источник правды — сервер (сессия в httpOnly-cookie). */
export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: async () => (await apiRequest('/api/auth/me', meResponseSchema)).user,
    staleTime: 60_000,
  });
}

export const isAdmin = (user: User | null | undefined) => user?.role === 'admin';

/**
 * Кто смотрит страницу: undefined — ещё не известно, null — гость.
 * Если /me не ответил, считаем гостем: корзина и избранное гостя всё равно работают.
 */
export function useViewer(): User | null | undefined {
  const me = useMe();
  if (me.isPending) return undefined;
  return me.data ?? null;
}
