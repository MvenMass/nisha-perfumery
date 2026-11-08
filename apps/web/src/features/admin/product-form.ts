import { adminProductInputSchema } from '@nisha/contracts';
import type { AdminProduct, AdminProductInput, Density } from '@nisha/contracts';

import { fieldErrors } from '../../shared/lib/form';

/** Объём в форме: числа — строками, как их ввёл администратор; цена — в рублях. */
export type VariantDraft = {
  id?: string | undefined;
  volumeMl: string;
  sku: string;
  priceRubles: string;
  stock: string;
  isActive: boolean;
};

export type ProductDraft = {
  slug: string;
  specimenNumber: string;
  name: string;
  materialId: string;
  /** '' — без коллекции. */
  collectionId: string;
  categoryIds: string[];
  origin: string;
  density: Density;
  concentration: string;
  longevityHours: string;
  description: string;
  story: string;
  topMinutes: string;
  heartMinutes: string;
  baseMinutes: string;
  /** Ноты слоя через запятую. */
  notes: { top: string; heart: string; base: string };
  variants: VariantDraft[];
  isBestseller: boolean;
  isNew: boolean;
  isFeatured: boolean;
  isPublished: boolean;
};

export const emptyVariant = (): VariantDraft => ({
  volumeMl: '',
  sku: '',
  priceRubles: '',
  stock: '0',
  isActive: true,
});

export function emptyDraft(materialId: string): ProductDraft {
  return {
    slug: '',
    specimenNumber: '',
    name: '',
    materialId,
    collectionId: '',
    categoryIds: [],
    origin: '',
    density: 'medium',
    concentration: 'парфюмерная вода',
    longevityHours: '',
    description: '',
    story: '',
    topMinutes: '15',
    heartMinutes: '180',
    baseMinutes: '480',
    notes: { top: '', heart: '', base: '' },
    variants: [emptyVariant()],
    isBestseller: false,
    isNew: true,
    isFeatured: false,
    // Новый образец сначала черновик: на витрину — отдельным решением.
    isPublished: false,
  };
}

const rublesText = (kopecks: number) =>
  kopecks % 100 === 0
    ? String(kopecks / 100)
    : `${Math.floor(kopecks / 100)},${String(kopecks % 100).padStart(2, '0')}`;

export function draftFromProduct(product: AdminProduct): ProductDraft {
  return {
    slug: product.slug,
    specimenNumber: String(product.specimenNumber),
    name: product.name,
    materialId: product.materialId,
    collectionId: product.collectionId ?? '',
    categoryIds: product.categoryIds,
    origin: product.origin,
    density: product.density,
    concentration: product.concentration,
    longevityHours: product.longevityHours === null ? '' : String(product.longevityHours),
    description: product.description,
    story: product.story ?? '',
    topMinutes: String(product.topMinutes),
    heartMinutes: String(product.heartMinutes),
    baseMinutes: String(product.baseMinutes),
    notes: {
      top: product.notes.top.join(', '),
      heart: product.notes.heart.join(', '),
      base: product.notes.base.join(', '),
    },
    variants: product.variants.map((variant) => ({
      id: variant.id,
      volumeMl: String(variant.volumeMl),
      sku: variant.sku,
      priceRubles: rublesText(variant.priceKopecks),
      stock: String(variant.stock),
      isActive: variant.isActive,
    })),
    isBestseller: product.isBestseller,
    isNew: product.isNew,
    isFeatured: product.isFeatured,
    isPublished: product.isPublished,
  };
}

/** Целое число из поля; пустое и нечисловое — NaN, его отклонит схема с понятной ошибкой. */
const integer = (value: string) => (/^\s*\d+\s*$/.test(value) ? Number(value) : Number.NaN);

/**
 * «4 500» или «4500,50» → копейки целым числом (D-003). Считаем строками, без float:
 * 4500,5 → 450050, а не 450049,99999.
 */
export function rublesToKopecks(value: string): number {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.replace(/[\s\u00A0]/g, ''));
  if (!match) return Number.NaN;
  const [, rubles = '', kopecks = ''] = match;
  return Number(rubles) * 100 + Number(kopecks.padEnd(2, '0'));
}

const splitNotes = (value: string) =>
  value
    .split(',')
    .map((note) => note.trim())
    .filter((note) => note !== '');

export type ProductValidation =
  { ok: true; input: AdminProductInput } | { ok: false; errors: Record<string, string> };

/** Проверка той же схемой, что на сервере (CONVENTIONS.md, правило 8). */
export function validateProduct(draft: ProductDraft): ProductValidation {
  const parsed = adminProductInputSchema.safeParse({
    slug: draft.slug.trim(),
    specimenNumber: integer(draft.specimenNumber),
    name: draft.name,
    materialId: draft.materialId,
    collectionId: draft.collectionId || null,
    categoryIds: draft.categoryIds,
    origin: draft.origin,
    density: draft.density,
    concentration: draft.concentration,
    longevityHours: draft.longevityHours.trim() === '' ? null : integer(draft.longevityHours),
    description: draft.description,
    story: draft.story,
    topMinutes: integer(draft.topMinutes),
    heartMinutes: integer(draft.heartMinutes),
    baseMinutes: integer(draft.baseMinutes),
    notes: {
      top: splitNotes(draft.notes.top),
      heart: splitNotes(draft.notes.heart),
      base: splitNotes(draft.notes.base),
    },
    variants: draft.variants.map((variant) => ({
      ...(variant.id ? { id: variant.id } : {}),
      volumeMl: integer(variant.volumeMl),
      sku: variant.sku,
      priceKopecks: rublesToKopecks(variant.priceRubles),
      stock: integer(variant.stock),
      isActive: variant.isActive,
    })),
    isBestseller: draft.isBestseller,
    isNew: draft.isNew,
    isFeatured: draft.isFeatured,
    isPublished: draft.isPublished,
  });
  return parsed.success
    ? { ok: true, input: parsed.data }
    : { ok: false, errors: fieldErrors(parsed.error) };
}
