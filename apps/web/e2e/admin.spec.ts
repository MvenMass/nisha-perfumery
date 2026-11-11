import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Администратор из сида базы e2e (apps/api/src/database/reset-e2e.ts).
const ADMIN = { email: 'admin@nisha.test', password: 'e2e-admin-password' };

async function signInAdmin(page: Page, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel('Электронная почта').fill(ADMIN.email);
  await page.getByLabel('Пароль').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL(new RegExp(next.replace(/\//g, '\\/')));
}

test.describe('админка', () => {
  // Сценарии меняют общую базу e2e — достаточно одного браузера.
  test.skip(
    ({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Админка проверяется в одном браузере',
  );

  test('администратор ведёт заказ — покупатель видит новый статус', async ({ page, browser }) => {
    // Гость оформляет и оплачивает самовывоз.
    await page.goto('/catalog/limestone');
    await page.getByRole('button', { name: /Добавить в.корзину/ }).click();
    await expect(page.getByRole('status').filter({ hasText: 'в корзине' })).toBeVisible();
    await page.goto('/checkout');
    await page.getByLabel('Имя и фамилия').fill('Анна Гостева');
    await page.getByLabel('Телефон').fill('+7 900 123-45-67');
    await page.getByLabel('Электронная почта').fill(`e2e-admin-flow-${Date.now()}@nisha.test`);
    await page.getByText('Самовывоз из бутика').click();
    await page.getByRole('button', { name: /Перейти к.оплате/ }).click();
    await page.getByRole('button', { name: /^Оплатить/ }).click();
    await expect(page).toHaveURL(/\/checkout\/done\//);
    const number = ((await page.getByText(/^Заказ №/).textContent()) ?? '').replace(/\D/g, '');

    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    await signInAdmin(admin, '/admin/orders');
    await admin.getByLabel('Поиск заказов').fill(number);
    await admin.getByRole('link', { name: new RegExp(`№.${number.padStart(4, '0')}`) }).click();
    await admin.getByRole('button', { name: 'Готов к выдаче' }).click();
    await expect(admin.getByRole('button', { name: 'Доставлен / получен' })).toBeVisible();
    await adminContext.close();

    await page.reload();
    await expect(page.getByText('Готов к выдаче')).toBeVisible();
  });

  test('пополнение закончившегося объёма возвращает его в продажу', async ({ page }) => {
    await page.goto('/catalog/cut');
    await page.getByText('100 мл', { exact: true }).click();
    await expect(page.getByRole('button', { name: /Сообщить о.поступлении/ })).toBeVisible();

    await signInAdmin(page, '/admin/products');
    await page.getByLabel('Поиск образцов').fill('Спил ореха');
    await page.getByRole('link', { name: 'Спил ореха', exact: true }).click();
    // Объёмы в форме по возрастанию: 100 мл — последний.
    await page.getByLabel('Остаток').last().fill('5');
    await page.getByRole('button', { name: 'Сохранить' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Сохранено' })).toBeVisible();

    await page.goto('/catalog/cut');
    await page.getByText('100 мл', { exact: true }).click();
    await expect(page.getByRole('button', { name: /Добавить в.корзину/ })).toBeVisible();
  });

  test('гостя /admin отправляет на вход', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
  });
});

test('журнал, консультация и статические страницы открываются', async ({ page }) => {
  await page.goto('/journal');
  await page.getByRole('link', { name: /Янтарное стекло/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Янтарное стекло');

  await page.goto('/delivery');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Доставка и оплата');
  await expect(page.getByText(/Курьером.— 1–5.дней/)).toBeVisible();

  await page.goto('/consultation');
  await page.getByLabel('Имя').fill('Вера');
  await page.getByLabel('Телефон').fill('+7 900 111-22-33');
  await page.getByRole('button', { name: 'Записаться' }).click();
  await expect(page.getByRole('status')).toContainText('Спасибо, Вера');
});
