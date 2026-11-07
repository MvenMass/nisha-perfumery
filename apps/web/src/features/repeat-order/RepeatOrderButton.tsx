import { repeatOrderResponseSchema } from '@nisha/contracts';
import type { Order, RepeatOrderResponse, User } from '@nisha/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { useGuestCart } from '../../entities/cart/guest-cart';
import { cartQueryKey } from '../../entities/cart/queries';
import { formatVolume } from '../../entities/product/lib/format';
import { apiRequest } from '../../shared/api/http';
import { Button } from '../../shared/ui/Button/Button';
import type { ButtonSize, ButtonVariant } from '../../shared/ui/Button/Button';
import styles from './RepeatOrderButton.module.css';

const REASONS: Record<RepeatOrderResponse['unavailable'][number]['reason'], string> = {
  removed: 'больше не продаётся',
  unpublished: 'снят с\u00A0продажи',
  out_of_stock: 'закончился',
};

type RepeatOrderButtonProps = {
  orderId: string;
  /** Позиции заказа — нужны только гостю, у которого корзина в браузере. */
  items?: Order['items'] | undefined;
  viewer: User | null;
  /** «Повторить заказ» в кабинете или «Вернуть образцы в корзину» после отказа оплаты. */
  label: string;
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
};

/**
 * Повтор заказа (D-041). Вошедшему позиции кладёт сервер по текущим ценам и называет
 * недоступное. Гостю (после отказа оплаты) — локальная корзина; цены и наличие покажет
 * корзина, как обычно.
 */
export function RepeatOrderButton({
  orderId,
  items = [],
  viewer,
  label,
  variant,
  size,
}: RepeatOrderButtonProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const repeat = useMutation({
    mutationFn: async (): Promise<RepeatOrderResponse['unavailable']> => {
      if (!viewer) {
        const guest = useGuestCart.getState();
        for (const item of items) {
          if (!item.variantId) continue;
          const current =
            guest.items.find((line) => line.variantId === item.variantId)?.quantity ?? 0;
          guest.setQuantity(item.variantId, current + item.quantity);
        }
        return [];
      }
      const response = await apiRequest(
        `/api/orders/${orderId}/repeat`,
        repeatOrderResponseSchema,
        { method: 'POST' },
      );
      queryClient.setQueryData(cartQueryKey(viewer), response.cart);
      return response.unavailable;
    },
    onSuccess: (unavailable) => {
      void queryClient.invalidateQueries({ queryKey: cartQueryKey(viewer) });
      // Если что-то не добавилось, покупатель должен это прочитать, прежде чем уйти в корзину.
      if (unavailable.length === 0) void navigate('/cart');
    },
  });

  return (
    <div className={styles.wrap}>
      <Button
        variant={variant ?? 'outline'}
        size={size ?? 'md'}
        disabled={repeat.isPending}
        onClick={() => repeat.mutate()}
      >
        {repeat.isPending ? 'Добавляем…' : label}
      </Button>
      {repeat.isError && (
        <p role="alert" className={styles.message}>
          Не получилось добавить в&nbsp;корзину. Попробуйте ещё раз.
        </p>
      )}
      {repeat.isSuccess && repeat.data.length > 0 && (
        <div role="status" className={styles.message}>
          <p>Не всё удалось добавить:</p>
          <ul className={styles.list}>
            {repeat.data.map((item) => (
              <li key={`${item.productName}-${item.volumeMl}`}>
                {item.productName}, {formatVolume(item.volumeMl)}&nbsp;— {REASONS[item.reason]}
              </li>
            ))}
          </ul>
          <Button variant="link" size="md" onClick={() => void navigate('/cart')}>
            Перейти в&nbsp;корзину
          </Button>
        </div>
      )}
    </div>
  );
}
