import { orderStatusSchema } from '@nisha/contracts';
import type { OrderStatus } from '@nisha/contracts';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { DELIVERY_LABELS, STATUS_LABELS, statusShape } from '../../entities/order/status';
import { useAdminOrders } from '../../features/admin/orders-api';
import { formatDate } from '../../shared/lib/date';
import { formatPrice } from '../../shared/lib/money';
import { useDebouncedValue } from '../../shared/lib/useDebouncedValue';
import { useMeta } from '../../shared/lib/useMeta';
import { StatusBadge } from '../../shared/ui/Badge/Badge';
import { Button } from '../../shared/ui/Button/Button';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { Input } from '../../shared/ui/Field/Input';
import { Select } from '../../shared/ui/Field/Select';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import styles from './Admin.module.css';

const PAGE = 24;

export const PAYMENT_LABELS = {
  pending: 'ждёт',
  succeeded: 'оплачен',
  failed: 'не прошла',
  refunded: 'возврат',
} as const;

const formatNumber = (number: number) => String(number).padStart(4, '0');

const isStatus = (value: string | null): value is OrderStatus =>
  orderStatusSchema.safeParse(value).success;

/** Заказы: фильтр по статусу и поиск живут в адресе — «назад» из карточки их помнит. */
export function OrdersAdmin() {
  useMeta('Заказы — админка');
  const [params, setParams] = useSearchParams();
  const rawStatus = params.get('status');
  const status = isStatus(rawStatus) ? rawStatus : undefined;
  const offset = Number(params.get('offset') ?? 0) || 0;
  const [search, setSearch] = useState(params.get('q') ?? '');
  const q = useDebouncedValue(search.trim(), 300);
  const orders = useAdminOrders({ status, q: q || undefined, limit: PAGE, offset });

  const update = (next: Record<string, string | undefined>) => {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value);
      else merged.delete(key);
    }
    setParams(merged, { replace: true });
  };

  let content;
  if (orders.isPending) {
    content = <Skeleton height={320} />;
  } else if (orders.isError) {
    content = (
      <EmptyState
        icon="alert"
        title="Не удалось загрузить заказы"
        action={
          <Button variant="outline" size="md" onClick={() => void orders.refetch()}>
            Повторить
          </Button>
        }
      />
    );
  } else if (orders.data.items.length === 0) {
    content = <EmptyState icon="box" title="Заказов не нашлось" />;
  } else {
    const { items, total } = orders.data;
    content = (
      <>
        <div className={styles.tableWrap}>
          <table className={styles.table} aria-busy={orders.isFetching}>
            <caption className="visually-hidden">Заказы</caption>
            <thead>
              <tr>
                <th scope="col">Номер</th>
                <th scope="col">Дата</th>
                <th scope="col">Покупатель</th>
                <th scope="col">Доставка</th>
                <th scope="col" className={styles.right}>
                  Сумма
                </th>
                <th scope="col">Статус</th>
                <th scope="col">Оплата</th>
              </tr>
            </thead>
            <tbody>
              {items.map((order) => (
                <tr key={order.id}>
                  <td className={styles.num}>
                    <Link to={`/admin/orders/${order.id}`} className={styles.link}>
                      №&nbsp;{formatNumber(order.number)}
                    </Link>
                  </td>
                  <td className={styles.num}>{formatDate(order.createdAt)}</td>
                  <td>
                    {order.contactName}
                    <br />
                    <span className={styles.muted}>{order.contactEmail}</span>
                  </td>
                  <td>{DELIVERY_LABELS[order.deliveryMethod]}</td>
                  <td className={`${styles.num} ${styles.right}`}>
                    {formatPrice(order.totalKopecks)}
                  </td>
                  <td>
                    <StatusBadge shape={statusShape(order.status)}>
                      {STATUS_LABELS[order.status]}
                    </StatusBadge>
                  </td>
                  <td className={styles.muted}>{PAYMENT_LABELS[order.paymentStatus]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.pager}>
          <span>
            {offset + 1}–{offset + items.length} из&nbsp;{total}
          </span>
          <div className={styles.actions}>
            <Button
              variant="outline"
              size="md"
              disabled={offset === 0}
              onClick={() => update({ offset: offset > PAGE ? String(offset - PAGE) : undefined })}
            >
              Назад
            </Button>
            <Button
              variant="outline"
              size="md"
              disabled={offset + PAGE >= total}
              onClick={() => update({ offset: String(offset + PAGE) })}
            >
              Дальше
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <section aria-labelledby="admin-orders-title" className={styles.main}>
      <div className={styles.head}>
        <h1 id="admin-orders-title" className={styles.title}>
          Заказы
        </h1>
      </div>
      <div className={styles.toolbar}>
        <Select
          label="Статус"
          value={status ?? ''}
          onChange={(event) =>
            update({ status: event.target.value || undefined, offset: undefined })
          }
        >
          <option value="">Все</option>
          {orderStatusSchema.options.map((option) => (
            <option key={option} value={option}>
              {STATUS_LABELS[option]}
            </option>
          ))}
        </Select>
        <Input
          label="Поиск заказов"
          type="search"
          placeholder="Номер, email или имя"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            update({ q: event.target.value.trim() || undefined, offset: undefined });
          }}
        />
      </div>
      {content}
    </section>
  );
}
