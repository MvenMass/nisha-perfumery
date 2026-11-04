import type { InputHTMLAttributes, ReactNode } from 'react';

import { cx } from '../../lib/cx';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/Icon';
import styles from './RadioCard.module.css';

type RadioCardProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'children' | 'title' | 'checked'
> & {
  title: ReactNode;
  description?: ReactNode;
  /** Правая колонка: цена доставки, «бесплатно». */
  aside?: ReactNode;
  icon?: IconName | undefined;
  /** Управляемое состояние: выделение карточки нельзя сделать на CSS без :has() (D-013). */
  checked: boolean;
};

export function RadioCard({
  title,
  description,
  aside,
  icon,
  checked,
  className,
  ...rest
}: RadioCardProps) {
  return (
    <label className={cx(styles.card, checked && styles.checked, className)}>
      <input
        type="radio"
        checked={checked}
        className={cx('visually-hidden', styles.input)}
        {...rest}
      />
      <span aria-hidden="true" className={styles.radio} />
      {icon && <Icon name={icon} size={24} className={styles.icon} />}
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        {description && <span className={styles.description}>{description}</span>}
      </span>
      {aside && <span className={styles.aside}>{aside}</span>}
    </label>
  );
}
