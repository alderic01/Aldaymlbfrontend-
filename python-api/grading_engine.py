# python-api/grading_engine.py v3
# 8-Factor MLB DFS Matchup Grading Engine
# Mirrors grading-engine.js v7 exactly
# Weights: PitcherVuln(25%) H2H(15%) Arsenal(15%) Splits(12%) BatterSkill(15%) Park(8%) Weather(5%) ST(5%)
# Data blend: 2024(30%) + 2025(50%) + ST2026(20%)

import logging
from datetime import datetime

log = logging.getLogger(__name__)

# -----------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------

def n(obj, key, default=0):
        """Safe numeric getter — returns 0 if missing or NaN."""
        if not obj:
                    return default
                v = obj.get(key, default)
    try:
                f = float(v)
                return f if f == f else default  # NaN check
except (TypeError, ValueError):
        return default

def weighted_avg(s24, s25, st26, key):
        """Blend 3 seasons: 2024=30%, 2025=50%, ST2026=20%."""
    v24 = n(s24, key)
    v25 = n(s25, key)
    v26 = n(st26, key)
    w = (0.30 if v24 > 0 else 0) + (0.50 if v25 > 0 else 0) + (0.20 if v26 > 0 else 0)
    if w == 0:
                return 0
            return (v24 * 0.30 + v25 * 0.50 + v26 * 0.20) / w

def pitcher_blended_fip(pitcher):
        """Blended pitcher FIP across seasons."""
    if not pitcher:
                return 4.50
            s24 = pitcher.get("stats2024", {}) or {}
    s25 = pitcher.get("stats2025", {}) or {}
    st  = pitcher.get("st2026",    {}) or {}
    f24 = n(s24, "fip") or n(s24, "era") or 4.50
    f25 = n(s25, "fip") or n(s25, "era") or 4.50
    fst = n(st,  "era") or n(st,  "fip") or 4.50
    w = (0.30 if f24 > 0 else 0) + (0.50 if f25 > 0 else 0) + (0.20 if fst > 0 else 0)
    if w == 0:
                return 4.50
            blend = (f24 * 0.30 + f25 * 0.50 + fst * 0.20) / w
    return blend if blend > 0 else 4.50

def score_to_grade(raw):
        """Convert numeric score to letter grade."""
    if raw >= 50: return "A+"
            if raw >= 47: return "A"
                    if raw >= 45: return "B+"
                            if raw >= 43: return "B"
                                    if raw >= 40: return "C"
                                            if raw >= 36: return "D"
                                                    return "F"

# -----------------------------------------------------------------------
# 8 Scoring Factors
# -----------------------------------------------------------------------

def score_pitcher_vuln(batter, pitcher):
        """Factor 1: Pitcher Vulnerability (25 pts max)"""
    if not pitcher:
                return 13.0
            fip = pitcher_blended_fip(pitcher)
    fip_score = min(18, max(0, (fip - 3.0) / 2.0 * 18))

    primary_baa   = n(pitcher, "primaryPitchBAA") or \
                    n(pitcher.get("pitch_baa", {}), "primary") or 0.250
    secondary_baa = n(pitcher, "secondaryPitchBAA") or \
                    n(pitcher.get("pitch_baa", {}), "secondary") or 0.250

    primary_score   = min(4, max(0, (primary_baa   - 0.200) / 0.150 * 4))
    secondary_score = min(3, max(0, (secondary_baa - 0.200) / 0.150 * 3))
    return min(25, fip_score + primary_score + secondary_score)

def score_h2h(batter, pitcher):
        """Factor 2: Head-to-Head History (15 pts max)"""
    if not pitcher:
                return 8.0
            pitcher_id = pitcher.get("id") or pitcher.get("mlbId") or pitcher.get("pitcher_id")
    h2h_data = batter.get("h2h", {})
    h2h = h2h_data.get(str(pitcher_id)) if pitcher_id else None
    if not h2h:
                return 7.0
            pa = n(h2h, "pa") or n(h2h, "PA") or 0
    if pa < 5:
                return 7.0
            avg = n(h2h, "avg") or n(h2h, "AVG") or 0
    slg = n(h2h, "slg") or n(h2h, "SLG") or 0
    hr  = n(h2h, "hr")  or n(h2h, "HR")  or 0
    ops = avg + slg
    if   ops >= 1.100: ops_score = 12
