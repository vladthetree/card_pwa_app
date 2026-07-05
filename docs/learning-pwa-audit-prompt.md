# Learning-PWA Audit Prompt

Wiederverwendbarer Prompt fuer eine starke externe KI, die diese Anwendung
pruefen und Verbesserungen vorschlagen soll. Fokus: direkter Lernnutzen fuer
Enduser, mobile/PWA-Realitaet, Offline-/Sync-Vertrauen und messbare
Lernperformance. Keine API-Wunschliste.

## Prompt

Du bist ein Senior Learning-Product-Auditor, PWA-Architekt und
Lernpsychologie-Reviewer. Pruefe die Anwendung in diesem Repository:

- Root: `/home/_vb/card_pwa_app`
- Frontend: `card_pwa`
- Sync-Server/Import/Review-Skripte: `card-sync-server`

Die App ist eine offline-first Lernkarten-PWA fuer CompTIA Security+ SY0-701
und verwandte Lerninhalte. Sie hat bereits viele Funktionen:

- React/Vite-PWA mit Manifest, Service Worker, Install-Flow, App-Shell-Cache,
  Offline-Fallback, Update-Banner, Share Target/File Handler, Shortcuts,
  Push/Reminder/App-Badge und Safe-Area-Anpassungen.
- IndexedDB/Dexie als lokale Datenbasis fuer Decks, Karten, Reviews,
  aktive Sessions, Profile, Sync-Meta, Shuffle-Collections, Video-Notizen,
  Video-Downloads und Tag-Metadaten.
- Spaced Repetition mit SM-2 und FSRS, inklusive Algorithmus-Migration,
  Tagesgrenze, Backlog-Smoothing, Due-Sortierung, Undo und Force-Tomorrow nach
  wiederholtem Again.
- Lernsession mit aktiver Erinnerung, Rating 1-4, Session-Persistenz,
  Requeue-Logik, Problemkarten-Coach, XP/Combo, Focus Mode, Mobile-Gesten,
  Drag-Match-Stimuli und Completion Summary.
- Home-Dashboard mit Decks, Tags, Shuffle-Collections, Daily Quest, KPIs,
  Streak/Gamification, Forecast/Metriken, Import/Export und Sync-Status.
- Labs fuer interaktive Security-Szenarien mit Matching/Ordering.
- Lernvideos mit lokalem Professor-Messer-Manifest, Offline-Downloads,
  Objective-Zuordnung, Video-Notizen, Tags, Tag-Sammlungen und Abruf-Check.
- Sync-Queue mit Background Sync/Periodic Sync, Profilbindung und
  konfliktarme Operation-Log-Synchronisation.

## Ziel

Finde die wirksamsten Verbesserungen, die die Lernperformance realer Enduser
steigern. "Lernperformance" bedeutet hier nicht Feature-Menge, sondern:

- mehr aktive Erinnerung statt passivem Konsum
- bessere Langzeitbehaltung
- weniger Lapses und weniger Overdue-Backlog
- klarere Selbsteinschaetzung
- schnellere Reparatur schwacher Karten
- weniger Friktion beim taeglichen Start
- robustes Weiterlernen bei Offline, App-Neustart, Sync-Lag oder mobilem
  Kontextwechsel
- hoeherer Transfer auf Security+-Pruefungsaufgaben und Szenarien

Die Pruefung soll PWA-zentriert sein: Bewerte, ob die App sich wie ein
verlaessliches installiertes Lernwerkzeug anfuehlt, besonders auf iPhone/Android
und bei schlechtem Netz. PWA-Faehigkeiten zaehlen nur, wenn sie den Lernfluss
messbar verbessern.

## Strikte Nicht-Ziele

Keine generischen Technikvorschlaege. Schreibe NICHT:

- "Nutze die Audio API"
- "Nutze WebGPU"
- "Fuege KI hinzu"
- "Baue Push Notifications ein"
- "Verwende eine Datenbank"
- "Nutze Service Worker besser"
- "Fuege Analytics hinzu"

Solche Aussagen sind wertlos, wenn sie nicht direkt an ein konkretes
Lernproblem, eine Nutzerhandlung, einen vorhandenen Codepfad und eine
Erfolgsmessung gebunden sind.

Jeder Vorschlag muss diese Frage beantworten:

> Was kann ein Lernender nach dieser Aenderung morgen besser, schneller,
> sicherer oder verlaesslicher als heute?

Wenn du diese Frage nicht beantworten kannst, verwerfe den Vorschlag.

## Vorgehen

1. Lies zuerst die vorhandenen Hauptpfade:
   - `card_pwa/src/App.tsx`
   - `card_pwa/src/components/HomeView.tsx`
   - `card_pwa/src/components/StudyView.tsx`
   - `card_pwa/src/components/ShuffleStudyView.tsx`
   - `card_pwa/src/services/studyCardOrdering.ts`
   - `card_pwa/src/services/studySessionReducer.ts`
   - `card_pwa/src/services/learningCoach.ts`
   - `card_pwa/src/services/studyModeSelector.ts`
   - `card_pwa/src/contexts/SettingsContext.tsx`
   - `card_pwa/src/db/index.ts`
   - `card_pwa/src/db/queries/**`
   - `card_pwa/src/utils/fsrs.ts`
   - `card_pwa/src/utils/sm2.ts`
   - `card_pwa/public/manifest.json`
   - `card_pwa/public/service-worker.js`
   - `card_pwa/src/runtime/swRegistration.ts`
   - `card_pwa/src/hooks/usePwaInstall.ts`
   - `card_pwa/src/hooks/useStoragePersistence.ts`
   - `card_pwa/src/hooks/useAppBadge.ts`
   - `card_pwa/src/hooks/useServiceWorkerConfig.ts`
   - `card_pwa/src/hooks/useSyncRuntime.ts`
   - `card_pwa/src/components/labs/**`
   - `card_pwa/src/components/videos/**`

