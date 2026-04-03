// ═══════════════════════════════════════════════════════════════════════════════
// ALLDAY EDGE — App Main Renderer (v2.0)
// 7 Tabs: Games, Pitching Edge, Scouting, Stack Recs, AI Stack, Optimizer, Alerts
// ═══════════════════════════════════════════════════════════════════════════════

const view = document.getElementById('view');

// ─── Grade helpers ─────────────────────────────────────────────────────────────
function gradeClass(letter) {
  const l = (letter || '').replace('+', 'plus').replace('-', 'minus').toLowerCase();
  return 'grade-' + l;
}
function gradeCardClass(letter) {
  if (letter === 'A+' || letter === 'A') return 'grade-a-plus';
  if (letter === 'B+') return 'grade-b-plus';
  return '';
}
function fireEmojis(score) {
  if (score >= 88) return '\u{1F525}\u{1F525}\u{1F525}\u{1F525}\u{1F525}';
  if (score >= 78) return '\u{1F525}\u{1F525}\u{1F525}\u{1F525}';
  if (score >= 68) return '\u{1F525}\u{1F525}\u{1F525}';
  if (score >= 56) return '\u{1F525}\u{1F525}';
  if (score >= 42) return '\u{1F525}';
  return '';
}
function letterGrade(score) {
  if (score >= 92) return 'A+';
  if (score >= 84) return 'A';
  if (score >= 76) return 'B+';
  if (score >= 66) return 'B';
  if (score >= 52) return 'C';
  if (score >= 38) return 'D';
  return 'F';
}
function runScoreClass(score) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}
function runScoreColor(score) {
  if (score >= 70) return '#00ff9c';
  if (score >= 40) return '#ffd000';
  return '#ff3b3b';
}

// ─── RENDER DISPATCHER ─────────────────────────────────────────────────────────
function render() {
  if (!view) return;
  if (state.loading) {
    view.innerHTML = '<div class="loading"><strong>Loading slate data...</strong><br>Fetching games, pitchers, and matchup grades.</div>';
    return;
  }
  const dateEl = document.getElementById('dateDisplay');
  if (dateEl) dateEl.textContent = state.selectedDate;
  const badge = document.getElementById('alertBadge');
  if (badge) badge.textContent = (state.alerts || []).filter(a => !a.read).length;

  switch (state.tab) {
    case 'games': view.innerHTML = renderGames(); break;
    case 'pitching': view.innerHTML = renderPitching(); break;
    case 'scouting': view.innerHTML = renderScouting(); break;
    case 'stacks': view.innerHTML = renderStacks(); break;
    case 'aistack': view.innerHTML = renderAIStack(); break;
    case 'optimizer': view.innerHTML = renderOptimizer(); break;
    case 'alerts': view.innerHTML = renderAlerts(); break;
    case 'pricing': view.innerHTML = renderPricing(); break;
    case 'settings': view.innerHTML = renderSettings(); break;
    default: view.innerHTML = renderGames();
  }
  attachEventListeners();
}

// ─── TAB 1: GAMES ──────────────────────────────────────────────────────────────
function renderGames() {
  if (!state.games.length) return '<div class="empty">No MLB games found for ' + escapeHtml(state.selectedDate) + '. Check back later.</div>';
  const sorted = state.games.slice().map(g => {
    const score = gameRunProjection(g);
    const desc = gameRunDescription(g, score);
    return { ...g, runScore: score, runDesc: desc };
  }).sort((a, b) => b.runScore - a.runScore);

  return '<section>' +
    '<div class="section-title"><h2>\u{1F3AE} GAMES — RUN PROJECTIONS</h2><div class="meta">' + sorted.length + ' games \u00B7 Sorted by projected run environment (100 = highest)</div></div>' +
    '<div class="grid-2">' +
    sorted.map((g, i) => {
      const sc = g.runScore;
      const cls = sc >= 70 ? 'top-game' : '';
      const m = getMarket(g);
      const park = parkFor(g.venue.name);
      const chips = [];
      if (m.total) chips.push('<span class="game-chip vegas">O/U ' + m.total + '</span>');
      if (m.temperature) chips.push('<span class="game-chip weather">' + m.temperature + '\u00B0F</span>');
      if (m.wind) chips.push('<span class="game-chip weather">' + m.wind + ' mph ' + (m.windDir || '') + '</span>');
      chips.push('<span class="game-chip park">Run ' + fmtNum(park.run, 2) + ' \u00B7 HR ' + fmtNum(park.hr, 2) + '</span>');

      return '<div class="card game-card ' + cls + '" data-game="' + g.gamePk + '">' +
        '<div style="display:flex;justify-content:space-between;align-items:start">' +
          '<div><span class="pill ' + gameBadge(g.status) + '">' + escapeHtml(g.status) + '</span> <span style="font-size:12px;color:var(--muted);margin-left:8px">' + fmtTime(g.gameDate) + '</span></div>' +
          '<div class="run-score ' + runScoreClass(sc) + '">' + sc + '</div>' +
        '</div>' +
        '<div class="game-score-bar"><div class="game-score-fill" style="width:' + sc + '%;background:' + runScoreColor(sc) + '"></div></div>' +
        '<div class="game-teams">' +
          '<span class="game-team">' + g.away.abbr + '</span>' +
          '<span class="game-vs">@</span>' +
          '<span class="game-team">' + g.home.abbr + '</span>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--muted)">' + escapeHtml(g.awayPitcher.name) + ' vs ' + escapeHtml(g.homePitcher.name) + ' \u00B7 ' + escapeHtml(g.venue.name) + '</div>' +
        '<div class="game-details">' + g.runDesc + '</div>' +
        '<div class="game-meta">' + chips.join('') + '</div>' +
      '</div>';
    }).join('') +
    '</div></section>';
}

