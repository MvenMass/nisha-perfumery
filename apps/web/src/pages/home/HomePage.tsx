import { useRef } from 'react';

import { useHome } from '../../entities/product/api/queries';
import { useStoreInfo } from '../../entities/store/queries';
import { useReveal } from '../../shared/lib/motion/useReveal';
import { useMeta } from '../../shared/lib/useMeta';
import { Container } from '../../shared/ui/Container/Container';
import { StrataDivider } from '../../shared/ui/StrataDivider/StrataDivider';
import { DepthGauge } from './DepthGauge';
import { HeroCarousel } from './HeroCarousel';
import { STRATA } from './home-content';
import {
  About,
  Advantages,
  Boutique,
  Categories,
  CrossSection,
  Journal,
  Materials,
  Process,
  Specimens,
} from './HomeSections';
import styles from './HomePage.module.css';

function Strata({ kind, surface }: { kind: keyof typeof STRATA; surface?: boolean }) {
  const { depth, label, layers } = STRATA[kind];
  return (
    <div className={surface ? styles.surface : undefined}>
      <Container>
        <StrataDivider depth={depth} label={label} layers={layers} />
      </Container>
    </div>
  );
}

// Главная по home.html / home-mobile.html. Из API — слайды, бестселлеры, «Срез», журнал и бутик; остальные тексты — в коде.
export function HomePage() {
  useMeta(
    'Парфюмерный дом',
    'Независимый парфюмерный дом «Ниша»: ароматы-образцы породы — известняк, травертин, базальт, орех и янтарь.',
  );
  const home = useHome();
  const store = useStoreInfo();
  const pageRef = useRef<HTMLDivElement>(null);
  // «Срез» и журнал появляются с данными — тогда и пересобираем раскрытия.
  const loaded = [home.isPending, store.isPending];
  useReveal(pageRef, loaded);

  return (
    <div ref={pageRef}>
      <DepthGauge pageRef={pageRef} deps={loaded} />
      <HeroCarousel slides={home.data?.slides} pending={home.isPending} />
      <Advantages store={store.data} />
      <Strata kind="limestone" />
      <Categories />
      {/* Ошибку загрузки бестселлеров не показываем отдельно: секция просто не появляется. */}
      {!home.isError && <Specimens items={home.data?.bestsellers ?? []} pending={home.isPending} />}
      <Strata kind="basalt" surface />
      {home.data?.featured && <CrossSection product={home.data.featured} />}
      <About />
      <Process />
      <Strata kind="travertine" />
      <Materials />
      <Journal articles={home.data?.articles ?? []} />
      <Boutique store={store.data} />
    </div>
  );
}
