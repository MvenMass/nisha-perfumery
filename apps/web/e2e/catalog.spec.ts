import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Данные — из сида (apps/api/src/database/seed-data.ts): 15 опубликованных товаров, 4 из базальта.

/** Выбрать материал: на широком экране — в боковой панели, на телефоне — через шторку фильтров. */
async function pickMaterial(page: Page, name: string) {
  const aside = page.getByRole('complementary', { name: 'Фильтры' });
  const sheetButton = page.getByRole('button', { name: /^Фильтры/ });
  // isVisible() не ждёт: сначала дожидаемся, пока каталог отрисует один из вариантов фильтров.
  await expect(aside.or(sheetButton).first()).toBeVisible();
  if (await aside.isVisible()) {
    await aside.getByRole('button', { name }).click();
    return;
  }
  await sheetButton.click();
  const sheet = page.getByRole('dialog', { name: 'Фильтры' });
  await sheet.getByRole('button', { name }).click();
  await sheet.getByRole('button', { name: /^Показать/ }).click();
}

test.describe('каталог', () => {
  test('фильтр попадает в адрес и переживает перезагрузку', async ({ page }) => {
    await page.goto('/catalog');
    await expect(page.getByText('Найдено: 15 образцов')).toBeVisible();

    await pickMaterial(page, 'Базальт');
    await expect(page).toHaveURL(/material=basalt/);
    await expect(page.getByText('Найдено: 4 образца')).toBeVisible();

    await page.reload();
    await expect(page.getByText('Найдено: 4 образца')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Убрать фильтр: Базальт' })).toBeVisible();
  });

  test('«назад» возвращает предыдущие фильтры', async ({ page }) => {
    await page.goto('/catalog?material=basalt');
    await expect(page.getByText('Найдено: 4 образца')).toBeVisible();

    await pickMaterial(page, 'Орех');
    await expect(page).toHaveURL(/material=basalt%2Cwalnut|material=basalt,walnut/);

    await page.goBack();
    await expect(page).toHaveURL(/material=basalt$/);
    await expect(page.getByText('Найдено: 4 образца')).toBeVisible();
  });

  test('сброс фильтров из пустого результата', async ({ page }) => {
    await page.goto('/catalog?volume=50&priceMax=5000');
    await expect(page.getByRole('heading', { name: 'Такой породы у нас пока нет' })).toBeVisible();
    await page.getByRole('button', { name: 'Сбросить фильтры' }).click();
    await expect(page.getByText('Найдено: 15 образцов')).toBeVisible();
  });
});

test.describe('товар', () => {
  test('смена объёма меняет цену и наличие', async ({ page }) => {
    await page.goto('/catalog/basalt');
    await expect(page.getByRole('heading', { level: 1, name: 'Базальт' })).toBeVisible();

    // По умолчанию 50 мл: последние три флакона.
    await expect(page.getByLabel('50 мл')).toBeChecked();
    await expect(page.getByText('Осталось 3 флакона')).toBeVisible();

    await page.getByText('30 мл', { exact: true }).click();
    await expect(page.getByLabel('30 мл')).toBeChecked();
    await expect(page.getByText('В наличии')).toBeVisible();
    await expect(page.getByText('4 900 ₽').first()).toBeVisible();
  });

  test('без остатка предлагает «Сообщить о поступлении»', async ({ page }) => {
    await page.goto('/catalog/obsidian');
    await expect(page.getByRole('button', { name: 'Сообщить о поступлении' })).toBeVisible();
  });

  test('несуществующий товар — страница 404', async ({ page }) => {
    await page.goto('/catalog/no-such-stone');
    await expect(page.getByRole('heading', { level: 1, name: 'Такого образца нет' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'В каталог' })).toBeVisible();
  });
});
