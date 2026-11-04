import type { ReactNode } from 'react';

import { cx } from '../../lib/cx';
import styles from './Stepper.module.css';

export type Step = {
  label: ReactNode;
  /** Строка под подписью: дата или «ожидается …». */
  meta?: ReactNode;
};

type StepperProps = {
  steps: readonly Step[];
  /** Индекс текущего шага с нуля; всё до него — пройдено. */
  current: number;
  /** Подпись списка для скринридера: «Шаги оформления», «Статус заказа». */
  label: string;
  /** mono — шаги оформления; text — статус заказа, где текущий шаг выделен медью. */
  variant?: 'mono' | 'text' | undefined;
  className?: string | undefined;
};

export function Stepper({ steps, current, label, variant = 'text', className }: StepperProps) {
  return (
    <ol
      aria-label={label}
      className={cx(styles.stepper, variant === 'mono' ? styles.mono : styles.highlight, className)}
    >
      {steps.map((step, index) => (
        <li
          // Порядок шагов фиксирован, индекс — устойчивый ключ.
          key={index}
          aria-current={index === current ? 'step' : undefined}
          className={cx(
            styles.step,
            index <= current && styles.reached,
            index === current && styles.current,
          )}
        >
          <span className={styles.label}>{step.label}</span>
          {step.meta && <span className={styles.meta}>{step.meta}</span>}
        </li>
      ))}
    </ol>
  );
}
