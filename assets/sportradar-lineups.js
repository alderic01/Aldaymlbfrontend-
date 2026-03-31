// ─── Sportradar MLB Lineups & Rosters ────────────────────────────────────────
// Integration with Sportradar MLB API for starting lineups, game rosters,
// probable pitchers, and in-game lineup changes.

const SPORTRADAR_POSITION_MAP = {
  1: 'P', 2: 'C', 3: '1B', 4: '2B', 5: '3B', 6: 'SS',
  7: 'LF', 8: 'CF', 9: 'RF', 10: 'DH', 11: 'PH', 12: 'PR'
};

const SPORTRADAR_POSITION_LABELS = {
  1: 'Pitcher', 2: 'Catcher', 3: 'First Base', 4: 'Second Base',
  5: 'Third Base', 6: 'Shortstop', 7: 'Left Field', 8: 'Centerfield',
  9: 'Right Field', 10: 'Designated Hitter', 11: 'Pinch Hitter', 12: 'Pinch Runner'
};

// ─── Config ──────────────────────────────────────────────────────────────────
function getSportradarConfig() {
  const cfg = JSON.parse(localStorage.getItem('mlb-edge-sportradar-config') || '{}');
  return {
    apiKey: cfg.apiKey || '',
    accessLevel: cfg.accessLevel || 'trial',
    language: cfg.language || 'en',
    format: 'json'
  };
}

function saveSportradarConfig(patch) {
  const current = getSportradarConfig();
  const updated = { ...current, ...patch };
  localStorage.setItem('mlb-edge-sportradar-config', JSON.stringify(updated));
  return updated;
}

function sportradarBaseUrl() {
  const cfg = getSportradarConfig();
  return `https://api.sportradar.com/mlb/${cfg.accessLevel}/v8/${cfg.language}`;
}

// ─── API Fetchers ────────────────────────────────────────────────────────────
async function sportradarFetch(path) {
  const cfg = getSportradarConfig();
  if (!cfg.apiKey) throw new Error('Sportradar API key not configured');
  const sep = path.includes('?') ? '&' : '?';
  const url = `${sportradarBaseUrl()}${path}${sep}api_key=${cfg.apiKey}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Sportradar API ${resp.status}: ${resp.statusText}`);
  return resp.json();
}

// Daily Schedule — discover game IDs for a date
async function srDailySchedule(date) {
  const [y, m, d] = date.split('-');
  return sportradarFetch(`/games/${y}/${m}/${d}/schedule.json`);
}

// Game Summary — core lineup and roster data
async function srGameSummary(gameId) {
  return sportradarFetch(`/games/${gameId}/summary.json`);
}

// Game Extended Summary — deeper substitution tracking
async function srGameExtendedSummary(gameId) {
  return sportradarFetch(`/games/${gameId}/extended_summary.json`);
}

// Daily Summary — historical lineups for completed games
async function srDailySummary(date) {
  const [y, m, d] = date.split('-');
  return sportradarFetch(`/games/${y}/${m}/${d}/summary.json`);
}

// Daily Change Log — detect updates without polling full payloads
async function srDailyChangeLog(date) {
  const [y, m, d] = date.split('-');
  return sportradarFetch(`/league/${y}/${m}/${d}/changes.json`);
}

// ─── Lineup Parsing ──────────────────────────────────────────────────────────

// Parse lineup array from a team object in Game Summary
function parseLineup(teamData) {
  const lineup = teamData?.lineup || [];
  const rosterMap = buildRosterMap(teamData);

  // Starting lineup: inning === 0 entries
  const starters = lineup
    .filter(entry => entry.inning === 0)
    .sort((a, b) => a.order - b.order)
    .map(entry => {
      const player = rosterMap[entry.id] || {};
      return {
        id: entry.id,
        name: player.full_name || player.preferred_name || 'Unknown',
        firstName: player.first_name || '',
        lastName: player.last_name || '',
        jerseyNumber: player.jersey_number || '',
        battingOrder: entry.order,
        position: entry.position,
        positionAbbr: SPORTRADAR_POSITION_MAP[entry.position] || '??',
        positionLabel: SPORTRADAR_POSITION_LABELS[entry.position] || 'Unknown',
        sequence: entry.sequence,
        primaryPosition: player.primary_position || '',
        status: player.status || ''
      };
    });

  return starters;
}

