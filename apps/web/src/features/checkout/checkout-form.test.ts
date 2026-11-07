import { describe, expect, it } from 'vitest';

import { currentStep, initialDraft, validateCheckout } from './checkout-form';
import type { CheckoutDraft } from './checkout-form';

const user = {
  id: '0190a6f0-0000-7000-8000-000000000001',
  email: 'anna@nisha.test',
  name: 'Анна',
  phone: '+7 900 000-00-00',
  role: 'user' as const,
  hasPassword: true,
};

const filled = (overrides: Partial<CheckoutDraft> = {}): CheckoutDraft => ({
  ...initialDraft(user, undefined),
  newAddress: { city: 'Москва', street: 'Тверская, 1', apartment: '', comment: '' },
  ...overrides,
});

describe('validateCheckout', () => {
  it('собирает запрос с новым адресом и не сохраняет его гостю', () => {
    const asUser = validateCheckout(filled(), false);
    expect(asUser).toMatchObject({
      ok: true,
      request: {
        contact: { email: 'anna@nisha.test' },
        delivery: {
          method: 'courier',
          address: {
            newAddress: { city: 'Москва', street: 'Тверская, 1', apartment: null },
            save: true,
          },
        },
      },
    });
    const asGuest = validateCheckout(filled(), true);
    expect(asGuest.ok && asGuest.request.delivery).toMatchObject({ address: { save: false } });
  });

  it('подписывает ошибки полей по их месту в форме', () => {
    const result = validateCheckout(
      filled({
        contact: { name: '', phone: '12', email: 'name@example' },
        newAddress: { city: '', street: '', apartment: '', comment: '' },
      }),
      false,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual([
      'address.city',
      'address.street',
      'contact.email',
      'contact.name',
      'contact.phone',
    ]);
    expect(result.errors['contact.email']).toBe('Проверьте адрес почты');
  });

  it('пункт выдачи нужно выбрать; самовывозу адрес не нужен', () => {
    const point = validateCheckout(filled({ method: 'pickup_point' }), false);
    expect(point.ok ? {} : point.errors).toEqual({ pickupPoint: 'Выберите пункт выдачи' });
    expect(
      validateCheckout(
        filled({
          method: 'boutique',
          newAddress: { city: '', street: '', apartment: '', comment: '' },
        }),
        true,
      ).ok,
    ).toBe(true);
  });

  it('сохранённый адрес передаётся по id, комментарий — отдельно', () => {
    const result = validateCheckout(
      filled({
        addressId: '0190a6f0-0000-7000-8000-0000000000aa',
        newAddress: { city: '', street: '', apartment: '', comment: 'Домофон 12' },
      }),
      false,
    );
    expect(result).toMatchObject({
      ok: true,
      request: {
        delivery: { address: { addressId: '0190a6f0-0000-7000-8000-0000000000aa' } },
        comment: 'Домофон 12',
      },
    });
  });
});

describe('currentStep', () => {
  it('показывает первый незаполненный блок', () => {
    expect(currentStep(initialDraft(null, undefined))).toBe(0);
    expect(
      currentStep(filled({ newAddress: { city: '', street: '', apartment: '', comment: '' } })),
    ).toBe(1);
    expect(currentStep(filled())).toBe(2);
  });
});
