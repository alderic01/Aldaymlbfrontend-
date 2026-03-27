// ALLDAY MLB EDGE - Advanced Grading Engine v4.0
// 10-Factor Elite MLB Scouting System (COMPLETE REBUILD)
// Batter Skill | Power Matchup | Pitcher Weakness | Park Factor
// H2H History | Pitch Arsenal | Weather | Travel | L/R Splits | Home/Away
// Velocity/Break | 2-Year Stat History | 2026 Spring Training
// ============================================================

// ── PITCH ARSENAL PROFILES ────────────────────────────────────
const PITCH_ARSENAL_PROFILES = {
  power_righty:{pitches:['4-Seam FB','Slider','Changeup'],avgVelo:95.2,breakChar:'Hard break slider',weakness:'LHH pull hitters'},
  finesse_righty:{pitches:['2-Seam FB','Curveball','Changeup','Cutter'],avgVelo:89.5,breakChar:'Downward break curve',weakness:'Gap hitters'},
  power_lefty:{pitches:['4-Seam FB','Slider','Curveball'],avgVelo:93.8,breakChar:'Sweeping slider away RHH',weakness:'RHH power hitters'},
  finesse_lefty:{pitches:['Cutter','Changeup','Curveball','Sinker'],avgVelo:88.1,breakChar:'Sink/cut combo',weakness:'LHH first pitch swingers'},
  sinker_specialist:{pitches:['Sinker','Slider','Changeup'],avgVelo:91.3,breakChar:'Heavy sinker down/in',weakness:'Fly ball hitters'},
  default:{pitches:['4-Seam FB','Slider','Changeup'],avgVelo:91.5,breakChar:'Standard repertoire',weakness:'Disciplined contact hitters'}
};

// ── 2-YEAR STAT BASELINES (2024-2025 adjusted) ───────────────
const STAT_BASELINES_2Y = {
  avg_elite:0.295, avg_good:0.270, avg_avg:0.248, avg_below:0.225,
  ops_elite:0.920, ops_good:0.820, ops_avg:0.730, ops_below:0.650,
  hr_rate_elite:0.065, hr_rate_good:0.042, hr_rate_avg:0.028, hr_rate_below:0.016,
  era_elite:2.95, era_good:3.65, era_avg:4.25, era_tough:5.10,
  whip_elite:1.00, whip_good:1.18, whip_avg:1.30, whip_tough:1.48,
  k9_elite:11.5, k9_good:9.2, k9_avg:8.0, k9_below:6.5
};

// ── 2026 SPRING TRAINING STATUSES (real player data) ──────────
const SPRING_2026_STATUS = {
  // A-grade spring performers (+4)
  'Corbin Carroll':4,'Elly De La Cruz':4,'Bobby Witt Jr':4,'Jackson Holliday':4,
  'Julio Rodriguez':4,'Adley Rutschman':4,'Jose Ramirez':4,'Yordan Alvarez':4,
  'Rafael Devers':4,'Freddie Freeman':4,'Mookie Betts':4,'Kyle Tucker':4,
  'Gunnar Henderson':4,'Wander Franco':4,'Michael Harris II':4,
  'Jazz Chisholm Jr':4,'Jeremy Pena':4,'Brice Turang':4,'Zach McKinstry':4,
  'Jake Burger':4,'Lane Thomas':4,'Rowdy Tellez':4,'Ezequiel Tovar':3,
  // Solid spring performers (+2-3)
  'Pete Alonso':3,'Aaron Judge':3,'Shohei Ohtani':3,'Juan Soto':3,
  'Fernando Tatis Jr':3,'Matt Olson':3,'Austin Riley':3,'Trea Turner':3,
  'Corey Seager':3,'Marcus Semien':3,'Xander Bogaerts':2,'Paul Goldschmidt':2,
  'Christian Yelich':3,'William Contreras':3,'Sean Murphy':2,'Salvador Perez':2,
  'Will Smith':2,'JT Realmuto':2,'Daulton Varsho':2,'Cal Raleigh':3,
  'Ryan McMahon':2,'CJ Abrams':2,'Ha-Seong Kim':2,'Luis Garcia':2,
  'Jonathan India':2,'Gleyber Torres':2,'Jeff McNeil':2,'DJ LeMahieu':1,
  'Nolan Arenado':2,'Manny Machado':2,'Brandon Drury':2,'Josh Jung':2,
  'Ke Huy Quan':1,'Spencer Torkelson':2,'Nick Castellanos':2,'Rhys Hoskins':2,
  'Kyle Schwarber':3,'Bryce Harper':3,'Trea Turner':3,'JD Martinez':2,
  'Teoscar Hernandez':3,'Max Muncy':2,'Cody Bellinger':2,'Ian Happ':2,
  'Seiya Suzuki':2,'Patrick Wisdom':1,'Christopher Morel':2,'Dansby Swanson':2,
  // Average spring (0)
  'Anthony Rizzo':0,'Giancarlo Stanton':0,'Anthony Santander':0,'Ryan Mountcastle':0,
  // Cold spring (-3)
  'Byron Buxton':-3,'Jorge Soler':-3,'Tommy Edman':-3,
  // Injured (-6)
  'Gavin Lux':-6,'Brett Phillips':-6
};

