import type { Image } from '@nisha/contracts';
import { useState } from 'react';

import { cx } from '../../shared/lib/cx';
import { IconButton } from '../../shared/ui/IconButton/IconButton';
import { Sheet } from '../../shared/ui/Sheet/Sheet';
import styles from './ProductPage.module.css';
import { Picture } from '../../shared/ui/Picture/Picture';

type ProductGalleryProps = {
  images: Image[];
  /** Подпись для заглушки, пока снимков нет: «Флакон «Базальт» на срезе базальта». */
  placeholderAlt: string;
};

const pad = (value: number) => String(value).padStart(2, '0');

export function ProductGallery({ images, placeholderAlt }: ProductGalleryProps) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const current = images[index];

  if (!current) {
    // Фото ещё не загружены — фон из макета с описанием будущего снимка.
    return (
      <div className={styles.gallery}>
        <div
          role="img"
          aria-label={placeholderAlt}
          className={cx(styles.photo, styles.placeholder)}
        />
      </div>
    );
  }

  return (
    <div className={styles.gallery}>
      {images.length > 1 && (
        <ul className={styles.thumbs} aria-label="Фотографии">
          {images.map((image, imageIndex) => (
            <li key={image.url}>
              <button
                type="button"
                className={styles.thumb}
                aria-label={`Фото ${imageIndex + 1} из ${images.length}`}
                aria-pressed={imageIndex === index}
                onClick={() => setIndex(imageIndex)}
              >
                <Picture src={image.url} alt="" sizes="80px" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <figure className={styles.photo}>
        <Picture
          src={current.url}
          alt={current.alt}
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
          className={styles.photoImage}
        />
        {images.length > 1 && (
          <span className={styles.counter} aria-hidden="true">
            {pad(index + 1)} / {pad(images.length)}
          </span>
        )}
        <IconButton
          icon="expand"
          label="Увеличить фото"
          className={styles.zoom}
          aria-haspopup="dialog"
          onClick={() => setZoomed(true)}
        />
      </figure>
      <Sheet open={zoomed} onClose={() => setZoomed(false)} title="Фото" side="bottom">
        <Picture src={current.url} alt={current.alt} sizes="100vw" className={styles.zoomImage} />
      </Sheet>
    </div>
  );
}
