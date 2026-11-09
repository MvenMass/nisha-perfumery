import type { ProductDetail } from '@nisha/contracts';
import { useRef } from 'react';
import { Link } from 'react-router';

import { useRelatedProducts } from '../../entities/product/api/queries';
import { formatSpecimenNumber, productHref } from '../../entities/product/lib/format';
import { formatPrice } from '../../shared/lib/money';
import { useCascade } from '../../shared/lib/motion/useCascade';
import { typograph } from '../../shared/lib/typograph';
import { Container } from '../../shared/ui/Container/Container';
import { SectionLabel } from '../../shared/ui/SectionLabel/SectionLabel';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import { NotesPyramid } from '../../widgets/notes-pyramid/NotesPyramid';
import styles from './ProductPage.module.css';

export function PyramidSection({ product }: { product: ProductDetail }) {
  return (
    <section className={styles.pyramidSection} aria-labelledby="pyramid-title">
      <Container className={styles.split}>
        <div className={styles.splitText}>
          <SectionLabel>Пирамида нот</SectionLabel>
          <h2 id="pyramid-title" className={styles.sectionTitle}>
            Как аромат раскрывается
          </h2>
          <p className={styles.muted}>
            Каждый слой&nbsp;— отдельный этап звучания на&nbsp;коже. Толщина слоя показывает, как
            долго он&nbsp;слышен.
          </p>
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

// История из БД: первая фраза — цитатой, остальное — абзацем, как в product.html.
function splitStory(story: string): { quote: string; rest: string } {
  const match = /^(.+?[.!?…])\s+(.*)$/s.exec(story);
  return match ? { quote: match[1] ?? story, rest: match[2] ?? '' } : { quote: story, rest: '' };
}

export function StorySection({ product }: { product: ProductDetail }) {
  if (!product.story) return null;
  const { quote, rest } = splitStory(product.story);
  return (
    <section className={styles.storySection} aria-labelledby="story-title">
      <Container className={styles.storyInner}>
        <div
          role="img"
          aria-label={`Фактура материала «${product.material.name}» крупным планом`}
          className={styles.storyPhoto}
        />
        <div className={styles.storyText}>
          <SectionLabel>
            <span id="story-title">История образца</span>
          </SectionLabel>
          <p className={styles.quote}>{typograph(quote)}</p>
          {rest && <p className={styles.muted}>{typograph(rest)}</p>}
        </div>
      </Container>
    </section>
  );
}

export function RelatedSection({ slug }: { slug: string }) {
  const related = useRelatedProducts(slug);
  const gridRef = useRef<HTMLUListElement>(null);
  useCascade(gridRef, [related.data]);
  if (related.isError || (related.data && related.data.length === 0)) return null;

  return (
    <section className={styles.relatedSection} aria-labelledby="related-title">
      <Container className={styles.relatedInner}>
        <div className={styles.relatedHead}>
          <h2 id="related-title" className={styles.sectionTitle}>
            Из&nbsp;той же породы
          </h2>
          <Link to="/catalog" className={styles.allLink}>
            Весь каталог
          </Link>
        </div>
        <ul ref={gridRef} className={styles.relatedGrid} aria-busy={related.isPending}>
          {related.isPending
            ? Array.from({ length: 4 }, (_, index) => (
                <li key={index}>
                  <Skeleton height={280} />
                </li>
              ))
            : related.data.map((item) => (
                <li key={item.id}>
                  <Link to={productHref(item.slug)} className={styles.relatedCard}>
                    <span aria-hidden="true" className={styles.relatedPhoto}>
                      <span data-cascade-media className={styles.relatedFill} />
                    </span>
                    <span data-cascade-body className={styles.relatedNumber}>
                      Образец №&nbsp;{formatSpecimenNumber(item.specimenNumber)}
                    </span>
                    <span data-cascade-body className={styles.relatedName}>
                      {item.name}
                    </span>
                    <span data-cascade-body className={styles.muted}>
                      от&nbsp;{formatPrice(item.priceFromKopecks)}
                    </span>
                  </Link>
                </li>
              ))}
        </ul>
      </Container>
    </section>
  );
}