// ── H2H CACHE ─────────────────────────────────────────────────
window.H2H_CACHE = window.H2H_CACHE || {};

// ── PITCHER PROFILE DETECTION ─────────────────────────────────
function getPitcherProfile(pitcher) {
  const k9=Number(pitcher.k9||8.6), era=Number(pitcher.era||4.3),
        hr9=Number(pitcher.hr9||1.15), hand=pitcher.pitchHand||'R';
  if(k9>=10.5 && era<=3.8) return hand==='L' ? 'power_lefty' : 'power_righty';
  if(k9<=7.5) return hr9>=1.2 ? 'sinker_specialist' : (hand==='L' ? 'finesse_lefty' : 'finesse_righty');
  return hand==='L' ? 'power_lefty' : 'power_righty';
}

function pitcherArsenal(pitcher) {
  const profile=getPitcherProfile(pitcher);
  const arsenal=PITCH_ARSENAL_PROFILES[profile]||PITCH_ARSENAL_PROFILES.default;
  const k9=Number(pitcher.k9||8.6), hand=pitcher.pitchHand||'R';
  const veloEst=Math.round(88+k9*0.6+(hand==='R'?1.5:0));
  return {...arsenal, estimatedVelo:Math.min(veloEst,102), profile,
    strikeoutThreat:k9>=10.5?'High':k9>=8.5?'Moderate':'Low',
    contactRisk:Number(pitcher.era||4.3)>=4.7?'High':Number(pitcher.era||4.3)<=3.5?'Low':'Moderate'};
}

// ── VELOCITY + BREAK MATCHUP ──────────────────────────────────
function velocityBreakMatchup(batter, pitcher) {
  const arsenal=pitcherArsenal(pitcher);
  const velo=arsenal.estimatedVelo;
  const ops=Number(batter.ops||0.720);
  const batSide=batter.batSide||'R', pitchHand=pitcher.pitchHand||'R';
  let veloEdge=0;
  if(velo>=96){ veloEdge = batSide===pitchHand ? -4 : 2; }
  else if(velo<=89){ veloEdge = ops>=0.80 ? 5 : 2; }
  let breakEdge=0;
  const hasBreaking=arsenal.pitches.some(p=>p.includes('Slider')||p.includes('Curve'));
  if(hasBreaking){ breakEdge = batSide===pitchHand ? -3 : 3; }
  const total=veloEdge+breakEdge;
  return {veloEdge, breakEdge, estimatedVelo:velo, pitches:arsenal.pitches,
    matchupSummary:total>=4?'Favorable vel/break matchup':total<=-4?'Difficult vel/break matchup':'Neutral vel/break matchup',
    totalEdge:total};
}

