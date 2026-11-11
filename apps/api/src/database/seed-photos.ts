import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import { MAIN_WIDTH, prepareImage } from '../modules/storage/images';
import type { Storage } from '../modules/storage/storage';

/** Исходники снимков лежат в репозитории: assets/photos (авторы — в CREDITS.md). */
export const PHOTOS_DIR = path.resolve(import.meta.dirname, '../../../../assets/photos');

export type SeedPhotos = {
  storage: Storage;
  /** Папка хранилища на диске — по ней сид понимает, что снимок уже нарезан. */
  uploadsDir: string;
};

/**
 * Нарезка снимка для сида тем же prepareImage, что и загрузка из админки (D-076).
 * Ключ постоянный (seed/products/basalt): повторный сид и сброс e2e-базы не пережимают
 * то, что уже лежит в хранилище, — сжатие 37 снимков заметно по времени.
 */
export async function seedPhoto(photos: SeedPhotos, source: string, key: string): Promise<string> {
  const mainKey = `seed/${key}-${MAIN_WIDTH}.jpg`;
  // Нет файла — значит, ещё не нарезан. Другая ошибка доступа всплывёт ниже, на записи.
  const ready = await access(path.join(photos.uploadsDir, mainKey)).then(
    () => true,
    () => false,
  );
  if (!ready) {
    const files = await prepareImage(await readFile(path.join(PHOTOS_DIR, source)));
    for (const file of files) await photos.storage.put(`seed/${key}-${file.suffix}`, file.data);
  }
  return photos.storage.url(mainKey);
}
