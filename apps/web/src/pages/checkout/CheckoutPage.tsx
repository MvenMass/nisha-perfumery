import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { useAddresses } from '../../entities/address/queries';
import { useGuestCart } from '../../entities/cart/guest-cart';
import { useStoreInfo } from '../../entities/store/queries';
import { useViewer } from '../../entities/user/queries';
import { useCheckoutQuote, useCreateOrder } from '../../features/checkout/api';
import { currentStep, initialDraft, validateCheckout } from '../../features/checkout/checkout-form';
import type { CheckoutDraft } from '../../features/checkout/checkout-form';
import { CheckoutForm } from '../../features/checkout/CheckoutForm';
import { ApiError } from '../../shared/api/http';
import { useMeta } from '../../shared/lib/useMeta';
import { uuidV4 } from '../../shared/lib/uuid';
import { Button, ButtonLink } from '../../shared/ui/Button/Button';
import { Container } from '../../shared/ui/Container/Container';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import { Stepper } from '../../shared/ui/Stepper/Stepper';
import styles from './CheckoutPage.module.css';
import { OrderSummary } from './OrderSummary';

const STEPS = [{ label: '01 · Контакты' }, { label: '02 · Доставка' }, { label: '03 · Оплата' }];

function submitErrorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'OUT_OF_STOCK' || error.code === 'VALIDATION_FAILED') return error.message;
    if (error.code === 'RATE_LIMITED') return error.message;
    if (error.code === 'NETWORK') return 'Нет соединения. Проверьте интернет и нажмите ещё раз.';
  }
  return 'Не получилось оформить заказ. Попробуйте ещё раз.';
}

export function CheckoutPage() {
  useMeta('Оформление заказа');
  const navigate = useNavigate();
  const viewer = useViewer();
  const store = useStoreInfo();
  const addresses = useAddresses(Boolean(viewer));
  const guestItems = useGuestCart((state) => state.items);

  const [draft, setDraft] = useState<CheckoutDraft>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Один ключ на попытку оформления: двойное нажатие и повтор после обрыва не создадут два заказа.
  const [idempotencyKey] = useState(uuidV4);

  // Черновик заполняется, когда известно, кто покупает и какой у него адрес по умолчанию.
  const ready = viewer !== undefined && (!viewer || !addresses.isPending);
  if (ready && !draft) {
    const defaultAddress = addresses.data?.items.find((item) => item.isDefault);
    setDraft(initialDraft(viewer, defaultAddress?.id));
  }

  const quote = useCheckoutQuote(viewer, draft?.method ?? 'courier');
  const create = useCreateOrder(viewer ?? null);

  if (!draft || viewer === undefined || quote.isPending) {
    return (
      <Container className={styles.page}>
        <Skeleton width="60%" height={56} />
        <div className={styles.layout} aria-busy="true">
          <Skeleton height={520} />
          <Skeleton className={styles.summary} height={360} />
        </div>
      </Container>
    );
  }

  if (quote.isError) {
    return (
      <Container className={styles.page}>
        <EmptyState
          icon="alert"
          headingLevel="h1"
          title="Не удалось загрузить заказ"
          description="Проверьте соединение и попробуйте ещё раз."
          action={
            <Button variant="outline" size="md" onClick={() => void quote.refetch()}>
              Повторить
            </Button>
          }
        />
      </Container>
    );
  }

  const lines = quote.data.cart.lines;
  // После оформления корзина пуста, но страница уже уходит на оплату — пустое состояние не нужно.
  if (lines.length === 0 && create.isIdle) {
    return (
      <Container className={styles.page}>
        <EmptyState
          headingLevel="h1"
          title="В корзине пока пусто"
          description="Добавьте образцы, чтобы оформить заказ."
          action={
            <ButtonLink to="/catalog" size="md">
              В&nbsp;каталог
            </ButtonLink>
          }
        />
      </Container>
    );
  }

  const unavailable = lines.some((line) => line.status !== 'available');

  // После первой неудачной отправки форма перепроверяет себя на каждое изменение:
  // подпись под уже исправленным полем не должна висеть до следующего нажатия.
  const change = (next: CheckoutDraft) => {
    setDraft(next);
    if (Object.keys(errors).length > 0) {
      const result = validateCheckout(next, !viewer);
      setErrors(result.ok ? {} : result.errors);
    }
  };

  const submit = () => {
    const result = validateCheckout(draft, !viewer);
    if (!result.ok) {
      setErrors(result.errors);
      // Ошибка может быть выше экрана: переводим фокус на первое неверное поле.
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('main [aria-invalid="true"]')?.focus();
      });
      return;
    }
    setErrors({});
    create.mutate(
      { ...result.request, idempotencyKey, ...(viewer ? {} : { items: guestItems }) },
      {
        onSuccess: ({ order, accessToken }) => {
          const query = accessToken ? `?token=${encodeURIComponent(accessToken)}` : '';
          void navigate(`/checkout/payment/${order.id}${query}`, { replace: true });
        },
        onError: (error) => {
          // Остатки изменились: итог и пометки на экране должны догнать сервер.
          if (error instanceof ApiError && error.code === 'OUT_OF_STOCK') void quote.refetch();
        },
      },
    );
  };

  const submitError =
    unavailable || create.isError ? (
      <p role="alert" className={styles.alert}>
        {create.isError
          ? submitErrorText(create.error)
          : 'Часть образцов закончилась, пока вы выбирали.'}{' '}
        <Link to="/cart" className={styles.alertLink}>
          Проверить корзину
        </Link>
      </p>
    ) : null;

  return (
    <Container className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Оформление заказа</h1>
        <Stepper
          steps={STEPS}
          current={currentStep(draft)}
          label="Шаги оформления"
          variant="mono"
        />
      </div>
      <div className={styles.layout}>
        <CheckoutForm
          viewer={viewer}
          draft={draft}
          onChange={change}
          errors={errors}
          addresses={addresses.data?.items ?? []}
          quote={quote.data}
          store={store.data}
          submitting={create.isPending || create.isSuccess}
          submitError={submitError}
          onSubmit={submit}
        />
        <OrderSummary quote={quote.data} method={draft.method} updating={quote.isFetching} />
      </div>
    </Container>
  );
}
