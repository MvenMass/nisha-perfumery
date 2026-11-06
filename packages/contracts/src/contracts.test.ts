import { describe, expect, it } from 'vitest';

import { addressInputSchema } from './address';
import { registerRequestSchema } from './auth';
import { cartItemInputSchema } from './cart';
import { catalogQuerySchema } from './catalog';
import { emailSchema, kopecksSchema } from './common';
import { createOrderRequestSchema } from './order';

describe('catalogQuerySchema', () => {
  it('принимает списки и через запятую, и повтором параметра', () => {
    const query = catalogQuerySchema.parse({
      material: 'basalt,walnut',
      category: ['women', 'men'],
      volume: ['30', '50'],
    });
    expect(query).toMatchObject({
      material: ['basalt', 'walnut'],
      category: ['women', 'men'],
      volume: [30, 50],
      collection: [],
      sort: 'popular',
      limit: 12,
      offset: 0,
    });
  });

  it('приводит цену и пагинацию из строк query', () => {
    const query = catalogQuerySchema.parse({ priceMin: '4000', priceMax: '9000', offset: '12' });
    expect(query).toMatchObject({ priceMin: 4000, priceMax: 9000, offset: 12 });
  });

  it('отклоняет неизвестную сортировку, перевёрнутый диапазон цены и слишком большую страницу', () => {
    expect(catalogQuerySchema.safeParse({ sort: 'random' }).success).toBe(false);
    expect(catalogQuerySchema.safeParse({ priceMin: '9000', priceMax: '4000' }).success).toBe(
      false,
    );
    expect(catalogQuerySchema.safeParse({ limit: '500' }).success).toBe(false);
  });

  it('разбирает плотность и поиск, пустые параметры считает отсутствующими', () => {
    const query = catalogQuerySchema.parse({ density: 'high,light', q: '  ладан ', priceMin: '' });
    expect(query).toMatchObject({ density: ['high', 'light'], q: 'ладан' });
    expect(query.priceMin).toBeUndefined();
    expect(catalogQuerySchema.parse({ q: '' }).q).toBeUndefined();
    expect(catalogQuerySchema.safeParse({ q: 'л' }).success).toBe(false);
    expect(catalogQuerySchema.safeParse({ density: 'heavy' }).success).toBe(false);
  });

  it('отклоняет slug с недопустимыми символами', () => {
    expect(catalogQuerySchema.safeParse({ material: 'Basalt!' }).success).toBe(false);
  });
});

describe('общие схемы', () => {
  it('нормализуют email так же, как БД', () => {
    expect(emailSchema.parse('  Anna@Nisha.RU ')).toBe('anna@nisha.ru');
    expect(emailSchema.safeParse('name@example').success).toBe(false);
  });

  it('принимают только целые копейки', () => {
    expect(kopecksSchema.safeParse(450_000).success).toBe(true);
    expect(kopecksSchema.safeParse(4500.5).success).toBe(false);
    expect(kopecksSchema.safeParse(-1).success).toBe(false);
  });
});

describe('авторизация', () => {
  it('требует пароль не короче 8 символов и имя', () => {
    const result = registerRequestSchema.safeParse({
      email: 'a@nisha.ru',
      password: '1234567',
      name: ' ',
    });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((issue) => issue.path.join('.'));
    expect(paths).toEqual(['password', 'name']);
  });
});

describe('корзина и заказ', () => {
  it('ограничивает количество в позиции', () => {
    const variantId = '0190f1a2-3b4c-7d5e-8f60-718293a4b5c6';
    expect(cartItemInputSchema.safeParse({ variantId, quantity: 0 }).success).toBe(false);
    expect(cartItemInputSchema.safeParse({ variantId, quantity: 100 }).success).toBe(false);
    expect(cartItemInputSchema.safeParse({ variantId, quantity: 2 }).success).toBe(true);
  });

  it('отбрасывает цены, присланные клиентом в заказе', () => {
    const order = createOrderRequestSchema.parse({
      contact: { name: 'Анна', phone: '+7 900 000-00-00', email: 'anna@nisha.ru' },
      delivery: { method: 'boutique' },
      idempotencyKey: '0190f1a2-3b4c-7d5e-8f60-718293a4b5c6',
      totalKopecks: 1,
      items: [{ variantId: '0190f1a2-3b4c-7d5e-8f60-718293a4b5c7', quantity: 1, priceKopecks: 1 }],
    });
    expect(order).not.toHaveProperty('totalKopecks');
    expect(order.items?.[0]).toEqual({
      variantId: '0190f1a2-3b4c-7d5e-8f60-718293a4b5c7',
      quantity: 1,
    });
  });

  it('требует адрес у курьерской доставки', () => {
    const base = {
      contact: { name: 'Анна', phone: '+7 900 000-00-00', email: 'anna@nisha.ru' },
      idempotencyKey: '0190f1a2-3b4c-7d5e-8f60-718293a4b5c6',
    };
    expect(
      createOrderRequestSchema.safeParse({ ...base, delivery: { method: 'courier' } }).success,
    ).toBe(false);
    const withAddress = createOrderRequestSchema.safeParse({
      ...base,
      delivery: {
        method: 'courier',
        address: { newAddress: { label: 'Дом', city: 'Москва', street: 'Тверская, 1' } },
      },
    });
    expect(withAddress.success).toBe(true);
  });

  it('превращает пустую квартиру в null', () => {
    const address = addressInputSchema.parse({
      label: 'Дом',
      city: 'Москва',
      street: 'Тверская, 1',
      apartment: '  ',
    });
    expect(address).toMatchObject({ apartment: null, isDefault: false });
  });
});