elif ops >= 0.900: ops_score = 10
elif ops >= 0.750: ops_score = 8
elif ops >= 0.650: ops_score = 6
elif ops >= 0.500: ops_score = 4
else:              ops_score = 2
    hr_bonus     = min(3, hr * 1.5)
    sample_bonus = 1 if pa >= 20 else 0
    return min(15, ops_score + hr_bonus + sample_bonus)

def score_arsenal(batter, pitcher):
        """Factor 3: Pitch Arsenal Matchup (15 pts max)"""
    if not pitcher:
                return 8.0
            arsenal = pitcher.get("arsenal") or pitcher.get("pitchArsenal") or {}
    if not arsenal:
                return 7.0
            total_score  = 0.0
    total_weight = 0.0
    batter_pitch_baa = batter.get("pitch_baa") or batter.get("pitchTypeBaa") or {}
    for pitch_type, info in arsenal.items():
                if not info:
                                continue
                            usage = n(info, "usage") or n(info, "pct") or 0
        if usage < 0.05:
                        continue
                    batter_baa  = n(batter_pitch_baa, pitch_type) or 0.250
        pitcher_baa = n(info, "baa") or n(info, "ba") or 0.250
        velo = n(info, "velocity") or n(info, "mph") or 92
        if pitch_type in ("FF", "4-Seam", "4S"):
                        velo_factor = max(0, (95 - velo) / 10)
else:
            velo_factor = max(0, (88 - velo) / 8)
        matchup = ((batter_baa  - 0.200) / 0.150 +
                                      (pitcher_baa - 0.200) / 0.150 +
                                      velo_factor) / 3
        total_score  += matchup * usage
        total_weight += usage
    if total_weight == 0:
                return 7.0
    raw = total_score / total_weight
    return min(15, max(0, 7 + raw * 15))

def score_splits(batter, pitcher, is_home):
        """Factor 4: Platoon + Home/Away Splits (12 pts max)"""
    score = 0.0
    b_hand = (batter.get("bat_side") or batter.get("batSide") or
                            batter.get("bats") or "R").upper()
    p_hand = "R"
    if pitcher:
                p_hand = (pitcher.get("throw_side") or pitcher.get("pitchHand") or
                                            pitcher.get("throws") or "R").upper()

    switch_hitter = b_hand == "S"
    platoon_adv   = (b_hand == "L" and p_hand == "R") or (b_hand == "R" and p_hand == "L")

    if switch_hitter:
                score += 4
elif platoon_adv:
        score += 5
else:
        score += 2

    splits = batter.get("splits") or batter.get("homeSplit") or {}
    career_ops = n(batter.get("stats2025", {}), "ops") or n(batter, "ops") or 0

    if is_home:
                home_ops = n(splits, "homeOPS") or n(batter, "homeOPS") or 0
        if home_ops > 0 and career_ops > 0:
                        diff = home_ops - career_ops
                        score += min(4, max(-2, diff / 0.100 * 2))
else:
            score += 2
else:
        away_ops = n(splits, "awayOPS") or n(batter, "awayOPS") or 0
        if away_ops > 0 and career_ops > 0:
                        diff = away_ops - career_ops
                        score += min(3, max(-2, diff / 0.100 * 2))
else:
            score += 1

    if platoon_adv or switch_hitter:
                if b_hand == "L":
                                plat_ops = n(splits, "vsRHP_OPS") or n(batter, "vsRHP") or 0
else:
            plat_ops = n(splits, "vsLHP_OPS") or n(batter, "vsLHP") or 0
        if   plat_ops > 0.850: score += 3
elif plat_ops > 0.750: score += 2
elif plat_ops > 0.650: score += 1

    return min(12, max(0, score))

def score_batter_skill(batter):
        """Factor 5: Batter Skill Baseline (15 pts max)"""
    s24 = batter.get("stats2024") or {}
    s25 = batter.get("stats2025") or {}
    st  = batter.get("st2026")    or {}

    wrc = (weighted_avg(s24, s25, st, "wrc_plus") or
                      weighted_avg(s24, s25, st, "wrcPlus")  or 100)
    wrc_score = min(6, max(0, (wrc - 85) / 65 * 6))

    iso = weighted_avg(s24, s25, st, "iso") or 0.150
    iso_score = min(4, max(0, (iso - 0.100) / 0.200 * 4))

    xba = (weighted_avg(s24, s25, st, "xba") or
                      weighted_avg(s24, s25, st, "xBA") or 0)
    xba_score = min(3, max(0, (xba - 0.220) / 0.100 * 3)) if xba > 0 else 0

    bb = (weighted_avg(s24, s25, st, "bb_pct") or
                    weighted_avg(s24, s25, st, "bbPct")  or 0.08)
    bb_score = min(2, max(0, (bb - 0.05) / 0.12 * 2))

    return min(15, wrc_score + iso_score + xba_score + bb_score)

