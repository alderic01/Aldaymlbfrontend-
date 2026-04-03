export default async function handler(req, res) {
  try {
    // Step 1: Get MLB draft groups
    const groupResp = await fetch('https://api.draftkings.com/draftgroups/v1/?sport=MLB');
    if (!groupResp.ok) {
      return res.status(502).json({ error: 'DraftKings API returned ' + groupResp.status });
    }
    const groupData = await groupResp.json();
    const draftGroups = (groupData.draftGroups || []).filter(g => {
      const isMLB = g.sportId === 2 || (g.sport && g.sport.toLowerCase() === 'mlb');
      const isClassic = !g.gameType || g.gameType.gameStyleId === 1 || g.gameType === 'Classic';
      return isMLB && isClassic;
    });

    if (!draftGroups.length) {
      return res.status(200).json({ salaries: {}, error: 'No MLB draft groups found today', draftGroups: [] });
    }

    // Step 2: Get player pool from first draft group
    const dgId = draftGroups[0].draftGroupId;
    const poolResp = await fetch('https://api.draftkings.com/draftgroups/v1/draftgroups/' + dgId + '/draftables');
    if (!poolResp.ok) {
      return res.status(502).json({ error: 'DraftKings draftables returned ' + poolResp.status });
    }
    const poolData = await poolResp.json();
    const draftables = poolData.draftables || [];

    // Step 3: Parse
    const salaries = {};
    const posMap = { 70: 'SP', 71: 'SP', 80: 'C', 81: '1B', 82: '2B', 83: '3B', 84: 'SS', 85: 'OF', 86: 'OF', 87: 'OF', 88: 'UTIL' };

    for (const p of draftables) {
      const name = p.displayName || ((p.firstName || '') + ' ' + (p.lastName || '')).trim();
      if (!name) continue;
      const team = p.teamAbbreviation || '';
      const avgAttr = (p.draftStatAttributes || []).find(a => a.id === 90);

      salaries[name.toLowerCase()] = {
        name,
        salary: Number(p.salary || 0),
        pos: posMap[p.rosterSlotId] || p.position || '',
        team,
        avgPts: avgAttr ? Number(avgAttr.value || 0) : 0,
        status: p.status || 'None'
      };
    }

    const slates = draftGroups.map(g => ({
      id: g.draftGroupId,
      games: g.games || g.gameCount || 0,
      startTime: g.startTimeUtc || g.minStartTime || ''
    }));

    return res.status(200).json({
      salaries,
      count: Object.keys(salaries).length,
      draftGroupId: dgId,
      slates,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch DK salaries' });
  }
}
