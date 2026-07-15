#!/usr/bin/env python3
"""Extrahiert das offizielle SY0-701-V7-Objectives-PDF in eine strukturierte
Quelldatei für den Phase-0-Crosswalk (siehe docs/lerneinheiten-sy0-701-umsetzungsplan.md §5.1/§23.1).

Offline-Schritt: läuft nur, wenn sich der offizielle Source-Snapshot ändert.
Benötigt poppler (`pdftotext`). Aufruf:

    python3 scripts/sy0701/extract_objectives_pdf.py <objectives.pdf> \
        content/sy0-701/source/objectives-v7-extract.json

Der Parser arbeitet koordinatenbasiert (pdftotext -bbox-layout), weil die
Fließtext-Extraktion Spalten über Objective-Grenzen hinweg vermischt.
"""

import hashlib
import json
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"x": "http://www.w3.org/1999/xhtml"}

GLYPH_LEVEL = {"•": 1, "−": 2, "◦": 3, "ը": 4}
# Das V7-PDF rendert die (einzige) vierte Bullet-Ebene "Air-gapped" mit einem
# Font-Artefakt-Glyph U+0568 und setzt "Physical isolation" typografisch auf
# Ebene 2, obwohl es semantisch unter "Network infrastructure" gehört
# (konsistent mit dem restlichen Dokumentstil). Gezielter, dokumentierter
# Override statt genereller Heuristik:
LEVEL_OVERRIDES = {("3.1", "Physical isolation"): 3}

FOOTER_Y = 745.0
DOMAIN_BAND_Y = 135.0
OBJECTIVE_NUMBER_MAX_X = 45.0
TITLE_MIN_X = 45.0
TITLE_MAX_X = 310.0
# Spaltengrenzen der Objectives-Seiten (empirisch: Bullets bei x≈54-73 / 232-251 / 325-427).
COLUMN_BOUNDS = (200.0, 310.0)
# Akronymtabelle: Kürzel bei x≈55, Bedeutung bei x≈127.
ACRONYM_MEANING_MIN_X = 100.0
# Maximaler y-Abstand, mit dem eine glyphlose Zeile noch als Umbruch-Fortsetzung
# des vorherigen Bullets derselben Spalte gilt.
CONTINUATION_MAX_GAP = 14.0

OBJECTIVE_RE = re.compile(r"^([1-5])\.(\d{1,2})$")
DOMAIN_RE = re.compile(r"^([1-5])\.0\s+(.+)$")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def page_lines(page):
    lines = []
    for line in page.findall(".//x:line", NS):
        words = [w.text or "" for w in line.findall("x:word", NS)]
        text = " ".join(words).strip()
        if not text:
            continue
        lines.append({
            "x": float(line.get("xMin")),
            "y": float(line.get("yMin")),
            "text": text,
        })
    lines.sort(key=lambda l: (l["y"], l["x"]))
    return lines


def column_of(x: float) -> int:
    if x < COLUMN_BOUNDS[0]:
        return 0
    if x < COLUMN_BOUNDS[1]:
        return 1
    return 2


def is_footer(line) -> bool:
    if line["y"] > FOOTER_Y:
        return True
    t = line["text"]
    return (
        t.startswith("CompTIA Security+ SY0-701 V7 Certification Exam")
        or t.startswith("Exam Objectives Document Version")
        or t.startswith("Copyright ©")
        or bool(re.match(r"^\d\.0\s*\|", t))
    )