// ─── TAB 2: PITCHING EDGE ─────────────────────────────────────────────────────
function renderPitching() {
  if (!state.games.length) return '<div class="empty">No games loaded.</div>';
  const pitchers = state.games.flatMap(g => [
    { p: g.awayPitcher, game: g, side: 'away', opp: g.home.abbr, team: g.away.abbr },
    { p: g.homePitcher, game: g, side: 'home', opp: g.away.abbr, team: g.home.abbr }
  ]).filter(x => x.p && x.p.name && x.p.name !== 'TBD')
   .map(x => ({ ...x, rank: pitcherEdgeRank(x.p, x.game, x.side), tend: pitcherTendencies(x.p) }))
   .sort((a, b) => b.rank - a.rank);

  return '<section>' +
    '<div class="section-title"><h2>\u26BE PITCHING EDGE</h2><div class="meta">' + pitchers.length + ' pitchers ranked by matchup edge \u00B7 Arsenal + Velocity + Prior Matchups</div></div>' +
    pitchers.map((x, i) => {
      const p = x.p;
      const era = Number(p.era || 4.3), k9 = Number(p.k9 || 8.6), whip = Number(p.whip || 1.3), hr9 = Number(p.hr9 || 1.15);
      const weak = pitcherWeakness(p);
      const park = parkFor(x.game.venue.name);
      const eraColor = era <= 3.0 ? '#00ff9c' : era <= 4.0 ? '#ffd000' : '#ff3b3b';
      const k9Color = k9 >= 10 ? '#00ff9c' : k9 >= 8 ? '#ffd000' : '#ff3b3b';
      const whipColor = whip <= 1.1 ? '#00ff9c' : whip <= 1.3 ? '#ffd000' : '#ff3b3b';
      const hr9Color = hr9 <= 1.0 ? '#00ff9c' : hr9 <= 1.2 ? '#ffd000' : '#ff3b3b';

      return '<div class="card pitcher-card" style="margin-bottom:14px">' +
        '<div style="display:flex;justify-content:space-between;align-items:start">' +
          '<div>' +
            '<div style="font-size:12px;color:var(--muted);font-weight:700">#' + (i + 1) + ' \u00B7 ' + x.team + ' \u00B7 ' + x.side.toUpperCase() + ' \u00B7 vs ' + x.opp + '</div>' +
            '<div class="pitcher-name">' + escapeHtml(p.name) + '</div>' +
            '<div class="pitcher-team">' + (p.pitchHand || 'R') + 'HP \u00B7 ' + (p.w || 0) + '-' + (p.l || 0) + ' \u00B7 ' + (p.ip || '-') + ' IP \u00B7 ' + escapeHtml(x.game.venue.name) + '</div>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<div style="font-family:Barlow Condensed;font-size:42px;font-weight:900;color:' + (x.rank >= 70 ? '#00ff9c' : x.rank >= 50 ? '#ffd000' : '#ff3b3b') + '">' + x.rank + '</div>' +
            '<div style="font-size:11px;color:var(--muted)">EDGE RANK</div>' +
          '</div>' +
        '</div>' +
        '<div class="pitcher-stats">' +
          '<div class="pitcher-stat"><div class="label">ERA</div><div class="value" style="color:' + eraColor + '">' + fmtNum(era, 2) + '</div></div>' +
          '<div class="pitcher-stat"><div class="label">K/9</div><div class="value" style="color:' + k9Color + '">' + fmtNum(k9, 1) + '</div></div>' +
          '<div class="pitcher-stat"><div class="label">WHIP</div><div class="value" style="color:' + whipColor + '">' + fmtNum(whip, 2) + '</div></div>' +
          '<div class="pitcher-stat"><div class="label">HR/9</div><div class="value" style="color:' + hr9Color + '">' + fmtNum(hr9, 2) + '</div></div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">' +
          '<span class="tag ' + (weak >= 70 ? 'smash' : weak >= 55 ? 'strong' : weak >= 45 ? 'watch' : 'fade') + '">Weakness: ' + weak + '</span>' +
          '<span class="tag ' + (x.tend.profile === 'Miss-bats starter' ? 'fade' : 'strong') + '">' + escapeHtml(x.tend.profile) + '</span>' +
          '<span class="game-chip park">Exp ' + fmtNum(x.tend.expIP, 1) + ' IP</span>' +
          '<span class="game-chip">Attack: ' + x.tend.attack + '</span>' +
        '</div>' +
        (x.tend.notes.length ? '<div style="font-size:12px;color:var(--muted);margin-top:8px">' + x.tend.notes.map(n => escapeHtml(n)).join(' \u00B7 ') + '</div>' : '') +
      '</div>';
    }).join('') +
    '</section>';
}