def score_park_factor(batter, parks, venue):
        """Factor 6: Park Factor (8 pts max)"""
    park = (parks or {}).get(venue) or (parks or {}).get(
                batter.get("venue") or batter.get("game_venue"), {}) or {}
    if not park:
                return 4.0
    pf = n(park, "factor") or n(park, "parkFactor") or n(park, "run_factor") or 100
    score = min(8, max(0, (pf - 85) / 30 * 8))
    hr_pf = n(park, "hrFactor") or n(park, "hr_factor") or pf
    hr_bonus = 1 if hr_pf >= 110 else 0
    return min(8, score + hr_bonus)

def score_weather(batter, weather, venue):
        """Factor 7: Weather (5 pts max)"""
    w = (weather or {}).get(venue) or (weather or {}).get(
                batter.get("venue") or batter.get("game_venue")) or weather or {}
    if not w:
                return 3.0

    temp       = n(w, "temp")       or n(w, "temperature") or 72
    wind_speed = n(w, "windSpeed")  or n(w, "wind_speed")  or 8
    wind_dir   = (w.get("windDir") or w.get("wind_dir") or
                                    w.get("direction") or "").lower()

    temp_score = (2.0 if temp >= 85 else 1.8 if temp >= 75 else 1.5
                                    if temp >= 65 else 1.0 if temp >= 55 else 0.5)

    out_words = ["out", "out to", "blowing out"]
    in_words  = ["in", "in from", "blowing in"]
    is_out = any(ow in wind_dir for ow in out_words)
    is_in  = any(iw in wind_dir for iw in in_words)

    if   is_out: wind_score =  min(2, wind_speed / 12 * 2)
elif is_in:  wind_score = -min(1, wind_speed / 15)
else:        wind_score = 0.5

    is_dome = str(w.get("dome") or w.get("indoors") or w.get("roof") or "").lower() == "true"
    if is_dome:
                return 3.0

    return min(5, max(0, temp_score + wind_score + 0.5))

def score_st_momentum(batter):
        """Factor 8: Spring Training 2026 Momentum (5 pts max)"""
    st = batter.get("st2026") or batter.get("springTraining2026") or {}
    if not st:
                return 2.5
    pa  = n(st, "pa")  or n(st, "PA")  or 0
    if pa < 10:
                return 2.5
    avg = n(st, "avg") or n(st, "AVG") or 0
    ops = n(st, "ops") or n(st, "OPS") or 0
    hr  = n(st, "hr")  or n(st, "HR")  or 0

    if   ops >= 1.000: score = 5.0
elif ops >= 0.900: score = 4.5
elif ops >= 0.800: score = 4.0
elif ops >= 0.700: score = 3.0
elif ops >= 0.600: score = 2.0
else:              score = 1.0

    if hr  >= 3:     score = min(5, score + 0.5)
            if avg >= 0.350: score = min(5, score + 0.5)
                    return score

# -----------------------------------------------------------------------
# Main Grader Classes
# -----------------------------------------------------------------------

