const API = 'https://statsapi.mlb.com/api/v1';
const HYDRATE = 'team,probablePitcher,linescore,flags,venue(location,timeZone),decisions,lineups';
const TABS = [
  {id:'games', label:'Games', icon:'🎮'},
  {id:'pitching', label:'Pitching Edge', icon:'⚾'},
  {id:'scouting', label:'Scouting', icon:'📊'},
  {id:'stacks', label:'Stack Recs', icon:'🔥'},
  {id:'aistack', label:'AI Stack', icon:'🤖'},
  {id:'optimizer', label:'Optimizer', icon:'🔧'},
  {id:'alerts', label:'Alerts', icon:'🔔'}
];
const PARKS = {
  'Coors Field':{hr:1.42,run:1.32,short:'COL'},'Great American Ball Park':{hr:1.28,run:1.18,short:'CIN'},
  'Yankee Stadium':{hr:1.24,run:1.12,short:'NYY'},'Fenway Park':{hr:1.15,run:1.13,short:'BOS'},
  'Globe Life Field':{hr:1.18,run:1.11,short:'TEX'},'Citizens Bank Park':{hr:1.20,run:1.14,short:'PHI'},
  'American Family Field':{hr:1.12,run:1.09,short:'MIL'},'Truist Park':{hr:1.10,run:1.07,short:'ATL'},
  'Chase Field':{hr:1.08,run:1.06,short:'ARI'},'Wrigley Field':{hr:1.08,run:1.07,short:'CHC'},
  'Dodger Stadium':{hr:0.93,run:0.96,short:'LAD'},'Target Field':{hr:0.95,run:0.97,short:'MIN'},
  'Busch Stadium':{hr:0.90,run:0.93,short:'STL'},'T-Mobile Park':{hr:0.87,run:0.91,short:'SEA'},
  'Oracle Park':{hr:0.78,run:0.85,short:'SF'},'Petco Park':{hr:0.80,run:0.86,short:'SD'},
  'PNC Park':{hr:0.85,run:0.89,short:'PIT'},'loanDepot park':{hr:0.92,run:0.94,short:'MIA'}
};
const NEUTRAL_PARK={hr:1,run:1,short:'MLB'};
const VENUE_COORDS={
  'Angel Stadium':{lat:33.8003,lon:-117.8827,roof:'Open'},'Busch Stadium':{lat:38.6226,lon:-90.1928,roof:'Open'},
  'Chase Field':{lat:33.4453,lon:-112.0667,roof:'Retractable'},'Citi Field':{lat:40.7571,lon:-73.8458,roof:'Open'},
  'Citizens Bank Park':{lat:39.9061,lon:-75.1665,roof:'Open'},'Comerica Park':{lat:42.3390,lon:-83.0485,roof:'Open'},
  'Coors Field':{lat:39.7559,lon:-104.9942,roof:'Open'},'Daikin Park':{lat:29.7572,lon:-95.3555,roof:'Retractable'},
  'Dodger Stadium':{lat:34.0739,lon:-118.2400,roof:'Open'},'Fenway Park':{lat:42.3467,lon:-71.0972,roof:'Open'},
  'Globe Life Field':{lat:32.7473,lon:-97.0847,roof:'Retractable'},'Great American Ball Park':{lat:39.0979,lon:-84.5081,roof:'Open'},
  'Guaranteed Rate Field':{lat:41.8300,lon:-87.6338,roof:'Open'},'Kauffman Stadium':{lat:39.0517,lon:-94.4803,roof:'Open'},
  'loanDepot park':{lat:25.7781,lon:-80.2197,roof:'Retractable'},'Nationals Park':{lat:38.8730,lon:-77.0074,roof:'Open'},
  'Oracle Park':{lat:37.7786,lon:-122.3893,roof:'Open'},'Oriole Park at Camden Yards':{lat:39.2838,lon:-76.6217,roof:'Open'},
  'Petco Park':{lat:32.7073,lon:-117.1566,roof:'Open'},'PNC Park':{lat:40.4469,lon:-80.0057,roof:'Open'},
  'Progressive Field':{lat:41.4962,lon:-81.6852,roof:'Open'},'Rogers Centre':{lat:43.6414,lon:-79.3894,roof:'Retractable'},
  'T-Mobile Park':{lat:47.5914,lon:-122.3325,roof:'Retractable'},'Target Field':{lat:44.9817,lon:-93.2775,roof:'Open'},
  'Truist Park':{lat:33.8908,lon:-84.4677,roof:'Open'},'Wrigley Field':{lat:41.9484,lon:-87.6553,roof:'Open'},
  'Yankee Stadium':{lat:40.8296,lon:-73.9262,roof:'Open'}
};
const TEAM_NAME_ALIASES={
  'athletics':'oakland athletics',"a's":'oakland athletics',
  'los angeles angels':'los angeles angels','la angels':'los angeles angels',
  'arizona d-backs':'arizona diamondbacks','dbacks':'arizona diamondbacks','diamondbacks':'arizona diamondbacks'
};
const ODDS_API_KEY='dc199f784d8f6207d8ce12a0bd10ff44';
const state={
  tab:'dashboard',selectedDate:new Date().toISOString().slice(0,10),season:new Date().getFullYear(),
  loading:false,games:[],selectedGamePk:null,selectedGameData:null,stackRows:[],teamEdges:[],
  hero:{games:0,live:0,best:'-',avg:0},
  notes:localStorage.getItem('mlb-edge-notes')||'',
  watchlist:JSON.parse(localStorage.getItem('mlb-edge-watchlist')||'[]'),
  edgeFilter:'',autoRefresh:false,autoRefreshMs:120000,
  oddsWeather:JSON.parse(localStorage.getItem('mlb-edge-odds-weather')||'{}'),
  apiConfig:JSON.parse(localStorage.getItem('mlb-edge-api-config')||'{"proxyBaseUrl":"https://newest-mlb-1.onrender.com","oddsRegion":"us","oddsBookmaker":"","autoSyncWeather":true,"autoSyncOdds":true,"savantApiUrl":"https://allday-mlb-edge-api.onrender.com"}'),
  liveSync:{weather:{status:'idle',updatedAt:null,error:''},odds:{status:'idle',updatedAt:null,error:''}},
  teamHittersCache:{},teamPitchingCache:{},recentGamesCache:{},gameContextCache:{},
  aiMode:'picks',aiLoading:false,aiResult:'',aiResultMode:'',aiResultDate:'',aiError:'',
  dkSalaries:JSON.parse(localStorage.getItem('mlb-edge-dk-salaries')||'{}'),
  dkSalaryDate:localStorage.getItem('mlb-edge-dk-salary-date')||'',
  dkSlates:[],
  dkSyncStatus:{status:'idle',updatedAt:null,error:''},
  optimizerResult:null,
  optimizerStackTeam:''
};

const $=s=>document.querySelector(s);
const view=$('#view');
const tabsEl=$('#tabs');

function getAccessProfile(){return JSON.parse(localStorage.getItem('allday-mlb-edge-access')||'{"email":"","apiBase":""}');}
function setAccessProfile(p){localStorage.setItem('allday-mlb-edge-access',JSON.stringify(p));}

