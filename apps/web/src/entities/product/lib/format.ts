import type { Density } from '@nisha/contracts';

import { plural } from '../../../shared/lib/plural';
import { NBSP } from '../../../shared/lib/typograph';

export const DENSITY_LABELS: Record<Density, string> = {
  light: 'лёгкая',
  medium: 'средняя',
  high: 'высокая',
};

/** Полоски у плотности в фильтре: одна, две или три — как в catalog.html. */
export const DENSITY_BARS: Record<Density, number> = { light: 1, medium: 2, high: 3 };

export const productHref = (slug: string) => `/catalog/${slug}`;

/** «3» → «03»: на этикетках номер образца всегда двузначный. */
export const formatSpecimenNumber = (value: number) => String(value).padStart(2, '0');

export const formatVolume = (volumeMl: number) => `${volumeMl}${NBSP}мл`;

/**
 * Строка под названием аромата: по ней сразу понятно, что это парфюм, а не камень (D-077).
 * «парфюмерная вода» + объёмы → «Парфюмерная вода · 30 / 50 / 100 мл»;
 * у наборов объём уже в концентрации: «набор: 5 × 10 мл» → «Набор · 5 × 10 мл».
 */
export function productTypeLine(concentration: string, volumesMl: readonly number[]): string {
  const set = /^набор:\s*(.+)$/i.exec(concentration);
  if (set) return `Набор · ${set[1] ?? ''}`;
  const type = concentration.charAt(0).toUpperCase() + concentration.slice(1);
  if (volumesMl.length === 0) return type;
  const volumes = [...volumesMl].sort((a, b) => a - b).join(' / ');
  return `${type} · ${volumes}${NBSP}мл`;
}

export const specimensCount = (count: number) =>
  `${count}${NBSP}${plural(count, ['образец', 'образца', 'образцов'])}`;

export const bottlesLeft = (count: number) =>
  `Осталось ${count}${NBSP}${plural(count, ['флакон', 'флакона', 'флаконов'])}`;

export const bottlesCount = (count: number) =>
  `${count}${NBSP}${plural(count, ['флакон', 'флакона', 'флаконов'])}`;
