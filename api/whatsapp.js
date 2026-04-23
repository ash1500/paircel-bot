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

      const replyText = 'Hello from Paircel 🚀';

      const response = await fetch(
        `https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
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
        result,
      });
    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).send('Method Not Allowed');
}
