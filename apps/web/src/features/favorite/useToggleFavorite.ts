import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useGuestFavorites } from '../../entities/favorite/guest-favorites';
import { favoritesQueryKey, useFavoriteIds } from '../../entities/favorite/queries';
import { useViewer } from '../../entities/user/queries';
import { apiRequest } from '../../shared/api/http';

/**
 * Сердце товара. Пока запрос идёт, показывается новое состояние; при ошибке мутация
 * завершается и сердце само возвращается к тому, что лежит в кеше, — это и есть откат.
 */
export function useToggleFavorite(productId: string) {
  const queryClient = useQueryClient();
  const viewer = useViewer();
  const ids = useFavoriteIds(viewer);

  const mutation = useMutation({
    mutationFn: async (active: boolean) => {
      if (!viewer) {
        // Гость: избранное в браузере (D-040), сервер не нужен.
        useGuestFavorites.getState().set(productId, active);
        return;
      }
      await apiRequest(`/api/favorites/${productId}`, z.undefined(), {
        method: active ? 'PUT' : 'DELETE',
      });
    },
    // Мутация остаётся «в процессе», пока список не перезапрошен, — без мигания сердца.
    onSuccess: () =>
      viewer ? queryClient.invalidateQueries({ queryKey: favoritesQueryKey(viewer) }) : undefined,
  });

  const active = mutation.isPending ? mutation.variables : ids.has(productId);
  return {
    active,
    // Пока неизвестно, гость ли это, нажатие ушло бы не туда.
    disabled: viewer === undefined,
    failed: mutation.isError,
    toggle: () => mutation.mutate(!active),
  };
}
