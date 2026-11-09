import type { DependencyList, RefObject } from 'react';

import { loadSplitText } from './load-gsap';
import { useGsap } from './useGsap';

/** Насколько снимок больше рамки, чтобы параллаксу было куда ехать без пустых краёв. */
const PARALLAX_SCALE = 1.12;
const PARALLAX_SHIFT = 0.05;

/**
 * Раскрытия внутри scope по разметке, без отдельной обёртки на каждый заголовок:
 *
 * - `data-reveal="text"` — заголовок делится на строки, каждая выезжает из-под маски снизу.
 *   Скринридер читает заголовок целиком (aria: 'auto'), при смене ширины или догрузке шрифта
 *   строки пересобираются (autoSplit).
 * - `data-reveal="media"` — рамка-маска: снимок внутри (`[data-reveal-layer]` или первый img)
 *   выезжает снизу и одновременно «отъезжает» из крупного плана. С `data-parallax` — затем
 *   медленно смещается при прокрутке.
 *
 * deps — когда пересканировать: разметка, пришедшая с данными, появляется позже первого рендера.
 */
export function useReveal(scope: RefObject<HTMLElement | null>, deps: DependencyList = []): void {
  useGsap(
    scope,
    ({ gsap, SplitText }, root) => {
      for (const element of root.querySelectorAll<HTMLElement>('[data-reveal="text"]')) {
        SplitText.create(element, {
          type: 'lines',
          mask: 'lines',
          aria: 'auto',
          autoSplit: true,
          // По умолчанию SplitText сворачивает любые пробелы в обычный — вместе с неразрывными,
          // и предлог «с» повисал в конце строки.
          reduceWhiteSpace: false,
          // Анимация из onSplit: при пересборке строк SplitText сам переносит её прогресс.
          // Типы говорят «void», но документация SplitText ждёт здесь именно анимацию,
          // а у твина GSAP есть then — отсюда ложное срабатывание правила.
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          onSplit: (split) =>
            gsap.from(split.lines, {
              yPercent: 105,
              duration: 1.1,
              ease: 'expo.out',
              stagger: 0.09,
              scrollTrigger: { trigger: element, start: 'top 88%', once: true },
            }),
        });
      }

      for (const frame of root.querySelectorAll<HTMLElement>('[data-reveal="media"]')) {
        const layer = frame.querySelector<HTMLElement>('[data-reveal-layer], img');
        if (!layer) continue;
        const parallax = frame.hasAttribute('data-parallax');
        const rest = parallax ? PARALLAX_SCALE : 1;
        gsap.set(frame, { overflow: 'hidden' });
        gsap.fromTo(
          layer,
          { yPercent: 100, scale: rest * 1.2 },
          {
            yPercent: 0,
            scale: rest,
            duration: 1.4,
            ease: 'expo.out',
            scrollTrigger: { trigger: frame, start: 'top 85%', once: true },
          },
        );
        if (parallax) {
          const shift = () => frame.offsetHeight * PARALLAX_SHIFT;
          gsap.fromTo(
            layer,
            { y: () => -shift() },
            {
              y: shift,
              ease: 'none',
              scrollTrigger: {
                trigger: frame,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
                invalidateOnRefresh: true,
              },
            },
          );
        }
      }
    },
    deps,
    loadSplitText,
  );
}
