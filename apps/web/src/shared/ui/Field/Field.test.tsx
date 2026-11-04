// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Input } from './Input';
import { Select } from './Select';

describe('Input', () => {
  it('связывает подпись с полем', () => {
    render(<Input label="Телефон" type="tel" />);
    expect(screen.getByLabelText('Телефон').getAttribute('type')).toBe('tel');
  });

  it('помечает ошибку и связывает её текст с полем', () => {
    render(<Input label="Электронная почта" error="Не хватает домена" hint="Для чека" />);
    const input = screen.getByLabelText('Электронная почта');

    expect(input.getAttribute('aria-invalid')).toBe('true');
    const describedBy = (input.getAttribute('aria-describedby') ?? '').split(' ');
    const texts = describedBy.map((id) => document.getElementById(id)?.textContent);
    expect(texts).toEqual(['Для чека', 'Не хватает домена']);
  });

  it('без ошибки не ставит aria-invalid и aria-describedby', () => {
    render(<Input label="Имя" />);
    const input = screen.getByLabelText('Имя');
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
  });
});

describe('Select', () => {
  it('связывает подпись с нативным select', () => {
    render(
      <Select label="Сортировка" compact>
        <option>Популярные</option>
      </Select>,
    );
    expect(screen.getByLabelText('Сортировка').tagName).toBe('SELECT');
  });
});
