import type { Address } from '@nisha/contracts';
import { useState } from 'react';

import { useAddresses } from '../../entities/address/queries';
import { AddressForm } from '../../features/addresses/AddressForm';
import { useDeleteAddress, useSaveAddress } from '../../features/addresses/mutations';
import { useMeta } from '../../shared/lib/useMeta';
import { Badge } from '../../shared/ui/Badge/Badge';
import { Button } from '../../shared/ui/Button/Button';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import styles from './AccountPage.module.css';
import ordersStyles from './Orders.module.css';

const fullAddress = (address: Address) =>
  `${address.city}, ${address.street}${address.apartment ? `, кв.\u00A0${address.apartment}` : ''}`;

function AddressCard({ address, onEdit }: { address: Address; onEdit: () => void }) {
  const remove = useDeleteAddress();
  const save = useSaveAddress();
  const makeDefault = () =>
    save.mutate({
      id: address.id,
      input: {
        label: address.label,
        city: address.city,
        street: address.street,
        apartment: address.apartment,
        comment: address.comment,
        isDefault: true,
      },
    });

  return (
    <article className={ordersStyles.card}>
      <div className={ordersStyles.cardHead}>
        <div className={ordersStyles.cardTitle}>
          <h2 className={ordersStyles.addressLabel}>{address.label}</h2>
          <span className={ordersStyles.meta}>{fullAddress(address)}</span>
          {address.comment && <span className={ordersStyles.meta}>{address.comment}</span>}
        </div>
        <div className={ordersStyles.cardAside}>
          {address.isDefault ? (
            <Badge tone="outline">По&nbsp;умолчанию</Badge>
          ) : (
            <Button variant="link" size="md" disabled={save.isPending} onClick={makeDefault}>
              Сделать основным
            </Button>
          )}
          <Button variant="outline" size="md" onClick={onEdit}>
            Изменить
          </Button>
          <Button
            variant="outline"
            size="md"
            disabled={remove.isPending}
            aria-label={`Удалить адрес «${address.label}»`}
            onClick={() => remove.mutate(address.id)}
          >
            Удалить
          </Button>
        </div>
      </div>
      {(remove.isError || save.isError) && (
        <p role="alert" className={ordersStyles.cardError}>
          Не получилось изменить адрес. Попробуйте ещё раз.
        </p>
      )}
    </article>
  );
}

/** Сохранённые адреса: из них выбирают при оформлении курьерской доставки. */
export function AddressesSection() {
  useMeta('Адреса');
  const addresses = useAddresses(true);
  // null — форма закрыта, 'new' — новый адрес, иначе id редактируемого.
  const [editing, setEditing] = useState<string | null>(null);
  const editedAddress = addresses.data?.items.find((item) => item.id === editing) ?? null;

  let content;
  if (addresses.isPending) {
    content = <Skeleton height={160} />;
  } else if (addresses.isError) {
    content = (
      <EmptyState
        icon="alert"
        title="Не удалось загрузить адреса"
        action={
          <Button variant="outline" size="md" onClick={() => void addresses.refetch()}>
            Повторить
          </Button>
        }
      />
    );
  } else if (editing !== null) {
    content = <AddressForm address={editedAddress} onDone={() => setEditing(null)} />;
  } else if (addresses.data.items.length === 0) {
    content = (
      <EmptyState
        icon="pin"
        title="Сохранённых адресов нет"
        description="Добавьте адрес здесь или отметьте «Сохранить» при оформлении заказа."
        action={
          <Button size="md" onClick={() => setEditing('new')}>
            Добавить адрес
          </Button>
        }
      />
    );
  } else {
    content = (
      <>
        <div className={ordersStyles.list}>
          {addresses.data.items.map((address) => (
            <AddressCard key={address.id} address={address} onEdit={() => setEditing(address.id)} />
          ))}
        </div>
        <div>
          <Button size="md" onClick={() => setEditing('new')}>
            Добавить адрес
          </Button>
        </div>
      </>
    );
  }

  return (
    <section aria-labelledby="addresses-title" className={styles.section}>
      <h1 id="addresses-title" className={styles.title}>
        Адреса
      </h1>
      {content}
    </section>
  );
}