// ─── TAB 3: SCOUTING ──────────────────────────────────────────────────────────
function renderScouting() {
  if (!state.games.length) return '<div class="empty">Load a slate first to see scouting grades.</div>';
  // Collect all graded hitters across all games
  let allHitters = [];
  if (state.selectedGameData) {
    const g = state.selectedGameData;
    allHitters = [
      ...(g.awayHitters || []).map(h => ({ ...h, team: g.away.abbr, opp: g.home.abbr, oppP: g.homePitcher, venue: g.venue.name, side: 'away' })),
      ...(g.homeHitters || []).map(h => ({ ...h, team: g.home.abbr, opp: g.away.abbr, oppP: g.awayPitcher, venue: g.venue.name, side: 'home' }))
    ];
  }
  if (!allHitters.length) {
    return '<section><div class="section-title"><h2>\u{1F4CA} SCOUTING — BATTER GRADES</h2></div>' +
      '<div class="card" style="padding:20px"><p style="color:var(--muted)">Select a game from the Games tab to load scouting data. Click any game card to grade its hitters.</p></div></section>';
  }
  allHitters.sort((a, b) => b.grade.score - a.grade.score);

  // Game selector
  const gameSelect = '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">' +
    state.games.map(g => '<button class="button ' + (g.gamePk === state.selectedGamePk ? 'primary' : '') + '" data-game="' + g.gamePk + '" style="font-size:12px">' + g.away.abbr + ' @ ' + g.home.abbr + '</button>').join('') + '</div>';

  return '<section>' +
    '<div class="section-title"><h2>\u{1F4CA} SCOUTING — BATTER GRADES</h2><div class="meta">' + allHitters.length + ' batters graded A-F \u00B7 10-factor analysis \u00B7 ' + escapeHtml(state.selectedGameData.away.abbr) + ' @ ' + escapeHtml(state.selectedGameData.home.abbr) + '</div></div>' +
    gameSelect +
    allHitters.map((h, i) => {
      const g = h.grade;
      const dk = getDKSalary(h.name);
      const letter = g.letter || letterGrade(g.score);
      const fires = fireEmojis(g.score);
      const park = parkFor(h.venue || '');
      const m = state.selectedGameData ? getMarket(state.selectedGameData) : {};

      // 10-factor breakdown
      const factors = [
        { label: 'Batter Quality', value: fmtPct(h.avg) + ' AVG \u00B7 ' + fmtPct(h.ops) + ' OPS', color: h.ops >= .850 ? '#00ff9c' : h.ops >= .750 ? '#ffd000' : '#ff3b3b' },
        { label: 'Power Matchup', value: h.hr + ' HR \u00B7 ' + fmtPct(h.slg) + ' SLG', color: h.hr >= 20 ? '#00ff9c' : '#ffd000' },
        { label: 'Pitcher Weakness', value: 'vs ' + escapeHtml(h.oppP ? h.oppP.name : 'TBD') + ' (' + pitcherWeakness(h.oppP || {}) + ')', color: pitcherWeakness(h.oppP || {}) >= 65 ? '#00ff9c' : '#ffd000' },
        { label: 'Park Factor', value: escapeHtml(h.venue) + ' \u00B7 HR ' + fmtNum(park.hr, 2) + ' \u00B7 Run ' + fmtNum(park.run, 2), color: park.run >= 1.1 ? '#00ff9c' : '#94a3b8' },
        { label: 'Head to Head', value: g.splits ? g.splits.lrLabel + ' ' + fmtPct(g.splits.lrAvg) + ' AVG' : 'No H2H data', color: '#59a9ff' },
        { label: 'Pitch Arsenal', value: h.oppP ? (h.oppP.pitchHand || 'R') + 'HP \u00B7 K/9 ' + fmtNum(h.oppP.k9 || 8.6, 1) : '-', color: '#a78bfa' },
        { label: 'Platoon Split', value: (h.batSide || 'R') + ' bat \u00B7 ' + (g.splits ? g.splits.venueLabel : (h.side === 'home' ? 'Home' : 'Away')), color: '#59a9ff' },
        { label: 'Weather', value: m.temperature ? m.temperature + '\u00B0F \u00B7 ' + (m.wind || '0') + ' mph ' + (m.windDir || '') : 'No data', color: weatherScore(m) >= 60 ? '#00ff9c' : '#94a3b8' },
        { label: 'Lineup', value: h.lineupOrder ? '#' + h.lineupOrder + ' in order' : 'TBD', color: h.lineupOrder <= 4 ? '#00ff9c' : '#94a3b8' },
        { label: 'Vegas Odds', value: m.total ? 'O/U ' + m.total : 'No line', color: Number(m.total || 0) >= 9 ? '#00ff9c' : '#94a3b8' }
      ];

      // Synopsis
      const synParts = [];
      if (g.score >= 88) synParts.push(escapeHtml(h.name) + ' is an elite play today.');
      else if (g.score >= 78) synParts.push(escapeHtml(h.name) + ' grades as a strong play.');
      else if (g.score >= 66) synParts.push(escapeHtml(h.name) + ' is a solid option.');
      else synParts.push(escapeHtml(h.name) + ' is a risky play today.');
      if (g.reasons && g.reasons.length) synParts.push(g.reasons.slice(0, 4).map(r => escapeHtml(r)).join('. ') + '.');

      return '<div class="player-card ' + gradeCardClass(letter) + '">' +
        '<div class="player-avatar">\u{26BE}<span class="jersey">' + (h.lineupOrder || '-') + '</span></div>' +
        '<div>' +
          '<div class="player-name">' + escapeHtml(h.name) + '</div>' +
          '<div class="player-meta">' + escapeHtml(h.pos || '-') + ' \u00B7 ' + escapeHtml(h.team) + ' \u00B7 ' + (h.batSide || 'R') + ' bat \u00B7 vs ' + escapeHtml(h.opp) +
            (dk ? ' \u00B7 <strong style="color:#ffd000">$' + dk.salary.toLocaleString() + '</strong>' : '') + '</div>' +
          '<div class="factor-grid">' + factors.map(f =>
            '<div class="factor-chip"><div class="f-label">' + f.label + '</div><div class="f-value" style="color:' + f.color + '">' + f.value + '</div></div>'
          ).join('') + '</div>' +
          '<div class="synopsis">' + synParts.join(' ') + '</div>' +
        '</div>' +
        '<div class="player-grade">' +
          '<div class="grade ' + gradeClass(letter) + (letter === 'A+' ? ' grade-aplus-glow' : '') + '">' + letter + '</div>' +
          '<div class="score">' + g.score + '/99</div>' +
          '<div class="fires">' + fires + '</div>' +
        '</div>' +
      '</div>';
    }).join('') +
    '</section>';
}

