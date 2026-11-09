import { useRef } from 'react';
import type { PointerEvent } from 'react';
import { Link } from 'react-router';

import { cx } from '../../shared/lib/cx';
import { formatPrice } from '../../shared/lib/money';
import { Badge } from '../../shared/ui/Badge/Badge';
import { Button, ButtonLink } from '../../shared/ui/Button/Button';
import { IconButton, IconLink } from '../../shared/ui/IconButton/IconButton';
import { SpecimenLabel } from '../../shared/ui/SpecimenLabel/SpecimenLabel';
import styles from './ProductCard.module.css';
import { Picture } from '../../shared/ui/Picture/Picture';

// Модель отображения карточки. Из ответа API её собирает toProductCard.
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
  /** Ряды этикетки вместо строки нот — «Образцы породы» на главной (home.html). */
  rows?: Array<{ term: string; value: string }> | undefined;
};

type ProductCardProps = {
  product: ProductCardData;
  /**
   * «+» открывает выбор объёма, а не кладёт товар сразу (D-025).
   * Без обработчика «+» ведёт на страницу товара (витрина компонентов).
   */
  onChooseVolume?: (() => void) | undefined;
  /** «Сообщить о поступлении» (D-029). Без обработчика — ссылка на форму на странице товара. */
  onNotify?: (() => void) | undefined;
  /** Избранное показывается там, где оно есть в макете (главная). */
  favorite?: { active: boolean; disabled?: boolean | undefined; onToggle: () => void } | undefined;
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
  const lampRef = useRef<HTMLSpanElement>(null);
  // «Свет-лампа» по снимку за курсором — тот же приём, что на первом экране. Только мышь:
  // на тач-экране hover нет, а CSS прячет пятно без (hover: hover).
  const moveLamp = (event: PointerEvent<HTMLElement>) => {
    const lamp = lampRef.current;
    const media = lamp?.parentElement;
    if (event.pointerType !== 'mouse' || !lamp || !media) return;
    const rect = media.getBoundingClientRect();
    lamp.style.transform = `translate3d(${event.clientX - rect.left}px, ${event.clientY - rect.top}px, 0)`;
  };

  return (
    <article className={cx(styles.card, !inStock && styles.unavailable)} onPointerMove={moveLamp}>
      <div className={styles.media}>
        {/* Снимок декоративный: название рядом, а ссылкой работает вся карточка. */}
        {image ? (
          <Picture
            src={image.src}
            alt=""
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 100vw"
            className={styles.photo}
            data-cascade-media
          />
        ) : (
          <span
            className={cx(styles.photo, styles[product.placeholder ?? 'basalt'])}
            data-cascade-media
          />
        )}
        <span ref={lampRef} aria-hidden="true" className={styles.lamp} />
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
            disabled={favorite.disabled}
            className={styles.favorite}
            onClick={favorite.onToggle}
          />
        )}
      </div>

      <div className={styles.body} data-cascade-body>
        <SpecimenLabel
          number={product.number}
          meta={product.materialName}
          headingLevel={headingLevel}
          rows={product.rows}
          name={
            <Link to={href} className={styles.nameLink}>
              {name}
            </Link>
          }
        />
        {!product.rows && <p className={styles.notes}>{product.notes}</p>}
        <div className={styles.footer}>
          <span className={styles.price}>от&nbsp;{formatPrice(product.priceFromKopecks)}</span>
          {inStock ? (
            onChooseVolume ? (
              <IconButton
                icon="plus"
                variant="primary"
                label={`В корзину: ${name}`}
                aria-haspopup="dialog"
                onClick={onChooseVolume}
              />
            ) : (
              <IconLink icon="plus" variant="primary" label={`Выбрать объём: ${name}`} to={href} />
            )
          ) : onNotify ? (
            <Button
              variant="outline"
              size="md"
              aria-label={`Сообщить о поступлении: ${name}`}
              onClick={onNotify}
            >
              Сообщить
            </Button>
          ) : (
            <ButtonLink
              variant="outline"
              size="md"
              aria-label={`Сообщить о поступлении: ${name}`}
              to={`${href}#notify`}
            >
              Сообщить
            </ButtonLink>
          )}
        </div>
      </div>
    </article>
  );
}
