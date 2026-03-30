import csv
import io
import logging
import os
import threading
import time
from datetime import datetime
from functools import wraps
from pathlib import Path

from flask import Flask, jsonify, request, abort
from flask_cors import CORS

from config import ADMIN_TOKEN, PORT, CACHE_DIR
from statcast_pipeline import (
    fetch_today_schedule,
    build_profiles_for_slate,
    fetch_team_k_rates,
)
from grading_engine import grade_full_slate
from projections import build_projections

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s"
)
log = logging.getLogger("allday.api")

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

slatecache: dict = {}
lastrefresh: datetime | None = None
refreshlock = threading.Lock()
dksalaries: dict = {}


def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("X-Admin-Token") or request.args.get("token")
        if token != ADMIN_TOKEN:
            abort(403, description="Invalid admin token")
        return f(*args, **kwargs)
    return decorated


def buildgame_contexts(games: list) -> dict:
    contexts = {}
    for g in games:
        contexts[g["game_pk"]] = {
            "home_implied_runs": 4.5,
            "away_implied_runs": 4.5,
            "total":             9.0,
            "home_ml":           -110,
            "away_ml":           +100,
        }
    return contexts


def isstale(max_age_minutes: int = 30) -> bool:
    if lastrefresh is None:
        return True
    return (datetime.now() - lastrefresh).total_seconds() > max_age_minutes * 60


def refreshslate(force: bool = False) -> dict:
    global slatecache, lastrefresh

    if not force and not isstale() and slatecache:
        return slatecache

    with refreshlock:
        if not force and not isstale() and slatecache:
            return slatecache

        log.info("=== Refreshing slate ===")
        t0 = time.time()

        try:
            games = fetch_today_schedule()
            if not games:
                log.warning("No games found for today")
                return {"error": "No games today", "games": []}

            slate_data   = build_profiles_for_slate(games)
            team_k_rates = fetch_team_k_rates()          # FIX 5: was unused
            contexts     = buildgame_contexts(games)
            graded       = grade_full_slate(slate_data, contexts, team_k_rates)
            projections  = build_projections(graded, dksalaries)

            slatecache = {
                "games":          games,
                "hitters":        projections["hitters"],
                "pitchers":       projections["pitchers"],
                "optimal_lineup": projections["optimal_lineup"],
                "graded_at":      graded.get("graded_at"),
                "refreshed_at":   datetime.now().isoformat(),
                "elapsed_sec":    round(time.time() - t0, 2),
            }
            lastrefresh = datetime.now()

            log.info(                                     # FIX 1: was _slate_cache
                f"Slate built in {slatecache['elapsed_sec']}s | "
                f"{len(games)} games | "
                f"{len(graded.get('hitters', {}))} hitters | "
                f"{len(graded.get('pitchers', {}))} pitchers"
            )

        except Exception as e:
            log.error(f"Slate refresh failed: {e}", exc_info=True)
            slatecache = {"error": str(e), "refreshed_at": datetime.now().isoformat()}

        return slatecache


def formathitter(h: dict) -> dict:
    return {
        "player_id":        h.get("player_id"),
        "player_name":      h.get("player_name"),
        "team":             h.get("team"),
        "opp":              h.get("opp"),
        "opp_pitcher":      h.get("opp_pitcher_name", "TBD"),
        "position":         h.get("position"),
        "batting_order":    h.get("batting_order"),
        "bat_side":         h.get("bat_side"),
        "grade":            h.get("grade"),
        "fires":            h.get("fires"),
        "matchup_score":    h.get("matchup_score"),
        "projected_dk_pts": h.get("projected_dk_pts"),
        "dk_salary":        h.get("dk_salary"),
        "value_score":      h.get("value_score"),
        "stats": {
            "exit_velocity": h.get("key_stats", {}).get("exit_velocity"),
            "barrel_pct":    h.get("key_stats", {}).get("barrel_pct"),
            "hard_hit_pct":  h.get("key_stats", {}).get("hard_hit_pct"),
            "xwoba":         h.get("key_stats", {}).get("xwoba"),
            "k_pct":         h.get("key_stats", {}).get("k_pct"),
            "bb_pct":        h.get("key_stats", {}).get("bb_pct"),
            "wrc_plus":      h.get("key_stats", {}).get("wrc_plus"),
            "avg":           h.get("key_stats", {}).get("avg"),
            "obp":           h.get("key_stats", {}).get("obp"),
            "slg":           h.get("key_stats", {}).get("slg"),
        },
        "scouting_report":   h.get("scouting_report"),
        "grade_breakdown":   h.get("breakdown"),
        "platoon_advantage": h.get("platoon_advantage"),
        "stack_team":        h.get("stack"),
    }


def formatpitcher(p: dict) -> dict:
    return {
        "player_id":        p.get("player_id"),
        "player_name":      p.get("player_name"),
        "team":             p.get("team"),
        "opp":              p.get("op
