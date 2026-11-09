import type { gsap as GsapInstance } from 'gsap';
import type { ScrollTrigger as ScrollTriggerPlugin } from 'gsap/ScrollTrigger';

export type Gsap = typeof GsapInstance;
export type ScrollTriggerType = typeof ScrollTriggerPlugin;
export type Motion = { gsap: Gsap; ScrollTrigger: ScrollTriggerType };

let loading: Promise<Motion> | undefined;

/**
 * GSAP и ScrollTrigger — отдельным чанком, по первому запросу (этап 9): основной бандл
 * витрины не растёт, а страница без анимаций их вообще не скачивает.
 */
export function loadGsap(): Promise<Motion> {
  loading ??= Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
    ([{ gsap }, { ScrollTrigger }]) => {
      gsap.registerPlugin(ScrollTrigger);
      return { gsap, ScrollTrigger };
    },
  );
  return loading;
}
