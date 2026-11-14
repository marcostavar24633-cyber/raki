interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  TURNSTILE_SECRET_KEY: string;
}
type OrderItemInput = { productId: number; quantity: number };
type OrderPayload = { name: string; phone: string; comment?: string; turnstileToken: string; items: OrderItemInput[] };

const catalog: Record<number, { name: string; unit: string; price: number }> = {
  1: { name: 'Живые раки — мелкие', unit: 'кг', price: 1900 },
  5: { name: 'Живые раки — средние', unit: 'кг', price: 2300 },
  6: { name: 'Живые раки — крупные', unit: 'кг', price: 2900 },
  7: { name: 'Живые раки — отборные', unit: 'кг', price: 3500 },
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, max-age=0' } });

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char] as string));

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return json({ error: 'Метод не поддерживается.' }, 405);

  // Browser form submissions must originate from this exact deployment origin.
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) {
    return json({ error: 'Источник запроса не разрешён.' }, 403);
  }

  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID || !env.TURNSTILE_SECRET_KEY) {
    return json({ error: 'Приём заказов временно не настроен. Свяжитесь с нами другим способом.' }, 503);
  }

  const contentType = request.headers.get('content-type') || '';
  if (contentType.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return json({ error: 'Ожидается JSON-запрос.' }, 415);
  }

  let rawText: string;
  try { rawText = await request.text(); } catch {
    return json({ error: 'Не удалось прочитать заказ.' }, 400);
  }
  // Ограничиваем фактический размер тела, не полагаясь только на Content-Length.
  if (new TextEncoder().encode(rawText).byteLength > 16_384) {
    return json({ error: 'Слишком большой запрос.' }, 413);
  }

  let raw: unknown;
  try { raw = JSON.parse(rawText); } catch {
    return json({ error: 'Некорректные данные заказа.' }, 400);
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return json({ error: 'Некорректные данные заказа.' }, 400);
  }

  const body = raw as Partial<OrderPayload>;

  const turnstileToken = typeof body.turnstileToken === 'string' ? body.turnstileToken.trim() : '';
  if (!turnstileToken || turnstileToken.length > 2048) {
    return json({ error: 'Пройдите проверку безопасности и повторите отправку.' }, 400);
  }

  // Fail closed: no order is sent unless Cloudflare Siteverify accepts this single-use token.
  try {
    const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: turnstileToken,
        remoteip: request.headers.get('CF-Connecting-IP') || undefined,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!verifyResponse.ok) {
      return json({ error: 'Проверка безопасности временно недоступна. Попробуйте позже.' }, 503);
    }
    const verification = await verifyResponse.json() as { success?: boolean; hostname?: string };
    const requestHostname = new URL(request.url).hostname;
    if (verification.success !== true || verification.hostname !== requestHostname) {
      return json({ error: 'Проверка безопасности не пройдена или истекла. Пройдите её ещё раз.' }, 403);
    }
  } catch {
    return json({ error: 'Не удалось выполнить проверку безопасности. Попробуйте позже.' }, 503);
  }
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 40) : '';
  const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 1000) : '';
  const items = Array.isArray(body.items) ? body.items : [];
  const phoneDigits = phone.replace(/\D/g, '');

  if (!name || phoneDigits.length < 10 || phoneDigits.length > 15 || !items.length || items.length > 30) {
    return json({ error: 'Проверьте имя, телефон и состав заказа.' }, 400);
  }

  const validItems = items.every((item) => item && Number.isInteger(item.productId) && catalog[item.productId] &&
    Number.isFinite(item.quantity) && item.quantity > 0 && item.quantity <= 100 &&
    Math.round(item.quantity * 10) === item.quantity * 10 &&
    (catalog[item.productId].unit === 'кг'
      ? Math.round(item.quantity * 2) === item.quantity * 2
      : Number.isInteger(item.quantity)));
  if (!validItems || new Set(items.map((item) => item.productId)).size !== items.length) return json({ error: 'В заказе обнаружены некорректные или повторяющиеся позиции.' }, 400);

  const pricedItems = items.map((item) => ({ ...catalog[item.productId], quantity: item.quantity }));
  const total = pricedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (!Number.isFinite(total) || total > 100000000) return json({ error: 'Некорректная сумма заказа.' }, 400);

  const lines = pricedItems.map((item) => `• ${escapeHtml(item.name)} — ${item.quantity} ${escapeHtml(item.unit)} × ${item.price.toLocaleString('ru-RU')} ₽`).join('\n');
  const message = [
    '<b>Новый заказ с сайта РАКОВАРНЯ 73</b>', '',
    `<b>Имя:</b> ${escapeHtml(name)}`,
    `<b>Телефон:</b> ${escapeHtml(phone)}`, '',
    '<b>Состав заказа:</b>', lines, '',
    `<b>Итого:</b> ${total.toLocaleString('ru-RU')} ₽`,
    comment ? `\n<b>Комментарий:</b> ${escapeHtml(comment)}` : '',
  ].filter(Boolean).join('\n');

  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML', disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10_000),
    });
    const telegramResult = await telegramResponse.json() as { ok?: boolean };
    if (!telegramResponse.ok || !telegramResult.ok) return json({ error: 'Не удалось передать заказ менеджеру. Попробуйте ещё раз.' }, 502);
    return json({ ok: true });
  } catch {
    return json({ error: 'Ошибка связи. Попробуйте отправить заказ ещё раз.' }, 502);
  }
};
