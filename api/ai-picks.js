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

  const dkRules = `
DK MLB CLASSIC RULES:
- Salary cap: $50,000 (MUST NOT exceed)
- Roster: 10 players — 2 Pitchers (P), 1 Catcher (C), 1 First Baseman (1B), 1 Second Baseman (2B), 1 Third Baseman (3B), 1 Shortstop (SS), 3 Outfielders (OF)
- Must include players from at least 2 different MLB games
- Max 5 hitters from any one team
- SCORING — Hitters: Single +3, Double +5, Triple +8, HR +10, RBI +2, Run +2, BB +2, HBP +2, SB +5
- SCORING — Pitchers: Out +0.75, K +2, Win +4, ER -2, H -0.6, BB -0.6, HBP -0.6, CG +2.5, CGSO +2.5, No-Hit +5
- Pitcher hitting stats DO NOT count. Hitter pitching stats DO NOT count.`;

  const prompts = {
    picks: `You are the #1 MLB DFS optimizer. Build the BEST possible DraftKings MLB Classic lineup for today.

Slate (${date}):
${slate}
${dkContext}

${dkRules}

BUILD EXACTLY 3 DIFFERENT LINEUPS, each with all 10 roster spots filled. Each lineup must use different core stacks for lineup diversity.

LINEUP 1 — CASH/SAFE (highest floor):
P1: [Name] ([Team]) - $[Salary] - [Why]
P2: [Name] ([Team]) - $[Salary] - [Why]
C: [Name] ([Team]) - $[Salary] - [Why]
1B: [Name] ([Team]) - $[Salary] - [Why]
2B: [Name] ([Team]) - $[Salary] - [Why]
3B: [Name] ([Team]) - $[Salary] - [Why]
SS: [Name] ([Team]) - $[Salary] - [Why]
OF1: [Name] ([Team]) - $[Salary] - [Why]
OF2: [Name] ([Team]) - $[Salary] - [Why]
OF3: [Name] ([Team]) - $[Salary] - [Why]
TOTAL: $[sum] (≤$50,000) | PROJ: [pts] | STACK: [team]

LINEUP 2 — GPP/TOURNAMENT (highest ceiling):
[Same 10-slot format]
TOTAL: $[sum] (≤$50,000) | PROJ: [pts] | STACK: [team]

LINEUP 3 — CONTRARIAN (low ownership, high upside):
[Same 10-slot format]
TOTAL: $[sum] (≤$50,000) | PROJ: [pts] | STACK: [team]

Use EXACT DK salaries provided. Verify each total ≤ $50,000. Each lineup must use a DIFFERENT primary stack team. Prioritize: ceiling, correlation, park factors, pitcher matchups, ownership leverage. Be specific with matchup reasoning.`,

    stacks: `You are the #1 MLB GPP specialist. Slate (${date}):
${slate}
${dkContext}

${dkRules}

Build 3 COMPLETE 10-player DraftKings Classic lineups optimized for GPP tournaments.

For EACH lineup show all 10 slots (P1, P2, C, 1B, 2B, 3B, SS, OF1, OF2, OF3) with:
- Player name, team, salary, and projected DK points
- Total salary (must be ≤ $50,000)
- Core stack (which team, how many players)
- Bring-back (correlation from opposing team)
- Why this lineup wins a GPP (ownership leverage, ceiling, correlation)

Use EXACT DK salaries. Verify each total ≤ $50K.`,

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