async function startStripeCheckout(plan='pro'){
  const profile=getAccessProfile();
  const apiBase=(profile.apiBase||state.apiConfig.proxyBaseUrl||'').replace(/\/$/,'');
  if(!apiBase){alert('Add backend URL first.');return;}
  try{
    const resp=await fetch(apiBase+'/api/checkout/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan,customerEmail:profile.email||'',successUrl:window.location.origin+window.location.pathname+'?checkout=success',cancelUrl:window.location.href})});
    const data=await resp.json();
    if(!resp.ok)throw new Error(data.error||'Checkout failed');
    if(data.url)window.open(data.url,'_blank');
  }catch(err){alert(err.message||'Checkout failed');}
}

async function openBillingPortal(){
  const profile=getAccessProfile();
  const apiBase=(profile.apiBase||state.apiConfig.proxyBaseUrl||'').replace(/\/$/,'');
  const customerId=localStorage.getItem('allday-mlb-edge-stripe-customer-id')||'';
  if(!customerId){alert('No Stripe customer ID saved yet.');return;}
  try{
    const resp=await fetch(apiBase+'/api/portal/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customerId,returnUrl:window.location.href})});
    const data=await resp.json();
    if(!resp.ok)throw new Error(data.error||'Portal failed');
    if(data.url)window.open(data.url,'_blank');
  }catch(err){alert(err.message||'Portal failed');}
}

function escapeHtml(str=''){return String(str).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function fmtPct(n,d=3){if(n==null||Number.isNaN(Number(n)))return'.---';return Number(n).toFixed(d).replace(/^0/,'');}
function fmtNum(n,d=2){if(n==null||Number.isNaN(Number(n)))return'-';return Number(n).toFixed(d);}
function fmtTime(iso){if(!iso)return'-';return new Date(iso).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});}
function fmtStamp(iso){return iso?new Date(iso).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'-';}
function parkFor(name){return PARKS[name]||NEUTRAL_PARK;}
function venueMeta(name){return VENUE_COORDS[name]||null;}
function normTeamName(name=''){const k=name.toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();return TEAM_NAME_ALIASES[k]||k;}
function liveStatusPill(sync){if(!sync||sync.status==='idle')return'<span class="pill">Idle</span>';if(sync.status==='loading')return'<span class="pill">Syncing…</span>';if(sync.status==='ok')return`<span class="pill ok">Live ${fmtStamp(sync.updatedAt)}</span>`;return`<span class="pill bad">${escapeHtml(sync.error||'Error')}</span>`;}
function gradeBadge(score){if(score>=88)return['A','smash'];if(score>=78)return['B+','strong'];if(score>=68)return['B','watch'];return['C','fade'];}
function gameBadge(status){if(status==='Live')return'live';if(status==='Final')return'final';return'preview';}

// ─── Advanced Pitcher Grading (7-Factor Weighted Model) ──────────────────────
function pitcherSpotScore(p, game, side) {
  var era = Number(p.era || 4.3), whip = Number(p.whip || 1.3), k9 = Number(p.k9 || 8.6), hr9 = Number(p.hr9 || 1.15);
  var park = parkFor(game.venue ? game.venue.name : '');
  var m = getMarket(game);
  var oppSide = side === 'home' ? 'away' : 'home';
  var oppEdge = teamEdgeScore(game, oppSide);

  // K Edge (0-100): strikeout potential vs this lineup
  var kRate = Math.min(100, Math.max(0, (k9 - 5) * 10)); // normalize K/9 to 0-100
  var swStr = Math.min(100, Math.max(0, kRate * 0.8)); // estimate swinging strike from K rate
  var csw = Math.min(100, Math.max(0, kRate * 0.9 + 10)); // CSW estimate
  var oppKvuln = Math.min(100, Math.max(0, oppEdge * 0.6)); // opponent K vulnerability
  var kEdge = Math.round(kRate * 0.32 + swStr * 0.28 + csw * 0.22 + oppKvuln * 0.18);

  // Command (0-100): walk control + zone
  var bbSafety = Math.min(100, Math.max(0, 100 - (whip - 0.9) * 80)); // lower WHIP = better command
  var fps = Math.min(100, Math.max(0, 70 - (whip - 1.0) * 30)); // first pitch strike estimate
  var zoneCtl = Math.min(100, Math.max(0, 80 - (era - 3.0) * 10));
  var command = Math.round(bbSafety * 0.42 + fps * 0.30 + zoneCtl * 0.28);

  // Arsenal Fit (0-100): pitch mix vs lineup
  var arsenalFit = Math.min(100, Math.max(0, 50 + (k9 - 7) * 8 - (hr9 - 1.0) * 15));
  var platoonFit = Math.min(100, Math.max(0, 60 + (side === 'home' ? 5 : -3)));
  var arsenal = Math.round(arsenalFit * 0.62 + platoonFit * 0.38);

  // Run Prevention (0-100): park + weather + hard contact
  var hardContactSupp = Math.min(100, Math.max(0, 80 - (hr9 - 0.8) * 25));
  var hrSafety = Math.min(100, Math.max(0, 80 - (hr9 - 1.0) * 30));
  var parkScore = Math.min(100, Math.max(0, 100 - (park.run - 0.85) * 100));
  var ws = weatherScore(m);
  var weatherSafe = Math.min(100, Math.max(0, 100 - ws));
  var runPrev = Math.round(hardContactSupp * 0.28 + hrSafety * 0.24 + parkScore * 0.28 + weatherSafe * 0.20);

  // Win Support (0-100): run support + bullpen
  var total = Number(m.total || 8.5);
  var ml = Number(side === 'home' ? m.homeMoneyline : m.awayMoneyline) || 0;
  var implied = mlToImplied(ml) || 50;
  var runSupport = Math.min(100, Math.max(0, implied * 1.5 + (total - 7) * 5));
  var bullpenSupp = Math.min(100, Math.max(0, 65)); // default neutral
  var oppAttack = Math.min(100, Math.max(0, 100 - oppEdge));
  var winSupport = Math.round(runSupport * 0.40 + bullpenSupp * 0.28 + oppAttack * 0.32);

  // Workload (0-100): expected innings + leash
  var expIP = starterProjection(p);
  var pitchCount = Math.min(100, Math.max(0, expIP * 14));
  var managerTrust = Math.min(100, Math.max(0, expIP >= 6 ? 80 : expIP >= 5 ? 65 : 45));
  var workload = Math.round(pitchCount * 0.55 + managerTrust * 0.45);

  // Recent Trend (0-100): velocity + whiff + command trends (estimated from ERA/WHIP)
  var veloTrend = Math.min(100, Math.max(0, 70 - (era - 3.5) * 8));
  var whiffTrend = Math.min(100, Math.max(0, 50 + (k9 - 7.5) * 6));
  var cmdTrend = Math.min(100, Math.max(0, 80 - (whip - 1.1) * 30));
  var trend = Math.round(veloTrend * 0.30 + whiffTrend * 0.40 + cmdTrend * 0.30);

  // Weighted Pitcher Spot Score
  var spotScore = Math.round(
    kEdge * 0.25 +
    command * 0.15 +
    arsenal * 0.15 +
    runPrev * 0.10 +
    winSupport * 0.15 +
    workload * 0.10 +
    trend * 0.10
  );
  spotScore = Math.max(0, Math.min(100, spotScore));

  // Derived scores
  var winScore = Math.round(winSupport * 0.34 + workload * 0.18 + runPrev * 0.16 + command * 0.16 + kEdge * 0.10 + trend * 0.06);
  var dfsScore = Math.round(kEdge * 0.42 + arsenal * 0.18 + workload * 0.14 + trend * 0.12 + runPrev * 0.08 + command * 0.06);
  var vegasScore = Math.round(winSupport * 0.28 + command * 0.20 + runPrev * 0.18 + workload * 0.16 + trend * 0.10 + kEdge * 0.08);

  // Grade
  var grade = spotScore >= 92 ? 'A+' : spotScore >= 85 ? 'A' : spotScore >= 76 ? 'B+' : spotScore >= 67 ? 'B' : spotScore >= 57 ? 'C' : spotScore >= 45 ? 'D' : 'F';

  return {
    spotScore: spotScore, winScore: winScore, dfsScore: dfsScore, vegasScore: vegasScore,
    grade: grade,
    factors: { kEdge: kEdge, command: command, arsenal: arsenal, runPrev: runPrev, winSupport: winSupport, workload: workload, trend: trend }
  };
}
window.pitcherSpotScore = pitcherSpotScore;

function pitcherWeakness(p={}){
  const era=Number(p.era||4.3),whip=Number(p.whip||1.3),hr9=Number(p.hr9||1.15),k9=Number(p.k9||8.6);
  let score=50;
  score+=Math.max(-16,Math.min(26,(era-4.1)*12));
  score+=Math.max(-12,Math.min(18,(whip-1.24)*28));
  score+=Math.max(-10,Math.min(16,(hr9-1.05)*22));
  score+=Math.max(-12,Math.min(10,(8.4-k9)*4));
  return Math.max(10,Math.min(95,Math.round(score)));
}
function teamEdgeScore(game,side){const opp=side==='home'?game.awayPitcher:game.homePitcher;const park=parkFor(game.venue.name);const base=pitcherWeakness(opp);const parkLift=Math.round((park.run-1)*70+(park.hr-1)*55);return Math.max(15,Math.min(99,base+parkLift+(game.status==='Live'?4:0)));}
function stackLevel(score){if(score>=86)return['SMASH STACK','smash'];if(score>=76)return['PRIORITY','strong'];if(score>=66)return['SECONDARY','watch'];return['FADE','fade'];}
function noteSentimentScore(note=''){const t=String(note||'').toLowerCase();let score=50;['steam','sharp','love','buy','up','boost','bullish','target','attack','hammer','plus'].forEach(k=>{if(t.includes(k))score+=5;});['fade','cold','down','drop','risk','bearish','avoid','trap','delay','bench'].forEach(k=>{if(t.includes(k))score-=5;});return Math.max(20,Math.min(80,score));}

function marketKey(game){return`${state.selectedDate}:${game.gamePk}`;}
function defaultMarket(){return{awayMoneyline:'',homeMoneyline:'',total:'',awayTeamTotal:'',homeTeamTotal:'',temperature:'',wind:'',windDir:'Out',precip:'',roof:'Open',book:'Draft',note:''};}
function getMarket(game){return{...defaultMarket(),...(state.oddsWeather[marketKey(game)]||{})};}
function saveMarket(gamePk,patch){const game=state.games.find(g=>g.gamePk===Number(gamePk));if(!game)return;const key=marketKey(game);state.oddsWeather[key]={...defaultMarket(),...(state.oddsWeather[key]||{}),...patch};localStorage.setItem('mlb-edge-odds-weather',JSON.stringify(state.oddsWeather));}
function mlToImplied(ml){const n=Number(ml);if(!Number.isFinite(n)||n===0)return null;return Math.round((n>0?100/(n+100):Math.abs(n)/(Math.abs(n)+100))*1000)/10;}
function weatherScore(m){const temp=Number(m.temperature||0),wind=Number(m.wind||0),precip=Number(m.precip||0);let score=50;if(String(m.roof||'').toLowerCase()==='closed')score-=6;if(temp)score+=temp>=88?10:temp>=80?7:temp>=72?4:temp>=60?0:-5;if(wind){if(m.windDir==='Out')score+=Math.min(14,wind*1.2);else if(m.windDir==='In')score-=Math.min(14,wind*1.2);else score+=Math.min(4,wind*.25);}if(precip)score-=Math.min(12,precip*.3);return Math.max(20,Math.min(80,Math.round(score)));}
function weatherLabel(score){if(score>=62)return['Boost','good'];if(score<=42)return['Risk','bad'];return['Neutral',''];}
function totalLean(game,m){const total=Number(m.total||0),park=parkFor(game.venue.name);const base=Math.round(((park.run-1)*12)+((weatherScore(m)-50)*.18)+50);const lean=total?(base+(total-8.5)*3):base;if(lean>=58)return'Over environment';if(lean<=44)return'Under environment';return'Balanced total';}

function toggleWatch(item){const key=`${item.type}:${item.name}`;const idx=state.watchlist.findIndex(x=>x.key===key);if(idx>=0)state.watchlist.splice(idx,1);else state.watchlist.unshift({...item,key,addedAt:new Date().toISOString()});localStorage.setItem('mlb-edge-watchlist',JSON.stringify(state.watchlist.slice(0,40)));if(typeof render==='function')render();}
function isWatched(type,name){return state.watchlist.some(x=>x.key===`${type}:${name}`);}
function getTopAttackablePitchers(){return state.games.flatMap(g=>[{name:g.awayPitcher.name,weak:pitcherWeakness(g.awayPitcher),opp:g.home.abbr,venue:g.venue.name,gamePk:g.gamePk},{name:g.homePitcher.name,weak:pitcherWeakness(g.homePitcher),opp:g.away.abbr,venue:g.venue.name,gamePk:g.gamePk}]).sort((a,b)=>b.weak-a.weak).slice(0,5);}
function getTopOneOffs(){const g=state.selectedGameData;if(!g)return[];return[...(g.awayHitters||[]),...(g.homeHitters||[])].sort((a,b)=>b.grade.score-a.grade.score).slice(0,6);}
function filteredStackRows(){const q=state.edgeFilter.trim().toLowerCase();if(!q)return state.stackRows;return state.stackRows.filter(r=>[r.team,r.opponent,r.oppPitcher,r.venue].some(v=>String(v||'').toLowerCase().includes(q)));}

function handednessEdge(batSide='R',pitchHand='R'){return batSide&&pitchHand&&batSide===pitchHand?-4:6;}
function projectedSplitMetrics(h,oppPitcher,isHome,travelCtx){const avg=Number(h.avg||0),ops=Number(h.ops||0),obp=Number(h.obp||0),slg=Number(h.slg||0);const handBoost=handednessEdge(h.batSide||'R',oppPitcher.pitchHand||'R');const homeAwayBoost=isHome?3:-1;const travelPenalty=travelCtx?.penalty||0;const lrOps=Math.max(.520,Math.min(1.250,ops+handBoost*.012));const lrAvg=Math.max(.180,Math.min(.380,avg+handBoost*.0026));const venueOps=Math.max(.520,Math.min(1.250,ops+homeAwayBoost*.010-travelPenalty*.006));const venueObp=Math.max(.230,Math.min(.500,obp+homeAwayBoost*.004-travelPenalty*.003));const venueSlg=Math.max(.250,Math.min(.800,slg+homeAwayBoost*.008-travelPenalty*.004));return{lrLabel:`vs ${oppPitcher.pitchHand||'RHP'}`,lrAvg,lrOps,venueLabel:isHome?'Home split':'Road split',venueOps,venueObp,venueSlg,splitEdge:Math.round((lrOps-ops)*1000+(venueOps-ops)*700)};}
function starterProjection(p){const era=Number(p.era||4.3),whip=Number(p.whip||1.3),k9=Number(p.k9||8.6),hr9=Number(p.hr9||1.1);let innings=5.4;innings+=Math.max(-1.0,Math.min(1.2,(8.0-era)*0.28));innings+=Math.max(-0.8,Math.min(0.8,(1.35-whip)*1.2));innings+=Math.max(-0.4,Math.min(0.5,(k9-8.5)*0.08));innings-=Math.max(0,(hr9-1.1)*0.35);return Math.round(Math.max(3.8,Math.min(7.4,innings))*10)/10;}
function pitcherTendencies(p){const hr9=Number(p.hr9||1.15),whip=Number(p.whip||1.3),k9=Number(p.k9||8.6),era=Number(p.era||4.3);const notes=[];if(k9>=10)notes.push('plus strikeout lane');else if(k9<=7)notes.push('contact-friendly');if(hr9>=1.35)notes.push('home-run risk');if(whip>=1.35)notes.push('traffic on bases');if(era>=4.7)notes.push('run prevention shakier');const attack=Math.round(50+(hr9-1.05)*16+(whip-1.24)*18+(8.6-k9)*2.4+(era-4.1)*5);const profile=k9>=9.8?'Miss-bats starter':hr9>=1.35?'Power target':whip>=1.35?'Traffic starter':'Neutral profile';return{profile,notes,attack:Math.max(20,Math.min(90,attack)),expIP:starterProjection(p)};}

function bullpenLeverageForHitter(hitter,oppBullpen){if(!oppBullpen)return{score:50,label:'Neutral pen chain'};let score=50;const availability=Number(oppBullpen.availabilityScore||50),innings=Number(oppBullpen.projectedInnings||0);score+=(innings-3.0)*5;score+=(55-availability)*0.45;score=Math.max(20,Math.min(80,Math.round(score)));return{score,label:score>=60?'Bullpen lane opens':score<=42?'Late pen resistance':'Mixed bullpen'};}
function marketPulseForSide(game,side){const m=getMarket(game);const total=Number(m.total||0),teamTotal=Number(side==='home'?m.homeTeamTotal:m.awayTeamTotal||0),ml=Number(side==='home'?m.homeMoneyline:m.awayMoneyline||0);const implied=mlToImplied(ml)||50,weather=weatherScore(m);let score=50;score+=teamTotal?(teamTotal-4.2)*7:0;score+=total?(total-8.5)*2.5:0;score+=(weather-50)*0.35;score+=(implied-50)*0.22;score+=(noteSentimentScore(m.note)-50)*0.35;score=Math.max(20,Math.min(80,Math.round(score)));return{score,label:score>=62?'Market tailwind':score<=42?'Market caution':'Neutral market',implied,weather};}
function systemOptimizationLens(hitter,oppPitcher,context={}){let score=50;score+=hitter.pa>=120?8:hitter.pa>=70?5:2;score+=(6.0-Number(pitcherTendencies(oppPitcher).expIP||5.4))*5;score+=(55-Number(context.oppBullpen?.availabilityScore||55))*0.25;score-=(context.travel?.penalty||0)*4;if(context.isHome)score+=4;score=Math.max(20,Math.min(80,Math.round(score)));return{score,label:score>=60?'Stable deployment':score<=42?'Volatility elevated':'Playable workflow'};}
function patternMatchingLens(hitter,oppPitcher,park,context={}){const splits=projectedSplitMetrics(hitter,oppPitcher,!!context.isHome,context.travel||{}),pTen=pitcherTendencies(oppPitcher),pen=bullpenLeverageForHitter(hitter,context.oppBullpen);let score=50;score+=Math.max(-12,Math.min(16,(splits.lrOps-Number(hitter.ops||.720))*100));score+=((park.hr||1)-1)*24+((park.run||1)-1)*18;score+=(pTen.attack-50)*0.28;score+=(pen.score-50)*0.35;score=Math.max(20,Math.min(80,Math.round(score)));return{score,label:score>=62?'Pattern match':score<=42?'Pattern weak':'Pattern neutral',bullpen:pen};}
function triModelCollabLens(hitter,oppPitcher,park,context={}){const market=marketPulseForSide(context.game||{},context.side||(context.isHome?'home':'away')),system=systemOptimizationLens(hitter,oppPitcher,context),pattern=patternMatchingLens(hitter,oppPitcher,park,context);const overall=Math.round(market.score*0.34+system.score*0.26+pattern.score*0.40);return{market,system,pattern,overall,summary:overall>=62?'Consensus boost':overall<=42?'Consensus caution':'Mixed consensus'};}

function hitterGrade(h,oppPitcher,park,context={}){
  // Use 10-factor advanced engine if loaded (mlb-advanced-grading.js)
  if(typeof hitterGrade10Factor==='function'){
    const result=hitterGrade10Factor(h,oppPitcher,park,context);
    // Attach collab for backward compat
    result.collab=context.collab||{market:{score:50,label:'Neutral'},system:{score:50,label:'Neutral'},pattern:{score:50,label:'Neutral',bullpen:{score:50,label:'Mixed'}}};
    return result;
  }
  // Fallback: original 8-factor engine
  const avg=Number(h.avg||0),ops=Number(h.ops||(Number(h.obp||0)+Number(h.slg||0))),slg=Number(h.slg||0),hr=Number(h.hr||0),pa=Number(h.pa||0);
  const pWeak=pitcherWeakness(oppPitcher),splits=projectedSplitMetrics(h,oppPitcher,!!context.isHome,context.travel||{}),collab=triModelCollabLens(h,oppPitcher,park,context);
  let score=0;
  score+=avg>=.300?24:avg>=.280?19:avg>=.260?15:avg>=.240?10:6;
  score+=ops>=.950?22:ops>=.850?18:ops>=.775?14:ops>=.700?10:6;
  score+=slg>=.550?18:slg>=.480?14:slg>=.430?11:slg>=.380?8:5;
  score+=Math.min(16,(pa?hr/pa*500:0)*1.5);
  score+=Math.round((pWeak-50)*0.35);
  score+=Math.round(((park.hr||1)-1)*40+((park.run||1)-1)*35);
  score+=Math.round((splits.splitEdge||0)*0.08);
  score-=Math.round((context.travel?.penalty||0)*1.5);
  score+=Math.round((collab.market.score-50)*0.16+(collab.system.score-50)*0.12+(collab.pattern.score-50)*0.18);
  score=Math.max(25,Math.min(99,Math.round(score)));
  const[letter,style]=gradeBadge(score);
  const reasons=[avg+' AVG',ops+' OPS',splits.lrLabel+' '+splits.lrOps+' OPS',splits.venueLabel+' '+splits.venueOps+' OPS','Travel '+(context.travel?.hours?context.travel.hours+'h':'minimal'),'vs '+(oppPitcher.name||'TBD'),park.short+' HR '+park.hr,collab.market.label,'Pattern '+collab.pattern.label,'System '+collab.system.label];
  return{score,letter,style,reasons,splits,collab};
} function normalizeStatus(status){if(status==='In Progress')return'Live';return status;}
function parseIP(ip){if(ip==null||ip==='')return 0;const s=String(ip);if(!s.includes('.'))return Number(s)||0;const[whole,frac]=s.split('.');return(Number(whole)||0)+(frac==='1'?1:frac==='2'?2:0)/3;}
function haversineMiles(lat1,lon1,lat2,lon2){const R=3958.8,toRad=d=>d*Math.PI/180,dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1),a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(a));}
function classifyTravel(miles,restDays){if(!miles)return{hours:0,label:'No travel',penalty:0};const hours=Math.round((miles/500+1.5)*10)/10;let penalty=miles>1800?7:miles>1000?4:miles>450?2:0;if(restDays<=1&&miles>900)penalty+=3;else if(restDays<=1&&miles>450)penalty+=1;return{hours,label:miles>1800?'Cross-country':miles>900?'Flight spot':miles>250?'Road hop':'Short turn',penalty};}

