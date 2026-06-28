/**
 * AI_CONTEXT: Static data module for lab Blueprints; supplies Security+ labs, blueprints, links, or learning-guide content.
 */
/**
 * Lab-Blueprints — Trainings-Generator fuer "Interaktive Sicherheits-Szenarien".
 *
 * Ergaenzt das kuratierte 100er-Inventar (`labScenarios.ts`) um praktisch
 * unbegrenzt viele Uebungs-Instanzen pro Kategorie: Aus hand-validierten
 * Wissens-Pools (Paare bzw. strikt geordnete Schrittfolgen + Parameter-Tupel)
 * kombiniert `utils/labGenerator.ts` deterministisch (seeded) konkrete
 * LabScenario-Objekte. Kapazitaet entsteht kombinatorisch: ein Pool mit 12
 * validierten Paaren liefert bei 4–6 gezogenen Paaren bereits 2211
 * verschiedene Matchings.
 *
 * Eindeutigkeits-Invarianten (durch `__tests__/utils/lab-generator.test.ts`
 * abgesichert):
 * - Matching-Pool: `left` und `right` poolweit eindeutig; jedes `right` passt
 *   fachlich NUR zu seinem `left` → jede Teilmenge ist eindeutig loesbar und
 *   die rechten Seiten nicht gezogener Paare sind garantiert-falsche, aber
 *   plausible Distraktoren.
 * - Ordering-Blueprint: `steps` strikt total geordnet. Mit `sampleSteps`
 *   markierte Pools bleiben auch fuer jede Teilfolge eindeutig (z. B. Order
 *   of Volatility). Parametrisierte Regelketten sind streng geschachtelt mit
 *   alternierenden Aktionen — jede Vertauschung aendert das Verhalten.
 * - Quellen: `sourceIds` referenzieren die zentrale Registry `LAB_SOURCES`.
 */

import type { LabDifficulty } from './labScenarios'

export interface LabMatchingBlueprint {
  kind: 'matching'
  id: string
  categoryId: string
  objective: string
  /** Titel-Varianten; der Seed waehlt eine aus. */
  titles: string[]
  description: string
  /** Validierter Pool; Instanzen ziehen `draw.min..draw.max` Paare. */
  pairs: Array<{ left: string; right: string }>
  draw: { min: number; max: number }
  /** Zusaetzliche Optionen aus den rechten Seiten nicht gezogener Paare. */
  maxDistractors: number
  sourceIds: string[]
}

export interface LabOrderingBlueprint {
  kind: 'ordering'
  id: string
  categoryId: string
  objective: string
  titles: string[]
  /** Texte duerfen {{slot}}-Platzhalter aus `paramSets` enthalten. */
  description: string
  goal?: string
  topology?: string
  /** Schritte in korrekter Reihenfolge (Loesungsreihenfolge!). */
  steps: string[]
  /** Konsistente Wertesaetze fuer die {{slot}}-Platzhalter. */
  paramSets?: Array<Record<string, string>>
  /**
   * Wenn gesetzt: Pool ist strikt total geordnet, sodass auch jede gezogene
   * Teilfolge eindeutig geordnet bleibt (Autoren-Garantie).
   */
  sampleSteps?: { min: number; max: number }
  /** Optionaler Override; sonst wird nach Schrittzahl gemappt. */
  difficulty?: LabDifficulty
  sourceIds: string[]
}

export type LabBlueprint = LabMatchingBlueprint | LabOrderingBlueprint

