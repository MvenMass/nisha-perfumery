import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import type { RouteObject } from 'react-router';

import { AccountPage } from '../pages/account/AccountPage';
import { AddressesSection } from '../pages/account/AddressesSection';
import { OrderDetailSection } from '../pages/account/OrderDetailSection';
import { OrdersSection } from '../pages/account/OrdersSection';
import { ProfileSection } from '../pages/account/ProfileSection';
import { LoginPage, RegisterPage, SetPasswordPage } from '../pages/auth/AuthPages';
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

// Админка — отдельный чанк: покупатель её код не скачивает.
const loadAdmin = () => import('../pages/admin');

const adminRoutes: RouteObject = {
  path: 'admin',
  lazy: async () => {
    const { AdminLayout } = await loadAdmin();
    return {
      element: (
        <RequireAuth requiredRole="admin">
          <AdminLayout />
        </RequireAuth>
      ),
    };
  },
  children: [
    { index: true, element: <Navigate to="/admin/orders" replace /> },
    { path: 'orders', lazy: async () => ({ Component: (await loadAdmin()).OrdersAdmin }) },
    { path: 'orders/:orderId', lazy: async () => ({ Component: (await loadAdmin()).OrderAdmin }) },
    { path: 'products', lazy: async () => ({ Component: (await loadAdmin()).ProductsAdmin }) },
    {
      path: 'products/:productId',
      lazy: async () => ({ Component: (await loadAdmin()).ProductEditor }),
    },
    {
      path: 'dictionaries',
      lazy: async () => ({ Component: (await loadAdmin()).DictionariesAdmin }),
    },
    { path: 'slides', lazy: async () => ({ Component: (await loadAdmin()).SlidesAdmin }) },
    { path: 'articles', lazy: async () => ({ Component: (await loadAdmin()).ArticlesAdmin }) },
    {
      path: 'articles/:articleId',
      lazy: async () => ({ Component: (await loadAdmin()).ArticleEditor }),
    },
    {
      path: 'consultations',
      lazy: async () => ({ Component: (await loadAdmin()).ConsultationsAdmin }),
    },
    { path: 'settings', lazy: async () => ({ Component: (await loadAdmin()).SettingsAdmin }) },
  ],
};

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
    children: [
      { index: true, element: <ProfileSection /> },
      { path: 'orders', element: <OrdersSection /> },
      { path: 'orders/:orderId', element: <OrderDetailSection /> },
      { path: 'addresses', element: <AddressesSection /> },
    ],
  },
  { path: 'set-password', element: <SetPasswordPage /> },
  adminRoutes,
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