def parse_objectives(pages):
    """Liefert (domains, objectives). Ein Objective ist ein Bullet-Baum."""
    domains = {}
    objectives = []
    current = None  # zuletzt offenes Objective (für Seitenumbruch)

    for page in pages:
        lines = [l for l in page_lines(page) if not is_footer(l)]
        if not lines:
            continue
        # Objectives enden vor Akronymliste bzw. Hardware-/Software-Beispielliste.
        if any("Acronym List" in l["text"] or l["text"] in ("ACRONYM", "EQUIPMENT") for l in lines):
            break

        headers = []
        domain_lines = []
        for l in lines:
            m = DOMAIN_RE.match(l["text"])
            if m:
                domains.setdefault(f"{m.group(1)}.0", m.group(2).strip())
                domain_lines.append(l)
                continue
            if l["x"] < OBJECTIVE_NUMBER_MAX_X and OBJECTIVE_RE.match(l["text"]):
                headers.append(l)
        headers.sort(key=lambda l: l["y"])
        if not headers and not any(l["text"][:1] in GLYPH_LEVEL for l in lines):
            continue  # Deckblatt-/Textseite ohne Objective-Inhalt

        body = [l for l in lines if l not in domain_lines]

        regions = []
        if headers:
            # Inhalt vor dem ersten Header gehört zum Objective der Vorseite.
            first_y = headers[0]["y"]
            carry = [l for l in body if l["y"] < first_y - 8 and l not in headers]
            if carry and current is not None:
                regions.append((current, carry))
            for i, h in enumerate(headers):
                y0 = h["y"] - 8
                y1 = headers[i + 1]["y"] - 8 if i + 1 < len(headers) else 10_000.0
                region = [
                    l for l in body
                    if y0 <= l["y"] < y1 and l is not h
                ]
                obj = {
                    "id": h["text"],
                    "domainId": f"{h['text'].split('.')[0]}.0",
                    "title": "",
                    "bullets": [],
                }
                objectives.append(obj)
                current = obj
                regions.append((obj, region))
        else:
            if current is None:
                continue
            regions.append((current, body))

        for obj, region in regions:
            glyph_lines = [l for l in region if l["text"][:1] in GLYPH_LEVEL]
            first_bullet_y = min((l["y"] for l in glyph_lines), default=10_000.0)
            title_parts = [
                l for l in region
                if l["text"][:1] not in GLYPH_LEVEL
                and l["y"] < first_bullet_y - 2
                and TITLE_MIN_X <= l["x"] < TITLE_MAX_X
            ]
            if title_parts:
                joined = " ".join(l["text"] for l in sorted(title_parts, key=lambda l: l["y"]))
                obj["title"] = (obj["title"] + " " + joined).strip()

            content = [l for l in region if l["y"] >= first_bullet_y - 2]
            content.sort(key=lambda l: (column_of(l["x"]), l["y"]))

            last_item = None
            last_line = None
            open_items = {}
            for l in content:
                glyph = l["text"][:1]
                if glyph in GLYPH_LEVEL:
                    text = l["text"][1:].strip()
                    level = LEVEL_OVERRIDES.get((obj["id"], text), GLYPH_LEVEL[glyph])
                    item = {"text": text, "children": []}
                    # Eltern-Item: tiefstes offenes Item mit kleinerem Level
                    # (das PDF springt bei "Air-gapped" von Ebene 2 auf 4).
                    parent_levels = [lv for lv in open_items if lv < level]
                    parent = open_items[max(parent_levels)]["children"] if parent_levels else obj["bullets"]
                    parent.append(item)
                    open_items[level] = item
                    for deeper in [lv for lv in open_items if lv > level]:
                        del open_items[deeper]
                    last_item = item
                    last_line = l
                else:
                    if (
                        last_item is not None
                        and last_line is not None
                        and column_of(l["x"]) == column_of(last_line["x"])
                        and 0 < l["y"] - last_line["y"] <= CONTINUATION_MAX_GAP
                    ):
                        last_item["text"] = f"{last_item['text']} {l['text']}".strip()
                        last_line = l
                    # sonst: Streuzeile (kommt im V7-PDF nicht vor) — bewusst ignoriert

    # Typografie-Artefakt des V7-PDFs: Umbruchzeilen können einen eigenen
    # Spiegelstrich tragen (z. B. 4.7 "− Enabling/disabling services" /
    # "− and access"). Kleingeschriebene, kinderlose Items sind Fortsetzungen
    # des vorherigen Geschwister-Items.
    def merge_wrap_artifacts(items):
        merged = []
        for item in items:
            text = item["text"]
            if (
                merged
                and not item["children"]
                and text
                and text[0].islower()
                and not merged[-1]["children"]
            ):
                merged[-1]["text"] = f"{merged[-1]['text']} {text}"
                continue
            item["children"] = merge_wrap_artifacts(item["children"])
            merged.append(item)
        return merged

    for obj in objectives:
        obj["bullets"] = merge_wrap_artifacts(obj["bullets"])

    return domains, objectives


