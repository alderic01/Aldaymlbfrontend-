import os
from datetime import datetime

ADMIN_TOKEN  = os.getenv("ADMIN_TOKEN", "dev-token")
PORT         = int(os.getenv("PORT", 8000))
CACHE_DIR    = os.getenv("CACHE_DIR", "./cache")
DATA_DIR     = os.getenv("DATA_DIR", "./data")

CURRENT_SEASON = datetime.now().year

# ---------------------------------------------------------------------------
# Season weighting: blend multi-year stats (2024/2025/2026)
# ---------------------------------------------------------------------------
SEASON_WEIGHTS = {
    "current": 0.50,   # 2026 regular season
    "prior1":  0.30,   # 2025
    "prior2":  0.20,   # 2024
    "prior3":  0.00,   # 2023 (excluded)
}

SPRING_BLEND_INTO_SEASON = 0.20  # 20% spring training blend early season

# How many days into regular season before spring training weight fades to 0
SPRING_FADE_DAYS = 30

# ---------------------------------------------------------------------------
# Grade thresholds  (score -> letter grade -> fire emoji count)
# ---------------------------------------------------------------------------
GRADE_THRESHOLDS = [
    (88, "A+", 5), (78, "A", 4), (68, "B+", 3),
    (56, "B",  3), (42, "C", 2), (0,  "D",  1),
]


def score_to_grade(score):
    for threshold, grade, fires in GRADE_THRESHOLDS:
        if score >= threshold:
            return grade, fires
    return "D", 1


# ---------------------------------------------------------------------------
# Hitter grading weights — 7 scoring components = 100 pts
# ---------------------------------------------------------------------------
HITTER_GRADE_WEIGHTS = {
    "statcast":       25,   # EV, barrel%, hard hit%, xwOBA
    "discipline":     12,   # K%, BB%, chase rate
    "matchup":        18,   # platoon, pitch arsenal, pitcher vulnerability
    "h2h":            12,   # head-to-head vs today's pitcher
    "power_matchup":  10,   # EV/barrel by pitch type vs pitcher's arsenal
    "context":        13,   # park factor, vegas, lineup spot, weather
    "splits":         10,   # home/away, L/R detailed splits
}

# ---------------------------------------------------------------------------
# Pitcher grading weights — 5 scoring components = 100 pts
# ---------------------------------------------------------------------------
PITCHER_GRADE_WEIGHTS = {
    "stuff":          25,   # Stuff+, SwStr%, K%, FIP
    "matchup":        25,   # opposing lineup quality, platoon, K-rate
    "arsenal":        15,   # pitch-level BAA, velocity, movement
    "context":        20,   # park, weather, vegas, home/away
    "splits":         15,   # vs LHH/RHH, home/away
}

# Legacy flat weights (kept for compatibility)
HITTER_WEIGHTS = {
    "exit_velocity":  0.08, "barrel_pct":     0.10,
    "hard_hit_pct":   0.07, "xwoba":          0.10,
    "bb_pct":         0.06, "k_pct":          0.06,
    "chase_rate":     0.04, "zone_contact":   0.04,
    "platoon_bonus":  0.12, "pitch_matchup":  0.10,
    "opp_pitcher_dvp":0.08, "park_factor":    0.05,
    "vegas_implied":  0.05, "lineup_spot":    0.03,
    "recent_form":    0.02,
}

PITCHER_WEIGHTS = {
    "stuff_plus":    0.10, "sw_str_pct":    0.09,
    "k_pct":         0.08, "fip":           0.08,
    "opp_k_rate":    0.10, "opp_babip_luck":0.08,
    "platoon_adv":   0.08, "dvp_rank":      0.09,
    "park_factor":   0.08, "vegas_implied": 0.07,
    "home_away":     0.05, "recent_velo":   0.10,
}

