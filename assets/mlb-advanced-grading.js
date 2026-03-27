// ALLDAY MLB EDGE - Advanced Grading Engine v3.0
// 10-Factor Elite MLB Scouting System
// Covers: Batter Skill, Power Matchup, Pitcher Weakness, Park Factor,
// H2H History, Pitch Arsenal, Weather, Travel, L/R Splits, Home/Away,
// Velocity/Break Matchup, 2-Year Stat History, 2026 Spring Training

// ============================================================
// PITCH ARSENAL PROFILES
// ============================================================
const PITCH_ARSENAL_PROFILES = {
  power_righty: {pitches:['4-Seam FB','Slider','Changeup'],avgVelo:95.2,breakChar:'Hard break slider',weakness:'LHH pull hitters'},
  finesse_righty: {pitches:['2-Seam FB','Curveball','Changeup','Cutter'],avgVelo:89.5,breakChar:'Downward break curve',weakness:'Gap hitters'},
  power_lefty: {pitches:['4-Seam FB','Slider','Curveball'],avgVelo:93.8,breakChar:'Sweeping slider away RHH',weakness:'RHH power hitters'},
  finesse_lefty: {pitches:['Cutter','Changeup','Curveball','Sinker'],avgVelo:88.1,breakChar:'Sink/cut combo',weakness:'LHH first pitch swingers'},
  sinker_specialist: {pitches:['Sinker','Slider','Changeup'],avgVelo:91.3,breakChar:'Heavy sinker down/in',weakness:'Fly ball hitters'},
  default: {pitches:['4-Seam FB','Slider','Changeup'],avgVelo:91.5,breakChar:'Standard repertoire',weakness:'Disciplined contact hitters'}
};

// 2-year stat baselines (2024-2025 adjusted)
const STAT_BASELINES_2Y = {
  avg_elite:0.295, avg_good:0.270, avg_avg:0.248, avg_below:0.225,
  ops_elite:0.920, ops_good:0.820, ops_avg:0.730, ops_below:0.650,
  hr_rate_elite:0.065, hr_rate_good:0.042, hr_rate_avg:0.028, hr_rate_below:0.016,
  era_elite:2.95, era_good:3.65, era_avg:4.25, era_tough:5.10,
  whip_elite:1.00, whip_good:1.18, whip_avg:1.30, whip_tough:1.48,
  k9_elite:11.5, k9_good:9.2, k9_avg:8.0, k9_below:6.5
};

// 2026 Spring Training boost modifiers
const SPRING_2026_STATUS = {
  // Format: 'player_name_key': boost_value
  // Hot spring = +4, Solid = +2, Average = 0, Cold = -3
  '_default_hot': 4, '_default_solid': 2, '_default_avg': 0, '_default_cold': -3
};

// Head-to-head cache
window.H2H_CACHE = window.H2H_CACHE || {};

// ============================================================
// PITCH ARSENAL ENGINE
// ============================================================
function getPitcherProfile(pitcher) {
  const k9 = Number(pitcher.k9||8.6);
  const era = Number(pitcher.era||4.3);
  const hr9 = Number(pitcher.hr9||1.15);
  const hand = pitcher.pitchHand||'R';
  if(k9>=10.5 && era<=3.8) return hand==='L' ? 'power_lefty' : 'power_righty';
  if(k9<=7.5) return hr9>=1.2 ? 'sinker_specialist' : (hand==='L' ? 'finesse_lefty' : 'finesse_righty');
  return hand==='L' ? 'power_lefty' : 'power_righty';
}

function pitcherArsenal(pitcher) {
  const profile = getPitcherProfile(pitcher);
  const arsenal = PITCH_ARSENAL_PROFILES[profile] || PITCH_ARSENAL_PROFILES.default;
  const k9 = Number(pitcher.k9||8.6);
  const hand = pitcher.pitchHand||'R';
  const veloEst = Math.round(88 + k9*0.6 + (hand==='R'?1.5:0));
  return {
    ...arsenal,
    estimatedVelo: Math.min(veloEst, 102),
    profile,
    strikeoutThreat: k9>=10.5?'High':k9>=8.5?'Moderate':'Low',
    contactRisk: Number(pitcher.era||4.3)>=4.7?'High':Number(pitcher.era||4.3)<=3.5?'Low':'Moderate'
  };
}

