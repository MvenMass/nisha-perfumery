import { expect, test } from '@playwright/test';

test('главная открывается и получает ответ api', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'Ниша' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Статус API: ok');
  expect(errors).toEqual([]);
});
