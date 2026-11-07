import type { Address, CheckoutQuote, DeliveryMethod, StoreInfo, User } from '@nisha/contracts';
import type { FormEvent, ReactNode } from 'react';

import { formatPrice } from '../../shared/lib/money';
import { plural } from '../../shared/lib/plural';
import { Button } from '../../shared/ui/Button/Button';
import { Checkbox } from '../../shared/ui/Checkbox/Checkbox';
import { Chip } from '../../shared/ui/Chip/Chip';
import { Input } from '../../shared/ui/Field/Input';
import { Textarea } from '../../shared/ui/Field/Textarea';
import type { IconName } from '../../shared/ui/Icon/Icon';
import { RadioCard } from '../../shared/ui/RadioCard/RadioCard';
import { NEW_ADDRESS } from './checkout-form';
import type { CheckoutDraft } from './checkout-form';
import styles from './Checkout.module.css';
import { PickupPointPicker } from './PickupPointPicker';

type CheckoutFormProps = {
  viewer: User | null;
  draft: CheckoutDraft;
  onChange: (next: CheckoutDraft) => void;
  errors: Record<string, string>;
  addresses: Address[];
  quote: CheckoutQuote | undefined;
  store: StoreInfo | undefined;
  submitting: boolean;
  /** Ошибка сервера над кнопкой: остатки, сеть. */
  submitError: ReactNode;
  onSubmit: () => void;
};

/** «1–5» → «1–5 дней»: форма слова — по последнему числу. */
function daysText(range: string): string {
  const last = Number(/(\d+)\D*$/.exec(range)?.[1] ?? 0);
  return `${range}\u00A0${plural(last, ['день', 'дня', 'дней'])}`;
}

const METHOD_ICONS: Record<DeliveryMethod, IconName> = {
  courier: 'truck',
  pickup_point: 'box',
  boutique: 'pin',
};

// Адрес, сохранённый при оформлении, назван по улице — не повторяем её дважды.
function addressTitle(address: Address): string {
  return address.label === address.street ? address.street : `${address.label} · ${address.street}`;
}