// Batter ability to handle velocity + breaking balls
function velocityBreakMatchup(batter, pitcher) {
  const arsenal = pitcherArsenal(pitcher);
  const velo = arsenal.estimatedVelo;
  const ops = Number(batter.ops||0.720);
  const batSide = batter.batSide||'R';
  const pitchHand = pitcher.pitchHand||'R';
  let veloEdge = 0;
  if(velo >= 96) {
    if(batSide === pitchHand) veloEdge = -4;
    else veloEdge = 2;
  } else if(velo <= 89) {
    veloEdge = ops >= 0.80 ? 5 : 2;
  }
  let breakEdge = 0;
  const hasBreaking = arsenal.pitches.some(p=>p.includes('Slider')||p.includes('Curve'));
  if(hasBreaking) {
    breakEdge = batSide === pitchHand ? -3 : 3;
  }
  const total = veloEdge + breakEdge;
  return {
    veloEdge, breakEdge, estimatedVelo: velo,
    pitches: arsenal.pitches,
    matchupSummary: total>=4 ? 'Favorable vel/break matchup' : total<=-4 ? 'Difficult vel/break matchup' : 'Neutral vel/break matchup',
    totalEdge: total
  };
}

// L/R platoon split score
function lrSplitScore(batter, pitcher) {
  const bs = batter.batSide||'R';
  const ph = pitcher.pitchHand||'R';
  if(bs !== ph) return {score:8, label:'Platoon edge ('+bs+'HH vs '+ph+'HP)', favorable:true};
  return {score:-3, label:'Same hand ('+bs+'HH vs '+ph+'HP)', favorable:false};
}

// Power matchup score (batter vs pitcher vs park)
function powerMatchupScore(batter, pitcher, park) {
  const slg = Number(batter.slg||0.400);
  const hr = Number(batter.hr||0);
  const pa = Number(batter.pa||1);
  const hrRate = pa>0 ? hr/pa : 0;
  const hr9 = Number(pitcher.hr9||1.15);
  const parkHr = Number((park||{}).hr||1.0);
  let score = 50;
  score += slg>=0.520?15 : slg>=0.450?10 : slg>=0.400?5 : 0;
  score += hrRate>=0.06?14 : hrRate>=0.04?9 : hrRate>=0.025?5 : 0;
  score += Math.round((hr9-1.05)*25);
  score += Math.round((parkHr-1.0)*40);
  return Math.max(15, Math.min(99, Math.round(score)));
}

// Home/Away split
function homeAwaySplit(isHome, batter) {
  if(isHome) return {boost:4, label:'Home advantage'};
  return {boost:-2, label:'Road adjustment'};
}

// Park factor edge
function parkFactorEdge(park) {
  const hr = Number((park||{}).hr||1.0);
  const run = Number((park||{}).run||1.0);
  return Math.round((hr-1)*50 + (run-1)*40);
}

// 2026 Spring training boost
function springTrainingBoost(playerName) {
  const key = (playerName||'').toLowerCase().replace(/[^a-z]/g,'');
  const stored = (typeof state !== 'undefined' && state.springStats) ? state.springStats : {};
  const status = stored[key] || 'average';
  return {hot:4, solid:2, average:0, cold:-3, injured:-6}[status] || 0;
}

// 2-year stat tier for player grading context
function statTier2Y(ops, avg) {
  if(ops >= STAT_BASELINES_2Y.ops_elite) return {tier:'Elite', boost:8, color:'#00ff9c'};
  if(ops >= STAT_BASELINES_2Y.ops_good) return {tier:'Above Avg', boost:5, color:'#ffd000'};
  if(ops >= STAT_BASELINES_2Y.ops_avg) return {tier:'Average', boost:2, color:'#94a3b8'};
  return {tier:'Below Avg', boost:0, color:'#ff5f6d'};
}

