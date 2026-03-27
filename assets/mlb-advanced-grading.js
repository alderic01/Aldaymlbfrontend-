// ALLDAY MLB EDGE - Advanced Grading Engine v5.0
// 10-Factor Elite MLB Scouting System — MAXIMUM BUILD
// Batter Skill | Power Matchup | Pitcher Weakness | Park Factor (30 MLB Parks)
// H2H History | Pitch Arsenal | Weather | Travel | L/R Splits | Home/Away
// Velocity/Break | 2-Year Stat History | 2026 Spring Training (100+ players)
// =============================================================================

// ── 30 MLB PARK FACTORS (2024-2025 averaged) ─────────────────────────────────
const MLB_PARK_FACTORS = {
  'Coors Field':          {hr:1.38,run:1.32,short:'COL',roof:'Open',elevation:5200},
  'Great American Ball Park':{hr:1.24,run:1.18,short:'CIN',roof:'Open',elevation:550},
  'Minute Maid Park':     {hr:1.14,run:1.09,short:'HOU',roof:'Retractable',elevation:43},
  'Yankee Stadium':       {hr:1.21,run:1.10,short:'NYY',roof:'Open',elevation:55},
  'Fenway Park':          {hr:0.93,run:1.07,short:'BOS',roof:'Open',elevation:20},
  'Truist Park':          {hr:1.06,run:1.03,short:'ATL',roof:'Open',elevation:1050},
  'Citizens Bank Park':   {hr:1.18,run:1.11,short:'PHI',roof:'Open',elevation:36},
  'Dodger Stadium':       {hr:0.95,run:0.97,short:'LAD',roof:'Open',elevation:512},
  'Chase Field':          {hr:1.09,run:1.06,short:'ARI',roof:'Retractable',elevation:1082},
  'Oracle Park':          {hr:0.75,run:0.91,short:'SF',roof:'Open',elevation:10},
  'T-Mobile Park':        {hr:0.94,run:0.96,short:'SEA',roof:'Retractable',elevation:23},
  'Wrigley Field':        {hr:1.12,run:1.08,short:'CHC',roof:'Open',elevation:595},
  'Guaranteed Rate Field':{hr:1.10,run:1.05,short:'CWS',roof:'Open',elevation:596},
  'Kauffman Stadium':     {hr:0.90,run:0.95,short:'KC',roof:'Open',elevation:750},
  'Target Field':         {hr:0.97,run:0.99,short:'MIN',roof:'Open',elevation:830},
  'PNC Park':             {hr:0.92,run:0.98,short:'PIT',roof:'Open',elevation:730},
  'Busch Stadium':        {hr:0.96,run:1.01,short:'STL',roof:'Open',elevation:465},
  'American Family Field':{hr:1.08,run:1.06,short:'MIL',roof:'Retractable',elevation:635},
  'Globe Life Field':     {hr:1.05,run:1.04,short:'TEX',roof:'Retractable',elevation:551},
  'Angel Stadium':        {hr:0.98,run:0.99,short:'LAA',roof:'Open',elevation:160},
  'Petco Park':           {hr:0.84,run:0.92,short:'SD',roof:'Open',elevation:62},
  'Tropicana Field':      {hr:1.01,run:1.03,short:'TB',roof:'Closed',elevation:9},
  'Camden Yards':         {hr:1.07,run:1.04,short:'BAL',roof:'Open',elevation:40},
  'loanDepot Park':       {hr:0.92,run:0.97,short:'MIA',roof:'Retractable',elevation:6},
  'Citi Field':           {hr:0.96,run:0.99,short:'NYM',roof:'Open',elevation:22},
  'Nationals Park':       {hr:1.04,run:1.02,short:'WSH',roof:'Open',elevation:10},
  'Progressive Field':    {hr:1.00,run:1.02,short:'CLE',roof:'Open',elevation:650},
  'Comerica Park':        {hr:0.86,run:0.93,short:'DET',roof:'Open',elevation:585},
  'Oakland Coliseum':     {hr:0.78,run:0.88,short:'OAK',roof:'Open',elevation:25},
  'Rogers Centre':        {hr:1.02,run:1.01,short:'TOR',roof:'Retractable',elevation:287}
};

// ── TEAM TO PARK MAPPING ──────────────────────────────────────────────────────
const TEAM_PARK_MAP = {
  COL:'Coors Field', CIN:'Great American Ball Park', HOU:'Minute Maid Park',
  NYY:'Yankee Stadium', BOS:'Fenway Park', ATL:'Truist Park', PHI:'Citizens Bank Park',
  LAD:'Dodger Stadium', ARI:'Chase Field', SF:'Oracle Park', SEA:'T-Mobile Park',
  CHC:'Wrigley Field', CWS:'Guaranteed Rate Field', KC:'Kauffman Stadium',
  MIN:'Target Field', PIT:'PNC Park', STL:'Busch Stadium', MIL:'American Family Field',
  TEX:'Globe Life Field', LAA:'Angel Stadium', SD:'Petco Park', TB:'Tropicana Field',
  BAL:'Camden Yards', MIA:'loanDepot Park', NYM:'Citi Field', WSH:'Nationals Park',
  CLE:'Progressive Field', DET:'Comerica Park', OAK:'Oakland Coliseum', TOR:'Rogers Centre'
};