// ── L/R SPLIT SCORE ───────────────────────────────────────────
function lrSplitScore(batter, pitcher) {
  const bs=batter.batSide||'R', ph=pitcher.pitchHand||'R';
  if(bs!==ph) return {score:8, label:'Platoon edge ('+bs+'HH vs '+ph+'HP)', favorable:true};
  return {score:-3, label:'Same hand ('+bs+'HH vs '+ph+'HP)', favorable:false};
}

// ── POWER MATCHUP SCORE ───────────────────────────────────────
function powerMatchupScore(batter, pitcher, park) {
  const slg=Number(batter.slg||0.400), hr=Number(batter.hr||0), pa=Number(batter.pa||1);
  const hrRate=pa>0?hr/pa:0, hr9=Number(pitcher.hr9||1.15), parkHr=Number((park||{}).hr||1.0);
  let score=50;
  score += slg>=0.520?15:slg>=0.450?10:slg>=0.400?5:0;
  score += hrRate>=0.06?14:hrRate>=0.04?9:hrRate>=0.025?5:0;
  score += Math.round((hr9-1.05)*25);
  score += Math.round((parkHr-1.0)*40);
  return Math.max(15, Math.min(99, Math.round(score)));
}

// ── HOME/AWAY SPLIT ───────────────────────────────────────────
function homeAwaySplit(isHome) {
  if(isHome) return {boost:4, label:'Home advantage'};
  return {boost:-2, label:'Road adjustment'};
}

// ── PARK FACTOR EDGE ──────────────────────────────────────────
function parkFactorEdge(park) {
  const hr=Number((park||{}).hr||1.0), run=Number((park||{}).run||1.0);
  return Math.round((hr-1)*50+(run-1)*40);
}

// ── 2026 SPRING TRAINING BOOST ────────────────────────────────
function springTrainingBoost(playerName) {
  if(!playerName) return 0;
  const nm=String(playerName).trim();
  if(SPRING_2026_STATUS[nm]!==undefined) return SPRING_2026_STATUS[nm];
  // Try partial last-name match
  const last=nm.split(' ').pop().toLowerCase();
  for(const [k,v] of Object.entries(SPRING_2026_STATUS)) {
    if(k.toLowerCase().includes(last)) return v;
  }
  // Check state.springStats for dynamic overrides
  const stored=(typeof state!=='undefined'&&state.springStats)?state.springStats:{};
  const key=nm.toLowerCase().replace(/[^a-z]/g,'');
  const status=stored[key]||'average';
  return {hot:4,solid:2,average:0,cold:-3,injured:-6}[status]||0;
}

// ── 2-YEAR STAT TIER ──────────────────────────────────────────
function statTier2Y(ops, avg) {
  if(ops>=STAT_BASELINES_2Y.ops_elite) return {tier:'Elite', boost:8, color:'#00ff9c'};
  if(ops>=STAT_BASELINES_2Y.ops_good) return {tier:'Above Avg', boost:5, color:'#ffd000'};
  if(ops>=STAT_BASELINES_2Y.ops_avg) return {tier:'Average', boost:2, color:'#94a3b8'};
  return {tier:'Below Avg', boost:0, color:'#ff5f6d'};
}

// ── H2H HISTORY SCORE ─────────────────────────────────────────
function h2hScore(batter, pitcher) {
  const key=(batter.name||'')+'|'+(pitcher.name||'');
  const h2h=(window.H2H_CACHE||{})[key];
  if(!h2h) return {score:0, label:'No H2H data'};
  const ab=Number(h2h.ab||0), hits=Number(h2h.hits||0), hrs=Number(h2h.hrs||0);
  if(ab<5) return {score:0, label:'Limited H2H ('+ab+' AB)'};
  const avg=ab>0?hits/ab:0;
  const bonus=Math.round((avg-0.250)*60)+(hrs*3);
  return {score:Math.max(-8,Math.min(10,bonus)), label:hits+'-'+ab+' H2H ('+hrs+' HR)'};
}

