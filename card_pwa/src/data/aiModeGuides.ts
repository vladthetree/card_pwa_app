/**
 * KI-Anleitung pro Lernmodus — maschinenlesbar, quellenpflichtig.
 *
 * Zweck: Jede KI, die Inhalte für diese App erstellt oder Lernverhalten
 * bewertet, liest diese Datei als verbindliche Anleitung. Jede inhaltliche
 * Behauptung ist entweder (a) mit einer **verifizierten Forschungsquelle**
 * (SOURCES, alle am 2026-06-10 per Websuche gegen Verlag/DOI geprüft) oder
 * (b) mit einer **App-Logik-Referenz** (Datei/Funktion im Repo) belegt.
 * Unbelegte Dos/Don'ts sind nicht zulässig — das sichert der Test
 * `__tests__/utils/ai-mode-guides.test.ts` strukturell ab.
 *
 * Encoding-Details je Modus stehen in den Autoren-Dokus unter `docs/`
 * (M1-flip.md, M2-drag-match.md, M3-free-recall.md, shuffle.md, labs.md);
 * diese Datei ergänzt das **Warum** aus der Lernforschung.
 */

export interface ResearchSource {
  id: string
  authors: string
  year: number
  title: string
  /** Journal / Konferenz / Buch */
  container: string
  doi?: string
  url: string
  /** Verifizierter Kernbefund (eine Aussage, auf die sich die Regeln stützen). */
  finding: string
}

export interface GuideRule {
  text: string
  /** Forschungsbeleg(e) — IDs aus SOURCES. */
  sourceIds?: string[]
  /** App-Logik-Beleg: Datei-/Funktionsreferenz im Repo. */
  appLogic?: string
}

export interface ResearchClaim {
  claim: string
  sourceIds: string[]
}

export interface AiModeGuide {
  modeId: 'm1-flip' | 'm2-drag-match' | 'm3-free-recall' | 'shuffle' | 'labs' | 'fokus-modus' | 'daily-quest'
  name: string
  purpose: string
  /** Wie die App den Modus implementiert (überprüfbare Repo-Referenzen). */
  appLogic: string[]
  /** Forschungsgrundlage — jede Aussage mit Quellen-IDs. */
  researchBasis: ResearchClaim[]
  dos: GuideRule[]
  donts: GuideRule[]
  /** Encoding-/Autoren-Doku. */
  authoringDoc?: string
}

