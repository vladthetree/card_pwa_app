#!/usr/bin/env python3
"""Laedt das Transkript eines einzelnen YouTube-Videos als Textdatei herunter."""

from __future__ import annotations

import html
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import textwrap
from urllib.parse import urlparse


# Optional: URL hier zwischen die Anfuehrungszeichen einfuegen und das Skript starten.
VIDEO_URL = ""

SCRIPT_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = SCRIPT_DIR / "transcripts"
LANGUAGE_FALLBACKS = ("de", "en")


class TranscriptError(RuntimeError):
    """Ein erwartbarer Fehler mit einer fuer Benutzer lesbaren Meldung."""


def find_yt_dlp() -> str:
    executable = shutil.which("yt-dlp")
    if executable:
        return executable

    local_install = Path.home() / ".local" / "bin" / "yt-dlp"
    if local_install.is_file() and os.access(local_install, os.X_OK):
        return str(local_install)

    raise TranscriptError(
        "yt-dlp wurde nicht gefunden. Installiere es mit:\n"
        "  python3 -m pip install --user -U yt-dlp"
    )


def run_yt_dlp(executable: str, arguments: list[str]) -> subprocess.CompletedProcess[str]:
    command = [executable, "--ignore-config", *arguments]
    cookies_file = os.environ.get("YTDLP_COOKIES_FILE", "").strip()
    if cookies_file:
        if not Path(cookies_file).is_file():
            raise TranscriptError(
                f"YTDLP_COOKIES_FILE verweist auf keine Datei: {cookies_file}"
            )
        command[2:2] = ["--cookies", cookies_file]

    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        details = (result.stderr or result.stdout).strip()
        last_lines = "\n".join(details.splitlines()[-8:])
        raise TranscriptError(
            "YouTube konnte nicht gelesen werden. Ist das Video erreichbar und hat es "
            f"Untertitel?\n\n{last_lines}"
        )
    return result


def read_url() -> str:
    if len(sys.argv) > 2:
        raise TranscriptError(
            f'Verwendung: python3 {Path(__file__).name} "YOUTUBE-URL"'
        )

    value = sys.argv[1] if len(sys.argv) == 2 else VIDEO_URL
    if not value.strip():
        value = input("YouTube-URL einfuegen: ")
    value = value.strip()

    parsed = urlparse(value)
    hostname = (parsed.hostname or "").lower()
    valid_hosts = {
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "music.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com",
        "youtu.be",
    }
    if parsed.scheme not in {"http", "https"} or hostname not in valid_hosts:
        raise TranscriptError("Bitte eine vollstaendige YouTube-URL einfuegen.")
    return value


def video_info(executable: str, url: str) -> dict:
    result = run_yt_dlp(
        executable,
        [
            "--no-warnings",
            "--no-playlist",
            "--skip-download",
            "--dump-single-json",
            url,
        ],
    )
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise TranscriptError("Die Video-Informationen konnten nicht gelesen werden.") from exc


def language_matches(language: str, wanted: str) -> bool:
    language = language.lower()
    wanted = wanted.lower()
    return language == wanted or language.startswith(wanted + "-")


def choose_language(languages: dict, preferences: list[str]) -> str | None:
    available = [
        language
        for language, formats in languages.items()
        if language != "live_chat" and formats
    ]
    if not available:
        return None

    # Bei automatisch erzeugten Untertiteln kennzeichnet "-orig" meist die
    # Originalsprache. Diese Fassung ist besser als eine automatische Uebersetzung.
    for wanted in preferences:
        original = next(
            (
                language
                for language in available
                if language.lower() == wanted.lower() + "-orig"
            ),
            None,
        )
        if original:
            return original
        exact = next(
            (language for language in available if language.lower() == wanted.lower()),
            None,
        )
        if exact:
            return exact
        related = next(
            (language for language in available if language_matches(language, wanted)),
            None,
        )
        if related:
            return related

    original = next(
        (language for language in available if language.lower().endswith("-orig")),
        None,
    )
    return original or available[0]


def choose_track(info: dict) -> tuple[str, bool]:
    video_language = str(info.get("language") or "").strip()
    preferences = list(
        dict.fromkeys(
            language
            for language in (video_language, *LANGUAGE_FALLBACKS)
            if language
        )
    )

    manual = info.get("subtitles") or {}
    language = choose_language(manual, preferences)
    if language:
        return language, False

    automatic = info.get("automatic_captions") or {}
    language = choose_language(automatic, preferences)
    if language:
        return language, True

    raise TranscriptError(
        "Fuer dieses Video sind weder manuelle noch automatisch erzeugte Untertitel "
        "verfuegbar."
    )


def safe_filename(value: str, fallback: str) -> str:
    value = re.sub(r'[\\/:*?"<>|\x00-\x1f]', "-", value)
    value = re.sub(r"\s+", " ", value).strip(" .-")
    return (value or fallback)[:180].rstrip(" .-")


