import { orderStatusSchema } from '@nisha/contracts';
import { describe, expect, it } from 'vitest';

import { orderTimeline, STATUS_LABELS, statusShape } from './status';

describe('метка статуса', () => {
  it('у каждого статуса есть подпись, форма различает завершённые', () => {
    for (const status of orderStatusSchema.options) expect(STATUS_LABELS[status]).toBeTruthy();
    expect(statusShape('shipped')).toBe('fill');
    expect(statusShape('delivered')).toBe('outline');
    expect(statusShape('cancelled')).toBe('dashed');
  });
});

describe('orderTimeline', () => {
  const at = (day: number) =>
    new Date(Date.UTC(new Date().getFullYear(), 10, day, 12)).toISOString();

  it('доставка: текущий шаг и даты из истории', () => {
    const timeline = orderTimeline({
      status: 'shipped',
      deliveryMethod: 'courier',
      history: [
        { status: 'pending', at: at(3) },
        { status: 'paid', at: at(3) },
        { status: 'shipped', at: at(5) },
      ],
    });
    expect(timeline?.current).toBe(2);
    expect(timeline?.steps.map((step) => step.label)).toEqual([
      'Оформлен',
      'Оплачен',
      'Передан в\u00A0доставку',
      'Доставлен',
    ]);
    expect(timeline?.steps.map((step) => step.meta)).toEqual([
      '3 ноября',
      '3 ноября',
      '5 ноября',
      undefined,
    ]);
  });

  it('самовывоз называет шаги по-своему', () => {
    const timeline = orderTimeline({ status: 'paid', deliveryMethod: 'boutique', history: [] });
    expect(timeline?.steps.map((step) => step.label).slice(2)).toEqual([
      'Готов к\u00A0выдаче',
      'Получен',
    ]);
  });

  it('у отменённого заказа шкалы нет', () => {
    expect(
      orderTimeline({ status: 'cancelled', deliveryMethod: 'courier', history: [] }),
    ).toBeUndefined();
  });
});