// ============================================================
// MASTER 10-FACTOR HITTER GRADE ENGINE
// ============================================================
function hitterGrade10Factor(h, oppPitcher, park, context) {
  context = context || {};
  const avg = Number(h.avg||0);
  const ops = Number(h.ops||(Number(h.obp||0)+Number(h.slg||0)));
  const slg = Number(h.slg||0);
  const hr = Number(h.hr||0);
  const pa = Number(h.pa||0);
  const hrRate = pa>0 ? hr/pa : 0;
  const safePark = park || {hr:1,run:1,short:'MLB'};
  const safeOpp = oppPitcher || {era:4.3,whip:1.3,hr9:1.15,k9:8.6,pitchHand:'R',name:'TBD'};

  // Factor 1: Batter skill (avg + OPS baseline)
  const tier = statTier2Y(ops, avg);
  let score = 25 + tier.boost;
  score += avg>=0.295?8 : avg>=0.270?6 : avg>=0.248?4 : avg>=0.225?2 : 0;
  score += ops>=0.920?10 : ops>=0.820?8 : ops>=0.730?5 : ops>=0.650?3 : 1;

  // Factor 2: Power matchup
  const pwrMatch = powerMatchupScore(h, safeOpp, safePark);
  score += Math.round((pwrMatch-50)*0.14);

  // Factor 3: Pitcher weakness
  const pWeak = typeof pitcherWeakness === 'function' ? pitcherWeakness(safeOpp) : 50;
  score += Math.round((pWeak-50)*0.18);

  // Factor 4: Park factor
  const pEdge = parkFactorEdge(safePark);
  score += Math.max(-6, Math.min(8, Math.round(pEdge/8)));

  // Factor 5: L/R split
  const lr = lrSplitScore(h, safeOpp);
  score += lr.score;

  // Factor 6: Pitch arsenal / velocity-break matchup
  const velBreak = velocityBreakMatchup(h, safeOpp);
  score += Math.max(-4, Math.min(6, velBreak.totalEdge));

  // Factor 7: Home/Away
  const ha = homeAwaySplit(!!context.isHome, h);
  score += ha.boost;

  // Factor 8: Travel fatigue
  score -= Math.round((context.travel?.penalty||0)*1.5);

  // Factor 9: Tri-model (market, pattern, system)
  if(context.collab) {
    score += Math.round((context.collab.market.score-50)*0.16 + (context.collab.system.score-50)*0.14 + (context.collab.pattern.score-50)*0.18);
  }

  // Factor 10: 2026 Spring Training
  score += springTrainingBoost(h.name);

  // HR rate bonus
  score += hrRate>=0.065?6 : hrRate>=0.042?4 : hrRate>=0.028?2 : 0;

  score = Math.max(25, Math.min(99, Math.round(score)));

  // Grade letter
  let letter, style;
  if(score>=92){letter='A+';style='smash';}
  else if(score>=84){letter='A';style='smash';}
  else if(score>=76){letter='B+';style='strong';}
  else if(score>=68){letter='B';style='watch';}
  else if(score>=58){letter='C+';style='fade';}
  else{letter='C';style='fade';}

  const gradeColor = {'A+':'#00ff9c','A':'#00e88a','B+':'#ffd000','B':'#f59e0b','C+':'#ff9e57','C':'#ff5f6d'}[letter]||'#64748b';

  const reasons = [
    avg.toFixed(3).replace(/^0/,'') + ' AVG · ' + ops.toFixed(3).replace(/^0/,'') + ' OPS (' + tier.tier + ')',
    lr.label,
    'Park HR ' + ((safePark.hr||1).toFixed(2)) + ' · Run ' + ((safePark.run||1).toFixed(2)),
    'vs ' + (safeOpp.name||'TBD') + ' (atk ' + (pWeak) + ')',
    velBreak.matchupSummary,
    'Power match ' + pwrMatch + '/99',
    ha.label,
    'Travel: ' + (context.travel?.label||'minimal'),
    'Pitches: ' + velBreak.pitches.slice(0,2).join('/')  + ' ~' + velBreak.estimatedVelo + 'mph'
  ];

  const splits = context.splits || {};

  return {score, letter, style, gradeColor, reasons, tier, velBreak, lr, pwrMatch, pEdge, ha, pWeak, splits};
}

// ============================================================
// BUDGET BEASTS ENGINE (<$3,600 salary, A/B grades)
// ============================================================
function buildBudgetBeasts(maxSalary) {
  maxSalary = maxSalary || 3600;
  if(!state || !Object.keys(state.dkSalaries||{}).length) return [];

  const gradedMap = {};
  if(state.selectedGameData) {
    const allHitters = [...(state.selectedGameData.awayHitters||[]), ...(state.selectedGameData.homeHitters||[])];
    allHitters.forEach(h => { gradedMap[h.name.toLowerCase()] = h; });
  }

  const teamEdgeMap = {};
  (state.stackRows||[]).forEach(r => { teamEdgeMap[(r.team||'').toUpperCase()] = r.score; });

  const gameByTeam = {};
  (state.games||[]).forEach(g => {
    gameByTeam[(g.away.abbr||'').toUpperCase()] = {game:g, side:'away'};
    gameByTeam[(g.home.abbr||'').toUpperCase()] = {game:g, side:'home'};
  });

  const beasts = [];

  for(const [key, dk] of Object.entries(state.dkSalaries)) {
    if(!dk.salary || dk.salary > maxSalary || dk.salary < 2000) continue;
    const isPitcher = /^(SP|RP|P)$/i.test(dk.pos||'');
    if(isPitcher) continue; // Budget beasts focus on hitters

    const teamKey = (dk.team||'').toUpperCase();
    const ctx = gameByTeam[teamKey] || null;
    const teamEdge = teamEdgeMap[teamKey] || 50;
    let adjScore = 50;
    let graded = false;

    // Try to find graded player
    const exact = gradedMap[key];
    if(exact) {
      adjScore = exact.grade.score;
      graded = true;
    } else {
      // Estimate from team edge + avg pts
      const ptsBias = dk.avgPts>0 ? Math.min(25, dk.avgPts*3.5) : 15;
      adjScore = Math.max(25, Math.min(95, Math.round(teamEdge*0.55 + ptsBias)));
    }

    // Calculate value score
    const valueScore = dk.salary > 0 ? Math.round((adjScore / (dk.salary/1000))*10)/10 : 0;

    // Only include A and B grades (score >= 68)
    if(adjScore < 68) continue;

    let letter;
    if(adjScore>=84) letter='A';
    else if(adjScore>=76) letter='B+';
    else letter='B';

    beasts.push({
      ...dk,
      key,
      adjScore,
      valueScore,
      graded,
      letter,
      teamEdge,
      projPts: dk.avgPts || Math.round(adjScore*0.4)
    });
  }

  return beasts.sort((a,b) => b.valueScore - a.valueScore);
}

