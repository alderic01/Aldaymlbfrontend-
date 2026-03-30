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
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
)
log = logging.getLogger("allday.api")

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

slatecache: dict = {}
lastrefresh: datetime | None = None
refreshlock = threading.Lock()
dksalaries: dict = {}
salaries_lock = threading.Lock()


def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("X-Admin-Token") or request.args.get("token")
        if token != ADMIN_TOKEN:
            abort(403, description="Invalid admin token")
        return f(*args, **kwargs)
    return decorated


def build_game_contexts(games: list) -> dict:
    contexts = {}
    for g in games:
        contexts[g["game_pk"]] = {
            "home_implied_runs": 4.5,
            "away_implied_runs": 4.5,
            "total": 9.0,
            "home_ml": -110,
            "away_ml": +100,
        }
    return contexts


def is_stale(max_age_minutes: int = 30) -> bool:
    if lastrefresh is None:
        return True
    return (datetime.now() - lastrefresh).total_seconds() > max_age_minutes * 60


def refresh_slate(force: bool = False) -> dict:
    global slatecache, lastrefresh
    if not force and not is_stale() and slatecache:
        return slatecache
    with refreshlock:
        if not force and not is_stale() and slatecache:
            return slatecache
        log.info("=== Refreshing slate ===")
        t0 = time.time()
        try:
            games = fetch_today_schedule()
            if not games:
                log.warning("No games found for today")
                return {"error": "No games today", "games": []}
            slate_data = build_profiles_for_slate(games)
            team_k_rates = fetch_team_k_rates()
            contexts = build_game_contexts(games)
            graded = grade_full_slate(slate_data, contexts, team_k_rates)
            with salaries_lock:
                current_salaries = dict(dksalaries)
            projections = build_projections(graded, current_salaries)
            slatecache = {
                "games": games,
                "hitters": projections["hitters"],
                "pitchers": projections["pitchers"],
                "optimal_lineup": projections["optimal_lineup"],
                "graded_at": graded.get("graded_at"),
                "refreshed_at": datetime.now().isoformat(),
                "elapsed_sec": round(time.time() - t0, 2),
            }
            lastrefresh = datetime.now()
            log.info(
                f"Slate built in {slatecache['elapsed_sec']}s | "
                f"{len(games)} games | "
                f"{len(graded.get('hitters', {}))} hitters | "
                f"{len(graded.get('pitchers', {}))} pitchers"
            )
        except Exception as e:
            log.error(f"Slate refresh failed: {e}", exc_info=True)
            slatecache = {"error": str(e), "refreshed_at": datetime.now().isoformat()}
    return slatecache


def format_hitter(h: dict) -> dict:
    return {
        "player_id": h.get("player_id"),
        "player_name": h.get("player_name"),
        "team": h.get("team"),
        "opp": h.get("opp"),
        "opp_pitcher": h.get("opp_pitcher_name", "TBD"),
        "position": h.get("position"),
        "batting_order": h.get("batting_order"),
        "bat_side": h.get("bat_side"),
        "grade": h.get("grade"),
        "fires": h.get("fires"),
        "matchup_score": h.get("matchup_score"),
        "projected_dk_pts": h.get("projected_dk_pts"),
        "dk_salary": h.get("dk_salary"),
        "value_score": h.get("value_score"),
        "stats": {
            "exit_velocity": h.get("key_stats", {}).get("exit_velocity"),
            "barrel_pct": h.get("key_stats", {}).get("barrel_pct"),
            "hard_hit_pct": h.get("key_stats", {}).get("hard_hit_pct"),
            "xwoba": h.get("key_stats", {}).get("xwoba"),
            "k_pct": h.get("key_stats", {}).get("k_pct"),
            "bb_pct": h.get("key_stats", {}).get("bb_pct"),
            "wrc_plus": h.get("key_stats", {}).get("wrc_plus"),
            "avg": h.get("key_stats", {}).get("avg"),
            "obp": h.get("key_stats", {}).get("obp"),
            "slg": h.get("key_stats", {}).get("slg"),
        },
        "scouting_report": h.get("scouting_report"),
        "grade_breakdown": h.get("breakdown"),
        "platoon_advantage": h.get("platoon_advantage"),
        "stack_team": h.get("stack"),
    }


