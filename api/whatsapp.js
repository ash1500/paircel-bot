export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // =========================
  // META VERIFICATION (GET)
  // =========================
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }

    return res.status(403).send("Forbidden");
  }

  // =========================
  // MAIN BOT (POST)
  // =========================
  if (req.method === "POST") {
    try {
      const body = req.body;
      console.log("Incoming webhook:", JSON.stringify(body));

      const entry = body?.entry?.[0]?.changes?.[0]?.value;
      const message = entry?.messages?.[0];

      if (!message) {
        return res.status(200).json({ ok: true, skip: "no_message" });
      }

      const from = message.from;
      const text =
        message.text?.body ||
        message.button?.text ||
        message.interactive?.button_reply?.title ||
        "";

      if (!from || !text) {
        return res.status(200).json({ ok: true, skip: "invalid_input" });
      }

      const userText = text.toLowerCase().trim();

      // =========================
      // MENU TEXT (CLEAN UX)
      // =========================
      const menuText = `🚀 Welcome to Paircel

How can we help you?

1️⃣ Ride  
2️⃣ Delivery  
3️⃣ Support  
4️⃣ Download App

Reply with a number.`;

      // =========================
      // ROUTING
      // =========================
      let replyText = "";

      if (
        userText === "menu" ||
        userText === "hi" ||
        userText === "hello" ||
        userText === "start"
      ) {
        replyText = menuText;
      }

      else if (userText === "1" || userText.includes("ride")) {
        replyText = `🚗 Paircel Ride

Compare ride options instantly in the Paircel app.

Download:
https://paircel.com/get`;
      }

      else if (userText === "2" || userText.includes("delivery")) {
        replyText = `📦 Paircel Delivery

Send packages fast & secure.

Get started:
https://paircel.com/get`;
      }

      else if (userText === "3" || userText.includes("support")) {
        replyText = `🛟 Paircel Support

We're here to help.

Visit:
https://paircel.com

Or reply with your issue.`;
      }

      else if (userText === "4" || userText.includes("download")) {
        replyText = `📱 Download Paircel App

https://paircel.com/get`;
      }

      else {
        replyText = `⚡ I didn’t understand.

Reply "menu" to see options.`;
      }

      // =========================
      // SEND TO WHATSAPP
      // =========================
      const response = await fetch(
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
            text: {
              body: replyText,
            },
          }),
        }
      );

      const result = await response.json();
      console.log("WhatsApp result:", result);

      return res.status(200).json({
        ok: true,
        sent: response.ok,
      });

    } catch (error) {
      console.error("ERROR:", error);
      return res.status(500).json({ error: "internal_error" });
    }
  }

  return res.status(405).send("Method Not Allowed");
}
