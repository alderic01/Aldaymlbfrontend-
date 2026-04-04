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

// ─── PLAYER AVATAR IMAGE LOADER (Nano Banana 2) ──────────────────────────────
var _avatarCache = JSON.parse(localStorage.getItem('mlb-edge-avatars') || '{}');
var _avatarLoading = {};
var _avatarQueue = [];
var _avatarProcessing = false;

function _processAvatarQueue() {
  if (_avatarProcessing || !_avatarQueue.length) return;
  _avatarProcessing = true;
  var item = _avatarQueue.shift();
  fetch('/api/player-avatar?name=' + encodeURIComponent(item.name) + '&team=' + encodeURIComponent(item.team))
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.url && d.url.length > 50) {
        _avatarCache[item.key] = d.url;
        var keys = Object.keys(_avatarCache);
        if (keys.length > 100) {
          keys.slice(0, keys.length - 100).forEach(function(k) { delete _avatarCache[k]; });
        }
        try { localStorage.setItem('mlb-edge-avatars', JSON.stringify(_avatarCache)); } catch(e) {}
        if (typeof render === 'function') render();
      }
    })
    .catch(function() {})
    .finally(function() {
      _avatarProcessing = false;
      // Wait 6 seconds between requests to avoid rate limit
      if (_avatarQueue.length) setTimeout(_processAvatarQueue, 6000);
    });
}

function getPlayerAvatar(name, team) {
  var key = (name || '').toLowerCase() + '_' + (team || '').toUpperCase();
  if (_avatarCache[key]) return _avatarCache[key];
  if (!_avatarLoading[key]) {
    _avatarLoading[key] = true;
    _avatarQueue.push({ name: name, team: team, key: key });
    // Only process if not already running
    if (!_avatarProcessing) _processAvatarQueue();
  }
  return null;
}

// ─── DFS BATTER — Uses AI image if available, SVG fallback ───────────────────
function playerCardImage(id, teamColor, accentColor, jerseyNum, teamAbbr, playerName) {
  // Priority 1: Nano Banana team avatar (always available, fast CDN)
  var teamImg = (typeof getTeamAvatar === 'function') ? getTeamAvatar(teamAbbr) : '';
  if (teamImg) {
    return '<img src="' + escapeHtml(teamImg) + '" class="dfs-batter-img" alt="' + escapeHtml(teamAbbr) + '" loading="lazy" />';
  }
  // Priority 2: AI-generated player avatar (slow, per-player)
  var imgUrl = getPlayerAvatar(playerName, teamAbbr);
  if (imgUrl) {
    return '<img src="' + escapeHtml(imgUrl) + '" class="dfs-batter-img" alt="' + escapeHtml(playerName) + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\'" />' +
      '<div style="display:none">' + batterSVG(id, teamColor, accentColor, jerseyNum, teamAbbr) + '</div>';
  }
  // Priority 3: SVG cartoon batter fallback
  return batterSVG(id, teamColor, accentColor, jerseyNum, teamAbbr);
}

