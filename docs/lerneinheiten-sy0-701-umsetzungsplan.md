# Verbindlicher Umsetzungsplan: Lerneinheiten und Prüfungsreife für CompTIA Security+ SY0-701

Stand: 2026-07-15 · Planrevision 2 · ersetzt die vorherige Fassung vollständig

Dieses Dokument ist die verbindliche Spezifikation für die spätere Implementierung. Es ändert noch keinen Anwendungscode. Der kompakte Arbeitsplan steht in [../plan.md](../plan.md). Bei Abweichungen gilt dieses Dokument.

## 1. Ziel, Aussagegrenze und Begriffe

Die App soll einen Nutzer systematisch auf **CompTIA Security+ SY0-701** vorbereiten und die Wahrscheinlichkeit des Bestehens erhöhen. Sie organisiert Videos, Karten, Abrufübungen, Labs und Prüfungssimulationen in einem nachvollziehbaren Lernpfad.

Sie darf weder eine Bestehensgarantie geben noch diese drei Ebenen vermischen:

1. **Aktivität:** Wurde eine Einheit begonnen oder abgeschlossen?
2. **Mastery-Evidenz:** Ist ein Objective mit hinreichend aktueller, vielfältiger Evidenz beherrscht?
3. **Prüfungsreife:** Reichen Inhaltsabdeckung, Praxisleistung, unabhängige Simulationen und organisatorische Voraussetzungen für eine positive Empfehlung?

Ein vollständiger Kurs ist notwendige Lernaktivität, aber kein Nachweis für `examReady`. Der offizielle Scaled Score 750/900 wird nicht in eine vermeintliche Rohprozentgrenze umgerechnet.

## 2. Verbindliche offizielle Basis

### 2.1 Source-Snapshot

Kanonische Quelle am 2026-07-15:

| Feld | Wert |
|---|---|
| Prüfungsgeneration | CompTIA Security+ V7 |
| Exam-Code | `SY0-701` |
| Dokumenttitel | CompTIA Security+ SY0-701 V7 Certification Exam Objectives |
| Dokumentrevision | Version 7.0 |
| URL | <https://lecbyo.files.cmp.optimizely.com/download/cf25ec24b8a511ef9ecbb69c0f9687be> |
| SHA-256 | `95a2c75157928a8ba21b755b9cd25bde12c36983588b9fd4ee4e2268ae756b06` |
| Format | höchstens 90 MC-/PBQ-Items, global 90 Minuten |
| Scaled Score | 750 auf einer Skala von 100–900 |
| Domaingewichte | 12 / 22 / 18 / 28 / 20 Prozent |

Die offizielle Produktseite ist <https://www.comptia.org/en-us/certifications/security/>. Sie nennt aktuell Englisch, Japanisch, Portugiesisch, Spanisch und Thai; Deutsch ist nicht gelistet. Das Retirement ist nur als 2026 geschätzt.

UI-Sprache und gebuchte Prüfungssprache sind getrennte Felder. Bei deutscher Erklärung bleiben offizielle englische Fachbegriffe sichtbar; bewertbare Übung in der gebuchten Sprache beginnt bereits im Grundlagenabschnitt. Beide Readiness-Mocks laufen vollständig in der gebuchten Prüfungssprache.

### 2.2 Freshness- und Lifecycle-Gate

Ein versionierter `ExamSourceSnapshot` speichert mindestens URL, Titel, Exam-Code, Dokumentrevision, SHA-256, Abrufzeit, Domaingewichte, Format, angebotene Sprachen und Lifecycle-Status.

```ts
interface ExamSourceSnapshot {
  snapshotId: string
  examCode: 'SY0-701'
  documentTitle: string
  documentRevision: string
  documentUrl: string
  sha256: string
  retrievedAt: number
  domainWeights: readonly [12, 22, 18, 28, 20]
  maxItems: 90
  durationSec: 5400
  questionTypes: readonly ['multiple-choice', 'performance-based']
  passingScore: 750
  scoreScale: { min: 100; max: 900 }
  offeredLanguages: string[]
  lifecycleStatus: 'bookable' | 'not-bookable' | 'unknown'
  retirementDateIso?: string
  lifecycleSourceUrl: string
  usageBasis: string
  reviewedBy: string
}

interface SignatureMetadata {
  alg: 'Ed25519'
  keyId: string
  recordType: string
  canonicalizationVersion: 'JCS-RFC8785-v1'
  payloadHashSha256: string
  issuedAt: number
  expiresAt?: number
  signatureBase64Url: string
}

type SignedEnvelope<T extends object> = T & { signature: SignatureMetadata }

interface SigningVerificationKeyPayload {
  keyId: string
  alg: 'Ed25519'
  publicKeyJwk: { kty: 'OKP'; crv: 'Ed25519'; x: string }
  status: 'active' | 'retired' | 'revoked'
  validFrom: number
  validUntil?: number
  revokedAt?: number
  registryVersion: string
}

type SigningVerificationKey = SignedEnvelope<SigningVerificationKeyPayload>
```

Alle im Plan als signiert bezeichneten Lease-, Timing-, Exposure-, Qualification-, Score-, Lifecycle- und Readiness-Datensätze folgen diesem gemeinsamen Envelope. Der Payloadhash wird über den RFC-8785-kanonisierten Payload **ohne** `signature` gebildet. Die tatsächlich mit Ed25519 signierten Bytes sind exakt die UTF-8-Bytes der RFC-8785-Kanonisierung von `{ recordType, payloadHashSha256, issuedAt, expiresAt: expiresAt ?? null, alg, keyId, canonicalizationVersion }`; damit sind Domain/Recordtyp, Hash, Zeiten, Algorithmus, Key und Kanonisierung gemeinsam gebunden. Derselbe Payload darf nicht unter einem anderen `recordType` wiederverwendet werden. Initial ist ausschließlich Ed25519 erlaubt; Browser verifizieren über WebCrypto gegen eine serverseitig veröffentlichte, versionierte Key-Registry. Danach werden zusätzlich Profil, Person, Identity-Binding, Epoch und Snapshot/Manifest gegen den erwarteten Kontext geprüft.

Key-Rotation veröffentlicht den neuen Public Key vor Nutzung und behält nicht kompromittierte historische Verify-Keys für Audit-Receipts. `GET /v1/signing-keys/{keyId}` liefert einen `SigningVerificationKey`, dessen Registry-Signatur gegen einen im Client gepinnten Registry-Root bzw. dessen kontrolliertes Update geprüft wird. Der Client cached nach `keyId` höchstens bis Status-/Gültigkeitsgrenze und aktualisiert die Revocation-Liste bei Appstart, vor Readiness-Lease und vor Anzeige von `examReady`. Unbekannter Key wird höchstens einmal nachgeladen und schlägt danach geschlossen fehl; widerrufene/kompromittierte Keys invalidieren betroffene Readiness-Evidenz über einen Audit-/Invalidation-Prozess. Kurzlebige Lease-, Heartbeat-, Lock- und Authority-Envelopes benötigen `expiresAt`; dauerhafte Audit-Receipts bleiben kryptografisch historisch verifizierbar. Kein Pfad fällt auf „String vorhanden“ oder ungeprüftes lokales Vertrauen zurück.

Prüfpunkte:

- zu Lernbeginn,
- vor einer Release-/Content-Freigabe,
- bei Prüfungsbuchung,
- sieben Tage vor dem Termin und am Vortag.

Ein anderer Hash, eine neue Dokumentrevision, ein anderer Exam-Code oder ungeklärte Buchbarkeit blockiert Aussagen wie „vollständig aktuell“ und `examReady`, bis ein manueller Diff samt Review abgeschlossen ist. Das bisher in `LAB_SOURCES['comptia-sy0-701-objectives']` registrierte ältere Dokument wird ersetzt oder sichtbar als historisch markiert.

Die Bullet-Beispiele des Objective-Dokuments sind nicht zwingend abschließend. Der Crosswalk ist daher eine prüfbare Mindestabdeckung, keine Garantie, jede mögliche Aufgabenform vorherzusehen.

## 3. Verifizierter Ist-Bestand

Stand der Bestandsanalyse am 2026-07-15:

| Bestand | Verifizierter Wert | Qualitätsaussage |
|---|---:|---|
| aktive Karten pro Profil | 803 | Menge, nicht Vollständigkeit |
| direkte Root-Deck-Karten D1–D5 | 30 / 57 / 96 / 90 / 66 = 339 | potenzieller Praxis-/Exam-Pool, noch zu prüfen |
| Objective-Deck-Karten D1–D5 | 130 / 114 / 57 / 71 / 40 = 412 | ungleich verteilt |
| Acronym-Bonus | 43 | davon nur 7 parsererkannt Matching/Ordering |
| Interaktive Übungen | 9 | parsererkannt PBQ-artig |
| weitere PBQ-artige Objective-Karten | 7 | über mehrere Decks verteilt |
| Kursvideos | 121 Dateien, 120 mit Objective-Code | Indizes 002–121 bilden Kursunits |
| APKG-Rohbestand | 2.995 Karten / 1.532 Notes | Importquelle, keine QA-Freigabe |
| Recall-MC-Datensätze | 1.530 | 375 `ready`, 1.155 `needs_review` |
| Zieldeck-Fehlzuordnungen | 31 der 375 | derzeit nur 344 zieldeckstrikt erreichbar |
| Labs | 100 Szenarien / 11 Blueprints | Objective-Mapping und Rubriken zu normalisieren |

Bekannte Lücken:

- Objective-Decks 4.2 und 4.9 sind aktiv leer, obwohl das APKG Rohmaterial enthält.
- 4.4, 4.7 und 4.8 besitzen nur vier bis fünf Karten.
- ungefähr 16 Videos haben weder gemappte MC- noch Transkriptfragen.
- 23 von 28 Objectives haben mehrere Videos; eine Objective-weite Kartendosis würde Inhalte zwischen Videos vermischen.
- Video-Fortschritt ist heute Objective-weit und global, Recall-Historie global; mehrere Videos desselben Objectives können dadurch fälschlich dasselbe Signal teilen.
- das Öffnen eines Videos kann derzeit als „watched“ gelten; das ist keine ausreichende Abschluss- oder Mastery-Evidenz.
- Lab-Fortschritt ist nur als globale localStorage-Menge vorhanden; Examversuche existieren nicht als eigenes Modell.

Der Ordner [../messner_lernkarten/](../messner_lernkarten/) wird bis zur dokumentierten Lizenz-/Herkunftsprüfung als Dritt-/abgeleitetes Kursmaterial bezeichnet. Formulierungen wie „offizieller Messer-Kartensatz“ oder „echte CompTIA-Fragen“ sind ohne ausdrücklichen Nachweis unzulässig.

## 4. Bestätigte Produktentscheidungen und Scope

- 1 Video = 1 `course`-Einheit; 120 Einheiten in Playlist-Reihenfolge 002–121.
- freies Vorziehen ist möglich, ohne die bereits aktive Einheit zu verlieren.
- höchstens eine empfohlene Review-Einheit pro Lerntag vor neuem Stoff; Kurs ist nie hart blockiert.
- mehrere Kurs-Einheiten pro Tag sind zulässig.
- je Lab-Szenario eine Einheit; Kategorien sind nur Gruppierung.
- Drill und Vollsimulation sind unterschiedliche Exam-Modi.
- große Kachel + kompakte Liste + Vollliste bleiben im Dashboard-Modul „Aktuelles Paket“.

Phasen 0–5 sind für das Ziel Prüfungsreife verpflichtend. Phasen 1–3 ergeben nur ein Lernorganisations-MVP. Phase 6 ist Feinschliff, Phase 7 optionaler Komfort-Sync; der Readiness-Sync ist bereits Pflicht in Phase 5.

Nicht Teil dieses Plans:

- Vorhersage oder Garantie des offiziellen Scaled Scores,
- Nachbau proprietärer echter CompTIA-PBQs,
- Nutzung von Brain Dumps, erinnerten oder geleakten Prüfungsfragen,
- Änderung des mathematischen FSRS- oder SM-2-Algorithmus,
- Vergabe zusätzlicher XP allein für Unit-, Lab- oder Examabschluss.

## 5. Fachliches Coverage-Modell

### 5.1 Atomarer Crosswalk

Die offizielle Hierarchie wird exakt und versioniert modelliert:

`ExamSnapshot → 5 Domains → 28 Objectives → Bullet-/Unter-Bullet-Pfade → Akronym-Bedeutungspaare`

Jeder kleinste prüfbare Pfad besitzt:

```ts
type CoverageStatus =
  | 'covered'
  | 'content-missing'
  | 'assessment-missing'
  | 'mapping-review'

interface ValidationResult {
  ok: boolean
  errors: Array<{ code: string; message: string; contentId?: string }>
  warnings: Array<{ code: string; message: string; contentId?: string }>
}

type RequirementCriticality = 'standard' | 'critical'

interface CriticalErrorDefinition {
  errorClassId: string
  definitionVersion: string
  requirementId: string
  severity: 'critical'
  description: string
  triggerRuleId: string
  resolutionRule: {
    minIndependentCorrectEvents: number
    minSpacingHours: number
    practicalRecheckRequired: boolean
  }
}

interface ExamRequirement {
  requirementId: string
  examCode: 'SY0-701'
  sourceRevision: string
  domainId: string
  objectiveId: string
  sourcePath: string[]
  requirementSummary: string
  actionVerb: string
  acronymMeaningIds: string[]
  scenarioRequired: boolean
  criticality: RequirementCriticality
  criticalErrorClassIds: string[]
}

interface ExamRequirementsManifest {
  sourceSnapshotId: string
  manifestVersion: string
  requirements: ExamRequirement[]
  criticalErrorDefinitions: CriticalErrorDefinition[]
}

interface RequirementCoverage {
  requirementId: string
  learningAssetIds: string[]
  assessmentItemIds: string[]
  practicalItemIds: string[]
  qaStatus: CoverageStatus
  reviewer?: string
  reviewedAt?: number
  note?: string
}

interface CoverageReport {
  sourceSnapshotId: string
  requirementCount: number
  coveredCount: number
  byRequirementId: Record<string, RequirementCoverage>
  blockingRequirementIds: string[]
  generatedAt: number
}
```

Abnahme:

- Jeder offizielle Leaf-Pfad ist exakt einmal im Crosswalk vertreten.
- Jeder Leaf-Pfad hat mindestens ein fachlich freigegebenes Lernasset und ein bewertbares Retrieval-Item.
- Größere Bullet-Gruppen der sieben ausdrücklich szenariobasierten Objectives 2.4, 3.2, 4.1, 4.5, 4.6, 4.9 und 5.6 haben zusätzlich eine bewertbare praktische Aufgabe.
- Ein Mengenwert wie „Videos > 0“ darf `covered` nicht erzeugen.
- Jede als `critical` markierte Requirement referenziert mindestens eine existierende versionierte `CriticalErrorDefinition`; jede Response-/Rubrik-Trigger-ID referenziert genau eine solche Klasse, und verwaiste, doppelte oder zyklisch unauflösbare Definitionen blockieren den Content-Gate-Report.

### 5.2 Akronym-Gate

Die vollständige Akronymtabelle des aktuellen offiziellen PDFs wird als versionierter Snapshot erfasst. Erwartet wird Set-Gleichheit normalisierter `(Kürzel, Bedeutung)`-Paare zwischen Quelle und Crosswalk. Dasselbe Kürzel darf mit verschiedenen Bedeutungen mehrfach vorkommen; nur ein identisches normalisiertes Paar oder eine kollidierende stabile ID ist ein unzulässiges Duplikat.

Mehrdeutige Kürzel wie MAC, PAM, RA, RBAC und SAN werden als getrennte Kürzel-Bedeutungs-Paare geführt. Jedes Paar braucht Definition, Kontext, Lernreferenz und mindestens eine Erkennungs- oder Anwendungsfrage. Das 43-Karten-Deck ist kein Vollständigkeitsnachweis.

## 6. Inhalts-QA, Provenienz und Pooltrennung

### 6.1 Pflichtmetadaten je bewertbarem Item

```ts
interface ContentQaRecord {
  contentId: string
  contentVersion: string
  contentFamilyId: string // bleibt über inhaltliche Revisionen desselben Items stabil
  requirementIds: string[]
  objectiveIds: string[]
  publisher: string
  sourceUrl?: string
  origin: 'licensed-training' | 'original-authored'
  referenceSourceIds: string[]
  licenseBasis: string
  retrievedAt?: number
  explanation: string
  distractorRationales?: Record<string, string>
  criticalErrorClassIdsByResponseId?: Record<string, string[]>
  itemType: string
  difficulty: 'easy' | 'medium' | 'hard'
  actionVerb: string
  language: string
  reviewer: string
  authorPersonIds: string[]
  reviewerPersonIds: string[]
  reviewStatus: 'draft' | 'approved' | 'quarantined'
  reviewedAt: number
  noRealExamContentConfirmed: boolean
  originPool: 'course' | 'practice' | 'readiness'
  allowedContexts: Array<'course' | 'review' | 'dailyQuest' | 'lab' | 'drill' | 'readiness'>
}
```

Automatische QA prüft mindestens fehlende Felder, Duplikate/nahe Duplikate, widersprüchliche Lösungen, Antwortpositions-Bias, Parserfehler, ungültige Objective-IDs und Pool-Leakage. Fachliche Richtigkeit, Lizenz und Provenienz benötigen menschliche Freigabe.

Die offizielle Objectives-Datei ist Referenz für Anforderungen, aber kein Ursprung „offizieller“ Übungsfragen. Ein selbst erstelltes Item bleibt `original-authored`, auch wenn es ein offizielles Objective referenziert. Für Source-Snapshot, Hierarchie und Akronym-Crosswalk wird die zulässige Nutzungs-/Redistributionsgrundlage separat dokumentiert. Ohne ausreichende Grundlage werden nur stabile Source-Locators, eigene Zusammenfassungen und nötige Metadaten gespeichert, nicht das vollständige Dokument wörtlich reproduziert.

Die Regeln folgen dem CompTIA Candidate Agreement und der Unauthorized Training Materials FAQ:

- <https://www.comptia.org/en-us/resources/test-policies/comptia-candidate-agreement/>
- <https://www.comptia.org/en-us/resources/test-policies/unauthorized-training-materials-faq/>

Verdächtiges Material wird quarantänisiert, nicht verwendet und nicht weitergegeben. Wird eine mögliche Exposition gegenüber echten, erinnerten oder geleakten Fragen festgestellt, stoppt der betroffene Lern-/Examfluss; der Vorfall wird dokumentiert, nach CompTIA-Anleitung an `examsecurity@comptia.org` gemeldet und als Readiness-Evidenz invalidiert.

### 6.2 Pooltrennung

Vor der ersten Lernnutzung erhält jedes bewertbare Item genau einen Erstexpositionspool:

- `course`: angeleitete Erarbeitung und unmittelbarer Abruf; nach Erstexposition darf `allowedContexts` normale Spaced Reviews erlauben,
- `practice`: Reviews, Daily Quest, Labs und frei zugängliche Drills,
- `readiness`: versiegelte Holdout-Formen; ausschließlich Kontext `readiness` ist zulässig.

Kein Builder darf ein Item mit anderem Status als `approved`, unvollständiger Provenienz/Lizenz, fehlender Sprachauszeichnung oder `noRealExamContentConfirmed = false` aktivieren. Zusätzlich muss der gewünschte Nutzungskontext in `allowedContexts` stehen. Das gilt für Course, Practice und Readiness gleichermaßen.

Readiness-IDs dürfen nie in Video-Recall, Kurskarten, Reviews, Daily Quest, Labs, Vorschauen oder Erklärungsseiten erscheinen. Eine nachträgliche Umbenennung vorhandener zugänglicher Karten in `readiness` macht sie nicht ungesehen: Reviews, aktive/persistierte Sessions, Exam-/Labversuche und bestehende Exposure-Daten werden rückwirkend in ein Ledger übernommen. Wo Legacy-Historie unvollständig ist, gilt das Item als möglicherweise exponiert und ist für Holdouts unzulässig. Am sichersten sind neu erstellte, noch nie ausgelieferte Holdout-Items.

Ein Kandidat darf weder Autor noch Content-Reviewer seiner Holdout-Items/Formen sein; `authorPersonIds`/`reviewerPersonIds` werden beim Form-Lease gegen die Kandidatenidentität geprüft. Diese Identität stammt ausschließlich aus einer verifizierten Auth-Session und einer dauerhaften serverseitigen Zuordnung `issuer + auth subject → personId → profileIds`. Der Request darf keine eigene `personId` setzen. Neue Profile derselben Bindung werden an dieselbe `personId` gebunden; Autoren-/Reviewer-Ausschluss und Expositionshistorie werden immer personenweit abgefragt und können durch Profilneuanlage, Gerätewechsel oder Restore nicht zurückgesetzt werden.

Eine neue selbst erzeugte Auth-Identität darf **nicht** automatisch eine neue qualifizierende Person erzeugen. Sie startet `unverified`; Readiness-Leases verlangen eine signierte `CandidateIdentityAssuranceReceipt` mit `readiness-verified` aus einem stabilen Issuer-Subject oder unabhängiger Prüfung. Recovery bindet neue Auth-Subjects an die bestehende Person. Erkannte/behauptete Doppelidentitäten werden vor weiterer Qualifikation geprüft und bei Merge werden Exposure-, Autor-/Reviewer-, Attempt- und Receipt-Historien monoton vereinigt; ein Split darf nie Holdouts wieder ungesehen machen. Ist Assurance unbestätigt, mehrdeutig, widerrufen, lokal-only oder der Kandidat kann den Verifier selbst administrieren, bleibt `examReady` gesperrt bzw. erfordert einen unabhängigen Assessor. Baseline-Diagnostic und Kalibrierungsaufgaben stammen ausschließlich aus Practice und verbrauchen nie eine Qualifikationsform.

Qualifizierende Holdout-Prompts, Optionen und Lösungsschlüssel liegen nie im Client-Quellcode, PWA-Bundle, normalen Backup oder vorab ausgelieferten Generatorartefakt. Der Client enthält nur Formdeskriptoren/Hashes. Inhalte liegen in einem zugriffsbeschränkten serverseitigen Content-Store und werden erst nach Lease geliefert. Hat der Kandidat administrativen oder Dateizugriff auf diesen privaten Store, gelten die Formen für ihn nicht als ungesehen; für `examReady` ist dann ein unabhängiger externer Content-Verwalter/Assessor nötig. Ein reiner Local-only-Modus kann deshalb höchstens `approaching`, nicht `examReady`, ausgeben.

Eine Form wird erst freigegeben, wenn ein unabhängiger SY0-701-Fachreview, Blueprint-Konformität, Pilot-/Benchmarkdaten, Itemschwierigkeit und — soweit bei der Stichprobe belastbar — Trennschärfe/Reliabilität dokumentiert sind. Formen müssen innerhalb vorab definierter Toleranzen vergleichbar sein; Ausreißeritems werden ersetzt und jede Änderung erzeugt neue Item-, Form-, Blueprint- und Calibration-Versionen. Ohne freigegebenen `calibration-report` zählen Prozentgates nicht für `examReady`.

## 7. Statische Unit-Definition und eingefrorene Ausführung

Definitionen werden aus versionierten Inhaltsmanifesten deterministisch berechnet. Nutzerzustand und konkrete Ausführungen werden gespeichert.

```ts
type LearningUnitType = 'course' | 'review' | 'lab' | 'exam'

interface ExamLaunchDescriptor {
  descriptorId: string
  descriptorVersion: string
  purpose: 'diagnostic' | 'practice' | 'readiness'
  mode: 'drill' | 'full'
  blueprintId: string
  blueprintVersion: string
  sourceSnapshotId: string
  contentManifestVersion: string
  scoringRegistryVersion: string
  languagePolicy:
    | { kind: 'fixed'; language: string }
    | { kind: 'confirmed-exam-language' }
  itemCount: number
  durationSec: number
  eligiblePhaseIds: LearningPhase[]
  earliestStartAt?: number
}

interface LearningUnitDefinition {
  unitId: string
  type: LearningUnitType
  title: string
  objectiveIds: string[]
  requirementIds: string[]
  order: number
  estimatedMinutes?: number
  videoIndex?: number
  labScenarioId?: string
  examLaunch?: ExamLaunchDescriptor
  definitionVersion: string
}

type LearningUnitExecution =
  | {
      executionId: string
      unitId: string
      profileId: string
      evidenceEpoch: number
      type: 'course'
      createdAt: number
      cardIds: string[]
      recallQuestionIds: string[]
      recallQuestionVersions: Record<string, string>
      recallCardIds: string[]
      recallSeed: string
      sourceSnapshotId: string
      contentManifestVersion: string
      contentVersions: Record<string, string>
    }
  | {
      executionId: string
      unitId: string
      profileId: string
      evidenceEpoch: number
      type: 'review'
      createdAt: number
      cardIds: string[]
      reasonByCardId: Record<string, 'due' | 'unresolved-error'>
      sourceSnapshotId: string
      contentManifestVersion: string
      contentVersions: Record<string, string>
    }
  | {
      executionId: string
      unitId: string
      profileId: string
      evidenceEpoch: number
      type: 'lab'
      createdAt: number
      labAttemptId: string
      scenarioVersion: string
    }
  | {
      executionId: string
      unitId: string
      profileId: string
      evidenceEpoch: number
      type: 'exam'
      createdAt: number
      examAttemptId: string
      formVersion: string
    }
```

Stabile Definition-IDs:

- `unit:course:{index3}`
- `unit:review:{objectiveId}`
- `unit:lab:{scenarioId}`
- `unit:exam:{descriptorId}`

Eine Definition setzt nur die zu ihrem Typ gehörende Launchreferenz: Course `videoIndex`, Lab `labScenarioId`, Exam `examLaunch`; fremde Launchfelder sind unzulässig. `ExamLaunchDescriptor` macht Diagnostic, Practice-Drill oder geplanten Holdout-Mock vor dem Attempt startbar, enthält für Readiness aber **nie** Form-ID, Item-IDs, Seed oder Prompt. Beim Start löst Practice den Descriptor in den lokalen Formbuilder auf; Readiness ruft anhand Blueprint/Snapshot/Sprachpolicy den autoritativen Lease auf. Examversuche erhalten UUIDs und referenzieren danach Form sowie Descriptor; eine Review-Definition bleibt stabil, jeder Durchlauf hat aber eine neue `executionId` und einen eigenen Versuch. Daher kann eine später erneut fällige Review trotz früherem Abschluss wieder `reviewDue` sein.

