import {
  loginRequestSchema,
  registerRequestSchema,
  setPasswordRequestSchema,
} from '@nisha/contracts';
import type { LoginRequest, RegisterRequest } from '@nisha/contracts';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { fieldErrors } from '../../shared/lib/form';
import { Button } from '../../shared/ui/Button/Button';
import { Input } from '../../shared/ui/Field/Input';
import { authErrorMessage } from './auth-utils';
import styles from './AuthForms.module.css';
import { useLogin, useRegister, useSetPassword } from './mutations';

type FormProps = { onSuccess: () => void };

function readForm(event: FormEvent<HTMLFormElement>): Record<string, string> {
  const data = new FormData(event.currentTarget);
  return Object.fromEntries(
    Array.from(data.entries()).map(([key, value]) => [key, typeof value === 'string' ? value : '']),
  );
}

function FormAlert({ message }: { message: string | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className={styles.alert}>
      {message}
    </p>
  );
}

export function LoginForm({ onSuccess }: FormProps) {
  const login = useLogin();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string>();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Та же схема, что проверит сервер (CONVENTIONS.md, правило 8).
    const parsed = loginRequestSchema.safeParse(readForm(event));
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setAlert(undefined);
    login.mutate(parsed.data satisfies LoginRequest, {
      onSuccess,
      onError: (error) => setAlert(authErrorMessage(error).message),
    });
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Input
        label="Электронная почта"
        name="email"
        type="email"
        autoComplete="email"
        error={errors.email}
      />
      <Input
        label="Пароль"
        name="password"
        type="password"
        autoComplete="current-password"
        error={errors.password}
      />
      <FormAlert message={alert} />
      <Button type="submit" size="xl" fullWidth disabled={login.isPending}>
        {login.isPending ? 'Входим…' : 'Войти'}
      </Button>
    </form>
  );
}

export function RegisterForm({ onSuccess }: FormProps) {
  const register = useRegister();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string>();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = registerRequestSchema.safeParse(readForm(event));
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setAlert(undefined);
    register.mutate(parsed.data satisfies RegisterRequest, {
      onSuccess,
      onError: (error) => {
        const { message, field } = authErrorMessage(error);
        if (field) setErrors({ [field]: message });
        else setAlert(message);
      },
    });
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Input label="Имя" name="name" autoComplete="name" error={errors.name} />
      <Input
        label="Электронная почта"
        name="email"
        type="email"
        autoComplete="email"
        error={errors.email}
      />
      <Input
        label="Пароль"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="Не короче 8 символов"
        error={errors.password}
      />
      <FormAlert message={alert} />
      <Button type="submit" size="xl" fullWidth disabled={register.isPending}>
        {register.isPending ? 'Создаём…' : 'Создать аккаунт'}
      </Button>
    </form>
  );
}

/** Пароль для гостевого аккаунта по ссылке из письма (D-060). */
export function SetPasswordForm({ token, onSuccess }: FormProps & { token: string }) {
  const setPassword = useSetPassword();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string>();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = setPasswordRequestSchema.safeParse({ ...readForm(event), token });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setAlert(undefined);
    setPassword.mutate(parsed.data, {
      onSuccess,
      onError: (error) => setAlert(authErrorMessage(error).message),
    });
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Input
        label="Новый пароль"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="Не короче 8 символов"
        error={errors.password}
      />
      <FormAlert message={alert ?? errors.token} />
      <Button type="submit" size="xl" fullWidth disabled={setPassword.isPending}>
        {setPassword.isPending ? 'Сохраняем…' : 'Задать пароль'}
      </Button>
    </form>
  );
}