/** Verifizierte Quellen (Websuche 2026-06-10: Titel, Journal, Jahr, DOI geprüft). */
export const SOURCES: ResearchSource[] = [
  {
    id: 'roediger-karpicke-2006',
    authors: 'Roediger, H. L., & Karpicke, J. D.',
    year: 2006,
    title: 'Test-enhanced learning: Taking memory tests improves long-term retention',
    container: 'Psychological Science, 17(3), 249–255',
    doi: '10.1111/j.1467-9280.2006.01693.x',
    url: 'https://journals.sagepub.com/doi/10.1111/j.1467-9280.2006.01693.x',
    finding: 'Abruf-Testen schlägt wiederholtes Lesen bei verzögerter Behaltensleistung deutlich (Testing-Effekt); beim Sofort-Test wirkt Wiederlesen fälschlich überlegen.',
  },
  {
    id: 'rowland-2014',
    authors: 'Rowland, C. A.',
    year: 2014,
    title: 'The effect of testing versus restudy on retention: A meta-analytic review of the testing effect',
    container: 'Psychological Bulletin, 140(6), 1432–1463',
    doi: '10.1037/a0037559',
    url: 'https://pubmed.ncbi.nlm.nih.gov/25150680/',
    finding: 'Metaanalyse: Testen statt Wiederlesen verbessert Behalten mit mittlerem bis großem Effekt (g ≈ 0.50), robust über Materialtypen und Testformate.',
  },
  {
    id: 'adesope-2017',
    authors: 'Adesope, O. O., Trevisan, D. A., & Sundararajan, N.',
    year: 2017,
    title: 'Rethinking the use of tests: A meta-analysis of practice testing',
    container: 'Review of Educational Research, 87(3), 659–701',
    doi: '10.3102/0034654316689306',
    url: 'https://journals.sagepub.com/doi/abs/10.3102/0034654316689306',
    finding: 'Metaanalyse: Practice Testing wirkt über Formate hinweg; auch Multiple-Choice-Übungstests erzeugen verlässliche Lerngewinne.',
  },
  {
    id: 'cepeda-2006',
    authors: 'Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D.',
    year: 2006,
    title: 'Distributed practice in verbal recall tasks: A review and quantitative synthesis',
    container: 'Psychological Bulletin, 132(3), 354–380',
    doi: '10.1037/0033-2909.132.3.354',
    url: 'https://pubmed.ncbi.nlm.nih.gov/16719566/',
    finding: 'Metaanalyse (839 Vergleiche): Verteiltes Lernen schlägt Massieren; der optimale Wiederholungsabstand wächst mit dem gewünschten Behaltensintervall.',
  },
  {
    id: 'dunlosky-2013',
    authors: 'Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T.',
    year: 2013,
    title: "Improving students' learning with effective learning techniques: Promising directions from cognitive and educational psychology",
    container: 'Psychological Science in the Public Interest, 14(1), 4–58',
    doi: '10.1177/1529100612453266',
    url: 'https://journals.sagepub.com/doi/abs/10.1177/1529100612453266',
    finding: 'Übersichtsgutachten: Practice Testing und verteiltes Lernen haben die höchste Nützlichkeit; Wiederlesen und Markieren die niedrigste.',
  },
  {
    id: 'butler-roediger-2008',
    authors: 'Butler, A. C., & Roediger, H. L.',
    year: 2008,
    title: 'Feedback enhances the positive effects and reduces the negative effects of multiple-choice testing',
    container: 'Memory & Cognition, 36(3), 604–616',
    doi: '10.3758/MC.36.3.604',
    url: 'https://link.springer.com/article/10.3758/MC.36.3.604',
    finding: 'MC-Tests können Falschwissen über Distraktoren (Lures) einpflanzen; Feedback (sofort oder verzögert) erhöht korrekte Antworten und neutralisiert die Lure-Übernahme.',
  },
  {
    id: 'little-bjork-2012',
    authors: 'Little, J. L., Bjork, E. L., Bjork, R. A., & Angello, G.',
    year: 2012,
    title: 'Multiple-choice tests exonerated, at least of some charges: Fostering test-induced learning and avoiding test-induced forgetting',
    container: 'Psychological Science, 23(11), 1337–1344',
    doi: '10.1177/0956797612443370',
    url: 'https://pubmed.ncbi.nlm.nih.gov/23034566/',
    finding: 'MC-Fragen mit kompetitiven, plausiblen Alternativen fördern produktiven Abruf — auch für Wissen zu den (falschen) Alternativen; unplausible Distraktoren tun das nicht.',
  },
  {
    id: 'karpicke-blunt-2011',
    authors: 'Karpicke, J. D., & Blunt, J. R.',
    year: 2011,
    title: 'Retrieval practice produces more learning than elaborative studying with concept mapping',
    container: 'Science, 331(6018), 772–775',
    doi: '10.1126/science.1199327',
    url: 'https://www.science.org/doi/10.1126/science.1199327',
    finding: 'Freier Abruf schlägt elaboratives Lernen (Concept Mapping) — auch bei Verständnis- und Inferenzfragen, nicht nur bei Faktenwissen.',
  },
  {
    id: 'carpenter-delosh-2006',
    authors: 'Carpenter, S. K., & DeLosh, E. L.',
    year: 2006,
    title: 'Impoverished cue support enhances subsequent retention: Support for the elaborative retrieval explanation of the testing effect',
    container: 'Memory & Cognition, 34(2), 268–276',
    doi: '10.3758/BF03193405',
    url: 'https://link.springer.com/article/10.3758/BF03193405',
    finding: 'Je weniger Abruf-Hilfen (Cues) beim Üben, desto besser die spätere Behaltensleistung — freier Abruf ist nachhaltiger als stark gestützter Abruf.',
  },
  {
    id: 'brunmair-richter-2019',
    authors: 'Brunmair, M., & Richter, T.',
    year: 2019,
    title: 'Similarity matters: A meta-analysis of interleaved learning and its moderators',
    container: 'Psychological Bulletin, 145(11), 1029–1052',
    doi: '10.1037/bul0000209',
    url: 'https://www.semanticscholar.org/paper/bb5392e8eaf53a38cc0d147f301cce74cecb4436',
    finding: 'Metaanalyse: Interleaving nützt v. a. bei verwechselbaren, diskriminationsbedürftigen Inhalten (g ≈ 0.42 gesamt); bei reinen Wortlisten zeigt sich sogar ein Blocking-Vorteil (g ≈ −0.39).',
  },
  {
    id: 'bjork-bjork-2011',
    authors: 'Bjork, E. L., & Bjork, R. A.',
    year: 2011,
    title: 'Making things hard on yourself, but in a good way: Creating desirable difficulties to enhance learning',
    container: 'Psychology and the Real World (Worth Publishers), 56–64',
    url: 'https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/04/EBjork_RBjork_2011.pdf',
    finding: 'Wünschenswerte Erschwernisse (Abruf statt Wiederlesen, Spacing, Variation) senken die gefühlte, aber erhöhen die echte Lernleistung.',
  },
  {
    id: 'rawson-dunlosky-2022',
    authors: 'Rawson, K. A., & Dunlosky, J.',
    year: 2022,
    title: 'Successive relearning: An underexplored but potent technique for obtaining and maintaining knowledge',
    container: 'Current Directions in Psychological Science, 31(4), 362–368',
    doi: '10.1177/09637214221100484',
    url: 'https://journals.sagepub.com/doi/10.1177/09637214221100484',
    finding: 'Successive Relearning (bis zum korrekten Abruf üben, dann über mehrere verteilte Sitzungen erneut bis zum Kriterium) erzeugt dauerhaftes Wissen; Überlernen in einer Sitzung bringt wenig.',
  },
  {
    id: 'ye-2022-fsrs',
    authors: 'Ye, J., Su, J., & Cao, Y.',
    year: 2022,
    title: 'A stochastic shortest path algorithm for optimizing spaced repetition scheduling',
    container: 'Proceedings of the 28th ACM SIGKDD Conference, 4381–4390',
    doi: '10.1145/3534678.3539081',
    url: 'https://dl.acm.org/doi/10.1145/3534678.3539081',
    finding: 'Datengetriebenes Langzeitgedächtnis-Modell (Stabilität/Schwierigkeit je Antwort) optimiert Wiederholungsabstände; Grundlage der FSRS-Schedulerfamilie.',
  },
  {
    id: 'rey-2012',
    authors: 'Rey, G. D.',
    year: 2012,
    title: 'A review of research and a meta-analysis of the seductive detail effect',
    container: 'Educational Research Review, 7(3), 216–237',
    doi: '10.1016/j.edurev.2012.05.003',
    url: 'https://eric.ed.gov/?id=EJ986386',
    finding: 'Interessante, aber irrelevante Zusatzinformationen (seductive details) verschlechtern Behalten (klein–mittel) und Transfer (mittel) — Ablenkung/Arbeitsgedächtnis-Überlastung.',
  },
  {
    id: 'sweller-2011',
    authors: 'Sweller, J., Ayres, P., & Kalyuga, S.',
    year: 2011,
    title: 'Cognitive Load Theory',
    container: 'Springer (Explorations in the Learning Sciences)',
    doi: '10.1007/978-1-4419-8126-4',
    url: 'https://link.springer.com/book/10.1007/978-1-4419-8126-4',
    finding: 'Arbeitsgedächtnis ist eng begrenzt; irrelevante Last (extraneous load) reduzieren. Worked-Example-Effekt: Anfänger lernen mehr aus ausgearbeiteten Beispielen als aus reinem Problemlösen.',
  },
  {
    id: 'kornell-2009',
    authors: 'Kornell, N., Hays, M. J., & Bjork, R. A.',
    year: 2009,
    title: 'Unsuccessful retrieval attempts enhance subsequent learning',
    container: 'Journal of Experimental Psychology: Learning, Memory, and Cognition, 35(4), 989–998',
    doi: '10.1037/a0015729',
    url: 'https://pubmed.ncbi.nlm.nih.gov/19586265/',
    finding: 'Auch erfolglose Abrufversuche verbessern das anschließende Lernen — Fehler beim Abruf sind produktiv, sofern Feedback folgt.',
  },
]

