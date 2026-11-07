import { registerRequestSchema } from '@nisha/contracts';
import { describe, expect, it } from 'vitest';

import { ApiError } from '../../shared/api/http';
import { authErrorMessage, fieldErrors, safeNext } from './auth-utils';

describe('safeNext', () => {
  it.each([
    ['/catalog/basalt?x=1', '/catalog/basalt?x=1'],
    [null, '/account'],
    ['', '/account'],
    ['https://evil.test', '/account'],
    ['//evil.test', '/account'],
    ['/\\evil.test', '/account'],
    ['javascript:alert(1)', '/account'],
  ])('%s → %s', (value, expected) => {
    expect(safeNext(value)).toBe(expected);
  });
});

describe('fieldErrors', () => {
  it('берёт первую ошибку каждого поля', () => {
    const result = registerRequestSchema.safeParse({ email: 'плохо', password: '1', name: '' });
    if (result.success) throw new Error('Ожидалась ошибка');
    expect(Object.keys(fieldErrors(result.error)).sort()).toEqual(['email', 'name', 'password']);
    expect(fieldErrors(result.error).password).toMatch(/8 символов/);
  });
});

describe('authErrorMessage', () => {
  it('занятый email — ошибка поля email', () => {
    const error = new ApiError(409, 'CONFLICT', 'Этот email уже зарегистрирован');
    expect(authErrorMessage(error)).toEqual({
      message: 'Этот email уже зарегистрирован',
      field: 'email',
    });
  });

  it('неверный пароль и лимит — текст сервера, сеть — своя подсказка', () => {
    expect(
      authErrorMessage(new ApiError(401, 'UNAUTHORIZED', 'Неверный email или пароль')),
    ).toEqual({ message: 'Неверный email или пароль' });
    expect(authErrorMessage(new ApiError(0, 'NETWORK', 'x')).message).toMatch(/соединения/);
    expect(authErrorMessage(new Error('boom')).message).toMatch(/Не получилось/);
  });
});
