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

test('initial hero image is not hidden by the slide entrance animation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const heroLayer = page.locator('.hero-photo.hero-photo-layer.is-active');
  await expect(heroLayer).toHaveClass(/is-initial/);
  await expect(heroLayer).toHaveCSS('opacity', '1');
  await expect(heroLayer).toHaveCSS('animation-name', 'none');
});

test('mobile hero carousel stays stable until the visitor changes slides', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const slideNumber = page.locator('.hero-side > span').first();
  await expect(slideNumber).toHaveText('01 / 03');
  await page.waitForTimeout(6800);
  await expect(slideNumber).toHaveText('01 / 03');

  await page.locator('.slide-controls button[aria-label="Следующий слайд"]').click();
  await expect(slideNumber).toHaveText('02 / 03');
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
  const heroPreload = page.locator('link[rel="preload"][as="image"][media="(max-width: 700px)"]');
  await expect.poll(async () => heroPreload.evaluate(link => new URL((link as HTMLLinkElement).href).pathname)).toContain('%D0%90');
  await expect.poll(async () => heroPreload.evaluate(link => new URL((link as HTMLLinkElement).href).pathname)).not.toContain('%25D0');
  await expect(page.locator('.hero-picture source[media="(max-width: 700px)"]')).toHaveAttribute('srcset', /-mobile-480\.webp 480w, .*mobile-720\.webp 720w/);
  await expect.poll(async () => heroImage.evaluate(image => (image as HTMLImageElement).currentSrc ? new URL((image as HTMLImageElement).currentSrc).pathname : '')).toMatch(/-mobile-(480|720)\.webp/);
  const productImage = page.locator('.product-image img').first();
  await productImage.scrollIntoViewIfNeeded();
  await expect(page.locator('.product-image source[media="(max-width: 700px)"]').first()).toHaveAttribute('srcset', /-card\.webp/);
  await expect.poll(async () => productImage.evaluate(image => (image as HTMLImageElement).currentSrc ? new URL((image as HTMLImageElement).currentSrc).pathname : '')).toContain('-card.webp');

  const choiceImage = page.locator('.choice-live picture img');
  await choiceImage.scrollIntoViewIfNeeded();
  await expect(page.locator('.choice-live picture source[media="(max-width: 700px)"]')).toHaveAttribute('srcset', /section-480-mobile\.webp 480w, .*mobile-720\.webp 720w/);
  await expect(page.locator('.choice-live picture source[media="(max-width: 700px)"]')).toHaveAttribute('sizes', '(max-width: 700px) calc(100vw - 36px), 42vw');
  await expect.poll(async () => choiceImage.evaluate(image => (image as HTMLImageElement).currentSrc ? new URL((image as HTMLImageElement).currentSrc).pathname : '')).toContain('-2-section-480-mobile.webp');
  const boiledChoiceImage = page.locator('.choice-boiled picture img');
  await boiledChoiceImage.scrollIntoViewIfNeeded();
  await expect.poll(async () => boiledChoiceImage.evaluate(image => (image as HTMLImageElement).currentSrc ? new URL((image as HTMLImageElement).currentSrc).pathname : '')).toContain('-section-480-mobile.webp');

  const craftImage = page.locator('.craft-image picture img');
  await craftImage.scrollIntoViewIfNeeded();
  await expect.poll(async () => craftImage.evaluate(image => (image as HTMLImageElement).currentSrc ? new URL((image as HTMLImageElement).currentSrc).pathname : '')).toContain('-1-mobile-720.webp');

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
  await expect.poll(async () => heroImage.evaluate(image => (image as HTMLImageElement).currentSrc ? new URL((image as HTMLImageElement).currentSrc).pathname : '')).toContain('-desktop.webp');
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
  await expect.poll(async () => choiceImage.evaluate(image => (image as HTMLImageElement).currentSrc ? new URL((image as HTMLImageElement).currentSrc).pathname : '')).toContain('-2-section-640.webp');
  const boiledChoiceImage = page.locator('.choice-boiled picture img');
  await boiledChoiceImage.scrollIntoViewIfNeeded();
  await expect.poll(async () => boiledChoiceImage.evaluate(image => (image as HTMLImageElement).currentSrc ? new URL((image as HTMLImageElement).currentSrc).pathname : '')).toContain('-section-640.webp');
  await expect.poll(async () => choiceImage.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);

  const craftImage = page.locator('.craft-image picture img');
  await craftImage.scrollIntoViewIfNeeded();
  await expect.poll(async () => craftImage.evaluate(image => (image as HTMLImageElement).currentSrc ? new URL((image as HTMLImageElement).currentSrc).pathname : '')).toContain('-1-section-900.webp');
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


test('mobile defers off-screen section rendering without changing desktop', async ({ page }) => {
  const sections = ['.intro', '.values', '.catalog', '.choice-section', '.craft', '.calculator', '.delivery', '.order-process', '.guest-notes', '.faq-section', '.contact-panel', '.final-cta'];

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const mobileStyles = await page.evaluate((selectors) => selectors.map(selector => ({
    selector,
    contentVisibility: getComputedStyle(document.querySelector(selector)!).contentVisibility
  })), sections);
  expect(mobileStyles.filter(item => item.contentVisibility !== 'auto'), JSON.stringify(mobileStyles)).toEqual([]);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reducedMotionStyles = await page.evaluate((selectors) => selectors.map(selector => ({
    selector,
    contentVisibility: getComputedStyle(document.querySelector(selector)!).contentVisibility
  })), sections);
  expect(reducedMotionStyles.filter(item => item.contentVisibility !== 'auto'), JSON.stringify(reducedMotionStyles)).toEqual([]);

  await page.setViewportSize({ width: 1280, height: 900 });
  const desktopStyles = await page.evaluate((selectors) => selectors.map(selector => ({
    selector,
    contentVisibility: getComputedStyle(document.querySelector(selector)!).contentVisibility
  })), sections);
  expect(desktopStyles.filter(item => item.contentVisibility !== 'visible'), JSON.stringify(desktopStyles)).toEqual([]);
});

test('cart recalculates totals in 0.5 kg steps and persists the adjusted quantity', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  await page.getByRole('button', { name: 'В корзину' }).first().click();
  await page.locator('.cart-trigger').click();
  const cart = page.getByRole('dialog', { name: 'Корзина' });
  const line = cart.locator('.cart-line').first();

  await expect(line).toContainText('1 кг');
  await expect(line).toContainText(/1\s?900/);
  await line.getByRole('button', { name: 'Уменьшить' }).click();
  await expect(line).toContainText('0,5 кг');
  await expect(line).toContainText('950');
  await expect(cart.locator('.cart-total')).toContainText('950');

  await page.reload();
  await page.locator('.cart-trigger').click();
  const restoredCart = page.getByRole('dialog', { name: 'Корзина' });
  await expect(restoredCart.locator('.cart-line').first()).toContainText('0,5 кг');
  await expect(restoredCart.locator('.cart-total')).toContainText('950');
});