def format_pitcher(p: dict) -> dict:
    return {
        "player_id": p.get("player_id"),
        "player_name": p.get("player_name"),
        "team": p.get("team"),
        "opp": p.get("opp"),
        "hand": p.get("hand"),
        "grade": p.get("grade"),
        "fires": p.get("fires"),
        "matchup_score": p.get("matchup_score"),
        "dvp_rank": p.get("dvp_rank"),
        "projected_dk_pts": p.get("projected_dk_pts"),
        "dk_salary": p.get("dk_salary"),
        "value_score": p.get("value_score"),
        "proj_ip": p.get("projections", {}).get("ip"),
        "proj_ks": p.get("projections", {}).get("ks"),
        "stats": {
            "era": p.get("key_stats", {}).get("era"),
            "fip": p.get("key_stats", {}).get("fip"),
            "xfip": p.get("key_stats", {}).get("xfip"),
            "k_pct": p.get("key_stats", {}).get("k_pct"),
            "bb_pct": p.get("key_stats", {}).get("bb_pct"),
            "sw_str_pct": p.get("key_stats", {}).get("sw_str_pct"),
            "stuff_plus": p.get("key_stats", {}).get("stuff_plus"),
            "avg_velo": p.get("key_stats", {}).get("avg_velo"),
            "velo_trend": p.get("key_stats", {}).get("velo_trend"),
        },
        "arsenal": p.get("arsenal", []),
        "scouting_report": p.get("scouting_report"),
        "grade_breakdown": p.get("breakdown"),
    }


@app.route("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "ALLDAY MLB EDGE",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat(),
        "last_refresh": lastrefresh.isoformat() if lastrefresh else None,
        "slate_ready": bool(slatecache and "error" not in slatecache),
    })


@app.route("/api/slate")
def get_slate():
    slate = refresh_slate()
    games = slate.get("games", [])
    return jsonify({
        "date": datetime.now().strftime("%Y-%m-%d"),
        "games": games,
        "game_count": len(games),
        "refreshed_at": slate.get("refreshed_at"),
    })


@app.route("/api/hitters")
def get_hitters():
    slate = refresh_slate()
    hitters = slate.get("hitters", [])
    if not hitters:
        return jsonify({"hitters": [], "count": 0})
    team = request.args.get("team")
    min_grade = request.args.get("min_grade")
    min_fires = request.args.get("min_fires", type=int)
    min_sal = request.args.get("min_salary", type=int)
    max_sal = request.args.get("max_salary", type=int)
    sort_by = request.args.get("sort", "proj")
    limit = request.args.get("limit", 50, type=int)
    grade_order = {"A+": 0, "A": 1, "B+": 2, "B": 3, "C": 4, "D": 5}
    if team:
        hitters = [h for h in hitters if h.get("team") == team.upper()]
    if min_fires:
        hitters = [h for h in hitters if (h.get("fires") or 0) >= min_fires]
    if min_grade:
        min_idx = grade_order.get(min_grade, 5)
        hitters = [h for h in hitters if grade_order.get(h.get("grade", "D"), 5) <= min_idx]
    if min_sal:
        hitters = [h for h in hitters if (h.get("dk_salary") or 0) >= min_sal]
    if max_sal:
        hitters = [h for h in hitters if (h.get("dk_salary") or 99999) <= max_sal]
    sort_key = {
        "proj": lambda x: -(x.get("projected_dk_pts") or 0),
        "grade": lambda x: grade_order.get(x.get("grade", "D"), 5),
        "fires": lambda x: -(x.get("fires") or 0),
        "value": lambda x: -(x.get("value_score") or 0),
        "salary": lambda x: -(x.get("dk_salary") or 0),
        "score": lambda x: -(x.get("matchup_score") or 0),
    }.get(sort_by, lambda x: -(x.get("projected_dk_pts") or 0))
    hitters = sorted(hitters, key=sort_key)[:limit]
    return jsonify({
        "hitters": [format_hitter(h) for h in hitters],
        "count": len(hitters),
        "refreshed_at": slate.get("refreshed_at"),
    })


@app.route("/api/pitchers")
def get_pitchers():
    slate = refresh_slate()
    pitchers = slate.get("pitchers", [])
    if not pitchers:
        return jsonify({"pitchers": [], "count": 0})
    grade_order = {"A+": 0, "A": 1, "B+": 2, "B": 3, "C": 4, "D": 5}
    min_grade = request.args.get("min_grade")
    min_fires = request.args.get("min_fires", type=int)
    sort_by = request.args.get("sort", "proj")
    if min_grade:
        min_idx = grade_order.get(min_grade, 5)
        pitchers = [p for p in pitchers if grade_order.get(p.get("grade", "D"), 5) <= min_idx]
    if min_fires:
        pitchers = [p for p in pitchers if (p.get("fires") or 0) >= min_fires]
    sort_key = {
        "proj": lambda x: -(x.get("projected_dk_pts") or 0),
        "grade": lambda x: grade_order.get(x.get("grade", "D"), 5),
        "fires": lambda x: -(x.get("fires") or 0),
        "value": lambda x: -(x.get("value_score") or 0),
        "salary": lambda x: -(x.get("dk_salary") or 0),
        "dvp": lambda x: (x.get("dvp_rank") or 30),
    }.get(sort_by, lambda x: -(x.get("projected_dk_pts") or 0))
    pitchers = sorted(pitchers, key=sort_key)
    return jsonify({
        "pitchers": [format_pitcher(p) for p in pitchers],
        "count": len(pitchers),
        "refreshed_at": slate.get("refreshed_at"),
    })