## 8. Per-Video-Zuordnung und Kursablauf

### 8.1 Verbindliche Mapping-Regel

Ein Objective-Deck darf nicht pauschal an jedes Video desselben Objectives gehängt werden. Der Content-Build erzeugt explizit:

```ts
interface VideoContentMapEntry {
  videoIndex: number
  objectiveId: string
  requirementIds: string[]
  courseCardIds: string[]
  recallQuestionIds: string[]
  recallCardIds: string[]
  unmappedReason?: string
}

interface VideoCardIndex {
  cardIdsByVideoIndex: ReadonlyMap<number, readonly string[]>
  unmappedCardIds: readonly string[]
  missingQuestionIds: readonly string[]
  duplicateVideoTitles: readonly string[]
  misplacedCardIds: readonly string[]
}
```

Für bestehende `M#-###`-Karten gilt zunächst der reproduzierbare technische Join: M-ID aus `card.front` → `MESSER_VIDEO_BY_QUESTION_ID` → genau ein normalisierter Katalogtitel → `video.index`. Die heutige Deckposition ist ein QA-Signal, darf die fachlich eindeutige Videozuordnung aber nicht verhindern. Zusätzlich können freigegebene Requirement-/Video-Metadaten weitere Kurskarten zuordnen. Nicht eindeutig zuordenbare Objective-Karten bleiben im Practice-Pool des Objectives; sie werden nicht willkürlich einem Video zugeschlagen. Transkriptfragen besitzen Recall-Frage-IDs, aber niemals `cardId`s.

Vor Phase 1 werden die 31 bekannten Zieldeckabweichungen fachlich entschieden. Der Generator meldet für jedes Item `mapped`, `unmapped`, `wrong-target-deck` oder `duplicate`. `VideoRecallCheck` erhält IDs der Ausführung und darf nicht erneut aus dem gesamten Objective-Deck wählen.

### 8.2 Kursausführung

Standardfolge:

`video → recall → cards → done`

Ein Schritt darf fehlen, wenn der freigegebene Content-Map-Eintrag leer ist; die Coverage-Lücke bleibt trotzdem sichtbar und kann Readiness blockieren. Der Karten-Sample wird beim Start eingefroren und bei Reload nicht neu gezogen. `cardLimit = 0` bedeutet alle aktuell wählbaren Kandidaten, nicht null Karten. Der Karten-Schritt wird ausschließlich durch Reviews der eingefrorenen `cardIds` nach `startedAt` erfüllt; andere Karten desselben Objectives zählen nicht. In derselben Sitzung verwendete Recall-Items sollen nicht direkt noch einmal als Karten erscheinen; eine Ausnahme wegen zu kleinem Pool wird protokolliert und nicht für unabhängige Evidenz doppelt gezählt.

Auch der Recall-Sample wird vor dem Karten-Sample deterministisch eingefroren. `recallCheckSize` verwendet die bestehende normalisierte Spanne 3–15 und wird auf die Kandidatenzahl gekappt. Nur die tatsächlich ausgewählten, auf Karten zurückführbaren `recallCardIds` werden anschließend aus der Kartenwahl ausgeschlossen; Transkriptfragen besitzen keine Card-ID. `VideoRecallCheck` rendert Reihenfolge und IDs der Ausführung und sampelt bei Mount/Reload nie erneut.

`openedAt` und `watchedAt` sind getrennt. Öffnen allein bedeutet nicht angesehen. Verbindliches MVP-Kriterium: `watchedAt` wird ausschließlich durch das Player-`ended`-Event oder den expliziten Befehl „Als angesehen markieren“ gesetzt; ein Seek auf 90 Prozent reicht nicht. Ein späteres kumulatives Watch-Time-Modell wäre eine eigene, getestete Erweiterung. Kursabschluss erfordert alle vorhandenen Schritte, erzeugt aber kein `mastered`.

```ts
interface VideoProgressRecord {
  profileId: string
  evidenceEpoch: number
  videoIndex: number
  objectiveId: string
  openedAt?: number
  watchedAt?: number
  watchedMethod?: 'ended' | 'manual'
  confidence?: 'gaps' | 'ok' | 'solid'
  confidenceAt?: number
  legacyHint?: { watched?: boolean; confidence?: string }
  updatedAt: number
}

interface VideoRecallRun {
  runId: string
  profileId: string
  evidenceEpoch: number
  videoIndex: number
  executionId: string | null // null nur bei Legacy-/freien Historienläufen
  sourceSnapshotId: string
  contentManifestVersion: string
  questionIds: string[]
  questionVersionById: Record<string, string>
  correct: number
  total: number
  verdict: 'understood' | 'almost' | 'review'
  completedAt: number
}
```

Ein neuer Course-Recall-Run verlangt die aktive `executionId` und kopiert Snapshot, Manifest, exakt eingefrorene `recallQuestionIds` sowie deren Versionen aus dieser Ausführung. `computeCourseStepState.recallDone` akzeptiert nur einen vollständigen Run desselben Profils/Videos **und derselben Execution**, dessen `completedAt >= execution.createdAt` ist und dessen Question-ID-/Versionsmenge exakt der Ausführung entspricht. Freie oder migrierte Runs mit `executionId = null`, frühere Runs desselben Videos und Runs anderer Contentversionen bleiben Historie, erfüllen aber keinen Schritt einer neuen Unit.

Video-Recall ist bewusst **formative Aktivität, keine Mastery-Evidenz**: `VideoRecallRun.correct/total` darf Schrittstatus und Empfehlung beeinflussen, erzeugt aber weder Assessment-Proposal noch Accepted Event, Punktegate oder unabhängige Sitzung. Dadurch benötigt der Run keine per-Item Rohantworten; belastbare Retrieval-Evidenz kommt aus objektiv gescorten Karten-/Assessment-Sessions, Labs und Exams. Eine spätere Aufwertung wäre eine eigene versionierte Phase mit per-Item Antworten und Server-Scoring.

Eine gestartete Unit überlebt den Lerntageswechsel unverändert. `activeStartedAt`, Ausführungs-IDs und eingefrorene Inhalte werden **nicht** auf `todayStartMs` angehoben. Das ist als beabsichtigte Korrektur gegen die derzeitige `max(activeStartedAt, todayStartMs)`-Semantik zu testen.

## 9. Getrennte Status-, Evidenz- und Reifemodelle

```ts
type ActivityStatus = 'notStarted' | 'inProgress' | 'completed'
type ObjectiveEvidenceStatus = 'insufficientEvidence' | 'learning' | 'mastered'
type ReadinessStatus = 'notReady' | 'approaching' | 'examReady'

interface ProfileLearningState {
  profileId: string
  evidenceEpoch: number
  revision: number
  lastResetEventId?: string
  pendingResetRequestId?: string
  serverWatermark?: string
  updatedAt: number
}

interface LearningUnitState {
  profileId: string
  evidenceEpoch: number
  unitId: string
  activityStatus: ActivityStatus
  currentStep: 'video' | 'recall' | 'cards' | 'lab' | 'exam' | 'done'
  activeExecutionId?: string
  startedAt?: number
  completedAt?: number
  lastCompletedAt?: number
  lastActivityAt: number
  updatedAt: number
}
```

`reviewDue` ist eine Empfehlungseigenschaft, kein ActivityStatus. `passed` wird nicht als einheitlicher Unit-Status benutzt, weil Kurs-, Lab- und Examleistungen unterschiedliche Rubriken haben.

Freies Vorziehen erlaubt mehrere `inProgress`-States. Die große Kachel wählt deterministisch die Unit mit dem neuesten `lastActivityAt`, bei Gleichstand die lexikografisch kleinste `unitId`. Alle anderen bleiben fortsetzbar und ihre eingefrorenen Karten reserviert.

### 9.1 Interne Mastery-Startwerte

Diese Schwellen sind konfigurierbare konservative Startwerte, müssen mit einem fachlich validierten Pool kalibriert werden und sind **keine** offizielle Score-Umrechnung.

Objective `mastered` nur wenn alle Bedingungen gelten:

- 100 Prozent freigegebene Leaf-Coverage,
- mindestens 8 unterschiedliche versionierte Retrieval-Items innerhalb der letzten 21 Tage,
- verteilt auf mindestens zwei Sitzungen mit mindestens 24 Stunden Abstand,
- mindestens 80 Prozent Punkte in diesem 21-Tage-Fenster,
- kein ungelöster kritischer Fehlertyp in den letzten zwei Abrufen,
- bei Szenariozielen mindestens eine praktische Leistung von 80 Prozent.

Reicht der freigegebene Pool nicht für acht unterschiedliche Evidenzpunkte, lautet der Status `insufficientEvidence`; die Schwelle wird nicht still abgesenkt.

Domain `ready` nur wenn jedes Objective Evidenz besitzt, die Domain mindestens 80 Prozent erreicht, kein Objective unter 70 Prozent liegt und kein kritischer Leaf-Pfad ungetestet ist.

„Kritisch“ ist kein UI-Bauchgefühl: Der freigegebene Crosswalk setzt `ExamRequirement.criticality`, und versionierte `CriticalErrorDefinition`-Einträge beschreiben Trigger und Auflösung. Nur der kanonische Server-Scorer darf aus Antwort-/Rubrikregeln `triggeredCriticalErrorClassIds` erzeugen. Eine Klasse bleibt ungelöst, bis ihre definierte Zahl unabhängig korrekter, zeitlich getrennter Events und gegebenenfalls ein Praxis-Recheck erfüllt sind. Domain-/Objective-Aggregation leitet kritische ungetestete Leaves und `unresolvedCriticalErrorClassIds` ausschließlich aus diesen versionierten Definitionen und akzeptierten Events ab.

Gesamt `examReady` nur wenn:

- Leaf- und Akronym-Coverage vollständig freigegeben sind,
- alle 28 Objectives `mastered`, alle fünf Domains `ready` und kein Status `insufficientEvidence` ist,
- jedes offizielle Akronym-Bedeutungspaar geprüft wurde, die aktuelle Akronymleistung mindestens 80 Prozent beträgt und kein ungelöster Fehler bei mehrdeutigen Paaren besteht,
- keine kritische Inhalts-, Provenienz- oder Mappinglücke besteht,
- zwei untereinander disjunkte, zuvor ungesehene 90-Minuten-Holdout-Mocks an verschiedenen Tagen absolviert wurden,
- jeder Mock einzeln mindestens 85 Prozent erreicht,
- in jedem Mock keine Domain unter 75 Prozent liegt,
- in jedem Mock die PBQ-Items mindestens 80 Prozent Punkte erreichen,
- das getrennte Lab-/Praxisgate mindestens 80 Prozent erreicht,
- in jedem Mock die Zeit eingehalten wurde und kein Item unbeantwortet blieb,
- Exam-Code, Termin, Buchbarkeit und gebuchte Sprache aktuell bestätigt sind,
- beide Holdout-Mocks in der gebuchten Prüfungssprache durchgeführt wurden.

## 10. Vollständige Antwortstatistik und Fehlerauflösung

Eine Wrong-only-Query kann keine Fehlerquote berechnen. Die heutige `ReviewRecord`-Struktur besitzt außerdem weder Profil-, Sitzungs- noch Contentversionskontext. Phase 2 führt deshalb ein unveränderliches, UUID-basiertes Evidenzledger ein:

```ts
type AssessmentContext =
  | 'course'
  | 'review'
  | 'lab'
  | 'exam'
  | 'diagnostic'
  | 'dailyQuest'
  | 'freeStudy'
  | 'legacy'

interface AssessmentEventProposal {
  proposalId: string
  kind: 'answer-proposal'
  profileId: string
  evidenceEpoch: number
  sessionId: string
  executionId?: string
  context: 'course' | 'review' | 'dailyQuest' | 'freeStudy'
  itemId: string
  itemVersion: string
  sourceSnapshotId: string
  contentManifestVersion: string
  rawResponse: unknown
  clientOccurredAt: number
  timeMs: number
  sessionTimeReceiptId?: string
  sourceReviewOperationId?: string // bei context='review' Pflicht
}

interface AssessmentReversalRequest {
  requestId: string
  kind: 'reversal-request'
  profileId: string
  evidenceEpoch: number
  sourceProposalId: string
  sourceReviewOperationId: string
  reviewUndoOperationId: string
  undoTokenHash: string
  requestedAt: number
}

interface LegacyAssessmentHint {
  hintId: string
  profileId: string
  itemId: string
  inferredCorrect: boolean
  importedAt: number
  source: 'legacy-review'
}

interface AssessmentSessionTimeReceipt {
  receiptId: string
  profileId: string
  evidenceEpoch: number
  sessionId: string
  executionId?: string
  context: 'course' | 'review' | 'dailyQuest' | 'freeStudy'
  deviceId: string
  sourceSnapshotId: string
  contentManifestVersion: string
  serverStartedAt: number
  expiresAt: number
  signature: SignatureMetadata
}

interface AcceptedAssessmentEvent {
  eventId: string
  kind: 'accepted-answer'
  sourceProposalId?: string
  profileId: string
  evidenceEpoch: number
  sessionId: string
  executionId?: string
  sourceAttemptId?: string
  context: AssessmentContext
  itemId: string
  itemVersion: string
  sourceSnapshotId: string
  contentManifestVersion: string
  cardId?: string
  objectiveIds: string[]
  requirementIds: string[]
  acronymMeaningIds: string[]
  language: string
  clientOccurredAt?: number
  evidenceOccurredAt: number
  serverAcceptedAt: number
  timestampBasis: 'signed-session' | 'server-accepted' | 'server-attempt'
  spacingEligible: boolean
  scoringMode: 'objective' | 'rubric' | 'self-rated' | 'legacy'
  rawResponseHash?: string
  response: 'correct' | 'wrong' | 'partial' | 'unanswered'
  earnedPoints: number
  possiblePoints: number
  timeMs: number
  eligibleForMastery: boolean
  triggeredCriticalErrorClassIds: string[]
  resolvedCriticalErrorClassIds: string[]
  acceptanceReceiptId: string
  serverSequence: string
}

interface AssessmentEventReversal {
  eventId: string
  kind: 'reversal'
  sourceRequestId: string
  profileId: string
  evidenceEpoch: number
  reversesEventId: string
  sessionId: string
  serverAcceptedAt: number
  acceptanceReceiptId: string
  serverSequence: string
}

interface AssessmentAttemptQualification {
  eventId: string
  kind: 'attempt-qualification'
  profileId: string
  evidenceEpoch: number
  sourceAttemptId: string
  qualifiesEventIds: string[]
  serverReceiptId: string
  occurredAt: number
  serverSequence: string
}

interface AssessmentAttemptInvalidation {
  eventId: string
  kind: 'attempt-invalidation'
  profileId: string
  evidenceEpoch: number
  sourceAttemptId: string
  reason: 'clock-anomaly' | 'lease-invalid' | 'content-invalidated' | 'audit-failed' | 'manual-review'
  serverReceiptId: string
  occurredAt: number
  serverSequence: string
}

interface AssessmentProfileReset {
  eventId: string
  kind: 'profile-reset'
  sourceRequestId: string
  profileId: string
  previousEvidenceEpoch: number
  newEvidenceEpoch: number
  requestedAt: number
  acceptedAt: number
  effectiveResetAt: number
  schedulerReset: { timestamp: number; due: number; dueAt: number }
  serverReceiptId: string
  serverSequence: string
}

interface ProfileResetRequest {
  requestId: string
  kind: 'profile-reset-request'
  profileId: string
  previousEvidenceEpoch: number
  requestedEvidenceEpoch: number
  expectedProfileRevision: number
  requestedAt: number
  schedulerReset: {
    timestamp: number
    due: number
    dueAt: number
  }
}

type AssessmentLedgerEntry =
  | AcceptedAssessmentEvent
  | AssessmentEventReversal
  | AssessmentAttemptQualification
  | AssessmentAttemptInvalidation
  | AssessmentProfileReset

interface AssessmentAcceptanceReceipt {
  receiptId: string
  profileId: string
  evidenceEpoch: number
  proposalIds: string[]
  acceptedEventIds: string[]
  rejectedProposalIds: string[]
  outcomeByProposalId: Record<string, {
    outcome: 'accepted' | 'rejected' | 'cancelled-before-acceptance'
    eventId?: string
    reasonCode?: string
  }>
  serverAcceptedAt: number
  firstServerSequence: string
  lastServerSequence: string
  signature: SignatureMetadata
}

interface AssessmentReversalReceipt {
  receiptId: string
  profileId: string
  evidenceEpoch: number
  sourceRequestId: string
  sourceProposalId: string
  reversalEventId?: string
  outcome: 'proposal-cancelled' | 'accepted-event-reversed' | 'already-resolved'
  serverAcceptedAt: number
  signature: SignatureMetadata
}

interface AssessmentQualificationReceipt {
  receiptId: string
  profileId: string
  evidenceEpoch: number
  sourceAttemptId: string
  attemptKind: 'lab' | 'diagnostic' | 'practice-exam'
  sourceSnapshotId: string
  contentManifestVersion: string
  attemptContentHash: string
  assessmentEventIds: string[]
  earnedPoints: number
  possiblePoints: number
  qualifiesForMastery: boolean
  nonQualificationReasons: string[]
  issuedAt: number
  signature: SignatureMetadata
}

interface AssessmentInvalidationReceipt {
  receiptId: string
  profileId: string
  evidenceEpoch: number
  sourceAttemptId: string
  invalidationEventId: string
  reason: AssessmentAttemptInvalidation['reason']
  issuedAt: number
  signature: SignatureMetadata
}

interface ProfileResetReceipt {
  receiptId: string
  profileId: string
  sourceRequestId: string
  resetEventId: string
  previousEvidenceEpoch: number
  newEvidenceEpoch: number
  effectiveResetAt: number
  schedulerReset: { timestamp: number; due: number; dueAt: number }
  profileRevision: number
  serverWatermark: string
  issuedAt: number
  signature: SignatureMetadata
}

interface AnswerStats {
  scopeId: string
  scopeType: 'item' | 'objective' | 'domain' | 'acronym'
  scored: number
  correct: number
  wrong: number
  partial: number
  unanswered: number
  earnedPoints: number
  possiblePoints: number
  uniqueItemCount: number
  independentSessionCount: number
  exposureCount: number
  totalTimeMs: number
  firstAnsweredAt?: number
  lastAnsweredAt?: number
  lastAnswerCorrect?: boolean
  unresolvedErrorItemIds: string[]
  resolvedAtByItemId: Record<string, number>
}

async function listAnswerStats(input: {
  profileId: string
  groupBy: 'item' | 'objective' | 'domain' | 'acronym'
  itemIds?: string[]
  objectiveIds?: string[]
  sinceMs?: number
  untilMs?: number
  contexts?: AssessmentContext[]
  masteryEligibleOnly: boolean
}): Promise<AnswerStats[]>
```

Normale Kartenbewertung erhält einen additiven Assessment-Kontext. Ein Wrapper schreibt `ReviewRecord`, `AssessmentEventProposal` und profilgebundene Outbox-Operation in derselben Dexie-Transaktion, ohne die Schedulerformel zu ändern. Ein Proposal ist **keine** Ledger-/Mastery-Evidenz und darf Response, Punkte, Mappings, Zeit oder Eligibility nicht festlegen. Der Server prüft Auth-Owner/Epoch, lädt Item/Scorer/Mappings/QA aus dem freigegebenen kanonischen Manifest, bewertet `rawResponse`, setzt Sprache/Objectives/Requirements/Akronyme/Punkte/Critical-Error-Klassen selbst und erzeugt erst dann `AcceptedAssessmentEvent` plus signierten `AssessmentAcceptanceReceipt`. Abweichende Clientclaims, unbekannte Versionen und self-rated/non-autoscorable Karten werden abgewiesen bzw. bleiben `eligibleForMastery = false`.

Für unabhängige zeitliche Evidenz startet ein Online-Assessment über `POST /v1/assessment-sessions` eine kurzlebige signierte `AssessmentSessionTimeReceipt`. Der Server bindet sie an Auth-Owner, aktuelle Epoch, Gerät, Kontext, Execution, Snapshot und Manifest; ein idempotenter Resume liefert bis zum ursprünglichen Ablauf denselben Receipt und verlängert das Fenster nie. Ein Proposal ist nur dann `timestampBasis = 'signed-session'` und `spacingEligible = true`, wenn es den Receipt referenziert, alle Claims exakt passen **und der Server es innerhalb dieses Fensters entgegennimmt**. Der bloße Besitz eines Receipts oder ein frei gesetztes `clientOccurredAt` attestiert keine Antwortzeit. Offline bzw. verspätet eingehende Proposals dürfen nach Sync korrekt gescort und für Lernfeedback genutzt werden, erhalten aber `timestampBasis = 'server-accepted'`, zählen nicht als zeitlich unabhängige Sitzung und können das 24-Stunden-Gate nicht erfüllen. Aktive Session-Receipts werden nicht per Backup auf ein anderes Gerät übertragbar gemacht. Lab-/Exam-/Diagnostic-Submit sendet den eingefrorenen Attempt/Antwortstand, nicht frei gebaute Answer-Events; der Server erzeugt die Accepted Events. So bleiben Teilpunkte und unbeantwortete Items profil- und versionsfest auswertbar, ohne Clientvertrauen.

Ein Fehler ist aufgelöst, wenn dasselbe `itemId + itemVersion` in einer späteren, anderen bewertbaren Sitzung korrekt gelöst wurde. Sofortige Wiederholung in derselben `sessionId` zählt nicht als unabhängige Mastery-Evidenz. `scored = correct + wrong + partial + unanswered`; unbeantwortete Items erhalten `earnedPoints = 0` bei unverändertem `possiblePoints` und senken damit den Score. Primäre Leistungsmetrik ist `sum(earnedPoints) / sum(possiblePoints)`; eine diskrete Fehlerquote lautet `(wrong + unanswered) / scored` und wird nicht mit dem Punktscore verwechselt.

Mastery verwendet nur serverakzeptierte `eligibleForMastery`-Events, deren Source-Snapshot, Content-Manifest, Itemversion und Evidence-Epoch noch zum aktuell freigegebenen Crosswalk passen. `independentSessionCount` verwendet ausschließlich `spacingEligible` und servergebundene Zeiten. Eine relevante Inhaltsänderung invalidiert alte Evidenz gezielt und verlangt neue Retrieval-Evidenz; sie wird nicht still unter derselben Version weitergeführt.

Die bestehende Scheduler-Undo-Funktion darf keine Evidenz zurücklassen und ist der **einzige** Clientpfad zu einer Reversal-Anfrage. Schon die ursprüngliche Review-Operation bindet `sourceReviewOperationId` und `undoTokenHash`; die atomare Undo-Transaktion schreibt die dazugehörige `review.undo`-Operation und einen `AssessmentReversalRequest` mit exakt denselben Owner-/Session-/Item-/Proposal-Claims. Der Server akzeptiert keine frei benannte Event-ID, keine Reversal-Anfrage für Lab-/Examereignisse und keinen Request ohne eine serverbekannte, noch genau einmal nutzbare Review-Undo-Kette.

Reversal und Proposal dürfen in beliebiger Netzreihenfolge eintreffen: kommt das Undo zuerst, speichert der Server eine eindeutige Cancellation-Tombstone auf `sourceProposalId` und weist das spätere Proposal als `cancelled-before-acceptance` ab; kommt die Acceptance zuerst, entsteht genau ein append-only `AssessmentEventReversal`. Beides liefert einen signierten `AssessmentReversalReceipt` und ergibt dieselbe Aggregation ohne Evidenz. Wiederholung mit gleicher Request-ID und gleichem Hash ist idempotent, ein zweites oder abweichendes Undo ist ein Konflikt. Bis zur Bestätigung zeigt die UI `pending`; nur serverakzeptierte Reversals bzw. Cancellation-Outcomes beeinflussen das Ledger.

Lab-, Diagnostic- und Exam-Submit erzeugt serverseitig Accepted Events, die bis zur autoritativen Prüfung von Lease, Contentversion, Timer und Attempt-Vollständigkeit nicht masteryfähig sind. Erst `AssessmentAttemptQualification` referenziert sie wirksam. Eine spätere Clock-/Lease-/Content-/Audit-Invalidierung schreibt append-only `AssessmentAttemptInvalidation` und entfernt den gesamten Versuch aus jeder Evidenzaggregation, ohne den unveränderlichen Attempt umzuschreiben. Qualifikation/Invalidierung und Server-Receipt werden lokal atomar aus dem autoritativen Pull angewendet.

Beim Upgrade werden heute lokal sichtbare historische Reviews ausschließlich dem Legacy-Ownerprofil als `LegacyAssessmentHint` zugeordnet. `answerCorrect` hat Vorrang, sonst gilt als markierter Fallback `rating >= 3`. Weil Profilherkunft, Sitzung und Contentversion nicht sicher rekonstruierbar sind, werden sie **nicht** als Accepted Events ausgegeben; sie dürfen Empfehlungen informieren, aber nie Mastery oder Holdout-Reife beweisen. Neue Mastery-Queries lesen nur das profilbezogene autoritative Ledger statt den wechselnden aktiven Review-Snapshot.

Das Leistungsfenster ist pro Metrik konfiguriert; Domain-Startwert 30 Tage, Objective-Mastery 21 Tage. Weniger als zehn bewertete Domainantworten liefern keinen belastbaren Domainbefund. Statistiken enthalten Stichprobengröße, Aktualität, unabhängige Sitzungen und Exposition; kleine Stichproben führen zu `insufficientEvidence`.

## 11. Review-Modell und Scheduling-Grenze

Die App unterstützt FSRS und SM-2. Der im Profil gewählte Scheduler bleibt die einzige Quelle der Kartenfälligkeit. Die Eligibility-Logik wird aus `studyCardOrdering` als pure, wiederverwendete Funktion extrahiert; der Plan behauptet keine bereits vorhandene Due-Query in `db/queries/cards.ts`.

Für Objective-Pools ist eine direkte Deckquery erforderlich. Die rekursive `listDeckCards`-Semantik darf für direkte Root-Deck-/Form-Pools nicht unbemerkt Unterdecks einbeziehen.

Eine Review-Ausführung enthält:

- heute fällige/überfällige Karten laut ausgewähltem Scheduler,
- optional Karten mit ungelöstem Fehler als **Corrective Retest**.

