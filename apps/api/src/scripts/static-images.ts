import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { PHOTOS_DIR } from '../database/seed-photos';
import { prepareImage } from '../modules/storage/images';

/*
 * pnpm --filter @nisha/api images:static — снимки, вшитые в витрину (категории, «Материалы»,
 * бутик): assets/photos/static/*.jpg → apps/web/public/images/<имя>-{480,960,1600}.{jpg,webp}.
 * Тот же prepareImage, что у загрузок: Picture подставляет srcset одинаково (D-076).
 * Результат коммитится — витрина работает без запуска скрипта.
 */
const SOURCE = path.join(PHOTOS_DIR, 'static');
const TARGET = path.resolve(import.meta.dirname, '../../../web/public/images');

if (import.meta.main) {
  await mkdir(TARGET, { recursive: true });
  const names = (await readdir(SOURCE)).filter((name) => name.endsWith('.jpg'));
  for (const name of names) {
    const files = await prepareImage(await readFile(path.join(SOURCE, name)));
    const base = name.replace(/\.jpg$/, '');
    for (const file of files)
      await writeFile(path.join(TARGET, `${base}-${file.suffix}`), file.data);
  }
  console.info(`Нарезано снимков: ${names.length} → ${TARGET}`);
}
