export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // ===== VERIFY =====
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

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

    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return res.status(200).json({ ok: true });

    const from = message.from;
    const userText = (
      message.text?.body ||
      message.button?.text ||
      message.interactive?.button_reply?.title ||
      ''
    ).toLowerCase();

    // ===== SMART LOGIC =====
    let replyText = '';

    if (userText === '1' || userText.includes('ride')) {
      replyText = `🚗 Paircel Ride

Book your ride instantly:
👉 https://paircel.com/get`;
    }

    else if (userText === '2' || userText.includes('delivery')) {
      replyText = `📦 Paircel Delivery

Send packages fast & secure:
👉 https://paircel.com/get`;
    }

    else if (userText === '3' || userText.includes('support')) {
      replyText = `🛟 Paircel Support

Our team is ready to help you.
Reply with your issue or visit:
👉 https://paircel.com`;
    }

    else if (userText === '4' || userText.includes('download')) {
      replyText = `📲 Download Paircel App

👉 https://paircel.com/get`;
    }

    else {
      replyText = `Welcome to Paircel 🚀

How can I help you?

1️⃣ Ride  
2️⃣ Delivery  
3️⃣ Support  
4️⃣ Download App  

📲 Download:
https://paircel.com/get`;
    }

    // ===== SEND TO WHATSAPP =====
    await fetch(
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
          text: { body: replyText },
        }),
      }
    );

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'error' });
  }
}
