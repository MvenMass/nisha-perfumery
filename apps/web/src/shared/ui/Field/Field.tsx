import { useId } from 'react';
import type { ReactNode } from 'react';

import { cx } from '../../lib/cx';
import styles from './Field.module.css';

export type FieldProps = {
  label: ReactNode;
  /** Текст ошибки: поле получает aria-invalid, сообщение связывается через aria-describedby. */
  error?: string | undefined;
  hint?: string | undefined;
};

type FieldIds = {
  controlId: string;
  describedBy: string | undefined;
};

export function useFieldIds(
  id: string | undefined,
  { error, hint }: Pick<FieldProps, 'error' | 'hint'>,
  extraDescribedBy?: string,
): FieldIds & { errorId: string; hintId: string } {
  const autoId = useId();
  const controlId = id ?? autoId;
  const errorId = `${controlId}-error`;
  const hintId = `${controlId}-hint`;
  const describedBy =
    [hint && hintId, error && errorId, extraDescribedBy].filter(Boolean).join(' ') || undefined;
  return { controlId, describedBy, errorId, hintId };
}

type FieldShellProps = FieldProps & {
  controlId: string;
  errorId: string;
  hintId: string;
  inline?: boolean | undefined;
  children: ReactNode;
};

export function FieldShell({
  label,
  error,
  hint,
  controlId,
  errorId,
  hintId,
  inline = false,
  children,
}: FieldShellProps) {
  return (
    <div className={cx(styles.field, inline && styles.inline)}>
      <label htmlFor={controlId} className={styles.label}>
        {label}
      </label>
      {children}
      {hint && (
        <p id={hintId} className={styles.message}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={cx(styles.message, styles.error)}>
          {error}
        </p>
      )}
    </div>
  );
}

export { styles as fieldStyles };
