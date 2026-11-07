import type { ProductDetail, ProductVariant } from '@nisha/contracts';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';

import { bottlesLeft, formatVolume } from '../../entities/product/lib/format';
import { useStoreInfo } from '../../entities/store/queries';
import { cartErrorText, useChangeCart } from '../../features/cart/mutations';
import { useToggleFavorite } from '../../features/favorite/useToggleFavorite';
import { NotifyForm } from '../../features/stock-notification/NotifyForm';
import { cx } from '../../shared/lib/cx';
import { formatPrice } from '../../shared/lib/money';
import { Button } from '../../shared/ui/Button/Button';
import { Icon } from '../../shared/ui/Icon/Icon';
import { IconButton } from '../../shared/ui/IconButton/IconButton';
import { QuantityStepper } from '../../shared/ui/QuantityStepper/QuantityStepper';
import styles from './ProductPage.module.css';

// По умолчанию — 50 мл, как в product.html; если его нет в наличии — первый доступный объём.
function defaultVariant(
  variants: ProductVariant[],
  wantsNotify: boolean,
): ProductVariant | undefined {
  if (wantsNotify) {
    const missing = variants.find((variant) => variant.stock === 0);
    if (missing) return missing;
  }
  const inStock = variants.filter((variant) => variant.stock > 0);
  return inStock.find((variant) => variant.volumeMl === 50) ?? inStock[0] ?? variants[0];
}

function StockLine({ variant }: { variant: ProductVariant }) {
  if (variant.stock === 0) {
    return <p className={styles.stock}>Нет в&nbsp;наличии</p>;
  }
  return (
    <p className={styles.stock}>
      <span
        aria-hidden="true"
        className={cx(styles.stockDot, variant.isLowStock && styles.stockDotLow)}
      />
      {variant.isLowStock ? bottlesLeft(variant.stock) : 'В наличии'}
    </p>
  );
}

export function ProductPurchase({ product }: { product: ProductDetail }) {
  const { hash } = useLocation();
  const [selectedId, setSelectedId] = useState(
    () => defaultVariant(product.variants, hash === '#notify')?.id,
  );
  const [quantity, setQuantity] = useState(1);
  const store = useStoreInfo();
  const change = useChangeCart();
  const favorite = useToggleFavorite(product.id);
  const variant = product.variants.find((item) => item.id === selectedId);

  if (!variant) return null;

  const select = (next: ProductVariant) => {
    setSelectedId(next.id);
    setQuantity((current) => Math.max(1, Math.min(current, next.stock)));
  };

  return (
    <div className={styles.purchase}>
      <fieldset className={styles.volumes}>
        <legend className={styles.volumesLegend}>Объём</legend>
        <div className={styles.volumeOptions}>
          {product.variants.map((item) => (
            <label
              key={item.id}
              className={cx(
                styles.volume,
                item.id === variant.id && styles.volumeSelected,
                item.stock === 0 && styles.volumeEmpty,
              )}
            >
              <input
                type="radio"
                name="volume"
                className="visually-hidden"
                checked={item.id === variant.id}
                onChange={() => select(item)}
              />
              <span className={styles.volumeValue}>{formatVolume(item.volumeMl)}</span>
              <span className={styles.volumePrice}>
                {item.stock === 0 ? 'нет в наличии' : formatPrice(item.priceKopecks)}
              </span>
            </label>
          ))}
        </div>
        <StockLine variant={variant} />
      </fieldset>

      {variant.stock === 0 ? (
        <NotifyForm productId={product.id} productName={product.name} />
      ) : (
        <>
          <div className={styles.priceRow}>
            <p className={styles.price}>{formatPrice(variant.priceKopecks * quantity)}</p>
            <QuantityStepper
              value={quantity}
              max={variant.stock}
              itemName={product.name}
              size="lg"
              onChange={setQuantity}
            />
          </div>
          <div className={styles.actions}>
            <Button
              size="xl"
              fullWidth
              disabled={change.isPending}
              onClick={() =>
                change.mutate({
                  type: 'add',
                  variantId: variant.id,
                  quantity,
                  stock: variant.stock,
                })
              }
            >
              {change.isPending ? 'Добавляем…' : 'Добавить в\u00A0корзину'}
            </Button>
            <IconButton
              icon="heart"
              variant="outline"
              size={56}
              label="В избранное"
              pressed={favorite.active}
              disabled={favorite.disabled}
              onClick={favorite.toggle}
            />
          </div>
          {change.isSuccess && change.variables.variantId === variant.id && (
            <p role="status" className={styles.added}>
              {formatVolume(variant.volumeMl)} в&nbsp;корзине.{' '}
              <Link to="/cart" className={styles.addedLink}>
                Перейти в&nbsp;корзину
              </Link>
            </p>
          )}
          {change.isError && (
            <p role="alert" className={styles.addError}>
              {cartErrorText(change.error)}
            </p>
          )}
          {favorite.failed && (
            <p role="alert" className={styles.addError}>
              Не получилось изменить избранное. Попробуйте ещё раз.
            </p>
          )}
        </>
      )}

      <ul className={styles.perks}>
        <li>
          <Icon name="box" size={20} />
          {store.data
            ? `Доставка по России за ${store.data.courierDays}\u00A0дней, бесплатно от\u00A0${formatPrice(store.data.freeDeliveryThresholdKopecks)}`
            : 'Доставка по России'}
        </li>
        <li>
          <Icon name="gift" size={20} />
          Подарочная упаковка вручную
        </li>
        <li>
          <Icon name="pin" size={20} />
          Можно попробовать в&nbsp;бутике
        </li>
      </ul>
    </div>
  );
}
