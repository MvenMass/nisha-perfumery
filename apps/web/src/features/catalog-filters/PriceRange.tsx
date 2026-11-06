import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { Input } from '../../shared/ui/Field/Input';
import styles from './PriceRange.module.css';

type PriceRangeProps = {
  /** Границы каталога из /catalog/filters, в копейках. */
  bounds: { minKopecks: number; maxKopecks: number };
  /** Выбранный диапазон в рублях (D-046); undefined — граница не задана. */
  min: number | undefined;
  max: number | undefined;
  onChange: (min: number | undefined, max: number | undefined) => void;
};

const STEP = 100;
// Применяем ползунок не на каждый шаг, а когда пользователь остановился.
const COMMIT_DELAY_MS = 400;

export function PriceRange({ bounds, min, max, onChange }: PriceRangeProps) {
  const floor = Math.floor(bounds.minKopecks / 100 / STEP) * STEP;
  const ceil = Math.ceil(bounds.maxKopecks / 100 / STEP) * STEP;

  const [from, setFrom] = useState(min ?? floor);
  const [to, setTo] = useState(max ?? ceil);
  const [fromText, setFromText] = useState(min === undefined ? '' : String(min));
  const [toText, setToText] = useState(max === undefined ? '' : String(max));

  // Фильтр мог смениться снаружи (сброс, «назад» в истории) — подтягиваем поля прямо в рендере,
  // как советует документация React, а не эффектом: так нет лишнего кадра со старыми значениями.
  const [synced, setSynced] = useState({ min, max });
  if (synced.min !== min || synced.max !== max) {
    setSynced({ min, max });
    setFrom(min ?? floor);
    setTo(max ?? ceil);
    setFromText(min === undefined ? '' : String(min));
    setToText(max === undefined ? '' : String(max));
  }

  const commit = (nextFrom: number, nextTo: number) => {
    const low = Math.min(nextFrom, nextTo);
    const high = Math.max(nextFrom, nextTo);
    // Граница на краю диапазона — это «без ограничения», в URL её не пишем.
    const nextMin = low <= floor ? undefined : low;
    const nextMax = high >= ceil ? undefined : high;
    if (nextMin !== min || nextMax !== max) onChange(nextMin, nextMax);
  };

  useEffect(() => {
    if (from === (min ?? floor) && to === (max ?? ceil)) return undefined;
    const timer = window.setTimeout(() => commit(from, to), COMMIT_DELAY_MS);
    return () => window.clearTimeout(timer);
    // commit намеренно не в зависимостях: он пересоздаётся на каждый рендер.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const commitText = () => {
    const parse = (text: string, fallback: number) => {
      const value = Number(text.replace(/\s/g, ''));
      return text.trim() === '' || !Number.isFinite(value) ? fallback : Math.round(value);
    };
    commit(parse(fromText, floor), parse(toText, ceil));
  };

  const onEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') commitText();
  };

  const percent = (value: number) => ((value - floor) / Math.max(ceil - floor, 1)) * 100;

  return (
    <div className={styles.range}>
      <div className={styles.slider}>
        <span aria-hidden="true" className={styles.track} />
        <span
          aria-hidden="true"
          className={styles.fill}
          style={{
            left: `${percent(Math.min(from, to))}%`,
            right: `${100 - percent(Math.max(from, to))}%`,
          }}
        />
        <input
          type="range"
          aria-label="Цена от, ₽"
          className={styles.thumbInput}
          min={floor}
          max={ceil}
          step={STEP}
          value={from}
          onChange={(event) => setFrom(Number(event.target.value))}
        />
        <input
          type="range"
          aria-label="Цена до, ₽"
          className={styles.thumbInput}
          min={floor}
          max={ceil}
          step={STEP}
          value={to}
          onChange={(event) => setTo(Number(event.target.value))}
        />
      </div>
      <div className={styles.fields}>
        <Input
          label="от"
          inputMode="numeric"
          placeholder={String(floor)}
          value={fromText}
          onChange={(event) => setFromText(event.target.value)}
          onBlur={commitText}
          onKeyDown={onEnter}
        />
        <Input
          label="до"
          inputMode="numeric"
          placeholder={String(ceil)}
          value={toText}
          onChange={(event) => setToText(event.target.value)}
          onBlur={commitText}
          onKeyDown={onEnter}
        />
      </div>
    </div>
  );
}
