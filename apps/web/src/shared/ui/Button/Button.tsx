import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import type { LinkProps } from 'react-router';

import { cx } from '../../lib/cx';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/Icon';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'outline' | 'link';
export type ButtonSize = 'md' | 'lg' | 'xl';

type CommonProps = {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  fullWidth?: boolean | undefined;
  /** Иконка после текста, обычно стрелка. */
  iconEnd?: IconName | undefined;
  children: ReactNode;
};

function buttonClass({
  variant = 'primary',
  size = 'lg',
  fullWidth = false,
  className,
}: Pick<CommonProps, 'variant' | 'size' | 'fullWidth'> & { className?: string | undefined }) {
  // У текстовой ссылки нет размеров: её высоту задаёт зона нажатия 44px.
  return cx(
    styles.button,
    styles[variant],
    variant !== 'link' && styles[size],
    fullWidth && styles.fullWidth,
    className,
  );
}

function Content({ children, iconEnd }: Pick<CommonProps, 'children' | 'iconEnd'>) {
  return (
    <>
      {children}
      {iconEnd && <Icon name={iconEnd} size={18} />}
    </>
  );
}

type ButtonProps = CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

export function Button({
  variant,
  size,
  fullWidth,
  iconEnd,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={buttonClass({ variant, size, fullWidth, className })} {...rest}>
      <Content iconEnd={iconEnd}>{children}</Content>
    </button>
  );
}

type ButtonLinkProps = CommonProps & Omit<LinkProps, 'children'>;

// Тот же вид, но навигация — настоящая ссылка, а не кнопка.
export function ButtonLink({
  variant,
  size,
  fullWidth,
  iconEnd,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={buttonClass({ variant, size, fullWidth, className })} {...rest}>
      <Content iconEnd={iconEnd}>{children}</Content>
    </Link>
  );
}
