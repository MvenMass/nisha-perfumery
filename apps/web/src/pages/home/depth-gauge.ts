/** Разделитель-слой на странице: где он (px от начала документа) и какая там глубина. */
export type DepthAnchor = { y: number; depth: number; label: string };

export const SURFACE_LABEL = 'Поверхность';

/**
 * Глубина в точке страницы: от 0 м в начале до первого слоя и дальше между слоями — линейно,
 * после последнего — его глубина. Подпись — порода последнего пройденного слоя.
 */
export function depthAt(
  y: number,
  anchors: readonly DepthAnchor[],
): { depth: number; label: string } {
  let previous: DepthAnchor = { y: 0, depth: 0, label: SURFACE_LABEL };
  for (const anchor of anchors) {
    if (y < anchor.y) {
      const span = anchor.y - previous.y;
      const share = span > 0 ? (y - previous.y) / span : 1;
      return {
        depth: previous.depth + (anchor.depth - previous.depth) * Math.max(0, share),
        label: previous.label,
      };
    }
    previous = anchor;
  }
  return { depth: previous.depth, label: previous.label };
}
