import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { ApiError } from '../shared/api/http';

const MAX_RETRIES = 2;

// 4xx — ответ по существу (нет товара, неверный запрос): повтор ничего не изменит,
// а пользователь лишние секунды смотрит на скелетон вместо 404.
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < MAX_RETRIES;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } }),
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
