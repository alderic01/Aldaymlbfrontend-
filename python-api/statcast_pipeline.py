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
    CACHE_DIR, DATA_DIR, normalize_stat, STATCAST_BENCHMARKS
)

log = logging.getLogger(__name__)

Path(CACHE_DIR).mkdir(parents=True, exist_ok=True)
Path(DATA_DIR).mkdir(parents=True, exist_ok=True)
pb_cache.enable()

CURRENT_YEAR   = datetime.now().year
CURRENT_SEASON = CURRENT_YEAR
PRIOR_SEASONS
