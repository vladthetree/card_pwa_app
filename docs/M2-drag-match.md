# M2 Drag-Match — KI-Autorendoku (4 Optionen / 1 richtig)

> Status: **neu generiert 2026-06-10**. Encoding verifiziert an der echten ZTNA-Karte
> (CSV-Backup, `card_id 1779669260169`) und den Screenshots
> `Drag-Match1/2_enabled_Fokus_mode.jpeg` (RECOVERY_LOG §2, jetzt in der
> Git-Historie bis `f72ffd6`).

## Zweck

M2 rendert Karten mit **4 Optionen (A–D), genau 1 richtig** als Drag-&-Drop-Interaktion:
Drop-Zone „KORREKTE ANTWORT HIERHER ZIEHEN", Options-Chips unten, Falsch-Feedback mit
DEINE/RICHTIGE ANTWORT + „ERKLÄRUNG AUS DER KARTE". Renderer: `DragMatchCard.tsx`
(eigener Studien-Renderer, **nicht** der PBQ-`MatchingCard`).

**Wichtig:** Die App **mischt die Optionen und beschriftet sie nach Position neu mit A–D**.
Korrektheit hängt an der Identität der Option, nicht am Buchstaben — der kanonische
Buchstabe in den Daten muss also nur konsistent zur eigenen Karte sein.

## Eingabe-/Encoding-Format

```
front: <englische Frage (erste Zeile(n))>
A: <englische Option A>
B: <Option B>
C: <Option C>
D: <Option D>

back: >> CORRECT: <Buchstabe> |

<deutsche Erklärung: Warum richtig?>

[optional] Eselsbruecke: <Merkhilfe>

Nicht:
<falscher Buchstabe> | <deutsche Begründung>
<falscher Buchstabe> | <deutsche Begründung>
<falscher Buchstabe> | <deutsche Begründung>
```

- Erkennung: genau 4 Optionszeilen (`A:`–`D:`) im `front` **und** genau ein Correct-Marker
  im `back` → M2-Renderer (`parseQuestionText`/`parseAnswerText`, `isDragMatchShape`).
- `>> CORRECT: X | …` ist Pflicht und muss die **erste Zeile** des `back` sein.
- Genau **eine** richtige Option; Mehrfach-Korrekt wird von M2 nicht unterstützt.

## Dos & Don'ts

**Do**
- Distraktoren plausibel und gleich lang halten (ähnliche Wortanzahl wie die Lösung).
- Distraktoren aus typischen Verwechslungen bauen (z. B. ähnliche Akronyme).
- Für jeden Distraktor konkret erklären, warum er im Szenario nicht passt.
- Quellen und Objectives ausschließlich im QA-Katalog speichern.

**Don't**
- Keine „Alle Antworten sind richtig"/„Keine der genannten"-Optionen.
- Keine Optionen, die sich nur durch Negation unterscheiden.
- Buchstaben-Bezüge im Text vermeiden („Antwort B ist korrekt, weil…") — die Anzeige
  relabelt die Buchstaben nach dem Mischen!

## Schwierigkeits-/Längen-Vorgaben

- Frage ≤ 2 Zeilen; Optionen ≤ 10 Wörter; Erklärung 2–4 Sätze.
- Einsteiger: 1 klar falscher Distraktor erlaubt. Experte: alle 3 Distraktoren nah an
  der Lösung (gleiches Themenfeld, feine Abgrenzung).

## Beispiel-Prompt

> Erstelle 5 M2-Drag-Match-Karten zu Zero Trust. `front`: englische Frage +
> 4 englische Optionszeilen `A:`–`D:`. `back`: erste Zeile
> `>> CORRECT: <Buchstabe> |`, danach deutsche Richtig-Erklärung und `Nicht:`-
> Begründung für jeden Distraktor. Quellen separat als QA-Metadaten. Distraktoren: ähnliche Akronyme,
> keine Buchstaben-Bezüge im Erklärungstext.

## Beispiel-Output (verifiziertes Original-Encoding)

```
front: What does Zero Trust Network Access (ZTNA) provide?
A: Zoned Trust Network Architecture
B: Zero Trust Network Access
C: Zone-based Tunneling Network Access
D: Zero-Touch Network Authentication

back: >> CORRECT: B |

Brokered Access zu Apps statt Network-Level VPN. Authentifizierung pro Session,
kein impliziter Trust.

Eselsbruecke: ZTNA = wie ein Tuersteher bei jeder Tuer. Kein Generalpass wie bei VPN.
Nicht:
A | Dieser erfundene Begriff bezeichnet keine standardisierte Zugriffstechnik.
C | Tunneling beschreibt einen Transportmechanismus, nicht anwendungsbezogenen Zero-Trust-Zugriff.
D | Zero-touch provisioning automatisiert Bereitstellung; es ist keine Zugriffskontrolle pro Anwendung.
```
