import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cx } from '../../lib/cx';
import { Icon } from '../Icon/Icon';
import styles from './Chip.module.css';

// Яркость по WCAG: свотчи приходят из БД, заранее неизвестно, тёмные они или нет.
function isDark(hex: string): boolean {
  const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!match) return false;
  const [r, g, b] = match.slice(1).map((part) => {
    const c = parseInt(part, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
  return luminance < 0.05;
}

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-pressed'> & {
  children: ReactNode;
  pressed: boolean;
  /** Цвет материала из БД (#RRGGBB) — квадрат перед подписью. */
  swatch?: string | undefined;
  variant?: 'default' | 'segment' | undefined;
};

export function Chip({
  children,
  pressed,
  swatch,
  variant = 'default',
  className,
  type = 'button',
  ...rest
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={cx(styles.chip, variant === 'segment' && styles.segment, className)}
      {...rest}
    >
      {swatch && (
        <span
          aria-hidden="true"
          className={cx(styles.swatch, isDark(swatch) && styles.swatchOutlined)}
          style={{ backgroundColor: swatch }}
        />
      )}
      {children}
    </button>
  );
}

type RemovableChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  /** Название фильтра — и текст, и часть подписи «Убрать фильтр: …». */
  label: string;
};

export function RemovableChip({ label, className, type = 'button', ...rest }: RemovableChipProps) {
  return (
    <button
      type={type}
      aria-label={`Убрать фильтр: ${label}`}
      className={cx(styles.chip, styles.removable, className)}
      {...rest}
    >
      {label}
      <Icon name="close" size={12} />
    </button>
  );
}
