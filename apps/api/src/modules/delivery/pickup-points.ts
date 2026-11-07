import type { PickupPoint } from '@nisha/contracts';

/*
 * Мок-провайдер пунктов выдачи СДЭК (D-031). Настоящая интеграция заменит этот модуль:
 * остальной код знает только findPickupPoints и findPickupPoint.
 * Адреса условные; x / y — положение точки на схематичной карте.
 */
const POINTS: PickupPoint[] = [
  {
    id: 'msk-01',
    city: 'Москва',
    name: 'Пункт на Тверской',
    address: 'Тверская ул., 18',
    hours: 'ежедневно 9:00–21:00',
    x: 0.46,
    y: 0.38,
  },
  {
    id: 'msk-02',
    city: 'Москва',
    name: 'Пункт у Чистых прудов',
    address: 'Мясницкая ул., 24',
    hours: 'ежедневно 10:00–22:00',
    x: 0.58,
    y: 0.42,
  },
  {
    id: 'msk-03',
    city: 'Москва',
    name: 'Пункт на Остоженке',
    address: 'Остоженка, 7',
    hours: 'пн–сб 10:00–20:00',
    x: 0.4,
    y: 0.58,
  },
  {
    id: 'msk-04',
    city: 'Москва',
    name: 'Пункт на Таганке',
    address: 'Таганская ул., 31',
    hours: 'ежедневно 9:00–21:00',
    x: 0.66,
    y: 0.6,
  },
  {
    id: 'msk-05',
    city: 'Москва',
    name: 'Пункт у Белорусской',
    address: 'Лесная ул., 9',
    hours: 'ежедневно 8:00–22:00',
    x: 0.34,
    y: 0.3,
  },
  {
    id: 'spb-01',
    city: 'Санкт-Петербург',
    name: 'Пункт на Невском',
    address: 'Невский пр., 62',
    hours: 'ежедневно 10:00–22:00',
    x: 0.55,
    y: 0.48,
  },
  {
    id: 'spb-02',
    city: 'Санкт-Петербург',
    name: 'Пункт на Петроградской',
    address: 'Большой пр. П. С., 41',
    hours: 'ежедневно 9:00–21:00',
    x: 0.42,
    y: 0.28,
  },
  {
    id: 'spb-03',
    city: 'Санкт-Петербург',
    name: 'Пункт у Технологического',
    address: 'Московский пр., 17',
    hours: 'пн–сб 10:00–20:00',
    x: 0.5,
    y: 0.66,
  },
];

export function pickupCities(): string[] {
  return [...new Set(POINTS.map((point) => point.city))];
}

export function findPickupPoints(city?: string): PickupPoint[] {
  return city ? POINTS.filter((point) => point.city === city) : POINTS;
}

export function findPickupPoint(id: string): PickupPoint | undefined {
  return POINTS.find((point) => point.id === id);
}
