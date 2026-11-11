/** Ширины, в которых api нарезает снимки: загрузки и статику витрины (D-067, D-076). */
export const UPLOAD_WIDTHS = [480, 960, 1600] as const;

// /uploads — загрузки и сид, /images — снимки, вшитые в витрину (скрипт images:static).
const SLICED = /^(\/(?:uploads|images)\/.+)-960\.jpg$/;

export type ResponsiveSources = { webp: string; jpeg: string } | undefined;

/**
 * srcset для нарезанного снимка: рядом с основным …-960.jpg лежат 480 и 1600 в JPEG и WebP.
 * Другие адреса (внешние, заглушки) — без srcset: у них нет соседних размеров.
 */
export function responsiveSources(url: string): ResponsiveSources {
  const base = SLICED.exec(url)?.[1];
  if (!base) return undefined;
  const set = (extension: string) =>
    UPLOAD_WIDTHS.map((width) => `${base}-${width}.${extension} ${width}w`).join(', ');
  return { webp: set('webp'), jpeg: set('jpg') };
}
