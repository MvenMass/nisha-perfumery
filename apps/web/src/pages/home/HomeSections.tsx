import type { ProductDetail, ProductListItem, StoreInfo } from '@nisha/contracts';
import { Link } from 'react-router';

import { formatSpecimenNumber, productHref } from '../../entities/product/lib/format';
import { cx } from '../../shared/lib/cx';
import { formatPrice } from '../../shared/lib/money';
import { ButtonLink } from '../../shared/ui/Button/Button';
import { Container } from '../../shared/ui/Container/Container';
import { Icon } from '../../shared/ui/Icon/Icon';
import { SectionLabel } from '../../shared/ui/SectionLabel/SectionLabel';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import { NotesPyramid } from '../../widgets/notes-pyramid/NotesPyramid';
import { ShopProductCard } from '../../widgets/product-card/ShopProductCard';
import { CATEGORY_TILES, JOURNAL_PREVIEW, PROCESS_STEPS } from './home-content';
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
  return (
    <section id="specimens" aria-labelledby="specimens-title" className={styles.specimens}>
      <Container className={styles.sectionInner}>
        <div className={styles.sectionHead}>
          <div className={styles.headText}>
            <SectionLabel>Коллекция образцов · бестселлеры</SectionLabel>
            <h2 id="specimens-title" className={styles.sectionTitle}>
              Образцы породы
            </h2>
          </div>
          <Link to="/catalog" className={styles.headLink}>
            Весь каталог
          </Link>
        </div>
        <ul className={styles.specimenRow} aria-busy={pending}>
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

export function CrossSection({ product }: { product: ProductDetail }) {
  return (
    <section aria-labelledby="cross-title" className={styles.cross}>
      <Container className={styles.split}>
        <div className={styles.splitText}>
          <SectionLabel>
            Срез аромата · образец №&nbsp;{formatSpecimenNumber(product.specimenNumber)}
          </SectionLabel>
          <h2 id="cross-title" className={styles.sectionTitle}>
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
        <p className={styles.aboutQuote}>
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
  return (
    <section id="process" aria-labelledby="process-title" className={styles.process}>
      <Container className={styles.sectionInner}>
        <div className={styles.sectionHead}>
          <div className={styles.headText}>
            <SectionLabel>Мастерская</SectionLabel>
            <h2 id="process-title" className={styles.sectionTitle}>
              Как рождается аромат
            </h2>
          </div>
          <p className={cx(styles.muted, styles.headNote)}>
            От&nbsp;куска камня в&nbsp;руке до&nbsp;флакона на&nbsp;полке&nbsp;— пять этапов
            и&nbsp;несколько месяцев работы.
          </p>
        </div>
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
        />
        <div className={styles.materialsText}>
          <SectionLabel>Материалы</SectionLabel>
          <h2 id="materials-title" className={styles.sectionTitle}>
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

export function Journal() {
  return (
    <section id="journal" aria-labelledby="journal-title" className={styles.journal}>
      <Container className={styles.sectionInner}>
        <h2 id="journal-title" className={styles.sectionTitle}>
          Искусство, скрытое в&nbsp;деталях
        </h2>
        <ul className={styles.articles}>
          {JOURNAL_PREVIEW.map((article) => (
            <li key={article.title} className={styles.article}>
              <SectionLabel tone="muted">{article.tag}</SectionLabel>
              <h3 className={styles.articleTitle}>{article.title}</h3>
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
          <h2 id="boutique-title" className={styles.sectionTitle}>
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
          <ButtonLink to="/catalog" variant="outline" className={styles.boutiqueCta}>
            Выбрать образец
          </ButtonLink>
        </div>
        <div
          role="img"
          aria-label="Интерьер бутика: матовые чёрные стены, ореховые полки, каменный стол, тёплый оранжевый свет"
          className={cx(styles.splitWide, styles.boutiquePhoto)}
        />
      </Container>
    </section>
  );
}
