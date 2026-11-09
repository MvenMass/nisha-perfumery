import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
  const media = window.matchMedia(QUERY);
  // Safari 14 знает только addListener / removeListener у MediaQueryList.
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }
  media.addListener(onChange);
  return () => media.removeListener(onChange);
}

const snapshot = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.(QUERY).matches);

/** Пользователь попросил уменьшить движение: анимации не запускаются, контент сразу на месте. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
