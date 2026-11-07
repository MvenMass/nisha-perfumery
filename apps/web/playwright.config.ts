import { existsSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);
const E2E_API_PORT = 3100;

// Локально DATABASE_URL берётся из корневого .env, в CI — из окружения job.
const envFile = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

/**
 * e2e работают на своей базе <имя>_e2e, которая пересоздаётся перед прогоном: заказы меняют
 * остатки, и без этого прогоны зависели бы друг от друга и от ручных проверок в dev-базе.
 */
function e2eDatabaseUrl(): string {
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error('Для e2e нужен DATABASE_URL (см. .env.example)');
  const url = new URL(base);
  url.pathname = `${url.pathname.replace(/_e2e$/, '')}_e2e`;
  return url.toString();
}

export default defineConfig({
  testDir: './e2e',
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Ближайшее к Safari, что есть в Playwright; Safari 14 проверяется вручную в этапе 10.
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    {
      name: 'mobile-360',
      use: { ...devices['Pixel 5'], viewport: { width: 360, height: 780 } },
    },
  ],
  webServer: [
    {
      command: 'pnpm exec tsx src/database/reset-e2e.ts && pnpm exec tsx src/server.ts',
      cwd: '../api',
      // Фронт в e2e открыт с vite preview — CSRF-проверка Origin должна ждать именно его.
      // Свой порт: открытый pnpm dev (api на 3000) не мешает и не переиспользуется по ошибке.
      env: {
        DATABASE_URL: e2eDatabaseUrl(),
        WEB_ORIGIN: 'http://localhost:4173',
        API_PORT: String(E2E_API_PORT),
      },
      url: `http://localhost:${E2E_API_PORT}/api/health`,
      reuseExistingServer: !isCI,
    },
    {
      command: 'pnpm build && pnpm preview',
      env: { API_PROXY_TARGET: `http://localhost:${E2E_API_PORT}` },
      url: 'http://localhost:4173',
      reuseExistingServer: !isCI,
    },
  ],
});
