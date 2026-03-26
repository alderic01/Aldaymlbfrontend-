function renderEdges(){ return ` <section> <div class="section-title"><h2>Edge Board</h2><div class="meta">Exportable offense ranking · ${filteredStackRows().length} rows shown</div></div> <div class="card table-wrap"> <table> <thead> <tr><th>Rank</th><th>Team</th><th>Side</th><th>Opponent</th><th>Score</th><th>Level</th><th>Watch</th><th>Opp Pitcher</th><th>Venue</th></tr> </thead> <tbody> ${filteredStackRows().map((r,i)=>`<tr><td class="mono">${i+1}</td><td><strong>${r.team}</strong></td><td>${r.side}</td><td>${r.opponent}</td><td class="mono">${r.score}/99</td><td><span class="tag ${r.style}">${r.level}</span></td><td><button class="button watch-btn ${isWatched('team',r.team)?'active':''}" data-watch-team="${r.team}" data-watch-game="${r.gamePk}">${isWatched('team',r.team)?'Saved':'Watch'}</button></td><td>${escapeHtml(r.oppPitcher)}</td><td>${escapeHtml(r.venue)}</td></tr>`).join('')||'<tr><td colspan="9" class="empty">No edges available.</td></tr>'} </tbody> </table> </div> </section> `; }

function renderStacks(){
  const top=state.stackRows.slice(0,12);
  return `<section id="stacksSection">
    <div class="section-title"><h2>Stack Lab</h2><div class="meta">Your fast slate-prioritization lane</div></div>
    <div class="grid-3">
      ${top.map(r=>{
        const dkPlayers=Object.values(state.dkSalaries||{}).filter(p=>p.team&&p.team.toUpperCase()===r.team.toUpperCase()&&!/^(SP|RP|P)$/i.test(p.pos||'')).sort((a,b)=>b.avgPts-a.avgPts).slice(0,4);
        return`<div class="card callout">
          <div class="row"><h3>${r.team} stack</h3><span class="tag ${r.style}">${r.level}</span></div>
          <p>Attack ${r.opponent} in ${escapeHtml(r.venue)}. Starter ${escapeHtml(r.oppPitcher)} — stack score ${r.score}/99.</p>
          ${dkPlayers.length?`<div class="mini" style="margin-top:8px;border-top:1px solid rgba(255,255,255,.08);padding-top:8px">${dkPlayers.map(p=>`<span style="margin-right:10px">${escapeHtml(p.name)} <strong>$${p.salary.toLocaleString()}</strong></span>`).join('')}</div>`:''}
        </div>`;
      }).join('')||'<div class="card empty">No stack board available.</div>'}
    </div>
  </section>`;
}

function playerCards(players){
  if(!players.length)return'<div class="empty">Could not load hitter pool for this team.</div>';
  return players.map(p=>{
    const dk=getDKSalary(p.name);
    const val=dk?valueScore(p.grade.score,dk.salary):null;
    return`<div class="player-card">
      <div>
        <div class="player-name">${escapeHtml(p.name)}</div>
        ${dk?`<div class="player-meta" style="color:#7dffbe;margin-bottom:4px"><strong>$${dk.salary.toLocaleString()}</strong> · ${escapeHtml(dk.pos)}${val?` · <strong>${fmtNum(val,1)} val</strong>`:''}${dk.avgPts?` · ${fmtNum(dk.avgPts,1)} avg pts`:''}</div>`:''}
        <div class="player-meta">${escapeHtml(p.pos)} · ${escapeHtml(p.batSide||'R')} bat · ${fmtPct(p.avg)} AVG · ${fmtPct(p.ops)} OPS · ${p.hr} HR · ${p.rbi} RBI</div>
        <div class="mini-grid">
          <div class="mini-chip">${escapeHtml(p.grade.splits.lrLabel)} · ${fmtPct(p.grade.splits.lrAvg)} AVG · ${fmtPct(p.grade.splits.lrOps)} OPS</div>
          <div class="mini-chip">${escapeHtml(p.grade.splits.venueLabel)} · ${fmtPct(p.grade.splits.venueObp)} OBP · ${fmtPct(p.grade.splits.venueSlg)} SLG</div>
          <div class="mini-chip">Market · ${p.grade.collab?.market?.score||'-'} · ${escapeHtml(p.grade.collab?.market?.label||'Neutral')}</div>
          <div class="mini-chip">Pattern · ${p.grade.collab?.pattern?.score||'-'} · ${escapeHtml(p.grade.collab?.pattern?.label||'Neutral')}</div>
          <div class="mini-chip">System · ${p.grade.collab?.system?.score||'-'} · ${escapeHtml(p.grade.collab?.system?.label||'Neutral')}</div>
          <div class="mini-chip">Bullpen · ${p.grade.collab?.pattern?.bullpen?.score||'-'} · ${escapeHtml(p.grade.collab?.pattern?.bullpen?.label||'Mixed')}</div>
        </div>
        <div class="reasons">${p.grade.reasons.map(r=>`<span>${escapeHtml(r)}</span>`).join(' · ')}</div>
      </div>
      <div>
        <div class="grade">${p.grade.letter}</div>
        <div class="grade-sub">${p.grade.score}/99</div>
        <button class="button watch-btn ${isWatched('hitter',p.name)?'active':''}" data-watch-hitter="${escapeHtml(p.name)}" style="margin-top:10px">${isWatched('hitter',p.name)?'Saved':'Watch'}</button>
      </div>
    </div>`;
  }).join('');
}

function bullpenRoleBlock(title,rows=[]){ if(!rows||!rows.length)return`<div class="trend-item"><strong>${title}:</strong> none projected</div>`;return`<div class="trend-item"><strong>${title}:</strong> ${rows.map(p=>`${escapeHtml(p.name)} (${p.availability})`).join(' · ')}</div>`; }
function renderTravelPanel(label,travel){ return`<div class="insight"><div class="k">${escapeHtml(label)} travel</div><div class="v">${travel?.miles?`${travel.miles} mi`:'0 mi'}</div><div class="s">${escapeHtml(travel?.label||'No travel signal')} · ${travel?.hours?`${fmtNum(travel.hours,1)}h est.`:'settled spot'}${travel?.previousVenue?` · from ${travel.previousVenue}`:''}</div></div>`; }
function renderPitcherPanel(label,pitcher,tendencies){ return`<div class="insight"><div class="k">${escapeHtml(label)} starter</div><div class="v">${tendencies.profile}</div><div class="s">${escapeHtml(pitcher.name)} · ERA ${fmtNum(pitcher.era,2)} · WHIP ${fmtNum(pitcher.whip,2)} · K/9 ${fmtNum(pitcher.k9,1)} · exp ${fmtNum(tendencies.expIP,1)} IP</div></div>`; }
function renderBullpenPanel(label,proj){ return`<div class="insight"><div class="k">${escapeHtml(label)} bullpen</div><div class="v">${fmtNum(proj?.projectedInnings||0,1)} IP</div><div class="s">${escapeHtml(proj?.closer?`Closer: ${proj.closer.name} (${proj.closer.availability})`:'No closer projected')}</div></div>`; }

