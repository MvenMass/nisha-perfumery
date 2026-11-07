// @vitest-environment jsdom
import type { CartResponse } from '@nisha/contracts';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useGuestCart } from './guest-cart';
import { cartQueryKey, fetchCart, mergeGuestCart } from './queries';

const A = '0190a6f0-0000-7000-8000-00000000000a';
const B = '0190a6f0-0000-7000-8000-00000000000b';

const cart = (variantIds: string[]): CartResponse => ({
  lines: variantIds.map((variantId) => ({
    variantId,
    productId: '0190a6f0-0000-7000-8000-0000000000ff',
    productSlug: 'basalt',
    productName: 'Базальт',
    specimenNumber: 3,
    volumeMl: 50,
    concentration: 'парфюмерная вода',
    priceKopecks: 650_000,
    quantity: 1,
    availableQuantity: 3,
    status: 'available',
    lineTotalKopecks: 650_000,
    image: null,
  })),
  summary: {
    productsCount: variantIds.length,
    bottlesCount: variantIds.length,
    itemsTotalKopecks: 0,
  },
});

function mockFetch(...responses: Array<Response | Error>) {
  const fn = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => {
    const next = responses.shift();
    if (!next) throw new Error('Лишний запрос');
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const user = {
  id: '0190a6f0-0000-7000-8000-000000000001',
  email: 'anna@nisha.test',
  name: 'Анна',
  phone: null,
  role: 'user' as const,
  hasPassword: true,
};

beforeEach(() => {
  document.cookie = 'nisha_csrf=test';
  useGuestCart.getState().clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('гостевая корзина', () => {
  it('добавляет, меняет, удаляет и держит количество в пределах 1–99', () => {
    const { setQuantity, remove } = useGuestCart.getState();
    setQuantity(A, 2);
    setQuantity(B, 1);
    setQuantity(A, 150);
    expect(useGuestCart.getState().items).toEqual([
      { variantId: A, quantity: 99 },
      { variantId: B, quantity: 1 },
    ]);
    setQuantity(B, 0);
    expect(useGuestCart.getState().items[1]).toEqual({ variantId: B, quantity: 1 });
    remove(A);
    expect(useGuestCart.getState().items).toEqual([{ variantId: B, quantity: 1 }]);
  });

  it('сохраняет в localStorage только варианты и количества', () => {
    useGuestCart.getState().setQuantity(A, 2);
    expect(JSON.parse(window.localStorage.getItem('nisha-cart') ?? '{}')).toEqual({
      state: { items: [{ variantId: A, quantity: 2 }] },
      version: 1,
    });
  });

  it('отбрасывает испорченные данные из localStorage', async () => {
    window.localStorage.setItem(
      'nisha-cart',
      JSON.stringify({ state: { items: [{ variantId: 'x', quantity: -5 }] }, version: 1 }),
    );
    await useGuestCart.persist.rehydrate();
    expect(useGuestCart.getState().items).toEqual([]);
  });

  it('пустая корзина гостя не ходит на сервер', async () => {
    const fetchMock = mockFetch();
    expect((await fetchCart(null)).lines).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('убирает позиции, которых сервер больше не знает', async () => {
    useGuestCart.getState().setQuantity(A, 1);
    useGuestCart.getState().setQuantity(B, 1);
    mockFetch(json(cart([A])));
    await fetchCart(null);
    expect(useGuestCart.getState().items).toEqual([{ variantId: A, quantity: 1 }]);
  });
});

describe('слияние при входе', () => {
  it('отправляет гостевые позиции, кладёт ответ в кеш и очищает браузер', async () => {
    useGuestCart.getState().setQuantity(A, 2);
    const fetchMock = mockFetch(json(cart([A, B])));
    const queryClient = new QueryClient();

    await mergeGuestCart(queryClient, user);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/cart/merge');
    expect(JSON.parse(init?.body as string)).toEqual({ items: [{ variantId: A, quantity: 2 }] });
    expect(queryClient.getQueryData(cartQueryKey(user))).toEqual(cart([A, B]));
    expect(useGuestCart.getState().items).toEqual([]);
  });

  it('при ошибке оставляет гостевую корзину для следующей попытки', async () => {
    useGuestCart.getState().setQuantity(A, 2);
    mockFetch(json({ error: { code: 'INTERNAL', message: 'Ошибка' } }, 500));

    await expect(mergeGuestCart(new QueryClient(), user)).rejects.toThrow();
    expect(useGuestCart.getState().items).toEqual([{ variantId: A, quantity: 2 }]);
  });
});
