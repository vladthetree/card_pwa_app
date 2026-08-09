# Domain 1 — Objectives ↔ Transkript-Mapping (destilliert)

93 Requirements, je mit destilliertem Inhalt aus Messers Einzellektion + Cram-Video.
0 davon mit ⚠ markiertem Quellenkonflikt (Messer und Cram-Video widersprechen sich inhaltlich).

## Objective 1.1

### 1.1 > Categories > Technical
`req:sy0701:v7:1.1:categories:technical`

Technical Controls werden über ein technisches System durchgesetzt — Messer nennt Betriebssystem-Richtlinien, die Funktionen erlauben oder verbieten, sowie Firewalls und Antivirensoftware. Das Cram-Video definiert sie als Hardware-/Software-Mechanismen zur Zugriffssteuerung und ergänzt Beispiele wie Verschlüsselung, Smartcards, Passwörter, Biometrie, ACLs, Router und IDS/IPS — die Kategorie liefert also das „Wie" der Umsetzung.

### 1.1 > Categories > Managerial
`req:sy0701:v7:1.1:categories:managerial`

**possibleQuestion1**

- Question: Which of the following best describes a managerial security control?
- A. Encryption algorithms
- B. security policies and risk assessments
- C. intrusion detection systems
- D. badge readers
- Correct answer: security policies and risk assessments
- Distractors: Encryption algorithms | intrusion detection systems | badge readers
- Source topic: `managerielle Kontrolle`
- Option source: transcript
- Mapping confidence: high

Managerial Controls sind die schriftlichen Richtlinien und Verfahren, die Menschen erklären, wie sie Rechner, Daten und Systeme sicher handhaben — festgehalten in der offiziellen Security-Policy-Dokumentation und in Standard-Betriebsverfahren. Das Cram-Video beschreibt sie als administrative Controls aus der Sicherheitsrichtlinie inkl. Planungs- und Bewertungsmethoden (Einstellungsverfahren, Background-Checks, Datenklassifizierung, Risiko- und Schwachstellenbewertung) — der dokumentierte Prozess.

### 1.1 > Categories > Operational
`req:sy0701:v7:1.1:categories:operational`

**possibleQuestion1**

- Question: Which security category focuses on day-to- day procedures and processes to maintain security?
- A. Managerial
- B. operational
- C. technical
- D. physical
- Correct answer: operational
- Distractors: Managerial | technical | physical
- Source topic: `Tagesbetriebs-Kontrolle`
- Option source: transcript
- Mapping confidence: high

Operational Controls werden von Menschen statt von Technik umgesetzt: Wachpersonal, monatliche Lunch-and-Learns, Awareness-Programme oder Poster mit Best Practices. Das Cram-Video hebt hervor, dass diese Kategorie in SY0-701 neu hinzugekommen ist, und beschreibt sie als das Tagesgeschäft — Menschen führen die manageriellen Vorgaben aus, stützen die physische Sicherheit und bedienen die Technik (Awareness-Training durchführen, Konfigurationsmanagement, Medienschutz).

### 1.1 > Categories > Physical
`req:sy0701:v7:1.1:categories:physical`

**possibleQuestion1**

- Question: Which of the following security categories involves measures such as fences, security guards, and locks?
- A. Operational
- B. technical
- C. physical
- D. managerial
- Correct answer: physical
- Distractors: Operational | technical | managerial
- Source topic: `Zäune/Wachen/Schlösser`
- Option source: transcript
- Mapping confidence: high