// ─── DraftKings salary helpers ───────────────────────────────────────────────

function parseDKCsv(text){
  const lines=text.trim().split('\n');
  const header=lines[0].split(',').map(h=>h.replace(/"/g,'').trim().toLowerCase());
  const nameIdx=header.findIndex(h=>h==='name');
  const salaryIdx=header.findIndex(h=>h==='salary');
  const posIdx=header.findIndex(h=>h==='position'||h==='roster position');
  const teamIdx=header.findIndex(h=>h==='teamabbrev'||h==='team');
  const avgIdx=header.findIndex(h=>h.includes('avgpoints')||h.includes('avg points'));
  const out={};
  for(let i=1;i<lines.length;i++){
    const cols=lines[i].split(',').map(c=>c.replace(/"/g,'').trim());
    const name=cols[nameIdx];if(!name)continue;
    out[name.toLowerCase()]={name,salary:Number(cols[salaryIdx])||0,pos:cols[posIdx]||'',team:cols[teamIdx]||'',avgPts:Number(cols[avgIdx])||0};
  }
  return out;
}

function getDKSalary(playerName){
  const key=String(playerName||'').toLowerCase();
  return state.dkSalaries[key]||null;
}

function valueScore(gradeScore,salary){
  if(!salary||salary<1000)return null;
  return Math.round((gradeScore/(salary/1000))*10)/10;
}

function fuzzyNameMatch(a,b){
  const norm=s=>s.toLowerCase().replace(/[^a-z ]/g,'').trim();
  const na=norm(a),nb=norm(b);
  if(na===nb)return true;
  const pa=na.split(' '),pb=nb.split(' ');
  if(pa.length>=2&&pb.length>=2){
    const lastA=pa[pa.length-1],lastB=pb[pb.length-1];
    if(lastA===lastB&&pa[0][0]===pb[0][0])return true;
  }
  return false;
}

function pitcherDKScore(pitcher,game,side){
  const era=Number(pitcher.era||4.30),k9=Number(pitcher.k9||8.6),whip=Number(pitcher.whip||1.30),hr9=Number(pitcher.hr9||1.15);
  const oppSide=side==='home'?'away':'home';
  const oppEdge=teamEdgeScore(game,oppSide);
  const park=parkFor(game.venue.name);
  let score=50;
  score+=Math.max(-18,Math.min(22,(4.5-era)*9));
  score+=Math.max(-8,Math.min(18,(k9-8.0)*3.5));
  score+=Math.max(-8,Math.min(10,(1.30-whip)*22));
  score+=Math.max(-8,Math.min(8,(1.15-hr9)*18));
  score+=Math.round((50-oppEdge)*0.25);
  score+=Math.round((1.0-park.run)*12);
  if(side==='home')score+=3;
  return Math.max(20,Math.min(99,Math.round(score)));
}

function buildDKPlayerPool(){
  if(!Object.keys(state.dkSalaries||{}).length)return[];
  const gradedMap={};
  if(state.selectedGameData){
    for(const h of[...(state.selectedGameData.awayHitters||[]),...(state.selectedGameData.homeHitters||[])]){
      gradedMap[h.name.toLowerCase()]=h;
    }
  }
  const teamEdgeMap={};
  for(const row of state.stackRows)teamEdgeMap[row.team.toUpperCase()]=row.score;
  const gameByTeam={};
  for(const g of state.games){
    gameByTeam[(g.away.abbr||'').toUpperCase()]={game:g,side:'away'};
    gameByTeam[(g.home.abbr||'').toUpperCase()]={game:g,side:'home'};
  }
  const pool=[];
  for(const[key,dk]of Object.entries(state.dkSalaries)){
    if(!dk.salary||dk.salary<2000)continue;
    const teamKey=(dk.team||'').toUpperCase();
    const ctx=gameByTeam[teamKey]||null;
    const teamEdge=teamEdgeMap[teamKey]||50;
    const isPitcher=/^(SP|RP|P)$/i.test(dk.pos||'');
    let score=50,projPts=dk.avgPts||0,graded=false;
    if(isPitcher&&ctx){
      const pitcher=ctx.side==='away'?ctx.game.awayPitcher:ctx.game.homePitcher;
      if(pitcher&&pitcher.name)score=pitcherDKScore(pitcher,ctx.game,ctx.side);
    }else if(!isPitcher){
      const exact=gradedMap[key];
      if(exact){score=exact.grade.score;projPts=projPts||Math.round(score*0.42);graded=true;}
      else{
        const fuzzy=Object.entries(gradedMap).find(([k])=>fuzzyNameMatch(dk.name,k));
        if(fuzzy){score=fuzzy[1].grade.score;projPts=projPts||Math.round(score*0.42);graded=true;}
        else{const ptsBias=projPts>0?Math.min(25,projPts*3.5):15;score=Math.max(25,Math.min(95,Math.round(teamEdge*0.55+ptsBias)));}
      }
    }
    const val=valueScore(score,dk.salary);
    const compositeScore=Math.round(score*0.50+(val||0)*2.5+Math.min(18,(projPts||0)*1.8));
    pool.push({...dk,score,projPts,val:val||0,isPitcher,graded,compositeScore});
  }
  return pool.sort((a,b)=>b.compositeScore-a.compositeScore);
}

function optimizeDKLineup(stackTeam){
  const pool=buildDKPlayerPool();
  if(pool.length<8)return null;
  const CAP=50000;
  const posMatch=(pos,slot)=>{
    const p=(pos||'').toUpperCase().split('/')[0];
    if(slot==='SP')return/^(SP|P)$/.test(p);
    if(slot==='C1B')return p==='C'||p==='1B';
    if(slot==='2B')return p==='2B';
    if(slot==='3B')return p==='3B';
    if(slot==='SS')return p==='SS';
    if(slot==='OF')return p==='OF';
    if(slot==='FLEX')return['C','1B','2B','3B','SS','OF'].includes(p);
    return false;
  };
  const SLOTS=[
    {id:'sp1',label:'SP',slot:'SP'},{id:'sp2',label:'SP',slot:'SP'},
    {id:'c1b',label:'C/1B',slot:'C1B'},{id:'ob2',label:'2B',slot:'2B'},
    {id:'ob3',label:'3B',slot:'3B'},{id:'ss',label:'SS',slot:'SS'},
    {id:'of1',label:'OF',slot:'OF'},{id:'of2',label:'OF',slot:'OF'},{id:'of3',label:'OF',slot:'OF'},
    {id:'flex',label:'FLEX',slot:'FLEX'}
  ];
  const stackKey=stackTeam?(stackTeam+'').toUpperCase():'';
  const scored=pool.map(p=>({...p,adj:p.compositeScore+(stackKey&&p.team.toUpperCase()===stackKey?14:0)})).sort((a,b)=>b.adj-a.adj);
  const lineup={};
  const used=new Set();
  for(const slotDef of SLOTS){
    const pick=scored.find(p=>!used.has(p.name)&&posMatch(p.pos,slotDef.slot));
    if(pick){lineup[slotDef.id]={...pick,slotLabel:slotDef.label,slotId:slotDef.id};used.add(pick.name);}
  }
  let totalSalary=Object.values(lineup).reduce((s,p)=>s+(p.salary||0),0);
  let guard=0;
  while(totalSalary>CAP&&guard++<40){
    const hitters=Object.values(lineup).filter(p=>!p.isPitcher).sort((a,b)=>b.salary-a.salary);
    let swapped=false;
    for(const target of hitters){
      const slotDef=SLOTS.find(s=>s.id===target.slotId);
      if(!slotDef)continue;
      const cheaper=scored.find(p=>!used.has(p.name)&&posMatch(p.pos,slotDef.slot)&&p.salary<target.salary);
      if(!cheaper)continue;
      totalSalary=totalSalary-target.salary+cheaper.salary;
      used.delete(target.name);
      lineup[target.slotId]={...cheaper,slotLabel:target.slotLabel,slotId:target.slotId};
      used.add(cheaper.name);
      swapped=true;break;
    }
    if(!swapped)break;
  }
  const players=Object.values(lineup);
  totalSalary=players.reduce((s,p)=>s+(p.salary||0),0);
  const remaining=CAP-totalSalary;
  const projScore=Math.round(players.reduce((s,p)=>s+(p.projPts||p.score*0.4),0)*10)/10;
  return{lineup:SLOTS.map(s=>lineup[s.id]).filter(Boolean),totalSalary,remaining,projScore,valid:players.length===10&&totalSalary<=CAP};
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchJson(url){
  const base=String(state.apiConfig.proxyBaseUrl||'https://newest-mlb-1.onrender.com').replace(/\/$/,'');
  const isProxy=base&&String(url).startsWith(base);
  const token=localStorage.getItem('allday-mlb-edge-token')||'';
  const headers=(isProxy&&token)?{'Authorization':`Bearer ${token}`}:{};
  const res=await fetch(url,{headers});
  if(!res.ok)throw new Error(`HTTP ${res.status}`);
  return res.json();
}
function saveApiConfig(patch={}){state.apiConfig={proxyBaseUrl:'https://newest-mlb-1.onrender.com',oddsRegion:'us',oddsBookmaker:'',autoSyncWeather:true,autoSyncOdds:true,...state.apiConfig,...patch};localStorage.setItem('mlb-edge-api-config',JSON.stringify(state.apiConfig));}
function proxyUrl(path,params={}){const base=String(state.apiConfig.proxyBaseUrl||'https://newest-mlb-1.onrender.com').replace(/\/$/,'');const url=new URL(base+path);Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&String(v)!=='')url.searchParams.set(k,v);});return url.toString();}
function inferWindDir(deg){if(deg==null||Number.isNaN(Number(deg)))return'Calm';const d=Number(deg);if((d>=315&&d<=360)||(d>=0&&d<45))return'Out';if(d>=135&&d<225)return'In';return'Cross';}
function normTeamAbbr(s){return String(s||'').toUpperCase().trim();}
function findMatchingOddsEvent(game,events=[]){const away=normTeamName(game.away.name),home=normTeamName(game.home.name);return events.find(ev=>normTeamName(ev.away_team||ev.awayTeam||'')===away&&normTeamName(ev.home_team||ev.homeTeam||'')===home);}

async function syncWeatherForSlate(){
  if(!state.games.length)return;
  state.liveSync.weather={status:'loading',updatedAt:null,error:''};if(typeof render==='function')render();
  try{
    for(const game of state.games){
      const venue=venueMeta(game.venue.name);if(!venue)continue;
      const url=`https://api.open-meteo.com/v1/forecast?latitude=${venue.lat}&longitude=${venue.lon}&hourly=temperature_2m,precipitation_probability,wind_speed_10m,wind_direction_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&forecast_days=3&timezone=auto`;
      let payload;try{payload=await(await fetch(url)).json();}catch(e){continue;}
      const times=payload.hourly?.time||[];
      const target=new Date(game.gameDate).getTime();
      let bestIdx=0,bestDiff=Infinity;
      times.forEach((t,i)=>{const diff=Math.abs(new Date(t).getTime()-target);if(diff<bestDiff){bestDiff=diff;bestIdx=i;}});
      const h=payload.hourly;
      saveMarket(game.gamePk,{temperature:String(h.temperature_2m?Math.round(h.temperature_2m[bestIdx]):''),wind:String(h.wind_speed_10m?Math.round(h.wind_speed_10m[bestIdx]):''),windDir:inferWindDir(h.wind_direction_10m?h.wind_direction_10m[bestIdx]:null),precip:String(h.precipitation_probability?h.precipitation_probability[bestIdx]:''),roof:venue.roof||'Open',source:'Open-Meteo',lastWeatherSync:new Date().toISOString()});
    }
    state.liveSync.weather={status:'ok',updatedAt:new Date().toISOString(),error:''};
  }catch(err){state.liveSync.weather={status:'error',updatedAt:null,error:err.message||'Weather sync failed'};}
  render();
}

async function syncOddsForSlate(){
  if(!state.games.length)return;
  state.liveSync.odds={status:'loading',updatedAt:null,error:''};if(typeof render==='function')render();
  try{
    const apiKey=state.apiConfig.oddsApiKey||ODDS_API_KEY;
    const region=state.apiConfig.oddsRegion||'us';
    const url=`https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/?apiKey=${apiKey}&regions=${region}&markets=h2h,totals,team_totals&oddsFormat=american`;
    const data=await(await fetch(url)).json();
    const events=Array.isArray(data)?data:(data.data||[]);
    for(const game of state.games){
      const ev=findMatchingOddsEvent(game,events);if(!ev)continue;
      const bm=ev.bookmakers?.[0]||{};
      const h2h=bm.markets?.find(m=>m.key==='h2h');
      const totals=bm.markets?.find(m=>m.key==='totals');
      const tt=bm.markets?.find(m=>m.key==='team_totals');
      saveMarket(game.gamePk,{awayMoneyline:String(h2h?.outcomes?.find(o=>normTeamName(o.name||'')===normTeamName(game.away.name))?.price??''),homeMoneyline:String(h2h?.outcomes?.find(o=>normTeamName(o.name||'')===normTeamName(game.home.name))?.price??''),total:String(totals?.outcomes?.find(o=>o.name==='Over')?.point??''),awayTeamTotal:String(tt?.outcomes?.find(o=>normTeamName(o.name||'')===normTeamName(game.away.name))?.point??''),homeTeamTotal:String(tt?.outcomes?.find(o=>normTeamName(o.name||'')===normTeamName(game.home.name))?.point??''),book:bm.title||bm.key||'OddsAPI',source:'The Odds API',lastOddsSync:new Date().toISOString()});
    }
    state.liveSync.odds={status:'ok',updatedAt:new Date().toISOString(),error:''};
  }catch(err){state.liveSync.odds={status:'error',updatedAt:null,error:err.message||'Odds sync failed'};}
  render();
}

// ─── Live Player Props from The Odds API ────────────────────────────────────
state.playerProps = state.playerProps || {};
state.playerPropsStatus = state.playerPropsStatus || { status: 'idle' };

async function syncPlayerProps() {
  state.playerPropsStatus = { status: 'loading' };
  try {
    var apiKey = state.apiConfig.oddsApiKey || ODDS_API_KEY;
    var region = state.apiConfig.oddsRegion || 'us';
    var markets = [
      'batter_hits','batter_total_bases','batter_rbis','batter_runs_scored',
      'batter_home_runs','batter_walks','batter_stolen_bases',
      'batter_hits_runs_rbis',
      'pitcher_strikeouts','pitcher_outs','pitcher_hits_allowed',
      'pitcher_earned_runs'
    ].join(',');
    var url = 'https://api.the-odds-api.com/v4/sports/baseball_mlb/events/?apiKey=' + apiKey + '&regions=' + region + '&markets=' + markets + '&oddsFormat=american';
    var resp = await fetch(url);
    if (!resp.ok) {
      // Try alternate endpoint format
      url = 'https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/?apiKey=' + apiKey + '&regions=' + region + '&markets=' + markets + '&oddsFormat=american';
      resp = await fetch(url);
    }
    if (!resp.ok) throw new Error('Props API returned ' + resp.status);
    var data = await resp.json();
    var events = Array.isArray(data) ? data : (data.data || []);

    var props = {};
    events.forEach(function(ev) {
      var bms = ev.bookmakers || [];
      bms.forEach(function(bm) {
        (bm.markets || []).forEach(function(mkt) {
          (mkt.outcomes || []).forEach(function(o) {
            var playerName = (o.description || o.name || '').toLowerCase();
            if (!playerName) return;
            if (!props[playerName]) props[playerName] = {};
            var propKey = mkt.key.replace('batter_', '').replace('pitcher_', '');
            if (!props[playerName][propKey]) props[playerName][propKey] = [];
            props[playerName][propKey].push({
              book: bm.title || bm.key,
              name: o.name,
              point: o.point,
              price: o.price,
              market: mkt.key
            });
          });
        });
      });
    });

    state.playerProps = props;
    state.playerPropsStatus = { status: 'ok', updatedAt: new Date().toISOString(), count: Object.keys(props).length };
    console.log('[Props] Loaded player props for ' + Object.keys(props).length + ' players');
  } catch (err) {
    state.playerPropsStatus = { status: 'error', error: err.message };
    console.warn('[Props] Failed:', err.message);
  }
}

function getPlayerPropLine(playerName, propKey) {
  var key = (playerName || '').toLowerCase();
  var p = state.playerProps[key];
  if (!p || !p[propKey] || !p[propKey].length) return null;
  // Get the first Over line
  var over = p[propKey].find(function(o) { return o.name === 'Over'; });
  return over ? over.point : p[propKey][0].point;
}

async function syncDKSalaries(){
  const base=String(state.apiConfig.proxyBaseUrl||'https://newest-mlb-1.onrender.com').replace(/\/$/,'');
  state.dkSyncStatus={status:'loading',updatedAt:null,error:''};
  try{
    const data=await fetchJson(base+'/api/dk/salaries');
    if(data.salaries&&Object.keys(data.salaries).length>0){
      state.dkSalaries=data.salaries;
      state.dkSalaryDate=data.updatedAt?data.updatedAt.slice(0,10):state.selectedDate;
      state.dkSlates=data.slates||[];
      localStorage.setItem('mlb-edge-dk-salaries',JSON.stringify(state.dkSalaries));
      localStorage.setItem('mlb-edge-dk-salary-date',state.dkSalaryDate);
      state.dkSyncStatus={status:'ok',updatedAt:new Date().toISOString(),error:''};
      console.log(`DK salaries loaded: ${Object.keys(data.salaries).length} players`);
    }else{
      state.dkSyncStatus={status:'ok',updatedAt:new Date().toISOString(),error:''};
    }
  }catch(err){
    state.dkSyncStatus={status:'error',updatedAt:null,error:err.message||'DK sync failed'};
    console.warn('DK salary sync failed:',err.message);
  }
}

async function syncLiveFeeds(){if(state.apiConfig.autoSyncWeather)await syncWeatherForSlate();if(state.apiConfig.autoSyncOdds)await syncOddsForSlate();}

async function fetchPitcherStats(ids,season){
  if(!ids.length)return{};
  const unique=[...new Set(ids.filter(Boolean))];
  if(!unique.length)return{};
  const out={};
  for(const tryYear of[season,season-1,season-2]){
    const need=unique.filter(id=>!out[id]||out[id]._noStats);
    if(!need.length)break;
    const data=await fetchJson(`${API}/people?personIds=${need.join(',')}&hydrate=stats(group=[pitching],type=[season],season=${tryYear})`);
    for(const p of data.people||[]){
      const split=p.stats?.[0]?.splits?.[0]?.stat||{};
      const ip=parseIP(split.inningsPitched||'0');
      if(ip>0||!out[p.id]){out[p.id]={id:p.id,name:p.fullName,era:Number(split.era||4.30),whip:Number(split.whip||1.30),hr9:Number(split.homeRunsPer9||1.15),k9:Number(split.strikeoutsPer9Inn||split.strikeOutsPer9Inn||8.6),ip:split.inningsPitched||'-',w:split.wins||0,l:split.losses||0,pitchHand:p.pitchHand?.code||'R',_noStats:ip===0};}
    }
  }
  unique.forEach(id=>{if(!out[id])out[id]={id,name:'TBD',era:4.30,whip:1.30,hr9:1.15,k9:8.6,ip:'-',w:0,l:0,pitchHand:'R'};delete out[id]?._noStats;});
  return out;
}

async function fetchTeamHitters(teamId,season){
  const ck=`${teamId}:${season}`;
  if(state.teamHittersCache[ck])return state.teamHittersCache[ck];
  const roster=await fetchJson(`${API}/teams/${teamId}/roster?rosterType=active`);
  const hitters=(roster.roster||[]).filter(r=>r.position?.type!=='Pitcher');
  const ids=hitters.map(h=>h.person?.id).filter(Boolean);
  if(!ids.length)return[];
  let rows=[];
  for(const tryYear of[season,season-1,season-2]){
    if(rows.length>=5)break;
    const data=await fetchJson(`${API}/people?personIds=${ids.join(',')}&hydrate=stats(group=[hitting],type=[season],season=${tryYear})`);
    const mapped=(data.people||[]).map(p=>{const s=p.stats?.[0]?.splits?.[0]?.stat||{};return{id:p.id,name:p.fullName,pos:hitters.find(h=>h.person?.id===p.id)?.position?.abbreviation||'-',avg:Number(s.avg||0),obp:Number(s.obp||0),slg:Number(s.slg||0),ops:Number(s.ops||0),hr:Number(s.homeRuns||0),rbi:Number(s.rbi||0),pa:Number(s.plateAppearances||s.atBats||0),sb:Number(s.stolenBases||0),batSide:p.batSide?.code||'R'};}).filter(r=>r.pa>20).sort((a,b)=>b.ops-a.ops||b.hr-a.hr);
    if(mapped.length>rows.length)rows=mapped;
  }
  state.teamHittersCache[ck]=rows;return rows;
}

async function fetchTeamPitchingStaff(teamId,season,excludeId=null){
  const ck=`${teamId}:${season}`;
  if(!state.teamPitchingCache[ck]){
    const roster=await fetchJson(`${API}/teams/${teamId}/roster?rosterType=active`);
    const pitchers=(roster.roster||[]).filter(r=>r.position?.type==='Pitcher');
    const ids=pitchers.map(p=>p.person?.id).filter(Boolean);
    if(!ids.length){state.teamPitchingCache[ck]=[];}
    else{
      let staffRows=[];
      for(const tryYear of[season,season-1,season-2]){
        const data=await fetchJson(`${API}/people?personIds=${ids.join(',')}&hydrate=stats(group=[pitching],type=[season],season=${tryYear})`);
        const mapped=(data.people||[]).map(p=>{const s=p.stats?.[0]?.splits?.[0]?.stat||{};return{id:p.id,name:p.fullName,pitchHand:p.pitchHand?.code||'R',era:Number(s.era||4.30),whip:Number(s.whip||1.30),k9:Number(s.strikeoutsPer9Inn||8.6),hr9:Number(s.homeRunsPer9||1.15),ip:parseIP(s.inningsPitched||0),sv:Number(s.saves||0),gf:Number(s.gamesFinished||0),gp:Number(s.gamesPitched||0)};});
        if(mapped.some(p=>p.ip>0||p.gp>0)){staffRows=mapped;break;}
      }
      state.teamPitchingCache[ck]=staffRows;
    }
  }
  return(state.teamPitchingCache[ck]||[]).filter(p=>!excludeId||p.id!==excludeId);
}

async function fetchRecentTeamGames(teamId,beforeDate){const ck=`${teamId}:${beforeDate}`;if(state.recentGamesCache[ck])return state.recentGamesCache[ck];const end=new Date(beforeDate+'T12:00:00');end.setDate(end.getDate()-1);const start=new Date(end);start.setDate(start.getDate()-8);const fmt=d=>d.toISOString().slice(0,10);const data=await fetchJson(`${API}/schedule?sportId=1&teamId=${teamId}&startDate=${fmt(start)}&endDate=${fmt(end)}`);const games=(data.dates||[]).flatMap(d=>d.games||[]).filter(g=>(g.status?.abstractGameState||'')==='Final').sort((a,b)=>new Date(b.gameDate)-new Date(a.gameDate));state.recentGamesCache[ck]=games;return games;}
async function fetchTravelContext(team,beforeDate){const games=await fetchRecentTeamGames(team.id,beforeDate);const prev=games[0];const currentVenue=venueMeta(team.nextVenue||'');if(!prev||!currentVenue)return{miles:0,hours:0,label:'No travel signal',penalty:0,previousVenue:'-'};const prevVenue=venueMeta(prev.venue?.name||'');if(!prevVenue)return{miles:0,hours:0,label:'Unknown routing',penalty:0,previousVenue:prev.venue?.name||'-'};const miles=Math.round(haversineMiles(prevVenue.lat,prevVenue.lon,currentVenue.lat,currentVenue.lon));const restDays=Math.max(0,Math.round((new Date(beforeDate).getTime()-new Date(prev.gameDate).getTime())/86400000));return{...classifyTravel(miles,restDays),miles,previousVenue:prev.venue?.name||'-',restDays};}
async function fetchRecentBullpenUsage(teamId,beforeDate){const games=(await fetchRecentTeamGames(teamId,beforeDate)).slice(0,3);const usage={};for(const g of games){try{const box=await fetchJson(`${API}/game/${g.gamePk}/boxscore`);const side=box.teams?.home?.team?.id===teamId?box.teams?.home:box.teams?.away;const players=Object.values(side?.players||{});const rows=players.map(p=>({id:p.person?.id,name:p.person?.fullName,ip:parseIP(p.stats?.pitching?.inningsPitched||0),pitches:Number(p.stats?.pitching?.numberOfPitches||0),gs:Number(p.stats?.pitching?.gamesStarted||0)})).filter(p=>p.id&&p.ip>0);if(!rows.length)continue;const starter=rows.slice().sort((a,b)=>b.ip-a.ip)[0];for(const p of rows){if(p.id===starter.id)continue;if(!usage[p.id])usage[p.id]={id:p.id,name:p.name,apps:0,pitches:0,ip:0,lastUsed:g.gameDate};usage[p.id].apps+=1;usage[p.id].pitches+=p.pitches||Math.round(p.ip*16);usage[p.id].ip+=p.ip;usage[p.id].lastUsed=g.gameDate;}}catch(err){console.warn('bullpen err',err);}}return usage;}
function projectBullpen(staff=[],usageMap={},gameDate,starter){const relievers=staff.filter(p=>p.id!==starter?.id);const nowTs=new Date(gameDate).getTime();const rows=relievers.map(p=>{const usage=usageMap[p.id]||{apps:0,pitches:0,ip:0,lastUsed:null};const daysRest=usage.lastUsed?Math.max(0,Math.round((nowTs-new Date(usage.lastUsed).getTime())/86400000)):5;const leverage=p.sv*3+p.gf*1.5+p.k9+Math.max(0,10-p.era);const fatigue=usage.apps*8+usage.pitches*0.18+Math.max(0,2-daysRest)*10;const availability=Math.max(5,Math.min(95,Math.round(74+daysRest*5-fatigue)));return{...p,usage,daysRest,leverage,availability};}).sort((a,b)=>b.leverage-a.leverage);const projectedInnings=Math.max(1.4,Math.min(5.2,9-starterProjection(starter||{})));return{closer:rows[0]||null,setup:rows.slice(1,3),bridge:rows.slice(3,5),projectedInnings,rows};}

async function fetchGameLineups(gamePk,game){
  if(game.lineupAway?.length&&game.lineupHome?.length){return[game.lineupAway.map(p=>p.id),game.lineupHome.map(p=>p.id)];}
  try{const box=await fetchJson(`${API}/game/${gamePk}/boxscore`);const awayOrder=box.teams?.away?.battingOrder||[];const homeOrder=box.teams?.home?.battingOrder||[];if(awayOrder.length>=5&&homeOrder.length>=5)return[awayOrder,homeOrder];}catch(e){}
  return[null,null];
}
async function fetchLineupStats(playerIds,season){
  if(!playerIds?.length)return[];
  let rows=[];
  for(const tryYear of[season,season-1,season-2]){
    const data=await fetchJson(`${API}/people?personIds=${playerIds.join(',')}&hydrate=stats(group=[hitting],type=[season],season=${tryYear})`);
    const mapped=(data.people||[]).map(p=>{const s=p.stats?.[0]?.splits?.[0]?.stat||{};const orderIdx=playerIds.indexOf(p.id);return{id:p.id,name:p.fullName,pos:'-',avg:Number(s.avg||0),obp:Number(s.obp||0),slg:Number(s.slg||0),ops:Number(s.ops||0),hr:Number(s.homeRuns||0),rbi:Number(s.rbi||0),pa:Number(s.plateAppearances||s.atBats||0),sb:Number(s.stolenBases||0),batSide:p.batSide?.code||'R',lineupOrder:orderIdx>=0?orderIdx+1:99};});
    const withStats=mapped.filter(r=>r.pa>0);
    if(withStats.length>rows.length)rows=mapped.sort((a,b)=>a.lineupOrder-b.lineupOrder);
    if(rows.filter(r=>r.pa>0).length>=5)break;
  }
  return rows;
}

// ─── Run Projection Score (0-100) for Games Tab ──────────────────────────────
function gameRunProjection(game) {
  const park = parkFor(game.venue.name);
  const m = getMarket(game);
  const awayP = game.awayPitcher, homeP = game.homePitcher;
  const awayWeak = pitcherWeakness(awayP), homeWeak = pitcherWeakness(homeP);
  let score = 0;
  // Pitcher vulnerability (both sides, higher = more runs expected)
  score += (awayWeak - 40) * 0.35;
  score += (homeWeak - 40) * 0.35;
  // Park factor boost
  score += ((park.run || 1) - 0.85) * 60;
  score += ((park.hr || 1) - 0.85) * 40;
  // Weather boost
  const wScore = weatherScore(m);
  score += (wScore - 45) * 0.45;
  // Vegas total
  const total = Number(m.total || 0);
  if (total) score += (total - 7.5) * 4.5;
  // Temperature boost
  const temp = Number(m.temperature || 72);
  if (temp >= 85) score += 6;
  else if (temp >= 75) score += 3;
  else if (temp < 55) score -= 5;
  // Wind boost
  if (m.windDir === 'Out') score += Math.min(8, Number(m.wind || 0) * 0.8);
  else if (m.windDir === 'In') score -= Math.min(8, Number(m.wind || 0) * 0.6);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function gameRunDescription(game, score) {
  const park = parkFor(game.venue.name);
  const m = getMarket(game);
  const awayP = game.awayPitcher, homeP = game.homePitcher;
  const parts = [];
  const awayWeak = pitcherWeakness(awayP), homeWeak = pitcherWeakness(homeP);
  if (awayWeak >= 65 && homeWeak >= 65) parts.push('Both pitchers are vulnerable — high-scoring environment expected.');
  else if (awayWeak >= 70) parts.push(escapeHtml(awayP.name) + ' is highly attackable (weakness ' + awayWeak + ').');
  else if (homeWeak >= 70) parts.push(escapeHtml(homeP.name) + ' is highly attackable (weakness ' + homeWeak + ').');
  else if (awayWeak <= 40 && homeWeak <= 40) parts.push('Strong pitching matchup on both sides — lower scoring projected.');
  else parts.push('Mixed pitching quality — moderate run environment.');
  if (park.run >= 1.15) parts.push(escapeHtml(game.venue.name) + ' is a hitter-friendly park (run factor ' + fmtNum(park.run, 2) + ').');
  else if (park.run <= 0.90) parts.push(escapeHtml(game.venue.name) + ' suppresses runs (factor ' + fmtNum(park.run, 2) + ').');
  const total = Number(m.total || 0);
  if (total >= 9.5) parts.push('Vegas total is high at ' + total + ' — books expect runs.');
  else if (total && total <= 7) parts.push('Vegas total is low at ' + total + ' — books expect a pitching duel.');
  const temp = Number(m.temperature || 0);
  if (temp >= 85) parts.push('Hot weather (' + temp + '°F) boosts ball carry.');
  else if (temp && temp < 55) parts.push('Cold weather (' + temp + '°F) suppresses offense.');
  if (m.windDir === 'Out' && Number(m.wind || 0) >= 8) parts.push('Wind blowing out at ' + m.wind + ' mph favors home runs.');
  return parts.join(' ');
}

// ─── Pitcher ranking for Pitching Edge tab ────────────────────────────────────
function pitcherEdgeRank(pitcher, game, side) {
  const era = Number(pitcher.era || 4.30), k9 = Number(pitcher.k9 || 8.6);
  const whip = Number(pitcher.whip || 1.30), hr9 = Number(pitcher.hr9 || 1.15);
  const park = parkFor(game.venue.name);
  let score = 50;
  score += Math.max(-20, Math.min(25, (4.5 - era) * 8));
  score += Math.max(-10, Math.min(20, (k9 - 7.5) * 4));
  score += Math.max(-10, Math.min(12, (1.35 - whip) * 20));
  score += Math.max(-8, Math.min(10, (1.2 - hr9) * 16));
  score += Math.round((1.0 - (park.run || 1)) * 15);
  if (side === 'home') score += 2;
  return Math.max(10, Math.min(99, Math.round(score)));
}

// ─── Stack Rec builder (10 positions) ──────────────────────────────────────────
function buildStackRecommendation() {
  const pool = buildDKPlayerPool();
  if (pool.length < 5) return null;
  const positions = ['SP', 'SP', 'C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF'];
  const labels = ['Pitcher 1', 'Pitcher 2', 'Catcher', '1st Base', '2nd Base', '3rd Base', 'Shortstop', 'Outfield 1', 'Outfield 2', 'Outfield 3'];
  const used = new Set();
  const picks = [];
  for (let i = 0; i < positions.length; i++) {
    const slot = positions[i];
    const isPitcherSlot = slot === 'SP';
    const candidate = pool.find(p => {
      if (used.has(p.name)) return false;
      if (isPitcherSlot) return p.isPitcher;
      const pos = (p.pos || '').toUpperCase();
      if (slot === 'OF') return pos.includes('OF');
      if (slot === 'C') return pos.includes('C') && !pos.includes('CF');
      return pos.includes(slot);
    });
    if (candidate) {
      used.add(candidate.name);
      const gameCtx = state.games.find(g =>
        (g.away.abbr || '').toUpperCase() === (candidate.team || '').toUpperCase() ||
        (g.home.abbr || '').toUpperCase() === (candidate.team || '').toUpperCase()
      );
      const oppPitcher = gameCtx ? (
        (gameCtx.away.abbr || '').toUpperCase() === (candidate.team || '').toUpperCase()
          ? gameCtx.homePitcher : gameCtx.awayPitcher
      ) : null;
      picks.push({
        ...candidate,
        posLabel: labels[i],
        posSlot: slot,
        oppPitcherName: oppPitcher ? oppPitcher.name : 'TBD',
        venue: gameCtx ? gameCtx.venue.name : '-'
      });
    }
  }
  const totalSalary = picks.reduce((s, p) => s + (p.salary || 0), 0);
  return { picks, totalSalary, remaining: 50000 - totalSalary, valid: picks.length === 10 && totalSalary <= 50000 };
}

// ─── Alerts system ─────────────────────────────────────────────────────────────
state.alerts = JSON.parse(localStorage.getItem('mlb-edge-alerts') || '[]');
state.alertsLastCheck = localStorage.getItem('mlb-edge-alerts-last') || '';

function addAlert(type, title, body) {
  const alert = { id: Date.now(), type, title, body, time: new Date().toISOString(), read: false };
  state.alerts.unshift(alert);
  if (state.alerts.length > 50) state.alerts = state.alerts.slice(0, 50);
  localStorage.setItem('mlb-edge-alerts', JSON.stringify(state.alerts));
  const badge = document.getElementById('alertBadge');
  if (badge) badge.textContent = state.alerts.filter(a => !a.read).length;
}

function markAlertsRead() {
  state.alerts.forEach(a => a.read = true);
  localStorage.setItem('mlb-edge-alerts', JSON.stringify(state.alerts));
  const badge = document.getElementById('alertBadge');
  if (badge) badge.textContent = '0';
}

function generateSlateAlerts() {
  // Weather alerts
  for (const g of state.games) {
    const m = getMarket(g);
    const ws = weatherScore(m);
    if (ws >= 68) addAlert('weather', 'Weather Boost: ' + g.away.abbr + ' @ ' + g.home.abbr, 'High run environment — temp ' + (m.temperature || '?') + '°F, wind ' + (m.wind || '?') + ' mph ' + (m.windDir || '') + ' at ' + escapeHtml(g.venue.name));
    if (ws <= 35) addAlert('weather', 'Weather Risk: ' + g.away.abbr + ' @ ' + g.home.abbr, 'Poor conditions detected at ' + escapeHtml(g.venue.name) + '. Consider fading.');
    // Pitcher vulnerability alerts
    const aw = pitcherWeakness(g.awayPitcher), hw = pitcherWeakness(g.homePitcher);
    if (aw >= 75) addAlert('news', 'Attackable Pitcher: ' + escapeHtml(g.awayPitcher.name), g.awayPitcher.name + ' rates ' + aw + ' weakness — stack ' + g.home.abbr + ' hitters.');
    if (hw >= 75) addAlert('news', 'Attackable Pitcher: ' + escapeHtml(g.homePitcher.name), g.homePitcher.name + ' rates ' + hw + ' weakness — stack ' + g.away.abbr + ' hitters.');
  }
}

function buildHero(){
  const best=state.stackRows[0];
  state.hero.best=best?best.team:'-';
  state.hero.avg=state.stackRows.length?Math.round(state.stackRows.reduce((a,b)=>a+b.score,0)/state.stackRows.length):0;
  // heroStats element removed in v2 — stats now rendered inline by tabs
}
function switchTab(tabId) {
  state.tab = tabId;
  document.querySelectorAll('.sidebar-nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tabId);
  });
  if (tabId === 'alerts') markAlertsRead();
  render();
}

function refreshSlate() {
  loadSlate();
}

function setAutoRefresh(ms) {
  ms = Number(ms);
  if (state._autoRefreshTimer) clearInterval(state._autoRefreshTimer);
  if (ms > 0) {
    state._autoRefreshTimer = setInterval(() => loadSlate(), ms);
    state.autoRefreshMs = ms;
  }
}

async function loadSlate(){
  state.loading=true;if(typeof render==='function')render();
  try{
    state.season=Number(state.selectedDate.slice(0,4));
    const data=await fetchJson(`${API}/schedule?sportId=1&date=${state.selectedDate}&hydrate=${encodeURIComponent(HYDRATE)}`);
    const games=(data.dates?.[0]?.games||[]).map(g=>({gamePk:g.gamePk,status:normalizeStatus(g.status?.abstractGameState||'Preview'),detailed:g.status?.detailedState||'-',gameDate:g.gameDate,venue:g.venue||{name:'Unknown'},linescore:g.linescore||{},away:{id:g.teams?.away?.team?.id,abbr:g.teams?.away?.team?.abbreviation,name:g.teams?.away?.team?.name,score:g.teams?.away?.score??'-'},home:{id:g.teams?.home?.team?.id,abbr:g.teams?.home?.team?.abbreviation,name:g.teams?.home?.team?.name,score:g.teams?.home?.score??'-'},awayProbable:g.teams?.away?.probablePitcher||null,homeProbable:g.teams?.home?.probablePitcher||null,lineupAway:g.lineups?.awayStarters||null,lineupHome:g.lineups?.homeStarters||null}));
    const pIds=games.flatMap(g=>[g.awayProbable?.id,g.homeProbable?.id]).filter(Boolean);
    const pStats=await fetchPitcherStats(pIds,state.season);
    const defaultP={era:4.30,whip:1.30,hr9:1.15,k9:8.6};
    state.games=games.map(g=>({...g,awayPitcher:g.awayProbable?(pStats[g.awayProbable.id]||{id:g.awayProbable.id,name:g.awayProbable.fullName,...defaultP}):{name:'TBD',...defaultP},homePitcher:g.homeProbable?(pStats[g.homeProbable.id]||{id:g.homeProbable.id,name:g.homeProbable.fullName,...defaultP}):{name:'TBD',...defaultP},park:parkFor(g.venue?.name||'')}));
    state.teamEdges=[];state.stackRows=[];
    for(const g of state.games){
      const homeScore=teamEdgeScore(g,'home'),awayScore=teamEdgeScore(g,'away');
      const[homeLevel,homeStyle]=stackLevel(homeScore),[awayLevel,awayStyle]=stackLevel(awayScore);
      state.teamEdges.push({gamePk:g.gamePk,team:g.home.abbr,side:'Home',opponent:g.away.abbr,score:homeScore,level:homeLevel,style:homeStyle,venue:g.venue.name,oppPitcher:g.awayPitcher.name},{gamePk:g.gamePk,team:g.away.abbr,side:'Away',opponent:g.home.abbr,score:awayScore,level:awayLevel,style:awayStyle,venue:g.venue.name,oppPitcher:g.homePitcher.name});
    }
    state.stackRows=[...state.teamEdges].sort((a,b)=>b.score-a.score);
    state.hero.games=state.games.length;state.hero.live=state.games.filter(g=>g.status==='Live').length;state.hero.best=state.stackRows[0]?.team||'-';state.hero.avg=state.stackRows.length?Math.round(state.stackRows.reduce((a,b)=>a+b.score,0)/state.stackRows.length):0;
    if(!state.selectedGamePk||!state.games.find(g=>g.gamePk===state.selectedGamePk))state.selectedGamePk=state.games[0]?.gamePk||null;
    if(state.selectedGamePk)await loadSelectedGame(state.selectedGamePk);
    if(state.apiConfig.autoSyncWeather||state.apiConfig.autoSyncOdds)try{await syncLiveFeeds();}catch(e){console.warn(e);}
    try{if(typeof autoPullDKSalaries==='function')await autoPullDKSalaries();else await syncDKSalaries();}catch(e){console.warn('DK sync:',e);}
    try{await syncPlayerProps();}catch(e){console.warn('Props sync:',e);}
    try{if(typeof fetchLiveLineups==='function')await fetchLiveLineups();}catch(e){console.warn('Lineups:',e);}
  }catch(err){console.error(err);state.games=[];state.stackRows=[];state.teamEdges=[];state.selectedGameData=null;}
  finally{state.loading=false;buildHero();if(typeof render==='function')render();}
}

async function loadSelectedGame(gamePk){
  const game=state.games.find(g=>g.gamePk===gamePk);
  state.selectedGamePk=gamePk;
  if(!game)return;
  const park=parkFor(game.venue.name);
  const awayTeamCtx={id:game.away.id,abbr:game.away.abbr,nextVenue:game.venue.name};
  const homeTeamCtx={id:game.home.id,abbr:game.home.abbr,nextVenue:game.venue.name};
  const[awayLineupIds,homeLineupIds]=await fetchGameLineups(gamePk,game).catch(()=>[null,null]);
  const[awayHitters,homeHitters,awayTravel,homeTravel,awayStaff,homeStaff,awayUsage,homeUsage]=await Promise.all([
    (awayLineupIds?fetchLineupStats(awayLineupIds,state.season):fetchTeamHitters(game.away.id,state.season)).catch(()=>[]),
    (homeLineupIds?fetchLineupStats(homeLineupIds,state.season):fetchTeamHitters(game.home.id,state.season)).catch(()=>[]),
    fetchTravelContext(awayTeamCtx,state.selectedDate).catch(()=>({miles:0,hours:0,label:'Travel n/a',penalty:0})),
    fetchTravelContext(homeTeamCtx,state.selectedDate).catch(()=>({miles:0,hours:0,label:'Travel n/a',penalty:0})),
    fetchTeamPitchingStaff(game.away.id,state.season,game.awayPitcher.id).catch(()=>[]),
    fetchTeamPitchingStaff(game.home.id,state.season,game.homePitcher.id).catch(()=>[]),
    fetchRecentBullpenUsage(game.away.id,state.selectedDate).catch(()=>({})),
    fetchRecentBullpenUsage(game.home.id,state.selectedDate).catch(()=>({}))
  ]);
  const awayBullpen=projectBullpen(awayStaff,awayUsage,game.gameDate,game.awayPitcher);
  const homeBullpen=projectBullpen(homeStaff,homeUsage,game.gameDate,game.homePitcher);
  const grade=(h,oppPitcher,isHome,travel,oppBullpen)=>hitterGrade(h,oppPitcher,park,{isHome,travel,game,side:isHome?'home':'away',oppBullpen});
  const awayGraded=(typeof enrichHittersWithSavant==='function'?enrichHittersWithSavant(awayHitters):awayHitters).slice(0,10).map(h=>({...h,grade:grade(h,game.homePitcher,false,awayTravel,homeBullpen)})).sort((a,b)=>b.grade.score-a.grade.score);
  const homeGraded=(typeof enrichHittersWithSavant==='function'?enrichHittersWithSavant(homeHitters):homeHitters).slice(0,10).map(h=>({...h,grade:grade(h,game.awayPitcher,true,homeTravel,awayBullpen)})).sort((a,b)=>b.grade.score-a.grade.score);
  state.selectedGameData={...game,park,awayHitters:awayGraded,homeHitters:homeGraded,awayTravel,homeTravel,awayBullpen,homeBullpen,awayStarterTendencies:pitcherTendencies(game.awayPitcher),homeStarterTendencies:pitcherTendencies(game.homePitcher),lineupsLive:!!(awayLineupIds&&homeLineupIds)};
  buildHero();if(typeof render==='function')render();
}

// Old renderDashboard/renderGames removed — now defined in app-main.js
if(typeof loadSavantData==='function')loadSavantData().catch(()=>{});


// ─── Stripe Checkout ─────────────────────────────────────────────────────────
function getBase() {
    return (document.getElementById('agBackend')?.value.trim() ||
                state.apiConfig?.proxyBaseUrl ||
                'https://newest-mlb-1.onrender.com').replace(/\/$/, '');
}

async function startCheckout(plan) {
    const btn = document.getElementById(`checkoutBtn-${plan}`);
    if (btn) { btn.disabled = true; btn.textContent = 'Redirecting...'; }
    try {
          const email = state.userEmail || prompt('Enter your email to continue:') || '';
          const resp = await fetch(`${getBase()}/api/checkout/session`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                            plan,
                            customerEmail: email,
                            successUrl: `${window.location.origin}?checkout=success`,
                            cancelUrl: `${window.location.origin}?checkout=cancel`
                  })
          });
          const data = await resp.json();
          if (data.url) {
                  window.location.href = data.url;
          } else {
                  alert('Checkout error: ' + (data.error || 'Unknown error'));
                  if (btn) { btn.disabled = false; btn.textContent = 'Subscribe'; }
          }
    } catch (err) {
          alert('Checkout failed: ' + err.message);
          if (btn) { btn.disabled = false; btn.textContent = 'Subscribe'; }
    }
}

