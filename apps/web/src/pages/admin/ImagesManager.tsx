import type { AdminImage } from '@nisha/contracts';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { useProductImages } from '../../features/admin/catalog-api';
import { ApiError } from '../../shared/api/http';
import { Button } from '../../shared/ui/Button/Button';
import { Input } from '../../shared/ui/Field/Input';
import styles from './Admin.module.css';
import imageStyles from './ImagesManager.module.css';

const errorText = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Не получилось. Попробуйте ещё раз.';

/** Галерея образца: загрузка, подписи (alt), порядок и удаление. Первый снимок — обложка. */
export function ImagesManager({ productId, images }: { productId: string; images: AdminImage[] }) {
  const { upload, update, remove } = useProductImages(productId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState('');
  const [alts, setAlts] = useState<Record<string, string>>({});
  const altOf = (image: AdminImage) => alts[image.id] ?? image.alt;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    upload.mutate(
      { file, alt: alt.trim() },
      {
        onSuccess: () => {
          setAlt('');
          if (fileRef.current) fileRef.current.value = '';
        },
      },
    );
  };

  const save = (order: AdminImage[]) =>
    update.mutate(
      { images: order.map((image) => ({ id: image.id, alt: altOf(image) })) },
      { onSuccess: () => setAlts({}) },
    );

  const move = (index: number, delta: -1 | 1) => {
    const next = [...images];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(index + delta, 0, moved);
    save(next);
  };

  const failed = upload.error ?? update.error ?? remove.error;

  return (
    <section className={styles.panel} aria-labelledby="images-title">
      <h2 id="images-title" className={styles.panelTitle}>
        Снимки
      </h2>
      {images.length === 0 && (
        <p className={styles.muted}>Снимков пока нет — на витрине будет фон по материалу.</p>
      )}
      <ul className={imageStyles.list}>
        {images.map((image, index) => (
          <li key={image.id} className={imageStyles.item}>
            <img src={image.url} alt="" className={imageStyles.preview} />
            <Input
              label={index === 0 ? 'Подпись (обложка)' : 'Подпись'}
              value={altOf(image)}
              onChange={(event) => setAlts({ ...alts, [image.id]: event.target.value })}
            />
            <div className={styles.actions}>
              <Button
                variant="outline"
                size="md"
                aria-label={`Выше: снимок ${index + 1}`}
                disabled={index === 0 || update.isPending}
                onClick={() => move(index, -1)}
              >
                ↑
              </Button>
              <Button
                variant="outline"
                size="md"
                aria-label={`Ниже: снимок ${index + 1}`}
                disabled={index === images.length - 1 || update.isPending}
                onClick={() => move(index, 1)}
              >
                ↓
              </Button>
              <Button
                variant="link"
                size="md"
                disabled={remove.isPending}
                onClick={() => remove.mutate(image.id)}
              >
                Удалить
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {Object.keys(alts).length > 0 && (
        <div>
          <Button size="md" disabled={update.isPending} onClick={() => save(images)}>
            Сохранить подписи
          </Button>
        </div>
      )}

      <form className={styles.grid} onSubmit={submit}>
        <label className={imageStyles.file}>
          <span>Файл (JPEG, PNG или WebP, до&nbsp;10&nbsp;МБ)</span>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" required />
        </label>
        <Input
          label="Что на снимке"
          hint="Это alt: его прочитает скринридер"
          value={alt}
          required
          onChange={(event) => setAlt(event.target.value)}
        />
        <div className={styles.actions}>
          <Button type="submit" size="md" disabled={upload.isPending}>
            {upload.isPending ? 'Загружаем…' : 'Загрузить'}
          </Button>
        </div>
      </form>
      {failed && (
        <p role="alert" className={styles.error}>
          {errorText(failed)}
        </p>
      )}
    </section>
  );
}
