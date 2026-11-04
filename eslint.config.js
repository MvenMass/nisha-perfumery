import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Слои упрощённого FSD сверху вниз: слой может импортировать только слои ниже себя.
const fsdLayers = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'];

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/playwright-report/**', '**/test-results/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Нет в Safari 14 (CLAUDE.md): structuredClone и Array.prototype.at.
      'no-restricted-globals': [
        'error',
        { name: 'structuredClone', message: 'Нет в Safari 14. Копируйте явно.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='at']",
          message: 'Array.prototype.at нет в Safari 14. Используйте индекс.',
        },
      ],
    },
  },
  {
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/api/**/*.ts', 'packages/**/*.ts', 'apps/web/*.config.ts', 'apps/web/e2e/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      boundaries,
    },
    settings: {
      'import/resolver': {
        typescript: { project: 'apps/web/tsconfig.json' },
      },
      'boundaries/elements': fsdLayers.map((layer) => ({
        type: layer,
        pattern: layer === 'app' || layer === 'shared' ? `src/${layer}` : `src/${layer}/*`,
        mode: 'folder',
      })),
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: fsdLayers.map((layer, index) => ({
            from: { element: { type: layer } },
            allow: { to: { element: { types: fsdLayers.slice(index + 1) } } },
          })),
        },
      ],
    },
  },
  prettier,
);