// Parse all lineup entries including substitutions
function parseFullLineupHistory(teamData) {
  const lineup = teamData?.lineup || [];
  const rosterMap = buildRosterMap(teamData);

  return lineup
    .sort((a, b) => a.sequence - b.sequence)
    .map(entry => {
      const player = rosterMap[entry.id] || {};
      return {
        id: entry.id,
        name: player.full_name || player.preferred_name || 'Unknown',
        jerseyNumber: player.jersey_number || '',
        battingOrder: entry.order,
        position: entry.position,
        positionAbbr: SPORTRADAR_POSITION_MAP[entry.position] || '??',
        positionLabel: SPORTRADAR_POSITION_LABELS[entry.position] || 'Unknown',
        inning: entry.inning,
        inningHalf: entry.inning_half || '',
        sequence: entry.sequence,
        isStarter: entry.inning === 0,
        isSubstitution: entry.inning > 0
      };
    });
}

// Detect lineup changes between two sequence snapshots
function detectLineupChanges(lineupHistory) {
  const changes = lineupHistory.filter(entry => entry.isSubstitution);
  return changes.map(entry => ({
    ...entry,
    changeType: entry.position === 1 ? 'Pitching Change' :
                entry.position === 11 ? 'Pinch Hitter' :
                entry.position === 12 ? 'Pinch Runner' : 'Defensive Sub',
    description: `${entry.name} entered at ${entry.positionLabel} (${entry.inningHalf === 'T' ? 'Top' : 'Bot'} ${entry.inning})`
  }));
}

// ─── Roster Parsing ──────────────────────────────────────────────────────────

function buildRosterMap(teamData) {
  const roster = teamData?.roster || [];
  const map = {};
  roster.forEach(p => { map[p.id] = p; });
  return map;
}

function parseGameRoster(teamData) {
  const roster = teamData?.roster || [];
  const lineupIds = new Set((teamData?.lineup || []).filter(e => e.inning === 0).map(e => e.id));

  const pitchers = [];
  const starters = [];
  const bench = [];

  roster.forEach(player => {
    const entry = {
      id: player.id,
      name: player.full_name || `${player.preferred_name || player.first_name} ${player.last_name}`,
      jerseyNumber: player.jersey_number || '',
      position: player.position || '',
      primaryPosition: player.primary_position || '',
      status: player.status || 'A',
      isStarter: lineupIds.has(player.id)
    };

    if (player.position === 'P' || /^(SP|RP|CL)$/.test(player.primary_position)) {
      pitchers.push(entry);
    } else if (entry.isStarter) {
      starters.push(entry);
    } else {
      bench.push(entry);
    }
  });

  // Sort pitchers: SP first, then RP
  pitchers.sort((a, b) => {
    if (a.primary_position === 'SP' && b.primary_position !== 'SP') return -1;
    if (a.primary_position !== 'SP' && b.primary_position === 'SP') return 1;
    return 0;
  });

  return { pitchers, starters, bench, total: roster.length };
}

// ─── Probable Pitcher Parsing ────────────────────────────────────────────────
function parseProbablePitcher(teamData) {
  const pp = teamData?.probable_pitcher;
  if (!pp) return null;
  return {
    id: pp.id,
    name: pp.full_name || `${pp.preferred_name || pp.first_name} ${pp.last_name}`,
    jerseyNumber: pp.jersey_number || '',
    win: pp.win || 0,
    loss: pp.loss || 0,
    era: pp.era || 0
  };
}

// ─── High-Level Game Data Loader ─────────────────────────────────────────────
// Cache to avoid redundant API calls
const _srGameCache = {};

