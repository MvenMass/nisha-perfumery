import { useState } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';

import { useCart } from '../entities/cart/queries';
import { useViewer } from '../entities/user/queries';
import { SearchSheet } from '../features/search/SearchSheet';
import { Footer } from '../widgets/footer/Footer';
import { Header } from '../widgets/header/Header';
import styles from './AppLayout.module.css';

export function AppLayout() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { pathname } = useLocation();
  // Флаконы, которые можно купить, — то же число, что «Товары, N шт.» в итоге корзины (D-028).
  const loadedCount = useCart(useViewer()).data?.summary.bottlesCount;
  const cartCount = loadedCount ?? 0;
  // Толчок значка — только когда число выросло после действия покупателя, а не при загрузке.
  const [seenCount, setSeenCount] = useState(loadedCount);
  const [cartBump, setCartBump] = useState(0);
  if (loadedCount !== seenCount) {
    if (seenCount !== undefined && loadedCount !== undefined && loadedCount > seenCount) {
      setCartBump((bump) => bump + 1);
    }
    setSeenCount(loadedCount);
  }
  return (
    <div className={styles.layout}>
      <a href="#content" className={styles.skipLink}>
        К&nbsp;содержимому
      </a>
      <Header cartCount={cartCount} cartBump={cartBump} onSearch={() => setSearchOpen(true)} />
      <SearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} />
      <main id="content" tabIndex={-1} className={styles.main}>
        {/* key по пути — короткое проявление новой страницы; смена фильтров (query) его не вызывает. */}
        <div key={pathname} className={styles.page}>
          <Outlet />
        </div>
      </main>
      <Footer />
      <ScrollRestoration />
    </div>
  );
}
