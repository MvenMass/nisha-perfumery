import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cx } from '../../lib/cx';
import { IconButton } from '../IconButton/IconButton';
import styles from './Sheet.module.css';

/** Чуть дольше анимации ухода (--dur-slow). */
const CLOSE_FALLBACK_MS = 450;

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Подпись крестика: «Закрыть фильтры», «Закрыть меню». */
  closeLabel?: string | undefined;
  /** bottom — шторка под шапкой (фильтры), right — боковая панель (меню). */
  side?: 'bottom' | 'right' | undefined;
  /** Закреплённые кнопки внизу: «Сбросить» / «Показать». */
  footer?: ReactNode;
  children: ReactNode;
};

// iOS Safari игнорирует overflow: hidden на body, поэтому фиксируем body
// и восстанавливаем прокрутку после закрытия.
function lockScroll(): () => void {
  const { scrollY } = window;
  const { style } = document.body;
  const previous = { position: style.position, top: style.top, width: style.width };
  style.position = 'fixed';
  style.top = `-${scrollY}px`;
  style.width = '100%';
  return () => {
    Object.assign(style, previous);
    window.scrollTo(0, scrollY);
  };
}

export function Sheet({
  open,
  onClose,
  title,
  closeLabel = 'Закрыть',
  side = 'bottom',
  footer,
  children,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // После закрытия шторка ещё на миг в DOM — проигрывает анимацию ухода (этап 9).
  const [rendered, setRendered] = useState(open);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setRendered(true);
  }
  const closing = rendered && !open;
  useEffect(() => {
    if (!closing) return undefined;
    // Запасной выход: при reduced motion или скрытой вкладке animationend может не прийти.
    const timer = window.setTimeout(() => setRendered(false), CLOSE_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [closing]);
  // Свежий onClose без перезапуска эффекта: иначе при каждом рендере родителя
  // фокус возвращался бы на кнопку открытия.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const unlockScroll = lockScroll();
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panelRef.current)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      const firstItem = focusable[0];
      const lastItem = focusable[focusable.length - 1];
      if (!firstItem || !lastItem) return;

      const inside = panelRef.current.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === firstItem || !inside)) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && (document.activeElement === lastItem || !inside)) {
        event.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      unlockScroll();
      // Возвращаем фокус туда, откуда открыли, — иначе клавиатура окажется в начале страницы.
      trigger?.focus();
    };
  }, [open]);

  if (!rendered) return null;

  return createPortal(
    <>
      <div
        className={cx(styles.backdrop, closing && styles.backdropClosing)}
        aria-hidden="true"
        onClick={closing ? undefined : onClose}
      />
      <div
        ref={panelRef}
        // Уходящая шторка — уже не диалог: скринридер не должен её находить.
        role={closing ? undefined : 'dialog'}
        aria-modal={closing ? undefined : true}
        aria-hidden={closing || undefined}
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(styles.panel, styles[side], closing && styles.closing)}
        onAnimationEnd={(event) => {
          if (closing && event.target === event.currentTarget) setRendered(false);
        }}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <IconButton icon="close" label={closeLabel} onClick={onClose} />
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </>,
    document.body,
  );
}
