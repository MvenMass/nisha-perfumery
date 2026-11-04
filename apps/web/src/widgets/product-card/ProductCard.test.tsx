// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { ProductCard } from './ProductCard';
import type { ProductCardData } from './ProductCard';

const basalt: ProductCardData = {
  href: '/catalog/basalt',
  number: '03',
  name: 'Базальт',
  materialName: 'Базальт',
  notes: 'перец, ладан, ветивер',
  priceFromKopecks: 650_000,
  badge: 'bestseller',
  inStock: true,
};

function renderCard(product: ProductCardData) {
  const handlers = { onChooseVolume: vi.fn(), onNotify: vi.fn() };
  render(
    <MemoryRouter>
      <ProductCard product={product} {...handlers} />
    </MemoryRouter>,
  );
  return handlers;
}

describe('ProductCard', () => {
  it('показывает цену «от», бейдж и одну ссылку на товар в порядке Tab', () => {
    renderCard(basalt);
    expect(screen.getByText('от 6 500 ₽')).toBeTruthy();
    expect(screen.getByText('Бестселлер')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Базальт' })).toHaveLength(1);
  });

  it('«+» открывает выбор объёма', async () => {
    const { onChooseVolume } = renderCard(basalt);
    await userEvent.click(screen.getByRole('button', { name: 'В корзину: Базальт' }));
    expect(onChooseVolume).toHaveBeenCalledOnce();
  });

  it('без остатка: бейдж «Нет в наличии» вместо бейджа товара и кнопка «Сообщить»', async () => {
    const { onNotify } = renderCard({ ...basalt, inStock: false });

    expect(screen.queryByText('Бестселлер')).toBeNull();
    expect(screen.getByText('Нет в наличии')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /В корзину/ })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Сообщить о поступлении: Базальт' }));
    expect(onNotify).toHaveBeenCalledOnce();
  });
});