// ─── DFS BATTER CARTOON SVG — Team Uniform Style ─────────────────────────────
function batterSVG(id, teamColor, accentColor, jerseyNum, teamAbbr) {
  var tc = teamColor || '#1e293b';
  var ac = accentColor || '#00ff9c';
  var num = jerseyNum || '';
  var abbr = (teamAbbr || '').substring(0, 3);

  // Team uniform data: [hatColor, hatLetter, uniformAccent, socks, pinstripe]
  var uniforms = {
    NYY:['#1c2841','NY','#1c2841','#1c2841',true],BOS:['#BD3039','B','#BD3039','#BD3039',false],
    LAD:['#005A9C','LA','#005A9C','#005A9C',false],ATL:['#CE1141','A','#CE1141','#CE1141',false],
    HOU:['#002D62','H','#EB6E1F','#EB6E1F',false],NYM:['#002D72','NY','#002D72','#FF5910',true],
    PHI:['#E81828','P','#E81828','#E81828',true],SD:['#2F241D','SD','#FFC425','#2F241D',false],
    SF:['#FD5A1E','SF','#FD5A1E','#27251F',false],CHC:['#0E3386','C','#CC3433','#CC3433',true],
    STL:['#C41E3A','STL','#C41E3A','#C41E3A',false],MIL:['#12284B','M','#FFC52F','#12284B',false],
    CIN:['#C6011F','C','#C6011F','#C6011F',false],PIT:['#27251F','P','#FDB827','#FDB827',false],
    ARI:['#A71930','A','#A71930','#E3D4AD',false],COL:['#33006F','CR','#33006F','#C4CED4',true],
    MIA:['#00A3E0','M','#00A3E0','#EF3340',false],WSH:['#AB0003','W','#AB0003','#AB0003',false],
    TB:['#092C5C','TB','#092C5C','#8FBCE6',false],BAL:['#DF4601','O','#DF4601','#DF4601',false],
    CLE:['#00385D','C','#E31937','#00385D',false],DET:['#0C2340','D','#0C2340','#0C2340',false],
    KC:['#004687','KC','#004687','#004687',false],MIN:['#002B5C','M','#D31145','#002B5C',true],
    CWS:['#27251F','S','#27251F','#27251F',true],TEX:['#003278','T','#C0111F','#003278',false],
    LAA:['#BA0021','A','#BA0021','#BA0021',false],SEA:['#0C2C56','S','#005C5C','#0C2C56',false],
    OAK:['#003831','A','#003831','#EFB21E',false],TOR:['#134A8E','T','#134A8E','#134A8E',false],
    ATH:['#003831','A','#003831','#EFB21E',false]
  };
  var u = uniforms[abbr] || ['#1e293b', abbr.charAt(0) || '?', tc, tc, false];
  var hatC = u[0], hatLtr = u[1], uniAccent = u[2], socksC = u[3], pinstripe = u[4];

  // Skin tones — rotate based on id hash for variety
  var skinTones = ['#F5D6B8', '#D4A574', '#8D5524', '#C68642', '#E8B98A', '#6B4226'];
  var hash = 0;
  for (var si = 0; si < id.length; si++) hash = ((hash << 5) - hash + id.charCodeAt(si)) | 0;
  var skin = skinTones[Math.abs(hash) % skinTones.length];
  var skinDark = skinTones[Math.min(skinTones.length - 1, (Math.abs(hash) % skinTones.length) + 1)];

  return '<svg viewBox="0 0 120 160" class="dfs-batter-svg" fill="none">' +
    '<defs>' +
      '<linearGradient id="uni' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0f0f0"/><stop offset="1" stop-color="#d8d8d8"/></linearGradient>' +
      '<linearGradient id="bat' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8d8a8"/><stop offset=".5" stop-color="#c4a860"/><stop offset="1" stop-color="#a08840"/></linearGradient>' +
    '</defs>' +

    // === HAT (team color with brim) ===
    '<ellipse cx="52" cy="24" rx="18" ry="10" fill="' + hatC + '"/>' +
    '<path d="M34 24c0-10 8-18 18-18s18 8 18 18" fill="' + hatC + '"/>' +
    '<ellipse cx="52" cy="24" rx="22" ry="5" fill="' + hatC + '" opacity=".9"/>' +
    // Hat letter
    '<text x="52" y="20" text-anchor="middle" font-size="12" font-weight="900" fill="white" font-family="Barlow Condensed" opacity=".9">' + hatLtr + '</text>' +

    // === HEAD + FACE ===
    '<circle cx="52" cy="32" r="12" fill="' + skin + '"/>' +
    // Eyes
    '<circle cx="48" cy="30" r="1.5" fill="#222"/>' +
    '<circle cx="56" cy="30" r="1.5" fill="#222"/>' +
    // Mouth (determined look)
    '<path d="M48 36 Q52 38 56 36" stroke="#222" stroke-width="1" fill="none"/>' +

    // === NECK ===
    '<rect x="48" y="43" width="8" height="6" rx="2" fill="' + skin + '"/>' +

    // === BODY (jersey — white with team pinstripes + accent) ===
    '<path d="M34 52c0-4 6-8 18-8s18 4 18 8v36c0 3-3 6-6 6H40c-3 0-6-3-6-6V52z" fill="url(#uni' + id + ')" stroke="' + uniAccent + '" stroke-width="1" stroke-opacity=".4"/>' +
    // Pinstripes
    (pinstripe ? '<line x1="40" y1="46" x2="40" y2="92" stroke="' + uniAccent + '" stroke-width=".5" opacity=".3"/>' +
      '<line x1="46" y1="44" x2="46" y2="92" stroke="' + uniAccent + '" stroke-width=".5" opacity=".3"/>' +
      '<line x1="52" y1="44" x2="52" y2="92" stroke="' + uniAccent + '" stroke-width=".5" opacity=".3"/>' +
      '<line x1="58" y1="44" x2="58" y2="92" stroke="' + uniAccent + '" stroke-width=".5" opacity=".3"/>' +
      '<line x1="64" y1="46" x2="64" y2="92" stroke="' + uniAccent + '" stroke-width=".5" opacity=".3"/>' : '') +
    // Jersey number
    '<text x="52" y="76" text-anchor="middle" font-size="18" font-weight="900" fill="' + uniAccent + '" font-family="Barlow Condensed" opacity=".8">' + num + '</text>' +
    // Belt
    '<rect x="34" y="86" width="36" height="4" rx="1" fill="' + uniAccent + '" opacity=".7"/>' +
    '<rect x="50" y="85" width="4" height="6" rx="1" fill="#d4a000" opacity=".8"/>' +

    // === ARMS (skin + batting stance) ===
    // Back arm (raised, holding bat)
    '<path d="M36 54c-6-2-12-6-14-4" stroke="' + skin + '" stroke-width="7" stroke-linecap="round"/>' +
    '<path d="M22 50c-2-4 0-10 4-14" stroke="' + skin + '" stroke-width="6" stroke-linecap="round"/>' +
    // Front arm (extended)
    '<path d="M66 56c6-4 14-6 18-4" stroke="' + skin + '" stroke-width="7" stroke-linecap="round"/>' +
    // Gloves
    '<circle cx="22" cy="50" r="4" fill="' + uniAccent + '" opacity=".7"/>' +
    '<circle cx="84" cy="52" r="4" fill="' + uniAccent + '" opacity=".7"/>' +

    // === BAT ===
    '<rect x="18" y="10" width="4.5" height="56" rx="2" transform="rotate(-30 18 10)" fill="url(#bat' + id + ')" stroke="#b09850" stroke-width=".5"/>' +
    // Bat knob
    '<circle cx="24" cy="52" r="3.5" fill="#8a6830"/>' +
    // Bat barrel end
    '<ellipse cx="8" cy="18" rx="4" ry="3" fill="#c4a860" transform="rotate(-30 8 18)"/>' +

    // === PANTS (white, same as jersey) ===
    // Front leg (stride)
    '<path d="M40 90l-10 38" stroke="#e8e8e8" stroke-width="10" stroke-linecap="round"/>' +
    // Back leg
    '<path d="M56 90l10 34" stroke="#e8e8e8" stroke-width="10" stroke-linecap="round"/>' +

    // === SOCKS (team color) ===
    '<path d="M28 124l-2 6" stroke="' + socksC + '" stroke-width="10" stroke-linecap="round"/>' +
    '<path d="M68 120l2 6" stroke="' + socksC + '" stroke-width="10" stroke-linecap="round"/>' +

    // === CLEATS ===
    '<ellipse cx="24" cy="134" rx="10" ry="5" fill="#222"/>' +
    '<ellipse cx="72" cy="130" rx="10" ry="5" fill="#222"/>' +

  '</svg>';
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
    case 'overunder': view.innerHTML = renderOverUnder(); break;
    case 'budget': view.innerHTML = renderBudgetBeasts(); break;
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
            playerCardImage('sc' + i, tColor, gradeColor, h.lineupOrder || '', h.team, h.name) +
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
  if (!state.games.length) {
    return '<section><div class="section-title"><h2>\u{1F525} STACK RECOMMENDATIONS</h2></div>' +
      '<div class="card empty">Load today\'s games first.</div></section>';
  }

  // Build stacks using the same pool as the optimizer
  var CAP = 50000;
  var SLOTS = [
    {id:'P1',label:'P',pos:'P',isPitcher:true},{id:'P2',label:'P',pos:'P',isPitcher:true},
    {id:'C',label:'C',pos:'C'},{id:'1B',label:'1B',pos:'1B'},
    {id:'2B',label:'2B',pos:'2B'},{id:'3B',label:'3B',pos:'3B'},
    {id:'SS',label:'SS',pos:'SS'},
    {id:'OF1',label:'OF',pos:'OF'},{id:'OF2',label:'OF',pos:'OF'},{id:'OF3',label:'OF',pos:'OF'}
  ];

  // Build the player pool from ALL today's games
  var pool = [];
  state.games.forEach(function(g) {
    var park = parkFor(g.venue.name);
    var m = getMarket(g);
    var awayEdge = teamEdgeScore(g, 'away'), homeEdge = teamEdgeScore(g, 'home');

    // Pitchers
    [{p:g.awayPitcher,team:g.away.abbr,side:'away',oppEdge:homeEdge},
     {p:g.homePitcher,team:g.home.abbr,side:'home',oppEdge:awayEdge}].forEach(function(x) {
      if (!x.p || !x.p.name || x.p.name === 'TBD') return;
      var dk = getDKSalary(x.p.name);
      var salary = dk ? dk.salary : 8000;
      if (salary < 1000) salary = 8000;
      var pts = dkProjectPitcher(x.p, x.oppEdge, park);
      pool.push({name:x.p.name,team:x.team,pos:'P',salary:salary,proj:pts,gamePk:g.gamePk,isPitcher:true,
        oppName:x.side==='away'?g.home.abbr:g.away.abbr,venue:g.venue.name});
    });

    // Hitters from DK salary data
    Object.values(state.dkSalaries || {}).forEach(function(dk) {
      if (!dk.salary || dk.salary < 2000) return;
      if (/^(SP|RP|P)$/i.test(dk.pos || '')) return;
      var teamKey = (dk.team || '').toUpperCase();
      if ((g.away.abbr||'').toUpperCase() !== teamKey && (g.home.abbr||'').toUpperCase() !== teamKey) return;
      if (pool.some(function(p) { return p.name.toLowerCase() === dk.name.toLowerCase(); })) return;
      var isHome = (g.home.abbr||'').toUpperCase() === teamKey;
      var oppP = isHome ? g.awayPitcher : g.homePitcher;
      var pts = dkProjectHitter({avg:.260,ops:.740,slg:.420,obp:.330,hr:15,sb:5,rbi:50,pa:400,batSide:'R',name:dk.name}, oppP||{}, park, m, isHome);
      if (dk.avgPts > pts) pts = dk.avgPts;
      pool.push({name:dk.name,team:dk.team,pos:(dk.pos||'OF').toUpperCase(),salary:dk.salary,proj:pts,gamePk:g.gamePk,isPitcher:false,
        oppName:isHome?g.away.abbr:g.home.abbr,venue:g.venue.name});
    });

    // Hardcoded DK_PLAYERS
    if (typeof DK_PLAYERS !== 'undefined') {
      DK_PLAYERS.forEach(function(dk) {
        if (!dk.salary || dk.salary < 2000) return;
        if (/^(SP|RP|P)$/i.test(dk.pos || '')) return;
        var teamKey = (dk.team || '').toUpperCase();
        if ((g.away.abbr||'').toUpperCase() !== teamKey && (g.home.abbr||'').toUpperCase() !== teamKey) return;
        if (pool.some(function(p) { return p.name.toLowerCase() === dk.name.toLowerCase(); })) return;
        var isHome = (g.home.abbr||'').toUpperCase() === teamKey;
        var pts = dk.avgPts || (dk.salary / 1000 * 2.5);
        pool.push({name:dk.name,team:dk.team,pos:(dk.pos||dk.rosterPos||'OF').toUpperCase(),salary:dk.salary,proj:pts,gamePk:g.gamePk,isPitcher:false,
          oppName:isHome?g.away.abbr:g.home.abbr,venue:g.venue.name});
      });
    }
  });

  // Dedupe
  var seen = {};
  pool = pool.filter(function(p) { var k = p.name.toLowerCase(); if(seen[k]) return false; seen[k]=true; return true; });

  // Sort by highest projection
  pool.sort(function(a, b) { return b.proj - a.proj; });

  // Position eligibility
  function fitsSlot(p, slotPos, slotIsPitcher) {
    if (slotIsPitcher) return p.isPitcher;
    if (p.isPitcher) return false;
    var allPos = p.pos.toUpperCase().split(/[\/,]/);
    if (slotPos === 'OF') return allPos.some(function(pp) { return pp==='OF'||pp==='CF'||pp==='LF'||pp==='RF'; });
    return allPos.some(function(pp) { return pp === slotPos; });
  }

  // Build one optimal lineup
  var lineup = [], used = {}, salaryUsed = 0, teamCounts = {}, gameSet = {};

  for (var si = 0; si < SLOTS.length; si++) {
    var slot = SLOTS[si];
    var slotsLeft = SLOTS.length - lineup.length - 1;
    var maxForThis = CAP - salaryUsed - (slotsLeft * 2000);
    for (var pi = 0; pi < pool.length; pi++) {
      var p = pool[pi];
      if (used[p.name] || p.salary > maxForThis) continue;
      if (!fitsSlot(p, slot.pos, slot.isPitcher)) continue;
      if (!p.isPitcher && (teamCounts[p.team]||0) >= 5) continue;
      lineup.push(Object.assign({}, p, {slotLabel:slot.label, slotId:slot.id}));
      used[p.name] = true;
      salaryUsed += p.salary;
      if (!p.isPitcher) teamCounts[p.team] = (teamCounts[p.team]||0) + 1;
      gameSet[p.gamePk] = true;
      break;
    }
  }

  // Upgrade pass — max out salary
  var remaining = CAP - salaryUsed;
  var rounds = 0;
  while (remaining > 500 && rounds < 40) {
    rounds++;
    var cheapIdx = -1, cheapSal = Infinity;
    for (var ci = 0; ci < lineup.length; ci++) {
      if (lineup[ci].salary < cheapSal) { cheapSal = lineup[ci].salary; cheapIdx = ci; }
    }
    if (cheapIdx < 0) break;
    var cheap = lineup[cheapIdx];
    var maxBudget = cheap.salary + remaining;
    var upgrade = null;
    for (var ui = 0; ui < pool.length; ui++) {
      var u = pool[ui];
      if (used[u.name] || u.salary > maxBudget || u.salary <= cheap.salary || u.proj <= cheap.proj) continue;
      if (!fitsSlot(u, cheap.slotLabel, cheap.isPitcher)) continue;
      if (!u.isPitcher && (teamCounts[u.team]||0) >= 5 && u.team !== cheap.team) continue;
      upgrade = u;
      break;
    }
    if (!upgrade) break;
    delete used[cheap.name];
    used[upgrade.name] = true;
    salaryUsed = salaryUsed - cheap.salary + upgrade.salary;
    remaining = CAP - salaryUsed;
    if (!cheap.isPitcher && cheap.team !== upgrade.team) {
      teamCounts[cheap.team] = Math.max(0, (teamCounts[cheap.team]||0) - 1);
      teamCounts[upgrade.team] = (teamCounts[upgrade.team]||0) + 1;
    }
    gameSet[upgrade.gamePk] = true;
    lineup[cheapIdx] = Object.assign({}, upgrade, {slotLabel:cheap.slotLabel, slotId:cheap.slotId});
  }

  var totalSalary = lineup.reduce(function(s,p){return s+p.salary;},0);
  var totalProj = lineup.reduce(function(s,p){return s+p.proj;},0);
  var gameCount = Object.keys(gameSet).length;
  var valid = lineup.length === 10 && totalSalary <= CAP && gameCount >= 2;

  if (!lineup.length) {
    return '<section><div class="section-title"><h2>\u{1F525} STACK RECOMMENDATIONS</h2></div>' +
      '<div class="card empty">No players found. Make sure DK salaries are loaded (check Settings tab).</div></section>';
  }

  return '<section>' +
    '<div class="section-title"><h2>\u{1F525} STACK RECOMMENDATIONS — TODAY\'S LINEUP</h2><div class="meta">' + state.games.length + ' games \u00B7 $' + totalSalary.toLocaleString() + '/$50K \u00B7 ' + fmtNum(totalProj, 1) + ' proj pts \u00B7 ' + (valid ? '\u2705 Valid' : '\u274C') + '</div></div>' +

    '<div class="lineup-card">' +
      '<div class="lineup-header">' +
        '<div class="lineup-label">OPTIMAL STACK</div>' +
        '<div class="lineup-total"><strong style="color:#ffd000">' + fmtNum(totalProj, 1) + ' pts</strong> \u00B7 $' + totalSalary.toLocaleString() + ' \u00B7 ' + gameCount + ' games</div>' +
      '</div>' +
      '<div class="opt-row opt-header"><div class="opt-cell">POS</div><div class="opt-cell">PLAYER</div><div class="opt-cell">TEAM</div><div class="opt-cell">OPP</div><div class="opt-cell">SALARY</div><div class="opt-cell">PROJ</div></div>' +
      lineup.map(function(p) {
        return '<div class="opt-row">' +
          '<div class="opt-cell opt-pos">' + p.slotLabel + '</div>' +
          '<div class="opt-cell opt-name">' + escapeHtml(p.name) + '</div>' +
          '<div class="opt-cell">' + p.team + '</div>' +
          '<div class="opt-cell" style="color:var(--muted)">' + (p.oppName || '-') + '</div>' +
          '<div class="opt-cell opt-salary">$' + p.salary.toLocaleString() + '</div>' +
          '<div class="opt-cell opt-proj">' + p.proj.toFixed(1) + '</div>' +
        '</div>';
      }).join('') +
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid rgba(30,41,59,.4);background:rgba(6,14,26,.4)">' +
        '<div class="pcard-stat"><div class="pcard-stat-val" style="color:' + (totalSalary <= CAP ? '#00ff9c' : '#ff3b3b') + '">$' + totalSalary.toLocaleString() + '</div><div class="pcard-stat-lbl">SALARY</div></div>' +
        '<div class="pcard-stat"><div class="pcard-stat-val" style="color:#ffd000">$' + remaining.toLocaleString() + '</div><div class="pcard-stat-lbl">REMAINING</div></div>' +
        '<div class="pcard-stat"><div class="pcard-stat-val" style="color:#00ff9c">' + fmtNum(totalProj, 1) + '</div><div class="pcard-stat-lbl">PROJ PTS</div></div>' +
        '<div class="pcard-stat"><div class="pcard-stat-val">' + gameCount + '</div><div class="pcard-stat-lbl">GAMES</div></div>' +
      '</div>' +
    '</div>' +

    // Team stack breakdown
    '<div style="margin-top:16px"><div class="section-title"><h2>TEAM EXPOSURE</h2></div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
      Object.keys(teamCounts).sort(function(a,b){return teamCounts[b]-teamCounts[a];}).map(function(t) {
        return '<div class="tag smash" style="font-size:13px;padding:8px 14px">' + t + ' \u00D7 ' + teamCounts[t] + '</div>';
      }).join('') +
    '</div></div>' +

  '</section>';
}

