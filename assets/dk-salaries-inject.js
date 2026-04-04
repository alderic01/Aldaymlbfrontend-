/**
 * ALLDAY MLB EDGE — DK Salaries Inject
 * Slate: April 4, 2026
 * Games: HOU@ATH, LAD@WSH, SD@BOS, BAL@PIT, KC (no game), MIL (no game)
 */

const DK_SLATE_DATE = "04/04/2026";

const DK_SALARY_DATA = [
// ── PITCHERS ──────────────────────────────────────────────────
{ pos:"SP", name:"Hunter Brown", id:42518168, rosterPos:"P", salary:9700, game:"HOU@ATH", team:"HOU", avgPts:26.7 },
{ pos:"SP", name:"Garrett Crochet", id:42518169, rosterPos:"P", salary:9600, game:"SD@BOS", team:"BOS", avgPts:21.48 },
{ pos:"SP", name:"Paul Skenes", id:42518170, rosterPos:"P", salary:9300, game:"BAL@PIT", team:"PIT", avgPts:4.78 },
{ pos:"SP", name:"Tyler Glasnow", id:42517939, rosterPos:"P", salary:9100, game:"LAD@WSH", team:"LAD", avgPts:18.5 },
{ pos:"SP", name:"Yoshinobu Yamamoto", id:42518171, rosterPos:"P", salary:9100, game:"LAD@WSH", team:"LAD", avgPts:16.2 },
{ pos:"SP", name:"Blake Snell", id:42518172, rosterPos:"P", salary:9100, game:"LAD@WSH", team:"LAD", avgPts:0 },
{ pos:"SP", name:"Cole Ragans", id:42518173, rosterPos:"P", salary:8900, game:"-", team:"KC", avgPts:15.75 },
{ pos:"SP", name:"Sonny Gray", id:42518174, rosterPos:"P", salary:8600, game:"SD@BOS", team:"BOS", avgPts:12.95 },
{ pos:"RP", name:"Bubba Chandler", id:42518175, rosterPos:"P", salary:8500, game:"BAL@PIT", team:"PIT", avgPts:18.15 },
{ pos:"SP", name:"Ronel Blanco", id:42518177, rosterPos:"P", salary:8400, game:"HOU@ATH", team:"HOU", avgPts:0 },
{ pos:"SP", name:"Connelly Early", id:42517940, rosterPos:"P", salary:8400, game:"SD@BOS", team:"BOS", avgPts:17.8 },
{ pos:"SP", name:"Ranger Suarez", id:42518176, rosterPos:"P", salary:8400, game:"SD@BOS", team:"BOS", avgPts:2.95 },
{ pos:"SP", name:"Kyle Bradish", id:42518178, rosterPos:"P", salary:8300, game:"BAL@PIT", team:"BAL", avgPts:9.55 },
{ pos:"SP", name:"Trevor Rogers", id:42518184, rosterPos:"P", salary:8200, game:"BAL@PIT", team:"BAL", avgPts:20.12 },
{ pos:"SP", name:"Chris Bassitt", id:42518181, rosterPos:"P", salary:8200, game:"BAL@PIT", team:"BAL", avgPts:1.15 },
{ pos:"SP", name:"Nick Pivetta", id:42518186, rosterPos:"P", salary:8100, game:"SD@BOS", team:"SD", avgPts:13.1 },
{ pos:"SP", name:"Zach Eflin", id:42518185, rosterPos:"P", salary:8100, game:"BAL@PIT", team:"BAL", avgPts:16.65 },
{ pos:"SP", name:"Roki Sasaki", id:42518187, rosterPos:"P", salary:8000, game:"LAD@WSH", team:"LAD", avgPts:11.4 },
{ pos:"RP", name:"Michael King", id:42518188, rosterPos:"P", salary:8000, game:"SD@BOS", team:"SD", avgPts:14.8 },
{ pos:"SP", name:"Shane Baz", id:42517942, rosterPos:"P", salary:7900, game:"BAL@PIT", team:"BAL", avgPts:7.2 },
{ pos:"SP", name:"Mitch Keller", id:42518202, rosterPos:"P", salary:7400, game:"BAL@PIT", team:"PIT", avgPts:16.6 },
{ pos:"SP", name:"Lance McCullers Jr.", id:42518205, rosterPos:"P", salary:7400, game:"HOU@ATH", team:"HOU", avgPts:32.75 },
{ pos:"SP", name:"Mike Burrows", id:42518207, rosterPos:"P", salary:7300, game:"HOU@ATH", team:"HOU", avgPts:13 },
{ pos:"SP", name:"Emmet Sheehan", id:42518210, rosterPos:"P", salary:7200, game:"LAD@WSH", team:"LAD", avgPts:7.02 },
{ pos:"SP", name:"Foster Griffin", id:42518215, rosterPos:"P", salary:6900, game:"LAD@WSH", team:"WSH", avgPts:17.65 },
{ pos:"SP", name:"Randy Vasquez", id:42517946, rosterPos:"P", salary:6800, game:"SD@BOS", team:"SD", avgPts:30.5 },
{ pos:"SP", name:"Jake Irvin", id:42517947, rosterPos:"P", salary:6300, game:"LAD@WSH", team:"WSH", avgPts:22.85 },
{ pos:"RP", name:"Carmen Mlodzinski", id:42517948, rosterPos:"P", salary:6200, game:"BAL@PIT", team:"PIT", avgPts:18.15 },
{ pos:"SP", name:"Cade Cavalli", id:42518261, rosterPos:"P", salary:6000, game:"LAD@WSH", team:"WSH", avgPts:11.38 },

// ── HITTERS ────────────────────────────────────────────────────
// 1B/OF
{ pos:"1B", name:"Shohei Ohtani", id:42517949, rosterPos:"1B/OF", salary:6500, game:"LAD@WSH", team:"LAD", avgPts:7.43 },
{ pos:"SS", name:"Bobby Witt Jr.", id:42517951, rosterPos:"SS", salary:6200, game:"-", team:"KC", avgPts:6 },
{ pos:"OF", name:"Yordan Alvarez", id:42517952, rosterPos:"OF", salary:5900, game:"HOU@ATH", team:"HOU", avgPts:13.5 },
{ pos:"OF", name:"Roman Anthony", id:42517953, rosterPos:"OF", salary:5800, game:"SD@BOS", team:"BOS", avgPts:5.57 },
{ pos:"SS", name:"Gunnar Henderson", id:42517954, rosterPos:"SS", salary:5700, game:"BAL@PIT", team:"BAL", avgPts:10 },
{ pos:"OF", name:"Fernando Tatis Jr.", id:42517955, rosterPos:"OF", salary:5600, game:"SD@BOS", team:"SD", avgPts:6.14 },
{ pos:"OF", name:"Kyle Tucker", id:42517956, rosterPos:"OF", salary:5500, game:"LAD@WSH", team:"LAD", avgPts:9.14 },
{ pos:"OF", name:"Jarren Duran", id:42517957, rosterPos:"OF", salary:5400, game:"SD@BOS", team:"BOS", avgPts:7.67 },
{ pos:"1B", name:"Pete Alonso", id:42517958, rosterPos:"1B", salary:5400, game:"BAL@PIT", team:"BAL", avgPts:6.57 },
{ pos:"C", name:"Shea Langeliers", id:42517959, rosterPos:"C", salary:5300, game:"HOU@ATH", team:"ATH", avgPts:13.71 },
{ pos:"1B", name:"Nick Kurtz", id:42517960, rosterPos:"1B", salary:5200, game:"HOU@ATH", team:"ATH", avgPts:4 },
{ pos:"3B", name:"Manny Machado", id:42517961, rosterPos:"3B", salary:5200, game:"SD@BOS", team:"SD", avgPts:5.29 },
{ pos:"OF", name:"James Wood", id:42517962, rosterPos:"OF", salary:5100, game:"LAD@WSH", team:"WSH", avgPts:6.71 },
{ pos:"OF", name:"Oneil Cruz", id:42517964, rosterPos:"OF", salary:5000, game:"BAL@PIT", team:"PIT", avgPts:10.71 },
{ pos:"2B", name:"Brice Turang", id:42517967, rosterPos:"2B", salary:4800, game:"-", team:"MIL", avgPts:13.67 },
{ pos:"OF", name:"Wilyer Abreu", id:42517966, rosterPos:"OF", salary:4800, game:"SD@BOS", team:"BOS", avgPts:11.43 },
{ pos:"OF", name:"Brent Rooker", id:42517968, rosterPos:"OF", salary:4700, game:"HOU@ATH", team:"ATH", avgPts:3.14 },
{ pos:"2B", name:"Jose Altuve", id:42517970, rosterPos:"2B", salary:4700, game:"HOU@ATH", team:"HOU", avgPts:10.62 },
{ pos:"SS", name:"Mookie Betts", id:42517969, rosterPos:"SS", salary:4700, game:"LAD@WSH", team:"LAD", avgPts:9 },
{ pos:"C", name:"William Contreras", id:42517973, rosterPos:"C", salary:4600, game:"-", team:"MIL", avgPts:8.67 },
{ pos:"SS", name:"Jeremy Pena", id:42517972, rosterPos:"SS", salary:4600, game:"HOU@ATH", team:"HOU", avgPts:6.25 },
{ pos:"OF", name:"Jackson Merrill", id:42517974, rosterPos:"OF", salary:4600, game:"SD@BOS", team:"SD", avgPts:6.29 },
{ pos:"2B", name:"Brandon Lowe", id:42517971, rosterPos:"2B", salary:4600, game:"BAL@PIT", team:"PIT", avgPts:11.67 },
{ pos:"OF", name:"Tyler Soderstrom", id:42517976, rosterPos:"OF", salary:4500, game:"HOU@ATH", team:"ATH", avgPts:5.14 },
{ pos:"1B", name:"Freddie Freeman", id:42517975, rosterPos:"1B", salary:4500, game:"LAD@WSH", team:"LAD", avgPts:7.71 },
{ pos:"SS", name:"Trevor Story", id:42517977, rosterPos:"SS", salary:4400, game:"SD@BOS", team:"BOS", avgPts:3.86 },
{ pos:"OF", name:"Bryan Reynolds", id:42517978, rosterPos:"OF", salary:4400, game:"BAL@PIT", team:"PIT", avgPts:8 },
{ pos:"SS", name:"CJ Abrams", id:42517980, rosterPos:"SS", salary:4300, game:"LAD@WSH", team:"WSH", avgPts:11.17 },
{ pos:"C", name:"Will Smith", id:42517982, rosterPos:"C", salary:4300, game:"LAD@WSH", team:"LAD", avgPts:6.71 },
{ pos:"OF", name:"Taylor Ward", id:42517979, rosterPos:"OF", salary:4300, game:"BAL@PIT", team:"BAL", avgPts:8.14 },
{ pos:"OF", name:"Teoscar Hernandez", id:42517983, rosterPos:"OF", salary:4200, game:"LAD@WSH", team:"LAD", avgPts:5.43 },
{ pos:"SS", name:"Jacob Wilson", id:42517988, rosterPos:"SS", salary:4100, game:"HOU@ATH", team:"ATH", avgPts:5.29 },
{ pos:"3B", name:"Isaac Paredes", id:42517989, rosterPos:"3B", salary:4100, game:"HOU@ATH", team:"HOU", avgPts:8.17 },
{ pos:"1B", name:"Willson Contreras", id:42517987, rosterPos:"1B", salary:4100, game:"SD@BOS", team:"BOS", avgPts:5.86 },
{ pos:"1B", name:"Ryan O'Hearn", id:42517985, rosterPos:"1B/OF", salary:4100, game:"BAL@PIT", team:"PIT", avgPts:11.67 },
{ pos:"1B", name:"Christian Walker", id:42517990, rosterPos:"1B", salary:4000, game:"HOU@ATH", team:"HOU", avgPts:7.5 },
{ pos:"OF", name:"Ramon Laureano", id:42517992, rosterPos:"OF", salary:4000, game:"SD@BOS", team:"SD", avgPts:9.67 },
{ pos:"3B", name:"Jordan Westburg", id:42518107, rosterPos:"3B", salary:4000, game:"BAL@PIT", team:"BAL", avgPts:0 },
{ pos:"3B", name:"Carlos Correa", id:42517995, rosterPos:"3B/SS", salary:3900, game:"HOU@ATH", team:"HOU", avgPts:7.88 },
{ pos:"OF", name:"Andy Pages", id:42517994, rosterPos:"OF", salary:3900, game:"LAD@WSH", team:"LAD", avgPts:10.57 },
{ pos:"C", name:"Adley Rutschman", id:42517993, rosterPos:"C", salary:3900, game:"BAL@PIT", team:"BAL", avgPts:6.17 },
{ pos:"3B", name:"Max Muncy", id:42517998, rosterPos:"3B", salary:3800, game:"LAD@WSH", team:"LAD", avgPts:5.71 },
{ pos:"OF", name:"Lawrence Butler", id:42517999, rosterPos:"OF", salary:3700, game:"HOU@ATH", team:"ATH", avgPts:5.83 },
{ pos:"OF", name:"Dylan Crews", id:42518110, rosterPos:"OF", salary:3700, game:"LAD@WSH", team:"WSH", avgPts:0 },
{ pos:"OF", name:"Daylen Lile", id:42518001, rosterPos:"OF", salary:3600, game:"LAD@WSH", team:"WSH", avgPts:9.43 },
{ pos:"SS", name:"Xander Bogaerts", id:42518000, rosterPos:"SS", salary:3600, game:"SD@BOS", team:"SD", avgPts:3.14 },
{ pos:"2B", name:"Jackson Holliday", id:42518111, rosterPos:"2B", salary:3600, game:"BAL@PIT", team:"BAL", avgPts:0 },
{ pos:"C", name:"Yainer Diaz", id:42518003, rosterPos:"C", salary:3500, game:"HOU@ATH", team:"HOU", avgPts:5.5 },
{ pos:"2B", name:"Tommy Edman", id:42518112, rosterPos:"2B", salary:3500, game:"LAD@WSH", team:"LAD", avgPts:0 },
{ pos:"SS", name:"Konnor Griffin", id:42518397, rosterPos:"SS", salary:3500, game:"BAL@PIT", team:"PIT", avgPts:11 },
{ pos:"OF", name:"Cam Smith", id:42518008, rosterPos:"OF", salary:3400, game:"HOU@ATH", team:"HOU", avgPts:7.88 },
{ pos:"3B", name:"Max Muncy", id:42518011, rosterPos:"3B", salary:3400, game:"HOU@ATH", team:"ATH", avgPts:10 },
{ pos:"C", name:"Keibert Ruiz", id:42518009, rosterPos:"C", salary:3400, game:"LAD@WSH", team:"WSH", avgPts:7.5 },
{ pos:"2B", name:"Jake Cronenworth", id:42518007, rosterPos:"2B", salary:3400, game:"SD@BOS", team:"SD", avgPts:3.71 },
{ pos:"OF", name:"Tyler O'Neill", id:42518006, rosterPos:"OF", salary:3400, game:"BAL@PIT", team:"BAL", avgPts:6.6 },
{ pos:"1B", name:"Spencer Horwitz", id:42518010, rosterPos:"1B", salary:3400, game:"BAL@PIT", team:"PIT", avgPts:2.33 },
{ pos:"OF", name:"Joey Loperfido", id:42518014, rosterPos:"OF", salary:3300, game:"HOU@ATH", team:"HOU", avgPts:4.57 },
{ pos:"OF", name:"Jake Mangum", id:42518015, rosterPos:"OF", salary:3300, game:"BAL@PIT", team:"PIT", avgPts:3 },
{ pos:"1B", name:"Gavin Sheets", id:42518016, rosterPos:"1B/OF", salary:3200, game:"SD@BOS", team:"SD", avgPts:5.14 },
{ pos:"OF", name:"Ceddanne Rafaela", id:42518019, rosterPos:"OF", salary:3200, game:"SD@BOS", team:"BOS", avgPts:4.86 },
{ pos:"C", name:"Samuel Basallo", id:42518018, rosterPos:"C", salary:3200, game:"BAL@PIT", team:"BAL", avgPts:5.17 },
{ pos:"OF", name:"Marcell Ozuna", id:42518022, rosterPos:"OF", salary:3200, game:"BAL@PIT", team:"PIT", avgPts:2.17 },
{ pos:"C", name:"Gary Sanchez", id:42518026, rosterPos:"C/1B", salary:3100, game:"-", team:"MIL", avgPts:13 },
{ pos:"2B", name:"Jeff McNeil", id:42518024, rosterPos:"2B", salary:3100, game:"HOU@ATH", team:"ATH", avgPts:2.5 },
{ pos:"OF", name:"Carlos Cortes", id:42518028, rosterPos:"OF", salary:3100, game:"HOU@ATH", team:"ATH", avgPts:2.33 },
{ pos:"3B", name:"Brady House", id:42518033, rosterPos:"3B", salary:3000, game:"LAD@WSH", team:"WSH", avgPts:8.86 },
{ pos:"2B", name:"Nick Gonzales", id:42518030, rosterPos:"2B/SS", salary:3000, game:"BAL@PIT", team:"PIT", avgPts:9.33 },
{ pos:"2B", name:"Nasim Nunez", id:42518034, rosterPos:"2B/SS", salary:2900, game:"LAD@WSH", team:"WSH", avgPts:7.67 },
{ pos:"C", name:"Carlos Narvaez", id:42518036, rosterPos:"C", salary:2900, game:"SD@BOS", team:"BOS", avgPts:4.25 },
{ pos:"OF", name:"Colton Cowser", id:42518037, rosterPos:"OF", salary:2900, game:"BAL@PIT", team:"BAL", avgPts:5 },
{ pos:"OF", name:"Dylan Beavers", id:42518084, rosterPos:"OF", salary:2300, game:"BAL@PIT", team:"BAL", avgPts:7.8 },
{ pos:"OF", name:"Joey Wiemer", id:42518043, rosterPos:"OF", salary:2800, game:"LAD@WSH", team:"WSH", avgPts:16.2 },
{ pos:"C", name:"Drew Millas", id:42518046, rosterPos:"C", salary:2800, game:"LAD@WSH", team:"WSH", avgPts:4.67 },
{ pos:"OF", name:"Nick Castellanos", id:42518040, rosterPos:"OF", salary:2800, game:"SD@BOS", team:"SD", avgPts:2 },
{ pos:"OF", name:"Masataka Yoshida", id:42518041, rosterPos:"OF", salary:2800, game:"SD@BOS", team:"BOS", avgPts:2.4 },
{ pos:"OF", name:"Jake Meyers", id:42518042, rosterPos:"OF", salary:2800, game:"HOU@ATH", team:"HOU", avgPts:5.29 },
{ pos:"2B", name:"Alex Freeland", id:42518047, rosterPos:"2B/3B", salary:2700, game:"LAD@WSH", team:"LAD", avgPts:5.4 },
{ pos:"C", name:"Joey Bart", id:42518049, rosterPos:"C", salary:2700, game:"BAL@PIT", team:"PIT", avgPts:3.5 },
{ pos:"C", name:"Christian Vazquez", id:42518061, rosterPos:"C", salary:2600, game:"HOU@ATH", team:"HOU", avgPts:6.25 },
{ pos:"1B", name:"Luis Garcia Jr.", id:42518057, rosterPos:"1B/2B", salary:2600, game:"LAD@WSH", team:"WSH", avgPts:5 },
{ pos:"2B", name:"Miguel Rojas", id:42518059, rosterPos:"2B", salary:2600, game:"LAD@WSH", team:"LAD", avgPts:4 },
{ pos:"2B", name:"Marcelo Mayer", id:42518053, rosterPos:"2B/3B", salary:2600, game:"SD@BOS", team:"BOS", avgPts:6.57 },
{ pos:"3B", name:"Jared Triolo", id:42518064, rosterPos:"3B/SS", salary:2600, game:"BAL@PIT", team:"PIT", avgPts:4.83 },
{ pos:"1B", name:"Andy Ibanez", id:42518066, rosterPos:"1B/3B", salary:2500, game:"HOU@ATH", team:"ATH", avgPts:2.8 },
{ pos:"OF", name:"Jacob Young", id:42518071, rosterPos:"OF", salary:2500, game:"LAD@WSH", team:"WSH", avgPts:6.67 },
{ pos:"1B", name:"Ty France", id:42518070, rosterPos:"1B", salary:2500, game:"SD@BOS", team:"SD", avgPts:0 },
{ pos:"C", name:"Connor Wong", id:42518073, rosterPos:"C", salary:2500, game:"SD@BOS", team:"BOS", avgPts:5.75 },
{ pos:"2B", name:"Blaze Alexander", id:42518068, rosterPos:"2B/3B", salary:2500, game:"BAL@PIT", team:"BAL", avgPts:5.2 },
{ pos:"C", name:"Henry Davis", id:42518080, rosterPos:"C", salary:2400, game:"BAL@PIT", team:"PIT", avgPts:4.14 },
{ pos:"1B", name:"Coby Mayo", id:42518074, rosterPos:"1B/3B", salary:2400, game:"BAL@PIT", team:"BAL", avgPts:4.17 },
{ pos:"SS", name:"Nick Allen", id:42518102, rosterPos:"SS", salary:2000, game:"HOU@ATH", team:"HOU", avgPts:2 },
];

