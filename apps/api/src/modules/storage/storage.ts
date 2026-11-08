import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Хранилище загруженных файлов (D-021). Сейчас — папка на диске (в Docker — именованный том),
 * раздаётся api по /uploads. Если понадобится S3, рядом встанет другая реализация.
 */
export type Storage = {
  put: (key: string, data: Buffer) => Promise<void>;
  remove: (keys: string[]) => Promise<void>;
  /** Публичный адрес файла для <img src>. */
  url: (key: string) => string;
};

export const UPLOADS_PREFIX = '/uploads/';

// Ключ собирает сам api (products/<id>/<id>-960.jpg), но выход за корень проверяем всё равно.
function resolveInside(root: string, key: string): string {
  const target = path.resolve(root, key);
  if (!target.startsWith(path.resolve(root) + path.sep)) {
    throw new Error(`Ключ хранилища вне корня: ${key}`);
  }
  return target;
}

export function createLocalStorage(root: string): Storage {
  return {
    put: async (key, data) => {
      const target = resolveInside(root, key);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, data);
    },
    remove: async (keys) => {
      await Promise.all(keys.map((key) => rm(resolveInside(root, key), { force: true })));
    },
    url: (key) => `${UPLOADS_PREFIX}${key}`,
  };
}
