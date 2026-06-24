# Bericht: Lernvideos als Second Brain

## Ausgangspunkt

Die App hat bereits die wichtigsten Bausteine fuer ein Video-Second-Brain: lokale Lernvideos, Offline-Speicherung, Notizen pro Security+-Objective, Inline-Tags im Stil `#tag`, einen Tag-Browser und eine Tag-Sammlung, die Video-Notizen mit Lernkarten verbindet. Das ist didaktisch stark, weil ein Video nicht mehr nur konsumiert wird, sondern zu einem Knoten im Lernsystem wird.

Die naechste Verbesserung ist nicht "mehr Video", sondern bessere Wiederauffindbarkeit und bessere Lernhandlungen nach dem Video. Tags sollten deshalb nicht nur Labels sein, sondern Retrieval-Cues: kleine Ausloeser, die spaeter Erinnern, Vergleichen und Wiederholen erleichtern.

## Zielbild

Das Videoformat soll sich wie ein Obsidian fuer Lernvideos anfuehlen:

- Jede Video-Notiz kann mit `#tags` verknuepft werden.
- Ein Tag sammelt alle passenden Video-Notizen und Lernkarten an einem Ort.
- Verwandte Tags zeigen, welche Konzepte haeufig gemeinsam auftreten.
- Bestehende Tags werden beim Schreiben vorgeschlagen, damit keine parallelen Schreibweisen entstehen.
- Nach dem Schauen folgt aktiver Abruf statt passiver "gesehen"-Abhaken.

## Empfehlungen

1. Tags als Wissensknoten behandeln, nicht als Ordner

   Ein Objective bleibt die Kursstruktur. Tags bilden dagegen das persoenliche Denknetz: `#crypto`, `#iam`, `#incident-response`, `#risk`. So kann ein Thema quer durch mehrere Videos und Karten wiedergefunden werden.

2. Tag-Wiederverwendung direkt beim Notieren anbieten

   Das groesste Risiko in einem Tag-System sind Duplikate wie `#iam`, `#identity`, `#identity-access`. Vorschlaege aus bereits verwendeten Tags reduzieren diese Streuung und machen das Netz dichter.

3. Tag-Sammlung mit Related-Tags erweitern

   Eine gute Second-Brain-Ansicht endet nicht beim aktuellen Tag. Wenn `#crypto` oft zusammen mit `#pki` und `#tls` vorkommt, soll die App diese Nachbarschaft zeigen. Das erzeugt Backlink-Gefuehl ohne ein schweres Graph-Feature.

4. Video in aktive Lernhandlung umwandeln

   Der vorhandene Abruf-Check ist richtig: Erst schauen, dann erklaeren, dann ehrlich auf "Luecken", "Okay" oder "Sicher" setzen. Das schuetzt vor der Illusion, ein Video verstanden zu haben, nur weil es bekannt wirkt.

5. Tags mit Karten verbinden

   Die Tag-Sammlung sollte weiter Video-Notizen und Lernkarten zusammen anzeigen. Das ist der wichtigste Transfer: Aus Video-Kontext wird pruefbares Wissen.

## Umgesetzt

- Der Notizzettel zeigt jetzt bestehende Tags als Vorschlaege an.
- Wenn der Cursor nach einem angefangenen `#tag` steht, ersetzt ein Vorschlagsklick genau diesen Entwurf.
- Ohne Entwurf wird der Tag sauber an der Cursorposition eingefuegt.
- Tags mit Leerzeichen werden beim Einfuegen in inline-kompatible Tags umgewandelt, z. B. `Incident Response` zu `#Incident-Response`.
- Die Tag-Sammlung zeigt verwandte Tags mit Zaehler an.
- Ein Klick auf einen verwandten Tag wechselt direkt in dessen Sammlung.
- Die neue Tag-Logik ist durch Unit-Tests abgedeckt.

## Naechste sinnvolle Ausbaustufen

- Markdown-Export pro Tag, damit Notizen extern gesichert oder in Obsidian weiterverarbeitet werden koennen.
- Optionaler Tag-Graph als Uebersicht, aber erst wenn genug echte Notizen vorhanden sind.
- Notiz-Templates pro Video: "Kernaussage", "Pruefungsfrage", "Unsicher", "Verknuepfte Tags".
- Automatische Karten-Vorschlaege aus markierten Notizzeilen, aber nur als Entwurf, nicht vollautomatisch.