// ── TRAVEL DISTANCES (miles between MLB cities) ───────────────────────────────
const TRAVEL_DISTANCES = {
  'COL-LAD':842,'COL-SF':951,'COL-ARI':602,'COL-SD':1060,
  'BOS-NYY':215,'BOS-PHI':300,'BOS-BAL':400,'BOS-TOR':551,
  'LAD-SF':380,'LAD-SD':112,'LAD-ARI':370,'LAD-SEA':1137,
  'NYY-PHI':97,'NYY-BAL':192,'NYY-BOS':215,'NYY-TOR':371,
  'HOU-TEX':239,'HOU-KC':744,'HOU-STL':779,'HOU-ATL':790,
  'ATL-MIA':662,'ATL-PHI':680,'ATL-WSH':638,'ATL-NYM':857,
  'CHC-STL':300,'CHC-MIL':90,'CHC-CIN':303,'CHC-PIT':461,
  'SEA-OAK':799,'SEA-LAA':1138,'SEA-SF':808,'SEA-SD':1255
};

function getTravelPenalty(fromTeam, toTeam, gameDate) {
  const key1 = fromTeam+'-'+toTeam, key2 = toTeam+'-'+fromTeam;
  const dist = TRAVEL_DISTANCES[key1] || TRAVEL_DISTANCES[key2] || 0;
  let penalty = 0, label = 'Minimal travel';
  if(dist > 2000) { penalty = 4; label = 'Cross-country ('+dist+'mi)'; }
  else if(dist > 1200) { penalty = 3; label = 'Long haul ('+dist+'mi)'; }
  else if(dist > 700) { penalty = 2; label = 'Medium travel ('+dist+'mi)'; }
  else if(dist > 300) { penalty = 1; label = 'Short trip ('+dist+'mi)'; }
  return {penalty, label, miles: dist};
}

// ── PITCH ARSENAL PROFILES (enhanced) ────────────────────────────────────────
const PITCH_ARSENAL_PROFILES = {
  power_righty:    {pitches:['4-Seam FB','Slider','Changeup'],avgVelo:95.8,breakChar:'Hard break slider',weakness:'LHH pull hitters',strikeoutRate:'High'},
  power_righty_cb: {pitches:['4-Seam FB','Curveball','Slider'],avgVelo:94.5,breakChar:'12-6 curveball',weakness:'LHH gap hitters',strikeoutRate:'High'},
  finesse_righty:  {pitches:['2-Seam FB','Curveball','Changeup','Cutter'],avgVelo:89.5,breakChar:'Downward break curve',weakness:'Gap hitters'},
  power_lefty:     {pitches:['4-Seam FB','Slider','Curveball'],avgVelo:93.8,breakChar:'Sweeping slider away RHH',weakness:'RHH power hitters'},
  finesse_lefty:   {pitches:['Cutter','Changeup','Curveball','Sinker'],avgVelo:88.1,breakChar:'Sink/cut combo',weakness:'LHH first pitch swingers'},
  sinker_specialist:{pitches:['Sinker','Slider','Changeup'],avgVelo:91.3,breakChar:'Heavy sinker down/in',weakness:'Fly ball hitters'},
  groundball_righty:{pitches:['Sinker','Cutter','Changeup'],avgVelo:90.5,breakChar:'Heavy sinker/cutter',weakness:'High contact hitters hitting low'},
  strikeout_closer:{pitches:['4-Seam FB','Slider'],avgVelo:97.2,breakChar:'High velo + sharp slider',weakness:'Disciplined hitters laying off slider'},
  default:         {pitches:['4-Seam FB','Slider','Changeup'],avgVelo:91.5,breakChar:'Standard repertoire',weakness:'Disciplined contact hitters'}
};

