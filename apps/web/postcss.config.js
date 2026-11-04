import postcssGlobalData from '@csstools/postcss-global-data';
import autoprefixer from 'autoprefixer';
import postcssCustomMedia from 'postcss-custom-media';

// CSS-переменные нельзя использовать в @media, поэтому брейкпоинты — custom media (D-012).
// global-data подмешивает их определения в каждый CSS-модуль, custom-media раскрывает при сборке.
export default {
  plugins: [
    postcssGlobalData({ files: ['src/shared/styles/media.css'] }),
    postcssCustomMedia(),
    autoprefixer(),
  ],
};
