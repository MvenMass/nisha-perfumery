import { Outlet, ScrollRestoration } from 'react-router';

import { Footer } from '../widgets/footer/Footer';
import { Header } from '../widgets/header/Header';
import styles from './AppLayout.module.css';

// Счётчик корзины появится вместе с корзиной (этап 6).
const CART_COUNT = 0;

export function AppLayout() {
  return (
    <div className={styles.layout}>
      <a href="#content" className={styles.skipLink}>
        К&nbsp;содержимому
      </a>
      <Header cartCount={CART_COUNT} />
      <main id="content" tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </div>
  );
}
