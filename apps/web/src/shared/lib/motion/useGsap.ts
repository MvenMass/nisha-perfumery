import { useEffect, useLayoutEffect, useRef } from 'react';
import type { DependencyList, RefObject } from 'react';

import { loadGsap } from './load-gsap';
import type { Motion } from './load-gsap';
import { useReducedMotion } from './useReducedMotion';

type Cleanup = (() => void) | void;

/**
 * Сцена GSAP внутри элемента: setup выполняется в gsap.context, при размонтировании или смене
 * зависимостей всё откатывается (ctx.revert) — анимации, ScrollTrigger, SplitText и inline-стили.
 * При reduced motion GSAP даже не загружается: контент остаётся в исходном, видимом состоянии.
 *
 * Состояние «до анимации» задаёт сам GSAP (from), а не CSS: если GSAP не загрузится,
 * контент просто останется видимым.
 *
 * load — что загрузить: ядро по умолчанию или ядро с плагином (loadSplitText, loadFlip…).
 */
export function useGsap<M extends Motion = Motion>(
  scope: RefObject<HTMLElement | null>,
  setup: (motion: M, root: HTMLElement) => Cleanup,
  deps: DependencyList = [],
  load?: () => Promise<M>,
): void {
  const reduced = useReducedMotion();
  // Последние версии setup и load без перезапуска сцены на каждый рендер.
  const setupRef = useRef(setup);
  const loadRef = useRef(load);
  useEffect(() => {
    setupRef.current = setup;
    loadRef.current = load;
  });

  // Layout effect: если GSAP уже загружен, исходное «до» встаёт до первой отрисовки —
  // без кадра, где заголовок уже виден, а потом пропадает, чтобы выехать.
  useLayoutEffect(() => {
    if (reduced) return undefined;
    let revert: (() => void) | undefined;
    let cancelled = false;
    const loader = loadRef.current ?? (loadGsap as () => Promise<M>);
    loader().then(
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
