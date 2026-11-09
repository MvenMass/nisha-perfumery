import { useEffect, useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router';

import styles from './Intro.module.css';

const SEEN_KEY = 'nisha-intro-seen';
/** Когда слои начинают расходиться: с этого момента под ними стартует первый экран. */
const REVEAL_AT = '500ms';
/** Всё уже доиграло — и заставка, и появление первого экрана под ней. */
const DONE_MS = 2000;
const BANDS = ['bg', 'surface', 'basalt', 'walnut'] as const;

/**
 * Заставку показываем один раз за визит и только при входе на главную. Не показываем при
 * reduced motion и под автотестами (navigator.webdriver): там важен сразу доступный экран.
 */
function shouldShow(pathname: string): boolean {
  if (pathname !== '/' || navigator.webdriver) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    return sessionStorage.getItem(SEEN_KEY) === null;
  } catch (error) {
    // Хранилище недоступно (приватный режим, запрет cookies): «один раз за визит» не
    // гарантировать — лучше без заставки, чем на каждом входе.
    console.warn('Заставка пропущена: sessionStorage недоступен', error);
    return false;
  }
}

/**
 * Заставка при первом открытии (этап 9.1): «НИША» проявляется на срезе из четырёх слоёв, потом
 * слои расходятся в стороны и открывают первый экран. Всего 1,2 с, на чистом CSS: не ждёт
 * загрузки скрипта анимаций и не может «зависнуть». Первый экран отрисован под ней сразу,
 * а его появление сдвинуто на момент, когда слои расходятся (--intro-delay).
 */
export function Intro() {
  const { pathname } = useLocation();
  const [shown, setShown] = useState(() => shouldShow(pathname));

  // До первой отрисовки: появление первого экрана стартует вместе с расхождением слоёв.
  useLayoutEffect(() => {
    if (!shown) return undefined;
    const root = document.documentElement;
    root.style.setProperty('--intro-delay', REVEAL_AT);
    return () => {
      root.style.removeProperty('--intro-delay');
    };
  }, [shown]);

  useEffect(() => {
    if (!shown) return undefined;
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch (error) {
      console.warn('Не удалось запомнить показ заставки', error);
    }
    const timer = window.setTimeout(() => setShown(false), DONE_MS);
    return () => window.clearTimeout(timer);
  }, [shown]);

  if (!shown) return null;
  return (
    <div aria-hidden="true" className={styles.intro}>
      {BANDS.map((tone) => (
        <span key={tone} className={`${styles.band} ${styles[tone]}`} />
      ))}
      <div className={styles.logo}>
        <span className={styles.name}>НИША</span>
        <span className={styles.line} />
        <span className={styles.sub}>ПАРФЮМЕРНЫЙ ДОМ</span>
      </div>
    </div>
  );
}
