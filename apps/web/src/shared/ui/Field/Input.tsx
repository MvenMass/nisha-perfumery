import type { InputHTMLAttributes } from 'react';

import { cx } from '../../lib/cx';
import { FieldShell, fieldStyles as styles, useFieldIds } from './Field';
import type { FieldProps } from './Field';

type InputProps = FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'children'>;

export function Input({ label, error, hint, id, className, ...rest }: InputProps) {
  const ids = useFieldIds(id, { error, hint }, rest['aria-describedby']);
  return (
    <FieldShell label={label} error={error} hint={hint} {...ids}>
      <input
        {...rest}
        id={ids.controlId}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={cx(styles.control, error && styles.invalid, className)}
      />
    </FieldShell>
  );
}
