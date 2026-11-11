import type { ScrollTriggerType } from './load-gsap';

type Trigger = InstanceType<ScrollTriggerType>;

/** Сцены, которые уже проиграли в этом визите (модульная переменная живёт до перезагрузки). */
const played = new Set<string>();

/** Сцена уже показана: при возврате на страницу она сразу в конечном виде, без закрепления. */
export function pinPlayed(key: string): boolean {
  return played.has(key);
}

/**
 * Закреплённая сцена тормозит прокрутку один раз (этап 9.1, правка): когда её прокрутили
 * до конца, закрепление снимается, а сцена остаётся в конечном виде. Иначе при прокрутке
 * вверх и снова вниз секция «держала» бы страницу каждый раз.
 *
 * Вместе с закреплением исчезает и место под него, раскладка сдвигается. Поэтому замеряем,
 * где секция на экране до и после, и сдвигаем прокрутку ровно на разницу — на экране
 * ничего не прыгает. Для onLeave у ScrollTrigger.
 */
export function releaseAfterPlay(key: string, ScrollTrigger: ScrollTriggerType) {
  return (self: Trigger) => {
    played.add(key);
    // Не посреди обновления ScrollTrigger: снимаем закрепление в следующем кадре.
    requestAnimationFrame(() => {
      const section = self.trigger;
      const before = section?.getBoundingClientRect().top ?? 0;
      const animation = self.animation;
      // revert: убрать обёртку закрепления и её отступ; allowAnimation: таймлайн не уничтожать —
      // после отката раскладки возвращаем его в конечный вид.
      self.kill(true, true);
      animation?.progress(1);
      ScrollTrigger.refresh();
      const after = section?.getBoundingClientRect().top ?? 0;
      window.scrollTo(0, Math.max(window.scrollY + (after - before), 0));
    });
  };
}
