import { useRef } from 'react';
import type { KeyboardEvent } from 'react';

import { cx } from '../../lib/cx';
import styles from './Tabs.module.css';

export type TabItem<T extends string> = {
  value: T;
  label: string;
};

type TabsProps<T extends string> = {
  items: readonly TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Подпись группы для скринридера. */
  label: string;
  /** id панели с содержимым, которой управляют вкладки. */
  panelId: string;
  className?: string | undefined;
};

// ARIA Tabs с автоматической активацией: стрелки, Home и End переключают и переводят фокус.
// В порядке Tab участвует только выбранная вкладка (roving tabindex).
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  panelId,
  className,
}: TabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function select(index: number) {
    const item = items[index];
    if (!item) return;
    onChange(item.value);
    refs.current[index]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = items.length - 1;
    const next: Record<string, number> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    const target = next[event.key];
    if (target === undefined) return;
    event.preventDefault();
    select(target);
  }

  return (
    <div role="tablist" aria-label={label} className={cx(styles.tabs, className)}>
      {items.map((item, index) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            className={styles.tab}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
