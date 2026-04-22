#!/usr/bin/env python3
from pathlib import Path
import runpy
import sys

ROOT_DIR = Path(__file__).resolve().parent
TARGET = ROOT_DIR / "maintenance" / "db-tools" / "wipe_db_entries.py"
sys.argv[0] = str(TARGET)
runpy.run_path(str(TARGET), run_name="__main__")
