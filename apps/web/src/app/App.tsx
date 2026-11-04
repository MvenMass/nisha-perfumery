import { createBrowserRouter, RouterProvider } from 'react-router';

import { HomePage } from '../pages/home/HomePage';
import { Providers } from './providers';

const router = createBrowserRouter([{ path: '/', element: <HomePage /> }]);

export function App() {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
}
