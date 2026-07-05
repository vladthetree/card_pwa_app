#!/usr/bin/env python3
"""
Generate card_pwa/src/data/messerVideoQuestionMap.ts.

Maps every finished Professor Messer MC question (mc_data question id like
"M1-001") to exactly one course video, so the in-app Abruf-Check can show only
the questions belonging to the video that was just watched.

Sources:
  - mc_data/section*_mc.json ......... finished questions (M-id + APKG card_id)
  - messner_lernkarten/...cards.json . APKG export (card_id -> per-video subdeck)
  - the local MP4 course directory ... in-app video titles (join key at runtime)

The APKG subdeck titles and the MP4 titles drift slightly (e.g. "Authentication,
Authorization, Accounting (AAA)" vs "Authentication, Authorization, and
Accounting"), so both sides are matched via a normalized form. The generator
fails loudly when a question cannot be assigned to exactly one video.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
_REPO = _ROOT.parent

MC_DIR = _ROOT / "mc_data"
APKG_CARDS_JSON = (
    _REPO
    / "messner_lernkarten"
    / "professor_messer_sy0_701_security_free_video_course_cards.json"
)
DEFAULT_MEDIA_DIR = Path(
    "/home/_vb/youtube-playlists/"
    "CompTIA SY0-701 Security+ Training Course [PLG49S3nxzAnl4QDVqK-hOnoqcSKEIDDuv]"
)
OUTPUT_TS = _REPO / "card_pwa" / "src" / "data" / "messerVideoQuestionMap.ts"

QUESTION_ID_PATTERN = re.compile(r"^(M[1-5]-\d{3}):\s+\S")
# Mirrors FILENAME_PATTERN in card_pwa/src/utils/localVideoManifest.ts.
VIDEO_FILENAME_PATTERN = re.compile(
    r"^(\d+)\s*-\s*([1-5]\.\d{1,2})\s*-\s*(.+?)\s*\.mp4$", re.IGNORECASE
)
COURSE_SUFFIX = re.compile(r"\s*-\s*CompTIA.*$", re.IGNORECASE)
# Leaf deck titles look like "1.2.1: The CIA Triad" or "1.1: Security Controls".
LEAF_PATTERN = re.compile(r"^([1-5]\.\d{1,2}(?:\.\d{1,2})?):\s*(.+)$")

# Words that differ between APKG subdeck titles and MP4 titles without changing
# which video is meant. Kept minimal on purpose.
_NORMALIZE_STOPWORDS = {"and", "the", "an", "a", "of"}


def normalize_title(title: str) -> str:
    """Normalized join key; must stay in sync with the TS twin in
    messerVideoQuestionMap.ts (normalizeMesserVideoTitle). Plural-tolerant,
    weil APKG "Cloud Infrastructure" und MP4 "Cloud Infrastructures" heißt."""
    text = re.sub(r"\([^)]*\)", " ", title.lower())
    words = re.findall(r"[a-z0-9]+", text)
    kept = (w for w in words if w not in _NORMALIZE_STOPWORDS)
    return "".join(w[:-1] if len(w) > 3 and w.endswith("s") else w for w in kept)


def load_videos(media_dir: Path) -> dict[str, list[dict]]:
    """objective -> [{title, norm}] from the actual MP4 files."""
    by_objective: dict[str, list[dict]] = defaultdict(list)
    for file in sorted(media_dir.iterdir()):
        match = VIDEO_FILENAME_PATTERN.match(file.name)
        if not match:
            continue
        title = COURSE_SUFFIX.sub("", match.group(3)).strip()
        by_objective[match.group(2)].append(
            {"title": title, "norm": normalize_title(title)}
        )
    return by_objective


def load_apkg_leafs() -> dict[str, tuple[str, str]]:
    """APKG card_id -> (objective, leaf title without numbering)."""
    data = json.loads(APKG_CARDS_JSON.read_text())
    mapping: dict[str, tuple[str, str]] = {}
    for card in data["cards"]:
        leaf = card["deck"].split("::")[-1]
        match = LEAF_PATTERN.match(leaf)
        if not match:
            raise SystemExit(f"Unparsbarer Unterdeck-Titel: {leaf!r}")
        code, title = match.groups()
        objective = ".".join(code.split(".")[:2])
        mapping[str(card["card_id"])] = (objective, title.strip())
    return mapping


def load_finished_questions() -> list[dict]:
    questions: list[dict] = []
    for path in sorted(MC_DIR.glob("section*_mc.json")):
        for entry in json.loads(path.read_text()):
            if entry.get("needs_review"):
                continue
            question = entry.get("question", "")
            match = QUESTION_ID_PATTERN.match(question)
            if not match:
                raise SystemExit(
                    f"{path.name}: fertige Frage ohne M-ID: {question[:80]!r}"
                )
            questions.append(
                {"qid": match.group(1), "card_id": str(entry["card_id"])}
            )
    return questions


def build_map(media_dir: Path) -> dict[str, str]:
    videos = load_videos(media_dir)
    apkg = load_apkg_leafs()
    questions = load_finished_questions()

    errors: list[str] = []

    # Normalized titles must stay unique per objective, otherwise the runtime
    # join in the app becomes ambiguous.
    for objective, entries in videos.items():
        seen: dict[str, str] = {}
        for entry in entries:
            if entry["norm"] in seen:
                errors.append(
                    f"Objective {objective}: Videotitel kollidieren nach "
                    f"Normalisierung: {seen[entry['norm']]!r} / {entry['title']!r}"
                )
            seen[entry["norm"]] = entry["title"]

    qid_to_video: dict[str, str] = {}
    seen_qids: set[str] = set()
    for item in questions:
        qid, card_id = item["qid"], item["card_id"]
        if qid in seen_qids:
            errors.append(f"Doppelte Fragen-ID in mc_data: {qid}")
            continue
        seen_qids.add(qid)

        leaf = apkg.get(card_id)
        if leaf is None:
            errors.append(f"{qid}: card_id {card_id} nicht im APKG-Export")
            continue
        objective, leaf_title = leaf

        objective_videos = videos.get(objective, [])
        candidates = [
            v for v in objective_videos if v["norm"] == normalize_title(leaf_title)
        ]
        # Hat ein Objective nur ein Video, ist die Zuordnung trivial — auch wenn
        # der Unterdeck-Titel abweicht (z. B. 4.7 "Automation and Orchestration"
        # vs Video "Scripting and Automation").
        if not candidates and len(objective_videos) == 1:
            candidates = objective_videos
        if len(candidates) != 1:
            errors.append(
                f"{qid}: Unterdeck {leaf_title!r} (Obj {objective}) matcht "
                f"{len(candidates)} Videos: "
                f"{[v['title'] for v in videos.get(objective, [])]}"
            )
            continue
        qid_to_video[qid] = candidates[0]["title"]

    if errors:
        for line in errors:
            print(f"FEHLER: {line}", file=sys.stderr)
        raise SystemExit(f"{len(errors)} Zuordnungsfehler — nichts geschrieben.")

    return qid_to_video


def write_ts(mapping: dict[str, str]) -> None:
    videos = sorted(set(mapping.values()))
    lines = [
        "/**",
        " * AI_CONTEXT:",
        " * Role: Generated map from Professor Messer MC question ids (M1-001 …) to the exact course video title.",
        " * Used by: VideoRecallCheck to show only the questions belonging to the video that was just watched.",
        " * Important: GENERATED FILE — edit card-sync-server/scripts/generate_messer_video_question_map.py instead.",
        " */",
        "",
        "/**",
        " * Fragen-ID → Videotitel (exakt wie aus den MP4-Dateinamen geparst).",
        f" * Stand: {len(mapping)} Fragen, {len(videos)} Videos.",
        " *",
        " * Regenerieren:",
        " *   python3 card-sync-server/scripts/generate_messer_video_question_map.py",
        " */",
        "export const MESSER_VIDEO_BY_QUESTION_ID: Record<string, string> = {",
    ]
    for qid in sorted(mapping):
        title = mapping[qid].replace("\\", "\\\\").replace("'", "\\'")
        lines.append(f"  '{qid}': '{title}',")
    lines += [
        "}",
        "",
        "/**",
        " * Normalisierter Join-Schlüssel für Videotitel; Python-Zwilling:",
        " * normalize_title() im Generator-Skript. APKG-Unterdecks und MP4-Titel",
        " * weichen leicht ab (\"… Accounting (AAA)\" vs \"… and Accounting\"),",
        " * deshalb wird nie auf exakte Gleichheit verglichen.",
        " */",
        "export function normalizeMesserVideoTitle(title: string): string {",
        "  const stopwords = new Set(['and', 'the', 'an', 'a', 'of'])",
        "  return (title.toLowerCase().replace(/\\([^)]*\\)/g, ' ').match(/[a-z0-9]+/g) ?? [])",
        "    .filter(word => !stopwords.has(word))",
        "    .map(word => (word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word))",
        "    .join('')",
        "}",
        "",
    ]
    OUTPUT_TS.write_text("\n".join(lines))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--media-dir",
        type=Path,
        default=DEFAULT_MEDIA_DIR,
        help="Verzeichnis mit den Kurs-MP4s (Standard: Pi-Playlist-Ordner)",
    )
    args = parser.parse_args()

    mapping = build_map(args.media_dir)
    write_ts(mapping)

    by_video: dict[str, int] = defaultdict(int)
    for title in mapping.values():
        by_video[title] += 1
    print(f"{len(mapping)} Fragen auf {len(by_video)} Videos verteilt.")
    print(f"Geschrieben: {OUTPUT_TS}")


if __name__ == "__main__":
    main()