// Check for checkout return on page load
(function checkCheckoutReturn() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
          setTimeout(() => {
                  document.getElementById('app')?.insertAdjacentHTML('afterbegin',
                                                                             `<div style="background:#16a34a;color:#fff;padding:14px 20px;text-align:center;font-weight:700;font-size:15px;position:fixed;top:0;left:0;right:0;z-index:9999;">
                                                                                       ✓ Subscription activated! Welcome to ALLDAY MLB EDGE.
                                                                                                 <button onclick="this.parentElement.remove()" style="margin-left:16px;background:rgba(255,255,255,.2);border:none;color:#fff;padding:4px 12px;border-radius:6px;cursor:pointer;">✕</button>
                                                                                                         </div>`
                                                                           );
                  window.history.replaceState({}, '', window.location.pathname);
          }, 500);
    }
    if (params.get('checkout') === 'cancel') {
          window.history.replaceState({}, '', window.location.pathname);
    }
})();


// ═══════════════════════════════════════════════════════════
// BUDGET BEASTS + AI PICKS INTEGRATION (delegates to mlb-advanced-grading.js)
// ═══════════════════════════════════════════════════════════

// buildBudgetBeasts — defers to advanced engine, or uses inline fallback
function buildBudgetBeasts(maxSalary) {
  maxSalary = maxSalary || 3600;
  if(!Object.keys(state.dkSalaries||{}).length) return [];

  const gradedMap = {};
  if(state.selectedGameData){
    [...(state.selectedGameData.awayHitters||[]),...(state.selectedGameData.homeHitters||[])].forEach(h=>{gradedMap[h.name.toLowerCase()]=h;});
  }
  const teamEdgeMap = {};
  (state.stackRows||[]).forEach(r=>{teamEdgeMap[(r.team||'').toUpperCase()]=r.score;});

  const gameByTeam = {};
  (state.games||[]).forEach(g=>{
    gameByTeam[(g.away.abbr||'').toUpperCase()]={game:g,side:'away'};
    gameByTeam[(g.home.abbr||'').toUpperCase()]={game:g,side:'home'};
  });

  const beasts = [];
  for(const[key,dk] of Object.entries(state.dkSalaries)){
    if(!dk.salary||dk.salary>maxSalary||dk.salary<2000) continue;
    const isPitcher=/^(SP|RP|P)$/i.test(dk.pos||'');
    if(isPitcher) continue;

    const teamKey=(dk.team||'').toUpperCase();
    const teamEdge=teamEdgeMap[teamKey]||52;
    let adjScore=52, graded=false;

    // Try exact match
    const exact=gradedMap[key];
    if(exact){adjScore=exact.grade.score;graded=true;}
    else{
      // Fuzzy name match
      const fuzzy=Object.entries(gradedMap).find(([k])=>{
        const na=dk.name.toLowerCase().replace(/[^a-z ]/g,'');
        const nb=k.replace(/[^a-z ]/g,'');
        const pa=na.split(' '),pb=nb.split(' ');
        if(pa.length>=2&&pb.length>=2) return pa[pa.length-1]===pb[pb.length-1]&&pa[0][0]===pb[0][0];
        return na===nb;
      });
      if(fuzzy){adjScore=fuzzy[1].grade.score;graded=true;}
      else{
        // Smart estimate with park factor + spring training
        const ctx=gameByTeam[teamKey];
        const ptsBias=dk.avgPts>0?Math.min(28,dk.avgPts*3.8):16;
        const springB=typeof springTrainingBoost==='function'?springTrainingBoost(dk.name):0;
        let parkBoost=0;
        if(ctx){
          const pk=parkFor(ctx.game.venue?.name||'');
          parkBoost=Math.round((pk.hr-1)*18+(pk.run-1)*12);
        }
        adjScore=Math.max(25,Math.min(95,Math.round(teamEdge*0.62+ptsBias+springB+parkBoost)));
      }
    }

    if(adjScore<68) continue;

    const vs=dk.salary>0?Math.round((adjScore/(dk.salary/1000))*10)/10:0;
    let letter;
    if(adjScore>=92)letter='A+';
    else if(adjScore>=84)letter='A';
    else if(adjScore>=76)letter='B+';
    else letter='B';

    beasts.push({...dk,key,adjScore,valueScore:vs,graded,letter,teamEdge,projPts:dk.avgPts||Math.round(adjScore*0.41)});
  }
  return beasts.sort((a,b)=>b.valueScore-a.valueScore);
}

