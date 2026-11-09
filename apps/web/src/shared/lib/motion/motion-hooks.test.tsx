// @vitest-environment jsdom
import { act, render, renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadGsap } from './load-gsap';
import { useGsap } from './useGsap';
import { useReducedMotion } from './useReducedMotion';

vi.mock('./load-gsap', () => ({ loadGsap: vi.fn(() => new Promise(() => undefined)) }));

let listeners: Array<() => void> = [];
function mockReducedMotion(matches: { value: boolean }) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      get matches() {
        return matches.value;
      },
      addEventListener: (_type: string, listener: () => void) => listeners.push(listener),
      removeEventListener: () => undefined,
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(loadGsap).mockClear();
  listeners = [];
});

describe('useReducedMotion', () => {
  it('следит за системной настройкой', () => {
    const state = { value: false };
    mockReducedMotion(state);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    act(() => {
      state.value = true;
      for (const listener of listeners) listener();
    });
    expect(result.current).toBe(true);
  });
});

function Scene() {
  const ref = useRef<HTMLDivElement>(null);
  useGsap(ref, () => undefined);
  return <div ref={ref}>Сцена</div>;
}

describe('useGsap', () => {
  it('при уменьшенном движении не загружает GSAP', () => {
    mockReducedMotion({ value: true });
    render(<Scene />);
    expect(loadGsap).not.toHaveBeenCalled();
  });

  it('без настройки загружает GSAP для сцены', () => {
    mockReducedMotion({ value: false });
    render(<Scene />);
    expect(loadGsap).toHaveBeenCalledTimes(1);
  });
});
