import type { Order } from '@nisha/contracts';
import { Navigate, useParams, useSearchParams } from 'react-router';

import { DELIVERY_LABELS, STATUS_LABELS } from '../../entities/order/status';
import { useOrder } from '../../entities/order/queries';
import { useStoreInfo } from '../../entities/store/queries';
import { useViewer } from '../../entities/user/queries';
import { ApiError } from '../../shared/api/http';
import { formatPrice } from '../../shared/lib/money';
import { useMeta } from '../../shared/lib/useMeta';
import { Button, ButtonLink } from '../../shared/ui/Button/Button';
import { Container } from '../../shared/ui/Container/Container';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import { NotFoundPage } from '../../widgets/not-found/NotFoundPage';
import styles from './PaymentPage.module.css';

function deliveryText(order: Order, boutique: string | undefined): string {
  const address = order.deliveryAddress;
  if (!address)
    return boutique ? `${DELIVERY_LABELS.boutique}: ${boutique}` : DELIVERY_LABELS.boutique;
  if (address.kind === 'pickup_point') return `${DELIVERY_LABELS.pickup_point}: ${address.address}`;
  const apartment = address.apartment ? `, кв.\u00A0${address.apartment}` : '';
  return `Курьером: ${address.city}, ${address.street}${apartment}`;
}

/** «Спасибо» после оплаты. Гостю объясняем, как увидеть заказ в кабинете (D-060). */
export function OrderDonePage() {
  useMeta('Заказ оформлен');
  const { orderId = '' } = useParams();
  const [params] = useSearchParams();
  const token = params.get('token');
  const order = useOrder(orderId, token);
  const viewer = useViewer();
  const store = useStoreInfo();

  if (order.isPending) {
    return (
      <Container className={styles.page}>
        <Skeleton className={styles.card} height={420} />
      </Container>
    );
  }
  if (order.isError) {
    if (order.error instanceof ApiError && order.error.code === 'NOT_FOUND') {
      return <NotFoundPage title="Заказ не найден" />;
    }
    return (
      <Container className={styles.page}>
        <EmptyState
          icon="alert"
          headingLevel="h1"
          title="Не удалось загрузить заказ"
          action={
            <Button variant="outline" size="md" onClick={() => void order.refetch()}>
              Повторить
            </Button>
          }
        />
      </Container>
    );
  }

  const data = order.data;
  // Неоплаченный и отменённый заказ показывает страница оплаты.
  if (data.status === 'pending' || data.status === 'cancelled') {
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return <Navigate to={`/checkout/payment/${data.id}${query}`} replace />;
  }

  return (
    <Container className={styles.page}>
      <div className={styles.card}>
        <p className={styles.label}>Заказ №&nbsp;{data.number}</p>
        <h1 className={styles.title}>Спасибо, заказ оплачен</h1>
        <p className={styles.text}>
          Подтверждение отправили на&nbsp;{data.contact.email}. Упакуем вручную и&nbsp;вложим
          этикетку образца.
        </p>
        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>Статус</dt>
            <dd>{STATUS_LABELS[data.status]}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Доставка</dt>
            <dd>{deliveryText(data, store.data?.boutiqueAddress)}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Оплачено</dt>
            <dd>{formatPrice(data.totalKopecks)}</dd>
          </div>
        </dl>
        {viewer ? (
          <div className={styles.links}>
            <ButtonLink to={`/account/orders/${data.id}`} size="md">
              Открыть заказ
            </ButtonLink>
            <ButtonLink to="/catalog" variant="outline" size="md">
              В&nbsp;каталог
            </ButtonLink>
          </div>
        ) : (
          <>
            <p className={styles.text}>
              Чтобы видеть заказ в&nbsp;личном кабинете, задайте пароль по&nbsp;ссылке
              из&nbsp;письма. Если аккаунт на&nbsp;этот адрес уже есть, просто войдите&nbsp;— заказ
              будет там.
            </p>
            <div className={styles.links}>
              <ButtonLink to="/catalog" size="md">
                В&nbsp;каталог
              </ButtonLink>
              <ButtonLink to="/login?next=/account/orders" variant="outline" size="md">
                Войти
              </ButtonLink>
            </div>
          </>
        )}
      </div>
    </Container>
  );
}