/** Форма оформления по checkout.html: контакты, доставка, адрес или пункт, оплата (D-030). */
export function CheckoutForm({
  viewer,
  draft,
  onChange,
  errors,
  addresses,
  quote,
  store,
  submitting,
  submitError,
  onSubmit,
}: CheckoutFormProps) {
  const setContact = (field: keyof CheckoutDraft['contact'], value: string) =>
    onChange({ ...draft, contact: { ...draft.contact, [field]: value } });
  const setAddress = (field: keyof CheckoutDraft['newAddress'], value: string) =>
    onChange({ ...draft, newAddress: { ...draft.newAddress, [field]: value } });
  const price = (method: DeliveryMethod) => {
    const option = quote?.options.find((item) => item.method === method);
    if (!option) return '…';
    return option.priceKopecks === 0 ? 'бесплатно' : formatPrice(option.priceKopecks);
  };

  const methods: Array<{ method: DeliveryMethod; title: string; description: string }> = [
    {
      method: 'courier',
      title: 'Курьером',
      description: store ? daysText(store.courierDays) : 'Срок уточняется',
    },
    {
      method: 'pickup_point',
      title: 'В\u00A0пункт выдачи',
      description: store ? daysText(store.pickupPointDays) : 'Срок уточняется',
    },
    {
      method: 'boutique',
      title: 'Самовывоз из\u00A0бутика',
      description: store
        ? `${store.boutiqueAddress} · можно попробовать на\u00A0месте`
        : 'Можно попробовать на\u00A0месте',
    },
  ];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <fieldset className={styles.section}>
        <legend className={styles.legend}>Контакты</legend>
        <div className={styles.grid}>
          <Input
            label="Имя и фамилия"
            autoComplete="name"
            value={draft.contact.name}
            error={errors['contact.name']}
            onChange={(event) => setContact('name', event.target.value)}
          />
          <Input
            label="Телефон"
            type="tel"
            autoComplete="tel"
            value={draft.contact.phone}
            error={errors['contact.phone']}
            onChange={(event) => setContact('phone', event.target.value)}
          />
          <Input
            label="Электронная почта"
            type="email"
            autoComplete="email"
            value={draft.contact.email}
            error={errors['contact.email']}
            hint={viewer ? undefined : 'Пришлём подтверждение и ссылку, чтобы задать пароль'}
            onChange={(event) => setContact('email', event.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={styles.legend}>Доставка</legend>
        <div className={styles.options}>
          {methods.map((item) => (
            <RadioCard
              key={item.method}
              name="delivery"
              icon={METHOD_ICONS[item.method]}
              checked={draft.method === item.method}
              onChange={() => onChange({ ...draft, method: item.method })}
              title={item.title}
              description={item.description}
              aside={price(item.method)}
            />
          ))}
        </div>
      </fieldset>

      {draft.method === 'courier' && (
        <fieldset className={styles.section}>
          <legend className={styles.legend}>Адрес</legend>
          {addresses.length > 0 && (
            <div className={styles.chips} role="group" aria-label="Сохранённые адреса">
              {addresses.map((address) => (
                <Chip
                  key={address.id}
                  pressed={draft.addressId === address.id}
                  onClick={() => onChange({ ...draft, addressId: address.id })}
                >
                  {addressTitle(address)}
                </Chip>
              ))}
              <Chip
                pressed={draft.addressId === NEW_ADDRESS}
                onClick={() => onChange({ ...draft, addressId: NEW_ADDRESS })}
              >
                +&nbsp;Новый адрес
              </Chip>
            </div>
          )}
          {draft.addressId === NEW_ADDRESS && (
            <div className={styles.grid}>
              <Input
                label="Город"
                autoComplete="address-level2"
                value={draft.newAddress.city}
                error={errors['address.city']}
                onChange={(event) => setAddress('city', event.target.value)}
              />
              <Input
                label="Улица, дом"
                autoComplete="address-line1"
                value={draft.newAddress.street}
                error={errors['address.street']}
                onChange={(event) => setAddress('street', event.target.value)}
              />
              <Input
                label="Квартира"
                autoComplete="address-line2"
                value={draft.newAddress.apartment}
                error={errors['address.apartment']}
                onChange={(event) => setAddress('apartment', event.target.value)}
              />
            </div>
          )}
          <Textarea
            label="Комментарий курьеру"
            value={draft.newAddress.comment}
            error={errors['address.comment']}
            onChange={(event) => setAddress('comment', event.target.value)}
          />
          {viewer && draft.addressId === NEW_ADDRESS && (
            <Checkbox
              label="Сохранить адрес для следующих заказов"
              checked={draft.saveAddress}
              onChange={(event) => onChange({ ...draft, saveAddress: event.target.checked })}
            />
          )}
        </fieldset>
      )}

      {draft.method === 'pickup_point' && (
        <fieldset className={styles.section}>
          <legend className={styles.legend}>Пункт выдачи</legend>
          <PickupPointPicker
            value={draft.pickupPointId}
            onChange={(id) => onChange({ ...draft, pickupPointId: id })}
            error={errors.pickupPoint}
          />
        </fieldset>
      )}

      {draft.method === 'boutique' && store && (
        <p className={styles.note}>
          Бутик: {store.boutiqueAddress}, {store.boutiqueHours}. Позвоним, когда заказ будет готов
          к&nbsp;выдаче.
        </p>
      )}

      <section className={styles.section} aria-labelledby="payment-title">
        <h2 id="payment-title" className={styles.legend}>
          Оплата
        </h2>
        <p className={styles.note}>
          Картой онлайн на&nbsp;следующем шаге. На&nbsp;оплату&nbsp;— 5&nbsp;минут: всё это время
          образцы закреплены за&nbsp;вами.
        </p>
      </section>

      {submitError}
      <div className={styles.submitRow}>
        <Button type="submit" size="xl" iconEnd="arrow-right" disabled={submitting}>
          {submitting ? 'Оформляем…' : 'Перейти к\u00A0оплате'}
        </Button>
        <p className={styles.terms}>
          Нажимая кнопку, вы&nbsp;соглашаетесь с&nbsp;условиями продажи.
        </p>
      </div>
    </form>
  );
}