// ── Utility helpers ─────────────────────────────────────────────
const _seen = new Set();
const DK_PLAYERS = DK_SALARY_DATA.filter(p => {
  if (_seen.has(p.name)) return false;
  _seen.add(p.name);
  return true;
});

const DK_GAMES = [...new Set(DK_PLAYERS.map(p => p.game).filter(g => g !== '-'))].sort();
const DK_TEAMS = [...new Set(DK_PLAYERS.map(p => p.team))].sort();

function filterPlayers({ pos, team, game, minSalary, maxSalary, minAvgPts } = {}) {
  return DK_PLAYERS.filter(p => {
    if (pos) {
      if (pos === "P") { if (p.rosterPos !== "P") return false; }
      else { if (p.pos !== pos && p.rosterPos !== pos && !p.rosterPos.includes(pos)) return false; }
    }
    if (team && p.team !== team) return false;
    if (game && p.game !== game) return false;
    if (minSalary && p.salary < minSalary) return false;
    if (maxSalary && p.salary > maxSalary) return false;
    if (minAvgPts && p.avgPts < minAvgPts) return false;
    return true;
  });
}

function getValuePlays(pos, topN = 10) {
  let pool = pos ? filterPlayers({ pos }) : DK_PLAYERS;
  pool = pool.filter(p => p.avgPts > 0 && p.salary > 0);
  return pool
    .map(p => ({ ...p, ptsPerK: (p.avgPts / (p.salary / 1000)).toFixed(2) }))
    .sort((a, b) => b.ptsPerK - a.ptsPerK)
    .slice(0, topN);
}

function getGameStack(game) {
  return filterPlayers({ game });
}

if (typeof window !== "undefined") {
  window.DK_SLATE_DATE = DK_SLATE_DATE;
  window.DK_PLAYERS = DK_PLAYERS;
  window.DK_GAMES = DK_GAMES;
  window.DK_TEAMS = DK_TEAMS;
  window.filterPlayers = filterPlayers;
  window.getValuePlays = getValuePlays;
  window.getGameStack = getGameStack;
  console.log("[DK Salaries] Loaded " + DK_PLAYERS.length + " players | Slate: " + DK_SLATE_DATE + " | Games: " + DK_GAMES.join(", "));
}

if (typeof module !== "undefined") {
  module.exports = { DK_SLATE_DATE, DK_PLAYERS, DK_GAMES, DK_TEAMS, filterPlayers, getValuePlays, getGameStack };
}