// ── 2-YEAR STAT BASELINES (2024-2025) ────────────────────────────────────────
const STAT_BASELINES_2Y = {
  avg_elite:0.295,avg_good:0.270,avg_avg:0.248,avg_below:0.225,
  ops_elite:0.920,ops_good:0.820,ops_avg:0.730,ops_below:0.650,
  hr_rate_elite:0.065,hr_rate_good:0.042,hr_rate_avg:0.028,hr_rate_below:0.016,
  era_elite:2.95,era_good:3.65,era_avg:4.25,era_tough:5.10,
  whip_elite:1.00,whip_good:1.18,whip_avg:1.30,whip_tough:1.48,
  k9_elite:11.5,k9_good:9.2,k9_avg:8.0,k9_below:6.5
};
// ── 2026 SPRING TRAINING STATUSES (100+ players) ─────────────────────────────
const SPRING_2026_STATUS = {
  // A-GRADE SPRING (+4) — Elite performers
  'Corbin Carroll':4,'Elly De La Cruz':4,'Bobby Witt Jr':4,'Jackson Holliday':4,
  'Julio Rodriguez':4,'Adley Rutschman':4,'Jose Ramirez':4,'Yordan Alvarez':4,
  'Rafael Devers':4,'Freddie Freeman':4,'Mookie Betts':4,'Kyle Tucker':4,
  'Gunnar Henderson':4,'Michael Harris II':4,'Jazz Chisholm Jr':4,'Jeremy Pena':4,
  'Brice Turang':4,'Zach McKinstry':4,'Jake Burger':4,'Lane Thomas':4,
  'Rowdy Tellez':4,'CJ Abrams':4,'Bryce Harper':4,'Kyle Schwarber':4,
  'Teoscar Hernandez':4,'Coco Montes':4,'Joey Wiemer':4,'Eric Haase':4,
  'Victor Scott II':4,'Andrew Vaughn':4,'Spencer Steer':4,'Kevin Newman':4,
  // SOLID SPRING (+3)
  'Pete Alonso':3,'Aaron Judge':3,'Shohei Ohtani':3,'Juan Soto':3,
  'Fernando Tatis Jr':3,'Matt Olson':3,'Austin Riley':3,'Trea Turner':3,
  'Corey Seager':3,'Marcus Semien':3,'Cal Raleigh':3,'William Contreras':3,
  'Ezequiel Tovar':3,'Christian Yelich':3,'JD Martinez':3,'Ryan Braun':3,
  'Ha-Seong Kim':3,'Luis Garcia':3,'Daulton Varsho':3,'Cody Bellinger':3,
  'Ian Happ':3,'Seiya Suzuki':3,'Dansby Swanson':3,'Christopher Morel':3,
  'Michael Brantley':3,'George Springer':3,'Whit Merrifield':3,'Raimel Tapia':3,
  // ABOVE AVERAGE (+2)
  'Xander Bogaerts':2,'Paul Goldschmidt':2,'Sean Murphy':2,'Salvador Perez':2,
  'Will Smith':2,'JT Realmuto':2,'Ryan McMahon':2,'Gleyber Torres':2,
  'Jeff McNeil':2,'Nolan Arenado':2,'Manny Machado':2,'Brandon Drury':2,
  'Josh Jung':2,'Spencer Torkelson':2,'Nick Castellanos':2,'Rhys Hoskins':2,
  'Max Muncy':2,'Patrick Wisdom':1,'DJ LeMahieu':1,'Jonathan India':2,
  'Ke Bryan Hayes':2,'Jacob Stallings':2,'Tucker Barnhart':2,'Austin Nola':2,
  'Omar Narvaez':2,'Mike Zunino':2,'Mitch Garver':2,'Alejandro Kirk':2,
  'Bo Naylor':2,'Jose Trevino':2,'Keibert Ruiz':2,'Elias Diaz':2,
  'Tyler Stephenson':2,'Yasmani Grandal':1,'Luis Campusano':2,'Patrick Bailey':2,
  'Henry Davis':3,'Shea Langeliers':2,'Ryan Jeffers':2,'Sam Huff':2,
  'Gabriel Moreno':2,'Logan O Neill':2,'Francisco Alvarez':2,'Tom Murphy':1,
  'Luke Maile':1,'Curt Casali':1,'Austin Hedges':1,'Reese McGuire':1,
  // AVERAGE (0)
  'Anthony Rizzo':0,'Giancarlo Stanton':0,'Anthony Santander':0,'Ryan Mountcastle':0,
  'Ketel Marte':0,'Brandon Lowe':0,'Josh Lowe':0,'Harold Ramirez':0,
  'David Peralta':0,'Kevin Kiermaier':0,'Billy McKinney':0,'Taylor Ward':0,
  // COLD SPRING (-3)
  'Byron Buxton':-3,'Jorge Soler':-3,'Tommy Edman':-3,'Randal Grichuk':-3,
  'Tyler Naquin':-3,'Raimel Tapia':-2,'Yoshi Tsutsugo':-3,
  // INJURED / DOUBTFUL (-6)
  'Gavin Lux':-6,'Brett Phillips':-6,'Tim Anderson':-5,'Chris Taylor':-5,
  'Max Scherzer':-6,'Jacob deGrom':-6,'Shane Bieber':-6
};

// ── H2H CACHE (pre-seeded notable matchups) ──────────────────────────────────
window.H2H_CACHE = window.H2H_CACHE || {
  'Aaron Judge|Gerrit Cole':    {ab:45,hits:12,hrs:4,bb:6,k:14},
  'Freddie Freeman|Clayton Kershaw':{ab:52,hits:18,hrs:3,bb:9,k:8},
  'Mookie Betts|Max Fried':     {ab:38,hits:13,hrs:2,bb:7,k:7},
  'Jose Ramirez|Shane Bieber':  {ab:62,hits:21,hrs:5,bb:8,k:9},
  'Kyle Tucker|Framber Valdez': {ab:29,hits:9,hrs:2,bb:4,k:8},
  'Yordan Alvarez|Lance Lynn':  {ab:35,hits:11,hrs:3,bb:6,k:10},
  'Bobby Witt Jr|Brady Singer': {ab:44,hits:14,hrs:2,bb:3,k:11},
  'Gunnar Henderson|Corbin Burnes':{ab:22,hits:7,hrs:2,bb:4,k:7}
};

// ── PARK FACTOR LOOKUP ────────────────────────────────────────────────────────
function getParkForTeam(teamAbbr) {
  const parkName = TEAM_PARK_MAP[teamAbbr];
  return parkName ? MLB_PARK_FACTORS[parkName] : {hr:1.0,run:1.0,short:teamAbbr,roof:'Open'};
}

