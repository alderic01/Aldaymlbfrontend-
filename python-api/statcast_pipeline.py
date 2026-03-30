import os
import json
import time
import logging
import hashlib
from datetime import datetime, date
from pathlib import Path

import pandas as pd
import requests

from pybaseball import (
    statcast_batter, statcast_pitcher,
    batting_stats, pitching_stats,
    playerid_lookup, team_batting,
)
from pybaseball import cache as pb_cache

from config import (
    SEASON_WEIGHTS, SPRING_BLEND_INTO_SEASON,
    CACHE_DIR, DATA_DIR, normalize_stat, STATCAST_BENCHMARKS,
    CURRENT_SEASON,
)

log = logging.getLogger(__name__)

Path(CACHE_DIR).mkdir(parents=True, exist_ok=True)
Path(DATA_DIR).mkdir(parents=True, exist_ok=True)
pb_cache.enable()

CURRENT_YEAR = datetime.now().year
PRIOR_SEASONS = [CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3]

MLB_API_BASE = "https://statsapi.mlb.com/api/v1"


# ---------------------------------------------------------------------------
# Disk cache helpers
# ---------------------------------------------------------------------------

def cachepath(key: str) -> Path:
    h = hashlib.md5(key.encode()).hexdigest()[:12]
    return Path(CACHE_DIR) / f"{h}.pkl"


def jsoncache_path(key: str) -> Path:
    h = hashlib.md5(key.encode()).hexdigest()[:12]
    return Path(CACHE_DIR) / f"{h}.json"


def load_cache(path: Path):
    if path.exists() and (time.time() - path.stat().st_mtime) < 3600 * 6:
        try:
            import pickle
            with open(path, "rb") as f:
                return pickle.load(f)
        except Exception:
            pass
    return None


def save_cache(path: Path, obj):
    try:
        import pickle
        with open(path, "wb") as f:
            pickle.dump(obj, f)
    except Exception as e:
        log.warning("Cache save failed: %s", e)


def load_json_cache(path: Path):
    if path.exists() and (time.time() - path.stat().st_mtime) < 3600 * 6:
        try:
            with open(path) as f:
                return json.load(f)
        except Exception:
            pass
    return None


def save_json_cache(path: Path, obj):
    try:
        with open(path, "w") as f:
            json.dump(obj, f)
    except Exception as e:
        log.warning("JSON cache save failed: %s", e)


# ---------------------------------------------------------------------------
# MLB schedule helpers (called by api.py)
# ---------------------------------------------------------------------------

def fetch_today_schedule() -> list:
    today = date.today().strftime("%Y-%m-%d")
    jp = jsoncache_path(f"schedule_{today}")
    cached = load_json_cache(jp)
    if cached is not None:
        return cached
    try:
        url = f"{MLB_API_BASE}/schedule?sportId=1&date={today}&hydrate=team,lineupInfo,probablePitcher"
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        games = []
        for gdate in data.get("dates", []):
            for g in gdate.get("games", []):
                games.append({
                    "game_pk": g.get("gamePk"),
                    "game_date": today,
                    "home_team": g.get("teams", {}).get("home", {}).get("team", {}).get("abbreviation", "UNK"),
                    "away_team": g.get("teams", {}).get("away", {}).get("team", {}).get("abbreviation", "UNK"),
                    "home_probable": _extract_probable(g, "home"),
                    "away_probable": _extract_probable(g, "away"),
                    "home_lineup":   _extract_lineup(g, "home"),
                    "away_lineup":   _extract_lineup(g, "away"),
                })
        save_json_cache(jp, games)
        log.info("Fetched %d games for %s", len(games), today)
        return games
    except Exception as e:
        log.error("fetch_today_schedule failed: %s", e)
        return []


def _extract_probable(game: dict, side: str) -> dict:
    try:
        pp = game["teams"][side].get("probablePitcher", {})
        return {"id": pp.get("id"), "name": pp.get("fullName", "TBD")}
    except Exception:
        return {"id": None, "name": "TBD"}


def _extract_lineup(game: dict, side: str) -> list:
    try:
        info = game["teams"][side].get("lineupInfo", {})
        lineup = info.get("lineup", [])
        return [
            {"id": p.get("id"), "name": p.get("fullName", ""), "order": i + 1}
            for i, p in enumerate(lineup)
        ]
    except Exception:
        return []


