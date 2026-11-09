import { lazy, Suspense } from 'react';

import { useDesktopMotion } from '../../shared/lib/motion/useDesktopMotion';
import type { DepthGaugeProps } from './DepthGaugeScene';

// Сцена нужна только десктопу с мышью: телефон её код не скачивает.
const DepthGaugeScene = lazy(async () => ({
  default: (await import('./DepthGaugeScene')).DepthGaugeScene,
}));

/**
 * «Спуск вглубь породы» (этап 9.1): у левого края закреплена шкала, по мере прокрутки главной
 * отметка опускается, а глубина и порода меняются между слоями-разделителями.
 * Только десктоп с мышью и без reduced motion; это декор — скрыт от скринридера.
 */
export function DepthGauge(props: DepthGaugeProps) {
  if (!useDesktopMotion()) return null;
  return (
    <Suspense fallback={null}>
      <DepthGaugeScene {...props} />
    </Suspense>
  );
}
