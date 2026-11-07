import { updateProfileRequestSchema } from '@nisha/contracts';
import type { User } from '@nisha/contracts';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { useMe } from '../../entities/user/queries';
import { useUpdateProfile } from '../../features/auth/mutations';
import { ApiError } from '../../shared/api/http';
import { fieldErrors } from '../../shared/lib/form';
import { useMeta } from '../../shared/lib/useMeta';
import { Button } from '../../shared/ui/Button/Button';
import { Input } from '../../shared/ui/Field/Input';
import styles from './AccountPage.module.css';

function ProfileForm({ user, onDone }: { user: User; onDone: () => void }) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const update = useUpdateProfile();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = updateProfileRequestSchema.safeParse({
      name,
      phone: phone.trim() === '' ? null : phone,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    update.mutate(parsed.data, { onSuccess: onDone });
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Input
        label="Имя"
        autoComplete="name"
        value={name}
        error={errors.name}
        onChange={(event) => setName(event.target.value)}
      />
      <Input
        label="Телефон"
        type="tel"
        autoComplete="tel"
        value={phone}
        error={errors.phone}
        hint="Подставим в&nbsp;контакты при оформлении заказа"
        onChange={(event) => setPhone(event.target.value)}
      />
      {update.isError && (
        <p role="alert" className={styles.error}>
          {update.error instanceof ApiError && update.error.code === 'NETWORK'
            ? 'Нет соединения. Попробуйте ещё раз.'
            : 'Не получилось сохранить. Попробуйте ещё раз.'}
        </p>
      )}
      <div className={styles.formActions}>
        <Button type="submit" size="lg" disabled={update.isPending}>
          {update.isPending ? 'Сохраняем…' : 'Сохранить'}
        </Button>
        <Button variant="outline" size="lg" onClick={onDone}>
          Отмена
        </Button>
      </div>
    </form>
  );
}

export function ProfileSection() {
  useMeta('Профиль');
  const user = useMe().data;
  const [editing, setEditing] = useState(false);
  if (!user) return null;

  return (
    <section aria-labelledby="profile-title" className={styles.section}>
      <h1 id="profile-title" className={styles.title}>
        Профиль
      </h1>
      {editing ? (
        <ProfileForm user={user} onDone={() => setEditing(false)} />
      ) : (
        <>
          <dl className={styles.facts}>
            <div className={styles.fact}>
              <dt>Имя</dt>
              <dd>{user.name}</dd>
            </div>
            <div className={styles.fact}>
              <dt>Электронная почта</dt>
              <dd>{user.email}</dd>
            </div>
            <div className={styles.fact}>
              <dt>Телефон</dt>
              <dd>{user.phone ?? 'не указан'}</dd>
            </div>
            {user.role === 'admin' && (
              <div className={styles.fact}>
                <dt>Роль</dt>
                <dd>администратор</dd>
              </div>
            )}
          </dl>
          <div>
            <Button variant="outline" size="md" onClick={() => setEditing(true)}>
              Изменить
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
