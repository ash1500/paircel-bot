export default async function handler(req, res) {
  const APP_LINK = 'https://paircel.com/get';
  const SITE_LINK = 'https://paircel.com';

  // Temporary in-memory state for Vercel runtime.
  // Note: this is not permanent storage; it can reset after serverless cold starts.
  global.paircelUserStates = global.paircelUserStates || {};
  global.paircelLastReplies = global.paircelLastReplies || {};

  const userStates = global.paircelUserStates;
  const lastReplies = global.paircelLastReplies;

  const url = new URL(req.url, `http://${req.headers.host}`);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  // Meta webhook verification
  if (req.method === 'GET') {
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }

    return res.status(403).send('Forbidden');
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const body = req.body;
    console.log('Incoming webhook:', JSON.stringify(body));

    const change = body?.entry?.[0]?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    // Ignore delivery/read/status events.
    if (!message) {
      return res.status(200).json({
        ok: true,
        received: true,
        skipped: 'no_message_or_status_event',
      });
    }

    const from = message.from;

    if (!from) {
      return res.status(200).json({
        ok: true,
        received: true,
        skipped: 'no_sender',
      });
    }

    const incomingTextRaw =
      message?.text?.body ||
      message?.button?.text ||
      message?.interactive?.button_reply?.title ||
      '';

    const incomingText = incomingTextRaw.trim().toLowerCase();

    if (!incomingText) {
      return res.status(200).json({
        ok: true,
        received: true,
        skipped: 'non_text_message',
      });
    }

    const now = Date.now();

    // Basic anti-spam: avoid replying too many times to the same user too fast.
    const lastReply = lastReplies[from];
    if (lastReply && now - lastReply < 3000) {
      return res.status(200).json({
        ok: true,
        received: true,
        skipped: 'rate_limited_short_window',
      });
    }

    const currentState = userStates[from] || {
      mode: 'menu',
      updatedAt: now,
    };

    let replyText = '';
    let nextState = { ...currentState, updatedAt: now };

    const isGreeting =
      incomingText === 'hi' ||
      incomingText === 'hello' ||
      incomingText === 'hey' ||
      incomingText === 'start' ||
      incomingText === 'menu';

    const wantsRide =
      incomingText === '1' ||
      incomingText.includes('ride') ||
      incomingText.includes('car') ||
      incomingText.includes('taxi');

    const wantsDelivery =
      incomingText === '2' ||
      incomingText.includes('delivery') ||
      incomingText.includes('deliver') ||
      incomingText.includes('package') ||
      incomingText.includes('parcel') ||
      incomingText.includes('courier');

    const wantsSupport =
      incomingText === '3' ||
      incomingText.includes('support') ||
      incomingText.includes('help') ||
      incomingText.includes('problem') ||
      incomingText.includes('issue');

    const wantsDownload =
      incomingText === '4' ||
      incomingText.includes('download') ||
      incomingText.includes('app') ||
      incomingText.includes('install');

    const wantsReset =
      incomingText.includes('restart') ||
      incomingText.includes('reset') ||
      incomingText.includes('main menu') ||
      incomingText.includes('back');

    if (wantsReset || isGreeting) {
      nextState = {
        mode: 'menu',
        updatedAt: now,
      };

      replyText =
        `Welcome to Paircel 🚀\n\n` +
        `How can I help you?\n\n` +
        `1️⃣ Ride\n` +
        `2️⃣ Delivery\n` +
        `3️⃣ Support\n` +
        `4️⃣ Download App\n\n` +
        `📲 Download Paircel:\n${APP_LINK}`;
    } else if (wantsRide) {
      nextState = {
        mode: 'ride',
        updatedAt: now,
      };

      replyText =
        `🚗 Paircel Ride\n\n` +
        `Compare ride options in the Paircel app.\n\n` +
        `📲 Download / open Paircel:\n${APP_LINK}\n\n` +
        `You can also reply with "menu" to return to the main menu.`;
    } else if (wantsDelivery) {
      nextState = {
        mode: 'delivery',
        updatedAt: now,
      };

      replyText =
        `📦 Paircel Delivery\n\n` +
        `Book and manage delivery through the Paircel app.\n\n` +
        `📲 Download / open Paircel:\n${APP_LINK}\n\n` +
        `You can also reply with "menu" to return to the main menu.`;
    } else if (wantsSupport) {
      nextState = {
        mode: 'support_waiting_for_issue',
        updatedAt: now,
      };

      replyText =
        `🛟 Paircel Support\n\n` +
        `Please describe your issue in one message.\n\n` +
        `Example:\n` +
        `“I need help with my ride booking.”\n\n` +
        `You can also visit:\n${SITE_LINK}`;
    } else if (wantsDownload) {
      nextState = {
        mode: 'download',
        updatedAt: now,
      };

      replyText =
        `📲 Download Paircel App\n\n` +
        `${APP_LINK}\n\n` +
        `Use Paircel for Ride and Delivery services.`;
    } else if (currentState.mode === 'support_waiting_for_issue') {
      nextState = {
        mode: 'support_received',
        lastIssue: incomingTextRaw,
        updatedAt: now,
      };

      replyText =
        `✅ Support request received.\n\n` +
        `Thank you for contacting Paircel Support. Our team will review your message and follow up as soon as possible.\n\n` +
        `For faster access, you can also use the Paircel app:\n${APP_LINK}`;
    } else if (currentState.mode === 'ride') {
      replyText =
        `🚗 To continue with Paircel Ride, please open the app:\n${APP_LINK}\n\n` +
        `Reply "menu" to see all options.`;
    } else if (currentState.mode === 'delivery') {
      replyText =
        `📦 To continue with Paircel Delivery, please open the app:\n${APP_LINK}\n\n` +
        `Reply "menu" to see all options.`;
    } else if (currentState.mode === 'support_received') {
      replyText =
        `🛟 Your support request has already been received.\n\n` +
        `Reply "menu" to return to the main menu, or download Paircel here:\n${APP_LINK}`;
    } else {
      nextState = {
        mode: 'menu',
        updatedAt: now,
      };

      replyText =
        `Welcome to Paircel 🚀\n\n` +
        `Please choose an option:\n\n` +
        `1️⃣ Ride\n` +
        `2️⃣ Delivery\n` +
        `3️⃣ Support\n` +
        `4️⃣ Download App\n\n` +
        `📲 Download Paircel:\n${APP_LINK}`;
    }

    userStates[from] = nextState;
    lastReplies[from] = now;

    const whatsappToken =
      process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;

    if (!whatsappToken) {
      console.error('Missing WhatsApp token environment variable');
      return res.status(200).json({
        ok: false,
        received: true,
        error: 'missing_whatsapp_token',
      });
    }

    const phoneNumberId =
      value?.metadata?.phone_number_id ||
      process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!phoneNumberId) {
      console.error('Missing WhatsApp phone number ID');
      return res.status(200).json({
        ok: false,
        received: true,
        error: 'missing_phone_number_id',
      });
    }

    const response = await fetch(
      `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: from,
          type: 'text',
          text: {
            body: replyText,
            preview_url: true,
          },
        }),
      }
    );

    const result = await response.json().catch(() => ({}));

    console.log(
      'WhatsApp send result:',
      JSON.stringify({
        ok: response.ok,
        status: response.status,
        result,
      })
    );

    return res.status(200).json({
      ok: true,
      received: true,
      replied: response.ok,
      state: nextState.mode,
      result,
    });
  } catch (error) {
    console.error('Webhook error:', error);

    // Return 200 to Meta to prevent repeated webhook retries.
    return res.status(200).json({
      ok: false,
      error: 'internal_error',
    });
  }
}