def parse_acronyms(pages):
    acronyms = []
    in_list = False
    for page in pages:
        lines = [l for l in page_lines(page) if not is_footer(l)]
        if any(l["text"] == "EQUIPMENT" for l in lines):
            break  # Hardware-/Software-Beispielliste, kein Akronymbestand
        if any("Acronym List" in l["text"] for l in lines):
            in_list = True
        if not in_list:
            continue
        rows = {}
        for l in lines:
            if l["text"] in ("ACRONYM", "DEFINITION") or "Acronym List" in l["text"]:
                continue
            if l["y"] < DOMAIN_BAND_Y + 60 and l["x"] < ACRONYM_MEANING_MIN_X and " " in l["text"]:
                continue  # Einleitungsabsatz
            rows.setdefault(round(l["y"]), []).append(l)
        for y in sorted(rows):
            cells = sorted(rows[y], key=lambda l: l["x"])
            left = [c for c in cells if c["x"] < ACRONYM_MEANING_MIN_X]
            right = [c for c in cells if c["x"] >= ACRONYM_MEANING_MIN_X]
            if left and right:
                acronyms.append({
                    "abbr": " ".join(c["text"] for c in left),
                    "meaning": " ".join(c["text"] for c in right),
                })
            elif right and acronyms:
                acronyms[-1]["meaning"] += " " + " ".join(c["text"] for c in right)
            elif left and left[0]["text"].isupper() and acronyms:
                # Kürzel ohne Bedeutung in derselben Zeile: nächste Zeile trägt sie.
                acronyms.append({"abbr": left[0]["text"], "meaning": ""})
    # Einleitungssätze, die als linke Zellen durchrutschen, haben Leerzeichen und
    # Kleinbuchstaben — herausfiltern.
    return [a for a in acronyms if a["meaning"] and not re.search(r"[a-z] [a-z]", a["abbr"])]


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    pdf = Path(sys.argv[1])
    out = Path(sys.argv[2])

    with tempfile.NamedTemporaryFile(suffix=".xml") as tmp:
        subprocess.run(
            ["pdftotext", "-bbox-layout", str(pdf), tmp.name],
            check=True,
        )
        tree = ET.parse(tmp.name)

    pages = tree.getroot().findall(".//x:page", NS)
    domains, objectives = parse_objectives(pages)
    acronyms = parse_acronyms(pages)

    def count_leaves(items):
        return sum(count_leaves(i["children"]) if i["children"] else 1 for i in items)

    result = {
        "schemaVersion": "sy0701-extract-1",
        "sourceSha256": sha256(pdf),
        "sourceDocument": "CompTIA Security+ SY0-701 V7 Certification Exam Objectives, Version 7.0",
        "domains": [
            {"id": did, "name": name} for did, name in sorted(domains.items())
        ],
        "objectives": objectives,
        "acronyms": acronyms,
        "stats": {
            "objectiveCount": len(objectives),
            "leafCount": sum(count_leaves(o["bullets"]) for o in objectives),
            "acronymCount": len(acronyms),
        },
    }

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"OK: {len(result['domains'])} Domains, {len(objectives)} Objectives, "
        f"{result['stats']['leafCount']} Leaf-Pfade, {len(acronyms)} Akronyme -> {out}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