def build_profiles_for_slate(games: list) -> dict:
    hitter_profiles  = {}
    pitcher_profiles = {}
    for game in games:
        home = game.get("home_team", "UNK")
        away = game.get("away_team", "UNK")
        for side, pitcher_info in [("home", game.get("home_probable", {})),
                                    ("away", game.get("away_probable", {}))]:
            pid = pitcher_info.get("id")
            if not pid:
                continue
            team = home if side == "home" else away
            opp  = away if side == "home" else home
            stats = pipeline.weighted_pitcher_stats(pid, pitcher_info.get("name", ""))
            pitcher_profiles[pid] = {
                "player_id": pid, "player_name": pitcher_info.get("name", "TBD"),
                "team": team, "opp": opp, "hand": "R",
                "game_pk": game.get("game_pk"),
                "statcast": stats, "profile": {"blended": stats},
            }
        for side, lineup in [("home", game.get("home_lineup", [])),
                               ("away", game.get("away_lineup", []))]:
            for player in lineup:
                pid = player.get("id")
                if not pid:
                    continue
                team = home if side == "home" else away
                opp  = away if side == "home" else home
                opp_pitcher = game.get(
                    "away_probable" if side == "home" else "home_probable", {}
                ).get("id")
                stats = pipeline.weighted_hitter_stats(pid, player.get("name", ""))
                hitter_profiles[pid] = {
                    "player_id": pid, "player_name": player.get("name", ""),
                    "team": team, "opp": opp,
                    "batting_order": player.get("order", 5),
                    "bat_side": "R", "is_home": side == "home",
                    "game_pk": game.get("game_pk"),
                    "opp_pitcher_id": opp_pitcher,
                    "statcast": stats, "profile": {"blended": stats},
                }
    log.info("Built profiles: %d hitters, %d pitchers",
             len(hitter_profiles), len(pitcher_profiles))
    return {"hitters": hitter_profiles, "pitchers": pitcher_profiles}


def fetch_team_k_rates(season: int = None) -> dict:
    return pipeline.fetch_team_k_rates(season)


# ---------------------------------------------------------------------------
# Statcast pipeline class
# ---------------------------------------------------------------------------

