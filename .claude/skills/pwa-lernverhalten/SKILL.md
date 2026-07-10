---
name: pwa-lernverhalten
description: Lernverhaltens- und Motivationsmechanik in Card_PWA entwerfen, umsetzen und reviewen. Anwenden, wenn Features rund um Gewohnheitsbildung, Streaks, XP/Quests, Tagesziele, Push-/Motivationsnachrichten, Erinnerungen, Recall-Checks oder Onboarding geplant oder geändert werden — oder wenn gefragt wird, wie die PWA Lernverhalten fördern kann (Stichworte: Motivation, Habit, Streak, Gamification, Notification, Lernverhalten).
---

# Lernverhalten durch PWA-Mechanik fördern

Card_PWA soll nicht nur Karten abfragen, sondern eine tägliche Lerngewohnheit
aufbauen. Jedes Feature in diesem Umfeld wird an zwei Fragen gemessen:
**Senkt es die Schwelle, heute anzufangen?** und **Belohnt es echten Abruf
statt Bildschirmzeit?** Wenn beides „nein“ ist, ist das Feature falsch
geschnitten — egal wie hübsch es ist.

## Leitprinzipien (Lernwissenschaft)

- **Abruf schlägt Wiederlesen.** Neue Mechanik muss aktiven Abruf erzeugen
  (Antwort formulieren/antippen, bevor sie sichtbar wird), nie passives
  Konsumieren belohnen.
- **Spacing gehört dem Scheduler.** Wiederholungsabstände kommen aus FSRS
  ([fsrs.ts](card_pwa/src/utils/fsrs.ts)); Features dürfen Fälligkeit
  glätten ([backlogSmoother.ts](card_pwa/src/utils/backlogSmoother.ts)),
  aber nie eigene Ad-hoc-Intervalle erfinden.
- **Erwünschte Schwierigkeit, ehrliches Feedback.** Sofort nach dem Abruf
  bewerten; die Bewertung ist endgültig (siehe Invarianten). Kein „nochmal
  versuchen bis richtig“ — das trainiert Raten, nicht Erinnern.
- **Selbsteinschätzung ≠ Scheduling.** Video-Recall-Checks sind reine
  Selbsteinschätzung und dürfen den Kartenplan nicht anfassen.

## Verhaltensdesign: Cue → kurze Routine → Belohnung

- **Cue:** Push-Motivation (serverseitig), Offline-Erinnerungen im Service
  Worker (tag-/slot-basiert, kein Spam), App-Badge
  ([useAppBadge.ts](card_pwa/src/hooks/useAppBadge.ts)), Splash-Zitat beim
  Start ([motivationQuote.ts](card_pwa/src/utils/motivationQuote.ts)).
- **Routine klein halten — das „Erste-Karte-Prinzip“:** Der Weg vom
  App-Start zur ersten fälligen Karte muss minimal bleiben. Die
  Motivationstexte sind bewusst so formuliert („Heute nur die erste
  Karte.“); UI-Änderungen dürfen keine Schritte davor einbauen.
- **Belohnung:** XP/Quests/Achievements
  ([gamification.ts](card_pwa/src/utils/gamification.ts), Tagesziel:
  20 Reviews / 15 Erfolge), Streak
  ([useStreak.ts](card_pwa/src/hooks/useStreak.ts), StreakBadge,
  DailyGoalRing), Heatmap ([ReviewHeatmap.tsx](card_pwa/src/components/ReviewHeatmap.tsx)),
  Session-Coach ([learningCoach.ts](card_pwa/src/services/learningCoach.ts)
  + SessionCoachPanel) mit Ein-Tap-Mini-Session für Problemkarten.
- **Neue Mechanik zuerst als Quest/Achievement in `gamification.ts`
  modellieren**, bevor ein neues System gebaut wird — die Primitiven
  (Quests, Achievements, Tagesziele) decken das meiste ab.

### Anti-Patterns (nicht bauen)

- Kein Schuld-Framing („Du hast X Tage verpasst!“), keine Drohkulisse um
  Streak-Verlust — der Ton der Motivationstexte (ruhig, konkret, kleinster
  nächster Schritt) ist der Maßstab.
- Keine Belohnung für reine Anwesenheit/Zeit, keine Interaktionszwänge
  (täglich einloggen ohne Lernwert), keine Notification-Frequenz-Eskalation.
- Kein Undo/Neu-Würfeln von Bewertungen, um „den Streak zu retten“.

## PWA-spezifische Hebel

- **Offline-first ist Lernverhaltens-Feature Nr. 1:** Lernen darf nie am
  Netz scheitern. Alles Lernrelevante lebt in IndexedDB/Dexie; „Server
  offline“ ist ein Banner, keine Blockade. Neue Features müssen komplett
  offline funktionieren.
- **Push:** Quelle der Motivationstexte ist
  [motivation.py](card-sync-server/server/push/motivation.py) — die
  Client-Kopie `card_pwa/src/data/motivationQuotes.ts` wird per
  `card-sync-server/scripts/generate_motivation_quotes_ts.py` **generiert**.
  Immer in motivation.py editieren, dann regenerieren. Versand:
  scheduler.py → delivery.py; Client-Abo via
  [useWebPushSubscription.ts](card_pwa/src/hooks/useWebPushSubscription.ts).
- **Schneller Start = niedrigere Einstiegshürde:** Animationen nur über den
  motion-Shim (`src/ui/motion`), keine externen render-blockenden Ressourcen
  in index.html (Fonts self-hosted). Alles, was den Start verzögert,
  verzögert die erste Karte.
- **Installierbarkeit:** usePwaInstall + InstallHintModal; Homescreen-Icon
  ist der stärkste tägliche Cue.

## Invarianten (nie verletzen)

1. **Video-Recall-Checks rufen nie `recordReview`/FSRS auf** — reine
   Selbsteinschätzung, kein Scheduling, kein XP.
2. **Bewertungen sind endgültig.** Zurückblättern ist read-only (Peek);
   `answerRevealed` sperrt Eingaben; kein zweites XP für dieselbe Antwort.
3. **Motivationstexte:** motivation.py ist Source of Truth, TS wird
   generiert — nie beide Seiten von Hand pflegen.
4. **Sprachen:** Jede sichtbare Mechanik braucht DE **und** EN
   (STRINGS/SettingsContext; Zitate zweisprachig).

## Checkliste vor Umsetzung/Merge

- [ ] Senkt die Startschwelle (oder lässt sie unverändert) — fügt keinen
      Schritt vor der ersten Karte ein
- [ ] Belohnt Abrufqualität, nicht Zeit oder Klicks
- [ ] Funktioniert vollständig offline
- [ ] Respektiert Invarianten 1–4
- [ ] Nutzt vorhandene Primitiven (Quest/Achievement/Streak/Coach) statt
      neuem System
- [ ] `npm run build` + `TZ=UTC npm test -- --run` grün; UI-Wirkung mit dem
      Skill `run-card-pwa` im echten Browser geprüft
