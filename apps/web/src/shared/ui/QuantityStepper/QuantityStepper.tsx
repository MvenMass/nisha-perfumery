import { cx } from '../../lib/cx';
import styles from './QuantityStepper.module.css';

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number | undefined;
  /** Верхняя граница — обычно остаток варианта. */
  max?: number | undefined;
  /** Что считаем: попадает в подписи кнопок («Уменьшить: Базальт»). */
  itemName?: string | undefined;
  size?: 'md' | 'lg' | undefined;
  disabled?: boolean | undefined;
};

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = Number.POSITIVE_INFINITY,
  itemName,
  size = 'md',
  disabled = false,
}: QuantityStepperProps) {
  const suffix = itemName ? `: ${itemName}` : ' количество';
  return (
    <div className={cx(styles.stepper, size === 'lg' && styles.large)}>
      <button
        type="button"
        className={styles.button}
        aria-label={`Уменьшить${suffix}`}
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <span className={styles.value} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={styles.button}
        aria-label={`Увеличить${suffix}`}
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </button>
    </div>
  );
}
