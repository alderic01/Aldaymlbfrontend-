// ALLDAY MLB EDGE - Savant Bridge v1.0
// Connects Baseball Savant / Python statcast pipeline to the JS grading engine
// Fetches xwOBA, barrel%, exit velocity, hard hit%, K%, BB% per player
// Falls back gracefully if Python API is offline

(function(){

const SAVANT_CACHE_KEY = 'mlb-edge-savant-cache';
const SAVANT_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// In-memory cache for this session
window._savantData = window._savantData || {};
window._savantLoaded = window._savantLoaded || false;
window._savantLoading = window._savantLoading || false;

// Get the Python API base URL - falls back to local if not configured
function getSavantBase() {
  const cfg = (typeof state !== 'undefined' && state.apiConfig) ? state.apiConfig : {};
    return cfg.savantApiUrl || window._savantApiUrl || 'https://allday-mlb-edge-api.onrender.com';
    }

    // Load cached savant data from localStorage
    function loadSavantCache() {
      try {
          const raw = localStorage.getItem(SAVANT_CACHE_KEY);
              if (!raw) return null;
                  const parsed = JSON.parse(raw);
                      if (Date.now() - parsed.ts > SAVANT_CACHE_TTL) return null;
                          return parsed.data;
                            } catch(e) { return null; }
                            }

                            // Save savant data to localStorage
                            function saveSavantCache(data) {
                              try {
                                  localStorage.setItem(SAVANT_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
                                    } catch(e) {}
                                    }

                                    // Fetch all hitter statcast data from Python API
                                    // Returns map of { playerName_lowercase: { xwoba, barrel_pct, ev, hard_hit_pct, k_rate, bb_rate, xba, xslg } }
                                    async function fetchSavantHitters(baseUrl) {
                                      const resp = await fetch(baseUrl + '/api/hitters?limit=200&sort=proj', {
                                          signal: AbortSignal.timeout(20000)
                                            });
                                              if (!resp.ok) throw new Error('HTTP ' + resp.status);
                                                const data = await resp.json();
                                                  const hitters = data.hitters || [];

                                                    const out = {};
                                                      for (const h of hitters) {
                                                          const key = (h.player_name || '').toLowerCase().trim();
                                                              if (!key) continue;
                                                                  const s = h.stats || {};
                                                                      out[key] = {
                                                                            xwoba:        s.xwoba        || null,
                                                                                  barrel_pct:   s.barrel_pct   || null,
                                                                                        ev:           s.exit_velocity || null,
                                                                                              hard_hit_pct: s.hard_hit_pct || null,
                                                                                                    k_pct:        s.k_pct        || null,
                                                                                                          bb_pct:       s.bb_pct       || null,
                                                                                                                xba:          s.xba          || null,
                                                                                                                      xslg:         s.xslg         || null,
                                                                                                                            // also store grade/fires for cross-reference
                                                                                                                                  pyGrade:      h.grade        || null,
                                                                                                                                        pyFires:      h.fires        || null,
                                                                                                                                              pyScore:      h.matchup_score || null,
                                                                                                                                                  };
                                                                                                                                                    }
                                                                                                                                                      return out;
                                                                                                                                                      }
                                                                                                                                                      
                                                                                                                                                      // Main entry point - called from loadSlate in app-core.js
                                                                                                                                                      // Populates window._savantData with player statcast stats
                                                                                                                                                      window.loadSavantData = async function() {
                                                                                                                                                        if (window._savantLoading) return;
                                                                                                                                                        
                                                                                                                                                          // Try localStorage cache first
                                                                                                                                                            const cached = loadSavantCache();
                                                                                                                                                              if (cached && Object.keys(cached).length > 10) {
                                                                                                                                                                  window._savantData = cached;
                                                                                                                                                                      window._savantLoaded = true;
                                                                                                                                                                          console.log('[Savant] Loaded ' + Object.keys(cached).length + ' players from cache');
                                                                                                                                                                              return;
                                                                                                                                                                                }
                                                                                                                                                                                
                                                                                                                                                                                  window._savantLoading = true;
                                                                                                                                                                                    const base = getSavantBase();
                                                                                                                                                                                      console.log('[Savant] Fetching from ' + base + '...');
                                                                                                                                                                                      
                                                                                                                                                                                        try {
                                                                                                                                                                                            const data = await fetchSavantHitters(base);
                                                                                                                                                                                                if (Object.keys(data).length > 0) {
                                                                                                                                                                                                      window._savantData = data;
                                                                                                                                                                                                            window._savantLoaded = true;
                                                                                                                                                                                                                  saveSavantCache(data);
                                                                                                                                                                                                                        console.log('[Savant] Loaded ' + Object.keys(data).length + ' players from Python API');
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                              } catch(e) {
                                                                                                                                                                                                                                  console.warn('[Savant] Python API unavailable (' + e.message + ') - using JS engine only');
                                                                                                                                                                                                                                      window._savantLoaded = false;
                                                                                                                                                                                                                                        } finally {
                                                                                                                                                                                                                                            window._savantLoading = false;
                                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                              };
                                                                                                                                                                                                                                              
                                                                                                                                                                                                                                              // Enrich a hitter object with Savant statcast data
                                                                                                                                                                                                                                              // Merges statcast fields into the hitter object in-place
                                                                                                                                                                                                                                              // h = { id, name, pos, avg, ops, slg, hr, ... }
                                                                                                                                                                                                                                              window.enrichHitterWithSavant = function(h) {
                                                                                                                                                                                                                                                if (!window._savantLoaded || !h) return h;
                                                                                                                                                                                                                                                  const key = (h.name || h.player_name || '').toLowerCase().trim();
                                                                                                                                                                                                                                                    if (!key) return h;
                                                                                                                                                                                                                                                    
                                                                                                                                                                                                                                                      // Try exact match first
                                                                                                                                                                                                                                                        let savant = window._savantData[key];
                                                                                                                                                                                                                                                        
                                                                                                                                                                                                                                                          // Try partial match (last name)
                                                                                                                                                                                                                                                            if (!savant) {
                                                                                                                                                                                                                                                                const lastName = key.split(' ').pop();
                                                                                                                                                                                                                                                                    if (lastName && lastName.length > 3) {
                                                                                                                                                                                                                                                                          const matchKey = Object.keys(window._savantData).find(k => k.includes(lastName) && k.split(' ').pop() === lastName);
                                                                                                                                                                                                                                                                                if (matchKey) savant = window._savantData[matchKey];
                                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                                                      }
                                                                                                                                                                                                                                                                                      
                                                                                                                                                                                                                                                                                        if (!savant) return h;
                                                                                                                                                                                                                                                                                        
                                                                                                                                                                                                                                                                                          // Merge statcast fields - only override if not already set
                                                                                                                                                                                                                                                                                            if (savant.xwoba   !== null && !h.xwoba)        h.xwoba        = savant.xwoba;
                                                                                                                                                                                                                                                                                              if (savant.barrel_pct !== null && !h.barrel_pct) h.barrel_pct   = savant.barrel_pct;
                                                                                                                                                                                                                                                                                                if (savant.ev      !== null && !h.ev)            h.ev           = savant.ev;
                                                                                                                                                                                                                                                                                                  if (savant.hard_hit_pct !== null && !h.hard_hit_pct) h.hard_hit_pct = savant.hard_hit_pct;
                                                                                                                                                                                                                                                                                                    if (savant.k_pct   !== null && !h.k_pct)        h.k_pct        = savant.k_pct;
                                                                                                                                                                                                                                                                                                      if (savant.bb_pct  !== null && !h.bb_pct)        h.bb_pct       = savant.bb_pct;
                                                                                                                                                                                                                                                                                                        if (savant.xba     !== null && !h.xba)           h.xba          = savant.xba;
                                                                                                                                                                                                                                                                                                          if (savant.xslg    !== null && !h.xslg)          h.xslg         = savant.xslg;
                                                                                                                                                                                                                                                                                                          
                                                                                                                                                                                                                                                                                                            // Tag that this player was enriched with Savant data
                                                                                                                                                                                                                                                                                                              h._savantEnriched = true;
                                                                                                                                                                                                                                                                                                              
                                                                                                                                                                                                                                                                                                                return h;
                                                                                                                                                                                                                                                                                                                };
                                                                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                                                                // Enrich an array of hitters
                                                                                                                                                                                                                                                                                                                window.enrichHittersWithSavant = function(hitters) {
                                                                                                                                                                                                                                                                                                                  if (!Array.isArray(hitters)) return hitters;
                                                                                                                                                                                                                                                                                                                    return hitters.map(h => window.enrichHitterWithSavant(h));
                                                                                                                                                                                                                                                                                                                    };
                                                                                                                                                                                                                                                                                                                    
                                                                                                                                                                                                                                                                                                                    // Status check - returns brief status string
                                                                                                                                                                                                                                                                                                                    window.savantStatus = function() {
                                                                                                                                                                                                                                                                                                                      if (window._savantLoaded) {
                                                                                                                                                                                                                                                                                                                          return 'Savant: ' + Object.keys(window._savantData).length + ' players loaded';
                                                                                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                                                                              return window._savantLoading ? 'Savant: loading...' : 'Savant: offline (JS engine only)';
                                                                                                                                                                                                                                                                                                                              };
                                                                                                                                                                                                                                                                                                                              
                                                                                                                                                                                                                                                                                                                              // Auto-load on page ready if Python API URL is configured
                                                                                                                                                                                                                                                                                                                              if (document.readyState === 'loading') {
                                                                                                                                                                                                                                                                                                                                document.addEventListener('DOMContentLoaded', function() {
                                                                                                                                                                                                                                                                                                                                    setTimeout(function() { window.loadSavantData().catch(()=>{}); }, 2000);
                                                                                                                                                                                                                                                                                                                                      });
                                                                                                                                                                                                                                                                                                                                      } else {
                                                                                                                                                                                                                                                                                                                                        setTimeout(function() { window.loadSavantData().catch(()=>{}); }, 2000);
                                                                                                                                                                                                                                                                                                                                        }
                                                                                                                                                                                                                                                                                                                                        
                                                                                                                                                                                                                                                                                                                                        })();
