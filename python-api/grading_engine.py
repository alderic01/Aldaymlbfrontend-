import logging
from datetime import datetime
from config import (
    score_to_grade, normalize_stat, get_park_factor,
    HITTER_WEIGHTS, PITCHER_WEIGHTS, PITCH_MATCHUP,
    LINEUP_SPOT_BONUS, PLATOON_ADV, STATCAST_BENCHMARKS
)

log = logging.getLogger(__name__)


class HitterGrader:
    def __init__(self, batter, pitcher, game_context):
        self.batter    = batter
        self.pitcher   = pitcher
        self.ctx       = game_context
        self.bp        = batter.get("profile", {})
        self.blended   = self.bp.get("blended", {})
        self.pp        = pitcher.get("profile", {})
        self.p_blended = self.pp.get("blended", {})
        self.bat_side  = batter.get("bat_side", "R")
        self.p_hand    = pitcher.get("hand", "R")
        self.order     = batter.get("batting_order", 6)
        self.home_team = batter.get("team") if batter.get("is_home") else batter.get("opp")

    def _statcast_score(self):
        b     = self.blended
        ev    = normalize_stat(b.get("exit_velocity", 88.5), "exit_velocity")
        brl   = normalize_stat(b.get("barrel_pct", 8.0),    "barrel_pct")
        hh    = normalize_stat(b.get("hard_hit_pct", 38.0), "hard_hit_pct")
        xwoba = normalize_stat(b.get("xwoba", .315),         "xwoba")
        raw   = xwoba * 0.35 + brl * 0.30 + ev * 0.20 + hh * 0.15
        return round(raw * 35, 2)

    def _discipline_score(self):
        b          = self.blended
        k_norm     = normalize_stat(b.get("k_pct", 22.0),    "k_pct", invert=True)
        bb_norm    = normalize_stat(b.get("bb_pct", 8.0),    "bb_pct")
        chase      = b.get("chase_rate", 30.0)
        chase_norm = max(0.0, min(1.0, 1.0 - (chase - 15) / 35))
        raw        = k_norm * 0.45 + bb_norm * 0.30 + chase_norm * 0.25
        return round(raw * 20, 2)

    def _matchup_score(self):
        platoon_key  = (self.bat_side, self.p_hand)
        platoon_adj  = PLATOON_ADV.get(platoon_key, 0.0)
        platoon_norm = (platoon_adj + 0.035) / 0.070

        arsenal      = self.pp.get("arsenal", {})
        usage        = arsenal.get("usage", {})
        hitter_type  = self._classify_hitter()
        pitch_matrix = PITCH_MATCHUP.get(hitter_type, PITCH_MATCHUP["neutral"])

        pitch_score = 0.0
        for pitch_type, pct in usage.items():
            if pct > 5:
                mult = pitch_matrix.get(pitch_type, 1.0)
                pitch_score += (mult - 1.0) * (pct / 100)
        pitch_norm = max(0.0, min(1.0, 0.5 + pitch_score * 3))

        p_bb_pct     = self.p_blended.get("bb_pct", 8.0)
        p_barrel     = self.p_blended.get("barrel_pct_allowed", 8.0)
        pitcher_vuln = (
            normalize_stat(p_bb_pct, "bb_pct") * 0.3 +
            normalize_stat(p_barrel, "barrel_pct") * 0.7
        )

        raw = platoon_norm * 0.40 + pitch_norm * 0.35 + pitcher_vuln * 0.25
        return round(raw * 30, 2), platoon_adj

    def _context_score(self):
        park_adj  = get_park_factor(self.home_team or "", "hr")
        park_norm = max(0.0, min(1.0, 0.5 + park_adj * 2))
        implied   = self.ctx.get("home_implied_runs", 4.5) if self.batter.get("is_home") else self.ctx.get("away_implied_runs", 4.5)
        run_norm  = max(0.0, min(1.0, (implied - 3.0) / 4.0))
        spot_bonus = LINEUP_SPOT_BONUS.get(self.order, 0.0)
        spot_norm  = max(0.0, min(1.0, 0.5 + spot_bonus * 4))
        raw = park_norm * 0.35 + run_norm * 0.40 + spot_norm * 0.25
        return round(raw * 15, 2)

    def _classify_hitter(self):
        b   = self.blended
        ev  = b.get("exit_velocity", 88.5)
        brl = b.get("barrel_pct", 8.0)
        if self.bat_side == "L":
            return "contact_lhh"
        if ev >= 93 and brl >= 12:
            return "pull_power_rhh"
        return "speed_contact_rhh"

    def _generate_report(self, grade, fires, platoon_adj, score):
        b       = self.blended
        bname   = self.batter.get("player_name", "This hitter")
        pname   = self.pitcher.get("player_name", "the opposing pitcher")
        home    = self.home_team or "the park"
        ev      = b.get("exit_velocity", 88.5)
        brl     = b.get("barrel_pct", 8.0)
        xwoba   = b.get("xwoba", .315)
        k_pct   = b.get("k_pct", 22.0)
        p_sw    = self.p_blended.get("sw_str_pct", 11.0)
        arsenal = self.pp.get("arsenal", {})
        usage   = arsenal.get("usage", {})
        velocity = arsenal.get("velocity", {})
        primary_pitch = max(usage, key=usage.get) if usage else "FF"
        primary_velo  = velocity.get(primary_pitch, 93)
        primary_pct   = usage.get(primary_pitch, 50)
        pitch_names   = {"FF":"4-seam fastball","SI":"sinker","FC":"cutter",
                         "SL":"slider","CU":"curveball","CH":"changeup",
                         "FS":"splitter","ST":"sweeper","KC":"knuckle curve"}
        primary_name  = pitch_names.get(primary_pitch, primary_pitch)

        if grade == "A+":
            opener  = f"{bname} is the highest-ceiling play on this slate."
            quality = f"His {ev} mph avg exit velocity and {brl}% barrel rate place him in the top tier."
            matchup = f"{pname} relies on the {primary_name} at {primary_velo} mph ({primary_pct:.0f}% usage) — a pitch his swing path punishes."
        elif grade == "A":
            opener  = f"{bname} is a plus matchup play."
            quality = f"A {xwoba:.3f} xwOBA and {brl}% barrel rate confirm elite quality of contact."
            matchup = f"{pname}'s {primary_name} ({primary_pct:.0f}% usage, {primary_velo} mph) aligns poorly with his zone coverage."
        elif grade == "B+":
            opener  = f"{bname} is an above-average play with genuine upside."
            quality = f"A {xwoba:.3f} xwOBA and {ev} mph avg EV give him solid floor."
            matchup = f"{pname} has a {p_sw}% SwStr% but {bname}'s discipline ({k_pct}% K rate) limits exposure."
        elif grade == "B":
            opener  = f"{bname} is a solid mid-tier play in a neutral matchup."
            quality = f"Avg EV of {ev} mph and xwOBA of {xwoba:.3f} project a reasonable floor."
            matchup = f"{pname}'s arsenal is manageable for {bname}'s contact profile."
        else:
            opener  = f"{bname} is a below-average play — approach with caution."
            quality = f"His {xwoba:.3f} xwOBA and {k_pct}% K rate raise concerns vs {pname}'s arsenal."
            matchup = "This matchup has limited upside in any format."

        plat_note = ""
        if platoon_adj > 0.02:
            plat_note = f" The {self.bat_side}HH vs {self.p_hand}HP platoon advantage adds a meaningful edge (+{platoon_adj:.3f} wOBA)."
        elif platoon_adj < -0.01:
            plat_note = " Same-hand matchup is a headwind — factor this into your exposure."

        park_adj  = get_park_factor(home, "hr")
        park_note = ""
        if park_adj >= 0.08:
            park_note = f" {home} plays as a top-5 HR park (+{park_adj*100:.0f}%), amplifying ceiling."
        elif park_adj <= -0.08:
            park_note = f" {home} suppresses HR by {abs(park_adj)*100:.0f}% — tempers power upside."

        return f"{opener} {quality} {matchup}{plat_note}{park_note}"

    def grade(self):
        sc_score             = self._statcast_score()
        dis_score            = self._discipline_score()
        mat_score, plat_adj  = self._matchup_score()
        ctx_score            = self._context_score()
        total                = sc_score + dis_score + mat_score + ctx_score
        grade, fires         = score_to_grade(total)
        report               = self._generate_report(grade, fires, plat_adj, total)
        b = self.blended
        return {
            "grade":         grade,
            "fires":         fires,
            "matchup_score": round(total, 1),
            "breakdown": {
                "statcast":   round(sc_score, 1),
                "discipline": round(dis_score, 1),
                "matchup":    round(mat_score, 1),
                "context":    round(ctx_score, 1),
            },
            "scouting_report": report,
            "key_stats": {
                "exit_velocity": b.get("exit_velocity"),
                "barrel_pct":    b.get("barrel_pct"),
                "hard_hit_pct":  b.get("hard_hit_pct"),
                "xwoba":         b.get("xwoba"),
                "k_pct":         b.get("k_pct"),
                "bb_pct":        b.get("bb_pct"),
                "wrc_plus":      self.bp.get("wrc_plus"),
                "avg":           self.bp.get("avg"),
                "obp":           self.bp.get("obp"),
                "slg":           self.bp.get("slg"),
            },
            "platoon_advantage": plat_adj,
        }


