import { NavLink, Outlet } from 'react-router';

import { cx } from '../../shared/lib/cx';
import { Container } from '../../shared/ui/Container/Container';
import styles from './Admin.module.css';

const SECTIONS = [
  { to: '/admin/orders', label: 'Заказы' },
  { to: '/admin/products', label: 'Товары' },
  { to: '/admin/dictionaries', label: 'Справочники' },
  { to: '/admin/slides', label: 'Главная' },
  { to: '/admin/articles', label: 'Журнал' },
  { to: '/admin/consultations', label: 'Заявки' },
  { to: '/admin/settings', label: 'Настройки' },
] as const;

/** Каркас админки (D-033): меню разделов и раздел. Права проверяет сервер на каждом запросе. */
export function AdminLayout() {
  return (
    <Container className={styles.page}>
      <nav aria-label="Разделы админки" className={styles.nav}>
        <span className={styles.navLabel}>Админка</span>
        {SECTIONS.map((section) => (
          <NavLink
            key={section.to}
            to={section.to}
            className={({ isActive }) => cx(styles.navLink, isActive && styles.navLinkActive)}
          >
            {section.label}
          </NavLink>
        ))}
      </nav>
      <div className={styles.main}>
        <Outlet />
      </div>
    </Container>
  );
}
