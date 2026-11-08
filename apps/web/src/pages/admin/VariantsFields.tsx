import { emptyVariant } from '../../features/admin/product-form';
import type { VariantDraft } from '../../features/admin/product-form';
import { Button } from '../../shared/ui/Button/Button';
import { Checkbox } from '../../shared/ui/Checkbox/Checkbox';
import { Input } from '../../shared/ui/Field/Input';
import styles from './Admin.module.css';

type VariantsFieldsProps = {
  variants: VariantDraft[];
  onChange: (variants: VariantDraft[]) => void;
  errors: Record<string, string>;
};

/**
 * Объёмы образца. Сохранённый объём не удаляется, а отключается: на него ссылаются заказы
 * и корзины. Новый, ещё не сохранённый, можно просто убрать из формы.
 */
export function VariantsFields({ variants, onChange, errors }: VariantsFieldsProps) {
  const set = (index: number, patch: Partial<VariantDraft>) =>
    onChange(variants.map((variant, i) => (i === index ? { ...variant, ...patch } : variant)));

  return (
    <fieldset className={styles.panel}>
      <legend className={styles.panelTitle}>Объёмы</legend>
      {errors.variants && (
        <p role="alert" className={styles.error}>
          {errors.variants}
        </p>
      )}
      {variants.map((variant, index) => (
        <div key={variant.id ?? `new-${index}`} className={styles.grid}>
          <Input
            label="Объём, мл"
            inputMode="numeric"
            value={variant.volumeMl}
            error={errors[`variants.${index}.volumeMl`]}
            onChange={(event) => set(index, { volumeMl: event.target.value })}
          />
          <Input
            label="SKU"
            value={variant.sku}
            error={errors[`variants.${index}.sku`]}
            onChange={(event) => set(index, { sku: event.target.value })}
          />
          <Input
            label="Цена, ₽"
            inputMode="decimal"
            value={variant.priceRubles}
            error={errors[`variants.${index}.priceKopecks`] && 'Цена в рублях, больше нуля'}
            onChange={(event) => set(index, { priceRubles: event.target.value })}
          />
          <Input
            label="Остаток"
            inputMode="numeric"
            value={variant.stock}
            error={errors[`variants.${index}.stock`]}
            onChange={(event) => set(index, { stock: event.target.value })}
          />
          <div className={styles.actions}>
            <Checkbox
              label="Продаётся"
              checked={variant.isActive}
              onChange={(event) => set(index, { isActive: event.target.checked })}
            />
            {!variant.id && variants.length > 1 && (
              <Button
                variant="link"
                size="md"
                onClick={() => onChange(variants.filter((_, i) => i !== index))}
              >
                Убрать
              </Button>
            )}
          </div>
        </div>
      ))}
      <div>
        <Button variant="outline" size="md" onClick={() => onChange([...variants, emptyVariant()])}>
          Добавить объём
        </Button>
      </div>
    </fieldset>
  );
}
