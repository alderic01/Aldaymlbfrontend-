// ═══════════════════════════════════════════════════════════════════════════════
// ALLDAY EDGE — App Main Renderer (v2.0)
// 7 Tabs: Games, Pitching Edge, Scouting, Stack Recs, AI Stack, Optimizer, Alerts
// ═══════════════════════════════════════════════════════════════════════════════

// view element is declared in app-core.js as: const view = document.querySelector('#view');

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
  if (!view) { console.error('RENDER: #view element not found'); return; }
  if (state.loading) {
    view.innerHTML = '<div class="loading"><strong>Loading slate data...</strong><br>Fetching games from MLB API for ' + (state.selectedDate || 'today') + '...<br><br><span style="font-size:12px;color:#475569">If this takes more than 15 seconds, the MLB API may be slow or have no games scheduled for this date.</span></div>';
    return;
  }
  if (!state.games || !state.games.length) {
    view.innerHTML = '<div class="empty" style="padding:40px"><h2 style="margin-bottom:12px">No Games Found</h2><p style="color:var(--muted)">No MLB games found for <strong>' + escapeHtml(state.selectedDate) + '</strong>.</p><p style="color:var(--muted);margin-top:8px">The MLB season typically runs April through October. If games should be available, try refreshing.</p><button class="button primary" onclick="loadSlate()" style="margin-top:16px">Retry</button></div>';
    return;
  }
  const dateEl = document.getElementById('dateDisplay');
  if (dateEl) dateEl.textContent = state.selectedDate;
  const badge = document.getElementById('alertBadge');
  if (badge) badge.textContent = (state.alerts || []).filter(a => !a.read).length;

  switch (state.tab) {
    case 'dashboard': view.innerHTML = renderDashboard(); break;
    case 'games': view.innerHTML = renderGames(); break;
    case 'pitching': view.innerHTML = renderPitching(); break;
    case 'scouting': view.innerHTML = renderScouting(); break;
    case 'stacks': view.innerHTML = renderStacks(); break;
    case 'aistack': view.innerHTML = renderAIStack(); break;
    case 'optimizer': view.innerHTML = renderOptimizer(); break;
    case 'alerts': view.innerHTML = renderAlerts(); break;
    case 'pricing': view.innerHTML = renderPricing(); break;
    case 'settings': view.innerHTML = renderSettings(); break;
    default: view.innerHTML = renderDashboard();
  }
  attachEventListeners();
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function renderDashboard() {
  if (!state.games.length) return '<div class="empty">Loading slate data...</div>';

  // Live + upcoming games ticker
  var liveGames = state.games.filter(function(g) { return g.status === 'Live'; });
  var upcomingGames = state.games.filter(function(g) { return g.status !== 'Live' && g.status !== 'Final'; });
  var finalGames = state.games.filter(function(g) { return g.status === 'Final'; });
  var allSorted = liveGames.concat(upcomingGames).concat(finalGames);

  // Top stack targets
  var topStacks = state.stackRows.slice(0, 5);

  // Top attackable pitchers
  var topPitchers = getTopAttackablePitchers();

  // Top graded hitters (from selected game)
  var topHitters = [];
  if (state.selectedGameData) {
    topHitters = [].concat(state.selectedGameData.awayHitters || []).concat(state.selectedGameData.homeHitters || []).sort(function(a,b) { return b.grade.score - a.grade.score; }).slice(0, 4);
  }

  // DK salary count
  var dkCount = Object.keys(state.dkSalaries || {}).length;

  return '<div class="dash">' +

    // Row 1: Live Games Ticker
    '<div class="dash-section">' +
      '<div class="dash-header"><span class="dash-dot live"></span> LIVE & UPCOMING <span class="dash-count">' + state.games.length + ' games</span></div>' +
      '<div class="dash-ticker">' +
        allSorted.slice(0, 8).map(function(g) {
          var isLive = g.status === 'Live';
          var isFinal = g.status === 'Final';
          return '<div class="dash-game ' + (isLive ? 'live' : (isFinal ? 'final' : '')) + '" data-game="' + g.gamePk + '">' +
            '<div class="dash-game-status">' + (isLive ? '<span class="dash-live-dot"></span> LIVE' : (isFinal ? 'FINAL' : fmtTime(g.gameDate))) + '</div>' +
            '<div class="dash-game-teams">' +
              '<div class="dash-game-row"><span class="dash-team">' + g.away.abbr + '</span><span class="dash-score">' + g.away.score + '</span></div>' +
              '<div class="dash-game-row"><span class="dash-team">' + g.home.abbr + '</span><span class="dash-score">' + g.home.score + '</span></div>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>' +

    // Row 2: Two columns — Top Players + Attack Momentum
    '<div class="dash-grid-2">' +

      // Top Players
      '<div class="dash-card">' +
        '<div class="dash-card-title">TOP PLAYERS</div>' +
        '<div class="dash-players">' +
          (topHitters.length ? topHitters.map(function(h) {
            var letter = h.grade.letter || letterGrade(h.grade.score);
            var gradeColor = h.grade.score >= 88 ? '#00ff9c' : h.grade.score >= 78 ? '#00e88a' : h.grade.score >= 66 ? '#ffd000' : '#ff9f43';
            var tc = {NYY:'#003087',BOS:'#BD3039',LAD:'#005A9C',ATL:'#CE1141',HOU:'#EB6E1F',NYM:'#002D72',PHI:'#E81828',SD:'#2F241D',SF:'#FD5A1E',CHC:'#0E3386',STL:'#C41E3A',MIL:'#FFC52F',CIN:'#C6011F',PIT:'#FDB827',ARI:'#A71930',COL:'#33006F',MIA:'#00A3E0',WSH:'#AB0003',TB:'#092C5C',BAL:'#DF4601',CLE:'#00385D',DET:'#0C2340',KC:'#004687',MIN:'#002B5C',CWS:'#27251F',TEX:'#003278',LAA:'#BA0021',SEA:'#0C2C56',OAK:'#003831',TOR:'#134A8E',ATH:'#003831'};
            var teamC = tc[h.team || ''] || '#1e293b';
            return '<div class="dash-player">' +
              '<div class="dash-player-avatar" style="border-color:' + teamC + ';background:linear-gradient(135deg,' + teamC + '33,rgba(6,14,26,.8))">' +
                '<svg viewBox="0 0 64 80" width="28" height="35" fill="none"><circle cx="32" cy="16" r="12" fill="' + teamC + '" opacity=".9"/><path d="M20 36c0-6.6 5.4-12 12-12s12 5.4 12 12v20c0 2.2-1.8 4-4 4H24c-2.2 0-4-1.8-4-4V36z" fill="' + teamC + '" opacity=".8"/><rect x="42" y="24" width="4" height="32" rx="2" transform="rotate(30 42 24)" fill="' + teamC + '" opacity=".6"/></svg>' +
              '</div>' +
              '<div class="dash-player-info">' +
                '<div class="dash-player-name">' + escapeHtml(h.name) + '</div>' +
                '<div class="dash-player-pos">' + escapeHtml(h.pos || '-') + '</div>' +
              '</div>' +
              '<div class="dash-player-grade" style="color:' + gradeColor + '">' + letter + '</div>' +
              '<div class="dash-player-score">' + h.grade.score + '</div>' +
            '</div>';
          }).join('') : '<div style="color:var(--muted);font-size:13px;padding:12px">Select a game to see top players</div>') +
        '</div>' +
      '</div>' +

      // Stack Momentum / Best Targets
      '<div class="dash-card">' +
        '<div class="dash-card-title">ATTACK TARGETS</div>' +
        '<div class="dash-targets">' +
          topPitchers.map(function(p) {
            var pct = Math.min(100, Math.round(p.weak * 1.1));
            var color = p.weak >= 70 ? '#00ff9c' : p.weak >= 55 ? '#ffd000' : '#ff3b3b';
            return '<div class="dash-target">' +
              '<div class="dash-target-info">' +
                '<span class="dash-target-name">' + escapeHtml(p.name) + '</span>' +
                '<span class="dash-target-opp">Stack ' + p.opp + '</span>' +
              '</div>' +
              '<div class="dash-target-bar"><div class="dash-target-fill" style="width:' + pct + '%;background:' + color + '"></div></div>' +
              '<div class="dash-target-val" style="color:' + color + '">' + p.weak + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +

    '</div>' +

    // Row 3: Stats Table + Quick Info
    '<div class="dash-grid-2">' +

      // Stack Rankings Table
      '<div class="dash-card">' +
        '<div class="dash-card-title">STACK RANKINGS <span style="color:var(--muted);font-weight:400;font-size:11px">\u2192</span></div>' +
        '<table class="dash-table">' +
          '<thead><tr><th>Team</th><th>Side</th><th>Opp</th><th>Score</th><th>Level</th></tr></thead>' +
          '<tbody>' +
            topStacks.map(function(r) {
              return '<tr>' +
                '<td><strong>' + r.team + '</strong></td>' +
                '<td>' + r.side + '</td>' +
                '<td>' + r.opponent + '</td>' +
                '<td class="mono" style="color:' + (r.score >= 80 ? '#00ff9c' : r.score >= 65 ? '#ffd000' : '#94a3b8') + '">' + r.score + '</td>' +
                '<td><span class="tag ' + r.style + '" style="font-size:10px;padding:3px 8px">' + r.level + '</span></td>' +
              '</tr>';
            }).join('') +
          '</tbody>' +
        '</table>' +
      '</div>' +

      // Quick Stats / Status
      '<div class="dash-card">' +
        '<div class="dash-card-title">SLATE STATUS</div>' +
        '<div class="dash-status-grid">' +
          '<div class="dash-status-item"><div class="dash-status-val" style="color:#00ff9c">' + state.games.length + '</div><div class="dash-status-lbl">Games</div></div>' +
          '<div class="dash-status-item"><div class="dash-status-val" style="color:#ff3b3b">' + liveGames.length + '</div><div class="dash-status-lbl">Live Now</div></div>' +
          '<div class="dash-status-item"><div class="dash-status-val" style="color:#ffd000">' + dkCount + '</div><div class="dash-status-lbl">DK Players</div></div>' +
          '<div class="dash-status-item"><div class="dash-status-val">' + (topStacks[0] ? topStacks[0].team : '-') + '</div><div class="dash-status-lbl">Top Stack</div></div>' +
          '<div class="dash-status-item"><div class="dash-status-val">' + (topStacks[0] ? topStacks[0].score : '-') + '</div><div class="dash-status-lbl">Best Score</div></div>' +
          '<div class="dash-status-item"><div class="dash-status-val">' + state.hero.avg + '</div><div class="dash-status-lbl">Avg Score</div></div>' +
        '</div>' +
        // Quick nav buttons
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">' +
          '<button class="button primary" onclick="switchTab(\'games\')" style="font-size:12px">\u{1F3AE} Games</button>' +
          '<button class="button" onclick="switchTab(\'scouting\')" style="font-size:12px">\u{1F4CA} Scouting</button>' +
          '<button class="button" onclick="switchTab(\'aistack\')" style="font-size:12px">\u{1F916} AI Stack</button>' +
          '<button class="button" onclick="switchTab(\'alerts\')" style="font-size:12px">\u{1F514} Alerts</button>' +
        '</div>' +
      '</div>' +

    '</div>' +

  '</div>';
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
        // Matchup analysis section
        '<div style="margin-top:12px;padding:12px;border-radius:12px;background:rgba(6,14,26,.4);border:1px solid rgba(30,41,59,.4)">' +
          '<div style="font-size:10px;color:var(--muted);font-weight:800;letter-spacing:1px;margin-bottom:8px">MATCHUP ANALYSIS vs ' + x.opp + '</div>' +
          '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:12px">' +
            '<div><span style="color:var(--muted)">Vulnerability:</span> <strong style="color:' + (weak >= 70 ? '#00ff9c' : weak >= 55 ? '#ffd000' : '#ff3b3b') + '">' + weak + '/100</strong></div>' +
            '<div><span style="color:var(--muted)">Profile:</span> <strong>' + escapeHtml(x.tend.profile) + '</strong></div>' +
            '<div><span style="color:var(--muted)">Exp IP:</span> <strong>' + fmtNum(x.tend.expIP, 1) + '</strong></div>' +
            '<div><span style="color:var(--muted)">Attack Score:</span> <strong style="color:' + (x.tend.attack >= 65 ? '#00ff9c' : x.tend.attack >= 50 ? '#ffd000' : '#ff3b3b') + '">' + x.tend.attack + '/90</strong></div>' +
            '<div><span style="color:var(--muted)">Hand:</span> <strong>' + (p.pitchHand || 'R') + 'HP</strong></div>' +
            '<div><span style="color:var(--muted)">Park:</span> <strong>' + fmtNum(park.run, 2) + 'x run</strong></div>' +
          '</div>' +
        '</div>' +
        // Platoon matchup
        '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">' +
          '<span class="tag ' + (weak >= 70 ? 'smash' : weak >= 55 ? 'strong' : weak >= 45 ? 'watch' : 'fade') + '">' + (weak >= 70 ? '\u{1F525} SMASH SPOT' : weak >= 55 ? 'ATTACKABLE' : weak >= 45 ? 'HOLD' : '\u{1F6E1} ACE') + '</span>' +
          (p.pitchHand === 'L' ? '<span class="tag strong">LHP \u2014 Stack RHB</span>' : '<span class="tag watch">RHP \u2014 Stack LHB</span>') +
          (park.hr >= 1.15 ? '<span class="tag smash">\u{1F525} HR PARK</span>' : '') +
          (park.run <= 0.92 ? '<span class="tag fade">\u2744 PITCHER PARK</span>' : '') +
          (x.tend.expIP <= 5.0 ? '<span class="tag strong">SHORT OUTING \u2014 Bullpen game</span>' : '') +
          (hr9 >= 1.3 ? '<span class="tag smash">HR PRONE</span>' : '') +
          (k9 >= 10 ? '<span class="tag fade">\u26A0 HIGH STRIKEOUT</span>' : (k9 <= 6.5 ? '<span class="tag smash">LOW K \u2014 Contact friendly</span>' : '')) +
        '</div>' +
        (x.tend.notes.length ? '<div style="font-size:12px;color:var(--muted);margin-top:8px">' + x.tend.notes.map(function(n) { return escapeHtml(n); }).join(' \u00B7 ') + '</div>' : '') +
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
    '<div class="dfs-card-grid">' +
    allHitters.map((h, i) => {
      const g = h.grade;
      const dk = getDKSalary(h.name);
      const letter = g.letter || letterGrade(g.score);
      const fires = fireEmojis(g.score);
      const park = parkFor(h.venue || '');
      const m = state.selectedGameData ? getMarket(state.selectedGameData) : {};

      // Compute detailed matchup data
      var oppP = h.oppP || {};
      var pWeak = pitcherWeakness(oppP);
      var splits = g.splits || projectedSplitMetrics(h, oppP, h.side === 'home', {});
      var handEdge = handednessEdge(h.batSide || 'R', oppP.pitchHand || 'R');
      var platoonAdv = handEdge > 0 ? 'PLATOON ADV' : (handEdge < 0 ? 'SAME HAND' : 'NEUTRAL');
      var platoonColor = handEdge > 0 ? '#00ff9c' : (handEdge < 0 ? '#ff3b3b' : '#94a3b8');
      var isHome = h.side === 'home';
      var hrRate = h.pa > 0 ? (h.hr / h.pa * 100).toFixed(1) : '0.0';
      var oppEra = Number(oppP.era || 4.3);
      var oppWhip = Number(oppP.whip || 1.3);
      var oppK9 = Number(oppP.k9 || 8.6);
      var oppHr9 = Number(oppP.hr9 || 1.15);
      var vuln = oppEra >= 4.5 && oppWhip >= 1.3 ? 'HIGH' : (oppEra >= 3.8 ? 'MODERATE' : 'LOW');
      var vulnColor = vuln === 'HIGH' ? '#00ff9c' : (vuln === 'MODERATE' ? '#ffd000' : '#ff3b3b');

      // 10-factor breakdown — refined with real matchup data
      var factors = [
        { label: 'Batter Quality', value: fmtPct(h.avg) + ' AVG \u00B7 ' + fmtPct(h.ops) + ' OPS \u00B7 ' + fmtPct(h.obp || 0) + ' OBP', color: h.ops >= .850 ? '#00ff9c' : h.ops >= .750 ? '#ffd000' : '#ff3b3b' },
        { label: 'Power Matchup', value: h.hr + ' HR \u00B7 ' + hrRate + '% HR Rate \u00B7 ' + fmtPct(h.slg) + ' SLG vs ' + fmtNum(oppHr9, 2) + ' HR/9 allowed', color: (Number(hrRate) >= 4 && oppHr9 >= 1.2) ? '#00ff9c' : (Number(hrRate) >= 2.5 ? '#ffd000' : '#94a3b8') },
        { label: 'Pitcher Weakness', value: escapeHtml(oppP.name || 'TBD') + ' \u00B7 ' + fmtNum(oppEra, 2) + ' ERA \u00B7 ' + fmtNum(oppWhip, 2) + ' WHIP \u00B7 ' + vuln + ' vulnerability', color: vulnColor },
        { label: 'Park Factor', value: escapeHtml(h.venue) + ' \u00B7 HR ' + fmtNum(park.hr, 2) + 'x \u00B7 Run ' + fmtNum(park.run, 2) + 'x' + (park.run >= 1.15 ? ' \u{1F525} HITTER PARK' : (park.run <= 0.92 ? ' \u2744 PITCHER PARK' : '')), color: park.run >= 1.1 ? '#00ff9c' : park.run <= 0.92 ? '#ff3b3b' : '#94a3b8' },
        { label: 'Head to Head', value: splits.lrLabel + 'HP \u00B7 Proj ' + fmtPct(splits.lrAvg) + ' AVG \u00B7 ' + fmtPct(splits.lrOps) + ' OPS vs this arm', color: splits.lrOps >= .800 ? '#00ff9c' : splits.lrOps >= .700 ? '#ffd000' : '#ff3b3b' },
        { label: 'Pitch Arsenal', value: (oppP.pitchHand || 'R') + 'HP \u00B7 K/9 ' + fmtNum(oppK9, 1) + (oppK9 >= 10 ? ' \u26A0 HIGH K' : '') + ' \u00B7 HR/9 ' + fmtNum(oppHr9, 2) + (oppHr9 >= 1.3 ? ' \u{1F525} HR PRONE' : ''), color: oppK9 >= 10 ? '#ff3b3b' : (oppHr9 >= 1.3 ? '#00ff9c' : '#a78bfa') },
        { label: 'Platoon Split', value: (h.batSide || 'R') + ' bat vs ' + (oppP.pitchHand || 'R') + 'HP \u00B7 ' + platoonAdv + ' \u00B7 ' + (isHome ? 'HOME' : 'AWAY') + ' \u00B7 ' + (splits.venueLabel || '') + ' ' + fmtPct(splits.venueOps || 0) + ' OPS', color: platoonColor },
        { label: 'Weather', value: m.temperature ? m.temperature + '\u00B0F \u00B7 ' + (m.wind || '0') + ' mph ' + (m.windDir || '') + (m.windDir === 'Out' ? ' \u{1F525} OUT' : (m.windDir === 'In' ? ' \u2744 IN' : '')) + (String(m.roof || '').toLowerCase() === 'closed' ? ' \u00B7 DOME' : '') : 'No weather data', color: weatherScore(m) >= 60 ? '#00ff9c' : weatherScore(m) <= 40 ? '#ff3b3b' : '#94a3b8' },
        { label: 'Lineup Position', value: h.lineupOrder ? '#' + h.lineupOrder + ' in order' + (h.lineupOrder <= 2 ? ' \u{1F525} TOP OF ORDER' : (h.lineupOrder <= 5 ? ' \u00B7 HEART OF ORDER' : ' \u00B7 BOTTOM')) : 'Lineup TBD', color: h.lineupOrder ? (h.lineupOrder <= 4 ? '#00ff9c' : (h.lineupOrder <= 6 ? '#ffd000' : '#94a3b8')) : '#94a3b8' },
        { label: 'Vegas Odds', value: m.total ? 'O/U ' + m.total + (Number(m.total) >= 9.5 ? ' \u{1F525} HIGH' : (Number(m.total) <= 7 ? ' \u2744 LOW' : '')) + (m.homeMoneyline || m.awayMoneyline ? ' \u00B7 ML ' + (isHome ? (m.homeMoneyline || '-') : (m.awayMoneyline || '-')) : '') : 'No Vegas line', color: Number(m.total || 0) >= 9 ? '#00ff9c' : Number(m.total || 0) >= 8 ? '#ffd000' : '#94a3b8' }
      ];

      // Enhanced synopsis with matchup reasoning
      var synParts = [];
      if (g.score >= 88) synParts.push(escapeHtml(h.name) + ' is an ELITE play today.');
      else if (g.score >= 78) synParts.push(escapeHtml(h.name) + ' grades as a STRONG play.');
      else if (g.score >= 66) synParts.push(escapeHtml(h.name) + ' is a SOLID option.');
      else if (g.score >= 50) synParts.push(escapeHtml(h.name) + ' is a MODERATE play — look for better options.');
      else synParts.push(escapeHtml(h.name) + ' is a FADE candidate today.');

      // Matchup reasoning
      if (handEdge > 0) synParts.push('Has platoon advantage (' + (h.batSide || 'R') + ' bat vs ' + (oppP.pitchHand || 'R') + 'HP).');
      else if (handEdge < 0) synParts.push('Same-hand disadvantage (' + (h.batSide || 'R') + ' bat vs ' + (oppP.pitchHand || 'R') + 'HP) — tougher matchup.');
      if (pWeak >= 70) synParts.push('Facing a highly vulnerable pitcher (' + escapeHtml(oppP.name || 'TBD') + ', weakness ' + pWeak + ').');
      else if (pWeak <= 35) synParts.push('Tough pitching matchup — ' + escapeHtml(oppP.name || 'TBD') + ' is dominant (weakness only ' + pWeak + ').');
      if (park.run >= 1.15) synParts.push('Elite run environment at ' + escapeHtml(h.venue) + '.');
      if (isHome) synParts.push('Home field advantage.');
      else synParts.push('On the road.');
      if (g.reasons && g.reasons.length > 4) synParts.push(g.reasons.slice(4, 6).map(function(r) { return escapeHtml(r); }).join('. ') + '.');

      // Grade color for card accent
      var gradeColor = g.score >= 88 ? '#00ff9c' : g.score >= 78 ? '#00e88a' : g.score >= 66 ? '#ffd000' : g.score >= 50 ? '#ff9f43' : '#ff3b3b';
      var gradeColorDim = g.score >= 88 ? 'rgba(0,255,156,.15)' : g.score >= 78 ? 'rgba(0,232,138,.12)' : g.score >= 66 ? 'rgba(255,208,0,.12)' : g.score >= 50 ? 'rgba(255,159,67,.1)' : 'rgba(255,59,59,.1)';

      // Team colors
      var teamColors = {
        'NYY':'#003087','BOS':'#BD3039','LAD':'#005A9C','ATL':'#CE1141','HOU':'#EB6E1F',
        'NYM':'#002D72','PHI':'#E81828','SD':'#2F241D','SF':'#FD5A1E','CHC':'#0E3386',
        'STL':'#C41E3A','MIL':'#FFC52F','CIN':'#C6011F','PIT':'#FDB827','ARI':'#A71930',
        'COL':'#33006F','MIA':'#00A3E0','WSH':'#AB0003','TB':'#092C5C','BAL':'#DF4601',
        'CLE':'#00385D','DET':'#0C2340','KC':'#004687','MIN':'#002B5C','CWS':'#27251F',
        'TEX':'#003278','LAA':'#BA0021','SEA':'#0C2C56','OAK':'#003831','TOR':'#134A8E',
        'ATH':'#003831'
      };
      var tColor = teamColors[h.team] || '#1e293b';
      var projPts = dk ? (dk.avgPts || (g.score * 0.4).toFixed(1)) : (g.score * 0.4).toFixed(1);
      var cardId = 'scard-' + i;

      // DFS-style card (like the reference image)
      return '<div class="dfs-card" style="--glow:' + gradeColor + ';--glow-dim:' + gradeColorDim + ';--tc:' + tColor + '" onclick="toggleScoutReport(\'' + cardId + '\')">' +
        // Glow border
        '<div class="dfs-card-inner">' +
          // Top: team + position
          '<div class="dfs-card-header">' +
            '<span class="dfs-card-team">' + escapeHtml(h.team) + '</span>' +
            '<span class="dfs-card-pos">' + escapeHtml(h.pos || '-') + '</span>' +
          '</div>' +
          // Grade badge (top right)
          '<div class="dfs-card-grade-badge ' + gradeClass(letter) + '">' + letter + '</div>' +
          // Center: batter silhouette
          '<div class="dfs-card-body">' +
            '<svg viewBox="0 0 100 130" class="dfs-batter-svg" fill="none">' +
              '<defs><linearGradient id="bg' + i + '" x1="50" y1="0" x2="50" y2="130" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="' + tColor + '" stop-opacity=".3"/><stop offset="1" stop-color="' + tColor + '" stop-opacity=".05"/></linearGradient></defs>' +
              '<circle cx="50" cy="26" r="16" fill="url(#bg' + i + ')" stroke="' + gradeColor + '" stroke-width="1.5" stroke-opacity=".5"/>' +
              '<path d="M32 56c0-10 8-18 18-18s18 8 18 18v38c0 3-2.5 5.5-5.5 5.5h-25c-3 0-5.5-2.5-5.5-5.5V56z" fill="url(#bg' + i + ')" stroke="' + gradeColor + '" stroke-width="1" stroke-opacity=".3"/>' +
              '<rect x="66" y="36" width="5" height="48" rx="2.5" transform="rotate(25 66 36)" fill="' + gradeColor + '" opacity=".4"/>' +
              '<text x="50" y="80" text-anchor="middle" font-size="22" font-weight="900" fill="' + gradeColor + '" opacity=".8" font-family="Barlow Condensed">' + (h.lineupOrder || '') + '</text>' +
            '</svg>' +
          '</div>' +
          // Name
          '<div class="dfs-card-name">' + escapeHtml(h.name) + '</div>' +
          // Bottom stats
          '<div class="dfs-card-stats">' +
            '<div class="dfs-card-stat"><div class="dfs-stat-label">SALARY</div><div class="dfs-stat-value gold">' + (dk ? '$' + dk.salary.toLocaleString() : '-') + '</div></div>' +
            '<div class="dfs-card-stat"><div class="dfs-stat-label">PROJ PTS</div><div class="dfs-stat-value">' + projPts + '</div></div>' +
          '</div>' +
          // Score bar
          '<div class="dfs-card-score-bar"><div class="dfs-card-score-fill" style="width:' + g.score + '%;background:' + gradeColor + '"></div></div>' +
        '</div>' +
      '</div>' +
      // Hidden scouting report (shows on click)
      '<div class="scout-report" id="' + cardId + '" style="display:none">' +
        '<div class="scout-report-inner">' +
          '<div class="scout-report-header">' +
            '<div>' +
              '<div class="scout-report-name">' + escapeHtml(h.name) + '</div>' +
              '<div class="scout-report-meta">' + escapeHtml(h.pos || '-') + ' \u00B7 ' + escapeHtml(h.team) + ' \u00B7 ' + (h.batSide || 'R') + ' bat \u00B7 vs ' + escapeHtml(h.opp) + ' \u00B7 ' + escapeHtml(h.venue) + '</div>' +
            '</div>' +
            '<div class="scout-report-grade ' + gradeClass(letter) + '">' + letter + ' <span style="font-size:16px;color:var(--muted)">' + g.score + '/99</span> ' + fires + '</div>' +
          '</div>' +
          '<div class="factor-grid">' + factors.map(function(f) {
            return '<div class="factor-chip"><div class="f-label">' + f.label + '</div><div class="f-value" style="color:' + f.color + '">' + f.value + '</div></div>';
          }).join('') + '</div>' +
          '<div class="synopsis">' + synParts.join(' ') + '</div>' +
          '<button class="button" onclick="event.stopPropagation();toggleScoutReport(\'' + cardId + '\')" style="margin-top:12px;width:100%">Close Report</button>' +
        '</div>' +
      '</div>';
    }).join('') +
    '</div>' +
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
  var dkCount = Object.keys(state.dkSalaries || {}).length;
  return '<section>' +
    '<div class="section-title"><h2>\u2699 SETTINGS</h2></div>' +
    '<div class="settings-grid">' +

      // DK Salaries - CSV Upload
      '<div class="settings-card" style="grid-column:1/-1">' +
        '<h3>\u{1F4B0} DraftKings Salaries</h3>' +
        '<div style="font-size:13px;color:var(--muted);margin-bottom:12px">' + dkCount + ' players loaded' +
          (state.dkSalaryDate ? ' \u00B7 Slate: ' + escapeHtml(state.dkSalaryDate) : '') +
          (state.dkSyncStatus.status === 'ok' ? ' \u00B7 <span style="color:#00ff9c">\u2705 Synced</span>' : '') +
        '</div>' +

        // CSV Upload
        '<div style="border:2px dashed rgba(0,255,156,.2);border-radius:14px;padding:20px;text-align:center;margin-bottom:14px;cursor:pointer;transition:border-color .2s" ' +
          'id="dkDropZone" ondragover="event.preventDefault();this.style.borderColor=\'#00ff9c\'" ondragleave="this.style.borderColor=\'rgba(0,255,156,.2)\'" ondrop="handleDKDrop(event)">' +
          '<div style="font-size:24px;margin-bottom:8px">\u{1F4C1}</div>' +
          '<div style="font-weight:700;margin-bottom:4px">Drag & Drop DraftKings CSV here</div>' +
          '<div style="font-size:12px;color:var(--muted)">Or click to browse. Export CSV from any DK MLB Classic contest page.</div>' +
          '<input type="file" id="dkFileInput" accept=".csv" style="display:none" onchange="handleDKFile(this.files[0])" />' +
        '</div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
          '<button class="button" onclick="document.getElementById(\'dkFileInput\').click()">\u{1F4C2} Browse CSV File</button>' +
          '<button class="button primary" onclick="autoPullDKSalaries()">\u26A1 Auto-Pull DK Salaries</button>' +
          '<button class="button" onclick="syncDKSalaries().then(render)">\u{1F504} Sync from Backend</button>' +
          '<button class="button" onclick="loadFantasyLabsSalaries()">\u{1F4CA} Pull from FantasyLabs</button>' +
        '</div>' +
        '<div id="dkUploadMsg" style="margin-top:10px;font-size:13px;display:none"></div>' +

        // FantasyLabs API Config
        '<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--line)">' +
          '<div style="font-size:12px;font-weight:700;color:var(--muted);letter-spacing:1px;margin-bottom:8px">FANTASYLABS API</div>' +
          '<label style="display:grid;gap:6px;font-size:12px;color:var(--muted);font-weight:700;margin-bottom:10px">FantasyLabs API Key<input id="cfgFantasyLabsKey" class="field" value="' + escapeHtml(state.apiConfig.fantasyLabsKey || '') + '" placeholder="Your FantasyLabs API key" /></label>' +
          '<div style="font-size:11px;color:var(--muted)">Get your API key from your FantasyLabs account dashboard. Used to auto-pull DK salaries, ownership projections, and player models daily.</div>' +
        '</div>' +
      '</div>' +

      // Backend API
      '<div class="settings-card"><h3>Backend API</h3>' +
        '<label>Backend URL<input id="cfgBackend" class="field" value="' + escapeHtml(state.apiConfig.proxyBaseUrl || 'https://newest-mlb-1.onrender.com') + '" /></label>' +
        '<label>Odds API Key<input id="cfgOddsKey" class="field" value="' + escapeHtml(state.apiConfig.oddsApiKey || '') + '" placeholder="Your odds API key" /></label>' +
        '<button class="button primary" onclick="saveSettingsFromUI()" style="margin-top:10px">Save Settings</button></div>' +

      // Live Data
      '<div class="settings-card"><h3>Live Data</h3>' +
        '<button class="button" onclick="syncWeatherForSlate()" style="margin-bottom:8px">\u{1F326} Sync Weather</button>' +
        '<button class="button" onclick="syncOddsForSlate()">\u{1F4B0} Sync Odds</button>' +
        '<div style="font-size:12px;color:var(--muted);margin-top:10px">Weather: ' + (state.liveSync.weather.status || 'idle') + ' \u00B7 Odds: ' + (state.liveSync.odds.status || 'idle') + '</div></div>' +

      // Account
      '<div class="settings-card"><h3>Account</h3>' +
        '<div style="font-size:13px;color:var(--muted);margin-bottom:10px">' + escapeHtml(getAccessProfile().email || 'Not logged in') + '</div>' +
        '<button class="button" onclick="openBillingPortal()">Manage Billing</button>' +
        '<button class="button danger" onclick="logout()" style="margin-top:8px">Logout</button></div>' +

    '</div></section>';
}

// ─── DK CSV Upload Handlers ───────────────────────────────────────────────────
function handleDKDrop(e) {
  e.preventDefault();
  e.currentTarget.style.borderColor = 'rgba(0,255,156,.2)';
  var file = e.dataTransfer.files[0];
  if (file) handleDKFile(file);
}

function handleDKFile(file) {
  if (!file) return;
  var msg = document.getElementById('dkUploadMsg');
  if (msg) { msg.style.display = 'block'; msg.style.color = '#ffd000'; msg.textContent = 'Reading ' + file.name + '...'; }
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var text = e.target.result;
      var salaries = parseDKCsv(text);
      var count = Object.keys(salaries).length;
      if (count === 0) {
        if (msg) { msg.style.color = '#ff3b3b'; msg.textContent = 'No players found. Make sure this is a DraftKings CSV export.'; }
        return;
      }
      state.dkSalaries = salaries;
      state.dkSalaryDate = new Date().toISOString().slice(0, 10);
      state.dkSyncStatus = { status: 'ok', updatedAt: new Date().toISOString(), error: '' };
      localStorage.setItem('mlb-edge-dk-salaries', JSON.stringify(state.dkSalaries));
      localStorage.setItem('mlb-edge-dk-salary-date', state.dkSalaryDate);
      if (msg) { msg.style.color = '#00ff9c'; msg.textContent = '\u2705 Loaded ' + count + ' players from ' + file.name; }
      setTimeout(render, 500);
    } catch (err) {
      if (msg) { msg.style.color = '#ff3b3b'; msg.textContent = 'Error parsing CSV: ' + err.message; }
    }
  };
  reader.readAsText(file);
}

// ─── FantasyLabs Integration ──────────────────────────────────────────────────
async function loadFantasyLabsSalaries() {
  var msg = document.getElementById('dkUploadMsg');
  var apiKey = (document.getElementById('cfgFantasyLabsKey') || {}).value || state.apiConfig.fantasyLabsKey || '';
  if (!apiKey) {
    if (msg) { msg.style.display = 'block'; msg.style.color = '#ff3b3b'; msg.textContent = 'Enter your FantasyLabs API key first.'; }
    return;
  }
  // Save the key
  state.apiConfig.fantasyLabsKey = apiKey;
  localStorage.setItem('mlb-edge-api-config', JSON.stringify(state.apiConfig));
  if (msg) { msg.style.display = 'block'; msg.style.color = '#ffd000'; msg.textContent = 'Pulling salaries from FantasyLabs...'; }

  try {
    // FantasyLabs MLB DFS endpoint
    var today = state.selectedDate || new Date().toISOString().slice(0, 10);
    var url = 'https://www.fantasylabs.com/api/playermodel/2/' + today + '/?projectionsource=4';
    var resp = await fetch(url, {
      headers: { 'x-api-key': apiKey, 'Accept': 'application/json' }
    });
    if (!resp.ok) throw new Error('FantasyLabs API returned ' + resp.status);
    var data = await resp.json();
    var players = Array.isArray(data) ? data : (data.PlayerModels || data.players || []);
    if (!players.length) throw new Error('No player data returned');

    var salaries = {};
    players.forEach(function(p) {
      var name = p.Player_Name || p.PlayerName || p.Name || '';
      if (!name) return;
      salaries[name.toLowerCase()] = {
        name: name,
        salary: Number(p.Salary || p.DK_Salary || 0),
        pos: p.Position || p.Pos || '',
        team: p.Team || '',
        avgPts: Number(p.AvgPts || p.Median || p.Ceiling || 0),
        ownership: Number(p.Ownership || p.OwnPct || 0),
        value: Number(p.Value || 0)
      };
    });
    var count = Object.keys(salaries).length;
    if (count === 0) throw new Error('Could not parse player data');

    state.dkSalaries = salaries;
    state.dkSalaryDate = today;
    state.dkSyncStatus = { status: 'ok', updatedAt: new Date().toISOString(), error: '' };
    localStorage.setItem('mlb-edge-dk-salaries', JSON.stringify(state.dkSalaries));
    localStorage.setItem('mlb-edge-dk-salary-date', state.dkSalaryDate);
    if (msg) { msg.style.color = '#00ff9c'; msg.textContent = '\u2705 Loaded ' + count + ' players from FantasyLabs for ' + today; }
    setTimeout(render, 500);
  } catch (err) {
    if (msg) { msg.style.color = '#ff3b3b'; msg.textContent = 'FantasyLabs error: ' + err.message + '. Try uploading a DK CSV instead.'; }
  }
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

// ─── Auto-Pull DraftKings Salaries via server proxy (avoids CORS) ─────────────
async function autoPullDKSalaries() {
  var msg = document.getElementById('dkUploadMsg');
  try {
    // Use our Vercel API proxy to fetch DK salaries (avoids CORS)
    var resp = await fetch('/api/dk-salaries');
    if (!resp.ok) throw new Error('DK proxy returned ' + resp.status);
    var data = await resp.json();
    if (data.error && !data.salaries) throw new Error(data.error);
    var salaries = data.salaries || {};
    var count = Object.keys(salaries).length;
    if (count === 0) throw new Error(data.error || 'No DK salaries found for today');

    state.dkSalaries = salaries;
    state.dkSalaryDate = (data.updatedAt || new Date().toISOString()).slice(0, 10);
    state.dkSyncStatus = { status: 'ok', updatedAt: new Date().toISOString(), error: '' };
    localStorage.setItem('mlb-edge-dk-salaries', JSON.stringify(state.dkSalaries));
    localStorage.setItem('mlb-edge-dk-salary-date', state.dkSalaryDate);
    if (msg) { msg.style.display = 'block'; msg.style.color = '#00ff9c'; msg.textContent = '\u2705 Auto-loaded ' + count + ' DK players'; }
    console.log('[DK Auto-Pull] Loaded ' + count + ' players');
  } catch (err) {
    console.warn('[DK Auto-Pull] Failed:', err.message, '— falling back to cached data');
    // Silently fail — cached DK salaries from dk-salaries-inject.js are still available
    if (msg) { msg.style.display = 'block'; msg.style.color = '#ffd000'; msg.textContent = 'Using cached DK salaries. Upload CSV in Settings for latest data.'; }
  }
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
    const resp = await fetch('/api/ai-picks', {
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
  const flKey = document.getElementById('cfgFantasyLabsKey');
  if (backend) state.apiConfig.proxyBaseUrl = backend.value.trim();
  if (oddsKey) state.apiConfig.oddsApiKey = oddsKey.value.trim();
  if (flKey) state.apiConfig.fantasyLabsKey = flKey.value.trim();
  localStorage.setItem('mlb-edge-api-config', JSON.stringify(state.apiConfig));
  render();
}

// ─── AUTH GATE ────────────────────────────────────────────────────────────────
function loginWithToken() {
  const backend = document.getElementById('agBackend');
  const email = document.getElementById('agEmail');
  const token = document.getElementById('agToken');
  if (backend && backend.value) state.apiConfig.proxyBaseUrl = backend.value.trim();
  const emailVal = (email && email.value) ? email.value.trim() : 'user@allday.edge';
  const tokenVal = (token && token.value) ? token.value.trim() : '';
  // If no token provided, just log in with email (free mode with email)
  setAccessProfile({ email: emailVal, apiBase: state.apiConfig.proxyBaseUrl, plan: tokenVal ? 'elite' : 'free' });
  if (tokenVal) {
    localStorage.setItem('allday-mlb-edge-token', tokenVal);
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
window.handleDKDrop = handleDKDrop;
window.handleDKFile = handleDKFile;
window.loadFantasyLabsSalaries = loadFantasyLabsSalaries;
window.autoPullDKSalaries = autoPullDKSalaries;

// Toggle scouting report visibility
function toggleScoutReport(id) {
  var el = document.getElementById(id);
  if (!el) return;
  if (el.style.display === 'none') {
    // Close all others first
    document.querySelectorAll('.scout-report').forEach(function(r) { r.style.display = 'none'; });
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    el.style.display = 'none';
  }
}
window.toggleScoutReport = toggleScoutReport;
