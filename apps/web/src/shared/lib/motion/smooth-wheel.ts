import type { Gsap } from './load-gsap';
import type { SmoothScroll } from './smooth-scroll';

/** За сколько мс прокрутка проходит ~63 % оставшегося пути: «вязкость» инерции. */
const TAU_MS = 150;
const LINE_PX = 16;
/** Ближе этого к цели — считаем, что доехали, и отпускаем ticker. */
const SETTLE_PX = 0.5;

type WheelLike = Pick<WheelEvent, 'deltaY' | 'deltaMode'>;

/** Пиксели из события колеса: Firefox отдаёт строки, некоторые мыши — страницы. */
export function wheelPixels({ deltaY, deltaMode }: WheelLike, pageHeight: number): number {
  if (deltaMode === 1) return deltaY * LINE_PX;
  if (deltaMode === 2) return deltaY * pageHeight;
  return deltaY;
}

/** Шаг экспоненциального сглаживания: не зависит от частоты кадров (60 и 120 Гц едут одинаково). */
export function approach(current: number, target: number, deltaMs: number): number {
  const next = current + (target - current) * (1 - Math.exp(-deltaMs / TAU_MS));
  return Math.abs(target - next) < SETTLE_PX ? target : next;
}

/** Колесо над прокручиваемым блоком (шторка, таблица) — его собственная прокрутка, не страницы. */
function insideScrollable(target: EventTarget | null, deltaY: number): boolean {
  let element = target instanceof Element ? target : null;
  while (element && element !== document.body && element !== document.documentElement) {
    const { overflowY } = window.getComputedStyle(element);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      element.scrollHeight > element.clientHeight
    ) {
      const canMove =
        deltaY < 0
          ? element.scrollTop > 0
          : element.scrollTop + element.clientHeight < element.scrollHeight - 1;
      if (canMove) return true;
    }
    element = element.parentElement;
  }
  return false;
}

/**
 * Инерционная прокрутка колесом мыши поверх нативной (D-074). Страница прокручивается
 * обычным window.scrollTo, только плавно догоняет цель: поиск по странице, якоря, sticky,
 * фокус с клавиатуры и полоса прокрутки работают как без неё. Клавиши и тачпад-жесты
 * по горизонтали не трогаем.
 */
export function createSmoothWheel(gsap: Gsap): SmoothScroll & { kill: () => void } {
  let current = window.scrollY;
  let target = current;
  let running = false;
  let paused = false;
  // Последняя позиция по событию scroll. Событие приходит к следующему кадру, поэтому
  // сразу после мгновенного переноса (якорь) здесь ещё место, откуда переносили.
  let lastSeen = window.scrollY;
  const onScroll = () => {
    lastSeen = window.scrollY;
  };

  const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

  const tick = (_time: number, deltaMs: number) => {
    current = approach(current, target, deltaMs);
    window.scrollTo(0, current);
    if (current === target) stop();
  };
  function start() {
    if (running) return;
    running = true;
    gsap.ticker.add(tick);
  }
  function stop() {
    if (!running) return;
    running = false;
    gsap.ticker.remove(tick);
  }

  const onWheel = (event: WheelEvent) => {
    if (paused || event.ctrlKey || event.defaultPrevented) return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if (insideScrollable(event.target, event.deltaY)) return;
    event.preventDefault();
    // Прокрутку могли сдвинуть клавишами или полосой — продолжаем от фактического места.
    if (!running) current = target = window.scrollY;
    const next = target + wheelPixels(event, window.innerHeight);
    target = Math.min(Math.max(next, 0), maxScroll());
    start();
  };
  // Клавиши, перетаскивание полосы, клик — человек взял управление: инерцию отпускаем.
  const interrupt = () => stop();

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('keydown', interrupt);
  window.addEventListener('pointerdown', interrupt);

  return {
    paused(value) {
      paused = value;
      if (value) stop();
    },
    scrollTo(destination, smooth = true, offset = 0) {
      const y =
        typeof destination === 'number'
          ? destination
          : destination.getBoundingClientRect().top + window.scrollY - offset;
      target = Math.min(Math.max(y, 0), maxScroll());
      if (smooth) {
        current = window.scrollY;
        start();
      } else {
        stop();
        current = target;
        window.scrollTo(0, target);
      }
    },
    glideTo(destination) {
      window.scrollTo(0, lastSeen);
      this.scrollTo(destination);
    },
    kill() {
      stop();
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', interrupt);
      window.removeEventListener('pointerdown', interrupt);
    },
  };
}