class HitterGrader:
        """Grade a single batter against a specific pitcher for today's matchup."""

    def __init__(self, batter, pitcher, game_context):
                self.batter  = batter
        self.pitcher = pitcher
        self.ctx     = game_context
        # Batter data fields
        self.bp      = batter.get("profile", {})
        self.blended = batter.get("blended", {})
        self.h2h     = batter.get("h2h", {})
        self.splits  = batter.get("splits", {})
        self.pitch_baa = batter.get("pitch_baa", {})
        self.st_2026 = batter.get("st2026", {})
        self.arsenal = pitcher.get("arsenal", {}) if pitcher else {}
        self.is_home = game_context.get("is_home", False)
        self.parks   = game_context.get("parks", {})
        self.weather = game_context.get("weather", {})
        self.venue   = game_context.get("venue") or batter.get("venue") or ""

    def _pitcher_vuln_score(self):
                return score_pitcher_vuln(self.batter, self.pitcher)

    def _h2h_score(self):
                return score_h2h(self.batter, self.pitcher)

    def _arsenal_score(self):
                return score_arsenal(self.batter, self.pitcher)

    def _splits_score(self):
                return score_splits(self.batter, self.pitcher, self.is_home)

    def _batter_skill_score(self):
                return score_batter_skill(self.batter)

    def _park_score(self):
                return score_park_factor(self.batter, self.parks, self.venue)

    def _weather_score(self):
                return score_weather(self.batter, self.weather, self.venue)

    def _st_momentum_score(self):
                return score_st_momentum(self.batter)

    def grade(self):
                """Compute all 8 factors and return full grade result."""
        s1 = self._pitcher_vuln_score()    # 25 pts
        s2 = self._h2h_score()             # 15 pts
        s3 = self._arsenal_score()         # 15 pts
        s4 = self._splits_score()          # 12 pts
        s5 = self._batter_skill_score()    # 15 pts
        s6 = self._park_score()            # 8 pts
        s7 = self._weather_score()         # 5 pts
        s8 = self._st_momentum_score()     # 5 pts

        total = s1 + s2 + s3 + s4 + s5 + s6 + s7 + s8
        grade = score_to_grade(total)
        proj_pts = 5 + (total - 40) * 0.25

        # Ownership projection
        base_own = {"A+": 22, "A": 17, "B+": 13, "B": 10, "C": 7, "D": 4, "F": 2}
        sal = self.batter.get("salary") or 4500
        sal_adj = -3 if sal > 6000 else -1 if sal > 5000 else 3 if sal < 3500 else 0
        ownership = max(1, base_own.get(grade, 7) + sal_adj)

        return {
                        "name":       self.batter.get("name") or self.batter.get("player_name"),
                        "id":         self.batter.get("id") or self.batter.get("mlbId"),
                        "team":       self.batter.get("team"),
                        "opp":        self.batter.get("opp") or self.batter.get("opponent"),
                        "position":   self.batter.get("position") or self.batter.get("pos"),
                        "salary":     self.batter.get("salary"),
                        "grade":      grade,
                        "score":      round(total, 2),
                        "projPts":    round(proj_pts, 2),
                        "ownership":  ownership,
                        "scoreBreakdown": {
                                            "pitcherVuln": round(s1, 2),
                                            "h2h":         round(s2, 2),
                                            "arsenal":     round(s3, 2),
                                            "splits":      round(s4, 2),
                                            "batterSkill": round(s5, 2),
                                            "park":        round(s6, 2),
                                            "weather":     round(s7, 2),
                                            "stMomentum":  round(s8, 2)
                        }
        }


class PitcherGrader:
        """Grade a starting pitcher for DFS value."""

    def __init__(self, pitcher, game_context):
                self.pitcher = pitcher
        self.ctx     = game_context
        self.parks   = game_context.get("parks", {})
        self.weather = game_context.get("weather", {})
        self.venue   = game_context.get("venue") or pitcher.get("venue") or ""

    def grade(self):
                """Grade pitcher based on K-rate, FIP, opponent quality, park, weather."""
        p = self.pitcher
        s24 = p.get("stats2024") or {}
        s25 = p.get("stats2025") or {}
        st  = p.get("st2026")    or {}

        # FIP score (lower = better pitcher)
        fip = pitcher_blended_fip(p)
        fip_score = min(40, max(0, (5.50 - fip) / 2.50 * 40))

        # K/9
        k9 = weighted_avg(s24, s25, st, "k_per_9") or weighted_avg(s24, s25, st, "k9") or 8.0
        k9_score = min(20, max(0, (k9 - 5.0) / 7.0 * 20))

        # BB/9 (lower = better)
        bb9 = weighted_avg(s24, s25, st, "bb_per_9") or weighted_avg(s24, s25, st, "bb9") or 3.0
        bb9_score = min(10, max(0, (5.0 - bb9) / 3.0 * 10))

        # WHIP
        whip = weighted_avg(s24, s25, st, "whip") or 1.25
        whip_score = min(10, max(0, (1.80 - whip) / 0.80 * 10))

        # Park factor (bad for pitcher if hitter-friendly)
        park = (self.parks or {}).get(self.venue) or {}
        pf = n(park, "factor") or n(park, "parkFactor") or 100
        park_penalty = min(10, max(0, (pf - 85) / 30 * 10))

        # Weather (wind out = bad for pitcher)
        w = (self.weather or {}).get(self.venue) or {}
        wind_dir = (w.get("windDir") or w.get("wind_dir") or "").lower()
        wind_speed = n(w, "windSpeed") or n(w, "wind_speed") or 8
        weather_penalty = 0
        out_words = ["out", "blowing out"]
        if any(ow in wind_dir for ow in out_words):
                        weather_penalty = min(5, wind_speed / 10 * 5)

        total = fip_score + k9_score + bb9_score + whip_score - park_penalty * 0.3 - weather_penalty * 0.3
        total = max(0, min(100, total))
        grade = score_to_grade(total)
        proj_pts = 10 + (total - 40) * 0.4

        return {
                        "name":     p.get("name") or p.get("player_name"),
                        "id":       p.get("id") or p.get("mlbId"),
                        "team":     p.get("team"),
                        "salary":   p.get("salary"),
                        "grade":    grade,
                        "score":    round(total, 2),
                        "projPts":  round(proj_pts, 2),
                        "fip":      round(fip, 2),
                        "scoreBreakdown": {
                                            "fip":          round(fip_score, 2),
                                            "k9":           round(k9_score, 2),
                                            "bb9":          round(bb9_score, 2),
                                            "whip":         round(whip_score, 2),
                                            "parkPenalty":  round(park_penalty, 2),
                                            "weatherPenalty": round(weather_penalty, 2)
                        }
        }