def download_vtt(
    executable: str,
    url: str,
    language: str,
    automatic: bool,
    temporary_directory: Path,
) -> Path:
    output_template = str(temporary_directory / "subtitle.%(ext)s")
    subtitle_option = "--write-auto-subs" if automatic else "--write-subs"
    run_yt_dlp(
        executable,
        [
            "--no-warnings",
            "--no-playlist",
            "--skip-download",
            subtitle_option,
            "--sub-langs",
            language,
            "--sub-format",
            "vtt",
            "--output",
            output_template,
            url,
        ],
    )

    files = sorted(temporary_directory.glob("*.vtt"))
    if not files:
        raise TranscriptError("Die Untertitel wurden gefunden, aber nicht heruntergeladen.")
    return files[0]


def clean_cue_text(value: str) -> str:
    value = re.sub(r"<[^>]+>", "", value)
    value = html.unescape(value)
    value = value.replace("\u200b", " ").replace("\ufeff", " ")
    return re.sub(r"\s+", " ", value).strip()


def vtt_cues(vtt_text: str) -> list[str]:
    blocks = re.split(r"\n\s*\n", vtt_text.replace("\r\n", "\n").strip())
    cues: list[str] = []

    for block in blocks:
        lines = [line.strip() for line in block.splitlines()]
        timestamp_index = next(
            (index for index, line in enumerate(lines) if "-->" in line),
            None,
        )
        if timestamp_index is None:
            continue
        text = clean_cue_text(" ".join(lines[timestamp_index + 1 :]))
        if text:
            cues.append(text)
    return cues


def normalized_word(value: str) -> str:
    return re.sub(r"[^\w]+", "", value, flags=re.UNICODE).casefold()


def merge_overlapping_cues(cues: list[str]) -> str:
    merged: list[str] = []
    normalized: list[str] = []

    for cue in cues:
        words = cue.split()
        cue_normalized = [normalized_word(word) for word in words]
        pairs = [
            (word, norm)
            for word, norm in zip(words, cue_normalized)
            if norm
        ]
        if not pairs:
            continue
        words = [pair[0] for pair in pairs]
        cue_normalized = [pair[1] for pair in pairs]

        max_overlap = min(len(normalized), len(cue_normalized))
        overlap = 0
        for size in range(max_overlap, 0, -1):
            if normalized[-size:] == cue_normalized[:size]:
                overlap = size
                break

        # Eine komplett wiederholte Cue nicht erneut ausgeben.
        if overlap == len(cue_normalized):
            continue

        merged.extend(words[overlap:])
        normalized.extend(cue_normalized[overlap:])

    return " ".join(merged).strip()


def readable_paragraphs(text: str) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", text)
    paragraphs: list[str] = []
    current = ""
    for sentence in sentences:
        if current and len(current) + len(sentence) + 1 > 700:
            paragraphs.append(textwrap.fill(current, width=100))
            current = sentence
        else:
            current = f"{current} {sentence}".strip()
    if current:
        paragraphs.append(textwrap.fill(current, width=100))
    return "\n\n".join(paragraphs)


def create_transcript(vtt_file: Path) -> str:
    raw_text = vtt_file.read_text(encoding="utf-8-sig", errors="replace")
    transcript = merge_overlapping_cues(vtt_cues(raw_text))
    if not transcript:
        raise TranscriptError("Die Untertiteldatei enthaelt keinen lesbaren Text.")
    return readable_paragraphs(transcript)


def main() -> int:
    try:
        url = read_url()
        executable = find_yt_dlp()
        print("Lese Video-Informationen ...")
        info = video_info(executable, url)
        language, automatic = choose_track(info)

        title = str(info.get("title") or "YouTube-Video")
        video_id = safe_filename(str(info.get("id") or "video"), "video")
        base_name = safe_filename(f"{title} [{video_id}]", video_id)
        source_label = "automatisch erzeugt" if automatic else "manuell"
        print(f"Lade Untertitel: {language} ({source_label}) ...")

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix=".download-", dir=OUTPUT_DIR) as temp:
            vtt_file = download_vtt(
                executable,
                url,
                language,
                automatic,
                Path(temp),
            )
            transcript = create_transcript(vtt_file)
            final_vtt = OUTPUT_DIR / f"{base_name}.{safe_filename(language, 'sub')}.vtt"
            shutil.copy2(vtt_file, final_vtt)

        final_txt = OUTPUT_DIR / f"{base_name}.txt"
        metadata = (
            f"Titel: {title}\n"
            f"URL: {url}\n"
            f"Sprache: {language}\n"
            f"Untertitel: {source_label}\n\n"
            "---\n\n"
        )
        final_txt.write_text(metadata + transcript + "\n", encoding="utf-8")

        print("\nFertig:")
        print(f"  Text: {final_txt}")
        print(f"  Original: {final_vtt}")
        return 0
    except (TranscriptError, EOFError, KeyboardInterrupt) as exc:
        message = str(exc) or "Abgebrochen."
        print(f"\nFehler: {message}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
