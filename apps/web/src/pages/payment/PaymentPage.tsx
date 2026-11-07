import type { Order } from '@nisha/contracts';
import { useEffect, useState } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router';

import { useOrder } from '../../entities/order/queries';
import { useViewer } from '../../entities/user/queries';
import { useMockPayment } from '../../features/payment/useMockPayment';
import { RepeatOrderButton } from '../../features/repeat-order/RepeatOrderButton';
import { ApiError } from '../../shared/api/http';
import { formatPrice } from '../../shared/lib/money';
import { useMeta } from '../../shared/lib/useMeta';
import { Button } from '../../shared/ui/Button/Button';
import { Container } from '../../shared/ui/Container/Container';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import { NotFoundPage } from '../../widgets/not-found/NotFoundPage';
import styles from './PaymentPage.module.css';

/** Секунды до конца срока оплаты: тикает раз в секунду, пока заказ ждёт оплаты. */
function useSecondsLeft(expiresAt: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);
  return expiresAt ? Math.max(Math.ceil((Date.parse(expiresAt) - now) / 1000), 0) : null;
}

const formatClock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

function paymentErrorText(error: unknown): string {
  if (error instanceof ApiError && (error.code === 'CONFLICT' || error.code === 'NOT_FOUND')) {
    return error.message;
  }
  if (error instanceof ApiError && error.code === 'NETWORK') {
    return 'Нет соединения. Проверьте интернет и нажмите ещё раз.';
  }
  return 'Платёж не прошёл. Попробуйте ещё раз.';
}

const CANCELLED_TEXT =
  'Оплата не\u00A0прошла или время на\u00A0оплату истекло. Образцы вернулись в\u00A0продажу\u00A0— их\u00A0можно вернуть в\u00A0корзину и\u00A0оформить заказ заново.';

function Cancelled({ order }: { order: Order }) {
  const viewer = useViewer() ?? null;
  return (
    <div className={styles.card}>
      <p className={styles.label}>Заказ №&nbsp;{order.number}</p>
      <h1 className={styles.title}>Заказ отменён</h1>
      <p className={styles.text}>{CANCELLED_TEXT}</p>
      <RepeatOrderButton
        order={order}
        viewer={viewer}
        label="Вернуть образцы в корзину"
        variant="primary"
        size="lg"
      />
    </div>
  );
}

/**
 * Мок-оплата (D-060): вместо формы банка — две кнопки, чтобы проверить и успех, и отказ.
 * Таймер показывает, сколько ещё образцы закреплены за покупателем (D-016).
 */
export function PaymentPage() {
  useMeta('Оплата заказа');
  const { orderId = '' } = useParams();
  const [params] = useSearchParams();
  const token = params.get('token');
  const order = useOrder(orderId, token);
  const pay = useMockPayment(orderId, token);
  const secondsLeft = useSecondsLeft(order.data?.paymentExpiresAt ?? null);
  const { refetch } = order;
  // Срок вышел: сервер отменит заказ при чтении, и страница покажет отмену.
  useEffect(() => {
    if (secondsLeft === 0) void refetch();
  }, [secondsLeft, refetch]);

  if (order.isPending) {
    return (
      <Container className={styles.page}>
        <Skeleton className={styles.card} height={360} />
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
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  if (data.status !== 'pending' && data.status !== 'cancelled') {
    return <Navigate to={`/checkout/done/${data.id}${query}`} replace />;
  }
  if (data.status === 'cancelled') {
    return (
      <Container className={styles.page}>
        <Cancelled order={data} />
      </Container>
    );
  }

  return (
    <Container className={styles.page}>
      <div className={styles.card}>
        <p className={styles.label}>Заказ №&nbsp;{data.number}</p>
        <h1 className={styles.title}>Оплата</h1>
        <p className={styles.amount} data-testid="payment-amount">
          {formatPrice(data.totalKopecks)}
        </p>
        {secondsLeft !== null && (
          <p className={styles.timer} role="timer" aria-live="off">
            Образцы закреплены за&nbsp;вами ещё {formatClock(secondsLeft)}
          </p>
        )}
        <p className={styles.mock}>
          Тестовая оплата: деньги не&nbsp;списываются. Выберите, что ответит банк.
        </p>
        {pay.isError && (
          <p role="alert" className={styles.error}>
            {paymentErrorText(pay.error)}
          </p>
        )}
        <div className={styles.actions}>
          <Button
            size="xl"
            fullWidth
            disabled={pay.isPending}
            onClick={() => pay.mutate('succeeded')}
          >
            {pay.isPending ? 'Проверяем…' : `Оплатить ${formatPrice(data.totalKopecks)}`}
          </Button>
          <Button
            variant="outline"
            size="lg"
            fullWidth
            disabled={pay.isPending}
            onClick={() => pay.mutate('failed')}
          >
            Отказ банка
          </Button>
        </div>
      </div>
    </Container>
  );
}
