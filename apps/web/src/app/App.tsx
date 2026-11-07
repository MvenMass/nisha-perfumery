import { createBrowserRouter, RouterProvider } from 'react-router';
import type { RouteObject } from 'react-router';

import { AccountPage } from '../pages/account/AccountPage';
import { LoginPage, RegisterPage } from '../pages/auth/AuthPages';
import { CartPage } from '../pages/cart/CartPage';
import { CatalogPage } from '../pages/catalog/CatalogPage';
import { CheckoutPage } from '../pages/checkout/CheckoutPage';
import { FavoritesPage } from '../pages/favorites/FavoritesPage';
import { FragranceFinderPage } from '../pages/fragrance-finder/FragranceFinderPage';
import { HomePage } from '../pages/home/HomePage';
import { OrderDonePage } from '../pages/payment/OrderDonePage';
import { PaymentPage } from '../pages/payment/PaymentPage';
import { ProductPage } from '../pages/product/ProductPage';
import { NotFoundPage } from '../widgets/not-found/NotFoundPage';
import { RouteErrorPage } from '../widgets/not-found/RouteErrorPage';

import { AppLayout } from './AppLayout';
import { Providers } from './providers';
import { RequireAuth } from './RequireAuth';

const shopRoutes: RouteObject[] = [
  { index: true, element: <HomePage /> },
  { path: 'catalog', element: <CatalogPage /> },
  { path: 'catalog/:slug', element: <ProductPage /> },
  { path: 'fragrance-finder', element: <FragranceFinderPage /> },
  { path: 'cart', element: <CartPage /> },
  { path: 'checkout', element: <CheckoutPage /> },
  { path: 'checkout/payment/:orderId', element: <PaymentPage /> },
  { path: 'checkout/done/:orderId', element: <OrderDonePage /> },
  { path: 'favorites', element: <FavoritesPage /> },
  { path: 'login', element: <LoginPage /> },
  { path: 'register', element: <RegisterPage /> },
  {
    path: 'account',
    element: (
      <RequireAuth>
        <AccountPage />
      </RequireAuth>
    ),
  },
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