// ─── TAB 4: STACK RECOMMENDATIONS ─────────────────────────────────────────────
function renderStacks() {
  const rec = buildStackRecommendation();
  if (!rec || !rec.picks.length) {
    return '<section><div class="section-title"><h2>\u{1F525} STACK RECOMMENDATIONS</h2></div>' +
      '<div class="card" style="padding:20px"><p style="color:var(--muted)">DraftKings salary data needed. Sync salaries in Settings or load a slate first.</p></div></section>';
  }

  return '<section>' +
    '<div class="section-title"><h2>\u{1F525} STACK RECOMMENDATIONS — 10 PLAYERS</h2><div class="meta">Best at each position \u00B7 DK salary optimized \u00B7 Total: $' + rec.totalSalary.toLocaleString() + ' \u00B7 Remaining: $' + rec.remaining.toLocaleString() + '</div></div>' +
    '<div class="card" style="padding:4px">' +
    rec.picks.map((p, i) => {
      const isP = p.posSlot === 'SP';
      return '<div class="stack-position">' +
        '<div class="stack-pos-label">' + escapeHtml(p.posLabel) + '</div>' +
        '<div>' +
          '<div class="stack-player">' + escapeHtml(p.name) + '</div>' +
          '<div class="stack-detail">' + escapeHtml(p.team) + ' \u00B7 ' + escapeHtml(p.pos) + ' \u00B7 vs ' + escapeHtml(p.oppPitcherName) + ' \u00B7 ' + escapeHtml(p.venue) + ' \u00B7 Grade: ' + p.score + '/99</div>' +
        '</div>' +
        '<div class="stack-salary">$' + (p.salary || 0).toLocaleString() + '</div>' +
      '</div>';
    }).join('') +
    '</div>' +
    '<div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">' +
      '<div class="stat-box" style="flex:1"><div class="label">TOTAL SALARY</div><div class="value" style="color:' + (rec.totalSalary <= 50000 ? '#00ff9c' : '#ff3b3b') + '">$' + rec.totalSalary.toLocaleString() + '</div><div class="detail">of $50,000 cap</div></div>' +
      '<div class="stat-box" style="flex:1"><div class="label">REMAINING</div><div class="value" style="color:#ffd000">$' + rec.remaining.toLocaleString() + '</div></div>' +
      '<div class="stat-box" style="flex:1"><div class="label">POSITIONS</div><div class="value">' + rec.picks.length + '/10</div><div class="detail">' + (rec.valid ? '\u2705 Valid lineup' : '\u274C Incomplete') + '</div></div>' +
    '</div>' +
    '</section>';
}

