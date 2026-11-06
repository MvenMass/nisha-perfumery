import type { Density } from '@nisha/contracts';

import { emptyCatalogFilters } from '../../entities/product/lib/catalog-search';
import type { CatalogFilters } from '../../entities/product/lib/catalog-search';

// «Подбор аромата» (D-027): ответы переводятся в обычные фильтры каталога — отдельной логики рекомендаций нет.

export type FinderOption = {
  value: string;
  title: string;
  description: string;
  materials?: string[];
  density?: Density;
  category?: string;
};

export type FinderQuestion = {
  id: 'mood' | 'density' | 'for';
  title: string;
  options: FinderOption[];
};

export const QUESTIONS: FinderQuestion[] = [
  {
    id: 'mood',
    title: 'Какое настроение ближе?',
    options: [
      {
        value: 'rain',
        title: 'Свежесть после дождя',
        description: 'Мокрый камень, известь, ирис',
        materials: ['limestone', 'travertine'],
      },
      {
        value: 'wood',
        title: 'Тёплое дерево',
        description: 'Кедр, табак, воск, сандал',
        materials: ['walnut'],
      },
      {
        value: 'smoke',
        title: 'Дым и\u00A0камень',
        description: 'Перец, ладан, кожа',
        materials: ['basalt'],
      },
      {
        value: 'resin',
        title: 'Смола и\u00A0сладость',
        description: 'Амбра, бензоин, ваниль',
        materials: ['amber'],
      },
    ],
  },
  {
    id: 'density',
    title: 'Насколько плотный аромат?',
    options: [
      {
        value: 'light',
        title: 'Лёгкий',
        description: 'Прозрачный, на\u00A0каждый день',
        density: 'light',
      },
      {
        value: 'medium',
        title: 'Средний',
        description: 'Заметный, но\u00A0не\u00A0громкий',
        density: 'medium',
      },
      {
        value: 'high',
        title: 'Насыщенный',
        description: 'Глубокий, на\u00A0вечер',
        density: 'high',
      },
      { value: 'any', title: 'Не\u00A0знаю', description: 'Покажите все' },
    ],
  },
  {
    id: 'for',
    title: 'Для кого?',
    options: [
      {
        value: 'women',
        title: 'Женский аромат',
        description: 'Из\u00A0женской коллекции',
        category: 'women',
      },
      {
        value: 'men',
        title: 'Мужской аромат',
        description: 'Из\u00A0мужской коллекции',
        category: 'men',
      },
      { value: 'home', title: 'Для дома', description: 'Спреи и\u00A0диффузоры', category: 'home' },
      { value: 'any', title: 'Без разницы', description: 'Покажите всё подходящее' },
    ],
  },
];

export type FinderAnswers = Partial<Record<FinderQuestion['id'], string>>;

/** Ответы → фильтры каталога. Неотвеченный вопрос не сужает выбор. */
export function answersToFilters(answers: FinderAnswers): CatalogFilters {
  const pick = (id: FinderQuestion['id']) =>
    QUESTIONS.find((question) => question.id === id)?.options.find(
      (option) => option.value === answers[id],
    );
  const mood = pick('mood');
  const density = pick('density');
  const target = pick('for');
  return {
    ...emptyCatalogFilters,
    material: mood?.materials ?? [],
    density: density?.density ? [density.density] : [],
    category: target?.category ? [target.category] : [],
  };
}
