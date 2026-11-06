import type { ProductDetail } from '@nisha/contracts';

import { NBSP } from '../../shared/lib/typograph';

/** «15 мин», «3 ч», «2,5 ч». */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}${NBSP}мин`;
  const hours = minutes / 60;
  const text = Number.isInteger(hours)
    ? String(hours)
    : (Math.round(hours * 10) / 10).toString().replace('.', ',');
  return `${text}${NBSP}ч`;
}

function splitDuration(minutes: number): { value: string; unit: string } {
  const [value = '', unit = ''] = formatDuration(minutes).split(NBSP);
  return { value, unit };
}

/** Подпись слоя на телефоне, как в home-mobile.html: «0–15 мин», «15 мин–3 ч», «3–8 ч+». */
export function formatLayerRange(from: number, to: number, open: boolean): string {
  const start = splitDuration(from);
  const end = splitDuration(to);
  // Ноль без единицы: «0–15 мин», а не «0 мин–15 мин».
  const sameUnit = from === 0 || start.unit === end.unit;
  const range = sameUnit
    ? `${start.value}–${end.value}${NBSP}${end.unit}`
    : `${formatDuration(from)}–${formatDuration(to)}`;
  return open ? `${range}+` : range;
}

export type PyramidLayer = {
  level: 'top' | 'heart' | 'base';
  label: string;
  shortLabel: string;
  notes: string[];
  /** Начало и конец звучания слоя, мин. */
  from: number;
  to: number;
  /** Условная толщина слоя на десктопе, px. */
  thickness: number;
};

const MIN_THICKNESS = 72;
// Степень меньше 1 сжимает шкалу: верх в 15 минут и база в 5 часов обе остаются читаемыми.
const EXPONENT = 0.4;
const SCALE = 17;

export function layerThickness(durationMinutes: number): number {
  return Math.round(MIN_THICKNESS + SCALE * Math.max(durationMinutes, 1) ** EXPONENT - SCALE);
}

/**
 * layers из API — время, когда слой затихает (верх → 15 мин, сердце → 3 ч, база → 8 ч),
 * как на шкале в product.html. Толщина зависит от того, сколько звучит именно этот слой.
 */
export function buildPyramid(
  notes: ProductDetail['notes'],
  layers: ProductDetail['layers'],
): PyramidLayer[] {
  const ends = [layers.topMinutes, layers.heartMinutes, layers.baseMinutes];
  const meta = [
    { level: 'top', label: 'Верхние ноты', shortLabel: 'Верх' },
    { level: 'heart', label: 'Сердце', shortLabel: 'Сердце' },
    { level: 'base', label: 'База', shortLabel: 'База' },
  ] as const;
  return meta.map((item, index) => {
    const from = index === 0 ? 0 : (ends[index - 1] ?? 0);
    const to = ends[index] ?? from;
    return { ...item, notes: notes[item.level], from, to, thickness: layerThickness(to - from) };
  });
}

/** Текстовая альтернатива для скринридера: пирамида нарисована, а не написана. */
export function pyramidDescription(name: string, pyramid: PyramidLayer[]): string {
  const parts = pyramid
    .filter((layer) => layer.notes.length > 0)
    .map((layer) => `${layer.label.toLowerCase()} — ${layer.notes.join(', ')}`);
  return `Пирамида нот аромата ${name}: ${parts.join('; ')}`;
}
