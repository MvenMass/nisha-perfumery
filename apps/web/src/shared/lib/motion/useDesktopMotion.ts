import { useSyncExternalStore } from 'react';

/**
 * Полная версия движения — только на десктопе с мышью (этап 9.1): инерционный скролл,
 * закреплённые сцены, горизонтальный ход. На телефонах и планшетах — облегчённая версия,
 * иначе на iOS тормозит прокрутка и ломаются закрепления.
 */
export const DESKTOP_MOTION_QUERY = '(hover: hover) and (pointer: fine) and (min-width: 1024px)';
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
  const queries = [window.matchMedia(DESKTOP_MOTION_QUERY), window.matchMedia(REDUCED_QUERY)];
  for (const media of queries) {
    // Safari 14 знает только addListener у MediaQueryList.
    if (typeof media.addEventListener === 'function') media.addEventListener('change', onChange);
    else media.addListener(onChange);
  }
  return () => {
    for (const media of queries) {
      if (typeof media.removeEventListener === 'function') {
        media.removeEventListener('change', onChange);
      } else {
        media.removeListener(onChange);
      }
    }
  };
}

const snapshot = () =>
  typeof window !== 'undefined' &&
  Boolean(window.matchMedia?.(DESKTOP_MOTION_QUERY).matches) &&
  !window.matchMedia(REDUCED_QUERY).matches;

/** Десктоп с мышью и без «уменьшения движения». */
export function useDesktopMotion(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