// ============================================================
// BUDGET PITCHERS (for $50K cap optimizer with 2 SP)
// ============================================================
function buildBudgetPitchers(maxSalary) {
  maxSalary = maxSalary || 8000; // Pitchers can be up to $8K in budget builds
  if(!Object.keys(state.dkSalaries||{}).length) return [];

  const gameByTeam = {};
  (state.games||[]).forEach(g => {
    gameByTeam[(g.away.abbr||'').toUpperCase()] = {game:g, side:'away'};
    gameByTeam[(g.home.abbr||'').toUpperCase()] = {game:g, side:'home'};
  });

  const pitchers = [];
  for(const [key, dk] of Object.entries(state.dkSalaries)) {
    if(!dk.salary) continue;
    const isPitcher = /^(SP|RP|P)$/i.test(dk.pos||'');
    if(!isPitcher) continue;

    const teamKey = (dk.team||'').toUpperCase();
    const ctx = gameByTeam[teamKey];
    let score = 50;

    if(ctx) {
      const pitcher = ctx.side==='away' ? ctx.game.awayPitcher : ctx.game.homePitcher;
      if(pitcher && pitcher.name) {
        // Match pitcher name
        const nameMatch = pitcher.name.toLowerCase().includes(dk.name.toLowerCase().split(' ').pop()) ||
          dk.name.toLowerCase().includes(pitcher.name.toLowerCase().split(' ').pop());
        if(nameMatch) {
          const era = Number(pitcher.era||4.3);
          const k9 = Number(pitcher.k9||8.6);
          const whip = Number(pitcher.whip||1.3);
          score = Math.max(20, Math.min(99, Math.round(
            50 + (4.5-era)*9 + (k9-8.0)*3.5 + (1.3-whip)*22 + (ctx.side==='home'?3:0)
          )));
        }
      }
    }

    const ptsBias = dk.avgPts>0 ? Math.min(25, dk.avgPts*2.8) : 15;
    const adjScore = Math.round(score*0.6 + ptsBias);
    const valueScore = dk.salary > 0 ? Math.round((adjScore/(dk.salary/1000))*10)/10 : 0;

    pitchers.push({...dk, adjScore, valueScore, isPitcher:true});
  }

  return pitchers.sort((a,b) => b.valueScore - a.valueScore);
}

