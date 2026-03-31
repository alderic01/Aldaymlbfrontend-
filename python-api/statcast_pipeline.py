# python-api/statcast_pipeline.py - v2 FULL DATA PIPELINE
# Fetches: Savant statcast, MLB stats API, H2H history, pitch arsenal BAA,
# spring training 2026, home/away splits, platoon splits, velocity by pitch type

import os
import json
import time
import logging
import hashlib
import pickle
from datetime import datetime, date
from pathlib import Path

import pandas as pd
import requests

from pybaseball import (
    statcast_batter,
    statcast_pitcher,
    batting_stats,
    pitching_stats,
    playerid_lookup,
    team_batting,
)
from pybaseball import cache as pb_cache

from config import (
    SEASON_WEIGHTS,
    SPRING_BLEND_INTO_SEASON,
    CACHE_DIR,
    DATA_DIR,
    normalize_stat,
    STATCAST_BENCHMARKS,
    CURRENT_SEASON,
)

log = logging.getLogger(__name__)

Path(CACHE_DIR).mkdir(parents=True, exist_ok=True)
Path(DATA_DIR).mkdir(parents=True, exist_ok=True)
pb_cache.enable()

CURRENT_YEAR = datetime.now().year
PRIOR_SEASONS = [CURRENT_YEAR - 1, CURRENT_YEAR - 2]
MLB_API_BASE = "https://statsapi.mlb.com/api/v1"

# Spring training date range for 2026
ST_START = "2026-02-20"
ST_END   = "2026-03-25"
ST_SEASON_START = "2026-03-26"

PITCH_NAMES = {
        "FF": "4-Seam FB", "SI": "Sinker", "FC": "Cutter",
        "SL": "Slider", "CU": "Curveball", "KC": "Knuckle Curve",
        "CH": "Changeup", "FS": "Splitter", "ST": "Sweeper",
        "SV": "Slurve", "EP": "Eephus",
}

# ---------------------------------------------------------------------------
# Disk cache helpers
# ---------------------------------------------------------------------------

def cachepath(key: str) -> Path:
        h = hashlib.md5(key.encode()).hexdigest()[:12]
        return Path(CACHE_DIR) / f"{h}.pkl"

def jsoncache_path(key: str) -> Path:
        h = hashlib.md5(key.encode()).hexdigest()[:12]
        return Path(CACHE_DIR) / f"{h}.json"

def load_cache(path: Path, max_age_h: int = 6):
        if path.exists() and (time.time() - path.stat().st_mtime) < 3600 * max_age_h:
                    try:
                                    with open(path, "rb") as f:
                                                        return pickle.load(f)
                    except Exception:
                                    pass
                            return None

def save_cache(path: Path, obj):
        try:
                    with open(path, "wb") as f:
                                    pickle.dump(obj, f)
        except Exception as e:
                    log.warning("Cache save failed: %s", e)

    def load_json_cache(path: Path, max_age_h: int = 6):
            if path.exists() and (time.time() - path.stat().st_mtime) < 3600 * max_age_h:
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
    # MLB API schedule helpers
    # ---------------------------------------------------------------------------