Corrective Retests sind ein Assessment-Overlay, nicht eine Terminänderung. Sie benötigen einen konfigurierten Mindestabstand; Startwert 24 Stunden nach dem Fehler. Sie schreiben bei Bearbeitung normale Reviews und beeinflussen danach wie jede Study-Session den Scheduler.

Die maximale Kartenzahl ist konfigurierbar; Startwert 15. Die Review-Tageskappe wird über einen profilbezogenen `ReviewUnitAttempt` und den durch `nextDayStartsAt` definierten Lerntag erzwungen. „Maximal eine Empfehlung“ bedeutet nicht, dass der Nutzer keine weitere Review manuell starten darf.

```ts
interface ReviewUnitAttemptRecord {
  attemptId: string
  profileId: string
  evidenceEpoch: number
  unitId: string
  executionId: string
  localLearningDay: string
  cycleStartedAt: number
  sourceEvaluatedAt: number
  activeCardIds: string[]
  carryoverCardIds: string[]
  status: 'inProgress' | 'completed' | 'abandoned'
  completedAt: number | null
  abandonedAt?: number
  updatedAt: number
}
```

Beim Start werden zuerst **alle aktuell fälligen Karten einschließlich alten Überhangs**, dann ausreichend alte ungelöste Fehler dedupliziert und gegen Reservierungen geprüft. Die ersten Karten bis zur Kappe werden eingefroren, der Rest bleibt in `carryoverCardIds`. Der Zyklus ist abgeschlossen, wenn jede aktive Karte nach `cycleStartedAt` bewertet wurde. Aktuell fälliger Rest, Carryover oder ein ungelöster Fehler setzt dieselbe stabile Definition wieder auf `reviewDue`, unabhängig davon, ob die Ursache vor oder nach dem letzten `completedAt` entstand. Ein Abbruch markiert den Attempt `abandoned`, löst seine aktive Execution/Reservierung und lässt nicht erledigte Karten als normale Due-/Fehlerkandidaten bestehen. Begin/Get/Complete/Abandon schreiben Attempt, Execution und Unit-State jeweils atomar.

## 12. Phasenabhängige Empfehlung und Pacing

```ts
type LearningPhase = 'foundation' | 'deepening' | 'exam' | 'final' | 'pastExam'

interface LearnerExamPlanBase {
  profileId: string
  examCode: 'SY0-701'
  planVersion: string
  examDateIso: string | null
  uiLanguage: string
  baselineDiagnosticAttemptId?: string
  updatedAt: number
}

interface DraftLearnerExamPlan extends LearnerExamPlanBase {
  status: 'draft'
  examLanguage?: string
  weeklyMinutesAvailable?: number
  learningDaysPerWeek?: number
  bufferDays?: number
  sourceSnapshotId?: string
}

interface ConfirmedLearnerExamPlan extends LearnerExamPlanBase {
  status: 'confirmed'
  candidatePersonId: string // read-only, serverseitig aus der verifizierten Identität
  candidateIdentityBindingId: string
  candidateIdentityAssuranceReceiptId: string
  examDateIso: string
  examLanguage: string
  weeklyMinutesAvailable: number
  learningDaysPerWeek: number
  bufferDays: number
  sourceSnapshotId: string
  confirmedAt: number
}

type LearnerExamPlan = DraftLearnerExamPlan | ConfirmedLearnerExamPlan

interface CandidateIdentityBinding {
  bindingId: string
  personId: string
  authSubjects: Array<{ issuer: string; subjectHash: string; boundAt: number }> // serverseitig
  profileIds: string[]
  assuranceLevel: 'unverified' | 'account-verified' | 'readiness-verified'
  verificationMethod?: 'stable-idp-subject' | 'independent-admin' | 'external-assessor'
  assuranceReceiptId?: string
  mergedFromPersonIds: string[]
  boundAt: number
  lastVerifiedAt: number
  status: 'active' | 'revoked'
}

interface CandidateIdentityAssuranceReceipt {
  receiptId: string
  bindingId: string
  personId: string
  issuer: string
  subjectHash: string
  assuranceLevel: 'readiness-verified'
  verificationMethod: 'stable-idp-subject' | 'independent-admin' | 'external-assessor'
  verifiedAt: number
  signature: SignatureMetadata
}

interface ExamLifecycleConfirmation {
  confirmationId: string
  confirmationVersion: string
  profileId: string
  candidatePersonId: string
  candidateIdentityBindingId: string
  candidateIdentityAssuranceReceiptId: string
  learnerPlanVersion: string
  examCode: 'SY0-701'
  examDateIso: string
  examLanguage: string
  sourceSnapshotId: string
  lifecycleStatus: 'bookable' | 'not-bookable' | 'unknown'
  bookabilityVerifiedAt: number
  bookabilitySourceUrl: string
  bookabilitySourceHash: string
  bookingAttestationId?: string
  bookingAttestedByUser: boolean
  bookingAttestedAt?: number
  signature: SignatureMetadata
}

interface ExamTimeline {
  daysLeft: number | null // signiert; 0 am lokalen Prüfungstag, negativ danach
  examDateIso: string | null
  lifecycleConfirmation?: ExamLifecycleConfirmation
}

interface LearningPacingResult {
  requiredMinutes: number
  availableMinutesAfterBuffer: number
  requiredMinutesPerLearningDay: number | null
  feasible: boolean
  missingEstimateUnitIds: string[]
  reason: 'on-track' | 'capacity-shortfall' | 'missing-plan' | 'missing-estimates' | 'past-exam'
}

type LearningUnitReason =
  | 'active_execution'
  | 'scheduler_due'
  | 'unresolved_error_retest'
  | 'next_course_in_sequence'
  | 'objective_practice_gap'
  | 'lab_retry'
  | 'weak_domain'
  | 'exam_practice'
  | 'scheduled_holdout_mock'
  | 'readiness_no_go'

interface RankedLearningUnit {
  definition: LearningUnitDefinition
  rank: number
  reason: LearningUnitReason
  recommended: boolean
  blocked: boolean
}
```

`computeExamTimeline` benutzt lokale Kalendertage und gibt am Prüfungstag `0`, nicht `null`, zurück. `resolveLearningPhase` hat diese Präzedenz:

1. `daysLeft < 0` → `pastExam`
2. `daysLeft <= 3` → `final`
3. `daysLeft <= 10` → `exam`
4. `daysLeft <= 21` oder Kursfortschritt mindestens 60 Prozent → `deepening`
5. sonst `foundation`

Ohne Termin wird aus Kursfortschritt, Coverage und Evidenz abgeleitet; eine `examReady`-Behauptung ist ohne bestätigten Termin/Lifecycle trotzdem gesperrt.

Nur ein `confirmed`-Plan darf Pacing oder Readiness speisen. Practice-/Diagnostic-Formen sind die ausdrückliche Ausnahme: Sie benötigen Profil, aktuellen Snapshot/Manifest und eine angebotene Übungssprache, aber noch keine Buchung, keinen Termin und keine Lifecycle-Bestätigung. Ein Draft kann ein migriertes Datum und die Baseline-Attempt-ID anzeigen, bis die verifizierte serverseitige Kandidatenbindung, Prüfungssprache, aktueller Snapshot, Wochenminuten, Lerntage pro Woche und Puffertage bestätigt sind. `candidatePersonId` ist kein editierbares Formularfeld und wird nie aus einem Request-Body vertraut; der Server schreibt es zusammen mit `candidateIdentityBindingId` aus der authentifizierten Identität in den bestätigten Plan. Ab v22 ist `learnerExamPlans` die einzige Schreibquelle für den Prüfungstermin; `SettingsContext.examDateIso` wird höchstens als profilbezogene abgeleitete Kompatibilitätsansicht gelesen und nicht mehr separat geschrieben.

Pacing vergleicht die konservativ geschätzte Restarbeit für Kurs, fällige Reviews, Pflichtlabs und zwei Mocks mit der bis zum Termin verfügbaren Lernzeit abzüglich Puffertagen. Solange echte Videozeiten fehlen, werden dokumentierte Fallback-Dauern verwendet; Phase 6 ersetzt sie durch Manifestwerte. Baseline und Pacing werden mindestens wöchentlich sowie nach jedem Full Mock neu berechnet. Ein Practice-Diagnostic ist kein versiegelter Holdout und zählt nicht als Readiness-Mock.

```ts
function computeLearningPacing(input: {
  plan: ConfirmedLearnerExamPlan
  timeline: ExamTimeline
  remainingRequiredUnitIds: string[]
  estimatedMinutesByUnitId: ReadonlyMap<string, number>
  requiredHoldoutMocksRemaining: number
  requiredRemediationMinutes: number
}): LearningPacingResult
```

Jede Pflichtunit benötigt entweder echte oder explizite konservative Fallback-Dauer. Fehlende Schätzungen ergeben `missing-estimates`, nicht „on track“. `feasible = false` erzeugt No-Go/Terminverschiebung; die UI zeigt die verwendeten Annahmen.

```ts
function rankLearningUnits(input: {
  definitions: LearningUnitDefinition[]
  stateByUnitId: ReadonlyMap<string, LearningUnitState>
  phase: LearningPhase
  localLearningDay: string
  reviewCompletedToday: boolean
  objectiveEvidence: ReadonlyMap<string, ObjectiveEvidenceStatus>
  readiness: ReadinessStatus
  daysLeft: number | null
  pacing: LearningPacingResult
}): RankedLearningUnit[]
```

Prioritäten:

- immer zuerst eine bereits aktive Ausführung,
- `foundation`: höchstens eine fällige Review-Empfehlung, dann nächste Kurseinheit,
- `deepening`: ungelöste Schwächen, fällige Reviews und passende Labs vor weiterem Vorziehen,
- `exam`: versiegelte Drills/Vollsimulationen und gezielte Remediation; keine automatische Empfehlung neuer Course-Units,
- `final`: nur kurze, bekannte Schwächen, kurze Prüfungsübungen, Logistik und Readiness-Check; keine automatische Course- oder große Lab-Empfehlung,
- `pastExam`: Termin aktualisieren; keine scheinbar aktuelle Pacing-Empfehlung.

Bei unrealistischem Resttempo oder nicht erfüllten Gates zeigt die App eine klare No-Go-/Terminverschiebungsempfehlung. Domaingewicht ist ein Faktor, aber Schwächenranking berücksichtigt zusätzlich Stichprobe, Aktualität, Coverage und Exposition; `Fehlerquote × Domaingewicht` allein reicht nicht.

Course-Units und große Labs bleiben in der Vollliste manuell zugänglich. Kritische unbehandelte Inhalte werden in `exam`/`final` nicht versteckt, sondern lösen den No-Go-/Terminverschiebungshinweis aus.

## 13. Labs und PBQ-nahe Praxis

CompTIA beschreibt PBQs als Aufgaben in simulierten oder virtuellen Umgebungen: <https://www.comptia.org/en-us/blog/what-is-a-performance-based-question/>. Die App trainiert ähnliche Kompetenzen, behauptet aber keine identische echte Prüfungsoberfläche.

### 13.1 Inventar und Mapping

Das PBQ-Inventar wird mit dem tatsächlichen Kartenvarianten-/Textparser (`cardVariant.ts` und zugehöriger Parser), nicht mit der reinen Scoring-Hilfe `pbqScoring.ts`, erzeugt. Ausgangswert sind 23 parsererkannte Karten: 9 interaktive Übungen, 7 echte Acronym-Deck-PBQs und 7 Objective-PBQs.

Jedes Szenario erhält:

- stabile `scenarioId` und `scenarioVersion`,
- normalisierte `objectiveIds` und `requirementIds`,
- stabile Schritt-IDs,
- Ausgangszustand und zulässige Aktionen,
- Bewertungsrubrik mit Teilpunkten,
- Schwierigkeit, erwartete Dauer und Content-QA,
- verspätetes Feedback nach Abgabe.

Pflichtkompetenzen: Logs/Datenquellen/gegebenenfalls PCAP, Firewall-/ACL-/Konfigurationsregeln, IAM, Härtung sowie Incident Response und Untersuchung. Matching/Ordering allein erfüllt dieses Gate nicht.

### 13.2 Labversuch

```ts
type LabStepSnapshot =
  | { stepId: string; kind: 'matching'; prompt: string; left: Array<{ id: string; text: string }>; right: Array<{ id: string; text: string }> }
  | { stepId: string; kind: 'ordering'; prompt: string; items: Array<{ id: string; text: string }> }
  | { stepId: string; kind: 'decision'; prompt: string; selectionMode: 'single' | 'multiple'; maxSelections: number; options: Array<{ id: string; text: string }> }

type LabStateValue = string | number | boolean | string[]

interface LabAssetSnapshot {
  assetId: string
  kind: 'log' | 'config' | 'pcap-summary' | 'diagram' | 'text'
  title: string
  accessibleLabel: string
  inlineContent?: string
  localAssetId?: string
  assetHash: string
}

interface LabActionSnapshot {
  actionId: string
  stepId: string
  kind: 'inspect' | 'select' | 'match' | 'order' | 'edit-rule' | 'submit-command'
  label: string
  targetId?: string
  constraints: Record<string, LabStateValue>
}

interface LabRubricCriterionBase {
  criterionId: string
  stepId: string
  feedback: {
    success: string
    partial: string
    failure: string
  }
  remediationRequirementIds: string[]
  criticalErrorClassIdsOnFailure: string[]
}

type LabRubricCriterionSnapshot =
  | (LabRubricCriterionBase & {
      comparison: 'pairs-equal'
      expectedRightIdByLeftId: Record<string, string>
      pointsByLeftId: Record<string, number>
    })
  | (LabRubricCriterionBase & {
      comparison: 'order-equal'
      expectedOrder: string[]
      partialCreditRule: 'exact-position' | 'relative-order'
      points: number
    })
  | (LabRubricCriterionBase & {
      comparison: 'set-equal'
      expectedIds: string[]
      pointsByExpectedId: Record<string, number>
      incorrectSelectionPenalty: number
      minimumPoints: 0
    })

interface LabScenarioSnapshot {
  scenarioId: string
  scenarioVersion: string
  sourceSnapshotId: string
  contentManifestVersion: string
  language: string
  title: string
  narrative: string
  initialState: Record<string, LabStateValue>
  assets: LabAssetSnapshot[]
  allowedActions: LabActionSnapshot[]
  difficulty: 'easy' | 'medium' | 'hard'
  expectedDurationSec: number
  qa: {
    contentId: string
    contentVersion: string
    contentFamilyId: string
    reviewerPersonIds: string[]
    reviewedAt: number
    reviewStatus: 'approved'
  }
  objectiveIds: string[]
  requirementIds: string[]
  steps: LabStepSnapshot[]
  rubric: LabRubricCriterionSnapshot[]
  scenarioSnapshotHash: string
}

interface LabAttemptRecord {
  attemptId: string // UUID
  profileId: string
  evidenceEpoch: number
  scenarioId: string
  scenarioVersion: string
  sourceSnapshotId: string
  contentManifestVersion: string
  language: string
  scenarioSnapshot: Readonly<LabScenarioSnapshot>
  startedAt: number
  updatedAt: number
  revision: number
  submittedAt?: number
  abandonedAt?: number
  status: 'inProgress' | 'submitted' | 'abandoned'
  answerByStepId: Record<string, unknown>
  scoreEarned?: number
  scorePossible?: number
  failedAttemptCount: number
  elapsedMs: number
}
```

Die Versuchsmenge wächst nach UUID append-only; ein laufender Versuch darf für Resume aktualisiert werden, nach Abgabe ist er unveränderlich und ein Retry erhält eine neue UUID. Rendering, Resume und Scoring lesen ausschließlich den eingefrorenen `scenarioSnapshot`, nie die möglicherweise inzwischen geänderte Registry. Während des Versuchs werden keine Kartenreviews und kein XP geschrieben. Nach Abgabe können fehlerbezogene Links eine normale Review-Ausführung erzeugen.

Legacy-Mengen `labsCompleted`/`labsTrainingSolved` werden beim Upgrade konservativ als historische Abschlüsse importiert. Ohne Antworten/Rubrik zählen sie nicht als Score- oder Mastery-Evidenz.

## 14. Eigene Exam-Engine

Vollsimulationen laufen in einer `ExamView`, nicht in der normalen `StudyView`.

### 14.1 Form und Versuch

```ts
interface ExamItemBase {
  itemId: string
  itemVersion: string
  sourceSnapshotId: string
  contentManifestVersion: string
  language: string
  domainId: '1' | '2' | '3' | '4' | '5'
  objectiveIds: string[]
  requirementIds: string[]
  acronymMeaningIds: string[]
  actionVerbClass: string
  difficulty: 'easy' | 'medium' | 'hard'
  scenarioBased: boolean
  maxPoints: number
  cardId?: string
  qa: ContentQaRecord
}

interface McExamItem extends ExamItemBase {
  kind: 'mc'
  prompt: string
  selectionMode: 'single' | 'multiple'
  minSelections: number
  maxSelections: number
  options: Array<{ id: string; text: string }>
  scoring: { correctOptionIds: string[] }
}

interface MatchingExamItem extends ExamItemBase {
  kind: 'matching'
  prompt: string
  left: Array<{ id: string; text: string }>
  right: Array<{ id: string; text: string }>
  scoring: { correctRightIdByLeftId: Record<string, string>; pointsByLeftId: Record<string, number> }
}

interface OrderingExamItem extends ExamItemBase {
  kind: 'ordering'
  prompt: string
  steps: Array<{ id: string; text: string }>
  scoring: { correctOrder: string[]; partialCreditRule: 'exact-position' | 'relative-order' }
}

type ScenarioControlSnapshot =
  | { id: string; kind: 'single-select'; prompt: string; options: Array<{ id: string; text: string }> }
  | { id: string; kind: 'multi-select'; prompt: string; minSelections: number; maxSelections: number; options: Array<{ id: string; text: string }> }
  | { id: string; kind: 'ordered-select'; prompt: string; options: Array<{ id: string; text: string }> }

interface RubricCriterionSnapshot {
  criterionId: string
  controlId: string
  operator: 'equals' | 'set-equals' | 'ordered-equals'
  expectedOptionIds: string[]
  points: number
}

interface ScenarioExamItem extends ExamItemBase {
  kind: 'scenario'
  prompt: string
  controls: ScenarioControlSnapshot[]
  scoring: { rubric: RubricCriterionSnapshot[] }
}

type ExamItem = McExamItem | MatchingExamItem | OrderingExamItem | ScenarioExamItem

interface ExamItemPresentationSnapshot {
  itemId: string
  itemVersion: string
  contentFamilyId: string
  sourceSnapshotId: string
  contentManifestVersion: string
  language: string
  domainId: '1' | '2' | '3' | '4' | '5'
  objectiveIds: string[]
  requirementIds: string[]
  acronymMeaningIds: string[]
  actionVerbClass: string
  difficulty: 'easy' | 'medium' | 'hard'
  scenarioBased: boolean
  maxPoints: number
  cardId?: string
  prompt: string
  presentation:
    | { kind: 'mc'; selectionMode: 'single' | 'multiple'; minSelections: number; maxSelections: number; options: Array<{ id: string; text: string }> }
    | { kind: 'matching'; left: Array<{ id: string; text: string }>; right: Array<{ id: string; text: string }> }
    | { kind: 'ordering'; steps: Array<{ id: string; text: string }> }
    | { kind: 'scenario'; controls: ScenarioControlSnapshot[] }
  presentationHash: string
}

interface PracticeScoringSnapshotBase {
  itemId: string
  itemVersion: string
  maxPoints: number
  scoringAlgorithmVersion: 'sy0701-scoring-v1'
  practiceScoringSnapshotHash: string
}

type PracticeScoringSnapshot =
  | (PracticeScoringSnapshotBase & { kind: 'mc'; scoring: McExamItem['scoring'] })
  | (PracticeScoringSnapshotBase & { kind: 'matching'; scoring: MatchingExamItem['scoring'] })
  | (PracticeScoringSnapshotBase & { kind: 'ordering'; scoring: OrderingExamItem['scoring'] })
  | (PracticeScoringSnapshotBase & { kind: 'scenario'; scoring: ScenarioExamItem['scoring'] })

interface ScoreSummary {
  earnedPoints: number
  possiblePoints: number
  percent: number
  itemCount: number
  unansweredCount: number
}

interface ExamBlueprint {
  blueprintId: string
  blueprintVersion: string
  calibrationReportVersion: string
  scoringRegistryVersion: string
  mode: 'drill' | 'full'
  itemCount: number
  durationSec: number
  domainWeights: readonly [12, 22, 18, 28, 20]
  pbqTargetCount: number
  minPbqPointShare: number
  requiredObjectiveIds: string[]
  requiredActionVerbClasses: string[]
  minScenarioItemShare: number
  difficultyTargetCounts: Record<'easy' | 'medium' | 'hard', number>
}

interface ExamFormDefinition {
  formId: string
  formVersion: string
  launchDescriptorId: string
  launchDescriptorVersion: string
  examCode: 'SY0-701'
  sourceSnapshotId: string
  contentManifestVersion: string
  language: string
  purpose: 'diagnostic' | 'practice' | 'readiness'
  mode: 'drill' | 'full'
  blueprintId: string
  blueprintVersion: string
  calibrationReportVersion: string
  scoringRegistryVersion: string
  selectionSeed: string
  itemIds: string[]
  itemVersionById: Record<string, string>
  domainTargetCounts: Record<string, number>
  pbqTargetCount: number
  durationSec: number
  pool: 'practice' | 'readiness'
}

interface ExamAttemptRecordBase {
  attemptId: string // UUID
  profileId: string
  evidenceEpoch: number
  launchDescriptorId: string
  launchDescriptorVersion: string
  formId: string
  formVersion: string
  blueprintId: string
  blueprintVersion: string
  calibrationReportVersion: string
  scoringRegistryVersion: string
  examCode: 'SY0-701'
  sourceSnapshotId: string
  contentManifestVersion: string
  language: string
  deviceId: string
  selectionSeed: string
  itemPresentations: ExamItemPresentationSnapshot[]
  startedAt: number
  deadlineAt: number
  updatedAt: number
  revision: number
  submittedAt?: number
  abandonedAt?: number
  status: 'inProgress' | 'submitPending' | 'submitted' | 'abandoned'
  answersByItemId: Record<string, unknown>
  flagsByItemId: Record<string, boolean>
  timeMsByItemId: Record<string, number>
  earnedPointsByItemId: Record<string, number>
  unansweredItemIds: string[]
  clockAnomaly?: boolean
  result?: {
    earnedPoints: number
    possiblePoints: number
    byDomain: Record<string, ScoreSummary>
    byObjective: Record<string, ScoreSummary>
    byRequirement: Record<string, ScoreSummary>
    pbq: ScoreSummary
  }
}

interface PracticeExamAttemptRecord extends ExamAttemptRecordBase {
  purpose: 'diagnostic' | 'practice'
  pool: 'practice'
  practiceScoringSnapshots: PracticeScoringSnapshot[]
  timingEligibility: 'not-applicable'
}

interface ReadinessExamAttemptRecord extends ExamAttemptRecordBase {
  purpose: 'readiness'
  pool: 'readiness'
  readinessLeaseId: string
  candidatePersonId: string
  candidateIdentityBindingId: string
  candidateIdentityAssuranceReceiptId: string
  learnerPlanVersion: string
  lifecycleConfirmationId: string
  lastServerHeartbeatAt: number
  timingEligibility: 'pending' | 'qualifying' | 'practice-only'
  practiceScoringSnapshots?: never
}

type ExamAttemptRecord = PracticeExamAttemptRecord | ReadinessExamAttemptRecord

interface ReadinessScoreReceipt {
  receiptId: string
  attemptId: string
  leaseId: string
  profileId: string
  personId: string
  identityBindingId: string
  identityAssuranceReceiptId: string
  evidenceEpoch: number
  learnerPlanVersion: string
  lifecycleConfirmationId: string
  formId: string
  formVersion: string
  sourceSnapshotId: string
  contentManifestVersion: string
  calibrationReportVersion: string
  scoringRegistryVersion: string
  serverStartedAt: number
  deadlineAt: number
  submittedAt: number
  earnedPointsByItemId: Record<string, number>
  result: NonNullable<ExamAttemptRecord['result']>
  assessmentEventIds: string[]
  qualifiesForReadiness: boolean
  nonQualificationReasons: string[]
  signature: SignatureMetadata
}

interface ObjectiveEvidence {
  profileId: string
  evidenceEpoch: number
  objectiveId: string
  sourceSnapshotId: string
  contentManifestVersion: string
  masteryConfigVersion: string
  status: ObjectiveEvidenceStatus
  coverageComplete: boolean
  uniqueCurrentItemCount: number
  independentSessionCount: number
  earnedPoints: number
  possiblePoints: number
  unresolvedCriticalErrorClassIds: string[]
  practicalScore?: ScoreSummary
  evidenceWindowStart: number
  reasons: string[]
}

interface EvidenceInput {
  profileId: string
  objectiveId: string
  evidenceEpoch: number
  snapshot: ExamSourceSnapshot
  contentManifestVersion: string
  requirements: ExamRequirement[]
  criticalErrorDefinitions: CriticalErrorDefinition[]
  coverage: RequirementCoverage[]
  ledger: AssessmentLedgerEntry[]
  labAttempts: LabAttemptRecord[]
  now: number
  masteryConfigVersion: string
}

interface AcronymEvidenceReport {
  reportVersion: string
  profileId: string
  evidenceEpoch: number
  sourceSnapshotId: string
  contentManifestVersion: string
  masteryConfigVersion: string
  requiredMeaningPairIds: string[]
  coveredMeaningPairIds: string[]
  assessedMeaningPairIds: string[]
  earnedPoints: number
  possiblePoints: number
  unresolvedAmbiguousMeaningPairIds: string[]
  computedAt: number
}

interface DomainEvidence {
  profileId: string
  evidenceEpoch: number
  sourceSnapshotId: string
  contentManifestVersion: string
  masteryConfigVersion: string
  domainId: '1' | '2' | '3' | '4' | '5'
  status: 'ready' | 'not-ready'
  score: ScoreSummary
}

interface LabEvidenceReport {
  profileId: string
  evidenceEpoch: number
  sourceSnapshotId: string
  contentManifestVersion: string
  score: ScoreSummary
  qualifyingAttemptIds: string[]
  computedAt: number
}

interface ContentReadinessGateReport {
  reportVersion: string
  sourceSnapshotId: string
  contentManifestVersion: string
  requirementIds: string[]
  approvedCoveredRequirementIds: string[]
  unresolvedLeafGapIds: string[]
  unresolvedMappingErrorIds: string[]
  unresolvedCriticalDefinitionIds: string[]
  unapprovedContentIds: string[]
  missingProvenanceContentIds: string[]
  missingLicenseContentIds: string[]
  quarantinedContentIds: string[]
  calibrationReportVersion: string
  calibrationApproved: boolean
  calibrationApprovalReceiptId?: string
  approvedAt?: number
  signature: SignatureMetadata
}

interface ReadinessAuthorityState {
  profileId: string
  personId: string
  identityBindingId: string
  identityAssuranceReceiptId: string
  learnerPlanVersion: string
  lifecycleConfirmationId: string
  evidenceEpoch: number
  sourceSnapshotId: string
  contentManifestVersion: string
  assessmentWatermark: string
  exposureWatermark: string
  fullAssessmentSyncConfirmed: boolean
  fullExposureAuditConfirmed: boolean
  validLeaseIds: string[]
  validScoreReceiptIds: string[]
  validQualificationEventIds: string[]
  loadedAt: number
}

interface ReadinessInput {
  plan: ConfirmedLearnerExamPlan
  evidenceEpoch: number
  snapshot: ExamSourceSnapshot
  contentManifestVersion: string
  masteryConfigVersion: string
  lifecycleConfirmation: ExamLifecycleConfirmation
  objectiveEvidence: ObjectiveEvidence[]
  domainEvidence: DomainEvidence[]
  holdoutAttempts: ReadinessExamAttemptRecord[]
  assessmentLedger: AssessmentLedgerEntry[]
  labEvidence: LabEvidenceReport
  acronymEvidence: AcronymEvidenceReport
  contentGateReport: ContentReadinessGateReport
  authorityState: ReadinessAuthorityState
  calibrationReportVersion: string
  now: number
}

interface ReadinessResult {
  status: ReadinessStatus
  blockers: string[]
  qualifyingAttemptIds: string[]
  sourceSnapshotId: string
  contentManifestVersion: string
  masteryConfigVersion: string
  computedAt: number
}

interface ReadinessAuthorityReceipt {
  receiptId: string
  profileId: string
  personId: string
  identityBindingId: string
  identityAssuranceReceiptId: string
  evidenceEpoch: number
  learnerPlanVersion: string
  examCode: 'SY0-701'
  examDateIso: string
  examLanguage: string
  sourceSnapshotId: string
  contentManifestVersion: string
  masteryConfigVersion: string
  calibrationReportVersion: string
  scoringRegistryVersions: string[]
  assessmentWatermark: string
  exposureWatermark: string
  lifecycleConfirmationId: string
  lifecycleConfirmationVersion: string
  bookingAttestationId: string
  contentGateReportVersion: string
  acronymEvidenceReportVersion: string
  qualifyingAttemptIds: string[]
  leaseIds: string[]
  scoreReceiptIds: string[]
  qualificationEventIds: string[]
  status: ReadinessStatus
  blockers: string[]
  computedAt: number
  expiresAt: number
  signature: SignatureMetadata
}
```

