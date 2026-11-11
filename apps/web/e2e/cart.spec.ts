import { cartResponseSchema } from '@nisha/contracts';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/** Итог на странице, как число рублей: «23 800 ₽» → 23800. */
async function pageTotalRubles(page: Page): Promise<number> {
  const text = (await page.getByTestId('cart-total').textContent()) ?? '';
  return Number(text.replace(/\D/g, ''));
}

/** Тот же расчёт, что видит страница, — прямо у сервера по позициям гостя из localStorage. */
async function serverQuoteRubles(page: Page): Promise<number> {
  const body = await page.evaluate(async () => {
    const stored = window.localStorage.getItem('nisha-cart');
    const items: unknown = stored
      ? (JSON.parse(stored) as { state: { items: unknown } }).state.items
      : [];
    const { token } = (await (await fetch('/api/auth/csrf')).json()) as { token: string };
    const response = await fetch('/api/cart/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-csrf-token': token },
      body: JSON.stringify({ items }),
    });
    return (await response.json()) as unknown;
  });
  return cartResponseSchema.parse(body).summary.itemsTotalKopecks / 100;
}

test('гость: товар → корзина → «+» → итог совпадает с серверным', async ({ page }) => {
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: /ни.одного образца/ })).toBeVisible();

  // «Дым базальта» 50 мл выбран по умолчанию, остаток 3.
  await page.goto('/catalog/basalt');
  await page.getByRole('button', { name: /Добавить в.корзину/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'в корзине' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Корзина, 1 товар' })).toBeVisible();

  await page.getByRole('link', { name: 'Перейти в корзину' }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByRole('link', { name: 'Дым базальта' })).toBeVisible();
  const single = await pageTotalRubles(page);

  await page.getByRole('button', { name: 'Увеличить: Дым базальта' }).click();
  await expect(page.getByText('2 флакона')).toBeVisible();
  await expect.poll(() => pageTotalRubles(page)).toBe(single * 2);
  expect(await pageTotalRubles(page)).toBe(await serverQuoteRubles(page));

  // Больше остатка не положить: «+» выключается на трёх.
  await page.getByRole('button', { name: 'Увеличить: Дым базальта' }).click();
  await expect(page.getByRole('button', { name: 'Увеличить: Дым базальта' })).toBeDisabled();

  await page.getByRole('button', { name: 'Удалить: Дым базальта' }).click();
  await expect(page.getByRole('heading', { name: /ни.одного образца/ })).toBeVisible();
});

// Регистрация ограничена 5 запросами в минуту с адреса, а auth.spec уже тратит по одной на браузер.
test('гостевые корзина и избранное переезжают в аккаунт при регистрации', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Слияние проверяется в одном браузере');

  await page.goto('/catalog');
  await page.getByRole('button', { name: 'В корзину: Известняк после дождя' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'В корзину' }).click();
  await expect(dialog.getByRole('status')).toContainText('в корзине');
  await dialog.getByRole('button', { name: 'Продолжить покупки' }).click();

  await page.goto('/');
  await page.getByRole('button', { name: 'В избранное: Известняк после дождя' }).click();
  await expect(page.getByRole('button', { name: 'В избранное: Известняк после дождя' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.goto('/register?next=/cart');
  await page.getByLabel('Имя').fill('Анна');
  await page.getByLabel('Электронная почта').fill(`e2e-cart-${Date.now()}@nisha.test`);
  await page.getByLabel('Пароль').fill('stone-and-smoke');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();

  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByRole('link', { name: 'Известняк после дождя' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Корзина, 1 товар' })).toBeVisible();

  await page.goto('/favorites');
  await expect(page.getByRole('heading', { level: 2, name: 'Известняк после дождя' })).toBeVisible();
  // Гостевой список очищен: данные теперь в аккаунте.
  expect(await page.evaluate(() => window.localStorage.getItem('nisha-favorites'))).toContain(
    '"productIds":[]',
  );
});
