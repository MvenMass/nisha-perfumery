// Типограф для текста из БД (CLAUDE.md, D-019). Статичные тексты размечаются вручную.
// Регулярные выражения без lookbehind: его нет в Safari < 16.4.

export const NBSP = '\u00A0';
export const NB_HYPHEN = '\u2011';

// Помимо любых слов из 1–2 букв: короткие предлоги, союзы и местоимения,
// которые не должны оставаться в конце строки.
const SHORT_WORDS = [
  'без',
  'безо',
  'для',
  'изо',
  'над',
  'надо',
  'обо',
  'ото',
  'под',
  'подо',
  'при',
  'про',
  'или',
  'как',
  'так',
  'это',
  'все',
  'всё',
  'его',
  'она',
  'они',
  'оно',
];

// Частицы, которые не отрываются от предыдущего слова.
const PARTICLES = ['же', 'ж', 'ли', 'ль', 'бы', 'б'];

const UNITS = [
  'мл',
  'л',
  'г',
  'кг',
  'м',
  'км',
  'см',
  'мм',
  'мин',
  'ч',
  'сек',
  'шт',
  'руб',
  '₽',
  '%',
];

const BOUNDARY = `(^|[\\s${NBSP}(«„"'])`;

const shortWordRe = new RegExp(`${BOUNDARY}(\\p{L}{1,2}|${SHORT_WORDS.join('|')}) +(?=\\S)`, 'giu');
const particleRe = new RegExp(` +(${PARTICLES.join('|')})(?=[^\\p{L}]|$)`, 'giu');
const dashRe = / +([—–])/g;
const numberUnitRe = new RegExp(`(\\d) +(${UNITS.join('|')})(?=[^\\p{L}]|$)`, 'gu');
const numeroRe = /№ +(?=\d)/g;
// Составное слово с одним дефисом, где хотя бы одна часть не длиннее трёх букв: из‑за, кто‑то, по‑русски.
const hyphenRe = /^(\p{L}+)-(\p{L}+)([^\p{L}]*)$/u;
const urlLikeRe = /:\/\/|^www\.|@/;
const tokenSeparatorRe = new RegExp(`([ \\n${NBSP}]+)`);

function bindShortWord(match: string, boundary: string, word: string): string {
  // Частицы привязываются к предыдущему слову, а не к следующему.
  return PARTICLES.includes(word.toLowerCase()) ? match : `${boundary}${word}${NBSP}`;
}

function bindShortWords(text: string): string {
  // Соседние короткие слова («в и с») делят один пробел, поэтому повторяем до неподвижной точки.
  let previous = text;
  for (;;) {
    const next = previous.replace(shortWordRe, bindShortWord);
    if (next === previous) return next;
    previous = next;
  }
}

function fixHyphen(token: string): string {
  if (urlLikeRe.test(token)) return token;
  const match = hyphenRe.exec(token);
  if (!match) return token;
  const [, left = '', right = '', tail = ''] = match;
  if (left.length > 3 && right.length > 3) return token;
  return `${left}${NB_HYPHEN}${right}${tail}`;
}

export function typograph(text: string): string {
  if (text === '') return text;

  let result = bindShortWords(text);
  result = result.replace(particleRe, `${NBSP}$1`);
  result = result.replace(dashRe, `${NBSP}$1`);
  result = result.replace(numberUnitRe, `$1${NBSP}$2`);
  result = result.replace(numeroRe, `№${NBSP}`);

  // Дефисы — по отдельным словам, чтобы не задеть ссылки и почту.
  return result
    .split(tokenSeparatorRe)
    .map((token) => fixHyphen(token))
    .join('');
}