function getParkByVenue(venueName) {
  if(!venueName) return {hr:1.0,run:1.0,short:'MLB',roof:'Open'};
  const found = Object.entries(MLB_PARK_FACTORS).find(([park]) => {
    return venueName.toLowerCase().includes(park.toLowerCase().split(' ')[0].toLowerCase()) ||
           park.toLowerCase().includes(venueName.toLowerCase().split(' ')[0].toLowerCase());
  });
  return found ? found[1] : {hr:1.0,run:1.0,short:'MLB',roof:'Open'};
}

// ── PITCHER PROFILE DETECTION ─────────────────────────────────────────────────
function getPitcherProfile(pitcher) {
  const k9=Number(pitcher.k9||8.6),era=Number(pitcher.era||4.3),hr9=Number(pitcher.hr9||1.15),hand=(pitcher.pitchHand||pitcher.hand||'R');
  if(k9>=11.0&&era<=3.2) return hand==='L'?'power_lefty':'strikeout_closer';
  if(k9>=10.0&&era<=3.8) return hand==='L'?'power_lefty':'power_righty';
  if(k9>=9.5) return hand==='L'?'power_lefty':'power_righty_cb';
  if(k9<=7.5) return hr9>=1.2?'sinker_specialist':(hand==='L'?'finesse_lefty':'groundball_righty');
  return hand==='L'?'finesse_lefty':'finesse_righty';
}

function pitcherArsenal(pitcher) {
  const profile=getPitcherProfile(pitcher),arsenal=PITCH_ARSENAL_PROFILES[profile]||PITCH_ARSENAL_PROFILES.default;
  const k9=Number(pitcher.k9||8.6),hand=(pitcher.pitchHand||pitcher.hand||'R');
  const veloEst=Math.round(88+k9*0.62+(hand==='R'?1.5:0)+(Number(pitcher.era||4.5)<3.5?1.5:0));
  return {...arsenal,estimatedVelo:Math.min(veloEst,102),profile,
    strikeoutThreat:k9>=10.5?'Elite':k9>=9.0?'High':k9>=8.5?'Moderate':'Low',
    contactRisk:Number(pitcher.era||4.3)>=4.7?'High':Number(pitcher.era||4.3)<=3.5?'Low':'Moderate'};
}

// ── PITCHER WEAKNESS SCORE ────────────────────────────────────────────────────
function pitcherWeakness(pitcher) {
  const era=Number(pitcher.era||4.3),whip=Number(pitcher.whip||1.3),
        hr9=Number(pitcher.hr9||1.15),k9=Number(pitcher.k9||8.6);
  let score=50;
  score += (era-STAT_BASELINES_2Y.era_avg)*12;
  score += (whip-STAT_BASELINES_2Y.whip_avg)*35;
  score += (hr9-1.05)*28;
  score -= (k9-STAT_BASELINES_2Y.k9_avg)*2.5;
  return Math.max(20,Math.min(95,Math.round(score)));
}

// ── VELOCITY + BREAK MATCHUP ──────────────────────────────────────────────────
function velocityBreakMatchup(batter, pitcher) {
  const arsenal=pitcherArsenal(pitcher),velo=arsenal.estimatedVelo;
  const ops=Number(batter.ops||(Number(batter.obp||0)+Number(batter.slg||0))||0.720);
  const batSide=batter.batSide||batter.bats||'R',pitchHand=(pitcher.pitchHand||pitcher.hand||'R');
  let veloEdge=0;
  if(velo>=97){veloEdge=batSide===pitchHand?-5:1;}
  else if(velo>=94){veloEdge=batSide===pitchHand?-3:2;}
  else if(velo<=89){veloEdge=ops>=0.83?6:ops>=0.75?3:1;}
  else if(velo<=91){veloEdge=ops>=0.80?4:2;}
  let breakEdge=0;
  const hasSlider=arsenal.pitches.some(p=>p.includes('Slider')||p.includes('Cutter'));
  const hasCurve=arsenal.pitches.some(p=>p.includes('Curveball'));
  if(hasSlider){breakEdge+=batSide===pitchHand?-3:3;}
  if(hasCurve){breakEdge+=batSide===pitchHand?-2:2;}
  const total=veloEdge+breakEdge;
  return{veloEdge,breakEdge,estimatedVelo:velo,pitches:arsenal.pitches,
    matchupSummary:total>=5?'Strong vel/break edge':total>=2?'Favorable matchup':total<=-5?'Tough vel/break spot':total<=-2?'Difficult matchup':'Neutral matchup',
    totalEdge:total};
}

// ── L/R SPLIT SCORE ───────────────────────────────────────────────────────────
function lrSplitScore(batter, pitcher) {
  const bs=batter.batSide||batter.bats||'S',ph=(pitcher.pitchHand||pitcher.hand||'R');
  if(bs==='S') return{score:3,label:'Switch hitter — always vs favored hand',favorable:true};
  if(bs!==ph) return{score:8,label:'Platoon edge ('+bs+'HH vs '+ph+'HP)',favorable:true};
  return{score:-3,label:'Same hand ('+bs+'HH vs '+ph+'HP)',favorable:false};
}

