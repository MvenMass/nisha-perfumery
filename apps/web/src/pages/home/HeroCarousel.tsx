import type { HeroSlide } from '@nisha/contracts';
import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';

import { ButtonLink } from '../../shared/ui/Button/Button';
import { Container } from '../../shared/ui/Container/Container';
import { IconButton } from '../../shared/ui/IconButton/IconButton';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import { FALLBACK_SLIDE } from './home-content';
import styles from './HeroCarousel.module.css';
import { Picture } from '../../shared/ui/Picture/Picture';

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Первый экран: карусель из трёх слайдов и «свет-лампа». Свет — затемнение со «световым пятном»,
 * которое двигается за курсором через transform (без перерисовки градиента). На сенсорных экранах
 * пятно медленно дрейфует само (CSS), при reduced motion стоит по центру. GSAP — в этапе 9.
 */
export function HeroCarousel({
  slides: loaded,
  pending,
}: {
  slides: HeroSlide[] | undefined;
  pending: boolean;
}) {
  const [index, setIndex] = useState(0);
  const shadeRef = useRef<HTMLDivElement>(null);
  const slides = loaded && loaded.length > 0 ? loaded : [FALLBACK_SLIDE];
  const slide = slides[index] ?? slides[0] ?? FALLBACK_SLIDE;

  const go = (delta: number) =>
    setIndex((current) => (current + delta + slides.length) % slides.length);

  const moveLight = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse' || !shadeRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    shadeRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  return (
    <section className={styles.hero} aria-roledescription="карусель" aria-label="Ароматы дома">
      <Container className={styles.inner}>
        <div
          className={styles.text}
          role="group"
          aria-roledescription="слайд"
          aria-label={`${index + 1} из ${slides.length}`}
          aria-live="polite"
        >
          {pending ? (
            // Пока слайды грузятся — каркас той же высоты: заголовок не прыгает (CLS).
            <div className={styles.copy} aria-busy="true">
              <Skeleton width="40%" height={14} />
              <Skeleton width="90%" height={120} />
              <Skeleton width="70%" height={48} />
            </div>
          ) : (
            <div className={styles.copy}>
              <p className={styles.label}>{slide.label}</p>
              {/* h1 страницы — заголовок слайда: он и есть главное сообщение первого экрана. */}
              <h1 className={styles.title}>{slide.title}</h1>
              <p className={styles.lead}>{slide.text}</p>
              <ButtonLink to={slide.ctaHref} iconEnd="arrow-right" className={styles.cta}>
                {slide.ctaLabel}
              </ButtonLink>
            </div>
          )}
          {slides.length > 1 && (
            <div className={styles.controls}>
              <IconButton icon="arrow-left" label="Предыдущий слайд" onClick={() => go(-1)} />
              <p className={styles.indicator}>
                <span className={styles.current}>{pad(index + 1)}</span>
                <span aria-hidden="true" className={styles.indicatorLine} />
                <span>{pad(slides.length)}</span>
              </p>
              <IconButton icon="arrow-right" label="Следующий слайд" onClick={() => go(1)} />
            </div>
          )}
        </div>

        <figure className={styles.figure} onPointerMove={moveLight}>
          {slide.imageUrl ? (
            <Picture
              src={slide.imageUrl}
              alt={slide.imageAlt}
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority
              className={styles.photo}
            />
          ) : (
            <div role="img" aria-label={slide.imageAlt} className={styles.photo} />
          )}
          <div ref={shadeRef} aria-hidden="true" className={styles.shade} />
          <p aria-hidden="true" className={styles.hint}>
            Ведите курсором&nbsp;— свет проявит флакон
          </p>
        </figure>
      </Container>
    </section>
  );
}
