/**
 * Labs — "Interaktive Sicherheits-Szenarien" (SY0-701).
 *
 * Provenance (RECOVERY_LOG §4): Struktur, Kategorien-Layout und die mit
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

export const LAB_CATEGORIES: LabCategory[] = [
  { id: 'grundlagen', title: 'Security-Grundlagen', subtitle: 'Controls, CIA, Zero-Trust, Change-Management' },
  { id: 'bedrohungen', title: 'Bedrohungen & Angriffe', subtitle: 'Threat Actors, Social Engineering, Malware' },
  { id: 'firewalls', title: 'Firewalls & Netzwerk', subtitle: 'Regelwerke, Segmentierung, Zonen' },
  { id: 'architektur', title: 'Sichere Architektur', subtitle: 'Cloud, Resilienz, Datenzustände' },
  { id: 'iam', title: 'Identität & Zugriff', subtitle: 'AAA, MFA, Least Privilege' },
  { id: 'incident-response', title: 'Incident Response', subtitle: 'NIST-Lebenszyklus, Forensik, Logs' },
  { id: 'krypto', title: 'Kryptografie & PKI', subtitle: 'Hashing, TLS, Zertifikate' },
  { id: 'governance', title: 'Governance & Risiko', subtitle: 'Policies, Risk Management, Datenrollen' },
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
        { left: 'Praeparierte Website, die das Branchenportal imitiert', right: 'Watering Hole' },
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
        'Forensik: Speicherabbild und Logs von FIN-PC-07 sichern',
        'Betroffene Systeme vom Netz isolieren (nicht ausschalten)',
        'Incident deklarieren, IR-Team und Kommunikationsplan aktivieren',
        'Wiederherstellung aus dem Offsite-Backup in saubere Umgebung',
        'Initialen Vektor schliessen (Patch/Credentials/Regel)',
        'Lessons Learned mit Timeline und Massnahmen dokumentieren',
      ],
      correctOrder: [2, 1, 0, 4, 3, 5],
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
        'Scope und Audit-Kriterien festlegen',
        'Nachweise sammeln (Interviews, Konfigs, Logs)',
        'Findings bewerten und priorisieren',
        'Bericht mit Massnahmenplan an das Management',
        'Follow-up: Umsetzung der Massnahmen pruefen',
      ],
      correctOrder: [0, 1, 2, 3, 4],
    },
  },
]

/** Ziel-Inventar laut Handy-Stand (Pill "4 / 71"); siehe docs/labs.md. */
export const LAB_TARGET_INVENTORY = 71

export function getLabScenariosByCategory(categoryId: string): LabScenario[] {
  return LAB_SCENARIOS.filter(scenario => scenario.categoryId === categoryId)
}
