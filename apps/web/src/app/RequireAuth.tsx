import type { UserRole } from '@nisha/contracts';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';

import { useMe } from '../entities/user/queries';
import { Button } from '../shared/ui/Button/Button';
import { Container } from '../shared/ui/Container/Container';
import { EmptyState } from '../shared/ui/EmptyState/EmptyState';
import { Skeleton } from '../shared/ui/Skeleton/Skeleton';
import { NotFoundPage } from '../widgets/not-found/NotFoundPage';

type RequireAuthProps = {
  children: ReactNode;
  /** Нужна роль (админка, этап 8). Сервер проверяет права сам; здесь — только удобство. */
  role?: UserRole | undefined;
};

/** Защищённый маршрут: гостя отправляем на вход с возвратом на исходную страницу. */
export function RequireAuth({ children, role }: RequireAuthProps) {
  const me = useMe();
  const location = useLocation();

  if (me.isPending) {
    return (
      <Container>
        <div role="status" aria-busy="true" aria-label="Проверяем вход">
          <Skeleton height={320} />
        </div>
      </Container>
    );
  }

  if (me.isError) {
    return (
      <Container>
        <EmptyState
          icon="alert"
          headingLevel="h1"
          title="Не удалось проверить вход"
          description="Проверьте соединение и попробуйте ещё раз."
          action={
            <Button variant="outline" size="md" onClick={() => void me.refetch()}>
              Повторить
            </Button>
          }
        />
      </Container>
    );
  }

  if (!me.data) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  // Чужой роли не показываем даже факт существования раздела.
  if (role && me.data.role !== role) return <NotFoundPage />;

  return children;
}
