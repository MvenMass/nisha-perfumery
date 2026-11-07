import { expect, test } from '@playwright/test';

// Один длинный сценарий на браузер: регистрация ограничена 5 запросами в минуту с адреса.
test('гость → вход через регистрацию → кабинет → выход → вход с ошибкой и без', async ({
  page,
}, testInfo) => {
  const email = `e2e-${testInfo.project.name}-${Date.now()}@nisha.test`;
  const password = 'stone-and-smoke';

  // Кабинет без входа отправляет на вход и помнит, куда вернуться.
  await page.goto('/account');
  await expect(page).toHaveURL(/\/login\?next=%2Faccount$/);

  await page.getByRole('link', { name: 'Создать аккаунт' }).click();
  await expect(page).toHaveURL(/\/register\?next=%2Faccount$/);
  await page.getByLabel('Имя').fill('Анна');
  await page.getByLabel('Электронная почта').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Профиль' })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();

  await page.getByRole('button', { name: 'Выйти' }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/account');
  await expect(page).toHaveURL(/\/login\?next=%2Faccount$/);
  await page.getByLabel('Электронная почта').fill(email);
  await page.getByLabel('Пароль').fill('wrong-password');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page.getByRole('alert')).toHaveText('Неверный email или пароль');

  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText(email)).toBeVisible();
});
