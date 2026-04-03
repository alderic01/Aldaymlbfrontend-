export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) return res.status(500).json({ error: 'No API key configured' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { body = {}; }

  const { games = [], date = '', mode = 'picks', dkSalaries = [] } = body;

  // Build slate string
  const slate = games.length
    ? games.map(g => `${g.away} @ ${g.home} | ${g.venue} | Away: ${g.awayPitcher} ERA ${g.awayEra} | Home: ${g.homePitcher} ERA ${g.homeEra}`).join('\n')
    : 'No slate — give general MLB DFS advice.';

  // Build DK salary context grouped by position
  let dkContext = '';
  if (dkSalaries && dkSalaries.length > 0) {
    const byPos = {};
    dkSalaries.forEach(p => {
      if (!byPos[p.pos]) byPos[p.pos] = [];
      byPos[p.pos].push(p);
    });
    const posOrder = ['SP', 'C', '1B', '2B', '3B', 'SS', 'OF'];
    const lines = [];
    posOrder.forEach(pos => {
      const players = (byPos[pos] || []).slice(0, pos === 'SP' ? 6 : pos === 'OF' ? 8 : 5);
      if (players.length) {
        lines.push(pos + ': ' + players.map(p => `${p.name} (${p.team}) $${(p.salary || 0).toLocaleString()} ${p.avgPts ? p.avgPts.toFixed(1) + 'pts' : ''}`).join(', '));
      }
    });
    const budget = dkSalaries.filter(p => (p.salary || 9999) < 3600).slice(0, 8).map(p => `${p.name} $${p.salary}`).join(', ');
    dkContext = '\n\nDRAFTKINGS PRICING (salary cap $50,000 — must pick 2 SP, 1 C, 1 1B, 1 2B, 1 3B, 1 SS, 3 OF):\n' + lines.join('\n') + (budget ? '\nBudget plays under $3,600: ' + budget : '');
  }

  const prompts = {
    picks: `Elite MLB DFS analyst. Slate (${date}):\n${slate}${dkContext}\n\n1. TOP STACK (team + specific DK players with salaries)\n2. TOP ONE-OFF (best value under $4K)\n3. PITCHER TO TARGET (salary + matchup rationale)\n4. PITCHER TO FADE (overpriced given matchup)\n5. OPTIMAL $50K LINEUP (list all 10 slots: 2 SP, C, 1B, 2B, 3B, SS, 3 OF — include salary for each, verify total ≤$50K)\n\nUse exact DK salaries provided. Be direct.`,
    stacks: `MLB GPP specialist. Slate (${date}):\n${slate}${dkContext}\n\nTop 3 GPP stacks within $50K DK cap. Each: team, pitcher, core hitters with DK salary, total stack cost, why.`,
    edges: `Sharp MLB edge finder. Slate (${date}):\n${slate}${dkContext}\n\nOne total edge, one ML value, one DFS leverage play (include DK salary and value context). 2-3 sentences each.`
  };

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompts[mode] || prompts.picks }]
      })
    });

    if (!r.ok) {
      return res.status(502).json({ error: `Anthropic API returned ${r.status}` });
    }

    const d = await r.json();
    return res.status(200).json({
      ok: true,
      mode,
      date,
      result: d.content?.[0]?.text || '',
      analysis: d.content?.[0]?.text || ''
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'AI generation failed' });
  }
}
