import { isRouteErrorResponse, useRouteError } from 'react-router';

import { Button } from '../../shared/ui/Button/Button';
import { Container } from '../../shared/ui/Container/Container';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { NotFoundPage } from './NotFoundPage';
import styles from './NotFoundPage.module.css';

// Ошибка при загрузке чанка страницы или в рендере — показываем понятный экран вместо белого листа.
export function RouteErrorPage() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  console.error(error);
  return (
    <Container className={styles.page}>
      <EmptyState
        icon="alert"
        headingLevel="h1"
        title="Что-то пошло не так"
        description="Обновите страницу. Если ошибка повторится — напишите нам, мы разберёмся."
        action={
          <Button variant="outline" size="md" onClick={() => window.location.reload()}>
            Обновить
          </Button>
        }
      />
    </Container>
  );
}