// ─── TAB 5: AI STACK ──────────────────────────────────────────────────────────
function renderAIStack() {
  const stacks = buildSmartStacks();
  return '<section>' +
    '<div class="section-title"><h2>\u{1F916} AI STACK — 5 LINEUPS</h2><div class="meta">AI-generated lineups using ownership, odds, grades \u00B7 Built for GPP tournaments</div></div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">' +
      '<button class="button ' + (state.aiMode === 'picks' ? 'primary' : '') + '" onclick="state.aiMode=\'picks\';render()">Top Picks</button>' +
      '<button class="button ' + (state.aiMode === 'stacks' ? 'primary' : '') + '" onclick="state.aiMode=\'stacks\';render()">Stack Ranks</button>' +
      '<button class="button ' + (state.aiMode === 'edges' ? 'primary' : '') + '" onclick="state.aiMode=\'edges\';render()">Sharp Edges</button>' +
      '<button class="button primary" onclick="generateAIPicks()" id="aiGenBtn">' + (state.aiLoading ? 'Generating...' : '\u26A1 Generate AI Lineups') + '</button>' +
    '</div>' +
    (state.aiError ? '<div class="card" style="padding:16px;border-color:rgba(255,59,59,.3);margin-bottom:14px"><p style="color:#ff6b6b">' + escapeHtml(state.aiError) + '</p></div>' : '') +
    (state.aiLoading ? '<div class="loading"><strong>Claude AI is analyzing ' + state.games.length + ' games...</strong><br>Generating optimal lineups based on ownership, odds, and grades.</div>' : '') +
    // Show AI result
    (state.aiResult && !state.aiLoading ? '<div class="card" style="padding:20px;margin-bottom:16px"><div style="display:flex;justify-content:space-between;margin-bottom:12px"><div style="font-size:11px;color:#00ff9c;font-weight:800;letter-spacing:2px">CLAUDE AI ANALYSIS \u00B7 ' + escapeHtml(state.aiResultMode || state.aiMode) + ' \u00B7 ' + escapeHtml(state.aiResultDate || state.selectedDate) + '</div><button class="button" onclick="navigator.clipboard.writeText(document.getElementById(\'aiOut\').innerText)">Copy</button></div><div id="aiOut" style="white-space:pre-wrap;font-size:13px;line-height:1.7;color:#c8d8e8">' + escapeHtml(state.aiResult) + '</div></div>' : '') +
    // Show computed stacks
    (stacks.length ? stacks.slice(0, 5).map((s, i) =>
      '<div class="lineup-card" style="margin-bottom:14px">' +
        '<div class="lineup-header">' +
          '<div class="lineup-label">LINEUP ' + (i + 1) + ' \u00B7 ' + escapeHtml(s.stackTeam) + ' STACK</div>' +
          '<div class="lineup-total">$' + s.totalSalary.toLocaleString() + ' \u00B7 ' + s.projPts + ' proj pts \u00B7 ' + (s.valid ? '\u2705' : '\u274C') + '</div>' +
        '</div>' +
        '<div class="lineup-row"><div class="lineup-pos">SP1</div><div>' + escapeHtml(s.sp1.name) + ' \u00B7 ' + escapeHtml(s.sp1.team) + '</div><div style="color:#ffd000">$' + (s.sp1.salary || 0).toLocaleString() + '</div></div>' +
        '<div class="lineup-row"><div class="lineup-pos">SP2</div><div>' + escapeHtml(s.sp2.name) + ' \u00B7 ' + escapeHtml(s.sp2.team) + '</div><div style="color:#ffd000">$' + (s.sp2.salary || 0).toLocaleString() + '</div></div>' +
        s.hitters.map(h => '<div class="lineup-row"><div class="lineup-pos">' + escapeHtml(h.slot) + '</div><div>' + escapeHtml(h.name) + ' \u00B7 ' + escapeHtml(h.team) + (h.isStackTeam ? ' \u{1F525}' : '') + '</div><div style="color:#ffd000">$' + (h.salary || 0).toLocaleString() + '</div></div>').join('') +
      '</div>'
    ).join('') : (!state.aiResult && !state.aiLoading ? '<div class="card empty">Click "Generate AI Lineups" to build 5 optimized lineups. Requires DK salaries synced.</div>' : '')) +
    '</section>';
}

// ─── TAB 6: OPTIMIZER ─────────────────────────────────────────────────────────
function renderOptimizer() {
  return '<section>' +
    '<div class="section-title"><h2>\u{1F527} DK LINEUP OPTIMIZER</h2><div class="meta">DraftKings $50,000 salary cap \u00B7 10 players</div></div>' +
    '<div class="card" style="padding:20px;margin-bottom:16px">' +
      '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">' +
        '<label style="flex:1;min-width:200px"><span style="font-size:11px;color:var(--muted);font-weight:700;letter-spacing:1px;display:block;margin-bottom:6px">STACK TEAM (optional)</span>' +
          '<select id="optStackTeam" class="field" style="width:100%">' +
            '<option value="">No stack preference</option>' +
            state.games.map(g => '<option value="' + g.home.abbr + '">' + g.home.abbr + '</option><option value="' + g.away.abbr + '">' + g.away.abbr + '</option>').join('') +
          '</select></label>' +
        '<button class="button primary" onclick="runOptimizer()" style="height:42px">\u{1F3AF} Optimize Lineup</button>' +
      '</div>' +
    '</div>' +
    (state.optimizerResult ? renderOptimizerResult(state.optimizerResult) : '<div class="card empty">Click Optimize to generate the best DraftKings lineup.</div>') +
    '</section>';
}

