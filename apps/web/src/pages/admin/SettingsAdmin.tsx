import { storeSettingsInputSchema } from '@nisha/contracts';
import type { StoreSettingsInput } from '@nisha/contracts';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { rublesToKopecks } from '../../features/admin/product-form';
import { useSaveSettings, useStoreSettings } from '../../features/admin/content-api';
import { ApiError } from '../../shared/api/http';
import { fieldErrors } from '../../shared/lib/form';
import { useMeta } from '../../shared/lib/useMeta';
import { Button } from '../../shared/ui/Button/Button';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { Input } from '../../shared/ui/Field/Input';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import styles from './Admin.module.css';

type Draft = Record<keyof StoreSettingsInput, string>;

const MONEY = [
  'freeDeliveryThresholdKopecks',
  'courierPriceKopecks',
  'pickupPointPriceKopecks',
] as const;

const toDraft = (settings: StoreSettingsInput): Draft => ({
  freeDeliveryThresholdKopecks: String(settings.freeDeliveryThresholdKopecks / 100),
  courierPriceKopecks: String(settings.courierPriceKopecks / 100),
  pickupPointPriceKopecks: String(settings.pickupPointPriceKopecks / 100),
  courierDays: settings.courierDays,
  pickupPointDays: settings.pickupPointDays,
  lowStockThreshold: String(settings.lowStockThreshold),
  boutiqueAddress: settings.boutiqueAddress,
  boutiqueHours: settings.boutiqueHours,
});

function SettingsForm({ settings }: { settings: StoreSettingsInput }) {
  const [draft, setDraft] = useState(() => toDraft(settings));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useSaveSettings();
  const field = (key: keyof Draft, label: string, hint?: string) => (
    <Input
      label={label}
      hint={hint}
      value={draft[key]}
      error={errors[key]}
      inputMode={MONEY.includes(key as (typeof MONEY)[number]) ? 'decimal' : undefined}
      onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
    />
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = storeSettingsInputSchema.safeParse({
      ...draft,
      freeDeliveryThresholdKopecks: rublesToKopecks(draft.freeDeliveryThresholdKopecks),
      courierPriceKopecks: rublesToKopecks(draft.courierPriceKopecks),
      pickupPointPriceKopecks: rublesToKopecks(draft.pickupPointPriceKopecks),
      lowStockThreshold: Number(draft.lowStockThreshold),
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  };

  return (
    <form className={styles.main} onSubmit={submit} noValidate>
      <fieldset className={styles.panel}>
        <legend className={styles.panelTitle}>Доставка</legend>
        <div className={styles.grid}>
          {field('courierPriceKopecks', 'Курьер, ₽')}
          {field('courierDays', 'Срок курьера, дней', 'Например, 1–5')}
          {field('pickupPointPriceKopecks', 'Пункт выдачи, ₽')}
          {field('pickupPointDays', 'Срок до пункта, дней', 'Например, 2–6')}
          {field('freeDeliveryThresholdKopecks', 'Бесплатно от, ₽')}
        </div>
      </fieldset>
      <fieldset className={styles.panel}>
        <legend className={styles.panelTitle}>Бутик и витрина</legend>
        <div className={styles.grid}>
          {field('boutiqueAddress', 'Адрес бутика')}
          {field('boutiqueHours', 'Часы работы')}
          {field('lowStockThreshold', '«Осталось N» при остатке до', 'Число флаконов')}
        </div>
      </fieldset>
      {save.isError && (
        <p role="alert" className={styles.error}>
          {save.error instanceof ApiError ? save.error.message : 'Не получилось сохранить'}
        </p>
      )}
      {save.isSuccess && (
        <p role="status" className={styles.ok}>
          Сохранено — витрина уже считает доставку по-новому.
        </p>
      )}
      <div>
        <Button type="submit" size="lg" disabled={save.isPending}>
          Сохранить
        </Button>
      </div>
    </form>
  );
}

export function SettingsAdmin() {
  useMeta('Настройки — админка');
  const settings = useStoreSettings();
  return (
    <section aria-labelledby="admin-settings-title" className={styles.main}>
      <h1 id="admin-settings-title" className={styles.title}>
        Настройки магазина
      </h1>
      {settings.isPending ? (
        <Skeleton height={360} />
      ) : settings.isError ? (
        <EmptyState icon="alert" title="Не удалось загрузить настройки" />
      ) : (
        <SettingsForm settings={settings.data} />
      )}
    </section>
  );
}
