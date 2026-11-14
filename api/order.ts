type VercelRequest = { method?: string; headers?: Record<string, string | string[] | undefined>; body: unknown };
type VercelResponse = { status(code: number): VercelResponse; json(payload: unknown): VercelResponse };

type OrderItemInput = { productId: number; quantity: number };
type OrderPayload = { name: string; phone: string; comment?: string; turnstileToken: string; items: OrderItemInput[] };

// Серверный каталог: цена и название не принимаются от браузера.
// Перед публикацией замените демонстрационные значения на утверждённый ассортимент.
const catalog: Record<number, { name: string; unit: string; price: number }> = {
  1: { name: 'Живые раки — мелкие', unit: 'кг', price: 1900 },
  5: { name: 'Живые раки — средние', unit: 'кг', price: 2300 },
  6: { name: 'Живые раки — крупные', unit: 'кг', price: 2900 },
  7: { name: 'Живые раки — отборные', unit: 'кг', price: 3500 },
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char] as string));

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается.' });

  const contentType = req.headers?.['content-type'];
  if (typeof contentType !== 'string' || contentType.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return res.status(415).json({ error: 'Ожидается JSON-запрос.' });
  }
  let serializedBody: string;
  try { serializedBody = JSON.stringify(req.body); } catch {
    return res.status(400).json({ error: 'Некорректные данные заказа.' });
  }
  if (new TextEncoder().encode(serializedBody ?? '').byteLength > 16_384) {
    return res.status(413).json({ error: 'Слишком большой запрос.' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return res.status(503).json({ error: 'Приём заказов временно не настроен. Свяжитесь с нами другим способом.' });

  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (!turnstileSecret) return res.status(503).json({ error: 'Защита формы временно не настроена. Свяжитесь с нами другим способом.' });


  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Некорректные данные заказа.' });
  }
  const body = req.body as Partial<OrderPayload>;

  const turnstileToken = typeof body.turnstileToken === 'string' ? body.turnstileToken.trim() : '';
  if (!turnstileToken || turnstileToken.length > 2048) {
    return res.status(400).json({ error: 'Пройдите проверку безопасности и повторите отправку.' });
  }

  try {
    const verificationResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: turnstileSecret,
        response: turnstileToken,
        remoteip: Array.isArray(req.headers?.['x-forwarded-for'])
          ? req.headers?.['x-forwarded-for']?.[0]
          : req.headers?.['x-forwarded-for']?.split(',')[0]?.trim(),
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!verificationResponse.ok) {
      return res.status(503).json({ error: 'Проверка безопасности временно недоступна. Попробуйте позже.' });
    }
    const verification = await verificationResponse.json() as { success?: boolean; hostname?: string; action?: string };
    const requestHost = req.headers?.host;
    const hostname = Array.isArray(requestHost) ? requestHost[0] : requestHost;
    if (!hostname || verification.success !== true ||
      verification.hostname !== hostname.split(':')[0].toLowerCase() || verification.action !== 'order') {
      return res.status(403).json({ error: 'Проверка безопасности не пройдена или истекла. Пройдите её ещё раз.' });
    }
  } catch {
    return res.status(503).json({ error: 'Не удалось выполнить проверку безопасности. Попробуйте позже.' });
  }
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 40) : '';
  const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 1000) : '';
  const items = Array.isArray(body.items) ? body.items as OrderItemInput[] : [];
  const phoneDigits = phone.replace(/\D/g, '');
  if (!name || phoneDigits.length < 10 || phoneDigits.length > 15 || !items.length || items.length > 30) {
    return res.status(400).json({ error: 'Проверьте имя, телефон и состав заказа.' });
  }
  const validItems = items.every((item) => item && Number.isInteger(item.productId) && catalog[item.productId] &&
    Number.isFinite(item.quantity) && item.quantity > 0 && item.quantity <= 100 &&
    Math.round(item.quantity * 10) === item.quantity * 10 &&
    (catalog[item.productId].unit === 'кг'
      ? Math.round(item.quantity * 2) === item.quantity * 2
      : Number.isInteger(item.quantity)));
  if (!validItems || new Set(items.map((item) => item.productId)).size !== items.length) return res.status(400).json({ error: 'В заказе обнаружены некорректные или повторяющиеся позиции.' });

  const pricedItems = items.map((item) => ({ ...catalog[item.productId], quantity: item.quantity }));
  const total = pricedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (!Number.isFinite(total) || total > 100000000) return res.status(400).json({ error: 'Некорректная сумма заказа.' });
  const lines = pricedItems.map((item) => `• ${escapeHtml(item.name)} — ${item.quantity} ${escapeHtml(item.unit)} × ${item.price.toLocaleString('ru-RU')} ₽`).join('\n');
  const message = [
    '<b>Новый заказ с сайта РАКОВАРНЯ 73</b>',
    '',
    `<b>Имя:</b> ${escapeHtml(name)}`,
    `<b>Телефон:</b> ${escapeHtml(phone)}`,
    '',
    '<b>Состав заказа:</b>', lines,
    '',
    `<b>Итого:</b> ${total.toLocaleString('ru-RU')} ₽`,
    comment ? `\n<b>Комментарий:</b> ${escapeHtml(comment)}` : '',
  ].filter(Boolean).join('\n');

  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML', disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10_000),
    });
    const telegramResult = await telegramResponse.json() as { ok?: boolean };
    if (!telegramResponse.ok || !telegramResult.ok) {
      console.error('Telegram order delivery failed', telegramResponse.status);
      return res.status(502).json({ error: 'Не удалось передать заказ менеджеру. Попробуйте ещё раз.' });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Order delivery error', error);
    return res.status(502).json({ error: 'Ошибка связи. Попробуйте отправить заказ ещё раз.' });
  }
}
