import type { ArticlePreview, ProductDetail, ProductListItem, StoreInfo } from '@nisha/contracts';
import { useRef } from 'react';
import { Link } from 'react-router';

import { formatSpecimenNumber, productHref } from '../../entities/product/lib/format';
import { cx } from '../../shared/lib/cx';
import { formatPrice } from '../../shared/lib/money';
import { useDesktopMotion } from '../../shared/lib/motion/useDesktopMotion';
import { useCascade } from '../../shared/lib/motion/useCascade';
import { useGsap } from '../../shared/lib/motion/useGsap';
import { typograph } from '../../shared/lib/typograph';
import { ButtonLink } from '../../shared/ui/Button/Button';
import { Container } from '../../shared/ui/Container/Container';
import { Icon } from '../../shared/ui/Icon/Icon';
import { SectionLabel } from '../../shared/ui/SectionLabel/SectionLabel';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import { NotesPyramid } from '../../widgets/notes-pyramid/NotesPyramid';
import { ShopProductCard } from '../../widgets/product-card/ShopProductCard';
import { CATEGORY_TILES, PROCESS_STEPS } from './home-content';
import styles from './HomePage.module.css';

export function Advantages({ store }: { store: StoreInfo | undefined }) {
  const items = [
    {
      icon: 'shield',
      title: 'Собственная мастерская',
      text: 'Каждую композицию собираем сами, без посредников',
    },
    {
      icon: 'box',
      title: 'Бесплатная доставка',
      text: store
        ? `По\u00A0России от\u00A0${formatPrice(store.freeDeliveryThresholdKopecks)}: курьером или в\u00A0пункт выдачи`
        : 'По\u00A0России: курьером или в\u00A0пункт выдачи',
    },
    { icon: 'gift', title: 'Подарочная упаковка', text: 'Каждый заказ упаковываем вручную' },
    { icon: 'drop', title: 'Подбор аромата', text: 'Поможем найти аромат под ваш характер' },
  ] as const;
  return (
    <section aria-label="Преимущества" className={styles.advantages}>
      <Container>
        <ul className={styles.advantagesList}>
          {items.map((item) => (
            <li key={item.title} className={styles.advantage}>
              <Icon name={item.icon} size={36} className={styles.advantageIcon} />
              <div className={styles.advantageText}>
                <p className={styles.advantageTitle}>{item.title}</p>
                <p className={styles.advantageNote}>{item.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export function Categories() {
  return (
    <section aria-label="Категории">
      <ul className={styles.categories}>
        {CATEGORY_TILES.map((tile) => (
          <li key={tile.slug}>
            <Link
              to={`/catalog?category=${tile.slug}`}
              className={cx(styles.category, styles[tile.tone])}
            >
              <span role="img" aria-label={tile.photoAlt} className={styles.categoryPhoto} />
              <span className={styles.categoryTitle}>{tile.title}</span>
              <span className={styles.categoryMore}>
                Смотреть <Icon name="arrow-right" size={16} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Specimens({ items, pending }: { items: ProductListItem[]; pending: boolean }) {
  const rowRef = useRef<HTMLUListElement>(null);
  // Сцена строится, когда вместо скелетонов пришли карточки.
  useCascade(rowRef, [pending]);

  return (
    <section id="specimens" aria-labelledby="specimens-title" className={styles.specimens}>
      <Container className={styles.sectionInner}>
        <div className={styles.sectionHead}>
          <div className={styles.headText}>
            <SectionLabel>Коллекция образцов · бестселлеры</SectionLabel>
            <h2 id="specimens-title" className={styles.sectionTitle} data-reveal="text">
              Образцы породы
            </h2>
          </div>
          <Link to="/catalog" className={styles.headLink}>
            Весь каталог
          </Link>
        </div>
        <ul ref={rowRef} className={styles.specimenRow} aria-busy={pending}>
          {pending
            ? Array.from({ length: 4 }, (_, index) => (
                <li key={index}>
                  <Skeleton height={520} />
                </li>
              ))
            : items.map((item) => (
                <li key={item.id}>
                  <ShopProductCard item={item} specimenRows withFavorite />
                </li>
              ))}
        </ul>
      </Container>
    </section>
  );
}

/** Сцена закрепляется по центру экрана; если секция выше окна — от верхнего края. */
function pinStart(section: HTMLElement): string {
  return section.offsetHeight > window.innerHeight ? 'top top' : 'center center';
}

export function CrossSection({ product }: { product: ProductDetail }) {
  const sectionRef = useRef<HTMLElement>(null);
  const desktop = useDesktopMotion();
  // Десктоп: секция закрепляется, и прокрутка «бурит» керн — слои раскрываются по одному,
  // а шкала времени отсчитывает, когда звучит каждый. На телефоне — раскрытие пирамиды.
  useGsap(
    sectionRef,
    ({ gsap, ScrollTrigger }, section) => {
      if (!desktop) return;
      const layers = section.querySelectorAll('[data-pyramid-layer]');
      const ticks = section.querySelectorAll('[data-pyramid-tick]');
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: () => pinStart(section),
          end: '+=120%',
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });
      timeline
        .from(layers, { opacity: 0, yPercent: -40, duration: 1, stagger: 1, ease: 'power2.out' }, 0)
        .from(ticks, { opacity: 0, duration: 0.4, stagger: 1 }, 0);
      // Закрепление добавляет высоту: сцены ниже должны пересчитаться после него.
      ScrollTrigger.sort();
    },
    [desktop],
  );

  return (
    <section ref={sectionRef} aria-labelledby="cross-title" className={styles.cross}>
      <Container className={styles.split}>
        <div className={styles.splitText}>
          <SectionLabel>
            Срез аромата · образец №&nbsp;{formatSpecimenNumber(product.specimenNumber)}
          </SectionLabel>
          <h2 id="cross-title" className={styles.sectionTitle} data-reveal="text">
            {product.name} в&nbsp;разрезе
          </h2>
          <p className={styles.muted}>
            Аромат раскрывается слоями, как порода в&nbsp;керне. Сначала лёгкая поверхность, потом
            плотное сердце, а&nbsp;глубже всего&nbsp;— основание, которое держится дольше
            остального.
          </p>
          <Link to={productHref(product.slug)} className={styles.accentLink}>
            Открыть образец <Icon name="arrow-right" size={16} />
          </Link>
        </div>
        <NotesPyramid
          name={product.name}
          notes={product.notes}
          layers={product.layers}
          revealOnScroll={!desktop}
          className={styles.splitWide}
        />
      </Container>
    </section>
  );
}

export function About() {
  return (
    <section aria-labelledby="about-title" className={styles.about}>
      <Container className={styles.aboutInner}>
        <SectionLabel>
          <span id="about-title">О&nbsp;доме</span>
        </SectionLabel>
        <p className={styles.aboutQuote} data-reveal="text">
          Камень помнит всё, что с&nbsp;ним случилось: воду, давление, время. Мы&nbsp;хотим, чтобы
          аромат помнил так&nbsp;же.
        </p>
        <div className={styles.aboutColumns}>
          <p className={styles.muted}>
            Небольшая мастерская, где каждая композиция начинается с&nbsp;материала, а&nbsp;не
            с&nbsp;тренда. Мы&nbsp;работаем медленно и&nbsp;выпускаем немного.
          </p>
          <p className={styles.muted}>
            Флаконы выдуваются из&nbsp;янтарного стекла вручную, поэтому каждый чуть
            отличается&nbsp;— как срез породы.
          </p>
        </div>
      </Container>
    </section>
  );
}

export function Process() {
  const sectionRef = useRef<HTMLElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const desktop = useDesktopMotion();

  // Десктоп: секция закрепляется, линия идёт от этапа к этапу, каждый проявляется, когда
  // линия до него дошла, а его точка «загорается».
  useGsap(
    sectionRef,
    ({ gsap, ScrollTrigger }, section) => {
      const wrap = stepsRef.current;
      const progress = wrap?.querySelector(`.${styles.stepsProgress}`);
      if (!desktop || !wrap || !progress) return;
      const steps = wrap.querySelectorAll(`.${styles.step}`);
      const dots = wrap.querySelectorAll(`.${styles.stepDot}`);
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: () => pinStart(section),
          end: '+=110%',
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });
      timeline
        .from(progress, { scaleX: 0, ease: 'none', duration: steps.length }, 0)
        .from(steps, { opacity: 0, y: 28, duration: 0.6, stagger: 1, ease: 'power2.out' }, 0)
        .from(dots, { scale: 0, duration: 0.3, stagger: 1, ease: 'back.out(3)' }, 0.2);
      ScrollTrigger.sort();
    },
    [desktop],
  );

  // Телефон и планшет: линия заполняется по прокрутке, без закрепления.
  useGsap(
    stepsRef,
    ({ gsap }, wrap) => {
      const progress = wrap.querySelector(`.${styles.stepsProgress}`);
      const steps = wrap.querySelectorAll(`.${styles.step}`);
      if (desktop || !progress) return;
      const media = gsap.matchMedia();
      // Ось линии зависит от раскладки: вертикальная на телефоне, горизонтальная с 1024 px.
      for (const [query, axis] of [
        ['(max-width: 1023px)', 'scaleY'],
        ['(min-width: 1024px)', 'scaleX'],
      ] as const) {
        media.add(query, () => {
          const timeline = gsap.timeline({
            scrollTrigger: { trigger: wrap, start: 'top 75%', end: 'bottom 60%', scrub: 0.6 },
          });
          timeline.from(progress, { [axis]: 0, ease: 'none', duration: steps.length });
          steps.forEach((step, index) => {
            timeline.from(step, { opacity: 0, y: 16, duration: 0.6 }, index);
          });
        });
      }
    },
    [desktop],
  );

  return (
    <section
      ref={sectionRef}
      id="process"
      aria-labelledby="process-title"
      className={styles.process}
    >
      <Container className={styles.sectionInner}>
        <div className={styles.sectionHead}>
          <div className={styles.headText}>
            <SectionLabel>Мастерская</SectionLabel>
            <h2 id="process-title" className={styles.sectionTitle} data-reveal="text">
              Как рождается аромат
            </h2>
          </div>
          <p className={cx(styles.muted, styles.headNote)}>
            От&nbsp;куска камня в&nbsp;руке до&nbsp;флакона на&nbsp;полке&nbsp;— пять этапов
            и&nbsp;несколько месяцев работы.
          </p>
        </div>
        <div ref={stepsRef} className={styles.stepsWrap}>
          <span aria-hidden="true" className={styles.stepsProgress} />
          <ol className={styles.steps}>
            {PROCESS_STEPS.map((step, index) => (
              <li key={step.title} className={styles.step}>
                <span aria-hidden="true" className={styles.stepDot} />
                <Icon name={step.icon} size={40} className={styles.stepIcon} />
                <span className={styles.stepNumber}>
                  {String(index + 1).padStart(2, '0')} /{' '}
                  {String(PROCESS_STEPS.length).padStart(2, '0')}
                </span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepText}>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}

export function Materials() {
  return (
    <section aria-labelledby="materials-title" className={styles.materials}>
      <Container className={styles.materialsInner}>
        <div
          role="img"
          aria-label="Крупный план приглушённого травертина: поры, естественные неровности, тень от флакона"
          className={styles.materialsPhoto}
          data-reveal="media"
          data-parallax
        >
          <span data-reveal-layer className={styles.materialsFill} />
        </div>
        <div className={styles.materialsText}>
          <SectionLabel>Материалы</SectionLabel>
          <h2 id="materials-title" className={styles.sectionTitle} data-reveal="text">
            Травертин: камень с&nbsp;дыханием
          </h2>
          <p className={styles.onWalnut}>
            Пористая порода из&nbsp;горячих источников. Мы&nbsp;искали в&nbsp;ней запах влажной
            извести и&nbsp;тёплого солнца на&nbsp;фасаде&nbsp;— и&nbsp;нашли его в&nbsp;сочетании
            ириса и&nbsp;минеральных аккордов.
          </p>
          <Link to="/catalog?material=travertine" className={styles.accentLink}>
            Образцы из&nbsp;травертина <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </Container>
    </section>
  );
}

/** Превью журнала: три последние статьи из БД; пока статей нет, секции нет. */
export function Journal({ articles }: { articles: ArticlePreview[] }) {
  if (articles.length === 0) return null;
  return (
    <section id="journal" aria-labelledby="journal-title" className={styles.journal}>
      <Container className={styles.sectionInner}>
        <div className={styles.sectionHead}>
          <h2 id="journal-title" className={styles.sectionTitle} data-reveal="text">
            Искусство, скрытое в&nbsp;деталях
          </h2>
          <Link to="/journal" className={styles.headLink}>
            Весь журнал
          </Link>
        </div>
        <ul className={styles.articles}>
          {articles.map((article) => (
            <li key={article.slug} className={styles.article}>
              <SectionLabel tone="muted">{article.tag}</SectionLabel>
              <h3 className={styles.articleTitle}>
                <Link to={`/journal/${article.slug}`} className={styles.articleLink}>
                  {typograph(article.title)}
                </Link>
              </h3>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export function Boutique({ store }: { store: StoreInfo | undefined }) {
  return (
    <section id="atelier" aria-labelledby="boutique-title" className={styles.boutique}>
      <Container className={styles.split}>
        <div className={styles.splitText}>
          <SectionLabel>Бутик</SectionLabel>
          <h2 id="boutique-title" className={styles.sectionTitle} data-reveal="text">
            Знакомьтесь с&nbsp;ароматами вживую
          </h2>
          {store && (
            <ul className={styles.boutiqueFacts}>
              <li>
                <Icon name="pin" size={20} className={styles.advantageIcon} />
                {store.boutiqueAddress}
              </li>
              <li>
                <Icon name="clock" size={20} className={styles.advantageIcon} />
                {store.boutiqueHours}
              </li>
            </ul>
          )}
          <ButtonLink to="/consultation" variant="outline" className={styles.boutiqueCta}>
            Записаться на&nbsp;консультацию
          </ButtonLink>
        </div>
        <div
          role="img"
          aria-label="Интерьер бутика: матовые чёрные стены, ореховые полки, каменный стол, тёплый оранжевый свет"
          className={cx(styles.splitWide, styles.boutiquePhoto)}
          data-reveal="media"
          data-parallax
        >
          <span data-reveal-layer className={styles.boutiqueFill} />
        </div>
      </Container>
    </section>
  );
}
