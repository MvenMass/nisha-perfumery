import { useRef } from 'react';
import type { RefObject } from 'react';

import { parseDepth } from '../../shared/lib/motion/depth';
import { useDesktopMotion } from '../../shared/lib/motion/useDesktopMotion';
import { useGsap } from '../../shared/lib/motion/useGsap';
import { depthAt, SURFACE_LABEL } from './depth-gauge';
import type { DepthAnchor } from './depth-gauge';
import styles from './DepthGauge.module.css';

const TICKS = 9;
/** Шкала появляется, когда первый экран почти ушёл, и прячется у подвала. */
const SHOW_AFTER_VIEWPORT = 0.6;
const HIDE_AT_PROGRESS = 0.97;

type DepthGaugeProps = { pageRef: RefObject<HTMLElement | null>; deps: readonly unknown[] };

/**
 * «Спуск вглубь породы» (этап 9.1): у левого края закреплена шкала, по мере прокрутки главной
 * отметка опускается, а глубина и порода меняются между слоями-разделителями.
 * Только десктоп с мышью и без reduced motion; это декор — скрыт от скринридера.
 */
export function DepthGauge(props: DepthGaugeProps) {
  return useDesktopMotion() ? <Gauge {...props} /> : null;
}

function Gauge({ pageRef, deps }: DepthGaugeProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useGsap(
    rootRef,
    ({ gsap, ScrollTrigger }, root) => {
      const page = pageRef.current;
      const fill = fillRef.current;
      const value = valueRef.current;
      const label = labelRef.current;
      if (!page || !fill || !value || !label) return;

      const dividers = [...page.querySelectorAll<HTMLElement>('[data-depth]')];
      const format = parseDepth(dividers[0]?.dataset.depth ?? '')?.format;
      if (!format) return;
      let anchors: DepthAnchor[] = [];
      let visible = false;
      let shownLabel = '';

      const measure = () => {
        anchors = dividers.map((divider) => ({
          y: divider.getBoundingClientRect().top + window.scrollY,
          depth: parseDepth(divider.dataset.depth ?? '')?.value ?? 0,
          label: divider.dataset.label ?? '',
        }));
      };
      const update = (progress: number) => {
        // Глубина — по середине экрана: там, куда смотрит читатель.
        const current = depthAt(window.scrollY + window.innerHeight / 2, anchors);
        value.textContent = format(current.depth);
        gsap.set(fill, { scaleY: progress });
        if (current.label !== shownLabel) {
          shownLabel = current.label;
          label.textContent = current.label.toUpperCase();
          // Новая порода коротко вспыхивает медью и успокаивается.
          gsap.fromTo(label, { opacity: 0.3 }, { opacity: 1, duration: 0.6, ease: 'power2.out' });
        }
        const shouldShow =
          window.scrollY > window.innerHeight * SHOW_AFTER_VIEWPORT && progress < HIDE_AT_PROGRESS;
        if (shouldShow !== visible) {
          visible = shouldShow;
          gsap.to(root, { autoAlpha: visible ? 1 : 0, duration: 0.5, ease: 'power2.out' });
        }
      };

      gsap.set(root, { autoAlpha: 0 });
      ScrollTrigger.create({
        start: 0,
        end: 'max',
        onRefresh: (self) => {
          measure();
          update(self.progress);
        },
        onUpdate: (self) => update(self.progress),
      });
    },
    [pageRef, ...deps],
  );

  return (
    <div ref={rootRef} aria-hidden="true" className={styles.gauge}>
      <span ref={labelRef} className={styles.label}>
        {SURFACE_LABEL.toUpperCase()}
      </span>
      <span className={styles.track}>
        {Array.from({ length: TICKS }, (_, index) => (
          <span
            key={index}
            className={styles.tick}
            style={{ top: `${(index / (TICKS - 1)) * 100}%` }}
          />
        ))}
        <span ref={fillRef} className={styles.fill} />
      </span>
      <span ref={valueRef} className={styles.value} />
    </div>
  );
}
