export default async function handler(req, res) {
  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) return res.status(200).json({ error: 'No ANTHROPIC_API_KEY set' });

  // Try multiple model IDs to find which one works
  const models = [
    'claude-haiku-4-5-20251001',
    'claude-haiku-4-5',
    'claude-sonnet-4-5',
    'claude-3-5-haiku-20241022',
    'claude-3-5-sonnet-20241022',
    'claude-3-haiku-20240307'
  ];

  const results = [];
  for (const model of models) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: 32,
          messages: [{ role: 'user', content: 'Say hi' }]
        })
      });
      const body = await r.text();
      results.push({ model, status: r.status, ok: r.ok, body: body.substring(0, 200) });
      if (r.ok) break; // Found a working model, stop
    } catch (err) {
      results.push({ model, status: 'error', ok: false, body: err.message });
    }
  }

  return res.status(200).json({ results });
}
// deploy trigger 1775251569
