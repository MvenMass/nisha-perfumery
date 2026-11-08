import sharp from 'sharp';

import { AppError } from '../../shared/errors';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Ширины снимков: карточка, страница товара, крупный просмотр. */
export const IMAGE_WIDTHS = [480, 960, 1600] as const;

/** Основной размер — в базу пишется его адрес; остальные лежат рядом с тем же именем. */
export const MAIN_WIDTH = 960;

const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);

export type ImageFile = { suffix: string; data: Buffer };

/**
 * Проверка и нарезка снимка. Тип определяется по содержимому файла, а не по заголовку
 * запроса или расширению. JPEG — для всех (Safari 14 на старых macOS не знает WebP),
 * WebP рядом — для адаптивных изображений этапа 9.
 */
export async function prepareImage(buffer: Buffer): Promise<ImageFile[]> {
  let format: string | undefined;
  try {
    format = (await sharp(buffer).metadata()).format;
  } catch (error) {
    throw new AppError('VALIDATION_FAILED', 'Это не изображение: подойдут JPEG, PNG и WebP', {
      reason: error instanceof Error ? error.message : String(error),
    });
  }
  if (!format || !ACCEPTED_FORMATS.has(format)) {
    throw new AppError('VALIDATION_FAILED', 'Подойдут только JPEG, PNG и WebP');
  }

  const files: ImageFile[] = [];
  for (const width of IMAGE_WIDTHS) {
    // rotate() без аргументов применяет поворот из EXIF: снимок с телефона не ляжет набок.
    const resized = sharp(buffer).rotate().resize({ width, withoutEnlargement: true });
    files.push({
      suffix: `${width}.jpg`,
      data: await resized.clone().jpeg({ quality: 82, mozjpeg: true }).toBuffer(),
    });
    files.push({
      suffix: `${width}.webp`,
      data: await resized.clone().webp({ quality: 80 }).toBuffer(),
    });
  }
  return files;
}

export const imageKeys = (base: string) =>
  IMAGE_WIDTHS.flatMap((width) => [`${base}-${width}.jpg`, `${base}-${width}.webp`]);