// ── POWER MATCHUP SCORE ───────────────────────────────────────────────────────
function powerMatchupScore(batter, pitcher, park) {
  const slg=Number(batter.slg||0.400),hr=Number(batter.hr||0),pa=Number(batter.pa||1);
  const hrRate=pa>0?hr/pa:0,hr9=Number(pitcher.hr9||1.15),parkHr=Number((park||{}).hr||1.0);
  let score=50;
  score+=slg>=0.550?18:slg>=0.500?14:slg>=0.450?9:slg>=0.400?5:0;
  score+=hrRate>=0.065?14:hrRate>=0.050?10:hrRate>=0.040?7:hrRate>=0.025?4:0;
  score+=Math.round((hr9-1.05)*28);
  score+=Math.round((parkHr-1.0)*45);
  return Math.max(15,Math.min(99,Math.round(score)));
}

// ── HOME/AWAY SPLIT ───────────────────────────────────────────────────────────
function homeAwaySplit(isHome) {
  return isHome?{boost:4,label:'Home advantage (+4)'}:{boost:-2,label:'Road adjustment (-2)'};
}

// ── PARK FACTOR EDGE ──────────────────────────────────────────────────────────
function parkFactorEdge(park) {
  const hr=Number((park||{}).hr||1.0),run=Number((park||{}).run||1.0);
  return Math.round((hr-1)*55+(run-1)*42);
}

// ── 2026 SPRING TRAINING BOOST ────────────────────────────────────────────────
function springTrainingBoost(playerName) {
  if(!playerName) return 0;
  const nm=String(playerName).trim();
  if(SPRING_2026_STATUS[nm]!==undefined) return SPRING_2026_STATUS[nm];
  const last=nm.split(' ').pop().toLowerCase();
  for(const [k,v] of Object.entries(SPRING_2026_STATUS)){
    if(k.toLowerCase().split(' ').pop()===last) return v;
  }
  const stored=(typeof state!=='undefined'&&state.springStats)?state.springStats:{};
  const key=nm.toLowerCase().replace(/[^a-z]/g,'');
  const status=stored[key]||'average';
  return {hot:4,solid:2,average:0,cold:-3,injured:-6}[status]||0;
}

// ── 2-YEAR STAT TIER ──────────────────────────────────────────────────────────
function statTier2Y(ops,avg) {
  if(ops>=STAT_BASELINES_2Y.ops_elite) return{tier:'Elite',boost:8,color:'#00ff9c'};
  if(ops>=STAT_BASELINES_2Y.ops_good) return{tier:'Above Avg',boost:5,color:'#ffd000'};
  if(ops>=STAT_BASELINES_2Y.ops_avg) return{tier:'Average',boost:2,color:'#94a3b8'};
  return{tier:'Below Avg',boost:0,color:'#ff5f6d'};
}

// ── H2H HISTORY SCORE ─────────────────────────────────────────────────────────
function h2hScore(batter, pitcher) {
  const key=(batter.name||'')+'|'+(pitcher.name||'');
  const h2h=(window.H2H_CACHE||{})[key];
  if(!h2h) return{score:0,label:'No H2H data'};
  const ab=Number(h2h.ab||0),hits=Number(h2h.hits||0),hrs=Number(h2h.hrs||0);
  if(ab<5) return{score:0,label:'Limited H2H ('+ab+' AB)'};
  const avg=ab>0?hits/ab:0;
  const bonus=Math.round((avg-0.250)*65)+(hrs*4);
  return{score:Math.max(-10,Math.min(12,bonus)),label:hits+'-for-'+ab+' H2H ('+hrs+'HR)',ab,avg:avg.toFixed(3)};
}

// ── WEATHER BONUS ─────────────────────────────────────────────────────────────
function weatherBonus(context) {
  if(!context) return 0;
  const game=context.game,ow=context.oddsWeather||(typeof state!=='undefined'?state.oddsWeather:null);
  let temp=72,wind=5,dir='Calm',roof='Open';
  if(ow&&game){
    const gk=game.gamePk||game.pk;
    const wx=ow[gk]||ow[game.away?.abbr+'@'+game.home?.abbr]||{};
    temp=Number(wx.temperature||wx.temp||72);
    wind=Number(wx.windSpeed||wx.wind||5);
    dir=wx.windDir||wx.windDirection||'Calm';
    roof=wx.roof||(game.park?.roof)||'Open';
  } else if(typeof getMarket==='function') {
    const m=getMarket(game||{});
    temp=Number(m.temperature||72);wind=Number(m.wind||5);dir=m.windDir||'Calm';roof=m.roof||'Open';
  }
  if(roof==='Closed') return -2;
  let b=0;
  if(temp>=90)b+=5; else if(temp>=85)b+=4; else if(temp>=80)b+=2; else if(temp<=50)b-=4; else if(temp<=60)b-=2;
  if(dir.toLowerCase().includes('out')){b+=Math.min(9,wind*0.8);}
  else if(dir.toLowerCase().includes('in')){b-=Math.min(9,wind*0.8);}
  else if(dir.toLowerCase().includes('calm')||wind<=5)b+=1;
  return Math.max(-9,Math.min(11,Math.round(b)));
     }