function renderOptimizerResult(r) {
  if (!r) return '';
  return '<div class="lineup-card">' +
    '<div class="lineup-header">' +
      '<div class="lineup-label">OPTIMIZED LINEUP</div>' +
      '<div class="lineup-total">$' + r.totalSalary.toLocaleString() + ' / $50,000 \u00B7 ' + fmtNum(r.projScore, 1) + ' proj \u00B7 ' + (r.valid ? '\u2705 Valid' : '\u274C Invalid') + '</div>' +
    '</div>' +
    r.lineup.map(p =>
      '<div class="lineup-row">' +
        '<div class="lineup-pos">' + escapeHtml(p.slotLabel || p.pos) + '</div>' +
        '<div><strong>' + escapeHtml(p.name) + '</strong> \u00B7 ' + escapeHtml(p.team) + ' \u00B7 Grade ' + p.score + '/99</div>' +
        '<div style="color:#ffd000;font-family:JetBrains Mono;font-weight:700">$' + (p.salary || 0).toLocaleString() + '</div>' +
      '</div>'
    ).join('') +
    '</div>' +
    '<div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">' +
      '<div class="stat-box" style="flex:1"><div class="label">SALARY USED</div><div class="value" style="color:' + (r.totalSalary <= 50000 ? '#00ff9c' : '#ff3b3b') + '">$' + r.totalSalary.toLocaleString() + '</div></div>' +
      '<div class="stat-box" style="flex:1"><div class="label">REMAINING</div><div class="value" style="color:#ffd000">$' + r.remaining.toLocaleString() + '</div></div>' +
      '<div class="stat-box" style="flex:1"><div class="label">PROJECTED</div><div class="value">' + fmtNum(r.projScore, 1) + '</div><div class="detail">fantasy points</div></div>' +
    '</div>';
}

// ─── TAB 7: ALERTS ────────────────────────────────────────────────────────────
function renderAlerts() {
  const alerts = state.alerts || [];
  return '<section>' +
    '<div class="section-title"><h2>\u{1F514} LIVE ALERTS</h2><div class="meta">' + alerts.length + ' alerts \u00B7 Injuries, weather, lineups, and MLB news</div></div>' +
    '<div style="display:flex;gap:10px;margin-bottom:16px">' +
      '<button class="button primary" onclick="refreshAlerts()">Refresh Alerts</button>' +
      '<button class="button" onclick="clearAlerts()">Clear All</button>' +
    '</div>' +
    (alerts.length ? alerts.map(a => {
      const icons = { injury: '\u{1F6D1}', weather: '\u{1F326}', lineup: '\u{1F4CB}', news: '\u{1F4F0}' };
      return '<div class="alert-item ' + (a.type || 'news') + '">' +
        '<div class="alert-icon">' + (icons[a.type] || '\u{1F4F0}') + '</div>' +
        '<div class="alert-content">' +
          '<div class="alert-title">' + escapeHtml(a.title) + '</div>' +
          '<div class="alert-body">' + escapeHtml(a.body) + '</div>' +
          '<div class="alert-time">' + fmtStamp(a.time) + '</div>' +
        '</div>' +
      '</div>';
    }).join('') : '<div class="card empty">No alerts yet. Alerts will appear when games load — weather changes, pitcher vulnerabilities, and lineup updates.</div>') +
    '</section>';
}

// ─── PRICING TAB ──────────────────────────────────────────────────────────────
function renderPricing() {
  return '<section>' +
    '<div class="section-title"><h2>\u{1F4B0} CHOOSE YOUR PLAN</h2><div class="meta">Unlock the full ALLDAY EDGE suite</div></div>' +
    '<div class="pricing-grid">' +
      '<div class="price-card"><div class="plan-name">STARTER</div><div class="plan-price">$19<span style="font-size:24px">.99</span></div><div class="plan-period">/month</div>' +
        '<ul><li>\u2705 Daily game ratings (0-100)</li><li>\u2705 Basic player grades</li><li>\u2705 Weather + park factors</li><li>\u2705 Pitching edge overview</li><li>\u2705 Mobile friendly</li></ul>' +
        '<button class="button" style="width:100%;margin-top:auto" onclick="startStripeCheckout(\'starter\')">Get Started \u2014 $19.99/mo</button></div>' +
      '<div class="price-card featured"><div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#ffd000,#ffb800);color:#060e1a;font-size:11px;font-weight:800;padding:4px 16px;border-radius:20px;letter-spacing:1px">MOST POPULAR</div><div class="plan-name" style="color:#ffd000">VETERAN</div><div class="plan-price">$49<span style="font-size:24px">.99</span></div><div class="plan-period">/month</div>' +
        '<ul><li>\u2705 Everything in Starter</li><li>\u2705 Full scouting reports</li><li>\u2705 Stack recommendations</li><li>\u2705 DK salary optimizer</li><li>\u2705 Pitcher arsenal breakdown</li><li>\u2705 Live alerts</li></ul>' +
        '<button class="button gold" style="width:100%;margin-top:auto" onclick="startStripeCheckout(\'veteran\')">Subscribe \u2014 $49.99/mo</button></div>' +
      '<div class="price-card" style="border-color:rgba(0,255,156,.35);box-shadow:0 0 30px rgba(0,255,156,.08)"><div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#00ff9c,#00cc7d);color:#060e1a;font-size:11px;font-weight:800;padding:4px 16px;border-radius:20px;letter-spacing:1px">BEST VALUE</div><div class="plan-name" style="color:#00ff9c">ELITE PRO</div><div class="plan-price">$99<span style="font-size:24px">.99</span></div><div class="plan-period">/month</div>' +
        '<ul><li>\u2705 Everything in Veteran</li><li>\u2705 5 AI-generated lineups daily</li><li>\u2705 Multi-AI analysis</li><li>\u2705 Advanced ownership projections</li><li>\u2705 Vegas sharp edges</li><li>\u2705 Priority support</li></ul>' +
        '<button class="button primary" style="width:100%;margin-top:auto" onclick="startStripeCheckout(\'elite\')">Subscribe \u2014 $99.99/mo</button></div>' +
    '</div>' +
    '<div style="text-align:center;margin-top:20px;font-size:12px;color:var(--muted)">All plans billed monthly. No contracts. Cancel anytime. Secured by Stripe.</div>' +
    '</section>';
}