`computeObjectiveEvidence` berechnet genau das über `objectiveId` benannte Objective, verwendet nur Accepted Events der aktuellen `evidenceEpoch` und wendet Reversal-, Qualification- und Invalidation-Einträge an, bevor es Sessions oder Punkte zählt. `computeExamReadiness` läuft für den Status `examReady` ausschließlich serverseitig auf Datensätzen, die der Server anhand von Auth-/Plan-/Snapshot-IDs selbst lädt; `ReadinessInput`, insbesondere `authorityState`, ist kein akzeptiertes Client-Payload. Die Funktion verlangt für Profil, Person, Identity-Binding/-Assurance, Epoch sowie Plan-, Lifecycle-, Snapshot-, Manifest-, Mastery- und Calibration-Version vollständige Übereinstimmung und berücksichtigt nur Holdout-Attempts mit gültigem Lease, signiertem Score-Receipt, Server-Qualification und ohne spätere Invalidation. Bloß `submitted` oder ein lokales Boolean reicht nicht. Das Ergebnis wird als `ReadinessAuthorityReceipt` signiert; der Client darf `examReady` nur aus einem gültigen, nicht abgelaufenen Receipt anzeigen, dessen `learnerPlanVersion`, Exam-Code, Datum, Prüfungssprache, Lifecycle-Confirmation/-Version, Booking-Attestation und Identity-Assurance exakt dem **aktuell serverbestätigten** aktiven Plan entsprechen. Jede Planänderung, neue Confirmation, Sprach-/Terminänderung, Assurance-Widerruf oder Profilwechsel macht einen alten Receipt unabhängig von dessen Restlaufzeit sofort unanzeigbar und verlangt Neuberechnung. Offline oder ohne passenden Receipt ist höchstens `approaching` zulässig.

Die Berechnung verweigert `examReady` außerdem bei unvollständiger Leaf- oder Akronym-Coverage, nicht vollständig geprüften Akronym-Bedeutungspaaren, Akronymleistung unter 80 Prozent, ungelöster Mehrdeutigkeit, Mapping-/QA-/Provenienz-/Lizenzlücken, Quarantäne oder fehlender signierter Kalibrierungsfreigabe. Ein Versionsstring allein gilt nicht als Freigabe. `fullAssessmentSyncConfirmed` und `fullExposureAuditConfirmed` werden aus serverseitigen Watermarks abgeleitet; sie werden nie aus Client-Booleans übernommen. Receipt, verwendete Lease-/Score-/Qualification-IDs und beide Watermarks bilden eine prüfbare Kette.

Item-IDs und Präsentation werden beim Start versioniert eingefroren. Der Snapshot-Builder muss `contentFamilyId` exakt und unverändert aus `item.qa.contentFamilyId` in Presentation, Exposure und redaktierten Backup-Ref kopieren; fehlt sie oder weicht eine Kopie ab, brechen Formbuild/Lease/Restore ab. `presentationHash` ist ausschließlich SHA-256 über eine kanonische Präsentation **ohne** Scoring, korrekte Optionen, erwartete IDs oder Rubrik; nur dieser Hash darf in Client, Descriptor, Signaturclaims und Backup erscheinen. Practice darf seinen freigegebenen, nach `kind` diskriminierten Scoring-Snapshot samt ausdrücklich benanntem Practice-Hash lokal einfrieren. Die Integrität privater Readiness-Scoringdaten wird serverintern über Registryversion plus keyed HMAC bzw. einen nie ausgelieferten Full-Hash geprüft; weder ein Answer-Key-Commitment noch ein kombinierter Presentation+Scoring-Hash verlässt den privaten Store. So darf der Client aus kleinen Antwortmengen keinen Lösungsschlüssel gegen einen öffentlichen Hash bruteforcen. Ein eingereichter Versuch ist unveränderlich. Rohprozente und Teilpunkte sind Trainingsmetriken und werden nicht als offizieller CompTIA-Score ausgegeben.

Auswahl- und Scoringvertrag v1 ist vollständig deterministisch: `single` verlangt `minSelections = maxSelections = 1` und genau eine korrekte Option; `multiple` verlangt `1 <= minSelections <= maxSelections <= options.length` und die korrekte Optionsmenge liegt innerhalb dieser Grenzen. Dasselbe gilt pro Scenario-`multi-select`; Grenzen sind scoringfreie UI-/A11y-Metadaten, erwartete IDs bleiben privat. MC erhält nur bei exakter Set-Gleichheit `maxPoints`, sonst null. Matching summiert `pointsByLeftId` für jede korrekte Paarung. Ordering mit `exact-position` vergibt `maxPoints × korrektePositionen / AnzahlSchritte`, mit `relative-order` `maxPoints × korrektePaare / allePaare`; beide runden erst das Endergebnis per Half-up auf vier Dezimalstellen. Scenario summiert die Punkte exakt erfüllter Rubrikkriterien (`equals`, `set-equals`, `ordered-equals`). Unbeantwortet ergibt immer null, negative Punkte sind ausgeschlossen, und jeder Scorer cappt bei `maxPoints`. Validatoren beweisen eindeutige IDs, vollständige Schlüssel, passende Operator-/Control-Kinds, `sum(points) = maxPoints` bzw. den definierten Maximalwert und Hashgleichheit. Client-Preview und Server-Nachrechnung verwenden dieselbe pure `sy0701-scoring-v1`-Fixturesuite; eine Algorithmusänderung verlangt neue Registry-/Algorithmusversion und invalidiert keine eingefrorenen alten Attempts.

Ein Mock zählt nur als `full`, wenn er einen fachlich und empirisch freigegebenen Full-Blueprint exakt erfüllt. Konservativer Start-Blueprint: 90 Items in 90 Minuten, vier bis sechs PBQ-nahe Items mit mindestens zehn Prozent der möglichen Punkte, alle 28 Objectives mindestens einmal, alle im Crosswalk geführten Aufgabenverbklassen, mindestens 30 Prozent Szenario-/Anwendungsitems und ein dokumentierter Schwierigkeitsspiegel. Diese Werte sind interne Trainingsziele, keine Behauptung über die geheime reale Formverteilung, und werden nur über eine neue Blueprint-Version kalibriert.

### 14.2 Vollsimulation

- globaler 90-Minuten-Timer, nicht `K × 60 Sekunden`,
- niemals mehr als 90 Items; der initiale qualifizierende Full-Blueprint verlangt genau 90, ein kleinerer Satz ist nur Drill oder benötigt eine neu kalibrierte Blueprint-Version und zählt bis dahin nicht für Readiness,
- Domainmix 12/22/18/28/20 per deterministischer Largest-Remainder-Rundung,
- Multiple Choice plus die vom Blueprint geforderte Mindestzahl und Mindestpunktquote fachlich geprüfter PBQ-naher Items aus dem gesamten Inventar,
- Navigation, Flag/Review, sichtbare unbeantwortete Items und freiwillige Abgabe,
- keine Lösung, Richtig/Falsch-Anzeige, Scheduler-Schreibung oder XP vor Abgabe,
- Autosubmit bei Deadline und vollständige Auswertung erst danach.

Practice kann offline starten, wenn Form und Assets vollständig lokal vorhanden sind. Readiness startet nur online nach dem serverseitig gebundenen Lease/Attempt. Es darf für Nutzerkontinuität offline weiterlaufen, aber ein nicht lückenlos durch serverseitige Start-/Heartbeat-/Deadline-Zeitpunkte belegbarer Lauf wird irreversibel `timingEligibility = 'practice-only'` und zählt nicht für `examReady`. Die versionierte Timing-Policy wird im Lease signiert; konservativer Startwert sind 30 Sekunden Heartbeat-Intervall plus 90 Sekunden Grace, vor Release unter Browser-Background-/Mobilbedingungen zu pilotieren. Erlaubte Transitionen sind nur `pending → qualifying|practice-only` und `qualifying → practice-only`; nie zurück zu `qualifying`.

Jeder Heartbeat liefert einen signierten `ReadinessHeartbeatAck` mit UUID, Auth-/Geräte-/Epoch-Claims, Serverzeit, Revision, unveränderter Deadline, nächstem Fälligkeitszeitpunkt und Eligibility. `deadlineAt` läuft bei Reload/Background weiter. Für einen qualifizierenden Lauf muss der Server den bereits gespeicherten Antwortstand spätestens an der Deadline idempotent sperren und einen signierten `ReadinessDeadlineLockAck` mit denselben Claims und Antwortzustandshash liefern. Ack und Attemptrevision werden atomar in `readinessTimingAcks`/`examAttempts` persistiert; gleiche Ack-ID verlangt kanonische Hashgleichheit, alte oder fremde Revision/Claims werden als Replay abgewiesen. Bei Offline-Ablauf werden Antworten zusätzlich lokal unveränderlich gesperrt und der Attempt auf `submitPending` gesetzt; sobald die Verbindung zurückkehrt, kann der Client Antworten/Antwortzeiten für Score und Feedback senden, aber ohne rechtzeitigen Server-Lock keinen qualifizierenden Receipt erhalten. Readiness-Scoring, Ergebnis, Feedback und Assessment-Qualification entstehen ausschließlich serverseitig; ohne Netz gibt es weder Score noch `submitted`. Uhrsprünge, verpasste Heartbeats, Background-Grace-Überschreitung und Ack-Replay werden protokolliert und entwerten die Qualifikation; Offline-Sicherheit wird nicht überversprochen.

Kurze Drills besitzen einen separaten konfigurierten Timer und werden nie als vollständiger Mock gezählt.

### 14.3 Holdout-Evidenz

```ts
interface ExamItemExposure {
  exposureId: string
  leaseId?: string
  attemptId?: string
  profileId: string
  personId: string
  identityBindingId: string
  formId?: string
  formVersion?: string
  itemId: string
  itemVersion: string
  contentFamilyId: string
  sourceSnapshotId: string
  contentManifestVersion: string
  deviceId: string
  context: 'legacy-possible' | 'course' | 'review' | 'lab' | 'practice' | 'readiness'
  exposedAt: number
  serverSequence: string
  exposureReceiptId: string
}

interface ExposureCommitReceipt {
  receiptId: string
  leaseId: string
  attemptId: string
  personId: string
  profileId: string
  identityBindingId: string
  evidenceEpoch: number
  exposureIds: string[]
  firstServerSequence: string
  lastServerSequence: string
  committedAt: number
  signature: SignatureMetadata
}
```

Zum Release stehen mindestens drei untereinander disjunkte, versionierte und kalibrierte Readiness-Full-Formen bereit: zwei für die erforderlichen gültigen Nachweise und mindestens eine Reserve. Jeder gestartete, abgebrochene, fehlgeschlagene oder invalidierte Versuch verbraucht die Form für diesen Kandidaten. Vor jedem Start müssen noch mindestens so viele ungesehene gültige Formen vorhanden sein, wie erfolgreiche Nachweise fehlen. Reicht der Vorrat nicht, sperrt das System weitere Qualifikationsversuche, bis ein unabhängiger QA-/Kalibrierungsprozess neu erstellte, ungesehene Items zu einer disjunkten Ersatzform freigibt.

Die Formen werden weder vorab auf das Gerät ausgeliefert noch in anderen Lernpfaden verwendet. Ein serverseitiger atomarer Lease markiert Form und sämtliche Items **vor** Ausgabe als exponiert, prüft Kandidat, Autoren/Reviewer, Contentversion und frühere Historie und liefert erst danach den Snapshot. Deshalb benötigt der Start eines Readiness-Mocks eine Online-Verbindung; nach erfolgreichem Lease darf der bereits gestartete Versuch offline fortgesetzt werden. Practice-Drills können weiterhin offline starten.

`ExamItemExposure` speichert profil-/personenbezogen Lease/Attempt, Form, Item, Version, stabile Content-Familie, Snapshot/Manifest, Zeitpunkt, Gerät, Kontext, monotone Serversequenz und Receipt. Serverseitig ist der Lease-Insert mindestens auf `(leaseId, contentFamilyId)` idempotent; eine monotone Projektion auf `(personId, contentFamilyId)` entscheidet „jemals exponiert“. Eine bloße Item-/Versionsänderung setzt die Historie nicht zurück. Nur fachlich wirklich neues Material darf nach Near-Duplicate-/Lineage-Review eine neue `contentFamilyId` erhalten. Wiederholung desselben Lease verlangt Hashgleichheit, ein abweichender Payload ist Auditfehler. Ein Exposure-Datensatz oder Receipt ist weder clientseitig lösch- noch überschreibbar. Ein bereits oder möglicherweise exponiertes Item bzw. seine Content-Familie darf nie wieder als `unseen holdout` gelten. `examReady` bleibt blockiert, bis Lease, Exposure-Receipt/Watermark, Attempt und AssessmentEvents serverseitig bestätigt sind.

## 15. Wirkungsgrenzen und bestehende Lernmechanik

### 15.1 Gewollter Effektpfad

Karten in `course`- und `review`-Ausführungen starten einen neuen Adapter `onStartUnitStudy({ profileId, executionId, deck, cardIds })`. Er verwendet die persistente Session-ID `unit-execution:{executionId}` statt der heute kollidierenden deckbezogenen Today-Package-ID und aktiviert Resume. `PersistedStudySession` wird auf Version 6 angehoben und erhält optionale, rückwärtskompatibel geparste Felder `profileId` und `executionId`; Abschluss oder Abbruch wird an genau diese Ausführung zurückgemeldet. Bewertungen laufen weiterhin über die bestehende Schedulerlogik von `recordReview` und wirken wie bisher auf Reviewhistorie, `cardStats` und Gamification; der additive Assessment-Kontext aus §10 schreibt nur Evidenzkontext. Die Unit selbst vergibt kein XP.

Recall-Checks bleiben non-scheduling und XP-frei.

Labs und Exams schreiben ausschließlich ihre Versuchstabellen. Erst eine bewusst gestartete Remediation nach Abgabe darf eine normale Study-Session erzeugen.

### 15.2 Daily Quest und globale Einstiegspfade

Nicht nur `HomeView`, sondern auch App-Shortcuts müssen dieselbe profilbezogene Funktion nutzen:

```ts
async function listReservedStudyCardIds(profileId: string): Promise<string[]>
```

Die Rückgabe enthält ausschließlich echte `cardId`s: alle eingefrorenen Karten offener Course-/Review-Ausführungen sowie `itemPresentations[].cardId` der card-basierten Items laufender Examversuche. Reine Szenario-/PBQ-`itemId`s dürfen nie als Karten-ID an `excludeCardIds` gehen. Ein öffentlicher, inhaltsfreier Pooldeskriptor liefert zusätzlich `readinessReservedCardIds`; diese Card-IDs sind dauerhaft aus Daily Quest, Course und Review ausgeschlossen. Private neue Holdout-Items dürfen ohnehin nicht als normale Clientkarte installiert sein. Kein globaler Legacy-Pointer darf für ein anderes Profil Ausschlüsse oder Fortschritt liefern.

### 15.3 Unverändert

- Formeln von FSRS und SM-2,
- `recordReview`-Semantik normaler Study-Sessions,
- bestehende Karten-/Deck-IDs,
- Offline-Videodateien als geräteweite Assets,
- vorhandene Storage-Keys bis zur kontrollierten Migration,
- bestehende Test-IDs, sofern eine fachliche UI-Änderung keinen dokumentierten Ersatz erfordert.

## 16. Persistenz, Profiltrennung und Migration

Ausgangspunkt ist Dexie v21.

### 16.1 Zielversionen

Die heutige Kernlerndatenbank ist nicht profilfest: `cards`, `reviews`, `cardStats`, `deckProgress`, `activeSessions`, Decks und Shuffle-Collections verwenden globale Schlüssel und werden beim Profilwechsel geleert. Das widerspricht Resume, Offlinebetrieb und profilbezogener Fälligkeit. Phase 2 führt deshalb **neue profilgescopte Kernstores** ein; bloß neue Unit-/Evidenztabellen zu scopen reicht nicht:

```ts
interface ProfileDeckRecord extends DeckRecord {
  profileId: string
}

interface ProfileCardRecord extends CardRecord {
  profileId: string
  // id bleibt die logische Karten-ID; Primärschlüssel ist [profileId+id]
}

interface ProfileReviewRecord extends Omit<ReviewRecord, 'id'> {
  reviewId: string // UUID; Primärschlüssel
  profileId: string
  evidenceEpoch: number
}

interface ProfileCardStatsRecord extends CardStatsRecord {
  profileId: string
}

interface ProfileDeckProgressRecord extends DeckProgressRecord {
  profileId: string
}

interface ProfileActiveSessionRecord extends ActiveSessionRecord {
  profileId: string
  sessionId: string
}

interface ProfileShuffleCollectionRecord extends ShuffleCollectionRecord {
  profileId: string
}
```

Die Zielstores heißen `profileDecks`, `profileCards`, `profileReviews`, `profileCardStats`, `profileDeckProgress`, `profileActiveSessions` und `profileShuffleCollections`. Alle Read-/Write-/Scheduler-/Statistik-/Gamification-/Import-/Backup-/Syncpfade verlangen danach ein explizites `profileId`; sie dürfen den Scope nicht nach einem `await` erneut aus „aktuell aktiv“ ableiten. Karten-/Deck-IDs bleiben innerhalb eines Profils logisch stabil, sind global aber nur zusammen mit `profileId` eindeutig. Die alten ungescopten Stores bleiben bis zur verifizierten Owner-Migration ausschließlich als Rollbackquelle vorhanden und werden danach nicht mehr als Runtime-Quelle gelesen oder dual geschrieben.

| Version | Neue/erweiterte Daten |
|---|---|
| v22 | profilgescopte Kernstores für Decks/Karten/Reviews/Stats/Progress/Sessions/Shuffle, `profileLearningState`, `learningUnitState`, Unit-Ausführungen, `reviewUnitAttempts`, `videoProgressByProfile`, einzelne `videoRecallRuns`, `assessmentEventProposals`, autoritative `assessmentEvents`, Acceptance-/Reversal-/Session-Receipts, `legacyAssessmentHints`, `learnerExamPlans`, Restore-Reconciliation und `migrationMeta` |
| v23 | `labAttempts`, `assessmentQualificationReceipts` |
| v24 | `examAttempts`, `readinessLeases`, `examItemExposure`, `exposureCommitReceipts`, `readinessTimingAcks`, `readinessScoreReceipts`, `readinessAttemptHistory`, `examLifecycleConfirmations` |

Empfohlene Indizes:

```text
profileDecks:           &[profileId+id], profileId, [profileId+parentDeckId], [profileId+updatedAt]
profileCards:           &[profileId+id], profileId, [profileId+deckId], [profileId+deckId+dueAt], [profileId+type], [profileId+isDeleted]
profileReviews:         reviewId, &[profileId+opId], [profileId+cardId], [profileId+timestamp], [profileId+evidenceEpoch]
profileCardStats:       &[profileId+cardId], [profileId+deckId], [profileId+updatedAt]
profileDeckProgress:    &[profileId+deckId], [profileId+updatedAt]
profileActiveSessions:  &[profileId+sessionId], profileId, [profileId+updatedAt]
profileShuffleCollections: &[profileId+id], profileId, [profileId+updatedAt]
profileLearningState:   profileId, evidenceEpoch, revision, lastResetEventId, pendingResetRequestId, serverWatermark, updatedAt
learningUnitState:      [profileId+unitId], profileId, activityStatus, lastActivityAt, updatedAt
unitExecutions:         executionId, [profileId+unitId], profileId, createdAt
reviewUnitAttempts:     attemptId, [profileId+localLearningDay], [profileId+unitId], executionId, completedAt
videoProgressByProfile: [profileId+videoIndex], profileId, objectiveId, updatedAt
videoRecallRuns:        runId, [profileId+videoIndex], profileId, completedAt
assessmentEventProposals: proposalId, [profileId+sessionId], profileId, clientOccurredAt
assessmentEvents:       eventId, [profileId+itemId], [profileId+sessionId], profileId, evidenceOccurredAt, context, serverSequence
assessmentAcceptanceReceipts: receiptId, profileId, serverAcceptedAt
assessmentReversalReceipts: receiptId, profileId, serverAcceptedAt
assessmentSessionTimeReceipts: receiptId, [profileId+sessionId], profileId, serverStartedAt
legacyAssessmentHints:  hintId, profileId, importedAt
learnerExamPlans:        [profileId+examCode], profileId, examDateIso, updatedAt
migrationMeta:          key, completedAt
labAttempts:            attemptId, [profileId+scenarioId], profileId, status, updatedAt
assessmentQualificationReceipts: receiptId, [profileId+sourceAttemptId], profileId, issuedAt
examAttempts:           attemptId, [profileId+formId], profileId, status, updatedAt
readinessLeases:        leaseId, &[profileId+attemptId], profileId, storedAt
examItemExposure:       exposureId, [profileId+itemId], [personId+contentFamilyId], &[leaseId+contentFamilyId], profileId, personId, formId, exposedAt, context, serverSequence
exposureCommitReceipts: receiptId, leaseId, attemptId, committedAt
readinessTimingAcks:    ackId, [profileId+attemptId], attemptId, profileId
readinessScoreReceipts: receiptId, attemptId, leaseId, submittedAt
readinessAttemptHistory: attemptId, [profileId+formId], profileId, status, submittedAt
examLifecycleConfirmations: confirmationId, [profileId+examCode], learnerPlanVersion, bookabilityVerifiedAt
restoreReconciliation:  candidateId, [profileId+state], profileId, kind, recordId, updatedAt
```

Der globale Migrationsdatensatz enthält zusätzlich `ownerProfileId`; `completedAt` ist der atomare Idempotenzanker. `videoRecallRuns` speichert jeden Lauf mit UUID; eine Query liefert für die UI höchstens die letzten fünf pro Profil/Video, ohne das Append-only-Auditmodell auf eine Sammelzeile zu reduzieren.

### 16.2 Legacy-Owner-Regel

Pointer, Objective-weite Video-Signale, Recall-Scores, Lab-Sets und bestehendes `examDateIso` sind heute global. Sie dürfen nicht in jedes Profil kopiert werden. Wegen der Schemafolge existieren zwei Marker: `legacy-learning-v1` in v22 legt den einzigen Owner fest; `legacy-labs-v1` importiert erst in v23 die Lab-Sets für genau diesen gespeicherten Owner.

Algorithmus:

