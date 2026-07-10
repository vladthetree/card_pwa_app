"""Daily motivation message rotation for Card_PWA push notifications.

Source of truth for the motivational quotes: the client-side copy
(card_pwa/src/data/motivationQuotes.ts) is GENERATED from this file via
scripts/generate_motivation_quotes_ts.py — edit here, then regenerate.
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


DAILY_MOTIVATIONS = {
  "de": [
    ("Heute nur die erste Karte.", "Der Anfang ist der schwere Teil. Danach arbeitet dein Stapel für dich."),
    ("Mach den Rückstand kleiner.", "Nicht heroisch, nur sauber: ein kurzer Durchlauf nimmt dem Berg die Kante."),
    ("Eine gute Wiederholung zählt.", "Ziel ist nicht Tempo. Ziel ist, dass eine Antwort morgen leichter auftaucht."),
    ("Trainiere die Abrufspur.", "Lesen fühlt sich leicht an. Erinnern baut die Leitung, die du später brauchst."),
    ("Dein zukünftiges Ich schaut zu.", "Zehn Minuten heute sind eine ruhigere Prüfungsvorbereitung später."),
    ("Kleine Session, echte Wirkung.", "Nimm die fälligen Karten ernst, aber nicht dramatisch. Fang an."),
    ("Schwierige Karten sind Hinweise.", "Wenn etwas hakt, ist das kein Urteil. Es ist die genaue Stelle, an der Lernen passiert."),
    ("Lernen ist ein System.", "Du musst heute nicht alles wissen. Du musst nur den nächsten Kontakt herstellen."),
    ("Mach die Erinnerung lauter.", "Jede aktive Antwort ist ein kleines Signal: Das hier bleibt wichtig."),
    ("Heute zählt Wiederfinden.", "Nicht perfekt formulieren. Erst wiederfinden, dann schärfen."),
    ("Deine Karten warten nicht auf Motivation.", "Gut so: Routine trägt auch dann, wenn die Stimmung noch bootet."),
    ("Kurz prüfen, ehrlich bewerten.", "Die App wird besser, wenn du ehrlich klickst. Dein Gedächtnis auch."),
    ("Ein Deck ist kein Berg.", "Es ist eine Reihe kleiner Türen. Öffne heute nur die nächste."),
    ("Halte die Kette leise stabil.", "Keine Show, kein Druck. Nur der nächste saubere Review."),
    ("Falsche Antworten sind Daten.", "Sie zeigen dir, wo dein Training den besten Hebel hat."),
    ("Heute eine Lücke schließen.", "Such dir die Karte, die gestern noch wacklig war, und gib ihr Halt."),
    ("Wissen wird durch Rückkehr fest.", "Du musst nicht länger lernen, sondern regelmäßig wieder auftauchen."),
    ("Dein Stapel wird leichter.", "Nicht durch Warten, sondern durch die nächste bewertete Karte."),
    ("Gib deinem Fokus einen Startpunkt.", "Eine Karte, eine Antwort, eine Bewertung. Mehr muss der erste Schritt nicht sein."),
    ("Übung macht Signale vertraut.", "Ports, Begriffe, Angriffe, Regeln: Was du abrufst, wird navigierbar."),
    ("Heute ohne Drama lernen.", "Setz dich kurz hin, dreh die erste Karte um, und lass den Flow entstehen."),
    ("Die guten Sessions sind oft unspektakulär.", "Ein paar ehrliche Reviews schlagen eine perfekte Ausrede."),
    ("Schieb nicht den ganzen Stapel.", "Schieb nur die erste Karte in Bewegung. Der Rest folgt leichter."),
    ("Dein Gehirn mag klare Wiederkehr.", "Gleiche Zeit, kleine Session, echte Abrufarbeit."),
    ("Nicht sammeln. Abrufen.", "Der Fortschritt entsteht in dem Moment, in dem du die Antwort selbst ziehst."),
    ("Heute reicht ein stabiler Treffer.", "Eine Karte weniger im Nebel ist ein echter Gewinn."),
    ("Mach Lernen messbar.", "Öffne die Session und lass die Bewertungen zeigen, was wirklich sitzt."),
    ("Der nächste Review ist der Hebel.", "Du musst nicht alles neu lernen. Du musst das Richtige rechtzeitig berühren."),
    ("Bleib freundlich und exakt.", "Wenn eine Karte fällt, heb sie sachlich wieder auf."),
    ("Sicherheit lernt man in Wiederholungen.", "Concepts werden belastbar, wenn du sie mehrmals aktiv zurückholst."),
    ("Heute ein sauberer Kontakt.", "Eine kurze Session ist genug, um den Lernfaden nicht abreißen zu lassen."),
    ("Port 443 kennst du im Schlaf?", "Genau so fühlen sich bald auch die anderen an. Wiederholung macht Fakten selbstverständlich."),
    ("Defense in Depth gilt auch beim Lernen.", "Karten, Videos, Abruf-Checks: Mehrere Schichten halten Wissen besser als eine."),
    ("Patch deine Wissenslücken.", "Wie beim Patch Tuesday: regelmäßig, bevor jemand die Lücke findet — der Prüfer zum Beispiel."),
    ("Vertraue nicht, verifiziere.", "Zero Trust fürs Gedächtnis: Erst wenn du es abgerufen hast, weißt du, dass es sitzt."),
    ("Dein Wissen braucht Integrität.", "Die CIA-Triade deines Lernens: verfügbar, belastbar, jederzeit abrufbar."),
    ("Ein Acronym pro Tag reicht schon.", "AAA, SIEM, SASE: Heute eines festigen ist besser als zehn überfliegen."),
    ("Brute Force funktioniert beim Lernen nicht.", "Verteilte Wiederholung schlägt die Nachtschicht vor der Prüfung. Immer."),
    ("Dein Fortschritt ist verschlüsselt gespeichert.", "Jede Session zahlt ein. Auch wenn du es heute noch nicht siehst."),
    ("Die Prüfung ist ein Abruf-Test.", "Also trainiere genau das: abrufen, nicht wiedererkennen."),
    ("Mach heute den Recall-Check.", "Ein Video anschauen ist Input. Der Check danach macht daraus Wissen."),
    ("Multi-Faktor fürs Gedächtnis.", "Lesen plus Hören plus Abrufen: Mehrere Faktoren, stärkere Erinnerung."),
    ("Ein Video plus fünf Fragen.", "Das ist eine komplette Lerneinheit. Mehr braucht ein guter Tag nicht."),
    ("Dein Streak ist ein Sicherheitskonzept.", "Kontinuität schützt vor dem Vergessen wie Monitoring vor dem Angriff."),
    ("Auch Profis fangen bei 1.1 an.", "Jede Domäne beginnt mit einer Karte. Du bist längst unterwegs."),
    ("Heute zählt Anwesenheit.", "Nicht jede Session muss glänzen. Sie muss nur stattfinden."),
    ("Müde? Dann nur drei Karten.", "Drei ehrliche Antworten sind mehr wert als ein schlechtes Gewissen."),
    ("Log deinen Lernfortschritt wie ein SIEM.", "Kleine Events, sauber erfasst, ergeben zusammen das große Bild."),
    ("Wackelige Karten zuerst.", "Die unbequemste Karte von gestern ist die wertvollste von heute."),
    ("Prüfungswissen ist ein Marathonlauf.", "Wer täglich kurz läuft, muss am Ende nicht sprinten."),
    ("Incident Response fürs Vergessen.", "Erkennen, eingrenzen, wiederherstellen: Genau das macht dein nächster Review."),
    ("Dein Gedächtnis hat eine Baseline.", "Jede Wiederholung hebt sie an. Abweichungen nach oben sind erwünscht."),
    ("Verfügbarkeit zählt auch für Wissen.", "Was du in der Prüfung brauchst, muss jetzt regelmäßig online sein."),
    ("Kein Tag ohne Backup.", "Eine kurze Session sichert, was du gestern gelernt hast."),
    ("Social Engineering wirkt nicht auf dich.", "Auch nicht die Ausrede, dass morgen der bessere Lerntag ist."),
    ("Least Privilege für Ablenkungen.", "Gib dem Handy nur die Rechte, die es braucht: keine, bis die Session fertig ist."),
    ("Fünf Minuten sind ein Fenster.", "Warteschlange, Kaffee, Bahn: Dein Stapel passt in jede Lücke."),
    ("Die Kurve vergisst schneller als du denkst.", "Aber ein einziger Abruf heute biegt sie wieder nach oben."),
    ("Du sammelst keine Punkte, du baust Wege.", "Jeder Abruf verstärkt die Route, die dich durch die Prüfung trägt."),
    ("Encryption at rest reicht nicht.", "Wissen muss in transit funktionieren: raus aus dem Kopf, rein in die Antwort."),
    ("Heute schon gehärtet?", "System-Hardening für den Kopf: eine Session, unnötige Zweifel deinstalliert."),
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
    ("You know port 443 in your sleep?", "The rest will feel like that soon. Repetition turns facts into reflexes."),
    ("Defense in depth works for studying too.", "Cards, videos, recall checks: layered learning holds better than one pass."),
    ("Patch your knowledge gaps.", "Like Patch Tuesday: regularly, before someone finds the hole — the examiner, for instance."),
    ("Don't trust, verify.", "Zero trust for memory: only a successful recall proves it is really there."),
    ("Your knowledge needs integrity.", "The CIA triad of studying: available, resilient, retrievable on demand."),
    ("One acronym a day is plenty.", "AAA, SIEM, SASE: nailing one beats skimming ten."),
    ("Brute force does not work on learning.", "Spaced repetition beats the all-nighter. Every time."),
    ("Your progress is stored encrypted.", "Every session pays in, even when you cannot see it yet."),
    ("The exam is a retrieval test.", "So train exactly that: recall, not recognition."),
    ("Do the recall check today.", "Watching a video is input. The check afterwards turns it into knowledge."),
    ("Multi-factor for your memory.", "Reading plus listening plus recalling: more factors, stronger trace."),
    ("One video plus five questions.", "That is a complete study unit. A good day needs no more."),
    ("Your streak is a security concept.", "Continuity protects against forgetting like monitoring against attacks."),
    ("Even pros start at 1.1.", "Every domain begins with one card. You are already on the way."),
    ("Today, showing up counts.", "Not every session has to shine. It only has to happen."),
    ("Tired? Then just three cards.", "Three honest answers beat a guilty conscience."),
    ("Log your progress like a SIEM.", "Small events, cleanly recorded, add up to the big picture."),
    ("Wobbly cards first.", "Yesterday's most uncomfortable card is today's most valuable one."),
    ("Exam prep is a marathon.", "Run a little every day and you will not have to sprint at the end."),
    ("Incident response for forgetting.", "Detect, contain, recover: that is exactly what your next review does."),
    ("Your memory has a baseline.", "Every repetition raises it. Upward anomalies are welcome."),
    ("Availability applies to knowledge too.", "What you need in the exam must be online regularly now."),
    ("No day without a backup.", "A short session secures what you learned yesterday."),
    ("Social engineering does not work on you.", "Neither does the excuse that tomorrow is the better study day."),
    ("Least privilege for distractions.", "Give your phone only the rights it needs: none, until the session is done."),
    ("Five minutes is a window.", "Queue, coffee, train: your deck fits into any gap."),
    ("The curve forgets faster than you think.", "But a single recall today bends it back up."),
    ("You are not collecting points, you are building routes.", "Every recall strengthens the path that carries you through the exam."),
    ("Encryption at rest is not enough.", "Knowledge must work in transit: out of your head, into the answer."),
    ("Hardened your system today?", "Hardening for the mind: one session, unnecessary doubts uninstalled."),
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


def parse_slot_times(raw: object) -> list[str]:
  """Kommagetrennte HH:MM-Liste -> validierte, sortierte, eindeutige Slots."""
  if not isinstance(raw, str) or not raw.strip():
    return []
  slots = []
  for part in raw.split(","):
    part = part.strip()
    normalized = normalize_daily_time(part)
    if normalized == part:
      slots.append(normalized)
  return sorted(set(slots))


def effective_slot_times(extra_slots_raw: object, daily_time: object) -> list[str]:
  """Globale Zusatz-Slots plus die nutzergewählte daily_time, chronologisch."""
  slots = parse_slot_times(extra_slots_raw)
  daily = normalize_daily_time(daily_time)
  if daily not in slots:
    slots.append(daily)
  return sorted(set(slots))


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


def compute_due_slot_index(now_utc: datetime, timezone_name: object, slot_times: list[str]) -> int | None:
  """Höchster Slot-Index, dessen Uhrzeit lokal bereits erreicht ist (None: keiner)."""
  due = None
  for i, slot_time in enumerate(slot_times):
    if has_passed_daily_time(now_utc, timezone_name, slot_time):
      due = i
  return due


def parse_last_sent_slot(last_sent_date: object, date_key: str) -> int:
  """Liest 'YYYY-MM-DD#slot' (neu) bzw. 'YYYY-MM-DD' (alt) -> letzter heute
  gesendeter Slot-Index; -1 wenn heute noch nichts gesendet wurde. Das alte
  Format ohne Slot zählt konservativ als „heute alles gesendet"."""
  if not isinstance(last_sent_date, str) or not last_sent_date.startswith(date_key):
    return -1
  rest = last_sent_date[len(date_key):]
  if not rest:
    return 10_000
  if rest.startswith("#") and rest[1:].isdigit():
    return int(rest[1:])
  return -1


