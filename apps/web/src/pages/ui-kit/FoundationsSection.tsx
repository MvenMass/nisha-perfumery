import { iconNames, Icon } from '../../shared/ui/Icon/Icon';
import { Demo, kitStyles as styles, Section } from './Section';

const COLORS = [
  ['--color-bg', 'фон'],
  ['--color-surface', 'поверхность'],
  ['--color-basalt', 'базальт'],
  ['--color-walnut', 'орех'],
  ['--color-copper-dark', 'тёмная медь'],
  ['--color-stone', 'серый камень'],
  ['--color-selected', 'выбранное'],
  ['--color-accent', 'жжёный оранжевый'],
  ['--color-copper', 'медь'],
  ['--color-text', 'основной текст'],
  ['--color-text-muted', 'вторичный текст'],
  ['--color-text-on-walnut', 'текст на орехе'],
  ['--color-travertine', 'травертин (декор)'],
  ['--color-line', 'линия'],
  ['--color-line-strong', 'линия сильная'],
] as const;

export function FoundationsSection() {
  return (
    <Section id="foundations" title="Основа">
      <Demo title="Цвета">
        <div className={styles.swatches}>
          {COLORS.map(([token, name]) => (
            <div key={token} className={styles.swatch}>
              <span className={styles.swatchColor} style={{ background: `var(${token})` }} />
              <span>{name}</span>
              <span>{token}</span>
            </div>
          ))}
        </div>
      </Demo>

      <Demo title="Шрифты">
        <p className={styles.serif}>Cormorant Garamond — Образцы породы</p>
        <p className={styles.serifItalic}>Камень помнит всё, что с&nbsp;ним случилось</p>
        <p>
          Manrope — запахи материалов: известняка после дождя, старого ореха. Цена 4&nbsp;500&nbsp;₽
        </p>
        <p className={styles.mono}>IBM Plex Mono — ОБРАЗЕЦ №&nbsp;03 · −040&nbsp;м · 50&nbsp;мл</p>
      </Demo>

      <Demo title="Крупный заголовок (clamp 42 → 88 px)">
        <p className={styles.display}>Ароматы, высеченные из&nbsp;камня</p>
      </Demo>

      <Demo title={`Иконки (${iconNames.length})`}>
        <ul className={styles.row} aria-label="Иконки">
          {iconNames.map((name) => (
            <li key={name} title={name} className={styles.swatch}>
              <Icon name={name} size={28} />
              <span>{name}</span>
            </li>
          ))}
        </ul>
      </Demo>
    </Section>
  );
}
