// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { useGuestFavorites } from './guest-favorites';

const A = '0190a6f0-0000-7000-8000-00000000000a';
const B = '0190a6f0-0000-7000-8000-00000000000b';

beforeEach(() => {
  useGuestFavorites.getState().clear();
});

describe('гостевое избранное', () => {
  it('добавляет новые в начало без дублей и убирает', () => {
    const { set } = useGuestFavorites.getState();
    set(A, true);
    set(B, true);
    set(A, true);
    expect(useGuestFavorites.getState().productIds).toEqual([A, B]);
    set(B, false);
    expect(useGuestFavorites.getState().productIds).toEqual([A]);
  });

  it('отбрасывает испорченные данные из localStorage', async () => {
    window.localStorage.setItem(
      'nisha-favorites',
      JSON.stringify({ state: { productIds: ['не-uuid'] }, version: 1 }),
    );
    await useGuestFavorites.persist.rehydrate();
    expect(useGuestFavorites.getState().productIds).toEqual([]);
  });
});