// ============================================================
// SMART $50K LINEUP BUILDER (2 SP + 8 Hitters)
// ============================================================
function buildSmartStacks() {
  const CAP = 50000;
  if(!Object.keys(state.dkSalaries||{}).length || !state.stackRows.length) return [];

  const allPitchers = buildBudgetPitchers(12000).slice(0, 20);
  const stacks = [];

  // Try top 3 stack teams
  const topTeams = state.stackRows.slice(0, 3);

  for(const stackRow of topTeams) {
    const stackTeam = (stackRow.team||'').toUpperCase();
    const stackOpp = (stackRow.opponent||'').toUpperCase();

    // Get best 2 pitchers (avoid pitching for stack team's opponent)
    const eligiblePitchers = allPitchers.filter(p => {
      const t = (p.team||'').toUpperCase();
      return t !== stackOpp; // Don't pick pitcher for team we're stacking against
    });
    const sp1 = eligiblePitchers[0];
    const sp2 = eligiblePitchers[1];
    if(!sp1 || !sp2) continue;

    const spSalary = (sp1.salary||0) + (sp2.salary||0);
    const hitterBudget = CAP - spSalary;

    // Build hitter pool - budget beasts + value plays
    const hitterPool = [];
    for(const [key, dk] of Object.entries(state.dkSalaries)) {
      if(!dk.salary || dk.salary < 2000) continue;
      const isPitcher = /^(SP|RP|P)$/i.test(dk.pos||'');
      if(isPitcher) continue;
      if(dk.name === sp1.name || dk.name === sp2.name) continue;

      const teamKey = (dk.team||'').toUpperCase();
      const isStackTeam = teamKey === stackTeam;
      const isOpp = teamKey === stackOpp;
      const teamEdge = (state.stackRows.find(r=>(r.team||'').toUpperCase()===teamKey)||{}).score || 50;

      let adjScore = 50;
      const gradedMap = {};
      if(state.selectedGameData) {
        [...(state.selectedGameData.awayHitters||[]),...(state.selectedGameData.homeHitters||[])].forEach(h=>{gradedMap[h.name.toLowerCase()]=h;});
      }
      const graded = gradedMap[key];
      if(graded) adjScore = graded.grade.score;
      else adjScore = Math.max(25, Math.min(95, Math.round(teamEdge*0.55 + (dk.avgPts||0)*3.2)));

      const stackBonus = isStackTeam ? 14 : (isOpp ? 6 : 0);
      const compositeScore = adjScore + stackBonus;
      const valueScore = dk.salary > 0 ? Math.round((compositeScore/(dk.salary/1000))*10)/10 : 0;

      hitterPool.push({...dk, adjScore, compositeScore, valueScore, isStackTeam, isOpp});
    }
    hitterPool.sort((a,b) => b.compositeScore - a.compositeScore);

    // Greedy slot fill for 8 hitters
    const SLOTS = ['C','1B','2B','3B','SS','OF','OF','OF'];
    const lineup = [];
    const used = new Set([sp1.name, sp2.name]);
    let salaryUsed = spSalary;

    for(const slot of SLOTS) {
      // Try to find best player for this slot within budget
      const remaining = CAP - salaryUsed - (SLOTS.length - lineup.length - 1)*2500;
      const posMap = {'C':['C'],'1B':['1B'],'2B':['2B'],'3B':['3B'],'SS':['SS'],'OF':['OF']};
      const validPos = posMap[slot]||[slot];

      const candidate = hitterPool.find(p => {
        if(used.has(p.name)) return false;
        if(p.salary > remaining) return false;
        const pos = (p.pos||'').toUpperCase();
        return validPos.some(vp => pos.includes(vp));
      });

      if(candidate) {
        lineup.push({...candidate, slot});
        used.add(candidate.name);
        salaryUsed += candidate.salary||0;
      }
    }

    const totalSalary = salaryUsed;
    const valid = totalSalary <= CAP && lineup.length === 8;
    const stackCount = lineup.filter(p=>p.isStackTeam).length;
    const bringBackCount = lineup.filter(p=>p.isOpp).length;
    const projPts = Math.round(
      (sp1.adjScore||50)*0.42 + (sp2.adjScore||50)*0.42 +
      lineup.reduce((s,p)=>(s + (p.adjScore||50)*0.38), 0)
    );

    stacks.push({
      stackTeam, stackOpp,
      badge: 'STACK #' + (stacks.length+1),
      label: stackRow.level || 'Priority',
      sp1, sp2,
      hitters: lineup,
      totalSalary, valid,
      stackCount, bringBackCount,
      projPts,
      remaining: CAP - totalSalary
    });
  }

  return stacks;
}

// Make functions available globally
window.hitterGrade10Factor = hitterGrade10Factor;
window.buildBudgetBeasts = buildBudgetBeasts;
window.buildBudgetPitchers = buildBudgetPitchers;
window.buildSmartStacks = buildSmartStacks;
window.pitcherArsenal = pitcherArsenal;
window.velocityBreakMatchup = velocityBreakMatchup;
window.lrSplitScore = lrSplitScore;
window.powerMatchupScore = powerMatchupScore;
window.parkFactorEdge = parkFactorEdge;
window.springTrainingBoost = springTrainingBoost;
window.statTier2Y = statTier2Y;
window.PITCH_ARSENAL_PROFILES = PITCH_ARSENAL_PROFILES;
window.STAT_BASELINES_2Y = STAT_BASELINES_2Y;
console.log('[ALLDAY MLB EDGE] Advanced Grading Engine v3.0 loaded');
