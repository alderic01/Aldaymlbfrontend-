export default async (req, context) => {
  const KEY = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!KEY) return Response.json({ error: "No API key" }, { status: 500 });
  let body; try { body = await req.json(); } catch { body = {}; }
  const { games = [], date = "", mode = "picks" } = body;
  const slate = games.length
    ? games.map(g => `${g.away?.abbr} @ ${g.home?.abbr} | ${g.venue?.name} | Away: ${g.awayPitcher?.name} ERA ${g.awayPitcher?.era} | Home: ${g.homePitcher?.name} ERA ${g.homePitcher?.era}`).join("\n")
    : "No slate — give general MLB DFS advice.";
  const prompts = {
    picks: `Elite MLB DFS analyst. Slate (${date}):\n${slate}\n\n1. TOP STACK\n2. TOP ONE-OFF\n3. PITCHER TO TARGET\n4. PITCHER TO FADE\n5. MARKET ALERT\n\nBe direct.`,
    stacks: `MLB GPP specialist. Slate (${date}):\n${slate}\n\nTop 3 GPP stacks. Each: team, pitcher, core hitters, why.`,
    edges: `Sharp MLB edge finder. Slate (${date}):\n${slate}\n\nOne total edge, one ML value, one DFS leverage play. 2-3 sentences each.`
  };
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-5-20250929", max_tokens: 1024, messages: [{ role: "user", content: prompts[mode] || prompts.picks }] })
  });
  if (!r.ok) return Response.json({ error: `Anthropic ${r.status}` }, { status: 502 });
  const d = await r.json();
  return Response.json({ ok: true, mode, date, analysis: d.content?.[0]?.text || "" });
};
export const config = { path: "/api/ai-picks" };
