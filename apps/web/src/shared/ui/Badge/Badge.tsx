import type { ReactNode } from 'react';

import { cx } from '../../lib/cx';
import styles from './Badge.module.css';

type BadgeProps = {
  /** accent — «Бестселлер», light — «Новый образец», outline — «Нет в наличии». */
  tone: 'accent' | 'light' | 'outline';
  children: ReactNode;
  className?: string | undefined;
};

export function Badge({ tone, children, className }: BadgeProps) {
  return <span className={cx(styles.badge, styles[tone], className)}>{children}</span>;
}

type StatusBadgeProps = {
  /** fill — заказ в работе, outline — завершён, dashed — отменён. */
  shape: 'fill' | 'outline' | 'dashed';
  children: ReactNode;
  className?: string | undefined;
};

const shapeClass = {
  fill: styles.fill,
  outline: styles.statusOutline,
  dashed: styles.dashed,
};

export function StatusBadge({ shape, children, className }: StatusBadgeProps) {
  return <span className={cx(styles.status, shapeClass[shape], className)}>{children}</span>;
}
