import type { AdminOrder, OrderStatus } from '@nisha/contracts';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { DELIVERY_LABELS, STATUS_LABELS, statusShape } from '../../entities/order/status';
import { formatVolume } from '../../entities/product/lib/format';
import { useAdminOrder, useChangeOrderStatus } from '../../features/admin/orders-api';
import { ApiError } from '../../shared/api/http';
import { formatDate } from '../../shared/lib/date';
import { formatPrice } from '../../shared/lib/money';
import { useMeta } from '../../shared/lib/useMeta';
import { StatusBadge } from '../../shared/ui/Badge/Badge';
import { Button } from '../../shared/ui/Button/Button';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { Textarea } from '../../shared/ui/Field/Textarea';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import styles from './Admin.module.css';
import { PAYMENT_LABELS } from './OrdersAdmin';

/** Подпись кнопки перехода: действие, а не название статуса. */
const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  shipped: 'Передан в доставку',
  ready_for_pickup: 'Готов к выдаче',
  delivered: 'Доставлен / получен',
  cancelled: 'Отменить заказ',
};

function address(order: AdminOrder): string {
  const value = order.deliveryAddress;
  if (!value) return 'бутик';
  if (value.kind === 'pickup_point') return value.address;
  return `${value.city}, ${value.street}${value.apartment ? `, кв.\u00A0${value.apartment}` : ''}`;
}

function StatusActions({ order }: { order: AdminOrder }) {
  const change = useChangeOrderStatus(order.id);
  const [comment, setComment] = useState('');
  // Отмена возвращает деньги и остатки — просим подтвердить вторым нажатием.
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (order.allowedStatuses.length === 0) {
    return <p className={styles.muted}>Заказ завершён, статус больше не меняется.</p>;
  }

  const apply = (status: OrderStatus) => {
    if (status === 'cancelled' && !confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    change.mutate(
      { status, ...(comment.trim() ? { comment: comment.trim() } : {}) },
      {
        onSuccess: () => {
          setComment('');
          setConfirmCancel(false);
        },
      },
    );
  };

  return (
    <div className={styles.panel}>
      <h2 className={styles.panelTitle}>Сменить статус</h2>
      <Textarea
        label="Комментарий в историю"
        rows={2}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
      />
      <div className={styles.actions}>
        {order.allowedStatuses.map((status) => (
          <Button
            key={status}
            size="md"
            variant={status === 'cancelled' ? 'outline' : 'primary'}
            disabled={change.isPending}
            onClick={() => apply(status)}
          >
            {status === 'cancelled' && confirmCancel
              ? 'Точно отменить: вернуть деньги и остатки'
              : (ACTION_LABELS[status] ?? STATUS_LABELS[status])}
          </Button>
        ))}
      </div>
      {change.isError && (
        <p role="alert" className={styles.error}>
          {change.error instanceof ApiError ? change.error.message : 'Не получилось сменить статус'}
        </p>
      )}
    </div>
  );
}

export function OrderAdmin() {
  const { orderId = '' } = useParams();
  const order = useAdminOrder(orderId);
  useMeta(order.data ? `Заказ № ${order.data.number} — админка` : 'Заказ — админка');

  if (order.isPending) return <Skeleton height={480} />;
  if (order.isError) {
    return (
      <EmptyState
        icon="alert"
        headingLevel="h1"
        title={
          order.error instanceof ApiError && order.error.code === 'NOT_FOUND'
            ? 'Заказ не найден'
            : 'Не удалось загрузить заказ'
        }
        action={
          <Link to="/admin/orders" className={styles.link}>
            Ко всем заказам
          </Link>
        }
      />
    );
  }

  const data = order.data;
  return (
    <section aria-labelledby="admin-order-title" className={styles.main}>
      <Link to="/admin/orders" className={styles.link}>
        ← Все заказы
      </Link>
      <div className={styles.head}>
        <h1 id="admin-order-title" className={styles.title}>
          Заказ №&nbsp;{String(data.number).padStart(4, '0')}
        </h1>
        <StatusBadge shape={statusShape(data.status)}>{STATUS_LABELS[data.status]}</StatusBadge>
      </div>

      <StatusActions order={data} />

      <div className={styles.grid}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Покупатель и доставка</h2>
          <dl className={styles.facts}>
            <div className={styles.fact}>
              <dt>Покупатель</dt>
              <dd>{data.contact.name}</dd>
            </div>
            <div className={styles.fact}>
              <dt>Телефон</dt>
              <dd>
                <a
                  href={`tel:${data.contact.phone.replace(/[^\d+]/g, '')}`}
                  className={styles.link}
                >
                  {data.contact.phone}
                </a>
              </dd>
            </div>
            <div className={styles.fact}>
              <dt>Почта</dt>
              <dd>{data.contact.email}</dd>
            </div>
            <div className={styles.fact}>
              <dt>Доставка</dt>
              <dd>
                {DELIVERY_LABELS[data.deliveryMethod]}: {address(data)}
              </dd>
            </div>
            {data.deliveryComment && (
              <div className={styles.fact}>
                <dt>Комментарий</dt>
                <dd>{data.deliveryComment}</dd>
              </div>
            )}
            <div className={styles.fact}>
              <dt>Оплата</dt>
              <dd>{PAYMENT_LABELS[data.paymentStatus]}</dd>
            </div>
          </dl>
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>История</h2>
          <ol className={styles.facts}>
            {data.history.map((event, index) => (
              <li key={`${event.status}-${index}`} className={styles.fact}>
                <span>{STATUS_LABELS[event.status]}</span>
                <span className={styles.muted}>
                  {formatDate(event.at)},{' '}
                  {new Date(event.at).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption className="visually-hidden">Позиции заказа</caption>
          <thead>
            <tr>
              <th scope="col">Образец</th>
              <th scope="col">Объём</th>
              <th scope="col" className={styles.right}>
                Цена
              </th>
              <th scope="col" className={styles.right}>
                Кол-во
              </th>
              <th scope="col" className={styles.right}>
                Сумма
              </th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={`${item.variantId ?? item.productSlug}-${index}`}>
                <td>
                  №&nbsp;{String(item.specimenNumber).padStart(2, '0')} {item.productName}
                </td>
                <td className={styles.num}>{formatVolume(item.volumeMl)}</td>
                <td className={`${styles.num} ${styles.right}`}>
                  {formatPrice(item.priceKopecks)}
                </td>
                <td className={`${styles.num} ${styles.right}`}>{item.quantity}</td>
                <td className={`${styles.num} ${styles.right}`}>
                  {formatPrice(item.lineTotalKopecks)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>Доставка</td>
              <td className={`${styles.num} ${styles.right}`}>
                {formatPrice(data.deliveryPriceKopecks)}
              </td>
            </tr>
            <tr>
              <td colSpan={4}>Итого</td>
              <td className={`${styles.num} ${styles.right}`}>{formatPrice(data.totalKopecks)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
