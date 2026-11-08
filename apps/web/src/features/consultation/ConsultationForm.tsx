import { consultationRequestSchema } from '@nisha/contracts';
import type { ConsultationRequest, User } from '@nisha/contracts';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { z } from 'zod';

import { ApiError, apiRequest } from '../../shared/api/http';
import { fieldErrors } from '../../shared/lib/form';
import { Button } from '../../shared/ui/Button/Button';
import { Input } from '../../shared/ui/Field/Input';
import { Textarea } from '../../shared/ui/Field/Textarea';
import styles from './ConsultationForm.module.css';

function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'RATE_LIMITED') return error.message;
    if (error.code === 'NETWORK') return 'Нет соединения. Попробуйте ещё раз.';
  }
  return 'Не получилось отправить заявку. Позвоните нам или попробуйте позже.';
}

/** Запись на консультацию в бутике: перезвоним и подберём время. */
export function ConsultationForm({ user }: { user: User | null }) {
  const [values, setValues] = useState({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
    preferredTime: '',
    comment: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const send = useMutation({
    mutationFn: (input: ConsultationRequest) =>
      apiRequest('/api/consultations', z.undefined(), {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  });
  const set = (key: keyof typeof values) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = consultationRequestSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    send.mutate(parsed.data);
  };

  if (send.isSuccess) {
    return (
      <p role="status" className={styles.done}>
        Спасибо, {values.name.trim()}! Перезвоним по&nbsp;номеру {values.phone.trim()}{' '}
        и&nbsp;договоримся о&nbsp;времени.
      </p>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.grid}>
        <Input
          label="Имя"
          autoComplete="name"
          value={values.name}
          error={errors.name}
          onChange={set('name')}
        />
        <Input
          label="Телефон"
          type="tel"
          autoComplete="tel"
          value={values.phone}
          error={errors.phone}
          onChange={set('phone')}
        />
        <Input
          label="Электронная почта"
          type="email"
          autoComplete="email"
          hint="Необязательно"
          value={values.email}
          error={errors.email}
          onChange={set('email')}
        />
        <Input
          label="Когда удобно"
          hint="Например, «суббота днём»"
          value={values.preferredTime}
          error={errors.preferredTime}
          onChange={set('preferredTime')}
        />
      </div>
      <Textarea
        label="Что хочется найти"
        hint="Настроение, любимые ароматы, повод — всё, что поможет подготовиться"
        value={values.comment}
        error={errors.comment}
        onChange={set('comment')}
      />
      {send.isError && (
        <p role="alert" className={styles.error}>
          {errorText(send.error)}
        </p>
      )}
      <div>
        <Button type="submit" size="xl" disabled={send.isPending}>
          {send.isPending ? 'Отправляем…' : 'Записаться'}
        </Button>
      </div>
    </form>
  );
}