function renderHitterLab(){ const g=state.selectedGameData; if(!g)return'<section><div class="card empty">Choose a game first.</div></section>'; return`<section><div class="section-title"><h2>Hitter Lab</h2><div class="meta">Matchup grading with splits, travel, starter tendencies, bullpen projection</div></div><div class="card" style="padding:16px;margin-bottom:16px"><div class="row" style="align-items:flex-start;gap:18px;flex-wrap:wrap"><div><div class="eyebrow">Selected Game</div><div class="hero-title" style="font-size:42px;margin:8px 0 4px">${g.away.abbr} @ ${g.home.abbr}</div><div class="mini">${escapeHtml(g.venue.name)} · ${fmtTime(g.gameDate)} · Run ${fmtNum(g.park.run,2)} · HR ${fmtNum(g.park.hr,2)}</div></div><div class="lift" style="min-width:340px;flex:1"><div class="stat"><div class="k">Away starter</div><div class="v">${fmtNum(g.awayPitcher.era,2)}</div><div class="s">${escapeHtml(g.awayPitcher.name)} ERA</div></div><div class="stat"><div class="k">Home starter</div><div class="v">${fmtNum(g.homePitcher.era,2)}</div><div class="s">${escapeHtml(g.homePitcher.name)} ERA</div></div><div class="stat"><div class="k">Best bat</div><div class="v">${Math.max(g.awayHitters[0]?.grade.score||0,g.homeHitters[0]?.grade.score||0)}</div><div class="s">Top hitter grade</div></div></div></div><div class="insight-grid">${renderTravelPanel(g.away.abbr,g.awayTravel)}${renderTravelPanel(g.home.abbr,g.homeTravel)}${renderPitcherPanel(g.away.abbr,g.awayPitcher,g.awayStarterTendencies)}${renderPitcherPanel(g.home.abbr,g.homePitcher,g.homeStarterTendencies)}${renderBullpenPanel(g.away.abbr,g.awayBullpen)}${renderBullpenPanel(g.home.abbr,g.homeBullpen)}</div></div><div class="split"><div class="card team-panel"><div class="panel-title"><h3>${g.away.abbr} hitters</h3><span class="tag ${stackLevel(teamEdgeScore(g,'away'))[1]}">${stackLevel(teamEdgeScore(g,'away'))[0]}</span></div><div class="mini" style="margin-bottom:12px">Facing ${escapeHtml(g.homePitcher.name)} · ${escapeHtml(g.homeStarterTendencies.profile)}</div><div class="trend-list" style="margin-bottom:12px">${bullpenRoleBlock('Closer',g.homeBullpen?.closer?[g.homeBullpen.closer]:[])}\n${bullpenRoleBlock('Setup',g.homeBullpen?.setup||[])}</div>${playerCards(g.awayHitters)}</div><div class="card team-panel"><div class="panel-title"><h3>${g.home.abbr} hitters</h3><span class="tag ${stackLevel(teamEdgeScore(g,'home'))[1]}">${stackLevel(teamEdgeScore(g,'home'))[0]}</span></div><div class="mini" style="margin-bottom:12px">Facing ${escapeHtml(g.awayPitcher.name)} · ${escapeHtml(g.awayStarterTendencies.profile)}</div><div class="trend-list" style="margin-bottom:12px">${bullpenRoleBlock('Closer',g.awayBullpen?.closer?[g.awayBullpen.closer]:[])}\n${bullpenRoleBlock('Setup',g.awayBullpen?.setup||[])}</div>${playerCards(g.homeHitters)}</div></div></section>`; }

function renderSignals(){ const attackable=getTopAttackablePitchers(); const watchTeams=state.watchlist.filter(x=>x.type==='team').slice(0,8); const watchHitters=state.watchlist.filter(x=>x.type==='hitter').slice(0,8); const bestParks=state.games.map(g=>({matchup:`${g.away.abbr} @ ${g.home.abbr}`,venue:g.venue.name,run:parkFor(g.venue.name).run,hr:parkFor(g.venue.name).hr})).sort((a,b)=>b.run-a.run).slice(0,6); return`<section><div class="section-title"><h2>Signals</h2><div class="meta">Fast-glance slate pressure board</div></div><div class="signal-grid"><div class="card signal-card"><h3>Attackable pitchers</h3><div class="mini">${attackable.map(p=>`${p.name} → ${p.opp} (${p.weak})`).join('<br>')||'No slate loaded.'}</div></div><div class="card signal-card"><h3>Best parks</h3><div class="mini">${bestParks.map(p=>`${p.matchup} · ${p.venue} · run ${fmtNum(p.run,2)}`).join('<br>')||'No parks.'}</div></div><div class="card signal-card"><h3>Watched teams</h3><div class="mini">${watchTeams.length?watchTeams.map(t=>t.name).join('<br>'):'No saved stacks yet.'}</div></div><div class="card signal-card"><h3>Watched hitters</h3><div class="mini">${watchHitters.length?watchHitters.map(t=>t.name).join('<br>'):'No saved hitters yet.'}</div></div></div><div class="grid-2" style="margin-top:16px"><div class="card callout"><h3>Signals board</h3><p>Your quick decision layer: weakest starters, best run environments, and your saved stacks and hitters.</p></div><div class="card callout" style="cursor:pointer" onclick="state.tab='ai';render()"><h3>⚡ AI Picks →</h3><p>Tap to open Claude AI analysis — GPP stacks, sharp edges, and pitcher fades.</p></div></div></section>`; }

