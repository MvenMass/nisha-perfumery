// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { Sheet } from './Sheet';

function Filters() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Фильтры
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Фильтры"
        closeLabel="Закрыть фильтры"
        footer={<button type="button">Показать</button>}
      >
        <button type="button">Базальт</button>
      </Sheet>
    </>
  );
}

async function openSheet() {
  render(<Filters />);
  await userEvent.click(screen.getByRole('button', { name: 'Фильтры' }));
  return screen.getByRole('dialog', { name: 'Фильтры' });
}

describe('Sheet', () => {
  it('открывается диалогом и переводит фокус внутрь', async () => {
    const dialog = await openSheet();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Закрыть фильтры' }));
  });

  it('держит фокус внутри при Tab и Shift+Tab', async () => {
    await openSheet();
    const close = screen.getByRole('button', { name: 'Закрыть фильтры' });
    const last = screen.getByRole('button', { name: 'Показать' });

    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(last);
    await userEvent.tab();
    expect(document.activeElement).toBe(close);
  });

  it('закрывается по Esc и возвращает фокус на кнопку открытия', async () => {
    await openSheet();
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Фильтры' }));
  });

  it('блокирует прокрутку страницы, пока открыт', async () => {
    await openSheet();
    expect(document.body.style.position).toBe('fixed');

    await userEvent.click(screen.getByRole('button', { name: 'Закрыть фильтры' }));
    expect(document.body.style.position).toBe('');
  });
});