// buildSmartStacks — delegates to advanced engine or uses inline version
function buildSmartStacks(){
  // If advanced engine is loaded, use it
  if(typeof window._advSmartStacks==='function') return window._advSmartStacks();

  const CAP=50000;
  if(!Object.keys(state.dkSalaries||{}).length||!state.stackRows.length) return [];
  const allPitchers=buildDKPlayerPool().filter(p=>p.isPitcher).sort((a,b)=>b.compositeScore-a.compositeScore).slice(0,20);
  const stacks=[];
  const topTeams=state.stackRows.slice(0,3);

  for(const stackRow of topTeams){
    const stackTeam=(stackRow.team||'').toUpperCase();
    const stackOpp=(stackRow.opponent||'').toUpperCase();
    const eligiblePitchers=allPitchers.filter(p=>(p.team||'').toUpperCase()!==stackOpp);
    const sp1=eligiblePitchers[0],sp2=eligiblePitchers[1];
    if(!sp1||!sp2) continue;
    const spSalary=(sp1.salary||0)+(sp2.salary||0);
    if(spSalary>35000) continue;
    const hitterBudget=CAP-spSalary;
    const hitterPool=buildDKPlayerPool().filter(p=>!p.isPitcher&&p.name!==sp1.name&&p.name!==sp2.name).map(p=>{
      const t=(p.team||'').toUpperCase();
      const isStack=t===stackTeam,isOpp=t===stackOpp;
      return{...p,compositeScore:p.compositeScore+(isStack?14:isOpp?6:0),isStackTeam:isStack,isOpp};
    }).sort((a,b)=>b.compositeScore-a.compositeScore);
    const SLOTS=['C','1B','2B','3B','SS','OF','OF','OF'];
    const lineup=[],used=new Set([sp1.name,sp2.name]);
    let salaryUsed=spSalary;
    for(const slot of SLOTS){
      const remaining=CAP-salaryUsed-(SLOTS.length-lineup.length-1)*2500;
      const validPos={'C':['C'],'1B':['1B'],'2B':['2B'],'3B':['3B'],'SS':['SS'],'OF':['OF']}[slot]||[slot];
      const candidate=hitterPool.find(p=>{
        if(used.has(p.name)||p.salary>remaining) return false;
        const pos=(p.pos||'').toUpperCase();
        return validPos.some(vp=>pos.includes(vp));
      });
      if(candidate){lineup.push({...candidate,slot});used.add(candidate.name);salaryUsed+=candidate.salary||0;}
    }
    const totalSalary=salaryUsed;
    stacks.push({stackTeam,stackOpp,badge:'STACK #'+(stacks.length+1),label:stackRow.level||'Priority',sp1,sp2,hitters:lineup,totalSalary,valid:totalSalary<=CAP&&lineup.length===8,stackCount:lineup.filter(p=>p.isStackTeam).length,bringBackCount:lineup.filter(p=>p.isOpp).length,projPts:Math.round((sp1.projPts||sp1.score*0.4)+(sp2.projPts||sp2.score*0.4)+lineup.reduce((s,p)=>s+(p.projPts||p.score*0.38),0)),remaining:CAP-totalSalary});
  }
  return stacks;
}