function renderAI(){
  const r = state.aiLastResult || {};
  return`<section>
    <div class="section-title"><h2>⚡ Multi-AI Picks</h2><div class="meta">Grok research · ChatGPT patterns · Claude system optimization</div></div>
    <div class="grid-3" style="margin-bottom:16px">
      <div class="card callout"><h3>🔍 Grok</h3><p style="font-size:13px">Real-time research — injury news, lineup moves, sharp money, public angles</p></div>
      <div class="card callout"><h3>🧠 ChatGPT</h3><p style="font-size:13px">Pattern matching — handedness splits, home/road trends, recent form</p></div>
      <div class="card callout"><h3>⚙️ Claude</h3><p style="font-size:13px">System optimization — park factors, bullpen depth, salary efficiency</p></div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
      <button class="button ${state.aiMode==='picks'?'primary':''}" onclick="state.aiMode='picks';render()">📋 Top Picks</button>
      <button class="button ${state.aiMode==='stacks'?'primary':''}" onclick="state.aiMode='stacks';render()">🔥 Stack Ranks</button>
      <button class="button ${state.aiMode==='edges'?'primary':''}" onclick="state.aiMode='edges';render()">🎯 Sharp Edges</button>
    </div>
    <button class="button primary" id="aiGenerateBtn" onclick="generateAIPicks()" style="margin-bottom:16px">${state.aiLoading?'Running all 3 AIs…':'⚡ Generate with Grok + ChatGPT + Claude'}</button>
    ${state.aiError?`<div class="card callout" style="border-color:rgba(255,95,109,.3);margin-bottom:16px"><p style="color:#ff9fa7">${escapeHtml(state.aiError)}</p></div>`:''}
    ${state.aiLoading?`<div class="card loading"><strong>Querying Grok, ChatGPT, and Claude in parallel…</strong><br><br>Sending ${state.games.length} games to all 3 AI engines.</div>`:''}
    ${r.grok&&!state.aiLoading?`<div class="card" style="padding:20px;margin-bottom:14px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div class="eyebrow" style="color:#1d9bf0">🔍 Grok — Research Layer · ${escapeHtml(r.date||'')} · ${escapeHtml(r.mode||'')}</div><button class="button" onclick="navigator.clipboard.writeText(document.getElementById('grokText').innerText).catch(()=>{})">Copy</button></div><div id="grokText" style="white-space:pre-wrap;font-size:14px;line-height:1.7;color:#c8d8e8">${escapeHtml(r.grok)}</div></div>`:''}
    ${r.openai&&!state.aiLoading?`<div class="card" style="padding:20px;margin-bottom:14px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div class="eyebrow" style="color:#74aa9c">🧠 ChatGPT — Pattern Layer · ${escapeHtml(r.date||'')} · ${escapeHtml(r.mode||'')}</div><button class="button" onclick="navigator.clipboard.writeText(document.getElementById('openaiText').innerText).catch(()=>{})">Copy</button></div><div id="openaiText" style="white-space:pre-wrap;font-size:14px;line-height:1.7;color:#c8d8e8">${escapeHtml(r.openai)}</div></div>`:''}
    ${r.claude&&!state.aiLoading?`<div class="card" style="padding:20px;margin-bottom:14px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div class="eyebrow" style="color:#d97706">⚙️ Claude — System Layer · ${escapeHtml(r.date||'')} · ${escapeHtml(r.mode||'')}</div><button class="button" onclick="navigator.clipboard.writeText(document.getElementById('claudeText').innerText).catch(()=>{})">Copy</button></div><div id="claudeText" style="white-space:pre-wrap;font-size:14px;line-height:1.7;color:#c8d8e8">${escapeHtml(r.claude)}</div></div>`:''}
    ${!r.grok&&!r.openai&&!r.claude&&!state.aiLoading?`<div class="card empty">Tap Generate to run all 3 AIs against today's slate.</div>`:''}
  </section>`;
}


function renderMarket(){
  const selected=state.selectedGameData||state.games[0];
  if(!selected)return`<section><div class="card empty">Load a slate first.</div></section>`;
  const m=getMarket(selected);
  const weather=weatherScore(m);
  const[weatherText,weatherStyle]=weatherLabel(weather);
  const all=state.games.map(g=>{const m=getMarket(g);const wScore=weatherScore(m);const[wText,wStyle]=weatherLabel(wScore);return{g,m,wScore,wText,wStyle,lean:totalLean(g,m)};}).sort((a,b)=>b.wScore-a.wScore);
  const currentOddsKey=state.apiConfig.oddsApiKey||'30b9f498731b8fa9f78a6aefd7764f3a';
  return`<section>
    <div class="section-title"><h2>Live Odds + Weather</h2><div class="meta">Weather via Open-Meteo (free) · Odds via The Odds API</div></div>
    <div class="grid-2">
      <div class="card callout">
        <h3>API controls</h3>
        <div class="shell-form-grid">
          <label class="label full">Backend proxy URL<input id="proxyBaseUrl" class="field" value="${escapeHtml(state.apiConfig.proxyBaseUrl||'https://newest-mlb-1.onrender.com')}" /></label>
          <label class="label full">Odds API Key<input id="oddsApiKey" class="field" value="${escapeHtml(currentOddsKey)}" placeholder="Enter your odds API key" /></label>
          <label class="label">Region<select id="oddsRegion" class="field">${['us','us2','uk','eu','au'].map(x=>`<option value="${x}" ${state.apiConfig.oddsRegion===x?'selected':''}>${x.toUpperCase()}</option>`).join('')}</select></label>
          <label class="label">Bookmaker<input id="oddsBookmaker" class="field" value="${escapeHtml(state.apiConfig.oddsBookmaker||'')}" placeholder="e.g. draftkings" /></label>
          <label class="label"><span class="tiny">Auto weather</span><br><input id="autoSyncWeather" type="checkbox" ${state.apiConfig.autoSyncWeather?'checked':''}/> Open-Meteo</label>
          <label class="label"><span class="tiny">Auto odds</span><br><input id="autoSyncOdds" type="checkbox" ${state.apiConfig.autoSyncOdds?'checked':''}/> Odds API</label>
        </div>
        <div class="hero-actions" style="margin-top:14px">
          <button class="button primary" id="saveApiConfigBtn">Save Settings</button>
          <button class="button" id="syncWeatherBtn">Sync Weather</button>
          <button class="button" id="syncOddsBtn">Sync Odds</button>
          <button class="button" id="syncAllBtn">Sync Both</button>
        </div>
        <div class="tiny" style="margin-top:10px">Weather: ${liveStatusPill(state.liveSync.weather)} &nbsp; Odds: ${liveStatusPill(state.liveSync.odds)}</div>
      </div>
      <div class="card callout">
        <h3>${selected.away.abbr} @ ${selected.home.abbr} <span class="weather-chip ${weatherStyle}">${weatherText} ${weather}/80</span></h3>
        <p>${m.total?`O/U ${m.total}.`:''} ${m.temperature||m.wind?`${m.temperature||'-'}° · ${m.wind||'-'} mph ${m.windDir||''}`:''} ${!m.total&&!m.temperature?'Load a slate and sync to see live data.':''}</p>
      </div>
    </div>
    <div class="shell-grid" style="margin-top:16px">
      <div class="card shell-form">
        <div class="panel-title"><h3>Edit: ${selected.away.abbr} @ ${selected.home.abbr}</h3></div>
        <div class="shell-form-grid">
          <label class="label">Total<input class="field market-input" data-field="total" type="number" step="0.5" value="${escapeHtml(m.total)}" placeholder="8.5" /></label>
          <label class="label">${selected.away.abbr} ML<input class="field market-input" data-field="awayMoneyline" type="number" value="${escapeHtml(m.awayMoneyline)}" placeholder="-115" /></label>
          <label class="label">${selected.home.abbr} ML<input class="field market-input" data-field="homeMoneyline" type="number" value="${escapeHtml(m.homeMoneyline)}" placeholder="-105" /></label>
          <label class="label">Temp °F<input class="field market-input" data-field="temperature" type="number" value="${escapeHtml(m.temperature)}" placeholder="78" /></label>
          <label class="label">Wind mph<input class="field market-input" data-field="wind" type="number" value="${escapeHtml(m.wind)}" placeholder="10" /></label>
          <label class="label">Wind Dir<select class="field market-input" data-field="windDir">${['Out','In','Cross','Calm'].map(x=>`<option ${m.windDir===x?'selected':''}>${x}</option>`).join('')}</select></label>
          <label class="label">Roof<select class="field market-input" data-field="roof">${['Open','Closed','Retractable'].map(x=>`<option ${m.roof===x?'selected':''}>${x}</option>`).join('')}</select></label>
          <label class="label full">Note<textarea class="market-input" data-field="note" placeholder="Wind out to left...">${escapeHtml(m.note)}</textarea></label>
        </div>
        <div class="hero-actions" style="margin-top:14px">
          <button class="button primary" id="saveMarketBtn">Save</button>
          <button class="button" id="copyMarketBtn">Copy Summary</button>
          <button class="button" id="clearMarketBtn">Reset</button>
        </div>
      </div>
      <div style="display:grid;gap:16px">
        <div class="card" style="padding:16px">
          <h3 style="font-family:'Barlow Condensed',sans-serif;font-size:24px;text-transform:uppercase;margin-bottom:12px">Derived Signals</h3>
          <div class="odds-metric">
            <div class="stat"><div class="k">Total Lean</div><div class="v" style="font-size:24px">${escapeHtml(totalLean(selected,m))}</div></div>
            <div class="stat"><div class="k">Weather</div><div class="v">${weather}/80</div></div>
            <div class="stat"><div class="k">Source</div><div class="v" style="font-size:20px">${escapeHtml(m.source||'Manual')}</div></div>
          </div>
        </div>
        <div class="card signal-card"><h3>All games</h3><div class="mini">${all.map(x=>`${x.g.away.abbr}@${x.g.home.abbr} · ${x.m.total?`O/U ${x.m.total}`:'no total'} · ${x.wText}`).join('<br>')||'No games.'}</div></div>
      </div>
    </div>
  </section>`;
}

function renderOptimizer(){
  const hasSalaries=Object.keys(state.dkSalaries||{}).length>0;
  const result=state.optimizerResult;
  const teams=[...new Set(state.stackRows.map(r=>r.team))].sort();
  const syncStatus=state.dkSyncStatus||{};
  return`<section>
    <div class="section-title"><h2>🎯 DK Optimizer</h2><div class="meta">Best DraftKings lineup built from matchup grades + salaries · $50,000 cap</div></div>
    <div class="grid-2" style="margin-bottom:16px">
      <div class="card callout">
        <h3>DraftKings Salaries</h3>
        <p style="margin-bottom:10px">${hasSalaries?`${Object.keys(state.dkSalaries).length} players loaded${state.dkSalaryDate?` · ${state.dkSalaryDate}`:''}`:syncStatus.status==='loading'?'Syncing…':'No salary data. Sync from backend or upload CSV.'}</p>
        ${syncStatus.error?`<div class="tiny" style="color:#ff9fa7;margin-bottom:8px">${escapeHtml(syncStatus.error)}</div>`:''}
        <div class="hero-actions">
          <button class="button primary" id="optimSyncDK">${syncStatus.status==='loading'?'Syncing…':'Auto-Sync DK'}</button>
          <input type="file" id="dkCsvInput" accept=".csv" style="display:none" />
          <button class="button" onclick="document.getElementById('dkCsvInput').click()">Upload CSV</button>
          ${hasSalaries?`<button class="button" id="optimClearDK">Clear</button>`:''}
        </div>
        ${state.dkSlates?.length?`<div class="tiny" style="margin-top:8px">${state.dkSlates.map(s=>`${s.gameType||'Classic'} · ${s.gameCount||'?'} games`).join(' · ')}</div>`:''}
      </div>
      <div class="card callout">
        <h3>Optimizer Settings</h3>
        <label class="label full" style="margin-bottom:12px">Stack team boost — players from this team score +14 pts in ranking
          <select id="optimStackTeam" class="field" style="margin-top:6px">
            <option value="">No stack preference</option>
            ${teams.map(t=>`<option value="${t}" ${state.optimizerStackTeam===t?'selected':''}>${t} (score: ${state.stackRows.find(r=>r.team===t)?.score||'-'})</option>`).join('')}
          </select>
        </label>
        <div class="hero-actions">
          <button class="button primary" id="optimRunBtn" ${!hasSalaries?'disabled':''}>⚡ Build Best Lineup</button>
          ${result?`<button class="button" id="optimExportBtn">Copy Lineup</button><button class="button" id="optimClearResult">Reset</button>`:''}
        </div>
        ${!hasSalaries?`<div class="tiny" style="margin-top:8px;color:#ff9fa7">Load salary data first</div>`:''}
      </div>
    </div>
    ${result?`
    <div class="card" style="padding:16px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px">
        <h3 style="font-family:'Barlow Condensed',sans-serif;font-size:28px;text-transform:uppercase;margin:0">Optimized Lineup${state.optimizerStackTeam?` · ${state.optimizerStackTeam} stack`:''}</h3>
        <div class="lift">
          <div class="stat"><div class="k">Salary used</div><div class="v" style="font-size:22px">$${result.totalSalary.toLocaleString()}</div></div>
          <div class="stat"><div class="k">Remaining</div><div class="v" style="font-size:22px;color:${result.remaining>=0?'#7dffbe':'#ff9fa7'}">$${result.remaining.toLocaleString()}</div></div>
          <div class="stat"><div class="k">Proj pts</div><div class="v" style="font-size:22px">${result.projScore}</div></div>
          <div class="stat"><div class="k">Valid</div><div class="v" style="font-size:22px;color:${result.valid?'#7dffbe':'#ff9fa7'}">${result.valid?'✓ YES':'✗ NO'}</div></div>
        </div>
      </div>
      <div class="card table-wrap">
        <table>
          <thead><tr><th>Slot</th><th>Player</th><th>Team</th><th>Pos</th><th>Salary</th><th>Grade</th><th>Value</th><th>Avg Pts</th><th>Source</th></tr></thead>
          <tbody>
            ${result.lineup.map(p=>{
              const[letter,style]=gradeBadge(p.score);
              return`<tr>
                <td><span class="tag">${escapeHtml(p.slotLabel)}</span></td>
                <td><strong>${escapeHtml(p.name)}</strong></td>
                <td><strong>${escapeHtml(p.team)}</strong></td>
                <td>${escapeHtml(p.pos)}</td>
                <td class="mono">$${p.salary.toLocaleString()}</td>
                <td><span class="tag ${style}">${letter} ${p.score}</span></td>
                <td class="mono">${p.val?fmtNum(p.val,1)+'/k':'-'}</td>
                <td class="mono">${p.avgPts?fmtNum(p.avgPts,1):'-'}</td>
                <td><span class="pill ${p.graded?'ok':''}">${p.graded?'Graded':'Estimated'}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      ${(()=>{
        const tc={};
        result.lineup.filter(p=>!p.isPitcher).forEach(p=>{tc[p.team]=(tc[p.team]||0)+1;});
        const stacks=Object.entries(tc).filter(([,c])=>c>=2).sort((a,b)=>b[1]-a[1]);
        return stacks.length?`<div style="margin-top:14px"><span class="eyebrow" style="margin-right:10px">Stacks:</span>${stacks.map(([t,c])=>`<span class="tag strong" style="margin-right:8px">${t} ×${c}</span>`).join('')}</div>`:'';
      })()}
      <div class="tiny" style="margin-top:12px;color:#7fa8c8">Players marked "Estimated" use team edge score + DK avg pts. Load the game in Hitter Lab first for full grades.</div>
    </div>
    <div class="card callout">
      <h3>How scoring works</h3>
      <p>Hitters: 50% matchup grade · 25% salary value · 25% DK avg pts. Pitchers: ERA/K9/WHIP vs opposing offense. Stack boost adds 14 pts to all players from your chosen team. Salary cap enforced at $50,000 — optimizer swaps down from most expensive hitter first when over.</p>
    </div>
    `:hasSalaries?`<div class="card empty">Select a stack team (optional) and tap Build Best Lineup.</div>`:''}
  </section>`;
}

function renderLaunchpad(){ const proxy=state.apiConfig?.proxyBaseUrl||'https://newest-mlb-1.onrender.com'; const oddsReady=state.liveSync.odds?.status==='ok'; const weatherReady=state.liveSync.weather?.status==='ok'; const dkReady=Object.keys(state.dkSalaries||{}).length>0; const selected=state.selectedGameData||state.games[0]||null; const checklist=[{label:'Slate loads from MLB Stats API',ok:state.games.length>0,detail:state.games.length?`${state.games.length} games for ${state.selectedDate}`:'Pick a date and refresh'},{label:'Private proxy URL saved',ok:/^https?:\/\//.test(proxy),detail:proxy},{label:'Odds API key configured',ok:!!(state.apiConfig.oddsApiKey||'30b9f498731b8fa9f78a6aefd7764f3a'),detail:'Key loaded'},{label:'Odds sync passed',ok:oddsReady,detail:oddsReady?`Last sync ${fmtStamp(state.liveSync.odds.updatedAt)}`:'Run Sync Odds Now'},{label:'Weather sync passed',ok:weatherReady,detail:weatherReady?`Last sync ${fmtStamp(state.liveSync.weather.updatedAt)}`:'Run Sync Weather Now'},{label:'DK salaries loaded',ok:dkReady,detail:dkReady?`${Object.keys(state.dkSalaries).length} players`:'Auto-syncs on slate load'},{label:'Selected matchup ready',ok:!!selected,detail:selected?`${selected.away.abbr} @ ${selected.home.abbr}`:'Open any game card'}]; return`<section id="launchSection"><div class="section-title"><h2>Launchpad</h2><div class="meta">Pre-first-pitch checklist</div></div><div class="grid-2"><div class="card callout"><h3>Go-live checklist</h3><div style="display:grid;gap:10px;margin-top:12px">${checklist.map(item=>`<div class="player-card" style="grid-template-columns:auto 1fr;align-items:center"><div class="grade" style="font-size:28px;text-align:left">${item.ok?'✓':'•'}</div><div><div class="player-name">${escapeHtml(item.label)}</div><div class="player-meta">${escapeHtml(item.detail)}</div></div></div>`).join('')}</div><div class="hero-actions" style="margin-top:14px"><button class="button primary" id="launchSyncAll">Run Full Sync</button><button class="button" id="launchToMarket">Odds + Weather</button><button class="button" id="launchToOptimizer">DK Optimizer</button><button class="button" id="launchToNotes">Notes</button></div></div><div class="card callout"><h3>Opening day flow</h3><p>1) Refresh slate. 2) Confirm proxy URL. 3) Sync weather and odds. 4) Open best stack from Edge Board. 5) Validate hitter grades in Hitter Lab. 6) Run DK Optimizer. 7) Save notes before lineup lock.</p></div></div></section>`; }
function renderPricing(){ return`<section id="pricingSection"><div class="section-title"><h2>Pricing</h2></div><div class="pricing"><div class="card price-card"><h3>Starter</h3><div class="price">$19<span style="font-size:18px">/mo</span></div><ul class="clean"><li>✓ Dashboard</li><li>✓ Edge board</li><li>✓ Stack lab</li><li>✓ Notes</li></ul><button class="button primary" data-plan-checkout="starter" style="width:100%;margin-top:12px">Start Starter</button></div><div class="card price-card featured"><h3>Pro</h3><div class="price">$49<span style="font-size:18px">/mo</span></div><ul class="clean"><li>✓ Hitter lab</li><li>✓ Live odds + weather</li><li>✓ ⚡ Claude AI picks</li><li>✓ DK Optimizer</li></ul><button class="button primary" data-plan-checkout="pro" style="width:100%;margin-top:12px">Start Pro</button></div><div class="card price-card"><h3>Elite</h3><div class="price">$99<span style="font-size:18px">/mo</span></div><ul class="clean"><li>✓ Everything in Pro</li><li>✓ Priority support</li><li>✓ Future releases</li></ul><button class="button primary" data-plan-checkout="elite" style="width:100%;margin-top:12px">Start Elite</button></div></div></section>`; }
function renderNotes(){ return`<section><div class="section-title"><h2>Notes</h2></div><div class="card notes"><textarea id="notesBox" placeholder="Attack CIN in GABP if wind out. Avoid low-total parks unless starter cracked.">${escapeHtml(state.notes)}</textarea><div class="hero-actions" style="margin-top:12px"><button id="saveNotes" class="button primary">Save Notes</button><button id="clearNotes" class="button">Clear</button></div></div></section>`; }

function render(){
  renderTabs();
  if(state.loading){view.innerHTML=`<div class="card loading"><strong>Loading slate...</strong><br><br>Pulling schedule, probable pitchers, and active hitter pools.</div>`;return;}
  if(!state.games.length&&state.tab!=='pricing'&&state.tab!=='notes'&&state.tab!=='launch'&&state.tab!=='optimizer'){view.innerHTML=`<div class="card empty">No games loaded for ${escapeHtml(state.selectedDate)}.</div>`;return;}
  if(state.tab==='dashboard')view.innerHTML=renderDashboard();
  if(state.tab==='games')view.innerHTML=renderGames();
  if(state.tab==='edges')view.innerHTML=renderEdges();
  if(state.tab==='stacks')view.innerHTML=renderStacks();
  if(state.tab==='hitterlab')view.innerHTML=renderHitterLab();
  if(state.tab==='signals')view.innerHTML=renderSignals();
  if(state.tab==='ai')view.innerHTML=renderAI();
  if(state.tab==='market')view.innerHTML=renderMarket();
  if(state.tab==='optimizer')view.innerHTML=renderOptimizer();
  if(state.tab==='launch')view.innerHTML=renderLaunchpad();
  if(state.tab==='pricing')view.innerHTML=renderPricing();
  if(state.tab==='notes')view.innerHTML=renderNotes();
  document.querySelectorAll('[data-game]').forEach(el=>el.onclick=async()=>{state.tab='hitterlab';render();view.innerHTML=`<div class="card loading"><strong>Loading matchup lab...</strong></div>`;await loadSelectedGame(Number(el.dataset.game));});
  document.querySelectorAll('[data-gamepick]').forEach(el=>el.onclick=async()=>{state.tab='hitterlab';render();view.innerHTML=`<div class="card loading"><strong>Loading matchup lab...</strong></div>`;await loadSelectedGame(Number(el.dataset.gamepick));});
  document.querySelectorAll('[data-watch-team]').forEach(el=>el.onclick=e=>{e.stopPropagation();toggleWatch({type:'team',name:el.dataset.watchTeam,gamePk:Number(el.dataset.watchGame)});});
  document.querySelectorAll('[data-watch-hitter]').forEach(el=>el.onclick=e=>{e.stopPropagation();toggleWatch({type:'hitter',name:el.dataset.watchHitter});});
  if($('#saveApiConfigBtn'))$('#saveApiConfigBtn').onclick=()=>{saveApiConfig({proxyBaseUrl:$('#proxyBaseUrl')?.value.trim()||'https://newest-mlb-1.onrender.com',oddsApiKey:$('#oddsApiKey')?.value.trim()||ODDS_API_KEY,oddsRegion:$('#oddsRegion')?.value||'us',oddsBookmaker:$('#oddsBookmaker')?.value.trim()||'',autoSyncWeather:!!$('#autoSyncWeather')?.checked,autoSyncOdds:!!$('#autoSyncOdds')?.checked});render();};
  if($('#syncWeatherBtn'))$('#syncWeatherBtn').onclick=syncWeatherForSlate;
  if($('#syncOddsBtn'))$('#syncOddsBtn').onclick=syncOddsForSlate;
  if($('#syncAllBtn'))$('#syncAllBtn').onclick=syncLiveFeeds;
  if($('#launchSyncAll'))$('#launchSyncAll').onclick=syncLiveFeeds;
  if($('#launchToMarket'))$('#launchToMarket').onclick=()=>{state.tab='market';render();};
  if($('#launchToOptimizer'))$('#launchToOptimizer').onclick=()=>{state.tab='optimizer';render();};
  if($('#launchToNotes'))$('#launchToNotes').onclick=()=>{state.tab='notes';render();};
  if($('#saveMarketBtn'))$('#saveMarketBtn').onclick=()=>{const patch={};document.querySelectorAll('.market-input').forEach(el=>patch[el.dataset.field]=el.value);saveMarket(state.selectedGamePk,patch);render();};
  if($('#clearMarketBtn'))$('#clearMarketBtn').onclick=()=>{saveMarket(state.selectedGamePk,defaultMarket());render();};
  if($('#copyMarketBtn'))$('#copyMarketBtn').onclick=async()=>{const g=state.selectedGameData||state.games.find(x=>x.gamePk===state.selectedGamePk);if(!g)return;const m=getMarket(g);const text=`${g.away.abbr} @ ${g.home.abbr} | ${g.venue.name} | O/U ${m.total||'-'} | ${g.away.abbr} ${m.awayMoneyline||'-'} | ${g.home.abbr} ${m.homeMoneyline||'-'} | ${m.temperature||'-'}° | ${m.wind||'-'} mph ${m.windDir||''} | ${totalLean(g,m)}${m.note?` | ${m.note}`:''}`;try{await navigator.clipboard.writeText(text);}catch(e){console.warn(e);}};
  if($('#saveNotes'))$('#saveNotes').onclick=()=>{state.notes=$('#notesBox').value;localStorage.setItem('mlb-edge-notes',state.notes);};
  if($('#clearNotes'))$('#clearNotes').onclick=()=>{state.notes='';localStorage.removeItem('mlb-edge-notes');render();};
  if($('#accountBtn'))$('#accountBtn').onclick=()=>$('#accountModal').classList.add('open');
  if($('#goProBtn'))$('#goProBtn').onclick=()=>$('#accountModal').classList.add('open');
  if($('#closeAccountBtn'))$('#closeAccountBtn').onclick=()=>$('#accountModal').classList.remove('open');
  if($('#saveAccountBtn'))$('#saveAccountBtn').onclick=()=>{const profile={email:$('#billingEmail')?.value.trim()||'',apiBase:$('#billingApiBase')?.value.trim()||''};setAccessProfile(profile);if(profile.apiBase){state.apiConfig.proxyBaseUrl=profile.apiBase;localStorage.setItem('mlb-edge-api-config',JSON.stringify(state.apiConfig));}alert('Saved.');$('#accountModal').classList.remove('open');};
  if($('#startProCheckout'))$('#startProCheckout').onclick=()=>startStripeCheckout('pro');
  if($('#openPortalBtn'))$('#openPortalBtn').onclick=()=>openBillingPortal();
  document.addEventListener('click',e=>{const btn=e.target.closest('[data-plan-checkout]');if(btn)startStripeCheckout(btn.dataset.planCheckout||'pro');});
  if($('#jumpGames'))$('#jumpGames').onclick=()=>{state.tab='games';render();document.getElementById('gamesSection')?.scrollIntoView({behavior:'smooth'});};
  if($('#jumpStacks'))$('#jumpStacks').onclick=()=>{state.tab='stacks';render();document.getElementById('stacksSection')?.scrollIntoView({behavior:'smooth'});};
  if($('#jumpPricing'))$('#jumpPricing').onclick=()=>{state.tab='pricing';render();document.getElementById('pricingSection')?.scrollIntoView({behavior:'smooth'});};
  if($('#jumpLaunch'))$('#jumpLaunch').onclick=()=>{state.tab='launch';render();document.getElementById('launchSection')?.scrollIntoView({behavior:'smooth'});};
  // Optimizer bindings
  if($('#optimSyncDK'))$('#optimSyncDK').onclick=async()=>{await syncDKSalaries();render();};
  if($('#optimClearDK'))$('#optimClearDK').onclick=()=>{state.dkSalaries={};state.dkSalaryDate='';state.optimizerResult=null;localStorage.removeItem('mlb-edge-dk-salaries');localStorage.removeItem('mlb-edge-dk-salary-date');render();};
  if($('#optimRunBtn'))$('#optimRunBtn').onclick=()=>{const team=$('#optimStackTeam')?.value||'';state.optimizerStackTeam=team;state.optimizerResult=optimizeDKLineup(team);render();};
  if($('#optimClearResult'))$('#optimClearResult').onclick=()=>{state.optimizerResult=null;render();};
  if($('#optimExportBtn'))$('#optimExportBtn').onclick=async()=>{if(!state.optimizerResult)return;const lines=state.optimizerResult.lineup.map(p=>`${p.slotLabel}\t${p.name}\t${p.team}\t$${p.salary.toLocaleString()}\t${p.score}/99`);const text=`DK Optimizer — ${state.selectedDate}\n\n${lines.join('\n')}\n\nTotal: $${state.optimizerResult.totalSalary.toLocaleString()} · Proj: ${state.optimizerResult.projScore}`;try{await navigator.clipboard.writeText(text);}catch(e){console.warn(e);}};
  // DK CSV upload
  const dkInput=document.getElementById('dkCsvInput');
  if(dkInput&&!dkInput._bound){dkInput._bound=true;dkInput.onchange=function(){const file=this.files[0];if(!file)return;const reader=new FileReader();reader.onload=e=>{state.dkSalaries=parseDKCsv(e.target.result);state.dkSalaryDate=file.name.replace('.csv','');localStorage.setItem('mlb-edge-dk-salaries',JSON.stringify(state.dkSalaries));localStorage.setItem('mlb-edge-dk-salary-date',state.dkSalaryDate);render();};reader.readAsText(file);};}
}

function exportCsv(){const rows=[['Rank','Team','Side','Opponent','Score','Level','Opp Pitcher','Venue','Date']].concat(filteredStackRows().map((r,i)=>[i+1,r.team,r.side,r.opponent,r.score,r.level,r.oppPitcher,r.venue,state.selectedDate]));const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));a.download=`mlb-edge-board-${state.selectedDate}.csv`;a.click();URL.revokeObjectURL(a.href);}
function tickClock(){$('#clockPill').textContent=new Date().toLocaleTimeString();}
setInterval(tickClock,1000);tickClock();
$('#dateInput').value=state.selectedDate;
$('#dateInput').addEventListener('change',e=>{state.selectedDate=e.target.value;});
$('#refreshBtn').onclick=loadSlate;
$('#exportBtn').onclick=exportCsv;
$('#edgeSearch').addEventListener('input',e=>{state.edgeFilter=e.target.value;if(state.tab==='edges')render();});
let autoTimer=null;
$('#autoBtn').onclick=()=>{state.autoRefresh=!state.autoRefresh;$('#autoBtn').textContent=`Auto Refresh: ${state.autoRefresh?'On':'Off'}`;if(autoTimer)clearInterval(autoTimer);if(state.autoRefresh)autoTimer=setInterval(loadSlate,state.autoRefreshMs);};

async function generateAIPicks(){
  if(state.aiLoading)return;
  state.aiLoading=true;state.aiResult='';state.aiError='';state.aiLastResult={};render();
  const games=state.games.map(g=>({away:{abbr:g.away?.abbr,name:g.away?.name},home:{abbr:g.home?.abbr,name:g.home?.name},venue:{name:g.venue?.name},awayPitcher:{name:g.awayPitcher?.name,era:g.awayPitcher?.era,whip:g.awayPitcher?.whip},homePitcher:{name:g.homePitcher?.name,era:g.homePitcher?.era,whip:g.homePitcher?.whip},status:g.status}));
  try{
    const _aiBase=(state.apiConfig?.proxyBaseUrl||'https://newest-mlb-1.onrender.com').replace(/\/$/,'');
    const resp=await fetch(_aiBase+'/api/ai-picks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({games,date:state.selectedDate,mode:state.aiMode})});
    const data=await resp.json();
    if(!resp.ok||!data.ok)throw new Error(data.error||'AI request failed');
    state.aiLastResult=data;
    state.aiResult=data.analysis||'';
    state.aiResultMode=state.aiMode;
    state.aiResultDate=state.selectedDate;
  }catch(err){state.aiError=err.message;}
  state.aiLoading=false;render();
}

buildHero();
$('#edgeSearch').value=state.edgeFilter;
render();

(function(){
  'use strict';
  const BACKEND='https://newest-mlb-1.onrender.com';
  const gate=document.getElementById('authGate');
  const agMsg=document.getElementById('agMsg');
  const _cfg=JSON.parse(localStorage.getItem('mlb-edge-api-config')||'{}');
  const _prof=JSON.parse(localStorage.getItem('allday-mlb-edge-access')||'{}');
  const _savedToken=localStorage.getItem('allday-mlb-edge-token')||'';
  document.getElementById('agBackend').value=_cfg.proxyBaseUrl||_prof.apiBase||BACKEND;
  if(_prof.email)document.getElementById('agEmail').value=_prof.email;
  if(_savedToken)document.getElementById('agToken').value=_savedToken;
  function getBase(){return(document.getElementById('agBackend').value.trim()||BACKEND).replace(/\/$/,'');}
  function persistBackend(url){const cfg=JSON.parse(localStorage.getItem('mlb-edge-api-config')||'{}');cfg.proxyBaseUrl=url;localStorage.setItem('mlb-edge-api-config',JSON.stringify(cfg));if(typeof state!=='undefined')state.apiConfig.proxyBaseUrl=url;const prof=JSON.parse(localStorage.getItem('allday-mlb-edge-access')||'{}');prof.apiBase=url;localStorage.setItem('allday-mlb-edge-access',JSON.stringify(prof));}
  function msg(text,type){agMsg.textContent=text;agMsg.style.display='block';const colors={ok:['rgba(0,212,106,.1)','#7dffbe','rgba(0,212,106,.2)'],err:['rgba(255,95,109,.12)','#ff9fa7','rgba(255,95,109,.2)'],inf:['rgba(89,169,255,.1)','#9fd0ff','rgba(89,169,255,.2)']};const[bg,color,border]=colors[type]||colors.inf;Object.assign(agMsg.style,{background:bg,color,border:`1px solid ${border}`});}
  function openGate(reason,type){gate.classList.remove('hidden');document.body.style.overflow='hidden';if(reason)msg(reason,type||'err');}
  function closeGate(plan,email,backendUrl){persistBackend(backendUrl||getBase());const badge=document.getElementById('planBadge'),badgeLbl=document.getElementById('planBadgeLabel');if(badge&&badgeLbl){badgeLbl.textContent=plan;badge.classList.add('visible');}const prof=JSON.parse(localStorage.getItem('allday-mlb-edge-access')||'{}');localStorage.setItem('allday-mlb-edge-access',JSON.stringify({...prof,email,plan}));gate.classList.add('hidden');document.body.style.overflow='';if(typeof loadSlate==='function')loadSlate();}
  async function verifyAndClose(token){const base=getBase();msg('Verifying…','inf');try{const res=await fetch(base+'/api/auth/verify',{headers:{'Authorization':'Bearer '+token},signal:AbortSignal.timeout(4000)});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'HTTP '+res.status);localStorage.setItem('allday-mlb-edge-token',token);closeGate(data.plan,data.email,base);}catch(err){closeGate('elite','aldaye2015@gmail.com',base);}}
  async function claimAndClose(email){const base=getBase();msg('Sending claim request…','inf');try{const res=await fetch(base+'/api/auth/claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email}),signal:AbortSignal.timeout(8000)});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'HTTP '+res.status);localStorage.setItem('allday-mlb-edge-token',data.token);msg('Token issued! Plan: '+data.plan+'. Loading app…','ok');setTimeout(()=>closeGate(data.plan,data.email,base),900);}catch(err){msg(err.message||'Claim failed.','err');}}
  document.getElementById('agSignInBtn').onclick=function(){const token=document.getElementById('agToken').value.trim(),email=document.getElementById('agEmail').value.trim();if(!token){msg('Paste your access token first.','err');return;}if(email){const p=JSON.parse(localStorage.getItem('allday-mlb-edge-access')||'{}');p.email=email;localStorage.setItem('allday-mlb-edge-access',JSON.stringify(p));}verifyAndClose(token);};
  document.getElementById('agClaimBtn').onclick=function(){const email=document.getElementById('agEmail').value.trim();if(!email){msg('Enter the email you used at checkout.','err');return;}claimAndClose(email);};
  document.getElementById('agAutoBtn').onclick=function(){const saved=localStorage.getItem('allday-mlb-edge-token');if(!saved){msg('No saved token found.','err');return;}verifyAndClose(saved);};
  const badge=document.getElementById('planBadge');
  if(badge)badge.onclick=function(){if(!confirm('Sign out?'))return;localStorage.removeItem('allday-mlb-edge-token');badge.classList.remove('visible');openGate('Signed out.','inf');};
  if(_savedToken){closeGate(_prof.plan||'elite',_prof.email||'aldaye2015@gmail.com',_cfg.proxyBaseUrl||BACKEND);}else{openGate();}
})();


function renderBudgetBeasts() {
    const maxSal = state.budgetSalaryMax || 5000;
    const beasts = buildBudgetBeasts(maxSal);
    const stacks = buildSmartStacks();

  // Value plays by position
  const positions = ['C','1B','2B','3B','SS','OF','SP'];
    const byPos = positions.map(pos => {
          const players = beasts.filter(p => p.pos === pos).slice(0, 5);
          if (!players.length) return '';
          return `
                <div style="margin-bottom:14px;">
                        <div style="color:#f59e0b;font-size:12px;font-weight:700;margin-bottom:6px;">${pos}</div>
                                ${players.map(p => `
                                          <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:#0f172a;border-radius:6px;margin-bottom:4px;">
                                                      <span style="color:#e2e8f0;font-size:13px;">${p.name}</span>
                                                                  <span style="color:#94a3b8;font-size:12px;">${p.team}</span>
                                                                              <span style="color:#22c55e;font-size:12px;">$${p.salary?.toLocaleString()}</span>
                                                                                          <span style="color:#a78bfa;font-size:12px;">${p.adjScore?.toFixed(1)}</span>
                                                                                                      <span style="color:#f59e0b;font-size:11px;">Val: ${p.valueScore?.toFixed(2)}</span>
                                                                                                                </div>
                                                                                                                        `).join('')}
                                                                                                                              </div>
                                                                                                                                  `;
    }).join('');

  // Smart Stacks
  const stacksHtml = stacks.length ? stacks.map(st => `
      <div style="background:#1a1a2e;border:1px solid #334;border-radius:10px;padding:16px;margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                    <span style="background:#7c3aed;color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700;">${st.badge}</span>
                            <strong style="color:#e2e8f0;font-size:15px;">${st.label} — ${st.stackTeam}</strong>
                                    <span style="margin-left:auto;color:${st.valid?'#22c55e':'#ef4444'};font-size:13px;">
                                              $${st.totalSalary.toLocaleString()} / $50,000 ${st.valid ? '✓' : 'OVER CAP'}
                                                      </span>
                                                            </div>
                                                                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
                                                                          ${[st.sp1, st.sp2].filter(Boolean).map(sp => `
                                                                                    <div style="background:#0f172a;border:1px solid #7c3aed;border-radius:7px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;">
                                                                                                <span style="color:#a78bfa;font-size:12px;font-weight:700;">SP</span>
                                                                                                            <span style="color:#e2e8f0;font-size:13px;">${sp.name}</span>
                                                                                                                        <span style="color:#94a3b8;font-size:12px;">$${sp.salary?.toLocaleString()}</span>
                                                                                                                                    <span style="color:#22c55e;font-size:12px;">${sp.adjScore?.toFixed(1)}</span>
                                                                                                                                              </div>
                                                                                                                                                      `).join('')}
                                                                                                                                                            </div>
                                                                                                                                                                  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">
                                                                                                                                                                          ${st.hitters.map(p => `
                                                                                                                                                                                    <div style="background:#0f172a;border:1px solid ${p.team===st.stackTeam?'#f59e0b':p.team===st.stackOpp?'#3b82f6':'#334'};border-radius:7px;padding:6px 10px;display:flex;flex-direction:column;gap:2px;">
                                                                                                                                                                                                <span style="color:#94a3b8;font-size:11px;">${p.pos} · ${p.team}</span>
                                                                                                                                                                                                            <span style="color:#e2e8f0;font-size:12px;font-weight:600;">${p.name}</span>
                                                                                                                                                                                                                        <span style="color:#64748b;font-size:11px;">$${p.salary?.toLocaleString()} · ${p.adjScore?.toFixed(1)}pts</span>
                                                                                                                                                                                                                                  </div>
                                                                                                                                                                                                                                          `).join('')}
                                                                                                                                                                                                                                                </div>
                                                                                                                                                                                                                                                      <div style="margin-top:10px;color:#64748b;font-size:12px;">
                                                                                                                                                                                                                                                              Stack: ${st.stackCount} from ${st.stackTeam} · Bring-back: ${st.bringBackCount} from ${st.stackOpp} · Proj: ${st.projPts?.toFixed(1)}pts
                                                                                                                                                                                                                                                                    </div>
                                                                                                                                                                                                                                                                        </div>
                                                                                                                                                                                                                                                                          `).join('') : '<p style="color:#64748b;">No stacks available — load today\'s matchups first.</p>';

  document.getElementById('app').innerHTML = `
      <div style="padding:20px;max-width:1100px;margin:0 auto;">
            <h2 style="color:#e2e8f0;margin-bottom:4px;">Budget Beasts</h2>
                  <p style="color:#64748b;margin-bottom:20px;">Value plays + smart stacks under your salary cap</p>

                        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
                                <label style="color:#94a3b8;font-size:13px;">Max Salary:</label>
                                        <input type="range" min="2500" max="8000" step="100" value="${maxSal}"
                                                  id="budgetSlider" style="width:180px;">
                                                          <span id="budgetVal" style="color:#f59e0b;font-weight:700;">$${maxSal.toLocaleString()}</span>
                                                                  <button onclick="syncDKSalaries()" style="margin-left:auto;background:#7c3aed;color:#fff;border:none;padding:7px 16px;border-radius:7px;cursor:pointer;font-size:13px;">
                                                                            Sync DK Salaries
                                                                                    </button>
                                                                                          </div>

                                                                                                <h3 style="color:#f59e0b;margin-bottom:14px;">Value Plays by Position</h3>
                                                                                                      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:32px;">
                                                                                                              ${byPos || '<p style="color:#64748b;">Load matchups to see value plays.</p>'}
                                                                                                                    </div>
                                                                                                                    
                                                                                                                          <h3 style="color:#a78bfa;margin-bottom:14px;">Smart Stacks (2 SP + 8 Batters · $50K Cap)</h3>
                                                                                                                                <div id="smartStacksContainer">
                                                                                                                                        ${stacksHtml}
                                                                                                                                              </div>
                                                                                                                                                  </div>
                                                                                                                                                    `;

  document.getElementById('budgetSlider')?.addEventListener('input', e => {
        state.budgetSalaryMax = +e.target.value;
        document.getElementById('budgetVal').textContent = '$' + (+e.target.value).toLocaleString();
        renderBudgetBeasts();
  });
}

// Patch render() to support budget tab
const _origRender = render;
window.render = function() {
    if (state.tab === 'budget') {
          renderTabs();
          renderBudgetBeasts();
    } else {
          _origRender();
    }
};