test('cart restoration rejects unknown products, invalid weights and excessive quantities', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rak-cart', JSON.stringify([
      { product: { id: 1 }, qty: 0.5 },
      { product: { id: 999 }, qty: 2 },
      { product: { id: 5 }, qty: 101 },
      { product: { id: 6 }, qty: 0.3 },
      { product: { id: 7 }, qty: -1 }
    ]));
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.locator('.cart-trigger').click();

  const cart = page.getByRole('dialog', { name: 'Корзина' });
  await expect(cart.locator('.cart-line')).toHaveCount(1);
  await expect(cart).toContainText('Живые раки — мелкие');
  await expect(cart).toContainText('0,5 кг');
  await expect(cart.locator('.cart-total')).toContainText('950');
});

test('all in-page navigation links resolve and legal pages are reachable', async ({ page, request }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  const brokenAnchors = await page.locator('a[href^="#"]').evaluateAll(links =>
    links
      .map(link => (link as HTMLAnchorElement).getAttribute('href') || '')
      .filter(href => href.length > 1 && !document.getElementById(decodeURIComponent(href.slice(1))))
  );
  expect(brokenAnchors, 'Every in-page link must point to an existing element').toEqual([]);

  const privacyResponse = await request.get('/raki/privacy.html');
  expect(privacyResponse.status()).toBe(200);
  const privacyHtml = await privacyResponse.text();
  expect(privacyHtml).toContain('Политика обработки персональных данных');
  expect(privacyHtml).toContain('шаблон для заполнения');

  const termsResponse = await request.get('/raki/terms.html');
  expect(termsResponse.status()).toBe(200);
  const termsHtml = await termsResponse.text();
  expect(termsHtml).toContain('Условия оформления заказа');
  expect(termsHtml).toContain('не является публичной офертой');
});

test('checkout dialog keeps keyboard focus inside the active modal', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'В корзину' }).first().click();
  await page.locator('.cart-trigger').click();

  const cart = page.getByRole('dialog', { name: 'Корзина' });
  await cart.getByRole('button', { name: /Оформить заказ/ }).click();
  const checkout = page.getByRole('dialog', { name: 'Оформление заказа' });
  const closeButton = checkout.locator('.modal-close');

  await expect(closeButton).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(checkout.getByRole('button', { name: /Отправить в Telegram/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(closeButton).toBeFocused();
});

