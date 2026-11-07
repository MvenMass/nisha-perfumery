import { emailSchema, stockNotificationResponseSchema } from '@nisha/contracts';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { useMe } from '../../entities/user/queries';
import { ApiError, apiRequest } from '../../shared/api/http';
import { Button } from '../../shared/ui/Button/Button';
import { Input } from '../../shared/ui/Field/Input';
import styles from './NotifyForm.module.css';

type NotifyFormProps = {
  productId: string;
  productName: string;
};

function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'RATE_LIMITED' || error.code === 'CONFLICT') return error.message;
    if (error.code === 'NETWORK') return 'Нет соединения. Попробуйте ещё раз.';
  }
  return 'Не получилось оформить уведомление. Попробуйте позже.';
}

/** «Сообщить о поступлении» — подписка на товар целиком (D-029). */
export function NotifyForm({ productId, productName }: NotifyFormProps) {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  // Вошедшему email не нужен: сервер возьмёт адрес аккаунта.
  const accountEmail = useMe().data?.email;

  const subscribe = useMutation({
    mutationFn: (value: string | undefined) =>
      apiRequest('/api/stock-notifications', stockNotificationResponseSchema, {
        method: 'POST',
        body: JSON.stringify({ productId, email: value }),
      }),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (accountEmail) {
      subscribe.mutate(undefined);
      return;
    }
    // Та же схема, что проверит сервер (CLAUDE.md, правило 8).
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setFieldError('Проверьте адрес почты');
      return;
    }
    setFieldError(undefined);
    subscribe.mutate(parsed.data);
  };

  if (subscribe.isSuccess) {
    return (
      <p role="status" className={styles.done}>
        {subscribe.data.status === 'subscribed'
          ? `Напишем на ${subscribe.variables ?? accountEmail ?? ''}, когда «${productName}» снова появится.`
          : `Вы уже подписаны: напишем на ${subscribe.variables ?? accountEmail ?? ''}, когда «${productName}» вернётся.`}
      </p>
    );
  }

  return (
    <form id="notify" className={styles.form} onSubmit={submit} noValidate>
      <p className={styles.lead}>
        {accountEmail ? (
          <>Этого объёма сейчас нет. Напишем на&nbsp;{accountEmail}, когда появится.</>
        ) : (
          <>Этого объёма сейчас нет. Оставьте почту&nbsp;— напишем, когда появится.</>
        )}
      </p>
      {accountEmail && subscribe.isError && (
        <p role="alert" className={styles.error}>
          {errorText(subscribe.error)}
        </p>
      )}
      <div className={styles.row}>
        {!accountEmail && (
          <Input
            label="Электронная почта"
            type="email"
            autoComplete="email"
            value={email}
            error={fieldError ?? (subscribe.isError ? errorText(subscribe.error) : undefined)}
            onChange={(event) => setEmail(event.target.value)}
          />
        )}
        <Button type="submit" size="lg" variant="outline" disabled={subscribe.isPending}>
          {subscribe.isPending ? 'Отправляем…' : 'Сообщить о\u00A0поступлении'}
        </Button>
      </div>
    </form>
  );
}
