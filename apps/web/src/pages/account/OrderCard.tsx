import type { OrderListItem, User } from '@nisha/contracts';
import { Link } from 'react-router';

import { bottlesCount } from '../../entities/product/lib/format';
import {
  DELIVERY_LABELS,
  isActiveStatus,
  orderTimeline,
  STATUS_LABELS,
  statusShape,
} from '../../entities/order/status';
import { RepeatOrderButton } from '../../features/repeat-order/RepeatOrderButton';
import { cx } from '../../shared/lib/cx';
import { formatDate } from '../../shared/lib/date';
import { formatPrice } from '../../shared/lib/money';
import { Icon } from '../../shared/ui/Icon/Icon';
import { StatusBadge } from '../../shared/ui/Badge/Badge';
import { Stepper } from '../../shared/ui/Stepper/Stepper';
import styles from './Orders.module.css';
import { Picture } from '../../shared/ui/Picture/Picture';

export const formatOrderNumber = (number: number) => String(number).padStart(4, '0');

/**
 * Заказ в списке по account.html. Активный — развёрнутый со снимками и «Подробнее»;
 * завершённый — одной строкой, доставленный можно повторить, у отменённого сумма зачёркнута.
 */
export function OrderCard({ order, viewer }: { order: OrderListItem; viewer: User }) {
  const active = isActiveStatus(order.status);
  const cancelled = order.status === 'cancelled';
  const href = `/account/orders/${order.id}`;
  const timeline = active ? orderTimeline(order) : undefined;

  return (
    <article className={cx(styles.card, active && styles.cardActive)}>
      <div className={cx(styles.cardHead, active && styles.cardHeadDivided)}>
        <div className={styles.cardTitle}>
          <h2 className={cx(styles.number, cancelled && styles.muted)}>
            <Link to={href} className={styles.numberLink}>
              Заказ №&nbsp;{formatOrderNumber(order.number)}
            </Link>
          </h2>
          <span className={styles.meta}>
            от&nbsp;{formatDate(order.createdAt)} · {DELIVERY_LABELS[order.deliveryMethod]}
          </span>
        </div>
        <div className={styles.cardAside}>
          <StatusBadge shape={statusShape(order.status)}>{STATUS_LABELS[order.status]}</StatusBadge>
          {!active && (
            <span className={cx(styles.total, cancelled && styles.totalCancelled)}>
              {formatPrice(order.totalKopecks)}
            </span>
          )}
          {order.status === 'delivered' && (
            <RepeatOrderButton orderId={order.id} viewer={viewer} label="Повторить заказ" />
          )}
        </div>
      </div>

      {timeline && (
        <Stepper
          steps={timeline.steps}
          current={timeline.current}
          label="Статус заказа"
          className={styles.timeline}
        />
      )}

      {active && (
        <div className={styles.cardFoot}>
          <div className={styles.items}>
            {/* Пока у товаров нет снимков, вместо них — плашки, как в макете. */}
            {(order.images.length > 0 ? order.images : order.productNames.slice(0, 3)).map(
              (image, index) => (
                <span key={index} aria-hidden="true" className={styles.thumb}>
                  {typeof image !== 'string' && <Picture src={image.url} alt="" sizes="52px" />}
                </span>
              ),
            )}
            <span className={styles.meta}>
              {order.productNames.join(', ')} · {bottlesCount(order.bottlesCount)}
            </span>
          </div>
          <div className={styles.footAside}>
            <span className={styles.total}>{formatPrice(order.totalKopecks)}</span>
            <Link to={href} className={styles.more}>
              Подробнее
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        </div>
      )}
    </article>
  );
}
