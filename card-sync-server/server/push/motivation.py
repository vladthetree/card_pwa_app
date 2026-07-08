"""Daily motivation message rotation for Card_PWA push notifications."""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


DAILY_MOTIVATIONS = {
  "de": [
    ("Heute nur die erste Karte.", "Der Anfang ist der schwere Teil. Danach arbeitet dein Stapel fuer dich."),
    ("Mach den Rueckstand kleiner.", "Nicht heroisch, nur sauber: ein kurzer Durchlauf nimmt dem Berg die Kante."),
    ("Eine gute Wiederholung zaehlt.", "Ziel ist nicht Tempo. Ziel ist, dass eine Antwort morgen leichter auftaucht."),
    ("Trainiere die Abrufspur.", "Lesen fuehlt sich leicht an. Erinnern baut die Leitung, die du spaeter brauchst."),
    ("Dein zukuenftiges Ich schaut zu.", "Zehn Minuten heute sind eine ruhigere Pruefungsvorbereitung spaeter."),
    ("Kleine Session, echte Wirkung.", "Nimm die faelligen Karten ernst, aber nicht dramatisch. Fang an."),
    ("Schwierige Karten sind Hinweise.", "Wenn etwas hakt, ist das kein Urteil. Es ist die genaue Stelle, an der Lernen passiert."),
    ("Lernen ist ein System.", "Du musst heute nicht alles wissen. Du musst nur den naechsten Kontakt herstellen."),
    ("Mach die Erinnerung lauter.", "Jede aktive Antwort ist ein kleines Signal: Das hier bleibt wichtig."),
    ("Heute zaehlt Wiederfinden.", "Nicht perfekt formulieren. Erst wiederfinden, dann schaerfen."),
    ("Deine Karten warten nicht auf Motivation.", "Gut so: Routine traegt auch dann, wenn die Stimmung noch bootet."),
    ("Kurz pruefen, ehrlich bewerten.", "Die App wird besser, wenn du ehrlich klickst. Dein Gedaechtnis auch."),
    ("Ein Deck ist kein Berg.", "Es ist eine Reihe kleiner Tueren. Oeffne heute nur die naechste."),
    ("Halte die Kette leise stabil.", "Keine Show, kein Druck. Nur der naechste saubere Review."),
    ("Falsche Antworten sind Daten.", "Sie zeigen dir, wo dein Training den besten Hebel hat."),
    ("Heute eine Luecke schliessen.", "Such dir die Karte, die gestern noch wacklig war, und gib ihr Halt."),
    ("Wissen wird durch Rueckkehr fest.", "Du musst nicht laenger lernen, sondern regelmaessig wieder auftauchen."),
    ("Dein Stapel wird leichter.", "Nicht durch Warten, sondern durch die naechste bewertete Karte."),
    ("Gib deinem Fokus einen Startpunkt.", "Eine Karte, eine Antwort, eine Bewertung. Mehr muss der erste Schritt nicht sein."),
    ("Uebung macht Signale vertraut.", "Ports, Begriffe, Angriffe, Regeln: Was du abrufst, wird navigierbar."),
    ("Heute ohne Drama lernen.", "Setz dich kurz hin, dreh die erste Karte um, und lass den Flow entstehen."),
    ("Die guten Sessions sind oft unspektakulaer.", "Ein paar ehrliche Reviews schlagen eine perfekte Ausrede."),
    ("Schieb nicht den ganzen Stapel.", "Schieb nur die erste Karte in Bewegung. Der Rest folgt leichter."),
    ("Dein Gehirn mag klare Wiederkehr.", "Gleiche Zeit, kleine Session, echte Abrufarbeit."),
    ("Nicht sammeln. Abrufen.", "Der Fortschritt entsteht in dem Moment, in dem du die Antwort selbst ziehst."),
    ("Heute reicht ein stabiler Treffer.", "Eine Karte weniger im Nebel ist ein echter Gewinn."),
    ("Mach Lernen messbar.", "Oeffne die Session und lass die Bewertungen zeigen, was wirklich sitzt."),
    ("Der naechste Review ist der Hebel.", "Du musst nicht alles neu lernen. Du musst das Richtige rechtzeitig beruehren."),
    ("Bleib freundlich und exakt.", "Wenn eine Karte faellt, heb sie sachlich wieder auf."),
    ("Sicherheit lernt man in Wiederholungen.", "Concepts werden belastbar, wenn du sie mehrmals aktiv zurueckholst."),
    ("Heute ein sauberer Kontakt.", "Eine kurze Session ist genug, um den Lernfaden nicht abreissen zu lassen."),
  ],
  "en": [
    ("Start with the first card.", "The beginning is the hard part. After that, the stack starts moving."),
    ("Make the backlog smaller.", "No heroics: one clean pass takes the edge off the pile."),
    ("One honest recall counts.", "The goal is not speed. The goal is making tomorrow's answer easier."),
    ("Train the retrieval path.", "Reading feels easy. Recall builds the route you need later."),
    ("Future you is watching.", "Ten minutes today means calmer prep later."),
    ("Small session, real effect.", "Take the due cards seriously, not dramatically. Begin."),
    ("Hard cards are signals.", "A miss is not a verdict. It is the exact place where training works."),
    ("Learning is a system.", "You do not need to know everything today. Reconnect with the next card."),
    ("Turn the memory signal up.", "Every active answer says: this stays important."),
    ("Today is about retrieval.", "Do not perfect the wording first. Find it, then sharpen it."),
    ("Your cards do not wait for mood.", "Good. Routine can carry you before motivation arrives."),
    ("Check briefly, rate honestly.", "The app improves when you click honestly. So does memory."),
    ("A deck is not a mountain.", "It is a row of small doors. Open the next one today."),
    ("Keep the chain quietly stable.", "No performance, no pressure. Just the next clean review."),
    ("Wrong answers are data.", "They show where training has the most leverage."),
    ("Close one gap today.", "Find the card that wobbled yesterday and give it support."),
    ("Knowledge firms up by returning.", "You do not need longer study. You need timely re-contact."),
    ("Your stack gets lighter.", "Not by waiting, but by rating the next card."),
    ("Give focus a starting point.", "One card, one answer, one rating. That is enough for the first step."),
    ("Practice makes signals familiar.", "Ports, terms, attacks, rules: what you recall becomes navigable."),
    ("Study without drama today.", "Sit down briefly, flip the first card, and let the flow form."),
    ("Good sessions are often plain.", "A few honest reviews beat a perfect excuse."),
    ("Do not move the whole stack.", "Move the first card. The rest follows more easily."),
    ("Your brain likes clear returns.", "Same time, small session, real recall work."),
    ("Do not collect. Retrieve.", "Progress happens when you pull the answer out yourself."),
    ("One stable hit is enough.", "One less card in the fog is real progress."),
    ("Make learning measurable.", "Open the session and let the ratings show what actually sticks."),
    ("The next review is the lever.", "You do not need to relearn everything. Touch the right thing on time."),
    ("Be kind and precise.", "When a card falls, pick it up calmly."),
    ("Security knowledge needs repetition.", "Concepts become durable when you actively retrieve them more than once."),
    ("One clean contact today.", "A short session is enough to keep the learning thread intact."),
  ],
}


