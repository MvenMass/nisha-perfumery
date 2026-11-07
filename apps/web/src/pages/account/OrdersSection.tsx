import type { OrderListQuery } from '@nisha/contracts';
import { useSearchParams } from 'react-router';

import { useOrders } from '../../entities/order/queries';
import { useMe } from '../../entities/user/queries';
import { useMeta } from '../../shared/lib/useMeta';
import { Button, ButtonLink } from '../../shared/ui/Button/Button';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import { Tabs } from '../../shared/ui/Tabs/Tabs';
import styles from './AccountPage.module.css';
import { OrderCard } from './OrderCard';
import ordersStyles from './Orders.module.css';

type Filter = OrderListQuery['filter'];

const TABS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'active', label: 'Активные' },
  { value: 'done', label: 'Завершённые' },
];

const EMPTY_TEXT: Record<Filter, string> = {
  all: 'Здесь появятся ваши заказы',
  active: 'Активных заказов нет',
  done: 'Завершённых заказов пока нет',
};

const isFilter = (value: string | null): value is Filter =>
  value === 'all' || value === 'active' || value === 'done';

/** «Мои заказы» по account.html. Вкладка живёт в адресе: «назад» и ссылка её помнят. */
export function OrdersSection() {
  useMeta('Мои заказы');
  const [params, setParams] = useSearchParams();
  const raw = params.get('filter');
  const filter: Filter = isFilter(raw) ? raw : 'all';
  const orders = useOrders(filter);
  const user = useMe().data;

  let content;
  if (orders.isPending) {
    content = (
      <div className={ordersStyles.list} aria-busy="true">
        <Skeleton height={260} />
        <Skeleton height={96} />
      </div>
    );
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
    content = (
      <EmptyState
        icon="box"
        title={EMPTY_TEXT[filter]}
        action={
          <ButtonLink to="/catalog" size="md">
            В&nbsp;каталог
          </ButtonLink>
        }
      />
    );
  } else if (user) {
    content = (
      <div className={ordersStyles.list}>
        {orders.data.items.map((order) => (
          <OrderCard key={order.id} order={order} viewer={user} />
        ))}
      </div>
    );
  }

  return (
    <section aria-labelledby="orders-title" className={styles.section}>
      <div className={styles.sectionHead}>
        <h1 id="orders-title" className={styles.title}>
          Мои заказы
        </h1>
        <Tabs
          items={TABS}
          value={filter}
          label="Фильтр заказов"
          panelId="orders-panel"
          onChange={(next) => setParams(next === 'all' ? {} : { filter: next }, { replace: true })}
        />
      </div>
      <div
        id="orders-panel"
        role="tabpanel"
        aria-label={TABS.find((tab) => tab.value === filter)?.label}
      >
        {content}
      </div>
    </section>
  );
}
