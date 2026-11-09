import type { ImgHTMLAttributes } from 'react';

import { responsiveSources } from './responsive';

type PictureProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'> & {
  src: string;
  alt: string;
  /** Ширина снимка на странице для выбора размера: «(min-width: 1024px) 25vw, 50vw». */
  sizes: string;
  /** Снимок первого экрана: грузится сразу и с высоким приоритетом. */
  priority?: boolean | undefined;
};

/**
 * Снимок с выбором размера и формата (D-067): WebP, где он поддерживается, JPEG — для Safari 14
 * на старых macOS. Место под снимок задаёт контейнер, поэтому смены размера не дают сдвига (CLS).
 */
export function Picture({ src, alt, sizes, priority = false, ...rest }: PictureProps) {
  const sources = responsiveSources(src);
  const loading = priority ? 'eager' : 'lazy';
  const img = (
    <img
      {...rest}
      src={src}
      srcSet={sources?.jpeg}
      sizes={sources ? sizes : undefined}
      alt={alt}
      loading={loading}
      decoding="async"
      // fetchpriority React 19 знает в нижнем регистре; Safari 14 атрибут просто игнорирует.
      fetchPriority={priority ? 'high' : undefined}
    />
  );
  if (!sources) return img;
  return (
    // display: contents — снимок раскладывается так, будто <picture> нет: стили рассчитаны на img.
    <picture style={{ display: 'contents' }}>
      <source type="image/webp" srcSet={sources.webp} sizes={sizes} />
      {img}
    </picture>
  );
}
