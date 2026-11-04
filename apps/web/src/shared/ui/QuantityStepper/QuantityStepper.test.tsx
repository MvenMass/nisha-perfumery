// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { QuantityStepper } from './QuantityStepper';

describe('QuantityStepper', () => {
  it('меняет значение в пределах границ', async () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={2} min={1} max={3} itemName="Базальт" onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Увеличить: Базальт' }));
    await userEvent.click(screen.getByRole('button', { name: 'Уменьшить: Базальт' }));
    expect(onChange.mock.calls).toEqual([[3], [1]]);
  });

  it('блокирует кнопки на границах', () => {
    render(<QuantityStepper value={1} max={1} onChange={vi.fn()} />);
    const dec = screen.getByRole('button', { name: 'Уменьшить количество' });
    const inc = screen.getByRole('button', { name: 'Увеличить количество' });
    expect(dec).toHaveProperty('disabled', true);
    expect(inc).toHaveProperty('disabled', true);
  });
});
