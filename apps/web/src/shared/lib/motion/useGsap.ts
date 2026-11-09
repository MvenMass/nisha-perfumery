import { useEffect, useRef } from 'react';
import type { DependencyList, RefObject } from 'react';

import { loadGsap } from './load-gsap';
import type { Motion } from './load-gsap';
import { useReducedMotion } from './useReducedMotion';

/**
 * Сцена GSAP внутри элемента: setup выполняется в gsap.context, при размонтировании или смене
 * зависимостей всё откатывается (ctx.revert) — анимации, ScrollTrigger и inline-стили.
 * При reduced motion GSAP даже не загружается: контент остаётся в исходном, видимом состоянии.
 *
 * Состояние «до анимации» задаёт сам GSAP (from), а не CSS: если GSAP не загрузится,
 * контент просто останется видимым.
 */
export function useGsap(
  scope: RefObject<HTMLElement | null>,
  setup: (motion: Motion, root: HTMLElement) => void,
  deps: DependencyList = [],
): void {
  const reduced = useReducedMotion();
  // Последняя версия setup без перезапуска сцены на каждый рендер.
  const setupRef = useRef(setup);
  useEffect(() => {
    setupRef.current = setup;
  });

  useEffect(() => {
    if (reduced) return undefined;
    let revert: (() => void) | undefined;
    let cancelled = false;
    loadGsap().then(
      (motion) => {
        const root = scope.current;
        if (cancelled || !root) return;
        const ctx = motion.gsap.context(() => setupRef.current(motion, root), root);
        revert = () => ctx.revert();
      },
      (error: unknown) => {
        // Без анимаций витрина полностью рабочая — сообщаем и живём дальше.
        console.warn('Анимации не загрузились', error);
      },
    );
    return () => {
      cancelled = true;
      revert?.();
    };
    // Сцена перестраивается только по своим зависимостям, а не по каждому рендеру.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, scope, ...deps]);
}