class PitcherGrader:
    def __init__(self, pitcher, opp_lineup, game_context):
        self.pitcher   = pitcher
        self.lineup    = opp_lineup
        self.ctx       = game_context
        self.pp        = pitcher.get("profile", {})
        self.blended   = self.pp.get("blended", {})
        self.arsenal   = self.pp.get("arsenal", {})
        self.p_hand    = pitcher.get("hand", "R")
        self.is_home   = pitcher.get("is_home", False)
        self.home_team = pitcher.get("team") if self.is_home else pitcher.get("opp")

    def _stuff_score(self):
        b      = self.blended
        stuff  = normalize_stat(b.get("stuff_plus", 100), "stuff_plus")
        sw_str = normalize_stat(b.get("sw_str_pct", 11.0), "sw_str_pct")
        k_pct  = normalize_stat(b.get("k_pct", 22.0), "k_pct")
        fip    = normalize_stat(self.pp.get("fip", 4.10), "fip", invert=True)
        raw    = stuff * 0.30 + sw_str * 0.30 + k_pct * 0.25 + fip * 0.15
        return round(raw * 35, 2)

    def _matchup_score(self):
        if not self.lineup:
            return 17.5
        lhh_count = sum(1 for b in self.lineup if b.get("bat_side") == "L")
        rhh_count = len(self.lineup) - lhh_count
        if self.p_hand == "R":
            platoon_adv = rhh_count * 0.015 - lhh_count * 0.010
        else:
            platoon_adv = lhh_count * 0.015 - rhh_count * 0.010
        plat_norm = max(0.0, min(1.0, 0.5 + platoon_adv / 0.10))

        opp_xwobas    = [b.get("profile", {}).get("blended", {}).get("xwoba", .315) for b in self.lineup]
        avg_opp_xwoba = sum(opp_xwobas) / max(len(opp_xwobas), 1)
        opp_norm      = normalize_stat(avg_opp_xwoba, "xwoba", invert=True)

        opp_k_pcts = [b.get("profile", {}).get("blended", {}).get("k_pct", 22.0) for b in self.lineup]
        avg_opp_k  = sum(opp_k_pcts) / max(len(opp_k_pcts), 1)
        opp_k_norm = normalize_stat(avg_opp_k, "k_pct")

        raw = plat_norm * 0.30 + opp_norm * 0.40 + opp_k_norm * 0.30
        return round(raw * 35, 2)

    def _context_score(self):
        park_adj    = get_park_factor(self.home_team or "", "hr")
        park_norm   = max(0.0, min(1.0, 0.5 - park_adj * 2))
        opp_implied = self.ctx.get("away_implied_runs", 4.5) if self.is_home else self.ctx.get("home_implied_runs", 4.5)
        run_norm    = max(0.0, min(1.0, 1.0 - (opp_implied - 3.0) / 4.0))
        home_norm   = 0.55 if self.is_home else 0.50
        velo_trend  = self.pp.get("velo_trend", 0.0) or 0.0
        velo_norm   = max(0.0, min(1.0, 0.5 + velo_trend / 3.0))
        raw = park_norm * 0.30 + run_norm * 0.35 + home_norm * 0.15 + velo_norm * 0.20
        return round(raw * 30, 2)

    def _build_arsenal_display(self):
        usage    = self.arsenal.get("usage", {})
        velocity = self.arsenal.get("velocity", {})
        pitch_names = {
            "FF":"4-Seam FB","SI":"Sinker","FC":"Cutter","SL":"Slider",
            "CU":"Curveball","CH":"Changeup","FS":"Splitter","ST":"Sweeper",
        }
        pitches = []
        for pt, pct in sorted(usage.items(), key=lambda x: -x[1]):
            if pct < 3:
                continue
            velo = velocity.get(pt, 0)
            pitches.append({
                "pitch": pitch_names.get(pt, pt),
                "code":  pt,
                "velo":  velo,
                "usage": f"{pct:.1f}%",
            })
        return pitches

    def _generate_report(self, grade, score):
        pname    = self.pitcher.get("player_name", "This pitcher")
        opp      = self.pitcher.get("opp", "the opponent")
        b        = self.blended
        k_pct    = b.get("k_pct", 22.0)
        sw_str   = b.get("sw_str_pct", 11.0)
        stuff    = b.get("stuff_plus", 100)
        fip      = self.pp.get("fip", 4.10)
        velo     = b.get("avg_velo", 93.0)
        velo_t   = self.pp.get("velo_trend", 0.0) or 0.0
        barrel   = b.get("barrel_pct_allowed", 8.0)
        usage    = self.arsenal.get("usage", {})
        velocity = self.arsenal.get("velocity", {})
        primary  = max(usage, key=usage.get) if usage else "FF"
        pv       = velocity.get(primary, velo)
        pu       = usage.get(primary, 50)
        pitch_names = {"FF":"4-seam fastball","SI":"sinker","FC":"cutter",
                       "SL":"slider","CU":"curveball","CH":"changeup","FS":"splitter","ST":"sweeper"}
        pname_str = pitch_names.get(primary, "primary pitch")
        park_adj  = get_park_factor(self.home_team or "", "hr")

        velo_note = ""
        if velo_t >= 0.5:
            velo_note = f" Velocity trending up (+{velo_t:.1f} mph vs season avg) — elite sign."
        elif velo_t <= -0.8:
            velo_note = f" Velocity down {abs(velo_t):.1f} mph vs season avg — watch for fatigue."

        if grade == "A+":
            intro = f"{pname} is the elite arm on today's slate."
            body  = f"His {stuff} Stuff+ and {sw_str}% SwStr% project dominance. {opp}'s lineup faces his {pname_str} ({pv:.1f} mph, {pu:.0f}% usage). FIP of {fip:.2f} confirms the ERA is real."
        elif grade == "A":
            intro = f"{pname} is a strong plus play with genuine K upside."
            body  = f"A {k_pct:.1f}% K rate and {sw_str}% SwStr% give him a reliable ceiling. FIP of {fip:.2f} supports his actual performance."
        elif grade in ("B+", "B"):
            intro = f"{pname} is a solid mid-range play with a neutral matchup."
            body  = f"His {k_pct:.1f}% K rate is workable with some K upside. Consider in cash formats or as a contrarian GPP pivot."
        else:
            intro = f"{pname} is a fade — the matchup works against him."
            body  = f"A barrel rate allowed of {barrel:.1f}% and FIP of {fip:.2f} suggest real risk."

        park_note = ""
        if park_adj >= 0.08:
            park_note = " Park plays as a top HR environment — amplifies vulnerability."
        elif park_adj <= -0.08:
            park_note = " Pitcher-friendly park — significant suppression benefit."

        return f"{intro} {body}{velo_note}{park_note}"

    def grade(self):
        stuff   = self._stuff_score()
        matchup = self._matchup_score()
        context = self._context_score()
        total   = stuff + matchup + context
        grade, fires = score_to_grade(total)
        report  = self._generate_report(grade, total)
        return {
            "grade":         grade,
            "fires":         fires,
            "matchup_score": round(total, 1),
            "breakdown":     {"stuff": round(stuff,1), "matchup": round(matchup,1), "context": round(context,1)},
            "scouting_report": report,
            "key_stats": {
                "k_pct":          self.blended.get("k_pct"),
                "bb_pct":         self.blended.get("bb_pct"),
                "sw_str_pct":     self.blended.get("sw_str_pct"),
                "barrel_allowed": self.blended.get("barrel_pct_allowed"),
                "xwoba_allowed":  self.blended.get("xwoba_allowed"),
                "stuff_plus":     self.blended.get("stuff_plus"),
                "avg_velo":       self.blended.get("avg_velo"),
                "fip":            self.pp.get("fip"),
                "era":            self.pp.get("era"),
                "xfip":           self.pp.get("xfip"),
                "velo_trend":     self.pp.get("velo_trend"),
            },
            "arsenal": self._build_arsenal_display(),
        }