# ---------------------------------------------------------------------------
# Park factors — HR and runs multipliers for all 30 parks
# ---------------------------------------------------------------------------
PARK_FACTORS = {
    "COL": {"hr": 130, "runs": 115},
    "CIN": {"hr": 118, "runs": 108},
    "PHI": {"hr": 114, "runs": 107},
    "TEX": {"hr": 112, "runs": 106},
    "BAL": {"hr": 110, "runs": 105},
    "BOS": {"hr": 107, "runs": 103},
    "NYY": {"hr": 105, "runs": 102},
    "TOR": {"hr": 104, "runs": 102},
    "HOU": {"hr": 103, "runs": 101},
    "MIL": {"hr": 102, "runs": 101},
    "CHC": {"hr": 101, "runs": 100},
    "NYM": {"hr": 100, "runs": 100},
    "ATL": {"hr": 100, "runs": 100},
    "STL": {"hr":  99, "runs":  99},
    "PIT": {"hr":  99, "runs":  99},
    "LAA": {"hr":  98, "runs":  99},
    "MIN": {"hr":  98, "runs":  99},
    "DET": {"hr":  97, "runs":  98},
    "KC":  {"hr":  97, "runs":  98},
    "WSH": {"hr":  97, "runs":  98},
    "CLE": {"hr":  96, "runs":  97},
    "CWS": {"hr":  96, "runs":  97},
    "MIA": {"hr":  95, "runs":  96},
    "TB":  {"hr":  94, "runs":  96},
    "ARI": {"hr":  94, "runs":  96},
    "LAD": {"hr":  93, "runs":  96},
    "SF":  {"hr":  90, "runs":  94},
    "SEA": {"hr":  89, "runs":  93},
    "OAK": {"hr":  89, "runs":  93},
    "SD":  {"hr":  87, "runs":  92},
}


def get_park_factor(team, stat="hr"):
    pf = PARK_FACTORS.get(team, {}).get(stat, 100)
    return (pf - 100) / 100.0


# ---------------------------------------------------------------------------
# Weather impact thresholds
# ---------------------------------------------------------------------------
WEATHER_IMPACT = {
    "temp": {
        "cold_threshold": 55,    # below = suppress offense
        "hot_threshold": 80,     # above = boost offense
        "cold_penalty": -0.08,   # multiplier impact
        "hot_bonus": 0.06,
    },
    "wind": {
        "blowing_out_threshold": 10,   # mph wind out to boost HR
        "blowing_in_threshold": 10,    # mph wind in to suppress HR
        "out_bonus": 0.10,
        "in_penalty": -0.10,
    },
    "humidity": {
        "high_threshold": 70,    # % humidity boost carry
        "bonus": 0.03,
    },
}

# ---------------------------------------------------------------------------
# DK scoring
# ---------------------------------------------------------------------------
DK_SCORING = {
    "single":   3.0, "double":  5.0, "triple": 8.0,
    "hr":      10.0, "rbi":     2.0, "run":    2.0,
    "bb":       2.0, "hbp":     2.0, "sb":     5.0,
    "ip":       2.25,"k_pitch": 2.0, "win":    4.0,
    "er":      -2.0, "h_allow":-0.6, "bb_allow":-0.6,
    "cg":       2.5, "cgso":    2.5, "no_hit":  5.0,
}

DK_SALARY_CAP = 50000

