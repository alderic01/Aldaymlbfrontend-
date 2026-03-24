const API = 'https://statsapi.mlb.com/api/v1';
const HYDRATE = 'team,probablePitcher,linescore,flags,venue(location,timeZone),decisions';
const TABS = [
  {id:'dashboard', label:'Dashboard'},
  {id:'games', label:'Games'},
  {id:'edges', label:'Edge Board'},
  {id:'stacks', label:'Stack Lab'},
  {id:'hitterlab', label:'Hitter Lab'},
  {id:'signals', label:'Signals'},
  {id:'ai', label:'⚡ AI Picks'},
  {id:'market', label:'Odds + Weather'},
  {id:'launch', label:'Launchpad'},
  {id:'pricing', label:'Pricing'},
  {id:'notes', label:'Notes'}
];
const PARKS = {
  'Coors Field':{hr:1.42,run:1.32,short:'COL'}, 'Great American Ball Park':{hr:1.28,run:1.18,short:'CIN'},
  'Yankee Stadium':{hr:1.24,run:1.12,short:'NYY'}, 'Fenway Park':{hr:1.15,run:1.13,short:'BOS'},
  'Globe Life Field':{hr:1.18,run:1.11,short:'TEX'}, 'Citizens Bank Park':{hr:1.20,run:1.14,short:'PHI'},
  'American Family Field':{hr:1.12,run:1.09,short:'MIL'}, 'Truist Park':{hr:1.10,run:1.07,short:'ATL'},
  'Chase Field':{hr:1.08,run:1.06,short:'ARI'}, 'Wrigley Field':{hr:1.08,run:1.07,short:'CHC'},
  'Dodger Stadium':{hr:0.93,run:0.96,short:'LAD'}, 'Target Field':{hr:0.95,run:0.97,short:'MIN'},
  'Busch Stadium':{hr:0.90,run:0.93,short:'STL'}, 'T-Mobile Park':{hr:0.87,run:0.91,short:'SEA'},
  'Oracle Park':{hr:0.78,run:0.85,short:'SF'}, 'Petco Park':{hr:0.80,run:0.86,short:'SD'},
  'PNC Park':{hr:0.85,run:0.89,short:'PIT'}, 'loanDepot park':{hr:0.92,run:0.94,short:'MIA'}
};
const NEUTRAL_PARK = {hr:1,run:1,short:'MLB'};
const VENUE_COORDS = {
  'Angel Stadium':{lat:33.8003,lon:-117.8827,roof:'Open'},
  'Busch Stadium':{lat:38.6226,lon:-90.1928,roof:'Open'},
  'Chase Field':{lat:33.4453,lon:-112.0667,roof:'Retractable'},
  'Citi Field':{lat:40.7571,lon:-73.8458,roof:'Open'},
  'Citizens Bank Park':{lat:39.9061,lon:-75.1665,roof:'Open'},
  'Comerica Park':{lat:42.3390,lon:-83.0485,roof:'Open'},
  'Coors Field':{lat:39.7559,lon:-104.9942,roof:'Open'},
  'Daikin Park':{lat:29.7572,lon:-95.3555,roof:'Retractable'},
  'Dodger Stadium':{lat:34.0739,lon:-118.2400,roof:'Open'},
  'Fenway Park':{lat:42.3467,lon:-71.0972,roof:'Open'},
  'Globe Life Field':{lat:32.7473,lon:-97.0847,roof:'Retractable'},
  'Great American Ball Park':{lat:39.0979,lon:-84.5081,roof:'Open'},
  'Guaranteed Rate Field':{lat:41.8300,lon:-87.6338,roof:'Open'},
  'Kauffman Stadium':{lat:39.0517,lon:-94.4803,roof:'Open'},
  'loanDepot park':{lat:25.7781,lon:-80.2197,roof:'Retractable'},
  'Nationals Park':{lat:38.8730,lon:-77.0074,roof:'Open'},
  'Oracle Park':{lat:37.7786,lon:-122.3893,roof:'Open'},
  'Oriole Park at Camden Yards':{lat:39.2838,lon:-76.6217,roof:'Open'},
  'Petco Park':{lat:32.7073,lon:-117.1566,roof:'Open'},
  'PNC Park':{lat:40.4469,lon:-80.0057,roof:'Open'},
  'Progressive Field':{lat:41.4962,lon:-81.6852,roof:'Open'},
  'Rogers Centre':{lat:43.6414,lon:-79.3894,roof:'Retractable'},
  'Sutter Health Park':{lat:38.5800,lon:-121.5136,roof:'Open'},
  'T-Mobile Park':{lat:47.5914,lon:-122.3325,roof:'Retractable'},
  'Target Field':{lat:44.9817,lon:-93.2775,roof:'Open'},
  'Truist Park':{lat:33.8908,lon:-84.4677,roof:'Open'},
  'Wrigley Field':{lat:41.9484,lon:-87.6553,roof:'Open'}
};
const TEAM_NAME_ALIASES = {
  'athletics':'oakland athletics','a\'s':'oakland athletics',
  'los angeles angels':'los angeles angels','la angels':'los angeles angels',
  'arizona d-backs':'arizona diamondbacks','dbacks':'arizona diamondbacks','diamondbacks':'arizona diamondbacks'
};
const state = {
  tab:'dashboard',
  selectedDate: new Date().toISOString().slice(0,10),
  season: new Date().getFullYear(),
  loading:false, games:[], selectedGamePk:null, selectedGameData:null,
  stackRows:[], teamEdges:[],
  hero:{games:0, live:0, best:'-', avg:0},
  notes: localStorage.getItem('mlb-edge-notes') || '',
  watchlist: JSON.parse(localStorage.getItem('mlb-edge-watchlist') || '[]'),
  edgeFilter:'', autoRefresh:false, autoRefreshMs:120000,
  oddsWeather: JSON.parse(localStorage.getItem('mlb-edge-odds-weather') || '{}'),
  apiConfig: JSON.parse(localStorage.getItem('mlb-edge-api-config') || '{"proxyBaseUrl":"https://newest-mlb.onrender.com","oddsRegion":"us","oddsBookmaker":"","autoSyncWeather":true,"autoSyncOdds":true}'),
  liveSync:{weather:{status:'idle',updatedAt:null,error:''},odds:{status:'idle',updatedAt:null,error:''}},
  teamHittersCache:{}, teamPitchingCache:{}, recentGamesCache:{}, gameContextCache:{},
  aiMode:'picks', aiLoading:false, aiResult:'', aiResultMode:'', aiResultDate:'', aiError:''
};