export const AI_MODE_GUIDES: AiModeGuide[] = [
  // ── M1 Flip ────────────────────────────────────────────────────────────────
  {
    modeId: 'm1-flip',
    name: 'M1 Flip (Standard-Karteikarte, FSRS-Rating 1–4)',
    purpose:
      'Aktiver Abruf mit Selbstbewertung: Frage lesen → Antwort innerlich formulieren → aufdecken → Nochmal/Schwer/Gut/Leicht. Default und Fallback für jede Karte ohne Format-Encoding.',
    appLogic: [
      'Renderer: src/components/CardFace.tsx (Plain-Flip-Zweig, kein Options-/PBQ-/RECALL-Encoding)',
      'Rating → Scheduler: src/components/RatingBar.tsx → StudyView.handleRate → recordReview (src/db/queries/reviews.ts)',
      'Scheduler: FSRS (src/utils/fsrs.ts), Parametrisierung src/utils/algorithmParams.ts',
    ],
    researchBasis: [
      { claim: 'Abruf-Testen ist wiederholtem Lesen für langfristiges Behalten klar überlegen.', sourceIds: ['roediger-karpicke-2006', 'rowland-2014', 'dunlosky-2013'] },
      { claim: 'Wachsende, verteilte Wiederholungsabstände sind massiertem Lernen überlegen; FSRS setzt genau das datengetrieben um.', sourceIds: ['cepeda-2006', 'ye-2022-fsrs'] },
      { claim: 'Gefühlte Leichtigkeit täuscht: schwerer Abruf ist lernwirksamer als flüssiges Wiedererkennen.', sourceIds: ['bjork-bjork-2011'] },
    ],
    dos: [
      { text: 'Eine Karte = ein Konzept; die Frage muss ohne die Antwort beantwortbar formuliert sein (aktiver Abruf, kein Rätselraten).', sourceIds: ['roediger-karpicke-2006'] },
      { text: 'Antwort kurz halten (Kernaussage zuerst), damit die Selbstbewertung eindeutig ausfällt.', sourceIds: ['rawson-dunlosky-2022'] },
      { text: 'Merkhilfen („Eselsbruecke:") für verwechslungsanfällige Konzepte ergänzen — sie stützen den späteren Abruf, nicht das Wiedererkennen.', sourceIds: ['bjork-bjork-2011'] },
      { text: 'Den FSRS-Vorschlag respektieren: fällige Karten nicht „vorziehen", Abstände nicht manuell verkürzen.', sourceIds: ['cepeda-2006', 'ye-2022-fsrs'], appLogic: 'src/utils/fsrs.ts (Intervall-Berechnung aus Stabilität/Schwierigkeit)' },
    ],
    donts: [
      { text: 'Keine Karten, die nur Wiedererkennen prüfen („Stand X im Text?") — Behaltensvorteil entsteht durch Abruf, nicht durch Vertrautheit.', sourceIds: ['carpenter-delosh-2006'] },
      { text: 'Kein Material in die Frage packen, das die Antwort verrät (Cue-Überversorgung senkt den Lerneffekt).', sourceIds: ['carpenter-delosh-2006'] },
      { text: 'Keine Mehrfach-Fragen pro Karte — die 1–4-Bewertung kann Teilwissen nicht abbilden.', appLogic: 'src/components/RatingBar.tsx (ein Rating pro Karte → recordReview)' },
      { text: 'Nicht am selben Tag massiert wiederholen, wenn die Karte „Gut/Leicht" war — Spacing schlägt Massieren.', sourceIds: ['cepeda-2006', 'dunlosky-2013'] },
    ],
    authoringDoc: 'docs/M1-flip.md',
  },

  // ── M2 Drag-Match ──────────────────────────────────────────────────────────
  {
    modeId: 'm2-drag-match',
    name: 'M2 Drag-Match (4 Optionen A–D, genau 1 richtig)',
    purpose:
      'Multiple-Choice als produktiver Abruf: richtige Antwort in die Drop-Zone ziehen/tippen; bei Fehler sofortiges Feedback mit richtiger Antwort und Erklärung aus der Karte.',
    appLogic: [
      'Renderer: src/components/DragMatchCard.tsx (Shuffle + Positions-Relabeling A–D; Korrektheit über Identität, nicht Buchstabe)',
      'Scoring: src/utils/dragMatchScoring.ts; falsche Antwort ⇒ Rating 1/Again (StudyView, Regel P2.2)',
      'Erkennung: genau 4 Optionen A–D im front und genau 1 Correct-Marker im back (docs/M2-drag-match.md → src/utils/cardVariant.ts)',
    ],
    researchBasis: [
      { claim: 'Übungstests im MC-Format erzeugen verlässliche Lerngewinne.', sourceIds: ['adesope-2017', 'rowland-2014'] },
      { claim: 'MC kann Falschwissen über Distraktoren einpflanzen; Feedback direkt nach der Antwort neutralisiert das — die App zeigt deshalb sofort die richtige Antwort + Erklärung.', sourceIds: ['butler-roediger-2008'] },
      { claim: 'Kompetitive, plausible Alternativen machen MC zu produktivem Abruf (auch für Wissen zu den Alternativen).', sourceIds: ['little-bjork-2012'] },
    ],
    dos: [
      { text: 'Alle 3 Distraktoren plausibel und themennah bauen (typische Verwechslungen, ähnliche Akronyme) — erst das erzwingt echten Abruf.', sourceIds: ['little-bjork-2012'] },
      { text: 'Die Erklärung im back so schreiben, dass sie die richtige Antwort begründet UND die Distraktoren implizit entkräftet (Lure-Korrektur durch Feedback).', sourceIds: ['butler-roediger-2008'] },
      { text: 'Optionen ähnlich lang und grammatisch parallel formulieren, damit keine Oberflächen-Hinweise die Antwort verraten.', sourceIds: ['little-bjork-2012'] },
      { text: 'Genau eine korrekte Option; Korrektheit über den Inhalt definieren, nie über den Buchstaben.', appLogic: 'src/utils/dragMatchScoring.ts (Identitäts-Scoring) + DragMatchCard-Relabeling' },
    ],
    donts: [
      { text: 'Keine absurden/unplausiblen Distraktoren — sie erlauben Ausschluss ohne Abruf und verschenken den Lerneffekt.', sourceIds: ['little-bjork-2012'] },
      { text: 'Keine Buchstaben-Bezüge im Erklärungstext („B ist richtig, weil …") — die Anzeige mischt und relabelt A–D.', appLogic: 'src/components/DragMatchCard.tsx (Shuffle + Positions-Relabeling)' },
      { text: 'Keine „Alle/Keine der genannten"-Optionen — sie unterlaufen Identitäts-Scoring und produktiven Abruf.', sourceIds: ['little-bjork-2012'], appLogic: 'src/utils/dragMatchScoring.ts' },
      { text: 'Falsch-Feedback niemals weglassen oder auf später verschieben, wenn Inhalte umgebaut werden — ohne Feedback bleibt Lure-Falschwissen haften.', sourceIds: ['butler-roediger-2008'] },
    ],
    authoringDoc: 'docs/M2-drag-match.md',
  },

  // ── M3 Free Recall ─────────────────────────────────────────────────────────
  {
    modeId: 'm3-free-recall',
    name: 'M3 Free Recall (erinnern → aufdecken → selbst bewerten)',
    purpose:
      'Freier Abruf ohne Hinweisreize: offene Aufgabe, Antwort aus dem Gedächtnis produzieren, dann Selbst-Check Gewusst/Nicht gewusst.',
    appLogic: [
      'Renderer: src/components/FreeRecallCard.tsx; Erkennung RECALL:-Präfix oder Tag free-recall (src/utils/cardVariant.ts → isFreeRecallCard)',
      'Selbst-Check: src/utils/freeRecallScoring.ts — Nicht gewusst ⇒ 0.0 ⇒ Rating 1/Again (wie P2.2); Gewusst ⇒ freie FSRS-Wahl 1–4',
    ],
    researchBasis: [
      { claim: 'Freier Abruf mit minimalen Cues erzeugt die nachhaltigste Behaltensleistung — nachhaltiger als gestützter Abruf oder Wiedererkennen.', sourceIds: ['carpenter-delosh-2006', 'karpicke-blunt-2011'] },
      { claim: 'Auch gescheiterte Abrufversuche fördern das Lernen, sofern danach die Lösung gezeigt wird.', sourceIds: ['kornell-2009'] },
      { claim: 'Wiederholtes Erreichen eines Abruf-Kriteriums über verteilte Sitzungen (Successive Relearning) festigt Wissen dauerhaft.', sourceIds: ['rawson-dunlosky-2022'] },
    ],
    dos: [
      { text: 'Produktionsaufgaben stellen („Nenne …", „Skizziere den Ablauf …") mit klar abzählbaren Erwartungspunkten (3–7).', sourceIds: ['karpicke-blunt-2011'] },
      { text: 'Musterantwort als Checkliste formulieren, damit der Selbst-Check Gewusst/Nicht-gewusst ehrlich entscheidbar ist.', sourceIds: ['rawson-dunlosky-2022'], appLogic: 'src/components/FreeRecallCard.tsx (Selbst-Check nach Aufdecken)' },
      { text: 'Lernende ermutigen, VOR dem Aufdecken wirklich zu antworten (laut/schriftlich/innerlich) — der Versuch zählt, auch wenn er scheitert.', sourceIds: ['kornell-2009'] },
      { text: 'M3 für Listen/Abläufe nutzen, die später frei reproduziert werden müssen (z. B. IR-Phasen).', sourceIds: ['carpenter-delosh-2006'] },
    ],
    donts: [
      { text: 'Keine Hinweise oder Anfangsbuchstaben in die Frage einbauen — jeder zusätzliche Cue reduziert den Behaltensvorteil.', sourceIds: ['carpenter-delosh-2006'] },
      { text: 'Keine Ja/Nein- oder Ein-Wort-Aufgaben (dafür M1) — M3 lohnt sich erst bei echter Produktion.', sourceIds: ['karpicke-blunt-2011'] },
      { text: 'Bei „Nicht gewusst" die Karte nicht künstlich aufschieben — Again/kurzes Intervall ist gewollt und korrekt.', sourceIds: ['rawson-dunlosky-2022'], appLogic: 'src/utils/freeRecallScoring.ts (0.0 ⇒ Rating 1)' },
      { text: 'Keine mehrdeutigen Erwartungen („nenne einige …") — ohne klares Kriterium wird die Selbstbewertung wertlos.', sourceIds: ['rawson-dunlosky-2022'] },
    ],
    authoringDoc: 'docs/M3-free-recall.md',
  },

  // ── Shuffle ────────────────────────────────────────────────────────────────
  {
    modeId: 'shuffle',
    name: 'Shuffle-Decks (deckübergreifende Mischung / Interleaving)',
    purpose:
      'Karten mehrerer Decks gemischt lernen; Bewertungen fließen ins jeweilige Ursprungsdeck zurück.',
    appLogic: [
      'Session: src/components/ShuffleStudyView.tsx + src/services/ShuffleSessionManager.ts',
      'Collections (nur deckIds, keine eigenen Karten): src/db/queries/shuffleCollections.ts',
    ],
    researchBasis: [
      { claim: 'Interleaving nützt vor allem bei ähnlichen, verwechselbaren Inhalten, weil es Diskrimination erzwingt (g ≈ 0.42 gesamt).', sourceIds: ['brunmair-richter-2019'] },
      { claim: 'Achtung, Grenze des Effekts: Bei reinen Wortlisten zeigt die Metaanalyse einen Blocking-Vorteil (g ≈ −0.39) — Mischen ist kein Selbstzweck.', sourceIds: ['brunmair-richter-2019'] },
      { claim: 'Variation und Mischung sind „wünschenswerte Erschwernisse": Sie fühlen sich schlechter an, verbessern aber Langzeitlernen und Transfer.', sourceIds: ['bjork-bjork-2011'] },
    ],
    dos: [
      { text: 'Collections aus inhaltlich VERWANDTEN, verwechselbaren Decks bauen (z. B. ähnliche Akronyme, benachbarte Objectives) — dort wirkt Interleaving am stärksten.', sourceIds: ['brunmair-richter-2019'] },
      { text: 'Lernende vorwarnen, dass gemischtes Üben sich schwerer anfühlt, aber mehr bringt (sonst brechen sie zur „leichteren" Block-Übung ab).', sourceIds: ['bjork-bjork-2011'] },
      { text: '2–5 Quelldecks pro Collection; die Deck-Aufschlüsselung der Metriken muss interpretierbar bleiben.', appLogic: 'src/components/ShuffleMetricsModal.tsx (Aggregation pro Quelldeck)' },
    ],
    donts: [
      { text: 'Nicht alles wahllos mischen: Für unzusammenhängende Faktenlisten kann geblocktes Lernen überlegen sein.', sourceIds: ['brunmair-richter-2019'] },
      { text: 'Dasselbe Deck nicht in viele parallel bespielte Collections legen — Fälligkeiten sind global, Sessions konkurrieren um dieselben Karten.', appLogic: 'src/db/queries/shuffleCollections.ts (Collections referenzieren nur deckIds)' },
      { text: 'Interleaving nicht als Ersatz für Spacing verkaufen — beides sind getrennte, kombinierbare Effekte.', sourceIds: ['cepeda-2006', 'brunmair-richter-2019'] },
    ],
    authoringDoc: 'docs/shuffle.md',
  },

  // ── Labs ───────────────────────────────────────────────────────────────────
  {
    modeId: 'labs',
    name: 'Labs (interaktive Sicherheits-Szenarien, Matching/Ordering)',
    purpose:
      'Anwendung statt Faktenabruf: realistisches Szenario mit Beweismaterial/Topologie, Lösung per Zuordnung oder Reihenfolge, sofortiges Prüf-Feedback, GESCHAFFT-Status.',
    appLogic: [
      'Liste/Detail: src/components/labs/LabsView.tsx, LabScenarioView.tsx; Scoring: src/utils/pbqScoring.ts (gelöst = Score 1.0)',
      'Inventar + Invarianten: src/data/labScenarios.ts (Tests sichern Optionen-/Permutations-Integrität)',
    ],
    researchBasis: [
      { claim: 'Arbeitsgedächtnis ist begrenzt: Szenarien müssen irrelevante Last vermeiden; strukturierte Vorlagen/ausgearbeitete Beispiele entlasten Anfänger.', sourceIds: ['sweller-2011'] },
      { claim: 'Fehlversuche im Szenario sind produktiv, wenn unmittelbar Feedback und ein neuer Versuch folgen.', sourceIds: ['kornell-2009', 'butler-roediger-2008'] },
      { claim: 'Abruf-basierte Aufgaben fördern auch Verständnis und Inferenz — nicht nur Faktenwissen; Szenarien dürfen also Denkleistung verlangen.', sourceIds: ['karpicke-blunt-2011'] },
    ],
    dos: [
      { text: 'Jedes Detail im BEWEISMATERIAL muss zur Lösung beitragen; schmückende, irrelevante Details streichen.', sourceIds: ['rey-2012', 'sweller-2011'] },
      { text: 'Für Einsteiger-Szenarien stärker strukturieren (weniger Items, klares Ziel-Callout) — Anfänger profitieren von ausgearbeiteter Führung.', sourceIds: ['sweller-2011'] },
      { text: 'Eindeutige Lösungen sicherstellen: genau eine korrekte Reihenfolge/Zuordnung; sonst Szenario enger formulieren.', appLogic: 'src/utils/pbqScoring.ts (gelöst nur bei Score 1.0) + Invarianten-Tests in __tests__/utils/lab-scenarios.test.ts' },
      { text: 'Nach Fehlversuchen Korrektur + erneuten Versuch anbieten (statt Lösung einfach zu zeigen) — die App markiert falsche Stellen und erlaubt Retry.', sourceIds: ['kornell-2009'], appLogic: 'src/components/labs/LabScenarioView.tsx (Falsch-Feedback + „Nochmal versuchen")' },
    ],
    donts: [
      { text: 'Keine interessanten, aber lösungsirrelevanten Story-Details (seductive details) — sie senken nachweislich Behalten und Transfer.', sourceIds: ['rey-2012'] },
      { text: 'Experten-Szenarien nicht mit Grundlagen-Erklärungen überfrachten; umgekehrt Einsteiger nicht ohne Struktur ins Problemlösen werfen.', sourceIds: ['sweller-2011'] },
      { text: 'Keine Distraktor-Option verwenden, die für ein anderes Item ebenfalls korrekt wäre — das macht die Zuordnung mehrdeutig.', appLogic: 'src/data/labScenarios.ts (Matching: options decken items.right ab; Test sichert Konsistenz)' },
    ],
    authoringDoc: 'docs/labs.md',
  },

  // ── Fokus-Modus (orthogonal) ───────────────────────────────────────────────
  {
    modeId: 'fokus-modus',
    name: 'Fokus-Modus (Session-Header ausblenden)',
    purpose:
      'Reduziert die Lernansicht auf die Karte: Statistiken/Fortschritt werden ausgeblendet, der Platz bleibt reserviert (kein Layout-Sprung).',
    appLogic: [
      'Setting: settings.focusMode (src/contexts/SettingsContext.tsx); Ausblendung per visibility in StudyView/ShuffleStudyView',
    ],
    researchBasis: [
      { claim: 'Irrelevante, aber salient präsentierte Zusatzinformation lenkt ab und verschlechtert Lernen — weniger UI während des Abrufs ist lernförderlich.', sourceIds: ['rey-2012', 'sweller-2011'] },
    ],
    dos: [
      { text: 'Fokus-Modus für konzentrierte Abruf-Sessions empfehlen, besonders bei hoher Kartenlast oder Prüfungsnähe.', sourceIds: ['rey-2012'] },
      { text: 'Beim Gestalten neuer Studien-UI: Fortschritts-/Gamification-Elemente so bauen, dass der Fokus-Modus sie vollständig neutralisieren kann.', appLogic: 'src/components/StudyView.tsx (focusHidden via visibility, Platz reserviert)' },
    ],
    donts: [
      { text: 'Keine neuen, dauerhaft sichtbaren Anzeigen in die Karten-Ansicht einbauen, die sich dem Fokus-Modus entziehen.', sourceIds: ['rey-2012'], appLogic: 'src/components/StudyView.tsx / ShuffleStudyView.tsx (alle Header-Inhalte unter focusHidden)' },
    ],
  },

  // ── Daily Quest (orthogonal) ───────────────────────────────────────────────
  {
    modeId: 'daily-quest',
    name: 'Daily Quest (Pilot-Kachel: 25 Karten gemischt)',
    purpose:
      'Niedrigschwelliger Tageseinstieg: eine gemischte Session über alle Decks (max. 25 fällige Karten) direkt von der Startseite.',
    appLogic: [
      'Kachel: src/components/home/HomeDailyQuestTile.tsx; Kartenwahl: fetchDailyQuestCards (src/db/queries/decks.ts) → sortStudyCards-Priorisierung',
    ],
    researchBasis: [
      { claim: 'Tägliche, verteilte Übung schlägt seltene Marathon-Sitzungen bei gleicher Gesamtzeit.', sourceIds: ['cepeda-2006', 'dunlosky-2013'] },
      { claim: 'Kriteriumsbasiertes, über Tage verteiltes Wiederlernen (heute fällige Karten zuerst) ist die wirksamste Routine für dauerhaftes Wissen.', sourceIds: ['rawson-dunlosky-2022'] },
    ],
    dos: [
      { text: 'Die Quest klein und täglich halten (≈ 25 Karten) statt selten und groß — Regelmäßigkeit ist der Hebel.', sourceIds: ['cepeda-2006', 'rawson-dunlosky-2022'] },
      { text: 'Fällige Karten (Learning/Review) vor neuen priorisieren — die Quest übernimmt die Session-Priorisierung der App.', sourceIds: ['ye-2022-fsrs'], appLogic: 'src/services/StudySessionManager.ts (sortStudyCards: learning → relearning → review → new)' },
    ],
    donts: [
      { text: 'Die Quest nicht mehrfach täglich „farmen" — zusätzliche massierte Durchgänge am selben Tag bringen kaum Behaltensgewinn.', sourceIds: ['cepeda-2006'] },
      { text: 'Quest-Reviews nicht getrennt vom normalen Scheduler verbuchen — sie fließen in die Ursprungsdecks und deren FSRS-Zustand.', appLogic: 'src/App.tsx (startDailyQuest: synthetisches Deck, Karten behalten ihre deckId → recordReview)' },
    ],
  },
]

const sourceById = new Map(SOURCES.map(source => [source.id, source]))

export function getSource(id: string): ResearchSource | undefined {
  return sourceById.get(id)
}

export function getModeGuide(modeId: AiModeGuide['modeId']): AiModeGuide | undefined {
  return AI_MODE_GUIDES.find(guide => guide.modeId === modeId)
}