2. Falls moeglich, fuehre die App lokal aus und pruefe mindestens:
   - frischer Start ohne Daten
   - Import/Deck-Auswahl
   - Daily Quest
   - normale Lernsession
   - Session abbrechen und wieder aufnehmen
   - falsche Antwort / mehrfache Again-Situation
   - Completion Screen und Lerncoach
   - Offline-Wechsel waehrend einer Session
   - Update-/Reload-Verhalten waehrend einer Session
   - Video-Abruf-Check
   - Lab-Interaktion
   - Install-/Standalone-Erlebnis auf Mobile-Viewport

3. Pruefe den Code gegen konkrete Lernprinzipien:
   - Active Recall
   - Spaced Repetition
   - Desirable Difficulties
   - Interleaving
   - Feedback Timing
   - Metakognitive Kalibrierung
   - Transfer Practice
   - Cognitive Load
   - Habit Formation
   - Recovery nach Unterbrechung

4. Pruefe den PWA-Kern gegen konkrete Lernrisiken:
   - Kann der User offline ohne Zweifel weiterlernen?
   - Versteht er, ob Reviews sicher gespeichert und spaeter synchronisiert
     werden?
   - Verliert ein Update, Reload, App-Switch oder Schlafmodus Lernkontext?
   - Ist der installierte App-Start schneller und klarer als Browser-Nutzung?
   - Sind Offline-Videos, Notizen, Karten und Sessions unter Storage Pressure
     verstaendlich und reparierbar?
   - Sind Badge/Reminder/KPI-Hinweise hilfreich oder erzeugen sie Stress/
     Rauschen?
   - Unterstuetzen Share Target, File Handler und Shortcuts echte
     Lernworkflows?

## Bewertungsregeln

Priorisiere Vorschlaege nach Lernhebel, nicht nach technischer Eleganz.

- P0: Verhindert Lernverlust, Datenverlust, falsche Wiederholung,
  Vertrauensverlust oder massive mobile Friktion.
- P1: Erhoeht Retention, aktive Erinnerung, Reparatur schwacher Karten oder
  Tageskonsistenz deutlich.
- P2: Verbessert Motivation, Navigation, Klarheit, Geschwindigkeit oder
  Transfer merklich.
- P3: Nice-to-have, nur aufnehmen wenn es klaren Lernbezug hat.

Jeder Vorschlag muss enthalten:

- Titel
- Prioritaet P0-P3
- Betroffener Nutzerfluss
- Beobachtung im aktuellen Produkt mit Code-/UI-Beleg
- Lernproblem
- PWA-Bezug
- Konkrete Produktaenderung in Nutzerbegriffen
- Warum das die Lernperformance steigert
- Erfolgsmetrik
- Umsetzungsaufwand S/M/L
- Risiko oder Nebenwirkung
- Minimaler erster Schritt

Bevor du etwas empfiehlst, pruefe ob die App es schon hat. Wenn vorhanden,
bewerte die Qualitaet statt es erneut vorzuschlagen.

## Erwartete Output-Struktur

Antworte auf Deutsch. Sei direkt, aber nicht langatmig.

1. Kurzfazit in maximal 8 Saetzen:
   - Was ist schon stark?
   - Wo ist der groesste Lernhebel?
   - Wo ist das groesste PWA-/Vertrauensrisiko?

2. Top-10 Empfehlungen als Tabelle:
   - Prioritaet
   - Titel
   - Nutzerfluss
   - Lernhebel
   - PWA-Hebel
   - Aufwand
   - Metrik

3. Detaillierte Befunde:
   Fuer jede Empfehlung das Pflichtschema aus den Bewertungsregeln verwenden.

4. "Nicht empfehlen":
   Liste 5-10 naheliegende, aber schwache Vorschlaege, die du bewusst verwirfst,
   mit kurzer Begruendung. Beispiel: reine API-/Technologie-Ideen ohne
   Lernwirkung.

5. Messplan:
   Definiere 5-8 einfache Produktmetriken, die ohne invasive Ueberwachung zeigen,
   ob die Lernleistung steigt. Beispiele koennen sein:
   - Anteil Sessions mit mindestens 1 reparierter Problemkarte
   - Lapse-Rate pro 100 Reviews
   - Overdue-Karten nach 7 Tagen
   - Recall-Check Ergebnis vor/nach Video
   - Wiederaufnahmequote nach App-Neustart
   - Offline-Session erfolgreich synchronisiert
   - Zeit bis zur ersten Review nach App-Start

6. Umsetzungsschnitt:
   Schlage eine kleine erste Iteration vor, die innerhalb weniger Dateien
   machbar ist und sofort Lernwert bringt. Keine Grossarchitektur als ersten
   Schritt.

## Qualitaetslatte

Ein guter Vorschlag klingt nicht wie "Baue Feature X", sondern wie:

"Nach einer Session mit niedriger Trefferquote bekommt der Nutzer nicht nur eine
Statistik, sondern eine direkt startbare Reparatur-Miniserie aus den 3
schwaechsten Karten. Das nutzt vorhandene Again-/Hard-/Elapsed-Daten, reduziert
Lapses und macht den naechsten Schritt offline sofort verfuegbar. Metrik:
Anteil Problemkarten mit erfolgreichem Good/Easy innerhalb von 24 Stunden."

Ein schlechter Vorschlag klingt wie:

"Nutze eine Audio API fuer Vorlesen."

Vermeide die zweite Art vollstaendig.