const $ = s => document.querySelector(s);
const view = $('#view');
const tabsEl = $('#tabs');

function getAccessProfile(){ return JSON.parse(localStorage.getItem('allday-mlb-edge-access') || '{"email":"","apiBase":""}'); }
function setAccessProfile(profile){ localStorage.setItem('allday-mlb-edge-access', JSON.stringify(profile)); }

async function startStripeCheckout(plan='pro'){
  const profile = getAccessProfile();
  const apiBase = (profile.apiBase || state.apiConfig.proxyBaseUrl || '').replace(/\/$/, '');
  if(!apiBase){ alert('Add your backend API base first.'); return; }
  const successUrl = window.location.origin + window.location.pathname + '?checkout=success';
  try{
    const resp = await fetch(apiBase + '/api/checkout/session', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({plan, customerEmail: profile.email||'', successUrl, cancelUrl: window.location.href})
    });
    const data = await resp.json();
    if(!resp.ok) throw new Error(data.error || 'Checkout failed');
    if(data.url) window.open(data.url, '_blank');
  }catch(err){ alert(err.message || 'Checkout failed'); }
}

async function openBillingPortal(){
  const profile = getAccessProfile();
  const apiBase = (profile.apiBase || state.apiConfig.proxyBaseUrl || '').replace(/\/$/, '');
  const customerId = localStorage.getItem('allday-mlb-edge-stripe-customer-id') || '';
  if(!customerId){ alert('No Stripe customer ID saved yet.'); return; }
  try{
    const resp = await fetch(apiBase + '/api/portal/session', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({customerId, returnUrl: window.location.href})
    });
    const data = await resp.json();
    if(!resp.ok) throw new Error(data.error || 'Portal failed');
    if(data.url) window.open(data.url, '_blank');
  }catch(err){ alert(err.message || 'Portal failed'); }
}

function escapeHtml(str=''){return str.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function fmtPct(n,digits=3){ if(n==null||Number.isNaN(Number(n))) return '.---'; return Number(n).toFixed(digits).replace(/^0/,''); }
function fmtNum(n,d=2){ if(n==null||Number.isNaN(Number(n))) return '-'; return Number(n).toFixed(d); }
function fmtTime(iso){ if(!iso) return '-'; return new Date(iso).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}); }
function fmtStamp(iso){ return iso ? new Date(iso).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}) : '-'; }
function parkFor(name){ return PARKS[name] || NEUTRAL_PARK; }
function venueMeta(name){ return VENUE_COORDS[name] || null; }
function normTeamName(name=''){ const k=name.toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim(); return TEAM_NAME_ALIASES[k]||k; }
function liveStatusPill(sync){ if(!sync||sync.status==='idle') return '<span class="pill">Idle</span>'; if(sync.status==='loading') return '<span class="pill">Syncing…</span>'; if(sync.status==='ok') return `<span class="pill ok">Live ${fmtStamp(sync.updatedAt)}</span>`; return `<span class="pill bad">${escapeHtml(sync.error||'Error')}</span>`; }
function gradeBadge(score){ if(score>=88) return ['A','smash']; if(score>=78) return ['B+','strong']; if(score>=68) return ['B','watch']; return ['C','fade']; }
function gameBadge(status){ if(status==='Live') return 'live'; if(status==='Final') return 'final'; return 'preview'; }

