import { cx } from '../../lib/cx';
import styles from './StrataDivider.module.css';

export type StrataColor = 'lineStrong' | 'walnut' | 'stone' | 'basalt' | 'accent' | 'copperDark';

export type StrataLayer = {
  /** Толщина слоя в px — в макетах от 1 до 8. */
  height: number;
  color: StrataColor;
};

type StrataDividerProps = {
  /** Глубина слева: «−040 м». */
  depth: string;
  /** Порода справа: «Известняк». На телефоне скрыта. */
  label?: string | undefined;
  layers: readonly StrataLayer[];
  className?: string | undefined;
};

// Фирменный разделитель секций: срез породы со шкалой глубины. Чистый декор — скрыт от скринридера.
export function StrataDivider({ depth, label, layers, className }: StrataDividerProps) {
  return (
    <div aria-hidden="true" className={cx(styles.divider, className)}>
      <span>{depth}</span>
      <div className={styles.layers}>
        {layers.map((layer, index) => (
          <span
            // Слои — статичный рисунок, порядок не меняется.
            key={index}
            className={cx(styles.layer, styles[layer.color])}
            style={{ height: layer.height }}
          />
        ))}
      </div>
      {label && <span className={styles.label}>{label.toUpperCase()}</span>}
    </div>
  );
}
