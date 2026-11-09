import type { gsap as GsapInstance } from 'gsap';
import type { Flip as FlipPlugin } from 'gsap/Flip';
import type { ScrollSmoother as ScrollSmootherPlugin } from 'gsap/ScrollSmoother';
import type { ScrollTrigger as ScrollTriggerPlugin } from 'gsap/ScrollTrigger';
import type { SplitText as SplitTextPlugin } from 'gsap/SplitText';

export type Gsap = typeof GsapInstance;
export type ScrollTriggerType = typeof ScrollTriggerPlugin;
export type SplitTextType = typeof SplitTextPlugin;
export type ScrollSmootherType = typeof ScrollSmootherPlugin;
export type FlipType = typeof FlipPlugin;
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

/** Плагин отдельным чанком: грузится вместе с ядром и регистрируется один раз. */
function plugin<K extends string, P extends object>(
  key: K,
  load: () => Promise<P>,
): () => Promise<Motion & Record<K, P>> {
  let promise: Promise<Motion & Record<K, P>> | undefined;
  return () => {
    promise ??= Promise.all([loadGsap(), load()]).then(([motion, loaded]) => {
      motion.gsap.registerPlugin(loaded);
      return { ...motion, [key]: loaded } as Motion & Record<K, P>;
    });
    return promise;
  };
}

/** Заголовки строками из-под маски (этап 9.1). */
export const loadSplitText = plugin(
  'SplitText',
  async () => (await import('gsap/SplitText')).SplitText,
);

/** Инерционный скролл на витринных страницах десктопа. */
export const loadSmoother = plugin(
  'ScrollSmoother',
  async () => (await import('gsap/ScrollSmoother')).ScrollSmoother,
);

/** Перелёт флакона в корзину. */
export const loadFlip = plugin('Flip', async () => (await import('gsap/Flip')).Flip);
