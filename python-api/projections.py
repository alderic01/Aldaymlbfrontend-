import logging
from datetime import datetime
from config import DK_SCORING, DK_SALARY_CAP, get_park_factor

log = logging.getLogger(__name__)


class HitterProjection:
    BASELINE_DK_PTS = 8.0
    GRADE_MULTIPLIERS = {
        "A+": 1.55, "A": 1.35, "B+": 1.18,
        "B":  1.05, "C": 0.90, "D":  0.72,
    }

    def __init__(self, player_data: dict, grade_result: dict, dk_salary: int,
                 implied_runs: float = 4.5):          # FIX 1: was `def init`
        self.player    = player_data
        self.grade     = grade_result
        self.salary    = dk_salary
        self.implied   = implied_runs
        self.blended   = player_data.get("profile", {}).get("blended", {})
        self.order     = player_data.get("batting_order", 5)
        self.is_home   = player_data.get("is_home", False)
        self.home      = player_data.get("team") if self.is_home else player_data.get("opp")
        self.grade_ltr = grade_result.get("grade", "C")

    def _pa_factor(self) -> float:
        order_pa = {1: 1.10, 2: 1.08, 3: 1.05, 4: 1.02, 5: 1.00,
                    6: 0.97, 7: 0.94, 8: 0.91, 9: 0.88}
        return order_pa.get(self.order, 1.00)

    def _park_factor(self) -> float:
        adj = get_park_factor(self.home or "", "hr")
        return 1.0 + adj * 0.4

    def _vegas_factor(self) -> float:
        return max(0.75, min(1.35, 1.0 + (self.implied - 4.5) * 0.06))

    def _xwoba_to_dk_pts(self) -> float:
        xwoba  = self.blended.get("xwoba", .315)
        base   = max(1.0, (xwoba - 0.150) * 32.0)
        brl    = self.blended.get("barrel_pct", 8.0)
        hr_add = max(0, (brl - 8.0) * 0.25)
        bb_pct = self.blended.get("bb_pct", 8.0)
        bb_add = max(0, (bb_pct - 7.0) * 0.15)
        return base + hr_add + bb_add

    def project(self) -> dict:
        base_dk      = self._xwoba_to_dk_pts()
        grade_mult   = self.GRADE_MULTIPLIERS.get(self.grade_ltr, 1.0)
        pa_factor    = self._pa_factor()
        park_factor  = self._park_factor()
        vegas_factor = self._vegas_factor()

        projected = base_dk * grade_mult * pa_factor * park_factor * vegas_factor  # FIX 2: missing *
        projected = max(2.0, min(35.0, projected))

        value_score = projected / (self.salary / 1000) if self.salary > 0 else 0

        return {
            "projected_dk_pts": round(projected, 2),
            "value_score":      round(value_score, 3),
            "adjustments": {
                "base_dk_pts":  round(base_dk, 2),
                "grade_mult":   grade_mult,
                "pa_factor":    round(pa_factor, 3),
                "park_factor":  round(park_factor, 3),
                "vegas_factor": round(vegas_factor, 3),
            },
            "dk_salary": self.salary,
            "grade":     self.grade_ltr,
            "fires":     self.grade.get("fires", 2),  # FIX 4: was self.grade_result
        }


