import type { CartLine, CartResponse } from '@nisha/contracts';

import { useCart } from '../../entities/cart/queries';
import { useViewer } from '../../entities/user/queries';
import { bottlesCount, specimensCount } from '../../entities/product/lib/format';
import { cartErrorText, useChangeCart } from '../../features/cart/mutations';
import { formatPrice } from '../../shared/lib/money';
import { useMeta } from '../../shared/lib/useMeta';
import { Button, ButtonLink } from '../../shared/ui/Button/Button';
import { Container } from '../../shared/ui/Container/Container';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { Icon } from '../../shared/ui/Icon/Icon';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import { CartLineItem } from './CartLineItem';
import styles from './CartPage.module.css';

function CartSkeleton() {
  return (
    <div className={styles.layout} aria-busy="true" aria-label="Загружаем корзину">
      <div className={styles.lines}>
        {[0, 1].map((key) => (
          <div key={key} className={styles.skeletonLine}>
            <Skeleton width={120} height={150} />
            <div className={styles.info}>
              <Skeleton width="40%" height={12} />
              <Skeleton width="60%" height={28} />
              <Skeleton width="50%" height={12} />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className={styles.summary} height={360} />
    </div>
  );
}

function Summary({ cart, updating }: { cart: CartResponse; updating: boolean }) {
  const { bottlesCount: bottles, itemsTotalKopecks } = cart.summary;
  return (
    <aside aria-label="Итог заказа" aria-busy={updating} className={styles.summary}>
      <p className={styles.summaryLabel}>Итог</p>
      <dl className={styles.summaryList}>
        <div className={styles.summaryRow}>
          <dt>Товары, {bottles}&nbsp;шт.</dt>
          <dd>{formatPrice(itemsTotalKopecks)}</dd>
        </div>
        <div className={styles.summaryRow}>
          <dt>Доставка</dt>
          <dd>на&nbsp;следующем шаге</dd>
        </div>
      </dl>
      <div className={styles.total}>
        <span className={styles.totalLabel}>Итого</span>
        <span className={styles.totalValue} data-testid="cart-total">
          {formatPrice(itemsTotalKopecks)}
        </span>
      </div>
      {bottles > 0 ? (
        <ButtonLink to="/checkout" size="xl" fullWidth iconEnd="arrow-right">
          Оформить заказ
        </ButtonLink>
      ) : (
        // Всё в корзине закончилось — оформлять нечего, но кнопка остаётся на своём месте.
        <Button
          size="xl"
          fullWidth
          disabled
          iconEnd="arrow-right"
          aria-describedby="checkout-empty"
        >
          Оформить заказ
        </Button>
      )}
      {bottles === 0 && (
        <p id="checkout-empty" className={styles.soon}>
          Сейчас в&nbsp;корзине нет образцов в&nbsp;наличии.
        </p>
      )}
      <p className={styles.perk}>
        <Icon name="gift" size={18} />
        Каждый заказ упакуем вручную и&nbsp;вложим этикетку образца.
      </p>
    </aside>
  );
}

export function CartPage() {
  useMeta('Корзина');
  const cart = useCart(useViewer());
  const change = useChangeCart();

  const errorFor = (line: CartLine) =>
    change.isError && change.variables.variantId === line.variantId
      ? cartErrorText(change.error)
      : undefined;

  const setQuantity = (line: CartLine, quantity: number) =>
    // У позиции с нехваткой остатка «−» сразу опускает количество до доступного.
    change.mutate({
      type: 'set',
      variantId: line.variantId,
      quantity: Math.min(quantity, line.availableQuantity),
    });

  let content;
  if (cart.isPending) {
    content = <CartSkeleton />;
  } else if (cart.isError) {
    content = (
      <EmptyState
        icon="alert"
        title="Не удалось загрузить корзину"
        description="Проверьте соединение и попробуйте ещё раз."
        action={
          <Button variant="outline" size="md" onClick={() => void cart.refetch()}>
            Повторить
          </Button>
        }
      />
    );
  } else if (cart.data.lines.length === 0) {
    content = (
      <EmptyState
        title="Здесь пока ни&nbsp;одного образца"
        action={
          <ButtonLink to="/catalog" size="md">
            В&nbsp;каталог
          </ButtonLink>
        }
      />
    );
  } else {
    content = (
      <div className={styles.layout}>
        <ul className={styles.lines}>
          {cart.data.lines.map((line) => (
            <CartLineItem
              key={line.variantId}
              line={line}
              error={errorFor(line)}
              onQuantity={(quantity) => setQuantity(line, quantity)}
              onRemove={() => change.mutate({ type: 'remove', variantId: line.variantId })}
            />
          ))}
          <li className={styles.continue}>
            <ButtonLink to="/catalog" variant="link" size="md">
              <Icon name="arrow-left" size={16} />
              Продолжить покупки
            </ButtonLink>
          </li>
        </ul>
        <Summary cart={cart.data} updating={change.isPending || cart.isFetching} />
      </div>
    );
  }

  const summary = cart.data?.summary;
  return (
    <Container className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Корзина</h1>
        {summary && summary.bottlesCount > 0 && (
          <p className={styles.count}>
            {specimensCount(summary.productsCount)} · {bottlesCount(summary.bottlesCount)}
          </p>
        )}
      </div>
      {content}
    </Container>
  );
}
