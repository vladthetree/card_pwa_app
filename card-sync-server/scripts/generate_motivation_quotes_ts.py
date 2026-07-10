#!/usr/bin/env python3
"""Generiert Offline-Motivationskataloge aus server/push/motivation.py.

Die Sprüche leben genau einmal (Server = Source of Truth); der Client zeigt
denselben Katalog im initialen Loading-Screen, und der Service Worker nutzt ihn
für lokale Offline-Reminder. Nach Änderungen am Katalog:

  python3 card-sync-server/scripts/generate_motivation_quotes_ts.py
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server.push.motivation import DAILY_MOTIVATIONS  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
CLIENT_OUT = ROOT / "card_pwa" / "src" / "data" / "motivationQuotes.ts"
SW_OUT = ROOT / "card_pwa" / "public" / "service-worker.js"


def ts_str(value: str) -> str:
  return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


lines = [
  "/**",
  " * AI_CONTEXT:",
  " * Role: Motivational quote catalog shown on the initial loading screen (same catalog the sync server pushes daily).",
  " * Used by: motivationQuote helpers via App.tsx ViewFallback.",
  " * Important: GENERATED FILE - edit card-sync-server/server/push/motivation.py and rerun",
  " *            card-sync-server/scripts/generate_motivation_quotes_ts.py instead.",
  " */",
  "",
  "export interface MotivationQuote {",
  "  title: string",
  "  body: string",
  "}",
  "",
  "export const MOTIVATION_QUOTES: Record<'de' | 'en', MotivationQuote[]> = {",
]
for lang in ("de", "en"):
  lines.append(f"  {lang}: [")
  for title, body in DAILY_MOTIVATIONS[lang]:
    lines.append(f"    {{ title: {ts_str(title)}, body: {ts_str(body)} }},")
  lines.append("  ],")
lines.append("}")
lines.append("")

CLIENT_OUT.write_text("\n".join(lines), encoding="utf-8")


def js_str(value: str) -> str:
  return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


def render_service_worker_catalog() -> str:
  output = [
    "const DAILY_MOTIVATION_MESSAGES = {",
    "  // GENERATED from card-sync-server/server/push/motivation.py.",
    "  // Keep this inline: the Service Worker must have offline reminder copy without loading app chunks.",
  ]
  for lang in ("de", "en"):
    output.append(f"  {lang}: [")
    for title, body in DAILY_MOTIVATIONS[lang]:
      output.append(f"    [{js_str(title)}, {js_str(body)}],")
    output.append("  ],")
  output.append("}")
  return "\n".join(output)


sw_source = SW_OUT.read_text(encoding="utf-8")
sw_source, replacements = re.subn(
  r"const DAILY_MOTIVATION_MESSAGES = \{.*?\n\}\n\nfunction normalizeMotivationLanguage",
  render_service_worker_catalog() + "\n\nfunction normalizeMotivationLanguage",
  sw_source,
  count=1,
  flags=re.S,
)
if replacements != 1:
  raise RuntimeError("Could not replace DAILY_MOTIVATION_MESSAGES in service-worker.js")
SW_OUT.write_text(sw_source, encoding="utf-8")

total = sum(len(v) for v in DAILY_MOTIVATIONS.values())
print(f"motivationQuotes.ts: {total} Sprüche -> {CLIENT_OUT}")
print(f"service-worker.js: {total} Offline-Sprüche -> {SW_OUT}")