def _message_index(language: str, seed: str) -> int:
  messages = DAILY_MOTIVATIONS[language]
  digest = hashlib.sha256(seed.encode("utf-8", errors="ignore")).digest()
  return int.from_bytes(digest[:4], "big") % len(messages)


def select_daily_motivation(language: object, date_key: str, subscription_key: str = "", slot: int = 0) -> dict:
  """Deterministische Wahl pro Tag+Slot+Empfänger; aufeinanderfolgende Slots
  desselben Tages bekommen garantiert unterschiedliche Sprüche."""
  lang = normalize_language(language)
  messages = DAILY_MOTIVATIONS[lang]
  index = _message_index(lang, f"{date_key}:{subscription_key}")
  for step in range(1, max(0, int(slot)) + 1):
    next_index = _message_index(lang, f"{date_key}#{step}:{subscription_key}")
    if next_index == index:
      next_index = (next_index + 1) % len(messages)
    index = next_index
  title, body = messages[index]
  return {
    "title": title,
    "body": body,
    "language": lang,
    "dateKey": date_key,
    "messageIndex": index,
    "messageCount": len(messages),
  }


def build_daily_motivation_payload(language: object, date_key: str, subscription_key: str = "", slot: int = 0) -> dict:
  message = select_daily_motivation(language, date_key, subscription_key, slot)
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
    "slot": slot,
  }


def utc_now() -> datetime:
  return datetime.now(timezone.utc)