function pitcherWeakness(p={}){
  const era=Number(p.era||4.3),whip=Number(p.whip||1.3),hr9=Number(p.hr9||1.15),k9=Number(p.k9||8.6);
  let score=50;
  score+=Math.max(-16,Math.min(26,(era-4.1)*12));
  score+=Math.max(-12,Math.min(18,(whip-1.24)*28));
  score+=Math.max(-10,Math.min(16,(hr9-1.05)*22));
  score+=Math.max(-12,Math.min(10,(8.4-k9)*4));
  return Math.max(10,Math.min(95,Math.round(score)));
}
function teamEdgeScore(game,side){ const opp=side==='home'?game.awayPitcher:game.homePitcher; const park=parkFor(game.venue.name); const base=pitcherWeakness(opp); const parkLift=Math.round((park.run-1)*70+(park.hr-1)*55); return Math.max(15,Math.min(99,base+parkLift+(game.status==='Live'?4:0))); }
function stackLevel(score){ if(score>=86) return ['SMASH STACK','smash']; if(score>=76) return ['PRIORITY','strong']; if(score>=66) return ['SECONDARY','watch']; return ['FADE','fade']; }
function noteSentimentScore(note=''){ const t=String(note||'').toLowerCase(); let score=50; ['steam','sharp','love','buy','up','boost','bullish','target','attack','hammer','plus'].forEach(k=>{if(t.includes(k))score+=5;}); ['fade','cold','down','drop','risk','bearish','avoid','trap','delay','bench'].forEach(k=>{if(t.includes(k))score-=5;}); return Math.max(20,Math.min(80,score)); }

function marketKey(game){ return `${state.selectedDate}:${game.gamePk}`; }
function defaultMarket(){ return {awayMoneyline:'',homeMoneyline:'',total:'',awayTeamTotal:'',homeTeamTotal:'',temperature:'',wind:'',windDir:'Out',precip:'',roof:'Open',book:'Draft',note:''}; }
function getMarket(game){ return {...defaultMarket(),...(state.oddsWeather[marketKey(game)]||{})}; }
function saveMarket(gamePk,patch){ const game=state.games.find(g=>g.gamePk===Number(gamePk)); if(!game) return; const key=marketKey(game); state.oddsWeather[key]={...defaultMarket(),...(state.oddsWeather[key]||{}),...patch}; localStorage.setItem('mlb-edge-odds-weather',JSON.stringify(state.oddsWeather)); }
function mlToImplied(ml){ const n=Number(ml); if(!Number.isFinite(n)||n===0) return null; return Math.round((n>0?100/(n+100):Math.abs(n)/(Math.abs(n)+100))*1000)/10; }
function weatherScore(m){ const temp=Number(m.temperature||0),wind=Number(m.wind||0),precip=Number(m.precip||0); let score=50; if(String(m.roof||'').toLowerCase()==='closed') score-=6; if(temp) score+=temp>=88?10:temp>=80?7:temp>=72?4:temp>=60?0:-5; if(wind){ if(m.windDir==='Out') score+=Math.min(14,wind*1.2); else if(m.windDir==='In') score-=Math.min(14,wind*1.2); else score+=Math.min(4,wind*.25); } if(precip) score-=Math.min(12,precip*.3); return Math.max(20,Math.min(80,Math.round(score))); }
function weatherLabel(score){ if(score>=62) return ['Boost','good']; if(score<=42) return ['Risk','bad']; return ['Neutral','']; }
function totalLean(game,m){ const total=Number(m.total||0),park=parkFor(game.venue.name); const base=Math.round(((park.run-1)*12)+((weatherScore(m)-50)*.18)+50); const lean=total?(base+(total-8.5)*3):base; if(lean>=58) return 'Over environment'; if(lean<=44) return 'Under environment'; return 'Balanced total'; }