async function loadSportradarGame(gameId, extended) {
  const cacheKey = `${gameId}:${extended ? 'ext' : 'std'}`;
  if (_srGameCache[cacheKey]) return _srGameCache[cacheKey];

  const data = extended
    ? await srGameExtendedSummary(gameId)
    : await srGameSummary(gameId);

  const home = data.game?.home || {};
  const away = data.game?.away || {};

  const result = {
    gameId: data.game?.id || gameId,
    status: data.game?.status || 'scheduled',
    scheduled: data.game?.scheduled || '',
    venue: data.game?.venue || {},
    home: {
      team: { id: home.id, name: home.name, market: home.market, abbr: home.abbr },
      probablePitcher: parseProbablePitcher(home),
      startingPitcher: home.starting_pitcher ? {
        id: home.starting_pitcher.id,
        name: home.starting_pitcher.full_name || `${home.starting_pitcher.preferred_name} ${home.starting_pitcher.last_name}`
      } : null,
      lineup: parseLineup(home),
      lineupHistory: parseFullLineupHistory(home),
      lineupChanges: detectLineupChanges(parseFullLineupHistory(home)),
      roster: parseGameRoster(home)
    },
    away: {
      team: { id: away.id, name: away.name, market: away.market, abbr: away.abbr },
      probablePitcher: parseProbablePitcher(away),
      startingPitcher: away.starting_pitcher ? {
        id: away.starting_pitcher.id,
        name: away.starting_pitcher.full_name || `${away.starting_pitcher.preferred_name} ${away.starting_pitcher.last_name}`
      } : null,
      lineup: parseLineup(away),
      lineupHistory: parseFullLineupHistory(away),
      lineupChanges: detectLineupChanges(parseFullLineupHistory(away)),
      roster: parseGameRoster(away)
    },
    raw: data
  };

  _srGameCache[cacheKey] = result;
  return result;
}

// Load all games for a date from Sportradar
async function loadSportradarSchedule(date) {
  const data = await srDailySchedule(date);
  const games = (data.games || []).map(g => ({
    id: g.id,
    status: g.status || 'scheduled',
    scheduled: g.scheduled || '',
    home: { id: g.home?.id, name: g.home?.name, market: g.home?.market, abbr: g.home?.abbr },
    away: { id: g.away?.id, name: g.away?.name, market: g.away?.market, abbr: g.away?.abbr },
    venue: g.venue || {},
    broadcast: g.broadcast || {}
  }));
  return games;
}

// ─── State Management ────────────────────────────────────────────────────────
// Stored on the global state object as state.sportradar
function initSportradarState() {
  if (typeof state !== 'undefined' && !state.sportradar) {
    state.sportradar = {
      games: [],
      selectedGameId: null,
      selectedGameData: null,
      loading: false,
      error: null,
      useExtendedSummary: false
    };
  }
}

async function loadSportradarSlate(date) {
  initSportradarState();
  state.sportradar.loading = true;
  state.sportradar.error = null;
  if (typeof render === 'function') render();

  try {
    state.sportradar.games = await loadSportradarSchedule(date);
    if (state.sportradar.games.length && !state.sportradar.selectedGameId) {
      state.sportradar.selectedGameId = state.sportradar.games[0].id;
    }
    if (state.sportradar.selectedGameId) {
      await selectSportradarGame(state.sportradar.selectedGameId);
    }
  } catch (err) {
    console.error('Sportradar slate error:', err);
    state.sportradar.error = err.message;
  } finally {
    state.sportradar.loading = false;
    if (typeof render === 'function') render();
  }
}

