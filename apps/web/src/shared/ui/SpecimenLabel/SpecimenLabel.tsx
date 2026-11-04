import type { ReactNode } from 'react';

import { cx } from '../../lib/cx';
import styles from './SpecimenLabel.module.css';

export type SpecimenRow = {
  term: string;
  value: ReactNode;
};

type SpecimenLabelProps = {
  /** Номер образца без «№»: «03». */
  number: string;
  /** Справа в верхней строке: объём или материал. */
  meta?: ReactNode;
  /** Название; уровень заголовка зависит от страницы. */
  name: ReactNode;
  headingLevel?: 'h2' | 'h3' | undefined;
  rows?: readonly SpecimenRow[] | undefined;
  className?: string | undefined;
};

// Этикетка образца: «ОБРАЗЕЦ № 03 · 50 МЛ», название и характеристики рядами через линии.
export function SpecimenLabel({
  number,
  meta,
  name,
  headingLevel: Heading = 'h3',
  rows,
  className,
}: SpecimenLabelProps) {
  return (
    <div className={cx(styles.specimen, className)}>
      <div className={styles.top}>
        <span>Образец №&nbsp;{number}</span>
        {meta && <span className={styles.meta}>{meta}</span>}
      </div>
      <Heading className={styles.name}>{name}</Heading>
      {rows && rows.length > 0 && (
        <dl className={styles.rows}>
          {rows.map((row) => (
            <div key={row.term} className={styles.row}>
              <dt className={styles.term}>{row.term}</dt>
              <dd className={styles.value}>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
