// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { Tabs } from './Tabs';

const items = [
  { value: 'all', label: 'Все' },
  { value: 'active', label: 'Активные' },
  { value: 'done', label: 'Завершённые' },
] as const;

function OrdersTabs() {
  const [value, setValue] = useState<(typeof items)[number]['value']>('all');
  return (
    <>
      <Tabs items={items} value={value} onChange={setValue} label="Фильтр заказов" panelId="p" />
      <div id="p" role="tabpanel">
        {value}
      </div>
    </>
  );
}

describe('Tabs', () => {
  it('в порядке Tab только выбранная вкладка', () => {
    render(<OrdersTabs />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
  });

  it('стрелки, Home и End переключают вкладки и переводят фокус', async () => {
    render(<OrdersTabs />);
    await userEvent.click(screen.getByRole('tab', { name: 'Все' }));

    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Активные' }));
    expect(screen.getByRole('tabpanel').textContent).toBe('active');

    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Завершённые' }).getAttribute('aria-selected')).toBe(
      'true',
    );

    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Все' }));

    await userEvent.keyboard('{ArrowLeft}{Home}');
    expect(screen.getByRole('tabpanel').textContent).toBe('all');
  });
});