Physical Controls begrenzen den realen Zutritt zu Gebäude, Raum oder Gerät — Messer nennt Wachhäuschen, Zäune, Schlösser und Badge-Reader. Das Cram-Video ergänzt Wachen, Licht, Bewegungsmelder, Hunde, Kameras und Alarme („was man anfassen kann") und betont, dass ohne physische Sicherheit weder technische noch manageriale Kontrollen einen Angreifer aufhalten, der ins Gebäude gelangt.

### 1.1 > Control types > Preventive
`req:sy0701:v7:1.1:control-types:preventive`

Preventive Controls beschränken den Zugriff auf eine Ressource, bevor etwas passiert. Messer führt sie durch alle vier Kategorien: Firewall-Regel (technical), Onboarding-Policy für Zugriffsrechte (managerial), Wachhäuschen mit Ausweisprüfung (operational), Türschloss (physical). Das Cram-Video formuliert es als „unerwünschte Aktivität stoppen" mit den Signalwörtern Zugriffskontrolle, Authentifizierung, Firewall, Verschlüsselung.

### 1.1 > Control types > Deterrent
`req:sy0701:v7:1.1:control-types:deterrent`

**possibleQuestion1**

- Question: Which type of security control is designed to discourage an attacker from attempting malicious actions?
- A. Detective
- B. deterrent
- C. corrective
- D. directive
- Correct answer: deterrent
- Distractors: Detective | corrective | directive
- Source topic: `Angreifer abschrecken`
- Option source: transcript
- Mapping confidence: high

Ein Deterrent verhindert den Zugriff nicht zwingend, sondern schreckt ab und lässt den Angreifer zweimal überlegen. Messers vier Beispiele: Splash-Screen/Warnbanner beim Anwendungsstart (technical), Androhung von Degradierung oder Kündigung (managerial), Empfangstresen (operational), Warnschilder mit Konsequenzhinweis (physical). Das Cram-Video betont den psychologischen Charakter der Barriere und nennt als Signalwörter Warnung, Schild, Sichtbarkeit, Wahrnehmung.

### 1.1 > Control types > Detective
`req:sy0701:v7:1.1:control-types:detective`

**possibleQuestion1**

- Question: Which security control type is used to identify and record security incidents?
- A. Preventative
- B. detective
- C. compensating
- D. directive
- Correct answer: detective
- Distractors: Preventative | compensating | directive
- Source topic: `Vorfälle erkennen/protokollieren`
- Option source: transcript
- Mapping confidence: high

Detective Controls verhindern nichts, sondern erkennen einen Vorfall, warnen und protokollieren ihn — oft erst im Nachhinein. Messers Beispiele: Systemlogs sammeln und durchgehen (technical), Login-Reports regelmäßig auswerten (managerial), Streifengänge über das Gelände (operational), Bewegungsmelder (physical). Das Cram-Video fasst die Signalwörter als Monitoring, Auditing, Logging und Alerting zusammen.

### 1.1 > Control types > Corrective
`req:sy0701:v7:1.1:control-types:corrective`

**possibleQuestion1**

- Question: Which type of control is implemented to restore a system or process after an incident?
- A. corrective
- B. deterrent preventative detective
- C. to restore a system
- D. process after an incident
- Correct answer: corrective
- Distractors: deterrent preventative detective | to restore a system | process after an incident
- Source topic: `System wiederherstellen`
- Option source: transcript
- Mapping confidence: high

Corrective Controls greifen erst nach der Erkennung eines Ereignisses; sie machen dessen Wirkung rückgängig oder halten den Betrieb mit minimaler Ausfallzeit aufrecht. Messers Beispiele: nach Ransomware das System löschen und aus dem Backup wiederherstellen (technical), Richtlinien zur Vorfallmeldung/Alarmierung (managerial), Behörden bzw. Polizei einschalten (operational), Feuerlöscher gegen Brandausbreitung (physical). Das Cram-Video nennt zusätzlich Patching, Anti-Malware, Forensik und Disziplinarmaßnahmen als Rückführung in den Normalzustand.

### 1.1 > Control types > Compensating
`req:sy0701:v7:1.1:control-types:compensating`

**possibleQuestion1**

- Question: Which type which control type is used as an alternative when the primary security control is not feasible?
- A. Detective
- B. compensating
- C. preventative
- D. corrective
- Correct answer: compensating
- Distractors: Detective | preventative | corrective
- Source topic: `Ersatz für primäre Kontrolle`
- Option source: transcript
- Mapping confidence: high

Ein Compensating Control kommt zum Zug, wenn ein Sicherheitsereignis nicht direkt behoben bzw. die eigentlich vorgesehene Maßnahme nicht umgesetzt werden kann — das Risiko wird auf anderem Weg kontrolliert, häufig nur übergangsweise bis zur echten Lösung. Messers Beispiele: Firewall-Regel statt des noch fehlenden Patches (technical), Aufgabentrennung (managerial), mehrere gleichzeitig arbeitende Wachleute (operational), Notstromgenerator bei Stromausfall (physical). Das Cram-Video beschreibt sie als unterstützende/redundante Ersatzkontrollen mit den Signalwörtern Alternative, Backup, Redundanz.

### 1.1 > Control types > Directive
`req:sy0701:v7:1.1:control-types:directive`

**possibleQuestion1**

- Question: Which control type provides guidance on security requirements and procedures?
- A. directive
- B. compensating
- C. preventative
- D. deterrent
- Correct answer: directive
- Distractors: compensating | preventative | deterrent
- Source topic: `Vorgaben/Anleitung`
- Option source: transcript
- Mapping confidence: high

Directive Controls sind laut Messer eine relativ schwache Kontrolle: Sie weisen Menschen zu sichererem Verhalten an, erzwingen es aber nicht — die Entscheidung bleibt beim Nutzer. Beispiele: Vorgabe, sensible Daten nur im geschützten/verschlüsselten Ordner abzulegen (technical), Compliance-Richtlinien und -Verfahren (managerial), Security-Policy-Schulung (operational), Türschild „authorized personnel only" ganz ohne Schloss (physical). Das Cram-Video nennt als Signalwörter Policy, Verfahren, Standard und Guideline.

## Objective 1.2

### 1.2 > CIA
`req:sy0701:v7:1.2:confidentiality-integrity-and-availability-cia`

**possibleQuestion1**

- Question: Which principle of the CIA triad ensures that information is only accessible to authorized users?
- A. Availability
- B. confidentiality
- C. integrity non-repudiation
- D. only accessible to authorized users
- Correct answer: confidentiality
- Distractors: Availability | integrity non-repudiation | only accessible to authorized users
- Source topic: `CIA-Zugriffsbeschränkung`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does CIA stand for?
- A. Confidentiality, Integrity, and Availability
- B. control integrity uh control integrity and accessibility
- C. Confidentiality identification and assurance
- D. control identification and accessibility
- Correct answer: Confidentiality, Integrity, and Availability
- Distractors: control integrity uh control integrity and accessibility | Confidentiality identification and assurance | control identification and accessibility
- Source topic: `Akronym CIA`
- Option source: transcript
- Mapping confidence: high

Messer stellt CIA als Grundgerüst der IT-Sicherheit vor (auch AIC genannt, ohne Bezug zur Behörde): Confidentiality über Verschlüsselung, Zugriffskontrollen und zusätzliche Authentifizierungsfaktoren; Integrity über Hashing, digitale Signaturen und Zertifikate; Availability über fehlertolerante/redundante Systeme und regelmäßiges Patching. Das Cram-Video ergänzt die Subjekt-Objekt-Sicht und betont, dass Confidentiality und Integrity ohne Availability wertlos sind.

### 1.2 > Non-repudiation
`req:sy0701:v7:1.2:non-repudiation`

**possibleQuestion1**

- Question: Which security principle ensures that a user cannot deny taking an action such as sending an email or making a transaction?
- A. non-repudiation
- B. CIA
- C. Gap analysis
- D. Authenticating people
- Correct answer: non-repudiation
- Distractors: CIA | Gap analysis | Authenticating people
- Source topic: `Abstreiten unmöglich`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Non-Repudiation entspricht der Unterschrift unter einem Vertrag und besteht aus Proof of Integrity (Hash/Message Digest belegt, dass nichts verändert wurde) plus Proof of Origin (digitale Signatur), zusammen mit hoher Sicherheit über die Authentizität. Technisch verschlüsselt der Absender den Hash mit seinem Private Key; der Empfänger entschlüsselt ihn mit dem Public Key und vergleicht ihn mit dem selbst berechneten Hash (Alice/Bob-Beispiel). Das Cram-Video ergänzt, dass geteilte Accounts Non-Repudiation unmöglich machen.

### 1.2 > AAA > Authenticating people
`req:sy0701:v7:1.2:authentication-authorization-and-accounting-aaa:authenticating-people`

**possibleQuestion1**

- Question: What does TACACS+ stand for?
- A. Taxacs plus terminal access controller access control service
- B. Terminal access control and communication system
- C. Terminal Access Controller Access-Control System Plus
- D. telecom access control and security
- Correct answer: Terminal Access Controller Access-Control System Plus
- Distractors: Taxacs plus terminal access controller access control service | Terminal access control and communication system | telecom access control and security
- Source topic: `TACACS+-Akronym`
- Option source: transcript
- Mapping confidence: high

Der Login beginnt mit Identification (Behauptung einer Identität, z. B. Username), gefolgt von Authentication (Passwort und ggf. weitere Faktoren beweisen die Identität), dann Authorization und Accounting/Logging. Messer zeigt das am VPN-Concentrator: das Gerät selbst kennt keine Credentials, sondern fragt einen zentralen AAA-Server, der die Freigabe zurückmeldet.

### 1.2 > AAA > Authenticating systems
`req:sy0701:v7:1.2:authentication-authorization-and-accounting-aaa:authenticating-systems`

Geräte können kein Passwort eintippen, und Passwörter auf Feldgeräten will man nicht speichern — deshalb bekommt das System ein Gerätezertifikat, das von der internen Certificate Authority digital signiert ist. Bei der Anmeldung wird geprüft, ob das Gerätezertifikat von der vertrauten CA stammt (die CA selbst ist von einer Root-CA signiert); das Zertifikat dient dann als Authentifizierungsfaktor, z. B. am VPN-Concentrator oder in der Management-Software.

### 1.2 > AAA > Authorization models
`req:sy0701:v7:1.2:authentication-authorization-and-accounting-aaa:authorization-models`

**possibleQuestion1**

- Question: Which authorization model grants access based on predefined roles assigned to users?
- A. Mandatory access control discretionary access control
- B. rolebased access control
- C. rulebased access control
- D. Access based on predefined roles assigned to users Predefined roles
- Correct answer: rolebased access control
- Distractors: Mandatory access control discretionary access control | rulebased access control | Access based on predefined roles assigned to users Predefined roles
- Source topic: `rollenbasierte Autorisierung`
- Option source: transcript
- Mapping confidence: high

Ein Authorization Model ist eine Abstraktionsschicht zwischen Nutzern/Diensten und Daten/Anwendungen — statt jedem Nutzer einzeln Rechte zuzuweisen (skaliert nicht bei hunderten Nutzern und Ressourcen), definiert man Rollen, Gruppen, Organisationen oder Attribute einmal und hängt Nutzer dort ein (Beispiel Gruppe „Shipping and Receiving"). Messer verweist für die konkrete Modell-Liste ausdrücklich auf Abschnitt 4.6; das Cram-Video zählt sie bereits auf (DAC, non-discretionary/RBAC, rule-based, MAC, ABAC) samt Subjekt-/Objekt-Begriff.

### 1.2 > Gap analysis
`req:sy0701:v7:1.2:gap-analysis`

Die Gap Analysis vergleicht den Ist-Zustand mit dem Soll-Zustand gegenüber einer Baseline (z. B. NIST SP 800-171 Rev. 2, ISO/IEC 27001 oder eigene Vorgaben) und dauert oft Wochen bis Jahre. Bewertet werden neben Systemen ausdrücklich Menschen (Erfahrung, Schulung, Kenntnis der Policies) und Prozesse; broad categories werden in Einzelanforderungen heruntergebrochen. Ergebnis ist ein Gap-Analysis-Report mit Ist/Soll-Vergleich (z. B. Ampelbewertung je Standort) und dem Weg dorthin: Zeit, Geld, Beschaffung, Change Control. Das Cram-Video nennt zusätzlich „Control Gap" und die Attestation als Ergebnis eines Audits.

### 1.2 > Zero Trust > Control Plane > Adaptive identity
`req:sy0701:v7:1.2:zero-trust:control-plane:adaptive-identity`

**possibleQuestion1**

- Question: Which principle of zero trust focuses on verifying user identities dynamically based on risk factors?
- A. policydriven access control
- B. threat scope reduction
- C. adaptive identity
- D. policy administrator
- Correct answer: adaptive identity
- Distractors: policydriven access control | threat scope reduction | policy administrator
- Source topic: `dynamische Identitätsprüfung`
- Option source: transcript
- Mapping confidence: high

Adaptive Identity bewertet nicht nur die vom Nutzer gelieferten Credentials, sondern zusätzlichen Kontext: Herkunft der Anfrage (z. B. US-Daten werden von einer chinesischen IP abgerufen), Beziehung zur Organisation (Angestellter, Contractor, Voll- oder Teilzeit), physischer Standort, Verbindungstyp und IP-Adresse. Aus dieser Auswertung erzwingt das System bei Bedarf automatisch eine stärkere Authentifizierung. Das Cram-Video illustriert das mit Conditional Access (Gerätezustand, Risiko, Standort).

### 1.2 > Zero Trust > Control Plane > Threat scope reduction
`req:sy0701:v7:1.2:zero-trust:control-plane:threat-scope-reduction`

**possibleQuestion1**

- Question: What does threat scope reduction aim to achieve?
- A. minimizing the attack surface by restricting lateral movement within the network
- B. Enforcing least privilege access control policies
- C. Implementing multifactor authentication for all users
- D. auditing user access logs for anomalies Threat scope reduction
- Correct answer: minimizing the attack surface by restricting lateral movement within the network
- Distractors: Enforcing least privilege access control policies | Implementing multifactor authentication for all users | auditing user access logs for anomalies Threat scope reduction
- Source topic: `Ziel Threat Scope Reduction`
- Option source: transcript
- Mapping confidence: high

Vertrauen lässt sich begrenzen, indem man die Zahl der möglichen Eintrittspunkte ins Netz reduziert — etwa nur Zugang aus dem Gebäude selbst oder über VPN, sonst gar nicht. Messer benutzt den Begriff „threat scope reduction" im Transkript nicht wörtlich, er beschreibt nur die Entry-Point-Begrenzung; das Cram-Video definiert Threat Scope Reduction ausdrücklich als Endziel von Zero Trust, nämlich die Verringerung des Risikos für die Organisation.

### 1.2 > Zero Trust > Control Plane > Policy-driven access control
`req:sy0701:v7:1.2:zero-trust:control-plane:policy-driven-access-control`

**possibleQuestion1**

- Question: Which zero trust concept ensures access decisions are enforced based on predefined security policies?
- A. Threat scope production
- B. adaptive identity
- C. zero trust control plane
- D. policydriven access control
- Correct answer: policydriven access control
- Distractors: Threat scope production | adaptive identity | zero trust control plane
- Source topic: `policygesteuerte Zugriffsentscheidung`
- Option source: transcript
- Mapping confidence: high

Policy-Driven Access Control führt alle gesammelten Datenpunkte (Identität, Standort, Verbindung, Zone, Beziehung zur Organisation) zusammen und entscheidet daraus, welcher Authentifizierungsprozess nötig ist, um die behauptete Identität wirklich abzusichern. Das Cram-Video schärft: Kontrollen richten sich nach der Identität des Nutzers statt nach dem Standort seines Systems; typisches Beispiel ist Conditional Access in Entra ID.

### 1.2 > Zero Trust > Control Plane > Policy Administrator
`req:sy0701:v7:1.2:zero-trust:control-plane:policy-administrator`

Der Policy Administrator nimmt die Entscheidung der Policy Engine entgegen und übermittelt sie an den Policy Enforcement Point; dabei werden Access Tokens bzw. Credentials, die aus der Entscheidung entstehen, über ihn an den PEP weitergereicht. Das Cram-Video ergänzt, dass er den Kommunikationspfad aufbaut bzw. beendet, eine Systemkomponente und keine Person ist und zusammen mit der Policy Engine den Policy Decision Point bildet.

### 1.2 > Zero Trust > Control Plane > Policy Engine
`req:sy0701:v7:1.2:zero-trust:control-plane:policy-engine`

Die Policy Engine prüft jede eingehende Anfrage gegen vordefinierte Sicherheitsrichtlinien und entscheidet, ob der Zugriff gewährt, verweigert oder widerrufen wird — sie entscheidet, setzt aber nichts selbst durch. Sie ist Teil des Policy Decision Point und erhält die Anfrage-Informationen über den Weg PEP → Policy Administrator.

### 1.2 > Zero Trust > Data Plane > Implicit trust zones
`req:sy0701:v7:1.2:zero-trust:data-plane:implicit-trust-zones`

Security Zones (untrusted, trusted, intern/extern, ggf. feiner je VPN oder Abteilung) betrachten nicht nur die Eins-zu-eins-Beziehung Nutzer→Server, sondern den gesamten Kommunikationspfad und erlauben Regeln je Zonenpaar (z. B. untrusted → trusted automatisch verweigern). Über solche Zonen entsteht implizites Vertrauen: Kommunikation aus der Trusted Zone (Firmenbüro) in die Internal Zone (Rechenzentrum) kann per Policy als implizit vertrauenswürdig gelten. Das Cram-Video ordnet implizite Trust Zones dem alten Perimeter-Denken zu.

### 1.2 > Zero Trust > Data Plane > Subject/System
`req:sy0701:v7:1.2:zero-trust:data-plane:subject-system`

**possibleQuestion1**

- Question: In the data plane of zero trust architecture, what is a subject system?
- A. an entity such as user or device requesting access to a resource
- B. a tool used to enforce access policies
- C. a mechanism for analyzing security events
- D. a database that stores access control rules
- Correct answer: an entity such as user or device requesting access to a resource
- Distractors: a tool used to enforce access policies | a mechanism for analyzing security events | a database that stores access control rules
- Source topic: `Subject/System`
- Option source: transcript
- Mapping confidence: high

Subjects und Systems sind die Kommunikationsteilnehmer im Data Plane, deren Verkehr der Policy Enforcement Point bewertet; Messer nennt konkret Nutzer, einzelne auf einem System laufende Prozesse und Anwendungen. Im Gesamtmodell starten Subject/System in der untrusted Zone und erhalten nach positiver Entscheidung Zugriff auf die Enterprise Resource; das Cram-Video trennt schärfer: Subject = Mensch, System = nicht-menschliche Entität, meist das genutzte Gerät.

### 1.2 > Zero Trust > Data Plane > Policy Enforcement Point
`req:sy0701:v7:1.2:zero-trust:data-plane:policy-enforcement-point`

**possibleQuestion1**

- Question: What component in zero trust architecture is responsible for enforcing security decisions at the resource level?
- A. Policy engine data plane
- B. the policy enforcement point
- C. implicit trust zone
- D. responsible for enforcing security decisions at the resource level
- Correct answer: the policy enforcement point
- Distractors: Policy engine data plane | implicit trust zone | responsible for enforcing security decisions at the resource level
- Source topic: `Durchsetzung an der Ressource`
- Option source: transcript
- Mapping confidence: high

Der Policy Enforcement Point ist der Gatekeeper im Data Plane — sämtlicher Netzverkehr muss ihn passieren, und er kann aus mehreren zusammenarbeitenden Geräten bestehen. Er entscheidet selbst nicht, sondern sammelt die Informationen über den Traffic und gibt sie an den Policy Decision Point weiter; nach der Entscheidung setzt er sie durch und gibt den Weg in die Trusted Zone zur Enterprise Resource frei.

### 1.2 > Physical security > Bollards
`req:sy0701:v7:1.2:physical-security:bollards`

**possibleQuestion1**

- Question: Which physical security measure is designed to prevent vehicle-based attacks on buildings and pedestrian areas?
- A. bollards
- B. access control
- C. vestibule fencing lighting
- D. prevent vehicle-based attacks on buildings and pedestrian areas
- Correct answer: bollards
- Distractors: access control | vestibule fencing lighting | prevent vehicle-based attacks on buildings and pedestrian areas
- Source topic: `Fahrzeugangriffe abwehren`
- Option source: transcript
- Mapping confidence: high

Bollards/Barrikaden lenken Personen durch definierte Zugangspunkte: Fußgänger kommen durch, Autos und Lkw nicht. Auffällige Farbgebung wirkt zusätzlich als Hinweis auf einen Hochsicherheitsbereich; typisch sind Betonpoller, es geht aber auch anders (Wassergraben mit Brücke). Das Cram-Video beschreibt sie als kurze, massive Pfosten aus Beton oder Stahl, fest oder versenkbar, primär gegen Fahrzeugangriffe.

### 1.2 > Physical security > Access control vestibule
`req:sy0701:v7:1.2:physical-security:access-control-vestibule`

Eine Access Control Vestibule ist ein Durchgangsraum mit gekoppelten Türen; je nach Auslegung sind alle Türen normal offen und verriegeln, sobald eine geöffnet wird, oder alle sind verriegelt und nur eine lässt sich zurzeit öffnen. Sie vereinzelt Personen oder schleust kontrollierte Gruppen durch, oft mit Kartenleser/Biometrie außen und Security-Check plus Besucherausweis innen; typisch für große Rechenzentren. Das Cram-Video ergänzt den alten Namen „Mantrap" und den Schutz gegen Tailgating/Piggybacking.

### 1.2 > Physical security > Fencing
`req:sy0701:v7:1.2:physical-security:fencing`

Ein Zaun ist eine sehr offensichtliche, gut sichtbare Barriere — genau deshalb eventuell nicht die gewünschte Kontrolle, aber wirksam beim Verhindern des Durchgangs. Er kann transparent oder blickdicht sein, soll robust genug sein, dass man ihn nicht verbiegen oder umwerfen kann, und in Hochsicherheitsbereichen hoch bzw. mit Stacheldraht bestückt sein. Das Cram-Video liefert Zahlen (3–4 Fuß gegen Gelegenheitstäter, 6–7 Fuß schwer kletterbar, 8 Fuß mit Stacheldraht gegen entschlossene Täter) und stuft den Zaun als Deterrent Control ein, PIDS als Detective Control.

### 1.2 > Physical security > Video surveillance
`req:sy0701:v7:1.2:physical-security:video-surveillance`

**possibleQuestion1**

- Question: What does CCTV stand for?
- A. Centralized control television
- B. computerized camera television
- C. Closed-Circuit Television
- D. comprehensive control television which is the full form of CCTV in security systems
- Correct answer: Closed-Circuit Television
- Distractors: Centralized control television | computerized camera television | comprehensive control television which is the full form of CCTV in security systems
- Source topic: `Akronym CCTV`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does PTZ stand for?
- A. Play track zoom
- B. pan tilt zone
- C. point turn zoom
- D. Pan-Tilt-Zoom
- Correct answer: Pan-Tilt-Zoom
- Distractors: Play track zoom | pan tilt zone | point turn zoom
- Source topic: `PTZ-Akronym`
- Option source: transcript
- Mapping confidence: high

Kameras ersetzen die dauerhafte Beobachtung durch Personal; ein Verbund eigener Kameras heißt CCTV. Moderne Kameras bringen Motion Detection zum Alarmieren mit und teils Objekterkennung, die Gesichter oder Kfz-Kennzeichen lesen kann; üblicherweise sind alle Kameras vernetzt und senden ihr Material an einen zentralen Speicherpunkt. Das Cram-Video ordnet Video als detektive Kontrolle ein, die zugleich abschreckend wirkt.

### 1.2 > Physical security > Security guard
`req:sy0701:v7:1.2:physical-security:security-guard`

Wenn Kamera und Automatik nicht reichen, kommt eine Wache als physischer Schutz dazu: sie sitzt typischerweise am Empfang und prüft, ob eine eintretende Person Mitarbeiter oder von einem Mitarbeiter angemeldeter Gast ist. Zwei oder mehr gleichzeitig eingesetzte Wachen ergeben Two-Person Integrity/Control, damit keine einzelne Person die Sicherheitsrichtlinie umgehen kann. Das Cram-Video stuft Guards als präventive Kontrolle ein (Abgleich mit Lichtbildausweis bei Unbekannten).

### 1.2 > Physical security > Access badge
`req:sy0701:v7:1.2:physical-security:access-badge`

Der Identifikationsausweis trägt Foto, Name und weitere Angaben, wird an Lanyard oder Kleidung sichtbar getragen, damit jeder auf einen Blick sieht, dass die Person im Bereich sein darf. Badges sind häufig in elektronische Türschlösser integriert; jedes Einbadgen wird in einer zentralen Datenbank protokolliert. Das Cram-Video stuft Access Badges als präventive Kontrolle ein.

### 1.2 > Physical security > Lighting
`req:sy0701:v7:1.2:physical-security:lighting`

Beleuchtung wirkt abschreckend, weil unbefugte Eindringlinge unbeobachtet bleiben wollen — „mehr Licht = mehr Sicherheit"; Infrarot-Kameras helfen im Dunkeln, ersetzen aber gute Ausleuchtung nicht. Wichtig sind Abdeckung der gesamten Fläche und die Lichtwinkel, besonders wenn Kameras Gesichter erkennen sollen (Beispiel Parkplatz mit 24/7-Überwachung). Das Cram-Video ergänzt Standorte an allen Ein-/Ausgängen, Effizienz über Dimmer/Bewegungsmelder/Automatik und den Schutz der Leuchtmittel (Höhe, Metallkorb); Lighting gilt als Deterrent Control.

### 1.2 > Physical security > Sensors > Infrared
`req:sy0701:v7:1.2:physical-security:sensors:infrared`

**possibleQuestion1**

- Question: Which type of sensor detects heat signatures for security monitoring?
- A. Microwave sensor
- B. infrared sensor
- C. pressure sensor ultrasonic sensor
- D. Detects heat signatures for security monitoring
- Correct answer: infrared sensor
- Distractors: Microwave sensor | pressure sensor ultrasonic sensor | Detects heat signatures for security monitoring
- Source topic: `Wärmesignatur-Sensor`
- Option source: transcript
- Mapping confidence: high

Infrarotsensoren erfassen Infrarotstrahlung sowohl in hellen als auch in dunklen Bereichen und brauchen dafür kein zusätzliches Licht; sie stecken in Kameras ebenso wie in klassischen Bewegungsmeldern, wo es nicht um Video, sondern nur um „bewegt sich da etwas" geht. Infrarot eignet sich gut für relativ begrenzte Flächen. Das Cram-Video präzisiert, dass Wärmesignaturen von Menschen, Tieren oder Objekten erkannt werden.

### 1.2 > Physical security > Sensors > Pressure
`req:sy0701:v7:1.2:physical-security:sensors:pressure`

**possibleQuestion1**

- Question: Which security measure is commonly used to detect unauthorized access attempts in high security areas?
- A. Microwave sensors
- B. pressure sensors
- C. infrared cameras video surveillance
- D. Detect unauthorized access attempts in high security areas
- Correct answer: pressure sensors
- Distractors: Microwave sensors | infrared cameras video surveillance | Detect unauthorized access attempts in high security areas
- Source topic: `Zutrittserkennung Hochsicherheit`
- Option source: transcript
- Mapping confidence: high
- Quality flags: ambiguous

Drucksensoren registrieren die Kraftänderung, wenn sich jemand über eine Fläche bewegt, und können daraufhin alarmieren. Das Cram-Video konkretisiert typische Formen (Person läuft über einen Boden oder tritt auf eine Matte) und den Einsatz in Zutrittssystemen.

### 1.2 > Physical security > Sensors > Microwave
`req:sy0701:v7:1.2:physical-security:sensors:microwave`

Für große zu überwachende Flächen eignet sich Mikrowellentechnik: Sie erkennt Bewegung über deutlich größere Distanzen als Infrarot und ist dafür effizienter. Das Cram-Video ergänzt, dass Mikrowellensensoren oft mit anderen Sensortypen kombiniert werden, um Fehlalarme zu reduzieren.

### 1.2 > Physical security > Sensors > Ultrasonic
`req:sy0701:v7:1.2:physical-security:sensors:ultrasonic`

Ultraschallsensoren senden Schallsignale aus und werten deren Reflexion aus; damit erkennen sie Bewegung und können zusätzlich Kollisionen erkennen, etwa auf Parkplätzen oder in Ladezonen. Das Cram-Video beschreibt die Laufzeitmessung der zurückkehrenden Schallwellen und nennt Einparkhilfe, Robotik-Navigation und Einbruchserkennung als Anwendungen.

### 1.2 > Deception/disruption > Honeypot
`req:sy0701:v7:1.2:deception-and-disruption-technology:honeypot`

**possibleQuestion1**

- Question: Which type of deception technology is designed to attract attackers by simulating a vulnerable system?
- A. Honey file
- B. honeynet
- C. a honeypot
- D. honey token
- Correct answer: a honeypot
- Distractors: Honey file | honeynet | honey token
- Source topic: `Lockziel für Angreifer`
- Option source: transcript
- Mapping confidence: high

Ein Honeypot lockt Angreifer — meist automatisierte Prozesse — in eine virtuelle, nicht produktive Umgebung, um zu beobachten, welche Angriffstechniken und Zielsysteme sie verwenden. Es entsteht ein Wettlauf: je besser Angreifer Honeypots erkennen, desto realistischer und intelligenter werden sie gebaut; dafür gibt es kommerzielle und Open-Source-Pakete. Das Cram-Video warnt vor Entrapment (nur anlocken, nicht ködern, sonst Beweisverwertung gefährdet) und nennt als Ziele detect, isolate, observe.

### 1.2 > Deception/disruption > Honeynet
`req:sy0701:v7:1.2:deception-and-disruption-technology:honeynet`

**possibleQuestion1**

- Question: Which deception tool consists of network of decoy systems to detect unauthorized access attempts?
- A. Honey file Honey Pot
- B. honeynet
- C. Honey Token
- D. A network of decoy systems used to detect unauthorized access attempts
- Correct answer: honeynet
- Distractors: Honey file Honey Pot | Honey Token | A network of decoy systems used to detect unauthorized access attempts
- Source topic: `Netz aus Täuschsystemen`
- Option source: transcript
- Mapping confidence: high

Ein Honeynet fasst mehrere virtualisierte Honeypots zu einer größeren, glaubwürdigeren Infrastruktur zusammen — mit Workstations, Servern, Routern, Firewalls und allem, was die Umgebung echt wirken lässt, um Angreifer länger zu beschäftigen. Messer verweist auf projecthoneypot.org; das Cram-Video definiert Honeynet knapp als Gruppe von Honeypots.

### 1.2 > Deception/disruption > Honeyfile
`req:sy0701:v7:1.2:deception-and-disruption-technology:honeyfile`

Honeyfiles sind Köderdateien mit erfundenen oder scheinbar hochsensiblen Inhalten, klassisch eine „passwords.txt", die in Wahrheit keine Passwörter enthält. Da im Produktivbetrieb niemand auf diese Dateien zugreifen sollte, kann jeder Zugriff bzw. jedes Öffnen einen Alarm an eine Management-Station auslösen.

### 1.2 > Deception/disruption > Honeytoken
`req:sy0701:v7:1.2:deception-and-disruption-technology:honeytoken`

**possibleQuestion1**

- Question: What is the purpose of a Honey token in cyber security?
- A. To mimic a vulnerable system and attract attackers to serve as a fake credential
- B. to serve as a fake credential or data entry to detect unauthorized access
- C. to create a network of decoy systems to encrypt stored files and prevent unauthorized modifications
- D. The purpose of a honey token sounds like an NFT I know
- Correct answer: to serve as a fake credential or data entry to detect unauthorized access
- Distractors: To mimic a vulnerable system and attract attackers to serve as a fake credential | to create a network of decoy systems to encrypt stored files and prevent unauthorized modifications | The purpose of a honey token sounds like an NFT I know
- Source topic: `Zweck Honeytoken`
- Option source: transcript
- Mapping confidence: high

Honeytokens sind nachverfolgbare Fake-Daten, die man ins Honeynet oder nach außen legt, um zu erkennen, wenn Daten abfließen: z. B. unbrauchbare API-Credentials auf einem öffentlichen Cloud-Share oder erfundene E-Mail-Adressen, die man im Internet überwacht. Taucht so ein Token woanders auf, weiß man, woher es stammt und wer es verbreitet hat; möglich sind auch DB-Records, Browser-Cookies oder Tracking-Pixel. Das Cram-Video verkürzt es auf „gefälschter Datensatz in einer Datenbank zur Erkennung von Datendiebstahl".

## Objective 1.3

### 1.3 > Business processes > Approval process
`req:sy0701:v7:1.3:business-processes-impacting-security-operation:approval-process`

**possibleQuestion1**

- Question: Which business process ensures that security related changes receive proper authorization before implementation?
- A. approval process
- B. standard operating procedure
- C. maintenance window impact analysis
- D. Ensures that security related changes receive proper authorization before implementation
- Correct answer: approval process
- Distractors: standard operating procedure | maintenance window impact analysis | Ensures that security related changes receive proper authorization before implementation
- Source topic: `Freigabe vor Änderung`
- Option source: transcript
- Mapping confidence: high

Jede Änderung startet mit einem formalen Change-Control-Formular an ein zentrales Gremium (Change Control Board); darin stehen Begründung, Scope, Termin/Zeitplan, betroffene Systeme und die zu erwartende Auswirkung. Das Board analysiert das Risiko und wägt es gegen das Risiko des Nicht-Änderns ab, bevor es freigibt oder ablehnt. Ohne diese Freigabe darf niemand im Netz eine Änderung durchführen.

### 1.3 > Business processes > Ownership
`req:sy0701:v7:1.3:business-processes-impacting-security-operation:ownership`

Der Owner der Anwendung oder Daten stößt die Änderung an, steuert aber weder den Change-Prozess noch führt er die Änderung selbst aus — das übernimmt z. B. die IT. Er wird während des Prozesses informiert und ist nach Abschluss dafür zuständig, seine Systeme zu testen und die korrekte Funktion zu bestätigen. Beispiel: Die Versandabteilung ist Owner des Etikettendrucker-Updates, die IT setzt die Softwareänderung um.

### 1.3 > Business processes > Stakeholders
`req:sy0701:v7:1.3:business-processes-impacting-security-operation:stakeholders`

**possibleQuestion1**

- Question: Which term refers to individuals or groups who have an interest in security decisions and outcomes?
- A. Backout plan
- B. stakeholders
- C. standard operating procedure approval process individuals
- D. groups who have an interest in security decisions and outcomes
- Correct answer: stakeholders
- Distractors: Backout plan | standard operating procedure approval process individuals | groups who have an interest in security decisions and outcomes
- Source topic: `Interessengruppen`
- Option source: transcript
- Mapping confidence: high

Stakeholder sind alle Personen und Abteilungen, die von der geplanten Änderung betroffen sind; sie wollen Einfluss auf den Ablauf und den Zeitpunkt nehmen. Wer dazugehört, ist oft nicht offensichtlich und muss von der IT aktiv ermittelt werden. Im Beispiel wirkt neue Versandetiketten-Software über den Versand hinaus auf Buchhaltung, Lieferzeiten und Umsatzrealisierung bis hinauf zum CEO.

### 1.3 > Business processes > Impact analysis
`req:sy0701:v7:1.3:business-processes-impacting-security-operation:impact-analysis`

**possibleQuestion1**

- Question: Which process is used to evaluate potential security risks and their effects on business operations, impact analysis, test results, ownership, or maintenance window?
- A. impact analysis
- B. Approval process
- C. Ownership
- D. Stakeholders
- Correct answer: impact analysis
- Distractors: Approval process | Ownership | Stakeholders
- Source topic: `Risikoauswirkung bewerten`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Bewertet wird, welches Risiko die Änderung trägt (hoch/mittel/niedrig): Der Patch behebt nichts, er zerschießt etwas anderes, das Betriebssystem fällt aus oder Daten werden beschädigt (dann braucht man Backups). Genauso muss das Risiko des Unterlassens bewertet werden — offene Schwachstelle, nicht verfügbare Anwendung, ausfallende Folgedienste. Der Cram-Kurs ergänzt, dass auch Nebenwirkungen auf andere Systeme und Stakeholder betrachtet werden müssen.

### 1.3 > Business processes > Test results
`req:sy0701:v7:1.3:business-processes-impacting-security-operation:test-results`

**possibleQuestion1**

- Question: Why are test results important in security operations?
- A. They define security roles and responsibilities
- B. They determine the required level of stakeholder involvement
- C. They schedule maintenance windows for system updates
- D. they provide evidence of system vulnerabilities and effectiveness of security measures
- Correct answer: they provide evidence of system vulnerabilities and effectiveness of security measures
- Distractors: They define security roles and responsibilities | They determine the required level of stakeholder involvement | They schedule maintenance windows for system updates
- Source topic: `Nutzen von Testergebnissen`
- Option source: transcript
- Mapping confidence: high

Vor dem Produktivgang wird in einer Sandbox getestet, die die Produktionsumgebung dupliziert — ein technischer Schutzraum, in dem Fehler folgenlos bleiben. Dort testet man nicht nur die Änderung selbst, sondern auch den Contingency-/Backout-Weg. Laut Cram-Kurs gehören die Testergebnisse in den Änderungsantrag; viele Organisationen genehmigen ungetestete Änderungen grundsätzlich nicht.

### 1.3 > Business processes > Backout plan
`req:sy0701:v7:1.3:business-processes-impacting-security-operation:backout-plan`

**possibleQuestion1**

- Question: What is the purpose of a backout plan in security operations?
- A. to provide a documented procedure for reverting changes backup plan reverting changes if an issue occurs
- B. to determine the impact of a security incident
- C. to manage stakeholder expectations during security updates
- D. to define who has an ownership over a security process The purpose of a backout plan
- Correct answer: to provide a documented procedure for reverting changes backup plan reverting changes if an issue occurs
- Distractors: to determine the impact of a security incident | to manage stakeholder expectations during security updates | to define who has an ownership over a security process The purpose of a backout plan
- Source topic: `Zweck Backout-Plan`
- Option source: transcript
- Mapping confidence: high

Der Backout-Plan ist die dokumentierte Schrittfolge, um nach einer misslungenen Änderung den ursprünglichen (oder einen weitgehend gleichwertigen) Zustand wiederherzustellen. Mal ist das trivial (Patch deinstallieren, Originaldateien prüfen), mal sehr schwer rückgängig zu machen. Deshalb gilt zusätzlich: vor jeder Änderung ein vollständiges Backup als letzte Rückfallebene, falls auch der Backout-Plan scheitert.

### 1.3 > Business processes > Maintenance window
`req:sy0701:v7:1.3:business-processes-impacting-security-operation:maintenance-window`

Die Genehmigung ist meist der einfache Teil — schwieriger ist es, überhaupt ein Zeitfenster zu finden. Änderungen laufen daher außerhalb der Arbeitszeit, nachts, an Wochenenden oder Feiertagen; in 24/7-Betrieben ist das besonders knapp. Auch die Jahreszeit zählt: Im Einzelhandel wird zwischen Thanksgiving und Neujahr oft alles eingefroren, Änderungen erst danach wieder zugelassen.

### 1.3 > Business processes > Standard operating procedure
`req:sy0701:v7:1.3:business-processes-impacting-security-operation:standard-operating-procedure`

**possibleQuestion1**

- Question: Which security measure controls which applications, websites or services can be accessed on a network?
- A. Legacy applications
- B. service restart
- C. allow lists and deny lists
- D. dependencies
- Correct answer: allow lists and deny lists
- Distractors: Legacy applications | service restart | dependencies
- Source topic: `Schritt-für-Schritt-Dokument`
- Option source: transcript
- Mapping confidence: high

Der Change-Control-Prozess ist Teil der Standardarbeitsanweisungen, durchgängig dokumentiert und im Intranet für jeden im Unternehmen einsehbar. Niemand darf ohne diese Freigabe Änderungen am Netz vornehmen. Die Prozedur selbst wird über die Zeit fortgeschrieben, um effizienter zu werden und zu den Anforderungen des Unternehmens zu passen.

### 1.3 > Technical implications > Allow lists/deny lists
`req:sy0701:v7:1.3:technical-implications:allow-lists-deny-lists`

Bei einer Allow List ist alles gesperrt außer den ausdrücklich aufgeführten Anwendungen; bei einer Deny List ist alles erlaubt außer den ausdrücklich gesperrten — Antiviren-/Anti-Malware-Software funktioniert praktisch wie eine sehr große Deny List. Gesperrt werden typischerweise Anwendungen mit bekannten Schwachstellen oder Malware-Ruf. Im Rahmen einer Änderung müssen solche Listen samt Firewall-Regeln und ACLs mit angepasst werden.

### 1.3 > Technical implications > Restricted activities
`req:sy0701:v7:1.3:technical-implications:restricted-activities`

**possibleQuestion1**

- Question: What is the primary purpose of restricting certain activities on a corporate network?
- A. not to improve productivity
- B. to enhance security by preventing unauthorized
- C. harmful actions to reduce software licensing costs
- D. to enforce compliance with software update schedules
- Correct answer: not to improve productivity
- Distractors: to enhance security by preventing unauthorized | harmful actions to reduce software licensing costs | to enforce compliance with software update schedules
- Source topic: `Zweck Aktivitätsbeschränkung`
- Option source: transcript
- Mapping confidence: high

Der Techniker darf nur das ändern, was der Change-Antrag ausdrücklich abdeckt — ein Zwei-Stunden-Fenster für Druckertreiber rechtfertigt keine anderen Updates nebenbei. Notwendige Zusatzschritte, ohne die das Hauptziel nicht erreichbar ist (z. B. eine Konfigdatei anpassen), kann ein gut dokumentierter Prozess erlauben, inklusive Regeln zur Scope-Erweiterung. Der Cram-Kurs ergänzt Aktivitäten, die man während einer Änderung sperren muss, etwa Datenänderungen während DB-Replikation oder -Migration.

### 1.3 > Technical implications > Downtime
`req:sy0701:v7:1.3:technical-implications:downtime`

**possibleQuestion1**

- Question: What is a key technical implication of downtime in an enterprise environment?
- A. reduce network latency
- B. increased risk of service disruptions and security vulnerabilities
- C. enhance system performance automatic failover to legacy applications
- D. Key technical implementation uh sorry key technical implication of downtime in enterprise environment
- Correct answer: increased risk of service disruptions and security vulnerabilities
- Distractors: reduce network latency | enhance system performance automatic failover to legacy applications | Key technical implementation uh sorry key technical implication of downtime in enterprise environment
- Source topic: `Folge von Downtime`
- Option source: transcript
- Mapping confidence: high

Eine Änderung bedeutet nicht zwingend Ausfall, aber man reserviert vorsorglich ein Fenster möglicher Nichtverfügbarkeit, bevorzugt außerhalb der Produktivzeiten. In 24/7-Umgebungen schwenkt man stattdessen (weitgehend automatisiert) auf ein Sekundärsystem, aktualisiert das Primärsystem und schaltet zurück — das ermöglicht zugleich schnelles Zurückschwenken bei Problemen. Betroffene müssen vorab informiert werden, per Rundmail oder über einen zentralen Change-Kalender.

### 1.3 > Technical implications > Service restart
`req:sy0701:v7:1.3:technical-implications:service-restart`

**possibleQuestion1**

- Question: Why is it important to restart a service after applying security patches?
- A. to finalize the installation and ensure the updates take effect
- B. to reset user access permissions
- C. to automatically update firewall rules
- D. to remove inactive user accounts
- Correct answer: to finalize the installation and ensure the updates take effect
- Distractors: to reset user access permissions | to automatically update firewall rules | to remove inactive user accounts
- Source topic: `Neustart nach Patch`
- Option source: transcript
- Mapping confidence: high

Viele Änderungen werden erst durch einen Neustart wirksam — entweder ein kompletter OS-Reboot bzw. physisches Aus-/Einschalten oder nur Stoppen und Starten eines einzelnen Dienstes (Windows-Dienste bzw. Task-Manager, unter Linux ein laufender Daemon). Ein Dienst-Neustart geht deutlich schneller als ein voller Reboot. Nebeneffekt eines Reboots: Man sieht, ob das System nach einem Stromausfall sauber wieder hochkommt.

### 1.3 > Technical implications > Application restart
`req:sy0701:v7:1.3:technical-implications:application-restart`

Wird eine ausführbare Datei aktualisiert, müssen die Nutzer sich abmelden, die Anwendung vollständig schließen und sie mit der neuen Version neu starten. Der Cram-Kurs betont, dass solche Neustarts als riskante Aktivität kontrolliert werden müssen, weil sie die Verfügbarkeit treffen — und bei Sicherheitsfunktionen zusätzlich die Schutzwirkung während der Offline-Zeit.

### 1.3 > Technical implications > Legacy applications
`req:sy0701:v7:1.3:technical-implications:legacy-applications`

**possibleQuestion1**

- Question: Which of the following is a potential security risk when using legacy applications?
- A. they often lack support for modern security updates and patches
- B. They require additional server capacity They do not support multiple user authentication methods
- C. they automatically update without administrator approval
- D. Potential security risk when using legacy applications
- Correct answer: they often lack support for modern security updates and patches
- Distractors: They require additional server capacity They do not support multiple user authentication methods | they automatically update without administrator approval | Potential security risk when using legacy applications
- Source topic: `Risiko Altanwendungen`
- Option source: transcript
- Mapping confidence: high

Legacy-Anwendungen laufen seit langem unverändert, werden meist vom Hersteller nicht mehr unterstützt (falls es ihn noch gibt) und niemand traut sich, sie anzufassen. Abhilfe ist, die Anwendung und ihre Installation zu dokumentieren und in den normalen Supportzyklus zu holen — Eigenheiten des alten Betriebssystems bleiben, aber das Wissen ist nicht mehr auf eine Person beschränkt. Sicherheitsseitig bringen sie Schwachstellen mit, weil sie ohne heutiges Bedrohungswissen entworfen wurden.

### 1.3 > Technical implications > Dependencies
`req:sy0701:v7:1.3:technical-implications:dependencies`

Abhängigkeiten bedeuten, dass eine Anwendung oder ein Dienst erst geändert werden muss, bevor eine andere installiert oder aktualisiert werden kann — oder dass ein Dienst erst mit einem zweiten zusammen funktioniert. Sie reichen über Systemgrenzen hinweg: Erst müssen alle Firewalls auf einen neuen Codestand, dann lässt sich die Firewall-Management-Software aktualisieren. Dadurch wächst ein geplantes Einzel-Update zu einer Kette von Änderungen und verkompliziert den Change-Prozess.

### 1.3 > Documentation > Updating diagrams
`req:sy0701:v7:1.3:documentation:updating-diagrams`

**possibleQuestion1**

- Question: Which of the following is a reason to update network diagrams regularly?
- A. To improve the performance of the outdated software
- B. to comply with software licensing agreements
- C. to reflect changes in the infrastructure and ensure accurate security planning
- D. to optimize database indexing
- Correct answer: to reflect changes in the infrastructure and ensure accurate security planning
- Distractors: To improve the performance of the outdated software | to comply with software licensing agreements | to optimize database indexing
- Source topic: `Netzdiagramme aktualisieren`
- Option source: transcript
- Mapping confidence: high

Weil in großen Umgebungen wöchentlich oder täglich geändert wird, veraltet die Dokumentation sehr schnell, wenn sie nicht fortlaufend gepflegt wird. Der Change-Prozess verlangt deshalb das Nachziehen von Netzdiagrammen und Übersichtsplänen inklusive geänderter IP-Adressen und Konfigurationen. Laut Cram-Kurs gilt eine Änderung erst als abgeschlossen, wenn Dokumentation und Diagramme aktualisiert sind.

### 1.3 > Documentation > Updating policies/procedures
`req:sy0701:v7:1.3:documentation:updating-policies-procedures`

**possibleQuestion1**

- Question: Why is it necessary to update security policies and procedures?
- A. To improve application performance
- B. to automate the patch management process
- C. I again, the one that's outside of the box to ensure they reflect new threats, technologies, and compliance requirements
- D. to enhance encryption algorithms
- Correct answer: I again, the one that's outside of the box to ensure they reflect new threats, technologies, and compliance requirements
- Distractors: To improve application performance | to automate the patch management process | to enhance encryption algorithms
- Source topic: `Policies aktualisieren`
- Option source: transcript
- Mapping confidence: high

Nachzuziehen sind nicht nur Diagramme, sondern auch die steuernden Dokumente: neue oder geänderte Abläufe und Verfahren für den Betrieb einer aktualisierten Anwendung. Der Cram-Kurs begründet das sicherheitsseitig: Ein System, dessen tatsächlicher Ist-Zustand nicht bekannt ist, lässt sich nicht vollständig absichern — Kontrollen auf Basis veralteter Angaben lassen Lücken offen, von denen niemand weiß.

### 1.3 > Version control
`req:sy0701:v7:1.3:version-control`

**possibleQuestion1**

- Question: What is the primary benefit of using version control in security documentation?
- A. it tracks changes over time, allows roll back to a previous version if needed
- B. It automatically enforces user authentication policies
- C. It provides real-time network monitoring capabilities
- D. it restricts users from modifying security configurations
- Correct answer: it tracks changes over time, allows roll back to a previous version if needed
- Distractors: It automatically enforces user authentication policies | It provides real-time network monitoring capabilities | it restricts users from modifying security configurations
- Source topic: `Nutzen Versionskontrolle`
- Option source: transcript
- Mapping confidence: high

Versionsverwaltung verfolgt, welche Stände von Code, Software und Konfigurationen im Einsatz sind, und erlaubt das Zurückkehren zu einer früheren Version — von Router-Konfigurationen über Windows-Patches bis zu Registry-Änderungen. Ist sie im Produkt nicht eingebaut, setzt man ein Drittanbieter-System ein. Der Cram-Kurs ergänzt Git als De-facto-Standard mit Branches für dev/test/prod, betont aber, dass für die Prüfung die Funktion zählt, nicht das konkrete Produkt.

## Objective 1.4

### 1.4 > PKI > Public key
`req:sy0701:v7:1.4:public-key-infrastructure-pki:public-key`

**possibleQuestion1**

- Question: Which component of cyber security provides a framework for managing digital certificates and encryption keys?
- A. Key escrow
- B. encryption private key
- C. public key infrastructure like the little smart cards
- D. A framework for managing digital certificates and encryption keys
- Correct answer: public key infrastructure like the little smart cards
- Distractors: Key escrow | encryption private key | A framework for managing digital certificates and encryption keys
- Source topic: `Funktion Public Key`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does PKI stand for?
- A. Private key identification
- B. Public Key Infrastructure
- C. public key integration
- D. private key infrastructure
- Correct answer: Public Key Infrastructure
- Distractors: Private key identification | public key integration | private key infrastructure
- Source topic: `PKI-Akronym`
- Option source: transcript
- Mapping confidence: high

PKI umfasst Richtlinien, Prozesse und oft Hard-/Software für Erstellung, Verteilung, Verwaltung, Speicherung und Widerruf digitaler Zertifikate. Der Public Key ist einer von zwei gleichzeitig erzeugten, mathematisch verbundenen Schlüsseln und darf frei verteilt werden (Website, Social Media); jeder kann damit Daten für den Besitzer verschlüsseln, die nur dessen Private Key öffnet. Aus dem Public Key lässt sich der Private Key nicht zurückrechnen; laut Cram dient der Public Key zusätzlich zur Prüfung fremder Signaturen.

### 1.4 > PKI > Private key
`req:sy0701:v7:1.4:public-key-infrastructure-pki:private-key`

**possibleQuestion1**

- Question: What is the function of a public key in asymmetric encryption?
- A. it encrypts data that can only be decrypted by the corresponding private key
- B. Decrypts data encrypted with the same public key
- C. Manages the storage of encryption keys ensures data remains unchanged during transmission
- D. The function of a public key in asymmetric encryption
- Correct answer: it encrypts data that can only be decrypted by the corresponding private key
- Distractors: Decrypts data encrypted with the same public key | Manages the storage of encryption keys ensures data remains unchanged during transmission | The function of a public key in asymmetric encryption
- Source topic: `Eigenschaft Private Key`
- Option source: transcript
- Mapping confidence: high

Der Private Key bleibt ausschließlich beim Besitzer, wird lokal gespeichert und meist zusätzlich mit einem Passwort geschützt. Er ist der einzige Schlüssel, der mit dem zugehörigen Public Key verschlüsselte Daten entschlüsseln kann, und er erzeugt digitale Signaturen. Laut Cram trifft eine Kompromittierung nur den Eigentümer selbst, während bei symmetrischen Schlüsseln sofort alle Beteiligten betroffen sind.

### 1.4 > PKI > Key escrow
`req:sy0701:v7:1.4:public-key-infrastructure-pki:key-escrow`

**possibleQuestion1**

- Question: How regular escrow services where they hold money is very similar in key escrow. So to store encryption keys securely for retrieval by authorized parties. Uh what is the primary function of encryption in cyber security?
- A. to convert data into an unreadable format to protect confidentiality
- B. Public key
- C. Private key
- D. Full-disk
- Correct answer: to convert data into an unreadable format to protect confidentiality
- Distractors: Public key | Private key | Full-disk
- Source topic: `RA (Rolle)`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion2**

- Question: Which of the following is a characteristic of a private key in asymmetric encryption?
- A. It is shared publicly to allow data encryption It can be used to verify digital signatures only
- B. And we we basically just touched on this in the previous question is it is kept secret and used to decrypt messages encrypted with the public key
- C. it is stored with a key It is stored in a key escrow for public access
- D. a characteristic of a private key in asymmetric encryption
- Correct answer: And we we basically just touched on this in the previous question is it is kept secret and used to decrypt messages encrypted with the public key
- Distractors: It is shared publicly to allow data encryption It can be used to verify digital signatures only | it is stored with a key It is stored in a key escrow for public access | a characteristic of a private key in asymmetric encryption
- Source topic: `Zweck Key Escrow`
- Option source: transcript
- Mapping confidence: high

Beim Key Escrow werden private Schlüssel bei einem vertrauenswürdigen Dritten oder in der eigenen Organisation hinterlegt, damit verschlüsselte Daten auch ohne den ursprünglichen Eigentümer zugänglich bleiben — etwa nach einem Mitarbeiteraustritt oder bei behördlichen Partnerprojekten. Das Abgeben des privaten Schlüssels wirkt kontraintuitiv, ist aber für Verfügbarkeit der Unternehmensdaten teils zwingend; der Cram nennt zusätzlich Schlüsselverlust als Hauptmotiv.

### 1.4 > Encryption > Level > Full-disk
`req:sy0701:v7:1.4:encryption:level:full-disk`

**possibleQuestion1**

- Question: Which type of encryption ensures that an entire hard drive's data is protected?
- A. full disk encryption
- B. file encryption partition encryption
- C. public key encryption
- D. Ensures entire hard drives data is protected
- Correct answer: full disk encryption
- Distractors: file encryption partition encryption | public key encryption | Ensures entire hard drives data is protected
- Source topic: `ganze Festplatte`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does FDE stand for?
- A. file data encryption
- B. fast data encryption
- C. Full-Disk Encryption
- D. full data encoding with the full form of FD in data protection
- Correct answer: Full-Disk Encryption
- Distractors: file data encryption | fast data encryption | full data encoding with the full form of FD in data protection
- Source topic: `FDE-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion3**

- Question: What does SED stand for?
- A. Secure encrypted data
- B. software enabled drive
- C. Self-Encrypting Drive
- D. simple encryption device
- Correct answer: Self-Encrypting Drive
- Distractors: Secure encrypted data | software enabled drive | simple encryption device
- Source topic: `SED-Akronym`
- Option source: transcript
- Mapping confidence: high

Full-Disk-Encryption verschlüsselt den gesamten Datenträger („data at rest"), typisch BitLocker unter Windows und FileVault unter macOS. Laut Cram nutzt FDE dabei das TPM des Mainboards zur Schlüsselablage und damit einen Hardware Root of Trust, der vor dem Secure Boot die Schlüssel abgleicht; Self-Encrypting Drives (Opal-Spezifikation) erledigen dasselbe direkt in der Laufwerkshardware.

### 1.4 > Encryption > Level > Partition
`req:sy0701:v7:1.4:encryption:level:partition`

**possibleQuestion1**

- Question: What type of encryption protects a specific section of a storage device instead of the entire disc?
- A. full disk encryption
- B. public key encryption
- C. partition encryption
- D. key escro encryption
- Correct answer: partition encryption
- Distractors: full disk encryption | public key encryption | key escro encryption
- Source topic: `Teilbereich des Datenträgers`
- Option source: transcript
- Mapping confidence: high

Eine Partition ist ein physisch abgegrenzter Abschnitt eines Datenträgers (unter Windows typischerweise das Laufwerk C:). BitLocker schützt laut Cram Disks, Volumes und Partitionen gleichermaßen; die Unterscheidung Partition/Volume wird ausdrücklich nur zur Begriffsklärung gebracht und dürfte in der Prüfung nicht vertieft werden.

### 1.4 > Encryption > Level > File
`req:sy0701:v7:1.4:encryption:level:file`

**possibleQuestion1**

- Question: Which term refers to the scope at which encryption is applied to a system or storage device?
- A. Partition key escrow
- B. public key infrastructure
- C. level
- D. The scope at
- Correct answer: level
- Distractors: Partition key escrow | public key infrastructure | The scope at
- Source topic: `einzelne Dokumente`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does EFS stand for?
- A. Electronics file security
- B. Encrypting File System
- C. encrypted file storage
- D. enhanced file system
- Correct answer: Encrypting File System
- Distractors: Electronics file security | encrypted file storage | enhanced file system
- Source topic: `EFS-Akronym`
- Option source: transcript
- Mapping confidence: high

Auf Dateiebene wird nur eine einzelne Datei statt des ganzen Volumes verschlüsselt — unter Windows über EFS (Encrypting File System), eingebaut in NTFS und per Datei-/Ordner-Eigenschaften unter „Erweiterte Attribute" aktivierbar; für macOS und Linux gibt es entsprechende Drittanbieter-Tools. Das ist die granularste Stufe, jede Datei kann einen eigenen Schlüssel haben.

### 1.4 > Encryption > Level > Volume
`req:sy0701:v7:1.4:encryption:level:volume`

**possibleQuestion1**

- Question: Which encryption method is used to secure an entire storage unit such as a disk or logical volume?
- A. An entire storage unit Database encryption
- B. volume encryption
- C. record encryption symmetric encryption
- D. to secure an entire storage unit such as a disk logical volume
- Correct answer: volume encryption
- Distractors: An entire storage unit Database encryption | record encryption symmetric encryption | to secure an entire storage unit such as a disk logical volume
- Source topic: `ganze Speichereinheit/Volume`
- Option source: transcript
- Mapping confidence: high
- Quality flags: ambiguous

Ein Volume ist eine logische Speichereinheit, die eine oder mehrere Partitionen bzw. sogar mehrere Datenträger zusammenfassen kann. Volume-Verschlüsselung schützt alles in diesem Bereich und erlaubt unterschiedliche Schutzniveaus, etwa getrennt für System- und Datenvolume.

### 1.4 > Encryption > Level > Database
`req:sy0701:v7:1.4:encryption:level:database`

**possibleQuestion1**

- Question: Which security measure ensures that sensitive data stored in a database remains encrypted?
- A. Record encryption
- B. transport encryption
- C. key exchange
- D. database encryption
- Correct answer: database encryption
- Distractors: Record encryption | transport encryption | key exchange
- Source topic: `Datenbankinhalt`
- Option source: transcript
- Mapping confidence: high

Auf Datenbankebene verschlüsselt „transparent encryption" (TDE) mit einem symmetrischen Schlüssel den gesamten Datenbestand; jeder Zugriff erfordert Ent-/Verschlüsselung, weshalb eine Suche über die ganze Datenbank spürbaren Overhead erzeugt. Laut Cram deckt TDE Datenbankdateien, Logs und Backups ohne Anwendungsänderung ab und ist bei praktisch allen gängigen RDBMS verfügbar.

### 1.4 > Encryption > Level > Record
`req:sy0701:v7:1.4:encryption:level:record`

**possibleQuestion1**

- Question: Which type of encryption protects individual entries within a database?
- A. Volume encryption key exchange encryption
- B. record encryption
- C. symmetric encryption
- D. Individual entries within a database
- Correct answer: record encryption
- Distractors: Volume encryption key exchange encryption | symmetric encryption | Individual entries within a database
- Source topic: `einzelne Datensätze`
- Option source: transcript
- Mapping confidence: high

Statt der ganzen Datenbank verschlüsselt man gezielt einzelne Teile: bei Spaltenverschlüsselung bleiben ID und Name im Klartext durchsuchbar, während z. B. die Sozialversicherungsnummer geschützt ist — für den Zugriff muss dann die ganze Spalte oder der einzelne Datensatz entschlüsselt werden. Der Cram trennt das sauber: Row-/Record-Level verschlüsselt einen kompletten Datensatz, Column-Level einzelne Felder darin.

### 1.4 > Encryption > Transport/communication
`req:sy0701:v7:1.4:encryption:transport-communication`

**possibleQuestion1**

- Question: Which type of encryption secures data as it moves across a network?
- A. transport encryption
- B. database encryption
- C. volume encryption asymmetric encryption
- D. Secures data as it moves across a network
- Correct answer: transport encryption
- Distractors: database encryption | volume encryption asymmetric encryption | Secures data as it moves across a network
- Source topic: `Daten im Transit`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does HTTPS stand for?
- A. Hypertext transfer protocol service
- B. hyper terminal transfer protocol secure
- C. hypertext transfer pro protection protocol
- D. Hypertext Transfer Protocol Secure
- Correct answer: Hypertext Transfer Protocol Secure
- Distractors: Hypertext transfer protocol service | hyper terminal transfer protocol secure | hypertext transfer pro protection protocol
- Source topic: `HTTPS-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion3**

- Question: What does SSL stand for?
- A. Secure socket login
- B. secure system layer
- C. Secure Sockets Layer
- D. system secure layer in web security
- Correct answer: Secure Sockets Layer
- Distractors: Secure socket login | secure system layer | system secure layer in web security
- Source topic: `SSL-Akronym`
- Option source: transcript
- Mapping confidence: high

Transportverschlüsselung schützt Daten während der Übertragung zwischen zwei Endpunkten — im Browser praktisch immer HTTPS, für Standort- oder Remote-Anbindung ein VPN-Tunnel (SSL/TLS beim Client-VPN, IPsec bei Site-to-Site). Der Cram ergänzt: TLS hat SSL faktisch abgelöst, die Begriffe werden aber synonym verwendet; Synonym für „data in transit" ist „data in motion".

### 1.4 > Encryption > Asymmetric
`req:sy0701:v7:1.4:encryption:asymmetric`

**possibleQuestion1**

- Question: Which encryption type uses a pair of keys, one for encryption and one for decryption?
- A. symmetric encryption volume encryption
- B. asymmetric encryption
- C. record encryption A pair of keys
- D. one for encryption and one for decryption
- Correct answer: asymmetric encryption
- Distractors: symmetric encryption volume encryption | record encryption A pair of keys | one for encryption and one for decryption
- Source topic: `Schlüsselpaar`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does ECC stand for?
- A. Elliptic Curve Cryptography
- B. Transport/communication
- C. Symmetric
- D. Key exchange
- Correct answer: Elliptic Curve Cryptography
- Distractors: Transport/communication | Symmetric | Key exchange
- Source topic: `ECC-Akronym`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion3**

- Question: What does ECDH stand for?
- A. Elliptic Curve Diffie-Hellman
- B. Transport/communication
- C. Symmetric
- D. Key exchange
- Correct answer: Elliptic Curve Diffie-Hellman
- Distractors: Transport/communication | Symmetric | Key exchange
- Source topic: `ECDH-Akronym`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion4**

- Question: What does RSA stand for?
- A. Rivest-Shamir-Adleman
- B. Rivst Smith and Anderson
- C. reliable security algorithm
- D. rapid security application
- Correct answer: Rivest-Shamir-Adleman
- Distractors: Rivst Smith and Anderson | reliable security algorithm | rapid security application
- Source topic: `RSA-Akronym`
- Option source: transcript
- Mapping confidence: high

Asymmetrische Verschlüsselung nutzt zwei gleichzeitig erzeugte, mathematisch verbundene Schlüssel: verschlüsselt wird mit dem Public Key des Empfängers, entschlüsselt mit dessen Private Key. Sie skaliert gut, löst das Schlüsselverteilungsproblem und ermöglicht Nichtabstreitbarkeit, ist aber für Massendaten langsam und wird deshalb vor allem für Schlüsselaustausch, Signaturen und Zertifikate eingesetzt (RSA, ECC, Diffie-Hellman, ElGamal; NIST-Minimum 2048 Bit).

### 1.4 > Encryption > Symmetric
`req:sy0701:v7:1.4:encryption:symmetric`

**possibleQuestion1**

- Question: Which encryption method uses the same key for both encryption and decryption?
- A. symmetric encryption
- B. asymmetric encryption
- C. key exchange encryption transport encryption
- D. the same key for both encryption and decryption
- Correct answer: symmetric encryption
- Distractors: asymmetric encryption | key exchange encryption transport encryption | the same key for both encryption and decryption
- Source topic: `gleicher Schlüssel`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does ECB stand for?
- A. Electronic Codebook
- B. encrypted communication block
- C. electronic cipher block
- D. enhanced code block In encryption modes,
- Correct answer: Electronic Codebook
- Distractors: encrypted communication block | electronic cipher block | enhanced code block In encryption modes,
- Source topic: `ECB-Betriebsmodus`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion3**

- Question: What does GCM stand for?
- A. Global cipher mode
- B. general cryptographic mode
- C. Galois/Counter Mode
- D. generic cipher mode in cryptography
- Correct answer: Galois/Counter Mode
- Distractors: Global cipher mode | general cryptographic mode | generic cipher mode in cryptography
- Source topic: `GCM-Betriebsmodus`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion4**

- Question: What does IDEA stand for?
- A. International digital encryption algorithm
- B. integrated data encryption algorithm
- C. International Data Encryption Algorithm
- D. integrated digital encryption algorithm
- Correct answer: International Data Encryption Algorithm
- Distractors: International digital encryption algorithm | integrated data encryption algorithm | integrated digital encryption algorithm
- Source topic: `IDEA-Algorithmus`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion5**

- Question: What does RC4 stand for?
- A. Rivest Cipher 4
- B. Transport/communication
- C. Asymmetric
- D. Key exchange
- Correct answer: Rivest Cipher 4
- Distractors: Transport/communication | Asymmetric | Key exchange
- Source topic: `RC4-Akronym`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Symmetrische Verschlüsselung verwendet für Ver- und Entschlüsselung denselben Schlüssel, daher auch „secret key algorithm" oder „shared secret". Sie ist sehr schnell und overhead-arm und damit die Wahl für Massendaten, hat aber ein Skalierungsproblem: ab etwa zehn Beteiligten wird das sichere Verteilen und Zuordnen der Schlüssel schwierig, und Nichtabstreitbarkeit bietet sie nicht (AES 128–256, 3DES, Twofish, Blowfish).

### 1.4 > Encryption > Key exchange
`req:sy0701:v7:1.4:encryption:key-exchange`

**possibleQuestion1**

- Question: What is the purpose of key exchange in encryption?
- A. To generate random encryption keys to store encryption keys in a database
- B. to encrypt sensitive data using a shared key
- C. to securely share encryption keys between parties
- D. The purpose of key exchange in encryption
- Correct answer: to securely share encryption keys between parties
- Distractors: To generate random encryption keys to store encryption keys in a database | to encrypt sensitive data using a shared key | The purpose of key exchange in encryption
- Source topic: `Zweck Key Exchange`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does DHE stand for?
- A. Dynamic hash exchange data handling encryption
- B. digital host ephemeral
- C. Diffie-Hellman Ephemeral
- D. in cryptographic key exchanges
- Correct answer: Diffie-Hellman Ephemeral
- Distractors: Dynamic hash exchange data handling encryption | digital host ephemeral | in cryptographic key exchanges
- Source topic: `Akronym DHE`
- Option source: transcript
- Mapping confidence: high

Kernproblem ist, den gemeinsamen Schlüssel zu übergeben, ohne ihn über ein unsicheres Medium zu schicken: out-of-band per Kurier, Telefon oder persönlich, in-band z. B. indem ein symmetrischer Sessionkey mit dem Public Key des Servers verschlüsselt übertragen und dort mit dem Private Key ausgepackt wird. Key-Exchange-Algorithmen gehen noch weiter: jede Seite kombiniert den eigenen Private Key mit dem Public Key der Gegenseite und erzeugt so beidseitig denselben symmetrischen Schlüssel, ohne ihn je zu senden. Sessionkeys sind dabei ephemer und werden nach der Sitzung verworfen.

### 1.4 > Encryption > Algorithms
`req:sy0701:v7:1.4:encryption:algorithms`

**possibleQuestion1**

- Question: Which component of encryption defines the mathematical process used to encrypt and decrypt data?
- A. encryption algorithm
- B. key exchange
- C. symmetric key
- D. asymmetric key
- Correct answer: encryption algorithm
- Distractors: key exchange | symmetric key | asymmetric key
- Source topic: `mathematisches Verfahren`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does AES stand for?
- A. Advanced Encryption Standard
- B. advanced encryption scheme 256-bit
- C. authenticated encryption standard 256-bit
- D. asymmetric encryption standard 256-bit
- Correct answer: Advanced Encryption Standard
- Distractors: advanced encryption scheme 256-bit | authenticated encryption standard 256-bit | asymmetric encryption standard 256-bit
- Source topic: `Akronym AES`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion3**

- Question: What does CBC stand for?
- A. Cipher Block Chaining
- B. cipher block check
- C. code blockchaining
- D. cipher batch chain
- Correct answer: Cipher Block Chaining
- Distractors: cipher block check | code blockchaining | cipher batch chain
- Source topic: `Akronym CBC`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion4**

- Question: What does CFB stand for?
- A. Cipher Feedback
- B. coded feedback
- C. cascading feedback critical feedback
- D. In cryptographic feedback modes,
- Correct answer: Cipher Feedback
- Distractors: coded feedback | cascading feedback critical feedback | In cryptographic feedback modes,
- Source topic: `Akronym CFB`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion5**

- Question: What does DES stand for?
- A. Data Encryption Standard
- B. digital encoding standard
- C. dual encryption system
- D. digital encryption standard
- Correct answer: Data Encryption Standard
- Distractors: digital encoding standard | dual encryption system | digital encryption standard
- Source topic: `Akronym DES`
- Option source: transcript
- Mapping confidence: high

Beide Kommunikationsseiten müssen denselben Algorithmus nutzen — mit DES verschlüsselt und mit AES entschlüsselt funktioniert nicht. Algorithmen sind öffentlich bekannt und gerade dadurch vertrauenswürdig; geheim ist allein der Schlüssel (Messers Türschloss-Analogie). Die Auswahl erfolgt nach Sicherheitsniveau, Geschwindigkeit und Implementierungsaufwand; der Cram ergänzt Stream- vs. Block-Cipher sowie historische Substitutions- und Transpositions-Chiffren.

### 1.4 > Encryption > Key length
`req:sy0701:v7:1.4:encryption:key-length`

**possibleQuestion1**

- Question: What factor in encryption determines the strength of a cryptographic key?
- A. Algorithm type
- B. encryption mode
- C. key length
- D. transport protocol
- Correct answer: key length
- Distractors: Algorithm type | encryption mode | transport protocol
- Source topic: `AES-256`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: Which of the following is a key function of authentication in the AAA model?
- A. Enforcing access policies
- B. tracking user activity encrypting stored data
- C. verifying a user's identity
- D. Key function of authentication
- Correct answer: verifying a user's identity
- Distractors: Enforcing access policies | tracking user activity encrypting stored data | Key function of authentication
- Source topic: `Schlüsselstärke`
- Option source: transcript
- Mapping confidence: high

Schlüssel sind grundsätzlich brute-force-angreifbar; ein längerer Schlüssel vergrößert den Schlüsselraum exponentiell und damit den Aufwand (work factor) — von 128 auf 256 Bit ist nicht doppelt, sondern 2^128-mal so stark. Praxiswerte: symmetrisch heute mindestens 128 Bit, asymmetrisch 3072 Bit oder mehr (Messer) bzw. NIST-Minimum 2048 Bit für RSA (Cram); mit wachsender Rechenleistung müssen die Längen mitwachsen.

### 1.4 > Tools > TPM
`req:sy0701:v7:1.4:tools:trusted-platform-module-tpm`

**possibleQuestion1**

- Question: What does TPM stand for?
- A. Trusted processing method
- B. technical platform module
- C. Trusted Platform Module
- D. technology processing module
- Correct answer: Trusted Platform Module
- Distractors: Trusted processing method | technical platform module | technology processing module
- Source topic: `TPM-Akronym`
- Option source: transcript
- Mapping confidence: high

Das TPM ist ein standardisierter Chip auf dem Mainboard, der kryptografische Funktionen für genau dieses eine Gerät bereitstellt: Zufallszahlen und Schlüssel erzeugen sowie persistent und gerätegebunden speichern, typischerweise für Full-Disk-Encryption/BitLocker. Es ist passwortgeschützt und gegen Brute-Force- und Dictionary-Angriffe gehärtet; der Cram nennt es zusätzlich als Baustein des Secure-OS-Boot und als Hardware Root of Trust.

### 1.4 > Tools > HSM
`req:sy0701:v7:1.4:tools:hardware-security-module-hsm`

**possibleQuestion1**

- Question: Which device is specifically designed to manage and protect cryptographic keys in high security environments?
- A. trusted platform module
- B. secure enclave
- C. the hardware security module
- D. key exchange protocol specifically designed to manage and protect cryptographic keys in high security envi environments
- Correct answer: the hardware security module
- Distractors: trusted platform module | secure enclave | key exchange protocol specifically designed to manage and protect cryptographic keys in high security envi environments
- Source topic: `Key-Schutz-Gerät`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does HSM stand for?
- A. Hardware Security Module
- B. host security manager
- C. hardware software module
- D. hybrid security module
- Correct answer: Hardware Security Module
- Distractors: host security manager | hardware software module | hybrid security module
- Source topic: `HSM-Akronym`
- Option source: transcript
- Mapping confidence: high

Ein HSM erfüllt dieselbe Aufgabe wie ein TPM, aber im großen Maßstab für hunderte oder tausende Systeme — etwa die zentrale, sichere Ablage der Schlüssel aller Webserver eines Rechenzentrums. HSMs laufen dort meist geclustert mit redundanter Stromversorgung und Netzanbindung und können Krypto-Beschleunigerkarten für Echtzeit-Ver-/Entschlüsselung enthalten; laut Cram ist ein HSM anders als das fest verlötete TPM oft ein externes oder steckbares Gerät.

### 1.4 > Tools > Key management system
`req:sy0701:v7:1.4:tools:key-management-system`

**possibleQuestion1**

- Question: What is the main purpose of a key management system in cryptographic security?
- A. to securely generate, store, distribute, and retire encryption keys
- B. TPM
- C. HSM
- D. Secure enclave
- Correct answer: to securely generate, store, distribute, and retire encryption keys
- Distractors: TPM | HSM | Secure enclave
- Source topic: `Zweck KMS`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion2**

- Question: What does KEK stand for?
- A. Key Encryption Key
- B. TPM
- C. HSM
- D. Secure enclave
- Correct answer: Key Encryption Key
- Distractors: TPM | HSM | Secure enclave
- Source topic: `KEK-Akronym`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Ein Key Management System bündelt alle Schlüsselarten (SSL/TLS, SSH, Active Directory, BitLocker, Nutzerzertifikate) in einer zentralen Konsole — on-premises oder cloudbasiert — und hält die Schlüssel getrennt von den geschützten Daten. Es ordnet Schlüssel Nutzern zu, erlaubt automatische Key Rotation und liefert Logging, Reporting und Ablaufüberwachung; der Cram nennt als Cloud-Ausprägung die Vaults von Azure/AWS/GCP mit API-Zugriff und FIPS-validierten HSMs.

### 1.4 > Tools > Secure enclave
`req:sy0701:v7:1.4:tools:secure-enclave`

Ein Secure Enclave ist ein eigener Sicherheitsprozessor neben der Haupt-CPU (in Smartphones, Laptops, Desktops) mit eigenem Boot-ROM, der Prozesse und besonders den Bootvorgang überwacht. Er bietet einen echten Zufallszahlengenerator, unveränderliche eingebaute Schlüssel als Wurzel aller weiteren Kryptografie sowie AES- und Echtzeit-Speicherverschlüsselung in Hardware; der Cram nennt ihn synonym „Trusted Execution Environment".

### 1.4 > Obfuscation > Steganography
`req:sy0701:v7:1.4:obfuscation:steganography`

**possibleQuestion1**

- Question: Which data hiding technique involves embedding hidden information within an image or audio file?
- A. Offiscation tokenization
- B. steganography
- C. hashing Embedding hidden information within an image
- D. audio file
- Correct answer: steganography
- Distractors: Offiscation tokenization | hashing Embedding hidden information within an image | audio file
- Source topic: `Verstecken in Bild/Audio`
- Option source: transcript
- Mapping confidence: high

Steganografie („verborgenes Schreiben") versteckt Daten in einer unauffälligen Trägerdatei, dem Covertext — klassisch ein Bild, aber ebenso Audio, Video, eingebettete Nachrichten in TCP-Paketen oder die fast unsichtbaren gelben Machine-Identification-Codes von Laserdruckern. Wer das Verfahren kennt, kann die Daten wieder herausholen, weshalb es als security through obscurity und damit nicht als echte Sicherheit gilt.

### 1.4 > Obfuscation > Tokenization
`req:sy0701:v7:1.4:obfuscation:tokenization`

**possibleQuestion1**

- Question: Which security method replaces sensitive data with it with a nonsensitive equivalent reducing the risk of exposure?
- A. Sensitive data replacing sensitive data with a non-sensitive equivalent
- B. tokenization
- C. steganography
- D. obfuscation encryption Replacing sensitive data with a nonsensitive equivalent
- Correct answer: tokenization
- Distractors: Sensitive data replacing sensitive data with a non-sensitive equivalent | steganography | obfuscation encryption Replacing sensitive data with a nonsensitive equivalent
- Source topic: `Ersatz durch nicht-sensibles Äquivalent`
- Option source: transcript
- Mapping confidence: high

Bei der Tokenisierung ersetzt man sensible Daten durch ein zufällig erzeugtes Token ohne mathematischen Bezug zum Original; die Zuordnung liegt beim Token-Service-Server. Beim mobilen Bezahlen wird ein Einmal-Token per NFC übergeben, vom Händler beim Token-Service rückaufgelöst und danach verworfen — deshalb muss die Übertragung selbst weder verschlüsselt noch gehasht werden.

### 1.4 > Obfuscation > Data masking
`req:sy0701:v7:1.4:obfuscation:data-masking`

**possibleQuestion1**

- Question: Which security technique replaces sensitive data with altered values to protect personal information?
- A. Hashing
- B. salting encryption
- C. data masking
- D. Replaces sensitive data with altered values to protect personal information
- Correct answer: data masking
- Distractors: Hashing | salting encryption | Replaces sensitive data with altered values to protect personal information
- Source topic: `Ersatz durch veränderte Werte`
- Option source: transcript
- Mapping confidence: high

Data Masking zeigt nur einen Teil der sensiblen Daten und ersetzt den Rest, etwa Kreditkartennummer als Sternchenkette plus letzte vier Ziffern auf dem Kassenbon oder eingeschränkte Sicht für Callcenter-Mitarbeiter. Maskieren muss nicht über Sternchen laufen — Ziffern können auch umgestellt oder ersetzt werden; laut Cram wird das meist im Datenbank-Layer umgesetzt, teils mit automatischen Maskierungsvorschlägen in Cloud-PaaS-Datenbanken.

### 1.4 > Hashing
`req:sy0701:v7:1.4:hashing`

**possibleQuestion1**

- Question: Which process converts data into a fixedlength irreversible string to ensure data integrity?
- A. hashing
- B. salting
- C. digital signatures encryption
- D. Fixed length irreversible string to ensure data integrity
- Correct answer: hashing
- Distractors: salting | digital signatures encryption | Fixed length irreversible string to ensure data integrity
- Source topic: `irreversibler Fixed-Length-String`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does HMAC stand for?
- A. Hashed message authentication codebase
- B. hashed message access control
- C. Hash-based Message Authentication Code
- D. hybrid message authentication check
- Correct answer: Hash-based Message Authentication Code
- Distractors: Hashed message authentication codebase | hashed message access control | hybrid message authentication check
- Source topic: `HMAC-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion3**

- Question: What does MD5 stand for?
- A. Message Digest Algorithm 5
- B. Salting
- C. Digital signatures
- D. Key stretching
- Correct answer: Message Digest Algorithm 5
- Distractors: Salting | Digital signatures | Key stretching
- Source topic: `MD5-Akronym`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion4**

- Question: What does RIPEMD stand for?
- A. RIP MD Rivst integrity protocol message digest
- B. RACE Integrity Primitives Evaluation Message Digest
- C. Random Integrity Primitive Evaluation Message Digest Reliable Integrity Primitives Evaluation Message Digest
- D. What is RIPMD RIP PMD stand for in hash functions
- Correct answer: RACE Integrity Primitives Evaluation Message Digest
- Distractors: RIP MD Rivst integrity protocol message digest | Random Integrity Primitive Evaluation Message Digest Reliable Integrity Primitives Evaluation Message Digest | What is RIPMD RIP PMD stand for in hash functions
- Source topic: `RIPEMD-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion5**

- Question: What does SHA stand for?
- A. Secure hashing algorithmic
- B. Secure Hash Algorithm
- C. Simple hashing algorithm
- D. standard hash algorithm
- Correct answer: Secure Hash Algorithm
- Distractors: Secure hashing algorithmic | Simple hashing algorithm | standard hash algorithm
- Source topic: `SHA-Akronym`
- Option source: transcript
- Mapping confidence: high

Ein kryptografischer Hash verdichtet Daten zu einer kurzen Zeichenkette fester Länge (Message Digest/Fingerprint) und ist eine nicht umkehrbare Einwegfunktion — keine Verschlüsselung. Er dient der Integritätsprüfung (heruntergeladene Datei gegen den veröffentlichten Hash), der Passwortspeicherung und als Baustein digitaler Signaturen; schon eine minimale Eingabeänderung erzeugt einen völlig anderen Hash. Erzeugen zwei verschiedene Eingaben denselben Hash, liegt eine Kollision vor — der Grund, warum MD5 seit 1996 abgeraten wird und SHA-256 Standard ist.

### 1.4 > Salting
`req:sy0701:v7:1.4:salting`

**possibleQuestion1**

- Question: Which technique adds random data to passwords before hashing to protect against rainbow table attacks?
- A. key stretching hashing
- B. salting
- C. data masking
- D. Adds random data to passwords before hashing to protect against rainbow table attacks
- Correct answer: salting
- Distractors: key stretching hashing | data masking | Adds random data to passwords before hashing to protect against rainbow table attacks
- Source topic: `Zufallsdaten gegen Rainbow Tables`
- Option source: transcript
- Mapping confidence: high

Salt ist zufällige Zusatzinformation, die vor dem Hashen an das Passwort angehängt wird und den resultierenden Hash randomisiert. Jeder Nutzer erhält einen eigenen Salt, sodass selbst identische Passwörter völlig unterschiedliche Hashes ergeben. Damit werden vorberechnete Rainbow Tables nutzlos, und Angreifer müssen auf Brute Force ausweichen, das statt Sekunden Tage oder Wochen braucht.

### 1.4 > Digital signatures
`req:sy0701:v7:1.4:digital-signatures`

**possibleQuestion1**

- Question: Which cryptographic method provides authentication, integrity, and non- repudiation for digital messages?
- A. Hashing salting data masking
- B. digital signatures
- C. Cryptograph cryptographic method providing authentication
- D. integrity and non-repudiation for digital messages
- Correct answer: digital signatures
- Distractors: Hashing salting data masking | Cryptograph cryptographic method providing authentication | integrity and non-repudiation for digital messages
- Source topic: `Auth+Integrität+Non-Repudiation`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does DSA stand for?
- A. Data security algorithm
- B. Digital Signature Algorithm
- C. digital secure application
- D. distributed signature authority
- Correct answer: Digital Signature Algorithm
- Distractors: Data security algorithm | digital secure application | distributed signature authority
- Source topic: `DSA-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion3**

- Question: What does ECDSA stand for?
- A. Extended curve digital signature application
- B. elliptical code digital security algorithm
- C. electronic certificate digital signature algorithm
- D. Elliptic Curve Digital Signature Algorithm
- Correct answer: Elliptic Curve Digital Signature Algorithm
- Distractors: Extended curve digital signature application | elliptical code digital security algorithm | electronic certificate digital signature algorithm
- Source topic: `ECDSA-Akronym`
- Option source: transcript
- Mapping confidence: high

Für eine digitale Signatur wird der Klartext gehasht und dieser Hash mit dem Private Key des Absenders verschlüsselt und der Nachricht angehängt; der Empfänger entschlüsselt die Signatur mit dem Public Key des Absenders und vergleicht sie mit dem selbst berechneten Hash. Stimmen beide überein, sind Integrität, Authentifizierung und Nichtabstreitbarkeit belegt — die Nachricht selbst bleibt dabei unverschlüsselt. Der Vorgang ist also gerade die Umkehrung der Verschlüsselung, bei der mit dem Public Key des Empfängers verschlüsselt wird.

### 1.4 > Key stretching
`req:sy0701:v7:1.4:key-stretching`

**possibleQuestion1**

- Question: Which cryptographic technique strengthens weak passwords by repeatedly hashing them?
- A. key stretching
- B. salting data masking
- C. digital signatures
- D. strengthens weak passwords by repeatedly hashing them
- Correct answer: key stretching
- Distractors: salting data masking | digital signatures | strengthens weak passwords by repeatedly hashing them
- Source topic: `wiederholtes Hashen schwacher Passwörter`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does PBKDF2 stand for?
- A. Privatebased key distribution function 2
- B. Password-Based Key Derivation Function 2
- C. public binary key derivation format 2
- D. password binary key derivation format 2
- Correct answer: Password-Based Key Derivation Function 2
- Distractors: Privatebased key distribution function 2 | public binary key derivation format 2 | password binary key derivation format 2
- Source topic: `PBKDF2-Akronym`
- Option source: transcript
- Mapping confidence: high

Key Stretching (auch Key Strengthening) bedeutet, denselben Vorgang mehrfach hintereinander auszuführen — den Hash eines Passworts erneut hashen, dessen Hash wieder hashen usw. Ein Angreifer muss dadurch pro Brute-Force-Versuch mehrfach rechnen, was den Angriff massiv verteuert und schwächere bzw. kürzere Schlüssel und Passwörter länger widerstandsfähig hält.

### 1.4 > Blockchain
`req:sy0701:v7:1.4:blockchain`

Die Blockchain ist ein verteiltes Ledger, von dem jeder Teilnehmer eine eigene Kopie führt; jede Transaktion geht an alle, wird zu einem Block gebündelt und der Block per Hash abgesichert. Wird eine Transaktion nachträglich geändert, stimmt der Hash nicht mehr und die anderen Knoten verwerfen den Block — daraus entsteht die Integrität. Einsatzfelder sind Zahlungsverkehr, digitale Identität, Supply-Chain-Überwachung und digitale Wahlen; laut Cram enthält jeder Block auch den Hash des Vorgängers, und neue Blöcke werden per Proof of Work aufgenommen.

### 1.4 > Open public ledger
`req:sy0701:v7:1.4:open-public-ledger`

Ein offenes öffentliches Ledger ist ein für alle einsehbares Transaktionsregister. Der Cram grenzt es gegen die Blockchain ab: Die Blockchain ist dezentral, kryptografisch unveränderlich und validiert per Konsensverfahren (Proof of Work/Stake), während ein öffentliches Ledger zentral von einer Instanz geführt werden kann, leichter änderbar ist und auf deren Integrität vertraut. Public-Ledger-Transaktionen sind typischerweise vollständig transparent, Blockchain-Transaktionen können pseudonym sein.

### 1.4 > Certificates > Certificate authorities
`req:sy0701:v7:1.4:certificates:certificate-authorities`

**possibleQuestion1**

- Question: What is the purpose of a certificate revocation list CRL?
- A. To verify the to verify the validity of a certificate in real time
- B. to list certificates that have been revoked by the issuing certificate authority
- C. to store public keys for encrypting data to store passwords for authentication The purpose of a certificate revocation list
- D. Think about what a certificate revocation list does every every word in that
- Correct answer: to list certificates that have been revoked by the issuing certificate authority
- Distractors: To verify the to verify the validity of a certificate in real time | to store public keys for encrypting data to store passwords for authentication The purpose of a certificate revocation list | Think about what a certificate revocation list does every every word in that
- Source topic: `RA (PKI)`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: Which entity which entity is responsible for issuing and managing digital certificates?
- A. the certificate authority
- B. blockchain network
- C. hashing algorithm digital signature provider
- D. Issuing and managing digital certificates
- Correct answer: the certificate authority
- Distractors: blockchain network | hashing algorithm digital signature provider | Issuing and managing digital certificates
- Source topic: `Aussteller von Zertifikaten`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion3**

- Question: What does CA stand for?
- A. Certificate Authority
- B. computer access
- C. critical authority
- D. certificate analyzer
- Correct answer: Certificate Authority
- Distractors: computer access | critical authority | certificate analyzer
- Source topic: `Akronym CA`
- Option source: transcript
- Mapping confidence: high

Eine Certificate Authority ist der vertrauenswürdige Dritte, der Antragsteller prüft und deren Zertifikate mit ihrem Private Key digital signiert — bezahlt wird faktisch dieser Validierungsprozess, nicht die Signatur selbst. Browser bringen hunderte vorinstallierte, vertraute CAs mit; Organisationen können mit Windows Certificate Services oder OpenCA eine interne CA betreiben und deren Root-Zertifikat auf allen Firmengeräten verteilen. Der Cram ergänzt die dreistufige Hierarchie aus offline gehaltener Root-CA, Policy-/Intermediate-CA und Issuing CA.

### 1.4 > Certificates > CRLs
`req:sy0701:v7:1.4:certificates:certificate-revocation-lists-crls`

**possibleQuestion1**

- Question: What does CRL stand for?
- A. Certificate revocation ledger
- B. Certificate Revocation List
- C. certificate reissue log
- D. certified revocation ledger
- Correct answer: Certificate Revocation List
- Distractors: Certificate revocation ledger | certificate reissue log | certified revocation ledger
- Source topic: `Akronym CRL`
- Option source: transcript
- Mapping confidence: high

Die CRL ist die bei der CA geführte Liste aller vorzeitig widerrufenen Zertifikate — nötig etwa beim Abschalten eines Servers oder bei kompromittierten Schlüsseln (Messers Beispiel: Heartbleed 2014 erzwang den Austausch aller Zertifikate). Der Browser findet den Ablageort über die CRL Distribution Points im Zertifikat, lädt die komplette Liste herunter und prüft, ob das Zertifikat darin steht; bei einem Treffer verweigert er die Verbindung. Diese Volldatei wird in großen Umgebungen schnell unhandlich.

### 1.4 > Certificates > OCSP
`req:sy0701:v7:1.4:certificates:online-certificate-status-protocol-ocsp`

**possibleQuestion1**

- Question: Which protocol is used to check the status of a digital certificate in real time?
- A. OCSP online certificate status protocol
- B. Certificate authorities
- C. CRLs
- D. Self-signed
- Correct answer: OCSP online certificate status protocol
- Distractors: Certificate authorities | CRLs | Self-signed
- Source topic: `Echtzeit-Statusprüfung`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion2**

- Question: What does OCSP stand for?
- A. Online certificate security protocol
- B. offline certificate status protocol
- C. Online Certificate Status Protocol
- D. online certificate synchronization protocol
- Correct answer: Online Certificate Status Protocol
- Distractors: Online certificate security protocol | offline certificate status protocol | online certificate synchronization protocol
- Source topic: `OCSP-Akronym`
- Option source: transcript
- Mapping confidence: high

OCSP ersetzt den Download der kompletten CRL durch eine gezielte Echtzeit-Statusabfrage zu einem einzelnen Zertifikat. Beim OCSP Stapling liefert der Webserver die Statusantwort direkt im TLS-Handshake mit; damit er dabei nicht lügen kann, ist die Antwort von der CA digital signiert. Alternativ kann ein separater OCSP-Responder befragt werden; ältere Browser unterstützen OCSP nicht, und manche neueren führen die Prüfung nicht sauber durch.

### 1.4 > Certificates > Self-signed
`req:sy0701:v7:1.4:certificates:self-signed`

**possibleQuestion1**

- Question: What is a self-signed certificate?
- A. A certificate that is issued by a trusted certificate authority
- B. A certificate that is not trusted by default in most systems
- C. A certificate generated and signed by the certificate owner rather than an external authority
- D. a certificate used for encryption purposes only Self-signed certificate
- Correct answer: A certificate generated and signed by the certificate owner rather than an external authority
- Distractors: A certificate that is issued by a trusted certificate authority | A certificate that is not trusted by default in most systems | a certificate used for encryption purposes only Self-signed certificate
- Source topic: `Definition selbstsigniert`
- Option source: transcript
- Mapping confidence: high
- Quality flags: distractor-issue

Für rein interne Dienste braucht es keine öffentliche CA: Man stellt die Zertifikate selbst aus bzw. betreibt eine eigene interne CA und installiert deren öffentliches Root-Zertifikat im Trust Store aller Firmengeräte — danach funktioniert alles wie mit einer externen CA. Laut Cram ist ein echtes self-signed certificate von derselben Instanz ausgestellt, die es nutzt, besitzt keine CRL, ist extern nicht validierbar und gehört ausschließlich in Test- und Entwicklungsumgebungen, nie in die Produktion.

### 1.4 > Certificates > Third-party
`req:sy0701:v7:1.4:certificates:third-party`

**possibleQuestion1**

- Question: Which of the following is true about third-party certificates?
- A. They are always free and open source
- B. issued by trusted certificate authorities
- C. They are never valid for commercial use
- D. Or they require manual installation on the client machine third-party certificates
- Correct answer: issued by trusted certificate authorities
- Distractors: They are always free and open source | They are never valid for commercial use | Or they require manual installation on the client machine third-party certificates
- Source topic: `Third-Party-Zertifikate`
- Option source: transcript
- Mapping confidence: high

Für extern erreichbare Dienste kauft man Zertifikate bei weithin vertrauten Drittanbietern wie DigiCert, Entrust, GlobalSign oder GoDaddy, deren Root-Zertifikate auf Rechnern, Smartphones und in Browsern bereits vorinstalliert sind. Genau deshalb ist das der bevorzugte Weg für öffentliches TLS, während ein internes Root-Zertifikat nur innerhalb der eigenen Organisation vertraut wird. Aktuelle Branchenvorgabe im Cram: maximale Zertifikatslaufzeit von etwa 398 Tagen.

### 1.4 > Certificates > Root of trust
`req:sy0701:v7:1.4:certificates:root-of-trust`

**possibleQuestion1**

- Question: What is the root of trust in a public key infrastructure?
- A. The root of trust and PKI The private key of a server the certificate authority that signs all certificates
- B. the initial certificate that verifies the entire chain of trust
- C. the method of hashing certificates the root of trust in public key infrastructure
- D. I don't know why I can't talk today guys I really don't I I talk as good as I could apparently
- Correct answer: the initial certificate that verifies the entire chain of trust
- Distractors: The root of trust and PKI The private key of a server the certificate authority that signs all certificates | the method of hashing certificates the root of trust in public key infrastructure | I don't know why I can't talk today guys I really don't I I talk as good as I could apparently
- Source topic: `Root of Trust in PKI`
- Option source: transcript
- Mapping confidence: high
- Quality flags: distractor-issue

Der Root of Trust ist die von Grund auf vertrauenswürdige Komponente, auf der alle weiteren Vertrauensentscheidungen aufbauen — realisiert in Hardware, Firmware oder Software, etwa als HSM, Secure Enclave, Certificate Authority oder als Root-CA-Zertifikat an der Spitze der Zertifikatskette. Laut Cram sind TPM und HSM konkrete Hardware Roots of Trust, die vor dem Secure Boot prüfen, ob die Schlüssel übereinstimmen.

### 1.4 > Certificates > CSR generation
`req:sy0701:v7:1.4:certificates:certificate-signing-request-csr-generation`

**possibleQuestion1**

- Question: What does CSR stand for?
- A. Certificate security request
- B. Certificate Signing Request
- C. certified signature request
- D. computer system request In certificate management,
- Correct answer: Certificate Signing Request
- Distractors: Certificate security request | certified signature request | computer system request In certificate management,
- Source topic: `Akronym CSR`
- Option source: transcript
- Mapping confidence: high

Zur Zertifikatsbeantragung kombiniert man den eigenen Public Key mit den Identifizierungsdaten (Servername/FQDN, Organisation) zu einem Certificate Signing Request und schickt diesen an die CA. Die CA validiert, dass der Antragsteller den Server bzw. die Domain tatsächlich besitzt und kontrolliert, signiert das Zertifikat mit ihrem Private Key und sendet es zurück — dieser Validierungsschritt in der Mitte ist die eigentliche Vertrauensquelle. Der eigene Private Key verlässt dabei nie das System.

### 1.4 > Certificates > Wildcard
`req:sy0701:v7:1.4:certificates:wildcard`

**possibleQuestion1**

- Question: What is a wildcard certificate used for?
- A. to secure multiple subdomains under a single domain
- B. to encrypt email messages only
- C. to secure a single subdomain under a domain
- D. to authenticate users on a network a wildcard certificate
- Correct answer: to secure multiple subdomains under a single domain
- Distractors: to encrypt email messages only | to secure a single subdomain under a domain | to authenticate users on a network a wildcard certificate
- Source topic: `Wildcard-Zertifikat`
- Option source: transcript
- Mapping confidence: high

Ein Wildcard-Zertifikat trägt im Subject Alternative Name einen Domainnamen mit Sternchen (z. B. *.beispiel.tld) und gilt damit für alle Hosts derselben Domain — www., ftp., mail. usw. Ein einziges Zertifikat lässt sich so auf viele Server verteilen, was Verwaltungsaufwand und Kosten spart. Der Cram grenzt ab: Ein SAN-Zertifikat kann darüber hinaus FQDNs mehrerer Domains und sogar IP-Adressen abdecken, ist dafür aber deutlich teurer.
