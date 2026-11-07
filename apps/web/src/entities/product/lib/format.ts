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

export const specimensCount = (count: number) =>
  `${count}${NBSP}${plural(count, ['образец', 'образца', 'образцов'])}`;

export const bottlesLeft = (count: number) =>
  `Осталось ${count}${NBSP}${plural(count, ['флакон', 'флакона', 'флаконов'])}`;

export const bottlesCount = (count: number) =>
  `${count}${NBSP}${plural(count, ['флакон', 'флакона', 'флаконов'])}`;
