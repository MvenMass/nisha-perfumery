import { healthResponseSchema } from '@nisha/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ApiError, apiRequest } from './http';

function mockFetch(response: Response | Error) {
  const fn = vi.fn(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

async function catchApiError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('Ожидалась ApiError');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('возвращает ответ, прошедший схему, и отправляет cookie', async () => {
    const fetchMock = mockFetch(json({ status: 'ok' }));

    await expect(apiRequest('/api/health', healthResponseSchema)).resolves.toEqual({
      status: 'ok',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/health',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('превращает ошибку api в ApiError с кодом и деталями', async () => {
    mockFetch(
      json({ error: { code: 'VALIDATION_FAILED', message: 'Плохо', details: ['x'] } }, 400),
    );

    const error = await catchApiError(apiRequest('/api/x', healthResponseSchema));
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_FAILED', details: ['x'] });
  });

  it('ответ не по контракту → BAD_RESPONSE', async () => {
    mockFetch(json({ status: 'broken' }));

    const error = await catchApiError(apiRequest('/api/health', healthResponseSchema));
    expect(error.code).toBe('BAD_RESPONSE');
  });

  it('не JSON → BAD_RESPONSE', async () => {
    mockFetch(new Response('<html>', { status: 502 }));

    const error = await catchApiError(apiRequest('/api/health', healthResponseSchema));
    expect(error).toMatchObject({ status: 502, code: 'BAD_RESPONSE' });
  });

  it('для изменяющего запроса без cookie сначала берёт CSRF-токен и кладёт его в заголовок', async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        url === '/api/auth/csrf'
          ? json({ token: 'csrf-token-from-server' })
          : json({ status: 'ok' }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/api/stock-notifications', healthResponseSchema, {
      method: 'POST',
      body: '{}',
    });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/auth/csrf',
      '/api/stock-notifications',
    ]);
    const init = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(new Headers(init[1].headers).get('x-csrf-token')).toBe('csrf-token-from-server');
  });

  it('204 без тела считается успехом', async () => {
    mockFetch(new Response(null, { status: 204 }));
    await expect(apiRequest('/api/auth/logout', z.undefined(), { method: 'GET' })).resolves.toBe(
      undefined,
    );
  });

  it('сеть недоступна → NETWORK', async () => {
    mockFetch(new TypeError('Failed to fetch'));

    const error = await catchApiError(apiRequest('/api/health', healthResponseSchema));
    expect(error).toMatchObject({ status: 0, code: 'NETWORK' });
  });
});
