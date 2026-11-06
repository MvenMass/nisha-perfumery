import { createBrowserRouter, RouterProvider } from 'react-router';
import type { RouteObject } from 'react-router';

import { CatalogPage } from '../pages/catalog/CatalogPage';
import { HomePage } from '../pages/home/HomePage';

import { ProductPage } from '../pages/product/ProductPage';
import { NotFoundPage } from '../widgets/not-found/NotFoundPage';
import { RouteErrorPage } from '../widgets/not-found/RouteErrorPage';

import { AppLayout } from './AppLayout';
import { Providers } from './providers';

const shopRoutes: RouteObject[] = [
  { index: true, element: <HomePage /> },
  { path: 'catalog', element: <CatalogPage /> },
  { path: 'catalog/:slug', element: <ProductPage /> },
  { path: '*', element: <NotFoundPage /> },
];

const routes: RouteObject[] = [
  { element: <AppLayout />, errorElement: <RouteErrorPage />, children: shopRoutes },
];

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