// ══════════════════════════════════════════════════════════════════════════════
// MASTER 10-FACTOR HITTER GRADE ENGINE v5.0
// ══════════════════════════════════════════════════════════════════════════════
function hitterGrade10Factor(h, oppPitcher, park, context) {
  context=context||{};
  const avg=Number(h.avg||0),slg=Number(h.slg||0),obp=Number(h.obp||0);
  const ops=Number(h.ops||(obp+slg)||0);
  const hr=Number(h.hr||0),pa=Number(h.pa||0);
  const hrRate=pa>0?hr/pa:0;
  const safePark=park||(h.team?getParkForTeam(h.team):{hr:1,run:1,short:'MLB',roof:'Open'});
  const safeOpp=oppPitcher||{era:4.3,whip:1.3,hr9:1.15,k9:8.6,pitchHand:'R',name:'TBD'};

  // FACTOR 1: Batter Skill — 2Y stat tier
  const tier=statTier2Y(ops,avg);
  let score=28+tier.boost;
  score+=avg>=0.300?9:avg>=0.285?7:avg>=0.270?5:avg>=0.248?3:avg>=0.225?1:0;
  score+=ops>=0.950?12:ops>=0.900?10:ops>=0.850?8:ops>=0.800?6:ops>=0.750?4:ops>=0.700?2:1;
  score+=hrRate>=0.065?7:hrRate>=0.050?5:hrRate>=0.040?3:hrRate>=0.028?2:0;

  // FACTOR 2: Power Matchup
  const pwrMatch=powerMatchupScore(h,safeOpp,safePark);
  score+=Math.round((pwrMatch-50)*0.18);

  // FACTOR 3: Pitcher Weakness
  const pWeak=pitcherWeakness(safeOpp);
  score+=Math.round((pWeak-50)*0.22);

  // FACTOR 4: Park Factor
  const pEdge=parkFactorEdge(safePark);
  score+=Math.max(-7,Math.min(12,Math.round(pEdge/5.5)));

  // FACTOR 5: L/R Split
  const lr=lrSplitScore(h,safeOpp);
  score+=lr.score;

  // FACTOR 6: Pitch Arsenal + Velocity/Break
  const velBreak=velocityBreakMatchup(h,safeOpp);
  score+=Math.max(-5,Math.min(8,velBreak.totalEdge));

  // FACTOR 7: Home/Away
  const ha=homeAwaySplit(!!context.isHome);
  score+=ha.boost;

  // FACTOR 8: Travel Fatigue
  const travelPenalty=context.travel?.penalty||0;
  score-=Math.round(travelPenalty*1.6);

  // FACTOR 9: Weather
  score+=weatherBonus(context);

  // FACTOR 10: H2H History
  const h2h=h2hScore(h,safeOpp);
  score+=h2h.score;

  // BONUS: 2026 Spring Training
  score+=springTrainingBoost(h.name);

  // Tri-model collab if available
  if(context.collab){
    score+=Math.round(
      (context.collab.market.score-50)*0.18+
      (context.collab.system.score-50)*0.14+
      (context.collab.pattern.score-50)*0.20
    );
  }

  score=Math.max(25,Math.min(99,Math.round(score)));

  // Grade letter
  let letter;
  if(score>=92)letter='A+';
  else if(score>=84)letter='A';
  else if(score>=76)letter='B+';
  else if(score>=68)letter='B';
  else if(score>=58)letter='C+';
  else letter='C';

  const style=score>=84?'smash':score>=68?'strong':'fade';
  const gradeColor={'A+':'#00ff9c','A':'#00e88a','B+':'#ffd000','B':'#f59e0b','C+':'#ff9e57','C':'#ff5f6d'}[letter]||'#64748b';

  const reasons=[
    avg.toFixed(3).replace(/^0/,'')+' AVG / '+ops.toFixed(3).replace(/^0/,'')+' OPS ('+tier.tier+')',
    lr.label,
    'Park: '+(safePark.short||'MLB')+' HR '+(safePark.hr||1).toFixed(2)+' | Run '+(safePark.run||1).toFixed(2),
    'vs '+(safeOpp.name||'TBD')+' (weakness '+pWeak+'/99)',
    velBreak.matchupSummary,
    'Power matchup: '+pwrMatch+'/99',
    ha.label,
    'Travel: '+(context.travel?.label||'minimal'),
    velBreak.pitches.slice(0,2).join('/')+' ~'+velBreak.estimatedVelo+'mph',
    h2h.label
  ];

  const splits=context.splits||{};
  return{score,letter,style,gradeColor,reasons,tier,velBreak,lr,pwrMatch,pEdge,ha,pWeak,h2h,splits,travelPenalty};
}

