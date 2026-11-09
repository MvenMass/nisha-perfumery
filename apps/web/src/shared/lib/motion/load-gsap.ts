import type { gsap as GsapInstance } from 'gsap';
import type { ScrollTrigger as ScrollTriggerPlugin } from 'gsap/ScrollTrigger';

export type Gsap = typeof GsapInstance;
export type ScrollTriggerType = typeof ScrollTriggerPlugin;
export type Motion = { gsap: Gsap; ScrollTrigger: ScrollTriggerType };

let loading: Promise<Motion> | undefined;

const REFRESH_DELAY_MS = 150;

/**
 * Страница дорастает после загрузки данных (карточки, слайды, журнал), а ScrollTrigger сам
 * пересчитывает позиции только при resize и load. Без этого сцены ниже срабатывали бы раньше,
 * чем дойдут до экрана: линия мастерской оказывалась заполненной ещё до прокрутки.
 */
function refreshOnHeightChange(ScrollTrigger: ScrollTriggerType): void {
  if (typeof ResizeObserver === 'undefined') return;
  let timer: number | undefined;
  let lastHeight = document.body.scrollHeight;
  new ResizeObserver(() => {
    const height = document.body.scrollHeight;
    if (height === lastHeight) return;
    lastHeight = height;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => ScrollTrigger.refresh(), REFRESH_DELAY_MS);
  }).observe(document.body);
}

/**
 * GSAP и ScrollTrigger — отдельным чанком, по первому запросу (этап 9): основной бандл
 * витрины не растёт, а страница без анимаций их вообще не скачивает.
 */
export function loadGsap(): Promise<Motion> {
  loading ??= Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
    ([{ gsap }, { ScrollTrigger }]) => {
      gsap.registerPlugin(ScrollTrigger);
      refreshOnHeightChange(ScrollTrigger);
      return { gsap, ScrollTrigger };
    },
  );
  return loading;
}