function toggleWatch(item){ const key=`${item.type}:${item.name}`; const idx=state.watchlist.findIndex(x=>x.key===key); if(idx>=0) state.watchlist.splice(idx,1); else state.watchlist.unshift({...item,key,addedAt:new Date().toISOString()}); localStorage.setItem('mlb-edge-watchlist',JSON.stringify(state.watchlist.slice(0,40))); render(); }
function isWatched(type,name){ return state.watchlist.some(x=>x.key===`${type}:${name}`); }
function getTopAttackablePitchers(){ return state.games.flatMap(g=>[{name:g.awayPitcher.name,weak:pitcherWeakness(g.awayPitcher),opp:g.home.abbr,venue:g.venue.name,gamePk:g.gamePk},{name:g.homePitcher.name,weak:pitcherWeakness(g.homePitcher),opp:g.away.abbr,venue:g.venue.name,gamePk:g.gamePk}]).sort((a,b)=>b.weak-a.weak).slice(0,5); }
function getTopOneOffs(){ const g=state.selectedGameData; if(!g) return []; return [...(g.awayHitters||[]),...(g.homeHitters||[])].sort((a,b)=>b.grade.score-a.grade.score).slice(0,6); }
function filteredStackRows(){ const q=state.edgeFilter.trim().toLowerCase(); if(!q) return state.stackRows; return state.stackRows.filter(r=>[r.team,r.opponent,r.oppPitcher,r.venue].some(v=>String(v||'').toLowerCase().includes(q))); }

function handednessEdge(batSide='R',pitchHand='R'){ return batSide&&pitchHand&&batSide===pitchHand?-4:6; }
function projectedSplitMetrics(h,oppPitcher,isHome,travelCtx){ const avg=Number(h.avg||0),ops=Number(h.ops||0),obp=Number(h.obp||0),slg=Number(h.slg||0); const handBoost=handednessEdge(h.batSide||'R',oppPitcher.pitchHand||'R'); const homeAwayBoost=isHome?3:-1; const travelPenalty=travelCtx?.penalty||0; const lrOps=Math.max(.520,Math.min(1.250,ops+handBoost*.012)); const lrAvg=Math.max(.180,Math.min(.380,avg+handBoost*.0026)); const venueOps=Math.max(.520,Math.min(1.250,ops+homeAwayBoost*.010-travelPenalty*.006)); const venueObp=Math.max(.230,Math.min(.500,obp+homeAwayBoost*.004-travelPenalty*.003)); const venueSlg=Math.max(.250,Math.min(.800,slg+homeAwayBoost*.008-travelPenalty*.004)); return {lrLabel:`vs ${oppPitcher.pitchHand||'RHP'}`,lrAvg,lrOps,venueLabel:isHome?'Home split':'Road split',venueOps,venueObp,venueSlg,splitEdge:Math.round((lrOps-ops)*1000+(venueOps-ops)*700)}; }
function starterProjection(p){ const era=Number(p.era||4.3),whip=Number(p.whip||1.3),k9=Number(p.k9||8.6),hr9=Number(p.hr9||1.1); let innings=5.4; innings+=Math.max(-1.0,Math.min(1.2,(8.0-era)*0.28)); innings+=Math.max(-0.8,Math.min(0.8,(1.35-whip)*1.2)); innings+=Math.max(-0.4,Math.min(0.5,(k9-8.5)*0.08)); innings-=Math.max(0,(hr9-1.1)*0.35); return Math.round(Math.max(3.8,Math.min(7.4,innings))*10)/10; }
function pitcherTendencies(p){ const hr9=Number(p.hr9||1.15),whip=Number(p.whip||1.3),k9=Number(p.k9||8.6),era=Number(p.era||4.3); const notes=[]; if(k9>=10) notes.push('plus strikeout lane'); else if(k9<=7) notes.push('contact-friendly'); if(hr9>=1.35) notes.push('home-run risk'); if(whip>=1.35) notes.push('traffic on bases'); if(era>=4.7) notes.push('run prevention shakier'); const attack=Math.round(50+(hr9-1.05)*16+(whip-1.24)*18+(8.6-k9)*2.4+(era-4.1)*5); const profile=k9>=9.8?'Miss-bats starter':hr9>=1.35?'Power target':whip>=1.35?'Traffic starter':'Neutral profile'; return {profile,notes,attack:Math.max(20,Math.min(90,attack)),expIP:starterProjection(p)}; }

