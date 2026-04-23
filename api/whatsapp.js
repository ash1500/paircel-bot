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
    console.log('Incoming webhook:', req.body);
    return res.status(200).json({ received: true });
  }

  return res.status(405).send('Method Not Allowed');
}
