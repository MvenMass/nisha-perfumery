import type { CheckoutQuote, DeliveryMethod } from '@nisha/contracts';

import { formatVolume } from '../../entities/product/lib/format';
import { formatPrice } from '../../shared/lib/money';
import styles from './CheckoutPage.module.css';

const DELIVERY_ROW: Record<DeliveryMethod, string> = {
  courier: 'Доставка курьером',
  pickup_point: 'Доставка в\u00A0пункт выдачи',
  boutique: 'Самовывоз из\u00A0бутика',
};

/** «Ваш заказ» справа на checkout.html. Все суммы — из ответа сервера. */
export function OrderSummary({
  quote,
  method,
  updating,
}: {
  quote: CheckoutQuote;
  method: DeliveryMethod;
  updating: boolean;
}) {
  const lines = quote.cart.lines.filter((line) => line.status === 'available');
  return (
    <aside aria-label="Ваш заказ" aria-busy={updating} className={styles.summary}>
      <p className={styles.summaryLabel}>Ваш заказ</p>
      <ul className={styles.summaryLines}>
        {lines.map((line) => (
          <li key={line.variantId} className={styles.summaryLine}>
            <span aria-hidden="true" className={styles.summaryPhoto}>
              {line.image && <img src={line.image.url} alt="" loading="lazy" />}
            </span>
            <span className={styles.summaryText}>
              <span className={styles.summaryName}>{line.productName}</span>
              <span className={styles.summaryMeta}>
                {formatVolume(line.volumeMl)} ×&nbsp;{line.quantity}
              </span>
            </span>
            <span className={styles.summaryPrice}>{formatPrice(line.lineTotalKopecks)}</span>
          </li>
        ))}
      </ul>
      <dl className={styles.summaryList}>
        <div className={styles.summaryRow}>
          <dt>Товары</dt>
          <dd>{formatPrice(quote.cart.summary.itemsTotalKopecks)}</dd>
        </div>
        <div className={styles.summaryRow}>
          <dt>{DELIVERY_ROW[method]}</dt>
          <dd>
            {quote.deliveryPriceKopecks === 0
              ? 'бесплатно'
              : formatPrice(quote.deliveryPriceKopecks)}
          </dd>
        </div>
      </dl>
      {quote.untilFreeDeliveryKopecks > 0 && (
        <p className={styles.summaryHint}>
          До&nbsp;бесплатной доставки&nbsp;— {formatPrice(quote.untilFreeDeliveryKopecks)}
        </p>
      )}
      <div className={styles.total}>
        <span className={styles.totalLabel}>Итого</span>
        <span className={styles.totalValue} data-testid="checkout-total">
          {formatPrice(quote.totalKopecks)}
        </span>
      </div>
    </aside>
  );
}
