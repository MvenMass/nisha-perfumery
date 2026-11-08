import { heroSlideInputSchema } from '@nisha/contracts';
import type { AdminHeroSlide, HeroSlideInput } from '@nisha/contracts';
import { useState } from 'react';
import type { FormEvent } from 'react';

import {
  useAdminSlides,
  useDeleteSlide,
  useReorderSlides,
  useSaveSlide,
} from '../../features/admin/content-api';
import { ApiError } from '../../shared/api/http';
import { fieldErrors } from '../../shared/lib/form';
import { useMeta } from '../../shared/lib/useMeta';
import { Badge } from '../../shared/ui/Badge/Badge';
import { Button } from '../../shared/ui/Button/Button';
import { Checkbox } from '../../shared/ui/Checkbox/Checkbox';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { Input } from '../../shared/ui/Field/Input';
import { Textarea } from '../../shared/ui/Field/Textarea';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import styles from './Admin.module.css';
import { ImageUploadField } from './ImageUploadField';

const EMPTY: HeroSlideInput = {
  label: 'Глубина 0\u00A0м',
  title: '',
  text: '',
  ctaLabel: 'Смотреть образцы',
  ctaHref: '/catalog',
  imageUrl: null,
  imageAlt: '',
  isPublished: false,
};

function SlideForm({ slide, onDone }: { slide: AdminHeroSlide | null; onDone: () => void }) {
  const [draft, setDraft] = useState<HeroSlideInput>(() => {
    if (!slide) return EMPTY;
    const { id: _id, position: _position, ...input } = slide;
    return input;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useSaveSlide();
  const set = (key: keyof HeroSlideInput) => (event: { target: { value: string } }) =>
    setDraft((current) => ({ ...current, [key]: event.target.value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = heroSlideInputSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    save.mutate({ id: slide?.id ?? null, input: parsed.data }, { onSuccess: onDone });
  };

  return (
    <form className={styles.panel} onSubmit={submit} noValidate>
      <div className={styles.grid}>
        <Input
          label="Подпись глубины"
          value={draft.label}
          error={errors.label}
          onChange={set('label')}
        />
        <Input label="Заголовок" value={draft.title} error={errors.title} onChange={set('title')} />
        <Input
          label="Кнопка"
          value={draft.ctaLabel}
          error={errors.ctaLabel}
          onChange={set('ctaLabel')}
        />
        <Input
          label="Ссылка кнопки"
          hint="Путь на сайте: /catalog, /catalog/basalt"
          value={draft.ctaHref}
          error={errors.ctaHref}
          onChange={set('ctaHref')}
        />
      </div>
      <Textarea
        label="Текст"
        rows={3}
        value={draft.text}
        error={errors.text}
        onChange={set('text')}
      />
      <div className={styles.grid}>
        <ImageUploadField
          label="Снимок слайда"
          url={draft.imageUrl}
          onChange={(imageUrl) => setDraft((current) => ({ ...current, imageUrl }))}
        />
        <Input
          label="Что на снимке"
          hint="alt; если снимка ещё нет — описание будущего кадра"
          value={draft.imageAlt}
          error={errors.imageAlt}
          onChange={set('imageAlt')}
        />
      </div>
      <Checkbox
        label="Показывать на главной"
        checked={draft.isPublished}
        onChange={(event) =>
          setDraft((current) => ({ ...current, isPublished: event.target.checked }))
        }
      />
      {save.isError && (
        <p role="alert" className={styles.error}>
          {save.error instanceof ApiError ? save.error.message : 'Не получилось сохранить'}
        </p>
      )}
      <div className={styles.actions}>
        <Button type="submit" size="md" disabled={save.isPending}>
          Сохранить
        </Button>
        <Button variant="link" size="md" onClick={onDone}>
          Отмена
        </Button>
      </div>
    </form>
  );
}

/** Слайды первого экрана: порядок, тексты, снимки, показ. */
export function SlidesAdmin() {
  useMeta('Главная — админка');
  const slides = useAdminSlides();
  const reorder = useReorderSlides();
  const remove = useDeleteSlide();
  const [editing, setEditing] = useState<string | null>(null);

  const move = (list: AdminHeroSlide[], index: number, delta: -1 | 1) => {
    const ids = list.map((slide) => slide.id);
    const [moved] = ids.splice(index, 1);
    if (!moved) return;
    ids.splice(index + delta, 0, moved);
    reorder.mutate(ids);
  };

  let content;
  if (slides.isPending) content = <Skeleton height={320} />;
  else if (slides.isError)
    content = <EmptyState icon="alert" title="Не удалось загрузить слайды" />;
  else
    content = (
      <ol className={styles.main}>
        {slides.data.map((slide, index) =>
          editing === slide.id ? (
            <li key={slide.id}>
              <SlideForm slide={slide} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={slide.id} className={styles.panel}>
              <div className={styles.head}>
                <div>
                  <p className={styles.panelTitle}>
                    {index + 1}. {slide.label}
                  </p>
                  <h2 className={styles.subtitle}>{slide.title}</h2>
                </div>
                <Badge tone={slide.isPublished ? 'light' : 'outline'}>
                  {slide.isPublished ? 'На главной' : 'Скрыт'}
                </Badge>
              </div>
              <p className={styles.muted}>{slide.text}</p>
              <div className={styles.actions}>
                <Button variant="outline" size="md" onClick={() => setEditing(slide.id)}>
                  Изменить
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  aria-label={`Выше: ${slide.title}`}
                  disabled={index === 0 || reorder.isPending}
                  onClick={() => move(slides.data, index, -1)}
                >
                  ↑
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  aria-label={`Ниже: ${slide.title}`}
                  disabled={index === slides.data.length - 1 || reorder.isPending}
                  onClick={() => move(slides.data, index, 1)}
                >
                  ↓
                </Button>
                <Button
                  variant="link"
                  size="md"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(slide.id)}
                >
                  Удалить
                </Button>
              </div>
            </li>
          ),
        )}
      </ol>
    );

  return (
    <section aria-labelledby="admin-slides-title" className={styles.main}>
      <div className={styles.head}>
        <h1 id="admin-slides-title" className={styles.title}>
          Слайды главной
        </h1>
        <Button size="md" onClick={() => setEditing('new')}>
          Новый слайд
        </Button>
      </div>
      {editing === 'new' && <SlideForm slide={null} onDone={() => setEditing(null)} />}
      {content}
    </section>
  );
}
