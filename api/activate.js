export default async function handler(req, res) {
  const r = await fetch("https://newest-mlb.onrender.com/api/auth/admin/users", {
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
  res.json({ ok: r.ok, result: d });
}
```

Commit it. Vercel auto-deploys in 30 seconds. Then open:
```
https://aldaymlbfrontend-pn8a3osln-alderic01s-projects.vercel.app/api/activate
