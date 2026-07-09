/**
 * AI_CONTEXT:
 * Role: Curated MC questions derived from the professormesser.com video transcripts for videos without mapped deck questions.
 * Used by: VideoRecallCheck merges these with the mapped deck questions (which always stay untouched).
 * Important: Keyed by the 3-digit playlist index; content is grounded in the transcript of exactly that video.
 */

/**
 * Transkript-Fragen: Wissensabfrage direkt aus dem Videoinhalt.
 *
 * Diese Fragen ergänzen den Abruf-Check für Videos, zu denen (noch) keine
 * gemappten Deck-Fragen existieren — sie ersetzen nie bestehende Fragen und
 * werden nirgends als Karten gespeichert (non-scheduling, rein in-App).
 * Frage/Optionen auf Englisch (Kurssprache), Begründung auf Deutsch —
 * wie bei den konvertierten Messer-Karten.
 */
export interface TranscriptQuestion {
  /** Frage (englisch, Kursterminologie). */
  q: string
  /** Genau vier Antwortoptionen; die korrekte steht an `correct`. */
  options: [string, string, string, string]
  /** Index der korrekten Option (0–3). */
  correct: 0 | 1 | 2 | 3
  /** Kurze Begründung, gestützt auf die Aussage des Videos. */
  why: string
}

