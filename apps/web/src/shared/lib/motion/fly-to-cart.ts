import { loadGsap } from './load-gsap';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Копия снимка «перелетает» в значок корзины (`[data-cart-target]` в шапке) по дуге
 * и растворяется в нём (этап 9.1). Копия — декор: aria-hidden, без кнопок, после полёта удаляется.
 * Ничего не делает при reduced motion и когда значок не виден (шапка уехала вверх).
 */
export function flyToCart(source: Element | null): void {
  const target = document.querySelector('[data-cart-target]');
  if (!source || !target || window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (to.bottom <= 0 || from.width === 0) return;

  loadGsap().then(
    ({ gsap }) => {
      const ghost = source.cloneNode(true) as HTMLElement;
      for (const control of ghost.querySelectorAll('button, a')) control.remove();
      ghost.setAttribute('aria-hidden', 'true');
      ghost.removeAttribute('data-fly-source');
      Object.assign(ghost.style, {
        position: 'fixed',
        top: `${from.top}px`,
        left: `${from.left}px`,
        width: `${from.width}px`,
        height: `${from.height}px`,
        margin: '0',
        pointerEvents: 'none',
        zIndex: 'var(--z-toast)',
        transformOrigin: 'center center',
      });
      document.body.append(ghost);

      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      const scale = Math.max(to.width / from.width, 0.04);
      // Разные кривые по осям дают дугу: вбок — сразу, вверх — с разгоном.
      const timeline = gsap.timeline({ onComplete: () => ghost.remove() });
      timeline
        .to(ghost, { x: dx, duration: 0.8, ease: 'power2.out' }, 0)
        .to(ghost, { y: dy, duration: 0.8, ease: 'power3.in' }, 0)
        // Снимок сразу сжимается до «флакона», дальше по дуге летит уже маленьким
        // и не закрывает страницу.
        .to(ghost, { scale, duration: 0.8, ease: 'expo.out' }, 0)
        .to(ghost, { opacity: 0.2, duration: 0.25, ease: 'none' }, 0.55);
    },
    (error: unknown) => {
      console.warn('Анимация добавления в корзину не загрузилась', error);
    },
  );
}
