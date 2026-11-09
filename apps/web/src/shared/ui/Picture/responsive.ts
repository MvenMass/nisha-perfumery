/** Ширины, в которых api нарезает загруженные снимки (D-067). */
export const UPLOAD_WIDTHS = [480, 960, 1600] as const;

const UPLOADED = /^(\/uploads\/.+)-960\.jpg$/;

export type ResponsiveSources = { webp: string; jpeg: string } | undefined;

/**
 * srcset для снимка из админки: рядом с основным …-960.jpg лежат 480 и 1600 в JPEG и WebP.
 * Другие адреса (внешние, заглушки) — без srcset: у них нет соседних размеров.
 */
export function responsiveSources(url: string): ResponsiveSources {
  const base = UPLOADED.exec(url)?.[1];
  if (!base) return undefined;
  const set = (extension: string) =>
    UPLOAD_WIDTHS.map((width) => `${base}-${width}.${extension} ${width}w`).join(', ');
  return { webp: set('webp'), jpeg: set('jpg') };
}
