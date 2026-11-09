import { useRef } from 'react';
import { Link } from 'react-router';

import { useFavorites } from '../../entities/favorite/queries';
import { specimensCount } from '../../entities/product/lib/format';
import { useViewer } from '../../entities/user/queries';
import { useCascade } from '../../shared/lib/motion/useCascade';
import { useMeta } from '../../shared/lib/useMeta';
import { Button, ButtonLink } from '../../shared/ui/Button/Button';
import { Container } from '../../shared/ui/Container/Container';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import { ShopProductCard } from '../../widgets/product-card/ShopProductCard';
import styles from './FavoritesPage.module.css';

/** Избранное доступно и гостю: его список хранится в браузере до входа (D-040). */
export function FavoritesPage() {
  useMeta('Избранное');
  const viewer = useViewer();
  const favorites = useFavorites(viewer);
  const gridRef = useRef<HTMLUListElement>(null);
  useCascade(gridRef, [favorites.data?.items.length]);

  let content;
  if (favorites.isPending) {
    content = (
      <ul className={styles.grid} aria-busy="true" aria-label="Загружаем избранное">
        {[0, 1, 2].map((key) => (
          <li key={key}>
            <Skeleton height={420} />
          </li>
        ))}
      </ul>
    );
  } else if (favorites.isError) {
    content = (
      <EmptyState
        icon="alert"
        title="Не удалось загрузить избранное"
        description="Проверьте соединение и попробуйте ещё раз."
        action={
          <Button variant="outline" size="md" onClick={() => void favorites.refetch()}>
            Повторить
          </Button>
        }
      />
    );
  } else if (favorites.data.items.length === 0) {
    content = (
      <EmptyState
        icon="heart"
        title="Здесь пока пусто"
        description="Отмечайте сердцем образцы, к&nbsp;которым хочется вернуться."
        action={
          <ButtonLink to="/catalog" size="md">
            В&nbsp;каталог
          </ButtonLink>
        }
      />
    );
  } else {
    content = (
      <ul ref={gridRef} className={styles.grid}>
        {favorites.data.items.map((item) => (
          <li key={item.id}>
            <ShopProductCard item={item} withFavorite headingLevel="h2" />
          </li>
        ))}
      </ul>
    );
  }

  const count = favorites.data?.items.length ?? 0;
  return (
    <Container className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Избранное</h1>
        {count > 0 && <p className={styles.count}>{specimensCount(count)}</p>}
      </div>
      {viewer === null && count > 0 && (
        <p className={styles.hint}>
          Список хранится в&nbsp;этом браузере.{' '}
          <Link to="/login?next=/favorites" className={styles.hintLink}>
            Войдите
          </Link>
          , чтобы он был с&nbsp;вами на&nbsp;любом устройстве.
        </p>
      )}
      {content}
    </Container>
  );
}
