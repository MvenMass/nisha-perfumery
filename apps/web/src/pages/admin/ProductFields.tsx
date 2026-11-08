import { densitySchema } from '@nisha/contracts';
import type { DictionariesResponse } from '@nisha/contracts';

import { DENSITY_LABELS } from '../../entities/product/lib/format';
import type { ProductDraft } from '../../features/admin/product-form';
import { Checkbox } from '../../shared/ui/Checkbox/Checkbox';
import { Input } from '../../shared/ui/Field/Input';
import { Select } from '../../shared/ui/Field/Select';
import { Textarea } from '../../shared/ui/Field/Textarea';
import styles from './Admin.module.css';

type ProductFieldsProps = {
  draft: ProductDraft;
  onChange: (patch: Partial<ProductDraft>) => void;
  errors: Record<string, string>;
  dictionaries: DictionariesResponse;
  noteNames: string[];
};

const LAYERS = [
  { key: 'top', label: 'Верхние ноты', minutes: 'topMinutes' },
  { key: 'heart', label: 'Ноты сердца', minutes: 'heartMinutes' },
  { key: 'base', label: 'Базовые ноты', minutes: 'baseMinutes' },
] as const;

/** Поля образца: этикетка, описание, пирамида нот, категории и флаги. */
export function ProductFields({
  draft,
  onChange,
  errors,
  dictionaries,
  noteNames,
}: ProductFieldsProps) {
  const text = (key: keyof ProductDraft) => (event: { target: { value: string } }) =>
    onChange({ [key]: event.target.value });

  return (
    <>
      <fieldset className={styles.panel}>
        <legend className={styles.panelTitle}>Этикетка образца</legend>
        <div className={styles.grid}>
          <Input label="Название" value={draft.name} error={errors.name} onChange={text('name')} />
          <Input
            label="Номер образца"
            inputMode="numeric"
            value={draft.specimenNumber}
            error={errors.specimenNumber}
            onChange={text('specimenNumber')}
          />
          <Input
            label="Адрес страницы"
            hint="Латиница и дефисы: /catalog/адрес"
            value={draft.slug}
            error={errors.slug}
            onChange={text('slug')}
          />
          <Select
            label="Материал"
            value={draft.materialId}
            error={errors.materialId}
            onChange={text('materialId')}
          >
            {dictionaries.materials.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select label="Коллекция" value={draft.collectionId} onChange={text('collectionId')}>
            <option value="">Без коллекции</option>
            {dictionaries.collections.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Input
            label="Происхождение"
            value={draft.origin}
            error={errors.origin}
            onChange={text('origin')}
          />
          <Select
            label="Плотность"
            value={draft.density}
            onChange={(event) => {
              const parsed = densitySchema.safeParse(event.target.value);
              if (parsed.success) onChange({ density: parsed.data });
            }}
          >
            {densitySchema.options.map((option) => (
              <option key={option} value={option}>
                {DENSITY_LABELS[option]}
              </option>
            ))}
          </Select>
          <Input
            label="Концентрация"
            value={draft.concentration}
            error={errors.concentration}
            onChange={text('concentration')}
          />
          <Input
            label="Стойкость, часов"
            inputMode="numeric"
            value={draft.longevityHours}
            error={errors.longevityHours}
            onChange={text('longevityHours')}
          />
        </div>
        <Textarea
          label="Описание"
          rows={4}
          value={draft.description}
          error={errors.description}
          onChange={text('description')}
        />
        <Textarea label="История образца" rows={4} value={draft.story} onChange={text('story')} />
      </fieldset>

      <fieldset className={styles.panel}>
        <legend className={styles.panelTitle}>Пирамида нот</legend>
        <p className={styles.muted}>
          Ноты через запятую. Минуты — когда слой затихает: верх раньше сердца, сердце раньше базы.
        </p>
        {LAYERS.map((layer) => (
          <div key={layer.key} className={styles.grid}>
            <Input
              label={layer.label}
              list="note-names"
              value={draft.notes[layer.key]}
              error={
                errors[`notes.${layer.key}`] ?? (layer.key === 'base' ? errors.notes : undefined)
              }
              onChange={(event) =>
                onChange({ notes: { ...draft.notes, [layer.key]: event.target.value } })
              }
            />
            <Input
              label="Затихает через, мин"
              inputMode="numeric"
              value={draft[layer.minutes]}
              error={errors[layer.minutes]}
              onChange={text(layer.minutes)}
            />
          </div>
        ))}
        <datalist id="note-names">
          {noteNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </fieldset>

      <fieldset className={styles.panel}>
        <legend className={styles.panelTitle}>Категории и витрина</legend>
        <div className={styles.actions}>
          {dictionaries.categories.map((category) => (
            <Checkbox
              key={category.id}
              label={category.name}
              checked={draft.categoryIds.includes(category.id)}
              onChange={(event) =>
                onChange({
                  categoryIds: event.target.checked
                    ? [...draft.categoryIds, category.id]
                    : draft.categoryIds.filter((id) => id !== category.id),
                })
              }
            />
          ))}
        </div>
        <div className={styles.actions}>
          <Checkbox
            label="Бестселлер"
            checked={draft.isBestseller}
            onChange={(event) => onChange({ isBestseller: event.target.checked })}
          />
          <Checkbox
            label="Новый образец"
            checked={draft.isNew}
            onChange={(event) => onChange({ isNew: event.target.checked })}
          />
          <Checkbox
            label="Срез на главной"
            checked={draft.isFeatured}
            onChange={(event) => onChange({ isFeatured: event.target.checked })}
          />
          <Checkbox
            label="Опубликован на витрине"
            checked={draft.isPublished}
            onChange={(event) => onChange({ isPublished: event.target.checked })}
          />
        </div>
        {errors.isPublished && (
          <p role="alert" className={styles.error}>
            {errors.isPublished}
          </p>
        )}
      </fieldset>
    </>
  );
}
