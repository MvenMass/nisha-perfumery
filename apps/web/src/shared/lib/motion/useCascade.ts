import { useRef } from 'react';
import type { DependencyList, RefObject } from 'react';

import { useGsap } from './useGsap';

/**
 * Каскад карточек списка (этап 9.1): у каждого элемента списка снимок (`[data-cascade-media]`,
 * рамка вокруг него обрезает) выезжает снизу, текст (`[data-cascade-body]`) поднимается следом.
 * Карточки, дошедшие до экрана вместе, идут одной волной (ScrollTrigger.batch).
 *
 * Показанные карточки запоминаются: при догрузке каталога или смене фильтров сцена
 * перестраивается, но анимируются только новые — уже видимые не мигают и сетка не прыгает.
 */
export function useCascade(listRef: RefObject<HTMLElement | null>, deps: DependencyList): void {
  const shown = useRef(new WeakSet<Element>());

  useGsap(
    listRef,
    ({ gsap, ScrollTrigger }, list) => {
      const items = [...list.children].filter((item) => !shown.current.has(item));
      if (items.length === 0) return;
      const parts = (batch: Element[], selector: string) =>
        batch.flatMap((item) => [...item.querySelectorAll(selector)]);

      const media = parts(items, '[data-cascade-media]');
      const bodies = parts(items, '[data-cascade-body]');
      // Скелетоны пока грузятся: анимировать нечего, а пустой список GSAP считает ошибкой.
      if (media.length === 0 && bodies.length === 0) return;
      gsap.set(media, { yPercent: 101 });
      gsap.set(bodies, { opacity: 0, y: 24 });
      ScrollTrigger.batch(items, {
        start: 'top 92%',
        once: true,
        onEnter: (batch) => {
          for (const item of batch) shown.current.add(item);
          gsap.to(parts(batch, '[data-cascade-media]'), {
            yPercent: 0,
            duration: 1.1,
            ease: 'expo.out',
            stagger: 0.1,
            // Отдаём transform обратно CSS: иначе инлайновый стиль перебил бы hover карточки.
            clearProps: 'transform',
          });
          gsap.to(parts(batch, '[data-cascade-body]'), {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power2.out',
            stagger: 0.1,
            delay: 0.2,
            clearProps: 'opacity,transform',
          });
        },
      });
    },
    deps,
  );
}
