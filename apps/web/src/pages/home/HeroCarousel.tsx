import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';

import { ButtonLink } from '../../shared/ui/Button/Button';
import { Container } from '../../shared/ui/Container/Container';
import { IconButton } from '../../shared/ui/IconButton/IconButton';
import { HERO_SLIDES } from './home-content';
import styles from './HeroCarousel.module.css';

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Первый экран: карусель из трёх слайдов и «свет-лампа». Свет — затемнение со «световым пятном»,
 * которое двигается за курсором через transform (без перерисовки градиента). На сенсорных экранах
 * пятно медленно дрейфует само (CSS), при reduced motion стоит по центру. GSAP — в этапе 9.
 */
export function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const shadeRef = useRef<HTMLDivElement>(null);
  const slide = HERO_SLIDES[index] ?? HERO_SLIDES[0];
  if (!slide) return null;

  const go = (delta: number) =>
    setIndex((current) => (current + delta + HERO_SLIDES.length) % HERO_SLIDES.length);

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
          aria-label={`${index + 1} из ${HERO_SLIDES.length}`}
          aria-live="polite"
        >
          <div className={styles.copy}>
            <p className={styles.label}>{slide.label}</p>
            {/* h1 страницы — заголовок слайда: он и есть главное сообщение первого экрана. */}
            <h1 className={styles.title}>{slide.title}</h1>
            <p className={styles.lead}>{slide.text}</p>
            <ButtonLink to={slide.cta.to} iconEnd="arrow-right" className={styles.cta}>
              {slide.cta.label}
            </ButtonLink>
          </div>
          <div className={styles.controls}>
            <IconButton icon="arrow-left" label="Предыдущий слайд" onClick={() => go(-1)} />
            <p className={styles.indicator}>
              <span className={styles.current}>{pad(index + 1)}</span>
              <span aria-hidden="true" className={styles.indicatorLine} />
              <span>{pad(HERO_SLIDES.length)}</span>
            </p>
            <IconButton icon="arrow-right" label="Следующий слайд" onClick={() => go(1)} />
          </div>
        </div>

        <figure className={styles.figure} onPointerMove={moveLight}>
          <div role="img" aria-label={slide.photoAlt} className={styles.photo} />
          <div ref={shadeRef} aria-hidden="true" className={styles.shade} />
          <p aria-hidden="true" className={styles.hint}>
            Ведите курсором&nbsp;— свет проявит флакон
          </p>
        </figure>
      </Container>
    </section>
  );
}
