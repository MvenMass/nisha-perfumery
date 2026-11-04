export default {
  extends: ['stylelint-config-standard'],
  rules: {
    // Цвета живут только в tokens.css (CLAUDE.md: без новых цветов вне токенов).
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla'],
    // Состояния компонентов (hover / disabled / focus) удобнее читать в порядке, а не по специфичности.
    'no-descending-specificity': null,
    // Классы CSS Modules пишем в camelCase, чтобы обращаться к ним как styles.someClass.
    'selector-class-pattern': [
      '^[a-z][a-zA-Z0-9]*$',
      { message: 'Класс CSS Modules — в camelCase' },
    ],
  },
  overrides: [
    {
      files: ['**/shared/styles/tokens.css'],
      rules: {
        'color-no-hex': null,
        'function-disallowed-list': null,
      },
    },
    {
      // Глобальные утилиты (visually-hidden) пишутся в kebab-case.
      files: ['**/shared/styles/global.css'],
      rules: { 'selector-class-pattern': null },
    },
  ],
};