function bullpenLeverageForHitter(hitter,oppBullpen){ if(!oppBullpen) return {score:50,label:'Neutral pen chain'}; let score=50; const availability=Number(oppBullpen.availabilityScore||50),innings=Number(oppBullpen.projectedInnings||0); score+=(innings-3.0)*5; score+=(55-availability)*0.45; score=Math.max(20,Math.min(80,Math.round(score))); return {score,label:score>=60?'Bullpen lane opens':score<=42?'Late pen resistance':'Mixed bullpen'}; }
function marketPulseForSide(game,side){ const m=getMarket(game); const total=Number(m.total||0),teamTotal=Number(side==='home'?m.homeTeamTotal:m.awayTeamTotal||0),ml=Number(side==='home'?m.homeMoneyline:m.awayMoneyline||0); const implied=mlToImplied(ml)||50,weather=weatherScore(m); let score=50; score+=teamTotal?(teamTotal-4.2)*7:0; score+=total?(total-8.5)*2.5:0; score+=(weather-50)*0.35; score+=(implied-50)*0.22; score+=(noteSentimentScore(m.note)-50)*0.35; score=Math.max(20,Math.min(80,Math.round(score))); return {score,label:score>=62?'Market tailwind':score<=42?'Market caution':'Neutral market',implied,weather}; }
function systemOptimizationLens(hitter,oppPitcher,context={}){ let score=50; score+=hitter.pa>=120?8:hitter.pa>=70?5:2; score+=(6.0-Number(pitcherTendencies(oppPitcher).expIP||5.4))*5; score+=(55-Number(context.oppBullpen?.availabilityScore||55))*0.25; score-=(context.travel?.penalty||0)*4; if(context.isHome) score+=4; score=Math.max(20,Math.min(80,Math.round(score))); return {score,label:score>=60?'Stable deployment':score<=42?'Volatility elevated':'Playable workflow'}; }
function patternMatchingLens(hitter,oppPitcher,park,context={}){ const splits=projectedSplitMetrics(hitter,oppPitcher,!!context.isHome,context.travel||{}),pTen=pitcherTendencies(oppPitcher),pen=bullpenLeverageForHitter(hitter,context.oppBullpen); let score=50; score+=Math.max(-12,Math.min(16,(splits.lrOps-Number(hitter.ops||.720))*100)); score+=((park.hr||1)-1)*24+((park.run||1)-1)*18; score+=(pTen.attack-50)*0.28; score+=(pen.score-50)*0.35; score=Math.max(20,Math.min(80,Math.round(score))); return {score,label:score>=62?'Pattern match':score<=42?'Pattern weak':'Pattern neutral',bullpen:pen}; }
function triModelCollabLens(hitter,oppPitcher,park,context={}){ const market=marketPulseForSide(context.game||{},context.side||(context.isHome?'home':'away')),system=systemOptimizationLens(hitter,oppPitcher,context),pattern=patternMatchingLens(hitter,oppPitcher,park,context); const overall=Math.round(market.score*0.34+system.score*0.26+pattern.score*0.40); return {market,system,pattern,overall,summary:overall>=62?'Consensus boost':overall<=42?'Consensus caution':'Mixed consensus'}; }

function hitterGrade(h,oppPitcher,park,context={}){ const avg=Number(h.avg||0),ops=Number(h.ops||(Number(h.obp||0)+Number(h.slg||0))),slg=Number(h.slg||0),hr=Number(h.hr||0),pa=Number(h.pa||0); const pWeak=pitcherWeakness(oppPitcher),splits=projectedSplitMetrics(h,oppPitcher,!!context.isHome,context.travel||{}),collab=triModelCollabLens(h,oppPitcher,park,context); let score=0; score+=avg>=.300?24:avg>=.280?19:avg>=.260?15:avg>=.240?10:6; score+=ops>=.950?22:ops>=.850?18:ops>=.775?14:ops>=.700?10:6; score+=slg>=.550?18:slg>=.480?14:slg>=.430?11:slg>=.380?8:5; score+=Math.min(16,(pa?hr/pa*500:0)*1.5); score+=Math.round((pWeak-50)*0.35); score+=Math.round(((park.hr||1)-1)*40+((park.run||1)-1)*35); score+=Math.round((splits.splitEdge||0)*0.08); score-=Math.round((context.travel?.penalty||0)*1.5); score+=Math.round((collab.market.score-50)*0.16+( collab.system.score-50)*0.12+(collab.pattern.score-50)*0.18); score=Math.max(25,Math.min(99,Math.round(score))); const [letter,style]=gradeBadge(score); const reasons=[`${fmtPct(avg)} AVG`,`${fmtPct(ops)} OPS`,`${splits.lrLabel} ${fmtPct(splits.lrOps)} OPS`,`${splits.venueLabel} ${fmtPct(splits.venueOps)} OPS`,`Travel ${context.travel?.hours?`${fmtNum(context.travel.hours,1)}h`:'minimal'}`,`vs ${oppPitcher.name||'TBD'} attack ${pitcherTendencies(oppPitcher).attack}`,`${park.short} park ${fmtNum(park.hr,2)} HR factor`,`${collab.market.label}`,`Pattern ${collab.pattern.label}`,`System ${collab.system.label}`]; return {score,letter,style,reasons,splits,collab}; }

function normalizeStatus(status){ if(status==='In Progress') return 'Live'; return status; }
function parseIP(ip){ if(ip==null||ip==='') return 0; const s=String(ip); if(!s.includes('.')) return Number(s)||0; const[whole,frac]=s.split('.'); return (Number(whole)||0)+(frac==='1'?1:frac==='2'?2:0)/3; }
function haversineMiles(lat1,lon1,lat2,lon2){ const R=3958.8,toRad=d=>d*Math.PI/180,dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1),a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2; return 2*R*Math.asin(Math.sqrt(a)); }
function classifyTravel(miles,restDays){ if(!miles) return {hours:0,label:'No travel',penalty:0}; const hours=Math.round((miles/500+1.5)*10)/10; let penalty=miles>1800?7:miles>1000?4:miles>450?2:0; if(restDays<=1&&miles>900) penalty+=3; else if(restDays<=1&&miles>450) penalty+=1; return {hours,label:miles>1800?'Cross-country':miles>900?'Flight spot':miles>250?'Road hop':'Short turn',penalty}; }

