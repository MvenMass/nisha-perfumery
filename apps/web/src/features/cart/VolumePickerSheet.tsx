import type { ProductVariant } from '@nisha/contracts';
import { useState } from 'react';

import { useProduct } from '../../entities/product/api/queries';
import { bottlesLeft, formatVolume } from '../../entities/product/lib/format';
import { formatPrice } from '../../shared/lib/money';
import { Button, ButtonLink } from '../../shared/ui/Button/Button';
import { RadioCard } from '../../shared/ui/RadioCard/RadioCard';
import { Sheet } from '../../shared/ui/Sheet/Sheet';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import { cartErrorText, useChangeCart } from './mutations';
import styles from './VolumePickerSheet.module.css';

type VolumePickerSheetProps = {
  slug: string;
  name: string;
  open: boolean;
  onClose: () => void;
};

const firstAvailable = (variants: ProductVariant[]) =>
  variants.find((variant) => variant.stock > 0)?.id;

/**
 * «+» в карточке открывает выбор объёма, а не кладёт товар сразу (D-025): у объёмов разные
 * цены, и покупатель должен видеть, что именно добавляет.
 */
export function VolumePickerSheet({ slug, name, open, onClose }: VolumePickerSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Объём"
      closeLabel="Закрыть выбор объёма"
      side="right"
    >
      {/* Содержимое монтируется заново при каждом открытии: выбор и «Добавлено» не переживают закрытие. */}
      {open && <Picker slug={slug} name={name} onClose={onClose} />}
    </Sheet>
  );
}

function Picker({ slug, name, onClose }: { slug: string; name: string; onClose: () => void }) {
  const product = useProduct(slug);
  const change = useChangeCart();
  const [chosenId, setChosenId] = useState<string>();

  if (product.isPending) {
    return (
      <div className={styles.body} aria-busy="true">
        <Skeleton height={64} />
        <Skeleton height={64} />
        <Skeleton height={64} />
      </div>
    );
  }
  if (product.isError) {
    return (
      <div className={styles.body}>
        <p role="alert" className={styles.error}>
          Не удалось загрузить объёмы. Попробуйте ещё раз.
        </p>
        <Button variant="outline" onClick={() => void product.refetch()}>
          Повторить
        </Button>
      </div>
    );
  }

  const { variants } = product.data;
  const selectedId = chosenId ?? firstAvailable(variants);
  const selected = variants.find((variant) => variant.id === selectedId);

  if (change.isSuccess) {
    return (
      <div className={styles.body}>
        <p role="status" className={styles.done}>
          {name}, {selected ? formatVolume(selected.volumeMl) : ''}&nbsp;— в&nbsp;корзине.
        </p>
        <ButtonLink to="/cart" size="lg" fullWidth onClick={onClose}>
          Перейти в&nbsp;корзину
        </ButtonLink>
        <Button variant="outline" size="lg" fullWidth onClick={onClose}>
          Продолжить покупки
        </Button>
      </div>
    );
  }

  return (
    <form
      className={styles.body}
      onSubmit={(event) => {
        event.preventDefault();
        if (selected) {
          change.mutate({
            type: 'add',
            variantId: selected.id,
            quantity: 1,
            stock: selected.stock,
          });
        }
      }}
    >
      <fieldset className={styles.options}>
        <legend className={styles.legend}>{name}</legend>
        {variants.map((variant) => (
          <RadioCard
            key={variant.id}
            name={`volume-${slug}`}
            checked={variant.id === selectedId}
            disabled={variant.stock === 0}
            onChange={() => setChosenId(variant.id)}
            title={formatVolume(variant.volumeMl)}
            description={
              variant.stock === 0
                ? 'Нет в\u00A0наличии'
                : variant.isLowStock
                  ? bottlesLeft(variant.stock)
                  : undefined
            }
            aside={formatPrice(variant.priceKopecks)}
          />
        ))}
      </fieldset>
      {change.isError && (
        <p role="alert" className={styles.error}>
          {cartErrorText(change.error)}
        </p>
      )}
      <Button type="submit" size="lg" fullWidth disabled={!selected || change.isPending}>
        {change.isPending ? 'Добавляем…' : 'В корзину'}
      </Button>
    </form>
  );
}
