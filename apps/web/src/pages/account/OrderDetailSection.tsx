import type { Order } from '@nisha/contracts';
import { Link, useParams } from 'react-router';

import { useOrder } from '../../entities/order/queries';
import {
  DELIVERY_LABELS,
  orderTimeline,
  STATUS_LABELS,
  statusShape,
} from '../../entities/order/status';
import { formatSpecimenNumber, formatVolume, productHref } from '../../entities/product/lib/format';
import { useMe } from '../../entities/user/queries';
import { RepeatOrderButton } from '../../features/repeat-order/RepeatOrderButton';
import { ApiError } from '../../shared/api/http';
import { formatDate } from '../../shared/lib/date';
import { formatPrice } from '../../shared/lib/money';
import { useMeta } from '../../shared/lib/useMeta';
import { StatusBadge } from '../../shared/ui/Badge/Badge';
import { Button, ButtonLink } from '../../shared/ui/Button/Button';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { Icon } from '../../shared/ui/Icon/Icon';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import { Stepper } from '../../shared/ui/Stepper/Stepper';
import styles from './AccountPage.module.css';
import { formatOrderNumber } from './OrderCard';
import ordersStyles from './Orders.module.css';

function deliveryAddress(order: Order): string | null {
  const address = order.deliveryAddress;
  if (!address) return null;
  if (address.kind === 'pickup_point') return address.address;
  return `${address.city}, ${address.street}${address.apartment ? `, кв.\u00A0${address.apartment}` : ''}`;
}

export function OrderDetailSection() {
  const { orderId = '' } = useParams();
  const order = useOrder(orderId);
  const user = useMe().data;
  useMeta(order.data ? `Заказ № ${formatOrderNumber(order.data.number)}` : 'Заказ');

  if (order.isPending) {
    return (
      <div className={styles.section} aria-busy="true">
        <Skeleton width="50%" height={56} />
        <Skeleton height={320} />
      </div>
    );
  }
  if (order.isError) {
    const notFound = order.error instanceof ApiError && order.error.code === 'NOT_FOUND';
    return (
      <EmptyState
        icon="alert"
        headingLevel="h1"
        title={notFound ? 'Заказ не найден' : 'Не удалось загрузить заказ'}
        action={
          notFound ? (
            <ButtonLink to="/account/orders" variant="outline" size="md">
              Все заказы
            </ButtonLink>
          ) : (
            <Button variant="outline" size="md" onClick={() => void order.refetch()}>
              Повторить
            </Button>
          )
        }
      />
    );
  }

  const data = order.data;
  const timeline = orderTimeline(data);
  const address = deliveryAddress(data);

  return (
    <section aria-labelledby="order-title" className={styles.section}>
      <Link to="/account/orders" className={ordersStyles.back}>
        <Icon name="arrow-left" size={16} />
        Все заказы
      </Link>
      <div className={styles.sectionHead}>
        <div className={ordersStyles.cardTitle}>
          <h1 id="order-title" className={styles.title}>
            Заказ №&nbsp;{formatOrderNumber(data.number)}
          </h1>
          <span className={ordersStyles.meta}>
            от&nbsp;{formatDate(data.createdAt)} · {DELIVERY_LABELS[data.deliveryMethod]}
          </span>
        </div>
        <StatusBadge shape={statusShape(data.status)}>{STATUS_LABELS[data.status]}</StatusBadge>
      </div>

      {timeline && (
        <Stepper steps={timeline.steps} current={timeline.current} label="Статус заказа" />
      )}

      {data.status === 'pending' && (
        <div className={ordersStyles.payNotice}>
          <p>Заказ ждёт оплаты. Образцы закреплены за&nbsp;вами, пока не&nbsp;истечёт срок.</p>
          <ButtonLink to={`/checkout/payment/${data.id}`} size="md">
            Оплатить
          </ButtonLink>
        </div>
      )}

      <ul className={ordersStyles.lines}>
        {data.items.map((item, index) => (
          <li key={`${item.variantId ?? item.productSlug}-${index}`} className={ordersStyles.line}>
            <span className={ordersStyles.lineText}>
              <span className={ordersStyles.lineNumber}>
                Образец №&nbsp;{formatSpecimenNumber(item.specimenNumber)}
              </span>
              <Link to={productHref(item.productSlug)} className={ordersStyles.lineName}>
                {item.productName}
              </Link>
              <span className={ordersStyles.meta}>
                {formatVolume(item.volumeMl)} ×&nbsp;{item.quantity}
              </span>
            </span>
            <span className={ordersStyles.total}>{formatPrice(item.lineTotalKopecks)}</span>
          </li>
        ))}
      </ul>

      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>Товары</dt>
          <dd>{formatPrice(data.itemsTotalKopecks)}</dd>
        </div>
        <div className={styles.fact}>
          <dt>Доставка</dt>
          <dd>
            {data.deliveryPriceKopecks === 0 ? 'бесплатно' : formatPrice(data.deliveryPriceKopecks)}
          </dd>
        </div>
        <div className={styles.fact}>
          <dt>Итого</dt>
          <dd>{formatPrice(data.totalKopecks)}</dd>
        </div>
        {address && (
          <div className={styles.fact}>
            <dt>Адрес</dt>
            <dd>{address}</dd>
          </div>
        )}
        {data.deliveryComment && (
          <div className={styles.fact}>
            <dt>Комментарий</dt>
            <dd>{data.deliveryComment}</dd>
          </div>
        )}
        <div className={styles.fact}>
          <dt>Получатель</dt>
          <dd>
            {data.contact.name}, {data.contact.phone}
          </dd>
        </div>
      </dl>

      {user && data.status !== 'pending' && (
        <RepeatOrderButton orderId={data.id} viewer={user} label="Повторить заказ" />
      )}
    </section>
  );
}