// buildAIPicksLineup — wraps optimizeDKLineup (ensures 2 SPs)
function buildAIPicksLineup(){
  return optimizeDKLineup(state.optimizerStackTeam||'');
}
window.state = state;
window.switchTab = switchTab;
window.refreshSlate = refreshSlate;
window.setAutoRefresh = setAutoRefresh;
window.gameRunProjection = gameRunProjection;
window.gameRunDescription = gameRunDescription;
window.pitcherEdgeRank = pitcherEdgeRank;
window.buildStackRecommendation = buildStackRecommendation;
window.addAlert = addAlert;
window.markAlertsRead = markAlertsRead;
window.generateSlateAlerts = generateSlateAlerts;
window.syncPlayerProps = syncPlayerProps;

// ─── Slate Selector ──────────────────────────────────────────────────────────
state.activeSlate = 'early';

function switchSlate(slateId) {
  state.activeSlate = slateId;
  console.log('[Slate] Switching to:', slateId);

  if (slateId === 'main' && typeof DK_SLATE_MAIN !== 'undefined') {
    // Load main slate players into DK salaries
    var newSalaries = {};
    DK_SLATE_MAIN.players.forEach(function(p) {
      if (p.salary > 0) {
        newSalaries[p.name.toLowerCase()] = {
          name: p.name, salary: p.salary, pos: p.pos,
          team: p.team, avgPts: p.avgPts || 0
        };
      }
    });
    state.dkSalaries = newSalaries;
    state.dkSalaryDate = DK_SLATE_MAIN.date;
    state.dkSyncStatus = { status: 'ok', updatedAt: new Date().toISOString(), error: '' };
    localStorage.setItem('mlb-edge-dk-salaries', JSON.stringify(state.dkSalaries));
    console.log('[Slate] Loaded MAIN slate:', Object.keys(newSalaries).length, 'players');
  } else {
    // Load early slate from DK_PLAYERS (dk-salaries-inject.js)
    if (typeof DK_PLAYERS !== 'undefined') {
      var earlySalaries = {};
      DK_PLAYERS.forEach(function(p) {
        if (p.salary > 0) {
          earlySalaries[p.name.toLowerCase()] = {
            name: p.name, salary: p.salary, pos: p.pos,
            team: p.team, avgPts: p.avgPts || 0
          };
        }
      });
      state.dkSalaries = earlySalaries;
      state.dkSalaryDate = DK_SLATE_DATE || '04/04/2026';
      state.dkSyncStatus = { status: 'ok', updatedAt: new Date().toISOString(), error: '' };
      localStorage.setItem('mlb-edge-dk-salaries', JSON.stringify(state.dkSalaries));
      console.log('[Slate] Loaded EARLY slate:', Object.keys(earlySalaries).length, 'players');
    }
  }

  // Re-render
  if (typeof render === 'function') render();
}
window.switchSlate = switchSlate;

