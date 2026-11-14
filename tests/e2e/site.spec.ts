import { test, expect } from '@playwright/test';

test('mobile layout stays within the viewport', async ({ page }) => {
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await expect(page.locator('main')).toBeVisible();
    const overflow = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      offenders: Array.from(document.querySelectorAll<HTMLElement>('body *')).map(element => {
        const rect = element.getBoundingClientRect();
        return { tag: element.tagName, className: String(element.className || ''), text: (element.innerText || '').slice(0, 70), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
      }).filter(item => item.right > window.innerWidth + 1 || item.left < -1).sort((a,b) => b.right-a.right).slice(0,12)
    }));
    expect(overflow.document, `horizontal overflow at ${width}px; offenders: ${JSON.stringify(overflow.offenders)}`).toBeLessThanOrEqual(overflow.viewport + 1);
    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('.cart-trigger')).toBeVisible();
  }
});

test('cart validates contacts and includes the complete order in the Telegram share link', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'В корзину' }).first().click();
  await page.locator('.cart-trigger').click();
  await expect(page.getByRole('dialog', { name: 'Корзина' })).toBeVisible();
  await page.getByRole('button', { name: /Оформить заказ/ }).click();

  const dialog = page.getByRole('dialog', { name: 'Оформление заказа' });
  await expect(dialog).toBeVisible();
  await dialog.locator('input[name="name"]').fill('Тестовый покупатель');
  await dialog.locator('input[name="phone"]').fill('+1 (2) 3-4');
  await dialog.locator('textarea[name="comment"]').fill('Позвонить после 18:00');
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: /Отправить в Telegram/ }).click();
  await expect(dialog.getByRole('alert')).toContainText('от 10 до 15 цифр');

  await dialog.locator('input[name="phone"]').fill('+7 999 123-45-67');
  let telegramShareUrl = '';
  await page.context().route('https://t.me/**', async route => {
    telegramShareUrl = route.request().url();
    await route.fulfill({ status: 200, contentType: 'text/html', body: 'Telegram share test stub' });
  });
  await dialog.getByRole('button', { name: /Отправить в Telegram/ }).click();
  await expect(dialog.getByText('Меню отправки открыто')).toBeVisible();

  expect(telegramShareUrl).toContain('https://t.me/share/url?url=&text=');
  const parsedUrl = new URL(telegramShareUrl);
  const message = parsedUrl.searchParams.get('text') || '';
  expect(message).toContain('Тестовый покупатель');
  expect(message).toContain('+7 999 123-45-67');
  expect(message).toContain('Живые раки — мелкие');
  expect(message).toContain('Предварительный итог:');
  expect(message).toContain('Позвонить после 18:00');
  expect(message).toContain('Прошу связаться для подтверждения наличия');
});
