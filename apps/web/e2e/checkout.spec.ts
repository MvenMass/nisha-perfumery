import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function addToCart(page: Page, slug: string) {
  await page.goto(`/catalog/${slug}`);
  await page.getByRole('button', { name: /Добавить в.корзину/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'в корзине' })).toBeVisible();
}

const rubles = async (page: Page, testId: string) =>
  Number(((await page.getByTestId(testId).textContent()) ?? '').replace(/\D/g, ''));

test('гость: корзина → оформление → оплата → подтверждение', async ({ page }, testInfo) => {
  await addToCart(page, 'chalk');
  await page.goto('/cart');
  await page.getByRole('link', { name: /Оформить заказ/ }).click();
  await expect(page).toHaveURL(/\/checkout$/);

  // Пустая форма не уходит: ошибки у полей, фокус — на первом.
  await page.getByRole('button', { name: /Перейти к.оплате/ }).click();
  await expect(page.getByLabel('Имя и фамилия')).toBeFocused();

  await page.getByLabel('Имя и фамилия').fill('Анна Гостева');
  await page.getByLabel('Телефон').fill('+7 900 123-45-67');
  await page
    .getByLabel('Электронная почта')
    .fill(`e2e-guest-${testInfo.project.name}-${Date.now()}@nisha.test`);
  await page.getByText('Самовывоз из бутика').click();
  await expect(page.getByText('Укажите имя')).toBeHidden();
  // Итог пересчитывает сервер: ждём, пока «Ваш заказ» покажет самовывоз и закончит обновление.
  const summary = page.getByRole('complementary', { name: 'Ваш заказ' });
  await expect(summary).toContainText(/Самовывоз из.бутика\s*бесплатно/);
  await expect(summary).toHaveAttribute('aria-busy', 'false');
  const total = await rubles(page, 'checkout-total');

  await page.getByRole('button', { name: /Перейти к.оплате/ }).click();
  await expect(page).toHaveURL(/\/checkout\/payment\/[\w-]+\?token=/);
  expect(await rubles(page, 'payment-amount')).toBe(total);
  await expect(page.getByRole('timer')).toContainText('4:5');

  await page.getByRole('button', { name: /^Оплатить/ }).click();
  await expect(page).toHaveURL(/\/checkout\/done\//);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Спасибо, заказ оплачен');
  await expect(page.getByText(/задайте пароль по.ссылке/)).toBeVisible();
  // Корзина гостя очищена: заказ уже держит остатки.
  await expect(page.getByRole('link', { name: 'Корзина', exact: true })).toBeVisible();
});

// Регистрация ограничена 5 запросами в минуту с адреса: полный путь пользователя — в одном браузере.
test('пользователь: отказ банка → образцы в корзину → оплата → заказ в кабинете', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Путь пользователя проверяется в одном браузере');

  await page.goto('/register?next=/account/orders');
  await page.getByLabel('Имя').fill('Борис');
  await page.getByLabel('Электронная почта').fill(`e2e-buyer-${Date.now()}@nisha.test`);
  await page.getByLabel('Пароль').fill('stone-and-smoke');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page).toHaveURL(/\/account\/orders$/);
  await expect(page.getByText('Здесь появятся ваши заказы')).toBeVisible();

  await addToCart(page, 'sample-set');
  await page.goto('/checkout');
  // Имя и почта подставлены из профиля.
  await expect(page.getByLabel('Имя и фамилия')).toHaveValue('Борис');
  await page.getByLabel('Телефон').fill('+7 900 765-43-21');
  await page.getByLabel('Город').fill('Москва');
  await page.getByLabel('Улица, дом').fill('Тверская, 7');
  await page.getByRole('button', { name: /Перейти к.оплате/ }).click();
  await expect(page).toHaveURL(/\/checkout\/payment\//);

  await page.getByRole('button', { name: 'Отказ банка' }).click();
  await expect(page.getByRole('heading', { name: 'Заказ отменён' })).toBeVisible();
  await page.getByRole('button', { name: 'Вернуть образцы в корзину' }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByRole('link', { name: 'Пробники коллекции' })).toBeVisible();

  await page.goto('/checkout');
  // Адрес сохранён и выбран, телефон запомнен в профиле.
  await expect(page.getByRole('button', { name: 'Тверская, 7', pressed: true })).toBeVisible();
  await expect(page.getByLabel('Телефон')).toHaveValue('+7 900 765-43-21');
  await page.getByRole('button', { name: /Перейти к.оплате/ }).click();
  await page.getByRole('button', { name: /^Оплатить/ }).click();
  await expect(page).toHaveURL(/\/checkout\/done\//);

  await page.getByRole('link', { name: 'Открыть заказ' }).click();
  await expect(page.getByRole('list', { name: 'Статус заказа' })).toBeVisible();
  await page.getByRole('link', { name: 'Все заказы' }).click();
  await expect(page.getByRole('article')).toHaveCount(2);
  await page.getByRole('tab', { name: 'Активные' }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article')).toContainText('Оплачен');
});
