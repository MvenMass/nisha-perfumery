import { articleSchema, articlesResponseSchema } from '@nisha/contracts';
import { useQuery } from '@tanstack/react-query';

import { apiRequest } from '../../shared/api/http';

export const journalKeys = {
  list: ['journal', 'list'] as const,
  article: (slug: string) => ['journal', 'article', slug] as const,
};

export function useArticles() {
  return useQuery({
    queryKey: journalKeys.list,
    queryFn: () => apiRequest('/api/articles?limit=48', articlesResponseSchema),
  });
}

export function useArticle(slug: string) {
  return useQuery({
    queryKey: journalKeys.article(slug),
    queryFn: () => apiRequest(`/api/articles/${encodeURIComponent(slug)}`, articleSchema),
  });
}