# ---------------------------------------------------------------------------
# Statcast benchmarks for normalization
# ---------------------------------------------------------------------------
STATCAST_BENCHMARKS = {
    "exit_velocity": {"poor": 85.0, "avg": 88.5, "elite": 95.0},
    "barrel_pct":    {"poor":  4.0, "avg":  8.0, "elite": 18.0},
    "hard_hit_pct":  {"poor": 28.0, "avg": 38.0, "elite": 55.0},
    "xwoba":         {"poor": .270, "avg": .315,  "elite": .430},
    "xba":           {"poor": .200, "avg": .250,  "elite": .330},
    "xslg":          {"poor": .340, "avg": .420,  "elite": .600},
    "sprint_speed":  {"poor": 25.0, "avg": 27.0,  "elite": 30.0},
    "k_pct":         {"poor": 16.0, "avg": 22.0,  "elite": 34.0},
    "sw_str_pct":    {"poor":  8.0, "avg": 11.0,  "elite": 17.0},
    "stuff_plus":    {"poor":  85,  "avg": 100,   "elite": 130},
    "fip":           {"poor":  5.0, "avg":  4.10, "elite":  2.80},
    "bb_pct":        {"poor": 12.0, "avg":  8.0,  "elite":  4.5},
    "baa":           {"poor": .280, "avg": .245,  "elite": .190},
    "whiff_pct":     {"poor": 20.0, "avg": 28.0, "elite": 40.0},
}


def normalize_stat(value, stat, invert=False):
    b = STATCAST_BENCHMARKS.get(stat)
    if b is None:
        return 0.5
    poor, elite = b["poor"], b["elite"]
    if invert:
        poor, elite = elite, poor
    return max(0.0, min(1.0, (value - poor) / (elite - poor)))


# ---------------------------------------------------------------------------
# Pitch matchup matrix (hitter type vs pitch type multipliers)
# ---------------------------------------------------------------------------
PITCH_MATCHUP = {
    "pull_power_rhh":    {"FF":1.20,"SI":1.10,"FC":0.95,"SL":0.90,"CU":1.05,"CH":1.00,"FS":0.85,"ST":0.88},
    "contact_lhh":       {"FF":1.10,"SI":1.00,"FC":1.05,"SL":1.15,"CU":0.95,"CH":0.90,"FS":0.88,"ST":1.20},
    "speed_contact_rhh": {"FF":1.05,"SI":0.95,"FC":1.00,"SL":0.92,"CU":1.00,"CH":1.05,"FS":0.90,"ST":0.95},
    "power_lhh":         {"FF":1.15,"SI":1.05,"FC":1.00,"SL":1.10,"CU":0.90,"CH":0.95,"FS":0.85,"ST":1.15},
    "neutral":           {k: 1.0 for k in ["FF","SI","FC","SL","CU","CH","FS","ST","KC","KN"]},
}

LINEUP_SPOT_BONUS = {1:0.08,2:0.07,3:0.06,4:0.05,5:0.04,6:0.02,7:0.00,8:-0.02,9:-0.04}

PLATOON_ADV = {
    ("L","R"): 0.035, ("R","L"): 0.028,
    ("L","L"):-0.020, ("R","R"):-0.015,
    ("S","R"): 0.025, ("S","L"): 0.025,
}

# ---------------------------------------------------------------------------
# H2H benchmarks — head-to-head performance thresholds
# ---------------------------------------------------------------------------
H2H_MIN_PA = 5         # minimum plate appearances for H2H to count
H2H_WEIGHT_SCALE = {
    5:  0.40,   # 5-9 PA: low confidence
    10: 0.65,   # 10-19 PA: medium confidence
    20: 0.85,   # 20-29 PA: high confidence
    30: 1.00,   # 30+ PA: full confidence
}

# ---------------------------------------------------------------------------
# Stack optimizer constraints
# ---------------------------------------------------------------------------
STACK_CONSTRAINTS = {
    "salary_cap": 50000,
    "min_players": 10,
    "max_players": 10,
    "positions": {"P":2,"C":1,"1B":1,"2B":1,"3B":1,"SS":1,"OF":3},
    "max_from_one_team": 5,
    "min_stack_size": 3,
    "max_pitchers_stack_team": 0,
    "max_salary_leftover": 500,   # target: leave less than $500 unused
    "num_stacks": 10,             # generate 10 best stacks
}

# MLB headshot image URL pattern
MLB_HEADSHOT_URL = "https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/{player_id}/headshot/67/current"
