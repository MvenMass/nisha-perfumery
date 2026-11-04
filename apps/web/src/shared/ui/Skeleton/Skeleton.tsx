import type { CSSProperties } from 'react';

import { cx } from '../../lib/cx';
import styles from './Skeleton.module.css';

type SkeletonProps = {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  className?: string | undefined;
};

// Заглушка на время загрузки. Скринридеру о загрузке сообщает контейнер (aria-busy), не каждая плашка.
export function Skeleton({ width = '100%', height = 16, className }: SkeletonProps) {
  return (
    <span aria-hidden="true" className={cx(styles.skeleton, className)} style={{ width, height }} />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <span aria-hidden="true" className={cx(styles.lines, className)}>
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} className={cx(styles.skeleton, styles.line)} />
      ))}
    </span>
  );
}
