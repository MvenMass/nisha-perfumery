import { categoryInputSchema, collectionInputSchema, materialInputSchema } from '@nisha/contracts';
import type { DictionariesResponse, DictionaryKind } from '@nisha/contracts';
import { useState } from 'react';
import type { FormEvent } from 'react';
import type { z } from 'zod';

import {
  useDeleteDictionaryItem,
  useDictionaries,
  useSaveDictionaryItem,
} from '../../features/admin/catalog-api';
import { ApiError } from '../../shared/api/http';
import { fieldErrors } from '../../shared/lib/form';
import { useMeta } from '../../shared/lib/useMeta';
import { Button } from '../../shared/ui/Button/Button';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { Input } from '../../shared/ui/Field/Input';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import styles from './Admin.module.css';

type Item = DictionariesResponse[DictionaryKind][number];
type Draft = {
  slug: string;
  name: string;
  position: string;
  swatchColor: string;
  description: string;
};

const SECTIONS: Array<{
  kind: DictionaryKind;
  title: string;
  schema: z.ZodType;
  extra: 'swatchColor' | 'description' | null;
}> = [
  { kind: 'materials', title: 'Материалы', schema: materialInputSchema, extra: 'swatchColor' },
  { kind: 'categories', title: 'Категории', schema: categoryInputSchema, extra: null },
  { kind: 'collections', title: 'Коллекции', schema: collectionInputSchema, extra: 'description' },
];

const draftOf = (item: Item | null): Draft => ({
  slug: item?.slug ?? '',
  name: item?.name ?? '',
  position: String(item?.position ?? 0),
  swatchColor: item && 'swatchColor' in item ? item.swatchColor : '#',
  description: item && 'description' in item ? (item.description ?? '') : '',
});

function ItemForm({
  section,
  item,
  onDone,
}: {
  section: (typeof SECTIONS)[number];
  item: Item | null;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState(() => draftOf(item));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useSaveDictionaryItem(section.kind);
  const set = (key: keyof Draft) => (event: { target: { value: string } }) =>
    setDraft((current) => ({ ...current, [key]: event.target.value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const body = {
      slug: draft.slug.trim(),
      name: draft.name,
      position: Number(draft.position) || 0,
      ...(section.extra === 'swatchColor' ? { swatchColor: draft.swatchColor } : {}),
      ...(section.extra === 'description' ? { description: draft.description } : {}),
    };
    // Та же схема, что на сервере; сюда она приходит по виду справочника.
    const parsed = section.schema.safeParse(body);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    save.mutate({ id: item?.id ?? null, input: parsed.data }, { onSuccess: onDone });
  };

  return (
    <form className={styles.grid} onSubmit={submit} noValidate>
      <Input label="Название" value={draft.name} error={errors.name} onChange={set('name')} />
      <Input label="Адрес (slug)" value={draft.slug} error={errors.slug} onChange={set('slug')} />
      <Input
        label="Порядок"
        inputMode="numeric"
        value={draft.position}
        error={errors.position}
        onChange={set('position')}
      />
      {section.extra === 'swatchColor' && (
        <Input
          label="Цвет свотча"
          hint="#RRGGBB"
          value={draft.swatchColor}
          error={errors.swatchColor}
          onChange={set('swatchColor')}
        />
      )}
      {section.extra === 'description' && (
        <Input label="Описание" value={draft.description} onChange={set('description')} />
      )}
      <div className={styles.actions}>
        <Button type="submit" size="md" disabled={save.isPending}>
          Сохранить
        </Button>
        <Button variant="link" size="md" onClick={onDone}>
          Отмена
        </Button>
      </div>
      {save.isError && (
        <p role="alert" className={styles.error}>
          {save.error instanceof ApiError ? save.error.message : 'Не получилось сохранить'}
        </p>
      )}
    </form>
  );
}

function Section({ section, items }: { section: (typeof SECTIONS)[number]; items: Item[] }) {
  // null — форма закрыта, 'new' — новая запись, иначе id редактируемой.
  const [editing, setEditing] = useState<string | null>(null);
  const remove = useDeleteDictionaryItem(section.kind);

  return (
    <section className={styles.panel} aria-labelledby={`dict-${section.kind}`}>
      <div className={styles.head}>
        <h2 id={`dict-${section.kind}`} className={styles.subtitle}>
          {section.title}
        </h2>
        <Button variant="outline" size="md" onClick={() => setEditing('new')}>
          Добавить
        </Button>
      </div>
      {editing === 'new' && (
        <ItemForm section={section} item={null} onDone={() => setEditing(null)} />
      )}
      <ul className={styles.facts}>
        {items.map((item) =>
          editing === item.id ? (
            <li key={item.id}>
              <ItemForm section={section} item={item} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={item.id} className={styles.fact}>
              <span>
                {'swatchColor' in item && (
                  <span
                    aria-hidden="true"
                    className={styles.swatch}
                    style={{ background: item.swatchColor }}
                  />
                )}
                {item.name} <span className={styles.muted}>/{item.slug}</span>
              </span>
              <span className={styles.actions}>
                <span className={styles.muted}>образцов: {item.productsCount}</span>
                <Button variant="link" size="md" onClick={() => setEditing(item.id)}>
                  Изменить
                </Button>
                <Button
                  variant="link"
                  size="md"
                  disabled={item.productsCount > 0 || remove.isPending}
                  aria-label={`Удалить: ${item.name}`}
                  onClick={() => remove.mutate(item.id)}
                >
                  Удалить
                </Button>
              </span>
            </li>
          ),
        )}
      </ul>
      {remove.isError && (
        <p role="alert" className={styles.error}>
          {remove.error instanceof ApiError ? remove.error.message : 'Не получилось удалить'}
        </p>
      )}
    </section>
  );
}

/** Материалы, категории и коллекции; занятую запись удалить нельзя. */
export function DictionariesAdmin() {
  useMeta('Справочники — админка');
  const dictionaries = useDictionaries();

  return (
    <section aria-labelledby="admin-dict-title" className={styles.main}>
      <h1 id="admin-dict-title" className={styles.title}>
        Справочники
      </h1>
      {dictionaries.isPending ? (
        <Skeleton height={400} />
      ) : dictionaries.isError ? (
        <EmptyState icon="alert" title="Не удалось загрузить справочники" />
      ) : (
        SECTIONS.map((section) => (
          <Section key={section.kind} section={section} items={dictionaries.data[section.kind]} />
        ))
      )}
    </section>
  );
}