class StatcastPipeline:
    def __init__(self):
        self.season         = CURRENT_SEASON
        self.season_weights = SEASON_WEIGHTS
        self.spring_blend   = SPRING_BLEND_INTO_SEASON

    def fetch_hitter_statcast(self, player_id: int, name: str = "") -> dict:
        key = f"hitter_statcast_{player_id}_{self.season}"
        cp = cachepath(key)
        cached = load_cache(cp)
        if cached is not None:
            return cached
        try:
            df = statcast_batter(f"{self.season}-01-01", f"{self.season}-12-31", player_id)
            if df is None or df.empty:
                return {}
            result = self._aggregate_hitter(df)
            save_cache(cp, result)
            return result
        except Exception as e:
            log.error("fetch_hitter_statcast %s: %s", name or player_id, e)
            return {}

    def _aggregate_hitter(self, df) -> dict:
        pa = len(df)
        if pa == 0:
            return {}
        xba   = df["estimated_ba_using_speedangle"].mean()  if "estimated_ba_using_speedangle"  in df else None
        xslg  = df["estimated_slg_using_speedangle"].mean() if "estimated_slg_using_speedangle"  in df else None
        xwoba = df["estimated_woba_using_speedangle"].mean() if "estimated_woba_using_speedangle" in df else None
        ev    = df["launch_speed"].mean()  if "launch_speed"  in df else None
        la    = df["launch_angle"].mean()  if "launch_angle"  in df else None
        if "launch_speed" in df and "launch_angle" in df:
            barrel_pct = ((df["launch_speed"] >= 98) & (df["launch_angle"].between(26, 30))).mean()
        else:
            barrel_pct = None
        k_mask   = df["description"].isin(["swinging_strike","called_strike","swinging_strike_blocked"]) if "description" in df.columns else pd.Series(False, index=df.index)
        bb_mask  = df["events"].isin(["walk"]) if "events" in df.columns else pd.Series(False, index=df.index)
        hard_hit = (df["launch_speed"] >= 95).mean() if "launch_speed" in df else None
        return {
            "pa": pa,
            "xba":         round(xba,   3) if xba   is not None else None,
            "xslg":        round(xslg,  3) if xslg  is not None else None,
            "xwoba":       round(xwoba, 3) if xwoba is not None else None,
            "ev":          round(ev, 1)    if ev    is not None else None,
            "la":          round(la, 1)    if la    is not None else None,
            "barrel_pct":  round(float(barrel_pct) * 100, 1) if barrel_pct is not None else None,
            "k_rate":      round(float(k_mask.mean())  * 100, 1),
            "bb_rate":     round(float(bb_mask.mean()) * 100, 1),
            "hard_hit_pct":round(float(hard_hit) * 100, 1) if hard_hit is not None else None,
        }

    def fetch_pitcher_statcast(self, player_id: int, name: str = "") -> dict:
        key = f"pitcher_statcast_{player_id}_{self.season}"
        cp = cachepath(key)
        cached = load_cache(cp)
        if cached is not None:
            return cached
        try:
            df = statcast_pitcher(f"{self.season}-01-01", f"{self.season}-12-31", player_id)
            if df is None or df.empty:
                return {}
            result = self._aggregate_pitcher(df)
            save_cache(cp, result)
            return result
        except Exception as e:
            log.error("fetch_pitcher_statcast %s: %s", name or player_id, e)
            return {}

    def _aggregate_pitcher(self, df) -> dict:
        pitches = len(df)
        if pitches == 0:
            return {}
        velo  = df["release_speed"].mean()     if "release_speed"     in df else None
        spin  = df["release_spin_rate"].mean() if "release_spin_rate" in df else None
        xera  = df["estimated_woba_using_speedangle"].mean() if "estimated_woba_using_speedangle" in df else None
        k_mask     = df["description"].isin(["swinging_strike","called_strike","swinging_strike_blocked"]) if "description" in df.columns else pd.Series(False, index=df.index)
        whiff_mask = df["description"].isin(["swinging_strike","swinging_strike_blocked"]) if "description" in df.columns else pd.Series(False, index=df.index)
        gb_mask    = df["bb_type"].isin(["ground_ball"]) if "bb_type" in df.columns else pd.Series(False, index=df.index)
        return {
            "pitches":    pitches,
            "velo":       round(velo, 1)  if velo is not None else None,
            "spin":       round(spin, 0)  if spin is not None else None,
            "xera_proxy": round(float(xera), 3)  if xera is not None else None,
            "swstr_rate": round(float(k_mask.mean())     * 100, 1),
            "whiff_rate": round(float(whiff_mask.mean()) * 100, 1),
            "gb_rate":    round(float(gb_mask.mean())    * 100, 1),
        }

    def fetch_team_k_rates(self, season: int = None) -> dict:
        if season is None:
            season = self.season
        key = f"team_k_rates_{season}"
        jp = jsoncache_path(key)
        cached = load_json_cache(jp)
        if cached is not None:
            return cached
        try:
            df = team_batting(season)
            if df is None or df.empty:
                return {}
            df = df[["Team", "SO", "PA"]].dropna()
            df["k_rate"] = df["SO"] / df["PA"]
            result = dict(zip(df["Team"], df["k_rate"].round(3)))
            save_json_cache(jp, result)
            return result
        except Exception as e:
            log.error("fetch_team_k_rates %s: %s", season, e)
            return {}

    def weighted_hitter_stats(self, player_id: int, name: str = "") -> dict:
        seasons_data, weights = [], []
        for yr, wk in zip([self.season] + PRIOR_SEASONS,
                          ["current", "prior1", "prior2", "prior3"]):
            old_s = self.season
            self.season = yr
            d = self.fetch_hitter_statcast(player_id, name)
            self.season = old_s
            if d:
                seasons_data.append(d)
                weights.append(self.season_weights.get(wk, 0.0))
        if not seasons_data:
            return {}
        result = {}
        for k in ["xba","xslg","xwoba","ev","la","barrel_pct","k_rate","bb_rate","hard_hit_pct"]:
            pairs = [(d.get(k), w) for d, w in zip(seasons_data, weights) if d.get(k) is not None]
            if pairs:
                tw = sum(w for _, w in pairs)
                result[k] = round(sum(v * w for v, w in pairs) / tw, 3) if tw else None
        result["pa"] = seasons_data[0].get("pa", 0)
        return result

    def weighted_pitcher_stats(self, player_id: int, name: str = "") -> dict:
        seasons_data, weights = [], []
        for yr, wk in zip([self.season] + PRIOR_SEASONS,
                          ["current", "prior1", "prior2", "prior3"]):
            old_s = self.season
            self.season = yr
            d = self.fetch_pitcher_statcast(player_id, name)
            self.season = old_s
            if d:
                seasons_data.append(d)
                weights.append(self.season_weights.get(wk, 0.0))
        if not seasons_data:
            return {}
        result = {}
        for k in ["velo","spin","xera_proxy","swstr_rate","whiff_rate","gb_rate"]:
            pairs = [(d.get(k), w) for d, w in zip(seasons_data, weights) if d.get(k) is not None]
            if pairs:
                tw = sum(w for _, w in pairs)
                result[k] = round(sum(v * w for v, w in pairs) / tw, 3) if tw else None
        result["pitches"] = seasons_data[0].get("pitches", 0)
        return result


# ---------------------------------------------------------------------------
# Module-level singleton (must be AFTER the class definition)
# ---------------------------------------------------------------------------

pipeline = StatcastPipeline()


if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO)
    test_id = int(sys.argv[1]) if len(sys.argv) > 1 else 660271
    print("Hitter stats:", pipeline.fetch_hitter_statcast(test_id))
