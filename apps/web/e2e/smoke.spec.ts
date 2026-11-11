import { expect, test } from '@playwright/test';

test('главная открывается и показывает бестселлеры из api', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Ароматы, высеченные из камня' }),
  ).toBeVisible();
  const specimens = page.getByRole('region', { name: 'Образцы породы' });
  await expect(specimens.getByRole('link', { name: 'Дым базальта', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
