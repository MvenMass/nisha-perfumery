import { addressInputSchema } from '@nisha/contracts';
import type { Address } from '@nisha/contracts';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiError } from '../../shared/api/http';
import { fieldErrors } from '../../shared/lib/form';
import { Button } from '../../shared/ui/Button/Button';
import { Checkbox } from '../../shared/ui/Checkbox/Checkbox';
import { Input } from '../../shared/ui/Field/Input';
import { Textarea } from '../../shared/ui/Field/Textarea';
import styles from './AddressForm.module.css';
import { useSaveAddress } from './mutations';

type AddressFormProps = {
  /** null — новый адрес. */
  address: Address | null;
  onDone: () => void;
};

/** Адрес курьерской доставки (D-031) — те же поля и схема, что при оформлении. */
export function AddressForm({ address, onDone }: AddressFormProps) {
  const [values, setValues] = useState({
    label: address?.label ?? '',
    city: address?.city ?? '',
    street: address?.street ?? '',
    apartment: address?.apartment ?? '',
    comment: address?.comment ?? '',
    isDefault: address?.isDefault ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useSaveAddress();
  const set = (field: keyof typeof values, value: string | boolean) =>
    setValues((current) => ({ ...current, [field]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = addressInputSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    save.mutate({ id: address?.id ?? null, input: parsed.data }, { onSuccess: onDone });
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.grid}>
        <Input
          label="Название"
          hint="Например, «Дом» или «Работа»"
          value={values.label}
          error={errors.label}
          onChange={(event) => set('label', event.target.value)}
        />
        <Input
          label="Город"
          autoComplete="address-level2"
          value={values.city}
          error={errors.city}
          onChange={(event) => set('city', event.target.value)}
        />
        <Input
          label="Улица, дом"
          autoComplete="address-line1"
          value={values.street}
          error={errors.street}
          onChange={(event) => set('street', event.target.value)}
        />
        <Input
          label="Квартира"
          autoComplete="address-line2"
          value={values.apartment}
          error={errors.apartment}
          onChange={(event) => set('apartment', event.target.value)}
        />
      </div>
      <Textarea
        label="Комментарий курьеру"
        value={values.comment}
        error={errors.comment}
        onChange={(event) => set('comment', event.target.value)}
      />
      <Checkbox
        label="Адрес по умолчанию"
        checked={values.isDefault}
        onChange={(event) => set('isDefault', event.target.checked)}
      />
      {save.isError && (
        <p role="alert" className={styles.error}>
          {save.error instanceof ApiError && save.error.code === 'CONFLICT'
            ? save.error.message
            : 'Не получилось сохранить адрес. Попробуйте ещё раз.'}
        </p>
      )}
      <div className={styles.actions}>
        <Button type="submit" size="lg" disabled={save.isPending}>
          {save.isPending ? 'Сохраняем…' : 'Сохранить'}
        </Button>
        <Button variant="outline" size="lg" onClick={onDone}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
