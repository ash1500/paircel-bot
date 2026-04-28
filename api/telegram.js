export default async function handler(req, res) {
  const APP_LINK = 'https://paircel.com/get';
  const SITE_LINK = 'https://paircel.com';

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const secretHeader = req.headers['x-telegram-bot-api-secret-token'];

    if (
      process.env.TELEGRAM_WEBHOOK_SECRET &&
      secretHeader !== process.env.TELEGRAM_WEBHOOK_SECRET
    ) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const update = req.body;
    console.log('Incoming Telegram webhook:', JSON.stringify(update));

    const message = update?.message || update?.edited_message;
    const chatId = message?.chat?.id;
    const textRaw = message?.text || '';

    if (!chatId) {
      return res.status(200).json({ ok: true, skipped: 'no_chat_id' });
    }

    const text = textRaw.trim().toLowerCase();

    let replyText = '';

    if (text === '/start' || text === 'hi' || text === 'hello' || text === 'menu') {
      replyText =
        `🚀 Paircel\n\n` +
        `Compare rides & deliveries — smarter.\n\n` +
        `1️⃣ Ride\n` +
        `2️⃣ Delivery\n` +
        `3️⃣ Support\n` +
        `4️⃣ Get the App`;
    } else if (text === '1' || text.includes('ride')) {
      replyText =
        `🚗 Ride, simplified\n\n` +
        `Paircel helps you choose better before you book.\n\n` +
        `📲 Open Paircel:\n${APP_LINK}`;
    } else if (text === '2' || text.includes('delivery')) {
      replyText =
        `📦 Delivery, made easy\n\n` +
        `Send packages with better options — all in one app.\n\n` +
        `📲 Start now:\n${APP_LINK}`;
    } else if (text === '3' || text.includes('support') || text.includes('help')) {
      replyText =
        `🛟 Support\n\n` +
        `We're here to help.\n\n` +
        `Reply with your issue or visit:\n${SITE_LINK}`;
    } else if (text === '4' || text.includes('download') || text.includes('app')) {
      replyText =
        `📲 Get Paircel\n\n${APP_LINK}`;
    } else {
      replyText =
        `⚡ Try this:\n\n` +
        `1️⃣ Ride\n` +
        `2️⃣ Delivery\n` +
        `3️⃣ Support\n` +
        `4️⃣ Get the App`;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: replyText,
          disable_web_page_preview: false,
        }),
      }
    );

    const result = await response.json();
    console.log('Telegram send result:', JSON.stringify(result));

    return res.status(200).json({
      ok: true,
      sent: response.ok,
      result,
    });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return res.status(200).json({ ok: false, error: 'internal_error' });
  }
}
