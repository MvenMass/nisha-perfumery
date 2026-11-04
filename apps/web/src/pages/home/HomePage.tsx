import { healthResponseSchema } from '@nisha/contracts';
import { useQuery } from '@tanstack/react-query';

import { apiRequest } from '../../shared/api/http';

// Временная страница этапа 1: проверяет связку web → api.
// Заменяется главной по макету в этапе 4.
export function HomePage() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => apiRequest('/api/health', healthResponseSchema),
  });

  let status: string;
  if (health.isPending) status = 'проверяем…';
  else if (health.isError) status = `ошибка: ${health.error.message}`;
  else status = health.data.status;

  return (
    <main>
      <h1>Ниша</h1>
      <p role="status">Статус API: {status}</p>
    </main>
  );
}
