import { storeInfoSchema } from '@nisha/contracts';
import { useQuery } from '@tanstack/react-query';

import { apiRequest } from '../../shared/api/http';

/** Доставка и бутик: нужны главной, товару и оформлению. Меняются редко. */
export function useStoreInfo() {
  return useQuery({
    queryKey: ['store'],
    queryFn: () => apiRequest('/api/store', storeInfoSchema),
    staleTime: 10 * 60_000,
  });
}
