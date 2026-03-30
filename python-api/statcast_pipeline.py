import os
import json
import time
import logging
import hashlib
from datetime import datetime
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
# Statcast pipeline
# ---------------------------------------------------------------------------

class StatcastPipeline:
    def __init__(self):
        self.season = CURRENT_SEASON
        self.season_weights = SEASON_WEIGHTS
        self.spring_blend = SPRING_BLEND_INTO_SEASON

    # ---- Hitter data -------------------------------------------------------

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
        xba  = df["estimated_ba_using_speedangle"].mean() if "estimated_ba_using_speedangle" in df else None
        xslg = df["estimated_slg_using_speedangle"].mean() if "estimated_slg_using_speedangle" in df else None
        xwoba = df["estimated_woba_using_speedangle"].mean() if "estimated_woba_using_speedangle" in df else None
        ev   = df["launch_speed"].mean() if "launch_speed" in df else None
        la   = df["launch_angle"].mean() if "launch_angle" in df else None
        barrel_mask = (df.get("launch_speed", pd.Series(dtype=float)) >= 98) &                       (df.get("launch_angle", pd.Series(dtype=float)).between(26, 30))
        barrel_pct = barrel_mask.mean() if pa > 0 else None
        k_mask   = df["description"].isin(["swinging_strike", "called_strike", "swinging_strike_blocked"]) if "description" in df.columns else pd.Series(False, index=df.index)
        bb_mask  = df["events"].isin(["walk"]) if "events" in df.columns else pd.Series(False, index=df.index)
        k_rate   = k_mask.mean()
        bb_rate  = bb_mask.mean()
        hard_hit = (df["launch_speed"] >= 95).mean() if "launch_speed" in df else None
        return {
            "pa": pa,
            "xba": round(xba, 3) if xba is not None else None,
            "xslg": round(xslg, 3) if xslg is not None else None,
            "xwoba": round(xwoba, 3) if xwoba is not None else None,
            "ev": round(ev, 1) if ev is not None else None,
            "la": round(la, 1) if la is not None else None,
            "barrel_pct": round(float(barrel_pct) * 100, 1) if barrel_pct is not None else None,
            "k_rate": round(float(k_rate) * 100, 1),
            "bb_rate": round(float(bb_rate) * 100, 1),
            "hard_hit_pct": round(float(hard_hit) * 100, 1) if hard_hit is not None else None,
        }

    # ---- Pitcher data -------------------------------------------------------

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
        velo = df["release_speed"].mean() if "release_speed" in df else None
        spin = df["release_spin_rate"].mean() if "release_spin_rate" in df else None
        xera = df["estimated_woba_using_speedangle"].mean() if "estimated_woba_using_speedangle" in df else None
        k_mask = df["description"].isin(["swinging_strike", "called_strike", "swinging_strike_blocked"]) if "description" in df.columns else pd.Series(False, index=df.index)
        swstr = k_mask.mean()
        whiff_mask = df["description"].isin(["swinging_strike", "swinging_strike_blocked"]) if "description" in df.columns else pd.Series(False, index=df.index)
        whiff = whiff_mask.mean()
        gb_mask = df["bb_type"].isin(["ground_ball"]) if "bb_type" in df.columns else pd.Series(False, index=df.index)
        gb_rate = gb_mask.mean()
        return {
            "pitches": pitches,
            "velo": round(velo, 1) if velo is not None else None,
            "spin": round(spin, 0) if spin is not None else None,
            "xera_proxy": round(float(xera), 3) if xera is not None else None,
            "swstr_rate": round(float(swstr) * 100, 1),
            "whiff_rate": round(float(whiff) * 100, 1),
            "gb_rate": round(float(gb_rate) * 100, 1),
        }

    # ---- Team K rates -------------------------------------------------------

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

    # ---- Weighted multi-season stats ----------------------------------------

    def weighted_hitter_stats(self, player_id: int, name: str = "") -> dict:
        seasons_data = []
        weights = []
        years = [self.season] + PRIOR_SEASONS
        wt_keys = ["current", "prior1", "prior2", "prior3"]
        for yr, wk in zip(years, wt_keys):
            old_season = self.season
            self.season = yr
            d = self.fetch_hitter_statcast(player_id, name)
            self.season = old_season
            if d:
                seasons_data.append(d)
                weights.append(self.season_weights.get(wk, 0.0))
        if not seasons_data:
            return {}
        total_w = sum(weights[:len(seasons_data)])
        if total_w == 0:
            return {}
        result = {}
        numeric_keys = ["xba", "xslg", "xwoba", "ev", "la", "barrel_pct", "k_rate", "bb_rate", "hard_hit_pct"]
        for k in numeric_keys:
            vals = [d.get(k) for d in seasons_data]
            ws   = weights[:len(seasons_data)]
            pairs = [(v, w) for v, w in zip(vals, ws) if v is not None]
            if pairs:
                result[k] = round(sum(v * w for v, w in pairs) / sum(w for _, w in pairs), 3)
        result["pa"] = seasons_data[0].get("pa", 0)
        return result

    def weighted_pitcher_stats(self, player_id: int, name: str = "") -> dict:
        seasons_data = []
        weights = []
        years = [self.season] + PRIOR_SEASONS
        wt_keys = ["current", "prior1", "prior2", "prior3"]
        for yr, wk in zip(years, wt_keys):
            old_season = self.season
            self.season = yr
            d = self.fetch_pitcher_statcast(player_id, name)
            self.season = old_season
            if d:
                seasons_data.append(d)
                weights.append(self.season_weights.get(wk, 0.0))
        if not seasons_data:
            return {}
        total_w = sum(weights[:len(seasons_data)])
        if total_w == 0:
            return {}
        result = {}
        numeric_keys = ["velo", "spin", "xera_proxy", "swstr_rate", "whiff_rate", "gb_rate"]
        for k in numeric_keys:
            vals = [d.get(k) for d in seasons_data]
            ws   = weights[:len(seasons_data)]
            pairs = [(v, w) for v, w in zip(vals, ws) if v is not None]
            if pairs:
                result[k] = round(sum(v * w for v, w in pairs) / sum(w for _, w in pairs), 3)
        result["pitches"] = seasons_data[0].get("pitches", 0)
        return result


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

pipeline = StatcastPipeline()


if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO)
    test_id = int(sys.argv[1]) if len(sys.argv) > 1 else 660271
    print("Hitter stats:", pipeline.fetch_hitter_statcast(test_id))