class PitcherProjection:
    GRADE_MULTIPLIERS = {
        "A+": 1.50, "A": 1.30, "B+": 1.12,
        "B":  1.00, "C": 0.85, "D":  0.65,
    }

    def __init__(self, pitcher_data: dict, grade_result: dict, dk_salary: int,
                 opp_implied: float = 4.5):           # FIX 1: was `def init`
        self.pitcher     = pitcher_data
        self.grade       = grade_result
        self.salary      = dk_salary
        self.opp_implied = opp_implied
        self.blended     = pitcher_data.get("profile", {}).get("blended", {})
        self.grade_ltr   = grade_result.get("grade", "C")

    def _project_innings(self) -> float:
        base_ip = 5.5
        k_pct   = self.blended.get("k_pct", 22.0)
        bb_pct  = self.blended.get("bb_pct", 8.0)
        ip_adj  = (k_pct - 22.0) * 0.05 - (bb_pct - 8.0) * 0.08  # FIX 2: missing *
        return max(3.5, min(9.0, base_ip + ip_adj))

    def _project_ks(self, proj_ip: float) -> float:
        k_pct = self.blended.get("k_pct", 22.0)
        bf    = proj_ip * 4.3
        return bf * (k_pct / 100)

    def _project_er(self, proj_ip: float) -> float:
        fip      = self.pitcher.get("profile", {}).get("fip", 4.10) or 4.10
        er_per_9 = fip * 0.92
        return er_per_9 * proj_ip / 9.0

    def _win_prob(self) -> float:
        opp_low   = max(0, (5.5 - self.opp_implied) / 3.0)
        grade_adj = {"A+": 0.68, "A": 0.62, "B+": 0.56, "B": 0.50, "C": 0.44, "D": 0.38}
        return grade_adj.get(self.grade_ltr, 0.50) + opp_low * 0.05

    def project(self) -> dict:
        proj_ip = self._project_innings()
        proj_ks = self._project_ks(proj_ip)
        proj_er = self._project_er(proj_ip)
        proj_h  = proj_ip * 3.8
        proj_bb = proj_ip * (self.blended.get("bb_pct", 8.0) / 100) * 4.3  # FIX 2
        win_p   = self._win_prob()

        base_pts = (
            proj_ip * DK_SCORING["ip"] +
            proj_ks * DK_SCORING["k_pitch"] +
            win_p   * DK_SCORING["win"] +
            -proj_er * abs(DK_SCORING["er"]) +
            -proj_h  * abs(DK_SCORING["h_allow"]) +
            -proj_bb * abs(DK_SCORING["bb_allow"])
        )

        grade_mult  = self.GRADE_MULTIPLIERS.get(self.grade_ltr, 1.0)
        projected   = max(5.0, min(55.0, base_pts * grade_mult))
        value_score = projected / (self.salary / 1000) if self.salary > 0 else 0

        return {
            "projected_dk_pts": round(projected, 2),
            "value_score":      round(value_score, 3),
            "projections": {
                "ip":    round(proj_ip, 1),
                "ks":    round(proj_ks, 1),
                "er":    round(proj_er, 1),
                "win_p": round(win_p, 3),
            },
            "dk_salary": self.salary,
            "grade":     self.grade_ltr,
            "fires":     self.grade.get("fires", 2),
        }


class StackOptimizer:
    def __init__(self, pitcher_projections: list, hitter_projections: list):  # FIX 1
        self.pitchers = pitcher_projections
        self.hitters  = hitter_projections

    def _sort_pitchers(self) -> list:
        return sorted(self.pitchers, key=lambda x: x.get("projected_dk_pts", 0), reverse=True)

    def _sort_hitters_by_team(self) -> dict:
        by_team = {}
        for h in self.hitters:
            t = h.get("team", "UNK")
            if t not in by_team:
                by_team[t] = []
            by_team[t].append(h)
        for t in by_team:
            by_team[t].sort(key=lambda x: x.get("projected_dk_pts", 0), reverse=True)
        return by_team

    def _team_stack_score(self, team: str) -> float:
        hitters = [h for h in self.hitters if h.get("team") == team]
        if not hitters:
            return 0.0
        top5     = sorted(hitters, key=lambda x: x.get("projected_dk_pts", 0), reverse=True)[:5]
        avg_proj = sum(h.get("projected_dk_pts", 0) for h in top5) / len(top5)
        avg_score = sum(h.get("matchup_score", 50) for h in top5) / len(top5)
        return avg_proj * 0.6 + avg_score * 0.4  # FIX 2: missing *

    def _identify_stack_teams(self, exclude_pitcher_teams: set) -> list:
        by_team = self._sort_hitters_by_team()
        scores  = []
        for team in by_team:
            if team in exclude_pitcher_teams:
                continue
            scores.append((team, self._team_stack_score(team)))
        return sorted(scores, key=lambda x: -x[1])

    def _greedy_optimize(self) -> list:
        lineup      = []
        used_ids    = set()
        used_salary = 0

        sorted_pitchers = self._sort_pitchers()
        pitcher_teams   = set()
        for p in sorted_pitchers[:4]:
            if len([x for x in lineup if x.get("slot_type") == "P"]) >= 2:
                break
            lineup.append({**p, "slot_type": "P"})
            used_ids.add(p["player_id"])
            used_salary += p.get("dk_salary", 0)
            pitcher_teams.add(p.get("team", ""))

        stack_teams    = self._identify_stack_teams(pitcher_teams)
        primary_team   = stack_teams[0][0] if len(stack_teams) > 0 else None
        secondary_team = stack_teams[1][0] if len(stack_teams) > 1 else None
        by_team        = self._sort_hitters_by_team()

        primary_pool  = by_team.get(primary_team, []) if primary_team else []
        primary_count = 0
        for h in primary_pool:
            if primary_count >= 4: break
            if h["player_id"] in used_ids: continue
            if used_salary + h.get("dk_salary", 0) <= DK_SALARY_CAP:
                lineup.append({**h, "slot_type": "BAT", "stack": primary_team})
                used_ids.add(h["player_id"])
                used_salary += h.get("dk_salary", 0)
                primary_count += 1

        secondary_pool  = by_team.get(secondary_team, []) if secondary_team else []
        secondary_count = 0
        for h in secondary_pool:
            if secondary_count >= 3: break
            if h["player_id"] in used_ids: continue
            if used_salary + h.get("dk_salary", 0) <= DK_SALARY_CAP:
                lineup.append({**h, "slot_type": "BAT", "stack": secondary_team})
                used_ids.add(h["player_id"])
                used_salary += h.get("dk_salary", 0)
                secondary_count += 1

        remaining_salary = DK_SALARY_CAP - used_salary
        value_pool = sorted(
            [h for h in self.hitters if h["player_id"] not in used_ids],
            key=lambda x: x.get("value_score", 0), reverse=True
        )
        for h in value_pool:
            if len(lineup) >= 10: break
            if h.get("dk_salary", 0) <= remaining_salary:
                lineup.append({**h, "slot_type": "BAT", "stack": h.get("team")})
                used_ids.add(h["player_id"])
                used_salary += h.get("dk_salary", 0)
                remaining_salary -= h.get("dk_salary", 0)
                break

        return lineup

    def _assign_positions(self, lineup: list) -> list:
        result = []
        used   = set()

        pitchers = [p for p in lineup if p.get("slot_type") == "P"]
        for p in pitchers[:2]:
            result.append({**p, "slot": "P"})
            used.add(p["player_id"])

        hitters = [h for h in lineup if h.get("slot_type") == "BAT" and h["player_id"] not in used]
        for slot in ["C", "1B", "2B", "3B", "SS"]:
            for h in hitters:
                if h["player_id"] in used: continue
                if h.get("position") == slot:
                    result.append({**h, "slot": slot})
                    used.add(h["player_id"])
                    break

        of_count = 0
        for h in hitters:
            if h["player_id"] in used: continue
            if h.get("position") in ["OF", "LF", "CF", "RF"] and of_count < 3:
                result.append({**h, "slot": "OF"})
                used.add(h["player_id"])
                of_count += 1

        for h in hitters:
            if h["player_id"] not in used and len(result) < 10:
                result.append({**h, "slot": h.get("position", "UTIL")})
                used.add(h["player_id"])

        return result

    def optimize(self) -> dict:
        log.info("Running stack optimizer...")
        raw_lineup   = self._greedy_optimize()
        final_lineup = self._assign_positions(raw_lineup)

        total_salary = sum(p.get("dk_salary", 0) for p in final_lineup)
        total_proj   = sum(p.get("projected_dk_pts", 0) for p in final_lineup)
        salary_left  = DK_SALARY_CAP - total_salary

        stack_teams = {}
        for p in final_lineup:
            t = p.get("stack") or p.get("team")
            if t:
                stack_teams[t] = stack_teams.get(t, 0) + 1

        log.info(f"Lineup: {len(final_lineup)} players | ${total_salary:,} | {total_proj:.1f} proj pts")

        return {
            "lineup":         final_lineup,
            "total_salary":   total_salary,
            "salary_left":    salary_left,
            "total_proj_pts": round(total_proj, 2),
            "stack_summary":  stack_teams,
            "lineup_type":    "GPP",
            "generated_at":   datetime.now().isoformat(),  # FIX 5: was import("datetime")
        }


