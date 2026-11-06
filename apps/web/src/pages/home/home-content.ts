import type { IconName } from '../../shared/ui/Icon/Icon';
import type { StrataLayer } from '../../shared/ui/StrataDivider/StrataDivider';

// Статичные тексты главной (home.html). Неразрывные пробелы расставлены вручную (CONVENTIONS.md).
// Слайды первого экрана переедут в БД и админку в этапе 8.

export type HeroSlide = {
  label: string;
  title: string;
  text: string;
  cta: { label: string; to: string };
  photoAlt: string;
};

export const HERO_SLIDES: HeroSlide[] = [
  {
    label: 'Глубина 0\u00A0м · поверхность',
    title: 'Ароматы, высеченные из\u00A0камня',
    text: 'Запахи материалов: известняка после дождя, старого ореха, дымного базальта. Каждый аромат\u00A0— небольшая архитектура из\u00A0нот.',
    cta: { label: 'Смотреть образцы', to: '/catalog' },
    photoAlt:
      'Флакон из янтарного стекла на базальтовом постаменте, коряга тёмного ореха; снимок в полутьме',
  },
  {
    label: 'Глубина −120\u00A0м · базальт',
    title: 'Камень, который помнит огонь',
    text: 'Базальт\u00A0— дымный и\u00A0сухой, с\u00A0перечной искрой сверху и\u00A0смолистой глубиной. Самый тёмный образец коллекции.',
    cta: { label: 'Открыть образец', to: '/catalog/basalt' },
    photoAlt: 'Чёрный флакон на срезе базальта в боковом оранжевом свете',
  },
  {
    label: 'Глубина −180\u00A0м · травертин',
    title: 'Найдём вашу породу',
    text: 'Три вопроса о\u00A0настроении и\u00A0характере\u00A0— и\u00A0мы покажем образцы, которые подойдут именно вам.',
    cta: { label: 'Подобрать аромат', to: '/fragrance-finder' },
    photoAlt: 'Флаконы коллекции на ореховой полке, тёплый свет из глубины бутика',
  },
];

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
    photoAlt: 'Флакон на коряге ореха',
    tone: 'walnut',
  },
  {
    slug: 'men',
    title: 'Мужские ароматы',
    photoAlt: 'Чёрный флакон на базальте',
    tone: 'basalt',
  },
  {
    slug: 'home',
    title: 'Для дома и\u00A0пространства',
    photoAlt: 'Свеча и диффузор в тёплом свете',
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

export const JOURNAL_PREVIEW = [
  { tag: 'Архитектура', title: 'Как пахнет бетонный двор после\u00A0грозы' },
  { tag: 'Мастерская', title: 'Янтарное стекло: почему ни\u00A0один флакон не\u00A0повторяется' },
  { tag: 'Интервью', title: 'Парфюмер о\u00A0том, как переводить камень в\u00A0ноты' },
];
