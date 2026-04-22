export default function handler(req, res) {
  res.status(200).json({
    status: "OK",
    service: "Paircel Bot",
    env: "production",
    time: new Date().toISOString()
  });
}