def build_projections(graded_slate: dict, dk_salaries: dict) -> dict:
    hitter_projections  = []
    pitcher_projections = []

    for pid, pdata in graded_slate.get("pitchers", {}).items():
        salary = dk_salaries.get(str(pid)) or dk_salaries.get(pdata.get("player_name"), 8000)
        proj   = PitcherProjection(pdata, pdata, salary, opp_implied=4.5).project()
        pitcher_projections.append({**pdata, **proj, "dk_salary": salary})

    for bid, bdata in graded_slate.get("hitters", {}).items():
        salary = dk_salaries.get(str(bid)) or dk_salaries.get(bdata.get("player_name"), 4000)
        proj   = HitterProjection(bdata, bdata, salary, implied_runs=4.5).project()
        hitter_projections.append({**bdata, **proj, "dk_salary": salary})

    optimizer = StackOptimizer(pitcher_projections, hitter_projections)
    optimal   = optimizer.optimize()

    return {
        "hitters":        sorted(hitter_projections,  key=lambda x: -x.get("projected_dk_pts", 0)),
        "pitchers":       sorted(pitcher_projections, key=lambda x: -x.get("projected_dk_pts", 0)),
        "optimal_lineup": optimal,
        "built_at":       datetime.now().isoformat(),  # FIX 5: was import("datetime")
    }


if __name__ == "__main__":                             # FIX 6: was `if name ==`
    import logging
    logging.basicConfig(level=logging.INFO)
    mock_pitcher = {
        "player_id": 543037, "player_name": "Tyler Glasnow",
        "team": "LAD", "grade": "A+", "fires": 5,
        "profile": {"blended": {"k_pct": 34.2, "bb_pct": 7.1}, "fip": 2.71},
    }
    pp = PitcherProjection(mock_pitcher, mock_pitcher, 10800, opp_implied=3.8)
    print(pp.project())