# -----------------------------------------------------------------------
# Batch grading for full slate
# -----------------------------------------------------------------------

def grade_slate(batters, pitchers, parks, weather):
        """
            Grade all batters and pitchers for today's DFS slate.

                Args:
                        batters  : list of batter dicts (with stats2024/2025/st2026/h2h/splits/pitch_baa)
                                pitchers : list of pitcher dicts or dict keyed by id/team
                                        parks    : dict of park factors keyed by venue
                                                weather  : dict of weather data keyed by venue

                                                    Returns:
                                                            dict with 'batters' (sorted by score desc) and 'pitchers'
                                                                """
    # Build pitcher lookup
    pitcher_map = {}
    pitcher_list = pitchers if isinstance(pitchers, list) else list(pitchers.values() if isinstance(pitchers, dict) else [])
    for p in pitcher_list:
                for key in ["id", "mlbId", "team", "pitcher_team"]:
                                val = p.get(key)
                                if val:
                                                    pitcher_map[str(val)] = p

                        graded_batters = []
    for b in (batters or []):
                # Find opposing pitcher
                pitcher = None
        for key in ["pitcherId", "pitcher_id", "opposing_pitcher"]:
                        val = b.get(key)
                        if val and str(val) in pitcher_map:
                                            pitcher = pitcher_map[str(val)]
                                            break
                                    if not pitcher:
                                                    opp = b.get("opp") or b.get("opponent") or ""
                                                    pitcher = pitcher_map.get(opp)

        is_home = b.get("home") is True or b.get("is_home") is True or b.get("homeAway") == "home"
        venue   = b.get("venue") or b.get("game_venue") or (pitcher.get("venue") if pitcher else "") or ""

        ctx = {
                        "is_home": is_home,
                        "venue":   venue,
                        "parks":   parks or {},
                        "weather": weather or {}
        }

        try:
                        grader = HitterGrader(b, pitcher, ctx)
            result = grader.grade()
            graded_batters.append({**b, **result})
except Exception as exc:
            log.warning("HitterGrader failed for %s: %s", b.get("name"), exc)
            graded_batters.append({**b, "grade": "C", "score": 41, "projPts": 5.0})

    # Sort by score descending
    graded_batters.sort(key=lambda x: x.get("score", 0), reverse=True)

    graded_pitchers = []
    for p in pitcher_list:
                venue  = p.get("venue") or ""
        ctx    = {"venue": venue, "parks": parks or {}, "weather": weather or {}}
        try:
                        grader = PitcherGrader(p, ctx)
            result = grader.grade()
            graded_pitchers.append({**p, **result})
except Exception as exc:
            log.warning("PitcherGrader failed for %s: %s", p.get("name"), exc)
            graded_pitchers.append({**p, "grade": "C", "score": 41, "projPts": 10.0})

    graded_pitchers.sort(key=lambda x: x.get("score", 0), reverse=True)

    return {
                "batters":  graded_batters,
                "pitchers": graded_pitchers,
                "graded_at": datetime.utcnow().isoformat() + "Z",
                "count":    {"batters": len(graded_batters), "pitchers": len(graded_pitchers)}
    }
