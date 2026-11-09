import { useRef } from 'react';
import { useParams } from 'react-router';

import { useProduct } from '../../entities/product/api/queries';
import { DENSITY_LABELS, formatSpecimenNumber } from '../../entities/product/lib/format';
import { ApiError } from '../../shared/api/http';
import { typograph } from '../../shared/lib/typograph';
import { useReveal } from '../../shared/lib/motion/useReveal';
import { useMeta } from '../../shared/lib/useMeta';
import { Breadcrumbs } from '../../shared/ui/Breadcrumbs/Breadcrumbs';
import { Button } from '../../shared/ui/Button/Button';
import { Container } from '../../shared/ui/Container/Container';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { Skeleton, SkeletonText } from '../../shared/ui/Skeleton/Skeleton';
import { StrataDivider } from '../../shared/ui/StrataDivider/StrataDivider';
import { NotFoundPage } from '../../widgets/not-found/NotFoundPage';
import { ProductGallery } from './ProductGallery';
import styles from './ProductPage.module.css';
import { ProductPurchase } from './ProductPurchase';
import { PyramidSection, RelatedSection, StorySection } from './ProductSections';

function ProductSkeleton() {
  return (
    <Container className={styles.top}>
      <div className={styles.main} role="status" aria-busy="true" aria-label="Загружаем образец">
        <div className={styles.gallery}>
          <Skeleton height={480} />
        </div>
        <div className={styles.info}>
          <Skeleton width="50%" height={12} />
          <Skeleton width="70%" height={64} />
          <SkeletonText lines={3} />
          <Skeleton height={180} />
        </div>
      </div>
    </Container>
  );
}

export function ProductPage() {
  const { slug = '' } = useParams();
  const product = useProduct(slug);
  const data = product.data;
  const pageRef = useRef<HTMLDivElement>(null);
  useReveal(pageRef, [data?.id]);

  useMeta(
    data ? `${data.name}, образец № ${formatSpecimenNumber(data.specimenNumber)}` : undefined,
    data?.description,
  );

  if (product.isPending) return <ProductSkeleton />;

  if (product.isError) {
    if (product.error instanceof ApiError && product.error.code === 'NOT_FOUND') {
      return <NotFoundPage title="Такого образца нет" />;
    }
    return (
      <Container className={styles.top}>
        <EmptyState
          icon="alert"
          headingLevel="h1"
          title="Не удалось загрузить образец"
          description="Проверьте соединение и попробуйте ещё раз."
          action={
            <Button variant="outline" size="md" onClick={() => void product.refetch()}>
              Повторить
            </Button>
          }
        />
      </Container>
    );
  }

  if (!data) return null;
  const facts = [
    ['Материал', data.material.name.toLowerCase()],
    ['Происхождение', data.origin],
    ['Плотность', DENSITY_LABELS[data.density]],
    ['Стойкость', data.longevityHours ? `до\u00A0${data.longevityHours}\u00A0ч` : null],
    ['Концентрация', data.concentration],
  ].filter((fact): fact is [string, string] => fact[1] !== null);

  return (
    <div ref={pageRef}>
      <Container className={styles.top}>
        <Breadcrumbs
          items={[
            { label: 'Главная', to: '/' },
            { label: 'Каталог', to: '/catalog' },
            { label: data.name },
          ]}
        />
        <div className={styles.main}>
          <ProductGallery
            images={data.images}
            placeholderAlt={`Флакон «${data.name}» на срезе материала «${data.material.name.toLowerCase()}»`}
          />
          <div className={styles.info}>
            <div className={styles.heading}>
              <p className={styles.specimen}>
                Образец №&nbsp;{formatSpecimenNumber(data.specimenNumber)}
                {data.collection && ` · Коллекция «${data.collection.name}»`}
              </p>
              <h1 className={styles.name} data-reveal="text">
                {data.name}
              </h1>
              <p className={styles.description}>{typograph(data.description)}</p>
            </div>
            <dl className={styles.facts}>
              {facts.map(([term, value]) => (
                <div key={term} className={styles.fact}>
                  <dt>{term}</dt>
                  <dd>{typograph(value)}</dd>
                </div>
              ))}
            </dl>
            {/* key: смена товара по ссылке «Из той же породы» сбрасывает выбранный объём. */}
            <ProductPurchase key={data.id} product={data} />
          </div>
        </div>
      </Container>

      <Container>
        <StrataDivider
          depth="−120 м"
          label="Срез"
          layers={[
            { height: 3, color: 'stone' },
            { height: 1, color: 'lineStrong' },
            { height: 7, color: 'basalt' },
            { height: 2, color: 'accent' },
          ]}
        />
      </Container>

      <PyramidSection product={data} />
      <StorySection product={data} />
      <RelatedSection slug={data.slug} />
    </div>
  );
}
