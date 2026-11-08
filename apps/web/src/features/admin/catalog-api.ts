import {
  adminImageSchema,
  adminProductListResponseSchema,
  adminProductSchema,
  dictionariesResponseSchema,
} from '@nisha/contracts';
import type {
  AdminProductInput,
  AdminProductListQuery,
  DictionaryKind,
  ImagesUpdate,
} from '@nisha/contracts';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { productKeys } from '../../entities/product/api/queries';
import { apiRequest } from '../../shared/api/http';

export const adminCatalogKeys = {
  all: ['admin', 'catalog'] as const,
  products: (query: Partial<AdminProductListQuery>) =>
    ['admin', 'catalog', 'products', query] as const,
  product: (id: string) => ['admin', 'catalog', 'product', id] as const,
  dictionaries: ['admin', 'catalog', 'dictionaries'] as const,
  notes: ['admin', 'catalog', 'notes'] as const,
};

export function useAdminProducts(query: Partial<AdminProductListQuery>) {
  const params = new URLSearchParams({
    limit: String(query.limit ?? 48),
    offset: String(query.offset ?? 0),
  });
  if (query.q) params.set('q', query.q);
  if (query.status) params.set('status', query.status);
  return useQuery({
    queryKey: adminCatalogKeys.products(query),
    queryFn: () =>
      apiRequest(`/api/admin/products?${params.toString()}`, adminProductListResponseSchema),
    placeholderData: keepPreviousData,
  });
}

export function useAdminProduct(id: string | undefined) {
  return useQuery({
    queryKey: adminCatalogKeys.product(id ?? 'new'),
    queryFn: () => apiRequest(`/api/admin/products/${id ?? ''}`, adminProductSchema),
    enabled: Boolean(id),
  });
}

export function useDictionaries() {
  return useQuery({
    queryKey: adminCatalogKeys.dictionaries,
    queryFn: () => apiRequest('/api/admin/dictionaries', dictionariesResponseSchema),
  });
}

export function useNoteNames() {
  return useQuery({
    queryKey: adminCatalogKeys.notes,
    queryFn: async () =>
      (await apiRequest('/api/admin/notes', z.object({ names: z.array(z.string()) }))).names,
    staleTime: 60_000,
  });
}

/** Каталог витрины тоже меняется: его кеш сбрасываем вместе с админским. */
function useInvalidateCatalog() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: adminCatalogKeys.all });
    void queryClient.invalidateQueries({ queryKey: ['products'] });
    void queryClient.invalidateQueries({ queryKey: productKeys.filters });
    void queryClient.invalidateQueries({ queryKey: productKeys.home });
  };
}

export function useSaveProduct(id: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: (input: AdminProductInput) =>
      apiRequest(id ? `/api/admin/products/${id}` : '/api/admin/products', adminProductSchema, {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (product) => {
      queryClient.setQueryData(adminCatalogKeys.product(product.id), product);
      invalidate();
    },
  });
}

export function useDeleteProduct() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/admin/products/${id}`, z.undefined(), { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

const imagesResponseSchema = z.object({ images: z.array(adminImageSchema) });

/** Снимки товара: загрузка, порядок и подписи, удаление — ответ всегда полный список. */
export function useProductImages(productId: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateCatalog();
  const onSuccess = ({ images }: z.infer<typeof imagesResponseSchema>) => {
    queryClient.setQueryData(
      adminCatalogKeys.product(productId),
      (product: z.infer<typeof adminProductSchema> | undefined) =>
        product ? { ...product, images } : product,
    );
    invalidate();
  };

  const upload = useMutation({
    mutationFn: ({ file, alt }: { file: File; alt: string }) => {
      const form = new FormData();
      // Поле подписи — до файла: сервер читает поля, пришедшие раньше файла.
      form.append('alt', alt);
      form.append('file', file);
      return apiRequest(`/api/admin/products/${productId}/images`, imagesResponseSchema, {
        method: 'POST',
        body: form,
      });
    },
    onSuccess,
  });
  const update = useMutation({
    mutationFn: (input: ImagesUpdate) =>
      apiRequest(`/api/admin/products/${productId}/images`, imagesResponseSchema, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess,
  });
  const remove = useMutation({
    mutationFn: (imageId: string) =>
      apiRequest(`/api/admin/products/${productId}/images/${imageId}`, imagesResponseSchema, {
        method: 'DELETE',
      }),
    onSuccess,
  });
  return { upload, update, remove };
}

export function useSaveDictionaryItem(kind: DictionaryKind) {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    // Тело уже проверено схемой своего вида справочника в форме; сервер проверит его снова.
    mutationFn: ({ id, input }: { id: string | null; input: unknown }) =>
      apiRequest(
        id ? `/api/admin/dictionaries/${kind}/${id}` : `/api/admin/dictionaries/${kind}`,
        z.undefined(),
        { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) },
      ),
    onSuccess: invalidate,
  });
}

export function useDeleteDictionaryItem(kind: DictionaryKind) {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/admin/dictionaries/${kind}/${id}`, z.undefined(), { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
