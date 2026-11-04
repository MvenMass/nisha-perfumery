// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { Header } from './Header';

function renderHeader(cartCount: number, path = '/') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Header cartCount={cartCount} />
    </MemoryRouter>,
  );
}

describe('Header', () => {
  it('называет число товаров в корзине с правильным склонением', () => {
    renderHeader(3);
    expect(screen.getByRole('link', { name: 'Корзина, 3 товара' })).toBeTruthy();
  });

  it('без товаров подписывает корзину без числа', () => {
    renderHeader(0);
    expect(screen.getByRole('link', { name: 'Корзина' })).toBeTruthy();
  });

  it('помечает текущий раздел', () => {
    renderHeader(0, '/catalog');
    const [desktopLink] = screen.getAllByRole('link', { name: 'Каталог' });
    expect(desktopLink?.getAttribute('aria-current')).toBe('page');
  });

  it('открывает мобильное меню и закрывает его по ссылке', async () => {
    renderHeader(0);
    const button = screen.getByRole('button', { name: 'Открыть меню' });
    await userEvent.click(button);

    const menu = screen.getByRole('dialog', { name: 'Меню' });
    expect(button.getAttribute('aria-expanded')).toBe('true');

    const journal = Array.from(menu.querySelectorAll('a')).find((a) => a.textContent === 'Журнал');
    if (!journal) throw new Error('В меню нет ссылки «Журнал»');
    await userEvent.click(journal);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