// ─── Live Lineups from RotoWire / MLB API ────────────────────────────────────
state.liveLineups = null;
state.lineupsStatus = { status: 'idle' };

async function fetchLiveLineups() {
  state.lineupsStatus = { status: 'loading' };
  try {
    var resp = await fetch('/api/lineups');
    if (!resp.ok) throw new Error('Lineups API returned ' + resp.status);
    var data = await resp.json();
    if (data.error) throw new Error(data.error);
    state.liveLineups = data;
    state.lineupsStatus = { status: 'ok', count: data.count, source: data.source, updatedAt: data.updatedAt };

    // Apply lineups to DK_CONFIRMED_LINEUPS for the AI
    if (data.games && data.games.length && typeof window !== 'undefined') {
      var confirmed = {};
      data.games.forEach(function(g) {
        if (!g.away || !g.home) return;
        var key = g.away + '@' + g.home;
        confirmed[key] = {
          away: {
            team: g.away,
            pitcher: g.awayPitcher || 'TBD',
            lineup: (g.awayLineup || []).map(function(p) {
              return { order: p.order, name: p.name, pos: '', bat: '' };
            })
          },
          home: {
            team: g.home,
            pitcher: g.homePitcher || 'TBD',
            lineup: (g.homeLineup || []).map(function(p) {
              return { order: p.order, name: p.name, pos: '', bat: '' };
            })
          }
        };
      });
      window.DK_CONFIRMED_LINEUPS = confirmed;

      // Build flat list
      window.DK_LINEUP_PLAYERS = [];
      Object.keys(confirmed).forEach(function(game) {
        var g = confirmed[game];
        ['away','home'].forEach(function(side) {
          var s = g[side];
          (s.lineup || []).forEach(function(p) {
            window.DK_LINEUP_PLAYERS.push({
              name: p.name, team: s.team, order: p.order, game: game, pitcher: s.pitcher
            });
          });
        });
      });

      console.log('[Live Lineups] Updated ' + Object.keys(confirmed).length + ' games, ' + (window.DK_LINEUP_PLAYERS || []).length + ' players from ' + (data.source || 'unknown'));
    }
  } catch (err) {
    state.lineupsStatus = { status: 'error', error: err.message };
    console.warn('[Live Lineups] Failed:', err.message);
  }
  if (typeof render === 'function') render();
}
window.fetchLiveLineups = fetchLiveLineups;
window.getPlayerPropLine = getPlayerPropLine;