def grade_full_slate(slate_data, game_contexts, team_k_rates=None):
    hitter_grades  = {}
    pitcher_grades = {}
    pitchers = slate_data.get("pitchers", {})
    batters  = slate_data.get("hitters", slate_data.get("batters", {}))

    log.info(f"Grading {len(pitchers)} pitchers...")
    for pid, pdata in pitchers.items():
        game_pk     = pdata.get("game_pk")
        ctx         = game_contexts.get(game_pk, {})
        opp_batters = [b for b in batters.values()
                       if b.get("game_pk") == game_pk and b.get("team") == pdata.get("opp")]
        grader = PitcherGrader(pdata, opp_batters, ctx)
        result = grader.grade()
        pitcher_grades[pid] = {**pdata, **result}
        log.info(f"  {pdata['player_name']}: {result['grade']} ({result['matchup_score']:.1f}/100)")

    log.info(f"Grading {len(batters)} batters...")
    for bid, bdata in batters.items():
        opp_pitcher_id = str(bdata.get("opp_pitcher_id", ""))
        pitcher        = pitchers.get(opp_pitcher_id, {})
        game_pk        = bdata.get("game_pk")
        ctx            = game_contexts.get(game_pk, {})
        grader = HitterGrader(bdata, pitcher, ctx)
        result = grader.grade()
        hitter_grades[bid] = {**bdata, **result}

    sorted_pitchers = sorted(pitcher_grades.values(), key=lambda x: x.get("matchup_score", 0), reverse=True)
    for rank, p in enumerate(sorted_pitchers, 1):
        pitcher_grades[str(p["player_id"])]["dvp_rank"] = rank

    return {
        "hitters":   hitter_grades,
        "pitchers":  pitcher_grades,
        "graded_at": datetime.now().isoformat(),
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    log.info("Grading engine ready.")
