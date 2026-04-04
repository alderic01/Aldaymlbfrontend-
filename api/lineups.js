export default async function handler(req, res) {
  try {
    // Fetch RotoWire daily lineups page
    const url = 'https://www.rotowire.com/baseball/daily-lineups.php';
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!resp.ok) {
      return res.status(200).json({ error: 'RotoWire returned ' + resp.status });
    }

    const html = await resp.text();

    // Parse lineup data from HTML
    const games = [];

    // RotoWire uses lineup cards with class "lineup__main"
    // Extract game matchups and player names
    const gameBlocks = html.split('lineup__matchup');

    for (let i = 1; i < gameBlocks.length; i++) {
      const block = gameBlocks[i];

      // Extract team abbreviations
      const teamMatch = block.match(/lineup__abbr[^>]*>([A-Z]{2,3})</g);
      const teams = (teamMatch || []).map(t => t.replace(/.*>/, ''));

      if (teams.length < 2) continue;

      const away = teams[0];
      const home = teams[1];

      // Extract time
      const timeMatch = block.match(/lineup__time[^>]*>([^<]+)/);
      const time = timeMatch ? timeMatch[1].trim() : '';

      // Extract pitchers
      const pitcherMatches = block.match(/lineup__player-highlight[^>]*>[\s\S]*?<a[^>]*>([^<]+)/g) || [];
      const pitchers = pitcherMatches.map(p => {
        const nameMatch = p.match(/<a[^>]*>([^<]+)/);
        return nameMatch ? nameMatch[1].trim() : '';
      }).filter(Boolean);

      const awayPitcher = pitchers[0] || 'TBD';
      const homePitcher = pitchers[1] || 'TBD';

      // Extract player names from lineup lists
      const playerPattern = /<a[^>]*class="[^"]*lineup__player[^"]*"[^>]*>([^<]+)<\/a>/g;
      const handPattern = /lineup__bats[^>]*>([LRSB])<\/span>/g;
      const posPattern = /lineup__pos[^>]*>([A-Z0-9]+)<\/span>/g;

      // Split block into away and home sections
      const sections = block.split(/lineup__list/);

      const parseLineup = (section) => {
        const players = [];
        const names = [];
        let match;
        const nameRe = /<a[^>]*class="[^"]*lineup__player[^"]*"[^>]*title="([^"]*)"[^>]*>/g;
        while ((match = nameRe.exec(section)) !== null) {
          names.push(match[1]);
        }
        // Fallback: try href-based extraction
        if (!names.length) {
          const hrefRe = /href="[^"]*">([A-Z][a-z]+ [A-Z][a-z]+[^<]*)</g;
          while ((match = hrefRe.exec(section)) !== null) {
            const name = match[1].trim();
            if (name.length > 3 && name.length < 30 && !name.includes('http')) {
              names.push(name);
            }
          }
        }
        names.forEach((name, idx) => {
          players.push({ order: idx + 1, name: name });
        });
        return players.slice(0, 9);
      };

      let awayLineup = [];
      let homeLineup = [];

      if (sections.length >= 3) {
        awayLineup = parseLineup(sections[1] || '');
        homeLineup = parseLineup(sections[2] || '');
      }

      // Status
      let status = 'expected';
      if (block.includes('lineup__confirmed') || block.includes('is-confirmed')) status = 'confirmed';
      if (block.includes('lineup__postponed')) status = 'postponed';

      games.push({
        away, home,
        awayPitcher, homePitcher,
        awayLineup, homeLineup,
        time, status,
        game: away + '@' + home
      });
    }

    // Also try a simpler JSON endpoint if HTML parsing didn't work well
    if (games.length === 0 || games.every(g => g.awayLineup.length === 0)) {
      // Try MLB API for lineups as fallback
      const today = new Date().toISOString().slice(0, 10);
      const mlbResp = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&hydrate=lineups,probablePitcher`);
      if (mlbResp.ok) {
        const mlbData = await mlbResp.json();
        const mlbGames = (mlbData.dates || [])[0]?.games || [];

        for (const g of mlbGames) {
          const away = g.teams?.away?.team?.abbreviation || '';
          const home = g.teams?.home?.team?.abbreviation || '';
          const awayPitcher = g.teams?.away?.probablePitcher?.fullName || 'TBD';
          const homePitcher = g.teams?.home?.probablePitcher?.fullName || 'TBD';

          const awayLineup = (g.lineups?.awayStarters || []).map((p, idx) => ({
            order: idx + 1, name: p.fullName || p.name || ''
          }));
          const homeLineup = (g.lineups?.homeStarters || []).map((p, idx) => ({
            order: idx + 1, name: p.fullName || p.name || ''
          }));

          const time = g.gameDate ? new Date(g.gameDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';

          games.push({
            away, home, awayPitcher, homePitcher,
            awayLineup, homeLineup,
            time, status: awayLineup.length > 0 ? 'confirmed' : 'expected',
            game: away + '@' + home,
            source: 'mlb-api'
          });
        }
      }
    }

    return res.status(200).json({
      games,
      count: games.length,
      source: games[0]?.source || 'rotowire',
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    return res.status(200).json({ error: err.message, games: [] });
  }
}
