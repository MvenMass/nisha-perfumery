import { orderStatusSchema } from '@nisha/contracts';
import type { OrderStatus } from '@nisha/contracts';
import { describe, expect, it } from 'vitest';

import { canTransition } from './order-status';

describe('canTransition', () => {
  it('разрешает путь заказа с доставкой и с самовывозом', () => {
    expect(canTransition('pending', 'paid', 'courier')).toBe(true);
    expect(canTransition('paid', 'shipped', 'courier')).toBe(true);
    expect(canTransition('paid', 'shipped', 'pickup_point')).toBe(true);
    expect(canTransition('shipped', 'delivered', 'courier')).toBe(true);
    expect(canTransition('paid', 'ready_for_pickup', 'boutique')).toBe(true);
    expect(canTransition('ready_for_pickup', 'delivered', 'boutique')).toBe(true);
  });

  it('отменить можно только до отправки', () => {
    expect(canTransition('pending', 'cancelled', 'courier')).toBe(true);
    expect(canTransition('paid', 'cancelled', 'courier')).toBe(true);
    expect(canTransition('shipped', 'cancelled', 'courier')).toBe(false);
    expect(canTransition('delivered', 'cancelled', 'courier')).toBe(false);
  });

  it('не путает доставку и самовывоз', () => {
    expect(canTransition('paid', 'ready_for_pickup', 'courier')).toBe(false);
    expect(canTransition('paid', 'shipped', 'boutique')).toBe(false);
  });

  it('не пропускает шаги и не возвращается назад', () => {
    expect(canTransition('pending', 'shipped', 'courier')).toBe(false);
    expect(canTransition('pending', 'delivered', 'courier')).toBe(false);
    expect(canTransition('paid', 'pending', 'courier')).toBe(false);
  });

  it('из завершённых статусов выхода нет', () => {
    const all: OrderStatus[] = orderStatusSchema.options;
    for (const to of all) {
      expect(canTransition('delivered', to, 'courier')).toBe(false);
      expect(canTransition('cancelled', to, 'courier')).toBe(false);
    }
  });
});
