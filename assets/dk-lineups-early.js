/**
 * ALLDAY MLB EDGE — Confirmed Lineups for EARLY Slate
 * April 4, 2026 — 4 Games
 * Source: DraftKings confirmed lineups
 */
var DK_CONFIRMED_LINEUPS = {
  'LAD@WSH': {
    away: { team: 'LAD', pitcher: 'Tyler Glasnow', lineup: [
      {order:1,name:'Shohei Ohtani',pos:'DH',bat:'L'},
      {order:2,name:'Kyle Tucker',pos:'RF',bat:'L'},
      {order:3,name:'Mookie Betts',pos:'SS',bat:'R'},
      {order:4,name:'Freddie Freeman',pos:'1B',bat:'L'},
      {order:5,name:'Will Smith',pos:'C',bat:'R'},
      {order:6,name:'Max Muncy',pos:'3B',bat:'L'},
      {order:7,name:'Andy Pages',pos:'CF',bat:'R'},
      {order:8,name:'Alex Freeland',pos:'2B',bat:'S'},
      {order:9,name:'Alex Call',pos:'LF',bat:'R'}
    ]},
    home: { team: 'WSH', pitcher: 'Jake Irvin', lineup: [
      {order:1,name:'James Wood',pos:'RF',bat:'L'},
      {order:2,name:'Luis Garcia Jr.',pos:'DH',bat:'L'},
      {order:3,name:'Brady House',pos:'3B',bat:'R'},
      {order:4,name:'Daylen Lile',pos:'LF',bat:'L'},
      {order:5,name:'CJ Abrams',pos:'SS',bat:'L'},
      {order:6,name:'Curtis Mead',pos:'1B',bat:'R'},
      {order:7,name:'Jorbit Vivas',pos:'2B',bat:'L'},
      {order:8,name:'Drew Millas',pos:'C',bat:'S'},
      {order:9,name:'Jacob Young',pos:'CF',bat:'R'}
    ]}
  },
  'HOU@ATH': {
    away: { team: 'HOU', pitcher: 'Tatsuya Imai', lineup: [
      {order:1,name:'Jeremy Pena',pos:'SS',bat:'R'},
      {order:2,name:'Yordan Alvarez',pos:'LF',bat:'L'},
      {order:3,name:'Jose Altuve',pos:'2B',bat:'R'},
      {order:4,name:'Carlos Correa',pos:'3B',bat:'R'},
      {order:5,name:'Christian Walker',pos:'1B',bat:'R'},
      {order:6,name:'Joey Loperfido',pos:'RF',bat:'L'},
      {order:7,name:'Yainer Diaz',pos:'DH',bat:'R'},
      {order:8,name:'Jake Meyers',pos:'CF',bat:'R'},
      {order:9,name:'Christian Vazquez',pos:'C',bat:'R'}
    ]},
    home: { team: 'ATH', pitcher: 'Luis Morales', lineup: [
      {order:1,name:'Nick Kurtz',pos:'1B',bat:'L'},
      {order:2,name:'Shea Langeliers',pos:'C',bat:'R'},
      {order:3,name:'Tyler Soderstrom',pos:'LF',bat:'L'},
      {order:4,name:'Brent Rooker',pos:'DH',bat:'R'},
      {order:5,name:'Jacob Wilson',pos:'SS',bat:'R'},
      {order:6,name:'Lawrence Butler',pos:'RF',bat:'L'},
      {order:7,name:'Max Muncy',pos:'3B',bat:'R'},
      {order:8,name:'Jeff McNeil',pos:'2B',bat:'L'},
      {order:9,name:'Denzel Clarke',pos:'CF',bat:'R'}
    ]}
  },
  'SD@BOS': {
    away: { team: 'SD', pitcher: 'Randy Vasquez', lineup: [
      {order:1,name:'Fernando Tatis Jr.',pos:'RF',bat:'R'},
      {order:2,name:'Ramon Laureano',pos:'LF',bat:'R'},
      {order:3,name:'Miguel Andujar',pos:'DH',bat:'R'},
      {order:4,name:'Manny Machado',pos:'3B',bat:'R'},
      {order:5,name:'Xander Bogaerts',pos:'SS',bat:'R'},
      {order:6,name:'Freddy Fermin',pos:'C',bat:'R'},
      {order:7,name:'Ty France',pos:'1B',bat:'R'},
      {order:8,name:'Jake Cronenworth',pos:'2B',bat:'L'},
      {order:9,name:'Bryce Johnson',pos:'CF',bat:'S'}
    ]},
    home: { team: 'BOS', pitcher: 'Connelly Early', lineup: [
      {order:1,name:'Roman Anthony',pos:'DH',bat:'L'},
      {order:2,name:'Trevor Story',pos:'SS',bat:'R'},
      {order:3,name:'Jarren Duran',pos:'LF',bat:'L'},
      {order:4,name:'Willson Contreras',pos:'1B',bat:'R'},
      {order:5,name:'Wilyer Abreu',pos:'RF',bat:'L'},
      {order:6,name:'Caleb Durbin',pos:'3B',bat:'R'},
      {order:7,name:'Marcelo Mayer',pos:'2B',bat:'L'},
      {order:8,name:'Carlos Narvaez',pos:'C',bat:'R'},
      {order:9,name:'Ceddanne Rafaela',pos:'CF',bat:'R'}
    ]}
  },
  'BAL@PIT': {
    away: { team: 'BAL', pitcher: 'Shane Baz', lineup: [
      {order:1,name:'Taylor Ward',pos:'DH',bat:'R'},
      {order:2,name:'Gunnar Henderson',pos:'SS',bat:'L'},
      {order:3,name:'Pete Alonso',pos:'1B',bat:'R'},
      {order:4,name:'Adley Rutschman',pos:'C',bat:'S'},
      {order:5,name:'Dylan Beavers',pos:'LF',bat:'L'},
      {order:6,name:'Coby Mayo',pos:'3B',bat:'R'},
      {order:7,name:'Leody Taveras',pos:'CF',bat:'S'},
      {order:8,name:'Colton Cowser',pos:'RF',bat:'L'},
      {order:9,name:'Blaze Alexander',pos:'2B',bat:'R'}
    ]},
    home: { team: 'PIT', pitcher: 'Carmen Mlodzinski', lineup: [] }
  }
};

// Merge lineup order into DK salary data
if (typeof window !== 'undefined') {
  window.DK_CONFIRMED_LINEUPS = DK_CONFIRMED_LINEUPS;

  // Build flat list of all confirmed players with lineup order
  window.DK_LINEUP_PLAYERS = [];
  Object.keys(DK_CONFIRMED_LINEUPS).forEach(function(game) {
    var g = DK_CONFIRMED_LINEUPS[game];
    ['away','home'].forEach(function(side) {
      var s = g[side];
      s.lineup.forEach(function(p) {
        window.DK_LINEUP_PLAYERS.push({
          name: p.name, team: s.team, pos: p.pos, bat: p.bat,
          order: p.order, game: game, pitcher: s.pitcher
        });
      });
    });
  });
  console.log('[Lineups] Confirmed ' + window.DK_LINEUP_PLAYERS.length + ' players in starting lineups');
}