async function selectSportradarGame(gameId) {
  initSportradarState();
  state.sportradar.selectedGameId = gameId;
  state.sportradar.loading = true;
  if (typeof render === 'function') render();

  try {
    state.sportradar.selectedGameData = await loadSportradarGame(
      gameId,
      state.sportradar.useExtendedSummary
    );
    state.sportradar.error = null;
  } catch (err) {
    console.error('Sportradar game load error:', err);
    state.sportradar.error = err.message;
    state.sportradar.selectedGameData = null;
  } finally {
    state.sportradar.loading = false;
    if (typeof render === 'function') render();
  }
}

// Refresh current game (for live updates during games)
async function refreshSportradarGame() {
  if (!state.sportradar?.selectedGameId) return;
  // Clear cache to force fresh fetch
  const id = state.sportradar.selectedGameId;
  delete _srGameCache[`${id}:std`];
  delete _srGameCache[`${id}:ext`];
  await selectSportradarGame(id);
}

// ─── Render: Lineups & Rosters Tab ──────────────────────────────────────────
function renderLineupsRosters() {
  initSportradarState();
  const sr = state.sportradar;
  const cfg = getSportradarConfig();
  const hasKey = !!cfg.apiKey;

  // Config panel (always shown)
  let html = `<section id="lineupsSection">
    <div class="section-title">
      <h2>Lineups & Rosters</h2>
      <div class="meta">Sportradar MLB API &middot; Starting lineups, game rosters, substitutions</div>
    </div>

    <div class="card callout" style="margin-bottom:16px">
      <h3>Sportradar API Settings</h3>
      <div class="shell-form-grid" style="margin-top:10px">
        <label class="label full">API Key
          <input id="srApiKey" class="field" type="password" value="${escapeHtml(cfg.apiKey)}" placeholder="Enter your Sportradar API key" />
        </label>
        <label class="label">Access Level
          <select id="srAccessLevel" class="field">
            ${['trial', 'production'].map(x => `<option value="${x}" ${cfg.accessLevel === x ? 'selected' : ''}>${x.charAt(0).toUpperCase() + x.slice(1)}</option>`).join('')}
          </select>
        </label>
        <label class="label">Summary Type
          <select id="srSummaryType" class="field">
            <option value="standard" ${!sr.useExtendedSummary ? 'selected' : ''}>Game Summary</option>
            <option value="extended" ${sr.useExtendedSummary ? 'selected' : ''}>Extended Summary</option>
          </select>
        </label>
      </div>
      <div class="hero-actions" style="margin-top:12px">
        <button class="button primary" id="srSaveConfig">Save Settings</button>
        <button class="button" id="srLoadSlate" ${!hasKey ? 'disabled' : ''}>Load Sportradar Slate</button>
        <button class="button" id="srRefreshGame" ${!sr.selectedGameData ? 'disabled' : ''}>Refresh Game</button>
      </div>
    </div>`;

  if (!hasKey) {
    html += `<div class="card empty">Enter your Sportradar API key above to load lineups and rosters.</div></section>`;
    return html;
  }

  if (sr.loading) {
    html += `<div class="card loading"><strong>Loading Sportradar data...</strong></div></section>`;
    return html;
  }

  if (sr.error) {
    html += `<div class="card callout" style="border-color:rgba(255,95,109,.3)"><p style="color:#ff9fa7">${escapeHtml(sr.error)}</p></div>`;
  }

  // Game selector
  if (sr.games.length) {
    html += `<div class="card" style="padding:16px;margin-bottom:16px">
      <div class="eyebrow" style="margin-bottom:10px">Games &middot; ${state.selectedDate} &middot; ${sr.games.length} found</div>
      <div class="sr-game-grid">
        ${sr.games.map(g => `
          <button class="sr-game-chip ${g.id === sr.selectedGameId ? 'active' : ''}" data-sr-game="${g.id}">
            <span class="sr-game-teams">${escapeHtml(g.away.abbr || '?')} @ ${escapeHtml(g.home.abbr || '?')}</span>
            <span class="sr-game-status">${escapeHtml(g.status)}</span>
          </button>
        `).join('')}
      </div>
    </div>`;
  } else if (!sr.loading) {
    html += `<div class="card empty">No Sportradar games loaded. Tap "Load Sportradar Slate" to fetch today's games.</div>`;
  }

  // Selected game detail
  const gd = sr.selectedGameData;
  if (gd) {
    const homeTeam = gd.home.team;
    const awayTeam = gd.away.team;

    html += `<div class="card" style="padding:16px;margin-bottom:16px">
      <div class="row" style="align-items:flex-start;gap:18px;flex-wrap:wrap">
        <div>
          <div class="eyebrow">Game Detail</div>
          <div class="hero-title" style="font-size:38px;margin:8px 0 4px">
            ${escapeHtml(awayTeam.abbr || awayTeam.name)} @ ${escapeHtml(homeTeam.abbr || homeTeam.name)}
          </div>
          <div class="mini">${escapeHtml(gd.venue?.name || '')} &middot; ${gd.status}</div>
        </div>
        <div class="lift" style="min-width:300px;flex:1">
          ${gd.away.probablePitcher ? `<div class="stat"><div class="k">${escapeHtml(awayTeam.abbr)} SP</div><div class="v">${fmtNum(gd.away.probablePitcher.era, 2)}</div><div class="s">${escapeHtml(gd.away.probablePitcher.name)} (${gd.away.probablePitcher.win}-${gd.away.probablePitcher.loss})</div></div>` : ''}
          ${gd.home.probablePitcher ? `<div class="stat"><div class="k">${escapeHtml(homeTeam.abbr)} SP</div><div class="v">${fmtNum(gd.home.probablePitcher.era, 2)}</div><div class="s">${escapeHtml(gd.home.probablePitcher.name)} (${gd.home.probablePitcher.win}-${gd.home.probablePitcher.loss})</div></div>` : ''}
        </div>
      </div>
    </div>`;

    // Starting Lineups side by side
    html += `<div class="split" style="margin-bottom:16px">
      ${renderLineupPanel(awayTeam, gd.away)}
      ${renderLineupPanel(homeTeam, gd.home)}
    </div>`;

    // Game Rosters side by side
    html += `<div class="split" style="margin-bottom:16px">
      ${renderRosterPanel(awayTeam, gd.away.roster)}
      ${renderRosterPanel(homeTeam, gd.home.roster)}
    </div>`;

    // Lineup Changes (if any)
    const allChanges = [
      ...gd.away.lineupChanges.map(c => ({ ...c, team: awayTeam.abbr })),
      ...gd.home.lineupChanges.map(c => ({ ...c, team: homeTeam.abbr }))
    ].sort((a, b) => a.sequence - b.sequence);

    if (allChanges.length) {
      html += renderLineupChangesPanel(allChanges);
    }
  }

  html += `</section>`;
  return html;
}

