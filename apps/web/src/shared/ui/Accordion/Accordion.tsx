import type { ReactNode } from 'react';

import { cx } from '../../lib/cx';
import { Icon } from '../Icon/Icon';
import styles from './Accordion.module.css';

type AccordionProps = {
  title: ReactNode;
  /** Сколько выбрано внутри — показывается в заголовке: «Категория · 1». */
  count?: number | undefined;
  /** footer — разделы мобильного подвала, filter — разделы шторки фильтров. */
  variant?: 'footer' | 'filter' | undefined;
  defaultOpen?: boolean | undefined;
  children: ReactNode;
  className?: string | undefined;
};

// details/summary: раскрытие работает без JS и с клавиатуры, поддерживается Safari 14.
export function Accordion({
  title,
  count,
  variant = 'footer',
  defaultOpen = false,
  children,
  className,
}: AccordionProps) {
  return (
    <details className={cx(styles.accordion, styles[variant], className)} open={defaultOpen}>
      <summary className={styles.summary}>
        <span>
          {title}
          {count !== undefined && count > 0 && ` · ${count}`}
        </span>
        <Icon name="chevron-down" size={16} className={styles.chevron} />
      </summary>
      <div className={styles.content}>{children}</div>
    </details>
  );
}
