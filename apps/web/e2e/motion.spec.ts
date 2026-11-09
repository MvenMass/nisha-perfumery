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
 */
function unfinished(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('main *')]
      .filter((element) => {
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
      if (/\/(gsap|ScrollTrigger)-[\w-]+\.js$/.test(request.url()))
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