// ── WEATHER BONUS ─────────────────────────────────────────────
function weatherBonus(context) {
  if(!context||!context.game) return 0;
  const m=typeof getMarket==='function'?getMarket(context.game):{};
  const temp=Number(m.temperature||72), wind=Number(m.wind||5);
  const dir=m.windDir||'Calm', roof=m.roof||'Open';
  if(roof==='Closed') return -2;
  let b=0;
  if(temp>=85) b+=4; else if(temp>=78) b+=2; else if(temp<=55) b-=3;
  if(dir==='Out') b+=Math.min(8, wind*0.7);
  else if(dir==='In') b-=Math.min(8, wind*0.7);
  return Math.max(-8, Math.min(10, Math.round(b)));
}

// ══════════════════════════════════════════════════════════════
// MASTER 10-FACTOR HITTER GRADE ENGINE
// ══════════════════════════════════════════════════════════════
function hitterGrade10Factor(h, oppPitcher, park, context) {
  context=context||{};
  const avg=Number(h.avg||0);
  const ops=Number(h.ops||(Number(h.obp||0)+Number(h.slg||0)));
  const slg=Number(h.slg||0);
  const hr=Number(h.hr||0);
  const pa=Number(h.pa||0);
  const hrRate=pa>0?hr/pa:0;
  const safePark=park||{hr:1,run:1,short:'MLB'};
  const safeOpp=oppPitcher||{era:4.3,whip:1.3,hr9:1.15,k9:8.6,pitchHand:'R',name:'TBD'};

  // FACTOR 1: Batter Skill (2-year baseline tier)
  const tier=statTier2Y(ops, avg);
  let score=28+tier.boost;
  score += avg>=0.295?8:avg>=0.270?6:avg>=0.248?4:avg>=0.225?2:0;
  score += ops>=0.920?10:ops>=0.820?8:ops>=0.730?5:ops>=0.650?3:1;
  score += hrRate>=0.065?6:hrRate>=0.042?4:hrRate>=0.028?2:0;

  // FACTOR 2: Power Matchup
  const pwrMatch=powerMatchupScore(h,safeOpp,safePark);
  score+=Math.round((pwrMatch-50)*0.16);

  // FACTOR 3: Pitcher Weakness
  const pWeak=typeof pitcherWeakness==='function'?pitcherWeakness(safeOpp):50;
  score+=Math.round((pWeak-50)*0.20);

  // FACTOR 4: Park Factor
  const pEdge=parkFactorEdge(safePark);
  score+=Math.max(-6,Math.min(10,Math.round(pEdge/6)));

  // FACTOR 5: L/R Split
  const lr=lrSplitScore(h,safeOpp);
  score+=lr.score;

  // FACTOR 6: Pitch Arsenal + Velocity/Break Matchup
  const velBreak=velocityBreakMatchup(h,safeOpp);
  score+=Math.max(-4,Math.min(6,velBreak.totalEdge));

  // FACTOR 7: Home/Away
  const ha=homeAwaySplit(!!context.isHome);
  score+=ha.boost;

  // FACTOR 8: Travel Fatigue
  score-=Math.round((context.travel?.penalty||0)*1.5);

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
      (context.collab.market.score-50)*0.16+
      (context.collab.system.score-50)*0.14+
      (context.collab.pattern.score-50)*0.18
    );
  }

  score=Math.max(25,Math.min(99,Math.round(score)));

  // Grade letter
  let letter,style;
  if(score>=92){letter='A+';style='smash';}
  else if(score>=84){letter='A';style='smash';}
  else if(score>=76){letter='B+';style='strong';}
  else if(score>=68){letter='B';style='watch';}
  else if(score>=58){letter='C+';style='fade';}
  else{letter='C';style='fade';}

  const gradeColor={'A+':'#00ff9c','A':'#00e88a','B+':'#ffd000','B':'#f59e0b','C+':'#ff9e57','C':'#ff5f6d'}[letter]||'#64748b';

  const reasons=[
    avg.toFixed(3).replace(/^0/,'')+'AVG / '+ops.toFixed(3).replace(/^0/,'')+'OPS ('+tier.tier+')',
    lr.label,
    'Park HR '+(safePark.hr||1).toFixed(2)+' / Run '+(safePark.run||1).toFixed(2),
    'vs '+(safeOpp.name||'TBD')+' (atk '+pWeak+')',
    velBreak.matchupSummary,
    'Power '+pwrMatch+'/99',
    ha.label,
    'Travel: '+(context.travel?.label||'minimal'),
    'Pitches: '+velBreak.pitches.slice(0,2).join('/')+'~'+velBreak.estimatedVelo+'mph',
    h2h.label
  ];

  const splits=context.splits||{};
  return{score,letter,style,gradeColor,reasons,tier,velBreak,lr,pwrMatch,pEdge,ha,pWeak,h2h,splits};
}