async function fetchJson(url){ const base=String(state.apiConfig.proxyBaseUrl||'https://newest-mlb.onrender.com').replace(/\/$/,''); const isProxy=base&&String(url).startsWith(base); const token=localStorage.getItem('allday-mlb-edge-token')||''; const headers=(isProxy&&token)?{'Authorization':`Bearer ${token}`}:{}; const res=await fetch(url,{headers}); if(!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); }
function saveApiConfig(patch={}){ state.apiConfig={proxyBaseUrl:'https://newest-mlb.onrender.com',oddsRegion:'us',oddsBookmaker:'',autoSyncWeather:true,autoSyncOdds:true,...state.apiConfig,...patch}; localStorage.setItem('mlb-edge-api-config',JSON.stringify(state.apiConfig)); }
function proxyUrl(path,params={}){ const base=String(state.apiConfig.proxyBaseUrl||'https://newest-mlb.onrender.com').replace(/\/$/,''); const url=new URL(base+path); Object.entries(params).forEach(([k,v])=>{ if(v!==undefined&&v!==null&&String(v)!=='') url.searchParams.set(k,v); }); return url.toString(); }
function inferWindDir(deg){ if(deg==null||Number.isNaN(Number(deg))) return 'Calm'; const d=Number(deg); if((d>=315&&d<=360)||(d>=0&&d<45)) return 'Out'; if(d>=135&&d<225) return 'In'; return 'Cross'; }
function pickForecastForGame(game,payload={}){ const rows=payload.hourly||[]; if(!rows.length) return null; const target=new Date(game.gameDate).getTime(); let best=rows[0],bestDiff=Infinity; for(const row of rows){ const t=new Date(row.time).getTime(),diff=Math.abs(t-target); if(diff<bestDiff){best=row;bestDiff=diff;} } return best; }
function findMatchingOddsEvent(game,events=[]){ const away=normTeamName(game.away.name),home=normTeamName(game.home.name); return events.find(ev=>normTeamName(ev.away_team||ev.awayTeam||'')===away&&normTeamName(ev.home_team||ev.homeTeam||'')===home); }
function pickOutcomePoint(outcomes=[],teamName=''){ const wanted=normTeamName(teamName); return outcomes.find(o=>normTeamName(o.name||'')===wanted)?.point??''; }

async function syncWeatherForSlate(){ if(!state.games.length) return; state.liveSync.weather={status:'loading',updatedAt:null,error:''}; render(); try{ for(const game of state.games){ const venue=venueMeta(game.venue.name); if(!venue) continue; const payload=await fetchJson(proxyUrl('/api/weather',{lat:venue.lat,lon:venue.lon,gameTime:game.gameDate})); const row=pickForecastForGame(game,payload); if(!row) continue; saveMarket(game.gamePk,{temperature:row.temperatureF??'',wind:row.windMph??'',windDir:row.windDirText||inferWindDir(row.wind_direction_10m),precip:row.precipitationProbability??'',roof:venue.roof||'Open',source:'Proxy Weather',lastWeatherSync:new Date().toISOString()}); } state.liveSync.weather={status:'ok',updatedAt:new Date().toISOString(),error:''}; }catch(err){ state.liveSync.weather={status:'error',updatedAt:null,error:err.message||'Weather sync failed'}; } render(); }
async function syncOddsForSlate(){ if(!state.games.length) return; state.liveSync.odds={status:'loading',updatedAt:null,error:''}; render(); try{ const payload=await fetchJson(proxyUrl('/api/odds/mlb',{date:state.selectedDate,regions:state.apiConfig.oddsRegion||'us',bookmaker:state.apiConfig.oddsBookmaker||''})); const events=payload.events||payload.data||payload||[]; for(const game of state.games){ const ev=findMatchingOddsEvent(game,events); if(!ev) continue; const h2h=ev.h2h||{},totals=ev.totals||{},teamTotals=ev.teamTotals||ev.team_totals||{}; saveMarket(game.gamePk,{awayMoneyline:h2h.away??'',homeMoneyline:h2h.home??'',total:totals.total??totals.point??'',awayTeamTotal:teamTotals.away??pickOutcomePoint(teamTotals.outcomes||[],game.away.name),homeTeamTotal:teamTotals.home??pickOutcomePoint(teamTotals.outcomes||[],game.home.name),book:ev.bookmaker||'Proxy',source:'Private Odds Proxy',lastOddsSync:new Date().toISOString()}); } state.liveSync.odds={status:'ok',updatedAt:new Date().toISOString(),error:''}; }catch(err){ state.liveSync.odds={status:'error',updatedAt:null,error:err.message||'Odds sync failed'}; } render(); }
async function syncLiveFeeds(){ if(state.apiConfig.autoSyncWeather) await syncWeatherForSlate(); if(state.apiConfig.autoSyncOdds) await syncOddsForSlate(); }

