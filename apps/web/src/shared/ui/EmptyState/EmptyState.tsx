import type { ReactNode } from 'react';

import { cx } from '../../lib/cx';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/Icon';
import { SectionLabel } from '../SectionLabel/SectionLabel';
import styles from './EmptyState.module.css';

type EmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Мелкая метка над заголовком. */
  label?: ReactNode;
  icon?: IconName | undefined;
  /** Кнопка или ссылка: «Сбросить фильтры», «В каталог». */
  action?: ReactNode;
  headingLevel?: 'h1' | 'h2' | 'h3' | undefined;
  className?: string | undefined;
};

export function EmptyState({
  title,
  description,
  label,
  icon = 'stone',
  action,
  headingLevel: Heading = 'h2',
  className,
}: EmptyStateProps) {
  return (
    <div className={cx(styles.empty, className)}>
      <Icon name={icon} size={40} className={styles.icon} />
      <div className={styles.text}>
        {label && <SectionLabel tone="muted">{label}</SectionLabel>}
        <Heading className={styles.title}>{title}</Heading>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {action}
    </div>
  );
}
