import type { FastifyRequest } from 'fastify';

import { AppError } from '../../shared/errors';

/**
 * Файл и текстовые поля из multipart-запроса. Превышение лимита размера — понятная ошибка
 * формы, а не 413 без объяснения.
 */
export async function readUpload(
  request: FastifyRequest,
): Promise<{ buffer: Buffer; field: (name: string) => string | undefined }> {
  const file = await request.file();
  if (!file) throw new AppError('VALIDATION_FAILED', 'Выберите файл снимка');
  let buffer: Buffer;
  try {
    buffer = await file.toBuffer();
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'FST_REQ_FILE_TOO_LARGE') {
      throw new AppError('VALIDATION_FAILED', 'Файл больше 10 МБ');
    }
    throw error;
  }
  return {
    buffer,
    field: (name) => {
      const value = file.fields[name];
      return value &&
        !Array.isArray(value) &&
        value.type === 'field' &&
        typeof value.value === 'string'
        ? value.value
        : undefined;
    },
  };
}