// ─── SETTINGS TAB ─────────────────────────────────────────────────────────────
function renderSettings() {
  return '<section>' +
    '<div class="section-title"><h2>\u2699 SETTINGS</h2></div>' +
    '<div class="settings-grid">' +
      '<div class="settings-card"><h3>Backend API</h3>' +
        '<label>Backend URL<input id="cfgBackend" class="field" value="' + escapeHtml(state.apiConfig.proxyBaseUrl || 'https://newest-mlb-1.onrender.com') + '" /></label>' +
        '<label>Odds API Key<input id="cfgOddsKey" class="field" value="' + escapeHtml(state.apiConfig.oddsApiKey || '') + '" placeholder="Your odds API key" /></label>' +
        '<button class="button primary" onclick="saveSettingsFromUI()" style="margin-top:10px">Save Settings</button></div>' +
      '<div class="settings-card"><h3>DK Salaries</h3>' +
        '<div style="font-size:13px;color:var(--muted);margin-bottom:10px">Status: ' + (state.dkSyncStatus.status === 'ok' ? '<span style="color:#00ff9c">Synced</span>' : state.dkSyncStatus.status === 'loading' ? 'Syncing...' : '<span style="color:#ff3b3b">' + escapeHtml(state.dkSyncStatus.error || 'Not synced') + '</span>') + '</div>' +
        '<div style="font-size:12px;color:var(--muted);margin-bottom:10px">' + Object.keys(state.dkSalaries || {}).length + ' players loaded</div>' +
        '<button class="button" onclick="syncDKSalaries().then(render)">Sync DK Salaries</button></div>' +
      '<div class="settings-card"><h3>Live Data</h3>' +
        '<button class="button" onclick="syncWeatherForSlate()" style="margin-bottom:8px">Sync Weather</button>' +
        '<button class="button" onclick="syncOddsForSlate()">Sync Odds</button>' +
        '<div style="font-size:12px;color:var(--muted);margin-top:10px">Weather: ' + (state.liveSync.weather.status || 'idle') + ' \u00B7 Odds: ' + (state.liveSync.odds.status || 'idle') + '</div></div>' +
      '<div class="settings-card"><h3>Account</h3>' +
        '<div style="font-size:13px;color:var(--muted);margin-bottom:10px">' + escapeHtml(getAccessProfile().email || 'Not logged in') + '</div>' +
        '<button class="button" onclick="openBillingPortal()">Manage Billing</button>' +
        '<button class="button danger" onclick="logout()" style="margin-top:8px">Logout</button></div>' +
    '</div></section>';
}

// ─── EVENT LISTENERS ──────────────────────────────────────────────────────────
function attachEventListeners() {
  // Game card clicks
  document.querySelectorAll('[data-game]').forEach(el => {
    el.onclick = function () {
      const pk = Number(this.dataset.game);
      if (pk && pk !== state.selectedGamePk) {
        loadSelectedGame(pk).then(render);
      }
    };
  });
}

// ─── AI PICKS GENERATOR ───────────────────────────────────────────────────────
async function generateAIPicks() {
  if (state.aiLoading) return;
  state.aiLoading = true;
  state.aiError = '';
  state.aiResult = '';
  render();
  try {
    const games = state.games.map(g => ({
      away: g.away.abbr, home: g.home.abbr,
      awayPitcher: g.awayPitcher.name, homePitcher: g.homePitcher.name,
      venue: g.venue.name, time: fmtTime(g.gameDate),
      awayEra: g.awayPitcher.era, homeEra: g.homePitcher.era,
      park: parkFor(g.venue.name)
    }));
    const dkSals = Object.values(state.dkSalaries || {}).slice(0, 100).map(p => ({
      name: p.name, pos: p.pos, salary: p.salary, team: p.team, avgPts: p.avgPts
    }));
    const resp = await fetch('/.netlify/functions/ai-picks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ games, date: state.selectedDate, mode: state.aiMode, dkSalaries: dkSals })
    });
    const data = await resp.json();
    if (data.error) throw new Error(data.error);
    state.aiResult = data.result || data.claude || data.text || JSON.stringify(data);
    state.aiResultMode = state.aiMode;
    state.aiResultDate = state.selectedDate;
  } catch (err) {
    state.aiError = err.message || 'AI generation failed. Check your connection.';
  } finally {
    state.aiLoading = false;
    render();
  }
}