@app.route("/api/stack")
def get_stack():
    slate = refresh_slate()
    lineup = slate.get("optimal_lineup", {})
    if not lineup:
        return jsonify({"error": "Lineup not available - check /api/health"}), 503
    return jsonify({
        "lineup": lineup.get("lineup", []),
        "total_salary": lineup.get("total_salary"),
        "salary_left": lineup.get("salary_left"),
        "total_proj_pts": lineup.get("total_proj_pts"),
        "stack_summary": lineup.get("stack_summary"),
        "lineup_type": lineup.get("lineup_type"),
        "generated_at": lineup.get("generated_at"),
    })


@app.route("/api/player/<int:player_id>")
def get_player(player_id: int):
    slate = refresh_slate()
    for h in slate.get("hitters", []):
        if h.get("player_id") == player_id:
            return jsonify({"type": "hitter", "data": format_hitter(h)})
    for p in slate.get("pitchers", []):
        if p.get("player_id") == player_id:
            return jsonify({"type": "pitcher", "data": format_pitcher(p)})
    return jsonify({"error": "Player not found on today's slate"}), 404


@app.route("/api/salaries", methods=["GET"])
def get_salaries():
    with salaries_lock:
        count = len(dksalaries)
        sal_copy = dict(dksalaries)
    return jsonify({
        "salaries": sal_copy,
        "count": count,
        "note": "Upload a DK salary CSV at POST /api/salaries/upload"
    })


@app.route("/api/salaries/upload", methods=["POST"])
@require_admin
def upload_salaries():
    global dksalaries
    if "salary_csv" in request.files:
        content = request.files["salary_csv"].read().decode("utf-8")
    elif request.data:
        content = request.data.decode("utf-8")
    else:
        return jsonify({"error": "No CSV data provided"}), 400

    parsed = {}
    errors = []
    reader = csv.DictReader(io.StringIO(content))
    for i, row in enumerate(reader):
        try:
            name = (row.get("Name") or row.get("name") or "").strip()
            salary = row.get("Salary") or row.get("salary") or "0"
            salary = int(str(salary).replace("$", "").replace(",", "").strip())
            pid = row.get("ID") or row.get("id") or ""
            if name:
                parsed[name] = salary
            if pid:
                parsed[str(pid)] = salary
        except Exception as e:
            errors.append(f"Row {i}: {e}")

    with salaries_lock:
        dksalaries.update(parsed)
        total = len(dksalaries)

    # Background refresh - do NOT block the HTTP response
    threading.Thread(target=refresh_slate, kwargs={"force": True}, daemon=True).start()

    return jsonify({
        "loaded": len(parsed),
        "total": total,
        "errors": errors[:10],
        "message": "Salaries loaded. Slate refresh started in background.",
    })


@app.route("/api/refresh", methods=["POST"])
@require_admin
def force_refresh():
    result = refresh_slate(force=True)
    return jsonify({
        "status": "refreshed",
        "elapsed_sec": result.get("elapsed_sec"),
        "games": len(result.get("games", [])),
        "hitters": len(result.get("hitters", [])),
        "pitchers": len(result.get("pitchers", [])),
        "refreshed_at": result.get("refreshed_at"),
    })


def background_refresh_loop():
    log.info("Background refresh loop started (30-min interval)")
    while True:
        try:
            if is_stale(max_age_minutes=30):
                refresh_slate()
        except Exception as e:
            log.error(f"Background refresh error: {e}")
        time.sleep(1800)


def _startup():
    def _warm():
        log.info("Warming slate cache on startup...")
        refresh_slate()
    threading.Thread(target=_warm, daemon=True).start()
    threading.Thread(target=background_refresh_loop, daemon=True).start()


if __name__ == "__main__":
    log.info("ALLDAY MLB EDGE - API v2.0")
    _startup()
    app.run(
        host="0.0.0.0",
        port=PORT,
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
    )
