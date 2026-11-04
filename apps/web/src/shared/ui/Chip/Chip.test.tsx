// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Chip, RemovableChip } from './Chip';

function Toggle() {
  const [pressed, setPressed] = useState(false);
  return (
    <Chip pressed={pressed} swatch="#292725" onClick={() => setPressed((value) => !value)}>
      Базальт
    </Chip>
  );
}

describe('Chip', () => {
  it('сообщает состояние через aria-pressed', async () => {
    render(<Toggle />);
    const chip = screen.getByRole('button', { name: 'Базальт' });

    expect(chip.getAttribute('aria-pressed')).toBe('false');
    await userEvent.click(chip);
    expect(chip.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('RemovableChip', () => {
  it('подписан для скринридера и вызывает удаление', async () => {
    const onClick = vi.fn();
    render(<RemovableChip label="50 мл" onClick={onClick} />);

    await userEvent.click(screen.getByRole('button', { name: 'Убрать фильтр: 50 мл' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
