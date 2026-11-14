import { test, expect } from '@playwright/test';

test('mobile layout stays within the viewport', async ({ page }) => {
  for (const width of [320, 360, 390, 430]) {
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
  await dialog.getByRole('button', { name: /Отправить в Telegram/ }).click();
  await expect(dialog.getByRole('heading', { name: 'Заявка подготовлена' })).toBeVisible();
  const telegramLink = dialog.getByRole('link', { name: 'Открыть Telegram' });
  const telegramShareUrl = await telegramLink.getAttribute('href');
  expect(telegramShareUrl).toContain('https://t.me/share/url?url=&text=');
  const parsedUrl = new URL(telegramShareUrl || '');
  const message = parsedUrl.searchParams.get('text') || '';
  expect(message).toContain('Тестовый покупатель');
  expect(message).toContain('+7 999 123-45-67');
  expect(message).toContain('Живые раки — мелкие');
  expect(message).toContain('Предварительный итог:');
  expect(message).toContain('Позвонить после 18:00');
  expect(message).toContain('Прошу связаться для подтверждения наличия');
});

test('mobile hero copy stays visible when desktop-only GSAP is disabled', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const heroCopy = page.locator('.hero-copy');
  for (const selector of ['.eyebrow', 'h1', '> p', '.hero-buttons']) {
    const element = heroCopy.locator(selector);
    await expect(element).toBeVisible();
    await expect(element).toHaveCSS('opacity', '1');
  }
});

test('mobile navigation exposes its expanded state and closes after selection', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');

  const menuButton = page.getByRole('button', { name: 'Открыть меню' });
  const navigation = page.getByRole('navigation');
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await expect(menuButton).toHaveAttribute('aria-controls', 'primary-navigation');

  await menuButton.click();
  const closeButton = page.getByRole('button', { name: 'Закрыть меню' });
  await expect(closeButton).toHaveAttribute('aria-expanded', 'true');
  await expect(navigation.getByRole('link', { name: 'Каталог' })).toBeVisible();

  await navigation.getByRole('link', { name: 'Каталог' }).click();
  await expect(page.getByRole('button', { name: 'Открыть меню' })).toHaveAttribute('aria-expanded', 'false');
});

test('page has basic accessible landmarks, image alternatives and named buttons', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);

  const audit = await page.evaluate(() => ({
    imagesWithoutAlt: Array.from(document.images)
      .filter(image => !image.hasAttribute('alt'))
      .map(image => image.currentSrc || image.src),
    buttonsWithoutName: Array.from(document.querySelectorAll('button'))
      .filter(button => !button.innerText.trim() && !button.getAttribute('aria-label') && !button.getAttribute('title'))
      .map(button => button.outerHTML.slice(0, 180))
  }));

  expect(audit.imagesWithoutAlt, 'Every image must declare alt text (empty is allowed for decorative images)').toEqual([]);
  expect(audit.buttonsWithoutName, 'Every button must have an accessible name').toEqual([]);

  const footerTextColor = await page.locator('.footer-bottom').evaluate(node => getComputedStyle(node).color);
  expect(footerTextColor, 'Footer microcopy must retain accessible contrast').toBe('rgb(146, 152, 143)');
});

test('mobile viewport selects the lightweight hero image variant', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const heroImage = page.locator('.hero-picture img');
  await expect(heroImage).toHaveAttribute('fetchpriority', 'high');
  await expect(page.locator('.hero-picture source[media="(max-width: 700px)"]')).toHaveAttribute('srcset', /-mobile-720\.webp/);
  await expect.poll(async () => heroImage.evaluate(image => new URL((image as HTMLImageElement).currentSrc).pathname)).toContain('-mobile-720.webp');
  const productImage = page.locator('.product-image img').first();
  await expect(page.locator('.product-image source[media="(max-width: 700px)"]').first()).toHaveAttribute('srcset', /-card\.webp/);
  await expect.poll(async () => productImage.evaluate(image => new URL((image as HTMLImageElement).currentSrc).pathname)).toContain('-card.webp');

  const choiceImage = page.locator('.choice-live picture img');
  await choiceImage.scrollIntoViewIfNeeded();
  await expect(page.locator('.choice-live picture source[media="(max-width: 700px)"]')).toHaveAttribute('srcset', /section-480-mobile\.webp 480w, .*mobile-720\.webp 720w/);
  await expect(page.locator('.choice-live picture source[media="(max-width: 700px)"]')).toHaveAttribute('sizes', '(max-width: 700px) calc(100vw - 36px), 42vw');
  await expect.poll(async () => choiceImage.evaluate(image => new URL((image as HTMLImageElement).currentSrc).pathname)).toContain('-2-section-480-mobile.webp');
  const boiledChoiceImage = page.locator('.choice-boiled picture img');
  await boiledChoiceImage.scrollIntoViewIfNeeded();
  await expect.poll(async () => boiledChoiceImage.evaluate(image => new URL((image as HTMLImageElement).currentSrc).pathname)).toContain('-section-480-mobile.webp');

  const craftImage = page.locator('.craft-image picture img');
  await craftImage.scrollIntoViewIfNeeded();
  await expect.poll(async () => craftImage.evaluate(image => new URL((image as HTMLImageElement).currentSrc).pathname)).toContain('-1-mobile-720.webp');

  const valuePhoto = page.locator('.value-photo .value-photo-img');
  await valuePhoto.scrollIntoViewIfNeeded();
  await expect.poll(async () => valuePhoto.evaluate(node => getComputedStyle(node).backgroundImage)).toContain('-2-mobile-720.webp');

  const secondValuePhoto = page.locator('.value-image-two .value-photo-img');
  await secondValuePhoto.scrollIntoViewIfNeeded();
  await expect.poll(async () => secondValuePhoto.evaluate(node => getComputedStyle(node).backgroundImage)).toContain('-4-mobile-720.webp');

  const deliveryBackground = page.locator('.delivery-bg');
  await deliveryBackground.scrollIntoViewIfNeeded();
  await expect.poll(async () => deliveryBackground.evaluate(node => getComputedStyle(node).backgroundImage)).toContain('-1-mobile-720.webp');
});


