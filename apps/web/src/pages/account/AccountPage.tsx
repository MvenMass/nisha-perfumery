import { Link, useNavigate } from 'react-router';

import { useMe } from '../../entities/user/queries';
import { useLogout } from '../../features/auth/mutations';
import { useMeta } from '../../shared/lib/useMeta';
import { Container } from '../../shared/ui/Container/Container';
import { Icon } from '../../shared/ui/Icon/Icon';
import styles from './AccountPage.module.css';

// Кабинет по account.html. «Заказы» и «Адреса» добавятся в этапе 7; избранное — общая страница /favorites.
export function AccountPage() {
  useMeta('Личный кабинет');
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
          <li>
            <a href="#profile" aria-current="page" className={styles.menuItemCurrent}>
              <Icon name="user" size={18} />
              Профиль
            </a>
          </li>
          <li>
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

      <section id="profile" aria-labelledby="profile-title" className={styles.main}>
        <h1 id="profile-title" className={styles.title}>
          Профиль
        </h1>
        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>Имя</dt>
            <dd>{user.name}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Электронная почта</dt>
            <dd>{user.email}</dd>
          </div>
          {user.phone && (
            <div className={styles.fact}>
              <dt>Телефон</dt>
              <dd>{user.phone}</dd>
            </div>
          )}
          {user.role === 'admin' && (
            <div className={styles.fact}>
              <dt>Роль</dt>
              <dd>администратор</dd>
            </div>
          )}
        </dl>
      </section>
    </Container>
  );
}