function renderLineupPanel(team, sideData) {
  const lineup = sideData.lineup || [];
  const sp = sideData.startingPitcher || sideData.probablePitcher;

  if (!lineup.length && !sp) {
    return `<div class="card team-panel">
      <div class="panel-title"><h3>${escapeHtml(team.abbr || team.name)} Lineup</h3></div>
      <div class="empty">Lineup not yet available</div>
    </div>`;
  }

  let html = `<div class="card team-panel">
    <div class="panel-title">
      <h3>${escapeHtml(team.abbr || team.name)} Starting Lineup</h3>
      <span class="tag teal">${lineup.length} batters</span>
    </div>`;

  if (sp) {
    html += `<div class="sr-pitcher-banner">
      <div class="sr-pitcher-pos">SP</div>
      <div class="sr-pitcher-info">
        <div class="sr-pitcher-name">${escapeHtml(sp.name)}</div>
        ${sp.era !== undefined ? `<div class="mini">ERA ${fmtNum(sp.era, 2)} &middot; ${sp.win || 0}-${sp.loss || 0}</div>` : ''}
      </div>
    </div>`;
  }

  html += `<div class="sr-lineup-table">
    <div class="sr-lineup-header">
      <span class="sr-col-order">#</span>
      <span class="sr-col-pos">Pos</span>
      <span class="sr-col-name">Player</span>
      <span class="sr-col-jersey">No.</span>
    </div>
    ${lineup.filter(p => p.position !== 1).map(p => `
      <div class="sr-lineup-row">
        <span class="sr-col-order">${p.battingOrder + 1}</span>
        <span class="sr-col-pos"><span class="sr-pos-badge">${escapeHtml(p.positionAbbr)}</span></span>
        <span class="sr-col-name">${escapeHtml(p.name)}</span>
        <span class="sr-col-jersey">${escapeHtml(p.jerseyNumber)}</span>
      </div>
    `).join('')}
  </div></div>`;

  return html;
}

