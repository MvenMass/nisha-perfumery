import type { HeroSlide } from '@nisha/contracts';

import type { IconName } from '../../shared/ui/Icon/Icon';
import type { StrataLayer } from '../../shared/ui/StrataDivider/StrataDivider';

// Статичные тексты главной (home.html). Неразрывные пробелы расставлены вручную (CONVENTIONS.md).

/**
 * Запасной слайд первого экрана: если API не ответил или администратор скрыл все слайды,
 * главная всё равно начинается с фирменного сообщения. Сами слайды — в БД (этап 8).
 */
export const FALLBACK_SLIDE: HeroSlide = {
  id: 'fallback',
  label: 'Глубина 0\u00A0м · поверхность',
  title: 'Ароматы, высеченные из\u00A0камня',
  text: 'Запахи материалов: известняка после дождя, старого ореха, дымного базальта. Каждый аромат\u00A0— небольшая архитектура из\u00A0нот.',
  ctaLabel: 'Смотреть образцы',
  ctaHref: '/catalog',
  imageUrl: null,
  imageAlt:
    'Флакон из янтарного стекла на базальтовом постаменте, коряга тёмного ореха; снимок в полутьме',
};

export const STRATA: Record<
  'limestone' | 'basalt' | 'travertine',
  { depth: string; label: string; layers: StrataLayer[] }
> = {
  limestone: {
    depth: '−040 м',
    label: 'Известняк',
    layers: [
      { height: 1, color: 'lineStrong' },
      { height: 5, color: 'walnut' },
      { height: 2, color: 'stone' },
      { height: 8, color: 'basalt' },
    ],
  },
  basalt: {
    depth: '−120 м',
    label: 'Базальт',
    layers: [
      { height: 3, color: 'stone' },
      { height: 1, color: 'lineStrong' },
      { height: 7, color: 'basalt' },
      { height: 2, color: 'accent' },
    ],
  },
  travertine: {
    depth: '−180 м',
    label: 'Травертин',
    layers: [
      { height: 6, color: 'walnut' },
      { height: 1, color: 'stone' },
      { height: 3, color: 'copperDark' },
      { height: 1, color: 'lineStrong' },
    ],
  },
};

export const CATEGORY_TILES = [
  {
    slug: 'women',
    title: 'Женские ароматы',
    photo: '/images/category-women-960.jpg',
    photoAlt: 'Флакон в деревянном футляре на тёмной ткани',
    tone: 'walnut',
  },
  {
    slug: 'men',
    title: 'Мужские ароматы',
    photo: '/images/category-men-960.jpg',
    photoAlt: 'Стеклянный флакон на чёрном фоне',
    tone: 'basalt',
  },
  {
    slug: 'home',
    title: 'Для дома и\u00A0пространства',
    photo: '/images/category-home-960.jpg',
    photoAlt: 'Горящая свеча и каменная чаша на столе из травертина',
    tone: 'copperDark',
  },
] as const;

export type ProcessStep = { icon: IconName; title: string; text: string };

export const PROCESS_STEPS: ProcessStep[] = [
  {
    icon: 'step-material',
    title: 'Материал',
    text: 'Выбираем камень или дерево и\u00A0изучаем, чем он\u00A0пахнет сухим, мокрым, нагретым солнцем.',
  },
  {
    icon: 'step-sketch',
    title: 'Эскиз',
    text: 'Парфюмер переводит материал в\u00A0ноты и\u00A0собирает десятки пробных версий.',
  },
  {
    icon: 'step-aging',
    title: 'Выдержка',
    text: 'Композиция отдыхает в\u00A0темноте несколько недель, чтобы ноты срослись, как слои породы.',
  },
  {
    icon: 'step-glass',
    title: 'Стекло',
    text: 'Стеклодув вручную выдувает флакон из\u00A0янтарного стекла, и\u00A0двух одинаковых не\u00A0бывает.',
  },
  {
    icon: 'step-label',
    title: 'Этикетка и\u00A0упаковка',
    text: 'Каждый флакон получает номер образца и\u00A0упаковывается вручную.',
  },
];
