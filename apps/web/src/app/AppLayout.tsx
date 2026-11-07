import { useState } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';

import { useCart } from '../entities/cart/queries';
import { useViewer } from '../entities/user/queries';
import { SearchSheet } from '../features/search/SearchSheet';
import { Footer } from '../widgets/footer/Footer';
import { Header } from '../widgets/header/Header';
import styles from './AppLayout.module.css';

export function AppLayout() {
  const [searchOpen, setSearchOpen] = useState(false);
  // Флаконы, которые можно купить, — то же число, что «Товары, N шт.» в итоге корзины (D-028).
  const cartCount = useCart(useViewer()).data?.summary.bottlesCount ?? 0;
  return (
    <div className={styles.layout}>
      <a href="#content" className={styles.skipLink}>
        К&nbsp;содержимому
      </a>
      <Header cartCount={cartCount} onSearch={() => setSearchOpen(true)} />
      <SearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} />
      <main id="content" tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </div>
  );
}
