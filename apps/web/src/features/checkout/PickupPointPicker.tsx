import { useState } from 'react';

import { cx } from '../../shared/lib/cx';
import { Chip } from '../../shared/ui/Chip/Chip';
import { RadioCard } from '../../shared/ui/RadioCard/RadioCard';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import { usePickupPoints } from './api';
import styles from './Checkout.module.css';

type PickupPointPickerProps = {
  value: string | null;
  onChange: (id: string) => void;
  error?: string | undefined;
};

/**
 * Пункты выдачи СДЭК (D-031): список и схематичная карта-заглушка. Карта дублирует список
 * для мыши; для клавиатуры и скринридера выбор — в списке радиокнопок.
 */
export function PickupPointPicker({ value, onChange, error }: PickupPointPickerProps) {
  const [city, setCity] = useState<string>();
  const all = usePickupPoints(undefined, true);
  const cities = all.data?.cities ?? [];
  const activeCity = city ?? cities[0];
  const points = (all.data?.points ?? []).filter((point) => point.city === activeCity);

  if (all.isPending) return <Skeleton height={240} />;
  if (all.isError) {
    return (
      <p role="alert" className={styles.error}>
        Не удалось загрузить пункты выдачи. Обновите страницу или выберите другой способ.
      </p>
    );
  }

  return (
    <div className={styles.pickup}>
      <div className={styles.chips} role="group" aria-label="Город">
        {cities.map((name) => (
          <Chip key={name} pressed={name === activeCity} onClick={() => setCity(name)}>
            {name}
          </Chip>
        ))}
      </div>

      <div className={styles.map} aria-hidden="true">
        {points.map((point) => (
          <button
            key={point.id}
            type="button"
            tabIndex={-1}
            className={cx(styles.mapPoint, point.id === value && styles.mapPointActive)}
            style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
            onClick={() => onChange(point.id)}
          >
            <span className={styles.mapDot} />
          </button>
        ))}
        <span className={styles.mapCaption}>{activeCity} · схема</span>
      </div>

      <fieldset className={styles.pointList} aria-describedby={error ? 'pickup-error' : undefined}>
        <legend className="visually-hidden">Пункт выдачи</legend>
        {points.map((point) => (
          <RadioCard
            key={point.id}
            name="pickup-point"
            checked={point.id === value}
            onChange={() => onChange(point.id)}
            title={point.name}
            description={`${point.address} · ${point.hours}`}
          />
        ))}
      </fieldset>
      {error && (
        <p id="pickup-error" role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