async function fetchPitcherStats(ids,season){ if(!ids.length) return {}; const unique=[...new Set(ids.filter(Boolean))]; if(!unique.length) return {}; const data=await fetchJson(`${API}/people?personIds=${unique.join(',')}&hydrate=stats(group=[pitching],type=[season],season=${season})`); const out={}; for(const p of data.people||[]){ const split=p.stats?.[0]?.splits?.[0]?.stat||{}; out[p.id]={id:p.id,name:p.fullName,era:Number(split.era||4.30),whip:Number(split.whip||1.30),hr9:Number(split.homeRunsPer9||1.15),k9:Number(split.strikeoutsPer9Inn||split.strikeOutsPer9Inn||8.6),ip:split.inningsPitched||'-',w:split.wins||0,l:split.losses||0,pitchHand:p.pitchHand?.code||'R'}; } return out; }
async function fetchTeamHitters(teamId,season){ const ck=`${teamId}:${season}`; if(state.teamHittersCache[ck]) return state.teamHittersCache[ck]; const roster=await fetchJson(`${API}/teams/${teamId}/roster?rosterType=active`); const hitters=(roster.roster||[]).filter(r=>r.position?.type!=='Pitcher'); const ids=hitters.map(h=>h.person?.id).filter(Boolean); if(!ids.length) return []; const data=await fetchJson(`${API}/people?personIds=${ids.join(',')}&hydrate=stats(group=[hitting],type=[season],season=${season})`); const rows=(data.people||[]).map(p=>{ const s=p.stats?.[0]?.splits?.[0]?.stat||{}; return {id:p.id,name:p.fullName,pos:hitters.find(h=>h.person?.id===p.id)?.position?.abbreviation||'-',avg:Number(s.avg||0),obp:Number(s.obp||0),slg:Number(s.slg||0),ops:Number(s.ops||0),hr:Number(s.homeRuns||0),rbi:Number(s.rbi||0),pa:Number(s.plateAppearances||s.atBats||0),sb:Number(s.stolenBases||0),batSide:p.batSide?.code||'R'}; }).filter(r=>r.pa>20).sort((a,b)=>b.ops-a.ops||b.hr-a.hr); state.teamHittersCache[ck]=rows; return rows; }
async function fetchTeamPitchingStaff(teamId,season,excludeId=null){ const ck=`${teamId}:${season}`; if(!state.teamPitchingCache[ck]){ const roster=await fetchJson(`${API}/teams/${teamId}/roster?rosterType=active`); const pitchers=(roster.roster||[]).filter(r=>r.position?.type==='Pitcher'); const ids=pitchers.map(p=>p.person?.id).filter(Boolean); if(!ids.length){state.teamPitchingCache[ck]=[];}else{ const data=await fetchJson(`${API}/people?personIds=${ids.join(',')}&hydrate=stats(group=[pitching],type=[season],season=${season})`); state.teamPitchingCache[ck]=(data.people||[]).map(p=>{ const s=p.stats?.[0]?.splits?.[0]?.stat||{}; return {id:p.id,name:p.fullName,pitchHand:p.pitchHand?.code||'R',era:Number(s.era||4.30),whip:Number(s.whip||1.30),k9:Number(s.strikeoutsPer9Inn||8.6),hr9:Number(s.homeRunsPer9||1.15),ip:parseIP(s.inningsPitched||0),sv:Number(s.saves||0),gf:Number(s.gamesFinished||0),gp:Number(s.gamesPitched||0)}; }); } } return (state.teamPitchingCache[ck]||[]).filter(p=>!excludeId||p.id!==excludeId); }
async function fetchRecentTeamGames(teamId,beforeDate){ const ck=`${teamId}:${beforeDate}`; if(state.recentGamesCache[ck]) return state.recentGamesCache[ck]; const end=new Date(beforeDate+'T12:00:00'); end.setDate(end.getDate()-1); const start=new Date(end); start.setDate(start.getDate()-8); const fmt=d=>d.toISOString().slice(0,10); const data=await fetchJson(`${API}/schedule?sportId=1&teamId=${teamId}&startDate=${fmt(start)}&endDate=${fmt(end)}`); const games=(data.dates||[]).flatMap(d=>d.games||[]).filter(g=>(g.status?.abstractGameState||'')==='Final').sort((a,b)=>new Date(b.gameDate)-new Date(a.gameDate)); state.recentGamesCache[ck]=games; return games; }
async function fetchTravelContext(team,beforeDate){ const games=await fetchRecentTeamGames(team.id,beforeDate); const prev=games[0]; const currentVenue=venueMeta(team.nextVenue||''); if(!prev||!currentVenue) return {miles:0,hours:0,label:'No travel signal',penalty:0,previousVenue:'-'}; const prevVenue=venueMeta(prev.venue?.name||''); if(!prevVenue) return {miles:0,hours:0,label:'Unknown routing',penalty:0,previousVenue:prev.venue?.name||'-'}; const miles=Math.round(haversineMiles(prevVenue.lat,prevVenue.lon,currentVenue.lat,currentVenue.lon)); const restDays=Math.max(0,Math.round((new Date(beforeDate).getTime()-new Date(prev.gameDate).getTime())/86400000)); return {...classifyTravel(miles,restDays),miles,previousVenue:prev.venue?.name||'-',restDays}; }
async function fetchRecentBullpenUsage(teamId,beforeDate){ const games=(await fetchRecentTeamGames(teamId,beforeDate)).slice(0,3); const usage={}; for(const g of games){ try{ const box=await fetchJson(`${API}/game/${g.gamePk}/boxscore`); const side=box.teams?.home?.team?.id===teamId?box.teams?.home:box.teams?.away; const players=Object.values(side?.players||{}); const rows=players.map(p=>({id:p.person?.id,name:p.person?.fullName,ip:parseIP(p.stats?.pitching?.inningsPitched||0),pitches:Number(p.stats?.pitching?.numberOfPitches||0),gs:Number(p.stats?.pitching?.gamesStarted||0)})).filter(p=>p.id&&p.ip>0); if(!rows.length) continue; const starter=rows.slice().sort((a,b)=>b.ip-a.ip)[0]; for(const p of rows){ if(p.id===starter.id) continue; if(!usage[p.id]) usage[p.id]={id:p.id,name:p.name,apps:0,pitches:0,ip:0,lastUsed:g.gameDate}; usage[p.id].apps+=1; usage[p.id].pitches+=p.pitches||Math.round(p.ip*16); usage[p.id].ip+=p.ip; usage[p.id].lastUsed=g.gameDate; } }catch(err){ console.warn('bullpen err',err); } } return usage; }
function projectBullpen(staff=[],usageMap={},gameDate,starter){ const relievers=staff.filter(p=>p.id!==starter?.id); const nowTs=new Date(gameDate).getTime(); const rows=relievers.map(p=>{ const usage=usageMap[p.id]||{apps:0,pitches:0,ip:0,lastUsed:null}; const daysRest=usage.lastUsed?Math.max(0,Math.round((nowTs-new Date(usage.lastUsed).getTime())/86400000)):5; const leverage=p.sv*3+p.gf*1.5+p.k9+Math.max(0,10-p.era); const fatigue=usage.apps*8+usage.pitches*0.18+Math.max(0,2-daysRest)*10; const availability=Math.max(5,Math.min(95,Math.round(74+daysRest*5-fatigue))); return {...p,usage,daysRest,leverage,availability}; }).sort((a,b)=>b.leverage-a.leverage); const projectedInnings=Math.max(1.4,Math.min(5.2,9-starterProjection(starter||{}))); return {closer:rows[0]||null,setup:rows.slice(1,3),bridge:rows.slice(3,5),projectedInnings,rows}; }

function buildHero(){ const best=state.stackRows[0]; const stats=[{k:'Games on slate',v:String(state.hero.games),s:`${state.hero.live} live right now`},{k:'Top stack',v:best?best.team:'-',s:best?`${best.score}/99 ${best.level}`:'Load a slate'},{k:'Avg stack score',v:String(state.hero.avg||'-'),s:'Slate-level hitting environment'},{k:'Selected game',v:state.selectedGameData?`${state.selectedGameData.away.abbr} @ ${state.selectedGameData.home.abbr}`:'-',s:state.selectedGameData?`${state.selectedGameData.venue.name}`:'Choose a matchup'}]; $('#heroStats').innerHTML=stats.map(s=>`<div class="stat"><div class="k">${s.k}</div><div class="v">${escapeHtml(s.v)}</div><div class="s">${escapeHtml(s.s)}</div></div>`).join(''); }
function renderTabs(){ tabsEl.innerHTML=TABS.map(t=>`<button class="tab ${state.tab===t.id?'active':''}" data-tab="${t.id}">${t.label}</button>`).join(''); tabsEl.querySelectorAll('[data-tab]').forEach(btn=>btn.onclick=()=>{ state.tab=btn.dataset.tab; render(); }); }
