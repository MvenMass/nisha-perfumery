import type { ButtonHTMLAttributes } from 'react';
import { Link } from 'react-router';
import type { LinkProps } from 'react-router';

import { cx } from '../../lib/cx';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/Icon';
import styles from './IconButton.module.css';

type CommonProps = {
  icon: IconName;
  /** Подпись для скринридера: у кнопки без текста она обязательна. */
  label: string;
  variant?: 'ghost' | 'primary' | 'outline';
  size?: 44 | 56;
  /** Число в кружке (корзина). Скринридер узнаёт его из label. */
  badge?: number | undefined;
};

function iconButtonClass(
  variant: CommonProps['variant'] = 'ghost',
  size: CommonProps['size'] = 44,
  className?: string,
) {
  return cx(
    styles.iconButton,
    variant !== 'ghost' && styles[variant],
    size === 56 && styles.large,
    className,
  );
}

function Badge({ value }: { value: number | undefined }) {
  if (value === undefined || value <= 0) return null;
  return (
    <span aria-hidden="true" className={styles.badge}>
      {value > 99 ? '99+' : value}
    </span>
  );
}

type IconButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> & {
    /** Переключатель (избранное): aria-pressed и залитая иконка. */
    pressed?: boolean;
  };

export function IconButton({
  icon,
  label,
  variant,
  size,
  badge,
  pressed,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      aria-pressed={pressed}
      className={iconButtonClass(variant, size, className)}
      {...rest}
    >
      <Icon name={icon} filled={pressed === true} />
      <Badge value={badge} />
    </button>
  );
}

type IconLinkProps = CommonProps &
  Omit<LinkProps, 'children' | 'aria-label'> & {
    /** Ссылка ведёт на текущую страницу: светлая иконка и aria-current. */
    current?: boolean;
  };

// Иконка-ссылка: кабинет, корзина.
export function IconLink({
  icon,
  label,
  variant,
  size,
  badge,
  current = false,
  className,
  ...rest
}: IconLinkProps) {
  return (
    <Link
      aria-label={label}
      aria-current={current ? 'page' : undefined}
      className={iconButtonClass(variant, size, cx(current && styles.current, className))}
      {...rest}
    >
      <Icon name={icon} />
      <Badge value={badge} />
    </Link>
  );
}
