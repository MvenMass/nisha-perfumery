import type { ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';

import { useMe } from '../../entities/user/queries';
import { safeNext } from '../../features/auth/auth-utils';
import { LoginForm, RegisterForm } from '../../features/auth/AuthForms';
import { useMeta } from '../../shared/lib/useMeta';
import { Container } from '../../shared/ui/Container/Container';
import { SectionLabel } from '../../shared/ui/SectionLabel/SectionLabel';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import styles from './AuthPages.module.css';

function AuthLayout({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <Container className={styles.page}>
      <div className={styles.card}>
        <div className={styles.head}>
          <SectionLabel>Личный кабинет</SectionLabel>
          <h1 className={styles.title}>{title}</h1>
        </div>
        {children}
        <p className={styles.switch}>{footer}</p>
      </div>
    </Container>
  );
}

/** Общая логика страниц входа: куда вернуться и что делать, если уже вошли. */
function useAuthPage() {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const me = useMe();
  const nextQuery = params.get('next') ? `?next=${encodeURIComponent(next)}` : '';
  return { next, nextQuery, me, goNext: () => void navigate(next, { replace: true }) };
}

export function LoginPage() {
  useMeta('Вход');
  const { next, nextQuery, me, goNext } = useAuthPage();

  if (me.isPending) return <Skeleton height={320} />;
  if (me.data) return <Navigate to={next} replace />;

  return (
    <AuthLayout
      title="Вход"
      footer={
        <>
          Впервые у&nbsp;нас? <Link to={`/register${nextQuery}`}>Создать аккаунт</Link>
        </>
      }
    >
      <LoginForm onSuccess={goNext} />
    </AuthLayout>
  );
}

export function RegisterPage() {
  useMeta('Регистрация');
  const { next, nextQuery, me, goNext } = useAuthPage();

  if (me.isPending) return <Skeleton height={320} />;
  if (me.data) return <Navigate to={next} replace />;

  return (
    <AuthLayout
      title="Регистрация"
      footer={
        <>
          Уже есть аккаунт? <Link to={`/login${nextQuery}`}>Войти</Link>
        </>
      }
    >
      <RegisterForm onSuccess={goNext} />
    </AuthLayout>
  );
}
