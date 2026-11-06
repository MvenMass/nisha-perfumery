import { describe, expect, it } from 'vitest';

import { NBSP as _ } from '../../shared/lib/typograph';
import {
  buildPyramid,
  formatDuration,
  formatLayerRange,
  layerThickness,
  pyramidDescription,
} from './pyramid';

describe('formatDuration', () => {
  it.each([
    [15, `15${_}мин`],
    [59, `59${_}мин`],
    [60, `1${_}ч`],
    [180, `3${_}ч`],
    [150, `2,5${_}ч`],
    [480, `8${_}ч`],
  ])('%i мин → %s', (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});

describe('formatLayerRange', () => {
  it('пишет единицу один раз, если она общая, и «+» у последнего слоя', () => {
    expect(formatLayerRange(0, 15, false)).toBe(`0–15${_}мин`);
    expect(formatLayerRange(15, 180, false)).toBe(`15${_}мин–3${_}ч`);
    expect(formatLayerRange(180, 480, true)).toBe(`3–8${_}ч+`);
  });
});

describe('layerThickness', () => {
  it('растёт с длительностью, но сжато: 20-кратная разница не даёт 20-кратной толщины', () => {
    const short = layerThickness(15);
    const long = layerThickness(300);
    expect(long).toBeGreaterThan(short);
    expect(long / short).toBeLessThan(3);
  });

  it('держит толщину в разумных пределах', () => {
    expect(layerThickness(1)).toBeGreaterThanOrEqual(72);
    expect(layerThickness(1440)).toBeLessThan(400);
  });
});

describe('buildPyramid', () => {
  const notes = { top: ['чёрный перец'], heart: ['ладан', 'ирис'], base: ['ветивер'] };
  const pyramid = buildPyramid(notes, { topMinutes: 15, heartMinutes: 180, baseMinutes: 480 });

  it('переводит время затихания слоёв в отрезки звучания', () => {
    expect(pyramid.map((layer) => [layer.level, layer.from, layer.to])).toEqual([
      ['top', 0, 15],
      ['heart', 15, 180],
      ['base', 180, 480],
    ]);
  });

  it('делает слой, который звучит дольше, толще', () => {
    const [top, heart, base] = pyramid.map((layer) => layer.thickness);
    expect(top).toBeLessThan(heart ?? 0);
    expect(heart).toBeLessThan(base ?? 0);
  });

  it('описывает пирамиду словами для скринридера', () => {
    expect(pyramidDescription('Базальт', pyramid)).toBe(
      'Пирамида нот аромата Базальт: верхние ноты — чёрный перец; сердце — ладан, ирис; база — ветивер',
    );
  });
});
