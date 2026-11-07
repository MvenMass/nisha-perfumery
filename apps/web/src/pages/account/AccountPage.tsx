import { Link, NavLink, Outlet, useNavigate } from 'react-router';

import { useMe } from '../../entities/user/queries';
import { useLogout } from '../../features/auth/mutations';
import { cx } from '../../shared/lib/cx';
import { Container } from '../../shared/ui/Container/Container';
import { Icon } from '../../shared/ui/Icon/Icon';
import type { IconName } from '../../shared/ui/Icon/Icon';
import styles from './AccountPage.module.css';

const SECTIONS: Array<{ to: string; label: string; icon: IconName; end: boolean }> = [
  { to: '/account', label: 'Профиль', icon: 'user', end: true },
  { to: '/account/orders', label: 'Заказы', icon: 'box', end: false },
  { to: '/account/addresses', label: 'Адреса', icon: 'pin', end: false },
];

/** Кабинет по account.html: меню слева, раздел — справа. */
export function AccountPage() {
  const user = useMe().data;
  const logout = useLogout();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <Container className={styles.page}>
      <nav aria-label="Личный кабинет" className={styles.nav}>
        <div className={styles.who}>
          <span className={styles.label}>Личный кабинет</span>
          <span className={styles.name}>{user.name}</span>
        </div>
        <ul className={styles.menu}>
          {SECTIONS.map((section) => (
            <li key={section.to}>
              <NavLink
                to={section.to}
                end={section.end}
                className={({ isActive }) =>
                  cx(styles.menuItem, isActive && styles.menuItemCurrent)
                }
              >
                <Icon name={section.icon} size={18} />
                {section.label}
              </NavLink>
            </li>
          ))}
          <li>
            {/* Избранное доступно и гостю, поэтому это общая страница, а не раздел кабинета (D-058). */}
            <Link to="/favorites" className={styles.menuItem}>
              <Icon name="heart" size={18} />
              Избранное
            </Link>
          </li>
          <li>
            <button
              type="button"
              className={styles.menuButton}
              disabled={logout.isPending}
              onClick={() =>
                logout.mutate(undefined, { onSuccess: () => void navigate('/', { replace: true }) })
              }
            >
              <Icon name="logout" size={18} />
              {logout.isPending ? 'Выходим…' : 'Выйти'}
            </button>
          </li>
        </ul>
        {logout.isError && (
          <p role="alert" className={styles.error}>
            Не получилось выйти. Обновите страницу и попробуйте ещё раз.
          </p>
        )}
      </nav>

      <div className={styles.main}>
        <Outlet />
      </div>
    </Container>
  );
}