1. Migration erst starten, wenn ein aktives `profileId` sicher feststeht.
2. In **einer** Dexie-Transaktion `migrationMeta['legacy-learning-v1']` prüfen.
3. Existiert kein Marker, dieses aktive Profil als `ownerProfileId` speichern und Legacy-Daten nur diesem Profil zuordnen.
4. Sämtliche vorhandenen Decks, Karten samt Schedulerzustand, Reviews, Card-Stats, Deck-Progress, aktive Sessions und Shuffle-Collections in die neuen profilgescopten Stores des Owners kopieren. Legacy-Review-IDs werden deterministisch zu UUIDs abgebildet; Referenzen, `opId`, Fälligkeit und Algorithmenparameter bleiben erhalten.
5. Vor Marker-Commit Anzahl und kanonische Hashes Quelle↔Ziel je Store vergleichen. Teilkopie, Schlüsselkonflikt oder fehlender Owner rollt die Gesamttransaktion zurück und blockiert Study-/Sync-Start.
6. Pointer-Fortschritt in Unit-States/Ausführung übertragen. `lastCompletedIndex` ist stärkere Kursaktivitäts-Evidenz als ein Objective-weites watched-Flag.
7. Globaler Recall-Score mit eindeutigem `videoIndex` wird dem Ownerprofil zugeordnet.
8. Objective-weite watched/confidence-Signale werden wegen Mehrdeutigkeit nur als `legacyHint` importiert; sie schließen nicht alle Videos eines Objectives ab. Ohne eindeutige Zuordnung erzeugen sie keine Unit-Completion oder Mastery.
9. Heute lokal sichtbare Legacy-Reviews zusätzlich als `LegacyAssessmentHint` des Owners importieren; keine Accepted Events erzeugen.
10. Ein vorhandenes globales `examDateIso` nur in einen `DraftLearnerExamPlan` des Ownerprofils übernehmen; Person, Prüfungssprache, Snapshot, Wochenminuten, Lerntage/Woche und Puffertage müssen explizit bestätigt werden.
11. Marker und neue v22-Datensätze atomar schreiben; Fehler rollt alles zurück. Erst danach schaltet ein persistenter `scoped-core-v1-ready`-Marker alle Runtime-Queries auf die neuen Stores um; es gibt keinen Zwischenzustand mit gemischten Quellen.
12. Weitere Profile starten leer oder werden durch ihren eigenen authentifizierten Bootstrap in ihren Scope geladen. Sie lesen nie den globalen Pointer, das globale Prüfungsdatum oder globale Fortschrittssignale.
13. Beim Upgrade auf v23 in einer separaten Transaktion `legacy-labs-v1` prüfen, `ownerProfileId` aus `legacy-learning-v1` übernehmen und Legacy-Labs nur für diesen Owner als historische Abschlüsse ohne Score importieren.

Nach erfolgreichem Commit sind ausschließlich die profilgescopten Dexie-Stores Read-/Write-Quelle. Der alte Pointer und die ungescopten Core-Stores werden für einen möglichen manuellen Rollback zunächst nicht gelöscht, aber nicht weiter dual geschrieben; ein globaler Dual-Write wäre nach Profilwechsel nicht konsistent. `resetLocalStudyDataForProfileSwitch()` wird durch einen atomaren Scope-Wechsel ersetzt: laufende Controller des alten Profils werden geschlossen, der neue `profileId`-Scope wird vollständig verfügbar gemacht und erst dann veröffentlicht. Kein Core-Store wird geleert. Jede asynchrone Query trägt den beim Start erfassten Scope und verwirft ihr Ergebnis, falls der UI-Scope inzwischen wechselte; beim Rückwechsel stehen Kartenfälligkeit, Reviews, Stats, Progress und Sessions exakt wieder bereit — auch offline.

### 16.3 Backup/Restore

`dbBackup` exportiert/importiert ab der jeweiligen Phase `profileLearningState` einschließlich `evidenceEpoch`, Unit-State, Ausführungen, Reviewversuche, profilbezogene Video-/Recall-Signale, Assessment-Proposals/Accepted Events/Resets/Receipts und LegacyHints, `LearnerExamPlan`, Labversuche, zulässige Examhistorie und Exposition. Interne Migrationsmarker werden nicht exportiert. Backup v3 ergänzt die Phase-2-Daten, v4 die Labversuche und generischen Qualification-Receipts und v5 Practice-Examversuche, redaktierte Readiness-Historie/Receipts sowie Exposition; Restore akzeptiert v1–v5 mit optionalen neuen Arrays. Bei Teil-/Deckexporten werden keine profilweiten Unit-/Attempt-Daten angehängt.

Für v5 gilt eine harte Typ-/Serialisierungsgrenze:

```ts
interface ReadinessAttemptBackupRecord {
  kind: 'readiness-redacted'
  attemptId: string
  profileId: string
  evidenceEpoch: number
  formId: string
  formVersion: string
  blueprintId: string
  blueprintVersion: string
  calibrationReportVersion: string
  scoringRegistryVersion: string
  sourceSnapshotId: string
  contentManifestVersion: string
  language: string
  itemRefs: Array<{ itemId: string; itemVersion: string; contentFamilyId: string; presentationHash: string }>
  startedAt: number
  submittedAt?: number
  abandonedAt?: number
  status: 'submitted' | 'abandoned'
  answeredItemIds: string[]
  unansweredItemIds: string[]
  flagsByItemId: Record<string, boolean>
  timeMsByItemId: Record<string, number>
  result?: ExamAttemptRecord['result']
  receipt?: ReadinessScoreReceipt
}

type RestoreReconciliationKind =
  | 'assessment-proposal'
  | 'profile-reset-request'
  | 'submitted-lab-attempt'
  | 'submitted-practice-attempt'

interface RestoreReconciliationCandidate {
  candidateId: string // deterministisch aus profileId + kind + recordId
  profileId: string
  evidenceEpoch: number
  kind: RestoreReconciliationKind
  recordId: string
  canonicalRecordHash: string
  state: 'pending-auth' | 'checking-server' | 're-enqueued' | 'confirmed' | 'superseded' | 'quarantined'
  serverReasonCode?: string
  updatedAt: number
}
```

Practice-Attempts dürfen vollständig exportiert werden. Für Readiness exportiert der normale Backup-Pfad ausschließlich obige abgeschlossene/abgebrochene Historienzeile: keine `itemPresentations`, Prompts, Optionen, Controls, `practiceScoringSnapshots`, erwarteten Antworten, Rubriken oder rohen `answersByItemId`. `inProgress`-/`submitPending`-Readiness-Attempts, vollständige `readinessLeases`, aktive `assessmentSessionTimeReceipts` und `readinessTimingAcks` werden vom normalen Backup ausgeschlossen; sie bleiben lokal an Gerät und Lease gebunden und sind nicht per Restore fortsetzbar. Persistente Sync-/Outbox-Zeilen werden generell nicht exportiert, insbesondere keine `readiness.progress`-Payloads mit Antworten. Signierte Lifecycle-Confirmations dürfen als Referenz exportiert werden, bleiben nach Restore aber bis Auth-/Server-Revalidierung inaktiv. Ein Restore schreibt redaktierte Datensätze nur nach `readinessAttemptHistory`, nie als offenen `examAttempts`-Datensatz, Lease, Timing-Ack oder neue Outbox-Operation. Qualification wird anschließend gegen den authentifizierten Server-/Receipt-Stand revalidiert; ein Backup allein kann keine Readiness-Evidenz erzeugen.

Restore ist idempotent, validiert Profil-/Versionsfelder und darf eingereichte Examversuche nicht überschreiben. Für einen verlinkten Scope wird `evidenceEpoch` **nicht** durch `max(local, backup, server)` autoritativ aktiviert: bis zur Auth-Reconciliation bleibt die letzte serverbestätigte Epoch wirksam; eine höhere Backup-Epoch mit passendem `ProfileResetRequest` ist nur `pending`, ohne vollständige Requestkette wird sie quarantänisiert. Einträge älterer Epochs werden nicht in eine neue Epoch umgeschrieben. Unit-State nutzt den neueren `updatedAt`, darf jedoch keine Aktivität aus einer älteren Evidence-Epoch reaktivieren; Video-Signale führen `watchedAt` monoton innerhalb derselben Epoch zusammen und übernehmen Confidence nach `confidenceAt`. Local-only-Daten dürfen zur Lernfortsetzung sichtbar sein, bleiben aber grundsätzlich nicht mastery-/readinessautoritativ.

UUID-Deduplizierung bedeutet bei unveränderlichen/autoritativen Records **kanonische Hashgleichheit**, nicht „erste Zeile gewinnt“: abgegebene/abgebrochene Lab-/Examversuche, AssessmentEvents, Qualification-/Invalidation-/ProfileReset-Einträge, Expositionen, Score-/Exposure-/Authority-Receipts und redaktierte Readiness-Historie müssen bei gleicher ID byte-semantisch denselben kanonischen Payload besitzen. Abweichung führt zu hartem Auditfehler und Quarantäne der gesamten Importtransaktion. Importierte signierte Datensätze bleiben bis erfolgreicher Signatur-, Auth-Binding- und Server-Revalidierung unbestätigt und können keine Mastery/Readiness erzeugen. Nur die UI-Query begrenzt Recall-Anzeige auf die letzten fünf.

`restoreFullBackup(payload)` ist der einzige Vollbackup-Orchestrator und verarbeitet v1–v5 einschließlich aller neuen Arrays nach den obigen Merge-/Redaktionsregeln. `ImportModal` ruft diesen Orchestrator einmal auf; die bisherigen isolierten Review-/Video-Note-Restores bleiben nur für ausdrücklich partielle Altimporte. Ein Restore-Erfolg darf erst angezeigt werden, wenn alle im Payload enthaltenen unterstützten Bereiche committed oder die Gesamtoperation mit Fehler abgebrochen wurde. Vor Export und nach Parse prüft ein struktureller Leakage-Guard rekursiv, dass Readiness-Datensätze keine verbotenen Felder oder Holdout-Texte enthalten; ein Verstoß bricht die Operation ab.

Da Queue/Outbox absichtlich nicht im Backup liegen, erzeugt der Restore für jedes unbestätigte Proposal, jeden Pending-Reset und jeden bereits abgegebenen Lab-/Practice-Attempt ohne serverbestätigenden Receipt einen `RestoreReconciliationCandidate`, aber **noch keine** sendbare Operation. Nach passender Authentisierung läuft zwingend `reconcileRestoredSyncIntent(profileId)`: (1) Auth-Owner und gegebenenfalls Personenbindung prüfen, (2) vollständigen Server-Bootstrap anwenden, (3) Record-IDs und kanonische Hashes gegen Accepted-/Rejected-/Receipt-/Epoch-Stand vergleichen, (4) zuerst genau einen fehlenden v2-Reset, danach nur noch epochkompatible Proposals und Qualification-Requests idempotent in Outbox/Queue rekonstruieren und (5) Push plus erneuten Pull ausführen. Idempotency-Key ist die ursprüngliche Record-ID, der Payload wird ausschließlich aus dem eingefrorenen Restore-Record neu gebaut. Ein bereits serverbekannter Record wird `confirmed`, ein alter Epochstand `superseded`, ein falscher Owner/Hash `quarantined`; nichts wird unter dem gerade zufällig aktiven Profil gesendet. Kandidatstatus und rekonstruierte Outbox committen atomar. Damit führt Offline-Erzeugung → Backup → Restore → Auth höchstens einmal zur ursprünglichen Mutation, ohne die Sicherheitsentscheidung des Backups zu vertrauen.

## 17. Sync- und Konfliktregeln

AssessmentEvents werden bereits ab Phase 2 append-only synchronisiert. Der übrige **Readiness-Sync ist Pflichtbestandteil von Phase 5**: serverseitige Form-Leases, ExamItemExposure, ExamAttempts, relevante Lab-Nachweise und Lifecycle-Bestätigung sowie Vollständigkeitsbestätigung der AssessmentEvents. Ohne bestätigten Serverstand bleibt `examReady` gesperrt. Phase 7 synchronisiert optional zusätzlich Unit-, Video- und allgemeine Komfortzustände.

```ts
type LegacySyncOperationType =
  | 'review'
  | 'review.undo'
  | 'card.create'
  | 'card.update'
  | 'card.delete'
  | 'card.schedule.forceTomorrow'
  | 'deck.create'
  | 'deck.delete'
  | 'shuffleCollection.upsert'
  | 'shuffleCollection.delete'
  | 'videoNote.upsert'
  | 'videoNote.delete'
  | 'progress.reset'

type NewSyncOperationType =
  | 'assessment.event'
  | 'assessment.attempt.qualify'
  | 'assessment.attempt.invalidate.request'
  | 'readiness.progress'
  | 'readiness.submit'
  | 'readiness.abandon'

type SyncOperationType = LegacySyncOperationType | NewSyncOperationType

interface SyncQueueRecordV2 {
  id?: number
  opId: string
  type: SyncOperationType
  payload: string // kanonisch serialisiertes JSON; Decoder validiert nach type
  profileId: string | null // null nur für ungeklärte v1-Legacyzeilen
  evidenceEpoch?: number
  personId?: string
  identityBindingId?: string
  canonicalPayloadHash: string
  idempotencyKey: string
  state: 'pending' | 'inFlight' | 'deferred-auth' | 'dead-letter'
  createdAt: number
  updatedAt: number
  retries: number
  nextRetryAt: number
  inFlightAt?: number
  sendLeaseId?: string
  sendLeaseExpiresAt?: number
  lastErrorCode?: string
}

interface SyncOutboxRecordV2 {
  opId: string
  type: SyncOperationType
  payload: string
  profileId: string | null
  evidenceEpoch?: number
  personId?: string
  identityBindingId?: string
  canonicalPayloadHash: string
  idempotencyKey: string
  createdAt: number
}

interface LegacyProgressResetWirePayloadV1 {
  timestamp: number
  due: number
  dueAt: number
}

type DecodedLegacyProgressResetOperation = {
  operationType: 'progress.reset'
  profileId: string
  evidenceEpoch?: never
  personId?: never
  identityBindingId?: never
  payload: {
    schemaVersion: 1
    original: LegacyProgressResetWirePayloadV1
  }
}

type DecodedNewSyncOperation =
  | {
      operationType: 'assessment.event'
      profileId: string
      evidenceEpoch: number
      personId?: never
      identityBindingId?: never
      payload: { entry: AssessmentEventProposal | AssessmentReversalRequest }
    }
  | {
      operationType: 'assessment.attempt.qualify'
      profileId: string
      evidenceEpoch: number
      personId?: never
      identityBindingId?: never
      payload: {
        sourceAttemptId: string
        attemptKind: AssessmentQualificationReceipt['attemptKind']
        attemptContentHash: string
        answers: Record<string, unknown>
      }
    }
  | {
      operationType: 'assessment.attempt.invalidate.request'
      profileId: string
      evidenceEpoch: number
      personId?: never
      identityBindingId?: never
      payload: {
        sourceAttemptId: string
        requestedReason: AssessmentAttemptInvalidation['reason']
        observedAt: number
        evidence: {
          clockAnomaly?: boolean
          leaseId?: string
          relatedAckIds?: string[]
          diagnosticCode?: string
        }
      }
    }
  | {
      operationType: 'progress.reset'
      profileId: string
      evidenceEpoch: number
      personId?: never
      identityBindingId?: never
      payload: {
        schemaVersion: 2
        entry: ProfileResetRequest
      }
    }
  | {
      operationType: 'readiness.progress'
      profileId: string
      evidenceEpoch: number
      personId: string
      identityBindingId: string
      payload: {
        attemptId: string
        expectedRevision: number
        answersByItemId: Record<string, unknown>
        flagsByItemId: Record<string, boolean>
        timeMsByItemId: Record<string, number>
      }
    }
  | {
      operationType: 'readiness.submit'
      profileId: string
      evidenceEpoch: number
      personId: string
      identityBindingId: string
      payload: {
        attemptId: string
        expectedRevision: number
        answersByItemId: Record<string, unknown>
        flagsByItemId: Record<string, boolean>
        timeMsByItemId: Record<string, number>
        answerStateHash: string
        lastAcknowledgedProgressRevision?: number
      }
    }
  | {
      operationType: 'readiness.abandon'
      profileId: string
      evidenceEpoch: number
      personId: string
      identityBindingId: string
      payload: { attemptId: string; expectedRevision: number }
    }

type DecodedSyncOperation = DecodedLegacyProgressResetOperation | DecodedNewSyncOperation

type ServerSyncRecord =
  | { recordType: 'assessment.accepted-event'; record: AcceptedAssessmentEvent }
  | { recordType: 'assessment.reversal'; record: AssessmentEventReversal }
  | { recordType: 'assessment.acceptance-receipt'; record: AssessmentAcceptanceReceipt }
  | { recordType: 'assessment.reversal-receipt'; record: AssessmentReversalReceipt }
  | { recordType: 'assessment.qualification'; record: AssessmentAttemptQualification }
  | { recordType: 'assessment.qualification-receipt'; record: AssessmentQualificationReceipt }
  | { recordType: 'assessment.invalidation'; record: AssessmentAttemptInvalidation }
  | { recordType: 'assessment.invalidation-receipt'; record: AssessmentInvalidationReceipt }
  | { recordType: 'profile.reset-accepted'; record: AssessmentProfileReset }
  | { recordType: 'profile.reset-receipt'; record: ProfileResetReceipt }
  | { recordType: 'profile.learning-state'; record: ProfileLearningState }
  | { recordType: 'exam.exposure'; record: ExamItemExposure }
  | { recordType: 'exam.exposure-receipt'; record: ExposureCommitReceipt }
  | { recordType: 'exam.readiness-score-receipt'; record: ReadinessScoreReceipt }
  | { recordType: 'exam.readiness-history'; record: ReadinessAttemptBackupRecord }
  | { recordType: 'exam.readiness-authority-receipt'; record: ReadinessAuthorityReceipt }
  | { recordType: 'exam.plan'; record: LearnerExamPlan }
  | { recordType: 'exam.lifecycle-confirmation'; record: ExamLifecycleConfirmation }
  | { recordType: 'candidate.identity-assurance'; record: CandidateIdentityAssuranceReceipt }

interface ServerSyncBatchPayload {
  batchId: string
  profileId: string
  personId?: string
  fromCursor: string | null
  toCursor: string
  records: ServerSyncRecord[]
  generatedAt: number
}

type ServerSyncBatch = SignedEnvelope<ServerSyncBatchPayload>
```

Dies **erweitert** die heutige operation-log Queue und ersetzt sie nicht: alle bestehenden Card-/Deck-/Review-/Shuffle-/VideoNote-/`progress.reset`-Typen, JSON-Serialisierung, `opId`, Retry/Backoff, Background-Sync und Deckfilter bleiben kompatibel. Die separate `SyncQueueDB` erhält eine eigene atomare Migration v1→v2 mit den zusätzlichen Scope-/Hash-/Statefeldern; dabei wird `idempotencyKey = opId` gesetzt und der kanonische Hash aus dem geparsten **unveränderten** Legacy-Payload berechnet. Insbesondere wird ein altes `progress.reset`-JSON `{ timestamp, due, dueAt }` als `schemaVersion: 1` getaggt und über `DecodedLegacyProgressResetOperation` verarbeitet, nicht fälschlich als v2-`ProfileResetRequest` decodiert. Die Main-Dexie-`syncOutbox` wird in v22 zu `SyncOutboxRecordV2` migriert. Neue Enqueues und transactionale Outbox-Writes müssen `profileId` aus dem gespeicherten Owner-Scope kopieren; Readiness zusätzlich Person/Binding, alle Evidenzoperationen die Epoch.

Eine v1-Queue-/alte Outboxzeile ohne beweisbaren Owner erhält `profileId = null` und `deferred-auth`; sie wird **nie** dem beim Upgrade gerade aktiven Profil zugeschrieben. Nur eine eindeutige gespeicherte User-/OpId-Bindung oder eine explizite, auditierte Nutzerzuordnung darf sie freigeben. `drainTransactionalOutbox`, `flushSyncQueue`, Pending-Count, Wake/Retry und Clear bleiben API-kompatibel, arbeiten intern aber profilgefiltert. `clearSyncQueue(profileId)` löscht nur den autorisierten Scope; ein globales Clear verlangt eine gesonderte explizite „alle lokalen Profile“-Aktion und darf keine Server-Auditdaten löschen.

`inFlight` ist kein Dauerzustand: ein Sender beansprucht eine Zeile per CAS mit zufälliger `sendLeaseId`, `inFlightAt` und kurzer `sendLeaseExpiresAt`. Nur der Besitzer dieser Lease darf Erfolg/Retry committen. App-/Service-Worker-Start und jeder Flush setzen abgelaufene In-Flight-Leases mit erhöhtem Retryzähler und unverändertem Idempotency-Key auf `pending` zurück; eine noch gültige Lease wird nicht doppelt gesendet. Crash zwischen Servercommit und lokaler Bestätigung führt daher höchstens zu einem idempotenten Replay. Uhren werden für die lokale Lease konservativ geprüft, ein sehr alter/ungültiger Zeitwert gilt als abgelaufen.

Client-Requesttypen und Server-Pulltypen sind getrennt. `syncPull`/Bootstrap decodiert autoritative Antworten ausschließlich als `ServerSyncBatch`; bestehende Card-/Deck-Pulls behalten ihren bisherigen Decoder. Authority-Records umgehen bewusst den Selected-Deck-Filter, werden aber strikt gegen Batchprofil, Personenbindung, Epoch, Signatur und kanonischen Hash geprüft. Die gesamte Batch wird in einer lokalen Transaktion in Abhängigkeitsreihenfolge Receipt → Record → Profilprojektion angewendet. `toCursor` und Applied-Record-IDs committen **erst**, wenn jeder Recordtyp bekannt, validiert und persistiert ist. Unbekannter Typ, fehlender Resolver, Hashkonflikt, falscher Owner oder ungültige Signatur bricht die Batch ab, lässt den Cursor unverändert und zeigt einen fail-closed Syncfehler; nichts wird still übersprungen. Bootstrap verwendet dieselbe Union und Mergefunktion. Reset-Request und serverakzeptierter Reset sind verschiedene IDs/Recordtypen, daher wird kein angereicherter Payload als UUID-Konflikt missverstanden.

Outbox/Queue werden beim Erzeugen unveränderlich an Profil und Evidence-Epoch gebunden; Readiness-Operationen zusätzlich an Person und Identity-Binding. `sendOperation` darf niemals einfach den aktuell aktiven Auth-Header übernehmen: Vor Versand muss der verifizierte Token exakt zum gespeicherten Profil und — falls vorhanden — zur Personenbindung passen. Andernfalls bleibt die Zeile `deferred-auth` oder wird bei widerrufener/falscher Bindung sichtbar `dead-letter`; sie wird weder unter einem neuen Profil versandt noch beim Profilwechsel still gelöscht. Pull/Bootstrap filtert ebenfalls nach autorisiertem Profil/Person/Epoch und reicht jede neue Operation über den vollständigen Resolver. Ein Profilwechsel leert nur flüchtige Requests, nicht die persistente Queue.

`assessment.attempt.qualify` enthält den eingefrorenen Attempt-Hash und die Antworten, aber **keine** vom Client erfundenen `assessmentEventIds`; diese IDs entstehen erst beim kanonischen Serverscoring und kommen mit Qualification/Receipt über Response/Pull. `readiness.submit` friert den letzten lokalen Antwort-/Flag-/Zeitstand und seinen kanonischen Hash in derselben Transaktion wie `submitPending` ein; der Server vergleicht ihn mit dem letzten Progress-Ack bzw. übernimmt ihn als finalen nicht-qualifizierenden Offline-Stand. Ein bloßer Attempt-Verweis darf keine unbestätigten letzten Antworten verlieren. Der Client kann außerdem keine autoritative `AssessmentAttemptInvalidation` mit erfundenem Receipt erzeugen: Er sendet nur `assessment.attempt.invalidate.request` samt Beobachtung. Der Server entscheidet, schreibt Receipt und Invalidation-Ledgereintrag atomar; der fertige Record kommt ausschließlich über Response/Pull.

- Unit-/Videozustand: LWW auf `updatedAt` nur für gleichartige veränderliche Felder; `completed` darf nicht durch älteres `inProgress` zurückfallen.
- Recall-Läufe, AssessmentEvents und abgeschlossene Review-, Lab- und Examversuche: Versuchsmenge append-only per UUID mit Deduplizierung; laufende Versuche dürfen nach dokumentierter Merge-Regel fortgeschrieben werden.
- eingereichte Examversuche: immutable; Konflikt erzeugt Auditfehler statt stiller Überschreibung.
- Item-Exposition: monotone Vereinigungsmenge, niemals LWW-Löschung.
- Offline-Videoblobs bleiben geräteweit und unsynchronisiert.

Ein **Profilwechsel ist kein Datenreset**. `resetLocalStudyDataForProfileSwitch()` darf execution-bezogene `activeSessions`, Unit-Ausführungen oder offene Attempts nicht löschen. Es beendet nur flüchtige UI-Controller des alten Profils; danach werden ausschließlich die mit dem neuen `profileId` gespeicherten Sessions rehydriert. Beim Zurückwechseln ist der alte Stand exakt fortsetzbar.

Ein ausdrücklich bestätigter „Lernfortschritt zurücksetzen“-Vorgang besitzt dagegen eine profilbezogene, synchronisierte Reset-Transaktion. Sie liest `ProfileLearningState` mit `expectedRevision`, friert `schedulerReset.timestamp/due/dueAt` einmal ein, erhöht `evidenceEpoch` lokal exakt um eins, setzt `pendingResetRequestId`, erhöht `revision` und schreibt einen v2-`ProfileResetRequest` plus Outbox. In **derselben** Transaktion setzt sie für alle aktiven `profileCards` dieses Profils die vollständigen FSRS-/SM-2-Zustände mit der bestehenden puren `buildResetCardRecord`-Semantik auf „neu“, entfernt dessen Scheduler-Reviews bis zum Resetzeitpunkt, leert/rekonstruiert ausschließlich dessen `profileCardStats` und `profileDeckProgress`, beendet dessen `profileActiveSessions`, setzt Unit-/Video-/Recall-/Review-Aktivitätszustände zurück und markiert alle offenen Unit-/Review-/Lab-/Examversuche `abandoned`. Andere Profile und geräteweite Content-/Videoassets bleiben unverändert. Ein gleichzeitiges `recordReview` wird über denselben Profilmutex/DB-Write-Scope serialisiert und landet entweder vollständig vor dem Reset oder in der neuen Epoch danach.

Der Server prüft CAS/Epoch, erzeugt einen **separaten** `AssessmentProfileReset` mit eigener Event-ID, wirksamer Serverzeit, den kanonisch bestätigten Scheduler-Resetwerten, Receipt und Serversequenz; Pull setzt danach `lastResetEventId` und löscht nur die passende Pending-ID. Ein Remote-v2-Reset wendet dieselbe profilgescopte Karten-/Review-/Stats-/Progress-/Session-Wirkung an; Scheduleränderungen, die nach der serverseitigen wirksamen Resetzeit entstanden, werden nicht per LWW zurückgedreht. Dadurch kollidiert die lokale Request-ID nie per Hash mit einem serverangereicherten Record. Epoch, Revision und Server-Watermark sind monoton; konkurrierende Resets werden neu geladen und niemals per LWW zurückgesetzt. Neue Accepted Events tragen die neue Epoch; alte oder verspätet synchronisierte Operationen mit einer früheren Epoch bleiben auditierbar, zählen aber nie wieder für Mastery/Readiness.

