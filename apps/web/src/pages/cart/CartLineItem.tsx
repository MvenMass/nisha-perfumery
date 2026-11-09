import type { CartLine } from '@nisha/contracts';
import { useState } from 'react';
import { Link } from 'react-router';

import {
  bottlesLeft,
  formatSpecimenNumber,
  formatVolume,
  productHref,
} from '../../entities/product/lib/format';
import { NotifyForm } from '../../features/stock-notification/NotifyForm';
import { cx } from '../../shared/lib/cx';
import { NBSP } from '../../shared/lib/typograph';
import { formatPrice } from '../../shared/lib/money';
import { Button } from '../../shared/ui/Button/Button';
import { Icon } from '../../shared/ui/Icon/Icon';
import { IconButton } from '../../shared/ui/IconButton/IconButton';
import { QuantityStepper } from '../../shared/ui/QuantityStepper/QuantityStepper';
import styles from './CartPage.module.css';
import { Picture } from '../../shared/ui/Picture/Picture';

type CartLineItemProps = {
  line: CartLine;
  error?: string | undefined;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
};

const STATUS_TEXT: Partial<Record<CartLine['status'], string>> = {
  out_of_stock: 'Закончился, пока лежал в\u00A0корзине. В\u00A0сумму не\u00A0входит.',
  unavailable: 'Снят с\u00A0продажи. В\u00A0сумму не\u00A0входит.',
};

/** Позиция корзины по cart.html. Закончившаяся остаётся с пометкой и подпиской (D-028). */
export function CartLineItem({ line, error, onQuantity, onRemove }: CartLineItemProps) {
  const [notifyOpen, setNotifyOpen] = useState(false);
  const href = productHref(line.productSlug);
  const missing = line.status === 'out_of_stock' || line.status === 'unavailable';
  const statusText =
    line.status === 'insufficient_stock'
      ? `${bottlesLeft(line.availableQuantity)}${NBSP}— в${NBSP}сумму вошло столько.`
      : STATUS_TEXT[line.status];

  return (
    <li className={styles.line}>
      <Link
        to={href}
        tabIndex={-1}
        aria-hidden="true"
        className={cx(styles.media, missing && styles.mediaMissing)}
      >
        {line.image && (
          <Picture src={line.image.url} alt="" sizes="120px" className={styles.photo} />
        )}
      </Link>

      <div className={styles.info}>
        <span className={styles.number}>
          Образец №&nbsp;{formatSpecimenNumber(line.specimenNumber)}
        </span>
        <Link to={href} className={styles.name}>
          {line.productName}
        </Link>
        <span className={styles.meta}>
          {formatVolume(line.volumeMl)} · {line.concentration}
        </span>
        {statusText && (
          <span role="status" className={styles.status}>
            <Icon name="alert" size={16} />
            {statusText}
          </span>
        )}
        {error && (
          <span role="alert" className={styles.status}>
            {error}
          </span>
        )}
      </div>

      {missing ? (
        line.status === 'out_of_stock' && (
          <Button
            variant="outline"
            size="md"
            aria-expanded={notifyOpen}
            onClick={() => setNotifyOpen((open) => !open)}
          >
            Сообщить о&nbsp;поступлении
          </Button>
        )
      ) : (
        <>
          <QuantityStepper
            value={line.quantity}
            max={Math.max(line.availableQuantity, 1)}
            itemName={line.productName}
            onChange={onQuantity}
          />
          <span className={styles.lineTotal}>{formatPrice(line.lineTotalKopecks)}</span>
        </>
      )}

      <IconButton
        icon="close"
        label={`Удалить: ${line.productName}`}
        className={styles.remove}
        onClick={onRemove}
      />

      {notifyOpen && (
        <div className={styles.notify}>
          <NotifyForm productId={line.productId} productName={line.productName} />
        </div>
      )}
    </li>
  );
}
