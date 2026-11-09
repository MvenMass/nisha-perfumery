import { useRef } from 'react';

import { cx } from '../../lib/cx';
import { parseDepth } from '../../lib/motion/depth';
import { useGsap } from '../../lib/motion/useGsap';
import styles from './StrataDivider.module.css';

export type StrataColor = 'lineStrong' | 'walnut' | 'stone' | 'basalt' | 'accent' | 'copperDark';

export type StrataLayer = {
  /** Толщина слоя в px — в макетах от 1 до 8. */
  height: number;
  color: StrataColor;
};

type StrataDividerProps = {
  /** Глубина слева: «−040 м». */
  depth: string;
  /** Порода справа: «Известняк». На телефоне скрыта. */
  label?: string | undefined;
  layers: readonly StrataLayer[];
  className?: string | undefined;
};

/**
 * Фирменный разделитель секций: срез породы со шкалой глубины. Чистый декор — скрыт от скринридера.
 * При прокрутке слои «нарастают» слева направо, а счётчик глубины добирается до своего значения.
 */
export function StrataDivider({ depth, label, layers, className }: StrataDividerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const depthRef = useRef<HTMLSpanElement>(null);

  useGsap(
    rootRef,
    ({ gsap }, root) => {
      const trigger = { trigger: root, start: 'top 90%', once: true };
      gsap.from(`.${styles.layer}`, {
        scaleX: 0,
        transformOrigin: 'left center',
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.08,
        scrollTrigger: trigger,
      });

      const counter = parseDepth(depth);
      const target = depthRef.current;
      if (!counter || !target) return;
      const state = { value: 0 };
      target.textContent = counter.format(0);
      gsap.to(state, {
        value: counter.value,
        duration: 1.1,
        ease: 'power2.out',
        scrollTrigger: trigger,
        onUpdate: () => {
          target.textContent = counter.format(state.value);
        },
      });
      // revert не знает о textContent: возвращаем подпись сами.
      return () => {
        target.textContent = depth;
      };
    },
    [depth],
  );

  return (
    <div ref={rootRef} aria-hidden="true" className={cx(styles.divider, className)}>
      <span ref={depthRef} className={styles.depth}>
        {depth}
      </span>
      <div className={styles.layers}>
        {layers.map((layer, index) => (
          <span
            // Слои — статичный рисунок, порядок не меняется.
            key={index}
            className={cx(styles.layer, styles[layer.color])}
            style={{ height: layer.height }}
          />
        ))}
      </div>
      {label && <span className={styles.label}>{label.toUpperCase()}</span>}
    </div>
  );
}
