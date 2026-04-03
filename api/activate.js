export default async function handler(req, res) {
  try {
    const r = await fetch("https://newest-mlb-1.onrender.com/api/auth/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer allday2026admin"
      },
      body: JSON.stringify({
        email: "aldaye2015@gmail.com",
        plan: "elite",
        active: true
      })
    });
    const d = await r.json();
    res.status(200).json({ ok: r.ok, result: d });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
