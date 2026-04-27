export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (req.method === 'GET') {
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      console.log('Incoming webhook:', JSON.stringify(body));

      const change = body?.entry?.[0]?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];

      if (!message) {
        return res.status(200).json({ received: true, skipped: 'no_message' });
      }

      const from = message.from;

      if (!from) {
        return res.status(200).json({ received: true, skipped: 'no_sender' });
      }

      const incomingText = message?.text?.body?.trim().toLowerCase() || '';
      const appLink = 'https://paircel.com/get';

      let replyText;

      if (incomingText.includes('ride') || incomingText === '1') {
        replyText =
          `🚗 Paircel Ride\nPlease download the Paircel app to compare ride options:\n${appLink}`;
      } else if (incomingText.includes('delivery') || incomingText === '2') {
        replyText =
          `📦 Paircel Delivery\nPlease download the Paircel app to book or manage delivery:\n${appLink}`;
      } else if (
        incomingText.includes('eats') ||
        incomingText.includes('food') ||
        incomingText === '3'
      ) {
        replyText =
          `🍔 Paircel Eats\nPlease download the Paircel app to access Eats services:\n${appLink}`;
      } else if (
        incomingText.includes('download') ||
        incomingText.includes('app') ||
        incomingText === '5'
      ) {
        replyText =
          `📲 Download Paircel\nGet the Paircel app here:\n${appLink}`;
      } else if (
        incomingText.includes('support') ||
        incomingText.includes('help') ||
        incomingText === '4'
      ) {
        replyText =
          `🛟 Paircel Support\nPlease describe your issue, or download the app here:\n${appLink}`;
      } else {
        replyText =
          `Welcome to Paircel 🚀\n\nHow can I help you?\n\n1️⃣ Ride\n2️⃣ Delivery\n3️⃣ Eats\n4️⃣ Support\n5️⃣ Download App\n\n📲 Download Paircel:\n${appLink}`;
      }

      const response = await fetch(
        `https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: from,
            type: 'text',
            text: {
              body: replyText,
            },
          }),
        }
      );

      const result = await response.json();
      console.log('WhatsApp send result:', JSON.stringify(result));

      return res.status(200).json({
        received: true,
        replied: response.ok,
        replyText,
        result,
      });
    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).send('Method Not Allowed');
}
