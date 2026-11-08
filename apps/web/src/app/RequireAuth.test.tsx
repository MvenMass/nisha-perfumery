// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RequireAuth } from './RequireAuth';

function LoginProbe() {
  const location = useLocation();
  return <p>Вход: {`${location.pathname}${location.search}`}</p>;
}

function mockMe(user: object | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ user }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    ),
  );
}

function renderAt(path: string, role?: 'admin') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<LoginProbe />} />
          <Route
            path="*"
            element={
              <RequireAuth requiredRole={role}>
                <p>Секрет</p>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const user = {
  id: '0190f1a2-3b4c-7d5e-8f60-718293a4b5c6',
  email: 'anna@nisha.ru',
  name: 'Анна',
  phone: null,
  role: 'user',
  hasPassword: true,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RequireAuth', () => {
  it('отправляет гостя на вход с адресом возврата', async () => {
    mockMe(null);
    renderAt('/account?tab=orders');
    expect(await screen.findByText('Вход: /login?next=%2Faccount%3Ftab%3Dorders')).toBeTruthy();
  });

  it('пропускает вошедшего', async () => {
    mockMe(user);
    renderAt('/account');
    expect(await screen.findByText('Секрет')).toBeTruthy();
  });

  it('не показывает раздел другой роли', async () => {
    mockMe(user);
    renderAt('/admin', 'admin');
    expect(await screen.findByRole('heading', { level: 1 })).toBeTruthy();
    expect(screen.queryByText('Секрет')).toBeNull();
  });
});
