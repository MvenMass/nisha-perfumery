import type { SelectHTMLAttributes } from 'react';

import { cx } from '../../lib/cx';
import { Icon } from '../Icon/Icon';
import { FieldShell, fieldStyles as styles, useFieldIds } from './Field';
import type { FieldProps } from './Field';

type SelectProps = FieldProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    /** Компактный вид с подписью слева — сортировка в каталоге. */
    compact?: boolean | undefined;
  };

// Нативный select: на телефоне открывается системный список, это удобнее любого кастомного.
export function Select({
  label,
  error,
  hint,
  id,
  compact = false,
  className,
  children,
  ...rest
}: SelectProps) {
  const ids = useFieldIds(id, { error, hint }, rest['aria-describedby']);
  return (
    <FieldShell label={label} error={error} hint={hint} inline={compact} {...ids}>
      <div className={styles.selectWrap}>
        <select
          {...rest}
          id={ids.controlId}
          aria-invalid={error ? true : undefined}
          aria-describedby={ids.describedBy}
          className={cx(
            styles.control,
            styles.select,
            compact && styles.selectCompact,
            error && styles.invalid,
            className,
          )}
        >
          {children}
        </select>
        <Icon name="chevron-down" size={16} className={styles.chevron} />
      </div>
    </FieldShell>
  );
}
