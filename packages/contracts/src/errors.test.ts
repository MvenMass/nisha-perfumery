import { describe, expect, it } from 'vitest';

import { errorResponseSchema } from './errors';

describe('errorResponseSchema', () => {
  it('принимает ответ с известным кодом и деталями', () => {
    const result = errorResponseSchema.safeParse({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Неверные данные',
        details: [{ path: 'email' }],
      },
    });
    expect(result.success).toBe(true);
  });

  it('отклоняет неизвестный код ошибки', () => {
    const result = errorResponseSchema.safeParse({
      error: { code: 'SOMETHING_ELSE', message: 'x' },
    });
    expect(result.success).toBe(false);
  });

  it('отклоняет ответ без обёртки error', () => {
    expect(errorResponseSchema.safeParse({ code: 'INTERNAL', message: 'x' }).success).toBe(false);
  });
});
