import type { ReactNode } from 'react';

import { cx } from '../../lib/cx';
import styles from './Prose.module.css';

/** Длинный текст: статья журнала, статические страницы. Ширина строки — для чтения, не для сетки. */
export function Prose({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return <div className={cx(styles.prose, className)}>{children}</div>;
}
