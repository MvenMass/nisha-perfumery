import type { DeliveryMethod, OrderStatus } from '@nisha/contracts';

import { AppError } from '../../shared/errors';

/*
 * Конечный автомат статусов заказа (D-017, D-043). Единственное место, где решается,
 * какой переход допустим: его используют оплата, отмена и (в этапе 8) админка.
 */
const NEXT: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'ready_for_pickup', 'cancelled'],
  shipped: ['delivered'],
  ready_for_pickup: ['delivered'],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus, method: DeliveryMethod): boolean {
  if (!NEXT[from].includes(to)) return false;
  // Самовывоз «готов к выдаче», остальное «передано в доставку» — не наоборот.
  if (to === 'shipped') return method !== 'boutique';
  if (to === 'ready_for_pickup') return method === 'boutique';
  return true;
}

export function assertTransition(from: OrderStatus, to: OrderStatus, method: DeliveryMethod) {
  if (!canTransition(from, to, method)) {
    throw new AppError('CONFLICT', `Заказ нельзя перевести из «${from}» в «${to}»`);
  }
}

/** Вкладки кабинета: активные — до «Доставлен», завершённые — доставленные и отменённые. */
export const ACTIVE_STATUSES: readonly OrderStatus[] = [
  'pending',
  'paid',
  'shipped',
  'ready_for_pickup',
];
export const DONE_STATUSES: readonly OrderStatus[] = ['delivered', 'cancelled'];