def normalize_language(value: object) -> str:
  return "en" if value == "en" else "de"


def normalize_daily_time(value: object) -> str:
  if not isinstance(value, str):
    return "20:00"
  value = value.strip()
  if len(value) == 5 and value[2] == ":":
    hour = value[:2]
    minute = value[3:]
    if hour.isdigit() and minute.isdigit() and 0 <= int(hour) <= 23 and 0 <= int(minute) <= 59:
      return value
  return "20:00"


def safe_zoneinfo(name: object) -> ZoneInfo:
  if not isinstance(name, str) or not name.strip():
    return ZoneInfo("UTC")
  try:
    return ZoneInfo(name.strip()[:80])
  except ZoneInfoNotFoundError:
    return ZoneInfo("UTC")


def local_date_key(now_utc: datetime, timezone_name: object) -> str:
  local_now = now_utc.astimezone(safe_zoneinfo(timezone_name))
  return local_now.strftime("%Y-%m-%d")


def has_passed_daily_time(now_utc: datetime, timezone_name: object, daily_time: object) -> bool:
  hour, minute = [int(part) for part in normalize_daily_time(daily_time).split(":")]
  local_now = now_utc.astimezone(safe_zoneinfo(timezone_name))
  return (local_now.hour, local_now.minute) >= (hour, minute)


def select_daily_motivation(language: object, date_key: str, subscription_key: str = "") -> dict:
  lang = normalize_language(language)
  messages = DAILY_MOTIVATIONS[lang]
  seed = f"{date_key}:{subscription_key}".encode("utf-8", errors="ignore")
  digest = hashlib.sha256(seed).digest()
  index = int.from_bytes(digest[:4], "big") % len(messages)
  title, body = messages[index]
  return {
    "title": title,
    "body": body,
    "language": lang,
    "dateKey": date_key,
    "messageIndex": index,
    "messageCount": len(messages),
  }


def build_daily_motivation_payload(language: object, date_key: str, subscription_key: str = "") -> dict:
  message = select_daily_motivation(language, date_key, subscription_key)
  return {
    "channel": "dailyMotivation",
    "title": message["title"],
    "body": message["body"],
    "language": message["language"],
    "tag": "card-pwa-daily-motivation",
    "url": "/?view=study",
    "icon": "/pwa-icons/icon-192.png",
    "badge": "/pwa-icons/icon-192.png",
    "dateKey": date_key,
    "messageIndex": message["messageIndex"],
  }


def utc_now() -> datetime:
  return datetime.now(timezone.utc)