function renderRosterPanel(team, roster) {
  if (!roster || !roster.total) {
    return `<div class="card team-panel">
      <div class="panel-title"><h3>${escapeHtml(team.abbr || team.name)} Roster</h3></div>
      <div class="empty">Game roster not yet available</div>
    </div>`;
  }

  let html = `<div class="card team-panel">
    <div class="panel-title">
      <h3>${escapeHtml(team.abbr || team.name)} Game Roster</h3>
      <span class="tag">${roster.total} players</span>
    </div>`;

  // Starters
  if (roster.starters.length) {
    html += `<div class="sr-roster-group">
      <div class="sr-roster-group-title">Starters</div>
      ${roster.starters.map(p => `
        <div class="sr-roster-row">
          <span class="sr-roster-jersey">${escapeHtml(p.jerseyNumber)}</span>
          <span class="sr-roster-name">${escapeHtml(p.name)}</span>
          <span class="sr-roster-pos">${escapeHtml(p.primaryPosition || p.position)}</span>
        </div>
      `).join('')}
    </div>`;
  }

  // Bench
  if (roster.bench.length) {
    html += `<div class="sr-roster-group">
      <div class="sr-roster-group-title">Bench</div>
      ${roster.bench.map(p => `
        <div class="sr-roster-row">
          <span class="sr-roster-jersey">${escapeHtml(p.jerseyNumber)}</span>
          <span class="sr-roster-name">${escapeHtml(p.name)}</span>
          <span class="sr-roster-pos">${escapeHtml(p.primaryPosition || p.position)}</span>
        </div>
      `).join('')}
    </div>`;
  }

  // Pitchers (Bullpen)
  if (roster.pitchers.length) {
    html += `<div class="sr-roster-group">
      <div class="sr-roster-group-title">Pitching Staff</div>
      ${roster.pitchers.map(p => `
        <div class="sr-roster-row">
          <span class="sr-roster-jersey">${escapeHtml(p.jerseyNumber)}</span>
          <span class="sr-roster-name">${escapeHtml(p.name)}</span>
          <span class="sr-roster-pos">${escapeHtml(p.primaryPosition || 'P')}</span>
        </div>
      `).join('')}
    </div>`;
  }

  html += `</div>`;
  return html;
}

function renderLineupChangesPanel(changes) {
  return `<div class="card" style="padding:16px">
    <div class="panel-title">
      <h3>In-Game Lineup Changes</h3>
      <span class="tag gold">${changes.length} changes</span>
    </div>
    <div class="sr-changes-list">
      ${changes.map(c => `
        <div class="sr-change-row">
          <span class="sr-change-inning">${c.inningHalf === 'T' ? 'Top' : 'Bot'} ${c.inning}</span>
          <span class="sr-change-team">${escapeHtml(c.team)}</span>
          <span class="sr-change-type tag ${c.changeType === 'Pitching Change' ? 'red' : c.changeType === 'Pinch Hitter' ? 'gold' : 'blue'}">${escapeHtml(c.changeType)}</span>
          <span class="sr-change-desc">${escapeHtml(c.description)}</span>
        </div>
      `).join('')}
    </div>
  </div>`;
}

// Initialize state on load
if (typeof state !== 'undefined') initSportradarState();