export const MESSER_TRANSCRIPT_QUESTIONS: Record<string, TranscriptQuestion[]> = {
  // 030 — 2.3 Operating System Vulnerabilities
  '030': [
    {
      q: 'Why are operating systems such an attractive target for attackers?',
      options: [
        'They are rarely updated by manufacturers',
        'They are foundational platforms that everyone runs, with millions of lines of code',
        'They cannot be protected by patches',
        'They only run on servers with sensitive data',
      ],
      correct: 1,
      why: 'Betriebssysteme sind die Grundlage jedes Rechners und extrem komplex (Windows 11: zig Millionen Codezeilen) — je mehr Code, desto mehr potenzielle Schwachstellen.',
    },
    {
      q: 'When does Microsoft release its regular monthly set of security patches ("Patch Tuesday")?',
      options: [
        'The first Monday of each month',
        'The last Friday of each month',
        'The second Tuesday of each month',
        'Every other Wednesday',
      ],
      correct: 2,
      why: 'Patch Tuesday ist der zweite Dienstag im Monat — an diesem Tag veröffentlicht Microsoft gesammelt die Sicherheitsupdates.',
    },
    {
      q: 'Why should you install OS patches as quickly as possible after they are announced?',
      options: [
        'Patches expire if they are not installed promptly',
        'Attackers reverse engineer announced vulnerabilities to build attack code',
        'Unpatched systems automatically shut down',
        'The manufacturer charges for late installations',
      ],
      correct: 1,
      why: 'Sobald eine Schwachstelle öffentlich ist, versuchen Angreifer sie per Reverse Engineering auszunutzen — wer vor dem Erscheinen von Angriffscode patcht, ist geschützt.',
    },
    {
      q: 'What best practice applies before deploying a patch in a large environment with hundreds of devices?',
      options: [
        'Test the patch before rolling it into production',
        'Install it on all systems simultaneously to save time',
        'Wait at least six months for community feedback',
        'Only patch the systems that have already been attacked',
      ],
      correct: 0,
      why: 'In großen, komplexen Umgebungen wird ein Patch erst getestet, damit er in der Produktion nichts anderes im Betriebssystem beschädigt.',
    },
    {
      q: 'A production system develops problems after a patch was installed. What preparation allows you to recover?',
      options: [
        'A list of all installed patches',
        'A known good backup taken before the patch',
        'A second internet connection',
        'An extended manufacturer warranty',
      ],
      correct: 1,
      why: 'Mit einem „known good backup" lässt sich die Konfiguration von vor der Patch-Installation jederzeit wiederherstellen.',
    },
  ],

  // 062 — 3.2 Secure Infrastructures
  '062': [
    {
      q: 'What is a security zone in a network design?',
      options: [
        'A specific IP address range or subnet description',
        'A logical separation of devices by their use or access type',
        'A physically locked server room',
        'A wireless network with a hidden SSID',
      ],
      correct: 1,
      why: 'Eine Security Zone trennt Geräte logisch nach Nutzung bzw. Zugriffstyp — ausdrücklich kein IP-Bereich oder Subnetz.',
    },
    {
      q: 'Which zone names describe a basic two-zone design separating the internet from the internal network?',
      options: [
        'Trusted and untrusted (or internal and external)',
        'Public and hybrid',
        'Screened and load-balanced',
        'Primary and secondary',
      ],
      correct: 0,
      why: 'Das einfachste Design: außen die Untrusted-/External-Zone (Internet), innen die Trusted-/Internal-Zone.',
    },
    {
      q: 'What does the term "attack surface" describe?',
      options: [
        'The physical area of the data center',
        'The number of firewalls in a network',
        'The combination of all potential openings into your network',
        'The bandwidth available to an attacker',
      ],
      correct: 2,
      why: 'Die Attack Surface ist die Summe aller möglichen Einstiegspunkte — Anwendungscode, offene Ports, Authentifizierung, menschliche Fehler. Ziel: sie zu minimieren.',
    },
    {
      q: 'Through which openings could an attacker enter a network, according to the video?',
      options: [
        'Only through unpatched operating systems',
        'Application code, open ports, the authentication process, or human error',
        'Only through the wireless network',
        'Only through physical access to servers',
      ],
      correct: 1,
      why: 'Das Video nennt Anwendungscode, offene Server-Ports, den Authentifizierungsprozess und menschliche Fehler (z. B. eine falsch konfigurierte Firewall-Regel).',
    },
    {
      q: 'How can traffic between remote sites be protected so a cable tap reveals nothing useful?',
      options: [
        'By using longer network cables',
        'By disabling DNS lookups',
        'By assigning static IP addresses',
        'With application-level encryption and IPsec site-to-site tunnels',
      ],
      correct: 3,
      why: 'Verschlüsselung auf Anwendungsebene plus IPsec-Tunnel zwischen Standorten sorgen dafür, dass abgegriffene Pakete unlesbar bleiben.',
    },
  ],

  // 067 — 3.2 Secure Communication
  '067': [
    {
      q: 'What is the role of a VPN concentrator?',
      options: [
        'It is the endpoint that terminates and decrypts the encrypted VPN tunnels',
        'It blocks all incoming traffic from the internet',
        'It assigns IP addresses to internal clients',
        'It caches web content for remote users',
      ],
      correct: 0,
      why: 'Der VPN-Concentrator ist der Endpunkt des verschlüsselten Tunnels: Er entschlüsselt den Verkehr und leitet ihn ins Firmennetz weiter — oft integriert in eine (Next-Generation-)Firewall.',
    },
    {
      q: 'Why does an SSL/TLS VPN usually pass through existing firewalls without special rules?',
      options: [
        'It compresses all packets below the inspection threshold',
        'It uses TCP port 443, the same port as encrypted web traffic',
        'It avoids IP headers entirely',
        'Firewalls cannot see SSL VPN traffic at all',
      ],
      correct: 1,
      why: 'SSL/TLS-VPNs laufen über TCP-Port 443 wie HTTPS — dieser Port ist in praktisch jeder Firewall bereits offen.',
    },
    {
      q: 'In IPsec tunneling, what happens to the original IP header and data?',
      options: [
        'They are deleted and regenerated at the destination',
        'They are sent unencrypted, followed by a checksum',
        'They are encrypted and wrapped in IPsec headers plus a new IP header',
        'Only the data is encrypted; the original header stays visible',
      ],
      correct: 2,
      why: 'Original-IP-Header und Daten werden komplett verschlüsselt und in IPsec-Header/-Trailer plus einen neuen IP-Header eingepackt, der zum Concentrator zeigt.',
    },
    {
      q: 'Which VPN type typically connects entire remote offices, with firewalls acting as the VPN endpoints?',
      options: [
        'Clientless browser VPN',
        'Always-on SSL VPN',
        'Remote access VPN',
        'IPsec site-to-site VPN',
      ],
      correct: 3,
      why: 'Site-to-Site-VPNs verbinden Standorte über IPsec-Tunnel; die Firewalls beider Seiten sind die Endpunkte, Endgeräte brauchen keine Extra-Software.',
    },
    {
      q: 'What is SASE (Secure Access Service Edge)?',
      options: [
        'A cloud-based "next generation VPN" placing security technologies close to cloud services',
        'A hardware appliance that replaces all firewalls',
        'A protocol for encrypting DNS queries',
        'A backup standard for wide area networks',
      ],
      correct: 0,
      why: 'SASE verlagert die Sicherheitstechnologien in die Cloud, direkt neben die genutzten Dienste; Clients verbinden sich sicher dorthin — im Video als „next generation of VPN" beschrieben (ergänzend zu SD-WAN).',
    },
  ],

  // 068 — 3.3 Data Types and Classifications
  '068': [
    {
      q: 'What characterizes regulated data?',
      options: [
        'It may never be stored digitally',
        'A third party (e.g., PCI standards or government law) sets the rules for protecting it',
        'It is always encrypted by default',
        'It belongs exclusively to government agencies',
      ],
      correct: 1,
      why: 'Bei regulierten Daten bestimmt eine dritte Instanz die Schutzregeln — z. B. die Payment-Card-Industry-Standards für Kreditkartendaten oder staatliche Gesetze.',
    },
    {
      q: 'How is intellectual property typically protected, even though others may be able to see it?',
      options: [
        'By storing it only on air-gapped systems',
        'By hashing it before publication',
        'Through copyrights and trademark law',
        'Through mandatory encryption at rest',
      ],
      correct: 2,
      why: 'Geistiges Eigentum ist oft öffentlich sichtbar und wird deshalb rechtlich geschützt — über Copyright und Markenrecht.',
    },
    {
      q: 'Which of the following is an example of non-human-readable data from the video?',
      options: [
        'A barcode encoding details a person cannot easily recognize',
        'A spreadsheet with financial figures',
        'A plain-text password list',
        'A printed court record',
      ],
      correct: 0,
      why: 'Ein Barcode ist für Menschen nicht direkt lesbar; manche Formate kombinieren beides, indem die Zahlen unter dem Barcode mitgedruckt werden.',
    },
    {
      q: 'What qualifies as PHI (Protected Health Information)?',
      options: [
        'Any data stored in a hospital building',
        'Only genetic test results',
        'Public statistics about disease outbreaks',
        'Health details tied to an individual, including records and health care payments',
      ],
      correct: 3,
      why: 'PHI sind personenbezogene Gesundheitsdaten: Gesundheitsstatus, Akteninhalte und auch Zahlungsinformationen rund um die Behandlung.',
    },
    {
      q: 'What does a "critical" data classification imply?',
      options: [
        'The data must be deleted after 30 days',
        'The data should always be accessible, with processes maintaining its uptime and availability',
        'The data may only be read by executives',
        'The data is public and needs no protection',
      ],
      correct: 1,
      why: '„Critical" heißt: Diese Daten müssen immer verfügbar sein — es braucht Prozesse und Verfahren, die Uptime und Verfügbarkeit sicherstellen.',
    },
  ],

  // 072 — 3.4 Capacity Planning
  '072': [
    {
      q: 'What happens when a service is built with too little supply for the actual demand?',
      options: [
        'Nothing — demand automatically adjusts to the supply',
        'Application slowdowns and potentially outages',
        'Licensing costs increase',
        'The service becomes more secure',
      ],
      correct: 1,
      why: 'Zu wenig Ressourcen bei zu viel Nachfrage führt zu langsamen Anwendungen und im schlimmsten Fall zu Ausfällen; zu viel Supply verschwendet dagegen Geld.',
    },
    {
      q: 'Which three areas does capacity planning balance, according to the video?',
      options: [
        'People, technology, and infrastructure',
        'Encryption, authentication, and authorization',
        'Bandwidth, latency, and jitter',
        'Confidentiality, integrity, and availability',
      ],
      correct: 0,
      why: 'Es braucht die richtige Anzahl an Menschen, die passende Technologie und eine geeignete Infrastruktur, um Angebot und Nachfrage in Deckung zu bringen.',
    },
    {
      q: 'Why are people a difficult resource in capacity planning?',
      options: [
        'They cannot be assigned to cloud projects',
        'They do not scale with load balancers',
        'Hiring and training take time and money, and downsizing excess staff is costly too',
        'They can only work on one service at a time',
      ],
      correct: 2,
      why: 'Menschen lassen sich schlecht kurzfristig „hoch- oder runterskalieren": Einstellen und Einarbeiten kostet Zeit und Geld, Überkapazität führt zu Umsetzungen oder Abbau.',
    },
    {
      q: 'How can a web-server deployment be designed to scale with changing demand?',
      options: [
        'By using a single, maximally sized server',
        'By caching all content on the clients',
        'By disabling TLS to save CPU cycles',
        'With a load balancer and multiple servers that can be added or removed invisibly to users',
      ],
      correct: 3,
      why: 'Hinter einem Load Balancer lassen sich Server unsichtbar für die Nutzer ergänzen oder entfernen — genau so viele, wie die Nachfrage erfordert.',
    },
    {
      q: 'What is the main trade-off of using cloud resources to cover demand peaks?',
      options: [
        'Cloud instances cannot be removed once created',
        'Resources feel unlimited, but the more you use, the more you pay',
        'Cloud capacity is fixed at contract signing',
        'Cloud instances require shipping and racking hardware',
      ],
      correct: 1,
      why: 'Cloud-Anbieter bieten scheinbar unbegrenzte Ressourcen per Klick — ohne Hardware-Beschaffung. Der Preis: Jede zusätzlich genutzte Ressource kostet; danach wird „rightsized".',
    },
  ],

  // 076 — 4.1 Secure Baselines
  '076': [
    {
      q: 'What is a security baseline for an application instance?',
      options: [
        'The minimum bandwidth an application needs',
        'A log of all past security incidents',
        'The set of security settings across the app, OS, and other components that must be deployed with it',
        'The default password list of a device',
      ],
      correct: 2,
      why: 'Die Baseline umfasst alle Sicherheitseinstellungen rund um die App-Instanz — Firewall-Einstellungen, Patch-Stände, OS-Härtung — und muss bei jedem Deployment mitkommen.',
    },
    {
      q: 'Where can you get a foundational security baseline instead of building one from scratch?',
      options: [
        'From the application developer, the OS manufacturer, or appliance vendors',
        'Only from government agencies',
        'From the internet service provider',
        'Baselines must always be created in-house',
      ],
      correct: 0,
      why: 'Hersteller liefern fertige Grundlagen: der App-Entwickler (Dateiberechtigungen, App-Einstellungen), Microsoft für Windows, und Appliance-Hersteller für ihre Geräte.',
    },
    {
      q: 'Which Microsoft toolset helps deploy security baselines for Windows?',
      options: [
        'Windows Defender Firewall',
        'The Security Compliance Toolkit (SCT)',
        'BitLocker Administration',
        'The Windows Subsystem for Linux',
      ],
      correct: 1,
      why: 'Microsoft stellt Security-Baselines für Windows/Windows Server bereit samt Deploy-Werkzeugen — dem Security Compliance Toolkit (SCT). Zum Umfang: Windows 10 hat allein über 3.000 Group-Policy-Einstellungen.',
    },
    {
      q: 'Why should baseline deployment be automated in larger environments?',
      options: [
        'Manual deployment is forbidden by compliance rules',
        'Automation removes the need for testing',
        'Baselines change every day',
        'Baselines are large and complex and must reach hundreds or thousands of devices',
      ],
      correct: 3,
      why: 'Bei so vielen Einstellungen und Geräten ist ein automatisierter Prozess (zentrale Konsole, Active-Directory-GPO, MDM für Mobilgeräte) der einzige praktikable Weg.',
    },
    {
      q: 'What are typical reasons to update an existing security baseline?',
      options: [
        'A new vulnerability, an application update, or a new operating system',
        'A change of company logo',
        'Quarterly billing cycles',
        'Baselines must be rebuilt weekly by policy',
      ],
      correct: 0,
      why: 'Baselines sind meist stabile Best Practices — aktualisiert wird bei neuen Schwachstellen, App-Updates oder neuen Betriebssystemen; danach testen und per Audit prüfen, ob sie wirksam bleiben.',
    },
  ],

  // 078 — 4.1 Securing Wireless and Mobile
  '078': [
    {
      q: 'What is the purpose of a wireless site survey?',
      options: [
        'To measure the internet uplink speed',
        'To understand existing access points and frequency use, including networks outside your control',
        'To count the number of wireless clients',
        'To document the cabling of the building',
      ],
      correct: 1,
      why: 'Der Site Survey zeigt, welche Access Points (eigene und fremde) senden und wie das Spektrum belegt ist — Grundlage für die Kanalwahl; er sollte regelmäßig wiederholt werden.',
    },
    {
      q: 'What does a Wi-Fi heat map visualize?',
      options: [
        'The temperature of the access points',
        'The number of devices per room',
        'Signal strength from room to room (strong areas vs. weak areas)',
        'The age of the wireless hardware',
      ],
      correct: 2,
      why: 'Die Heat Map färbt starke Signalbereiche (gelb/rot) und schwache (dunkler/blau) ein — so sieht man raumweise, welche Abdeckung zu erwarten ist.',
    },
    {
      q: 'Which capabilities does a Mobile Device Manager (MDM) provide?',
      options: [
        'It replaces the cellular provider',
        'It only works on corporate-owned devices',
        'It encrypts all Bluetooth traffic',
        'Policies, required apps, feature restrictions (e.g., camera), and business/personal segmentation',
      ],
      correct: 3,
      why: 'Per MDM verteilt die Admin Policies und Pflicht-Apps, kann Funktionen wie die Kamera situativ sperren, erzwingt Screen Locks/PINs und trennt Firmendaten von privaten Daten.',
    },
    {
      q: 'What does COPE stand for in mobile deployment models?',
      options: [
        'Corporate owned, personally enabled',
        'Centrally operated, privately encrypted',
        'Company operated, publicly enabled',
        'Certified original phone equipment',
      ],
      correct: 0,
      why: 'COPE: Die Firma kauft und besitzt das Gerät, erlaubt aber die private Mitnutzung; Firmendaten liegen in einer eigenen Partition. CYOD lässt den Nutzer zusätzlich das Gerät wählen.',
    },
    {
      q: 'Why does Bluetooth use a formal pairing process?',
      options: [
        'To extend the wireless range',
        'Because a connected device could access the data on your mobile device',
        'To reduce battery consumption',
        'To comply with 5G standards',
      ],
      correct: 1,
      why: 'Ein per Bluetooth verbundenes Gerät kann auf Daten des Telefons zugreifen — deshalb das formale Pairing, und deshalb nie automatisch mit unbekannten Geräten verbinden.',
    },
  ],

  // 081 — 4.2 Asset Management
  '081': [
    {
      q: 'Why does an asset tracking system record whether an asset is hardware or software?',
      options: [
        'Software assets need no tracking',
        'Hardware assets cannot be assigned to users',
        'Hardware is a capital expenditure with depreciation; software is an operating expense — they are taxed differently',
        'Only hardware can carry an asset tag',
      ],
      correct: 2,
      why: 'Hardware ist eine Kapitalausgabe (mit Abschreibung), Software eine Betriebsausgabe — die Einordnung im Asset-System bestimmt die steuerliche Behandlung.',
    },
    {
      q: 'Besides identification, what additional benefit does a physical asset tag provide?',
      options: [
        'It acts as a security feature if the device is lost or stolen',
        'It improves the Wi-Fi antenna signal',
        'It encrypts the storage drive',
        'It is required for warranty claims',
      ],
      correct: 0,
      why: 'Der Asset Tag verknüpft das Gerät per Nummer/Barcode mit dem Inventar — und hilft als Kennzeichnung, wenn das Gerät verloren geht oder gestohlen wird.',
    },
    {
      q: 'A storage drive should be reused by another employee. What is the right sanitization approach?',
      options: [
        'Degauss the drive',
        'Incinerate the drive',
        'Format the drive with the standard OS tool',
        'Use a secure-delete utility so the previous data cannot be recovered',
      ],
      correct: 3,
      why: 'Für die interne Wiederverwendung reicht sicheres Löschen per Secure-Delete-Utility — danach ist die Information nicht wiederherstellbar, die Platte bleibt nutzbar. Degaussing/Schreddern zerstört die Platte.',
    },
    {
      q: 'What is a certificate of destruction?',
      options: [
        'A government license for recycling electronics',
        'A third party’s confirmation that the drives you handed over were completely destroyed',
        'A checksum proving data integrity',
        'A warranty document for new drives',
      ],
      correct: 1,
      why: 'Wer die Vernichtung vieler Platten an einen Dienstleister auslagert, erhält als Nachweis das Certificate of Destruction — die Bestätigung, dass die Daten unzugänglich sind.',
    },
    {
      q: 'Why do organizations define data retention policies?',
      options: [
        'To reduce storage costs to zero',
        'To avoid having to encrypt backups',
        'Regulations may mandate keeping data (e.g., emails, financial data) for set periods, and retention supports backup and disaster recovery',
        'Because deleted data is illegal in all industries',
      ],
      correct: 2,
      why: 'Vorgaben können das Aufbewahren von E-Mails oder Finanzdaten über Jahre verlangen; zudem stützt Retention Backups (versehentliches Löschen) und den Wiederanlauf im Desasterfall.',
    },
  ],

  // 088 — 4.4 Security Tools
  '088': [
    {
      q: 'What problem does SCAP (Security Content Automation Protocol) solve?',
      options: [
        'It encrypts log files before transmission',
        'It replaces vulnerability scanners entirely',
        'Different security tools describe the same vulnerability differently — SCAP gives them one common language',
        'It blocks vulnerabilities at the network edge',
      ],
      correct: 2,
      why: 'NGFW, IPS und Vulnerability-Scanner können dieselbe Schwachstelle unterschiedlich benennen. SCAP (gepflegt von NIST) vereinheitlicht das — und ermöglicht so automatisiertes Erkennen und Patchen ohne menschliches Zutun.',
    },
    {
      q: 'Where can you find an extensive library of security benchmarks for operating systems and applications?',
      options: [
        'The Center for Internet Security (CIS)',
        'The local internet registry',
        'The IEEE 802.11 working group',
        'The DNS root servers',
      ],
      correct: 0,
      why: 'Das Center for Internet Security stellt Benchmarks bereit — Best-Practice-Konfigurationen, die ein System „out of the box" absichern (z. B. Screenshots deaktivieren, Backups verschlüsseln auf Mobilgeräten).',
    },
    {
      q: 'What distinguishes an agentless compliance check from an agent-based one?',
      options: [
        'Agentless checks require a permanent software installation',
        'It runs on demand (e.g., at login or VPN connect), executes in memory, and removes itself afterwards',
        'Agentless checks work only on mobile devices',
        'Agent-based checks can never be updated',
      ],
      correct: 1,
      why: 'Der agentenlose Check läuft ohne feste Installation, prüft die Compliance im Speicher und entfernt sich danach — dafür läuft er nicht rund um die Uhr wie ein installierter Agent.',
    },
    {
      q: 'What is an SNMP trap?',
      options: [
        'A honeypot for SNMP-based attacks',
        'A filter that blocks SNMP polling',
        'A backup copy of the MIB database',
        'A proactive alert the SNMP agent sends to the management station (UDP 162) when a configured condition fires',
      ],
      correct: 3,
      why: 'Normales SNMP fragt Werte per Polling ab (UDP 161). Ein Trap dreht das um: Der Agent meldet sich von selbst über UDP 162, z. B. wenn CRC-Fehler um einen Schwellwert steigen.',
    },
    {
      q: 'What is the purpose of Data Loss Prevention (DLP)?',
      options: [
        'To compress backups and save storage',
        'To identify and block sensitive data (e.g., SSNs, credit card data) from leaving the network',
        'To recover deleted files from drives',
        'To throttle bandwidth for streaming services',
      ],
      correct: 1,
      why: 'DLP überwacht Verkehr in Echtzeit und blockiert sensible Inhalte wie Sozialversicherungsnummern, Gesundheits- oder Kreditkartendaten — auf Endpoints, im Netz und in der Cloud.',
    },
  ],

  // 089 — 4.5 Firewalls
  '089': [
    {
      q: 'What distinguishes a next-generation firewall (NGFW) from a traditional firewall?',
      options: [
        'It only works for outbound traffic',
        'It cannot use port numbers anymore',
        'It recognizes the specific application in the traffic instead of deciding by port numbers alone',
        'It is always a software-only product',
      ],
      correct: 2,
      why: 'Ein NGFW analysiert den Verkehr bis zur Anwendung (deshalb auch „application layer gateway" oder „deep packet inspection device"); traditionelle Firewalls kennen nur Portnummern wie TCP 22 oder 443.',
    },
    {
      q: 'How is a firewall rule base typically organized?',
      options: [
        'Specific rules at the top, broader rules below, evaluated top-down until a match',
        'Rules are evaluated in random order for fairness',
        'Broad rules first, specific rules at the bottom',
        'All rules are evaluated simultaneously and combined',
      ],
      correct: 0,
      why: 'Die Firewall arbeitet die Regeln von oben nach unten ab, bis eine passt — deshalb stehen spezifische Regeln oben und generische weiter unten.',
    },
    {
      q: 'What does "implicit deny" mean in a firewall?',
      options: [
        'The administrator must confirm every packet manually',
        'Traffic that matches no rule in the rule base is automatically denied at the end',
        'All encrypted traffic is denied by default',
        'Deny rules are hidden from the rule list',
      ],
      correct: 1,
      why: 'Erreicht ein Paket das Ende der Regelliste ohne Treffer, wird es automatisch verworfen — das ist das implizite Deny am Listenende.',
    },
    {
      q: 'Why are internet-facing services placed on a screened subnet?',
      options: [
        'To give them faster internet access',
        'Because the screened subnet needs no firewall rules',
        'To reduce licensing costs for those servers',
        'So internet traffic reaches only that subnet and never the internal network with sensitive data',
      ],
      correct: 3,
      why: 'Die Firewall lenkt Internetverkehr in das Screened Subnet, das keine sensiblen Geräte oder Daten enthält — Zugriffe aus dem Internet aufs interne Netz werden so verhindert.',
    },
    {
      q: 'How can an intrusion prevention system detect attacks even without a specific signature?',
      options: [
        'By blocking all unknown port numbers',
        'By consulting the firewall log afterwards',
        'Through anomaly detection — recognizing what a generic intrusion (e.g., database injection) looks like',
        'It cannot; signatures are always required',
      ],
      correct: 2,
      why: 'Neben tausenden Signaturen (z. B. für Conficker) können IPS-Systeme generische Angriffsmuster wie Database Injections erkennen und blocken — bei so vielen Regeln sind gelegentliche False Positives einzuplanen.',
    },
  ],

  // 092 — 4.5 Secure Protocols
  '092': [
    {
      q: 'Which of these protocols send data across the network in the clear?',
      options: [
        'SSH, HTTPS, SFTP, IMAPS',
        'Telnet, FTP, SMTP, IMAP',
        'TLS, IPsec, WPA3',
        'DNS over HTTPS and SNMPv3',
      ],
      correct: 1,
      why: 'Telnet, FTP, SMTP und IMAP übertragen unverschlüsselt — wer damit auf der DEFCON auffällt, landet auf der „Wall of Sheep" samt Nutzername und Passwortanfang.',
    },
    {
      q: 'What is the secure replacement for a remote console session instead of Telnet?',
      options: [
        'SSH (Secure Shell)',
        'SNMP',
        'RDP over port 80',
        'rlogin',
      ],
      correct: 0,
      why: 'Für Remote-Konsolen gilt: SSH statt Telnet — analog HTTPS statt HTTP, IMAPS statt IMAP und SFTP statt FTP.',
    },
    {
      q: 'Does traffic on port 443 guarantee the connection is encrypted?',
      options: [
        'Yes, port 443 enforces encryption at the network level',
        'Yes, as long as the client is a browser',
        'No, but only on wireless networks',
        'No — the port is only an indicator; verify server settings or confirm with a packet capture',
      ],
      correct: 3,
      why: 'Portnummern sind nur ein Hinweis: Port 443 ist üblicherweise HTTPS, aber erst Server-Einstellungen und ein Packet Capture bestätigen, dass wirklich verschlüsselt übertragen wird.',
    },
    {
      q: 'How can you encrypt traffic on a wireless network even for applications that do not encrypt themselves?',
      options: [
        'By hiding the SSID',
        'By using MAC address filtering',
        'By configuring WPA3 on the access point',
        'By reducing the transmission power',
      ],
      correct: 2,
      why: 'Ein offener Access Point überträgt alles im Klartext; mit WPA3 (oder vergleichbarer Verschlüsselung) wird sämtlicher Verkehr auf dem Funkweg verschlüsselt.',
    },
    {
      q: 'What does a VPN provide when applications use insecure protocols?',
      options: [
        'It converts insecure protocols into secure ones permanently',
        'An encrypted tunnel to the concentrator, protecting all traffic sent over that link',
        'It blocks the insecure applications',
        'It anonymizes the user but does not encrypt',
      ],
      correct: 1,
      why: 'Der VPN-Tunnel verschlüsselt alles zwischen Gerät und Concentrator — unabhängig von der Anwendung. Der Concentrator entschlüsselt und leitet die Daten weiter; dafür braucht es ggf. Client-Software und einen Concentrator/Dienst.',
    },
  ],

  // 101 — 4.8 Incident Response
  '101': [
    {
      q: 'Which NIST document describes the incident response lifecycle?',
      options: [
        'NIST Cybersecurity Framework Core',
        'FIPS 140-2',
        'NIST SP 800-53',
        'NIST Special Publication 800-61, the Computer Security Incident Handling Guide',
      ],
      correct: 3,
      why: 'SP 800-61 („Computer Security Incident Handling Guide") beschreibt den kompletten Lifecycle: Preparation, Detection & Analysis, Containment/Eradication/Recovery und Post-Incident-Aktivitäten.',
    },
    {
      q: 'What belongs in an "incident go bag"?',
      options: [
        'Laptops with specialized software, removable media, forensic tools, and digital imaging equipment',
        'Only spare network cables',
        'Printed copies of all company emails',
        'Replacement servers for the data center',
      ],
      correct: 0,
      why: 'Der Go Bag enthält alles, was im Ernstfall sofort gebraucht wird: präparierte Laptops, Wechseldatenträger, Forensik-Software und Foto-/Videoausrüstung — dazu Doku, Baselines und File-Hashes als Referenz.',
    },
    {
      q: 'Why can malware analysis in a sandbox be misleading?',
      options: [
        'Sandboxes cannot execute programs',
        'Sandboxes automatically patch the malware',
        'Malware may detect the virtual machine and behave differently — some simply deletes itself',
        'Sandboxes only work for network attacks',
      ],
      correct: 2,
      why: 'Eine Sandbox ist ein geschlossenes Testsystem. Manche Malware erkennt aber die VM mit begrenzter Konnektivität und verhält sich anders — bis hin zur Selbstlöschung.',
    },
    {
      q: 'Which steps belong to the recovery phase after an incident?',
      options: [
        'Publishing the attacker’s identity',
        'Removing malware or reimaging, disabling breached accounts, and fixing the exploited vulnerabilities',
        'Buying new firewalls as a matter of principle',
        'Waiting to observe what the attacker does next',
      ],
      correct: 1,
      why: 'Recovery heißt: Schadsoftware entfernen bzw. neu aufsetzen (Known-Good-Backups oder Original-Medien), kompromittierte/angelegte Konten deaktivieren und die Einfallstore schließen.',
    },
    {
      q: 'Why should the post-incident meeting happen as soon as possible after resolution?',
      options: [
        'To assign blame while emotions are high',
        'Because regulations require same-day reports',
        'To reduce the meeting budget',
        'Because participants remember the incident best then, improving plans for the next one',
      ],
      correct: 3,
      why: 'Zeitnah ist die Erinnerung der Beteiligten am frischesten: Was ist passiert, wie war die Timeline, welche Indikatoren wurden übersehen — daraus wird der Plan fürs nächste Mal besser.',
    },
  ],

  // 104 — 4.9 Log Data
  '104': [
    {
      q: 'What extra details does a next-generation firewall log provide beyond IPs, ports, and allow/block?',
      options: [
        'The full content of every packet',
        'The applications in use, URL categories, and hints on suspicious data or anomalies',
        'The physical location of the attacker',
        'The passwords used during authentication',
      ],
      correct: 1,
      why: 'Klassische Firewall-Logs zeigen Quelle/Ziel, Ports und Disposition; ein NGFW erkennt zusätzlich die Anwendung, URL-Kategorien und Auffälligkeiten in den Traffic Flows.',
    },
    {
      q: 'Why not send every log from every system into the SIEM?',
      options: [
        'SIEMs can only store firewall logs',
        'Logs lose legal validity in a SIEM',
        'The volume is enormous — send only what matters for security decisions',
        'SIEMs cannot correlate different log types',
      ],
      correct: 2,
      why: 'Über alle Systeme entsteht eine riesige Datenmenge. Ins SIEM gehört die Information, die für Sicherheitsentscheidungen gebraucht wird — dort wird sie dann konsolidiert und korreliert.',
    },
    {
      q: 'Which hidden information can document and image metadata reveal?',
      options: [
        'Only the file size and file name',
        'The encryption keys of the device',
        'The firewall rules of the sender',
        'Mail servers in email headers, GPS coordinates in photos, author details in office documents',
      ],
      correct: 3,
      why: 'Metadaten stecken überall: E-Mail-Header verraten die beteiligten Server (inkl. SPF-Details), Handyfotos das Gerät und GPS-Koordinaten, Office-Dokumente Autor und Kontaktdaten.',
    },
    {
      q: 'What is the purpose of a SIEM dashboard compared to generated reports?',
      options: [
        'An at-a-glance view of the current status, not long-term analysis',
        'It replaces all log storage',
        'It compiles multi-year trend data instantly',
        'It is only used for compliance audits',
      ],
      correct: 0,
      why: 'Reports über Terabytes an Daten brauchen viel Rechenzeit. Das Dashboard zeigt den aktuellen Zustand auf einen Blick (z. B. im SOC) — bewusst ohne Langzeitauswertung.',
    },
    {
      q: 'What insight does a packet capture (e.g., Wireshark) provide?',
      options: [
        'Only connection counts per device',
        'A summary of failed logins',
        'Every bit and byte on the network, down to headers and payload of each frame',
        'The patch level of all servers',
      ],
      correct: 2,
      why: 'Packet Captures erfassen alles auf dem Netz: Die Summary-Ansicht zeigt Paket für Paket, die Detail-Ansicht Ethernet-, IP-, TCP-Header und die Anwendungsdaten selbst.',
    },
  ],

  // 107 — 5.1 Security Procedures
  '107': [
    {
      q: 'What does a change control board do?',
      options: [
        'It writes the application code for changes',
        'It analyzes proposed changes, approves and schedules them, and checks for a backup plan',
        'It monitors network traffic in real time',
        'It hires new IT staff',
      ],
      correct: 1,
      why: 'Das Change Control Board prüft alle vorgeschlagenen Änderungen, genehmigt und terminiert sie — inklusive Rückweg (Backup-Plan) und anschließender Dokumentation.',
    },
    {
      q: 'Why should a leaving employee’s account be disabled rather than deleted?',
      options: [
        'Deleting accounts is technically impossible',
        'Disabled accounts save license costs',
        'The account must stay active for the successor',
        'Deleting could destroy decryption keys and data still needed later',
      ],
      correct: 3,
      why: 'Offboarding-Regel: Konto deaktivieren statt löschen — sonst gehen womöglich Schlüssel für verschlüsselte Dateien oder wichtige Daten unwiederbringlich verloren.',
    },
    {
      q: 'What is a security playbook?',
      options: [
        'A step-by-step definition of what to do for a specific event, e.g., a data breach or ransomware',
        'A list of all employee passwords',
        'The marketing plan of the security vendor',
        'A diagram of the network topology',
      ],
      correct: 0,
      why: 'Playbooks legen für ein konkretes Ereignis fest, was zuerst, was danach zu tun ist — pro Szenario eines (Data Breach, Ransomware …), regelmäßig überprüft und an neue Bedrohungen angepasst.',
    },
    {
      q: 'What does a SOAR platform provide?',
      options: [
        'A replacement for all firewalls',
        'Security, Orchestration, Automation, and Response — integrating third-party tools and automating mundane tasks',
        'Encrypted offsite backups',
        'A certification program for administrators',
      ],
      correct: 1,
      why: 'SOAR verbindet viele verschiedene Produkte auf einer Plattform und automatisiert Routineaufgaben (z. B. aus Playbooks) — die Security-Teams gewinnen Zeit für Wichtigeres.',
    },
    {
      q: 'How do a board and a committee split governance responsibilities?',
      options: [
        'The committee sets objectives; the board implements them',
        'Both bodies only exist in government agencies',
        'The board sets broad objectives; a committee of subject matter experts works out how to meet them',
        'The board handles daily operations; the committee audits them',
      ],
      correct: 2,
      why: 'Das Board (z. B. Board of Directors) gibt breite Ziele vor; das Committee aus Fachexperten erarbeitet die Umsetzung und legt Ergebnisse dem Board zur Freigabe vor. Governance kann dabei zentral oder dezentral organisiert sein.',
    },
  ],

  // 109 — 5.1 Data Roles and Responsibilities
  '109': [
    {
      q: 'Who is the data owner in an organization?',
      options: [
        'The administrator who configures the database',
        'Any user who opens the file',
        'The cloud provider hosting the data',
        'A senior role ultimately accountable for the data, e.g., the VP of sales for customer data',
      ],
      correct: 3,
      why: 'Der Data Owner sitzt höher in der Organisation und trägt die Gesamtverantwortung — etwa der Vertriebs-VP für Kundendaten oder der Treasurer für Finanzdaten.',
    },
    {
      q: 'What is the relationship between data controller and data processor?',
      options: [
        'The controller decides how data is used and instructs the processor, who actually processes it',
        'The processor supervises the controller',
        'Both terms describe the same role',
        'The controller stores data; the processor deletes it',
      ],
      correct: 0,
      why: 'Der Controller bestimmt die Verwendung und gibt Anweisungen; der Processor führt die Verarbeitung aus.',
    },
    {
      q: 'In the payroll example from the video, who is the data processor?',
      options: [
        'The payroll department of the company',
        'The external payroll company that processes user and bank details',
        'The employees receiving salaries',
        'The bank transferring the money',
      ],
      correct: 1,
      why: 'Die Payroll-Abteilung ist der Data Controller (sie steuert den Prozess); die externe Payroll-Firma verarbeitet die Daten und ist damit der Data Processor.',
    },
    {
      q: 'What is a data custodian (data steward) responsible for?',
      options: [
        'Setting the company-wide budget',
        'Developing new data-driven products',
        'Security, accuracy, and privacy of assigned data, and compliance with laws and regulations',
        'Selling data to third parties',
      ],
      correct: 2,
      why: 'Der Custodian/Steward sichert die ihm zugewiesenen Daten, hält sie korrekt und vertraulich und stellt die Einhaltung der einschlägigen Gesetze und Regularien sicher.',
    },
    {
      q: 'Which task from the video belongs to the data custodian?',
      options: [
        'Approving the annual IT budget',
        'Negotiating supplier contracts',
        'Owning all financial data of the company',
        'Assigning sensitivity labels and tying them to access control for users',
      ],
      correct: 3,
      why: 'Der Custodian vergibt Sensitivitäts-Labels und verknüpft sie mit der Zugriffskontrolle — er entscheidet, welcher Nutzer auf welche Daten zugreifen darf.',
    },
  ],

  // 121 — 5.6 User Training
  '121': [
    {
      q: 'When should users ideally receive their security training?',
      options: [
        'Before they connect to the network for the first time',
        'After the first security incident',
        'Once a year, regardless of start date',
        'Only when they change departments',
      ],
      correct: 0,
      why: 'Idealerweise kommt das Training vor dem ersten Netzzugang — rollenspezifisch (Buchhaltung braucht anderes Training als der Versand) und auch für Dritte wie Contractors, Partner und Lieferanten.',
    },
    {
      q: 'What does "situational awareness" mean in user training?',
      options: [
        'Knowing the office evacuation routes',
        'Always looking for threats: phishing links and attachments, unusual URLs, or an official-looking envelope with a USB drive',
        'Monitoring the server room temperature',
        'Reading the news every morning',
      ],
      correct: 1,
      why: 'Nutzer sollen Bedrohungen laufend erkennen: Phishing per Mail oder SMS, verdächtige URLs — und auch physische Angriffe wie einen zugesandten USB-Stick nicht einfach einstecken.',
    },
    {
      q: 'Which measures help detect and stop insider threats?',
      options: [
        'A single administrator making all decisions',
        'Disabling all logging to save space',
        'Multiple approvals for critical process changes and active file monitoring with immediate alerts',
        'Prohibiting all remote work',
      ],
      correct: 2,
      why: 'Insider sind schwer zu erkennen — es braucht einen mehrschichtigen Ansatz: mehrere Freigaben für kritische Änderungen, aktives File-Monitoring und Prozesse, die sich nicht leicht umgehen lassen.',
    },
    {
      q: 'How can password requirements be enforced administratively in a Windows environment?',
      options: [
        'By emailing users a reminder',
        'By printing password rules in the cafeteria',
        'By trusting users to choose wisely',
        'Via group policy that forces password length and complexity',
      ],
      correct: 3,
      why: 'Längen- und Komplexitätsvorgaben lassen sich technisch durchsetzen — in Windows-Umgebungen typischerweise über Group Policy.',
    },
    {
      q: 'Which additional risks come with users working from home?',
      options: [
        'Family or friends using the work system, weaker endpoint security, and VPN access needing extra protection',
        'Home networks are automatically more secure',
        'No risks — the office firewall still protects them',
        'Only the risk of slower internet',
      ],
      correct: 0,
      why: 'Remote-Arbeit erfordert: kein Zugriff durch Familie/Freunde auf Arbeitsgeräte, zusätzliche Endpoint-Security außerhalb des Büros und verstärkte Absicherung des VPN-Zugangs.',
    },
  ],

  // 006 — 1.2 Gap Analysis
  '006': [
    {
      q: 'What does a gap analysis study?',
      options: [
        'The physical distance between data centers',
        'Where the organization is today versus where it wants to be',
        'The unused disk space on servers',
        'The salary differences within the IT team',
      ],
      correct: 1,
      why: 'Die Gap-Analyse vergleicht Ist- und Soll-Zustand der Sicherheit — einfach erklärt, aber aufwendig: Sie kann Wochen, Monate oder Jahre dauern und viele Beteiligte einbeziehen.',
    },
    {
      q: 'Which documents are common baselines for a security gap analysis?',
      options: [
        'RFC 1918 and RFC 5321',
        'The OWASP Top 10 only',
        'NIST SP 800-171 Rev. 2 and ISO/IEC 27001',
        'The vendor price list and the SLA',
      ],
      correct: 2,
      why: 'Als Zielmarke dienen etablierte Baselines wie NIST SP 800-171 Rev. 2 („Protecting Controlled Unclassified Information") oder ISO/IEC 27001 — oder eigene, organisationsspezifische Baselines.',
    },
    {
      q: 'What is evaluated about the people in a gap analysis?',
      options: [
        'Their age and job title',
        'Their typing speed',
        'The number of vacation days taken',
        'Formal IT security experience, training received, and knowledge of security policies',
      ],
      correct: 3,
      why: 'Neben Prozessen werden die Menschen betrachtet: formale Security-Erfahrung, absolvierte Trainings und Kenntnis der Richtlinien und Verfahren.',
    },
    {
      q: 'What does the final gap analysis report contain?',
      options: [
        'The current state per objective plus the path (time, money, equipment, change control) to reach the baseline',
        'Only a list of all firewalls',
        'The résumés of the security team',
        'A copy of the entire baseline document',
      ],
      correct: 0,
      why: 'Der Abschlussbericht zeigt Ist vs. Soll je Objective und den Weg dorthin — z. B. als Ampel-Tabelle über alle Standorte: Rot zuerst angehen, dann Gelb, dann Grün.',
    },
  ],

  // 009 — 1.2 Deception and Disruption
  '009': [
    {
      q: 'What is the purpose of a honeypot?',
      options: [
        'To encrypt sensitive production data',
        'To attract attackers to a fake system and observe the techniques and automation they use',
        'To speed up authentication for real users',
        'To store backups off-site',
      ],
      correct: 1,
      why: 'Ein Honeypot lockt Angreifer (meist automatisierte Prozesse) in eine virtuelle Welt ohne Produktionsbezug — man beobachtet, was und wie sie angreifen; ein Wettlauf, denn Angreifer versuchen Honeypots zu erkennen.',
    },
    {
      q: 'What is a honeynet?',
      options: [
        'A VPN for security researchers',
        'A network cable with tap detection',
        'Multiple honeypots combined into a larger, more believable fake infrastructure with servers, routers, and firewalls',
        'A filter that blocks known attacker IPs',
      ],
      correct: 2,
      why: 'Mehrere virtualisierte Honeypots werden zu einem Honeynet kombiniert — Workstations, Server, Router, Firewalls — damit die Umgebung für den Angreifer echter wirkt (mehr auf projecthoneypot.org).',
    },
    {
      q: 'Why should access to a honeyfile like "passwords.txt" trigger an alert?',
      options: [
        'Because the file contains real passwords',
        'Because the file could get corrupted',
        'Because reading it slows down the server',
        'Because no legitimate user has any reason to open it — access means someone is snooping',
      ],
      correct: 3,
      why: 'Honeyfiles enthalten nur scheinbar sensible Fake-Daten. Im normalen Betrieb greift niemand darauf zu — ein Zugriff ist also ein starkes Signal und sollte einen Alarm auslösen.',
    },
    {
      q: 'What is a honeytoken?',
      options: [
        'Traceable fake data (e.g., made-up API credentials or email addresses) that reveals where leaked data came from',
        'A hardware token for admin logins',
        'A cryptocurrency reward for bug hunters',
        'A session cookie with extra encryption',
      ],
      correct: 0,
      why: 'Honeytokens sind nachverfolgbare Fake-Daten — erfundene API-Credentials, E-Mail-Adressen, DB-Einträge, Cookies oder Pixel. Tauchen sie woanders auf, weiß man, woher sie stammen.',
    },
  ],

  // 010 — 1.3 Change Management
  '010': [
    {
      q: 'Why do organizations use a formal change control process?',
      options: [
        'To slow down the IT department deliberately',
        'To avoid buying new hardware',
        'To maintain uptime and availability, keep everyone informed, and avoid mistakes during changes',
        'Because software licenses require it',
      ],
      correct: 2,
      why: 'Ohne formalen Prozess macht jeder Änderungen nach Belieben — mit Inkonsistenzen und Ausfällen als Folge. Der Prozess sichert Verfügbarkeit, Information aller Beteiligten und Fehlervermeidung.',
    },
    {
      q: 'Which risk must be weighed IN ADDITION to the risk of making a change?',
      options: [
        'The risk of NOT making the change, e.g., an unpatched vulnerability staying exploitable',
        'The risk of the vendor raising prices',
        'The risk of employees learning the new feature',
        'There is no other risk to consider',
      ],
      correct: 0,
      why: 'Auch Nichtstun hat Risiken: Eine ungepatzte Schwachstelle bleibt angreifbar, Anwendungen können ausfallen. Das Change Control Board wägt beide Seiten ab.',
    },
    {
      q: 'How is a change tested safely before production, and what must exist if it goes wrong?',
      options: [
        'Test directly in production on a Friday; a quick hotfix suffices',
        'In a sandbox environment with a duplicate of production, plus a backout plan and a full backup',
        'Only on the developer’s laptop',
        'Testing is unnecessary for minor changes',
      ],
      correct: 1,
      why: 'Die Sandbox ist der gefahrlose Testraum mit Produktionskopie. Dazu gehören getestete Backout-Prozeduren — und vor jeder Änderung ein vollständiges Backup, falls auch der Rückweg scheitert.',
    },
    {
      q: 'Why might a retail company freeze all changes between Thanksgiving and New Year?',
      options: [
        'Because the IT staff is on holiday',
        'Because software vendors close over the holidays',
        'Because updates are cheaper in January',
        'It is their busiest season — no change may endanger the systems during that window',
      ],
      correct: 3,
      why: 'Änderungsfenster hängen vom Geschäft ab: Im Weihnachtsgeschäft frieren Retailer ihre Systeme komplett ein; Änderungen laufen sonst in Randzeiten (nachts, Wochenende, Wartungsfenster).',
    },
  ],

  // 011 — 1.3 Technical Change Management
  '011': [
    {
      q: 'What is the difference between an allow list and a deny list?',
      options: [
        'An allow list blocks applications; a deny list permits them',
        'Both lists do the same thing',
        'Allow list: only named applications run, everything else is blocked. Deny list: everything runs except what is named',
        'Allow lists exist only on firewalls',
      ],
      correct: 2,
      why: 'Die Allow-List ist restriktiv (nur Gelistetes läuft), die Deny-List flexibel (alles außer Gelistetem läuft) — Anti-Malware ist praktisch eine sehr große Deny-List.',
    },
    {
      q: 'During a two-hour change window for printer drivers, may the technician also update other applications?',
      options: [
        'Yes, the window may be used freely',
        'No — the change is limited to the documented scope; small necessary expansions only per defined policies',
        'Yes, as long as it takes less than two hours',
        'Only if no one notices',
      ],
      correct: 1,
      why: 'Der dokumentierte Scope bindet. Nur wenn das eigentliche Ziel es erfordert (z. B. eine nötige Konfigdatei-Änderung), erlauben definierte Richtlinien eine begrenzte Scope-Erweiterung.',
    },
    {
      q: 'How do 24/7 operations implement changes without downtime?',
      options: [
        'They skip the change entirely',
        'They accept a full outage at noon',
        'They ask users to pause working briefly',
        'Switch users to a secondary system, update the primary, then switch back — with easy fallback if problems appear',
      ],
      correct: 3,
      why: 'Ohne tolerierbares Downtime-Fenster wird auf ein Sekundärsystem umgeschaltet, das Primärsystem aktualisiert und zurückgeschwenkt — läuft etwas schief, zeigt man einfach wieder auf das unveränderte System.',
    },
    {
      q: 'What are dependencies in the context of technical changes?',
      options: [
        'One update requires other components to be changed first — e.g., firewalls must run new code before the management software can be updated',
        'The financial budget of the change',
        'The number of users affected',
        'The vendor’s support hotline availability',
      ],
      correct: 0,
      why: 'Abhängigkeiten verketten Änderungen: Erst muss Dienst/Version A aktualisiert sein, dann funktioniert Update B — auch systemübergreifend (erst alle Firewalls, dann die Managementsoftware).',
    },
  ],

  // 018 — 1.4 Blockchain Technology
  '018': [
    {
      q: 'Why is the blockchain described as a "distributed ledger"?',
      options: [
        'Because it is stored in a single, central bank',
        'Because everyone participating keeps and maintains a copy of the transaction ledger',
        'Because it distributes files across FTP servers',
        'Because only auditors may read it',
      ],
      correct: 1,
      why: 'Jeder Teilnehmer der Blockchain hält eine Kopie des Ledgers; neue Transaktionen werden an alle verteilt, die das Ledger führen.',
    },
    {
      q: 'Which applications does the video list for blockchain beyond cryptocurrency?',
      options: [
        'Real-time video streaming',
        'Wireless channel selection',
        'Payment processing, digital identification, supply chain monitoring, and digital voting',
        'Compressing backup archives',
      ],
      correct: 2,
      why: 'Die Blockchain eignet sich überall, wo Transaktionen nachvollziehbar festgehalten werden müssen — Zahlungen, digitale Identitäten, Lieferketten, digitale Wahlen (auch z. B. ein Hausverkauf).',
    },
    {
      q: 'What role does the hash added to each block play?',
      options: [
        'It compresses the block for faster transfer',
        'It encrypts the transactions so nobody can read them',
        'It assigns the block to a specific user',
        'It provides integrity for all transactions in the block',
      ],
      correct: 3,
      why: 'Der Hash sichert die Integrität des Blocks: Er macht nachprüfbar, dass keine der enthaltenen Transaktionen nachträglich verändert wurde.',
    },
    {
      q: 'What happens when someone modifies a transaction in an already recorded block?',
      options: [
        'The hash becomes invalid and the other ledger holders reject the block',
        'The change is silently accepted',
        'The blockchain automatically pays a fine',
        'Only the local copy changes; nobody else notices',
      ],
      correct: 0,
      why: 'Nach einer Manipulation stimmt der Hash nicht mehr; die anderen Teilnehmer erkennen den ungültigen Block und verwerfen ihn — genau das macht die Blockchain manipulationssicher.',
    },
  ],

  // 023 — 2.2 Impersonation
  '023': [
    {
      q: 'Why do attackers impersonate the company help desk or a vice president?',
      options: [
        'Because these roles have published phone numbers',
        'Perceived affiliation or higher rank creates instant trust, so victims hand over information without thinking',
        'Because real help desks never call employees',
        'To avoid being recorded on the phone',
      ],
      correct: 1,
      why: 'Impersonation nutzt Vertrauen: Wer sich als Kollege vom Help Desk oder als ranghoher Manager ausgibt (oder mit Fachjargon beeindruckt), bekommt eher Informationen als ein Fremder.',
    },
    {
      q: 'What is "eliciting information" in a vishing call?',
      options: [
        'Reading a legal disclaimer to the victim',
        'Recording the call for training purposes',
        'Asking directly for the bank account number',
        'Extracting sensitive details through a plausible story instead of asking directly',
      ],
      correct: 3,
      why: 'Der Angreifer fragt nie plump nach der Kontonummer — er baut eine Geschichte (z. B. „fehlgeschlagene Zahlung"), in deren Verlauf das Opfer Kreditkarten-, Bank- oder Sozialversicherungsdaten preisgibt.',
    },
    {
      q: 'Which scenario is an example of identity fraud from the video?',
      options: [
        'Opening a credit card in the victim’s name but with the attacker’s mailing address',
        'Guessing a weak Wi-Fi password',
        'Sending spam from a hacked mail server',
        'Scanning open ports on a company firewall',
      ],
      correct: 0,
      why: 'Identity Fraud: Konten unter fremdem Namen — Kreditkarten an die Adresse des Angreifers, Bankkonten für illegale Gelder, Kredite oder Steuererstattungen, die der Angreifer vor dem Opfer kassiert.',
    },
    {
      q: 'A caller claiming to be from the help desk asks for your password to fix an issue. What is the correct reaction?',
      options: [
        'Provide it — the help desk needs it',
        'Provide only the first half of the password',
        'Refuse: support never needs your password; verify the caller independently via a public number',
        'Ask the caller to email you first',
      ],
      correct: 2,
      why: 'Der Support braucht nie das Nutzerpasswort. Grundregeln: keine Informationen freiwillig herausgeben, keine persönlichen Daten am Telefon, und Anrufer eigenständig über eine öffentliche Nummer verifizieren.',
    },
  ],

  // 024 — 2.2 Watering Hole Attacks
  '024': [
    {
      q: 'What is the strategy behind a watering hole attack?',
      options: [
        'Flooding the target with DNS requests',
        'Compromising a third-party site the target organization visits, then waiting for them to come',
        'Leaving infected USB drives in the parking lot',
        'Phishing every employee at once',
      ],
      correct: 1,
      why: 'Kommt der Angreifer nicht direkt ins Netz (gut geschulte Mitarbeiter klicken nichts an), „vergiftet" er eine Website, die die Organisation ohnehin besucht — etwa den Sandwich-Shop für Bestellungen.',
    },
    {
      q: 'What made the January 2017 watering hole attack on financial supervision sites notable?',
      options: [
        'It only ran on weekends',
        'It used no software at all',
        'It was announced beforehand',
        'The malicious JavaScript was served only to IP addresses of specific financial organizations',
      ],
      correct: 3,
      why: 'Die kompromittierten Seiten (u. a. die polnische Finanzaufsicht) lieferten den Schadcode gezielt nur an IP-Adressen bestimmter Banken aus — alle anderen sahen die normale Seite.',
    },
    {
      q: 'What is the best protection against watering hole attacks?',
      options: [
        'Defense in depth — layered security like firewall, IPS, and antivirus together',
        'Blocking all external websites',
        'Changing passwords weekly',
        'Using only mobile devices for browsing',
      ],
      correct: 0,
      why: 'Kein einzelnes Werkzeug reicht: Mehrschichtige Verteidigung erhöht die Chance, dass eine Ebene den Angriff erkennt — im 2017er-Fall stoppte z. B. Antivirus den Schadcode, den die Firewall durchgelassen hatte.',
    },
    {
      q: 'Why do firewalls and intrusion prevention systems complement each other?',
      options: [
        'They share the same rule base',
        'The firewall may allow the connection, but the IPS can still recognize malicious content inside the traffic',
        'The IPS replaces the firewall completely',
        'Both only inspect outbound traffic',
      ],
      correct: 1,
      why: 'Die Firewall entscheidet über die Verbindung, der IPS prüft den Inhalt: Passiert Verkehr die Firewall, kann der IPS die bösartige Nutzlast trotzdem erkennen und blocken — deshalb oft gebündelt.',
    },
  ],

  // 025 — 2.2 Other Social Engineering Attacks
  '025': [
    {
      q: 'What characterizes misinformation and disinformation campaigns?',
      options: [
        'They only contain differences of opinion',
        'They are always easy to recognize',
        'Factually incorrect content designed to divide or confuse groups, often via social media influence campaigns',
        'They target only IT administrators',
      ],
      correct: 2,
      why: 'Anders als Meinungsverschiedenheiten sind Mis-/Disinformation faktisch falsch und sollen spalten oder verwirren — teils von Drittstaaten betrieben, auch über Werbung ausgespielt.',
    },
    {
      q: 'How does the misinformation amplification process start?',
      options: [
        'With a press release to news agencies',
        'With a TV advertising campaign',
        'By hacking the social media platform',
        'The attacker creates many fake accounts and posts content, then likes/shares it until the algorithm spreads it',
      ],
      correct: 3,
      why: 'Ablauf laut Video: Fake-Konten anlegen → Inhalt posten → mit den eigenen Konten liken/teilen → der Algorithmus zeigt es echten Nutzern → die teilen weiter, bis sogar Massenmedien berichten.',
    },
    {
      q: 'How do attackers abuse well-known brand names like Coca-Cola or McDonald’s?',
      options: [
        'They create hundreds of fake sites with the brand name that get indexed by Google and lure searchers',
        'They buy the original domains',
        'They print fake coupons',
        'They call customers pretending to be the brand',
      ],
      correct: 0,
      why: 'Tausende Fake-Seiten mit bekannten Markennamen landen im Google-Index; wer die Marke sucht, kann auf einer Betrugsseite mit „Sie haben gewonnen!"-Pop-ups landen.',
    },
    {
      q: 'What typically happens when you download the "special offer" software from such an impersonated brand site?',
      options: [
        'You get a legitimate discount coupon',
        'Malware infects the system — showing ads, tracking browsing, or exfiltrating data',
        'The download always fails',
        'Your browser updates itself',
      ],
      correct: 1,
      why: 'Die angebotene Software ist Malware: Sie zeigt Werbung, verfolgt besuchte Seiten oder schleust Daten zum Angreifer aus.',
    },
  ],

  // 027 — 2.3 Buffer Overflows
  '027': [
    {
      q: 'What is a buffer overflow?',
      options: [
        'A network queue filling up with packets',
        'A hard drive running out of space',
        'Writing more data than expected into a memory area so the excess spills into adjacent memory',
        'A CPU overheating under load',
      ],
      correct: 2,
      why: 'Beim Buffer Overflow schreibt der Angreifer mehr in einen Speicherbereich als vorgesehen; der Überschuss läuft in benachbarten Speicher. Bounds Checking durch den Entwickler verhindert genau das.',
    },
    {
      q: 'Why is a buffer overflow not trivially exploitable?',
      options: [
        'Because memory is always encrypted',
        'Because it requires physical access',
        'Because antivirus always detects it',
        'Extra data in memory often just crashes the system — the attacker needs a repeatable overflow with a useful effect',
      ],
      correct: 3,
      why: 'Wahllos Speicher zu überschreiben lässt Apps meist nur abstürzen. Wertvoll ist ein Overflow, der wiederholbar ist und zuverlässig einen Vorteil verschafft.',
    },
    {
      q: 'In the video example, what did the attacker achieve by writing "excessive" (9 bytes) into an 8-byte variable?',
      options: [
        'The ninth byte overflowed into the adjacent variable, raising its value above the admin threshold',
        'The application displayed the password',
        'The server rebooted into safe mode',
        'The variable was deleted from memory',
      ],
      correct: 0,
      why: 'Das neunte Zeichen („e" = Hex 65) lief in Variable B über und hob deren Wert auf 25.856 — über der 24.000er-Schwelle, ab der die Anwendung Administratorrechte gewährt: Rechteausweitung ohne Admin-Zugangsdaten.',
    },
    {
      q: 'Which developer practice prevents buffer overflows?',
      options: [
        'Using longer variable names',
        'Bounds checking — validating that writes fit the allocated memory size',
        'Compressing the application binary',
        'Storing variables alphabetically',
      ],
      correct: 1,
      why: 'Bounds Checking stellt sicher, dass in einen 8-Byte-Puffer auch nur 8 Bytes geschrieben werden — ohne diese Prüfung kann Eingabe in fremde Speicherbereiche überlaufen.',
    },
  ],

  // 028 — 2.3 Race Conditions
  '028': [
    {
      q: 'What is a race condition?',
      options: [
        'A CPU benchmark competition',
        'A network latency measurement',
        'Two events occur nearly simultaneously and the application does not account for the overlap',
        'A disk defragmentation error',
      ],
      correct: 2,
      why: 'Wenn zwei Vorgänge fast gleichzeitig laufen und die Anwendung das nicht berücksichtigt, entstehen unerwartete Ergebnisse — der Klassiker unter den Anwendungsfehlern.',
    },
    {
      q: 'What does TOCTOU stand for?',
      options: [
        'Type Of Check, Type Of Use',
        'Time-Of-Check to Time-Of-Use — the value can change between checking it and using it',
        'Test Once, Commit To Output Unit',
        'Transfer Of Control To Outside User',
      ],
      correct: 1,
      why: 'Beim TOCTOU-Angriff liegt die Lücke zwischen Prüfen und Verwenden eines Werts: Ändert ihn ein anderer Prozess dazwischen, arbeitet die Anwendung mit veralteten Daten.',
    },
    {
      q: 'Why did the bank-transfer example in the video produce a wrong final balance?',
      options: [
        'The network connection dropped mid-transfer',
        'A hacker intercepted the transaction',
        'The users typed the wrong amounts',
        'Deposits were updated immediately, but withdrawals were not — concurrent transfers saw stale balances',
      ],
      correct: 3,
      why: 'Einzahlungen wurden sofort verbucht, Abhebungen nicht: Bei zwei gleichzeitigen Überweisungen sah User 2 einen veralteten Kontostand — am Ende blieben 50 $ stehen, wo 0 $ sein müssten.',
    },
    {
      q: 'Which real-world race condition cases does the video mention?',
      options: [
        'The Mars rover Spirit reboot loop (2004) and a Tesla Model 3 TOCTOU exploit at Pwn2Own 2023',
        'The Morris worm and Stuxnet',
        'Heartbleed and Shellshock',
        'The Ariane 5 explosion and Y2K',
      ],
      correct: 0,
      why: 'Spirit hing 2004 wegen eines Dateisystemfehlers in einer Reboot-Schleife; beim Pwn2Own 2023 brachte ein TOCTOU-Angriff über Bluetooth Root-Rechte auf dem Tesla-Infotainment — 100.000 $ Prämie plus Auto.',
    },
  ],

  // 029 — 2.3 Malicious Updates
  '029': [
    {
      q: 'Which best practices apply before installing any software update?',
      options: [
        'Disable the antivirus so the update runs faster',
        'Have a backup and make sure the update comes from a trusted source',
        'Install updates only once a year',
        'Always wait until other users have tested it for six months',
      ],
      correct: 1,
      why: 'Vor jeder Änderung: Backup (Rückweg bei Problemen) und vertrauenswürdige Quelle — am sichersten der direkte Download von der Website des Herstellers.',
    },
    {
      q: 'When is a "Update your browser now" message suspicious?',
      options: [
        'When it appears after visiting a link from a web search rather than at browser start',
        'When it mentions the correct browser version',
        'Update messages are always trustworthy',
        'When it appears on a Tuesday',
      ],
      correct: 0,
      why: 'Erscheint die Meldung beim Browserstart, ist sie plausibel; taucht sie mitten im Surfen nach einem Klick auf ein Suchergebnis auf, ist Skepsis angebracht — erst prüfen, dann klicken.',
    },
    {
      q: 'How do digital signatures protect the update process?',
      options: [
        'They compress the update file',
        'They hide the update from attackers',
        'They make updates install faster',
        'The OS validates the developer’s signature, so you know the update really comes from e.g. Microsoft or Adobe',
      ],
      correct: 3,
      why: 'Viele Betriebssysteme installieren nur signierte Software: Die Signatur stammt vom Entwickler, das OS prüft sie — hohes Vertrauen, dass das Update legitim ist. App-interne Updater prüfen das automatisch.',
    },
    {
      q: 'Why is the SolarWinds Orion incident (December 2020) so instructive?',
      options: [
        'The update servers were simply offline',
        'A digitally signed, completely normal-looking update contained attacker code planted in the build system months earlier',
        'Users had ignored the update for years',
        'The malware only affected home users',
      ],
      correct: 1,
      why: 'Die Angreifer saßen im Entwicklungssystem von SolarWinds; ihr Code wurde ins reguläre, signierte Update eingerollt und automatisch verteilt — Zugang zu hunderten Behörden und Konzernen über einen vertrauten Prozess.',
    },
  ],

  // 039 — 2.3 Zero-day Vulnerabilities
  '039': [
    {
      q: 'What makes an attack a "zero-day" attack?',
      options: [
        'It happens at midnight',
        'It disables the system clock',
        'A vulnerability is exploited before the vendor knows about it — so no patch exists yet',
        'It deletes all data in zero seconds',
      ],
      correct: 2,
      why: 'Beim Zero-Day kennt der Hersteller die Lücke noch gar nicht; es gibt keinen Patch, und der Angreifer kann sie ungestört ausnutzen, bis eine Gegenmaßnahme entwickelt ist.',
    },
    {
      q: 'Why are zero-day vulnerabilities so hard to defend against?',
      options: [
        'They only affect old hardware',
        'You cannot easily protect a system against a problem nobody knows exists',
        'Firewalls block them automatically',
        'They require physical access to exploit',
      ],
      correct: 1,
      why: 'Ohne Wissen über die Lücke gibt es weder Patch noch Signatur — erst wenn der Angriff auffällt, beginnt die Arbeit an einer Behebung, während der Angreifer weiter ausnutzen kann.',
    },
    {
      q: 'Where can you track published vulnerabilities and zero-day reports?',
      options: [
        'On the Common Vulnerabilities and Exposures (CVE) site, cve.mitre.org',
        'In the router configuration menu',
        'In the Windows Task Manager',
        'On social media exclusively',
      ],
      correct: 0,
      why: 'Die CVE-Datenbank (cve.mitre.org) katalogisiert Schwachstellen — dort fanden sich z. B. die 2023er-Zero-Days von Chrome, Microsoft und Apple.',
    },
    {
      q: 'Which real zero-day examples from 2023 does the video mention?',
      options: [
        'A Linux kernel panic and a BIOS password leak',
        'Only vulnerabilities in IoT cameras',
        'A printer driver overflow at HP',
        'Chrome memory corruption with sandbox escape, self-signed code in the UEFI boot process, and several Apple iOS exploits',
      ],
      correct: 3,
      why: 'April/Mai 2023: Chrome (Memory Corruption + Sandbox Escape), Microsoft (selbstsignierter Code im UEFI-Boot trotz Secure Boot) und Apple iOS/iPadOS (u. a. Sandbox Escape, Codeausführung) — teils aktiv ausgenutzt.',
    },
  ],

  // 042 — 2.4 Spyware and Bloatware
  '042': [
    {
      q: 'What does spyware typically do on an infected system?',
      options: [
        'It monitors browsing, shows ads, commits affiliate fraud, and may log every keystroke',
        'It only slows down the fan',
        'It encrypts all files immediately',
        'It uninstalls the operating system',
      ],
      correct: 0,
      why: 'Spyware beobachtet alles: Surfverhalten geht an die Server der Angreifer, ein Keylogger sammelt Benutzernamen und Passwörter, dazu Werbung und Affiliate-Betrug.',
    },
    {
      q: 'How does spyware usually get onto a system?',
      options: [
        'Through the power cable',
        'Via peer-to-peer software, fake security software, or malicious email links',
        'It is preinstalled by Microsoft',
        'Through firmware updates only',
      ],
      correct: 1,
      why: 'Wie ein Virus muss Spyware installiert werden — typisch über P2P-Software, gefälschte „Sicherheits"-Programme oder bösartige Links; deshalb nur bekannte, vertrauenswürdige Software installieren.',
    },
    {
      q: 'What is bloatware?',
      options: [
        'Malware that inflates files',
        'A virus in the BIOS',
        'Apps the hardware manufacturer preinstalls (often paid placements) that you did not ask for',
        'Cache files that grow over time',
      ],
      correct: 2,
      why: 'Neue Geräte kommen oft mit zusätzlichen Apps, Spielen und Tools, für deren Vorinstallation der Hersteller bezahlt wird — der Nutzer erbt unnötige Software ab Werk.',
    },
    {
      q: 'Why is bloatware a security concern on a brand-new device?',
      options: [
        'It voids the warranty',
        'It changes the desktop wallpaper',
        'It blocks operating system updates',
        'It wastes storage, can auto-start and slow the system, and each app may carry exploitable vulnerabilities',
      ],
      correct: 3,
      why: 'Bloatware belegt Speicher, läuft teils automatisch mit — und jede dieser Apps kann bekannte oder unbekannte Schwachstellen haben: ein Risiko ab dem ersten Einschalten. Entfernen: deinstallieren, notfalls per Dritt-Uninstaller.',
    },
  ],

  // 046 — 2.4 DNS Attacks
  '046': [
    {
      q: 'Why is modifying the local hosts file an effective DNS poisoning method?',
      options: [
        'The hosts file is checked before any DNS query and overrides the server’s answer',
        'The hosts file is shared across the whole network',
        'It requires no permissions at all',
        'DNS servers read the client hosts file regularly',
      ],
      correct: 0,
      why: 'Steht die Auflösung im lokalen Hosts-File, fragt der Rechner den DNS-Server gar nicht mehr. Der Angreifer braucht dafür allerdings Zugriff mit erhöhten Rechten auf den Client.',
    },
    {
      q: 'What happens after an attacker changes a record on a compromised DNS server?',
      options: [
        'Only the attacker’s own lookups change',
        'The server automatically detects and reverts the change',
        'All subsequent queries send users to the attacker’s IP instead of the legitimate site',
        'Existing browser sessions disconnect immediately',
      ],
      correct: 2,
      why: 'Im Video-Beispiel zeigt der geänderte Eintrag für professormesser.com auf die Angreifer-IP 100.100.100.100 — jeder spätere Abruf landet beim Angreifer statt auf der echten Seite.',
    },
    {
      q: 'What did attackers achieve in the 2016 Brazilian bank incident?',
      options: [
        'They stole the bank’s ATMs',
        'Via the domain registration they redirected 36 bank domains for six hours — effectively becoming the bank',
        'They deleted the bank’s database',
        'They shut down the bank’s power supply',
      ],
      correct: 1,
      why: 'Über den Zugriff auf die Domain-Registrierung änderten die Angreifer am 22.10.2016 die DNS-Einträge von 36 Domains der Bank (5 Mio. Kunden, 27 Mrd. $) und konnten Zugangsdaten und Finanzdaten abgreifen.',
    },
    {
      q: 'What is typosquatting (URL hijacking)?',
      options: [
        'Overloading a URL with too many parameters',
        'Renting expired domains legally',
        'Compressing URLs with a link shortener',
        'Registering look-alike domains (misspellings, added letters, other TLDs) to catch users’ typing errors',
      ],
      correct: 3,
      why: 'Beispiele aus dem Video: „professormessor.com", „professormesser.org" oder ein fehlendes S — die Fake-Domain kann Werbung zeigen, Logins abgreifen oder Malware verteilen. Deshalb Domains genau prüfen, Links in Mails meiden.',
    },
  ],

  // 050 — 2.4 Malicious Code
  '050': [
    {
      q: 'In which forms can malicious code arrive?',
      options: [
        'Executables, scripts, macro viruses, and Trojan horses',
        'Only as .exe files',
        'Only through USB sticks',
        'Only inside video files',
      ],
      correct: 0,
      why: 'Bösartiger Code hat viele Verpackungen — ausführbare Dateien, Skripte, Makroviren, Trojaner. Deshalb braucht die Verteidigung mehrere Schichten: Anti-Malware, Firewall, Patches und geschulte Nutzer.',
    },
    {
      q: 'How did the WannaCry ransomware infect Windows systems?',
      options: [
        'Through infected printer drivers',
        'Via fake antivirus pop-ups',
        'Through a vulnerability in SMBv1 that allowed arbitrary code execution',
        'Via Bluetooth pairing requests',
      ],
      correct: 2,
      why: 'WannaCry nutzte eine SMBv1-Lücke: Angreifer konnten beliebigen Code ausführen, ins Betriebssystem eindringen und dann die Ransomware nachladen.',
    },
    {
      q: 'What happened in the British Airways cross-site scripting incident?',
      options: [
        'The booking system was offline for a week',
        '22 lines of malicious JavaScript on the checkout pages skimmed credit cards of ~380,000 potential victims',
        'All flight plans were published',
        'Boarding passes were sent to wrong customers',
      ],
      correct: 1,
      why: 'Nur 22 Zeilen eingeschleustes JavaScript auf den Checkout-Seiten reichten, um beim Ticketkauf Kreditkartendaten abzugreifen — rund 380.000 potenziell Betroffene.',
    },
    {
      q: 'How was the Estonian Central Health Database breached?',
      options: [
        'Through stolen employee badges',
        'Through a leaked admin password on paper',
        'By physically stealing the servers',
        'Via SQL injection, exposing health data of essentially the whole country',
      ],
      correct: 3,
      why: 'SQL Injection als Schadcode verschaffte den Angreifern Zugriff auf die zentrale Gesundheitsdatenbank Estlands — praktisch alle Gesundheitsdaten der Bürger waren betroffen.',
    },
  ],

  // 053 — 2.4 Password Attacks
  '053': [
    {
      q: 'Why must passwords never be stored in plain text ("in the clear")?',
      options: [
        'Plain text uses too much disk space',
        'Anyone accessing the file or database instantly has every username and password',
        'Plain text passwords expire faster',
        'Operating systems refuse to read plain text files',
      ],
      correct: 1,
      why: 'Wer an die Datei oder Datenbank kommt, hat sofort alle Zugangsdaten. Eine App, die Passwörter im Klartext speichert, sollte man nicht weiter verwenden — Passwörter gehören als Hash gespeichert.',
    },
    {
      q: 'Which property makes hashes suitable for password storage?',
      options: [
        'Hashes can be decrypted with the right key',
        'All passwords produce similar hashes',
        'A hash cannot be reversed to reconstruct the password — like a fingerprint',
        'Hashes are shorter than most passwords',
      ],
      correct: 2,
      why: 'Der Hash (Message Digest/„Fingerprint") ist eine Einbahnstraße: Aus ihm lässt sich das Passwort nicht rekonstruieren, und schon ein Zeichen Unterschied erzeugt einen völlig anderen Hash (Beispiel: SHA-256 von 123456 vs. 1234567).',
    },
    {
      q: 'What is a spraying attack?',
      options: [
        'Flooding the login page with random requests',
        'Encrypting accounts one by one',
        'Trying every possible character combination for one account',
        'Trying only the top few common passwords per account, then moving on — avoiding lockouts and alarms',
      ],
      correct: 3,
      why: 'Beim Spraying testet der Angreifer pro Konto nur ~3 Allerweltspasswörter (123456, qwerty, password …) und zieht weiter — unter der Lockout-Schwelle, ohne Alarm auszulösen.',
    },
    {
      q: 'Why do attackers prefer offline brute force against a downloaded hash file?',
      options: [
        'No account lockouts apply — with enough time and compute they can try every combination',
        'Offline attacks need no computing power',
        'The hashes decrypt themselves after download',
        'Online attacks are illegal, offline attacks are not',
      ],
      correct: 0,
      why: 'Online bremsen Lockouts und Alarme jeden Versuch. Mit der kopierten Passwortdatei kann der Angreifer offline beliebig lange jeden Kandidaten hashen und mit den gespeicherten Hashes vergleichen.',
    },
  ],

  // 054 — 2.4 Indicators of Compromise
  '054': [
    {
      q: 'What is an indicator of compromise (IOC)?',
      options: [
        'A certificate for security audits',
        'Evidence giving high confidence that a system has been breached — e.g., unusual traffic, changed file hashes, or modified DNS entries',
        'A list of all installed patches',
        'The severity score of a vulnerability',
      ],
      correct: 1,
      why: 'IOCs sind Belege für eine Kompromittierung: ungewöhnlich viel Traffic, veränderte Datei-Hashes, manipulierte DNS-Einträge, auffällige Login-Muster oder plötzlich häufig gelesene Dateien.',
    },
    {
      q: 'Why might an attacker deliberately get a user account locked out?',
      options: [
        'To free up licenses for other users',
        'Locked accounts consume less memory',
        'To call the help desk posing as the user and get the password reset over the phone',
        'To trigger an automatic malware scan',
      ],
      correct: 2,
      why: 'Der gesperrte Account ist Teil des Plans: Der Angreifer ruft als „Nutzer" beim Help Desk an und lässt das Passwort zurücksetzen — deshalb braucht der Reset-Prozess strenge Verifikation.',
    },
    {
      q: 'What is an "impossible travel" login pattern?',
      options: [
        'A user logging in during vacation',
        'A login without a password',
        'Two failed logins in a row',
        'Logins for the same account from locations too far apart to travel between in that time (e.g., Nebraska, minutes later Australia)',
      ],
      correct: 3,
      why: 'Meldet sich dasselbe Konto binnen Minuten aus Omaha und Australien an, kann das physisch nicht stimmen — die Authentifizierungslogs sollten so etwas sofort alarmieren.',
    },
    {
      q: 'Why do malware infections often block antivirus updates and security websites?',
      options: [
        'So the attacker can stay on the system — patches and new signatures would close their access',
        'To save network bandwidth',
        'Because updates would slow the malware down',
        'To make the system boot faster',
      ],
      correct: 0,
      why: 'Wer nicht mehr auf Security-Seiten kommt oder keine Signaturen laden kann, hat ein Alarmzeichen: Malware verhindert Updates, damit die Lücke offen bleibt. Auch fehlende Logeinträge und Datenauftauchen im Netz sind starke IOCs.',
    },
  ],

  // 066 — 3.2 Firewall Types
  '066': [
    {
      q: 'At which OSI layers do traditional firewalls and next-generation firewalls operate?',
      options: [
        'Traditional: layer 4 (ports); next-generation: layer 7 (applications)',
        'Both at layer 2',
        'Traditional: layer 7; next-generation: layer 3',
        'Both only at layer 1',
      ],
      correct: 0,
      why: 'Traditionelle Firewalls entscheiden nach TCP/UDP-Ports (Layer 4); NGFWs dekodieren Pakete bis zur Anwendungsschicht (Layer 7) und können z. B. „Twitter lesen ja, posten nein" durchsetzen.',
    },
    {
      q: 'What is a UTM (Unified Threat Management) appliance, and what is its main drawback?',
      options: [
        'A pure VPN device without firewall features',
        'A cloud-only firewall service',
        'A backup appliance for log files',
        'An all-in-one box (URL filter, malware, spam, router, IPS, QoS) — but often layer-4-only, and enabling many features hurts performance',
      ],
      correct: 3,
      why: 'UTMs bündeln viele Dienste in einem Gerät. Nachteile laut Video: oft nur Portnummern-basiert (Layer 4), und je mehr Funktionen aktiv sind, desto stärker bricht die Leistung ein.',
    },
    {
      q: 'What can a next-generation firewall do beyond allowing or blocking applications?',
      options: [
        'Print security reports automatically',
        'Block known vulnerabilities (built-in IPS) and filter by URL categories, e.g., blocking gambling sites',
        'Replace all switches in the network',
        'Manage employee passwords',
      ],
      correct: 1,
      why: 'NGFWs bringen oft eine Schwachstellen-Signaturliste (faktisch ein IPS) und URL-Kategorisierung mit — Regeln wie „keine Gambling-Seiten" oder einzelne URLs sperren sind damit möglich.',
    },
    {
      q: 'What is a web application firewall (WAF) designed to do?',
      options: [
        'Accelerate web page loading',
        'Encrypt all HTTP traffic',
        'Analyze input to web applications and block attacks like SQL injection or cross-site scripting',
        'Host websites redundantly',
      ],
      correct: 2,
      why: 'Ein WAF prüft die Eingaben in Web-Apps (HTTP/HTTPS) und blockt z. B. SQL-Injections vor dem Applikationsserver — PCI DSS schreibt WAFs für Kreditkarten-Anwendungen vor; oft läuft er neben einem NGFW.',
    },
  ],

  // 073 — 3.4 Recovery Testing
  '073': [
    {
      q: 'What is a tabletop exercise?',
      options: [
        'Walking through the disaster recovery steps in a group discussion instead of building real infrastructure',
        'A physical stress test of server racks',
        'Restoring backups onto lab hardware',
        'A penetration test of the recovery site',
      ],
      correct: 0,
      why: 'Statt teuer alles real hochzuziehen, gehen die Beteiligten die Recovery-Schritte am Tisch durch — Logistik und Lücken im Plan werden sichtbar, ohne Produktionssysteme anzufassen.',
    },
    {
      q: 'What does an ideal failover test look like?',
      options: [
        'Users are asked to log out for an hour',
        'The failover happens automatically and users never notice they are on backup systems',
        'All systems shut down for maintenance',
        'The admin manually re-cables the network',
      ],
      correct: 1,
      why: 'Redundante Router, Firewalls, Switches und Links übernehmen automatisch; im Idealfall werden Nutzer unbemerkt umgeleitet. Erweiterbar mit Load Balancern und mehreren Providern.',
    },
    {
      q: 'What does a phishing simulation test?',
      options: [
        'The speed of the mail server',
        'The spam folder size limits',
        'Whether the mail signatures are correct',
        'Whether automated defenses catch the mail — and which users still click, so they get extra training',
      ],
      correct: 3,
      why: 'Eine selbst gebaute Phishing-Mail an alle zeigt zweierlei: Erkennen die eigenen Systeme sie? Und wer klickt trotzdem? Klicker bekommen zusätzliches Training.',
    },
    {
      q: 'How does parallel processing add resiliency?',
      options: [
        'It encrypts transactions twice',
        'It reduces the power consumption',
        'Transactions spread across multiple CPUs — if one fails, the rest carry the load',
        'It requires fewer servers overall',
      ],
      correct: 2,
      why: 'Mehrere Kerne oder Rechner teilen sich die Transaktionen: schneller im Normalbetrieb, und beim Ausfall eines Prozessors übernehmen die verbleibenden.',
    },
  ],

  // 075 — 3.4 Power Resiliency
  '075': [
    {
      q: 'Which power problems can a UPS bridge?',
      options: [
        'Blackouts (no power), brownouts (voltage drops), and surges (excess voltage)',
        'Only complete blackouts',
        'Only lightning strikes',
        'Network outages of the ISP',
      ],
      correct: 0,
      why: 'Die USV (UPS) überbrückt Komplettausfälle, Spannungseinbrüche (Brownouts) und Überspannungen (Surges) — für Minuten bis Stunden, je nach Batteriekapazität.',
    },
    {
      q: 'What distinguishes an online (double-conversion) UPS from an offline/standby UPS?',
      options: [
        'It has no batteries',
        'It only works in the cloud',
        'It is always cheaper',
        'The load always runs from the battery path — no switchover moment when main power fails',
      ],
      correct: 3,
      why: 'Offline/Standby-USVs schalten erst beim Ausfall auf Batterie um; die Online-/Doppelwandler-USV versorgt dauerhaft über den Batteriepfad. Line-Interactive gleicht sinkende Spannung aus (gut bei häufigen Brownouts).',
    },
    {
      q: 'What can a UPS do when its battery runs low during a long outage?',
      options: [
        'Recharge itself from the servers',
        'Signal the systems to shut down gracefully before power is gone',
        'Double its capacity temporarily',
        'Switch to solar power automatically',
      ],
      correct: 1,
      why: 'USVs können Systeme benachrichtigen und sauber herunterfahren lassen, bevor die Batterie leer ist — Datenverlust durch hartes Abschalten wird vermieden.',
    },
    {
      q: 'Why do organizations combine a UPS with a generator?',
      options: [
        'Generators are illegal without a UPS',
        'The UPS refuels the generator',
        'The generator needs about a minute to ramp up — the UPS bridges exactly that gap',
        'Both devices share the same batteries',
      ],
      correct: 2,
      why: 'Beim Ausfall startet der Generator (langfristige Versorgung, solange Treibstoff da ist), braucht aber eine Anlaufzeit von etwa einer Minute — die überbrückt die USV, danach übernimmt der Generator.',
    },
  ],

  // 077 — 4.1 Hardening Targets
  '077': [
    {
      q: 'Why does a freshly installed operating system need hardening?',
      options: [
        'The default configuration is rarely secure — manufacturer hardening guides tell you what to change',
        'New installations always contain malware',
        'The license only activates after hardening',
        'Old hardware refuses default configurations',
      ],
      correct: 0,
      why: 'Ab Werk ist ein OS selten sicher konfiguriert. Hersteller (oder Dritte/Community) liefern Hardening Guides speziell für das jeweilige System oder die Anwendung.',
    },
    {
      q: 'Which hardening basics apply to switches, routers, and other purpose-built network devices?',
      options: [
        'Install Windows Defender on them',
        'Change the default credentials and check the manufacturer for the rare but important patches',
        'Disable all logging to save resources',
        'Connect them directly to the internet for updates',
      ],
      correct: 1,
      why: 'Diese Geräte laufen mit Embedded-OS: Standard-Zugangsdaten sofort ändern, Authentifizierung (lokal oder zentral) einrichten — und da Patches selten sind, ist jeder Hersteller-Patch ein wichtiges Ereignis.',
    },
    {
      q: 'How are SCADA/ICS systems for industrial equipment typically protected?',
      options: [
        'With a public web dashboard for monitoring',
        'By weekly password rotation only',
        'On their own isolated network, often air-gapped, with very limited access and no internet connectivity',
        'By running them inside a browser sandbox',
      ],
      correct: 2,
      why: 'Supervisory Control and Data Acquisition bzw. Industrial Control Systems steuern Großanlagen — sie stehen in eigenen, oft per Air-Gap getrennten Netzen ohne Internetzugang.',
    },
    {
      q: 'Why should IoT devices (lighting, HVAC, etc.) get their own network segment and fast patching?',
      options: [
        'They consume too much bandwidth otherwise',
        'Their radio signals interfere with Wi-Fi',
        'They cannot handle DHCP leases',
        'Their manufacturers are rarely security experts — segmentation limits what a compromised device can reach',
      ],
      correct: 3,
      why: 'Heizungs- oder Lichthersteller sind keine Security-Spezialisten: IoT-Patches darum priorisieren und die Geräte in ein eigenes Segment stellen — ein kompromittiertes Gerät erreicht dann nur andere IoT-Geräte.',
    },
  ],

  // 079 — 4.1 Wireless Security Settings
  '079': [
    {
      q: 'What is the known weakness of WPA2?',
      options: [
        'It sends all traffic unencrypted',
        'The four-way handshake exposes a hash that can be brute-forced offline to recover the pre-shared key',
        'It only works with WEP hardware',
        'It limits networks to ten devices',
      ],
      correct: 1,
      why: 'Beim WPA2-Handshake lässt sich ein Hash abgreifen; mit GPU- oder Cloud-Cracking wird daraus offline in Tagen der Pre-Shared Key — wer ihn hat, kommt ins Netz.',
    },
    {
      q: 'How does WPA3 eliminate the handshake brute-force problem?',
      options: [
        'By hiding the SSID by default',
        'By limiting login attempts to three per day',
        'SAE (simultaneous authentication of equals): session keys are derived on the devices, no key hash crosses the air',
        'By requiring a certificate on every phone',
      ],
      correct: 2,
      why: 'WPA3 ersetzt den Vier-Wege-Handshake durch SAE (Diffie-Hellman-Ableitung, „Dragonfly-Handshake"): Schlüssel entstehen auf den Endgeräten, jeder Nutzer bekommt eigene Session Keys — nichts zum Bruteforcen; dazu GCMP als stärkere Verschlüsselung.',
    },
    {
      q: 'What is the difference between WPA3-Personal and WPA3-Enterprise?',
      options: [
        'Personal ist stronger encryption than Enterprise',
        'Enterprise works only on 5 GHz networks',
        'Personal needs no password at all',
        'Personal: one shared pre-shared key for everyone; Enterprise: individual logins via 802.1X against a central AAA server (e.g., RADIUS)',
      ],
      correct: 3,
      why: 'Zuhause teilen alle denselben PSK (WPA-PSK). Im Unternehmen wäre das unsicher — WPA3-Enterprise/802.1X fragt Benutzername/Passwort ab und prüft zentral (RADIUS, LDAP, TACACS); Konten lassen sich einzeln sperren.',
    },
    {
      q: 'Which three roles are involved in an 802.1X authentication?',
      options: [
        'Supplicant (the client), authenticator (the access device), and the authentication/AAA server',
        'Sender, router, and DNS server',
        'Browser, proxy, and web server',
        'Token, badge, and card reader',
      ],
      correct: 0,
      why: 'Der Supplicant will ins Netz, der Authenticator (z. B. Access Point/Switch) vermittelt, der AAA-Server prüft die Credentials — abgewickelt über EAP, für den Nutzer unsichtbar schnell. AAA steht für Authentication, Authorization, Accounting.',
    },
  ],

  // 082 — 4.3 Vulnerability Scanning
  '082': [
    {
      q: 'How does a vulnerability scan differ from a penetration test?',
      options: [
        'A scan takes longer than a pentest',
        'A scan only checks whether attack potential exists — it does not run exploits; the pentest actually attacks',
        'A pentest is fully automated, a scan is manual',
        'There is no difference',
      ],
      correct: 1,
      why: 'Der Schwachstellen-Scan (z. B. Port-Scan) prüft nur, ob ein System angreifbar sein könnte. Sobald echte Exploits ausgeführt werden, ist es ein Penetrationstest.',
    },
    {
      q: 'Why must vulnerability scan reports be reviewed manually?',
      options: [
        'The reports are encrypted by default',
        'Scanners delete their results after 24 hours',
        'Scans produce lots of data and not every finding is accurate — false positives must be sorted out before changes',
        'Only auditors may read scan results',
      ],
      correct: 2,
      why: 'Scanner liefern viel Output (kritisch bis informativ, z. B. schwache SSH-Host-Keys oder ein nicht mehr unterstütztes Unix). Erst verifizieren, dann bestätigte Funde über den Change-Control-Prozess patchen.',
    },
    {
      q: 'What can static application security testing (SAST) find — and what not?',
      options: [
        'It finds everything, including design flaws',
        'It only checks code formatting',
        'It finds nothing without running the app in production',
        'It spots code flaws like buffer overflows or injections, but misses things like insecure crypto implementations',
      ],
      correct: 3,
      why: 'Der statische Codeanalyzer erkennt Muster im Quellcode (Overflows, Injections, z. B. eine NULL-ACL). Wie Authentifizierung oder Kryptografie implementiert wurde, versteht er nicht — und auch hier gibt es False Positives.',
    },
    {
      q: 'What is fuzzing (dynamic analysis)?',
      options: [
        'Feeding random input into an application to provoke crashes, errors, or exceptions',
        'Blurring sensitive data in screenshots',
        'Compressing binaries before deployment',
        'Renaming variables to confuse attackers',
      ],
      correct: 0,
      why: 'Fuzzing (auch Fault Injection/Robustness Testing) schickt automatisiert zufällige Eingaben in die App und beobachtet unerwartetes Verhalten — Hinweise auf fehlende Eingabevalidierung. Frei verfügbar z. B. CERTs Basic Fuzzing Framework.',
    },
  ],

  // 083 — 4.3 Threat Intelligence
  '083': [
    {
      q: 'What is OSINT?',
      options: [
        'A proprietary firewall ruleset',
        'Open-source intelligence — publicly available information from forums, social media, government sources, and public company data',
        'An encrypted messaging protocol',
        'A Linux distribution for hackers',
      ],
      correct: 1,
      why: 'OSINT ist frei zugängliche Information: Diskussionsgruppen (auch von Hackergruppen), Social Media, Regierungsberichte und öffentliche Unternehmensdaten — man muss nur wissen, wo man sucht.',
    },
    {
      q: 'What advantage do commercial threat intelligence services offer?',
      options: [
        'They guarantee that no attack will happen',
        'They replace the need for firewalls',
        'They see threats across many organizations at once and can warn you before a threat reaches you',
        'They are always free of charge',
      ],
      correct: 2,
      why: 'Kommerzielle Dienste beobachten viele Unternehmen gleichzeitig: Taucht eine Angriffswelle in einem Segment auf, können sie andere Organisationen vorwarnen — gegen Gebühr, oft mit zusätzlichen Quellen.',
    },
    {
      q: 'How does the Cyber Threat Alliance (CTA) work?',
      options: [
        'It sells zero-day exploits to members',
        'It provides free antivirus software',
        'It regulates ISPs internationally',
        'Members submit threat data in a standard format; the alliance validates and scores it, then shares it with all members',
      ],
      correct: 3,
      why: 'In der CTA teilen Organisationen Bedrohungsdaten: Einreichungen werden validiert, mit einem Schweregrad bewertet und allen Mitgliedern bereitgestellt.',
    },
    {
      q: 'Why might a security team monitor the dark web?',
      options: [
        'To buy legitimate software licenses',
        'To observe hacking groups’ tools, techniques, and marketplaces — and watch for their own organization’s name',
        'To speed up their internet connection',
        'Because PCI DSS requires it',
      ],
      correct: 1,
      why: 'Das nur mit Spezialsoftware erreichbare Dark Web zeigt Aktivitäten, Werkzeuge und Marktplätze der Hackergruppen (bis hin zum Verkauf gestohlener Kreditkarten) — man beobachtet auch, ob der eigene Firmenname auftaucht.',
    },
  ],

  // 084 — 4.3 Penetration Testing
  '084': [
    {
      q: 'What are the "rules of engagement" in a penetration test?',
      options: [
        'The programming standards for exploit code',
        'A formal list defining scope, purpose, timing, allowed/out-of-scope systems, contacts, and data handling',
        'The attacker’s personal preferences',
        'A list of all known CVEs',
      ],
      correct: 1,
      why: 'Die Rules of Engagement legen formal fest: wann getestet werden darf, welche Systeme in/out of scope sind, welche Zeiten gelten, wer im Notfall kontaktiert wird und wie mit sensiblen Funden umzugehen ist.',
    },
    {
      q: 'Why is gaining initial access "just the beginning" of a pen test?',
      options: [
        'Because the test ends at first access',
        'Because the tester must immediately report and stop',
        'The tester then moves laterally, uses the system as a pivot, and establishes persistence (e.g., a backdoor)',
        'Because the vulnerability is automatically patched',
      ],
      correct: 2,
      why: 'Der erste Zugang ist der Startpunkt: Von dort bewegt sich der Tester lateral, nutzt das System als Pivot/Proxy zu weiteren Zielen und richtet Persistenz ein (eigenes Konto/Backdoor), unabhängig von der ersten Lücke.',
    },
    {
      q: 'Why can exploiting a vulnerability during a pen test be risky?',
      options: [
        'The exploit process can destabilize and crash the target system or service',
        'It always deletes the tester’s tools',
        'It notifies the attacker community',
        'It permanently patches the system',
      ],
      correct: 0,
      why: 'Ein Exploit (z. B. Buffer Overflow für Privilege Escalation) kann das System instabil machen und zum Absturz bringen — genau deshalb werden kritische Systeme in den Rules of Engagement ausgeklammert.',
    },
    {
      q: 'What is a bug bounty?',
      options: [
        'A fine for shipping insecure software',
        'A reward (usually funded by the developer) for responsibly reporting a vulnerability',
        'A tax on vulnerability disclosures',
        'A tool that automatically finds bugs',
      ],
      correct: 1,
      why: 'Bug Bounties belohnen das verantwortliche Melden von Schwachstellen: Der Forscher meldet sie dem Entwickler, dieser baut und veröffentlicht den Fix, danach werden Lücke und Behebung publik (CVE).',
    },
  ],

  // 086 — 4.3 Vulnerability Remediation
  '086': [
    {
      q: 'What is the most common way to remediate an identified vulnerability?',
      options: [
        'Installing a security patch',
        'Buying cybersecurity insurance',
        'Air-gapping every device',
        'Deleting the affected application',
      ],
      correct: 0,
      why: 'In den meisten Fällen behebt ein Patch die Schwachstelle — meist planmäßig (wöchentlich/monatlich), bei aktiv ausgenutzten Zero-Days auch außerplanmäßig.',
    },
    {
      q: 'How does segmentation limit the impact of an attack?',
      options: [
        'It encrypts all traffic between hosts',
        'It patches vulnerabilities automatically',
        'Separating devices onto their own networks/VLANs stops an attacker reaching the rest of the network',
        'It hides devices from DNS',
      ],
      correct: 2,
      why: 'Segmentierung (eigene Netze/VLANs, notfalls Air-Gap) verhindert zwar nicht den Erstzugriff, begrenzt aber, wohin sich ein Angreifer von dort ausbreiten kann.',
    },
    {
      q: 'When you cannot patch a vulnerable service, what are compensating controls?',
      options: [
        'Ignoring the vulnerability entirely',
        'Disabling the service, revoking access, firewall/ACL rules, or a host-based firewall on the server',
        'Rebooting the server hourly',
        'Buying new hardware',
      ],
      correct: 1,
      why: 'Ohne Patch helfen Ausweichmaßnahmen: den anfälligen Dienst abschalten, Zugriff entziehen, Firewall-/ACL-Regeln setzen oder eine Host-Firewall installieren — Patchen bleibt aber die beste Lösung.',
    },
    {
      q: 'Why perform a vulnerability scan AFTER rolling out a patch?',
      options: [
        'To generate more log data',
        'To confirm the patch deployed correctly and find systems that still need it',
        'To roll the patch back',
        'To reset the change control process',
      ],
      correct: 1,
      why: 'Ein Scan nach dem Ausrollen bestätigt, dass der Patch wirklich installiert ist und die Lücke schließt — und findet Systeme, die noch ungepatcht sind.',
    },
  ],

  // 087 — 4.4 Security Monitoring
  '087': [
    {
      q: 'Why is a sudden spike in outbound network traffic worth monitoring?',
      options: [
        'It always means a backup is running',
        'It indicates faster internet',
        'It could indicate an attacker exfiltrating data',
        'It means the firewall is offline',
      ],
      correct: 2,
      why: 'Viele Breaches fielen durch ungewöhnlich hohen Datenabfluss auf — plötzlicher Traffic weit über der Norm kann bedeuten, dass ein Angreifer Daten aus dem Netz schleust.',
    },
    {
      q: 'What is the purpose of a SIEM in security monitoring?',
      options: [
        'To replace the firewall',
        'To consolidate logs from many devices into one database for reporting and cross-source correlation',
        'To encrypt all endpoints',
        'To assign IP addresses',
      ],
      correct: 1,
      why: 'Der SIEM (Security Information and Event Manager) führt Logs von Firewalls, Switches, Servern usw. in einer zentralen Datenbank zusammen — das ermöglicht Reports und Korrelation über sonst unterschiedliche Datentypen.',
    },
    {
      q: 'According to the 2022 IBM report cited, how long does identifying and containing a breach take on average?',
      options: [
        'About nine months',
        'A few hours',
        'Exactly 24 hours',
        'About two weeks',
      ],
      correct: 0,
      why: 'Im Schnitt rund neun Monate — so lange bewegt sich ein Angreifer unentdeckt im Netz. Ein Grund, warum eine langfristige Backup-Strategie so wichtig ist.',
    },
    {
      q: 'What is the difference between a false positive and a false negative in alerting?',
      options: [
        'A false positive is a missed event; a false negative is a wrong alert',
        'Both mean the same thing',
        'A false positive is an inaccurate alert; a false negative is an event that was never logged and raised no alert',
        'They only occur in SIEMs',
      ],
      correct: 2,
      why: 'False Positive = Alarm ohne echten Vorfall; False Negative = ein Ereignis, das gar nicht geloggt wurde und keinen Alarm auslöste. Alerts brauchen Feinjustierung, um beides zu minimieren.',
    },
  ],

  // 090 — 4.5 Web Filtering
  '090': [
    {
      q: 'What does a content/URL filter do?',
      options: [
        'It speeds up web page loading',
        'It encrypts browser traffic',
        'It controls which websites or categories of sites users may access',
        'It assigns reputations to email senders',
      ],
      correct: 2,
      why: 'Der Content-/URL-Filter erlaubt oder blockiert Websites — einzeln per FQDN oder gruppiert nach Kategorien wie Gambling, Hacking, Malware; zu Hause nennt man das Parental Controls.',
    },
    {
      q: 'Why use an agent-based content filter instead of one built into the firewall?',
      options: [
        'Agents need no updates',
        'The filtering follows mobile/remote users on any network, not just behind the firewall',
        'Agents are always faster',
        'It removes the need for a central console',
      ],
      correct: 1,
      why: 'Ein Firewall-URL-Filter greift nur hinter dieser Firewall. Ein Agent auf dem Endgerät filtert überall — ideal für mobile Nutzer und Homeoffice; die URL-Kategorien müssen dafür regelmäßig aktualisiert werden.',
    },
    {
      q: 'How does a proxy differ from a traditional firewall for web traffic?',
      options: [
        'It sits in the middle and makes the web request on the user’s behalf, then decides whether to forward the response',
        'It only blocks DNS queries',
        'It encrypts the user’s hard drive',
        'It replaces the switch',
      ],
      correct: 0,
      why: 'Der Proxy stellt die Anfrage stellvertretend, empfängt die Antwort und entscheidet dann über die Weiterleitung — nebenbei kann er cachen und Zugriffskontrolle leisten. Transparent = ohne Client-Konfiguration.',
    },
    {
      q: 'How does DNS filtering block malicious sites?',
      options: [
        'By encrypting the DNS queries',
        'By slowing down the connection',
        'By scanning the downloaded files',
        'By not returning the IP address for known-bad domains, so the connection is never made',
      ],
      correct: 3,
      why: 'Der DNS-Filter liefert für bekannte Bad-Domains (via Threat Intelligence gepflegt) keine oder eine Default-IP zurück — die Verbindung kommt nicht zustande, was auch Malware-Command-and-Control-Lookups stoppt.',
    },
  ],

  // 091 — 4.5 Operating System Security
  '091': [
    {
      q: 'What is Active Directory?',
      options: [
        'A firewall ruleset for Windows',
        'A central, redundant database of the network’s computers, users, shares, groups, and more, used for authentication',
        'An antivirus engine',
        'A backup protocol',
      ],
      correct: 1,
      why: 'Active Directory ist die zentrale, redundante Datenbank aller Netzobjekte (Rechner, Benutzerkonten, Freigaben, Sicherheitsgruppen) — darüber wird zentral authentifiziert und werden Berechtigungen vergeben.',
    },
    {
      q: 'What does Group Policy add on top of Active Directory?',
      options: [
        'It replaces user passwords',
        'It encrypts the AD database',
        'Configuration settings, login scripts, and security parameters applied to users and devices',
        'It provides internet access',
      ],
      correct: 2,
      why: 'Group Policy legt sich über AD und setzt zentral Konfigurationen, Login-Skripte, Netzwerk- und Sicherheitsparameter für einzelne Nutzer oder Geräte durch (Group Policy Management Editor).',
    },
    {
      q: 'What is the difference between discretionary (DAC) and mandatory (MAC) access control in Linux?',
      options: [
        'DAC: the user assigns rights at their discretion; MAC: a central administrator assigns all rights',
        'DAC is more secure than MAC',
        'MAC only works on Windows',
        'They are identical',
      ],
      correct: 0,
      why: 'Standard-Linux ist DAC — der Nutzer vergibt Rechte selbst. In Hochsicherheitsumgebungen will man MAC, wo ein zentraler Admin alle Rechte festlegt.',
    },
    {
      q: 'What does SELinux (Security-Enhanced Linux) enable?',
      options: [
        'A graphical desktop environment',
        'Faster boot times',
        'Automatic patching',
        'Mandatory access control with least privilege, limiting the scope of a breach or malicious code',
      ],
      correct: 3,
      why: 'SELinux bringt Mandatory Access Control und Least Privilege: Rechte sind exakt auf die Aufgabe beschränkt, sodass ein Sicherheitsvorfall oder Schadcode nur begrenzten Handlungsspielraum hat.',
    },
  ],

  // 093 — 4.5 Email Security
  '093': [
    {
      q: 'What is the role of a mail gateway?',
      options: [
        'It assigns IP addresses to mail clients',
        'It gatekeeps incoming mail, checking whether each message came from a valid source before it reaches the inbox',
        'It encrypts the hard drive',
        'It stores all sent email permanently',
      ],
      correct: 1,
      why: 'Das Mail Gateway ist der Torwächter: Es fängt eingehende Mails ab, prüft die Legitimität und legt sie in den Posteingang — oder verwirft sie bzw. schiebt sie in den Spam-Ordner.',
    },
    {
      q: 'What does an SPF (Sender Policy Framework) record define?',
      options: [
        'The encryption algorithm for the mail body',
        'The spam folder retention time',
        'Which email servers are authorized to send mail on a domain’s behalf (a DNS TXT record)',
        'The recipient’s mailbox size',
      ],
      correct: 2,
      why: 'Der SPF-Eintrag (DNS-TXT-Record) listet die Server, die im Namen der Domain Mail senden dürfen — der Empfänger prüft, ob die Mail von einem erlaubten Server (z. B. mailgun.org) stammt.',
    },
    {
      q: 'What does DKIM (DomainKeys Identified Mail) provide?',
      options: [
        'A digital signature in the mail transport, validated via a public key in the sender’s DNS',
        'A password for the mailbox',
        'A backup of all emails',
        'A faster delivery route',
      ],
      correct: 0,
      why: 'DKIM signiert die Mail im Transport zwischen den Servern; der Empfänger holt den öffentlichen Schlüssel aus dem DNS-TXT-Record des Absenders und validiert damit die Signatur (sichtbar in den Headern).',
    },
    {
      q: 'What does a DMARC record let a domain owner specify?',
      options: [
        'The font used in emails',
        'What to do with mail that fails SPF/DKIM (accept, quarantine, or reject) plus a destination for compliance reports',
        'The maximum attachment size',
        'The sender’s display name',
      ],
      correct: 1,
      why: 'DMARC baut auf SPF und DKIM auf: Es legt fest, was mit nicht validierbaren Mails geschieht (akzeptieren, in Quarantäne/Spam, abweisen) — und kann Compliance-Reports über echte vs. gefälschte Mails liefern.',
    },
  ],

  // 094 — 4.5 Monitoring Data
  '094': [
    {
      q: 'What does a File Integrity Monitor (FIM) do?',
      options: [
        'It compresses log files',
        'It alerts when files that should never change are suddenly modified',
        'It encrypts the file system',
        'It defragments the disk',
      ],
      correct: 1,
      why: 'Ein FIM überwacht die selten wechselnden Kern-Dateien und alarmiert bei Änderungen — unter Windows on demand via System File Checker (SFC), unter Linux z. B. mit Tripwire.',
    },
    {
      q: 'What do the DLP terms "data in motion", "data at rest", and "data in use" describe?',
      options: [
        'Three encryption algorithms',
        'Backup schedules',
        'Traffic on the network, files stored on a system, and data in a system’s active memory',
        'Three types of USB drives',
      ],
      correct: 2,
      why: 'DLP überwacht Daten in Bewegung (Netzwerkpakete), im Ruhezustand (im Dateisystem gespeichert) und in Verwendung (im aktiven Speicher des Endpoints).',
    },
    {
      q: 'Why is USB storage a particular DLP concern (as in the 2008 U.S. DoD agent.btz incident)?',
      options: [
        'USB drives are too slow for backups',
        'USB drives cannot be encrypted',
        'They only work on Windows',
        'They are tiny and portable — easy to carry data out unnoticed or bring malware in; agent.btz spread via USB and got flash media banned',
      ],
      correct: 3,
      why: 'USB-Sticks sind winzig und mobil: Daten lassen sich unbemerkt heraus- oder Malware hineintragen. 2008 verbreitete sich agent.btz per USB im US-Verteidigungsministerium — daraufhin wurden Flash-Medien gesperrt (per lokalem DLP-Agent).',
    },
    {
      q: 'How can an email-based DLP solution protect an organization?',
      options: [
        'By blocking outbound mail that contains sensitive data (e.g., SSNs, W-2s) and quarantining suspicious inbound mail',
        'By speeding up email delivery',
        'By archiving all email forever',
        'By encrypting the mail server disk',
      ],
      correct: 0,
      why: 'E-Mail-DLP prüft ein- und ausgehende Mails: Es blockt ausgehende Nachrichten mit sensiblen Daten (Sozialversicherungsnummern, W-2, Fake-Überweisungen) und stellt verdächtige eingehende Mails in Quarantäne — hätte z. B. 2016 den Boeing-Datenabfluss verhindert.',
    },
  ],

  // 095 — 4.5 Endpoint Security
  '095': [
    {
      q: 'What is a posture assessment?',
      options: [
        'A physical ergonomics check of the workstation',
        'A check whether a device meets security standards (trusted device, antivirus running/updated, apps current, disk encryption)',
        'A measurement of network latency',
        'A backup verification',
      ],
      correct: 1,
      why: 'Das Posture Assessment prüft beim Verbinden/Anmelden, ob ein Gerät den Sicherheitsstandards genügt: vertrauenswürdiges Gerät (Zertifikat), laufendes/aktuelles Antivirus, aktuelle Apps, ggf. Full-Disk-Encryption — sonst wird der Zugriff eingeschränkt.',
    },
    {
      q: 'What is the difference between a persistent and a dissolvable agent?',
      options: [
        'Persistent agents run only at login; dissolvable agents run permanently',
        'They are the same',
        'A persistent agent is permanently installed and runs anytime; a dissolvable agent runs during login and then removes itself',
        'Dissolvable agents cannot perform checks',
      ],
      correct: 2,
      why: 'Der persistente Agent ist fest installiert und läuft jederzeit; der dissolvable Agent wird zum Login-Zeitpunkt ausgeführt, prüft und entfernt sich danach vollständig wieder.',
    },
    {
      q: 'How does EDR (Endpoint Detection and Response) go beyond traditional antivirus?',
      options: [
        'It only uses signatures',
        'It requires no agent',
        'It only works offline',
        'It adds behavioral analysis/ML, root-cause analysis, and can automatically isolate, quarantine, and roll back to a known-good state',
      ],
      correct: 3,
      why: 'EDR erweitert Signaturen um Verhaltensanalyse/ML und Prozessüberwachung, liefert Root-Cause-Analyse und kann automatisch isolieren, in Quarantäne stellen und das System auf einen bekannten guten Stand zurückrollen.',
    },
    {
      q: 'What distinguishes XDR (Extended Detection and Response) from EDR?',
      options: [
        'XDR correlates data across many systems and sources (e.g., network traffic, user-behavior analytics), not just one endpoint',
        'XDR only runs on mobile devices',
        'XDR removes the need for any agents',
        'XDR is an older technology than EDR',
      ],
      correct: 0,
      why: 'Ein Angriff betrifft oft mehrere Systeme. XDR wertet Daten vieler Systeme und Quellen zusammen aus (u. a. Netzwerkverkehr, User-Behavior-Analytics), findet dadurch bisher übersehene Bedrohungen und reduziert False Positives.',
    },
  ],

  // 098 — 4.6 Multifactor Authentication
  '098': [
    {
      q: 'Which are recognized authentication factors?',
      options: [
        'Something you know, something you have, something you are, somewhere you are',
        'Something you buy, borrow, or sell',
        'Speed, accuracy, and reliability',
        'Read, write, and execute',
      ],
      correct: 0,
      why: 'Die gängigen Faktoren sind: etwas, das man weiß (Passwort/PIN), etwas, das man hat (Smartcard/Token), etwas, das man ist (Biometrie), und irgendwo, wo man ist (Standort).',
    },
    {
      q: 'Which is an example of a "something you have" factor?',
      options: [
        'A memorized password',
        'A fingerprint',
        'A USB security key or hardware token generating a code',
        'Your GPS location',
      ],
      correct: 2,
      why: '„Something you have" ist ein Besitz-Faktor: eine Smartcard, ein USB-Security-Key mit Zertifikat oder ein Hardware-/Software-Token, das einen (auch serverseitig bekannten) Code erzeugt — auch SMS-Codes ans Telefon zählen dazu.',
    },
    {
      q: 'What is actually stored for a "something you are" (biometric) factor?',
      options: [
        'A photo of the fingerprint',
        'A mathematical representation of the biometric, not the image itself',
        'The user’s password',
        'The device’s IP address',
      ],
      correct: 1,
      why: 'Gespeichert wird eine mathematische Repräsentation (z. B. des Fingerabdrucks), nicht das Bild selbst. Biometrie ist schwer zu ändern und lässt sich umgehen — daher am besten mit weiteren Faktoren kombinieren.',
    },
    {
      q: 'How does "somewhere you are" work as a factor?',
      options: [
        'It measures typing speed',
        'It checks the password strength',
        'It reads a hardware token',
        'It uses location (IP address, GPS) to allow or deny — e.g., blocking a login from a country different from minutes ago',
      ],
      correct: 3,
      why: 'Der Standortfaktor nutzt IP-Adresse und GPS: Ein Login aus einem anderen Land als kurz zuvor kann blockiert werden. IP allein ist ungenau (v. a. bei IPv6), deshalb oft mit GPS kombiniert.',
    },
  ],

  // 102 — 4.8 Incident Planning
  '102': [
    {
      q: 'What is a tabletop exercise?',
      options: [
        'A full-scale disaster drill with real failover',
        'Sitting around a table and logistically stepping through the incident policies and procedures',
        'A penetration test of production',
        'A hardware stress test',
      ],
      correct: 1,
      why: 'Beim Tabletop-Exercise gehen alle Beteiligten am Tisch ein Szenario Schritt für Schritt durch — in wenigen Stunden, ohne den Aufwand eines vollen Notfall-Drills, um Lücken in den Abläufen zu finden.',
    },
    {
      q: 'What does a phishing simulation test?',
      options: [
        'Whether users click, whether internal filters catch the mail, and how anti-phishing systems react',
        'The mail server’s storage capacity',
        'The speed of the internet connection',
        'The strength of user passwords',
      ],
      correct: 0,
      why: 'Die Phishing-Simulation zeigt, wer klickt, ob die automatischen Filter die Mail abfangen und wie die Anti-Phishing-Systeme beim Besuch der Seite reagieren — Klicker bekommen zusätzliches Training.',
    },
    {
      q: 'Why might a security event have multiple root causes?',
      options: [
        'Root cause analysis is never useful',
        'There is always exactly one cause',
        'An attacker may go through several steps/processes to gain access, so more than one weakness enabled it',
        'Root causes only apply to hardware failures',
      ],
      correct: 2,
      why: 'Angreifer nutzen oft mehrere Schritte hintereinander. Deshalb nicht auf eine einzige Ursache fixieren — es kann mehrere Root Causes geben, die den Zugriff zusammen ermöglicht haben.',
    },
    {
      q: 'What is threat hunting?',
      options: [
        'Waiting for alarms to fire before acting',
        'Deleting old log files',
        'Buying cyber insurance',
        'Proactively finding vulnerabilities first — e.g., adjusting firewall rules, tracking new CVEs, and confirming systems are patched',
      ],
      correct: 3,
      why: 'Threat Hunting sucht die Schwachstelle vor dem Angreifer: Firewall-Regeln anpassen, neu gemeldete Schwachstellen verfolgen und prüfen, dass die eigenen Systeme aktuell gepatcht sind.',
    },
  ],

  // 103 — 4.8 Digital Forensics
  '103': [
    {
      q: 'What is a legal hold?',
      options: [
        'A firewall rule blocking legal websites',
        'A password reset process for lawyers',
        'A legally initiated request specifying which data must be stored and preserved, usually sent to the data custodian',
        'A backup schedule for the legal department',
      ],
      correct: 2,
      why: 'Der Legal Hold wird von einer juristischen Instanz ausgelöst und legt fest, welche Daten (ESI) aufzubewahren sind; er geht an den Data Custodian, der die Beschaffung und Aufbewahrung verantwortet.',
    },
    {
      q: 'Why is a chain of custody important in digital forensics?',
      options: [
        'It documents who accessed the data and proves (via hashes/signatures) the data is unchanged since collection',
        'It speeds up data acquisition',
        'It encrypts the original evidence',
        'It deletes duplicate files',
      ],
      correct: 0,
      why: 'Die Chain of Custody hält fest, wer wann auf die Daten zugriff, und belegt per Hashes/digitalen Signaturen, dass die Daten seit der Sicherung unverändert sind — entscheidend für spätere Gerichtsverfahren.',
    },
    {
      q: 'Why work from copies rather than the original media during acquisition?',
      options: [
        'Copies are faster to search',
        'Working on copies prevents altering the original and guards against remote wipe (especially on mobile devices)',
        'Originals cannot be read directly',
        'Copies compress better',
      ],
      correct: 1,
      why: 'Aus dem Original werden Kopien gezogen und nur mit diesen gearbeitet — das schützt die Originaldaten vor Veränderung und vor Fernlöschung (gerade bei Mobilgeräten); wichtig ist auch die Live-Erfassung bei verschlüsselten Systemen.',
    },
    {
      q: 'What does the e-discovery process require?',
      options: [
        'A full forensic analysis and conclusions',
        'Encrypting all collected data',
        'Deleting recoverable data',
        'Only collecting and producing the electronic documents — no analysis of the data',
      ],
      correct: 3,
      why: 'E-Discovery ist reines Sammeln, Aufbereiten und Bereitstellen elektronischer Dokumente — ohne Analysepflicht. Oft liefert man z. B. ein Laufwerksimage an das Forensik-Team, das dann weiter auswertet.',
    },
  ],

  // 105 — 5.1 Security Policies
  '105': [
    {
      q: 'What does an Acceptable Use Policy (AUP) define?',
      options: [
        'The encryption algorithm for stored data',
        'What users may do with company technology (computers, phones, mobile devices) — and it protects the organization legally',
        'The backup schedule',
        'The physical layout of the data center',
      ],
      correct: 1,
      why: 'Die AUP legt fest, was Nutzer mit der bereitgestellten Technik tun dürfen. Sie informiert nicht nur, sondern schützt die Organisation rechtlich — etwa als Beleg bei einer Kündigung wegen Regelverstoßes.',
    },
    {
      q: 'What is the difference between business continuity and disaster recovery plans?',
      options: [
        'They are the same thing',
        'Business continuity only covers hardware; disaster recovery only covers software',
        'Business continuity provides alternative processes (e.g., manual credit-card transactions); disaster recovery handles widespread/long outages',
        'Disaster recovery applies only to natural disasters',
      ],
      correct: 2,
      why: 'Business Continuity liefert Ausweichprozesse (z. B. manuelle Kartenzahlung bei Netzausfall); der Disaster Recovery Plan greift bei großflächigen oder langen Ausfällen — quasi Business Continuity für alle Betroffenen.',
    },
    {
      q: 'What is the goal of the Software Development Lifecycle (SDLC)?',
      options: [
        'To move from idea to finished application (requirements, build, test, deploy) on schedule and budget',
        'To encrypt source code',
        'To replace change management',
        'To monitor network traffic',
      ],
      correct: 0,
      why: 'Der SDLC führt strukturiert von der Idee zur fertigen App (Anforderungen, Entwicklung, Test, Deployment) — termin- und budgetgerecht. Zwei gängige Modelle: das lineare Waterfall und das schnelle, iterative Agile.',
    },
    {
      q: 'What does the change management process critically include?',
      options: [
        'A marketing plan for the change',
        'The salary of the technician',
        'A social media announcement',
        'Documentation of frequency, duration, install process, and — most importantly — a fallback procedure if it fails',
      ],
      correct: 3,
      why: 'Change Management dokumentiert Häufigkeit, Dauer und Installationsprozess einer Änderung — und vor allem eine Fallback-Prozedur, falls sie schiefgeht. So werden Änderungen mit geringstem Risiko umgesetzt.',
    },
  ],

  // 106 — 5.1 Security Standards
  '106': [
    {
      q: 'Which two organizations commonly provide ready-made security standards?',
      options: [
        'ISO (International Organization for Standardization) and NIST (National Institute of Standards and Technology)',
        'ICANN and IANA',
        'IEEE and W3C',
        'FBI and CIA',
      ],
      correct: 0,
      why: 'Statt eigener Standards greifen viele Organisationen auf bestehende zurück — vor allem von ISO und NIST. Standards dokumentieren die Vorgaben und senken das Risiko.',
    },
    {
      q: 'What might a password standard specify beyond complexity?',
      options: [
        'The color of the login screen',
        'Authentication method (e.g., no local accounts, LDAP to Active Directory), reset handling, change frequency, and storage',
        'The employee’s job title',
        'The office Wi-Fi name',
      ],
      correct: 1,
      why: 'Ein Passwort-Standard regelt neben der Komplexität auch die Authentifizierungsmethode (z. B. keine lokalen Konten, stattdessen LDAP zu Active Directory), Reset-Abläufe, Änderungsintervalle und die sichere Speicherung.',
    },
    {
      q: 'Why have standards for how user access is removed, not just granted?',
      options: [
        'To speed up onboarding',
        'To reduce license costs',
        'To handle security issues, account expiration, employees leaving, or contract expiration cleanly',
        'Removing access is never necessary',
      ],
      correct: 2,
      why: 'Zugriffe müssen genauso standardisiert entzogen wie vergeben werden — bei Sicherheitsproblemen, Kontoablauf, Ausscheiden eines Mitarbeiters oder Vertragsende.',
    },
    {
      q: 'Why do encryption standards distinguish states of data (in use, in transit, at rest)?',
      options: [
        'Because each state may require different encryption requirements',
        'Because only data at rest can be encrypted',
        'Because data in transit needs no protection',
        'Because states of data are irrelevant to security',
      ],
      correct: 0,
      why: 'Je nach Datenzustand können unterschiedliche Verschlüsselungsanforderungen gelten: Data at Rest anders als Data in Transit — Standards regeln auch, wie z. B. Passwörter (gesalzener Hash, festgelegter Algorithmus) gespeichert werden.',
    },
  ],

  // 108 — 5.1 Security Considerations
  '108': [
    {
      q: 'What does the Sarbanes-Oxley (SOX) regulation focus on?',
      options: [
        'Health care information',
        'The finances of a public company and protecting/making financial data available to the right people',
        'Wireless network encryption',
        'Physical door locks',
      ],
      correct: 1,
      why: 'Sarbanes-Oxley (Public Company Accounting Reform and Investor Protection Act, 2002) betrifft die Finanzen eines Unternehmens: Finanzdaten müssen geschützt und den richtigen Personen zugänglich sein.',
    },
    {
      q: 'What does HIPAA regulate?',
      options: [
        'Payment card processing',
        'Public company accounting',
        'Industrial control systems',
        'The protection, transfer, and disclosure of health care information',
      ],
      correct: 3,
      why: 'HIPAA (Health Insurance Portability and Accountability Act) schützt Gesundheitsdaten — die Speicherung ebenso wie die Übertragung und die Weitergabe an Dritte.',
    },
    {
      q: 'What legal challenge does cloud computing create regarding data location?',
      options: [
        'Cloud data is always encrypted by law',
        'Some countries require that data collected from their citizens stays within the country’s borders',
        'Cloud data cannot be stored anywhere',
        'Cloud providers set all the laws',
      ],
      correct: 1,
      why: 'In der Cloud können App-Instanzen und Daten überall liegen — aber manche Länder verlangen, dass Daten ihrer Bürger die Landesgrenzen nicht verlassen (Data Residency).',
    },
    {
      q: 'Why are power-generation/utility systems often air-gapped?',
      options: [
        'To save electricity',
        'Because they require very strict access controls, separating them from the rest of the network',
        'Because they run faster offline',
        'Because they have no data to protect',
      ],
      correct: 1,
      why: 'Öffentliche Versorger und Stromerzeugung unterliegen sehr strengen Zugriffsvorgaben — ihre Steuerungstechnik wird deshalb oft per Air-Gap vom restlichen Netz getrennt.',
    },
  ],

  // 110 — 5.2 Risk Management
  '110': [
    {
      q: 'What is an ad hoc risk assessment?',
      options: [
        'A scheduled quarterly assessment',
        'An assessment done for one specific purpose, e.g., evaluating one particular new attack type',
        'A mandated annual assessment',
        'An assessment of every change',
      ],
      correct: 1,
      why: '„Ad hoc" heißt „für diesen Zweck": Ein einmaliges Assessment für genau eine Frage — z. B. ob die Organisation für einen bestimmten, neuen Angriffstyp anfällig ist; danach wird das Komitee aufgelöst.',
    },
    {
      q: 'When is risk assessment an ongoing (continuous) process?',
      options: [
        'Only during company acquisitions',
        'Never — it is always one-time',
        'As part of the change control process, where every change is assessed for risk',
        'Only when new hardware is installed',
      ],
      correct: 2,
      why: 'Im Change-Control-Prozess wird bei jeder Änderung das Risiko bewertet — damit ist die Risikobewertung dort ein fortlaufender Vorgang, nicht einmalig.',
    },
    {
      q: 'Which mandate may require an annual risk assessment for storing credit card numbers?',
      options: [
        'HIPAA',
        'Sarbanes-Oxley',
        'GDPR',
        'PCI DSS (Payment Card Industry Data Security Standard)',
      ],
      correct: 3,
      why: 'Wer Kreditkartennummern speichert, muss laut PCI DSS regelmäßig (z. B. jährlich) eine Risikobewertung durchführen.',
    },
    {
      q: 'What is a one-time risk assessment typically tied to?',
      options: [
        'A specific project, such as an acquisition or installing new equipment/software',
        'The daily login process',
        'Every email sent',
        'The lunch schedule',
      ],
      correct: 0,
      why: 'Das einmalige Assessment hängt meist an einem konkreten Projekt — etwa einer Firmenübernahme oder der Einführung neuer Hard-/Software, um deren Risiken zu verstehen.',
    },
  ],

  // 112 — 5.2 Risk Management Strategies
  '112': [
    {
      q: 'Which action is an example of transferring risk?',
      options: [
        'Disabling the vulnerable service',
        'Purchasing cybersecurity insurance',
        'Installing a next-generation firewall',
        'Removing the risky system entirely',
      ],
      correct: 1,
      why: 'Beim Risikotransfer wandert das Risiko zu einer anderen Partei — das klassische Beispiel ist der Abschluss einer Cyberversicherung.',
    },
    {
      q: 'What is the most common risk management strategy?',
      options: [
        'Avoiding the risk',
        'Transferring the risk',
        'Accepting the risk',
        'Mitigating the risk',
      ],
      correct: 2,
      why: 'Am häufigsten wird das Risiko akzeptiert — das Unternehmen entscheidet bewusst, damit zu leben, teils mit Exemptions oder Exceptions von bestehenden Policies.',
    },
    {
      q: 'How does "avoiding" risk differ from "mitigating" it?',
      options: [
        'Avoiding removes the risk entirely (no further management needed); mitigating reduces it (e.g., a next-gen firewall)',
        'They are the same',
        'Avoiding means buying insurance',
        'Mitigating means ignoring the risk',
      ],
      correct: 0,
      why: 'Vermeiden entfernt das Risiko komplett (keine weitere Steuerung nötig); Mindern reduziert es — etwa mit einer Next-Generation-Firewall gegen Internet-Risiken.',
    },
    {
      q: 'What is the purpose of a risk register (risk reporting)?',
      options: [
        'To log user passwords',
        'To schedule backups',
        'To encrypt sensitive files',
        'A continuously updated list of tracked risks with descriptions and handling, referenced by upper management',
      ],
      correct: 3,
      why: 'Das Risk Reporting/Register listet alle verfolgten Risiken mit Beschreibung und Umgang — ein ständig aktualisiertes Dokument (kritische und aufkommende Risiken), auf das das Management seine Entscheidungen stützt.',
    },
  ],

  // 113 — 5.2 Business Impact Analysis
  '113': [
    {
      q: 'What does RTO (Recovery Time Objective) define?',
      options: [
        'How much data must be restored',
        'How long it takes to get systems back up and running after an outage',
        'The average time between failures',
        'The time to repair a single device',
      ],
      correct: 1,
      why: 'Das RTO ist die Zeitspanne, bis man wieder betriebsbereit ist — z. B. bis sowohl Datenbank- als auch Webserver laufen.',
    },
    {
      q: 'What does RPO (Recovery Point Objective) describe?',
      options: [
        'The point in time / amount of data needed to be considered operational again (e.g., the last 12 months of data)',
        'The time to diagnose a fault',
        'The mean time between failures',
        'The cost of replacement equipment',
      ],
      correct: 0,
      why: 'Das RPO ist der Datenstand, ab dem man wieder als betriebsbereit gilt — z. B. mindestens die letzten 12 Monate an Daten, die aus dem Backup zurückgeladen sein müssen.',
    },
    {
      q: 'What does MTTR (Mean Time To Repair) include?',
      options: [
        'Only the time to buy new equipment',
        'The time before the next failure',
        'Time to diagnose, obtain, install, and configure the replacement — reducible by spending more (e.g., spare stock, 2-hour contracts)',
        'The manufacturing date of the device',
      ],
      correct: 2,
      why: 'MTTR umfasst Diagnose, Beschaffung, Einbau und Konfiguration des Ersatzes. Mit mehr Budget (Ersatzteile auf Lager, 2-Stunden-Verträge) lässt sich die Reparaturzeit senken.',
    },
    {
      q: 'What does MTBF (Mean Time Between Failures) help with?',
      options: [
        'Encrypting the equipment',
        'Setting user passwords',
        'Configuring the firewall',
        'Predicting how long equipment runs before an outage — for planning and risk assessment',
      ],
      correct: 3,
      why: 'MTBF schätzt, wie lange ein Gerät bis zum nächsten Ausfall läuft (grob: Gesamtlaufzeit geteilt durch Anzahl Ausfälle) — nützlich, um das Ausfallrisiko einzuschätzen und zu planen.',
    },
  ],

  // 114 — 5.3 Third-party Risk Assessment
  '114': [
    {
      q: 'What is a "right to audit" clause?',
      options: [
        'A law requiring all companies to audit yearly',
        'A contract clause establishing that regular audits of the vendor will occur, with agreed parameters',
        'The auditor’s permission to enter the building',
        'A user’s right to see their own data',
      ],
      correct: 1,
      why: 'Die Right-to-Audit-Klausel im Vertrag stellt sicher, dass regelmäßige Audits des Vendors stattfinden — beide Seiten kennen so die Sicherheitskontrollen, oft durchgeführt von einem unabhängigen Dritten.',
    },
    {
      q: 'What does "due diligence" mean before doing business with a third party?',
      options: [
        'Signing the contract as fast as possible',
        'Encrypting all shared data',
        'Investigating and verifying information about the company (finances, customers, background checks, interviews)',
        'Auditing your own systems',
      ],
      correct: 2,
      why: 'Due Diligence ist die Prüfung vor der Zusammenarbeit: angegebene Umsätze/Kundenzahlen verifizieren, Hintergrundchecks und Gespräche mit Personen des Drittanbieters.',
    },
    {
      q: 'Which situation is a conflict of interest with a potential vendor?',
      options: [
        'The vendor also does business with your largest competitor, employs an executive’s relative, or offers gifts for signing',
        'The vendor has a public website',
        'The vendor uses the same email software as you',
        'The vendor is located in another city',
      ],
      correct: 0,
      why: 'Interessenkonflikte kompromittieren das Urteil: Der Vendor arbeitet auch für den größten Konkurrenten, beschäftigt einen Verwandten einer Führungskraft oder bietet Geschenke fürs Unterzeichnen — das kann eine Zusammenarbeit verhindern.',
    },
    {
      q: 'What lesson does the SolarWinds supply-chain attack (2020) teach?',
      options: [
        'Digital signatures make updates 100% safe',
        'Supply chains need no analysis',
        'Only small companies are targeted',
        'A trusted, digitally signed vendor update can carry malware — of ~300,000 possible customers, at least 18,000 were infected',
      ],
      correct: 3,
      why: 'Angreifer schleusten Schadcode in ein signiertes SolarWinds-Update; von rund 300.000 potenziell betroffenen Kunden installierten mindestens 18.000 die Malware — ein Weckruf für gründliche Supply-Chain-Analyse.',
    },
  ],

  // 115 — 5.3 Agreement Types
  '115': [
    {
      q: 'What does a Service Level Agreement (SLA) define?',
      options: [
        'The ownership stake in a partnership',
        'Minimum service terms such as uptime/availability (e.g., no more than four hours of unscheduled downtime)',
        'The confidentiality of trade secrets',
        'The broad goals of a future partnership',
      ],
      correct: 1,
      why: 'Die SLA legt Mindestleistungen fest — z. B. maximal vier Stunden ungeplante Downtime, Technikereinsatz, Ersatzgerät vor Ort — damit beide Seiten die Service-Erwartungen kennen.',
    },
    {
      q: 'How does a Memorandum of Understanding (MOU) differ from a Master Service Agreement (MSA)?',
      options: [
        'An MOU is an informal statement of broad goals; an MSA is a legal contract setting the terms/framework for ongoing work',
        'They are identical',
        'An MOU is legally binding; an MSA is not',
        'An MSA only covers confidentiality',
      ],
      correct: 0,
      why: 'Das MOU ist informell und beschreibt grobe gemeinsame Ziele (kein Vertrag); die MSA ist ein rechtsverbindlicher Rahmenvertrag mit Bedingungen und Abrechnung für laufende Zusammenarbeit.',
    },
    {
      q: 'What is a Statement of Work (SOW) typically used for?',
      options: [
        'To end a business partnership',
        'To define confidentiality obligations',
        'To detail the scope, location, deliverables, and schedule of specific services — often under an MSA',
        'To transfer ownership of the company',
      ],
      correct: 2,
      why: 'Der SOW (Work Order) listet konkret Umfang, Ort, Deliverables und Zeitplan der Leistungen — meist zusammen mit einer MSA, sodass die Grundbedingungen nicht neu verhandelt werden müssen.',
    },
    {
      q: 'What is the difference between a unilateral and a bilateral NDA?',
      options: [
        'Unilateral NDAs are illegal',
        'Bilateral means no signature is required',
        'Unilateral covers only financial data',
        'Unilateral: only one party must keep confidentiality; bilateral (mutual): both parties must',
      ],
      correct: 3,
      why: 'Beim unilateralen (einseitigen) NDA muss nur eine Partei vertraulich bleiben; beim bilateralen/mutual NDA beide — bei mehr als zwei Parteien spricht man von multilateral.',
    },
  ],

  // 117 — 5.4 Privacy
  '117': [
    {
      q: 'What is the GDPR?',
      options: [
        'A U.S. health care law',
        'An EU regulation protecting the privacy of everyone living in the European Union',
        'A payment card security standard',
        'A firewall configuration standard',
      ],
      correct: 1,
      why: 'Die General Data Protection Regulation ist eine EU-Verordnung, die die Privatsphäre aller in der EU lebenden Personen schützt und die Kontrolle über personenbezogene Daten in deren Hände legt.',
    },
    {
      q: 'What is the "right to be forgotten" under GDPR?',
      options: [
        'The right to delete your browser history',
        'The right to work anonymously',
        'The right to request that a website remove all of your private data',
        'The right to be excluded from backups',
      ],
      correct: 2,
      why: 'Das Recht auf Vergessenwerden gibt dem Data Subject die Kontrolle: Wer die Entfernung seiner privaten Informationen verlangt, dessen Daten muss die Website löschen.',
    },
    {
      q: 'Who is a "data subject" as defined by GDPR?',
      options: [
        'Any information relating to an identified or identifiable natural person — effectively everyone living there',
        'Only company executives',
        'Only the data processor',
        'Only people who signed a contract',
      ],
      correct: 0,
      why: 'Ein Data Subject ist jede identifizierte oder identifizierbare natürliche Person — praktisch jeder Einwohner: Name, Adresse, genetische Daten, Standortdaten usw. sind geschützt.',
    },
    {
      q: 'What is a data inventory?',
      options: [
        'A list of physical servers',
        'A backup of all databases',
        'A firewall rule set',
        'A listing of all data the company collects and stores, including owner, update frequency, and format',
      ],
      correct: 3,
      why: 'Das Data Inventory listet alle gesammelten und gespeicherten Daten — mit Eigentümer, Aktualisierungshäufigkeit und Format —, um die Datenschutzfolgen zu verstehen, besonders beim Teilen mit Dritten.',
    },
  ],

  // 118 — 5.5 Audits and Assessments
  '118': [
    {
      q: 'What is an "attestation" in the context of an audit?',
      options: [
        'The penalty for failing an audit',
        'An opinion of truth associated with the results of an audit',
        'The schedule of the audit',
        'A type of firewall',
      ],
      correct: 1,
      why: 'Die Attestation ist die „Meinung über die Wahrheit" der Audit-Ergebnisse: Man führt ein Audit durch und bestätigt (attestiert) dann dessen Ergebnisse.',
    },
    {
      q: 'What does an internal audit typically start with?',
      options: [
        'Hiring an external auditor',
        'A penetration test',
        'A self-assessment comparing internal processes against the requirements',
        'A public disclosure',
      ],
      correct: 2,
      why: 'Interne Audits beginnen meist mit einer Selbstbewertung: Die Organisation prüft ihre Prozesse gegen die Anforderungen; das Audit Committee bündelt die Ergebnisse für das Compliance-Bild.',
    },
    {
      q: 'What is the role of an audit committee?',
      options: [
        'It performs the penetration tests',
        'It writes the software',
        'It manages the marketing',
        'It handles risk management and starts/stops internal audits',
      ],
      correct: 3,
      why: 'Das Audit Committee verantwortet das Risikomanagement der Organisation und ist die Instanz, die interne Audits startet und beendet.',
    },
    {
      q: 'When is an external (third-party) audit typically required?',
      options: [
        'When a compliance regulation mandates it, with type and frequency set by that regulation',
        'Only when the company is failing',
        'Never — audits are always internal',
        'Only for marketing purposes',
      ],
      correct: 0,
      why: 'Manche Compliance-Vorgaben verlangen ein Audit durch einen externen Dritten; Art und Häufigkeit richten sich nach der jeweiligen Regulierung.',
    },
  ],

  // 120 — 5.6 Security Awareness
  '120': [
    {
      q: 'What happens in a phishing campaign run by a security awareness team?',
      options: [
        'Real attackers are hired to breach the company',
        'Simulated phishing emails are sent; clicks are reported and clickers are assigned additional training',
        'All email is deleted',
        'Users’ passwords are reset',
      ],
      correct: 1,
      why: 'Das Team verschickt simulierte Phishing-Mails, protokolliert Öffnungen/Klicks zentral — wer klickt, erhält eine Benachrichtigung und zusätzliches Training (online oder vor Ort).',
    },
    {
      q: 'What signs should users look for to recognize a phishing email?',
      options: [
        'A professional-looking logo',
        'A familiar sender name',
        'A short subject line',
        'Spelling/grammar errors, suspicious domains, unusual attachments, and requests for personal information or credentials',
      ],
      correct: 3,
      why: 'Warnzeichen sind Rechtschreib-/Grammatikfehler, verdächtige Domainnamen im Link, ungewöhnliche Anhänge und die Aufforderung, persönliche Daten oder Zugangsdaten preiszugeben — nie Links klicken oder Anhänge ausführen.',
    },
    {
      q: 'What is "anomalous behavior recognition"?',
      options: [
        'Watching for risky, unexpected, or unintentional behavior (e.g., modifying host files, logins from another country, mistyped domains)',
        'Recognizing familiar user faces',
        'Blocking all outbound traffic',
        'Renaming suspicious files',
      ],
      correct: 0,
      why: 'Erkannt wird auffälliges Verhalten in drei Kategorien: riskant (Host-Datei ändern, sensible Uploads), unerwartet (Login aus anderem Land, Datenspitzen) und unbeabsichtigt (falsche Domain, verlorener USB-Stick, Fehlkonfiguration).',
    },
    {
      q: 'What is the security awareness team responsible for?',
      options: [
        'Writing the application code',
        'Managing the company finances',
        'Configuring the firewalls',
        'Monitoring, reporting, and training users — creating materials, custom/compliance training, and tracking metrics over time',
      ],
      correct: 3,
      why: 'Das Security-Awareness-Team überwacht, berichtet und schult: Es erstellt Trainingsmaterial (auch rollen-/compliance-spezifisch), Poster und Mails und verfolgt Metriken (Phishing-Klickrate, MFA-Nutzung), um die Wirkung zu belegen.',
    },
  ],
}
