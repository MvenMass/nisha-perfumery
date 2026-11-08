import {
  adminArticleSchema,
  adminArticlesResponseSchema,
  adminConsultationsResponseSchema,
  adminHeroSlideSchema,
  adminHeroSlidesResponseSchema,
  adminStoreSettingsSchema,
  uploadResponseSchema,
} from '@nisha/contracts';
import type {
  ArticleInput,
  ConsultationStatus,
  HeroSlideInput,
  StoreSettingsInput,
} from '@nisha/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { productKeys } from '../../entities/product/api/queries';
import { apiRequest } from '../../shared/api/http';

export const adminContentKeys = {
  slides: ['admin', 'slides'] as const,
  articles: ['admin', 'articles'] as const,
  article: (id: string) => ['admin', 'articles', id] as const,
  consultations: (status: ConsultationStatus | 'all') =>
    ['admin', 'consultations', status] as const,
  settings: ['admin', 'settings'] as const,
};

/** Слайды и статьи видны на главной и в журнале — их кеш тоже сбрасываем. */
function usePublicInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: productKeys.home });
    void queryClient.invalidateQueries({ queryKey: ['journal'] });
  };
}

// --- Слайды ---

export function useAdminSlides() {
  return useQuery({
    queryKey: adminContentKeys.slides,
    queryFn: async () =>
      (await apiRequest('/api/admin/slides', adminHeroSlidesResponseSchema)).items,
  });
}

export function useSaveSlide() {
  const queryClient = useQueryClient();
  const invalidatePublic = usePublicInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: HeroSlideInput }) =>
      apiRequest(id ? `/api/admin/slides/${id}` : '/api/admin/slides', adminHeroSlideSchema, {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminContentKeys.slides });
      invalidatePublic();
    },
  });
}

export function useReorderSlides() {
  const queryClient = useQueryClient();
  const invalidatePublic = usePublicInvalidate();
  return useMutation({
    mutationFn: (ids: string[]) =>
      apiRequest('/api/admin/slides/order', adminHeroSlidesResponseSchema, {
        method: 'PATCH',
        body: JSON.stringify({ ids }),
      }),
    onSuccess: ({ items }) => {
      queryClient.setQueryData(adminContentKeys.slides, items);
      invalidatePublic();
    },
  });
}

export function useDeleteSlide() {
  const queryClient = useQueryClient();
  const invalidatePublic = usePublicInvalidate();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/admin/slides/${id}`, z.undefined(), { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminContentKeys.slides });
      invalidatePublic();
    },
  });
}

// --- Статьи ---

export function useAdminArticles() {
  return useQuery({
    queryKey: adminContentKeys.articles,
    queryFn: async () =>
      (await apiRequest('/api/admin/articles', adminArticlesResponseSchema)).items,
  });
}

export function useAdminArticle(id: string | undefined) {
  return useQuery({
    queryKey: adminContentKeys.article(id ?? 'new'),
    queryFn: () => apiRequest(`/api/admin/articles/${id ?? ''}`, adminArticleSchema),
    enabled: Boolean(id),
  });
}

export function useSaveArticle(id: string | undefined) {
  const queryClient = useQueryClient();
  const invalidatePublic = usePublicInvalidate();
  return useMutation({
    mutationFn: (input: ArticleInput) =>
      apiRequest(id ? `/api/admin/articles/${id}` : '/api/admin/articles', adminArticleSchema, {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (article) => {
      queryClient.setQueryData(adminContentKeys.article(article.id), article);
      void queryClient.invalidateQueries({ queryKey: adminContentKeys.articles });
      invalidatePublic();
    },
  });
}

export function useDeleteArticle() {
  const queryClient = useQueryClient();
  const invalidatePublic = usePublicInvalidate();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/admin/articles/${id}`, z.undefined(), { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminContentKeys.articles });
      invalidatePublic();
    },
  });
}

// --- Заявки ---

export function useConsultations(status: ConsultationStatus | 'all') {
  return useQuery({
    queryKey: adminContentKeys.consultations(status),
    queryFn: async () =>
      (
        await apiRequest(
          status === 'all'
            ? '/api/admin/consultations'
            : `/api/admin/consultations?status=${status}`,
          adminConsultationsResponseSchema,
        )
      ).items,
  });
}

export function useSetConsultationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ConsultationStatus }) =>
      apiRequest(`/api/admin/consultations/${id}`, z.undefined(), {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'consultations'] }),
  });
}

// --- Настройки ---

export function useStoreSettings() {
  return useQuery({
    queryKey: adminContentKeys.settings,
    queryFn: () => apiRequest('/api/admin/settings', adminStoreSettingsSchema),
  });
}

export function useSaveSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StoreSettingsInput) =>
      apiRequest('/api/admin/settings', adminStoreSettingsSchema, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: (settings) => {
      queryClient.setQueryData(adminContentKeys.settings, settings);
      // Доставка и бутик на витрине берутся из /store.
      void queryClient.invalidateQueries({ queryKey: ['store'] });
    },
  });
}

// --- Снимки для слайдов и статей ---

export function useUploadContentImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return (
        await apiRequest('/api/admin/uploads', uploadResponseSchema, { method: 'POST', body: form })
      ).url;
    },
  });
}
