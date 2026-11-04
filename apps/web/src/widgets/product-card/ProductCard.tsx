import { Link } from 'react-router';

import { cx } from '../../shared/lib/cx';
import { formatPrice } from '../../shared/lib/money';
import { Badge } from '../../shared/ui/Badge/Badge';
import { Button } from '../../shared/ui/Button/Button';
import { IconButton } from '../../shared/ui/IconButton/IconButton';
import { SpecimenLabel } from '../../shared/ui/SpecimenLabel/SpecimenLabel';
import styles from './ProductCard.module.css';

// Тип локальный: в этапе 3 его заменит схема товара из packages/contracts.
export type ProductCardData = {
  href: string;
  /** Номер образца без «№»: «03». */
  number: string;
  name: string;
  materialName: string;
  /** Ключевые ноты строкой: «перец, ладан, ветивер». */
  notes: string;
  /** Минимальная цена среди объёмов (D-025), в копейках. */
  priceFromKopecks: number;
  image?: { src: string; alt: string } | undefined;
  /** Цвет фона, пока снимка нет. */
  placeholder?: 'basalt' | 'walnut' | 'copperDark' | undefined;
  badge?: 'bestseller' | 'new' | undefined;
  inStock: boolean;
};

type ProductCardProps = {
  product: ProductCardData;
  /** «+» открывает выбор объёма, а не кладёт товар сразу (D-025). */
  onChooseVolume: () => void;
  /** «Сообщить о поступлении» для товара без остатка (D-029). */
  onNotify: () => void;
  /** Избранное показывается там, где оно есть в макете (главная). */
  favorite?: { active: boolean; onToggle: () => void } | undefined;
  headingLevel?: 'h2' | 'h3' | undefined;
};

const BADGES = {
  bestseller: { tone: 'accent', text: 'Бестселлер' },
  new: { tone: 'light', text: 'Новый образец' },
} as const;

export function ProductCard({
  product,
  onChooseVolume,
  onNotify,
  favorite,
  headingLevel = 'h3',
}: ProductCardProps) {
  const { href, name, inStock, image, badge } = product;

  return (
    <article className={cx(styles.card, !inStock && styles.unavailable)}>
      <div className={styles.media}>
        {/* Снимок ведёт туда же, куда и название, поэтому убран из порядка Tab и от скринридера. */}
        <Link to={href} tabIndex={-1} aria-hidden="true" className={styles.mediaLink}>
          {image ? (
            <img src={image.src} alt="" loading="lazy" className={styles.photo} />
          ) : (
            <span className={cx(styles.photo, styles[product.placeholder ?? 'basalt'])} />
          )}
        </Link>
        {!inStock ? (
          <Badge tone="outline" className={styles.badge}>
            Нет в&nbsp;наличии
          </Badge>
        ) : (
          badge && (
            <Badge tone={BADGES[badge].tone} className={styles.badge}>
              {BADGES[badge].text}
            </Badge>
          )
        )}
        {favorite && (
          <IconButton
            icon="heart"
            label={`В избранное: ${name}`}
            pressed={favorite.active}
            className={styles.favorite}
            onClick={favorite.onToggle}
          />
        )}
      </div>

      <div className={styles.body}>
        <SpecimenLabel
          number={product.number}
          meta={product.materialName}
          headingLevel={headingLevel}
          name={
            <Link to={href} className={styles.nameLink}>
              {name}
            </Link>
          }
        />
        <p className={styles.notes}>{product.notes}</p>
        <div className={styles.footer}>
          <span className={styles.price}>от&nbsp;{formatPrice(product.priceFromKopecks)}</span>
          {inStock ? (
            <IconButton
              icon="plus"
              variant="primary"
              label={`В корзину: ${name}`}
              aria-haspopup="dialog"
              onClick={onChooseVolume}
            />
          ) : (
            <Button
              variant="outline"
              size="md"
              aria-label={`Сообщить о поступлении: ${name}`}
              onClick={onNotify}
            >
              Сообщить
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
