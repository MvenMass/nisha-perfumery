import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { loadGsap } from '../shared/lib/motion/load-gsap';
import type { Gsap } from '../shared/lib/motion/load-gsap';
import { useDesktopMotion } from '../shared/lib/motion/useDesktopMotion';
import styles from './PageCurtain.module.css';

/** Если новая страница так и не открылась (переход отменён), шторка всё равно уходит. */
const LIFT_FALLBACK_MS = 1500;

/** Ссылка, переход по которой закрываем шторкой: обычный клик по другой странице сайта. */
function curtainLink(event: MouseEvent): HTMLAnchorElement | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const link = event.target instanceof Element ? event.target.closest('a') : null;
  if (!link || !link.href || link.hasAttribute('download')) return null;
  if (link.target && link.target !== '_self') return null;
  if (link.origin !== window.location.origin) return null;
  // Смена фильтров (query) и якоря на той же странице — не переход между страницами.
  if (link.pathname === window.location.pathname) return null;
  // Админка — рабочий инструмент: там переходы мгновенные.
  if (link.pathname.startsWith('/admin') || window.location.pathname.startsWith('/admin')) {
    return null;
  }
  return link;
}

/**
 * «Каменная шторка» между страницами (этап 9.1), только десктоп с мышью без reduced motion:
 * слой базальта со срезом пород поднимается снизу и закрывает экран, под ним открывается новая
 * страница, и слой уходит вверх. Клик перехватывается до React Router (capture на window),
 * поэтому старая страница не исчезает, пока шторка её не закрыла. Кнопки «назад/вперёд»
 * отложить нельзя — там остаётся короткое проявление страницы.
 */
export function PageCurtain() {
  const desktop = useDesktopMotion();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const curtainRef = useRef<HTMLDivElement>(null);
  const gsapRef = useRef<Gsap | null>(null);
  const coveringRef = useRef(false);
  /** Поднять шторку — выставляет эффект, пока он подписан на клики. */
  const liftRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!desktop) return undefined;
    let fallback: number | undefined;
    loadGsap().then(
      ({ gsap }) => {
        gsapRef.current = gsap;
      },
      (error: unknown) => {
        console.warn('Шторка перехода не загрузилась', error);
      },
    );
    const onClick = (event: MouseEvent) => {
      const gsap = gsapRef.current;
      const curtain = curtainRef.current;
      if (!gsap || !curtain || coveringRef.current) return;
      const link = curtainLink(event);
      if (!link) return;
      event.preventDefault();
      coveringRef.current = true;
      const to = `${link.pathname}${link.search}${link.hash}`;
      gsap.fromTo(
        curtain,
        { yPercent: 100, autoAlpha: 1 },
        {
          yPercent: 0,
          duration: 0.4,
          ease: 'power3.inOut',
          onComplete: () => {
            void navigate(to);
            fallback = window.setTimeout(() => lift(gsap, curtain), LIFT_FALLBACK_MS);
          },
        },
      );
    };
    const lift = (gsap: Gsap, curtain: HTMLElement) => {
      coveringRef.current = false;
      gsap.to(curtain, {
        yPercent: -100,
        duration: 0.55,
        ease: 'power3.inOut',
        delay: 0.05,
        onComplete: () => {
          gsap.set(curtain, { autoAlpha: 0 });
        },
      });
    };
    liftRef.current = () => {
      window.clearTimeout(fallback);
      const gsap = gsapRef.current;
      const curtain = curtainRef.current;
      if (gsap && curtain && coveringRef.current) lift(gsap, curtain);
    };
    // Capture на window срабатывает раньше обработчика Link внутри React.
    window.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('click', onClick, true);
      window.clearTimeout(fallback);
      liftRef.current = null;
    };
  }, [desktop, navigate]);

  // Новая страница уже в DOM и прокручена в начало — открываем её.
  useLayoutEffect(() => {
    liftRef.current?.();
  }, [pathname]);

  if (!desktop) return null;
  return (
    <div ref={curtainRef} aria-hidden="true" className={styles.curtain}>
      <span className={styles.edge} />
      <span className={styles.edge} />
    </div>
  );
}
