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
      // Normalize position: SP/RP/P all go to SP bucket
      let pos = (p.pos || 'OF').toUpperCase();
      if (pos === 'RP' || pos === 'P') pos = 'SP';
      if (!byPos[pos]) byPos[pos] = [];
      byPos[pos].push(p);
    });
    const posOrder = ['SP', 'C', '1B', '2B', '3B', 'SS', 'OF'];
    const lines = [];
    posOrder.forEach(pos => {
      const players = (byPos[pos] || []).sort((a,b) => (b.salary||0) - (a.salary||0)).slice(0, pos === 'SP' ? 10 : pos === 'OF' ? 12 : 6);
      if (players.length) {
        lines.push(pos + ': ' + players.map(p => `${p.name} (${p.team}) $${(p.salary || 0).toLocaleString()}${p.avgPts ? ' ' + Number(p.avgPts).toFixed(1) + 'pts' : ''}`).join(', '));
      }
    });
    const budget = dkSalaries.filter(p => (p.salary || 9999) < 3600 && (p.salary || 0) > 0).slice(0, 10).map(p => `${p.name} (${(p.pos||'').toUpperCase()}) $${p.salary}`).join(', ');
    const totalPlayers = dkSalaries.filter(p => p.salary > 0).length;
    dkContext = `\n\nDRAFTKINGS SALARY DATA (${totalPlayers} players, salary cap $50,000):\n` + lines.join('\n') + (budget ? '\nBudget plays under $3,600: ' + budget : '');
  } else {
    dkContext = '\n\nNO SALARY DATA PROVIDED — use general knowledge of typical DK pricing.';
  }

  const dkRules = `
DK MLB CLASSIC RULES:
- Salary cap: $50,000 MAXIMUM. YOUR LINEUP TOTAL MUST BE UNDER $50,000.
- Average salary per player: $5,000 (10 players x $5,000 = $50,000)
- If you pick 2 pitchers at $9,000 each ($18,000), you only have $32,000 left for 8 hitters = $4,000 average per hitter.
- DO NOT pick more than 3 players above $5,500 salary.
- Roster: 2P, 1C, 1 1B, 1 2B, 1 3B, 1 SS, 3 OF
- SCORING — Hitters: 1B +3, 2B +5, 3B +8, HR +10, RBI +2, R +2, BB +2, HBP +2, SB +5
- SCORING — Pitchers: Out +0.75, K +2, W +4, ER -2, H -0.6, BB -0.6, HBP -0.6`;

  const prompts = {
    picks: `You are an MLB DFS optimizer. Build 3 DraftKings Classic lineups.

CRITICAL SALARY RULE: Total MUST be $50,000 or less. Add up every salary and verify.
- 2 pitchers around $7,000-$9,000 each = ~$16,000-$18,000 on pitchers
- 8 hitters averaging $4,000 each = ~$32,000 on hitters
- MIX expensive stars ($5,000+) with budget plays ($2,800-$3,500)

Slate (${date}):
${slate}
${dkContext}

${dkRules}

Build 3 lineups. For EACH lineup list all 10 players in this EXACT format:
P1: Name (TEAM) $SALARY
P2: Name (TEAM) $SALARY
C: Name (TEAM) $SALARY
1B: Name (TEAM) $SALARY
2B: Name (TEAM) $SALARY
3B: Name (TEAM) $SALARY
SS: Name (TEAM) $SALARY
OF1: Name (TEAM) $SALARY
OF2: Name (TEAM) $SALARY
OF3: Name (TEAM) $SALARY
TOTAL: $XXXXX (MUST BE UNDER $50,000)

Use ONLY players and salaries from the data above. ADD UP THE SALARIES CAREFULLY. Each lineup must use different stacks.`,

    stacks: `MLB GPP specialist. Slate (${date}):
${slate}
${dkContext}

${dkRules}

Build 3 GPP tournament lineups. SALARY MUST BE UNDER $50,000.
Mix 2-3 expensive players with budget plays to stay under cap.
Format: P1: Name (TEAM) $SALARY ... TOTAL: $XXXXX
ADD UP ALL SALARIES AND VERIFY UNDER $50,000.`,

    edges: `Sharp MLB DFS edge finder. Slate (${date}):
${slate}
${dkContext}

${dkRules}

Give me:
1. SMASH SPOT: Best game environment for stacking (team, pitcher matchup, park, weather, why)
2. CONTRARIAN PLAY: Low-owned player with high ceiling (name, salary, ownership estimate, why)
3. PITCHER LOCK: Best pitcher to build around (name, salary, K projection, win prob, matchup edge)
4. VALUE PLAY: Best sub-$3,500 hitter (name, salary, why the price is wrong)
5. FADE: Most overpriced player to avoid (name, salary, why)

Be specific with stats, salaries, and reasoning.`
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
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompts[mode] || prompts.picks }]
      })
    });

    if (!r.ok) {
      const errBody = await r.text().catch(() => 'no body');
      console.error('Anthropic error:', r.status, errBody);
      return res.status(200).json({ error: `Anthropic ${r.status}: ${errBody}` });
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
