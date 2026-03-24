export default async (req, context) => {
  const ANTHROPIC_API_KEY = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }
  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { games = [], date = "", mode = "picks" } = body;
  const slateContext = games.length
    ? games.map(g => `${g.away?.abbr} @ ${g.home?.abbr} | Venue: ${g.venue?.name} | Away P: ${g.awayPitcher?.name} (ERA ${g.awayPitcher?.era}) | Home P: ${g.homePitcher?.name} (ERA ${g.homePitcher?.era})`).join("\n")
    : "No slate data — give general MLB DFS advice for today.";
  const prompts = {
    picks: `You are an elite MLB DFS analyst. Slate (${date}):\n${slateContext}\n\nProvide:\n1. TOP STACK\n2. TOP ONE-OFF HITTER\n3. PITCHER TO TARGET\n4. PITCHER TO FADE\n5. MARKET ALERT\n\nBe direct and specific.`,
    stacks: `You are an elite MLB GPP stack specialist. Slate (${date}):\n${slateContext}\n\nRank top 3 GPP stacks. For each: team, opposing pitcher, core hitters, why.`,
    edges: `You are a sharp MLB edge finder. Slate (${date}):\n${slateContext}\n\nIdentify: one total edge, one ML value spot, one DFS leverage play. 2-3 sentences each.`
  };
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompts[mode] || prompts.picks }]
      })
    });
    if (!response.ok) return Response.json({ error: `Anthropic error: ${response.status}` }, { status: 502 });
    const data = await response.json();
    return Response.json({ ok: true, mode, date, analysis: data.content?.[0]?.text || "" });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
};

export const config = { path: "/api/ai-picks" };
