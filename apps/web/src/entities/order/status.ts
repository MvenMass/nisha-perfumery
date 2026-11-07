import type { DeliveryMethod, Order, OrderStatus } from '@nisha/contracts';

import { formatDate } from '../../shared/lib/date';
import type { Step } from '../../shared/ui/Stepper/Stepper';

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Ожидает оплаты',
  paid: 'Оплачен',
  shipped: 'В пути',
  ready_for_pickup: 'Готов к выдаче',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
};

/** Статус различается не только цветом, но и формой метки (D-017, account.html). */
export function statusShape(status: OrderStatus): 'fill' | 'outline' | 'dashed' {
  if (status === 'cancelled') return 'dashed';
  if (status === 'delivered') return 'outline';
  return 'fill';
}

/** Подпись способа доставки в строке «от 12 ноября · курьером». */
export const DELIVERY_LABELS: Record<DeliveryMethod, string> = {
  courier: 'курьером',
  pickup_point: 'в\u00A0пункт выдачи',
  boutique: 'самовывоз из\u00A0бутика',
};

const STEP_INDEX: Record<OrderStatus, number> = {
  pending: 0,
  paid: 1,
  shipped: 2,
  ready_for_pickup: 2,
  delivered: 3,
  cancelled: -1,
};

/**
 * Шкала статуса как в account.html: «Оформлен → Оплачен → Передан в доставку → Доставлен»
 * (для самовывоза — «Готов к выдаче → Получен»). Даты — из истории статусов.
 * Для отменённого заказа шкалы нет — только метка.
 */
export function orderTimeline(
  order: Pick<Order, 'status' | 'deliveryMethod' | 'history'>,
): { steps: Step[]; current: number } | undefined {
  if (order.status === 'cancelled') return undefined;
  const boutique = order.deliveryMethod === 'boutique';
  const stages: Array<{ label: string; statuses: OrderStatus[] }> = [
    { label: 'Оформлен', statuses: ['pending'] },
    { label: 'Оплачен', statuses: ['paid'] },
    boutique
      ? { label: 'Готов к\u00A0выдаче', statuses: ['ready_for_pickup'] }
      : { label: 'Передан в\u00A0доставку', statuses: ['shipped'] },
    { label: boutique ? 'Получен' : 'Доставлен', statuses: ['delivered'] },
  ];
  const steps = stages.map((stage) => {
    const event = order.history.find((item) => stage.statuses.includes(item.status));
    return { label: stage.label, meta: event ? formatDate(event.at) : undefined };
  });
  return { steps, current: STEP_INDEX[order.status] };
}

export function isActiveStatus(status: OrderStatus): boolean {
  return status !== 'delivered' && status !== 'cancelled';
}