def fetch_today_schedule() -> list:
        today = date.today().strftime("%Y-%m-%d")
        jp = jsoncache_path(f"schedule_{today}")
        cached = load_json_cache(jp)
        if cached is not None:
                    return cached
                try:
                            url = (
                                            f"{MLB_API_BASE}/schedule?sportId=1&date={today}"
                                            f"&hydrate=team,lineupInfo,probablePitcher"
                            )
                            resp = requests.get(url, timeout=10)
                            resp.raise_for_status()
                            data = resp.json()
                            games = []
                            for gdate in data.get("dates", []):
                                            for g in gdate.get("games", []):
                                                                games.append({
                                                                                        "game_pk": g.get("gamePk"),
                                                                                        "game_date": today,
                                                                                        "home_team": g["teams"]["home"]["team"].get("abbreviation", "UNK"),
                                                                                        "away_team": g["teams"]["away"]["team"].get("abbreviation", "UNK"),
                                                                                        "home_probable": _extract_probable(g, "home"),
                                                                                        "away_probable": _extract_probable(g, "away"),
                                                                                        "home_lineup":   _extract_lineup(g, "home"),
                                                                                        "away_lineup":   _extract_lineup(g, "away"),
                                                                                        "venue":         g.get("venue", {}).get("name", ""),
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

# ---------------------------------------------------------------------------
# MLB Stats API helpers: splits, H2H, bat_side
# ---------------------------------------------------------------------------

def fetch_player_info(player_id: int) -> dict:
        """Get bat_side, throw_hand, position from MLB API."""
        key = f"playerinfo_{player_id}"
        jp = jsoncache_path(key)
        cached = load_json_cache(jp, max_age_h=24)
        if cached:
                    return cached
                try:
                            url = f"{MLB_API_BASE}/people/{player_id}?hydrate=currentTeam"
                            r = requests.get(url, timeout=8)
                            r.raise_for_status()
                            p = r.json().get("people", [{}])[0]
                            info = {
                                "bat_side": p.get("batSide", {}).get("code", "R"),
                                "pitch_hand": p.get("pitchHand", {}).get("code", "R"),
                                "position": p.get("primaryPosition", {}).get("abbreviation", ""),
                                "full_name": p.get("fullName", ""),
                            }
                            save_json_cache(jp, info)
                            return info
except Exception as e:
        log.warning("fetch_player_info %s: %s", player_id, e)
        return {"bat_side": "R", "pitch_hand": "R", "position": "", "full_name": ""}

def fetch_hitter_splits(player_id: int, season: int) -> dict:
        """Home/away splits and L/R platoon splits from MLB stats API."""
    key = f"hitter_splits_{player_id}_{season}"
    jp = jsoncache_path(key)
    cached = load_json_cache(jp)
    if cached:
                return cached
            try:
                        url = (
                                        f"{MLB_API_BASE}/people/{player_id}/stats"
                                        f"?stats=statSplits&group=hitting&season={season}"
                                        f"&sitCodes=h,a,vl,vr&hydrate=team"
                        )
                        r = requests.get(url, timeout=10)
                        r.raise_for_status()
                        splits_raw = r.json().get("stats", [{}])[0].get("splits", [])
                        result = {"home": {}, "away": {}, "vs_lhp": {}, "vs_rhp": {}}
                        for sp in splits_raw:
                                        split_code = sp.get("split", {}).get("code", "")
                                        stat = sp.get("stat", {})
                                        parsed = {
                                            "avg":  float(stat.get("avg", 0) or 0),
                                            "obp":  float(stat.get("obp", 0) or 0),
                                            "slg":  float(stat.get("slg", 0) or 0),
                                            "ops":  float(stat.get("ops", 0) or 0),
                                            "hr":   int(stat.get("homeRuns", 0) or 0),
                                            "pa":   int(stat.get("plateAppearances", 0) or 0),
                                        }
                                        if split_code == "h":
                                                            result["home"] = parsed
elif split_code == "a":
                result["away"] = parsed
elif split_code == "vl":
                result["vs_lhp"] = parsed
elif split_code == "vr":
                result["vs_rhp"] = parsed
        save_json_cache(jp, result)
        return result
except Exception as e:
        log.warning("fetch_hitter_splits %s/%s: %s", player_id, season, e)
        return {}

def fetch_h2h_history(batter_id: int, pitcher_id: int) -> dict:
        """Head-to-head career stats: batter vs pitcher."""
    if not batter_id or not pitcher_id:
                return {}
            key = f"h2h_{batter_id}_{pitcher_id}"
    jp = jsoncache_path(key)
    cached = load_json_cache(jp)
    if cached:
                return cached
            try:
                        url = (
                                        f"{MLB_API_BASE}/people/{batter_id}/stats"
                                        f"?stats=vsPlayer&group=hitting&opposingPlayerId={pitcher_id}"
                        )
                        r = requests.get(url, timeout=10)
        r.raise_for_status()
        splits = r.json().get("stats", [{}])[0].get("splits", [])
        if not splits:
                        result = {"pa": 0, "avg": None, "ops": None, "hr": 0, "k": 0}
else:
            st = splits[0].get("stat", {})
                result = {
                    "pa":  int(st.get("plateAppearances", 0) or 0),
                                    "avg": float(st.get("avg", 0) or 0),
                                    "obp": float(st.get("obp", 0) or 0),
                                    "slg": float(st.get("slg", 0) or 0),
                                    "ops": float(st.get("ops", 0) or 0),
                                    "hr":  int(st.get("homeRuns", 0) or 0),
                                    "k":   int(st.get("strikeOuts", 0) or 0),
                                    "h":   int(st.get("hits", 0) or 0),
                }
        save_json_cache(jp, result)
        return result
except Exception as e:
        log.warning("fetch_h2h %s vs %s: %s", batter_id, pitcher_id, e)
        return {}

def fetch_pitch_arsenal(pitcher_id: int, season: int) -> dict:
        """Fetch pitch arsenal: usage%, velocity, BAA by pitch type from Savant MLB API."""
    key = f"arsenal_{pitcher_id}_{season}"
    jp = jsoncache_path(key)
    cached = load_json_cache(jp)
    if cached:
                return cached
            try:
                        # MLB Stats API pitch arsenal endpoint
                        url = (
                                        f"https://baseballsavant.mlb.com/player-services/pitch-arsenal-stats"
                                        f"?playerId={pitcher_id}&position=1&year={season}&type=pitcher"
                        )
                        r = requests.get(url, timeout=10)
                        r.raise_for_status()
                        data = r.json()
                        arsenal = {"usage": {}, "velocity": {}, "baa": {}, "whiff_pct": {}, "put_away_pct": {}}
                        for row in data:
                                        pt = row.get("pitch_type", "")
                                        if not pt:
                                                            continue
                                                        arsenal["usage"][pt]       = round(float(row.get("pitch_usage", 0) or 0), 1)
                                        arsenal["velocity"][pt]    = round(float(row.get("avg_speed", 0) or 0), 1)
                                        arsenal["baa"][pt]         = round(float(row.get("ba", 0) or 0), 3)
                                        arsenal["whiff_pct"][pt]   = round(float(row.get("whiff_percent", 0) or 0), 1)
                                        arsenal["put_away_pct"][pt]= round(float(row.get("put_away", 0) or 0), 1)
                                    save_json_cache(jp, arsenal)
        return arsenal
except Exception as e:
        log.warning("fetch_pitch_arsenal %s/%s: %s", pitcher_id, season, e)
        return {"usage": {}, "velocity": {}, "baa": {}, "whiff_pct": {}, "put_away_pct": {}}

def fetch_hitter_pitch_baa(batter_id: int, season: int) -> dict:
        """Hitter's batting average against each pitch type (Savant)."""
    key = f"hitter_pitch_baa_{batter_id}_{season}"
    jp = jsoncache_path(key)
    cached = load_json_cache(jp)
    if cached:
                return cached
    try:
                url = (
                                f"https://baseballsavant.mlb.com/player-services/pitch-arsenal-stats"
                                f"?playerId={batter_id}&position=&year={season}&type=batter"
                )
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        data = r.json()
        baa = {}
        for row in data:
                        pt = row.get("pitch_type", "")
            if pt:
                                baa[pt] = round(float(row.get("ba", 0) or 0), 3)
                        save_json_cache(jp, baa)
        return baa
except Exception as e:
        log.warning("fetch_hitter_pitch_baa %s/%s: %s", batter_id, season, e)
        return {}

def fetch_spring_training_stats(player_id: int, is_pitcher: bool = False) -> dict:
        """Fetch 2026 spring training stats from MLB Stats API."""
    key = f"st2026_{'p' if is_pitcher else 'h'}_{player_id}"
    jp = jsoncache_path(key, )
    cached = load_json_cache(jp, max_age_h=12)
    if cached:
                return cached
    try:
                group = "pitching" if is_pitcher else "hitting"
        url = (
                        f"{MLB_API_BASE}/people/{player_id}/stats"
                        f"?stats=season&group={group}&season=2026&sportId=17"  # 17 = spring training
        )
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        splits = r.json().get("stats", [{}])[0].get("splits", [])
        if not splits:
                        save_json_cache(jp, {})
            return {}
        st = splits[0].get("stat", {})
        if is_pitcher:
                        result = {
                            "era":   float(st.get("era", 0) or 0),
                            "k9":    float(st.get("strikeoutsPer9Inn", 0) or 0),
                            "whip":  float(st.get("whip", 0) or 0),
                            "ip":    float(st.get("inningsPitched", 0) or 0),
                            "k_pct": float(st.get("strikeOuts", 0) or 0),
        }
else:
            result = {
                                "avg": float(st.get("avg", 0) or 0),
                                "ops": float(st.get("ops", 0) or 0),
                                "hr":  int(st.get("homeRuns", 0) or 0),
                                "pa":  int(st.get("plateAppearances", 0) or 0),
                                "obp": float(st.get("obp", 0) or 0),
                                "slg": float(st.get("slg", 0) or 0),
            }
        save_json_cache(jp, result)
        return result
except Exception as e:
        log.warning("fetch_spring_training %s: %s", player_id, e)
        return {}

# ---------------------------------------------------------------------------
# Build profiles for full slate
# ---------------------------------------------------------------------------

def build_profiles_for_slate(games: list) -> dict:
        hitter_profiles = {}
    pitcher_profiles = {}

    for game in games:
                home = game.get("home_team", "UNK")
        away = game.get("away_team", "UNK")
        game_pk = game.get("game_pk")

        # --- Build pitcher profiles ---
        for side, pitcher_info in [
                        ("home", game.get("home_probable", {})),
                        ("away", game.get("away_probable", {})),
        ]:
                        pid = pitcher_info.get("id")
            if not pid:
                                continue
                            team = home if side == "home" else away
            opp  = away if side == "home" else home

            pinfo = fetch_player_info(pid)
            weighted_stats = pipeline.weighted_pitcher_stats(pid, pitcher_info.get("name", ""))
            arsenal_curr   = fetch_pitch_arsenal(pid, CURRENT_YEAR)
            arsenal_prev   = fetch_pitch_arsenal(pid, CURRENT_YEAR - 1)
            st_stats       = fetch_spring_training_stats(pid, is_pitcher=True)

            # Merge arsenal: prefer current season, fallback to prior
            merged_arsenal = {
                                "usage":        arsenal_curr.get("usage") or arsenal_prev.get("usage") or {},
                                "velocity":     arsenal_curr.get("velocity") or arsenal_prev.get("velocity") or {},
                                "baa":          arsenal_curr.get("baa") or arsenal_prev.get("baa") or {},
                                "whiff_pct":    arsenal_curr.get("whiff_pct") or arsenal_prev.get("whiff_pct") or {},
                                "put_away_pct": arsenal_curr.get("put_away_pct") or arsenal_prev.get("put_away_pct") or {},
            }

            # Primary and secondary pitch for display
            usage = merged_arsenal.get("usage", {})
            sorted_pitches = sorted(usage.items(), key=lambda x: -x[1])
            primary_pitch   = sorted_pitches[0][0] if len(sorted_pitches) > 0 else "FF"
            secondary_pitch = sorted_pitches[1][0] if len(sorted_pitches) > 1 else None

            pitcher_profiles[pid] = {
                                "player_id":   pid,
                                "player_name": pitcher_info.get("name", "TBD"),
                                "team":        team,
                                "opp":         opp,
                                "hand":        pinfo.get("pitch_hand", "R"),
                                "game_pk":     game_pk,
                                "is_home":     side == "home",
                                "statcast":    weighted_stats,
                                "st_2026":     st_stats,
                                "profile": {
                                                        "blended":  weighted_stats,
                                                        "arsenal":  merged_arsenal,
                                                        "primary_pitch":   primary_pitch,
                                                        "secondary_pitch": secondary_pitch,
                                                        "primary_velo":    merged_arsenal["velocity"].get(primary_pitch, 0),
                                                        "secondary_velo":  merged_arsenal["velocity"].get(secondary_pitch, 0) if secondary_pitch else 0,
                                                        "primary_baa":     merged_arsenal["baa"].get(primary_pitch, 0),
                                                        "secondary_baa":   merged_arsenal["baa"].get(secondary_pitch, 0) if secondary_pitch else 0,
                                },
            }

        # --- Build hitter profiles ---
        home_pitcher_id = game.get("home_probable", {}).get("id")
        away_pitcher_id = game.get("away_probable", {}).get("id")

        for side, lineup in [
                        ("home", game.get("home_lineup", [])),
                        ("away", game.get("away_lineup", [])),
        ]:
                        opp_pitcher_id = away_pitcher_id if side == "home" else home_pitcher_id
            for player in lineup:
                                pid = player.get("id")
                                if not pid:
                                                        continue
                                                    team = home if side == "home" else away
                opp  = away if side == "home" else home

                pinfo         = fetch_player_info(pid)
                weighted_s    = pipeline.weighted_hitter_stats(pid, player.get("name", ""))
                splits_curr   = fetch_hitter_splits(pid, CURRENT_YEAR)
                splits_prev   = fetch_hitter_splits(pid, CURRENT_YEAR - 1)
                h2h           = fetch_h2h_history(pid, opp_pitcher_id) if opp_pitcher_id else {}
                pitch_baa_c   = fetch_hitter_pitch_baa(pid, CURRENT_YEAR)
                pitch_baa_p   = fetch_hitter_pitch_baa(pid, CURRENT_YEAR - 1)
                st_stats      = fetch_spring_training_stats(pid, is_pitcher=False)

                # Merge pitch BAA (prefer current, fill with prior)
                pitch_baa = dict(pitch_baa_p)
                pitch_baa.update(pitch_baa_c)

                # Merge splits (prefer current if PA >= 50)
                def best_split(curr, prev, key):
                                        c = curr.get(key, {})
                                        p = prev.get(key, {})
                                        if c.get("pa", 0) >= 50:
                                                                    return c
                                                                if p.get("pa", 0) >= 30:
                                                                                                                  return p
                                                                                        return c if c else p

                splits = {
                                        "home":   best_split(splits_curr, splits_prev, "home"),
                                        "away":   best_split(splits_curr, splits_prev, "away"),
                                        "vs_lhp": best_split(splits_curr, splits_prev, "vs_lhp"),
                                        "vs_rhp": best_split(splits_curr, splits_prev, "vs_rhp"),
                }

                bat_side = pinfo.get("bat_side", "R")

                hitter_profiles[pid] = {
                                        "player_id":     pid,
                                        "player_name":   player.get("name", ""),
                                        "team":          team,
                                        "opp":           opp,
                                        "batting_order": player.get("order", 5),
                                        "bat_side":      bat_side,
                                        "is_home":       side == "home",
                                        "game_pk":       game_pk,
                                        "opp_pitcher_id": opp_pitcher_id,
                                        "statcast":      weighted_s,
                                        "h2h":           h2h,
                                        "splits":        splits,
                                        "pitch_baa":     pitch_baa,
                                        "st_2026":       st_stats,
                                        "profile": {
                                                                    "blended": weighted_s,
                                        },
                }

    log.info(
                "Built profiles: %d hitters, %d pitchers",
                len(hitter_profiles),
                len(pitcher_profiles),
    )
    return {"hitters": hitter_profiles, "pitchers": pitcher_profiles}

def fetch_team_k_rates(season: int = None) -> dict:
        return pipeline.fetch_team_k_rates(season)

# ---------------------------------------------------------------------------
# Statcast Pipeline Class
# ---------------------------------------------------------------------------

class StatcastPipeline:
        def __init__(self):
                    self.season        = CURRENT_SEASON
        self.season_weights = SEASON_WEIGHTS
        self.spring_blend  = SPRING_BLEND_INTO_SEASON

    # --- Hitter statcast (multi-year weighted) ---

    def fetch_hitter_statcast(self, player_id: int, name: str = "", season: int = None) -> dict:
                yr = season or self.season
        key = f"hitter_statcast_{player_id}_{yr}"
        cp = cachepath(key)
        cached = load_cache(cp)
        if cached is not None:
                        return cached
        try:
                        df = statcast_batter(f"{yr}-01-01", f"{yr}-12-31", player_id)
            if df is None or df.empty:
                                return {}
            result = self._aggregate_hitter(df)
            save_cache(cp, result)
            return result
except Exception as e:
            log.error("fetch_hitter_statcast %s/%s: %s", name or player_id, yr, e)
            return {}

    def _aggregate_hitter(self, df) -> dict:
                pa = len(df)
        if pa == 0:
                        return {}
        safe = lambda col, default=None: df[col].mean() if col in df.columns else default
        xwoba    = safe("estimated_woba_using_speedangle")
        xba      = safe("estimated_ba_using_speedangle")
        xslg     = safe("estimated_slg_using_speedangle")
        ev       = safe("launch_speed")
        la       = safe("launch_angle")
        if "launch_speed" in df.columns and "launch_angle" in df.columns:
                        barrel_pct = float(
                                            ((df["launch_speed"] >= 98) & df["launch_angle"].between(26, 30)).mean()
                        ) * 100
else:
            barrel_pct = None
        hard_hit = float((df["launch_speed"] >= 95).mean()) * 100 if "launch_speed" in df.columns else None
        k_mask = df["description"].isin(
                        ["swinging_strike", "called_strike", "swinging_strike_blocked"]
        ) if "description" in df.columns else pd.Series(False, index=df.index)
        bb_mask = df["events"].isin(["walk"]) if "events" in df.columns else pd.Series(False, index=df.index)

        # ISO from Savant xSLG - xBA
        iso = None
        if xslg is not None and xba is not None:
                        iso = round(float(xslg) - float(xba), 3)

        return {
                        "pa":          pa,
                        "xba":         round(float(xba), 3) if xba is not None else None,
                        "xslg":        round(float(xslg), 3) if xslg is not None else None,
                        "xwoba":       round(float(xwoba), 3) if xwoba is not None else None,
                        "iso":         iso,
                        "exit_velocity": round(float(ev), 1) if ev is not None else None,
                        "launch_angle":  round(float(la), 1) if la is not None else None,
                        "barrel_pct":  round(barrel_pct, 1) if barrel_pct is not None else None,
                        "hard_hit_pct": round(hard_hit, 1) if hard_hit is not None else None,
                        "k_pct":       round(float(k_mask.mean()) * 100, 1),
                        "bb_pct":      round(float(bb_mask.mean()) * 100, 1),
        }

    # --- Pitcher statcast (multi-year weighted) ---

    def fetch_pitcher_statcast(self, player_id: int, name: str = "", season: int = None) -> dict:
                yr = season or self.season
        key = f"pitcher_statcast_{player_id}_{yr}"
        cp = cachepath(key)
        cached = load_cache(cp)
        if cached is not None:
                        return cached
        try:
                        df = statcast_pitcher(f"{yr}-01-01", f"{yr}-12-31", player_id)
            if df is None or df.empty:
                                return {}
            result = self._aggregate_pitcher(df)
            save_cache(cp, result)
            return result
except Exception as e:
            log.error("fetch_pitcher_statcast %s/%s: %s", name or player_id, yr, e)
            return {}

    def _aggregate_pitcher(self, df) -> dict:
                pitches = len(df)
        if pitches == 0:
                        return {}
        safe = lambda col, default=None: df[col].mean() if col in df.columns else default
        velo  = safe("release_speed")
        spin  = safe("release_spin_rate")
        xera  = safe("estimated_woba_using_speedangle")
        sw_mask = df["description"].isin(
                        ["swinging_strike", "swinging_strike_blocked"]
        ) if "description" in df.columns else pd.Series(False, index=df.index)
        k_mask = df["description"].isin(
                        ["swinging_strike", "called_strike", "swinging_strike_blocked"]
        ) if "description" in df.columns else pd.Series(False, index=df.index)
        gb_mask = df["bb_type"].isin(["ground_ball"]) if "bb_type" in df.columns else pd.Series(False, index=df.index)

        # Velocity trend: compare first half to second half
        velo_trend = 0.0
        if "release_speed" in df.columns and len(df) >= 50:
                        mid = len(df) // 2
            early = df["release_speed"].iloc[:mid].mean()
            late  = df["release_speed"].iloc[mid:].mean()
            velo_trend = round(float(late - early), 2)

        return {
                        "pitches":     pitches,
                        "avg_velo":    round(float(velo), 1) if velo is not None else None,
                        "spin_rate":   round(float(spin), 0) if spin is not None else None,
                        "xwoba_allowed": round(float(xera), 3) if xera is not None else None,
                        "sw_str_pct":  round(float(sw_mask.mean()) * 100, 1),
                        "k_pct":       round(float(k_mask.mean()) * 100, 1),
                        "gb_pct":      round(float(gb_mask.mean()) * 100, 1),
                        "velo_trend":  velo_trend,
        }

    # --- Team K rates ---

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

    # --- Multi-year weighted hitter stats ---

    def weighted_hitter_stats(self, player_id: int, name: str = "") -> dict:
                years   = [CURRENT_YEAR] + list(PRIOR_SEASONS)
        wt_keys = ["current", "prior1", "prior2"]
        seasons_data, weights = [], []

        for yr, wk in zip(years, wt_keys):
                        d = self.fetch_hitter_statcast(player_id, name, season=yr)
            if d:
                                seasons_data.append(d)
                weights.append(self.season_weights.get(wk, 0.0))

        # Blend in 2026 spring training as proxy for early-season form
        st = fetch_spring_training_stats(player_id, is_pitcher=False)
        if st.get("ops") and st.get("pa", 0) >= 10:
                        st_as_statcast = {
                                            "xwoba": round((st["obp"] + st["slg"]) / 2.0, 3),
                                            "exit_velocity": None,
                                            "barrel_pct": None,
                                            "k_pct": None,
                                            "bb_pct": None,
                                            "hard_hit_pct": None,
                        }
            seasons_data.append(st_as_statcast)
            weights.append(self.spring_blend)

        if not seasons_data:
                        return {}

        result = {}
        for k in ["xba", "xslg", "xwoba", "iso", "exit_velocity", "launch_angle",
                                    "barrel_pct", "k_pct", "bb_pct", "hard_hit_pct"]:
                                                    pairs = [
                                                                        (d.get(k), w)
                                                                        for d, w in zip(seasons_data, weights)
                                                                        if d.get(k) is not None
                                                    ]
                                                    if pairs:
                                                                        tw = sum(w for _, w in pairs)
                                                                        result[k] = round(sum(v * w for v, w in pairs) / tw, 3) if tw else None
                                                                result["pa"] = seasons_data[0].get("pa", 0)
        return result

    # --- Multi-year weighted pitcher stats ---

    def weighted_pitcher_stats(self, player_id: int, name: str = "") -> dict:
                years   = [CURRENT_YEAR] + list(PRIOR_SEASONS)
        wt_keys = ["current", "prior1", "prior2"]
        seasons_data, weights = [], []

        for yr, wk in zip(years, wt_keys):
                        d = self.fetch_pitcher_statcast(player_id, name, season=yr)
            if d:
                                seasons_data.append(d)
                weights.append(self.season_weights.get(wk, 0.0))

        # Blend spring training velocity as early indicator
        st = fetch_spring_training_stats(player_id, is_pitcher=True)
        if st.get("ip", 0) >= 3:
                        st_as_statcast = {
                                            "avg_velo": None,  # no velo from MLB stats ST data
                                            "k_pct":    st.get("k9", 22.0),
                                            "xwoba_allowed": None,
                        }
            seasons_data.append(st_as_statcast)
            weights.append(self.spring_blend)

        if not seasons_data:
                        return {}

        result = {}
        for k in ["avg_velo", "spin_rate", "xwoba_allowed", "sw_str_pct", "k_pct",
                  "gb_pct", "velo_trend"]:
                                  pairs = [
                                                      (d.get(k), w)
                                                      for d, w in zip(seasons_data, weights)
                                                      if d.get(k) is not None
                                  ]
            if pairs:
                                tw = sum(w for _, w in pairs)
                result[k] = round(sum(v * w for v, w in pairs) / tw, 3) if tw else None
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
    print("Hitter stats:", pipeline.weighted_hitter_stats(test_id))
    print("H2H (Ohtani vs Snell):", fetch_h2h_history(660271, 605483))
    print("Arsenal (Snell 2025):", fetch_pitch_arsenal(605483, 2025))