// ─── TAB 5: AI STACK ──────────────────────────────────────────────────────────
function renderAIStack() {
  const stacks = buildSmartStacks();
  return '<section>' +
    '<div class="section-title"><h2>\u{1F916} AI LINEUP BUILDER</h2><div class="meta">Claude AI builds full 10-player DK Classic lineups \u00B7 $50K cap \u00B7 2P/C/1B/2B/3B/SS/3OF</div></div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">' +
      '<button class="button ' + (state.aiMode === 'picks' ? 'primary' : '') + '" onclick="state.aiMode=\'picks\';render()">\u{1F3AF} Optimal Lineup</button>' +
      '<button class="button ' + (state.aiMode === 'stacks' ? 'primary' : '') + '" onclick="state.aiMode=\'stacks\';render()">\u{1F525} 3 GPP Lineups</button>' +
      '<button class="button ' + (state.aiMode === 'edges' ? 'primary' : '') + '" onclick="state.aiMode=\'edges\';render()">\u{1F4A1} Sharp Edges</button>' +
      '<button class="button primary" onclick="generateAIPicks()" id="aiGenBtn">' + (state.aiLoading ? 'Generating...' : '\u26A1 Generate with Claude AI') + '</button>' +
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

// ─── OVER/UNDER PARLAYS TAB ───────────────────────────────────────────────────

function projectPlayerProps(h, oppP, park, market, isHome) {
  var era = Number(oppP.era || 4.3), whip = Number(oppP.whip || 1.3), k9 = Number(oppP.k9 || 8.6), hr9 = Number(oppP.hr9 || 1.15);
  var avg = Number(h.avg || .250), ops = Number(h.ops || .720), slg = Number(h.slg || .400), hr = Number(h.hr || 0), pa = Number(h.pa || 1);
  var total = Number(market.total || 8.5);
  var parkRun = Number(park.run || 1), parkHr = Number(park.hr || 1);
  var homeBoost = isHome ? 1.05 : 0.95;

  // Projected per-game stats based on season rates + matchup adjustments
  var gamesPlayed = Math.max(1, pa / 4.2); // estimate games from PA
  var hitsPerGame = avg * 4 * homeBoost * (whip >= 1.3 ? 1.08 : 0.95);
  var hrsPerGame = (hr / gamesPlayed) * parkHr * (hr9 >= 1.2 ? 1.15 : 0.9) * homeBoost;
  var rbisPerGame = (hitsPerGame * 0.35 + hrsPerGame * 1.3) * (total / 8.5);
  var runsPerGame = (hitsPerGame * 0.4 + hrsPerGame * 0.9) * (total / 8.5) * parkRun;
  var totalBases = hitsPerGame * 1.0 + (slg - avg) * 4 * homeBoost * (hr9 >= 1.2 ? 1.1 : 0.95);
  var walks = (Number(h.obp || .320) - avg) * 4 * (whip >= 1.35 ? 1.15 : 0.9);
  var stolenBases = Number(h.sb || 0) / Math.max(1, gamesPlayed) * homeBoost;
  var hitsRunsRbis = hitsPerGame + runsPerGame + rbisPerGame;
  var fantasyScore = hitsPerGame * 3 + totalBases * 1.5 + hrsPerGame * 10 + rbisPerGame * 2 + runsPerGame * 2 + walks * 2 + stolenBases * 5;

  // Use live Vegas lines if available, fallback to defaults
  var name = h.name || '';
  return {
    hits: { proj: hitsPerGame, line: getPlayerPropLine(name, 'hits') || 0.5, label: 'Hits', live: !!getPlayerPropLine(name, 'hits') },
    runs: { proj: runsPerGame, line: getPlayerPropLine(name, 'runs_scored') || 0.5, label: 'Runs', live: !!getPlayerPropLine(name, 'runs_scored') },
    rbis: { proj: rbisPerGame, line: getPlayerPropLine(name, 'rbis') || 0.5, label: 'RBIs', live: !!getPlayerPropLine(name, 'rbis') },
    hrs: { proj: hrsPerGame, line: getPlayerPropLine(name, 'home_runs') || 0.5, label: 'Home Runs', live: !!getPlayerPropLine(name, 'home_runs') },
    totalBases: { proj: totalBases, line: getPlayerPropLine(name, 'total_bases') || 1.5, label: 'Total Bases', live: !!getPlayerPropLine(name, 'total_bases') },
    hitsRunsRbis: { proj: hitsRunsRbis, line: getPlayerPropLine(name, 'hits_runs_rbis') || 2.5, label: 'H+R+RBI', live: !!getPlayerPropLine(name, 'hits_runs_rbis') },
    walks: { proj: walks, line: getPlayerPropLine(name, 'walks') || 0.5, label: 'Walks', live: !!getPlayerPropLine(name, 'walks') },
    stolenBases: { proj: stolenBases, line: getPlayerPropLine(name, 'stolen_bases') || 0.5, label: 'Stolen Bases', live: !!getPlayerPropLine(name, 'stolen_bases') },
    fantasyScore: { proj: fantasyScore, line: 15, label: 'Hitter Fantasy Score', live: false }
  };
}

function projectPitcherProps(p, oppTeamEdge, park) {
  var era = Number(p.era || 4.3), whip = Number(p.whip || 1.3), k9 = Number(p.k9 || 8.6), hr9 = Number(p.hr9 || 1.15);
  var expIP = starterProjection(p);
  var parkRun = Number(park.run || 1);

  var strikeouts = (k9 / 9) * expIP * (oppTeamEdge <= 55 ? 1.05 : 0.9);
  var outs = expIP * 3;
  var hitsAllowed = whip * expIP * 0.7 * parkRun;
  var earnedRuns = (era / 9) * expIP * parkRun;
  var firstInningRuns = (era / 9) * 1 * (whip >= 1.3 ? 1.2 : 0.85) * parkRun;
  var pitcherFantasy = expIP * 2.25 + strikeouts * 2 - earnedRuns * 2 - hitsAllowed * 0.6 + (era <= 3.5 ? 4 : 0);

  var name = p.name || '';
  return {
    strikeouts: { proj: strikeouts, line: getPlayerPropLine(name, 'strikeouts') || 5.5, label: 'Strikeouts', live: !!getPlayerPropLine(name, 'strikeouts') },
    outs: { proj: outs, line: getPlayerPropLine(name, 'outs') || 16.5, label: 'Pitching Outs', live: !!getPlayerPropLine(name, 'outs') },
    hitsAllowed: { proj: hitsAllowed, line: getPlayerPropLine(name, 'hits_allowed') || 5.5, label: 'Hits Allowed', live: !!getPlayerPropLine(name, 'hits_allowed') },
    earnedRuns: { proj: earnedRuns, line: getPlayerPropLine(name, 'earned_runs') || 2.5, label: 'Earned Runs', live: !!getPlayerPropLine(name, 'earned_runs') },
    firstInningRuns: { proj: firstInningRuns, line: 0.5, label: '1st Inning Runs', live: false },
    pitcherFantasy: { proj: pitcherFantasy, line: 20, label: 'Pitcher Fantasy Score', live: false }
  };
}

function ouVerdict(proj, line) {
  var diff = proj - line;
  var pct = Math.min(95, Math.max(5, 50 + diff * 30));
  var pick = pct >= 55 ? 'OVER' : (pct <= 45 ? 'UNDER' : 'PUSH');
  var confidence = Math.abs(pct - 50);
  var stars = confidence >= 30 ? 5 : confidence >= 20 ? 4 : confidence >= 12 ? 3 : confidence >= 5 ? 2 : 1;
  return { pick: pick, pct: Math.round(pct), confidence: confidence, stars: stars };
}

function renderOverUnder() {
  if (!state.games.length) return '<div class="empty">Load games first to see Over/Under projections.</div>';

  // Filter mode
  var filterMode = state._ouFilter || 'all';

  // Build all player props
  var hitterProps = [];
  var pitcherProps = [];

  state.games.forEach(function(g) {
    var park = parkFor(g.venue.name);
    var m = getMarket(g);
    var awayEdge = teamEdgeScore(g, 'away'), homeEdge = teamEdgeScore(g, 'home');

    // Pitchers
    if (g.awayPitcher && g.awayPitcher.name && g.awayPitcher.name !== 'TBD') {
      var pp = projectPitcherProps(g.awayPitcher, homeEdge, park);
      Object.keys(pp).forEach(function(k) {
        var prop = pp[k];
        var v = ouVerdict(prop.proj, prop.line);
        pitcherProps.push({ name: g.awayPitcher.name, team: g.away.abbr, opp: g.home.abbr, venue: g.venue.name, prop: prop.label, proj: prop.proj, line: prop.line, pick: v.pick, pct: v.pct, stars: v.stars, confidence: v.confidence, type: 'pitcher', live: prop.live });
      });
    }
    if (g.homePitcher && g.homePitcher.name && g.homePitcher.name !== 'TBD') {
      var pp2 = projectPitcherProps(g.homePitcher, awayEdge, park);
      Object.keys(pp2).forEach(function(k) {
        var prop = pp2[k];
        var v = ouVerdict(prop.proj, prop.line);
        pitcherProps.push({ name: g.homePitcher.name, team: g.home.abbr, opp: g.away.abbr, venue: g.venue.name, prop: prop.label, proj: prop.proj, line: prop.line, pick: v.pick, pct: v.pct, stars: v.stars, confidence: v.confidence, type: 'pitcher', live: prop.live });
      });
    }

    // Hitters (from selected game only for performance)
    if (state.selectedGameData && g.gamePk === state.selectedGamePk) {
      var sg = state.selectedGameData;
      [].concat(sg.awayHitters || []).concat(sg.homeHitters || []).forEach(function(h) {
        var isHome = (sg.homeHitters || []).indexOf(h) >= 0;
        var oppP = isHome ? sg.awayPitcher : sg.homePitcher;
        var hp = projectPlayerProps(h, oppP, park, m, isHome);
        Object.keys(hp).forEach(function(k) {
          var prop = hp[k];
          var v = ouVerdict(prop.proj, prop.line);
          hitterProps.push({ name: h.name, team: isHome ? sg.home.abbr : sg.away.abbr, opp: isHome ? sg.away.abbr : sg.home.abbr, pos: h.pos || '-', venue: g.venue.name, prop: prop.label, proj: prop.proj, line: prop.line, pick: v.pick, pct: v.pct, stars: v.stars, confidence: v.confidence, type: 'hitter' });
        });
      });
    }
  });

  // Sort by confidence (best picks first)
  pitcherProps.sort(function(a, b) { return b.confidence - a.confidence; });
  hitterProps.sort(function(a, b) { return b.confidence - a.confidence; });

  var allProps = filterMode === 'pitchers' ? pitcherProps : (filterMode === 'hitters' ? hitterProps : pitcherProps.concat(hitterProps));
  allProps.sort(function(a, b) { return b.confidence - a.confidence; });

  // Best parlay picks (top confidence)
  var bestPicks = allProps.filter(function(p) { return p.confidence >= 15; }).slice(0, 8);

  return '<section>' +
    '<div class="section-title"><h2>\u{1F3B0} OVER/UNDER PARLAYS</h2><div class="meta">Player prop projections \u00B7 Vegas lines + stats-based analysis \u00B7 ' + allProps.length + ' props</div></div>' +

    // Filter buttons
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">' +
      '<button class="button ' + (filterMode === 'all' ? 'primary' : '') + '" onclick="state._ouFilter=\'all\';if(typeof render===\'function\')render()">All Props</button>' +
      '<button class="button ' + (filterMode === 'pitchers' ? 'primary' : '') + '" onclick="state._ouFilter=\'pitchers\';if(typeof render===\'function\')render()">\u26BE Pitcher Props</button>' +
      '<button class="button ' + (filterMode === 'hitters' ? 'primary' : '') + '" onclick="state._ouFilter=\'hitters\';if(typeof render===\'function\')render()">\u{1F3CF} Hitter Props</button>' +
    '</div>' +

    // Best Parlay Picks
    (bestPicks.length ? '<div class="dash-card" style="margin-bottom:16px"><div class="dash-card-title">\u{1F525} TOP PARLAY PICKS — Highest Confidence</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;padding:14px">' +
        bestPicks.map(function(p) {
          var pickColor = p.pick === 'OVER' ? '#00ff9c' : (p.pick === 'UNDER' ? '#59a9ff' : '#ffd000');
          return '<div class="ou-pick-card" style="--ou-color:' + pickColor + '">' +
            '<div class="ou-pick-top">' +
              '<div><strong>' + escapeHtml(p.name) + '</strong> <span style="color:var(--muted);font-size:11px">' + p.team + '</span></div>' +
              '<div class="ou-pick-verdict" style="color:' + pickColor + '">' + p.pick + '</div>' +
            '</div>' +
            '<div class="ou-pick-prop">' + p.prop + '</div>' +
            '<div class="ou-pick-nums">' +
              '<span>Line: <strong>' + p.line.toFixed(1) + '</strong></span>' +
              '<span>Proj: <strong style="color:' + pickColor + '">' + p.proj.toFixed(2) + '</strong></span>' +
              '<span>' + '\u2B50'.repeat(p.stars) + '</span>' +
            '</div>' +
            '<div class="ou-pick-bar"><div class="ou-pick-fill" style="width:' + p.pct + '%;background:' + pickColor + '"></div></div>' +
          '</div>';
        }).join('') +
      '</div></div>' : '') +

    // Full Props Table
    '<div class="dash-card">' +
      '<div class="dash-card-title">ALL PLAYER PROPS</div>' +
      '<div class="table-wrap"><table class="ou-table">' +
        '<thead><tr><th>Player</th><th>Team</th><th>Prop</th><th>Line</th><th>Proj</th><th>Pick</th><th>Conf</th><th>Rating</th></tr></thead>' +
        '<tbody>' +
          allProps.slice(0, 80).map(function(p) {
            var pickColor = p.pick === 'OVER' ? '#00ff9c' : (p.pick === 'UNDER' ? '#59a9ff' : '#ffd000');
            return '<tr>' +
              '<td><strong>' + escapeHtml(p.name) + '</strong></td>' +
              '<td>' + p.team + '</td>' +
              '<td style="font-size:12px">' + p.prop + '</td>' +
              '<td class="mono">' + p.line.toFixed(1) + (p.live ? ' <span style="font-size:9px;color:#00ff9c;font-weight:800">LIVE</span>' : '') + '</td>' +
              '<td class="mono" style="color:' + pickColor + ';font-weight:800">' + p.proj.toFixed(2) + '</td>' +
              '<td><span class="ou-tag" style="background:' + pickColor + '22;color:' + pickColor + ';border:1px solid ' + pickColor + '44">' + p.pick + '</span></td>' +
              '<td class="mono">' + p.pct + '%</td>' +
              '<td>' + '\u2B50'.repeat(p.stars) + '</td>' +
            '</tr>';
          }).join('') +
        '</tbody>' +
      '</table></div>' +
    '</div>' +

    (!hitterProps.length ? '<div style="color:var(--muted);font-size:13px;margin-top:12px;text-align:center">Select a game from the Games tab to see hitter props. Pitcher props shown for all games.</div>' : '') +
  '</section>';
}

// ─── BUDGET BEASTS TAB ────────────────────────────────────────────────────────

state._budgetMax = state._budgetMax || 3500;

function getBudgetBeasts(maxSal) {
  var beasts = [];
  var pool = Object.values(state.dkSalaries || {});
  if (!pool.length) return beasts;

  pool.forEach(function(dk) {
    if (!dk.salary || dk.salary > maxSal || dk.salary < 2000) return;
    if (/^(SP|RP|P)$/i.test(dk.pos || '')) return;

    var teamKey = (dk.team || '').toUpperCase();
    // Find the game this player is in
    var gameCtx = null;
    state.games.forEach(function(g) {
      if ((g.away.abbr || '').toUpperCase() === teamKey || (g.home.abbr || '').toUpperCase() === teamKey) gameCtx = g;
    });
    if (!gameCtx) return;

    var isHome = (gameCtx.home.abbr || '').toUpperCase() === teamKey;
    var oppP = isHome ? gameCtx.awayPitcher : gameCtx.homePitcher;
    var park = parkFor(gameCtx.venue.name);
    var m = getMarket(gameCtx);
    var pWeak = pitcherWeakness(oppP || {});
    var handEdge = handednessEdge('R', (oppP || {}).pitchHand || 'R');

    // Score this beast
    var matchupScore = pWeak * 0.4 + (park.run || 1) * 20 + (park.hr || 1) * 15;
    matchupScore += handEdge > 0 ? 8 : -3;
    matchupScore += isHome ? 5 : 0;
    matchupScore += Number(m.total || 8.5) > 9 ? 6 : 0;
    var valueScore = matchupScore / (dk.salary / 1000);
    var projPts = dk.avgPts || (matchupScore * 0.18);

    // Grade
    var grade = valueScore >= 18 ? 'A+' : valueScore >= 14 ? 'A' : valueScore >= 11 ? 'B+' : valueScore >= 8 ? 'B' : 'C';
    var gradeColor = grade === 'A+' ? '#00ff9c' : grade === 'A' ? '#00e88a' : grade === 'B+' ? '#ffd000' : grade === 'B' ? '#f59e0b' : '#94a3b8';

    beasts.push({
      name: dk.name, team: dk.team, pos: dk.pos, salary: dk.salary,
      avgPts: projPts, matchupScore: Math.round(matchupScore),
      valueScore: Math.round(valueScore * 10) / 10,
      grade: grade, gradeColor: gradeColor,
      oppPitcher: oppP ? oppP.name : 'TBD', pWeak: pWeak,
      venue: gameCtx.venue.name, parkRun: park.run, parkHr: park.hr,
      isHome: isHome, handEdge: handEdge,
      total: Number(m.total || 0), opp: isHome ? gameCtx.away.abbr : gameCtx.home.abbr
    });
  });

  // Also check graded hitters from selected game
  if (state.selectedGameData) {
    var sg = state.selectedGameData;
    [].concat(sg.awayHitters || []).concat(sg.homeHitters || []).forEach(function(h) {
      var dk = getDKSalary(h.name);
      if (!dk || dk.salary > maxSal || dk.salary < 2000) return;
      if (beasts.some(function(b) { return b.name.toLowerCase() === h.name.toLowerCase(); })) return;
      var isHome = (sg.homeHitters || []).indexOf(h) >= 0;
      var oppP = isHome ? sg.awayPitcher : sg.homePitcher;
      var pWeak = pitcherWeakness(oppP || {});
      var park = parkFor(sg.venue.name);
      var score = h.grade ? h.grade.score : 50;
      var valueScore = score / (dk.salary / 1000);
      var grade = score >= 88 ? 'A+' : score >= 78 ? 'A' : score >= 68 ? 'B+' : score >= 56 ? 'B' : 'C';
      var gradeColor = grade === 'A+' ? '#00ff9c' : grade === 'A' ? '#00e88a' : grade === 'B+' ? '#ffd000' : '#f59e0b';
      beasts.push({
        name: h.name, team: dk.team, pos: dk.pos || h.pos, salary: dk.salary,
        avgPts: dk.avgPts || score * 0.4, matchupScore: score,
        valueScore: Math.round(valueScore * 10) / 10,
        grade: grade, gradeColor: gradeColor,
        oppPitcher: oppP ? oppP.name : 'TBD', pWeak: pWeak,
        venue: sg.venue.name, parkRun: park.run, parkHr: park.hr,
        isHome: isHome, handEdge: 0, total: 0,
        opp: isHome ? sg.away.abbr : sg.home.abbr
      });
    });
  }

  beasts.sort(function(a, b) { return b.valueScore - a.valueScore; });
  return beasts;
}

function renderBudgetBeasts() {
  var maxSal = state._budgetMax || 3500;
  var beasts = getBudgetBeasts(maxSal);

  // Team colors for cards
  var tc = {NYY:'#003087',BOS:'#BD3039',LAD:'#005A9C',ATL:'#CE1141',HOU:'#EB6E1F',NYM:'#002D72',PHI:'#E81828',SD:'#2F241D',SF:'#FD5A1E',CHC:'#0E3386',STL:'#C41E3A',MIL:'#FFC52F',CIN:'#C6011F',PIT:'#FDB827',ARI:'#A71930',COL:'#33006F',MIA:'#00A3E0',WSH:'#AB0003',TB:'#092C5C',BAL:'#DF4601',CLE:'#00385D',DET:'#0C2340',KC:'#004687',MIN:'#002B5C',CWS:'#27251F',TEX:'#003278',LAA:'#BA0021',SEA:'#0C2C56',OAK:'#003831',TOR:'#134A8E',ATH:'#003831'};

  return '<section>' +
    '<div class="section-title"><h2>\u{1F4B0} BUDGET BEASTS</h2><div class="meta">Best value plays under $' + maxSal.toLocaleString() + ' \u00B7 ' + beasts.length + ' players found</div></div>' +

    // Salary slider
    '<div class="dash-card" style="margin-bottom:20px">' +
      '<div style="padding:20px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
          '<div style="font-family:Barlow Condensed;font-size:20px;font-weight:800;letter-spacing:1px">MAX SALARY</div>' +
          '<div id="budgetDisplay" style="font-family:JetBrains Mono;font-size:32px;font-weight:900;color:#ffd000">$' + maxSal.toLocaleString() + '</div>' +
        '</div>' +
        '<input type="range" id="budgetSlider" min="2000" max="3500" step="100" value="' + maxSal + '" oninput="updateBudgetSlider(this.value)" class="budget-slider" />' +
        '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-top:6px">' +
          '<span>$2,000</span><span>$2,500</span><span>$3,000</span><span>$3,500</span>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // Beast cards grid
    (beasts.length ? '<div class="dfs-card-grid">' +
      beasts.slice(0, 20).map(function(b, i) {
        var tColor = tc[b.team] || '#1e293b';
        var gColor = b.gradeColor;
        var gDim = gColor + '22';
        return '<div class="dfs-card" style="--glow:' + gColor + ';--glow-dim:' + gDim + ';--tc:' + tColor + '">' +
          '<div class="dfs-card-inner">' +
            // Header
            '<div class="dfs-card-header">' +
              '<span class="dfs-card-team">' + escapeHtml(b.team) + '</span>' +
              '<span class="dfs-card-pos">' + escapeHtml(b.pos || '-') + '</span>' +
            '</div>' +
            // Grade badge
            '<div class="dfs-card-grade-badge" style="color:' + gColor + '">' + b.grade + '</div>' +
            // Batter silhouette
            '<div class="dfs-card-body">' +
              playerCardImage('bb' + i, tColor, gColor, '', b.team, b.name) +
            '</div>' +
            // Name
            '<div class="dfs-card-name">' + escapeHtml(b.name) + '</div>' +
            // Matchup info
            '<div style="text-align:center;padding:0 10px 8px;font-size:11px;color:#475569">' +
              'vs ' + escapeHtml(b.oppPitcher) + ' (' + b.opp + ')' +
              (b.pWeak >= 65 ? ' <span style="color:#00ff9c">\u{1F525}</span>' : '') +
            '</div>' +
            // Stats row
            '<div class="dfs-card-stats" style="grid-template-columns:1fr 1fr 1fr">' +
              '<div class="dfs-card-stat"><div class="dfs-stat-label">SALARY</div><div class="dfs-stat-value gold">$' + b.salary.toLocaleString() + '</div></div>' +
              '<div class="dfs-card-stat"><div class="dfs-stat-label">VALUE</div><div class="dfs-stat-value" style="color:' + gColor + '">' + b.valueScore + '</div></div>' +
              '<div class="dfs-card-stat"><div class="dfs-stat-label">P.WEAK</div><div class="dfs-stat-value" style="color:' + (b.pWeak >= 65 ? '#00ff9c' : b.pWeak >= 50 ? '#ffd000' : '#ff3b3b') + '">' + b.pWeak + '</div></div>' +
            '</div>' +
            // Score bar
            '<div class="dfs-card-score-bar"><div class="dfs-card-score-fill" style="width:' + Math.min(100, b.matchupScore) + '%;background:' + gColor + '"></div></div>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>' : '<div class="card empty">No budget plays found. Try increasing the salary cap or load more games.</div>') +

    // Why these picks section
    (beasts.length >= 3 ? '<div class="dash-card" style="margin-top:20px"><div class="dash-card-title">\u{1F4A1} WHY THESE BEASTS</div>' +
      '<div style="padding:16px;font-size:13px;color:#94a3b8;line-height:1.7">' +
        'Budget Beasts are ranked by <strong style="color:#ffd000">VALUE SCORE</strong> — matchup quality divided by salary cost. ' +
        'High value scores mean you\'re getting elite matchup exposure at minimum salary. ' +
        'Key factors: <strong style="color:#00ff9c">pitcher weakness</strong> (high ERA/WHIP opponent), ' +
        '<strong style="color:#00ff9c">park factor</strong> (hitter-friendly venues), ' +
        '<strong style="color:#00ff9c">platoon advantage</strong>, and <strong style="color:#00ff9c">Vegas total</strong> (high-scoring games). ' +
        'Use these to fill your cheap slots and stack expensive arms + bats elsewhere.' +
      '</div></div>' : '') +

  '</section>';
}

function updateBudgetSlider(val) {
  state._budgetMax = Number(val);
  var display = document.getElementById('budgetDisplay');
  if (display) display.textContent = '$' + Number(val).toLocaleString();
  // Debounce the re-render
  clearTimeout(state._budgetTimer);
  state._budgetTimer = setTimeout(function() { if (typeof render === 'function') render(); }, 200);
}
window.updateBudgetSlider = updateBudgetSlider;

// ─── TAB 6: OPTIMIZER ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
// DK MLB CLASSIC OPTIMIZER — Exact Scoring + Constraints
// $50K cap, 2P/C/1B/2B/3B/SS/3OF, 2-game min, 5-hitter max per team
// ═══════════════════════════════════════════════════════════════════════════════

function dkProjectHitter(h, oppP, park, market, isHome) {
  var avg = Number(h.avg || .250), slg = Number(h.slg || .400), obp = Number(h.obp || .320);
  var hr = Number(h.hr || 0), sb = Number(h.sb || 0), pa = Math.max(1, Number(h.pa || 200));
  var rbi = Number(h.rbi || 0), runs = Number(h.ops || .720) > 0 ? Number(h.rbi || 0) * 0.8 : 0;
  var era = Number(oppP.era || 4.3), whip = Number(oppP.whip || 1.3), hr9 = Number(oppP.hr9 || 1.15);
  var total = Number(market.total || 8.5);
  var pkR = Number(park.run || 1), pkH = Number(park.hr || 1);
  var hb = isHome ? 1.04 : 0.96;
  var gp = Math.max(1, pa / 4.1);
  // Per-game rates
  var hpg = avg * 4 * hb * (whip >= 1.3 ? 1.06 : 0.96);
  var singlesR = hpg * (1 - (slg - avg) / Math.max(.001, slg));
  var xbhR = hpg - singlesR;
  var doublesR = xbhR * 0.55;
  var triplesR = xbhR * 0.05;
  var hrR = (hr / gp) * pkH * (hr9 >= 1.2 ? 1.12 : 0.92) * hb;
  var rbiR = (rbi / gp) * (total / 8.5) * hb * pkR;
  var runsR = rbiR * 0.85;
  var bbR = (obp - avg) * 4 * (whip >= 1.35 ? 1.1 : 0.9);
  var hbpR = 0.08;
  var sbR = (sb / gp) * hb;
  // DK Scoring
  var pts = singlesR * 3 + doublesR * 5 + triplesR * 8 + hrR * 10 + rbiR * 2 + runsR * 2 + bbR * 2 + hbpR * 2 + sbR * 5;
  return Math.round(pts * 100) / 100;
}

function dkProjectPitcher(p, oppEdge, park) {
  var era = Number(p.era || 4.3), whip = Number(p.whip || 1.3), k9 = Number(p.k9 || 8.6), hr9 = Number(p.hr9 || 1.15);
  var expIP = starterProjection(p);
  var pkR = Number(park.run || 1);
  var outs = expIP * 3;
  var ks = (k9 / 9) * expIP * (oppEdge <= 55 ? 1.04 : 0.92);
  var er = (era / 9) * expIP * pkR;
  var ha = whip * expIP * 0.68 * pkR;
  var bba = whip * expIP * 0.32;
  var hbp = 0.15;
  var winProb = era <= 3.5 ? 0.55 : era <= 4.0 ? 0.48 : era <= 4.5 ? 0.40 : 0.30;
  var cgProb = expIP >= 7.5 ? 0.04 : 0;
  // DK Scoring
  var pts = outs * 0.75 + ks * 2 + winProb * 4 - er * 2 - ha * 0.6 - bba * 0.6 - hbp * 0.6 + cgProb * 5;
  return Math.round(pts * 100) / 100;
}

function runEliteOptimizer() {
  var CAP = 50000;
  var SLOTS = [
    {id:'P1',label:'P',pos:'P',isPitcher:true},{id:'P2',label:'P',pos:'P',isPitcher:true},
    {id:'C',label:'C',pos:'C'},{id:'1B',label:'1B',pos:'1B'},
    {id:'2B',label:'2B',pos:'2B'},{id:'3B',label:'3B',pos:'3B'},
    {id:'SS',label:'SS',pos:'SS'},
    {id:'OF1',label:'OF',pos:'OF'},{id:'OF2',label:'OF',pos:'OF'},{id:'OF3',label:'OF',pos:'OF'}
  ];

  var stackTeam = (document.getElementById('optStackTeam') || {}).value || '';
  var numLineups = Number((document.getElementById('optNumLineups') || {}).value) || 3;

  // Build player pool with DK projections
  var pool = [];
  state.games.forEach(function(g) {
    var park = parkFor(g.venue.name);
    var m = getMarket(g);
    var awayEdge = teamEdgeScore(g, 'away'), homeEdge = teamEdgeScore(g, 'home');

    // Pitchers
    [{ p: g.awayPitcher, team: g.away.abbr, side: 'away', oppEdge: homeEdge },
     { p: g.homePitcher, team: g.home.abbr, side: 'home', oppEdge: awayEdge }].forEach(function(x) {
      if (!x.p || !x.p.name || x.p.name === 'TBD') return;
      var dk = getDKSalary(x.p.name);
      var salary = dk ? dk.salary : 8000;
      if (salary < 1000) salary = 8000;
      var pts = dkProjectPitcher(x.p, x.oppEdge, park);
      pool.push({ name: x.p.name, team: x.team, pos: 'P', salary: salary, proj: pts, gamePk: g.gamePk, isPitcher: true, grade: pitcherEdgeRank(x.p, g, x.side) });
    });

    // Hitters
    if (state.selectedGameData && g.gamePk === state.selectedGamePk) {
      var sg = state.selectedGameData;
      [].concat(sg.awayHitters || []).concat(sg.homeHitters || []).forEach(function(h) {
        var isHome = (sg.homeHitters || []).indexOf(h) >= 0;
        var oppP = isHome ? sg.awayPitcher : sg.homePitcher;
        var dk = getDKSalary(h.name);
        var salary = dk ? dk.salary : 4000;
        if (salary < 1000) salary = 4000;
        var pos = (dk ? dk.pos : h.pos) || 'OF';
        var pts = dkProjectHitter(h, oppP, park, m, isHome);
        pool.push({ name: h.name, team: isHome ? sg.home.abbr : sg.away.abbr, pos: pos.toUpperCase(), salary: salary, proj: pts, gamePk: g.gamePk, isPitcher: false, grade: h.grade ? h.grade.score : 50 });
      });
    }

    // Pull ALL hitters from DK salary data for this game's teams
    Object.values(state.dkSalaries || {}).forEach(function(dk) {
      if (!dk.salary || dk.salary < 2000) return;
      var teamKey = (dk.team || '').toUpperCase();
      if ((g.away.abbr || '').toUpperCase() !== teamKey && (g.home.abbr || '').toUpperCase() !== teamKey) return;
      if (pool.some(function(p) { return p.name.toLowerCase() === dk.name.toLowerCase(); })) return;
      var isPitch = /^(SP|RP|P)$/i.test(dk.pos || '');
      if (isPitch) return; // pitchers already added from game data
      var isHome = (g.home.abbr || '').toUpperCase() === teamKey;
      var oppP = isHome ? g.awayPitcher : g.homePitcher;
      var pts = dk.avgPts || (dk.salary / 1000 * 2.5);
      pool.push({ name: dk.name, team: dk.team, pos: (dk.pos || 'OF').toUpperCase(), salary: dk.salary, proj: pts, gamePk: g.gamePk, isPitcher: false, grade: 50 });
    });

    // Also pull from hardcoded DK_PLAYERS (dk-salaries-inject.js) which has correct positions
    if (typeof DK_PLAYERS !== 'undefined') {
      DK_PLAYERS.forEach(function(dk) {
        if (!dk.salary || dk.salary < 2000) return;
        var teamKey = (dk.team || '').toUpperCase();
        if ((g.away.abbr || '').toUpperCase() !== teamKey && (g.home.abbr || '').toUpperCase() !== teamKey) return;
        if (pool.some(function(p) { return p.name.toLowerCase() === dk.name.toLowerCase(); })) return;
        var isPitch = /^(SP|RP|P)$/i.test(dk.pos || '');
        if (isPitch) return;
        var isHome = (g.home.abbr || '').toUpperCase() === teamKey;
        var pts = dk.avgPts || (dk.salary / 1000 * 2.5);
        pool.push({ name: dk.name, team: dk.team, pos: (dk.pos || dk.rosterPos || 'OF').toUpperCase(), salary: dk.salary, proj: pts, gamePk: g.gamePk, isPitcher: false, grade: 50 });
      });
    }
  });

  // De-duplicate
  var seen = {};
  pool = pool.filter(function(p) {
    var k = p.name.toLowerCase();
    if (seen[k]) return false;
    seen[k] = true;
    return true;
  });

  // Debug: log position breakdown
  var posCounts = {};
  pool.forEach(function(p) { var pp = p.pos; posCounts[pp] = (posCounts[pp] || 0) + 1; });
  console.log('[Optimizer] Pool:', pool.length, 'players. Positions:', JSON.stringify(posCounts));

  // Stack boost
  if (stackTeam) {
    pool.forEach(function(p) {
      if (p.team.toUpperCase() === stackTeam.toUpperCase() && !p.isPitcher) p.proj += 3;
    });
  }

  // Sort by HIGHEST PROJECTION (best players first, maximize points)
  pool.sort(function(a, b) { return b.proj - a.proj; });

  // Position eligibility check
  function fitsSlot(p, slotPos, slotIsPitcher) {
    if (slotIsPitcher) return p.isPitcher;
    if (p.isPitcher) return false;
    var allPos = p.pos.toUpperCase().split(/[\/,]/);
    if (slotPos === 'OF') return allPos.some(function(pp) { return pp === 'OF' || pp === 'CF' || pp === 'LF' || pp === 'RF'; });
    return allPos.some(function(pp) { return pp === slotPos; });
  }

  // Generate lineups
  var lineups = [];
  for (var li = 0; li < numLineups; li++) {
    var lineup = [];
    var used = {};
    var salaryUsed = 0;
    var teamCounts = {};
    var gameSet = {};

    // Diversity: randomize slightly after first lineup
    var sortedPool = pool.slice();
    if (li > 0) {
      sortedPool.forEach(function(p) { p._rnd = p.proj * (0.8 + Math.random() * 0.4); });
      sortedPool.sort(function(a, b) { return b._rnd - a._rnd; });
    }

    // PASS 1: Fill each slot with highest projected eligible player
    for (var si = 0; si < SLOTS.length; si++) {
      var slot = SLOTS[si];
      var slotsLeft = SLOTS.length - lineup.length - 1;
      var minReserve = slotsLeft * 2000;
      var maxForThis = CAP - salaryUsed - minReserve;

      var pick = null;
      for (var pi = 0; pi < sortedPool.length; pi++) {
        var p = sortedPool[pi];
        if (used[p.name]) continue;
        if (p.salary > maxForThis) continue;
        if (!fitsSlot(p, slot.pos, slot.isPitcher)) continue;
        if (!p.isPitcher && (teamCounts[p.team] || 0) >= 5) continue;
        pick = p;
        break;
      }

      if (pick) {
        lineup.push(Object.assign({}, pick, { slotLabel: slot.label, slotId: slot.id }));
        used[pick.name] = true;
        salaryUsed += pick.salary;
        if (!pick.isPitcher) teamCounts[pick.team] = (teamCounts[pick.team] || 0) + 1;
        gameSet[pick.gamePk] = true;
      }
    }

    // PASS 2: Upgrade — spend remaining salary by swapping cheap players for better ones
    var remaining = CAP - salaryUsed;
    var upgradeRounds = 0;
    while (remaining > 500 && upgradeRounds < 40) {
      upgradeRounds++;
      // Find cheapest hitter in lineup
      var cheapIdx = -1, cheapSal = Infinity;
      for (var ci = 0; ci < lineup.length; ci++) {
        if (lineup[ci].isPitcher) continue;
        if (lineup[ci].salary < cheapSal) { cheapSal = lineup[ci].salary; cheapIdx = ci; }
      }
      if (cheapIdx < 0) break;

      var cheap = lineup[cheapIdx];
      var maxBudget = cheap.salary + remaining;

      // Find highest-projected upgrade for this slot
      var upgrade = null;
      for (var ui = 0; ui < sortedPool.length; ui++) {
        var u = sortedPool[ui];
        if (used[u.name]) continue;
        if (u.salary > maxBudget || u.salary <= cheap.salary) continue;
        if (u.proj <= cheap.proj) continue;
        if (!fitsSlot(u, cheap.slotLabel, false)) continue;
        if ((teamCounts[u.team] || 0) >= 5 && u.team !== cheap.team) continue;
        upgrade = u;
        break;
      }

      if (upgrade) {
        delete used[cheap.name];
        used[upgrade.name] = true;
        salaryUsed = salaryUsed - cheap.salary + upgrade.salary;
        remaining = CAP - salaryUsed;
        if (cheap.team !== upgrade.team) {
          teamCounts[cheap.team] = Math.max(0, (teamCounts[cheap.team] || 0) - 1);
          teamCounts[upgrade.team] = (teamCounts[upgrade.team] || 0) + 1;
        }
        gameSet[upgrade.gamePk] = true;
        lineup[cheapIdx] = Object.assign({}, upgrade, { slotLabel: cheap.slotLabel, slotId: cheap.slotId });
      } else {
        break;
      }
    }

    // Also try upgrading pitchers
    remaining = CAP - salaryUsed;
    if (remaining > 500) {
      for (var pi2 = 0; pi2 < lineup.length; pi2++) {
        if (!lineup[pi2].isPitcher) continue;
        var cheapP = lineup[pi2];
        var maxP = cheapP.salary + remaining;
        for (var upi = 0; upi < sortedPool.length; upi++) {
          var up = sortedPool[upi];
          if (!up.isPitcher || used[up.name]) continue;
          if (up.salary > maxP || up.salary <= cheapP.salary || up.proj <= cheapP.proj) continue;
          delete used[cheapP.name];
          used[up.name] = true;
          salaryUsed = salaryUsed - cheapP.salary + up.salary;
          remaining = CAP - salaryUsed;
          gameSet[up.gamePk] = true;
          lineup[pi2] = Object.assign({}, up, { slotLabel: cheapP.slotLabel, slotId: cheapP.slotId });
          break;
        }
      }
    }

    var gameCount = Object.keys(gameSet).length;
    var totalSalary = lineup.reduce(function(s, p) { return s + p.salary; }, 0);
    var totalProj = lineup.reduce(function(s, p) { return s + p.proj; }, 0);

    lineups.push({
      lineup: lineup,
      totalSalary: totalSalary,
      remaining: CAP - totalSalary,
      totalProj: Math.round(totalProj * 10) / 10,
      valid: lineup.length === 10 && totalSalary <= CAP && gameCount >= 2,
      gameCount: gameCount,
      teamCounts: teamCounts,
      stackTeam: stackTeam
    });
  }

  lineups.sort(function(a, b) { return b.totalProj - a.totalProj; });

  state.optimizerResults = lineups;
  if (typeof render === 'function') render();
}

function renderOptimizer() {
  var dkCount = Object.keys(state.dkSalaries || {}).length;
  var results = state.optimizerResults || [];

  // Unique teams for stack selector
  var teams = [];
  state.games.forEach(function(g) {
    if (teams.indexOf(g.away.abbr) < 0) teams.push(g.away.abbr);
    if (teams.indexOf(g.home.abbr) < 0) teams.push(g.home.abbr);
  });
  teams.sort();

  return '<section>' +
    '<div class="section-title"><h2>\u{1F3AF} DK MLB CLASSIC OPTIMIZER</h2><div class="meta">$50,000 salary cap \u00B7 2P/C/1B/2B/3B/SS/3OF \u00B7 DraftKings exact scoring</div></div>' +

    // Controls
    '<div class="dash-card" style="margin-bottom:16px">' +
      '<div style="padding:20px">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:14px;align-items:end">' +
          '<label style="font-size:11px;color:var(--muted);font-weight:700;letter-spacing:1px"><span style="display:block;margin-bottom:6px">STACK TEAM</span>' +
            '<select id="optStackTeam" class="field" style="width:100%">' +
              '<option value="">No preference</option>' +
              teams.map(function(t) { return '<option value="' + t + '">' + t + '</option>'; }).join('') +
            '</select></label>' +
          '<label style="font-size:11px;color:var(--muted);font-weight:700;letter-spacing:1px"><span style="display:block;margin-bottom:6px"># LINEUPS</span>' +
            '<select id="optNumLineups" class="field" style="width:100%">' +
              '<option value="1">1 Lineup</option><option value="3" selected>3 Lineups</option><option value="5">5 Lineups</option><option value="10">10 Lineups</option>' +
            '</select></label>' +
          '<div style="font-size:11px;color:var(--muted)">' +
            '<div>' + dkCount + ' DK players loaded</div>' +
            '<div>' + state.games.length + ' games on slate</div>' +
          '</div>' +
          '<button class="button primary" onclick="runEliteOptimizer()" style="height:44px;font-size:15px;padding:0 28px">\u{1F3AF} OPTIMIZE</button>' +
        '</div>' +
        // Scoring reference
        '<details style="margin-top:14px">' +
          '<summary style="font-size:11px;color:var(--muted);cursor:pointer;font-weight:700">DK CLASSIC SCORING RULES</summary>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:10px;font-size:12px;color:var(--muted)">' +
            '<div><strong style="color:#e8f0fa">HITTERS</strong><br>Single +3 \u00B7 Double +5 \u00B7 Triple +8 \u00B7 HR +10<br>RBI +2 \u00B7 Run +2 \u00B7 BB +2 \u00B7 HBP +2 \u00B7 SB +5</div>' +
            '<div><strong style="color:#e8f0fa">PITCHERS</strong><br>Out +0.75 \u00B7 K +2 \u00B7 Win +4<br>ER -2 \u00B7 H -0.6 \u00B7 BB -0.6 \u00B7 HBP -0.6<br>CG +2.5 \u00B7 CGSO +2.5 \u00B7 No-Hit +5</div>' +
          '</div>' +
          '<div style="font-size:11px;color:#334155;margin-top:8px">Constraints: $50K cap \u00B7 2+ games \u00B7 Max 5 hitters/team \u00B7 10 roster spots</div>' +
        '</details>' +
      '</div>' +
    '</div>' +

    // Results
    (results.length ? results.map(function(r, idx) {
      return '<div class="lineup-card" style="margin-bottom:16px">' +
        '<div class="lineup-header">' +
          '<div class="lineup-label">LINEUP ' + (idx + 1) + (r.stackTeam ? ' \u00B7 ' + r.stackTeam + ' STACK' : '') + '</div>' +
          '<div class="lineup-total">' +
            '<span style="color:' + (r.valid ? '#00ff9c' : '#ff3b3b') + '">' + (r.valid ? '\u2705' : '\u274C') + '</span> ' +
            '$' + r.totalSalary.toLocaleString() + '/$50K \u00B7 ' +
            '<strong style="color:#ffd000">' + r.totalProj + ' pts</strong> \u00B7 ' +
            r.gameCount + ' games' +
          '</div>' +
        '</div>' +
        // Column headers
        '<div class="opt-row opt-header">' +
          '<div class="opt-cell">POS</div><div class="opt-cell">PLAYER</div><div class="opt-cell">TEAM</div><div class="opt-cell">SALARY</div><div class="opt-cell">PROJ PTS</div><div class="opt-cell">GRADE</div>' +
        '</div>' +
        r.lineup.map(function(p) {
          var gradeColor = p.grade >= 80 ? '#00ff9c' : p.grade >= 65 ? '#ffd000' : '#94a3b8';
          return '<div class="opt-row">' +
            '<div class="opt-cell opt-pos">' + p.slotLabel + '</div>' +
            '<div class="opt-cell opt-name">' + escapeHtml(p.name) + '</div>' +
            '<div class="opt-cell">' + p.team + '</div>' +
            '<div class="opt-cell opt-salary">$' + p.salary.toLocaleString() + '</div>' +
            '<div class="opt-cell opt-proj">' + p.proj.toFixed(1) + '</div>' +
            '<div class="opt-cell" style="color:' + gradeColor + '">' + p.grade + '</div>' +
          '</div>';
        }).join('') +
        // Summary bar
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid rgba(30,41,59,.4);background:rgba(6,14,26,.4)">' +
          '<div class="pcard-stat"><div class="pcard-stat-val" style="color:' + (r.totalSalary <= 50000 ? '#00ff9c' : '#ff3b3b') + '">$' + r.totalSalary.toLocaleString() + '</div><div class="pcard-stat-lbl">SALARY</div></div>' +
          '<div class="pcard-stat"><div class="pcard-stat-val" style="color:#ffd000">$' + r.remaining.toLocaleString() + '</div><div class="pcard-stat-lbl">REMAINING</div></div>' +
          '<div class="pcard-stat"><div class="pcard-stat-val" style="color:#00ff9c">' + r.totalProj + '</div><div class="pcard-stat-lbl">PROJ PTS</div></div>' +
          '<div class="pcard-stat"><div class="pcard-stat-val">' + r.gameCount + '</div><div class="pcard-stat-lbl">GAMES</div></div>' +
        '</div>' +
      '</div>';
    }).join('') : '<div class="card empty">Click OPTIMIZE to generate lineups. Load games and DK salaries first.</div>') +

  '</section>';
}

// Keep old function name for backward compat
function runOptimizer() { runEliteOptimizer(); }
function renderOptimizerResult() { return ''; }

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
        '<button class="button primary" onclick="fetchLiveLineups()" style="margin-bottom:8px">\u{1F4CB} Sync Live Lineups</button>' +
        '<div style="font-size:11px;color:var(--muted);margin-bottom:8px">Lineups: ' + (state.lineupsStatus.status === 'ok' ? '<span style="color:#00ff9c">' + (state.lineupsStatus.count || 0) + ' games from ' + (state.lineupsStatus.source || '?') + '</span>' : state.lineupsStatus.status) + '</div>' +
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

    // Get DK slate pitchers (these are the SOURCE OF TRUTH for today's starters)
    var dkPitchers = [];
    var salarySource = state.dkSalaries || {};
    Object.values(salarySource).forEach(function(p) {
      if (!p.salary || p.salary < 6000) return;
      var pos = (p.pos || '').toUpperCase();
      if (pos === 'SP' || pos === 'RP' || pos === 'P') {
        dkPitchers.push({ name: p.name, team: p.team, salary: p.salary, avgPts: p.avgPts || 0 });
      }
    });
    // Also from hardcoded DK_PLAYERS
    if (typeof DK_PLAYERS !== 'undefined' && Array.isArray(DK_PLAYERS)) {
      DK_PLAYERS.forEach(function(p) {
        if (p.salary >= 6000 && /^(SP|RP)$/i.test(p.pos)) {
          if (!dkPitchers.some(function(dp) { return dp.name.toLowerCase() === p.name.toLowerCase(); })) {
            dkPitchers.push({ name: p.name, team: p.team, salary: p.salary, avgPts: p.avgPts || 0 });
          }
        }
      });
    }
    // From main slate
    if (typeof DK_SLATE_MAIN !== 'undefined' && state.activeSlate === 'main') {
      DK_SLATE_MAIN.players.forEach(function(p) {
        if (p.salary >= 6000 && /^(SP|RP)$/i.test(p.pos)) {
          if (!dkPitchers.some(function(dp) { return dp.name.toLowerCase() === p.name.toLowerCase(); })) {
            dkPitchers.push({ name: p.name, team: p.team, salary: p.salary, avgPts: p.avgPts || 0 });
          }
        }
      });
    }
    dkPitchers.sort(function(a, b) { return b.salary - a.salary; });
    // Build salary data — prefer players with real salaries (>$0)
    var salaryMap = {};
    // First: hardcoded DK_PLAYERS (always have real salaries from dk-salaries-inject.js)
    if (typeof DK_PLAYERS !== 'undefined' && Array.isArray(DK_PLAYERS)) {
      DK_PLAYERS.forEach(function(p) {
        if (p.salary > 0) salaryMap[p.name.toLowerCase()] = { name: p.name, pos: p.pos, salary: p.salary, team: p.team, avgPts: p.avgPts || 0 };
      });
    }
    // Also check window.DK_PLAYERS
    if (typeof window !== 'undefined' && window.DK_PLAYERS && Array.isArray(window.DK_PLAYERS)) {
      window.DK_PLAYERS.forEach(function(p) {
        if (p.salary > 0 && !salaryMap[p.name.toLowerCase()]) {
          salaryMap[p.name.toLowerCase()] = { name: p.name, pos: p.pos, salary: p.salary, team: p.team, avgPts: p.avgPts || 0 };
        }
      });
    }
    // Then: state.dkSalaries (only if salary > 0)
    Object.values(state.dkSalaries || {}).forEach(function(p) {
      if (p.salary > 0 && !salaryMap[(p.name || '').toLowerCase()]) {
        salaryMap[(p.name || '').toLowerCase()] = { name: p.name, pos: p.pos, salary: p.salary, team: p.team, avgPts: p.avgPts || 0 };
      }
    });
    // Build confirmed lineups string for Claude
    var lineupText = '';
    if (typeof DK_CONFIRMED_LINEUPS !== 'undefined') {
      var lg = DK_CONFIRMED_LINEUPS;
      Object.keys(lg).forEach(function(game) {
        var g = lg[game];
        lineupText += '\n' + game + ':\n';
        ['away','home'].forEach(function(side) {
          var s = g[side];
          lineupText += '  ' + s.team + ' (SP: ' + s.pitcher + '): ';
          lineupText += s.lineup.map(function(p) { return p.order + '. ' + p.name + ' (' + p.bat + ') ' + p.pos; }).join(', ');
          lineupText += '\n';
        });
      });
    }

    var dkSals = Object.values(salaryMap).sort(function(a,b) { return b.salary - a.salary; }).slice(0, 150);
    console.log('[AI Picks] Sending ' + dkSals.length + ' players, ' + dkPitchers.length + ' pitchers, lineups: ' + (lineupText ? 'YES' : 'NO'));
    const resp = await fetch('/api/ai-picks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ games, date: state.selectedDate, mode: state.aiMode, dkSalaries: dkSals, dkPitchers: dkPitchers.slice(0, 30), slate: state.activeSlate, confirmedLineups: lineupText })
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
window.runEliteOptimizer = runEliteOptimizer;
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
