import process from 'node:process';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// e2e поднимает свой api на другом порту, чтобы не конфликтовать с открытым pnpm dev.
const apiProxy = { '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:3000' };

export default defineConfig({
  plugins: [react()],
  test: {
    // e2e/*.spec.ts запускает Playwright, а не Vitest.
    include: ['src/**/*.test.{ts,tsx}'],
    // Компонентные тесты объявляют окружение jsdom в первой строке файла.
    setupFiles: ['src/shared/test/setup.ts'],
  },
  build: {
    // Safari 14.1 / iOS 14.5 — минимальная поддержка (D-013).
    target: ['es2020', 'safari14'],
  },
  server: { port: 5173, strictPort: true, proxy: apiProxy },
  preview: { port: 4173, strictPort: true, proxy: apiProxy },
});