test('desktop viewport selects optimized desktop image variants', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  const heroImage = page.locator('.hero-picture img');
  await expect(page.locator('.hero-picture source[media="(min-width: 701px)"]')).toHaveAttribute('srcset', /-desktop\.webp/);
  await expect.poll(async () => heroImage.evaluate(image => new URL((image as HTMLImageElement).currentSrc).pathname)).toContain('-desktop.webp');
  await expect.poll(async () => heroImage.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);

  const productImage = page.locator('.product-image img').first();
  await page.locator('.product-image').first().scrollIntoViewIfNeeded();
  const productSource = page.locator('.product-image source[media="(min-width: 701px)"]').first();
  await expect(productSource).toHaveAttribute('srcset', /-card\.webp 480w, .*?-card-720\.webp 720w/);
  await expect(productSource).toHaveAttribute('sizes', '(min-width: 1200px) 25vw, 50vw');
  await expect.poll(async () => productImage.evaluate(image => {
    const url = new URL((image as HTMLImageElement).currentSrc).pathname;
    return url.includes('-card.webp') || url.includes('-card-720.webp');
  })).toBe(true);
  await expect.poll(async () => productImage.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);

  const choiceImage = page.locator('.choice-live picture img');
  await choiceImage.scrollIntoViewIfNeeded();
  await expect(page.locator('.choice-live picture source[media="(min-width: 701px)"]')).toHaveAttribute('srcset', /section-640\.webp 640w, .*section-900\.webp 900w/);
  await expect.poll(async () => choiceImage.evaluate(image => new URL((image as HTMLImageElement).currentSrc).pathname)).toContain('-2-section-640.webp');
  const boiledChoiceImage = page.locator('.choice-boiled picture img');
  await boiledChoiceImage.scrollIntoViewIfNeeded();
  await expect.poll(async () => boiledChoiceImage.evaluate(image => new URL((image as HTMLImageElement).currentSrc).pathname)).toContain('-section-640.webp');
  await expect.poll(async () => choiceImage.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);

  const craftImage = page.locator('.craft-image picture img');
  await craftImage.scrollIntoViewIfNeeded();
  await expect.poll(async () => craftImage.evaluate(image => new URL((image as HTMLImageElement).currentSrc).pathname)).toContain('-1-section-900.webp');
  await expect.poll(async () => craftImage.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);

  const valuePhoto = page.locator('.value-photo .value-photo-img');
  await valuePhoto.scrollIntoViewIfNeeded();
  await expect.poll(async () => valuePhoto.evaluate(node => getComputedStyle(node).backgroundImage)).toContain('-2-section-900.webp');

  const secondValuePhoto = page.locator('.value-image-two .value-photo-img');
  await secondValuePhoto.scrollIntoViewIfNeeded();
  await expect.poll(async () => secondValuePhoto.evaluate(node => getComputedStyle(node).backgroundImage)).toContain('-4-section-900.webp');

  const deliveryBackground = page.locator('.delivery-bg');
  await deliveryBackground.scrollIntoViewIfNeeded();
  await expect.poll(async () => deliveryBackground.evaluate(node => getComputedStyle(node).backgroundImage)).toContain('-1-section-900.webp');
});

test('cart persists after reload and dialogs close with Escape while restoring focus', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  await page.getByRole('button', { name: 'В корзину' }).first().click();
  await page.locator('.cart-trigger').click();
  const cartDialog = page.getByRole('dialog', { name: 'Корзина' });
  await expect(cartDialog).toBeVisible();

  const checkoutButton = cartDialog.getByRole('button', { name: /Оформить заказ/ });
  await checkoutButton.click();
  const checkoutDialog = page.getByRole('dialog', { name: 'Оформление заказа' });
  await expect(checkoutDialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(checkoutDialog).toBeHidden();
  await expect(cartDialog).toBeVisible();
  await expect(checkoutButton).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(cartDialog).toBeHidden();
  await expect(page.locator('.cart-trigger')).toBeFocused();

  await page.reload();
  await page.locator('.cart-trigger').click();
  await expect(page.getByRole('dialog', { name: 'Корзина' })).toContainText('Живые раки — мелкие');
});
