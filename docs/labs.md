# Labs — KI-Autorendoku (Interaktive Sicherheits-Szenarien)

> Status: **neu generiert 2026-06-10**. Struktur und UI rekonstruiert aus den
> Handy-Screenshots vom 8. Juni 2026 (`…23.38.26/.47/.57/.39.17/.39.49.jpeg`,
> RECOVERY_LOG §1). Inventar: `card_pwa/src/data/labScenarios.ts`.
> **Ziel-Inventar: 71 Szenarien** (Pill „4 / 71" im Original) — alle SY0-701-Domains,
> Schwerpunkt **Firewalls / Incident Response** (Nutzer-Vorgabe).

## Zweck

Labs sind geführte Mini-Szenarien („Interaktive Sicherheits-Szenarien") außerhalb des
Karten-/FSRS-Systems: Beschreibung + BEWEISMATERIAL/NETZWERKTOPOLOGIE + Ziel, dann
**Dropdown-Zuordnung** (Matching) oder **Drag-Reihenfolge** (Ordering) und „Antwort
prüfen". Gelöste Szenarien erhalten dauerhaft den Status **GESCHAFFT** (localStorage).
Scoring nutzt `utils/pbqScoring.ts` (`computeMatchingScore`/`computeOrderingScore`);
gelöst = Score 1.0.

## Eingabe-/Encoding-Format

Szenarien sind TypeScript-Objekte in `card_pwa/src/data/labScenarios.ts`:

```ts
{
  id: '<kategorie>-<slug>',           // eindeutig, kebab-case
  categoryId: '<LAB_CATEGORIES.id>',  // grundlagen | bedrohungen | firewalls |
                                      // architektur | iam | incident-response |
                                      // krypto | governance
  title: '<max. ~45 Zeichen>',
  objective: '<x.y SY0-701-Objective-Label>'  // oder 'Acronym-Bonus'
  difficulty: 'einsteiger' | 'fortgeschritten' | 'experte',
  minutes: 3 | 4 | 5,
  description: '<Szenario-Auftrag, 2–4 Sätze, du-Form>',
  evidence?:  '<BEWEISMATERIAL-Box, mehrzeilig (\n), z. B. Ticket/Log-Auszug>',
  topology?:  '<NETZWERKTOPOLOGIE-Box, ASCII: A -> [B] -> C>',
  goal?:      'Ziel: <ein Satz>',     // amber Callout
  interaction:
    | { type: 'matching',
        items: [{ left: '<Element>', right: '<korrektes Pendant>' }, ...],
        options: ['<alle rechten Werte + ggf. Distraktoren>'] }
    | { type: 'ordering',
        steps: ['<Schritte in BEWUSST gemischter Anzeige-Reihenfolge>'],
        correctOrder: [<Indizes in steps, Lösungs-Reihenfolge>] }
}
```

Invarianten (durch `__tests__/utils/lab-scenarios.test.ts` abgesichert):
- IDs eindeutig; `categoryId` existiert; jedes `right` kommt in `options` vor;
  `correctOrder` ist eine Permutation von `0..steps.length-1`.
- `steps` niemals in Lösungs-Reihenfolge autorieren (sonst ist das Szenario trivial).

## Dos & Don'ts

**Do**
- Realistische Artefakte ins `evidence`: Ticket-Nummern, Log-Zeilen, Regelwerke.
- Firewall-Ordering: Top-Down/First-Match-Logik abbilden (Spezifisch vor generisch,
  implicit DENY ans Ende) — wie das belegte „Geo-Block vor Web-Allow".
- Matching: 3–6 Paare; Ordering: 3–7 Schritte.
- Deutsch mit ue/oe/ae-Transliteration (konsistent zum Kartenbestand).

**Don't**
- Kein reines Faktenwissen ohne Szenario-Rahmen (dafür gibt es Karten).
- Keine Mehrdeutigkeit in der Lösungs-Reihenfolge — wenn zwei Reihenfolgen vertretbar
  sind, das Szenario enger formulieren oder das `goal` präzisieren.
- Keine Distraktor-Option, die für ein anderes Item ebenfalls korrekt wäre.

## Schwierigkeits-/Längen-Vorgaben

| Stufe | Interaktion | Minuten |
|---|---|---|
| Einsteiger | 3–4 Paare/Schritte, eindeutige Zuordnung | 3–4 |
| Fortgeschritten | 4–6 Paare/Schritte, Evidence nötig | 4–5 |
| Experte | 5–7 Schritte, Reihenfolge-Feinheiten (First-Match, Forensik-Prioritäten) | 4–5 |

Ziel-Verteilung bis zum 71er-Inventar: je Kategorie ≥ 8, davon `firewalls` und
`incident-response` je ≥ 12 (Schwerpunkt), Schwierigkeits-Mix ≈ 40/40/20.

## Beispiel-Prompt

> Erstelle 4 Lab-Szenarien für die Kategorie `firewalls` (SY0-701, deutsch, ue/oe/ae)
> im Encoding aus docs/labs.md: 2× ordering (Firewall-Regelwerke, Top-Down/First-Match,
> implicit DENY), 2× matching (Traffic → greifende Regel; System → Zone). Jedes
> Szenario mit `evidence` oder `topology`, Experte-Szenarien mit `goal`-Callout.
> `steps` gemischt autorieren und `correctOrder` als Permutation angeben.

## Beispiel-Output (belegtes Original-Szenario)

```ts
{
  id: 'firewalls-geo-block',
  categoryId: 'firewalls',
  title: 'Geo-Block vor Web-Allow',
  objective: '3.2 Applying Security Principles',
  difficulty: 'experte',
  minutes: 4,
  description: 'Nach DDoS-Attacken aus bestimmten Laendern soll ein Geo-Block (z.B. 185.204.0.0/16) Web-Zugriff vor dem regulaeren HTTPS-Allow blockieren. Ordne die Regeln korrekt.',
  topology: 'Internet -> [Firewall] -> DMZ Webserver 192.168.1.10:443',
  goal: 'Ziel: Block bekannter Bad-Networks zuerst, danach Standard-Allow-Web-Zugriff, dann implicit DENY.',
  interaction: {
    type: 'ordering',
    steps: [
      'DENY  ANY  ANY → ANY  :ANY',
      'DENY  ANY  185.204.0.0/16 → ANY  :ANY',
      'ALLOW TCP  ANY → 192.168.1.10  :443',
    ],
    correctOrder: [1, 2, 0],
  },
}
```
