import type { ReactNode } from 'react';

type IconDef = {
  viewBox: string;
  strokeWidth: number;
  body: ReactNode;
};

// Контурные иконки из макетов docs/design: пути перенесены без изменений.
// Иконки 36×36 — крупные пиктограммы преимуществ, 40×40 — пустые состояния.
const ICONS = {
  search: {
    viewBox: '0 0 24 24',
    strokeWidth: 1.4,
    body: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
      </>
    ),
  },
  user: {
    viewBox: '0 0 24 24',
    strokeWidth: 1.4,
    body: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </>
    ),
  },
  heart: {
    viewBox: '0 0 24 24',
    strokeWidth: 1.4,
    body: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  },
  bag: {
    viewBox: '0 0 24 24',
    strokeWidth: 1.4,
    body: (
      <>
        <path d="M5 8h14l-1 12H6L5 8z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </>
    ),
  },
  menu: {
    viewBox: '0 0 24 24',
    strokeWidth: 1.4,
    body: <path d="M4 8h16M4 16h16" />,
  },
  'arrow-right': {
    viewBox: '0 0 24 24',
    strokeWidth: 1.4,
    body: <path d="M4 12h16M14 6l6 6-6 6" />,
  },
  'arrow-left': {
    viewBox: '0 0 24 24',
    strokeWidth: 1.4,
    body: <path d="M20 12H4M10 6l-6 6 6 6" />,
  },
  plus: {
    viewBox: '0 0 24 24',
    strokeWidth: 1.4,
    body: <path d="M12 5v14M5 12h14" />,
  },
  close: {
    viewBox: '0 0 24 24',
    strokeWidth: 1.4,
    body: <path d="M6 6l12 12M18 6L6 18" />,
  },
  'chevron-down': {
    viewBox: '0 0 24 24',
    strokeWidth: 1.4,
    body: <path d="M6 9l6 6 6-6" />,
  },
  pin: {
    viewBox: '0 0 24 24',
    strokeWidth: 1.4,
    body: (
      <>
        <path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" />
        <circle cx="12" cy="9" r="2.5" />
      </>
    ),
  },
  clock: {
    viewBox: '0 0 24 24',
    strokeWidth: 1.4,
    body: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
  truck: {
    viewBox: '0 0 24 24',
    strokeWidth: 1.4,
    body: (
      <>
        <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
        <circle cx="7" cy="18" r="1.6" />
        <circle cx="17" cy="18" r="1.6" />
      </>
    ),
  },
  alert: {
    viewBox: '0 0 24 24',
    strokeWidth: 1.6,
    body: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6M12 16v1" />
      </>
    ),
  },
  logout: {
    viewBox: '0 0 24 24',
    strokeWidth: 1.4,
    body: <path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" />,
  },
  expand: {
    viewBox: '0 0 24 24',
    strokeWidth: 1.4,
    body: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  },
  instagram: {
    viewBox: '0 0 24 24',
    strokeWidth: 1.4,
    body: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="17" cy="7" r="0.6" fill="currentColor" />
      </>
    ),
  },
  telegram: {
    viewBox: '0 0 24 24',
    strokeWidth: 1.4,
    body: (
      <>
        <path d="M21 4L3 11l6 2 2 6 3-4 5 4 2-15z" />
        <path d="M9 13l8-6" />
      </>
    ),
  },
  pinterest: {
    viewBox: '0 0 24 24',
    strokeWidth: 1.4,
    body: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M11 9.5c2-1.5 5-.5 4.5 2.5S12 15 11.5 13M12 11l-2.5 9" />
      </>
    ),
  },
  box: {
    viewBox: '0 0 36 36',
    strokeWidth: 1.3,
    body: (
      <>
        <path d="M5 11l13-6 13 6v14l-13 6-13-6V11z" />
        <path d="M5 11l13 6 13-6M18 17v14" />
      </>
    ),
  },
  gift: {
    viewBox: '0 0 36 36',
    strokeWidth: 1.3,
    body: (
      <>
        <rect x="5" y="13" width="26" height="18" />
        <path d="M3 9h30v4H3zM18 9v22" />
        <path d="M18 9c-2-5-8-5-8-1s8 1 8 1zM18 9c2-5 8-5 8-1s-8 1-8 1z" />
      </>
    ),
  },
  drop: {
    viewBox: '0 0 36 36',
    strokeWidth: 1.3,
    body: (
      <>
        <path d="M18 4c4 6 9 10 9 17a9 9 0 0 1-18 0c0-7 5-11 9-17z" />
        <path d="M18 26a4 4 0 0 1-4-4" />
      </>
    ),
  },
  shield: {
    viewBox: '0 0 36 36',
    strokeWidth: 1.3,
    body: (
      <>
        <path d="M18 4l11 5v8c0 7-5 12-11 15C12 29 7 24 7 17V9l11-5z" />
        <path d="M13 18l4 4 7-8" />
      </>
    ),
  },
  stone: {
    viewBox: '0 0 40 40',
    strokeWidth: 1.3,
    body: <path d="M6 28l6-14 10-6 11 7 2 12-9 7H13z" />,
  },
  // Этапы «Как рождается аромат» из home.html.
  'step-material': {
    viewBox: '0 0 40 40',
    strokeWidth: 1.3,
    body: (
      <>
        <path d="M6 28l6-14 10-6 11 7 2 12-9 7H13z" />
        <path d="M12 14l8 6 13-5M20 20l-2 15" />
      </>
    ),
  },
  'step-sketch': {
    viewBox: '0 0 40 40',
    strokeWidth: 1.3,
    body: (
      <>
        <path d="M8 32L28 12M24 8l8 8M14 26l-4 4" />
        <path d="M30 26c2 3 2 6 0 7s-4-1-3-4z" />
      </>
    ),
  },
  'step-aging': {
    viewBox: '0 0 40 40',
    strokeWidth: 1.3,
    body: (
      <>
        <path d="M10 5h20M10 35h20M12 5c0 9 8 10 8 15s-8 6-8 15M28 5c0 9-8 10-8 15s8 6 8 15" />
        <path d="M15 31h10l-5-5z" />
      </>
    ),
  },
  'step-glass': {
    viewBox: '0 0 40 40',
    strokeWidth: 1.3,
    body: (
      <>
        <rect x="9" y="14" width="22" height="22" rx="2" />
        <path d="M16 14V9h8v5M14 6h12" />
        <path d="M14 22h12" />
      </>
    ),
  },
  'step-label': {
    viewBox: '0 0 40 40',
    strokeWidth: 1.3,
    body: (
      <>
        <path d="M5 14l15-7 15 7v14l-15 7-15-7z" />
        <path d="M5 14l15 7 15-7M20 21v14" />
        <path d="M12 10l15 7" />
      </>
    ),
  },
} satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;

export const iconNames = Object.keys(ICONS) as IconName[];

type IconProps = {
  name: IconName;
  size?: number | undefined;
  /** Заливка контура — например, сердце у товара в избранном. */
  filled?: boolean | undefined;
  className?: string | undefined;
};

// Иконка всегда декоративная: подпись даёт кнопка или соседний текст.
export function Icon({ name, size = 20, filled = false, className }: IconProps) {
  const icon: IconDef = ICONS[name];
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox={icon.viewBox}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={icon.strokeWidth}
      className={className}
    >
      {icon.body}
    </svg>
  );
}
