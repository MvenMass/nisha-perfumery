import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Прокрутить страницу до конца шагами, чтобы сработали все сцены ScrollTrigger.
 * Высота читается на каждом шаге: страница дорастает, пока приходят данные.
 */
async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y <= document.documentElement.scrollHeight; y += 250) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  });
}

/**
 * Элементы main, которые движение оставило незавершёнными: GSAP пишет opacity инлайном,
 * CSS-анимации видны через getAnimations. Задуманная приглушённость из стилей (фото
 * закончившегося образца, выключенные кнопки) сюда не попадает.
 *
 * Маски (этап 9.1) — строки заголовков и снимки, сдвинутые в процентах (yPercent): они
 * скрыты от скринридера, но на экране должны встать на место, поэтому aria-hidden тут не повод.
 */
function unfinished(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('main *')]
      .filter((element) => {
        const masked = /translate\(\s*-?[\d.]+%,\s*(-?[\d.]+)%\)/.exec(element.style.transform);
        if (masked && Math.abs(Number(masked[1])) > 0.5) return true;
        if (element.closest('[aria-hidden="true"]')) return false;
        const inline = element.style.opacity;
        const fadedByScript = inline !== '' && Number(inline) < 0.99;
        const running = element
          .getAnimations()
          .some((animation) => animation.playState === 'running');
        return fadedByScript || running;
      })
      .map((element) => `${element.tagName}.${String(element.className)}`),
  );
}

test.describe('с «уменьшением движения»', () => {
  test.use({ reducedMotion: 'reduce' });

  test('контент сразу на месте, GSAP не загружается', async ({ page }) => {
    const motionChunks: string[] = [];
    page.on('request', (request) => {
      if (/\/(gsap|ScrollTrigger|SplitText)-[\w-]+\.js$/.test(request.url()))
        motionChunks.push(request.url());
    });

    for (const path of ['/', '/catalog/basalt']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await scrollThrough(page);
      await page.waitForLoadState('networkidle');
      await expect.poll(() => unfinished(page), { message: path }).toEqual([]);
    }
    expect(motionChunks).toEqual([]);
  });

  test('якорь и «назад» работают', async ({ page, isMobile }) => {
    test.skip(isMobile, 'пункты меню на телефоне — в шторке меню');
    await page.goto('/catalog');
    await page.getByRole('navigation').getByRole('link', { name: 'Мастерская' }).click();
    await expect(page).toHaveURL(/\/#process$/);
    await expect(page.locator('#process')).toBeInViewport();
    await page.goBack();
    await expect(page).toHaveURL(/\/catalog$/);
  });
});

test('после прокрутки все сцены дошли до конца', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await scrollThrough(page);
  // Сцены по скроллу длятся до секунды; ждём, пока все допишутся.
  await expect.poll(() => unfinished(page), { timeout: 5000 }).toEqual([]);

  await page.goto('/catalog/basalt');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await scrollThrough(page);
  await expect.poll(() => unfinished(page), { timeout: 5000 }).toEqual([]);
});

test('заголовки под маской читаются целиком, пока строки ещё внизу', async ({ page }) => {
  await page.goto('/');
  // Секция ниже экрана: строки уже разрезаны и спрятаны, а имя заголовка — полное.
  await expect(
    page.getByRole('heading', { level: 2, name: /Травертин:\s+камень\s+с\s+дыханием/ }),
  ).toHaveCount(1);
  await expect(
    page.getByRole('heading', { level: 2, name: /Как\s+рождается\s+аромат/ }),
  ).toHaveCount(1);
});

test.describe('десктоп', () => {
  test.skip(({ isMobile }) => isMobile, 'сцены только для мыши и ширины от 1024 px');

  test('после сцен подвал достижим', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await scrollThrough(page);
    await expect(page.getByRole('contentinfo')).toBeInViewport();
  });

  test('пункт меню «Мастерская» на главной доводит до секции', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('navigation').getByRole('link', { name: 'Мастерская' }).click();
    await expect(page).toHaveURL(/\/#process$/);
    // Плавный проезд: секция закреплена по центру экрана и видна целиком.
    await expect(page.locator('#process')).toBeInViewport({ ratio: 0.99 });
  });

  test('закреплённые сцены держат прокрутку один раз', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect.poll(() => page.locator('.pin-spacer').count()).toBe(2);
    await scrollThrough(page);
    // Прокрутили — закрепления сняты: обратно вверх страница едет без остановок.
    await expect.poll(() => page.locator('.pin-spacer').count()).toBe(0);
    // Сцены остались в конечном виде.
    await expect(page.locator('#process li').first()).toHaveCSS('opacity', '1');
  });
});