Ein noch aus v1 wartendes `progress.reset { timestamp, due, dueAt }` behält dagegen exakt seine historische Wirkung: nach eindeutiger Owner-Zuordnung setzt es nur Karten dieses Profils mit `updatedAt <= timestamp` über `buildResetCardRecord` zurück, löscht dessen Reviews bis zu diesem Zeitpunkt, erneuert dessen Stats/DeckProgress und beendet dessen damalige Sessions. Es erzeugt **keine** nachträgliche Evidence-Epoch und darf neuere Schedulerarbeit nicht löschen. Neue UI-Resets erzeugen ausschließlich Schema v2. Eingereichte Attempts, Accepted-/Qualification-/Invalidation-/Reset-Ledger, `ExamItemExposure`, Leases, Receipts und personenweite Holdout-Historie werden bei beiden Versionen **niemals gelöscht oder auf eine neue Epoch umgeschrieben**. So bleibt die alte Queue decodierbar und ein neuer Reset kann Lernaktivität neu beginnen lassen, ohne Audit oder versiegelte Formen erneut „ungesehen“ zu machen.

## 18. UI und Informationsarchitektur

Das Dashboard-Modul zeigt:

1. große aktive oder höchstpriorisierte Unit-Kachel,
2. maximal etwa fünf kompakte Zeilen mit Begründung,
3. Sheet „Alle Lerneinheiten“ mit Domain-/Objective-Gruppierung, Filtern und Detailansicht.

Jede Empfehlung hat einen maschinenlesbaren und lokalisierten `reason`, zum Beispiel:

- `active_execution`
- `scheduler_due`
- `unresolved_error_retest`
- `next_course_in_sequence`
- `objective_practice_gap`
- `scheduled_holdout_mock`
- `readiness_no_go`

Aktivität, Evidenz und Readiness werden separat beschriftet. „Abgeschlossen“ darf visuell nicht wie „beherrscht“ wirken. Coverage zeigt konkrete Lücken und Stichprobengrößen, nicht nur grüne Ressourcenzähler.

Exam verwendet eine eigene `ExamView`. Lab-Units verlinken tief auf `LabsView`/`LabScenarioView`. Mobile und Desktop benötigen Tastatursteuerung, sichtbaren Fokus, Screenreader-Labels, ausreichenden Kontrast und keinen horizontalen Overflow.

## 19. Implementierungsphasen und Abhängigkeiten

### Phase 0 — Content-/Exam-Baseline

Blockiert alle Implementierungsphasen:

- aktuellen Source-Snapshot und manuellen Diff-Prozess etablieren,
- vollständigen Leaf-/Akronym-Crosswalk erzeugen,
- Content-QA/Provenienz prüfen,
- 31 Fehlmappings, 4.2/4.9, dünne Objectives und Recall-Lücken entscheiden,
- PBQ-/Lab-Inventar fachlich klassifizieren,
- Pools trennen, mindestens drei disjunkte Holdout-Full-Formen einschließlich Reserve versiegeln und Replenishment-Prozess definieren,
- Baseline-Diagnostik, Sprache, Termin, Wochenbudget und Puffer dokumentieren.

### Phase 1 — Modell und Liste

- pure Builder, Coverage, Status und Ranking,
- per-Video Content-Map und Manifestvalidierung,
- pure Paketschritt-Ableitung,
- Kachel/Liste/Sheet mit getrennten Statusarten.

### Phase 2 — Profilfeste Persistenz

- Dexie v22,
- alle heutigen globalen Core-Lernstores per atomarer Owner-Migration auf profilgescopte Compound-Keys umstellen; Profilwechsel ist danach ein Scope-Wechsel ohne Clear,
- `profileLearningState`/Evidence-Epoch, Unit-State/Ausführungen und nichtdestruktiver Profilwechsel,
- Video-/Recall-Signale pro Profil und Video,
- versionierte Assessment-Proposals und serverakzeptierte Events für alle neuen Study-Einstiege,
- `assessment.event`/`assessment.attempt.qualify`/`assessment.attempt.invalidate.request` sowie das kompatibel versionierte `progress.reset` in geschlossenem Sync-Operation-Typ, Push, Pull/Bootstrap und Resolver sowie append-only Servertabelle, damit keine unbekannte Operation liegen bleibt,
- atomare Owner-Migration,
- Tageswechsel- und Resume-Korrektur,
- Backup/Restore einschließlich authentifiziertem Bootstrap-Reconcile für absichtlich nicht exportierte Queue-/Outbox-Intentionen.

### Phase 3 — Reviews und Evidenz

- vollständige Antwortstatistik,
- Scheduler-Eligibility und direkte Deckqueries,
- Reviewversuche, Error-Resolution, Tageskappe,
- phasen-/evidenzabhängiges Ranking und No-Go-Hinweis.

### Phase 4 — Labs/PBQ

- normalisierte Szenarien, stabile Schritte und Rubriken,
- Dexie v23,
- eigene Labversuche, Resume, Delayed Feedback und Remediation.

### Phase 5 — Exam/Readiness

- `ExamView`, versionierte Forms und Dexie v24,
- Practice-Diagnostic beim Einstieg und wöchentliche Neuplanung; Diagnostic zählt nie als Holdout,
- globaler Timer, Autosubmit, Navigation, Flags, Offline-Regel,
- disjunkte Holdouts, Exposition, Ergebnisaufschlüsselung,
- verpflichtender autoritativer Readiness-Lease/-Sync für Identitätsbindung, Exposition, Attempts, AssessmentEvents, Qualification/Invalidation, Receipts und Lifecycle; jede Operation besitzt Push- und Pull/Bootstrap-Vertrag,
- Mastery-/Readiness-Gates und Lifecycle-Prüfung.

### Phase 6 — Feinschliff

- `durationSec` aus Manifestgenerator,
- A11y/Mobile/Filter,
- Exam-Day-Checkliste.

### Phase 7 — optionaler Komfort-Sync

- Unit-/Videozustände und weitere nicht für Readiness erforderliche Komfortdaten nach §17.

## 20. Erwartete Dateien

Neu oder wesentlich zu ändern:

```text
card_pwa/src/utils/learningUnits.ts
card_pwa/src/utils/learningUnitRanking.ts
card_pwa/src/utils/examReadiness.ts
card_pwa/src/utils/examTimeline.ts
card_pwa/src/data/sy0701Requirements.ts
card_pwa/src/data/sy0701ContentMap.ts
card_pwa/src/data/practiceExamForms.ts
card_pwa/src/data/readinessBlueprintDescriptors.ts
card_pwa/src/db/index.ts
card_pwa/src/db/queries/profileCore.ts
card_pwa/src/db/queries/learningUnits.ts
card_pwa/src/db/queries/reviews.ts
card_pwa/src/db/queries/assessmentEvents.ts
card_pwa/src/db/queries/labAttempts.ts
card_pwa/src/db/queries/examAttempts.ts
card_pwa/src/db/queries/examExposure.ts
card_pwa/src/db/queries/readinessLeases.ts
card_pwa/src/db/queries/readinessTimingAcks.ts
card_pwa/src/db/queries/readinessReceipts.ts
card_pwa/src/db/queries/examLifecycleConfirmations.ts
card_pwa/src/services/studyCardOrdering.ts
card_pwa/src/services/studySessionPersistence.ts
card_pwa/src/hooks/useSessionPersistence.ts
card_pwa/src/services/syncCoordinator.ts
card_pwa/src/services/syncQueue.ts
card_pwa/src/services/syncPull.ts
card_pwa/src/utils/sync/operationResolver.ts
card_pwa/src/services/profileService.ts
card_pwa/src/services/restoreReconciliation.ts
card_pwa/src/services/signatureVerifier.ts
card_pwa/src/services/signingKeyRegistry.ts
card_pwa/src/services/readinessApi.ts
card_pwa/src/services/examPlanApi.ts
card_pwa/src/services/assessmentApi.ts
card_pwa/src/utils/examScoring.ts
card_pwa/src/utils/dbBackup.ts
card_pwa/src/utils/import/jsonBackupImporter.ts
card_pwa/src/components/ImportModal.tsx
card_pwa/src/services/learningStateMigration.ts
card_pwa/src/hooks/home/useLearningUnits.ts
card_pwa/src/hooks/useMesserVideoProgress.ts
card_pwa/src/hooks/useVideoRecallScores.ts
card_pwa/src/contexts/SettingsContext.tsx
card_pwa/src/components/SettingsModal.tsx
card_pwa/src/components/videos/VideoRecallCheck.tsx
card_pwa/src/components/videos/VideosView.tsx
card_pwa/src/components/videos/MesserVideoPlayer.tsx
card_pwa/src/components/home/HomeLearningUnitList.tsx
card_pwa/src/components/home/LearningUnitSheet.tsx
card_pwa/src/components/exam/ExamView.tsx
card_pwa/src/components/labs/LabsView.tsx
card_pwa/src/components/labs/LabScenarioView.tsx
card_pwa/src/data/labScenarios.ts
card_pwa/src/data/labBlueprints.ts
card_pwa/src/utils/labProgress.ts
card_pwa/src/components/StudyView.tsx
card_pwa/src/components/HomeView.tsx
card_pwa/src/App.tsx
card_pwa/src/utils/cardVariant.ts
card_pwa/src/utils/cardTextParser.ts
card_pwa/vitest.config.ts
card_pwa/package.json
card_pwa/content/sy0-701/source/
card_pwa/content/sy0-701/generated/
card_pwa/scripts/sy0701/
card-sync-server/server/sync/operations.py
card-sync-server/server/db/schema.py
card-sync-server/server/routes/sync.py
card-sync-server/server/routes/readiness.py
card-sync-server/server/routes/exam_plans.py
card-sync-server/server/routes/signing_keys.py
card-sync-server/server/routes/assessments.py
card-sync-server/server/routes/candidate_identity.py
card-sync-server/server/services/candidate_identity.py
card-sync-server/server/services/exam_plans.py
card-sync-server/server/services/exam_lifecycle.py
card-sync-server/server/services/signing.py
card-sync-server/server/services/readiness_leases.py
card-sync-server/server/services/readiness_attempts.py
card-sync-server/server/services/readiness_scoring.py
card-sync-server/server/services/assessment_qualification.py
card-sync-server/server/services/assessment_acceptance.py
card-sync-server/server/content/private_holdout_store.py
card-sync-server/server/admin/holdout_import.py
```

Source-Metadaten und eigene/paraphrasierte Crosswalk-Daten liegen verbindlich unter `card_pwa/content/sy0-701/source/`; generierte öffentliche Audit-/Runtime-Manifeste unter `card_pwa/content/sy0-701/generated/`; Generatoren unter `card_pwa/scripts/sy0701/`. `npm run content:sy0701:validate` erzeugt/validiert die öffentlichen Artefakte aus §23.1 und bricht bei Gatefehlern ab. Holdout-Dateien enthalten dort ausschließlich IDs, Hashes und Deskriptoren, niemals Prompt/Lösung. Private Holdout-Inhalte werden über `server/admin/holdout_import.py`, getrennte Admin-Authentisierung und einen nicht ins Client-Repo eingecheckten Eingang in `private_holdout_store.py` geladen; der Import validiert QA, Form-/Item-/Calibration-Versionen, Hashes, Signatur und Disjunktheit atomar, bevor eine Form reservierbar wird. Generierte öffentliche Dateien werden versioniert, aber nicht manuell editiert. Falls die Implementierung einen Pfad aus zwingenden Buildgründen ändert, muss sie diesen Abschnitt und den Package-Script im selben Diff aktualisieren.

## 21. Teststrategie

### 21.1 Pure Unit-Tests

- Manifest: genau 120 eindeutige Kursindizes 002–121, eindeutige Unit-IDs, nur 28 bekannte Objectives.
- Content-Map: keine fremden Zieldeck-/Objective-Items, keine Holdout-IDs, bekannte 31 Abweichungen nach Remediation null.
- Mapping-Audit: 375 erwartete aktive M-IDs genau einmal vorhanden; normalisierte Videotitel eindeutig; insbesondere die Kandidatenmengen der Objectives 2.3 und 2.4 bleiben pro Video disjunkt.
- Coverage: jeder offizielle Leaf-/Akronym-Eintrag vorhanden; fehlendes Asset/Assessment bleibt Gap.
- Unit-Schritte: optional fehlende Schritte, eingefrorene IDs, kein Tagesreset.
- Recall-Auswahl: `recallCheckSize`, Seed/Reihenfolge und tatsächliche Recall-Card-Ausschlüsse bleiben über Remount/Reload identisch.
- Recall-Bindung: nur Run derselben Execution nach Start mit exakt eingefrorenen Frage-IDs/-Versionen schließt den Schritt; frühere, freie und Legacy-Runs nicht.
- Timeline: `null`, 22, 21, 11, 10, 4, 3, 0 und negative Tage; Präzedenz final vor exam vor deepening.
- Ranking: aktive Unit, Review-Tageskappe, alle Phasen, kleine Evidenz und No-Go.
- Ranking/Reservierung: zwei aktive Units desselben Objectives, deterministische Primärkachel und Union aller reservierten IDs.
- Antwortstatistik: Nenner, unanswered, letzte Antwort, gelöste/ungelöste Fehler, Recency und Mehrfach-Exposition.
- Assessment-Autorität: gefälschte Client-Punkte/Richtigkeit/Mappings/Eligibility/Zeit/Session/Epoch werden ignoriert oder abgewiesen; Server scorert Rohantwort gegen kanonische Version, self-rated bleibt nicht masteryfähig und nur rechtzeitig serverempfangene Proposals eines gültigen Time-Receipts zählen Spacing; Receipt-Replay über Profil/Epoch/Gerät oder nach Ablauf scheitert.
- Assessment-Undo: echte Review-/Undo-Operation, Tokenhash und Proposal sind exakt gebunden; Undo-vor-Proposal und Proposal-vor-Undo ergeben dieselbe leere Evidenz, Double-/Cross-Session-/Lab-/Exam-Reversal scheitert.
- Review: Überhang nach Kappe bleibt `reviewDue`; Corrective-Retest-Abstand und wiederkehrende Zyklen.
- Review-Abbruch: Attempt wird `abandoned`, Reservierung gelöst, unerledigte Karten bleiben Kandidaten; Profil-Mismatch wird abgewiesen.
- Profil-Queries: `listDirectDeckCards`/`listDueReviewCardIds` lehnen falschen Owner ab und verwerfen ein Ergebnis bei Profilwechsel-Race.
- Exam-Blueprint: exakt 90 Full-Items, Domainrundung, PBQ-Mindestzahl/-Punkte, alle Objectives, Aufgabenverb-/Szenario-/Difficulty-Ziele und `insufficientPool`.
- Exam-Form: `selectionSeed` wird unverändert Form→Attempt kopiert; Purpose/Pool-Kombinationen und eine einmalige profilgebundene Diagnostic-Baseline werden validiert; `contentFamilyId` ist in QA→Presentation→Exposure→Backup identisch.
- Exam-Controls/Scoring: MC-single/-multiple und Scenario-multi-select erzwingen gültige Min-/Maxgrenzen und A11y-Controltyp; die diskriminierte Scoring-Union lehnt Kind-/Key-Mismatch ab, und gemeinsame Fixtures beweisen exakte MC-/Matching-/Ordering-/Scenario-Punkte inklusive Rundungsgrenzen.
- Baseline-Bindung: abweichende/nicht angebotene Sprache, Exam-Code, Snapshot, Termin, fehlende Buchungsbestätigung sowie >7 Tage bzw. in Final >24 Stunden alte Lifecycle-Bestätigung brechen Form-/Attempt-Erstellung ab.
- Mastery/Readiness: jedes Gate separat und kombiniert; insbesondere jedes Leaf-/Akronym-/Mehrdeutigkeits-/QA-/Provenienz-/Lizenz-/Mapping-/Critical-Definition-/Kalibrierungs-/Receipt-/Watermark-Gate negativ testen; keine doppelte Evidenz aus unmittelbarer Wiederholung.

### 21.2 Dexie-/Migrationstests

`fake-indexeddb` ist als neue Dev-Dependency ausdrücklich erlaubt; es ist keine Runtime-Abhängigkeit. Alternativ müssen die Tests in einem echten Browser laufen.

Bei Nutzung von `fake-indexeddb` lädt das Testsetup `fake-indexeddb/auto`, bevor `db/index.ts` importiert wird.

- v21→v22 Owner-Migration in einer Transaktion,
- v21→v22 kopiert Decks, vollständige Karten-/Schedulerzustände, Reviews, Stats, DeckProgress, Sessions und Shuffle-Collections exakt in Owner-Compound-Keys; Hash-/Countfehler rollt alles zurück und Runtime liest danach nur die Scoped Stores,
- idempotenter zweiter Lauf,
- Migration mit Fehler rollt vollständig zurück,
- getrennte Marker `legacy-learning-v1`/`legacy-labs-v1` verwenden denselben Owner,
- zweites Profil erhält keine Legacy-Daten,
- Legacy-Reviews werden nur als `LegacyAssessmentHint` des Owners importiert,
- mehrdeutige watched-Signale schließen keine Videos ab,
- einzelne Recall-Runs bleiben per UUID erhalten und Query liefert letzte fünf,
- Reload und Tageswechsel behalten Ausführung/Startzeit,
- zwei execution-bezogene Study-Sessions kollidieren nicht,
- Profilwechsel löscht keine v6-Session; Rückwechsel rehydriert die alte Execution,
- separate SyncQueueDB v1→v2 und Main-DB-Outboxmigration erhalten alle Legacy-Operationen/Retrytermine; `progress.reset`-v1 bleibt mit `{timestamp,due,dueAt}` decodierbar; ownerlose Zeilen bleiben `deferred-auth`, Drain/Flush/Count/Clear arbeiten profilgefiltert und idempotent,
- Queue-Crash vor/nach Servercommit: abgelaufene Send-Lease wird reclaimed, gültige nicht doppelt versandt und Replay behält denselben Idempotency-Key,
- v2-Lokal-/Remote-Reset setzt nur den betroffenen Profil-Scheduler samt Reviews/Stats/DeckProgress/Sessions zurück, erhöht die Evidence-Epoch und bricht offene Zustände ab; v1 bewahrt LWW-Zeit/Due/DueAt ohne neue Epoch, verspäteter Pull/Restore reaktiviert nichts und Exposure/Lease-Audit bleibt erhalten,
- Backup/Restore jeder backupfähigen neuen Tabelle einschließlich monotoner `profileLearningState.evidenceEpoch`; absichtlich ausgeschlossene Outbox-/offene Readiness-/Timing-Ack-Tabellen bleiben nachweislich draußen,
- serialisiertes v5-Backup enthält für Readiness weder Prompt/Option/Control/Scoring/Rubrik/rohe Antwort noch offene Attempts; Restore erzeugt nur redaktierte Historie,
- gleiche UUID mit abweichendem kanonischem Payload bei Attempt/Ledger/Exposure/Receipt bricht Restore als Auditfehler ab; signierte Imports zählen erst nach Server-Revalidierung,
- v1–v5 über zentralen ImportModal-Orchestrator; enthaltene neue Arrays werden nicht still übersprungen,
- Offline-Proposal/Pending-Reset/submittierter Practice-/Lab-Attempt → Backup → Restore erzeugt vor Auth keinen Send; nach richtigem Bootstrap genau ein idempotentes Re-Enqueue, bei bereits bekanntem Serverrecord keines, bei falschem Profil/Hash Quarantäne und bei alter Epoch `superseded`,
- v23/v24 UUID-Deduplizierung und Immutabilität eingereichter Examversuche.

### 21.3 Komponenten-/Integrationstests

- leer/laden/offline/aktiv/fortsetzen in Kachel, Liste und Sheet,
- Profilwechsel ohne Cross-Completion oder Verlust von Kartenfälligkeit, Reviews, Stats, DeckProgress und offenen Sessions; schneller Wechsel während asynchroner Query verwirft das Ergebnis, Offline-Rückwechsel rehydriert den alten Scope ohne Clear/Serverbedarf,
- zentraler Daily-Quest-/Shortcut-Ausschluss,
- Course: Player-Ende/manueller Override → Recall → Cards → Reload → Done; Öffnen/Seek allein reicht nicht,
- Review: Due/Error-Auswahl, Tageskappe, spätere erneute Fälligkeit,
- Lab: CAS-Autosave, Resume, Abandon, Teilpunkte, idempotentes Submit und Delayed Feedback,
- Lab: laufender Versuch rendert/scort nach Content-Update weiter aus dem eingefrorenen Szenario-/Rubrik-Snapshot; Profil-Mismatch wird abgewiesen,
- Exam: CAS-Autosave/Resume/Abandon, globaler Timer, Navigation, Flag, Unanswered, Deadline-Lock/Autosubmit, Offline-Resume und keine Lösung vor Submit,
- Readiness: atomarer Online-Lease erzeugt exakt einen Attempt/Server-Timer sowie vollständige Exposure-Records/Receipt; lokale Materialisierung committtet Lease/Attempt/Exposure atomar, paralleler Zweitstart und Payload-Replay werden abgelehnt, Reviewer/Kandidat ausgeschlossen, gestartete/abgebrochene Form verbraucht, Reserveerschöpfung sperrt, verpasster Heartbeat wird nur `practice-only`,
- Exposure-Lineage: neue Itemversion/ID mit derselben oder nahe duplizierter Content-Familie bleibt personenweit exponiert; Profil-/Gerätewechsel und Versionsbump stellen `unseen` nie wieder her.
- Readiness-Timing: `serverStartedAt < deadlineAt < leaseExpiresAt = signature.expiresAt`, exakte Deadline-/Submit-Grace-Grenzen, Erstmaterialisierung, Netzverlust, Browser-Background, Reload, doppelter Heartbeat/Lock-Ack und Replay; Progress allein verlängert Timing nie, Eligibility kann nur irreversibel zu `practice-only` fallen und Deadline-Lock ist serverzeitbasiert/idempotent.
- Sealed path: Lease-Request kennt keine Form-/Person-ID und keine vollen Autoritätsobjekte; Response liefert erst nach Exposure-/Attempt-Commit signierte Form/Snapshots ohne Scoring; Client kann keine Readiness-Form bauen oder Start/Deadline neu setzen,
- Hash-Leakage: öffentliche Descriptoren, Lease und Backup enthalten nur den scoringfreien `presentationHash`; Varianten-Bruteforce gegen MC-/Rubriklösungen findet kein Answer-Key-Commitment, private Full-Hashes/HMACs erscheinen nie in Bundle/Log/Response.
- Readiness-Authority: manipulierte lokale Booleans/Evidenz reichen nie; nur gültiger profil-/person-/assurance-/epoch-/plan-/exam-code-/datum-/sprache-/lifecycle-/booking-/versions-/watermarkgebundener Receipt zeigt `examReady`; jede aktive Plan-/Confirmation-Änderung invalidiert den alten Receipt sofort,
- Signaturen: kanonischer Roundtrip sowie Tamper, falscher Recordtyp/Profil/Binding/Epoch, Ablauf, unbekannter/widerrufener Key, Rotation und falsche Canonicalization-Version schlagen geschlossen fehl; Key-Route, Root-Prüfung, Cache-Ablauf und Revocation-Refresh sind integriert getestet.
- Plan/Lifecycle: Draft-Update und Confirm-CAS, Person-ID-Spoofing, falsche Diagnostic-ID, offizieller Bookability-Refresh (`bookable`/`unknown`/Fehler) sowie getrennte Booking-Attestation; Lease mit alter/fremder Plan-/Confirmation-Version wird abgewiesen.
- Sync-Roundtrip: `assessment.event`, Qualification, Invalidation-Request → autoritativer Invalidation-Record und Profile-Reset laufen durch `syncQueue` → Server → `syncPull`/Resolver und werden beim Bootstrap korrekt angewandt,
- Sync-Profilbindung: pending Operation von Profil A → Wechsel zu B führt weder Versand mit B-Token noch Löschung; nach passender A-Authentisierung wird exakt einmal gesendet, falsche Personenbindung landet sichtbar im Dead-Letter.
- Assessment-Ledger: Review+Event atomar, Lab-/Exam-Submit erzeugt versionierte Events, Legacy/alte Version zählt nicht für Mastery,
- Attempt-Qualifikation/-Invalidierung: pending Events zählen nicht; Server-Receipt qualifiziert, spätere Invalidation entfernt den gesamten Versuch; Profil-Mismatch wird abgewiesen,
- Kartenreservierung: card-backed Exam-Snapshots liefern `cardId`, reine Szenario-`itemId`s nie; permanente Readiness-Card-IDs bleiben ausgeschlossen,
- Holdout erscheint an keinem anderen Einstieg,
- Tastatur, Fokus, Screenreader-Labels und mobile Breite.

### 21.4 Content-/Pilotprüfungen

Diese Gates sind nicht durch Unit-Tests allein beweisbar:

- manueller Objective-Diff und fachliche Crosswalk-Freigabe,
- Quellen-/Lizenz-/Brain-Dump-Review,
- Expertenreview von Lösungen, Distraktoren, Rubriken und Übersetzungen,
- Leakage-/Duplikat-/Antwortpositions-Report,
- Pilotlauf zur Kalibrierung der internen Mastery-/Readiness-Schwellen,
- Prüfung in der tatsächlich gebuchten Sprache.

Kalibrierungs-Exit: unabhängiger Fachreview bestanden, Blueprint vollständig, keine ungeklärten Ausreißeritems, dokumentierter Schwierigkeitsspiegel, definierte und erfüllte Formäquivalenz-Toleranzen, versionierter Benchmark-/Pilotbericht und formale Freigabe durch eine Person, die nicht der Kandidat ist. Unzureichende Stichproben werden als solche markiert und blockieren `examReady`, statt Scheingenauigkeit zu erzeugen.

