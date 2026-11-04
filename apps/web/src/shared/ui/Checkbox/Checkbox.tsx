import type { InputHTMLAttributes, ReactNode } from 'react';

import { cx } from '../../lib/cx';
import styles from './Checkbox.module.css';

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> & {
  label: ReactNode;
  /** Число справа: сколько товаров даст фильтр. */
  count?: number | undefined;
  /** Значок перед подписью — например, полоски плотности. */
  adornment?: ReactNode;
};

// Собственный квадрат вместо accent-color: его нет в Safari 14 (D-013).
// Нативный input остаётся в DOM — фокус, клавиатура и скринридер работают как обычно.
export function Checkbox({ label, count, adornment, className, ...rest }: CheckboxProps) {
  return (
    <label className={cx(styles.checkbox, className)}>
      <input type="checkbox" className={cx('visually-hidden', styles.input)} {...rest} />
      <span aria-hidden="true" className={styles.box} />
      {adornment}
      <span>{label}</span>
      {count !== undefined && <span className={styles.count}>{count}</span>}
    </label>
  );
}
