import type { ReactNode } from 'react';

import { cx } from '../../lib/cx';
import styles from './SectionLabel.module.css';

type SectionLabelProps = {
  as?: 'p' | 'span' | undefined;
  /** muted — серая метка («Пустое состояние», «О нас пишут»). */
  tone?: 'copper' | 'muted' | undefined;
  className?: string | undefined;
  children: ReactNode;
};

// Моноширинная метка над заголовком: «Коллекция образцов · бестселлеры».
export function SectionLabel({
  as: Tag = 'p',
  tone = 'copper',
  className,
  children,
}: SectionLabelProps) {
  return (
    <Tag className={cx(styles.label, tone === 'muted' && styles.muted, className)}>{children}</Tag>
  );
}