// ─── OPTIMIZER RUNNER ─────────────────────────────────────────────────────────
function runOptimizer() {
  const sel = document.getElementById('optStackTeam');
  state.optimizerStackTeam = sel ? sel.value : '';
  state.optimizerResult = optimizeDKLineup(state.optimizerStackTeam);
  render();
}

// ─── ALERT HELPERS ────────────────────────────────────────────────────────────
function refreshAlerts() {
  generateSlateAlerts();
  render();
}
function clearAlerts() {
  state.alerts = [];
  localStorage.setItem('mlb-edge-alerts', '[]');
  render();
}

// ─── SETTINGS SAVE ────────────────────────────────────────────────────────────
function saveSettingsFromUI() {
  const backend = document.getElementById('cfgBackend');
  const oddsKey = document.getElementById('cfgOddsKey');
  if (backend) state.apiConfig.proxyBaseUrl = backend.value.trim();
  if (oddsKey) state.apiConfig.oddsApiKey = oddsKey.value.trim();
  localStorage.setItem('mlb-edge-api-config', JSON.stringify(state.apiConfig));
  render();
}

// ─── AUTH GATE ────────────────────────────────────────────────────────────────
function loginWithToken() {
  const backend = document.getElementById('agBackend');
  const email = document.getElementById('agEmail');
  const token = document.getElementById('agToken');
  if (backend && backend.value) state.apiConfig.proxyBaseUrl = backend.value.trim();
  if (email && email.value) {
    setAccessProfile({ email: email.value.trim(), apiBase: state.apiConfig.proxyBaseUrl });
  }
  if (token && token.value) {
    localStorage.setItem('allday-mlb-edge-token', token.value.trim());
  }
  localStorage.setItem('mlb-edge-api-config', JSON.stringify(state.apiConfig));
  hideAuthGate();
}

async function claimAccess() {
  const email = document.getElementById('agEmail');
  const backend = document.getElementById('agBackend');
  const msg = document.getElementById('agMsg');
  if (!email || !email.value) { showMsg(msg, 'Enter your email.', '#ff3b3b'); return; }
  if (backend && backend.value) state.apiConfig.proxyBaseUrl = backend.value.trim();
  const base = state.apiConfig.proxyBaseUrl || 'https://newest-mlb-1.onrender.com';
  try {
    showMsg(msg, 'Claiming access...', '#ffd000');
    const resp = await fetch(base.replace(/\/$/, '') + '/api/auth/claim', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value.trim() })
    });
    const data = await resp.json();
    if (data.token) {
      localStorage.setItem('allday-mlb-edge-token', data.token);
      setAccessProfile({ email: email.value.trim(), apiBase: base, plan: data.plan || 'free' });
      showMsg(msg, 'Access granted! Loading...', '#00ff9c');
      setTimeout(hideAuthGate, 800);
    } else {
      showMsg(msg, data.error || 'Could not claim access.', '#ff3b3b');
    }
  } catch (err) {
    showMsg(msg, 'Connection failed: ' + err.message, '#ff3b3b');
  }
}

function enterFreeMode() {
  setAccessProfile({ email: 'free@allday.edge', apiBase: state.apiConfig.proxyBaseUrl || 'https://newest-mlb-1.onrender.com', plan: 'free' });
  hideAuthGate();
}

function hideAuthGate() {
  const gate = document.getElementById('authGate');
  if (gate) gate.classList.add('hidden');
  loadSlate();
}

function checkAuth() {
  const profile = getAccessProfile();
  const token = localStorage.getItem('allday-mlb-edge-token');
  if (profile.email || token) {
    hideAuthGate();
  }
}

function logout() {
  localStorage.removeItem('allday-mlb-edge-token');
  localStorage.removeItem('allday-mlb-edge-access');
  location.reload();
}

function showMsg(el, text, color) {
  if (!el) return;
  el.style.display = 'block';
  el.style.color = color;
  el.textContent = text;
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  checkAuth();
  // Set up auto-refresh (default 5 min)
  setAutoRefresh(300000);
});

// Expose functions globally
window.render = render;
window.generateAIPicks = generateAIPicks;
window.runOptimizer = runOptimizer;
window.refreshAlerts = refreshAlerts;
window.clearAlerts = clearAlerts;
window.saveSettingsFromUI = saveSettingsFromUI;
window.loginWithToken = loginWithToken;
window.claimAccess = claimAccess;
window.enterFreeMode = enterFreeMode;
window.logout = logout;
window.startCheckout = startCheckout;
