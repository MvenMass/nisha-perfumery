import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useMatches } from 'react-router';

import { loadGsap } from '../shared/lib/motion/load-gsap';
import { getSmoothScroll, setSmoothScroll } from '../shared/lib/motion/smooth-scroll';
import { createSmoothWheel } from '../shared/lib/motion/smooth-wheel';
import { useDesktopMotion } from '../shared/lib/motion/useDesktopMotion';

/** Маршрут с `handle: { smooth: true }` — витрина, где прокрутка инерционная. */
function isSmoothHandle(handle: unknown): boolean {
  return (
    typeof handle === 'object' && handle !== null && 'smooth' in handle && handle.smooth === true
  );
}

/**
 * Инерционная прокрутка колесом на витринных страницах десктопа с мышью (этап 9.1, D-074).
 * На телефоне и при reduced motion — обычная, GSAP ради неё не грузится.
 */
export function useSmoothScroll(): void {
  const desktop = useDesktopMotion();
  const showcase = useMatches().some((match) => isSmoothHandle(match.handle));
  const { pathname, hash } = useLocation();
  const active = desktop && showcase;

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    let kill: (() => void) | undefined;
    loadGsap().then(
      ({ gsap }) => {
        if (cancelled) return;
        const smooth = createSmoothWheel(gsap);
        setSmoothScroll(smooth);
        kill = smooth.kill;
      },
      (error: unknown) => {
        console.warn('Инерционная прокрутка не загрузилась', error);
      },
    );
    return () => {
      cancelled = true;
      kill?.();
      setSmoothScroll(null);
    };
  }, [active]);

  // Якорь на той же странице (пункт меню «Мастерская» на главной). ScrollRestoration
  // переносит к нему мгновенно в своём layout-эффекте; наш срабатывает следом, до отрисовки,
  // и превращает перенос в плавный проезд. При переходе с другой страницы — как обычно.
  const previousPath = useRef(pathname);
  useLayoutEffect(() => {
    const samePage = previousPath.current === pathname;
    previousPath.current = pathname;
    if (!hash || !samePage) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (target) getSmoothScroll()?.glideTo(target);
  }, [pathname, hash]);
}
