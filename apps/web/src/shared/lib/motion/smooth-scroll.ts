/**
 * Текущая инерционная прокрутка, если она включена. Нужна тем, кто сам двигает прокрутку:
 * шторке (пауза, пока открыта) и якорям (плавный переход к секции).
 * Модульная переменная, а не контекст: экземпляр один на страницу и живёт вне React.
 */
export type SmoothScroll = {
  paused: (value: boolean) => void;
  /** offset — отступ сверху в px, чтобы секция не упиралась в край окна. */
  scrollTo: (target: Element | number, smooth?: boolean, offset?: number) => void;
  /** Вернуться туда, откуда страницу только что мгновенно перенесли, и доехать плавно. */
  glideTo: (target: Element) => void;
};

let current: SmoothScroll | null = null;

export function setSmoothScroll(value: SmoothScroll | null): void {
  current = value;
}

export function getSmoothScroll(): SmoothScroll | null {
  return current;
}
