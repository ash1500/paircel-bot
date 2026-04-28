export default async function handler(req, res) {
  if (req.method === "GET") {
    const { ["hub.mode"]: mode, ["hub.verify_token"]: token, ["hub.challenge"]: challenge } = req.query;
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).end();
  }

  if (req.method !== "POST") return res.status(405).end();

  try {
    const entry = req.body?.entry?.[0]?.changes?.[0]?.value;
    const msg = entry?.messages?.[0];
    if (!msg) return res.status(200).json({ ok: true });

    const from = msg.from;
    const text =
      msg.text?.body ||
      msg.button?.text ||
      msg.interactive?.button_reply?.title ||
      "";

    const t = text.toLowerCase().trim();

    let reply = "";

    if (t === "1" || t.includes("ride")) {
      reply = `🚗 Ride, simplified

Paircel helps you choose better before you book.

📲 https://paircel.com/get`;
    } else if (t === "2" || t.includes("delivery")) {
      reply = `📦 Delivery, made easy

Send packages with better options — all in one app.

📲 https://paircel.com/get`;
    } else if (t === "3" || t.includes("support")) {
      reply = `🛟 Support

Reply with your issue or visit:
https://paircel.com`;
    } else if (t === "4" || t.includes("download")) {
      reply = `📲 Get Paircel

https://paircel.com/get`;
    } else {
      reply = `🚀 Paircel

Compare rides & deliveries — smarter.

1️⃣ Ride  
2️⃣ Delivery  
3️⃣ Support  
4️⃣ Get the App`;
    }

    await fetch(
      `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: from,
          type: "text",
          text: { body: reply },
        }),
      }
    );

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(200).json({ ok: false });
  }
}
