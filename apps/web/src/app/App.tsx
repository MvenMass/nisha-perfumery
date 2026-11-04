import { createBrowserRouter, RouterProvider } from 'react-router';
import type { RouteObject } from 'react-router';

import { HomePage } from '../pages/home/HomePage';
import { Providers } from './providers';

const routes: RouteObject[] = [{ path: '/', element: <HomePage /> }];

// Витрина компонентов только для разработки: в production-сборке ветка вырезается вместе с чанком.
if (import.meta.env.DEV) {
  routes.push({
    path: '/_ui',
    lazy: async () => {
      const { UiKitPage } = await import('../pages/ui-kit/UiKitPage');
      return { Component: UiKitPage };
    },
  });
}

const router = createBrowserRouter(routes);

export function App() {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
}
