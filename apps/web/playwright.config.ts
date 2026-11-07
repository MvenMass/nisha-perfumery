import process from 'node:process';

import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);

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
      command: 'pnpm exec tsx --env-file-if-exists=../../.env src/server.ts',
      cwd: '../api',
      // Фронт в e2e открыт с vite preview — CSRF-проверка Origin должна ждать именно его.
      env: { WEB_ORIGIN: 'http://localhost:4173' },
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: !isCI,
    },
    {
      command: 'pnpm build && pnpm preview',
      url: 'http://localhost:4173',
      reuseExistingServer: !isCI,
    },
  ],
});
