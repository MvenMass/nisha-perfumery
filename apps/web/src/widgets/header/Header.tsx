import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';

import { cx } from '../../shared/lib/cx';
import { plural } from '../../shared/lib/plural';
import { Container } from '../../shared/ui/Container/Container';
import { Icon } from '../../shared/ui/Icon/Icon';
import { IconButton, IconLink } from '../../shared/ui/IconButton/IconButton';
import { Sheet } from '../../shared/ui/Sheet/Sheet';
import styles from './Header.module.css';

// Якоря ведут к секциям главной из home.html; разделы появятся вместе со страницами.
const NAV_ITEMS = [
  { to: '/catalog', label: 'Каталог' },
  { to: '/#specimens', label: 'Образцы' },
  { to: '/#process', label: 'Мастерская' },
  { to: '/journal', label: 'Журнал' },
  { to: '/#atelier', label: 'Бутик' },
] as const;

const ROUTES = {
  account: '/account',
  favorites: '/account/favorites',
  cart: '/cart',
};

type HeaderProps = {
  /** Сколько товаров в корзине — с сервера (D-028). */
  cartCount: number;
  onSearch?: (() => void) | undefined;
};

function cartLabel(count: number): string {
  if (count === 0) return 'Корзина';
  return `Корзина, ${count} ${plural(count, ['товар', 'товара', 'товаров'])}`;
}

export function Header({ cartCount, onSearch }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={styles.header}>
      <Container className={styles.inner}>
        <Link to="/" className={styles.logo} aria-label="Ниша, парфюмерный дом — на главную">
          <span className={styles.logoName}>НИША</span>
          <span className={styles.logoSub}>ПАРФЮМЕРНЫЙ ДОМ</span>
        </Link>

        <nav aria-label="Основная навигация" className={styles.nav}>
          <ul className={styles.navList}>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cx(styles.navLink, isActive && !item.to.includes('#') && styles.navLinkActive)
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          <IconButton icon="search" label="Поиск" onClick={onSearch} />
          <IconLink
            icon="user"
            label="Личный кабинет"
            to={ROUTES.account}
            current={pathname === ROUTES.account}
            className={styles.wideOnly}
          />
          <IconLink
            icon="heart"
            label="Избранное"
            to={ROUTES.favorites}
            current={pathname === ROUTES.favorites}
            className={styles.wideOnly}
          />
          <IconLink
            icon="bag"
            label={cartLabel(cartCount)}
            to={ROUTES.cart}
            badge={cartCount}
            current={pathname === ROUTES.cart}
          />
          <IconButton
            icon="menu"
            label="Открыть меню"
            className={styles.menuButton}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          />
        </div>
      </Container>

      <Sheet
        open={menuOpen}
        onClose={closeMenu}
        title="Меню"
        closeLabel="Закрыть меню"
        side="right"
      >
        <nav aria-label="Основная навигация">
          <ul className={styles.menuList}>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={closeMenu}
                  className={({ isActive }) =>
                    cx(styles.menuLink, isActive && !item.to.includes('#') && styles.menuLinkActive)
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li>
              <Link
                to={ROUTES.account}
                onClick={closeMenu}
                className={cx(styles.menuLink, styles.menuSecondary)}
              >
                <Icon name="user" size={18} />
                Личный кабинет
              </Link>
            </li>
            <li>
              <Link
                to={ROUTES.favorites}
                onClick={closeMenu}
                className={cx(styles.menuLink, styles.menuSecondary)}
              >
                <Icon name="heart" size={18} />
                Избранное
              </Link>
            </li>
          </ul>
        </nav>
      </Sheet>
    </header>
  );
}