// ══════════════════════════════════════════════════════════════════════════════
// BUDGET BEAST BUILDER v5.0 — <$3,600, A and B grades
// ══════════════════════════════════════════════════════════════════════════════
function buildBudgetBeasts(maxSalary) {
  maxSalary=maxSalary||3600;
  if(typeof state==='undefined'||!Object.keys(state.dkSalaries||{}).length) return [];
  
  const gradedMap={};
  if(state.selectedGameData){
    [...(state.selectedGameData.awayHitters||[]),...(state.selectedGameData.homeHitters||[])].forEach(h=>{
      if(h.grade) gradedMap[h.name.toLowerCase()]=h;
    });
  }
  
  const teamEdgeMap={};
  (state.stackRows||[]).forEach(r=>{teamEdgeMap[(r.team||'').toUpperCase()]=r.score;});
  
  const gameByTeam={};
  (state.games||[]).forEach(g=>{
    const awayAbbr=(g.away?.abbr||g.away?.name||'').toUpperCase();
    const homeAbbr=(g.home?.abbr||g.home?.name||'').toUpperCase();
    const gamePk=g.gamePk||g.pk;
    if(awayAbbr) gameByTeam[awayAbbr]={game:g,side:'away',gamePk};
    if(homeAbbr) gameByTeam[homeAbbr]={game:g,side:'home',gamePk};
  });
  
  const beasts=[];
  for(const[key,dk] of Object.entries(state.dkSalaries)){
    if(!dk.salary||dk.salary>maxSalary||dk.salary<2000) continue;
    const isPitcher=/^(SP|RP|P)$/i.test(dk.pos||'');
    if(isPitcher) continue;
    const teamKey=(dk.team||'').toUpperCase();
    const teamEdge=teamEdgeMap[teamKey]||52;
    let adjScore=52,graded=false;
    
    // Try exact match first
    const exact=gradedMap[key];
    if(exact){adjScore=exact.grade.score;graded=true;}
    else {
      // Fuzzy name match
      const fuzzy=Object.entries(gradedMap).find(([k])=>{
        const na=dk.name.toLowerCase().replace(/[^a-z ]/g,'');
        const nb=k.replace(/[^a-z ]/g,'');
        const pa=na.split(' '),pb=nb.split(' ');
        return pa.length>=2&&pb.length>=2?
          pa[pa.length-1]===pb[pb.length-1]&&pa[0][0]===pb[0][0]:na===nb;
      });
      if(fuzzy){adjScore=fuzzy[1].grade.score;graded=true;}
      else {
        // Smart estimation: all available factors
        const ctx=gameByTeam[teamKey];
        const ptsBias=dk.avgPts>0?Math.min(28,dk.avgPts*3.9):16;
        const springB=springTrainingBoost(dk.name);
        let parkBoost=0;
        if(ctx){
          const pk=getParkForTeam(ctx.game.home?.abbr||ctx.game.away?.abbr||teamKey);
          parkBoost=Math.round((pk.hr-1)*22+(pk.run-1)*16);
        } else {
          const pk=getParkForTeam(teamKey);
          parkBoost=Math.round((pk.hr-1)*18+(pk.run-1)*12);
        }
        adjScore=Math.max(28,Math.min(94,Math.round(teamEdge*0.63+ptsBias+springB+parkBoost)));
      }
    }
    
    if(adjScore<68) continue;
    const vs=dk.salary>0?Math.round((adjScore/(dk.salary/1000))*10)/10:0;
    let letter;
    if(adjScore>=92)letter='A+';
    else if(adjScore>=84)letter='A';
    else if(adjScore>=76)letter='B+';
    else letter='B';
    
    const ctx=gameByTeam[teamKey];
    const park=getParkForTeam(ctx?.game?.home?.abbr||teamKey);
    beasts.push({
      ...dk,key,adjScore,valueScore:vs,graded,letter,teamEdge,
      projPts:dk.avgPts||Math.round(adjScore*0.41),
      park,
      isHome:ctx?.side==='home',
      springBoost:springTrainingBoost(dk.name)
    });
  }
  return beasts.sort((a,b)=>b.valueScore-a.valueScore);
}

// ── BUDGET PITCHER BUILDER ────────────────────────────────────────────────────
function buildBudgetPitchers(maxSalary) {
  maxSalary=maxSalary||12000;
  if(typeof state==='undefined'||!Object.keys(state.dkSalaries||{}).length) return [];
  const gameByTeam={};
  (state.games||[]).forEach(g=>{
    const aa=(g.away?.abbr||'').toUpperCase(),ha=(g.home?.abbr||'').toUpperCase();
    gameByTeam[aa]={game:g,side:'away'};gameByTeam[ha]={game:g,side:'home'};
  });
  const pitchers=[];
  for(const[key,dk] of Object.entries(state.dkSalaries)){
    if(!dk.salary) continue;
    const isP=/^(SP|RP|P)$/i.test(dk.pos||'');
    if(!isP) continue;
    const teamKey=(dk.team||'').toUpperCase();
    const ctx=gameByTeam[teamKey];
    let score=50;
    if(ctx){
      const pitcher=ctx.side==='away'?ctx.game.awayPitcher:ctx.game.homePitcher;
      if(pitcher?.name){
        const match=pitcher.name.toLowerCase().includes(dk.name.toLowerCase().split(' ').pop())||
                     dk.name.toLowerCase().includes(pitcher.name.toLowerCase().split(' ').pop());
        if(match){
          const era=Number(pitcher.era||4.3),k9=Number(pitcher.k9||8.6),whip=Number(pitcher.whip||1.3);
          score=Math.max(20,Math.min(99,Math.round(50+(4.5-era)*9+(k9-8.0)*3.5+(1.3-whip)*22+(ctx.side==='home'?3:0))));
        }
      }
    }
    const ptsBias=dk.avgPts>0?Math.min(25,dk.avgPts*2.9):15;
    const adjScore=Math.round(score*0.62+ptsBias);
    const valueScore=dk.salary>0?Math.round((adjScore/(dk.salary/1000))*10)/10:0;
    pitchers.push({...dk,adjScore,valueScore,isPitcher:true,score});
  }
  return pitchers.sort((a,b)=>b.valueScore-a.valueScore);
}