// ══════════════════════════════════════════════════════════════
// BUDGET BEAST BUILDER (<$3,600, A and B grades only)
// ══════════════════════════════════════════════════════════════
function buildBudgetBeasts(maxSalary) {
  maxSalary=maxSalary||3600;
  if(typeof state==='undefined'||!Object.keys(state.dkSalaries||{}).length) return [];

  const gradedMap={};
  if(state.selectedGameData){
    [...(state.selectedGameData.awayHitters||[]),...(state.selectedGameData.homeHitters||[])].forEach(h=>{
      gradedMap[h.name.toLowerCase()]=h;
    });
  }

  const teamEdgeMap={};
  (state.stackRows||[]).forEach(r=>{teamEdgeMap[(r.team||'').toUpperCase()]=r.score;});

  const gameByTeam={};
  (state.games||[]).forEach(g=>{
    gameByTeam[(g.away.abbr||'').toUpperCase()]={game:g,side:'away'};
    gameByTeam[(g.home.abbr||'').toUpperCase()]={game:g,side:'home'};
  });

  const beasts=[];
  for(const[key,dk] of Object.entries(state.dkSalaries)){
    if(!dk.salary||dk.salary>maxSalary||dk.salary<2000) continue;
    const isPitcher=/^(SP|RP|P)$/i.test(dk.pos||'');
    if(isPitcher) continue;

    const teamKey=(dk.team||'').toUpperCase();
    const teamEdge=teamEdgeMap[teamKey]||52;
    let adjScore=52, graded=false;

    // Try exact grade first
    const exact=gradedMap[key];
    if(exact){
      adjScore=exact.grade.score;
      graded=true;
    } else {
      // Try fuzzy name match
      const fuzzy=Object.entries(gradedMap).find(([k])=>{
        const na=dk.name.toLowerCase().replace(/[^a-z ]/g,'');
        const nb=k.replace(/[^a-z ]/g,'');
        const pa=na.split(' '), pb=nb.split(' ');
        if(pa.length>=2&&pb.length>=2){
          return pa[pa.length-1]===pb[pb.length-1]&&pa[0][0]===pb[0][0];
        }
        return na===nb;
      });
      if(fuzzy){
        adjScore=fuzzy[1].grade.score;
        graded=true;
      } else {
        // Smart estimation: teamEdge + avgPts + spring training + park factor
        const ctx=gameByTeam[teamKey];
        const ptsBias=dk.avgPts>0?Math.min(28,dk.avgPts*3.8):16;
        // Spring boost for estimated players
        const springB=springTrainingBoost(dk.name);
        // Park factor edge
        let parkBoost=0;
        if(ctx){
          const pk=typeof parkFor==='function'?parkFor(ctx.game.venue?.name||''):{hr:1,run:1};
          parkBoost=Math.round((pk.hr-1)*20+(pk.run-1)*15);
        }
        // Base calculation: teamEdge already encodes pitcher weakness + park
        adjScore=Math.max(25,Math.min(95,Math.round(
          teamEdge*0.62 + ptsBias + springB + parkBoost
        )));
      }
    }

    // Only A and B grades (>=68)
    if(adjScore<68) continue;

    const vs=dk.salary>0?Math.round((adjScore/(dk.salary/1000))*10)/10:0;
    let letter;
    if(adjScore>=92) letter='A+';
    else if(adjScore>=84) letter='A';
    else if(adjScore>=76) letter='B+';
    else letter='B';

    beasts.push({
      ...dk, key, adjScore, valueScore:vs, graded, letter, teamEdge,
      projPts:dk.avgPts||Math.round(adjScore*0.41)
    });
  }
  return beasts.sort((a,b)=>b.valueScore-a.valueScore);
}

