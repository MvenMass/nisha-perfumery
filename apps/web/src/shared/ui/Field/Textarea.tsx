import type { TextareaHTMLAttributes } from 'react';

import { cx } from '../../lib/cx';
import { FieldShell, fieldStyles as styles, useFieldIds } from './Field';
import type { FieldProps } from './Field';

type TextareaProps = FieldProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'children'>;

export function Textarea({ label, error, hint, id, className, rows = 3, ...rest }: TextareaProps) {
  const ids = useFieldIds(id, { error, hint }, rest['aria-describedby']);
  return (
    <FieldShell label={label} error={error} hint={hint} {...ids}>
      <textarea
        {...rest}
        rows={rows}
        id={ids.controlId}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={cx(styles.control, styles.textarea, error && styles.invalid, className)}
      />
    </FieldShell>
  );
}