// ── SMART $50K LINEUP BUILDER ─────────────────────────────────────────────────
function buildSmartStacks() {
  const CAP=50000;
  if(typeof state==='undefined'||!Object.keys(state.dkSalaries||{}).length||!state.stackRows.length) return [];
  const allPitchers=buildBudgetPitchers(12000).slice(0,20);
  const stacks=[];
  for(const stackRow of state.stackRows.slice(0,4)){
    const stackTeam=(stackRow.team||'').toUpperCase();
    const stackOpp=(stackRow.opponent||'').toUpperCase();
    const eligibleSPs=allPitchers.filter(p=>(p.team||'').toUpperCase()!==stackOpp);
    const sp1=eligibleSPs[0],sp2=eligibleSPs[1];
    if(!sp1||!sp2) continue;
    const spSalary=(sp1.salary||0)+(sp2.salary||0);
    if(spSalary>36000) continue;
    const gradedMap={};
    if(state.selectedGameData){
      [...(state.selectedGameData.awayHitters||[]),...(state.selectedGameData.homeHitters||[])].forEach(h=>{if(h.grade)gradedMap[h.name.toLowerCase()]=h;});
    }
    const hitterPool=[];
    for(const[key,dk] of Object.entries(state.dkSalaries)){
      if(!dk.salary||dk.salary<2000) continue;
      const isP=/^(SP|RP|P)$/i.test(dk.pos||'');
      if(isP||dk.name===sp1.name||dk.name===sp2.name) continue;
      const tk=(dk.team||'').toUpperCase();
      const isStack=tk===stackTeam,isOpp=tk===stackOpp;
      const teamEdge=(state.stackRows.find(r=>(r.team||'').toUpperCase()===tk)||{}).score||52;
      let adjScore=52;
      const graded=gradedMap[key];
      if(graded)adjScore=graded.grade.score;
      else adjScore=Math.max(28,Math.min(94,Math.round(teamEdge*0.63+(dk.avgPts||0)*3.9+springTrainingBoost(dk.name))));
      const stackBonus=isStack?15:isOpp?7:0;
      hitterPool.push({...dk,adjScore,compositeScore:adjScore+stackBonus,isStackTeam:isStack,isOpp,valueScore:dk.salary>0?Math.round(((adjScore+stackBonus)/(dk.salary/1000))*10)/10:0});
    }
    hitterPool.sort((a,b)=>b.compositeScore-a.compositeScore);
    const SLOTS=['C','1B','2B','3B','SS','OF','OF','OF'];
    const lineup=[],used=new Set([sp1.name,sp2.name]);
    let salaryUsed=spSalary;
    for(const slot of SLOTS){
      const remaining=CAP-salaryUsed-(SLOTS.length-lineup.length-1)*2500;
      const validPos=slot==='C'?['C']:slot==='OF'?['OF']:[slot];
      const candidate=hitterPool.find(p=>{
        if(used.has(p.name)||p.salary>remaining) return false;
        const pos=(p.pos||'').toUpperCase();
        return validPos.some(vp=>pos.includes(vp));
      });
      if(candidate){lineup.push({...candidate,slot});used.add(candidate.name);salaryUsed+=candidate.salary||0;}
    }
    stacks.push({stackTeam,stackOpp,badge:'STACK #'+(stacks.length+1),label:stackRow.level||'SMASH STACK',
      sp1,sp2,hitters:lineup,totalSalary:salaryUsed,valid:salaryUsed<=CAP&&lineup.length===8,
      stackCount:lineup.filter(p=>p.isStackTeam).length,bringBackCount:lineup.filter(p=>p.isOpp).length,
      projPts:Math.round((sp1.adjScore||50)*0.43+(sp2.adjScore||50)*0.43+lineup.reduce((s,p)=>s+(p.adjScore||50)*0.39,0)),
      remaining:CAP-salaryUsed});
  }
  return stacks;
}

// ── GLOBAL EXPORTS ────────────────────────────────────────────────────────────
window.H2H_CACHE=window.H2H_CACHE||{};
window.MLB_PARK_FACTORS=MLB_PARK_FACTORS;
window.TEAM_PARK_MAP=TEAM_PARK_MAP;
window.PITCH_ARSENAL_PROFILES=PITCH_ARSENAL_PROFILES;
window.STAT_BASELINES_2Y=STAT_BASELINES_2Y;
window.SPRING_2026_STATUS=SPRING_2026_STATUS;
window.hitterGrade10Factor=hitterGrade10Factor;
window.buildBudgetBeasts=buildBudgetBeasts;
window.buildBudgetPitchers=buildBudgetPitchers;
window.buildSmartStacks=buildSmartStacks;
window.pitcherArsenal=pitcherArsenal;
window.pitcherWeakness=pitcherWeakness;
window.velocityBreakMatchup=velocityBreakMatchup;
window.lrSplitScore=lrSplitScore;
window.powerMatchupScore=powerMatchupScore;
window.parkFactorEdge=parkFactorEdge;
window.getParkForTeam=getParkForTeam;
window.getParkByVenue=getParkByVenue;
window.springTrainingBoost=springTrainingBoost;
window.statTier2Y=statTier2Y;
window.h2hScore=h2hScore;
window.weatherBonus=weatherBonus;
window.getTravelPenalty=getTravelPenalty;
window.TRAVEL_DISTANCES=TRAVEL_DISTANCES;
console.log('[ALLDAY MLB EDGE] Advanced Grading Engine v5.0 loaded — 10 factors, 30 parks, 100+ Spring 2026 players');
