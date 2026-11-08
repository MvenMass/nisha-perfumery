import type { AdminProduct, DictionariesResponse } from '@nisha/contracts';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { productHref } from '../../entities/product/lib/format';
import {
  useAdminProduct,
  useDeleteProduct,
  useDictionaries,
  useNoteNames,
  useSaveProduct,
} from '../../features/admin/catalog-api';
import { draftFromProduct, emptyDraft, validateProduct } from '../../features/admin/product-form';
import type { ProductDraft } from '../../features/admin/product-form';
import { ApiError } from '../../shared/api/http';
import { useMeta } from '../../shared/lib/useMeta';
import { Button } from '../../shared/ui/Button/Button';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import styles from './Admin.module.css';
import { ImagesManager } from './ImagesManager';
import { ProductFields } from './ProductFields';
import { VariantsFields } from './VariantsFields';

function serverField(error: unknown): Record<string, string> {
  if (error instanceof ApiError && error.code === 'CONFLICT') {
    const details = error.details;
    if (typeof details === 'object' && details !== null && 'field' in details) {
      return { [String(details.field)]: error.message };
    }
  }
  return {};
}

function Editor({
  product,
  dictionaries,
  noteNames,
}: {
  product: AdminProduct | undefined;
  dictionaries: DictionariesResponse;
  noteNames: string[];
}) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ProductDraft>(() =>
    product ? draftFromProduct(product) : emptyDraft(dictionaries.materials[0]?.id ?? ''),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useSaveProduct(product?.id);
  const remove = useDeleteProduct();
  const patch = (next: Partial<ProductDraft>) => setDraft((current) => ({ ...current, ...next }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateProduct(draft);
    if (!result.ok) {
      setErrors(result.errors);
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('main [aria-invalid="true"]')?.focus();
      });
      return;
    }
    setErrors({});
    save.mutate(result.input, {
      onSuccess: (saved) => {
        setDraft(draftFromProduct(saved));
        if (!product) void navigate(`/admin/products/${saved.id}`, { replace: true });
      },
      onError: (error) => setErrors(serverField(error)),
    });
  };

  return (
    <>
      <form className={styles.main} onSubmit={submit} noValidate>
        <ProductFields
          draft={draft}
          onChange={patch}
          errors={errors}
          dictionaries={dictionaries}
          noteNames={noteNames}
        />
        <VariantsFields
          variants={draft.variants}
          onChange={(variants) => patch({ variants })}
          errors={errors}
        />
        {save.isError && Object.keys(serverField(save.error)).length === 0 && (
          <p role="alert" className={styles.error}>
            {save.error instanceof ApiError ? save.error.message : 'Не получилось сохранить'}
          </p>
        )}
        {save.isSuccess && (
          <p role="status" className={styles.ok}>
            Сохранено.
          </p>
        )}
        <div className={styles.actions}>
          <Button type="submit" size="lg" disabled={save.isPending}>
            {save.isPending ? 'Сохраняем…' : 'Сохранить'}
          </Button>
          {product?.isPublished && (
            <Link to={productHref(product.slug)} className={styles.link}>
              Открыть на витрине
            </Link>
          )}
        </div>
      </form>

      {product && <ImagesManager productId={product.id} images={product.images} />}

      {product && !product.isPublished && !product.hasOrders && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Удаление</h2>
          <p className={styles.muted}>Черновик без заказов можно удалить совсем.</p>
          <div>
            <Button
              variant="outline"
              size="md"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(product.id, {
                  onSuccess: () => void navigate('/admin/products', { replace: true }),
                })
              }
            >
              Удалить черновик
            </Button>
          </div>
          {remove.isError && (
            <p role="alert" className={styles.error}>
              {remove.error instanceof ApiError ? remove.error.message : 'Не получилось удалить'}
            </p>
          )}
        </div>
      )}
    </>
  );
}

/** Создание (/admin/products/new) и правка образца. */
export function ProductEditor() {
  const { productId } = useParams();
  const id = productId === 'new' ? undefined : productId;
  const product = useAdminProduct(id);
  const dictionaries = useDictionaries();
  const notes = useNoteNames();
  useMeta(product.data ? `${product.data.name} — админка` : 'Новый образец — админка');

  const loading = (id && product.isPending) || dictionaries.isPending;
  const failed = (id && product.isError) || dictionaries.isError;

  return (
    <section aria-labelledby="product-editor-title" className={styles.main}>
      <Link to="/admin/products" className={styles.link}>
        ← Все образцы
      </Link>
      <h1 id="product-editor-title" className={styles.title}>
        {product.data ? product.data.name : id ? 'Образец' : 'Новый образец'}
      </h1>
      {loading ? (
        <Skeleton height={600} />
      ) : failed || !dictionaries.data ? (
        <EmptyState icon="alert" title="Не удалось загрузить образец" />
      ) : (
        // key: после создания страница переходит на id — форма должна начаться с данных сервера.
        <Editor
          key={product.data?.id ?? 'new'}
          product={product.data}
          dictionaries={dictionaries.data}
          noteNames={notes.data ?? []}
        />
      )}
    </section>
  );
}