## 22. Risiken und Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|---|---|
| Kursabschluss wird als Prüfungsreife missverstanden | drei getrennte Statusmodelle und harte Readiness-Gates |
| veraltete Objectives/Lifecycle | versionierter Snapshot, Hash-Diff und wiederholte Buchbarkeitsprüfung |
| Objective-weite Zuordnung vermischt mehrere Videos | explizite IDs pro Video und Mapping-Audit |
| kleine/dünne Pools erzeugen falsche Sicherheit | `insufficientEvidence`, Phase-0-Remediation, keine stille Schwellenabsenkung |
| Übungsfragen leaken in Holdouts | unveränderliche Poolzuordnung, Expositionsledger, automatischer Leakage-Test |
| globale Legacy-Daten vermischen Profile | einmalige Owner-Migration, globaler Marker, atomare Transaktion |
| Exam verändert Scheduler/Gamification | eigene Attempt-Tabelle, Delayed Feedback, explizite Remediation |
| Prozentscore wird als 750/900 ausgegeben | klare Trainingsmetrik, keine offizielle Umrechnung |
| PBQ-Abdeckung besteht nur aus Matching | Szenario-Matrix, Rubriken und mehrere Anwendungstypen |
| Sync überschreibt Versuche | UUID/append-only; Submitted immutable; Exposure monotone union |
| Termin ist nach Retirement/anderer Exam-Code | Lifecycle-Gate blockiert `examReady` |

## 23. Technische Spezifikation und Definition of Done

Dieser Abschnitt ist für die Implementierung bindend.

### 23.0 Pflichtlektüre und unveränderliche Regeln

Vor Codeänderungen lesen:

- `useTodayPackage.ts`, `todayPackage.ts`, `HomeView.tsx`, `App.tsx`
- `useMesserVideoProgress.ts`, `useVideoRecallScores.ts`, `VideoRecallCheck.tsx`
- `localVideoManifest.ts`, `messerVideoQuestionMap.ts`, `messerTranscriptQuestions.ts`
- `securityDeckHierarchy.ts`, `studyCardOrdering.ts`
- Dexie-Schema und Queries für Karten, Reviews, Sessions sowie `dbBackup`
- `labScenarios.ts`, `labBlueprints.ts`, `cardVariant.ts`, Karten-Textparser und `pbqScoring.ts`
- Settings/Profil-/Sync-Code und bestehende Tests
- Phase-0-Crosswalk, QA-Report, Mapping-Audit und Poolmanifest

Regeln:

1. Keine Phase 1 vor bestandenem Phase-0-Content-Gate.
2. Keine gesamte Objective-Deckliste als Kartenpayload einer Video-Unit.
3. Keine Readiness-ID außerhalb der zugehörigen versiegelten Examform.
4. Kein Lab-/Exam-Submit über `recordReview`; keine XP während des Versuchs.
5. FSRS/SM-2-Formeln bleiben unverändert; Due-Eligibility wird wiederverwendet, nicht dupliziert.
6. Jede profilbezogene Query verlangt `profileId` explizit.
7. Neue dynamische Auswahl wird als Ausführung eingefroren.
8. Tageswechsel darf eine aktive Ausführung nicht neu starten.
9. Exam-Code, Dokumentrevision und Content-Version werden in Readiness-/Examdaten mitgeführt.
10. Keine neue Runtime-Abhängigkeit; `fake-indexeddb` ist dev-only zulässig.
11. Jede Attempt-Mutation verlangt `profileId` und verifiziert es gegen den gespeicherten Owner; UI-Aktionen verlangen zusätzlich das aktive Profil, Hintergrund-Autosubmit arbeitet explizit im gespeicherten Owner-Scope. Serverseitig gilt der authentifizierte Profil-Scope.
12. Jeder neue profilbezogene Lern-/Attempt-Datensatz kopiert die aktuelle `evidenceEpoch` aus `profileLearningState`; ein Requestwert wird gegen diesen Stand geprüft und darf ihn nicht festlegen. Ältere Epochs bleiben Historie und können keine aktuelle Aktivität oder Evidenz erfüllen.

### 23.1 Phase 0 – erzeugte Artefakte

Pflichtartefakte:

```text
exam-source-snapshot.json
sy0-701-requirements.json
sy0-701-acronyms.json
content-qa-report.json
video-content-map.json
pbq-lab-coverage.json
content-pools.json
holdout-leakage-report.json
historical-exposure-report.json
calibration-report.json
```

Jedes Artefakt enthält Schema-/Content-Version und Erstellzeit. Generatoren müssen bei fehlenden/kollidierenden IDs, unzulässigen exakten Duplikaten, unbekannten Objectives, ungeklärten 31 Mappingfehlern, nicht freigegebenen oder möglicherweise historisch exponierten Holdout-Inhalten, Kandidat=Autor/Reviewer, unzureichender Reserve, fehlender Kalibrierung oder Leakage mit Exitcode ungleich null abbrechen. Mehrdeutige Akronyme mit verschiedenen Bedeutungen sind ausdrücklich kein Duplikatfehler.

`sy0-701-requirements.json` implementiert `ExamRequirementsManifest` und enthält damit Requirements **und** Critical-Error-Definitionen in derselben Version. Der Validator verlangt eindeutige Error-Class-IDs, exakt ein existierendes Requirement je Definition, vollständige Rückreferenzen, gültige Triggerregeln und auflösbare Spacing-/Praxisregeln; dangling IDs oder eine als kritisch markierte Requirement ohne Definition blockieren Phase 1 und `examReady`.

### 23.2 Phase 1 – Funktionsverträge

```ts
function buildCourseUnits(input: {
  videos: LocalVideoMeta[]
  contentMapByVideoIndex: ReadonlyMap<number, VideoContentMapEntry>
  definitionVersion: string
}): LearningUnitDefinition[]

function buildVideoCardIndex(input: {
  catalog: readonly LocalVideoMeta[]
  cards: readonly Card[]
  videoTitleByQuestionId: Readonly<Record<string, string>>
}): VideoCardIndex

function selectRecallQuestionIds(input: {
  candidateQuestionIds: readonly string[]
  recallCardIdByQuestionId: ReadonlyMap<string, string>
  recallCheckSize: number
  selectionSeed: string
}): {
  selectedQuestionIds: string[]
  selectedRecallCardIds: string[]
}

function selectCourseCardIds(input: {
  candidateCards: readonly Card[]
  excludedCardIds: ReadonlySet<string>
  selectedRecallCardIds: ReadonlySet<string>
  cardLimit: number
  now: number
  nextDayStartsAt: number
  learnAheadMinutes: number
  algorithm: 'fsrs' | 'sm2'
  runSeed: string
}): string[]

function createCourseExecution(input: {
  executionId: string
  profileId: string
  evidenceEpoch: number
  definition: LearningUnitDefinition
  content: VideoContentMapEntry
  selectedCardIds: string[]
  selectedRecallQuestionIds: string[]
  selectedRecallCardIds: string[]
  recallSeed: string
  recallQuestionVersionsById: ReadonlyMap<string, string>
  sourceSnapshotId: string
  contentManifestVersion: string
  contentVersionsByCardId: ReadonlyMap<string, string>
  now: number
}): LearningUnitExecution

function computeCourseStepState(input: {
  execution: LearningUnitExecution
  videoProgress?: VideoProgressRecord
  recallRuns: VideoRecallRun[]
  reviewedCardIdsSinceStart: ReadonlySet<string>
}): {
  videoDone: boolean
  recallDone: boolean
  cardsDone: boolean
  currentStep: 'video' | 'recall' | 'cards' | 'done'
}

function buildRequirementCoverage(input: {
  sourceSnapshotId: string
  requirements: ExamRequirement[]
  criticalErrorDefinitions: CriticalErrorDefinition[]
  coverage: RequirementCoverage[]
  now: number
}): CoverageReport
```

Builder-Invarianten:

- Ausgabe genau 120 Course-Units mit Indizes 002–121.
- Indizes und Unit-IDs eindeutig und stabil.
- Video-Objective gehört zu den 28 offiziellen Objectives.
- `selectCourseCardIds` verwendet dieselbe Karteneligibility wie die bestehende Paketauswahl und schließt die zu Karten auflösbaren Recall-Items derselben Sitzung aus.
- `selectRecallQuestionIds` normalisiert `recallCheckSize`, sampelt/reihenfolgt mit stabilem Seed und liefert die Card-IDs **nur** der ausgewählten Recall-Fragen.
- `createCourseExecution` friert nur explizit gemappte, freigegebene und zuvor ausgewählte Course-/Recall-IDs mit der übergebenen UUID ein; es kopiert nie den vollständigen Recall-Kandidatenpool.
- `computeCourseStepState` akzeptiert Recall-Abschluss nur von einem Run derselben Execution nach deren Start und mit exakt deren eingefrorenen Frage-IDs/-Versionen; Legacy-/freie Läufe zählen nicht.
- M-IDs werden genau einmal auf genau einen normalisierten Videotitel aufgelöst; Transkriptfragen erscheinen nie als Karten-ID.
- Der aktuelle Snapshot erwartet 375 aktive M-IDs genau einmal; eine Mengenänderung verlangt einen versionierten Content-Diff statt still angepasster Erwartung.
- Ausschlussmenge enthält aktive andere Ausführungen und alle Holdouts.
- Auswahl ist nach Erstellung immutable.
- `cardLimit = 0` übernimmt alle nach Ausschlüssen verbleibenden Kandidaten.
- Coverage prüft Leaf-Pfade, nicht Ressourcensummen.

### 23.3 Phase 2 – Query- und Migrationverträge

```ts
async function getLearningUnitState(
  profileId: string,
  unitId: string,
): Promise<LearningUnitState | undefined>

async function putLearningUnitState(state: LearningUnitState): Promise<void>

async function listActiveUnitExecutions(
  profileId: string,
): Promise<LearningUnitExecution[]>

async function listReservedStudyCardIds(
  profileId: string,
): Promise<string[]>

async function switchActiveProfileScope(input: {
  fromProfileId: string
  toProfileId: string
  expectedUiScopeRevision: number
}): Promise<{ profileId: string; uiScopeRevision: number }>

async function listDirectDeckCards(input: {
  profileId: string
  deckId: string
}): Promise<ProfileCardRecord[]>

async function listDueReviewCardIds(input: {
  profileId: string
  deckIds: string[]
  now: number
}): Promise<string[]>

function onStartUnitStudy(input: {
  profileId: string
  executionId: string
  deck: Deck
  cardIds: string[]
}): void

async function migrateLegacyLearningState(input: {
  activeProfileId: string
  catalog: LocalVideoMeta[]
  videoCardIndex: VideoCardIndex
  now: number
}): Promise<{ migrated: boolean; ownerProfileId: string }>
```

Die Migration liegt in einem Service, weil sie localStorage und Dexie kombiniert; reine DB-Queries lesen kein localStorage. Sie erfüllt exakt §16.2. Unit-State und Ausführung werden in einer Transaktion geschrieben. Legacy-`activeCardIds` werden mit dem Zielvideoindex geschnitten; bei leerer Schnittmenge wird beim nächsten Öffnen eine neue Ausführungsauswahl erzeugt. `activeStartedAt` wird unverändert übernommen. Video-/Recall-Signale verwenden danach `[profileId+videoIndex]`; Objective-weites Legacy-watched ist nur Hint.

`useMesserVideoProgress` und `useVideoRecallScores` verlangen danach `profileId` und arbeiten mit dem Videoindex, nie allein mit dem Objective. `markWatched` wird nur durch das definierte Wiedergabekriterium oder einen expliziten manuellen Befehl ausgelöst, nicht beim Öffnen.

`listActiveUnitExecutions` ist nach zugehörigem `lastActivityAt` absteigend und anschließend `unitId` aufsteigend sortiert. `listReservedStudyCardIds` bildet die Union über **alle** offenen Ausführungen, nicht nur über die primäre Kachel.

`onStartUnitStudy` persistiert unter `sessionId = 'unit-execution:' + executionId`; `PersistedStudySession` enthält `profileId` und `executionId`. Resume ist erlaubt und Completion/Abbruch aktualisiert nur den zugehörigen Unit-State/Attempt.

Ab Phase 2 schreibt jeder neue Study-Einstieg versionierte Evidenz. Dazu wird `recordReview` additiv um einen optionalen Kontext erweitert:

```ts
interface ReviewAssessmentProposalContext {
  proposalId: string
  profileId: string
  evidenceEpoch: number
  sessionId: string
  executionId?: string
  context: 'course' | 'review' | 'dailyQuest' | 'freeStudy'
  itemId: string
  itemVersion: string
  sourceSnapshotId: string
  contentManifestVersion: string
  sessionTimeReceiptId?: string
  sourceReviewOperationId: string
}

async function beginAssessmentEvidenceSession(input: {
  profileId: string
  evidenceEpoch: number
  sessionId: string
  executionId?: string
  context: 'course' | 'review' | 'dailyQuest' | 'freeStudy'
  deviceId: string
  sourceSnapshotId: string
  contentManifestVersion: string
}): Promise<AssessmentSessionTimeReceipt>

recordReview(
  profileId,
  cardId,
  rating,
  timeMs,
  algorithm,
  algorithmParams,
  answer,
  assessmentContext?: ReviewAssessmentProposalContext,
): Promise<{
  ok: boolean
  error?: string
  undoToken?: ReviewUndoToken & {
    assessmentProposalId?: string
    sourceReviewOperationId?: string
    undoTokenHash?: string
  }
  cardState?: CardSchedulingState
}>
```

`profileId` ist auch ohne Assessment-Kontext Pflicht und bestimmt Karten-, Review-, Stats-, Progress- und Outbox-Scope; eine Kontext-Profil-ID muss identisch sein. Die bestehende interne Dexie-Transaktion von `recordReview` wird um `assessmentEventProposals` und die passende profilgebundene Sync-Outbox-Operation erweitert; dadurch committen profilbezogener Kartenstand, Review, Proposal und Outbox gemeinsam. Die Review-Operation persistiert einen nur als Hash übertragenen Undo-Token. Der bestehende Rückgabe-Token wird um Proposal-/Review-Operation-ID ergänzt; die Undo-Transaktion prüft den lokalen Originaltoken und schreibt `review.undo` plus den exakt gebundenen `AssessmentReversalRequest` samt Outbox. Weder Kontext noch Rating dürfen Objective-Mapping, Punkte, Richtigkeit oder Eligibility im autoritativen Ledger setzen; der Server leitet alles aus Itemversion, Rohantwort und kanonischem Manifest ab. Scheduler- und Gamificationformeln bleiben ansonsten kompatibel. Ein Aufruf ohne Assessment-Kontext bleibt für normale/Legacy-Study erlaubt, erzeugt aber keine Mastery-Proposal; ein Aufruf ohne Profil ist nicht mehr zulässig.

`beginAssessmentEvidenceSession` ruft den authentifizierten Server auf und persistiert den vollständig signierten Receipt lokal. `POST /v1/assessment-sessions` erzeugt pro `(profileId, evidenceEpoch, sessionId, deviceId)` höchstens ein aktives Fenster; `/v1/assessment-sessions/{sessionId}/resume` gibt nur dieses unveränderte Fenster zurück. `POST /v1/assessment-events` bzw. der gleichwertige Sync-Resolver akzeptiert Proposal/Reversal idempotent, prüft Session-Receipt und serverbekannte Review-/Undo-Operationen und schreibt Outcome, Ledger und Receipt atomar. Cross-Profile/-Epoch/-Device-Replay, Ablauf, unbekannte Contentversion, nachträglich geänderte Rohantwort und eine zweite Undo-Kette schlagen geschlossen fehl.

### 23.4 Phase 3 – Reviewverträge

Zusätzlich zu `listAnswerStats` aus §10:

```ts
function isCardEligibleForScheduledReview(input: {
  card: Card
  now: number
  nextDayStartsAt: number
  learnAheadMinutes: number
  algorithm: 'fsrs' | 'sm2'
}): boolean

async function listDirectDeckCards(
  profileId: string,
  deckId: string,
): Promise<Card[]>

async function listDueReviewCardIds(input: {
  profileId: string
  deckIds: string[]
  now: number
  nextDayStartsAt: number
  learnAheadMinutes: number
  algorithm: 'fsrs' | 'sm2'
}): Promise<string[]>

function buildReviewExecution(input: {
  executionId: string
  profileId: string
  evidenceEpoch: number
  unitId: string
  dueCardIds: string[]
  unresolvedErrorCardIds: string[]
  errorOccurredAtByCardId: ReadonlyMap<string, number>
  excludedCardIds: ReadonlySet<string>
  correctiveRetestDelayMs: number
  cardLimit: number
  sourceSnapshotId: string
  contentManifestVersion: string
  contentVersionsByCardId: ReadonlyMap<string, string>
  now: number
}): LearningUnitExecution

async function beginReviewUnitAttempt(input: {
  profileId: string
  evidenceEpoch: number
  unitId: string
  execution: LearningUnitExecution
  carryoverCardIds: string[]
  localLearningDay: string
  now: number
}): Promise<ReviewUnitAttemptRecord>

async function getOpenReviewUnitAttempt(
  profileId: string,
  unitId: string,
): Promise<ReviewUnitAttemptRecord | undefined>

async function completeReviewUnitAttempt(input: {
  profileId: string
  attemptId: string
  reviewedCardIds: ReadonlySet<string>
  now: number
}): Promise<ReviewUnitAttemptRecord>

async function abandonReviewUnitAttempt(input: {
  profileId: string
  attemptId: string
  now: number
}): Promise<ReviewUnitAttemptRecord>
```

Die Scheduler-Eligibility muss dieselbe pure Implementierung und dieselben Zeitparameter wie Study-Ordering nutzen. Für Review-Units liefert sie für `new` immer `false`; neue Karten gehören in Course/Practice-Erstexposition. Learning/Relearning berücksichtigt `learnAheadMinutes`, Reviewkarten die bestehende Lerntagesgrenze. Beide Queries prüfen, dass der angefragte Profil-Scope dem authentifizierten/aktiven Profil sowie dem Owner gespeicherter Schedulerdaten entspricht; ein Profilwechsel während einer laufenden Query verwirft das Ergebnis. Fehlerkarten vor Ablauf des Retest-Abstands sind nicht wählbar. Gelöste Fehler verschwinden. Auswahl ist stabil, dedupliziert und enthält keine Holdouts.

Die stabile ID `unit:review:{objective}` verwendet die Zyklusregeln aus §11. Ein abgeschlossener Zyklus wird wieder `reviewDue`, sobald aktuell fälliger Altbestand, gespeicherter Überhang, neue Fälligkeit oder ein ungelöster Fehler vorliegt.

Begin und Complete aktualisieren Attempt, Execution und Unit-State atomar. `reviewDue` berücksichtigt zusätzlich weiterhin fällige Altbestände und `carryoverCardIds`; es ist nicht auf Ursachen nach `completedAt` beschränkt.

### 23.5 Phase 4 – Labverträge

```ts
function validateLabScenarioCoverage(
  scenarios: LabScenario[],
  requirements: ExamRequirement[],
): ValidationResult

function buildLabScenarioSnapshot(input: {
  scenario: LabScenario
  sourceSnapshotId: string
  contentManifestVersion: string
  language: string
}): LabScenarioSnapshot

async function createLabAttempt(input: {
  attemptId: string
  profileId: string
  evidenceEpoch: number
  scenarioSnapshot: LabScenarioSnapshot
  now: number
}): Promise<LabAttemptRecord>

async function getOpenLabAttempt(
  profileId: string,
  scenarioId: string,
): Promise<LabAttemptRecord | undefined>

async function saveLabAttemptProgress(input: {
  profileId: string
  attemptId: string
  expectedRevision: number
  answersByStepId: Record<string, unknown>
  elapsedMs: number
  now: number
}): Promise<LabAttemptRecord>

async function submitLabAttempt(input: {
  profileId: string
  attemptId: string
  expectedRevision: number
  answersByStepId: Record<string, unknown>
  now: number
}): Promise<LabAttemptRecord>

async function abandonLabAttempt(input: {
  profileId: string
  attemptId: string
  expectedRevision: number
  now: number
}): Promise<LabAttemptRecord>

async function migrateLegacyLabProgress(input: {
  now: number
}): Promise<{ migrated: boolean; ownerProfileId: string }>
```

Create friert den validierten Snapshot tief ein. Get/Save/Submit/Abandon prüfen `profileId`, aktuelle Evidence-Epoch und den gespeicherten Owner; Save verwendet Compare-and-swap über `expectedRevision`, ersetzt nur Antworten/Elapsed/`updatedAt` und darf Snapshot, Owner oder Startzeit nicht ändern. Submit ist idempotent und schreibt Attempt, lokalen Ergebnis-Preview und die Sync-Operation `assessment.attempt.qualify` atomar, aber **keinen** frei konstruierten Accepted Event. Ab `submitted`/`abandoned` sind weitere Saves gesperrt. Der Server validiert Owner/Epoch, Manifest, Snapshot-/Rubrikhash und Antworten gegen den freigegebenen Inhalt, berechnet den Score erneut und liefert erst dann Accepted Events, signierten `AssessmentQualificationReceipt` und Qualification-Ledgereintrag. Ohne diesen Receipt bleibt der Labscore Aktivitätsfeedback, aber keine Mastery-Evidenz. Kein `recordReview`, XP oder unmittelbares Richtig/Falsch vor Submit.

`migrateLegacyLabProgress` verwendet den separaten v23-Marker `legacy-labs-v1` und zwingend den in v22 gespeicherten Owner aus `legacy-learning-v1`; sie wählt nie das beim v23-Upgrade zufällig aktive Profil.

Der Snapshot ist die vollständige Render-/Resume-/Score-Quelle: Titel/Narrativ, initialer Zustand, versionierte Assets, erlaubte Aktionen, Selection-Modi/-Limits, Schwierigkeit, Dauer, QA, Schritte, Rubrik und delayed Feedback müssen enthalten und vom `scenarioSnapshotHash` umfasst sein. Matching-Elemente und Ordering-Schritte besitzen stabile eindeutige IDs; Matching-Rubriken speichern die genaue Links→Rechts-Zuordnung und Punkte je linkem Element, Ordering-Rubriken eine ID-Reihenfolge, Set-Rubriken Punkte/Penalty mit Untergrenze null. Validator und Scorer lehnen unbekannte/doppelte IDs, unvollständige Punktetabellen, ungültige Single-/Multi-Limits, fehlende Asset-/Action-Targets und negative Maximalscores ab. `score >= LAB_PASS_SCORE` bestimmt den fachlichen Pass-Befund, während der ActivityStatus nach Abgabe `completed` bleibt. Ein nicht bestandener letzter Versuch erzeugt den Empfehlungsgrund `lab_retry`.

### 23.6 Phase 5 – Examverträge

Der MC-Kandidatenpool liest nur direkte Karten der fünf exakt aufgelösten Domain-Root-Decks und verlangt eine parserseitig auswertbare Antwort. Der PBQ-Kandidatenpool liest Matching-/Ordering-/Szenarioitems aus „Interaktive Übungen“, dem Acronym-Deck und den Objective-Decks; der Deckname allein macht eine Karte nicht zum PBQ. In beiden Pools sind zusätzlich zwingend: QA-Status `approved`, vollständige Provenienz/Lizenz, `noRealExamContentConfirmed = true`, passender `originPool`/`allowedContexts`, passende Sprache und dieselbe Content-Manifest-Version. `pbqScoring.ts` bewertet, klassifiziert aber nicht.

```ts
function buildExamUnits(input: {
  descriptors: ExamLaunchDescriptor[]
  definitionVersion: string
}): LearningUnitDefinition[]

function buildPracticeExamForm(input: {
  formId: string
  profileId: string
  launchDescriptor: ExamLaunchDescriptor
  snapshot: ExamSourceSnapshot
  language: string
  contentManifestVersion: string
  scoringRegistryVersion: string
  blueprint: ExamBlueprint
  candidateItems: ExamItem[]
  excludedItemIds: ReadonlySet<string>
  selectionSeed: string
  formVersion: string
}): ExamFormDefinition

function validateReadinessFormForAdminBuild(input: {
  form: ExamFormDefinition
  snapshot: ExamSourceSnapshot
  blueprint: ExamBlueprint
  items: ExamItem[]
}): ValidationResult

interface ReadinessLeasePayload {
  leaseId: string
  attemptId: string
  claims: {
    profileId: string
    personId: string
    identityBindingId: string
    identityAssuranceReceiptId: string
    deviceId: string
  }
  evidenceEpoch: number
  learnerPlanVersion: string
  lifecycleConfirmationId: string
  lifecycleConfirmationVersion: string
  scoringRegistryVersion: string
  serverStartedAt: number
  deadlineAt: number
  leaseExpiresAt: number
  timingPolicy: {
    policyVersion: string
    heartbeatIntervalSec: number
    heartbeatGraceSec: number
    submitGraceSec: number
  }
  signature: SignatureMetadata
  form: ExamFormDefinition
  itemPresentations: ExamItemPresentationSnapshot[]
  exposureRecords: ExamItemExposure[]
  exposureCommitReceipt: ExposureCommitReceipt
}

interface ReadinessLeaseRecord {
  leaseId: string
  attemptId: string
  profileId: string
  leaseEnvelope: ReadinessLeasePayload
  storedAt: number
  lastVerifiedAt: number
}

interface ReadinessHeartbeatAckPayload {
  ackId: string
  attemptId: string
  profileId: string
  personId: string
  identityBindingId: string
  deviceId: string
  evidenceEpoch: number
  serverTime: number
  deadlineAt: number
  revision: number
  nextHeartbeatDueAt: number
  timingEligibility: 'qualifying' | 'practice-only'
}

type ReadinessHeartbeatAck = SignedEnvelope<ReadinessHeartbeatAckPayload>

interface ReadinessDeadlineLockAckPayload {
  ackId: string
  attemptId: string
  profileId: string
  personId: string
  identityBindingId: string
  deviceId: string
  evidenceEpoch: number
  serverLockedAt: number
  deadlineAt: number
  revision: number
  answerStateHash: string
  timingEligibility: 'qualifying' | 'practice-only'
}

type ReadinessDeadlineLockAck = SignedEnvelope<ReadinessDeadlineLockAckPayload>

interface ServerVerifiedCandidateContext {
  authenticated: true
  issuer: string
  authSubjectHash: string
  personId: string
  profileId: string
  identityBindingId: string
  assuranceLevel: 'readiness-verified'
  assuranceReceiptId: string
}

async function reserveReadinessForm(auth: ServerVerifiedCandidateContext, input: {
  profileId: string
  launchDescriptorId: string
  launchDescriptorVersion: string
  learnerPlanVersion: string
  lifecycleConfirmationId: string
  deviceId: string
}): Promise<ReadinessLeasePayload>

async function createPracticeExamAttempt(input: {
  attemptId: string
  profileId: string
  evidenceEpoch: number
  form: ExamFormDefinition
  snapshot: ExamSourceSnapshot
  itemsById: ReadonlyMap<string, ExamItem>
  deviceId: string
  now: number
}): Promise<PracticeExamAttemptRecord>

async function createReadinessExamAttempt(input: {
  profileId: string
  leasePayload: ReadinessLeasePayload
  deviceId: string
}): Promise<ReadinessExamAttemptRecord>

async function getReadinessLease(
  profileId: string,
  attemptId: string,
): Promise<ReadinessLeaseRecord | undefined>

async function getOpenExamAttempt(
  profileId: string,
  attemptId: string,
): Promise<ExamAttemptRecord | undefined>

async function saveExamAttemptProgress(input: {
  profileId: string
  attemptId: string
  expectedRevision: number
  answersByItemId: Record<string, unknown>
  flagsByItemId: Record<string, boolean>
  timeMsByItemId: Record<string, number>
  now: number
}): Promise<ExamAttemptRecord>

async function lockLocalExamAttemptAtDeadline(input: {
  profileId: string
  attemptId: string
  expectedRevision: number
  observedAt: number
}): Promise<ExamAttemptRecord>

async function heartbeatReadinessAttempt(input: {
  profileId: string
  attemptId: string
  expectedRevision: number
}): Promise<ReadinessHeartbeatAck>

async function lockReadinessAttempt(input: {
  profileId: string
  attemptId: string
  expectedRevision: number
  answerStateHash: string
}): Promise<{ attempt: ReadinessExamAttemptRecord; ack: ReadinessDeadlineLockAck }>

async function queuePendingReadinessSubmit(input: {
  profileId: string
  attemptId: string
  expectedRevision: number
  now: number
}): Promise<ReadinessExamAttemptRecord>

async function submitPracticeExamAttempt(input: {
  profileId: string
  attemptId: string
  expectedRevision: number
  answersByItemId: Record<string, unknown>
  flagsByItemId: Record<string, boolean>
  timeMsByItemId: Record<string, number>
  now: number
}): Promise<PracticeExamAttemptRecord>

async function submitReadinessExamAttempt(input: {
  profileId: string
  attemptId: string
  expectedRevision: number
  answersByItemId: Record<string, unknown>
  flagsByItemId: Record<string, boolean>
  timeMsByItemId: Record<string, number>
  now: number
}): Promise<{ attempt: ReadinessExamAttemptRecord; receipt: ReadinessScoreReceipt }>

async function abandonExamAttempt(input: {
  profileId: string
  attemptId: string
  expectedRevision: number
  now: number
}): Promise<ExamAttemptRecord>

function computeObjectiveEvidence(input: EvidenceInput): ObjectiveEvidence
function computeExamReadiness(input: ReadinessInput): ReadinessResult
function issueReadinessAuthorityReceipt(
  input: ReadinessInput,
  result: ReadinessResult,
): ReadinessAuthorityReceipt
```

