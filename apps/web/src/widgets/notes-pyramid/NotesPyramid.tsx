import type { ProductDetail } from '@nisha/contracts';
import type { CSSProperties } from 'react';
import { Fragment, useRef } from 'react';

import { cx } from '../../shared/lib/cx';
import { useGsap } from '../../shared/lib/motion/useGsap';
import { typograph } from '../../shared/lib/typograph';
import { buildPyramid, formatDuration, formatLayerRange, pyramidDescription } from './pyramid';
import styles from './NotesPyramid.module.css';

type NotesPyramidProps = {
  name: string;
  notes: ProductDetail['notes'];
  layers: ProductDetail['layers'];
  className?: string | undefined;
};

/**
 * Пирамида нот как срез породы: сверху лёгкие ноты, внизу — база, толщина слоя — время звучания.
 * При прокрутке слои раскрываются по очереди сверху вниз — так, как аромат звучит на коже.
 */
export function NotesPyramid({ name, notes, layers, className }: NotesPyramidProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pyramid = buildPyramid(notes, layers);

  useGsap(rootRef, ({ gsap }, root) => {
    gsap.from(`.${styles.layer}, .${styles.bedrock}`, {
      opacity: 0,
      y: -14,
      duration: 0.7,
      ease: 'power2.out',
      stagger: 0.22,
      scrollTrigger: { trigger: root, start: 'top 80%', once: true },
    });
  });
  const lastEnd = pyramid[pyramid.length - 1]?.to ?? 0;
  const ticks = ['0', ...pyramid.map((layer) => String(layer.to))].map((value, index, all) => {
    const minutes = Number(value);
    const text = formatDuration(minutes);
    return index === all.length - 1 && minutes === lastEnd ? `${text}+` : text;
  });

  return (
    <div
      ref={rootRef}
      role="img"
      aria-label={pyramidDescription(name, pyramid)}
      className={cx(styles.pyramid, className)}
    >
      <div aria-hidden="true" className={styles.scale}>
        {ticks.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
      <div aria-hidden="true" className={styles.layers}>
        {pyramid.map((layer, index) => (
          <Fragment key={layer.level}>
            {index === 1 && <div className={styles.seam} />}
            {index === 2 && <div className={styles.seamWide} />}
            <div
              className={cx(styles.layer, styles[layer.level])}
              style={{ '--thickness': layer.thickness } as CSSProperties}
            >
              <span className={styles.label}>
                <span className={styles.longLabel}>{layer.label}</span>
                <span className={styles.shortLabel}>
                  {layer.shortLabel} ·{' '}
                  {formatLayerRange(layer.from, layer.to, layer.level === 'base')}
                </span>
              </span>
              <span className={styles.notes}>{typograph(layer.notes.join(', '))}</span>
            </div>
          </Fragment>
        ))}
        <div className={styles.bedrock} />
      </div>
    </div>
  );
}