export const LAB_BLUEPRINTS: LabBlueprint[] = [
  // ── Security-Grundlagen ────────────────────────────────────────────────────
  {
    kind: 'matching',
    id: 'grundlagen-begriffe',
    categoryId: 'grundlagen',
    objective: '1.2 Fundamental Security Concepts',
    titles: [
      'Begriffs-Drill: Security-Grundlagen',
      'Grundlagen-Matrix ausfuellen',
      'Konzept-Check: Grundlagen',
    ],
    description:
      'Trainings-Runde aus dem Grundlagen-Pool: Ordne jedem Begriff die Beschreibung zu, die ihn definiert.',
    pairs: [
      { left: 'Gap-Analyse', right: 'Soll-Ist-Abgleich vor der Massnahmenplanung' },
      { left: 'Non-Repudiation', right: 'Urheberschaft ist nicht abstreitbar (z. B. Signatur)' },
      { left: 'Authentication', right: 'Identitaet wird nachgewiesen' },
      { left: 'Authorization', right: 'Rechte werden geprueft und durchgesetzt' },
      { left: 'Accounting/Auditing', right: 'Aktionen werden nachvollziehbar protokolliert' },
      { left: 'Adaptive Identity (Zero Trust)', right: 'Vertrauen wird pro Zugriff kontextabhaengig neu bewertet' },
      { left: 'Least Privilege', right: 'Nur die minimal noetigen Rechte vergeben' },
      { left: 'Separation of Duties', right: 'Kritische Aufgaben auf mehrere Personen verteilt' },
      { left: 'Bollard (Poller)', right: 'Fahrzeug-Rammschutz vor dem Gebaeude' },
      { left: 'Access Control Vestibule', right: 'Vereinzelung beim Gebaeude-Zutritt' },
      { left: 'Air Gap', right: 'Physisch getrenntes Netz ohne Verbindung' },
      { left: 'Access Badge', right: 'Ausweis oeffnet Tueren, Zutritte werden protokolliert' },
    ],
    draw: { min: 4, max: 6 },
    maxDistractors: 2,
    sourceIds: ['comptia-sy0-701-objectives', 'nist-csf-2'],
  },

  // ── Bedrohungen & Angriffe ─────────────────────────────────────────────────
  {
    kind: 'matching',
    id: 'bedrohungen-techniken',
    categoryId: 'bedrohungen',
    objective: '2.2 Threat Vectors / 2.4 Malicious Activity',
    titles: [
      'Angriffs-Drill: Technik erkennen',
      'Social Engineering & Malware zuordnen',
      'Bedrohungs-Matrix ausfuellen',
    ],
    description:
      'Trainings-Runde aus dem Bedrohungs-Pool: Ordne jeder Technik die Beschreibung zu, die sie eindeutig kennzeichnet.',
    pairs: [
      { left: 'Vishing', right: 'Phishing per Sprachanruf' },
      { left: 'Smishing', right: 'Phishing per SMS/Messenger' },
      { left: 'Brand Impersonation', right: 'Auftritt einer bekannten Marke wird taeuschend echt nachgeahmt' },
      { left: 'Business Email Compromise', right: 'Uebernommenes Geschaeftspostfach fordert Zahlungen an' },
      { left: 'Watering-Hole-Angriff', right: 'Haeufig besuchte Branchen-Website wird infiziert' },
      { left: 'Typosquatting', right: 'Tippfehler-Domain faengt Besucher ab' },
      { left: 'Pretexting', right: 'Erfundene Geschichte dient als Vorwand' },
      { left: 'Logic Bomb', right: 'Schadcode zuendet erst bei Bedingung oder Datum' },
      { left: 'Rootkit', right: 'Nistet sich tief im OS ein und versteckt sich' },
      { left: 'Keylogger', right: 'Zeichnet Tastatureingaben auf' },
      { left: 'Remote Access Trojan (RAT)', right: 'Heimliche Fernsteuerung des Rechners' },
      { left: 'Wurm', right: 'Verbreitet sich selbststaendig ueber das Netz' },
    ],
    draw: { min: 4, max: 6 },
    maxDistractors: 2,
    sourceIds: ['comptia-sy0-701-objectives', 'mitre-attack-enterprise', 'cisa-phishing-social-engineering'],
  },

  // ── Firewalls & Netzwerk ───────────────────────────────────────────────────
  {
    kind: 'matching',
    id: 'firewalls-komponenten',
    categoryId: 'firewalls',
    objective: '4.5 Enterprise Security',
    titles: [
      'Netzwerk-Drill: Komponente zur Aufgabe',
      'Firewall- & Netz-Bausteine zuordnen',
      'Perimeter-Matrix ausfuellen',
    ],
    description:
      'Trainings-Runde aus dem Netzwerk-Pool: Ordne jeder Komponente die Aufgabe zu, die sie uebernimmt.',
    pairs: [
      { left: 'Stateful Firewall', right: 'Verfolgt Verbindungszustaende, erlaubt Antworten automatisch' },
      { left: 'Stateless ACL', right: 'Prueft jedes Paket einzeln ohne Verbindungskontext' },
      { left: 'Next-Generation Firewall', right: 'App-Erkennung und IPS direkt in der Firewall' },
      { left: 'Forward Proxy', right: 'Buendelt und prueft ausgehende Client-Zugriffe' },
      { left: 'Reverse Proxy', right: 'Nimmt eingehende Zugriffe stellvertretend fuer Server an' },
      { left: 'Jump Server', right: 'Gehaerteter Zwischenhost fuer Admin-Zugriffe' },
      { left: 'Screened Subnet (DMZ)', right: 'Pufferzone zwischen Internet und LAN' },
      { left: 'VLAN', right: 'Logische Segmentierung auf Switch-Ebene' },
      { left: 'Port Security', right: 'Begrenzt erlaubte MAC-Adressen pro Switch-Port' },
      { left: 'TAP/SPAN (Port Mirroring)', right: 'Spiegelt Traffic fuer passive Sensor-Analyse' },
      { left: 'DNS-Filtering (Sinkhole)', right: 'Leitet bekannte Bad-Domains ins Leere' },
      { left: 'Load Balancer', right: 'Verteilt Last auf mehrere Server und prueft deren Health' },
    ],
    draw: { min: 4, max: 6 },
    maxDistractors: 2,
    sourceIds: ['comptia-sy0-701-objectives', 'cisco-acl', 'paloalto-security-policy-rules'],
  },
  {
    kind: 'ordering',
    id: 'firewalls-regelkette',
    categoryId: 'firewalls',
    objective: '4.5 Enterprise Security',
    titles: [
      'Regelkette fuer {{service}} aufbauen',
      'First Match: {{service}} absichern',
      'Top-Down-Regelwerk: {{service}}',
    ],
    description:
      'Der Dienst {{service}} laeuft auf {{srvIp}}:{{port}} und ist aus Internet und Firmen-WAN erreichbar. Vorgabe: Der kompromittierte Host {{badHost}} bleibt draussen, die eigene Niederlassung {{branchNet}} darf zugreifen, ihr uebriges Standort-/Provider-Netz {{regionNet}} ist gesperrt, alle anderen Quellen duerfen den Dienst nutzen. Ordne die Regeln Top-Down (First Match).',
    goal: 'Ziel: Vom Speziellsten zum Generellsten — jede Regel ist eine Teilmenge der naechsten, implicit DENY zum Schluss.',
    topology: 'Internet/WAN -> [Firewall] -> {{service}} {{srvIp}}:{{port}}',
    steps: [
      'DENY  TCP {{badHost}} -> {{srvIp}} :{{port}}',
      'ALLOW TCP {{branchNet}} -> {{srvIp}} :{{port}}',
      'DENY  TCP {{regionNet}} -> {{srvIp}} :{{port}}',
      'ALLOW TCP ANY -> {{srvIp}} :{{port}}',
      'DENY  ANY ANY -> ANY :ANY',
    ],
    paramSets: [
      { service: 'HTTPS-Webshop', port: '443', srvIp: '203.0.113.10', badHost: '198.51.100.23', branchNet: '198.51.100.0/24', regionNet: '198.51.0.0/16' },
      { service: 'Mail-Gateway (SMTP)', port: '25', srvIp: '203.0.113.25', badHost: '192.0.2.99', branchNet: '192.0.2.0/24', regionNet: '192.0.0.0/16' },
      { service: 'SFTP-Austausch', port: '22', srvIp: '203.0.113.40', badHost: '10.40.12.7', branchNet: '10.40.12.0/24', regionNet: '10.40.0.0/16' },
      { service: 'API-Endpunkt', port: '8443', srvIp: '203.0.113.50', badHost: '172.16.8.66', branchNet: '172.16.8.0/24', regionNet: '172.16.0.0/16' },
      { service: 'Webmail (HTTPS)', port: '443', srvIp: '203.0.113.80', badHost: '198.51.100.144', branchNet: '198.51.100.128/25', regionNet: '198.51.100.0/24' },
      { service: 'Partner-API', port: '8443', srvIp: '192.0.2.50', badHost: '10.77.3.9', branchNet: '10.77.3.0/24', regionNet: '10.77.0.0/16' },
      { service: 'Status-Seite (HTTP)', port: '80', srvIp: '203.0.113.90', badHost: '192.0.2.130', branchNet: '192.0.2.128/25', regionNet: '192.0.2.0/24' },
      { service: 'Download-Mirror', port: '443', srvIp: '198.51.100.10', badHost: '203.0.113.201', branchNet: '203.0.113.192/26', regionNet: '203.0.113.0/24' },
      { service: 'Ticket-Portal', port: '443', srvIp: '192.0.2.20', badHost: '172.20.5.55', branchNet: '172.20.5.0/24', regionNet: '172.20.0.0/16' },
      { service: 'Telemetrie-Collector', port: '8080', srvIp: '198.51.100.60', badHost: '10.8.1.13', branchNet: '10.8.1.0/24', regionNet: '10.8.0.0/16' },
      { service: 'Update-Server', port: '443', srvIp: '203.0.113.120', badHost: '192.168.40.77', branchNet: '192.168.40.0/24', regionNet: '192.168.0.0/16' },
      { service: 'B2B-Webservice', port: '8443', srvIp: '198.51.100.200', badHost: '172.31.9.42', branchNet: '172.31.9.0/24', regionNet: '172.31.0.0/16' },
    ],
    difficulty: 'experte',
    sourceIds: ['comptia-sy0-701-objectives', 'cisco-acl', 'paloalto-security-policy-rules'],
  },

  // ── Sichere Architektur ────────────────────────────────────────────────────
  {
    kind: 'matching',
    id: 'architektur-resilienz-begriffe',
    categoryId: 'architektur',
    objective: '3.4 Resilience & Recovery',
    titles: [
      'Resilienz-Drill: Baustein zur Wirkung',
      'Verfuegbarkeits-Matrix ausfuellen',
      'Recovery-Bausteine zuordnen',
    ],
    description:
      'Trainings-Runde aus dem Resilienz-Pool: Ordne jedem Baustein die Eigenschaft zu, die ihn auszeichnet.',
    pairs: [
      { left: 'Hot Site', right: 'Sofort lauffaehig, Daten nahezu aktuell' },
      { left: 'Warm Site', right: 'Infrastruktur steht, Daten muessen eingespielt werden' },
      { left: 'Cold Site', right: 'Nur Raum und Strom — Aufbau dauert Tage' },
      { left: 'Geo-Redundanz', right: 'Standorte raeumlich getrennt gegen Regional-Ausfall' },
      { left: 'Aktiv/Aktiv-Cluster', right: 'Beide Knoten bedienen gleichzeitig Last' },
      { left: 'Aktiv/Passiv-Cluster', right: 'Standby-Knoten uebernimmt erst beim Failover' },
      { left: 'Snapshot', right: 'Eingefrorener Zustand eines Systems oder Volumes' },
      { left: 'Synchrone Replikation', right: 'Schreibvorgang gilt erst nach Bestaetigung beider Seiten' },
      { left: 'Asynchrone Replikation', right: 'Repliziert zeitversetzt mit geringer Latenzlast' },
      { left: 'USV (UPS)', right: 'Ueberbrueckt Kurzausfaelle bis Generator oder Shutdown' },
      { left: 'Notstrom-Generator', right: 'Traegt laengere Stromausfaelle' },
      { left: 'Capacity Planning', right: 'Personal und Technik fuer Lastspitzen vorausplanen' },
    ],
    draw: { min: 4, max: 6 },
    maxDistractors: 2,
    sourceIds: ['comptia-sy0-701-objectives', 'nist-csf-2'],
  },

  // ── Identitaet & Zugriff ───────────────────────────────────────────────────
  {
    kind: 'matching',
    id: 'iam-begriffe',
    categoryId: 'iam',
    objective: '4.6 Identity and Access Management',
    titles: [
      'IAM-Drill: Begriff zur Bedeutung',
      'Identity-Matrix ausfuellen',
      'Zugriffs-Konzepte zuordnen',
    ],
    description:
      'Trainings-Runde aus dem IAM-Pool: Ordne jedem Begriff die Bedeutung zu, die ihn definiert.',
    pairs: [
      { left: 'Identity Proofing', right: 'Identitaet vor dem Onboarding verifizieren' },
      { left: 'Deprovisionierung', right: 'Konten und Rechte beim Austritt entziehen' },
      { left: 'Access Review / Attestation', right: 'Vergebene Rechte regelmaessig bestaetigen lassen' },
      { left: 'Standing Privileges', right: 'Dauerhafte Adminrechte — Gegenteil von Just-in-Time' },
      { left: 'Single Sign-On (SSO)', right: 'Einmal anmelden, mehrere angebundene Dienste nutzen' },
      { left: 'Time-of-day Restriction', right: 'Zugriff nur im definierten Zeitfenster erlaubt' },
      { left: 'Password Manager', right: 'Verwahrt Passwoerter verschluesselt und fuellt sie aus' },
      { left: 'Hard Token', right: 'Physischer OTP-Generator oder Security-Key' },
      { left: 'Soft Token', right: 'Authenticator-App erzeugt Einmal-Codes' },
      { left: 'Passkey (FIDO2)', right: 'Phishing-resistente Anmeldung per Geraete-Schluessel' },
      { left: 'Service Account', right: 'Maschinenkonto fuer Dienste ohne interaktiven Login' },
      { left: 'Break-Glass-Konto', right: 'Auditierter Notfallzugang unter Verschluss' },
    ],
    draw: { min: 4, max: 6 },
    maxDistractors: 2,
    sourceIds: ['comptia-sy0-701-objectives', 'nist-sp-800-63b'],
  },

  // ── Security Operations ────────────────────────────────────────────────────
  {
    kind: 'matching',
    id: 'betrieb-werkzeuge',
    categoryId: 'betrieb',
    objective: '4.3–4.5 Security Operations',
    titles: [
      'Ops-Drill: Werkzeug zur Faehigkeit',
      'SecOps-Matrix ausfuellen',
      'Betriebs-Bausteine zuordnen',
    ],
    description:
      'Trainings-Runde aus dem Security-Operations-Pool: Ordne jedem Baustein die Faehigkeit zu, die er liefert.',
    pairs: [
      { left: 'CVE', right: 'Eindeutige Kennung einer veroeffentlichten Schwachstelle' },
      { left: 'CVSS', right: 'Standardisierter Schweregrad-Score einer Schwachstelle' },
      { left: 'EDR', right: 'Endpoint-Telemetrie mit Erkennung und Response' },
      { left: 'XDR', right: 'Korreliert Endpoint-, Netz- und Cloud-Telemetrie' },
      { left: 'UEBA', right: 'Erkennt abweichendes Nutzer- und Entity-Verhalten' },
      { left: 'Threat-Intelligence-Feed', right: 'Liefert aktuelle IoCs und Angreifer-TTPs' },
      { left: 'Staged Rollout / Patch-Ring', right: 'Updates erst an Pilotgruppe, dann in die Breite' },
      { left: 'Konfigurations-Drift', right: 'Ist-Zustand entfernt sich schleichend von der Baseline' },
      { left: 'CIS-Benchmark', right: 'Konsens-Vorgaben zur Systemhaertung' },
      { left: 'Application Allowlisting', right: 'Nur freigegebene Software darf starten' },
      { left: 'Blocklisting', right: 'Bekannte boesartige Software wird gesperrt' },
      { left: 'Sandboxing', right: 'Verdaechtiges isoliert ausfuehren und beobachten' },
    ],
    draw: { min: 4, max: 6 },
    maxDistractors: 2,
    sourceIds: ['comptia-sy0-701-objectives', 'nist-sp-800-92', 'first-cvss-v31'],
  },

  // ── Incident Response ──────────────────────────────────────────────────────
  {
    kind: 'matching',
    id: 'ir-begriffe',
    categoryId: 'incident-response',
    objective: '4.8/4.9 Incident Response & Forensik',
    titles: [
      'IR-Drill: Begriff zur Bedeutung',
      'Forensik- & IR-Matrix ausfuellen',
      'Incident-Konzepte zuordnen',
    ],
    description:
      'Trainings-Runde aus dem Incident-Response-Pool: Ordne jedem Begriff die Bedeutung zu, die ihn definiert.',
    pairs: [
      { left: 'Legal Hold', right: 'Loeschfristen ausgesetzt — Beweise muessen erhalten bleiben' },
      { left: 'E-Discovery', right: 'Elektronische Beweise fuer ein Verfahren bereitstellen' },
      { left: 'Write Blocker', right: 'Verhindert Schreibzugriffe bei der Beweissicherung' },
      { left: 'Forensisches Image', right: 'Bitgenaue Kopie des Datentraegers' },
      { left: 'Hash der Beweiskopie', right: 'Belegt die Integritaet des Images' },
      { left: 'Root Cause Analysis', right: 'Ermittelt die zugrunde liegende Ursache des Vorfalls' },
      { left: 'Eradication', right: 'Ursache und Schadcode vollstaendig entfernen' },
      { left: 'Playbook/Runbook', right: 'Standardisierte Schritt-fuer-Schritt-Reaktion' },
      { left: 'Threat Hunting', right: 'Proaktive Suche nach bisher unentdeckten Angreifern' },
      { left: 'Out-of-Band-Kommunikation', right: 'Abstimmung ausserhalb moeglicherweise kompromittierter Kanaele' },
      { left: 'Retention Policy', right: 'Legt fest, wie lange Logs und Daten aufbewahrt werden' },
      { left: 'After-Action-Report', right: 'Strukturierte Auswertung nach dem Vorfall' },
    ],
    draw: { min: 4, max: 6 },
    maxDistractors: 2,
    sourceIds: ['comptia-sy0-701-objectives', 'nist-sp-800-61r2'],
  },
  {
    kind: 'ordering',
    id: 'ir-volatility-drill',
    categoryId: 'incident-response',
    objective: '4.9 Security Data Sources',
    titles: [
      'Volatility-Drill: Host {{host}}',
      'Beweissicherung auf {{host}} priorisieren',
      'Order of Volatility: {{host}}',
    ],
    description:
      'Auf dem Host {{host}} steht die forensische Sicherung an. Bring die gezeigten Artefakte in die richtige Sicherungs-Reihenfolge — fluechtigste zuerst (Order of Volatility).',
    goal: 'Ziel: Was beim Ausschalten oder durch Zeitablauf zuerst verloren geht, wird zuerst gesichert.',
    steps: [
      // RFC-3227-Stufen strikt getrennt: RAM, Prozesse und fluechtiger
      // Netzwerk-Status (ARP/Verbindungen) liegen auf EINER Stufe — getrennt
      // gelistet waere die Reihenfolge mehrdeutig.
      'CPU-Register und CPU-Cache sichern',
      'RAM-Abbild ziehen (Prozesse, Verbindungen, ARP-Cache, Schluessel)',
      'Swap-/Pagefile und temporaere Dateien sichern',
      'Festplatten-Image erstellen',
      'Remote-Logs und SIEM-Daten exportieren',
      'Archiv-Medien und Backups einsammeln',
    ],
    paramSets: [
      { host: 'FILE01' },
      { host: 'DB-PROD-2' },
      { host: 'WS-0443' },
      { host: 'MAIL01' },
      { host: 'APP-SRV-7' },
      { host: 'KIOSK-3' },
    ],
    sampleSteps: { min: 4, max: 5 },
    sourceIds: ['comptia-sy0-701-objectives', 'nist-sp-800-61r2'],
  },

  // ── Kryptografie & PKI ─────────────────────────────────────────────────────
  {
    kind: 'matching',
    id: 'krypto-begriffe',
    categoryId: 'krypto',
    objective: '1.4 Cryptographic Solutions',
    titles: [
      'Krypto-Drill: Begriff zur Funktion',
      'PKI- & Krypto-Matrix ausfuellen',
      'Krypto-Bausteine zuordnen',
    ],
    description:
      'Trainings-Runde aus dem Krypto-Pool: Ordne jedem Begriff die Funktion zu, die er erfuellt.',
    pairs: [
      { left: 'Salting', right: 'Zufallswert je Passwort gegen Rainbow-Tables' },
      { left: 'Key Stretching', right: 'Bewusst langsame Ableitung gegen Brute Force' },
      { left: 'HSM', right: 'Dediziertes Geraet verwahrt Schluessel manipulationssicher' },
      { left: 'TPM', right: 'Krypto-Chip im Geraet fuer Boot-Integritaet und Disk-Keys' },
      { left: 'Secure Enclave', right: 'Isolierter Prozessor-Bereich fuer Geheimnisse' },
      { left: 'OCSP', right: 'Online-Statusabfrage eines einzelnen Zertifikats' },
      { left: 'CRL', right: 'Veroeffentlichte Liste zurueckgezogener Zertifikate' },
      { left: 'CSR', right: 'Signierter Antrag mit Public Key an die CA' },
      { left: 'Key Escrow', right: 'Schluessel-Hinterlegung fuer kontrollierten Notfall-Zugriff' },
      { left: 'Key Exchange', right: 'Einigung auf gemeinsamen Sitzungsschluessel ueber unsicheren Kanal' },
      { left: 'Blockchain (Open Public Ledger)', right: 'Verteiltes, manipulationsevidentes Transaktionsregister' },
      { left: 'Root of Trust', right: 'Vertrauensanker, auf dem die Kette aufbaut' },
    ],
    draw: { min: 4, max: 6 },
    maxDistractors: 2,
    sourceIds: ['comptia-sy0-701-objectives', 'nist-sp-800-57r5'],
  },

  // ── Governance & Risiko ────────────────────────────────────────────────────
  {
    kind: 'matching',
    id: 'governance-begriffe',
    categoryId: 'governance',
    objective: '5.2 Risk Management',
    titles: [
      'GRC-Drill: Begriff zur Bedeutung',
      'Risiko-Matrix ausfuellen',
      'Governance-Konzepte zuordnen',
    ],
    description:
      'Trainings-Runde aus dem Governance-Pool: Ordne jedem Begriff die Bedeutung zu, die ihn definiert.',
    pairs: [
      { left: 'Risk Appetite', right: 'Wieviel Risiko die Organisation eingehen will' },
      { left: 'Risk Tolerance', right: 'Akzeptierte Abweichung vom Risiko-Appetit' },
      { left: 'Inhaerentes Risiko', right: 'Risiko vor jeglichen Gegenmassnahmen' },
      { left: 'Residualrisiko', right: 'Verbleibendes Risiko nach den Controls' },
      { left: 'Risk Register', right: 'Inventar aller Risiken mit Owner und Status' },
      { left: 'Key Risk Indicator (KRI)', right: 'Fruehindikator fuer ein steigendes Risiko' },
      { left: 'PII', right: 'Personenbezogene, identifizierende Daten' },
      { left: 'PHI', right: 'Geschuetzte Gesundheitsdaten' },
      { left: 'Datenklassifizierung', right: 'Einstufung nach Schutzbedarf (z. B. intern/vertraulich)' },
      { left: 'Right to be Forgotten', right: 'Loeschanspruch betroffener Personen' },
      { left: 'Due Diligence', right: 'Sorgfaeltige Pruefung vor einer Entscheidung' },
      { left: 'Due Care', right: 'Laufend verantwortungsvolles Handeln danach' },
    ],
    draw: { min: 4, max: 6 },
    maxDistractors: 2,
    sourceIds: ['comptia-sy0-701-objectives', 'nist-sp-800-30r1', 'eu-gdpr'],
  },
]

export function getLabBlueprintsByCategory(categoryId: string): LabBlueprint[] {
  return LAB_BLUEPRINTS.filter(blueprint => blueprint.categoryId === categoryId)
}
