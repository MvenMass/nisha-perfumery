import type { ReactNode } from 'react';

import { cx } from '../../lib/cx';
import styles from './Container.module.css';

type ContainerProps = {
  as?: 'div' | 'section' | 'header' | 'footer' | 'main' | 'nav' | undefined;
  className?: string | undefined;
  children: ReactNode;
};

// Колонка макетов: до 1360px, поля 16px на телефоне и 40px от 768px.
export function Container({ as: Tag = 'div', className, children }: ContainerProps) {
  return <Tag className={cx(styles.container, className)}>{children}</Tag>;
}
