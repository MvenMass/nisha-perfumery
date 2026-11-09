import type { HeroSlide } from '@nisha/contracts';
import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';

import { cx } from '../../shared/lib/cx';
import { useGsap } from '../../shared/lib/motion/useGsap';
import { ButtonLink } from '../../shared/ui/Button/Button';
import { Container } from '../../shared/ui/Container/Container';
import { IconButton } from '../../shared/ui/IconButton/IconButton';
import { Picture } from '../../shared/ui/Picture/Picture';
import { FALLBACK_SLIDE } from './home-content';
import styles from './HeroCarousel.module.css';

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Первый экран: карусель слайдов и «свет-лампа». Свет — затемнение со «световым пятном»,
 * которое двигается за курсором через transform (без перерисовки градиента): с GSAP — плавно
 * догоняет курсор (quickTo), до его загрузки — CSS-переходом. На сенсорных экранах пятно медленно
 * дрейфует само, при reduced motion стоит по центру.
 *
 * Появление флакона и текста — CSS-анимация, без GSAP: первый экран не ждёт загрузки скрипта.
 */
export function HeroCarousel({
  slides: loaded,
  pending,
}: {
  slides: HeroSlide[] | undefined;
  pending: boolean;
}) {
  const [index, setIndex] = useState(0);
  const figureRef = useRef<HTMLElement>(null);
  const shadeRef = useRef<HTMLDivElement>(null);
  // Когда GSAP загружен, свет догоняет курсор через quickTo; до этого — прямой transform.
  const followRef = useRef<((x: number, y: number) => void) | null>(null);

  useGsap(figureRef, ({ gsap }) => {
    const shade = shadeRef.current;
    if (!shade) return;
    // CSS-переход больше не нужен: плавность даёт GSAP, иначе они спорили бы за transform.
    gsap.set(shade, { transition: 'none' });
    const toX = gsap.quickTo(shade, 'x', { duration: 0.6, ease: 'power3.out' });
    const toY = gsap.quickTo(shade, 'y', { duration: 0.6, ease: 'power3.out' });
    followRef.current = (x, y) => {
      toX(x);
      toY(y);
    };
    return () => {
      followRef.current = null;
    };
  });
  const slides = loaded && loaded.length > 0 ? loaded : [FALLBACK_SLIDE];
  const slide = slides[index] ?? slides[0] ?? FALLBACK_SLIDE;

  const go = (delta: number) =>
    setIndex((current) => (current + delta + slides.length) % slides.length);

  const moveLight = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse' || !shadeRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    if (followRef.current) followRef.current(x, y);
    else shadeRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
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
            // Пока слайды грузятся, место занимает невидимый запасной слайд той же разметки:
            // высота совпадает, и текст с фото не прыгают, когда придут данные (CLS).
            <div className={cx(styles.copy, styles.placeholder)} aria-hidden="true">
              <p className={styles.label}>{FALLBACK_SLIDE.label}</p>
              <p className={styles.title}>{FALLBACK_SLIDE.title}</p>
              <p className={styles.lead}>{FALLBACK_SLIDE.text}</p>
              <span className={styles.ctaPlaceholder} />
            </div>
          ) : (
            // key — анимация появления заново при каждой смене слайда.
            <div key={slide.id} className={cx(styles.copy, styles.enter)}>
              <p className={styles.label}>{slide.label}</p>
              {/* h1 страницы — заголовок слайда: он и есть главное сообщение первого экрана. */}
              <h1 className={styles.title}>{slide.title}</h1>
              <p className={styles.lead}>{slide.text}</p>
              <ButtonLink to={slide.ctaHref} iconEnd="arrow-right" className={styles.cta}>
                {slide.ctaLabel}
              </ButtonLink>
            </div>
          )}
          {(pending || slides.length > 1) && (
            <div
              className={cx(styles.controls, pending && styles.placeholder)}
              aria-hidden={pending}
            >
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

        <figure ref={figureRef} className={styles.figure} onPointerMove={moveLight}>
          {slide.imageUrl ? (
            <Picture
              key={slide.id}
              src={slide.imageUrl}
              alt={slide.imageAlt}
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority
              className={styles.photo}
            />
          ) : (
            <div key={slide.id} role="img" aria-label={slide.imageAlt} className={styles.photo} />
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