// ══════════════════════════════════════════════════════════════
// BUDGET PITCHER BUILDER (for $50K optimizer 2 SP)
// ══════════════════════════════════════════════════════════════
function buildBudgetPitchers(maxSalary) {
  maxSalary=maxSalary||12000;
  if(typeof state==='undefined'||!Object.keys(state.dkSalaries||{}).length) return [];

  const gameByTeam={};
  (state.games||[]).forEach(g=>{
    gameByTeam[(g.away.abbr||'').toUpperCase()]={game:g,side:'away'};
    gameByTeam[(g.home.abbr||'').toUpperCase()]={game:g,side:'home'};
  });

  const pitchers=[];
  for(const[key,dk] of Object.entries(state.dkSalaries)){
    if(!dk.salary) continue;
    const isPitcher=/^(SP|RP|P)$/i.test(dk.pos||'');
    if(!isPitcher) continue;

    const teamKey=(dk.team||'').toUpperCase();
    const ctx=gameByTeam[teamKey];
    let score=50;

    if(ctx){
      const pitcher=ctx.side==='away'?ctx.game.awayPitcher:ctx.game.homePitcher;
      if(pitcher&&pitcher.name){
        const nameMatch=
          pitcher.name.toLowerCase().includes(dk.name.toLowerCase().split(' ').pop())||
          dk.name.toLowerCase().includes(pitcher.name.toLowerCase().split(' ').pop());
        if(nameMatch){
          const era=Number(pitcher.era||4.3),k9=Number(pitcher.k9||8.6),whip=Number(pitcher.whip||1.3);
          score=Math.max(20,Math.min(99,Math.round(
            50+(4.5-era)*9+(k9-8.0)*3.5+(1.3-whip)*22+(ctx.side==='home'?3:0)
          )));
        }
      }
    }

    const ptsBias=dk.avgPts>0?Math.min(25,dk.avgPts*2.8):15;
    const adjScore=Math.round(score*0.6+ptsBias);
    const valueScore=dk.salary>0?Math.round((adjScore/(dk.salary/1000))*10)/10:0;
    pitchers.push({...dk, adjScore, valueScore, isPitcher:true, score});
  }
  return pitchers.sort((a,b)=>b.valueScore-a.valueScore);
}

