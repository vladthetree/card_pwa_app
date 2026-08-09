# YouTube-Transkript herunterladen

Am einfachsten startest du das Skript und fuegst nur die URL ein:

```bash
cd /home/_vb/card_pwa_app/sample_Transcripts/Mapping_Knowledge/Trasncript_Code
python3 download_transcript.py
```

Alternativ kannst du in `download_transcript.py` oben bei `VIDEO_URL` dauerhaft eine
URL eintragen:

```python
VIDEO_URL = "https://www.youtube.com/watch?v=VIDEO_ID"
```

Danach genuegt:

```bash
python3 download_transcript.py
```

Auch die direkte Uebergabe funktioniert:

```bash
python3 download_transcript.py "https://www.youtube.com/watch?v=VIDEO_ID"
```

Die bereinigte `.txt`-Datei und die originale `.vtt`-Untertiteldatei landen
automatisch im Unterordner `transcripts/`. Das Video selbst wird nicht
heruntergeladen. Das Skript bevorzugt vorhandene manuelle Untertitel und nutzt
sonst die automatisch erzeugten Untertitel von YouTube.

Voraussetzung ist `yt-dlp`. Falls es noch nicht installiert ist:

```bash
python3 -m pip install --user -U yt-dlp
```

Bei Videos, die eine Anmeldung erfordern, kann optional eine Cookies-Datei
angegeben werden:

```bash
YTDLP_COOKIES_FILE="/pfad/zu/cookies.txt" python3 download_transcript.py
```