Practice-/Diagnostic-Builder und -Factory benötigen **keine** Buchung, kein Examdatum und keine Lifecycle-Bestätigung. Sie prüfen nur einen aktuellen freigegebenen Snapshot/Manifest, QA/Pool sowie `snapshot.offeredLanguages.includes(form.language)` und identische Snapshot-/Manifest-/Item-/Scoring-Registryversionen. `scoringRegistryVersion` muss in Blueprint, Builder-Input und Form identisch sein; beide Attempt-Factories kopieren sie ausschließlich aus der validierten Form bzw. dem signierten Lease, niemals aus einem unabhängigen Requestfeld. Dadurch kann die Einstiegsdiagnostik vor dem persönlichen Plan stattfinden und ihre Attempt-ID anschließend in einen Draft übernommen werden.

Serverseitiger Readiness-Lease und Readiness-Attempt-Factory prüfen dagegen die strengere Baseline-Invariante:

```ts
learnerPlan.status === 'confirmed'
  && learnerPlan.profileId === verifiedCandidate.profileId
  && learnerPlan.candidatePersonId === verifiedCandidate.personId
  && learnerPlan.candidateIdentityBindingId === verifiedCandidate.identityBindingId
  && learnerPlan.candidateIdentityAssuranceReceiptId === verifiedCandidate.assuranceReceiptId
  && lifecycleConfirmation.profileId === learnerPlan.profileId
  && lifecycleConfirmation.candidatePersonId === learnerPlan.candidatePersonId
  && lifecycleConfirmation.candidateIdentityBindingId === learnerPlan.candidateIdentityBindingId
  && lifecycleConfirmation.candidateIdentityAssuranceReceiptId === learnerPlan.candidateIdentityAssuranceReceiptId
  && lifecycleConfirmation.learnerPlanVersion === learnerPlan.planVersion
  && learnerPlan.examLanguage !== null
  && learnerPlan.examDateIso !== null
  && snapshot.offeredLanguages.includes(learnerPlan.examLanguage)
  && snapshot.examCode === learnerPlan.examCode
  && snapshot.snapshotId === learnerPlan.sourceSnapshotId
  && lifecycleConfirmation.examCode === snapshot.examCode
  && lifecycleConfirmation.sourceSnapshotId === snapshot.snapshotId
  && lifecycleConfirmation.examLanguage === learnerPlan.examLanguage
  && lifecycleConfirmation.examDateIso === learnerPlan.examDateIso
  && lifecycleConfirmation.lifecycleStatus === 'bookable'
  && lifecycleConfirmation.bookingAttestedByUser
  && lifecycleConfirmation.bookingAttestationId !== undefined
  && lifecycleConfirmation.bookingAttestedAt !== undefined
```

Der Server lädt `learnerPlan`, `snapshot` und `lifecycleConfirmation` anhand der übergebenen Version/IDs aus seinem autoritativen Store; volle Client-Objekte werden ignoriert bzw. abgewiesen. Bookability stammt aus der vom System verifizierten Quelle, während `bookingAttestedByUser` nur die getrennte persönliche Buchungsbestätigung ist. Die Bookability-Verifikation darf beim Start höchstens sieben Tage alt sein, in der `final`-Phase höchstens 24 Stunden. `verifiedCandidate` wird serverseitig aus der Auth-Session und dauerhaften Profilbindung erzeugt, nicht aus JSON-Feldern. Readiness-Form und -Attempt kopieren exakt Exam-Code, Snapshot-ID, Prüfungssprache, Personenbindung und `selectionSeed` aus den validierten Objekten; frei übergebene abweichende Strings oder ein unabhängiger Attempt-Seed sind nicht zulässig.

`buildExamUnits` validiert eindeutige Descriptor-IDs/-Versionen, bekannte Blueprints, Sprachpolicy, Phase, Itemzahl/Dauer und erzeugt startbare `unit:exam:*`-Definitionen. Ein Readiness-Descriptor enthält keinerlei versiegelte Form-/Itemdaten. `buildPracticeExamForm` akzeptiert nur einen Descriptor mit Purpose `diagnostic` oder `practice` und erzeugt nur `pool = 'practice'`; Form und Attempt kopieren Descriptor-ID/-Version/Purpose. Nur ein eingereichter `diagnostic`-Attempt desselben Profils/Snapshots darf einmalig als `baselineDiagnosticAttemptId` bestätigt werden, und nur er erzeugt den Assessment-Kontext `diagnostic`. Readiness-Formen haben zwingend `purpose = 'readiness'`, werden ausschließlich im vertrauenswürdigen Admin-/Server-Build aus einem Readiness-Descriptor erzeugt und mit `validateReadinessFormForAdminBuild` gegen die privaten vollständigen Items geprüft; der Client erhält vor dem Lease weder Form-ID noch Items.

`reserveReadinessForm` wählt serverseitig atomar anhand der verifizierten Person, des autorisierten Profils, Blueprints, Snapshots und der Sprache eine noch ungesehene Form, schreibt personenweite Expositionen **und legt genau einen Readiness-Attempt an**. `attemptId`, aktuelle `evidenceEpoch`, `serverStartedAt` und `deadlineAt = serverStartedAt + blueprint.durationSec × 1000` entstehen in derselben Servertransaktion. Es gilt zwingend `serverStartedAt < deadlineAt < leaseExpiresAt`, `leaseExpiresAt = deadlineAt + timingPolicy.submitGraceSec × 1000` und `signature.expiresAt === leaseExpiresAt`; der initiale Startwert für die reine Lock-/Submit-Grace beträgt 86.400 Sekunden und wird pilotiert. Erst nach Commit wird die signierte Form samt Präsentationssnapshots **ohne Scoringdaten**, den committed `exposureRecords` und dem `ExposureCommitReceipt` ausgeliefert. Die Signatur bindet Lease-ID/Ablauf, Attempt-ID, Start/Deadline/Epoch, Profil/Person/Identity-Binding/-Assurance, Plan-/Lifecycle-Version, Gerät, Form-/Blueprint-/Snapshot-/Manifest-/Scoring-Registryversion, Timing-Policy, sämtliche Exposure-/Receipt-IDs und -Hashes, `selectionSeed` und ausschließlich die scoringfreien `presentationHash`-Werte.

`createReadinessExamAttempt` materialisiert lokal ausschließlich diesen bereits serverseitig angelegten Attempt; es akzeptiert weder neue Attempt-ID noch lokales Start-`now`, prüft Signatur, Lease, Gerät und Versionen und benötigt kein lokales `itemsById`. Vollständiger unveränderlicher `ReadinessLeaseRecord`, Attempt, alle Expositionen und Exposure-Receipt werden in **einer** Dexie-Transaktion geschrieben; Item-/Family-/Receipt-Mengen müssen exakt zu Form und Presentation passen. Reload liest sie über Profil/Attempt, verifiziert Envelope/Keystatus/Claims/Expiry/Form-/Policy-/Exposurehash erneut und plant den nächsten Heartbeat aus der signierten Policy. Vor `deadlineAt` darf der bestehende Attempt weiterlaufen; zwischen Deadline und Lease-Ablauf sind nur Lock/Submit/Abandon zulässig. Nach `leaseExpiresAt` darf das lokale Envelope nichts mehr autorisieren: `/start` muss den servergespeicherten Status rehydrieren; ein später eingefroren übermittelter Antwortstand kann allenfalls noch `practice-only`-Feedback erhalten und niemals Qualification. Fehlt oder widerspricht ein Bestandteil, wird nicht qualifizierend fortgesetzt. Crash, Abbruch oder nie erfolgte Materialisierung verbrauchen die Form; derselbe Payload kann keinen zweiten Attempt und keinen neuen Timer erzeugen.

`ReadinessLeaseRecord` besitzt absichtlich keinen zweiten Status. `active`, `submitPending`, `submitted` und `abandoned` werden ausschließlich aus dem zugehörigen `ReadinessExamAttemptRecord` abgeleitet; `expired` ist eine pure Ableitung aus signiertem `leaseExpiresAt`, Serverstatus und aktueller Zeit. Der Lease bleibt auditierbar und unverändert, während alle Attempt-Transitionen per CAS genau eine Statusquelle fortschreiben. Dadurch kann ein Crash keine widersprüchliche Lease-/Attempt-Statuskombination hinterlassen.

Practice-Builder und Admin-Validator brechen ab, wenn der geprüfte Pool zu klein ist, QA/Provenienz/Sprach-/Versionsfilter nicht erfüllt sind, Blueprint-Itemzahl, PBQ-Ziel/-Punkteanteil, Objective-/Aufgabenverb-/Szenario-/Schwierigkeitsziele oder Domainziele nicht erfüllt werden können, eine Readiness-ID bereits reserviert/exponiert ist oder Formdisjunktheit verletzt wird. Full-Mode verwendet den freigegebenen Blueprint mit 5.400 Sekunden global.

`reserveReadinessForm` prüft Autoren/Reviewer, die personenweite Legacy-/Profil-/Gerätehistorie, verbleibende Reserve und Formversion. `createPracticeExamAttempt` löst IDs aus `itemsById` auf und friert Präsentation plus Practice-Scoring ein; `createReadinessExamAttempt` übernimmt unverändert nur die signierten Lease-Präsentationen. Beide Factories kopieren `selectionSeed` ausschließlich aus der Form. Practice-UUIDs werden an die lokale Factory übergeben; Readiness-UUIDs erzeugt ausschließlich die Lease-Transaktion. Es gilt invariant `purpose = 'readiness' ⇔ pool = 'readiness'`; `diagnostic` und `practice` gehören nur zum Practice-Pool.

Get/Save/Heartbeat/Lock/Queue/Submit/Abandon prüfen Profil-Owner, Pool und `expectedRevision`. Save ist Autosave mit Compare-and-swap und darf weder Form-/Itemsnapshots, Seed, Deadline, Lease noch Owner ändern. Nach `deadlineAt` lehnt Save Änderungen ab. Ein Progress-Save ist ausdrücklich **kein** qualifizierender Heartbeat und verändert `lastServerHeartbeatAt`/Timing-Eligibility nicht; dafür muss der separate Heartbeat-Endpunkt einen signierten Ack liefern. `heartbeatReadinessAttempt` und `lockReadinessAttempt` prüfen Envelope, Claims, Gerät, Deadline und Revision; Ack und neuer Attempt-Stand werden in derselben lokalen Transaktion gespeichert. Nur der Server-Ack darf `timingEligibility = 'qualifying'` bzw. einen qualifizierenden Deadline-Lock setzen. `lockLocalExamAttemptAtDeadline` dient Practice oder einem Offline-Fallback; bei Readiness setzt er zwingend und irreversibel `practice-only`. Practice kann danach lokal submitten. Readiness wechselt offline zu `submitPending`, legt genau eine idempotente Outbox-Operation mit eingefrorenem Antwortzustand an und kann erst online submitten. Abandon friert den Attempt ein und verbraucht eine reservierte Readiness-Form dauerhaft. `submitted`/`abandoned` sind unveränderlich; ein Revisionkonflikt wird sichtbar neu geladen statt per Last-write-wins überschrieben.

Practice-Submit ist idempotent und kann gegen den eingefrorenen lokalen Practice-Scoring-Snapshot ein sofortiges Ergebnis-Preview berechnen. Attempt, Preview und `assessment.attempt.qualify` committen lokal atomar; der Server rechnet aus kanonischem Inhalt und Antworten nach, erzeugt Accepted Events und erst der signierte `AssessmentQualificationReceipt` qualifiziert Diagnostic-/Practice-Evidenz. Readiness-Submit sendet nur Antworten/Zeiten an den Server; ausschließlich dieser wertet gegen private Scoringdaten aus und liefert Accepted Events plus signierten `ReadinessScoreReceipt`. Bei erfolgreichem Submit werden Attempt, Ergebnis, Events und Qualification atomar vom Server übernommen. Eine spätere Invalidierung wirkt über das append-only Ledger aus §10. Vor Submit sind Lösungen und Ergebnisfelder nicht lesbar in der UI oder im Readiness-Clientspeicher.

Nach Submit darf die Aktion „Fehler wiederholen“ eine normale Study-Session mit den fehlerhaften Practice-Karten starten. Diese nachgelagerte Aktion ist der einzige Exam-bezogene Weg zu `recordReview` und Scheduler-/XP-Wirkung.

#### 23.6.1 Autoritativer Plan- und Lifecyclepfad

Vor Plan-Confirm stellt `/v1/candidate-identity/verify` unter unabhängiger Rolle eine `CandidateIdentityAssuranceReceipt` aus; `/recover` bindet einen neuen Issuer-Subject an dieselbe Person, `/merge` vereinigt nach Review zwei Personen samt vollständiger Exposure-/Attempt-/Autorhistorie. Auto-Registration erzeugt nur `unverified`. Verify/Recover/Merge sind auditierbar, idempotent, dürfen nicht vom Kandidaten selbst administriert werden und ein Merge ist hinsichtlich Holdout-Historie irreversibel. Ohne `readiness-verified` verweigern Plan-Confirm für Readiness und Lease mit `403 identity_assurance_required`.

Der lokale `LearnerExamPlan` ist für UI/Pacing gespiegelt, aber eine Readiness-Reservierung lädt ausschließlich die serverseitig bestätigte Version. Die authentifizierten Endpunkte unter `/v1/exam-plans/SY0-701` sind Phase-5-Pflicht:

| Route | Vertrag |
|---|---|
| `PUT /draft` | Upsert eines profilgebundenen Drafts per `expectedPlanVersion` und `Idempotency-Key`; erlaubt Termin, Exam-/UI-Sprache, Wochenminuten, Lerntage, Puffer und eine validierte Diagnostic-Attempt-ID, aber keine Client-Person-ID. |
| `POST /confirm` | Prüft Draft, gebotene Sprache/Snapshot/Exam-Code und Auth-Profil; lädt/erstellt die dauerhafte Candidate-Identity-Bindung, setzt `candidatePersonId`/`candidateIdentityBindingId` serverseitig und gibt einen neuen unveränderlich versionierten `ConfirmedLearnerExamPlan` zurück. |
| `POST /lifecycle/refresh` | Serverseitiger Fetch/Check gegen die im Source-Snapshot zugelassene offizielle CompTIA-Quelle; speichert Exam-Code, angebotene Sprachen, Bookability, Source-Hash/URL und Prüfzeit in einer neuen signierten `ExamLifecycleConfirmation`. Fehler oder nicht beweisbare Bookability ergeben `unknown`, niemals still `bookable`. |
| `POST /lifecycle/{confirmationId}/booking-attest` | Getrennte, authentifizierte Nutzerbestätigung der persönlichen Buchung für exakt Planversion, Kandidatenbindung, Termin und Sprache; erzeugt eine neue signierte Confirmation-ID/Version mit `bookingAttestedByUser`, ohne die systemverifizierte Bookability umzuschreiben. |

Alle vier Routen prüfen Owner/Identity-Binding, verwenden Idempotency und kanonischen Request-Hash und liefern `409 version_conflict`, statt konkurrierende Änderungen per LWW zu verlieren. Eine Diagnostic-ID ist nur zulässig, wenn Purpose, Profil, Snapshot/Manifest und Receipt stimmen und sie noch keinem anderen Baselinefeld zugeordnet ist. `reserveReadinessForm` akzeptiert anschließend nur `learnerPlanVersion` und `lifecycleConfirmationId`, lädt beide selbst und prüft, dass Confirmation, Plan, Kandidatenbindung, Datum und Sprache exakt zusammengehören. Lifecycle-Refresh und Booking-Attestation werden mit Plan/Receipt synchronisiert; sie gehören nicht zum optionalen Komfort-Sync aus Phase 7.

#### 23.6.2 Autoritativer Readiness-Serverpfad

Die Endpunkte unter `/v1/readiness` verlangen eine verifizierte Auth-Session. `personId` und `identityBindingId` werden ausschließlich aus dieser Session geladen; `profileId` muss zu dieser dauerhaften Bindung gehören. Jede Mutation verlangt `Idempotency-Key`, bindet ihn an Auth-Subject, Profil, Route und kanonischen Request-Hash und gibt bei Wiederholung dieselbe Antwort zurück. Request-Bodies enthalten nur IDs/Versionen, Antworten und Zeitmetadaten — niemals frei gesetzte Person, volle Plan-/Lifecycle-Objekte, Formauswahl, Scoringkeys oder Client-Startzeit.

| Route | Vertrag und atomare Wirkung |
|---|---|
| `POST /forms/reserve` | Lädt Plan, Lifecycle, Snapshot, Blueprint und Identity-Binding autoritativ; sperrt Kandidat/Form; prüft personenweite Exposure/Autor-/Reviewer-/Reserve-Gates; schreibt Lease, sämtliche Expositionen und genau einen gestarteten Attempt mit Server-Start/Deadline in einer Transaktion; liefert danach den signierten `ReadinessLeasePayload`. |
| `POST /attempts/{attemptId}/start` | Idempotenter Materialisierungs-/Resume-Ack für exakt den Attempt des Lease; gibt unveränderte Start-/Deadline-/Präsentationsdaten zurück und kann weder neue ID noch neuen Timer erzeugen. |
| `PUT /attempts/{attemptId}/progress` | Owner-/Lease-/Epoch-Prüfung und CAS über `expectedRevision`; speichert Antworten/Flags/Zeiten, liefert die neue Revision, zählt aber nicht als Timing-Heartbeat und verweigert Änderungen nach Lock/Deadline. |
| `POST /attempts/{attemptId}/heartbeat` | Signiert Serverzeit/Revision für das Qualifikationsfenster; ein zu großer Abstand macht den Attempt dauerhaft `practice-only`. |
| `POST /attempts/{attemptId}/lock` | Friert den Antwortstand serverseitig spätestens an der Deadline ein; mehrfach identisch, nachträgliche Änderungen verboten. |
| `POST /attempts/{attemptId}/submit` | Sperrt Attempt und private Form, validiert Deadline/Heartbeat/Revision, bewertet ausschließlich im privaten Store und schreibt Ergebnis, Score-Receipt, AssessmentEvents, Qualification bzw. Non-Qualification sowie Sync-Outbox in einer Transaktion. |
| `POST /attempts/{attemptId}/abandon` | Markiert Attempt unveränderlich abgebrochen; Lease/Form/Exposition bleiben verbraucht. |
| `POST /status/compute` | Lädt Evidenz, Resets, Watermarks, Receipts und Content-Gates serverseitig, berechnet Readiness und liefert einen kurzlebigen signierten `ReadinessAuthorityReceipt`. |

`reserve`, `submit` und `abandon` verwenden Datenbank-Row-Locks bzw. eindeutige Constraints für `(personId, formId)`, `(personId, active-readiness-attempt)` und Idempotency-Key. Erwartete Fehlercodes sind mindestens `401 auth_required`, `403 profile_not_bound|identity_revoked|author_conflict`, `404 authoritative_record_not_found`, `409 revision_conflict|active_attempt_exists|form_consumed|insufficient_reserve`, `410 lease_expired|deadline_passed`, `422 version_mismatch|lifecycle_not_bookable|booking_not_attested|blueprint_invalid` und `503 authority_unavailable`. Ein Fehler darf niemals eine teilweise Lease-/Exposure-/Attempt- oder Score-/Event-Transaktion hinterlassen.

`private_holdout_store.py` ist nur für Lease/Scorer lesbar; der Admin-Importer läuft unter getrennter Rolle. Logs, Traces, Fehlermeldungen und Analytics redaktieren Prompt, Optionen und Scoring. Servertests prüfen Parallelreserve, Replay, Crash nach jedem Transaktionsschritt, Revisionkonflikte, Profil-/Person-Spoofing, Profilneuanlage, Deadline/Heartbeat und dass derselbe Lease niemals zwei Attempts erzeugt.

### 23.7 Definition of Done je Pflichtphase

**Phase 0**

- offizieller Snapshot/Hash/Lifecycle verifiziert,
- 100 Prozent Leaf-/Akronym-Crosswalk vorhanden,
- 4.2/4.9, dünne Objectives, Recall-Lücken und 31 Mappings entschieden,
- QA/Provenienz vollständig; kein quarantänisiertes Item aktiv,
- PBQ-/Lab-Matrix reviewed,
- Course-/Practice-Kontexte und mindestens drei Holdout-Formen disjunkt; Exposure-/Leakage-Report leer und Reserve-/Replenishment-Regel freigegeben.

**Phase 1**

- 120 gültige Course-Units,
- per-Video IDs und stabile Ausführungen,
- Coverage auf Leaf-Ebene,
- Kachel/Liste/Sheet funktionieren leer, offline, aktiv und abgeschlossen,
- keine Verhaltensregression bestehender Study-Sessions.

**Phase 2**

- v22-Migration atomar/idempotent,
- nur ein Legacy-Owner, Profile vollständig getrennt,
- Tageswechsel/Reload/Restore setzen exakt fort,
- Video/Recall pro Profil und Video; Öffnen allein schließt nichts ab.
- Review+AssessmentProposal/Outbox werden atomar und profil-/session-/versionsbezogen geschrieben; Accepted Events kommen nur serverautoritativ, Legacy bleibt Hint.
- Server validiert/scort/dedupliziert `assessment.event`-Proposals in derselben Release, signiert Acceptance und Pull wendet sie an; bestehender Review-Sync bleibt grün.

**Phase 3**

- vollständige Statistik mit Nenner/Resolution,
- Due-Logik identisch zum aktiven Scheduler,
- Review-Tageskappe wirklich datum-/profilbezogen,
- phasenabhängiges Ranking und No-Go-Erklärung getestet.

**Phase 4**

- stabile Lab-/Schritt-IDs, Rubriken und normalisierte Requirements,
- v23, Resume, idempotentes Submit und Teilpunkte,
- kein Scheduler-/XP-Effekt während Lab,
- Szenario-Gate für alle relevanten Objectives erfüllt.

**Phase 5**

- v24 und eigene ExamView,
- globaler Timer, Navigation, Flags, Unanswered, Autosubmit, Offline-Regel und Delayed Feedback,
- zwei gültig abgeschlossene disjunkte Holdout-Formen plus eingehaltene Reserve-/Replenishment-Regel,
- serverseitige Leases und vollständiger Readiness-Sync bestätigt; unsicherer Geräte-/Legacy-Stand blockiert,
- profilbezogener Lernplan, Practice-Diagnostic und Pacing-Neuberechnung,
- Ergebnis nach Domain/Objective/Requirement/PBQ,
- alle Mastery-/Readiness-/Lifecycle-Gates umgesetzt und nachvollziehbar.

### 23.8 Globale Verifikation

Ausgangsbaseline: Git-Commit `e6595dd`; vor Implementierung enthält der Arbeitsbaum nur die beiden Plandokumente. Danach pro Phase:

```bash
cd card_pwa
npm run build
npm test -- --run
```

Zusätzlich die phasenspezifischen Integrations-, Content- und manuellen QA-Prüfungen aus §21 ausführen. Ein Driver-Screenshot belegt die mobile/desktop Darstellung, ersetzt aber keine funktionale Prüfung.

Die App darf `examReady` erst anzeigen, wenn Software-DoD, Content-DoD und Learner-DoD gleichzeitig erfüllt sind. Auch dann lautet die Aussage „evidenzbasiert prüfungsbereit“, niemals „Bestehen garantiert“.