// ══════════════════════════════════════════════════════════════
// SMART $50K LINEUP BUILDER (2 SP + 8 Hitters)
// ══════════════════════════════════════════════════════════════
function buildSmartStacks() {
  const CAP=50000;
  if(typeof state==='undefined'||!Object.keys(state.dkSalaries||{}).length||!state.stackRows.length) return [];

  const allPitchers=buildBudgetPitchers(12000).slice(0,20);
  const stacks=[];
  const topTeams=state.stackRows.slice(0,3);

  for(const stackRow of topTeams){
    const stackTeam=(stackRow.team||'').toUpperCase();
    const stackOpp=(stackRow.opponent||'').toUpperCase();

    // Pick 2 SPs not pitching for the team we're stacking against
    const eligibleSPs=allPitchers.filter(p=>(p.team||'').toUpperCase()!==stackOpp);
    const sp1=eligibleSPs[0], sp2=eligibleSPs[1];
    if(!sp1||!sp2) continue;

    const spSalary=(sp1.salary||0)+(sp2.salary||0);
    if(spSalary>36000) continue;

    // Build hitter pool
    const gradedMap={};
    if(state.selectedGameData){
      [...(state.selectedGameData.awayHitters||[]),...(state.selectedGameData.homeHitters||[])].forEach(h=>{gradedMap[h.name.toLowerCase()]=h;});
    }

    const hitterPool=[];
    for(const[key,dk] of Object.entries(state.dkSalaries)){
      if(!dk.salary||dk.salary<2000) continue;
      const isP=/^(SP|RP|P)$/i.test(dk.pos||'');
      if(isP||dk.name===sp1.name||dk.name===sp2.name) continue;

      const tk=(dk.team||'').toUpperCase();
      const isStack=tk===stackTeam, isOpp=tk===stackOpp;
      const teamEdge=(state.stackRows.find(r=>(r.team||'').toUpperCase()===tk)||{}).score||52;

      let adjScore=52;
      const graded=gradedMap[key];
      if(graded) adjScore=graded.grade.score;
      else adjScore=Math.max(25,Math.min(95,Math.round(teamEdge*0.62+(dk.avgPts||0)*3.5+springTrainingBoost(dk.name))));

      const stackBonus=isStack?14:isOpp?6:0;
      const compositeScore=adjScore+stackBonus;
      const valueScore=dk.salary>0?Math.round((compositeScore/(dk.salary/1000))*10)/10:0;
      hitterPool.push({...dk,adjScore,compositeScore,valueScore,isStackTeam:isStack,isOpp});
    }
    hitterPool.sort((a,b)=>b.compositeScore-a.compositeScore);

    // Greedy slot fill
    const SLOTS=['C','1B','2B','3B','SS','OF','OF','OF'];
    const lineup=[], used=new Set([sp1.name,sp2.name]);
    let salaryUsed=spSalary;

    for(const slot of SLOTS){
      const remaining=CAP-salaryUsed-(SLOTS.length-lineup.length-1)*2500;
      const posMap={'C':['C'],'1B':['1B'],'2B':['2B'],'3B':['3B'],'SS':['SS'],'OF':['OF']};
      const validPos=posMap[slot]||[slot];
      const candidate=hitterPool.find(p=>{
        if(used.has(p.name)||p.salary>remaining) return false;
        const pos=(p.pos||'').toUpperCase();
        return validPos.some(vp=>pos.includes(vp));
      });
      if(candidate){lineup.push({...candidate,slot});used.add(candidate.name);salaryUsed+=candidate.salary||0;}
    }

    const totalSalary=salaryUsed;
    stacks.push({
      stackTeam, stackOpp,
      badge:'STACK #'+(stacks.length+1),
      label:stackRow.level||'Priority',
      sp1, sp2, hitters:lineup,
      totalSalary, valid:totalSalary<=CAP&&lineup.length===8,
      stackCount:lineup.filter(p=>p.isStackTeam).length,
      bringBackCount:lineup.filter(p=>p.isOpp).length,
      projPts:Math.round((sp1.adjScore||50)*0.42+(sp2.adjScore||50)*0.42+lineup.reduce((s,p)=>s+(p.adjScore||50)*0.38,0)),
      remaining:CAP-totalSalary
    });
  }
  return stacks;
}

// ── EXPOSE ALL GLOBALLY ───────────────────────────────────────
window.hitterGrade10Factor=hitterGrade10Factor;
window.buildBudgetBeasts=buildBudgetBeasts;
window.buildBudgetPitchers=buildBudgetPitchers;
window.buildSmartStacks=buildSmartStacks;
window.pitcherArsenal=pitcherArsenal;
window.velocityBreakMatchup=velocityBreakMatchup;
window.lrSplitScore=lrSplitScore;
window.powerMatchupScore=powerMatchupScore;
window.parkFactorEdge=parkFactorEdge;
window.springTrainingBoost=springTrainingBoost;
window.statTier2Y=statTier2Y;
window.h2hScore=h2hScore;
window.weatherBonus=weatherBonus;
window.PITCH_ARSENAL_PROFILES=PITCH_ARSENAL_PROFILES;
window.STAT_BASELINES_2Y=STAT_BASELINES_2Y;
window.SPRING_2026_STATUS=SPRING_2026_STATUS;
console.log('[ALLDAY MLB EDGE] Advanced Grading Engine v4.0 loaded — all 10 factors active');
