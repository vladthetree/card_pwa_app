/**
 * AI_CONTEXT:
 * Role: Curated MC questions derived from the professormesser.com video transcripts for formative video recall.
 * Used by: VideoRecallCheck merges a deterministic sample with mapped deck questions.
 * Important: Keyed by the 3-digit playlist index; content is grounded in the transcript of exactly that video.
 */

/**
 * Transkript-Fragen: Wissensabfrage direkt aus dem Videoinhalt.
 *
 * Diese Fragen ergänzen den Abruf-Check aller fachlichen Videos. Gemappte
 * Deck-Fragen bleiben priorisiert; Transkriptfragen füllen die gewählte
 * Stichprobe auf und werden nicht als Karten gespeichert (non-scheduling).
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
    {
      q: 'What determines where a security device such as a firewall or IPS should be placed on the network?',
      options: [
        'Placement is irrelevant as long as the device is powered on',
        'The zones and traffic flows it needs to control, e.g. between untrusted and trusted or screened segments',
        'Devices must always be placed physically next to the internet router',
        'Only cost determines placement',
      ],
      correct: 1,
      why: 'Laut Video richtet sich die Platzierung nach den Zonen (trusted/untrusted/screened) und den Traffic-Flows, die kontrolliert werden sollen.',
    },
    {
      q: 'Why does the video emphasize securing network connectivity, such as cabling?',
      options: [
        'Cabling never needs any protection',
        'Because every device is connected to every other device, and someone tapping the cabling can watch all traversing traffic',
        'Because connectivity only matters for wireless networks',
        'Because connectivity is managed exclusively by the ISP',
      ],
      correct: 1,
      why: 'Da alle Geräte über das Netz verbunden sind, kann laut Video ein Tap an der Verkabelung sämtlichen Datenverkehr mitlesen — Verkabelungssicherheit und Verschlüsselung schließen diese Lücke.',
    },
    {
      q: 'What guides the selection of effective controls for a network, per the video?',
      options: [
        'Choosing the cheapest available device regardless of function',
        'Thinking like an attacker: where could someone get in (code, open ports, authentication, human error) and minimizing that attack surface',
        'Installing every possible security product at once',
        'Selecting controls at random and testing which ones work',
      ],
      correct: 1,
      why: 'Das Video rät, die eigene Angriffsfläche wie ein Angreifer zu betrachten (Anwendungscode, offene Ports, Authentifizierung, menschlicher Fehler) und Kontrollen gezielt dagegen auszuwählen.',
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
    {
      q: 'What best describes a remote access (SSL/TLS) VPN, per the video?',
      options: [
        'A site-to-site tunnel that never touches an individual device',
        'A connection typically used by a single device over TCP port 443, easily passing through existing firewalls',
        'A protocol that only works over port 22',
        'A method that requires no login credentials at all',
      ],
      correct: 1,
      why: 'SSL/TLS-VPNs laufen laut Video über TCP 443 wie normaler HTTPS-Verkehr, passieren daher leicht bestehende Firewalls und werden meist für einzelne Remote-Geräte genutzt.',
    },
    {
      q: 'What problem was SD-WAN specifically designed to address, per the video?',
      options: [
        'The inefficiency of routing all remote-site traffic through a central data center before reaching cloud applications',
        'The need to eliminate all VPN technology',
        'The lack of physical cabling in remote offices',
        'The cost of firewalls in a data center',
      ],
      correct: 0,
      why: 'Da Anwendungen zunehmend in der Cloud liegen, adressiert SD-WAN laut Video die Ineffizienz, jeden Remote-Standort erst über das zentrale Rechenzentrum zu leiten, bevor die Cloud erreicht wird.',
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
    {
      q: 'Why does the video emphasize protecting trade secrets?',
      options: [
        'They are always publicly published by law',
        'They are processes and information known only to the organization, which competitors would like to obtain',
        'They only apply to government agencies',
        'They lose value the more they are protected',
      ],
      correct: 1,
      why: 'Trade Secrets sind laut Video organisationseigene Prozesse/Informationen, die andere gerne hätten — entsprechend braucht diese Datenart besonderen Schutz.',
    },
    {
      q: 'What challenge does legal information present, according to the video?',
      options: [
        'It is always fully private and never public',
        'Legal records are often public, but details like PII within them must still be protected differently',
        'It never needs to be stored in any system',
        'Only judges may ever view legal data',
      ],
      correct: 1,
      why: 'Gerichtsakten sind laut Video oft öffentlich einsehbar, enthalten aber teils private Details (PII), die gesondert geschützt werden müssen.',
    },
    {
      q: 'Which examples of financial information does the video mention as sensitive?',
      options: [
        'Only publicly traded stock prices',
        'A company’s internal financial details as well as an individual’s bank account and payment information',
        'Financial information is never considered sensitive',
        'Only cryptocurrency wallet addresses',
      ],
      correct: 1,
      why: 'Das Video nennt sowohl interne Firmenfinanzen als auch persönliche Bankdaten/Zahlungen als schützenswerte Finanzinformationen.',
    },
    {
      q: 'Which category of data does the video place under the "sensitive" classification?',
      options: [
        'Data with no restrictions at all',
        'Data that may include intellectual property, PII, or PHI',
        'Only expired documents',
        'Only data older than 10 years',
      ],
      correct: 1,
      why: 'Laut Video kann „sensitive" u. a. geistiges Eigentum, PII oder PHI umfassen.',
    },
    {
      q: 'How does "confidential" data differ from "sensitive" data in the classification scheme the video describes?',
      options: [
        'Confidential data requires additional access beyond the sensitive level',
        'Confidential data is always less protected than sensitive data',
        'Confidential and sensitive are exactly the same classification',
        'Confidential data may be freely shared externally',
      ],
      correct: 0,
      why: 'Confidential steht laut Video eine Stufe strenger als Sensitive — es braucht zusätzliche Zugriffsrechte, um es einzusehen.',
    },
    {
      q: 'What does the "public" (or unclassified) data classification mean, per the video?',
      options: [
        'Only executives may view it',
        'It requires a signed non-disclosure agreement',
        'Anyone should be able to view this information',
        'It is the most sensitive classification available',
      ],
      correct: 2,
      why: 'Public/Unclassified beschreibt laut Video Informationen, die grundsätzlich jeder einsehen darf.',
    },
    {
      q: 'What extra requirement does the video associate with restricted/private/classified data?',
      options: [
        'No special access is needed at all',
        'It must always be published for transparency',
        'Additional rights/permissions or a signed non-disclosure agreement may be required to view it',
        'It can only be stored on paper',
      ],
      correct: 2,
      why: 'Für restricted/private/classified verlangt das Video zusätzliche Rechte oder eine unterschriebene NDA, bevor jemand Zugriff bekommt.',
    },
    {
      q: 'Which classification does the video contrast directly with "public" data?',
      options: [
        'Private/classified/restricted data needing extra rights, permissions, or an NDA',
        'Archived data with no owner',
        'Temporary data deleted after 24 hours',
        'Data that is identical to public data but stored differently',
      ],
      correct: 0,
      why: 'Dem Video zufolge steht der Klassifizierung „public" die Stufe „private/classified/restricted" gegenüber — mit zusätzlichen Zugriffsanforderungen.',
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
    {
      q: 'Why must the chosen technology be able to scale for capacity planning, per the video?',
      options: [
        'Not all technologies can grow and shrink with demand, so scalability must be considered early in the design',
        'Technology choice has no effect on capacity',
        'All technologies scale identically by default',
        'Scalability is only relevant for hardware, never software',
      ],
      correct: 0,
      why: 'Laut Video kann nicht jede Technologie problemlos mit- oder zurückwachsen — das muss schon beim Design berücksichtigt werden (z. B. Load Balancer + mehrere Server).',
    },
    {
      q: 'How does deploying new infrastructure capacity differ between an on-premises data center and the cloud, per the video?',
      options: [
        'Both require identical multi-week procurement processes',
        'On-premises requires purchasing, shipping, unboxing, and racking hardware; in the cloud you can create an instance with a few clicks',
        'Cloud infrastructure cannot be scaled at all',
        'On-premises infrastructure scales automatically without any purchase',
      ],
      correct: 1,
      why: 'On-Premises-Kapazität braucht laut Video Beschaffung, Versand, Einbau und Konfiguration von Hardware; in der Cloud reichen wenige Klicks für eine neue Instanz.',
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
    {
      q: 'A team is deploying a Windows-based payment application and needs an initial baseline quickly. Which approach is most defensible?',
      options: [
        'Combine vendor-published application and Windows baselines, then test and tailor them to the organization',
        'Copy an unrelated router baseline unchanged because all security settings are interchangeable',
        'Enable every available Group Policy setting without testing its effect on the payment service',
        'Use the application’s current production state as the baseline even though it has never been reviewed',
      ],
      correct: 0,
      why: 'Hersteller-Baselines sind ein belastbarer Ausgangspunkt, müssen aber für Anwendung, Betriebssystem und Organisationsbedarf kombiniert, getestet und angepasst werden.',
    },
    {
      q: 'A compliance scan finds that 18 servers drifted from the approved baseline after an OS upgrade. What should happen next?',
      options: [
        'Validate whether the approved baseline needs an update, test it, remediate the drift, and audit deployment results',
        'Delete the scan because drift is expected after every upgrade',
        'Disable configuration monitoring to prevent future findings',
        'Roll back all servers before determining whether the new OS changed valid settings',
      ],
      correct: 0,
      why: 'Ein OS-Wechsel kann eine Baseline-Änderung erfordern. Die saubere Reihenfolge ist bewerten, testen, freigeben, Drift beheben und die Wirksamkeit erneut auditieren.',
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
    {
      q: 'What is the security challenge with BYOD, per the video?',
      options: [
        'Ensuring both the user’s personal data and the company’s data remain private and secure on a device the company does not own',
        'BYOD devices cannot be managed by an MDM at all',
        'BYOD requires the company to physically own every device',
        'BYOD eliminates any need for security policy',
      ],
      correct: 0,
      why: 'Bei BYOD muss laut Video sichergestellt werden, dass sowohl die privaten Daten des Nutzers als auch die Unternehmensdaten auf einem nicht firmeneigenen Gerät geschützt bleiben.',
    },
    {
      q: 'How does CYOD differ from standard COPE, per the video?',
      options: [
        'It is still a corporate-owned device, but the user is given a choice of which corporate device to receive',
        'CYOD devices are always personally owned by the employee',
        'CYOD removes all corporate control over the device',
        'CYOD only applies to desktop computers, never mobile devices',
      ],
      correct: 0,
      why: 'CYOD bleibt laut Video ein firmeneigenes Gerät — der Nutzer darf aber auswählen, welches konkrete Gerät er bekommt.',
    },
    {
      q: 'Why does the video flag cellular connectivity as a security concern for mobile devices?',
      options: [
        'The organization doesn’t have full control over data sent/received over the cellular network, raising traffic monitoring and location tracking concerns',
        'Cellular networks are always more secure than Wi-Fi',
        'Cellular data cannot be intercepted under any circumstances',
        'Cellular connectivity requires no security considerations at all',
      ],
      correct: 0,
      why: 'Laut Video hat die Organisation über Mobilfunkdaten keine volle Kontrolle — das wirft Fragen zu Traffic-Überwachung und Standortverfolgung auf.',
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
    {
      q: 'What does the acquisition/procurement process typically require before goods are purchased?',
      options: [
        'Only a verbal request from the end user',
        'Immediate full payment before any negotiation',
        'Budget analysis, supplier negotiation, and formal approvals from IT, purchasing, and management',
        'A certificate of destruction from the previous vendor',
      ],
      correct: 2,
      why: 'Das Video beschreibt den formalen Beschaffungsprozess: Budgetprüfung, Verhandlung mit dem Lieferanten (Preis, Lizenzen, Vertragsdetails) und Freigaben durch IT, Einkauf und Management.',
    },
    {
      q: 'When a new laptop is entered into the asset tracking system, what is recorded first?',
      options: [
        'The assigned owner who has control of the asset',
        'The resale value after depreciation',
        'The serial numbers of all internal components',
        'The planned destruction date',
      ],
      correct: 0,
      why: 'Erster Schritt laut Video: festhalten, wer die Kontrolle über das Asset hat (assigned ownership) — Updates am Gerät laufen dann über diese Person.',
    },
    {
      q: 'Why does the asset tracking system classify an asset as hardware or software?',
      options: [
        'Software must be replaced every year',
        'The classification affects tax treatment: hardware is a capital expenditure with depreciation, software an operating expense',
        'Only hardware can be assigned to a user',
        'Software assets do not appear in inventories',
      ],
      correct: 1,
      why: 'Das Video begründet die Klassifizierung steuerlich: Hardware ist eine Kapitalausgabe mit Abschreibung, Software eine Betriebsausgabe — beides wird unterschiedlich besteuert.',
    },
    {
      q: 'How does the asset inventory help the help desk work more efficiently?',
      options: [
        'It automatically resolves tickets without a technician',
        'It hides device details from technicians for privacy',
        'It replaces the need for user accounts',
        'Tickets can be populated with the exact device make and model plus the assigned user',
      ],
      correct: 3,
      why: 'Laut Video kann der Helpdesk das Ticket mit Make/Model und zugewiesenem Nutzer aus dem Inventar befüllen — der Techniker weiß sofort, womit er arbeitet.',
    },
    {
      q: 'What does "enumeration" mean in the context of asset tracking?',
      options: [
        'Counting how many assets were purchased per year',
        'Breaking a device down into its individual components such as CPU, memory, and storage',
        'Assigning sequential asset tag numbers',
        'Scanning the network for unknown devices',
      ],
      correct: 1,
      why: 'Enumeration heißt im Video: ein Gerät nicht nur als Einheit sehen, sondern die Einzelkomponenten (CPU, RAM, Laufwerke, Peripherie) erfassen.',
    },
    {
      q: 'Which methods does the video list for physically destroying storage drives?',
      options: [
        'Formatting, defragmenting, or repartitioning the drive',
        'Deleting all partitions twice',
        'Shredding/pulverizing, drilling holes, degaussing with an electromagnet, or incinerating',
        'Overwriting the drive once with zeros',
      ],
      correct: 2,
      why: 'Zur physischen Zerstörung nennt das Video Schreddern/Pulverisieren, Löcher bohren, Degaussen (starkes Magnetfeld) und Verbrennen — Formatieren oder einfaches Löschen genügt nicht.',
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
        'A honeypot that lures attackers with fake SNMP services on open ports',
        'A filter on the management station that drops unauthorized polling requests',
        'A compressed backup copy of the MIB database, sent to the server daily',
        'An alert the agent itself sends to the management station when a condition fires',
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
    {
      q: 'How does the video describe antivirus and anti-malware today?',
      options: [
        'Antivirus only works on servers',
        'They are effectively the same software on modern systems, included with many operating systems',
        'Anti-malware replaces the need for patching',
        'Antivirus is obsolete and no longer used',
      ],
      correct: 1,
      why: 'Laut Video sind Antivirus und Anti-Malware heute praktisch dieselbe Software und bei vielen Betriebssystemen bereits enthalten.',
    },
    {
      q: 'What is NetFlow used for?',
      options: [
        'Encrypting traffic between routers',
        'Blocking malicious websites',
        'Monitoring traffic flows and gathering statistics about application use on the network',
        'Assigning IP addresses to clients',
      ],
      correct: 2,
      why: 'NetFlow ist laut Video ein Standard, um Traffic-Flows zu beobachten und Statistiken zur Anwendungsnutzung zu sammeln — über Agents, Management-Stationen oder Hardware.',
    },
    {
      q: 'Why is SCAP useful when a NGFW, an IPS, and a vulnerability scanner all detect issues?',
      options: [
        'It disables two of the three overlapping tools',
        'It converts every alert into an email notification',
        'It doubles the vulnerability scan frequency',
        'It lets all tools identify the same vulnerability as one finding, not three different ones',
      ],
      correct: 3,
      why: 'Verschiedene Tools finden laut Video dieselbe Schwachstelle; SCAP sorgt dafür, dass sie überall einheitlich als dieselbe Schwachstelle identifiziert wird.',
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
    {
      q: 'What happens to traffic that matches no rule in a firewall configured with implicit deny, per the video?',
      options: [
        'It is automatically dropped once it reaches the bottom of the rule base',
        'It is automatically allowed through by default',
        'It is queued indefinitely for manual review',
        'Implicit deny only applies to outbound traffic, never inbound',
      ],
      correct: 0,
      why: 'Bei Implicit Deny wird laut Video jeglicher Traffic, der keine Regel trifft, am Ende der Regelliste automatisch verworfen.',
    },
    {
      q: 'In the video’s example firewall rule base, which protocol/port combination is explicitly denied?',
      options: [
        'ICMP (commonly used for ping)',
        'TCP port 443 (HTTPS)',
        'TCP port 22 (SSH)',
        'UDP port 53 (DNS)',
      ],
      correct: 0,
      why: 'Im gezeigten Regelwerk ist laut Video eingehender ICMP-Verkehr (z. B. Ping) explizit verweigert, während SSH, HTTPS und DNS erlaubt sind.',
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
    {
      q: 'Which protocol pair does the video contrast as insecure Telnet vs. its secure replacement?',
      options: [
        'Telnet in the clear vs. SSH, its encrypted replacement',
        'Telnet vs. SMTP, an unrelated mail protocol',
        'Telnet vs. ICMP, a diagnostic protocol',
        'Telnet vs. ARP, an address resolution protocol'],
      correct: 0,
      why: 'Statt des unverschlüsselten Telnet empfiehlt das Video SSH für den sicheren Fernzugriff auf die Konsole.',
    },
    {
      q: 'Why can’t you assume traffic on port 443 is automatically secure, per the video?',
      options: [
        'A port number alone doesn’t guarantee encryption — you need to verify server settings and ideally confirm via packet capture',
        'Port 443 always means the traffic is unencrypted',
        'Port numbers automatically enforce encryption regardless of configuration',
        'Port selection has no relationship to protocol security',
      ],
      correct: 0,
      why: 'Laut Video ist eine Portnummer allein keine Garantie für Verschlüsselung — Servereinstellungen prüfen und ggf. per Paketmitschnitt bestätigen.',
    },
    {
      q: 'Which network-level transport method does the video mention for encrypting traffic regardless of whether the application itself supports encryption?',
      options: [
        'A VPN, creating an encrypted tunnel to a concentrator',
        'Increasing the MTU size',
        'Switching from IPv4 to a longer subnet mask',
        'Disabling DNS resolution',
      ],
      correct: 0,
      why: 'Laut Video kann ein VPN den gesamten Datenverkehr auf Netzwerkebene verschlüsseln, unabhängig davon, ob die einzelne Anwendung selbst Verschlüsselung unterstützt.',
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
    {
      q: 'What belongs in incident response preparation before any incident occurs?',
      options: [
        'Contact lists, a hardware/software "go bag", documentation, and known-good images',
        'A retained list of external litigation lawyers',
        'A standing policy to disconnect the network at the first sign of trouble',
        'A rotating schedule for deleting old log files',
      ],
      correct: 0,
      why: 'Preparation umfasst laut Video Kommunikationswege/Kontaktlisten, ein Go-Bag mit Werkzeugen, Doku (Netzpläne, Baselines, File-Hashes), Known-Good-Images und feste Richtlinien.',
    },
    {
      q: 'Why is detecting a real security incident difficult?',
      options: [
        'Because log files never contain attack traces',
        'Internet-facing systems are attacked constantly, so real compromises must be separated from background scan noise',
        'Because attackers always announce themselves',
        'Because IPS devices cannot generate alerts',
      ],
      correct: 1,
      why: 'Laut Video prasseln ständig automatisierte Angriffe auf vernetzte Systeme ein — die Kunst ist zu erkennen, ob nur ein Skript scannt oder ein echter Einbruch gelungen ist.',
    },
    {
      q: 'What does the video recommend once an active attack is discovered?',
      options: [
        'Wait and observe what the attacker does next',
        'Immediately inform the press',
        'Stop the attack as quickly as possible — do not wait to see what the attacker might do; suspicious code can be isolated in a sandbox',
        'Shut down the entire company network for a week',
      ],
      correct: 2,
      why: 'Containment laut Video: Angriff so schnell wie möglich stoppen statt zuzusehen; Malware kann isoliert in einer Sandbox analysiert werden (wobei manche Malware Sandboxes erkennt).',
    },
    {
      q: 'Which steps remove the attacker’s foothold after containment?',
      options: [
        'Renaming the affected servers and rebooting them',
        'Changing the company logo on the incident report',
        'Buying new monitors for the security operations center',
        'Removing malware or reimaging, disabling breached accounts, and fixing exploited vulnerabilities',
      ],
      correct: 3,
      why: 'Laut Video: Schadsoftware entfernen bzw. neu aufsetzen, kompromittierte/angelegte Konten deaktivieren und die ausgenutzten Schwachstellen schließen, damit der Angreifer nicht zurückkommt.',
    },
    {
      q: 'What happens in the post-incident ("lessons learned") meeting?',
      options: [
        'The team reviews the timeline and process, and improves plans and monitoring for next time',
        'The incident is deleted from all internal records',
        'Blame is publicly assigned to one team member',
        'New replacement hardware is unboxed and installed',
      ],
      correct: 0,
      why: 'Das Post-Incident-Meeting klärt laut Video Ablauf und Timeline, prüft ob der Plan funktioniert hat und ob Indikatoren übersehen wurden — möglichst zeitnah, solange die Erinnerung frisch ist.',
    },
    {
      q: 'Why must incident response training happen before an incident?',
      options: [
        'Because trainers are cheaper in advance',
        'Once an incident is live on the network, it is too late for on-the-job training — everyone must already know the documented procedures',
        'Because insurance requires certificates',
        'Because attackers only strike untrained teams',
      ],
      correct: 1,
      why: 'Laut Video gilt: Läuft der Vorfall bereits, ist On-the-Job-Training zu spät. Doku und Prozesse müssen vorher trainiert und getestet sein — das kostet, spart im Ernstfall aber Geld.',
    },
    {
      q: 'A workstation is actively encrypting a shared drive and contacting an unknown command server. What should the analyst do first?',
      options: [
        'Isolate the workstation from the network while preserving evidence',
        'Restore the workstation from backup before disconnecting it',
        'Delete every log entry related to the workstation',
        'Wait for the encryption to finish so the full impact is known',
      ],
      correct: 0,
      why: 'Bei einem aktiven Angriff kommt zuerst Containment: das System isolieren, weitere Ausbreitung stoppen und Beweise erhalten. Wiederherstellung folgt erst nach Analyse und Eradication.',
    },
    {
      q: 'After containment, responders find a web shell, a persistence account, and the exploited unpatched service. Which action represents eradication?',
      options: [
        'Remove the web shell and account, patch the service, and verify persistence is gone',
        'Reconnect the host without changing it',
        'Notify users that service is fully restored',
        'Archive the incident ticket without validating the host',
      ],
      correct: 0,
      why: 'Eradication entfernt Schadsoftware und Persistenz und schließt die ausgenutzte Schwachstelle. Erst danach kann die kontrollierte Recovery beginnen.',
    },
    {
      q: 'A rebuilt server has passed malware scans and the exploited vulnerability is patched. Which next action is part of recovery?',
      options: [
        'Return it to production in a controlled manner and monitor for recurrence',
        'Create a new attacker persistence account for testing',
        'Destroy all incident evidence before reconnecting it',
        'Skip validation because the operating system was reinstalled',
      ],
      correct: 0,
      why: 'Recovery stellt den Dienst kontrolliert wieder her, validiert den sicheren Zustand und überwacht auf erneute Auffälligkeiten.',
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
    {
      q: 'Where can you find application log data on Windows and Linux systems?',
      options: [
        'Windows Event Viewer (application log) and the /var/log directory on Linux',
        'Only inside the application installation folder',
        'In the firewall rule base',
        'In the DNS zone files',
      ],
      correct: 0,
      why: 'Das Video nennt den Application-Teil des Windows Event Viewer und /var/log unter Linux/macOS als Quellen; von dort wandern die Logs typischerweise ins SIEM.',
    },
    {
      q: 'Which details do endpoint logs on laptops, desktops, or phones typically include?',
      options: [
        'Only network routing tables',
        'Logon/logoff events, running processes, password changes or lockouts, and directory service information',
        'Only antivirus signature versions',
        'The physical location of the device',
      ],
      correct: 1,
      why: 'Endgeräte protokollieren laut Video u. a. An-/Abmeldungen, Systemereignisse/Prozesse, Verwaltungsvorgänge wie Passwortänderungen/Sperrungen und Directory-Services-Details.',
    },
    {
      q: 'How can OS security logs give you an early warning of an attack?',
      options: [
        'They show the attacker’s real name',
        'They block malicious traffic automatically',
        'They replace the need for a SIEM',
        'An unexpected event, such as a service being disabled that no admin would normally disable, can trigger a security alert',
      ],
      correct: 3,
      why: 'Beispiel aus dem Video: Ein Security-Log zeigt einen deaktivierten Dienst, den kein Admin normalerweise abschalten würde — genau so ein Eintrag kann einen Alarm auslösen, bevor mehr passiert.',
    },
    {
      q: 'Which fields appear in an IPS log entry such as one from Snort?',
      options: [
        'Timestamp, alert class (e.g., SYN flood DoS), priority, and source/destination IP addresses and ports',
        'Username, password hash, and session cookie',
        'Only the number of blocked packets per day',
        'The full packet payload in plain text',
      ],
      correct: 0,
      why: 'Der gezeigte Snort-Eintrag enthält Zeitstempel, Alert-Klasse (möglicher DoS/SYN-Flood), Priorität sowie Quell-/Ziel-IP und Ports — heute oft als Funktion einer NGFW.',
    },
    {
      q: 'Which devices produce the network infrastructure logs described in the video?',
      options: [
        'Only end-user workstations',
        'Printers and scanners',
        'Switches, routers, wireless access points, and VPN concentrators',
        'Smart cards and badge readers',
      ],
      correct: 2,
      why: 'Netzwerk-Logs stammen laut Video von Switches, Routern, Access Points und VPN-Konzentratoren — sie zeigen z. B. Routing-Tabellen-Änderungen oder Authentifizierungsfehler.',
    },
    {
      q: 'Which findings does the video mention in vulnerability scan output?',
      options: [
        'The current market resale value of each scanned server',
        'Missing firewalls/antivirus, open shares, enabled guest access, and unpatched known vulnerabilities',
        'The encrypted session keys used by the VPN tunnel',
        'A plaintext list of all employee passwords',
      ],
      correct: 1,
      why: 'Der Scan-Report im Video zeigt fehlende Schutzsoftware, Fehlkonfigurationen (offene Shares, Gastzugang) und veraltete/ungepatchte Systeme mit bekannten Schwachstellen.',
    },
    {
      q: 'What common stumbling block does the video describe with automated SIEM reports?',
      options: [
        'Reports cannot be scheduled',
        'SIEMs cannot export report data',
        'Reports are only available on paper',
        'Reports get generated but are simply ignored — and overly broad reports cost significant processing time',
      ],
      correct: 3,
      why: 'Laut Video werden automatische Reports oft ungelesen ignoriert; zudem kostet die Erstellung bei terabytegroßen SIEM-Datenbeständen viel Rechenzeit, daher Reports gezielt definieren.',
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
    {
      q: 'What does the video recommend doing with a departing user’s account during offboarding, rather than deleting it immediately?',
      options: [
        'Disabling it, in case encrypted files or other data need to be retrieved later',
        'Deleting it immediately with no further consideration',
        'Leaving it fully active indefinitely for convenience',
        'Transferring it automatically to a random other employee',
      ],
      correct: 0,
      why: 'Laut Video sollte ein Konto beim Offboarding deaktiviert, nicht sofort gelöscht werden — sonst könnten wichtige Entschlüsselungsschlüssel oder Daten verloren gehen.',
    },
    {
      q: 'How does governance differ for a public-sector (government) organization, per the video?',
      options: [
        'Legal, administrative, and political issues dominate, and meetings tend to be open to the public since the agency serves the public',
        'Government entities have no governance requirements at all',
        'Government governance is identical to private-sector governance in every respect',
        'Government agencies never need committees or boards',
      ],
      correct: 0,
      why: 'Bei Behörden dominieren laut Video rechtliche, administrative und politische Fragen, und Sitzungen sind meist öffentlich, da die Behörde im Dienst der Bürger steht.',
    },
    {
      q: 'What is the difference between centralized and decentralized governance, per the video?',
      options: [
        'Centralized governance has one group making decisions for the whole organization; decentralized spreads decisions to others, including those doing the actual work',
        'Centralized governance means no decisions are ever documented',
        'Decentralized governance requires a single board with absolute authority',
        'There is no meaningful difference between the two models',
      ],
      correct: 0,
      why: 'Bei zentralisierter Governance trifft laut Video eine Gruppe die Entscheidungen für die ganze Organisation; bei dezentralisierter Governance verteilen sich Entscheidungen auf mehr Personen, teils bis zur ausführenden Ebene.',
    },
    {
      q: 'Why does the video say playbooks and processes must be continuously monitored and revised?',
      options: [
        'Attackers constantly find new ways in, so playbooks, processes, and procedures need to account for emerging threats and new technology',
        'Once written, playbooks never need to change again',
        'Monitoring and revision only applies once every ten years',
        'Revision is unnecessary as long as no incident has occurred yet',
      ],
      correct: 0,
      why: 'Da Angreifer laut Video ständig neue Wege finden, müssen Playbooks, Prozesse und Verfahren fortlaufend überwacht und an neue Bedrohungen/Technologien angepasst werden.',
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
        'Knowing the office evacuation routes and assembly points by heart',
        'Always watching for threats like phishing links, odd URLs, or a mailed USB drive',
        'Monitoring the server room temperature and humidity around the clock',
        'Reading the security news every morning before opening any email',
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
    {
      q: 'Where does the video recommend making security policies accessible to users?',
      options: [
        'On the intranet and in every employee handbook',
        'Policies should be kept secret from regular employees',
        'Only posted once on a single bulletin board and never referenced again',
        'Only shared verbally during onboarding, never in writing',
      ],
      correct: 0,
      why: 'Laut Video sollten Sicherheitsrichtlinien im Intranet und im Mitarbeiterhandbuch dokumentiert und für alle zugänglich sein.',
    },
    {
      q: 'How can organizations administratively enforce password requirements, per the video’s Windows example?',
      options: [
        'Using group policy to force minimum length and complexity requirements',
        'Password requirements cannot be enforced technically, only requested verbally',
        'Only individual users can decide their own password rules',
        'Group policy has no relationship to password enforcement',
      ],
      correct: 0,
      why: 'In einer Windows-Umgebung lassen sich laut Video Mindestlänge und Komplexität per Gruppenrichtlinie technisch erzwingen.',
    },
    {
      q: 'What does the video warn about regarding cables when working remotely?',
      options: [
        'Users should not use any random cable found to charge a mobile device, since it could be a security risk',
        'Cables pose no security risk of any kind',
        'Only USB drives are a risk, cables are always safe',
        'Charging cables cannot transmit data under any circumstances',
      ],
      correct: 0,
      why: 'Laut Video sollten Nutzer außerhalb des Büros keine beliebig gefundenen Kabel zum Laden nutzen — ein bekanntes Risiko für Datenabgriff/Malware.',
    },
    {
      q: 'What should user training accomplish regarding social engineering, per the video?',
      options: [
        'Familiarize users with common techniques so they can identify, understand, and report social engineering to IT security',
        'Training should convince users that social engineering never happens',
        'Only IT staff need social engineering training, never other employees',
        'Social engineering awareness has no reporting component',
      ],
      correct: 0,
      why: 'Laut Video sollen Nutzer gängige Social-Engineering-Techniken erkennen, verstehen und dem IT-Sicherheitsteam melden können.',
    },
    {
      q: 'What does the video mean by encouraging users to have "operational security" awareness?',
      options: [
        'Interpreting security from the attacker’s perspective and understanding what data is sensitive',
        'Operational security only concerns physical building locks',
        'It means users should ignore all security training',
        'It only applies to system administrators, never regular users',
      ],
      correct: 0,
      why: 'Operational Security bedeutet laut Video, Sicherheit aus Angreiferperspektive zu betrachten und zu wissen, welche Daten besonders schützenswert sind.',
    },
    {
      q: 'What additional security concerns does the video mention for remote/hybrid workers?',
      options: [
        'Ensuring family/friends don’t access work systems, adding endpoint security, and increasing VPN security',
        'Remote work introduces no additional security concerns',
        'Remote workers should never use a VPN',
        'Only office-based employees need any security training',
      ],
      correct: 0,
      why: 'Laut Video braucht Remote-/Hybridarbeit zusätzliche Vorkehrungen: kein Familienzugriff auf Arbeitsgeräte, mehr Endpoint-Sicherheit und stärkere VPN-Absicherung.',
    },
    {
      q: 'What does the video describe as the first response when a user clicks a phishing link or shows risky behavior for the first time?',
      options: [
        'Address it with user training to make them aware, so the issue doesn’t recur',
        'Immediately terminate the employee',
        'Ignore the first occurrence entirely with no action',
        'Disable all of their accounts permanently',
      ],
      correct: 0,
      why: 'Beim ersten Vorfall setzt das Video auf gezieltes Nutzertraining, damit das Problem sich nicht wiederholt.',
    },
    {
      q: 'What does the video suggest if monitoring shows the same security event recurring for a user?',
      options: [
        'It points toward the need for extended training or changed security configurations for that user',
        'Recurring events should always be ignored as statistical noise',
        'Only a single training session is ever offered, regardless of recurrence',
        'Recurring events automatically result in immediate account deletion',
      ],
      correct: 0,
      why: 'Wiederholte Vorfälle deuten laut Video darauf hin, dass zusätzliches Training oder angepasste Sicherheitseinstellungen für diesen Nutzer nötig sind.',
    },
    {
      q: 'What is the security awareness team responsible for developing, per the video?',
      options: [
        'Training materials for IT security, including customized training for specific job functions or compliance needs',
        'Only the company’s annual budget',
        'The awareness team never creates any training content',
        'Only hardware procurement plans',
      ],
      correct: 0,
      why: 'Das Security-Awareness-Team entwickelt laut Video Schulungsmaterialien — teils individuell zugeschnitten auf Jobfunktion oder Compliance-Anforderungen.',
    },
    {
      q: 'How does the security awareness team execute and evaluate its training, per the video?',
      options: [
        'They present training online or in person and track detailed metrics to correlate training efforts with overall security',
        'Training is presented once with no follow-up metrics ever collected',
        'Execution only means printing posters, with no measurement of effect',
        'Metrics are never tied back to the organization’s overall security',
      ],
      correct: 0,
      why: 'Laut Video wird Training online oder vor Ort durchgeführt und mit Metriken verknüpft, um den Effekt auf die Gesamtsicherheit nachvollziehen zu können.',
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
    {
      q: 'Who makes the final decision on whether a proposed change is allowed, per the video?',
      options: [
        'The end user requesting the change',
        'The change control board, after analyzing the risk of making versus not making the change',
        'Whoever submits the change control form first',
        'The IT help desk automatically approves all requests',
      ],
      correct: 1,
      why: 'Laut Video wägt das Change-Control-Board das Risiko einer Änderung gegen das Risiko des Nichthandelns ab und trifft dann die Freigabeentscheidung.',
    },
    {
      q: 'What role does the "owner" of an application or data play in the change process, per the video?',
      options: [
        'They personally write and deploy the technical change',
        'They initiate and manage the process, stay informed, and test the result — without necessarily making the change themselves',
        'They have no role once the change request is submitted',
        'They approve every other department’s changes as well',
      ],
      correct: 1,
      why: 'Der Owner stößt laut Video den Change an und verwaltet den Prozess, macht die technische Änderung aber meist nicht selbst — und testet hinterher, ob alles funktioniert.',
    },
    {
      q: 'What must a change control board weigh according to the video’s impact analysis step?',
      options: [
        'Only the cost of the change itself',
        'The risks of making the change (e.g., breaking something) against the risks of not making it (e.g., an unpatched vulnerability)',
        'Whether the change is popular with employees',
        'Nothing — impact analysis is optional',
      ],
      correct: 1,
      why: 'Laut Video muss abgewogen werden: Risiko durch die Änderung (z. B. Systemausfall) gegen Risiko durch Unterlassen (z. B. offene Schwachstelle bleibt ausnutzbar).',
    },
    {
      q: 'What does the video recommend doing once a change has been implemented?',
      options: [
        'Immediately move on to the next change without checking',
        'Have users try their systems and confirm the change works without problems',
        'Delete the change documentation',
        'Wait exactly one year before verifying anything',
      ],
      correct: 1,
      why: 'Nach der Umsetzung sollen laut Video Nutzer ihre Systeme testen und bestätigen, dass die Änderung ohne Probleme funktioniert.',
    },
    {
      q: 'Why do organizations schedule changes for specific maintenance windows, per the video?',
      options: [
        'To make changes during non-production hours and minimize impact on active users',
        'Maintenance windows are purely a legal requirement with no operational purpose',
        'To guarantee that changes never cause any downtime',
        'Because change control boards only meet once a year',
      ],
      correct: 0,
      why: 'Laut Video werden Änderungen bevorzugt außerhalb der Hauptnutzungszeiten geplant — teils sind Systeme in Stoßzeiten (z. B. Einzelhandel um die Feiertage) sogar komplett eingefroren.',
    },
    {
      q: 'How does the video describe the change control process’s relationship to standard operating procedure?',
      options: [
        'It is undocumented and known only to senior IT staff',
        'It should be well documented, readable by anyone in the company on the intranet, and updated over time as the organization improves it',
        'It never changes once written',
        'It applies only to the IT department, not other business units',
      ],
      correct: 1,
      why: 'Laut Video ist der Change-Control-Prozess dokumentierter Standard, den jeder im Unternehmen einsehen kann — und er wird laufend an die Bedürfnisse der Organisation angepasst.',
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
        'One update requires other components to be changed first, possibly on other systems',
        'The financial budget that must be approved before a change window is scheduled',
        'The number of users whose applications are affected during the change window',
        'The vendor support contracts that must stay valid while changes are implemented',
      ],
      correct: 0,
      why: 'Abhängigkeiten verketten Änderungen: Erst muss Dienst/Version A aktualisiert sein, dann funktioniert Update B — auch systemübergreifend (erst alle Firewalls, dann die Managementsoftware).',
    },
    {
      q: 'What is the difference between an allow list and a deny list, per the video?',
      options: [
        'An allow list permits only named applications to run; a deny list permits everything except the named applications',
        'They are two names for exactly the same restriction',
        'A deny list only applies to network traffic, never applications',
        'An allow list blocks every application without exception',
      ],
      correct: 0,
      why: 'Eine Allow-Liste lässt laut Video ausschließlich benannte Anwendungen zu; eine Deny-Liste (z. B. Antivirus) blockiert nur die explizit genannten und erlaubt sonst alles.',
    },
    {
      q: 'How can a technician restart just a service instead of rebooting the whole system, per the video?',
      options: [
        'It is never possible to restart just a service',
        'Via Windows Services/Task Manager on Windows, or restarting a daemon on Linux',
        'Only by physically powering the device off and on',
        'By reinstalling the entire operating system',
      ],
      correct: 1,
      why: 'Laut Video reicht oft ein Neustart über Windows-Dienste/Task-Manager oder eines Linux-Daemons — schneller als ein kompletter Systemneustart.',
    },
    {
      q: 'Why might users need to fully log out and restart an application after an update, per the video?',
      options: [
        'Because updated executables only take effect once the app is closed and reopened',
        'Restarting an application is never required after an update',
        'Because the operating system must always be reinstalled first',
        'Because passwords automatically expire after updates',
      ],
      correct: 0,
      why: 'Wird eine ausführbare Datei aktualisiert, muss die Anwendung laut Video komplett geschlossen und neu gestartet werden, damit die neue Version greift.',
    },
    {
      q: 'What challenge does the video highlight about changing legacy applications?',
      options: [
        'Legacy applications are always trivial to update',
        'They often run on unsupported vendor code with nobody in the organization understanding how they work, making documentation essential before changing them',
        'Legacy applications never need any change control',
        'Legacy applications are automatically replaced every year',
      ],
      correct: 1,
      why: 'Legacy-Apps laufen laut Video oft ohne Herstellersupport und ohne internes Know-how — erst Dokumentation bringt sie in den normalen Support-Zyklus zurück.',
    },
    {
      q: 'Why must network diagrams be updated as part of the change process, per the video?',
      options: [
        'Diagrams are purely decorative and rarely referenced',
        'Frequent changes make existing documentation quickly outdated without an ongoing update process',
        'Diagrams only need updating once, at initial network setup',
        'Diagrams are automatically generated and never need manual updates',
      ],
      correct: 1,
      why: 'Da Änderungen laut Video oft wöchentlich oder täglich vorkommen, veraltet Dokumentation schnell — Diagramme müssen laufend aktualisiert werden.',
    },
    {
      q: 'What kind of documentation update does the video mention alongside diagrams?',
      options: [
        'Listing new processes or procedures for a newly upgraded application',
        'Deleting all previous procedure documents',
        'Only updating the company logo',
        'Documentation of procedures is never required',
      ],
      correct: 0,
      why: 'Neben Diagrammen nennt das Video auch neue Prozess-/Verfahrensbeschreibungen für neu aktualisierte Anwendungen als Teil der Doku-Pflicht.',
    },
    {
      q: 'What does version control let IT teams do, per the video?',
      options: [
        'Track changes such as router configs or registry changes over time, and revert to a previous version if there are problems',
        'Automatically approve every change without review',
        'Delete all history of previous configurations',
        'Replace the need for a change control board entirely',
      ],
      correct: 0,
      why: 'Versionskontrolle erlaubt laut Video, Änderungen (Router-Configs, Patches, Registry) nachzuvollziehen und bei Problemen zu einer vorherigen Version zurückzukehren.',
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
        'Real-time video streaming and content delivery for large media platforms',
        'Selecting the least congested wireless channels in dense Wi-Fi deployments',
        'Payment processing, digital identification, supply chain monitoring, digital voting',
        'Compressing backup archives so they can be verified faster after transfer',
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
    {
      q: 'What makes blockchain an "open public ledger," according to the video?',
      options: [
        'Only one central server maintains the ledger',
        'Everyone participating maintains their own copy of the ledger, and changes are distributed to all participants',
        'The ledger is deleted after every transaction',
        'Only government agencies may view the ledger',
      ],
      correct: 1,
      why: 'Laut Video führt jeder Teilnehmer eine eigene Kopie des Ledgers, und Änderungen werden an alle Teilnehmer verteilt — daher „öffentlich verteilt".',
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
    {
      q: 'The video’s example of an attacker claiming to be the "vice president for finance" illustrates the technique behind business email compromise. What is the attacker exploiting?',
      options: [
        'The victim’s assumption that someone introducing themselves as a higher-ranking employee should be trusted without question',
        'A software vulnerability in the email server',
        'A weak Wi-Fi password',
        'An outdated antivirus signature',
      ],
      correct: 0,
      why: 'Das Video zeigt Impersonation eines ranghöheren Mitarbeiters (z. B. VP Finance), damit das Opfer ohne Nachzudenken Informationen preisgibt — genau dieses Muster nutzt Business Email Compromise per E-Mail aus.',
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
        'It only ran on weekends, when the banks’ security teams were out of office',
        'It used no malicious software at all, only social engineering over the phone',
        'It was announced beforehand in hacking forums, but nobody took it seriously',
        'The malicious JavaScript was served only to IP addresses of specific banks',
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
    {
      q: 'How does brand impersonation work as a social engineering technique, per the video?',
      options: [
        'Attackers create many sites using a recognizable brand name so search engines index them, redirecting searchers to malicious lookalike sites',
        'Attackers only impersonate government agencies, never companies',
        'Brand impersonation requires physical access to the brand’s headquarters',
        'Brand impersonation is limited to television advertisements',
      ],
      correct: 0,
      why: 'Laut Video erstellen Angreifer massenhaft Seiten mit bekannten Markennamen, die von Google indexiert werden — Suchende landen so auf gefälschten Seiten mit Schadsoftware.',
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
        'Because modern memory is always encrypted, so overflowed bytes stay unreadable',
        'Because it requires physical access to the machine running the application',
        'Because antivirus software reliably detects every attempted memory overflow',
        'Random extra data usually just crashes the app — a repeatable, useful overflow is rare',
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
        'A benchmark where two CPUs compete to finish the same workload first',
        'A measurement of how quickly packets travel between two network endpoints',
        'Two events happen nearly simultaneously and the application does not expect that',
        'A disk error that appears when defragmentation runs during a backup job',
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
        'The Mars rover Spirit reboot loop and a Tesla TOCTOU exploit at Pwn2Own',
        'The Morris worm outbreak and the Stuxnet attack on industrial centrifuges',
        'The Heartbleed OpenSSL bug and the Shellshock vulnerability in bash',
        'The Ariane 5 rocket failure and the Y2K date rollover problem worldwide',
      ],
      correct: 0,
      why: 'Spirit hing 2004 wegen eines Dateisystemfehlers in einer Reboot-Schleife; beim Pwn2Own 2023 brachte ein TOCTOU-Angriff über Bluetooth Root-Rechte auf dem Tesla-Infotainment — 100.000 $ Prämie plus Auto.',
    },
    {
      q: 'What does the "time-of-check" step in a TOCTOU vulnerability involve, per the video?',
      options: [
        'The application checks the system to retrieve a stored value',
        'The application immediately deletes the value',
        'The application encrypts the value before use',
        'The application ignores the value entirely',
      ],
      correct: 0,
      why: 'Time-of-Check ist laut Video der Moment, in dem die Anwendung einen gespeicherten Wert abfragt — bevor sie ihn tatsächlich verwendet.',
    },
    {
      q: 'Why does the gap between time-of-check and time-of-use cause a race condition, per the video’s bank account example?',
      options: [
        'Because the value may change between the check and its actual use, and the app doesn’t account for that (e.g., a withdrawal not yet reflected)',
        'Because encryption always fails during time-of-use',
        'Because the CPU cannot process two requests at once, ever',
        'Because time-of-use only applies to physical hardware',
      ],
      correct: 0,
      why: 'Im Bankbeispiel des Videos wird ein Kontostand geprüft, bevor eine spätere Abbuchung berücksichtigt ist — der Wert ändert sich zwischen Prüfung und Nutzung, was zur Race Condition führt.',
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
        'They compress the update file so it downloads faster from the mirror',
        'They hide the update contents from attackers until installation begins',
        'They make updates install faster by skipping usual compatibility checks',
        'The OS validates the developer’s signature before installing the update',
      ],
      correct: 3,
      why: 'Viele Betriebssysteme installieren nur signierte Software: Die Signatur stammt vom Entwickler, das OS prüft sie — hohes Vertrauen, dass das Update legitim ist. App-interne Updater prüfen das automatisch.',
    },
    {
      q: 'Why is the SolarWinds Orion incident (December 2020) so instructive?',
      options: [
        'The update servers were offline for weeks, so nobody received patches',
        'A normal-looking, digitally signed update carried code planted by attackers',
        'Users had ignored the update for years, leaving old vulnerabilities open',
        'The malware only affected home users and never reached large networks',
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
        'It voids the manufacturer warranty as soon as you uninstall any of it',
        'It changes the desktop wallpaper and resets personal browser settings',
        'It blocks operating system updates until every bundled app is registered',
        'It wastes storage, may auto-start, and every extra app can carry vulnerabilities',
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
        'A certificate that auditors issue after completing a security review',
        'Evidence of a likely breach, such as unusual traffic or changed file hashes',
        'A list of all patches that are currently missing from a monitored system',
        'The severity score a scanner assigns to a newly published vulnerability',
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
        'A user logging in while on vacation without notifying the security team',
        'A login that succeeds without any password thanks to cached credentials',
        'Two failed logins in a row followed by a successful third attempt',
        'Logins from places too far apart to travel between in the elapsed time',
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
    {
      q: 'What makes an account lockout a strong indicator of compromise, per the video?',
      options: [
        'It occurs even though the account owner made no login attempts, or was administratively disabled by someone else',
        'Account lockouts always happen once a year automatically',
        'Account lockouts never involve the help desk',
        'Locked accounts are always immediately deleted',
      ],
      correct: 0,
      why: 'Besonders verdächtig ist es laut Video, wenn eine Sperre eintritt, obwohl der Nutzer selbst keine Anmeldeversuche unternommen hat — oder wenn das Konto administrativ deaktiviert wurde, ohne dass jemand intern dafür verantwortlich war.',
    },
    {
      q: 'What does the video’s "impossible travel" example illustrate about concurrent session usage?',
      options: [
        'A login from Nebraska followed minutes later by a login from Australia for the same account is physically implausible and worth alerting on',
        'Concurrent logins from different devices are always malicious',
        'Impossible travel only applies to physical security badges',
        'Concurrent sessions are impossible to detect in logs',
      ],
      correct: 0,
      why: 'Das Video beschreibt einen Login aus Nebraska, gefolgt von einem Login aus Australien wenige Minuten später — physikalisch nicht plausibel und ein klarer Alarmgrund.',
    },
    {
      q: 'How can blocked content be an indicator of compromise, per the video?',
      options: [
        'Malware often disables updates, so being unable to reach security websites or download patches can signal an active infection',
        'Blocked content always means the firewall is working perfectly with no concerns',
        'Blocked content only ever refers to parental controls',
        'Blocked content cannot be logged or investigated',
      ],
      correct: 0,
      why: 'Laut Video deaktiviert Malware oft Updates — kannst du plötzlich keine Security-Websites oder Patches mehr erreichen, kann das ein Hinweis auf eine aktive Infektion sein.',
    },
    {
      q: 'What unusual pattern in resource consumption does the video flag as an indicator of compromise?',
      options: [
        'A sudden spike in network traffic at an unusual time, such as 3 a.m., possibly indicating data exfiltration',
        'Consistent, predictable resource usage throughout business hours',
        'Resource consumption is never useful for detecting compromise',
        'Only CPU temperature counts as a resource consumption indicator',
      ],
      correct: 0,
      why: 'Laut Video kann ein plötzlicher Traffic-Anstieg zu unüblichen Zeiten (z. B. 3 Uhr morgens) auf Datenexfiltration hindeuten.',
    },
    {
      q: 'Which scenarios does the video give as resource inaccessibility potentially indicating compromise?',
      options: [
        'A server crashing while an attacker probes for a vulnerability, or files suddenly encrypted by ransomware',
        'A server being rebooted for scheduled monthly patching',
        'Resource inaccessibility is always harmless and needs no investigation',
        'A printer running out of paper',
      ],
      correct: 0,
      why: 'Beispiele im Video: Ein Server stürzt ab, während ein Angreifer nach einer Schwachstelle sucht, oder Dateien sind plötzlich durch Ransomware verschlüsselt und unzugänglich.',
    },
    {
      q: 'What is out-of-cycle logging, per the video?',
      options: [
        'Log entries showing activity (e.g., patch installs) occurring outside the normal, expected schedule',
        'Logs that are rotated every 24 hours automatically',
        'Logging that only occurs during business hours',
        'A log format that uses a different character encoding',
      ],
      correct: 0,
      why: 'Out-of-Cycle Logging bedeutet laut Video, dass Log-Einträge (z. B. Patch-Installationen) zu Zeiten auftauchen, die außerhalb des bekannten, erwarteten Zeitplans liegen.',
    },
    {
      q: 'What does the video describe as one of the clearest indicators of compromise?',
      options: [
        'Private organizational data suddenly appearing publicly available on the internet',
        'An employee publishing an internal newsletter',
        'A vendor documenting their own product roadmap',
        'A server publishing its uptime statistics internally',
      ],
      correct: 0,
      why: 'Laut Video ist es ein sehr klarer Kompromittierungshinweis, wenn private Unternehmensdaten plötzlich öffentlich im Internet auftauchen — oft im Zusammenhang mit Ransomware-Erpressung.',
    },
    {
      q: 'Why do attackers often delete log entries, per the video?',
      options: [
        'To hide the fact that they were ever on that system, which is why missing logs themselves become a suspicious signal',
        'Deleting logs improves system performance with no security relevance',
        'Log deletion is a routine, scheduled maintenance task with no security meaning',
        'Attackers cannot access or modify logs',
      ],
      correct: 0,
      why: 'Angreifer löschen laut Video Log-Einträge, um ihre Spuren zu verwischen — deshalb sind fehlende, erwartete Logs selbst ein Alarmsignal, das man aktiv überwachen sollte.',
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
        'A pure VPN concentrator appliance that offers no firewall features at all',
        'A cloud-only firewall service that requires no on-premises hardware',
        'A dedicated appliance that stores and analyzes log files from the network',
        'An all-in-one security box whose performance drops as more features are enabled',
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
        'To accelerate web page loading by caching static content close to users',
        'To encrypt all HTTP traffic between the browser and the application server',
        'To analyze input to web applications and block attacks like SQL injection',
        'To host redundant copies of websites across multiple geographic regions',
      ],
      correct: 2,
      why: 'Ein WAF prüft die Eingaben in Web-Apps (HTTP/HTTPS) und blockt z. B. SQL-Injections vor dem Applikationsserver — PCI DSS schreibt WAFs für Kreditkarten-Anwendungen vor; oft läuft er neben einem NGFW.',
    },
    {
      q: 'What is the key difference between traditional and next-generation firewalls in terms of OSI layers?',
      options: [
        'Traditional firewalls filter at layer 4 (ports); next-generation firewalls can filter at layer 7 (application)',
        'Both operate exclusively at layer 2',
        'Next-generation firewalls only work at layer 1 (physical)',
        'Layer 4 firewalls can identify individual applications by name',
      ],
      correct: 0,
      why: 'Traditionelle Firewalls arbeiten laut Video auf Layer 4 (TCP/UDP-Port), Next-Gen-Firewalls zusätzlich auf Layer 7 (Anwendungsebene) — sie erkennen z. B. Twitter vs. YouTube unabhängig vom Port.',
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
    {
      q: 'What does an ideal failover test look like, per the video?',
      options: [
        'Users notice the switch and must manually reconnect',
        'The failover happens automatically and users are redirected behind the scenes without noticing',
        'The test requires shutting down the entire production network for a week',
        'Failover tests are never performed on live redundant systems',
      ],
      correct: 1,
      why: 'Ein idealer Failover-Test läuft laut Video automatisch ab — Nutzer werden im Hintergrund umgeleitet, ohne etwas zu bemerken.',
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
        'It contains no batteries and relies purely on capacitors to bridge outages',
        'It only works for cloud infrastructure, not for on-premises server rooms',
        'It is always the cheapest option and therefore used in most home offices',
        'The load always runs from the battery path, so failover has no switchover gap',
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
    {
      q: 'Which hardening technique does the video mention specifically for mobile devices?',
      options: [
        'Segmenting company data from personal data on the device, managed through an MDM',
        'Disabling all patches to avoid instability',
        'Never allowing any applications to be installed',
        'Removing the device’s ability to connect to any network',
      ],
      correct: 0,
      why: 'Laut Video wird auf Mobilgeräten oft Unternehmensdaten von privaten Daten logisch getrennt (Segmentierung), verwaltet über ein MDM.',
    },
    {
      q: 'What hardening practice does the video recommend for desktop/laptop workstations regarding unused software?',
      options: [
        'Always remove software that is not being used, since every piece of software is a potential vulnerability',
        'Keep all installed software indefinitely for convenience',
        'Only remove software once a year regardless of usage',
        'Unused software poses no security risk on workstations',
      ],
      correct: 0,
      why: 'Laut Video sollte nicht genutzte Software von Workstations entfernt werden, da jede installierte Anwendung eine potenzielle Angriffsfläche darstellt.',
    },
    {
      q: 'What does the video recommend for securing a cloud management workstation and cloud configurations?',
      options: [
        'Apply least privilege to cloud services/permissions, install EDR, and maintain backups (ideally to a separate provider)',
        'Grant every cloud service full administrative access by default',
        'Cloud infrastructure requires no hardening since the provider handles everything',
        'Never back up cloud-based systems since they cannot fail',
      ],
      correct: 0,
      why: 'Laut Video sollten Cloud-Dienste nach Least Privilege konfiguriert, mit EDR überwacht und regelmäßig gesichert werden — idealerweise auch bei einem zweiten Anbieter.',
    },
    {
      q: 'Which authentication-related hardening step does the video recommend for servers?',
      options: [
        'Enforcing minimum password length/complexity, applying least privilege, and disabling unused accounts',
        'Allowing every account administrator access by default for convenience',
        'Never disabling any account, even unused ones',
        'Servers do not need any password policy since they are physically secured',
      ],
      correct: 0,
      why: 'Laut Video gehören Mindestpasswortlänge/-komplexität, Least Privilege und das Deaktivieren ungenutzter Konten zur Serverhärtung.',
    },
    {
      q: 'Why does the video recommend acting quickly on a security patch for an embedded system?',
      options: [
        'Patches for purpose-built embedded appliances are unusual, so a notification of one is a significant, important event',
        'Embedded systems receive patches every single day, so timing does not matter',
        'Embedded systems never need patches at all',
        'Embedded system patches are always applied automatically without any decision needed',
      ],
      correct: 0,
      why: 'Da Patches für zweckgebundene Embedded-Geräte laut Video selten sind, ist eine Sicherheitsmeldung dafür ein wichtiges Ereignis, das man zügig prüfen sollte.',
    },
    {
      q: 'What isolation practice does the video recommend for a real-time operating system?',
      options: [
        'Isolating the RTOS from the rest of the network and running the minimum number of necessary services',
        'Connecting the RTOS directly to the public internet for easier updates',
        'Running as many background services as possible for redundancy',
        'RTOS devices should always share a network with general-purpose workstations',
      ],
      correct: 0,
      why: 'Laut Video sollten RTOS-Systeme vom restlichen Netz isoliert werden und nur die unbedingt nötigen Dienste laufen lassen — kein anderes Gerät soll den zeitkritischen Betrieb stören.',
    },
  ],

  // 079 — 4.1 Wireless Security Settings
  '079': [
    {
      q: 'What is the known weakness of WPA2?',
      options: [
        'It sends all wireless traffic unencrypted unless a RADIUS server is used',
        'The four-way handshake exposes a hash that can be brute-forced offline',
        'It only works with legacy WEP hardware and inherits its key weaknesses',
        'It limits every network to ten devices, forcing insecure workarounds',
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
        'Supplicant (client), authenticator (access device), and authentication server',
        'Sender, intermediate router, and the authoritative DNS server for the zone',
        'Browser, caching proxy, and the web server that hosts the login portal',
        'Hardware token, employee badge, and the card reader at the network closet',
      ],
      correct: 0,
      why: 'Der Supplicant will ins Netz, der Authenticator (z. B. Access Point/Switch) vermittelt, der AAA-Server prüft die Credentials — abgewickelt über EAP, für den Nutzer unsichtbar schnell. AAA steht für Authentication, Authorization, Accounting.',
    },
    {
      q: 'What key improvement does WPA3 bring over WPA2, per the video?',
      options: [
        'A new handshake (SAE) that avoids exposing a crackable pre-shared key hash, removing the offline brute-force weakness of WPA2',
        'WPA3 removed encryption entirely to increase speed',
        'WPA3 uses the exact same four-way handshake as WPA2',
        'WPA3 only works with open, unauthenticated networks',
      ],
      correct: 0,
      why: 'WPA3 ersetzt laut Video das anfällige Vier-Wege-Handshake durch SAE (Simultaneous Authentication of Equals) — es gibt keinen übertragenen Hash mehr, den man offline brute-forcen könnte.',
    },
    {
      q: 'What does WPA3-Enterprise typically link back to for authentication, per the video?',
      options: [
        'A centralized AAA server, often using RADIUS',
        'No server at all — it is fully local to the access point',
        'A single shared password identical for every user',
        'A third-party social media login only',
      ],
      correct: 0,
      why: 'WPA3-Enterprise (WPA3-802.1X) fragt laut Video Benutzername/Passwort ab und bindet die Authentifizierung an einen zentralen AAA-Server, oft RADIUS.',
    },
    {
      q: 'What new block cipher mode does WPA3 introduce, per the video?',
      options: [
        'GCMP (Galois Counter Mode Protocol), providing stronger encryption and message integrity than WPA2',
        'DES, for backward compatibility',
        'No encryption protocol at all',
        'The same RC4 stream cipher used in WEP',
      ],
      correct: 0,
      why: 'Laut Video bringt WPA3 den neuen Blockchiffre-Modus GCMP mit stärkerer Verschlüsselung und integriertem Message Integrity Check.',
    },
    {
      q: 'Which protocol does the video describe as the framework embedding authentication within the 802.1X process?',
      options: [
        'EAP (Extensible Authentication Protocol), customizable by manufacturers',
        'FTP, for transferring credentials',
        'ICMP, used for connectivity testing only',
        'SMTP, normally used for email',
      ],
      correct: 0,
      why: 'EAP ist laut Video das flexible Rahmenwerk, das die Authentifizierung in den 802.1X-Prozess einbettet und von Herstellern angepasst werden kann.',
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
    {
      q: 'What kind of feedback does a static application security testing (SAST) tool provide, per the video?',
      options: [
        'Specific code-level findings, e.g. a function like "gets" flagged for missing buffer overflow checks, with fix recommendations',
        'Only a single pass/fail result with no detail',
        'Real-time network traffic analysis',
        'A list of employee usernames',
      ],
      correct: 0,
      why: 'Das Video zeigt konkrete Befunde eines statischen Analyzers, etwa eine als unsicher markierte Funktion mit Empfehlung, sie durch eine sicherere Variante zu ersetzen.',
    },
    {
      q: 'Why does the video recommend testing a downloaded software package in a lab before deploying it?',
      options: [
        'To verify the contents can be trusted, especially if the package came from a third party rather than the manufacturer directly',
        'Lab testing is never necessary for trusted packages',
        'Package monitoring only applies to Linux systems',
        'To make the installation process faster',
      ],
      correct: 0,
      why: 'Laut Video sollte man ein Paket, dessen Herkunft nicht sicher ist (Drittanbieter statt Hersteller direkt), erst in einer Laborumgebung prüfen, bevor es produktiv eingesetzt wird.',
    },
  ],

  // 083 — 4.3 Threat Intelligence
  '083': [
    {
      q: 'What is OSINT?',
      options: [
        'A proprietary firewall ruleset sold by threat intelligence vendors',
        'Publicly available intelligence from forums, social media, and government data',
        'An encrypted messaging protocol used by security research communities',
        'A Linux distribution preloaded with penetration testing tools',
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
        'It sells zero-day exploits to member organizations at discounted rates',
        'It provides free antivirus licenses to companies that join the alliance',
        'It regulates internet service providers across international borders',
        'Members share threat data that is validated, scored, and distributed to all',
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
    {
      q: 'What advantage do proprietary/third-party threat intelligence services offer, per the video?',
      options: [
        'They analyze threats across many organizations simultaneously and can alert customers to trends before those threats arrive locally',
        'They only provide information about a single company’s own network',
        'They are always free and require no subscription',
        'They replace the need for any internal security team',
      ],
      correct: 0,
      why: 'Laut Video sehen kommerzielle Threat-Intelligence-Anbieter Muster über viele Organisationen hinweg und können vor Trends warnen, bevor sie die eigene Organisation erreichen.',
    },
    {
      q: 'How does the Cyber Threat Alliance (CTA) example illustrate an information-sharing organization, per the video?',
      options: [
        'Member organizations submit threat details, which are validated, scored, and distributed back to everyone in the alliance',
        'Only government agencies may ever join such alliances',
        'Information-sharing organizations never validate submitted data',
        'The CTA only shares information with a single member at a time',
      ],
      correct: 0,
      why: 'Die Cyber Threat Alliance sammelt laut Video Bedrohungsdaten von Mitgliedern, validiert und bewertet sie und verteilt sie an alle Mitglieder zurück.',
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
    {
      q: 'How does penetration testing differ from a vulnerability scan, per the video?',
      options: [
        'Penetration testing actually performs real exploits to try to gain access, while a vulnerability scan only checks for the potential',
        'They are identical processes with different names',
        'Vulnerability scans always require more time than penetration tests',
        'Penetration testing never requires documented rules of engagement',
      ],
      correct: 0,
      why: 'Laut Video führt ein Pentest echte Exploits gegen die eigenen Systeme aus, während ein Vulnerability Scan nur das Vorhandensein einer Schwachstelle prüft, ohne sie auszunutzen.',
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
    {
      q: 'What triggers an unscheduled (out-of-cycle) patch, per the video?',
      options: [
        'A particularly severe vulnerability or a zero-day with active exploits in the wild',
        'Unscheduled patches are never released by vendors',
        'Only the calendar date determines when patches are released',
        'Patches are always released exactly once per year',
      ],
      correct: 0,
      why: 'Laut Video gibt es bei besonders schweren oder aktiv ausgenutzten Zero-Day-Schwachstellen außerplanmäßige Patches außerhalb des normalen Zyklus.',
    },
    {
      q: 'What does cybersecurity insurance typically NOT cover, per the video?',
      options: [
        'Intentional acts or the actual transfer of funds by the insured',
        'Any losses whatsoever related to a security incident',
        'Legal costs from resulting lawsuits',
        'Revenue losses from an outage',
      ],
      correct: 0,
      why: 'Laut Video deckt eine Cyber-Versicherung typischerweise keine vorsätzlichen Handlungen oder tatsächliche Geldtransfers ab — wohl aber z. B. Umsatzausfälle oder Rechtskosten.',
    },
    {
      q: 'Who typically decides whether a system gets a patch exception/exemption, per the video?',
      options: [
        'A security or change control committee, not a single individual, after weighing the actual risk',
        'Any single technician can grant an exemption unilaterally',
        'Exemptions are automatically granted after 24 hours with no review',
        'Exemptions are decided solely by the software vendor',
      ],
      correct: 0,
      why: 'Laut Video trifft ein Sicherheits- bzw. Change-Control-Komitee diese Entscheidung gemeinsam, nicht eine einzelne Person — nach Abwägung des tatsächlichen Risikos (z. B. „nur lokal ausnutzbar").',
    },
    {
      q: 'Why does the video recommend a vulnerability scan after rolling out a patch?',
      options: [
        'To confirm the patch was actually deployed properly and to find any systems that still need it',
        'Rescanning is unnecessary once a patch ticket is closed',
        'Scans after patching only check for unrelated issues',
        'Rescanning replaces the need to test the patch beforehand',
      ],
      correct: 0,
      why: 'Ein erneuter Scan nach dem Rollout bestätigt laut Video, dass der Patch wirklich installiert ist, und deckt Systeme auf, die eventuell übersehen wurden.',
    },
    {
      q: 'Besides an automated rescan, what additional verification step does the video mention?',
      options: [
        'Manually logging into a system to confirm the patch is installed and working as expected',
        'Verification is impossible without vendor involvement',
        'Only automated tools can ever verify a patch, never a human',
        'Verification only applies to hardware, never software patches',
      ],
      correct: 0,
      why: 'Laut Video kann zusätzlich zur automatisierten Prüfung ein manuelles Login nötig sein, um zu bestätigen, dass der Patch korrekt installiert ist und wirkt.',
    },
    {
      q: 'What kinds of metrics does the video suggest including in a patch reporting system for a large organization?',
      options: [
        'Total vulnerabilities found, patched vs. unpatched systems, new threat notifications, and patches with errors or exceptions',
        'Only the total number of employees in the company',
        'Reporting systems are unnecessary once you exceed 100 systems',
        'Only the name of the IT manager on duty',
      ],
      correct: 0,
      why: 'Laut Video sollte ein Reporting-System u. a. Gesamtzahl der Schwachstellen, gepatchte/ungepatchte Systeme, neue Bedrohungsmeldungen sowie Fehler/Ausnahmen bei Patches zeigen.',
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
        'To replace the firewall as the primary control at the network edge',
        'To consolidate logs from many devices for reporting and correlation',
        'To encrypt every endpoint disk from one central management console',
        'To assign IP addresses and track them across the whole infrastructure',
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
    {
      q: 'Which system-level signals does the video suggest monitoring?',
      options: [
        'Authentications and where logins come from, running services, completed backups, and installed software versions',
        'Only CPU temperature',
        'The number of open browser tabs per user',
        'Keyboard and mouse activity',
      ],
      correct: 0,
      why: 'System-Monitoring umfasst laut Video Logins (auch von wo — viele Anmeldungen aus einem Land ohne Mitarbeiter sind verdächtig), laufende Dienste, Backups und Software-Versionen für Patch-Entscheidungen.',
    },
    {
      q: 'What belongs to application monitoring according to the video?',
      options: [
        'Rewriting the application source code',
        'Availability/uptime, unusual amounts of transferred data, and staying informed by the developer about security issues',
        'Disabling application logs to save space',
        'Only the color scheme of dashboards',
      ],
      correct: 1,
      why: 'Das Video nennt Verfügbarkeit als Kern des Applikations-Monitorings, auffällige Datenmengen als Breach-Indikator (Exfiltration) und den Draht zum Hersteller für Sicherheitshinweise.',
    },
    {
      q: 'Which infrastructure activity does the video recommend monitoring?',
      options: [
        'Printer toner levels across the building',
        'The office thermostat temperature setting',
        'Remote access/VPN usage by role, and attack spikes on firewalls and IPS',
        'The physical weight of the server racks',
      ],
      correct: 2,
      why: 'Infrastruktur-Monitoring laut Video: Wer verbindet sich per VPN (Mitarbeiter, Dienstleister, Gäste), und melden Firewall/IPS plötzliche Angriffswellen?',
    },
    {
      q: 'What is log aggregation in security monitoring?',
      options: [
        'Deleting old logs to free disk space',
        'Printing logs for the archive',
        'Encrypting logs on each device separately',
        'Consolidating logs from firewalls, switches, servers, and routers into one central SIEM database',
      ],
      correct: 3,
      why: 'Log-Aggregation heißt laut Video: Logs aus der gesamten Infrastruktur zentral im SIEM zusammenführen — erst dadurch werden übergreifende Auswertungen und Korrelationen möglich.',
    },
    {
      q: 'What does the continuous scanning described in the video do?',
      options: [
        'It constantly scans devices on the network, collects a mountain of details, and stores them in a database for reports',
        'It scans only once at device installation',
        'It scans employee emails for spelling errors',
        'It replaces the firewall',
      ],
      correct: 0,
      why: 'Viele Organisationen scannen laut Video permanent alle Geräte und sammeln die Details in einer Datenbank — Grundlage für spätere Auswertungen und Reports.',
    },
    {
      q: 'Why does centralizing logs make reporting easier?',
      options: [
        'Because reports are then no longer necessary',
        'One reporting engine can build views across sources, e.g., VPN authentication combined with accessed data',
        'Because logs become smaller when centralized',
        'Because auditors only accept central reports',
      ],
      correct: 1,
      why: 'Mit allen Logs an einem Ort erstellt eine einzige Reporting-Engine laut Video übergreifende Berichte — etwa VPN-Anmeldung plus danach zugegriffene Daten.',
    },
    {
      q: 'Why are scan and log details stored (archived) in a database over time?',
      options: [
        'To slow down attackers',
        'Because deletion is technically impossible',
        'So the collected details remain available later for detailed reports and analysis',
        'To meet printer paper quotas',
      ],
      correct: 2,
      why: 'Das Video: Ziel ist, möglichst viele Details zu sammeln und in einer Datenbank abzulegen, damit sie später für detaillierte Reports und Analysen zur Verfügung stehen.',
    },
    {
      q: 'What is one of the most common first reactions to a compromised system?',
      options: [
        'Rebooting it and hoping for the best',
        'Upgrading its operating system',
        'Announcing the breach publicly',
        'Quarantining the system away from everything else on the network',
      ],
      correct: 3,
      why: 'Laut Video ist die Quarantäne — das System vom restlichen Netz isolieren — eine der häufigsten Sofortreaktionen, um Ausbreitung zu verhindern.',
    },
    {
      q: 'What is the purpose of alert tuning?',
      options: [
        'Adjusting alerts over time so they accurately reflect the network and support immediate decisions',
        'Turning off every alert during the night shift',
        'Making the alert notification sounds louder',
        'Sending every single alert to every employee',
      ],
      correct: 0,
      why: 'Alerts müssen laut Video erst auf das eigene Netz eingestellt werden; nach dem Tuning sind sie präzise genug, um sofort Entscheidungen darauf zu stützen.',
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
        'It makes web requests on the user’s behalf and inspects the responses',
        'It only blocks DNS queries and leaves the web traffic itself untouched',
        'It encrypts the user’s hard drive before allowing any internet access',
        'It replaces the switch and forwards frames based on MAC addresses',
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
    {
      q: 'How does a proxy provide content filtering differently from an agent-based filter, per the video?',
      options: [
        'The proxy sits centrally between users and the internet and makes requests on their behalf, rather than running as software on each device',
        'A proxy must be installed individually on every user’s device',
        'A proxy can only filter encrypted traffic, never plaintext',
        'Proxies cannot cache any content',
      ],
      correct: 0,
      why: 'Ein Proxy sitzt laut Video zentral zwischen Nutzern und Internet und stellt Anfragen stellvertretend — anders als ein agentenbasierter Filter auf jedem einzelnen Gerät.',
    },
    {
      q: 'How do URL filters commonly organize the sites they control access to, per the video?',
      options: [
        'By category, such as gambling, adult, educational, or home and garden, rather than listing every domain individually',
        'Only by exact IP address, never domain name',
        'Content categorization is not possible with URL filters',
        'Only by the file size of the requested page',
      ],
      correct: 0,
      why: 'Statt einzelne Domains zu pflegen, gruppieren URL-Filter laut Video Websites in Kategorien wie Glücksspiel, Bildung oder Freizeit.',
    },
    {
      q: 'What two ways does the video describe for setting up block/allow rules in a content filter?',
      options: [
        'By specific fully qualified domain name, or by category of website',
        'Only by the time of day a request is made',
        'Only by the requesting user’s screen resolution',
        'Block rules can only ever apply to entire countries',
      ],
      correct: 0,
      why: 'Laut Video lassen sich Regeln entweder auf eine konkrete Domain oder auf eine ganze Website-Kategorie anwenden.',
    },
    {
      q: 'How does reputation-based filtering decide whether to allow a site, per the video?',
      options: [
        'It evaluates a site’s perceived risk level (e.g., trustworthy, low risk, high risk), largely through automated scanning',
        'Reputation is assigned manually for every website on the internet',
        'Reputation filtering ignores automated scanning entirely',
        'Reputation only has two possible values: allowed or blocked',
      ],
      correct: 0,
      why: 'Reputationsbasierte Filter bewerten laut Video das wahrgenommene Risiko einer Seite automatisiert (z. B. vertrauenswürdig bis hochriskant) — mit der Option, das manuell zu übersteuern.',
    },
  ],

  // 091 — 4.5 Operating System Security
  '091': [
    {
      q: 'What is Active Directory?',
      options: [
        'A firewall ruleset that ships with Windows Server installations',
        'A central database of the network’s computers, users, shares, and groups',
        'An antivirus engine built into every modern Windows client',
        'A backup protocol for replicating files between domain controllers',
      ],
      correct: 1,
      why: 'Active Directory ist die zentrale, redundante Datenbank aller Netzobjekte (Rechner, Benutzerkonten, Freigaben, Sicherheitsgruppen) — darüber wird zentral authentifiziert und werden Berechtigungen vergeben.',
    },
    {
      q: 'What does Group Policy add on top of Active Directory?',
      options: [
        'It replaces user passwords with certificate-based authentication',
        'It encrypts the Active Directory database on every domain controller',
        'Central configuration, login scripts, and security settings for users and devices',
        'It provides internet access control lists for the perimeter firewall',
      ],
      correct: 2,
      why: 'Group Policy legt sich über AD und setzt zentral Konfigurationen, Login-Skripte, Netzwerk- und Sicherheitsparameter für einzelne Nutzer oder Geräte durch (Group Policy Management Editor).',
    },
    {
      q: 'What is the difference between discretionary (DAC) and mandatory (MAC) access control in Linux?',
      options: [
        'DAC: users assign rights themselves; MAC: a central administrator assigns them',
        'DAC is the more secure model and is required in government networks',
        'MAC only exists on Windows; Linux supports discretionary control only',
        'They are two names for the same model used in different documentation',
      ],
      correct: 0,
      why: 'Standard-Linux ist DAC — der Nutzer vergibt Rechte selbst. In Hochsicherheitsumgebungen will man MAC, wo ein zentraler Admin alle Rechte festlegt.',
    },
    {
      q: 'What does SELinux (Security-Enhanced Linux) enable?',
      options: [
        'A graphical desktop environment for security-focused distributions',
        'A kernel patch that primarily improves boot times on server hardware',
        'An automatic patching service maintained by the Linux distribution',
        'Mandatory access control with least privilege, limiting a breach’s scope',
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
        'A digital signature added in transport, validated via a DNS public key',
        'A one-time password that protects access to the user’s mailbox',
        'An automatic backup of all outgoing mail to a separate archive server',
        'A routing shortcut that speeds up delivery between large providers',
      ],
      correct: 0,
      why: 'DKIM signiert die Mail im Transport zwischen den Servern; der Empfänger holt den öffentlichen Schlüssel aus dem DNS-TXT-Record des Absenders und validiert damit die Signatur (sichtbar in den Headern).',
    },
    {
      q: 'What does a DMARC record let a domain owner specify?',
      options: [
        'The font and layout rules that all outgoing corporate mail must follow',
        'What receivers do with mail failing SPF/DKIM, plus where reports go',
        'The maximum attachment size accepted by the organization’s gateway',
        'The display name that mail clients show for messages from the domain',
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
        'Three encryption algorithms for symmetric, asymmetric, and hashing use',
        'Three backup schedules: continuous, nightly, and weekly full backups',
        'Data on the network, data stored on a system, and data in active memory',
        'Three USB device classes distinguished by their transfer speeds',
      ],
      correct: 2,
      why: 'DLP überwacht Daten in Bewegung (Netzwerkpakete), im Ruhezustand (im Dateisystem gespeichert) und in Verwendung (im aktiven Speicher des Endpoints).',
    },
    {
      q: 'Why is USB storage a particular DLP concern (as in the 2008 U.S. DoD agent.btz incident)?',
      options: [
        'USB drives are too slow for backups and therefore rarely monitored',
        'USB drives cannot be encrypted, so their contents are always readable',
        'USB drives only work on machines with local administrator rights',
        'They are tiny and portable — easy to sneak data out or bring malware in',
      ],
      correct: 3,
      why: 'USB-Sticks sind winzig und mobil: Daten lassen sich unbemerkt heraus- oder Malware hineintragen. 2008 verbreitete sich agent.btz per USB im US-Verteidigungsministerium — daraufhin wurden Flash-Medien gesperrt (per lokalem DLP-Agent).',
    },
    {
      q: 'How can an email-based DLP solution protect an organization?',
      options: [
        'It blocks outbound mail with sensitive data and quarantines suspicious inbound mail',
        'It speeds up email delivery by prioritizing internal messages first',
        'It archives all email forever to satisfy any retention regulations',
        'It encrypts the mail server disks against physical theft of hardware',
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
        'It relies purely on signature files, just with much faster updates',
        'It removes the need for any agent by scanning from the network side',
        'It only works while the endpoint is offline and idle overnight',
        'It adds behavioral analysis, root-cause analysis, and automated response',
      ],
      correct: 3,
      why: 'EDR erweitert Signaturen um Verhaltensanalyse/ML und Prozessüberwachung, liefert Root-Cause-Analyse und kann automatisch isolieren, in Quarantäne stellen und das System auf einen bekannten guten Stand zurückrollen.',
    },
    {
      q: 'What distinguishes XDR (Extended Detection and Response) from EDR?',
      options: [
        'XDR correlates data from many systems and sources, not just one endpoint',
        'XDR only runs on mobile devices and tablets, never on servers',
        'XDR removes the need for agents by using network taps exclusively',
        'XDR is the older technology that EDR was later designed to replace',
      ],
      correct: 0,
      why: 'Ein Angriff betrifft oft mehrere Systeme. XDR wertet Daten vieler Systeme und Quellen zusammen aus (u. a. Netzwerkverkehr, User-Behavior-Analytics), findet dadurch bisher übersehene Bedrohungen und reduziert False Positives.',
    },
    {
      q: 'How does an agentless NAC differ from a persistent agent for posture assessment, per the video?',
      options: [
        'It integrates with a directory service (e.g., Active Directory) and only runs during login/logoff, with no local software installed',
        'Agentless NAC requires installing software on every endpoint',
        'Agentless NAC can run continuously in the background at any time',
        'Agentless NAC has nothing to do with directory services',
      ],
      correct: 0,
      why: 'Agentenloses NAC ist laut Video an ein Verzeichnis wie Active Directory gekoppelt und läuft nur beim An-/Abmelden — es gibt keinen dauerhaft installierten Agenten.',
    },
    {
      q: 'What does user behavior analytics use to detect abnormal activity, per the video?',
      options: [
        'A baseline of normal user activity (devices, traffic types, data accessed), against which deviations are flagged',
        'Only the user’s typing speed',
        'A fixed list of banned words in emails',
        'Behavior analytics ignores historical activity entirely',
      ],
      correct: 0,
      why: 'User Behavior Analytics baut laut Video eine Baseline aus normalem Verhalten (Geräte, Traffic, Datenzugriffe) auf, um Abweichungen als potenziell verdächtig zu erkennen.',
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
        'It measures typing speed and compares it to the user’s stored profile',
        'It checks the password strength before every single login attempt',
        'It reads a hardware token that must be plugged into the device',
        'It uses location data like IP address and GPS to allow or deny a login',
      ],
      correct: 3,
      why: 'Der Standortfaktor nutzt IP-Adresse und GPS: Ein Login aus einem anderen Land als kurz zuvor kann blockiert werden. IP allein ist ungenau (v. a. bei IPv6), deshalb oft mit GPS kombiniert.',
    },
    {
      q: 'What is the difference between a hardware and software authentication token, per the video?',
      options: [
        'A hardware token is a physical device generating codes; a software token provides the same function via an app on your phone',
        'Hardware tokens require no code generation at all',
        'Software tokens can only be used once and then are permanently disabled',
        'Hardware and software tokens are functionally identical to a password',
      ],
      correct: 0,
      why: 'Ein Hardware-Token ist laut Video ein physisches Gerät, das Codes erzeugt; ein Software-Token bietet dieselbe Funktion per App, ohne ein Zusatzgerät mitzuführen.',
    },
    {
      q: 'What does a USB security key contain, per the video?',
      options: [
        'A certificate specific to you, so plugging it in is assumed to prove your identity',
        'Your plaintext password stored for convenience',
        'A live video feed of the user',
        'Nothing — it is purely decorative and does not affect authentication',
      ],
      correct: 0,
      why: 'Ein USB-Sicherheitsschlüssel trägt laut Video ein persönliches Zertifikat — sein Einstecken gilt als Nachweis, dass wirklich du der Besitzer bist.',
    },
    {
      q: 'Which examples does the video give for "something you know"?',
      options: [
        'A memorized password, a PIN, or an unlock pattern',
        'A fingerprint scan',
        'Your current GPS location',
        'A physical USB security key',
      ],
      correct: 0,
      why: '„Something you know" umfasst laut Video ein gemerktes Passwort, eine PIN oder ein Entsperrmuster — Dinge, die nur du im Kopf hast.',
    },
    {
      q: 'A login requires a password and a PIN memorized by the user. Why is this not true multifactor authentication?',
      options: [
        'Both checks use the same knowledge factor',
        'A PIN is always a possession factor',
        'Passwords are biometric factors',
        'Multifactor authentication requires two different usernames',
      ],
      correct: 0,
      why: 'Passwort und PIN sind beide „something you know". MFA verlangt mindestens zwei unterschiedliche Faktorarten, etwa Wissen plus Besitz oder Biometrie.',
    },
  ],

  // 102 — 4.8 Incident Planning
  '102': [
    {
      q: 'Why should incident response exercises run on test systems within a limited time?',
      options: [
        'Production must not be affected, and participants have other duties too',
        'Test systems produce more realistic results than production systems',
        'Regulations forbid any kind of testing during regular business hours',
        'Attackers only target test systems while exercises are running',
      ],
      correct: 0,
      why: 'Übungen dürfen die Produktion nicht beeinträchtigen und haben ein Zeitbudget — die Beteiligten haben noch andere Aufgaben. Getestet werden Prozesse, Prozeduren und technische Fähigkeiten.',
    },
    {
      q: 'What should happen right after an incident response exercise ends?',
      options: [
        'The team disbands and the documentation is archived unchanged',
        'A joint evaluation of how it went, leading to changes in the plans',
        'The exercise is repeated immediately to confirm the results',
        'The results are published on the company website for transparency',
      ],
      correct: 1,
      why: 'Nach der Übung setzen sich alle zusammen und bewerten die Abläufe — daraus entstehen Anpassungen an Prozessen und Prozeduren für künftige Ereignisse.',
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
        'Waiting for alarms to fire and reacting as quickly as possible afterwards',
        'Deleting old log files so attackers cannot learn from past incidents',
        'Buying cyber insurance to shift the risk of undetected intrusions',
        'Proactively finding vulnerabilities before attackers can exploit them',
      ],
      correct: 3,
      why: 'Threat Hunting sucht die Schwachstelle vor dem Angreifer: Firewall-Regeln anpassen, neu gemeldete Schwachstellen verfolgen und prüfen, dass die eigenen Systeme aktuell gepatcht sind.',
    },
    {
      q: 'How does a tabletop exercise walk a team through an incident?',
      options: [
        'By failing over the production data center to the backup site',
        'By physically penetration-testing the building lobby',
        'By sitting around a table and logically stepping through policies and procedures, without touching real systems',
        'By timing how fast admins can type incident-response commands',
      ],
      correct: 2,
      why: 'Beim Tabletop wird laut Video am Tisch durchgespielt, wie Richtlinien und Abläufe im Ernstfall greifen — ohne reale Systeme anzufassen.',
    },
    {
      q: 'What does a simulation test in incident planning?',
      options: [
        'The physical write speed of backup tapes',
        'The physical strength of the building’s door locks',
        'The color calibration of security dashboards',
        'A simulated attack shows how systems and users react, and where more training is needed',
      ],
      correct: 3,
      why: 'Eine Simulation ist laut Video ein nachgestellter Angriff — z. B. eine Phishing-Simulation — deren Ergebnis zeigt, wo Technik oder Nutzer nachgeschult werden müssen.',
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
        'It documents who accessed the evidence and proves it was never altered',
        'It speeds up data acquisition by parallelizing the disk imaging process',
        'It encrypts the original evidence so only the court can ever read it',
        'It removes duplicate files so the evidence archive stays small',
      ],
      correct: 0,
      why: 'Die Chain of Custody hält fest, wer wann auf die Daten zugriff, und belegt per Hashes/digitalen Signaturen, dass die Daten seit der Sicherung unverändert sind — entscheidend für spätere Gerichtsverfahren.',
    },
    {
      q: 'Why work from copies rather than the original media during acquisition?',
      options: [
        'Copies can be searched faster because they are stored on fast disks',
        'Copies protect the original from changes and from remote wiping',
        'Original media cannot be read directly by forensic workstations',
        'Copies compress better and save space in the evidence archive',
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
    {
      q: 'Why are detailed reports created during forensic data acquisition?',
      options: [
        'For internal understanding and as documentation if the case later becomes a legal proceeding',
        'To entertain the security team',
        'Because storage is cheap',
        'To replace the chain of custody',
      ],
      correct: 0,
      why: 'Die Doku der Akquisition dient laut Video intern dem Nachvollzug und ist zwingend, falls der Fall später vor Gericht landet — sie ergänzt die Chain of Custody, ersetzt sie nicht.',
    },
    {
      q: 'Why is preservation of collected forensic data so important?',
      options: [
        'Because storage vendors require it',
        'Legal proceedings can happen years later, so the data must remain intact and handled by best practices the whole time',
        'Because preserved data compresses better',
        'Because it speeds up the network',
      ],
      correct: 1,
      why: 'Laut Video können Gerichtsverfahren Jahre später folgen — die Daten müssen daher über die gesamte Zeit unverändert und nach Best Practices aufbewahrt werden.',
    },
    {
      q: 'An analyst hands a forensic drive image to outside counsel. Which record is essential to preserve the chain of custody?',
      options: [
        'Who transferred and received it, when, why, and the verified evidence hash',
        'Only the analyst’s opinion about the suspected attacker',
        'The marketing classification of the affected product',
        'A list of unrelated open helpdesk tickets',
      ],
      correct: 0,
      why: 'Chain of Custody dokumentiert Besitz, Übergaben, Zeitpunkt, Zweck und Integrität des Beweismittels. Ein Hash belegt, dass die übergebene Kopie unverändert ist.',
    },
  ],

  // 105 — 5.1 Security Policies
  '105': [
    {
      q: 'What does an Acceptable Use Policy (AUP) define?',
      options: [
        'The encryption algorithm required for data stored on company servers',
        'What users may do with company technology — it also protects the firm legally',
        'The backup schedule for all workstations and how long backups are kept',
        'The physical layout of the data center and who may enter which zones',
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
        'Moving from idea to deployed application on schedule and on budget',
        'Encrypting the source code repository against external attackers',
        'Replacing change management for all development departments',
        'Monitoring the production network traffic generated by applications',
      ],
      correct: 0,
      why: 'Der SDLC führt strukturiert von der Idee zur fertigen App (Anforderungen, Entwicklung, Test, Deployment) — termin- und budgetgerecht. Zwei gängige Modelle: das lineare Waterfall und das schnelle, iterative Agile.',
    },
    {
      q: 'What does the change management process critically include?',
      options: [
        'A marketing plan that announces the change to all customers',
        'The salary grade of the technician who implements the change',
        'A social media post published once the change is completed',
        'Documented scope, duration, install process, and a fallback procedure',
      ],
      correct: 3,
      why: 'Change Management dokumentiert Häufigkeit, Dauer und Installationsprozess einer Änderung — und vor allem eine Fallback-Prozedur, falls sie schiefgeht. So werden Änderungen mit geringstem Risiko umgesetzt.',
    },
    {
      q: 'What role do security policies play, per the video?',
      options: [
        'They tell everyone what should be done and why, while technical controls handle the actual administration',
        'Guidelines replace the need for any technical security controls',
        'Guidelines are only relevant to the finance department',
        'Guidelines are optional suggestions with no organizational weight',
      ],
      correct: 0,
      why: 'Laut Video legen Policies fest, was zu tun ist und warum — die technische Umsetzung/Durchsetzung übernehmen die technischen Kontrollen aus vorherigen Videos.',
    },
    {
      q: 'What does the master information security policy document define, per the video?',
      options: [
        'All the policies to follow for uptime/security, plus roles and responsibilities for who to contact with security questions',
        'Only the company’s marketing strategy',
        'Nothing beyond a list of employee names',
        'Information security policies apply only to the IT department, never other staff',
      ],
      correct: 0,
      why: 'Das Master-Dokument für Informationssicherheits-Policies listet laut Video alle zu befolgenden Regeln sowie Rollen/Zuständigkeiten für Sicherheitsfragen.',
    },
  ],

  // 106 — 5.1 Security Standards
  '106': [
    {
      q: 'Which two organizations commonly provide ready-made security standards?',
      options: [
        'ISO and NIST',
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
        'The color scheme and layout of the corporate login screen',
        'Authentication method, reset handling, change frequency, and storage',
        'The job titles of employees who may request password resets',
        'The SSID naming convention for the corporate wireless networks',
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
    {
      q: 'What examples of physical security standards does the video give?',
      options: [
        'Requiring an ID badge for door access, possibly with biometrics, and different rules for employees vs. contractors or guests',
        'Physical security standards only apply to server rooms, never building entrances',
        'Physical security standards are identical across every organization with no customization',
        'Physical security has no relationship to standards, only to policies',
      ],
      correct: 0,
      why: 'Laut Video können Standards ein Badge mit ggf. Biometrie für den Türzugang vorschreiben, mit unterschiedlichen Regeln für Mitarbeitende, Auftragnehmer und Gäste.',
    },
  ],

  // 108 — 5.1 Security Considerations
  '108': [
    {
      q: 'What does the Sarbanes-Oxley (SOX) regulation focus on?',
      options: [
        'The privacy of health care records held by insurance companies',
        'The finances of public companies and protecting their financial data',
        'The encryption standards for wireless networks in public buildings',
        'The physical security requirements for data center door locks',
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
    {
      q: 'Which regulatory examples does the video give for external compliance considerations?',
      options: [
        'Sarbanes-Oxley (SOX) for financial data and HIPAA for healthcare information',
        'Only local traffic laws',
        'Regulatory considerations never affect IT security decisions',
        'Only building fire codes',
      ],
      correct: 0,
      why: 'Das Video nennt SOX für Finanzdaten und HIPAA für Gesundheitsdaten als Beispiele regulatorischer externer Vorgaben.',
    },
    {
      q: 'How does the video contrast security considerations between power generation and medical industries?',
      options: [
        'Power generation systems are often air-gapped with strict access limits, while medical environments need highly available but heavily encrypted access',
        'Both industries have identical security requirements',
        'Only the medical industry has any compliance requirements',
        'Power generation requires no security since it has no valuable data',
      ],
      correct: 0,
      why: 'Energieerzeugung wird laut Video oft komplett air-gapped mit strengen Zugriffsbeschränkungen betrieben, während medizinische Umgebungen Verfügbarkeit mit starker Verschlüsselung kombinieren müssen.',
    },
    {
      q: 'What kind of data does the video associate with a local/regional security scope?',
      options: [
        'Records collected by a city or state government to help manage that specific area',
        'Only data relevant to entire continents',
        'Local/regional considerations never involve any government data',
        'Only data collected by international corporations',
      ],
      correct: 0,
      why: 'Auf lokaler/regionaler Ebene sind laut Video z. B. Aufzeichnungen von Stadt- oder Bundesstaatsregierungen zur Verwaltung eines bestimmten Gebiets relevant.',
    },
    {
      q: 'What additional concerns arise at the national level of security scope, per the video?',
      options: [
        'Federal government issues like national defense and communication across multiple states, often requiring stronger encryption',
        'National scope never requires any additional technology',
        'National-level considerations are identical to local considerations',
        'National scope only applies to private companies, never government',
      ],
      correct: 0,
      why: 'Auf nationaler Ebene kommen laut Video Themen wie nationale Verteidigung und länderübergreifende Kommunikation hinzu — oft mit stärkerer Verschlüsselung.',
    },
    {
      q: 'What complexity does a global company face, per the video?',
      options: [
        'Different data protection and security laws apply depending on which country an office is located in',
        'Global companies are exempt from all national laws',
        'Global scope has no additional legal complexity compared to local scope',
        'Global companies only need to comply with one universal law',
      ],
      correct: 0,
      why: 'Ein globales Unternehmen muss laut Video je nach Standort unterschiedliche nationale Datenschutz- und Sicherheitsgesetze beachten — das macht es komplexer als lokale Aufstellungen.',
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
        'PCI DSS',
      ],
      correct: 3,
      why: 'Wer Kreditkartennummern speichert, muss laut PCI DSS regelmäßig (z. B. jährlich) eine Risikobewertung durchführen.',
    },
    {
      q: 'What is a one-time risk assessment typically tied to?',
      options: [
        'A specific project, such as an acquisition or new equipment',
        'The daily login process of every administrator account',
        'Every single email that enters or leaves the organization',
        'The weekly staff meeting schedule of the security team',
      ],
      correct: 0,
      why: 'Das einmalige Assessment hängt meist an einem konkreten Projekt — etwa einer Firmenübernahme oder der Einführung neuer Hard-/Software, um deren Risiken zu verstehen.',
    },
    {
      q: 'What is the purpose of risk management in an organization, per the video?',
      options: [
        'To identify and manage potential threats from inside or outside the organization before they become bigger problems',
        'To eliminate the need for any security controls',
        'To only track risks that have already caused an incident',
        'Risk identification only applies to financial risks, never security risks',
      ],
      correct: 0,
      why: 'Risikomanagement soll laut Video interne wie externe Bedrohungen identifizieren und einordnen, bevor sie zu größeren Problemen werden.',
    },
    {
      q: 'What example does the video give of a recurring risk assessment schedule?',
      options: [
        'Internal teams performing an assessment every three, six, or twelve months on a standard schedule',
        'A single assessment performed once and never repeated',
        'Recurring assessments only happen after a breach occurs',
        'Recurring assessments are always mandated by a single global law',
      ],
      correct: 0,
      why: 'Laut Video führen manche Organisationen interne Risikoanalysen auf einem festen Zeitplan durch, z. B. alle drei, sechs oder zwölf Monate.',
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
        'Avoiding removes the risk entirely; mitigating only reduces it',
        'They are two interchangeable names for the same strategy',
        'Avoiding means buying insurance; mitigating means ignoring it',
        'Mitigating means accepting the risk without countermeasures',
      ],
      correct: 0,
      why: 'Vermeiden entfernt das Risiko komplett (keine weitere Steuerung nötig); Mindern reduziert es — etwa mit einer Next-Generation-Firewall gegen Internet-Risiken.',
    },
    {
      q: 'What is the purpose of a risk register (risk reporting)?',
      options: [
        'A log of user passwords kept for the security administrators',
        'A calendar that schedules the nightly and weekly backup jobs',
        'An encrypted vault for the company’s most sensitive files',
        'A continuously updated list of tracked risks used by management',
      ],
      correct: 3,
      why: 'Das Risk Reporting/Register listet alle verfolgten Risiken mit Beschreibung und Umgang — ein ständig aktualisiertes Dokument (kritische und aufkommende Risiken), auf das das Management seine Entscheidungen stützt.',
    },
    {
      q: 'What is a good example of risk transfer, per the video?',
      options: [
        'Purchasing cybersecurity insurance to move the risk to a different party',
        'Ignoring the risk entirely',
        'Fixing the underlying vulnerability directly',
        'Publishing the risk publicly to shame the vendor',
      ],
      correct: 0,
      why: 'Der Kauf einer Cyber-Versicherung verschiebt laut Video das Risiko auf einen Dritten — ein klassisches Beispiel für Risk Transfer.',
    },
    {
      q: 'What does the video’s unpatchable manufacturing equipment example illustrate about an exemption?',
      options: [
        'Management approves skipping a security policy entirely for that device (e.g., no patching), provided compensating conditions like no network connection are met',
        'An exemption means the policy is simply ignored with no approval needed',
        'Exemptions can only ever be granted to brand-new equipment',
        'An exemption automatically removes the device from the network permanently',
      ],
      correct: 0,
      why: 'Da die Fertigungsanlage laut Video keine Patches unterstützt, genehmigt das Management eine Ausnahme von der Patch-Policy — unter der Bedingung, dass das Gerät nicht am Netz hängt.',
    },
    {
      q: 'How does the video’s patch-conflict example illustrate an exception versus an exemption?',
      options: [
        'A temporary exception extends the patch deadline because the update breaks critical software, unlike a permanent exemption from the policy entirely',
        'Exception and exemption always mean the exact same thing',
        'An exception permanently removes the requirement forever',
        'Exceptions can never be approved by management',
      ],
      correct: 0,
      why: 'Beim Patch-Konflikt gewährt das Video eine befristete Ausnahme (mehr Zeit), bis die Software kompatibel gemacht ist — anders als eine dauerhafte Exemption von der Regel selbst.',
    },
    {
      q: 'What does risk avoidance mean, per the video?',
      options: [
        'Completely removing the risk from the organization so no further risk management for it is needed',
        'Purchasing insurance to cover the risk',
        'Accepting the risk and doing nothing further',
        'Reducing but not eliminating the risk',
      ],
      correct: 0,
      why: 'Risk Avoidance bedeutet laut Video, das Risiko vollständig aus der Organisation zu entfernen — danach ist kein weiteres Risikomanagement dafür nötig.',
    },
    {
      q: 'What example of risk mitigation does the video give?',
      options: [
        'Investing in a next-generation firewall to reduce risk associated with internet connectivity',
        'Buying insurance instead of addressing the underlying issue',
        'Removing internet connectivity entirely',
        'Doing nothing and hoping the risk does not materialize',
      ],
      correct: 0,
      why: 'Als Beispiel für Mitigation nennt das Video die Investition in eine Next-Generation-Firewall, um das Risiko der Internet-Konnektivität zu reduzieren.',
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
        'The data state required to be considered operational again',
        'The time needed to diagnose the root cause of an outage',
        'The average running time between two consecutive failures',
        'The purchase cost of the replacement for failed equipment',
      ],
      correct: 0,
      why: 'Das RPO ist der Datenstand, ab dem man wieder als betriebsbereit gilt — z. B. mindestens die letzten 12 Monate an Daten, die aus dem Backup zurückgeladen sein müssen.',
    },
    {
      q: 'What does MTTR (Mean Time To Repair) include?',
      options: [
        'Only the shipping time for replacement parts from the vendor',
        'The time that passes before the next failure of the system',
        'Time to diagnose, obtain, install, and configure the replacement',
        'The age of the device when the manufacturer ends its support',
      ],
      correct: 2,
      why: 'MTTR umfasst Diagnose, Beschaffung, Einbau und Konfiguration des Ersatzes. Mit mehr Budget (Ersatzteile auf Lager, 2-Stunden-Verträge) lässt sich die Reparaturzeit senken.',
    },
    {
      q: 'What does MTBF (Mean Time Between Failures) help with?',
      options: [
        'Encrypting equipment configurations before they are archived',
        'Choosing the password policies for infrastructure devices',
        'Scheduling the firewall rule reviews across the fiscal year',
        'Predicting how long equipment runs before the next failure',
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
        'Digital signatures guarantee that vendor updates are always safe',
        'Supply chains are too complex to analyze, so audits are pointless',
        'Only small companies are targeted through their software vendors',
        'Even a trusted, signed vendor update can deliver malware at scale',
      ],
      correct: 3,
      why: 'Angreifer schleusten Schadcode in ein signiertes SolarWinds-Update; von rund 300.000 potenziell betroffenen Kunden installierten mindestens 18.000 die Malware — ein Weckruf für gründliche Supply-Chain-Analyse.',
    },
    {
      q: 'How can penetration testing be part of a third-party vendor risk assessment, per the video?',
      options: [
        'The contract can mandate that the vendor and customer execute penetration tests at regular intervals, sometimes via a shared third party',
        'Penetration testing is never relevant to vendor relationships',
        'Vendors are legally prohibited from ever being penetration tested',
        'Only internal systems can be penetration tested, never vendor systems',
      ],
      correct: 0,
      why: 'Ein Vertrag kann laut Video regelmäßige Pentests bei Kunde und Zulieferer vorschreiben, teils über denselben spezialisierten Drittanbieter.',
    },
    {
      q: 'What contract clause does the video mention that formalizes an organization’s right to review a vendor’s security?',
      options: [
        'A "right to audit" clause built into the contract',
        'A clause that forbids any review of the vendor ever',
        'Only verbal agreements, never written into contracts',
        'A clause requiring the vendor to audit the customer instead',
      ],
      correct: 0,
      why: 'Das Video nennt die vertragliche „Right to Audit"-Klausel, die regelmäßige Prüfungen der Vendor-Sicherheit formalisiert.',
    },
    {
      q: 'What benefit does bringing in an independent third party for assessment provide, per the video?',
      options: [
        'A different, broader perspective gathered across many organizations that internal staff might not have',
        'Independent assessments are always less accurate than internal ones',
        'Independent assessors cannot legally review vendor security',
        'They eliminate the need for any contract with the vendor',
      ],
      correct: 0,
      why: 'Ein unabhängiger Dritter bringt laut Video eine breitere Perspektive aus vielen Organisationen mit, die intern oft fehlt.',
    },
    {
      q: 'What did the SolarWinds incident illustrate about supply chain analysis, per the video?',
      options: [
        'A compromised update from one vendor spread malware, with a validly signed update, to roughly 18,000 of 300,000 potentially affected customers',
        'Supply chain analysis is unnecessary if a vendor digitally signs their updates',
        'SolarWinds only affected a handful of small businesses',
        'The incident had nothing to do with the software supply chain',
      ],
      correct: 0,
      why: 'Beim SolarWinds-Vorfall verbreitete sich laut Video Schadsoftware über ein gültig signiertes Update — rund 18.000 von potenziell 300.000 Kunden waren betroffen.',
    },
    {
      q: 'What ongoing activities does the video describe as part of vendor monitoring after a contract is signed?',
      options: [
        'Financial health checks, IT security reviews, and monitoring news/social media about the partner',
        'Vendor monitoring ends the moment the contract is signed',
        'Only a single one-time review is ever performed',
        'Vendor monitoring is solely the vendor’s own responsibility',
      ],
      correct: 0,
      why: 'Laut Video umfasst laufendes Vendor-Monitoring Finanz-Checks, IT-Sicherheitsprüfungen und die Beobachtung von Nachrichten/Social Media über den Partner.',
    },
    {
      q: 'What kind of information does a vendor questionnaire gather, per the video?',
      options: [
        'Details on the vendor’s due diligence process, disaster recovery plans, and how they store/protect data',
        'Only the vendor’s office address',
        'Questionnaires can only be used once per vendor relationship, ever',
        'Only pricing information, never security details',
      ],
      correct: 0,
      why: 'Ein Fragebogen fragt laut Video z. B. den Due-Diligence-Prozess, Disaster-Recovery-Pläne und Datenspeicherung/-schutz des Anbieters ab.',
    },
    {
      q: 'What parameters does a rules of engagement document set for a third-party penetration test, per the video?',
      options: [
        'Scope of testing, timing, IP address ranges, emergency contacts, and handling of sensitive information found',
        'Rules of engagement only define the invoice amount',
        'They are unnecessary if the vendor already trusts the tester',
        'They apply only to internal, never third-party, testing',
      ],
      correct: 0,
      why: 'Laut Video legen Rules of Engagement u. a. Testumfang, Zeitfenster, IP-Bereiche, Notfallkontakte und den Umgang mit gefundenen sensiblen Daten fest.',
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
    {
      q: 'How does an MOA differ from an MOU, per the video?',
      options: [
        'An MOA is one step more detailed than an MOU and may include some legally binding information, though it is still not a full contract',
        'An MOA and MOU are identical documents with different names',
        'An MOA is always a fully binding legal contract with penalties',
        'An MOU is more detailed and binding than an MOA',
      ],
      correct: 0,
      why: 'Ein MOA geht laut Video über das MOU hinaus und kann teils rechtlich bindende Elemente enthalten — ein vollwertiger Vertrag ist es aber immer noch nicht.',
    },
    {
      q: 'What does a Business Partners Agreement (BPA) document, per the video?',
      options: [
        'Financial details, ownership stakes, decision-making authority, and what happens if the partnership runs into problems',
        'Only the logo design shared between partners',
        'A BPA only covers marketing collaboration, never finances',
        'A BPA replaces the need for any other agreement type',
      ],
      correct: 0,
      why: 'Eine BPA regelt laut Video finanzielle Details, Eigentumsanteile, Entscheidungsbefugnisse und den Umgang mit Problemen in der Partnerschaft.',
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
        'Any identified or identifiable natural person — effectively everyone',
        'Only the executives who sign the company’s privacy policy',
        'Only the employees of the data processor handling the records',
        'Only customers who explicitly signed a data processing contract',
      ],
      correct: 0,
      why: 'Ein Data Subject ist jede identifizierte oder identifizierbare natürliche Person — praktisch jeder Einwohner: Name, Adresse, genetische Daten, Standortdaten usw. sind geschützt.',
    },
    {
      q: 'What is a data inventory?',
      options: [
        'A list of the physical servers installed in the data center',
        'A nightly backup of all production databases and file shares',
        'The firewall rule set that protects the storage networks',
        'A listing of all data the company collects, stores, and owns',
      ],
      correct: 3,
      why: 'Das Data Inventory listet alle gesammelten und gespeicherten Daten — mit Eigentümer, Aktualisierungshäufigkeit und Format —, um die Datenschutzfolgen zu verstehen, besonders beim Teilen mit Dritten.',
    },
    {
      q: 'What kind of privacy-relevant data does the video associate with local/state government collection?',
      options: [
        'Information about homes, vehicles, and medical licensing',
        'Only data about international trade agreements',
        'Local governments never collect any personal data',
        'Only data related to national defense',
      ],
      correct: 0,
      why: 'Auf lokaler/staatlicher Ebene nennt das Video Daten zu Wohneigentum, Fahrzeugen und medizinischer Zulassung als Beispiele.',
    },
    {
      q: 'Which national-level privacy law example does the video give?',
      options: [
        'HIPAA, protecting healthcare privacy across an entire country',
        'GDPR, which the video describes as purely local',
        'National laws never address healthcare privacy',
        'Only laws governing international shipping',
      ],
      correct: 0,
      why: 'Als nationales Beispiel nennt das Video HIPAA, das Gesundheitsdaten-Privatsphäre landesweit in den USA schützt.',
    },
    {
      q: 'How does the video describe GDPR’s scope as a global/multi-country privacy consideration?',
      options: [
        'It is an EU regulation affecting privacy for everyone living in the EU, with countries working together on citizen privacy',
        'GDPR applies only within a single country and nowhere else',
        'GDPR has no effect on how companies handle personal data',
        'GDPR only regulates government agencies, never private companies',
      ],
      correct: 0,
      why: 'Die DSGVO ist laut Video eine EU-weite Regelung, die die Privatsphäre aller EU-Bürger betrifft — ein Beispiel länderübergreifender Zusammenarbeit beim Datenschutz.',
    },
    {
      q: 'How does the video’s payroll example distinguish a data controller from a data processor?',
      options: [
        'The payroll department (controller) decides how much/when people get paid; the third-party payroll company (processor) actually processes the paychecks',
        'The controller and processor are always the exact same entity',
        'The processor decides policy, while the controller executes it',
        'Only external vendors can ever be data controllers',
      ],
      correct: 0,
      why: 'Im Gehaltsabrechnungs-Beispiel legt die Fachabteilung (Controller) laut Video fest, wie/wann bezahlt wird — der externe Dienstleister (Processor) führt die eigentliche Verarbeitung aus.',
    },
    {
      q: 'How does the video define a "data owner"?',
      options: [
        'An individual with overall responsibility for a specific type of data, e.g. the VP of Sales for customer relationship data',
        'Data ownership always belongs to the IT department regardless of data type',
        'A data owner is the same role as a data processor',
        'Data ownership has no relevance to GDPR-style privacy laws',
      ],
      correct: 0,
      why: 'Der Data Owner trägt laut Video die Gesamtverantwortung für eine bestimmte Datenart — etwa der VP Sales für Kundenbeziehungsdaten.',
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
    {
      q: 'What does a cybersecurity audit examine, per the video?',
      options: [
        'IT infrastructure, software, network devices, and existing policies and procedures against current threats',
        'Only the physical office layout',
        'Only the company’s marketing materials',
        'Audits are purely financial and never touch IT systems',
      ],
      correct: 0,
      why: 'Ein Cybersecurity-Audit untersucht laut Video IT-Infrastruktur, Software, Netzwerkgeräte und bestehende Richtlinien im Hinblick auf aktuelle Bedrohungen.',
    },
    {
      q: 'What is the relationship between an audit and an attestation, per the video?',
      options: [
        'Attestation is an opinion of truth about the results of an audit that was performed',
        'Attestation always happens before any audit takes place',
        'Audits and attestations are unrelated processes',
        'Attestation replaces the need to perform an audit at all',
      ],
      correct: 0,
      why: 'Laut Video ist die Attestierung eine Wahrheitsaussage über die Ergebnisse eines durchgeführten Audits — Audit und Attestierung gehören zusammen.',
    },
    {
      q: 'What question does an internal audit typically help answer, per the video?',
      options: [
        'Whether the organization is meeting its own compliance requirements',
        'Only whether office furniture needs replacing',
        'Internal audits never address compliance',
        'Only questions about competitor pricing',
      ],
      correct: 0,
      why: 'Ein internes Audit klärt laut Video u. a., ob die Organisation ihre eigenen Compliance-Anforderungen erfüllt.',
    },
    {
      q: 'How does a self-assessment feed into an organization’s internal audit process, per the video?',
      options: [
        'Organizations look at their own processes/procedures and compare them to requirements; the audit committee compiles these to gauge overall compliance',
        'Self-assessments are never used by an audit committee',
        'Self-assessments replace the need for any audit committee',
        'Self-assessments can only be performed by external auditors',
      ],
      correct: 0,
      why: 'Audits beginnen laut Video oft mit einer Selbstbewertung, die das Audit-Komitee zu einem Gesamtbild der Compliance zusammenführt.',
    },
    {
      q: 'When does the video say organizations bring in a third party specifically for an audit?',
      options: [
        'When compliance regulations require it',
        'Third parties are never used for audits under any regulation',
        'External audits are always optional with no regulatory driver',
        'Only when the organization has no internal audit team at all',
      ],
      correct: 0,
      why: 'Manche Compliance-Vorschriften verlangen laut Video ausdrücklich, dass eine externe Gruppe das Audit durchführt.',
    },
    {
      q: 'What does an external auditor typically do once brought into an organization, per the video?',
      options: [
        'Find desks, look through records, and compile information/details specific to that audit',
        'They only interview the CEO and no one else',
        'External examiners never review any company records',
        'They immediately publish findings with no internal review process',
      ],
      correct: 0,
      why: 'Ein externer Prüfer sichtet laut Video Unterlagen vor Ort und sammelt gezielt Informationen für die konkrete Prüfung.',
    },
    {
      q: 'What does the result of an external audit typically show, per the video?',
      options: [
        'Where the company stands today with compliance and where there is room for improvement',
        'Only a pass/fail grade with no further detail',
        'External assessments never produce any usable output',
        'Only financial statements, never security posture',
      ],
      correct: 0,
      why: 'Das Ergebnis eines externen Audits zeigt laut Video den aktuellen Compliance-Stand und mögliche Verbesserungsbereiche auf.',
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
        'A professional-looking logo in the header of the message',
        'A familiar sender name displayed by the email client',
        'A short subject line without any special characters',
        'Spelling errors, odd domains, unusual attachments, credential requests',
      ],
      correct: 3,
      why: 'Warnzeichen sind Rechtschreib-/Grammatikfehler, verdächtige Domainnamen im Link, ungewöhnliche Anhänge und die Aufforderung, persönliche Daten oder Zugangsdaten preiszugeben — nie Links klicken oder Anhänge ausführen.',
    },
    {
      q: 'What is "anomalous behavior recognition"?',
      options: [
        'Watching for risky, unexpected, or unintentional user behavior',
        'Recognizing employee faces at the building entrance cameras',
        'Blocking all outbound traffic after regular business hours',
        'Renaming suspicious files so users cannot execute them',
      ],
      correct: 0,
      why: 'Erkannt wird auffälliges Verhalten in drei Kategorien: riskant (Host-Datei ändern, sensible Uploads), unerwartet (Login aus anderem Land, Datenspitzen) und unbeabsichtigt (falsche Domain, verlorener USB-Stick, Fehlkonfiguration).',
    },
    {
      q: 'What is the security awareness team responsible for?',
      options: [
        'Writing the application code for the security tools in use',
        'Managing the company finances and the insurance contracts',
        'Configuring the perimeter firewalls and the VPN appliances',
        'Monitoring, reporting, and training users on security issues',
      ],
      correct: 3,
      why: 'Das Security-Awareness-Team überwacht, berichtet und schult: Es erstellt Trainingsmaterial (auch rollen-/compliance-spezifisch), Poster und Mails und verfolgt Metriken (Phishing-Klickrate, MFA-Nutzung), um die Wirkung zu belegen.',
    },
    {
      q: 'Which signs should users look for to recognize a phishing attempt, per the video?',
      options: [
        'Spelling/grammar errors, suspicious domain names, unusual attachments, and requests for personal information or credentials',
        'Phishing emails are always perfectly written with no errors',
        'Only emails from unknown senders can ever be phishing',
        'Legitimate emails never ask for any information at all',
      ],
      correct: 0,
      why: 'Laut Video sollten Nutzer auf Rechtschreibfehler, verdächtige Domains, ungewöhnliche Anhänge und Anfragen nach persönlichen Daten/Zugangsdaten achten.',
    },
    {
      q: 'What should happen when a user suspects they have received a phishing email, per the video?',
      options: [
        'There should be a well-known process for reporting it to the IT security team',
        'The user should simply delete it and never mention it to anyone',
        'The user should reply directly to the sender asking if it’s legitimate',
        'Reporting suspicious emails is discouraged to avoid burdening IT',
      ],
      correct: 0,
      why: 'Laut Video braucht es einen bekannten Meldeweg an das IT-Sicherheitsteam, sobald jemand eine verdächtige Nachricht erhält.',
    },
    {
      q: 'Which example of "risky" behavior does the video give?',
      options: [
        'Modifying a host file or replacing a core operating system file',
        'Logging in at the exact same time every day',
        'Risky behavior only refers to physical building access',
        'Using the same password as last month',
      ],
      correct: 0,
      why: 'Als riskantes Verhalten nennt das Video u. a. das Verändern einer Host-Datei oder das Ersetzen einer Kern-Betriebssystemdatei.',
    },
    {
      q: 'Which example of "unexpected" behavior does the video give?',
      options: [
        'Someone logging in from another country, or an unusual increase in data transfers',
        'A user logging in during normal business hours',
        'Unexpected behavior only applies to hardware failures',
        'A scheduled monthly patch installation',
      ],
      correct: 0,
      why: 'Als unerwartetes Verhalten nennt das Video z. B. eine Anmeldung aus einem anderen Land oder einen ungewöhnlichen Anstieg der Datenübertragung.',
    },
    {
      q: 'Which example of "unintentional" behavior does the video give?',
      options: [
        'A user typing the wrong domain name, misplacing a USB drive, or misconfiguring security settings by mistake',
        'A deliberate attempt to steal company data',
        'Unintentional behavior always indicates a malicious insider',
        'It only refers to failures caused by hardware age',
      ],
      correct: 0,
      why: 'Unbeabsichtigtes Verhalten sind laut Video menschliche Fehler wie eine falsch getippte Domain, ein verlegter USB-Stick oder eine versehentliche Fehlkonfiguration.',
    },
  ],
  '100': [
    {
      q: 'What does an automated onboarding script typically do for a new employee?',
      options: [
        'Creates the account, assigns the correct groups, and grants access to files, printers, and email',
        'Orders new hardware from the supplier',
        'Writes the employment contract',
        'Runs a vulnerability scan on the employee’s home network',
      ],
      correct: 0,
      why: 'Das Video beschreibt Onboarding-Automatisierung: Konto anlegen, Gruppen zuweisen, Zugriff auf Home-Verzeichnis, Drucker und E-Mail einrichten — ohne manuelle Einzelschritte.',
    },
    {
      q: 'When a cloud application scales up, what does resource provisioning via scripts add?',
      options: [
        'Only additional licenses',
        'New servers and databases for the growing application',
        'More help desk staff',
        'Longer backup retention',
      ],
      correct: 1,
      why: 'Beim Hochskalieren werden laut Video per Skript neue Server und Datenbanken bereitgestellt — die Sicherheitskomponenten müssen dabei mitwachsen (siehe „Scaling in a secure manner“).',
    },
    {
      q: 'What is a "guardrail" in automation?',
      options: [
        'A physical barrier around server racks',
        'A firewall rule that blocks all outbound traffic',
        'An automated verification of input that blocks human mistakes, e.g., stopping a technician from deleting critical files',
        'A backup script that runs every night',
      ],
      correct: 2,
      why: 'Guardrails prüfen laut Video automatisch, was Menschen in ein System eingeben, und blockieren gefährliche Fehler — etwa das versehentliche Löschen eines viel zu großen Ordners.',
    },
    {
      q: 'How does automation help manage security groups?',
      options: [
        'It removes the need for any groups',
        'It encrypts group names',
        'It makes all users administrators to simplify access',
        'It adds/removes users automatically and can alert immediately when someone is added to the administrator group',
      ],
      correct: 3,
      why: 'Das Video nennt automatisches Hinzufügen/Entfernen von Nutzern in Security Groups und Überwachung sensibler Gruppen: Wird jemand zur Admin-Gruppe hinzugefügt, gibt es sofort eine Meldung.',
    },
    {
      q: 'How does help desk automation handle an emailed problem report?',
      options: [
        'It converts the email into a ticket and can assign it to the appropriate person based on its content',
        'It deletes the email until a human reads it',
        'It replies with a standard rejection',
        'It forwards the email to all employees',
      ],
      correct: 0,
      why: 'Laut Video wird die E-Mail automatisch in ein Ticket umgewandelt und anhand des Inhalts direkt der passenden Person zugewiesen.',
    },
    {
      q: 'What does automated escalation mean in monitoring scripts?',
      options: [
        'Every alert is sent to the CEO',
        'If the script cannot resolve a detected problem itself, it automatically escalates the issue to the on-call technician',
        'Alerts are escalated only during business hours',
        'The script increases CPU priority of the failing service',
      ],
      correct: 1,
      why: 'Das Video beschreibt: Das Skript versucht das Problem zu lösen; gelingt das nicht, eskaliert es automatisch an die Bereitschaft — ohne dass jemand manuell eingreifen muss.',
    },
    {
      q: 'How can scripts manage services that are only needed temporarily?',
      options: [
        'By uninstalling and reinstalling the OS each time',
        'By leaving all services running permanently',
        'By enabling a service for a defined time frame and disabling it automatically afterwards',
        'By renaming the service so attackers cannot find it',
      ],
      correct: 2,
      why: 'Beispiel aus dem Video: Ein Dienst wird per Skript für einen bestimmten Zeitraum aktiviert und danach automatisch wieder deaktiviert — ohne menschliches Zutun.',
    },
    {
      q: 'How do application developers use automation according to the video?',
      options: [
        'They avoid automation to keep full control',
        'They only automate documentation',
        'They use it to write commit messages',
        'They continuously develop code updates and push them out to systems automatically',
      ],
      correct: 3,
      why: 'Entwickler nutzen laut Video Skripting für kontinuierliche Entwicklung: Code-Updates werden fortlaufend erstellt und automatisch auf die Systeme ausgerollt.',
    },
    {
      q: 'Why do scripts talk to device APIs instead of using the web interface?',
      options: [
        'APIs allow programmatic control of firewalls and cloud infrastructure without manually logging in and clicking',
        'APIs are the only way to power devices on',
        'Web interfaces are always disabled by vendors',
        'APIs bypass all authentication',
      ],
      correct: 0,
      why: 'Über die API steuert das Skript Geräte wie Firewalls oder Cloud-Infrastruktur programmatisch — Änderungen laufen ohne manuelles Einloggen und Klicken.',
    },
    {
      q: 'Why does scripting save time according to the video?',
      options: [
        'Scripts only run once per year',
        'Scripts can run whenever needed, repeat their tasks endlessly, and need no human intervention',
        'Scripts shorten the workday by law',
        'Scripts make backups unnecessary',
      ],
      correct: 1,
      why: 'Skripte laufen laut Video beliebig oft und ohne menschliches Zutun — sie sind so schnell wie das System, auf dem sie laufen, und machen keine Tippfehler.',
    },
    {
      q: 'How can automation enforce a security baseline?',
      options: [
        'By emailing users the baseline document monthly',
        'By disabling all updates',
        'A script watches for a new security patch and deploys it automatically to all systems that need it',
        'By printing the baseline for the audit binder',
      ],
      correct: 2,
      why: 'Baseline-Beispiel aus dem Video: Ein Skript erkennt, dass ein neuer Patch in einem Ordner bereitliegt, und rollt ihn automatisch auf alle betroffenen Systeme aus.',
    },
    {
      q: 'What advantage do scripted standard configurations (e.g., default router configs, firewall rules) provide?',
      options: [
        'They remove the need for any change management',
        'They make devices boot faster',
        'They hide the configuration from auditors',
        'Every deployment is correct and automatically includes all required security controls',
      ],
      correct: 3,
      why: 'Das Video betont: Skriptbasierte Standardkonfigurationen sind korrekt und enthalten immer alle geforderten Security-Einstellungen — identisch auf jedem neuen Gerät.',
    },
    {
      q: 'What must scaling scripts include so that cloud scale-up stays secure?',
      options: [
        'Not only servers and databases, but also firewalls and other security devices',
        'Only additional storage volumes',
        'A manual security review after each scale-up',
        'A downgrade of TLS versions for speed',
      ],
      correct: 0,
      why: 'Beim Skalieren müssen laut Video die Sicherheitskomponenten (Firewalls, Security-Devices) im Skript mitwachsen — sonst skaliert die Anwendung, aber nicht ihr Schutz.',
    },
    {
      q: 'How does automation contribute to employee retention?',
      options: [
        'It monitors employees’ private devices',
        'Staff can leave boring repetitive tasks to scripts and focus on more interesting work',
        'It reduces salaries',
        'It enforces longer working hours',
      ],
      correct: 1,
      why: 'Das Video: Statt jeden Vorfall manuell abzuarbeiten, übernehmen Skripte die Routine — die IT-Mitarbeiter können sich mit interessanteren Aufgaben beschäftigen.',
    },
    {
      q: 'Why is the reaction time of automation better than manual operations?',
      options: [
        'Because technicians type faster under pressure',
        'Because alerts are batched weekly',
        'Scripts monitor 24/7 and can fix problems immediately — e.g., clearing temp files when disk space runs low',
        'Because automation waits for business hours',
      ],
      correct: 2,
      why: 'Beispiel aus dem Video: Ein Skript überwacht den Plattenplatz rund um die Uhr und räumt bei Engpässen sofort temporäre Dateien weg — niemand muss nachts geweckt werden.',
    },
    {
      q: 'Why is automation described as a workforce multiplier?',
      options: [
        'It hires additional employees automatically',
        'It doubles the IT budget',
        'It replaces the security team entirely',
        'Routine problems get resolved by scripts around the clock, so the same team accomplishes far more',
      ],
      correct: 3,
      why: 'Skripte erledigen laut Video Routineprobleme automatisch (24/7, ohne Anruf mitten in der Nacht) — dieselbe Mannschaft schafft dadurch deutlich mehr.',
    },
    {
      q: 'Why is complexity a concern when introducing automation?',
      options: [
        'Scripts interact with many other systems and devices and therefore need a great deal of testing',
        'Scripting languages change daily',
        'Scripts cannot contain comments',
        'Automation only works in small networks',
      ],
      correct: 0,
      why: 'Skripte müssen laut Video mit vielen Systemen zusammenspielen — das macht sie komplex und erfordert umfangreiche Tests, bevor man sich auf sie verlässt.',
    },
    {
      q: 'Which cost factor does the video associate with automation?',
      options: [
        'License fees per script execution',
        'Someone has to design and code each script — that takes time and money',
        'Scripts consume most of the network bandwidth',
        'Automation requires dedicated hardware appliances',
      ],
      correct: 1,
      why: 'Skripte schreiben sich nicht selbst: Entwicklung und Test kosten Zeit und Geld — das ist die im Video genannte Kostenkomponente.',
    },
    {
      q: 'Why can a script become a single point of failure?',
      options: [
        'Because scripts always run as root',
        'Because scripts cannot be version-controlled',
        'If the script stops working, every system that depends on that automation has a significant problem',
        'Because only one person may run a script at a time',
      ],
      correct: 2,
      why: 'Hängt Infrastruktur von einem Skript ab, trifft dessen Ausfall laut Video alle abhängigen Systeme — das Skript ist dann ein Single Point of Failure.',
    },
    {
      q: 'Why do working scripts still need ongoing support?',
      options: [
        'Scripts legally expire after one year',
        'Antivirus deletes old scripts',
        'Scripts must be re-signed monthly',
        'Operating systems and scripting languages change over time, so scripts must be updated to keep working',
      ],
      correct: 3,
      why: 'Laut Video ändern sich Betriebssysteme und Sprachversionen um das Skript herum — jemand muss die Skripte fortlaufend pflegen und aktualisieren.',
    },
  ],
  '058': [
    {
      q: 'What does a cloud responsibility matrix describe?',
      options: [
        'Which security tasks the customer versus the provider handles, varying by service model',
        'How much the cloud subscription costs per month',
        'Which employees are allowed to log into the cloud console',
        'The physical location of the provider’s data centers',
      ],
      correct: 0,
      why: 'Laut Video zeigt die Responsibility Matrix, wer für welchen Bereich zuständig ist — je nach SaaS/PaaS/IaaS/On-Prem verschiebt sich die Grenze zwischen Kunde und Anbieter.',
    },
    {
      q: 'Why is managing security across a hybrid (multi-provider) cloud more complex?',
      options: [
        'Hybrid clouds cannot use encryption at all',
        'Providers rarely talk to each other directly, so settings, logs, and terminology must be reconciled manually across each one',
        'Hybrid clouds are always cheaper than a single provider',
        'Only one provider may be used for production data',
      ],
      correct: 1,
      why: 'Das Video nennt fehlende direkte Kommunikation zwischen Providern, unterschiedliche Log-Formate/Terminologie und manuell abzugleichende Konfigurationen als Kernprobleme des Hybrid-Cloud-Managements.',
    },
    {
      q: 'What does the video recommend for managing third-party cloud technologies (e.g., a firewall vendor in front of your app)?',
      options: [
        'Avoid third parties entirely in the cloud',
        'Let the cloud provider handle all third-party incidents automatically',
        'A vendor risk management policy, plus including third parties in incident response and monitoring',
        'Give every third party full administrative access',
      ],
      correct: 2,
      why: 'Laut Video braucht es eine Vendor-Risk-Management-Policy und die Einbindung der Drittanbieter in Incident Response und laufendes Monitoring.',
    },
    {
      q: 'What is the key advantage of infrastructure as code described in the video?',
      options: [
        'It eliminates the need for any cloud provider',
        'It only works for database servers',
        'It requires manual reconfiguration on every rebuild',
        'The infrastructure definition lives in code, so the exact same instance can be rebuilt on any provider at any time',
      ],
      correct: 3,
      why: 'IaC beschreibt Hosts, Webserver und Datenbanken als Code — dieselbe „perfekte" Instanz lässt sich laut Video jederzeit auf jedem Cloud-Anbieter neu aufbauen.',
    },
    {
      q: 'How does a microservice architecture change application security compared to a monolith?',
      options: [
        'Security is applied once for the entire application, identical everywhere',
        'Security no longer matters since users only talk to the API gateway',
        'Every microservice needs the exact same permissions as every other one',
        'Each microservice can have security appropriate to its own function, e.g. authentication vs. database access',
      ],
      correct: 3,
      why: 'Laut Video läuft jeder Funktionsteil als eigener Service mit eigenem Sicherheitsprozess — ein Auth-Microservice braucht andere Kontrollen als ein DB-lesender Microservice.',
    },
  ],
  '059': [
    {
      q: 'What does an air gap between two switches guarantee?',
      options: [
        'Faster data transfer between the switches',
        'An attacker on one switch has no way to reach devices on the physically isolated other switch',
        'Both switches automatically encrypt all traffic',
        'The switches share a single power supply for redundancy',
      ],
      correct: 1,
      why: 'Beim Air Gap gibt es laut Video keinerlei physische Verbindung — ein Angreifer auf Switch A kommt ohne explizite Verbindung nicht auf Switch B.',
    },
    {
      q: 'How do VLANs achieve the same isolation as physically separate switches?',
      options: [
        'By assigning interfaces to different VLANs on the same physical switch, which cannot communicate directly with each other',
        'By running two independent power cables to the switch',
        'By encrypting traffic between every port',
        'By requiring a password for every VLAN',
      ],
      correct: 0,
      why: 'VLANs trennen laut Video Interfaces logisch auf demselben physischen Switch; VLANs können nicht direkt miteinander kommunizieren — wie zwei separate Switches, aber mit weniger Hardware.',
    },
    {
      q: 'Which three planes does SDN separate a network device into?',
      options: [
        'Data plane, control plane, and management plane',
        'Physical plane, virtual plane, and cloud plane',
        'Input plane, output plane, and error plane',
        'Encryption plane, routing plane, and logging plane',
      ],
      correct: 0,
      why: 'SDN teilt Geräte laut Video in Data Plane (Forwarding), Control Plane (Routing-/Sitzungstabellen) und Management Plane (Konfiguration, z. B. per SSH) — dadurch lassen sich diese Funktionen als Software in der Cloud abbilden.',
    },
  ],
  '060': [
    {
      q: 'What is a key security trade-off of on-premises infrastructure compared to the cloud, according to the video?',
      options: [
        'Complete control over decisions and systems, but the organization bears the full support cost',
        'No IT staff is needed to run on-premises systems',
        'On-premises systems cannot be secured at all',
        'The attacker cares whether security is on-premises or in the cloud',
      ],
      correct: 0,
      why: 'Laut Video bedeutet On-Premises volle Kontrolle über Entscheidungen und Systeme — aber auch die volle Kostenlast für gut ausgebildetes eigenes Personal.',
    },
    {
      q: 'Why do many organizations build a single consolidated management console for decentralized systems?',
      options: [
        'To eliminate the need for any monitoring',
        'To reduce the number of employees needed to zero',
        'Because decentralized systems (multiple sites, clouds, OSes) are hard to secure individually, so a single console gives consolidated visibility — at the cost of a single point of failure',
        'Because decentralized systems are always more secure by default',
      ],
      correct: 2,
      why: 'Das Video nennt konsolidierte Alerts/Logs/Updates als Antwort auf verteilte Systeme — mit der Kehrseite, dass der Verlust dieser einen Konsole die gesamte Sichtbarkeit kostet.',
    },
    {
      q: 'Why does the video flag IoT devices as a particular security concern?',
      options: [
        'IoT devices cannot connect to a network at all',
        'Their manufacturers are good at the device’s core function but not necessarily security, and one exploited device can expose the whole network',
        'IoT devices are immune to exploitation',
        'IoT devices always use stronger encryption than servers',
      ],
      correct: 1,
      why: 'Laut Video sind Hersteller von Thermostaten, Türklingeln & Co. gut in ihrem Kerngeschäft, aber nicht zwingend Sicherheitsexperten — ein einziges kompromittiertes Gerät reicht als Einstieg ins Netz.',
    },
    {
      q: 'Why does an RTOS (e.g., in a car’s anti-lock brakes) need to be deterministic?',
      options: [
        'So the system can wait for antivirus scans before responding',
        'A critical process must be able to immediately take priority over everything else — there is no time to wait',
        'So multiple unrelated apps can share resources fairly',
        'Determinism only matters for desktop operating systems',
      ],
      correct: 1,
      why: 'Ein RTOS muss laut Video sofort und garantiert reagieren können (z. B. ABS-Bremsung) — ein nicht-deterministisches System wie Windows/Linux kann das nicht zusichern.',
    },
    {
      q: 'What characterizes an embedded system according to the video?',
      options: [
        'It runs a general-purpose OS with an app store',
        'It is a self-contained, purpose-built combination of hardware and software designed for one single function',
        'It requires constant internet connectivity to function',
        'It is always the most powerful component in a larger system',
      ],
      correct: 1,
      why: 'Beispiele im Video: Ampeln, Digitaluhren, medizinische Überwachungsgeräte — jeweils zweckgebunden gebaut, ohne offenen Zugriff auf ein Allzweck-Betriebssystem.',
    },
    {
      q: 'How does high availability differ from simple redundancy, according to the video?',
      options: [
        'HA components sit ready and always-on, taking over immediately, while a merely redundant spare may need to be unboxed and configured first',
        'HA means having exactly one device with no backup',
        'Redundancy is always more expensive than HA',
        'HA only applies to power supplies',
      ],
      correct: 0,
      why: 'Redundanz allein heißt laut Video u. U. Ersatzgerät auspacken/einbauen/konfigurieren; HA-Systeme laufen bereits parallel und übernehmen sofort bei einem Ausfall.',
    },
  ],
  '061': [
    {
      q: 'How is availability commonly reported as a metric, according to the video?',
      options: [
        'As an uptime percentage, e.g. 99.999% over the last 12 months',
        'As a single yes/no flag with no history',
        'Only as the number of support tickets filed',
        'Only as total revenue generated',
      ],
      correct: 0,
      why: 'Laut Video ist Uptime eine so wichtige Kennzahl, dass Erfolg oft direkt als Prozentsatz beschrieben wird, z. B. „99,999 % Verfügbarkeit über 12 Monate".',
    },
    {
      q: 'Which metric does the video use to describe resilience after an outage?',
      options: [
        'MTTR (mean time to repair) — how long it takes to replace what’s unavailable with something available',
        'The number of firewalls installed',
        'The color-coding of the network diagram',
        'The age of the hardware',
      ],
      correct: 0,
      why: 'MTTR beschreibt laut Video, wie lange der Ersatz eines ausgefallenen Bauteils dauert — eine zentrale Resilienz-Kennzahl.',
    },
    {
      q: 'Why is calculating the true cost of an infrastructure decision difficult, per the video?',
      options: [
        'Cost is only ever a one-time installation fee',
        'It combines installation, ongoing maintenance, depreciation, operational costs, and tax implications',
        'Accounting never gets involved in IT cost decisions',
        'Cloud services have no associated cost',
      ],
      correct: 1,
      why: 'Das Video nennt Installations-, Wartungs- und Ersatzkosten plus Abschreibung, Betriebskosten und Steuerfolgen — Cost ist kein einzelner Wert.',
    },
    {
      q: 'Why can responsiveness be hard to quantify for a single application, according to the video?',
      options: [
        'Responsiveness is identical for every function of an app',
        'A transaction may involve multiple steps, so some functions respond quickly while others take longer',
        'Responsiveness is only measured once a year',
        'Users never notice response delays',
      ],
      correct: 1,
      why: 'Laut Video variiert die Antwortzeit je nach Funktion innerhalb derselben Anwendung — manche Schritte sind schnell, andere brauchen mehr Verarbeitung.',
    },
    {
      q: 'What does "elasticity" describe in the context of scalability?',
      options: [
        'How quickly an application’s footprint can expand and contract with demand',
        'The physical flexibility of network cabling',
        'How many users are allowed to register per day',
        'The encryption strength used by the application',
      ],
      correct: 0,
      why: 'Elastizität beschreibt laut Video, wie schnell die Kapazität einer Anwendung mit der Last mitwachsen und wieder schrumpfen kann — oft automatisch im Hintergrund.',
    },
    {
      q: 'What must be planned alongside the technical infrastructure when deploying an application, per the video?',
      options: [
        'Nothing — cloud deployments require no planning',
        'Hardware resources, budget, and change control processes',
        'Only the marketing launch date',
        'The application’s logo design',
      ],
      correct: 1,
      why: 'Das Video nennt Hardware-Ressourcen, Budget und Change-Control-Prozesse als Teile der Deployment-Planung — fehlt einer davon, verzögert sich die gesamte Umsetzung.',
    },
    {
      q: 'How does cybersecurity insurance provide risk transference, per the video?',
      options: [
        'It prevents ransomware attacks from happening',
        'It automatically patches vulnerable systems',
        'It can help recoup financial losses and legal costs from an incident such as ransomware, without stopping the attack itself',
        'It replaces the need for backups',
      ],
      correct: 2,
      why: 'Cyber-Versicherung verhindert laut Video keinen Angriff, kann aber finanzielle Verluste und Rechtskosten nach einem Vorfall wie Ransomware abfedern.',
    },
    {
      q: 'Which recovery approach does the video call much faster and cheaper after a malware infection?',
      options: [
        'Reloading the OS from original installation media, which can take about an hour',
        'Restoring from an image backup, which can take about 10 minutes',
        'Calling the vendor and waiting for a replacement device',
        'Manually reviewing every file for infection',
      ],
      correct: 1,
      why: 'Beide Wege führen laut Video zum selben sauberen System, aber die Wiederherstellung aus einem Image-Backup (≈10 Minuten) ist deutlich schneller und billiger als die Neuinstallation von Medien (≈1 Stunde).',
    },
    {
      q: 'What does the video describe as normal practice for patch availability at most organizations?',
      options: [
        'Patches are installed exactly once per device, forever',
        'Regular patches (e.g., monthly from Microsoft) are tested, then deployed to production as quickly as possible',
        'Patching is skipped unless a breach has already occurred',
        'Only the operating system vendor may install patches',
      ],
      correct: 1,
      why: 'Laut Video ist regelmäßiges Patchen (monatlich u. a. von Microsoft) Standard-IT-Prozess: erst testen, dann so schnell wie möglich ausrollen.',
    },
    {
      q: 'Which type of systems does the video give as an example of devices that often cannot be patched?',
      options: [
        'Cloud-based web applications',
        'Purpose-built embedded systems like HVAC controls or time clocks with no internet connectivity',
        'Standard Windows desktops',
        'Virtual machines running in a data center',
      ],
      correct: 1,
      why: 'Embedded Systeme wie HVAC-Steuerungen oder Stechuhren haben laut Video oft keine Konnektivität und keinen Patch-Prozess — zusätzliche Absicherung (z. B. eine vorgelagerte Firewall) wird dann nötig.',
    },
    {
      q: 'What does the video recommend for planning an organization’s power infrastructure?',
      options: [
        'Ignoring power planning since it rarely causes issues',
        'Bringing in a licensed electrician to assess current usage and plan for future needs, since requirements differ (e.g., data center vs. office)',
        'Using only battery power for all systems',
        'Relying solely on a single wall outlet per rack',
      ],
      correct: 1,
      why: 'Laut Video ist Strom eine oft unterschätzte, aber zentrale Komponente — ein Elektriker sollte den Bedarf einschätzen, der je nach Standort (Rechenzentrum vs. Büro) stark variiert.',
    },
  ],
  '063': [
    {
      q: 'What happens to network traffic when a fail-open security device crashes?',
      options: [
        'Traffic continues to flow with no security inspection',
        'All traffic is immediately blocked',
        'The device automatically reboots and traffic waits',
        'Traffic is rerouted to a cloud backup',
      ],
      correct: 0,
      why: 'Bei Fail-open läuft laut Video der Verkehr beim Ausfall weiter durch — ohne Sicherheitsprüfung, aber das Netz bleibt erreichbar.',
    },
    {
      q: 'What happens to network traffic when a fail-closed security device crashes?',
      options: [
        'Traffic continues to flow normally',
        'Only encrypted traffic is allowed through',
        'Not only does security stop working, the connection itself is severed and communication stops',
        'The device switches to passive monitoring automatically',
      ],
      correct: 2,
      why: 'Bei Fail-closed wird laut Video die Verbindung beim Ausfall komplett unterbrochen — sicherer gegen Bedrohungen, aber es entsteht ein Netzausfall.',
    },
    {
      q: 'What is the key difference between active (inline) and passive monitoring, per the video?',
      options: [
        'Passive monitoring uses more bandwidth than active monitoring',
        'Active monitoring can block malicious traffic in real time; passive monitoring only inspects a copy and cannot stop it',
        'Active monitoring never sees encrypted traffic',
        'There is no functional difference between them',
      ],
      correct: 1,
      why: 'Inline/aktives Monitoring kann laut Video Traffic in Echtzeit blockieren; passives Monitoring erhält nur eine Kopie und kann nichts direkt verhindern.',
    },
    {
      q: 'How does a passive IPS deployment typically receive a copy of network traffic?',
      options: [
        'Through a port mirror/SPAN on the switch, or a physical network tap',
        'By directly rewriting the destination IP of every packet',
        'By requesting it manually from each device once a day',
        'Passive deployments cannot receive traffic at all',
      ],
      correct: 0,
      why: 'Laut Video liefert ein Port-Mirror/SPAN am Switch oder ein physischer Netzwerk-Tap dem passiv angeschlossenen Gerät eine Kopie des Traffics, ohne im Pfad zu liegen.',
    },
    {
      q: 'How can an IPS block malicious traffic even without a specific signature for it, per the video?',
      options: [
        'By looking for anomalies or trends that resemble a generic intrusion, such as a database injection pattern',
        'It cannot block anything without a matching signature',
        'By blocking all traffic on the network permanently',
        'By asking the user to approve each connection manually',
      ],
      correct: 0,
      why: 'Laut Video kann ein IPS auch ohne konkrete Signatur anomales Verhalten (z. B. ein generisches Injection-Muster) erkennen und blockieren.',
    },
    {
      q: 'What does an IPS signature, such as the example written for the Conficker worm, actually match against?',
      options: [
        'A very specific type of traffic pattern; if traffic matches it, the IPS can allow or block it',
        'The physical MAC address of the sending device only',
        'The time zone of the sender',
        'The color scheme of the web page being requested',
      ],
      correct: 0,
      why: 'Laut Video sucht eine IPS-Signatur (Beispiel: Conficker-Wurm) nach einem sehr spezifischen Traffic-Muster — passt der Verkehr, kann das IPS reagieren.',
    },
  ],
  '064': [
    {
      q: 'What distinguishes an IPS from an IDS, according to the video overview of network appliances?',
      options: [
        'An IDS can block traffic but an IPS cannot',
        'An IPS can block dangerous traffic in real time; an IDS can only alert on it',
        'They are two names for exactly the same capability',
        'An IDS only works on wireless networks',
      ],
      correct: 1,
      why: 'Ein IPS blockt laut Video gefährlichen Traffic in Echtzeit, ein IDS kann nur alarmieren, nicht verhindern.',
    },
  ],
  '069': [
    {
      q: 'Is unencrypted data on a storage device still considered "data at rest"?',
      options: [
        'No, only encrypted data on disk counts as data at rest',
        'Yes — any data saved on a storage device is data at rest, regardless of encryption',
        'Only if the device is powered off',
        'Only cloud storage counts as data at rest',
      ],
      correct: 1,
      why: 'Laut Video ist jede auf einem Speichergerät abgelegte Information Data at Rest — Verschlüsselung ist eine zusätzliche, aber keine notwendige Bedingung für diese Einstufung.',
    },
    {
      q: 'Why did attackers in the 2013 Target breach target data in use rather than data at rest or in transit?',
      options: [
        'Target had no encryption anywhere in their network',
        'Data in memory/CPU is almost always decrypted so it can be processed, making it easy to read once accessed',
        'Data in use is always encrypted, making it a challenge attackers enjoy',
        'Target stored no data in RAM at all',
      ],
      correct: 1,
      why: 'Target verschlüsselte laut Video Data at Rest und in Transit — aber die Kreditkartendaten lagen im RAM der POS-Terminals unverschlüsselt vor (Data in Use), weil sie dort verarbeitet werden mussten.',
    },
    {
      q: 'Which technologies does the video mention as sources for geolocation?',
      options: [
        'Only manual self-reported addresses',
        'GPS, 802.11 wireless information, and mobile provider details',
        'Only the device’s MAC address',
        'Only credit card billing addresses',
      ],
      correct: 1,
      why: 'Das Video nennt GPS, 802.11-Informationen und Mobilfunkanbieter-Daten als Bausteine der Geolokalisierung.',
    },
    {
      q: 'A stolen laptop is powered off and its SSD contains customer records. Which control most directly protects this data state?',
      options: [
        'Full-disk encryption with protected recovery keys',
        'TLS on the corporate web server',
        'A load balancer in front of the application',
        'Input validation on the login form',
      ],
      correct: 0,
      why: 'Die Kundendaten liegen auf dem SSD und sind damit Data at Rest. Full-Disk Encryption schützt genau diesen Zustand; TLS schützt dagegen Data in Transit.',
    },
    {
      q: 'A payment application decrypts card data in RAM so the CPU can process it. Which protection best addresses this exposed data state?',
      options: [
        'Limit process access and use a trusted execution environment where supported',
        'Encrypt only the database backup stored offline',
        'Replace HTTPS with an unencrypted internal protocol',
        'Publish the memory dump to a shared troubleshooting folder',
      ],
      correct: 0,
      why: 'Während der Verarbeitung handelt es sich um Data in Use. Zugriffsbeschränkung und gegebenenfalls Secure Enclaves schützen den laufenden Prozess besser als reine Speicher- oder Transportverschlüsselung.',
    },
  ],
  '070': [
    {
      q: 'What does the video call the property where encrypted data looks dramatically different from the original?',
      options: [
        'Confusion',
        'Compression',
        'Collision',
        'Correlation',
      ],
      correct: 0,
      why: 'Das Video nennt diese dramatische Veränderung zwischen Klartext und Chiffretext „confusion" — ein Kernziel guter Verschlüsselung.',
    },
    {
      q: 'Why can’t you recreate the original data from its hash, per the video’s fingerprint analogy?',
      options: [
        'A hash is just as reversible as encryption',
        'Like a fingerprint identifies a person without recreating the whole person, a hash identifies data without allowing reconstruction of it',
        'Hashes only work on numeric data',
        'Hashes are always shorter than the encryption key',
      ],
      correct: 1,
      why: 'Ein Fingerabdruck identifiziert laut Video eine Person, ohne die Person daraus zu rekonstruieren — genauso identifiziert ein Hash Daten, ohne sie umkehrbar zu machen.',
    },
    {
      q: 'What does data masking typically show on a receipt, per the video example?',
      options: [
        'The full, unaltered card number',
        'Only the last four digits, with the rest hidden by asterisks',
        'A completely different randomly generated number',
        'No card information at all',
      ],
      correct: 1,
      why: 'Auf der Quittung zeigt Masking laut Video nur die letzten vier Ziffern der Karte, der Rest wird mit Sternchen verdeckt — im Hintergrund kennt der Zahlungsdienstleister die volle Nummer.',
    },
    {
      q: 'Why can a captured mobile-payment token not be reused by an attacker, per the video?',
      options: [
        'Because the token is a one-time-use value that becomes invalid after its first use',
        'Because tokens are always sent in plaintext but ignored by the store',
        'Because the token contains the customer’s real card number in disguise',
        'Because tokens never leave the phone',
      ],
      correct: 0,
      why: 'Der Token beim mobilen Bezahlen ist laut Video ein Einmalwert — einmal benutzt, kann er nicht erneut eingesetzt werden (kein Replay möglich).',
    },
    {
      q: 'What does obfuscating a line of code accomplish, per the video?',
      options: [
        'It changes what the code does when executed',
        'It makes the code run faster',
        'It makes the code produce a different output than the original',
        'The obfuscated code produces the exact same output but is much harder for a human to read',
      ],
      correct: 3,
      why: 'Das PHP-Beispiel im Video liefert nach der Obfuskierung exakt dieselbe Ausgabe „Hello, world" — nur der Quellcode ist für Menschen kaum noch lesbar.',
    },
    {
      q: 'Why does splitting data across multiple smaller databases (segmentation) help security, per the video?',
      options: [
        'It makes backups unnecessary',
        'An attacker who breaches one database does not automatically gain access to all the data — each database can also get its own security level',
        'It removes the need for any authentication',
        'It automatically encrypts the data in each database',
      ],
      correct: 1,
      why: 'Laut Video verhindert Segmentierung, dass ein einziger Einbruch gleich den kompletten Datenbestand offenlegt, und erlaubt gestaffelte Sicherheitsstufen je nach Inhalt.',
    },
    {
      q: 'Where do permission restrictions start, according to the video?',
      options: [
        'With the encryption algorithm used for backups',
        'With the authentication process itself — safe login, minimum password policy, and possibly additional factors',
        'Only after a user has already been granted full access',
        'With the physical security of the building',
      ],
      correct: 1,
      why: 'Permission Restrictions beginnen laut Video schon beim Login-Prozess (Passwortrichtlinie, ggf. weitere Faktoren) und setzen sich in Gruppen-/Dateirechten nach der Anmeldung fort.',
    },
  ],
  '071': [
    {
      q: 'What is the key structural difference between server clustering and load balancing, per the video?',
      options: [
        'In a cluster, each server knows about the others and shares storage; with load balancing, servers have no knowledge of each other and the load balancer manages distribution',
        'Clustering requires a load balancer, but load balancing does not',
        'Load balancing only works with a single server',
        'Clustering and load balancing are exactly the same technique',
      ],
      correct: 0,
      why: 'Im Cluster kennen sich die Server laut Video gegenseitig und teilen sich Storage; beim Load Balancing wissen die Server nichts voneinander — der Load Balancer verteilt die Last zentral.',
    },
    {
      q: 'How does a warm site differ from a hot and a cold site, per the video?',
      options: [
        'A warm site has some equipment and possibly some data on-site, unlike a cold site’s empty building or a hot site’s exact replica',
        'A warm site is always more expensive than a hot site',
        'A warm site has no equipment at all, like a cold site',
        'A warm site is an exact live replica of the primary data center',
      ],
      correct: 0,
      why: 'Der Warm Site liegt laut Video zwischen Cold (leeres Gebäude) und Hot (exakte, laufend synchronisierte Kopie) — teilweise Ausstattung/Daten sind vorhanden, der Rest muss mitgebracht werden.',
    },
    {
      q: 'Why does the video recommend placing a recovery site far from the primary location?',
      options: [
        'So a regional disaster like a hurricane is unlikely to affect both sites simultaneously',
        'Distance has no effect on disaster recovery',
        'To reduce the electricity bill',
        'To make transporting equipment easier',
      ],
      correct: 0,
      why: 'Ein weit entferntes Recovery-Standort schützt laut Video davor, dass ein regionales Ereignis (Sturm, Flut) beide Standorte gleichzeitig trifft — bringt aber mehr Logistikaufwand mit sich.',
    },
    {
      q: 'What resilience benefit does using multiple cloud providers offer, per the video?',
      options: [
        'An outage or security concern with one provider does not automatically take down services hosted with another',
        'Multi-cloud eliminates the need for any redundancy planning',
        'It guarantees lower costs than a single provider',
        'It removes the need for platform diversity',
      ],
      correct: 0,
      why: 'Laut Video beeinträchtigt ein Ausfall oder Sicherheitsvorfall bei einem Cloud-Anbieter nicht automatisch die bei einem anderen Anbieter gehosteten Dienste.',
    },
    {
      q: 'What is Continuity of Operations Planning (COOP) about, per the video?',
      options: [
        'Automatically failing over to a hot site within seconds',
        'Nontechnical fallback processes (e.g., manual paper transactions) for when no technology is available at all',
        'A type of encryption used for backups',
        'A cloud provider’s uptime guarantee',
      ],
      correct: 1,
      why: 'COOP beschreibt laut Video den nicht-technischen Rückfall (z. B. manuelle Papierprozesse), wenn gar keine Technik verfügbar ist — muss vorab geplant sein, damit er im Ernstfall funktioniert.',
    },
  ],
  '074': [
    {
      q: 'What is the main trade-off between onsite and offsite backups, per the video?',
      options: [
        'Onsite backups are immediately available and cheaper; offsite backups add cost but survive a local disaster',
        'Offsite backups are always immediately available at zero cost',
        'Onsite backups can never be restored',
        'There is no difference between the two',
      ],
      correct: 0,
      why: 'Onsite-Backups sind laut Video sofort verfügbar und günstiger, kosten aber im Katastrophenfall den Standort mit; Offsite-Backups sind teurer, aber vom lokalen Ereignis unabhängig.',
    },
    {
      q: 'What determines how often a system should be backed up, per the video?',
      options: [
        'Every system must be backed up exactly once per year',
        'The total amount of data and how often that data actually changes on that particular system',
        'Backup frequency is fixed by law for all systems',
        'Frequency has no relation to how much data changes',
      ],
      correct: 1,
      why: 'Laut Video richtet sich das Intervall nach Datenmenge und Änderungshäufigkeit — ein selten geändertes System braucht kein stündliches Backup.',
    },
    {
      q: 'Why does the video stress encrypting backup data, especially in the cloud?',
      options: [
        'Backup tapes can be physically lost or stolen (as in a real incident described), and cloud-stored backups are accessible to unknown third parties without it',
        'Encryption makes backups faster to restore',
        'Unencrypted backups cannot be written to tape',
        'Encryption is only relevant for backups stored onsite',
      ],
      correct: 0,
      why: 'Das Video erzählt vom Diebstahl unverschlüsselter Backup-Bänder aus einem Auto — und betont, dass Cloud-Backups ohne Verschlüsselung für unbekannte Dritte einsehbar wären.',
    },
    {
      q: 'How do daily VM snapshots behave like incremental backups, per the video?',
      options: [
        'Each snapshot re-copies the entire virtual disk from scratch every time',
        'Each new snapshot only needs to save the changes since the previous one, not the whole VM again',
        'Snapshots can only be taken once per month',
        'Snapshots cannot be rolled back to a previous state',
      ],
      correct: 1,
      why: 'Im Beispiel (Montag 100 GB, Dienstag 40 GB geändert) speichert laut Video jeder Snapshot nur die Änderungen seit dem letzten — wie ein inkrementelles Backup.',
    },
    {
      q: 'Why does the video insist that a backup strategy include recovery testing?',
      options: [
        'Because writing a backup automatically guarantees a successful restore',
        'Restoring the data is only half the test — applications must also be verified to properly use the restored data',
        'Recovery testing is optional and rarely worth the effort',
        'Recovery only needs to be tested once, at initial setup',
      ],
      correct: 1,
      why: 'Laut Video ist das Wiederherstellen der Daten erst die halbe Miete — man muss auch prüfen, dass Anwendungen mit den wiederhergestellten Daten tatsächlich funktionieren.',
    },
    {
      q: 'How does journaling protect against corruption from a power loss during a write, per the video?',
      options: [
        'Data is first written to a journal; if power fails before the journal is committed to the database, the database itself stays uncorrupted',
        'Journaling prevents power outages from occurring',
        'Journaling encrypts all data before writing it',
        'Journaling replaces the need for any backup',
      ],
      correct: 0,
      why: 'Beim Journaling wird laut Video zuerst in ein Journal geschrieben; geht der Strom vor dem Commit in die Datenbank aus, verliert man nur den Journal-Eintrag — die Datenbank bleibt konsistent, notfalls per Journal-Nachvollzug beim Neustart repariert.',
    },
  ],
  '005': [
    {
      q: 'What does the "authentication" step in AAA prove about a person?',
      options: [
        'That they know the secret password or hold the additional factors that prove they are who they claim to be',
        'That they are part of a particular department',
        'That their login attempt has been logged for accounting',
        'That they have physical access to the building',
      ],
      correct: 0,
      why: 'Authentication ist laut Video der Nachweis, dass jemand wirklich die Person ist, die er behauptet zu sein — belegt durch Passwort und ggf. weitere Faktoren.',
    },
    {
      q: 'How can a device (not a person) prove it is authorized to connect to the network, per the video?',
      options: [
        'By typing a password like a human would',
        'Devices cannot be authenticated at all',
        'By presenting a digitally signed certificate issued by a trusted certificate authority',
        'By simply having a known IP address',
      ],
      correct: 2,
      why: 'Ein System kann kein Passwort eintippen — laut Video übernimmt ein von der eigenen CA digital signiertes Zertifikat auf dem Gerät diese Rolle.',
    },
    {
      q: 'Why does the video recommend an authorization model (e.g., groups) instead of assigning rights user by user?',
      options: [
        'Individual rights per user scale poorly with hundreds or thousands of users and resources; a group-based abstraction scales easily',
        'Individual rights are always more secure than groups',
        'Authorization models remove the need for authentication',
        'Groups can only be used for shipping and receiving departments',
      ],
      correct: 0,
      why: 'Das Video zeigt: Rechte einzeln pro Nutzer zu vergeben skaliert nicht — eine Gruppen-Abstraktion erlaubt es, tausende Nutzer mit einer Zuweisung zu verwalten.',
    },
  ],
  '007': [
    {
      q: 'What is an implicit trust zone in the zero trust model described in the video?',
      options: [
        'A zone where no security policy ever applies at all',
        'A policy that treats trusted-to-internal traffic as already trusted for that segment',
        'A zone reserved exclusively for unmanaged guest devices',
        'A zone where multi-factor authentication is always disabled',
      ],
      correct: 1,
      why: 'Laut Video kann man festlegen, dass Kommunikation von der Trusted- in die Internal-Zone auf diesem Abschnitt implizit vertraut wird — eine bewusste Policy-Entscheidung, kein Standardzustand.',
    },
    {
      q: 'What counts as a "subject" or "system" that the Policy Enforcement Point evaluates, per the video?',
      options: [
        'Only human administrators',
        'Only network cables',
        'Users, individual processes running on a system, and applications in use',
        'Only physical security guards',
      ],
      correct: 2,
      why: 'Subjects/Systems sind laut Video Nutzer, laufende Prozesse und Anwendungen — jeder Traffic von ihnen muss den Policy Enforcement Point passieren.',
    },
  ],
  '008': [
    {
      q: 'What is the main purpose of bollards, per the video?',
      options: [
        'To encrypt data as it enters the building lobby',
        'To block vehicles while still letting pedestrians pass, channeling foot traffic',
        'To detect nighttime motion using infrared sensors',
        'To completely replace security guards on site',
      ],
      correct: 1,
      why: 'Bollards/Barrikaden lassen laut Video Fußgänger durch, verhindern aber, dass Autos oder Lastwagen in den Bereich gelangen, und kanalisieren so den Zugang.',
    },
    {
      q: 'What design choices does the video mention for making a fence more secure?',
      options: [
        'Making the fence opaque only, never transparent',
        'A very high fence with razor wire to prevent climbing, built robust enough that it cannot be bent or knocked down',
        'Fences never need any additional reinforcement',
        'Only the color of the fence matters for security',
      ],
      correct: 1,
      why: 'Laut Video sollen Zäune robust sein, damit sie nicht verbogen/eingedrückt werden können — in hochsicheren Bereichen zusätzlich sehr hoch mit Stacheldraht gegen Überklettern.',
    },
    {
      q: 'What does the video say happens each time you badge into a room?',
      options: [
        'Nothing is recorded',
        'The badge event is logged to a central database, often integrated with the electronic door locks',
        'The badge is automatically deactivated',
        'A new badge is issued',
      ],
      correct: 1,
      why: 'Zutrittsbadges sind laut Video mit elektronischen Türschlössern integriert — jedes Badgen wird in einer zentralen Datenbank protokolliert.',
    },
    {
      q: 'Why does the video say lighting angle matters, not just brightness?',
      options: [
        'Angle has no effect, only total brightness matters',
        'Lighting is purely decorative and has no security value',
        'Proper angles matter especially for cameras doing facial recognition, and full-area illumination discourages someone trying to sneak in unseen',
        'Lighting only matters indoors, never in parking lots',
      ],
      correct: 2,
      why: 'Laut Video muss Beleuchtung den ganzen Bereich ausleuchten, und der Lichtwinkel ist besonders für Gesichtserkennungskameras wichtig — mehr Licht erschwert unbemerktes Eindringen.',
    },
    {
      q: 'What can infrared sensors detect, per the video?',
      options: [
        'Only visible light changes during the day',
        'Sound wave reflections over a large area',
        'Infrared radiation in both light and dark areas, commonly used in motion detectors over a relatively limited area',
        'Only barcode scans',
      ],
      correct: 2,
      why: 'Infrarotsensoren erkennen laut Video Wärmestrahlung bei Tag und Nacht und eignen sich gut für Bewegungsmelder in begrenzten Bereichen.',
    },
    {
      q: 'How does a pressure sensor detect an intrusion, per the video?',
      options: [
        'By measuring air temperature changes',
        'By detecting a change in force when someone moves across the monitored area',
        'By scanning for Bluetooth signals',
        'By reading badge RFID chips remotely',
      ],
      correct: 1,
      why: 'Drucksensoren registrieren laut Video die Kraftänderung, wenn jemand über den überwachten Bereich läuft, und lösen dann einen Alarm aus.',
    },
    {
      q: 'Why would you choose microwave sensors over infrared, per the video?',
      options: [
        'Microwave sensors only work indoors',
        'Microwave sensors are designed to detect movement over a much larger area than infrared',
        'Microwave sensors cannot detect movement at all',
        'Microwave sensors require direct sunlight to function',
      ],
      correct: 1,
      why: 'Laut Video eignen sich Mikrowellensensoren für deutlich größere Überwachungsflächen als Infrarot, das eher begrenzte Bereiche abdeckt.',
    },
    {
      q: 'How does ultrasonic detection work, according to the video?',
      options: [
        'By sending ultrasonic signals and analyzing the reflection of sound waves to detect motion, e.g. for collision detection in a parking lot',
        'By reading heat signatures like an infrared sensor',
        'By scanning fingerprints at a distance',
        'By measuring the weight distributed on a floor plate',
      ],
      correct: 0,
      why: 'Ultraschallsensoren senden laut Video Signale aus und werten die Reflexion der Schallwellen aus — nutzbar für Bewegungs- und Kollisionserkennung, etwa in Parkbereichen.',
    },
  ],
  '013': [
    {
      q: 'Which Windows and macOS technologies does the video name for full-disk encryption?',
      options: [
        'BitLocker on Windows and FileVault on macOS',
        'EFS on both Windows and macOS',
        'TLS on Windows and IPsec on macOS',
        'SHA-256 on both platforms',
      ],
      correct: 0,
      why: 'Für Full-Disk-/Volume-Verschlüsselung nennt das Video BitLocker (Windows) und FileVault (macOS).',
    },
    {
      q: 'What does the video mean by encrypting at the volume/partition level rather than a single file?',
      options: [
        'Only the file name is encrypted, not its content',
        'Everything on that specific volume or partition is encrypted, not just individual files',
        'Partition-level encryption is identical to database column encryption',
        'It encrypts data only while it travels across the network',
      ],
      correct: 1,
      why: 'Volume-/Partitionsverschlüsselung deckt laut Video den gesamten Datenträgerbereich ab — mehr als eine einzelne Datei, aber im Kern dieselbe Full-Disk-Technik wie BitLocker/FileVault.',
    },
    {
      q: 'What does EFS provide, according to the video?',
      options: [
        'Network-level encryption for VPN tunnels',
        'File-level encryption built into the NTFS file system, for encrypting individual files rather than an entire volume',
        'A hashing algorithm for passwords',
        'Full-disk encryption identical to BitLocker',
      ],
      correct: 1,
      why: 'EFS (Encrypting File System) verschlüsselt laut Video gezielt einzelne Dateien in NTFS, statt das ganze Volume wie BitLocker.',
    },
    {
      q: 'What database encryption approach does the video describe as encrypting "everything" with one symmetric key?',
      options: [
        'Column-level encryption',
        'Transparent encryption',
        'Record-level encryption',
        'Tokenization',
      ],
      correct: 1,
      why: 'Transparent Encryption verschlüsselt laut Video die gesamte Datenbank mit einem symmetrischen Schlüssel — im Gegensatz zur gezielteren Spaltenverschlüsselung.',
    },
    {
      q: 'Why must both sides of an encrypted conversation use the same algorithm, per the video’s DES/AES comparison?',
      options: [
        'You cannot encrypt with one algorithm (e.g., DES) and decrypt with an incompatible one (e.g., AES)',
        'Algorithm choice never matters as long as a key is used',
        'DES and AES are interchangeable at the bit level',
        'Only the receiving side needs to know the algorithm',
      ],
      correct: 0,
      why: 'DES und AES arbeiten laut Video grundlegend unterschiedlich — beide Seiten müssen dasselbe kompatible Verfahren nutzen, sonst lässt sich die Verschlüsselung nicht rückgängig machen.',
    },
  ],
  '015': [
    {
      q: 'What distinguishes a secure enclave from the main CPU, per the video?',
      options: [
        'It is the exact same processor, just renamed',
        'It is a separate dedicated security processor with its own boot ROM, true random number generator, and built-in unchangeable cryptographic keys',
        'It only exists in cloud servers, never on phones or laptops',
        'It replaces the need for a TPM entirely',
      ],
      correct: 1,
      why: 'Laut Video ist der Secure Enclave ein eigener, vom Haupt-CPU getrennter Sicherheitsprozessor mit eigenem Boot-ROM, echtem Zufallsgenerator und unveränderlichen Krypto-Schlüsseln.',
    },
  ],
  '019': [
    {
      q: 'What is the role of a certificate authority, per the video?',
      options: [
        'It stores unencrypted user passwords for websites',
        'It digitally signs certificates, so anyone who trusts the CA can also trust the certificate holder',
        'It only issues certificates for internal networks, never public websites',
        'It replaces the need for HTTPS',
      ],
      correct: 1,
      why: 'Eine Zertifizierungsstelle signiert laut Video Zertifikate digital — vertraut der Browser der CA, vertraut er automatisch dem Zertifikatsinhaber.',
    },
    {
      q: 'What distinguishes a third-party-issued certificate from a self-signed one, per the video?',
      options: [
        'A third-party certificate is validated and digitally signed by an external CA that browsers already trust, unlike a self-signed certificate',
        'Third-party certificates never expire',
        'Self-signed certificates are always more trusted than third-party ones',
        'There is no practical difference between the two',
      ],
      correct: 0,
      why: 'Ein Drittanbieter-Zertifikat wird laut Video von einer externen, im Browser bereits vertrauten CA geprüft und signiert — im Gegensatz zu einem selbstsignierten Zertifikat ohne diese Prüfung.',
    },
    {
      q: 'What does a wildcard certificate’s Subject Alternative Name allow, per the video?',
      options: [
        'It only works for exactly one specific subdomain',
        'It can be used for any device sharing the domain, e.g. *.example.com covers www, ftp, and mail subdomains',
        'It removes the need for a certificate authority',
        'It only applies to internal certificate authorities',
      ],
      correct: 1,
      why: 'Ein Wildcard-Zertifikat mit z. B. *.birdfeeder.live deckt laut Video beliebige Subdomains derselben Domain ab (www, ftp, mail, …) — praktisch für viele Geräte mit einem einzigen Zertifikat.',
    },
  ],
  '020': [
    {
      q: 'Where do the resources used by an insider threat actor come from, per the video?',
      options: [
        'They must be imported from outside contractors',
        'They already exist within the organization, which the individual simply takes advantage of',
        'Insider threats never have access to any organizational resources',
        'They are always purchased from a nation-state sponsor',
      ],
      correct: 1,
      why: 'Laut Video nutzt ein Insider-Threat bereits vorhandene Ressourcen der Organisation selbst — daher die Bedeutung sorgfältigen Vettings beim Einstellungsprozess.',
    },
    {
      q: 'Which threat actor types does the video classify as commonly internal rather than external?',
      options: [
        'Nation-state and organized crime',
        'Insider threat and shadow IT',
        'Hacktivists and unskilled attackers',
        'Only nation-state actors',
      ],
      correct: 1,
      why: 'Laut Video sind Insider Threats und Shadow IT typischerweise intern, während Nation-State, Unskilled, Hacktivist und Organized Crime meist von außen kommen.',
    },
    {
      q: 'How does the video contrast the resources of a nation-state actor with those of an unskilled attacker?',
      options: [
        'Both have identical, unlimited resources',
        'A nation-state has enormous resources for constant, multi-target attacks, while an unskilled attacker typically has very limited resources',
        'Unskilled attackers always have more funding than nation-states',
        'Resources/funding is not a meaningful attribute for threat actors',
      ],
      correct: 1,
      why: 'Laut Video verfügt ein Nationalstaat über enorme Ressourcen für dauerhafte Mehrfachangriffe, während unskilled Attacker meist kaum Mittel haben.',
    },
    {
      q: 'What distinguishes a highly sophisticated threat actor from an unskilled one, per the video?',
      options: [
        'Sophistication is only measured by the amount of money spent on hardware',
        'A sophisticated actor can build their own tools and capabilities, while an unskilled one runs scripts without understanding what they do',
        'Sophistication has nothing to do with technical capability',
        'Unskilled attackers are always more dangerous than sophisticated ones',
      ],
      correct: 1,
      why: 'Laut Video reicht die Bandbreite von Angreifern, die eigene Tools bauen können, bis zu unskilled Attackers, die Skripte laufen lassen, ohne die Funktionsweise zu verstehen.',
    },
    {
      q: 'Which motivation does the video associate with attackers who want to find and remove data from an organization?',
      options: [
        'Data exfiltration',
        'Service disruption only',
        'War',
        'Ethical hacking',
      ],
      correct: 0,
      why: 'Datenexfiltration ist laut Video eine der genannten Motivationen — der Angreifer will Daten finden und aus der Organisation herausschaffen.',
    },
    {
      q: 'What example of espionage motivation does the video give?',
      options: [
        'A competitor wanting to know what another company is working on',
        'An employee requesting a raise',
        'A customer filing a complaint',
        'A vendor renewing a support contract',
      ],
      correct: 0,
      why: 'Als Beispiel für Spionage nennt das Video einen Wettbewerber, der herausfinden will, woran ein anderes Unternehmen arbeitet.',
    },
    {
      q: 'What is the goal of an attacker motivated by service disruption, per the video?',
      options: [
        'To create problems for an organization’s customers by disrupting the service they provide',
        'To improve the target’s uptime',
        'To sell the target company’s stock short legally',
        'To become an employee of the target organization',
      ],
      correct: 0,
      why: 'Laut Video will ein auf Service Disruption fokussierter Angreifer gezielt Probleme für die Kunden der Organisation schaffen, indem er den Dienst stört.',
    },
    {
      q: 'How does the ransomware-related motivation described in the video connect to blackmail?',
      options: [
        'Attackers encrypt or steal data and then demand payment under threat of exposure or continued unavailability',
        'Blackmail never involves any technical attack',
        'Blackmail is exclusively used by nation-states',
        'Blackmail requires physical access to the target',
      ],
      correct: 0,
      why: 'Das Video beschreibt Angreifer, die Daten verschlüsseln oder stehlen und dann mit Zahlung oder Veröffentlichung drohen — der Kern von Erpressung/Blackmail-Motivation.',
    },
    {
      q: 'Which threat actor type does the video most closely associate with philosophical or political motivation?',
      options: [
        'Hacktivists, motivated by political reasons or philosophical differences',
        'Organized crime, motivated purely by profit',
        'Shadow IT, motivated by convenience',
        'Insider threats, always motivated by revenge only',
      ],
      correct: 0,
      why: 'Hacktivisten handeln laut Video aus politischen Gründen oder philosophischen Differenzen, um eine Organisation zu stören oder zu schädigen.',
    },
    {
      q: 'Which motivation does the video contrast with organized crime’s purely profit-driven behavior?',
      options: [
        'A sense of what the actor believes is right, distinct from a financial motive',
        'Ethical motivation is identical to financial gain',
        'Ethics never factor into threat actor behavior',
        'Only unskilled attackers can have ethical motivations',
      ],
      correct: 0,
      why: 'Organisiertes Verbrechen handelt laut Video rein profitorientiert — andere Akteure können dagegen aus einem persönlichen Gerechtigkeits-/Ethikempfinden heraus handeln, unabhängig vom finanziellen Gewinn.',
    },
    {
      q: 'Which threat actor does the video specifically link to revenge as a motivation?',
      options: [
        'An insider threat, who may be out for revenge or financial gain against the organization',
        'A nation-state acting on behalf of its government',
        'An unskilled attacker running a downloaded script',
        'A hardware vendor shipping counterfeit switches',
      ],
      correct: 0,
      why: 'Laut Video kann ein Insider Threat aus Rache oder finanziellem Interesse gegen die eigene Organisation handeln.',
    },
    {
      q: 'How does the video describe a threat actor motivated purely by disruption/chaos?',
      options: [
        'They aim to create problems or damage an organization without necessarily needing financial gain',
        'They only ever target government agencies',
        'They are exclusively insiders',
        'They always demand a ransom payment',
      ],
      correct: 0,
      why: 'Laut Video kann die Motivation schlicht sein, eine Organisation zu stören oder zu schädigen — ohne dass finanzieller Gewinn im Vordergrund steht.',
    },
    {
      q: 'What extreme motivation does the video mention regarding nation-state attacks?',
      options: [
        'Trying to pull a target country into a war',
        'Improving diplomatic relations',
        'Winning a marketing competition',
        'Reducing a competitor’s advertising budget',
      ],
      correct: 0,
      why: 'Als eine der Motivationen für Nation-State-Angriffe nennt das Video den Versuch, ein Land in einen Krieg zu ziehen.',
    },
  ],
  '021': [
    {
      q: 'Why does the video call email such a common threat vector?',
      options: [
        'Because it is a place attackers can send malicious links or phishing pages that most people already use daily',
        'Because email cannot carry any attachments',
        'Because email is never scanned by security tools',
        'Because email addresses are always kept secret',
      ],
      correct: 0,
      why: 'E-Mail ist laut Video ein beliebter Vektor, weil praktisch jeder eine Adresse nutzt und Angreifer darüber Links oder Phishing-Seiten direkt zustellen können.',
    },
    {
      q: 'Why are instant/direct messages a good vector for phishing, per the video?',
      options: [
        'They let the attacker talk to you directly, trying to get you to click links you normally would not',
        'Instant messages cannot contain links',
        'Instant messages are always encrypted end-to-end against phishing',
        'Instant messaging apps block all external contacts by default',
      ],
      correct: 0,
      why: 'Laut Video kann der Angreifer über IM/Direktnachrichten direkt mit dem Opfer kommunizieren und es zum Klicken verleiten.',
    },
    {
      q: 'How can an SVG image be used as an attack vector, per the video?',
      options: [
        'SVG is an XML file that can embed HTML or JavaScript, which can run when the browser renders the "image"',
        'SVG files can never contain any code',
        'SVG images can only be opened by dedicated desktop software, never a browser',
        'SVG is a compression format unrelated to images',
      ],
      correct: 0,
      why: 'Laut Video ist SVG eigentlich eine XML-Datei — Angreifer können darin HTML oder JavaScript einbetten, das beim Rendern im Browser ausgeführt wird.',
    },
    {
      q: 'Which file types does the video mention as good hiding places for malicious content?',
      options: [
        'PDFs, compressed archives (zip/rar), and Office documents with macros',
        'Only plain .txt files',
        'Only files larger than 1 GB',
        'File-based attacks are impossible on modern systems',
      ],
      correct: 0,
      why: 'Das Video nennt PDFs (können Skripte enthalten), komprimierte Archive (verstecken schädliche Dateien) und Office-Makros als typische datei-basierte Vektoren.',
    },
    {
      q: 'What voice-based threat vectors does the video describe?',
      options: [
        'Vishing calls to extract information, spam over VoIP, and war dialing for unpublished numbers',
        'Voice calls are never used as an attack vector',
        'Only text messages, never actual phone calls',
        'Voice calls can only be used for legitimate customer support',
      ],
      correct: 0,
      why: 'Das Video nennt Vishing (Voice-Phishing), Spam over IP und War Dialing als telefonbasierte Bedrohungsvektoren.',
    },
    {
      q: 'What is the security implication of an "agentless" (browser-based) application compared to installed client software, per the video?',
      options: [
        'If the attacker infects the central server, every connecting client can be infected too, since nothing is installed locally',
        'Agentless applications are immune to attack',
        'Agentless applications always require local administrator rights',
        'There is no difference between agentless and client-based software',
      ],
      correct: 0,
      why: 'Bei agentenlosen (browserbasierten) Anwendungen infiziert ein kompromittierter zentraler Server laut Video potenziell jeden verbundenen Client — jeder Login läuft über eine neue Serverinstanz.',
    },
    {
      q: 'What does the video recommend regarding outdated wireless security protocols?',
      options: [
        'Updating from WEP, WPA, or WPA2 to WPA3',
        'Disabling wireless security entirely for compatibility',
        'Wireless protocols never need updating',
        'Only WEP is considered secure today',
      ],
      correct: 0,
      why: 'Das Video empfiehlt, veraltete Protokolle wie WEP/WPA/WPA2 auf WPA3 zu aktualisieren, um die Funknetz-Sicherheit zu verbessern.',
    },
    {
      q: 'What authentication protocol does the video recommend enabling for both wired and wireless networks?',
      options: [
        '802.1X, to prevent access without proper credentials',
        'Telnet, for simple compatibility',
        'FTP, for encrypted transfers',
        'SNMP version 1',
      ],
      correct: 0,
      why: 'Laut Video sollte 802.1X sowohl in kabelgebundenen als auch drahtlosen Netzen aktiviert werden, um unautorisierten Zugriff zu verhindern.',
    },
    {
      q: 'How can Bluetooth be used as a threat vector, per the video?',
      options: [
        'For reconnaissance to locate a system, or exploiting weak security in a device’s Bluetooth implementation',
        'Bluetooth cannot be exploited under any circumstances',
        'Bluetooth only works within the same building and is therefore inherently safe',
        'Bluetooth automatically encrypts all traffic with no vulnerabilities',
      ],
      correct: 0,
      why: 'Laut Video kann Bluetooth zur Aufklärung (Standortbestimmung) genutzt werden oder eine unzureichend abgesicherte Implementierung als Einfallstor dienen.',
    },
    {
      q: 'Why does the video say more open ports mean less security?',
      options: [
        'Each installed service opens its own port, giving a third party a potential way into that portion of the system',
        'Open ports have no relationship to security at all',
        'Open ports automatically close themselves after 24 hours',
        'Only port 443 can ever be exploited',
      ],
      correct: 0,
      why: 'Jeder installierte Dienst öffnet laut Video einen eigenen Port — je mehr Dienste, desto mehr potenzielle Eintrittspunkte für Angreifer.',
    },
    {
      q: 'How did the Target breach in 2013 illustrate a supply chain vendor risk, per the video?',
      options: [
        'Attackers compromised an HVAC contractor (a vendor) and used that access to reach Target’s point-of-sale network',
        'Target was attacked directly with no third party involved',
        'The vendor risk had nothing to do with network access',
        'The breach involved only Target’s own employees',
      ],
      correct: 0,
      why: 'Laut Video kompromittierten Angreifer zunächst den HVAC-Dienstleister von Target (einen Vendor) und sprangen von dort ins POS-Netzwerk.',
    },
    {
      q: 'Why does the video recommend an ongoing security audit built into supplier contracts?',
      options: [
        'Because organizations work with numerous suppliers who may have access to sensitive systems, and contracts should guarantee audit rights',
        'Suppliers never need any security oversight',
        'Audits of suppliers are illegal in most jurisdictions',
        'Supplier security is solely the supplier’s legal problem, never the customer’s',
      ],
      correct: 0,
      why: 'Da Organisationen laut Video mit zahlreichen Zulieferern arbeiten, die teils sensible Zugänge haben, wird ein vertraglich verankertes Audit-Recht empfohlen.',
    },
  ],
  '026': [
    {
      q: 'Why does malware benefit from injecting itself into an existing process rather than running as its own process, per the video?',
      options: [
        'It avoids detection by anti-malware looking for a malicious process, and gains the same rights/permissions as the process it injects into',
        'Injected malware runs slower than a standalone process',
        'It has no functional benefit at all',
        'It only works if the target process is already malicious',
      ],
      correct: 0,
      why: 'Laut Video umgeht injizierter Code die Erkennung durch Anti-Malware, die nach eigenständigen bösartigen Prozessen sucht, und erbt die Rechte des Zielprozesses — ein einfacher Weg zur Rechteausweitung.',
    },
  ],
  '031': [
    {
      q: 'What common pattern in a database query indicates a likely SQL injection attempt, per the video?',
      options: [
        'A condition like "1 equals 1" appended to the query to force it to return everything',
        'A query that only ever returns exactly one row',
        'A query written entirely in uppercase letters',
        'A query that takes longer than one second to run',
      ],
      correct: 0,
      why: 'Laut Video ist ein angehängtes „... OR 1=1" ein klassisches Muster, mit dem SQL-Injection den gesamten Datensatz statt nur die erwartete Zeile zurückgibt.',
    },
  ],
  '033': [
    {
      q: 'What is the main risk of legacy hardware devices at remote sites, per the video?',
      options: [
        'They often run outdated operating systems or applications that have reached end of life/service life, with no active security patching',
        'Legacy devices are always immune to attacks due to their age',
        'Legacy devices automatically upgrade themselves',
        'Legacy hardware has no relationship to software vulnerabilities',
      ],
      correct: 0,
      why: 'Laut Video laufen Legacy-Geräte oft mit veralteten, nicht mehr gepatchten Betriebssystemen — man muss das Risiko des Weiterbetriebs gegen den Aufwand einer Ablösung abwägen.',
    },
  ],
  '035': [
    {
      q: 'Which statistic does the video cite about cloud security practices?',
      options: [
        'An estimated 76% of organizations aren’t using multifactor authentication for their cloud console',
        'All cloud providers enforce MFA by default with no exceptions',
        'Cloud code is always fully patched within 24 hours',
        'Cloud vulnerabilities cannot have a high CVSS score',
      ],
      correct: 0,
      why: 'Das Video nennt die Schätzung, dass rund 76 % der Organisationen keine Multi-Faktor-Authentifizierung für ihre Cloud-Konsole nutzen.',
    },
  ],
  '036': [
    {
      q: 'What made the SolarWinds Orion attack a software supply chain vulnerability, per the video?',
      options: [
        'Attackers inserted malicious code into the vendor’s own software, which was then digitally signed and distributed to about 18,000 trusting customers',
        'Attackers directly hacked each of the 18,000 customer networks individually',
        'The vulnerability existed only in customers’ own custom code',
        'No digital signature was ever involved',
      ],
      correct: 0,
      why: 'Laut Video schleusten Angreifer Code direkt in die SolarWinds-Infrastruktur ein; das infizierte Update wurde digital signiert und an rund 18.000 vertrauende Kunden verteilt.',
    },
  ],
  '037': [
    {
      q: 'What common misconfiguration does the video illustrate with the 2017 Verizon records incident?',
      options: [
        'A cloud storage repository (Amazon S3) was left open to the internet without any password protection',
        'A firewall blocked all legitimate traffic',
        'An employee used too strong a password',
        'A server was physically unplugged from the network',
      ],
      correct: 0,
      why: 'Im Beispiel des Videos lag ein Amazon-S3-Speicher ohne jeden Passwortschutz offen im Internet — eine klassische Fehlkonfiguration.',
    },
  ],
  '038': [
    {
      q: 'What is sideloading, per the video?',
      options: [
        'Installing applications outside the scope of official app stores',
        'Charging a mobile device using a side-mounted USB port',
        'Automatically updating apps in the background',
        'Restricting an app to a single user account',
      ],
      correct: 0,
      why: 'Sideloading beschreibt laut Video das Installieren von Apps außerhalb der offiziellen App-Stores — nach einem Jailbreak/Root meist uneingeschränkt möglich.',
    },
    {
      q: 'What security consequence does jailbreaking/rooting a mobile device have, per the video?',
      options: [
        'It replaces the OS/firmware with a third-party version, circumventing all MDM-enforced security restrictions',
        'It has no effect on device security whatsoever',
        'It automatically increases the device’s built-in encryption strength',
        'It only affects the device’s battery life',
      ],
      correct: 0,
      why: 'Laut Video ersetzt Jailbreaking/Rooting die Firmware durch eine Drittanbieter-Version und hebelt damit alle vom MDM durchgesetzten Sicherheitsvorgaben aus.',
    },
  ],
  '044': [
    {
      q: 'How does the video describe brute force as a physical attack, not just a password attack?',
      options: [
        'Forcing open a locked door or window to gain physical access',
        'Repeatedly guessing passwords over a network connection only',
        'Overloading a web server with traffic',
        'Cloning an RFID badge remotely',
      ],
      correct: 0,
      why: 'Das Video erweitert den Begriff Brute Force über Passwörter hinaus: Auch das gewaltsame Aufbrechen einer Tür oder eines Fensters zählt dazu.',
    },
  ],
  '045': [
    {
      q: 'How does reflected DNS amplification achieve a large DDoS impact from a small request, per the video?',
      options: [
        'A tiny spoofed DNS query is sent to open resolvers, which send a much larger response to the spoofed (victim) address',
        'The attacker sends the same volume of data they receive back',
        'It requires the attacker to control the victim’s DNS server directly',
        'It only works over encrypted HTTPS traffic',
      ],
      correct: 0,
      why: 'Im Video sendet der Bot eine winzige, gefälschte DNS-Anfrage an offene Resolver — die viel größere Antwort geht an die gefälschte (Opfer-)Adresse zurück, ca. 86-fach verstärkt im Beispiel.',
    },
  ],
  '049': [
    {
      q: 'What is "pass the hash," per the video?',
      options: [
        'Capturing a username and hashed password, then replaying it directly to the server to authenticate as the victim',
        'Cracking a password hash offline before ever contacting the server',
        'Hashing a password twice for extra security',
        'A method to generate new random passwords automatically',
      ],
      correct: 0,
      why: 'Pass the Hash bedeutet laut Video, einen abgefangenen Benutzernamen samt gehashtem Passwort direkt an den Server zu senden, um sich als Opfer zu authentifizieren — ohne das Passwort je zu entschlüsseln.',
    },
  ],
  '051': [
    {
      q: 'A service copies a 300-byte request into a fixed 128-byte memory buffer and then crashes with adjacent control data overwritten. Which finding best fits the evidence?',
      options: [
        'A buffer overflow caused by missing bounds checking',
        'A directory traversal caused by canonicalizing the request path',
        'A replay attack caused by reusing an authentication token',
        'A race condition caused by two threads updating the same record',
      ],
      correct: 0,
      why: 'Die Eingabe überschreitet den reservierten Speicher und überschreibt angrenzende Daten. Bounds Checking bzw. sichere Speicheroperationen verhindern dieses Buffer-Overflow-Muster.',
    },
    {
      q: 'What is horizontal privilege escalation, as distinguished from vertical, per the video?',
      options: [
        'Moving from one regular user’s access (user A) to another regular user’s access (user B), rather than to administrator rights',
        'Gaining physical access to a horizontal server rack',
        'A privilege escalation that only affects mobile devices',
        'Escalating privileges by changing your screen resolution',
      ],
      correct: 0,
      why: 'Horizontale Rechteausweitung bedeutet laut Video, von den Rechten des Nutzers A zu denen des Nutzers B zu wechseln — anders als die vertikale Eskalation zu Administratorrechten.',
    },
    {
      q: 'Which character sequence in a URL is a giveaway for a directory traversal attempt, per the video?',
      options: [
        '../ used to move backward out of the intended web directory',
        'A trailing question mark with no parameters',
        'The letters "www" repeated three times',
        'An all-lowercase domain name',
      ],
      correct: 0,
      why: 'Die Zeichenfolge „../" bewegt sich laut Video ein Verzeichnis nach oben — taucht sie in Zugriffs-URLs auf, deutet das auf einen Directory-Traversal-Versuch hin.',
    },
  ],
  '052': [
    {
      q: 'Why did the industry stop trusting MD5, per the video?',
      options: [
        'Researchers found hash collisions, and in 2008 created a fraudulent CA-signed-looking certificate exploiting this weakness',
        'MD5 was too slow for modern hardware',
        'MD5 was replaced purely for licensing reasons',
        'MD5 never had any documented weakness',
      ],
      correct: 0,
      why: 'Laut Video fanden Forscher Kollisionen in MD5, und 2008 gelang es, ein scheinbar gültiges, CA-signiertes Zertifikat zu erzeugen — ein Vertrauensbruch, der MD5 als Hash-Algorithmus disqualifizierte.',
    },
  ],
  '055': [
    {
      q: 'What granularity of control does an ACL provide, per the video’s example rules?',
      options: [
        'Very specific rules, e.g. one user may access a particular subnet only over specific TCP ports',
        'ACLs can only allow or deny entire networks, never individual ports',
        'ACLs cannot reference usernames, only IP addresses',
        'ACL rules apply identically to every user with no customization',
      ],
      correct: 0,
      why: 'Das Beispiel im Video zeigt sehr granulare Regeln — etwa ein Nutzer darf ein bestimmtes Subnetz nur über die Ports 80, 443 und 8088 erreichen.',
    },
  ],
  '056': [
    {
      q: 'What does the video mean by isolation as a mitigation technique?',
      options: [
        'Quarantining a system into a private VLAN when a posture assessment finds it out of compliance',
        'Physically disconnecting all systems from the network permanently',
        'Isolation refers only to isolating individual database rows',
        'Isolation means giving every device full network access',
      ],
      correct: 0,
      why: 'Laut Video wird ein System bei einer fehlgeschlagenen Posture-Prüfung in ein privates VLAN isoliert/quarantänisiert, bis es aktualisiert ist.',
    },
    {
      q: 'How does the video contrast home patching with patching in a large organization?',
      options: [
        'Home systems often patch automatically; large organizations typically test patches first, then push them out once verified',
        'Large organizations never test patches before deployment',
        'Home systems never receive patches automatically',
        'Patching is identical in every environment with no testing anywhere',
      ],
      correct: 0,
      why: 'Laut Video patchen Heimsysteme oft automatisch, während größere Organisationen Patches zunächst testen, bevor sie sie unternehmensweit ausrollen.',
    },
    {
      q: 'What does a posture assessment check during login, per the video?',
      options: [
        'Whether the OS/patches are current, antivirus/EDR is up to date, and the local firewall is properly configured',
        'Only the user’s typing speed',
        'Only whether the device has a webcam',
        'Posture assessments only check hardware manufacturer information',
      ],
      correct: 0,
      why: 'Die Posture Assessment prüft laut Video u. a. aktuelle Patches, EDR-/Antivirus-Status und ob die lokale Firewall korrekt konfiguriert ist, bevor Netzzugriff gewährt wird.',
    },
    {
      q: 'What does the video recommend before decommissioning a storage drive with potentially sensitive data?',
      options: [
        'Removing/deleting the data, or physically destroying the drive if it will no longer be reused',
        'Simply throwing the drive in a public recycling bin',
        'Leaving the data intact since decommissioned devices are never accessed',
        'Selling the drive as-is on the open market',
      ],
      correct: 0,
      why: 'Laut Video sollte man Daten vor der Außerbetriebnahme entfernen oder das Laufwerk physisch zerstören, wenn es nicht wiederverwendet wird.',
    },
  ],
  '057': [
    {
      q: 'What role does an EDR play beyond traditional antivirus, per the video?',
      options: [
        'It adds behavioral analysis, machine learning, and can autonomously isolate/quarantine a system when it detects malicious activity',
        'EDR is functionally identical to signature-only antivirus',
        'EDR requires manual technician approval before it can take any action',
        'EDR only works on mobile devices',
      ],
      correct: 0,
      why: 'Laut Video geht EDR über reine Signaturerkennung hinaus: Verhaltensanalyse, maschinelles Lernen und die Fähigkeit, autonom zu isolieren/quarantänisieren, sobald etwas Bösartiges erkannt wird.',
    },
    {
      q: 'Why does the video recommend closing as many ports as possible on a server or workstation?',
      options: [
        'Every open port is an opportunity for an attacker to find a vulnerability that grants access',
        'Closing ports has no effect on security',
        'Open ports automatically encrypt all traffic passing through them',
        'Only wireless devices have ports that need closing',
      ],
      correct: 0,
      why: 'Laut Video ist jeder offene Port eine potenzielle Angriffsfläche — möglichst viele nicht benötigte Ports sollten geschlossen werden.',
    },
    {
      q: 'What does the video recommend for management interfaces on routers, switches, and firewalls?',
      options: [
        'Manually changing default credentials, since not every device prompts you to do so automatically',
        'Leaving default credentials in place for easier support access',
        'Publishing default credentials internally for convenience',
        'Default credentials are never a security concern for management interfaces',
      ],
      correct: 0,
      why: 'Laut Video fragen nicht alle Geräte automatisch nach einer Passwortänderung — man muss die Standardzugangsdaten von Management-Oberflächen manuell ändern.',
    },
    {
      q: 'Why does the video suggest deleting unused applications as a hardening technique?',
      options: [
        'Every installed application has its own separate update process, so removing unused ones reduces the security maintenance burden',
        'Removing applications always breaks the operating system',
        'Unused applications never contain vulnerabilities',
        'Application removal is purely a performance, not a security, technique',
      ],
      correct: 0,
      why: 'Da jede installierte Anwendung laut Video einen eigenen Update-Prozess hat, verringert das Entfernen ungenutzter Software den Pflegeaufwand und die Angriffsfläche.',
    },
  ],
  '080': [
    {
      q: 'What is input validation designed to prevent, per the video?',
      options: [
        'Unexpected data (e.g., malformed zip codes) from being interpreted improperly by the application',
        'Users from ever typing anything into a form field',
        'The application from ever crashing due to hardware failure',
        'Only SQL databases can benefit from input validation',
      ],
      correct: 0,
      why: 'Input Validation soll laut Video sicherstellen, dass unerwartete Eingaben (z. B. eine falsch formatierte Postleitzahl) nicht unkontrolliert von der Anwendung verarbeitet werden.',
    },
    {
      q: 'What does the "secure" attribute on a cookie enforce, per the video?',
      options: [
        'The cookie is only transferred over HTTPS/an encrypted connection',
        'The cookie is automatically deleted after one use',
        'The cookie can never be read by any browser',
        'The cookie is stored only on the server, never the client',
      ],
      correct: 0,
      why: 'Ein als „secure" markiertes Cookie wird laut Video nur über HTTPS/verschlüsselte Verbindungen übertragen.',
    },
    {
      q: 'What limitation of static code analysis (SAST) does the video point out?',
      options: [
        'It cannot find vulnerabilities that stem from how cryptography was implemented, since that isn’t visible just by reading the code',
        'It always finds every vulnerability with zero false positives',
        'It can only be used on compiled binaries, never source code',
        'Static analysis replaces the need for any human review',
      ],
      correct: 0,
      why: 'Laut Video übersieht ein statischer Analyzer typischerweise Schwachstellen, die aus der konkreten Implementierung von Kryptografie entstehen — das lässt sich nicht allein am Code ablesen.',
    },
    {
      q: 'What can developers detect by building monitoring into their applications, per the video?',
      options: [
        'Attempted SQL injection or exploitation of known vulnerabilities, via logs analyzed for unusual activity',
        'Only the application’s CPU temperature',
        'Nothing useful — application monitoring provides no security value',
        'Only successful logins, never failed ones',
      ],
      correct: 0,
      why: 'Laut Video ermöglicht eingebautes Monitoring, Versuche wie SQL-Injection oder die Ausnutzung bekannter Schwachstellen anhand ungewöhnlicher Log-Muster zu erkennen.',
    },
  ],
  '085': [
    {
      q: 'Why does the video say severity categorization (critical/high/medium/low) matters for a vulnerability report?',
      options: [
        'It lets teams address the most critical vulnerabilities first instead of treating every finding equally',
        'Severity levels have no bearing on remediation order',
        'Only informational findings should ever be prioritized',
        'Severity categorization is purely cosmetic in scan reports',
      ],
      correct: 0,
      why: 'Laut Video sollten kritische Schwachstellen zuerst behandelt werden — die Einstufung im Report hilft, Prioritäten bei begrenzten Ressourcen zu setzen.',
    },
    {
      q: 'What does a CVSS score represent, per the video?',
      options: [
        'A standardized score from 0 to 10 indicating how critical a vulnerability is',
        'The exact dollar cost of fixing a vulnerability',
        'The number of systems affected by a vulnerability',
        'A score that only applies to Microsoft products',
      ],
      correct: 0,
      why: 'Der CVSS-Score reicht laut Video von 0 bis 10 und drückt aus, wie kritisch eine Schwachstelle eingestuft wird — 10 ist am kritischsten.',
    },
    {
      q: 'Where can you cross-reference a CVE identifier found in a vulnerability scan, per the video?',
      options: [
        'The National Vulnerability Database (nvd.nist.gov) or cve.mitre.org',
        'Only inside the scanner’s own proprietary database, nowhere else',
        'CVE numbers cannot be looked up anywhere online',
        'Only via the vulnerable vendor’s marketing department',
      ],
      correct: 0,
      why: 'Laut Video lassen sich CVE-Nummern über die National Vulnerability Database (nvd.nist.gov) oder cve.mitre.org nachschlagen.',
    },
    {
      q: 'Which classification examples does the video give for where a vulnerability scanner might find issues?',
      options: [
        'Desktop/mobile applications, web applications, and network devices like firewalls, switches, and routers',
        'Vulnerabilities can only ever exist in desktop operating systems',
        'Only vulnerabilities in physical hardware count, never software',
        'Vulnerability scanners cannot classify findings by type',
      ],
      correct: 0,
      why: 'Das Video zeigt Beispiele aus verschiedenen Kategorien: Desktop-/Mobile-Apps, Webanwendungen und Netzwerkgeräte wie Firewalls oder Router.',
    },
    {
      q: 'How does the video define exposure factor?',
      options: [
        'A percentage representing how much impact a vulnerability would have if exploited, e.g. 100% if it could fully disable a public-facing service',
        'The number of days since the vulnerability was published',
        'The dollar amount of the CVE bug bounty',
        'A fixed value that never changes between vulnerabilities',
      ],
      correct: 0,
      why: 'Der Exposure Factor wird laut Video als Prozentsatz ausgedrückt — z. B. 100 %, wenn ein exponierter, ungepatchter Dienst komplett lahmgelegt werden könnte.',
    },
    {
      q: 'Why does the video say patching priority differs between a public cloud system and an isolated lab system with the same vulnerability?',
      options: [
        'The public cloud system is exposed to everyone on the internet, so its environment carries far higher risk than an isolated lab system',
        'Environment never affects patching priority',
        'Lab systems always get patched before production systems',
        'Cloud systems are never patched due to vendor lock-in',
      ],
      correct: 0,
      why: 'Laut Video hat dieselbe Schwachstelle in der öffentlichen Cloud eine viel höhere Priorität als in einem isolierten Testlabor ohne weitere Konnektivität.',
    },
    {
      q: 'How does the video’s hospital ransomware example illustrate industry/organizational impact?',
      options: [
        'A two-week hospital shutdown forced emergency cases to be diverted and scheduled surgeries canceled — impact varies dramatically by industry',
        'All organizations experience identical impact from the same type of attack',
        'Hospitals are immune to ransomware due to regulation',
        'Impact assessment ignores the type of organization entirely',
      ],
      correct: 0,
      why: 'Das Krankenhausbeispiel (Tallahassee Memorial Health) zeigt laut Video, wie dieselbe Angriffsart je nach Branche völlig unterschiedliche, teils lebensrelevante Auswirkungen haben kann.',
    },
  ],
  '096': [
    {
      q: 'What marks the start and end of the IAM provisioning process, per the video?',
      options: [
        'It begins with creating a user account and ends when that account is deactivated, commonly tied to onboarding/offboarding',
        'Provisioning has no defined start or end point',
        'De-provisioning only happens if a user requests it themselves',
        'Provisioning is a one-time event with no corresponding deprovisioning step',
      ],
      correct: 0,
      why: 'Laut Video beginnt IAM-Provisionierung mit der Kontoerstellung und endet mit der Deaktivierung — typischerweise an Onboarding/Offboarding gekoppelt.',
    },
    {
      q: 'Why does the video caution against assigning administrator access to every new hire?',
      options: [
        'The goal of IAM is to assign only the permissions necessary for the job, limiting ongoing and extended access',
        'Administrator access should be the default for all users to save time',
        'Permission assignment has no security implications',
        'Every employee needs the same permissions regardless of role',
      ],
      correct: 0,
      why: 'Ziel von IAM ist laut Video, genau die für die Aufgabe nötigen Rechte zu vergeben — nicht pauschal Adminrechte, die über den Bedarf hinausgehen.',
    },
    {
      q: 'What does the video describe as part of the identity proofing (resolution + attestation) process?',
      options: [
        'Verifying who someone claims to be, potentially using government documents, in-person meetings, or credit report checks',
        'Identity proofing only requires a self-reported name with no verification',
        'Identity proofing is performed automatically with no human or document involvement',
        'Identity proofing happens only after an account has already been fully provisioned',
      ],
      correct: 0,
      why: 'Identity Proofing prüft laut Video die reale Identität — etwa über amtliche Dokumente, ein persönliches Treffen oder automatisierte Abfragen (z. B. Kreditauskunft).',
    },
    {
      q: 'What does federation allow, per the video?',
      options: [
        'Logging into a site using an existing account from a third party (e.g., an existing login), without creating a new local account',
        'Federation requires creating a brand-new password for every site',
        'Federation only works between two servers owned by the same company',
        'Federation eliminates the need for any authentication',
      ],
      correct: 0,
      why: 'Federation erlaubt laut Video den Login über ein bereits bestehendes Konto eines Drittanbieters, ohne ein neues lokales Konto anzulegen.',
    },
    {
      q: 'What does LDAP provide, per the video?',
      options: [
        'A standardized protocol for accessing large hierarchical directories of users and devices on a network',
        'A method for compressing video files',
        'A protocol exclusively for sending email',
        'A wireless encryption standard',
      ],
      correct: 0,
      why: 'LDAP ist laut Video ein standardisiertes Protokoll für den Zugriff auf große, hierarchisch aufgebaute Verzeichnisse von Nutzern und Geräten.',
    },
    {
      q: 'What does OAuth determine once a user has authenticated, per the video?',
      options: [
        'What resources the user may access — OAuth is an authorization framework, not authentication itself',
        'OAuth performs both authentication and authorization on its own, always',
        'OAuth only works with LDAP directories',
        'OAuth is used exclusively for encrypting stored passwords',
      ],
      correct: 0,
      why: 'OAuth ist laut Video ein Autorisierungs-Framework — es legt fest, worauf jemand zugreifen darf, benötigt aber (oft via OpenID) eine separate Authentifizierung.',
    },
    {
      q: 'What does the client present to the resource server after SAML authentication succeeds, per the video?',
      options: [
        'A SAML token generated by the authorization server',
        'The user’s raw plaintext password',
        'A physical smart card',
        'Nothing — the resource server queries the authorization server directly every time',
      ],
      correct: 0,
      why: 'Nach erfolgreicher Anmeldung erhält der Client laut Video ein SAML-Token vom Autorisierungsserver, das er dem Ressourcenserver zum Zugriff vorlegt.',
    },
    {
      q: 'What does the video’s VPN concentrator example illustrate about interoperability?',
      options: [
        'Choosing a technology (e.g., LDAP support on a new VPN concentrator) that matches resources the organization already has, like an existing Active Directory server',
        'Interoperability means every device must run identical software',
        'Interoperability decisions never involve existing infrastructure',
        'Interoperability only matters for hardware, never authentication protocols',
      ],
      correct: 0,
      why: 'Das VPN-Beispiel im Video zeigt: Ein neues Gerät mit LDAP-Unterstützung passt gut, wenn bereits ein Active-Directory-/LDAP-Server vorhanden ist — Interoperabilität nutzt bestehende Ressourcen.',
    },
  ],
  '097': [
    {
      q: 'Who defines the access rights in a mandatory access control model, per the video?',
      options: [
        'The system administrator, using labels like confidential, secret, or top secret',
        'Whoever created the specific file or document',
        'The end user decides their own access level',
        'Mandatory access control has no defined authority; access is unrestricted',
      ],
      correct: 0,
      why: 'Bei Mandatory Access Control legt laut Video der Administrator über Label wie „confidential" oder „top secret" fest, wer worauf zugreifen darf — nicht der einzelne Nutzer.',
    },
    {
      q: 'How does role-based access control assign permissions, per the video?',
      options: [
        'The administrator creates groups tied to job functions and assigns rights to the group; users inherit permissions by being added to the group',
        'Each user’s permissions are set individually with no group structure',
        'Permissions are assigned randomly to reduce administrative overhead',
        'Role-based access control requires the data creator to set permissions',
      ],
      correct: 0,
      why: 'Bei RBAC erstellt der Administrator laut Video Gruppen je Rolle und weist Rechte der Gruppe zu — Nutzer erben die Rechte einfach durch Gruppenmitgliedschaft.',
    },
    {
      q: 'What is the key characteristic of rule-based access control, per the video’s example?',
      options: [
        'System-enforced rules set by the administrator, e.g. access to a lab only between 9 a.m. and 5 p.m.',
        'The end user sets all of the rules themselves',
        'Rules can only ever be based on the requester’s job title',
        'Rule-based access control ignores time and other contextual criteria entirely',
      ],
      correct: 0,
      why: 'Rule-Based Access Control nutzt laut Video vom Administrator festgelegte, systemgeprüfte Regeln — Beispiel: Zugriff auf ein Labor nur zwischen 9 und 17 Uhr.',
    },
    {
      q: 'What kinds of criteria can attribute-based access control combine, per the video?',
      options: [
        'IP address, time of day, desired action (read/write), and relationship to the data, among others',
        'Only the file size being requested',
        'Attribute-based control uses exactly one fixed criterion and nothing else',
        'Only the user’s job title, identical to role-based control',
      ],
      correct: 0,
      why: 'ABAC kombiniert laut Video mehrere Kriterien gleichzeitig — z. B. IP-Adresse, Tageszeit, gewünschte Aktion und Beziehung zu den Daten.',
    },
    {
      q: 'What example of a time-of-day restriction does the video give?',
      options: [
        'A training room network being inaccessible between midnight and 6 a.m.',
        'Time-of-day restrictions can only ever apply to a single global time zone',
        'Time-of-day restrictions are incompatible with all other access control models',
        'Access is restricted based only on the calendar year, never the time of day',
      ],
      correct: 0,
      why: 'Das Video nennt als Beispiel ein Schulungsraum-Netz, das zwischen Mitternacht und 6 Uhr morgens nicht erreichbar ist.',
    },
    {
      q: 'What happens if a user running with least privilege executes malicious software, per the video?',
      options: [
        'The malware’s damage is limited to only what that user’s restricted rights allow',
        'The malware automatically gains full administrator rights regardless of the user’s privileges',
        'Least privilege has no effect on malware behavior',
        'Least privilege prevents malware from running at all',
      ],
      correct: 0,
      why: 'Läuft ein Nutzer mit Least Privilege, bleibt der Schaden durch Malware laut Video auf die eingeschränkten Rechte dieses Nutzers begrenzt.',
    },
    {
      q: 'A helpdesk technician must reset passwords and unlock accounts but never administer servers. Which permission change best follows least privilege?',
      options: [
        'Delegate only password-reset and account-unlock permissions to the helpdesk role',
        'Add the technician to Domain Admins for simpler support',
        'Share the existing administrator password with the technician',
        'Disable audit logging so support actions are faster',
      ],
      correct: 0,
      why: 'Least Privilege vergibt nur die für die konkrete Aufgabe erforderlichen Rechte. Eine eng delegierte Helpdesk-Rolle vermeidet unnötige Server- und Domänenrechte.',
    },
  ],
  '099': [
    {
      q: 'What minimum password length does the video mention as a common baseline, trending upward over time?',
      options: [
        'At least eight characters, with requirements increasing as processing power grows',
        'Exactly four characters is considered sufficient',
        'Length has no bearing on password strength',
        'Passwords should never exceed four characters for usability',
      ],
      correct: 0,
      why: 'Laut Video gilt oft mindestens acht Zeichen als Ausgangspunkt — mit steigender Rechenleistung tendieren Anforderungen zu längeren Passwörtern.',
    },
    {
      q: 'What does the video mean by password entropy?',
      options: [
        'How unpredictable a password is, improved by combining upper/lowercase, numbers, and special characters',
        'The exact number of times a password has been reused',
        'Entropy refers only to how the password is stored on disk',
        'A measure of how quickly a password can be typed',
      ],
      correct: 0,
      why: 'Entropie beschreibt laut Video die Unvorhersehbarkeit eines Passworts — eine Mischung aus Groß-/Kleinschreibung, Zahlen und Sonderzeichen erhöht sie.',
    },
    {
      q: 'Why does the video recommend using a unique password for every account?',
      options: [
        'So that compromising one password does not give an attacker access to many accounts',
        'Reusing a password across accounts is always safe if it is long enough',
        'Password reuse improves security by simplifying memorization',
        'Unique passwords are only relevant for administrator accounts',
      ],
      correct: 0,
      why: 'Ein einzigartiges Passwort pro Konto verhindert laut Video, dass ein einziges kompromittiertes Passwort gleich mehrere Konten öffnet.',
    },
    {
      q: 'What determines how often passwords must be changed, per the video?',
      options: [
        'System administrators set the expiration policy, e.g. every 30, 60, 90, or fewer days for critical systems',
        'Password expiration is fixed at exactly one year for every system worldwide',
        'Expired passwords always still allow login without any change',
        'Expiration only applies to service accounts, never human users',
      ],
      correct: 0,
      why: 'Laut Video legt der Systemadministrator die Ablauffrist fest — bei kritischen Systemen kann das deutlich kürzer sein als die üblichen 30/60/90 Tage.',
    },
    {
      q: 'How do just-in-time permissions limit risk, per the video?',
      options: [
        'They grant administrative access only for a limited time via temporary credentials, so a breached regular account has no standing admin rights',
        'They grant permanent administrator access to every technician',
        'Just-in-time permissions never expire once granted',
        'They remove the need for any approval process',
      ],
      correct: 0,
      why: 'Just-in-Time-Rechte gewähren laut Video Adminzugriff nur befristet über temporäre Zugangsdaten — ein kompromittiertes Alltagskonto hat dadurch keine dauerhaften Adminrechte.',
    },
    {
      q: 'What role does a password vault play in the just-in-time process, per the video?',
      options: [
        'It holds the primary credentials and issues temporary derived credentials instead of exposing the primary ones',
        'It publishes primary credentials openly to all technicians',
        'The vault has no connection to just-in-time access at all',
        'A vault only stores end-user passwords, never administrative ones',
      ],
      correct: 0,
      why: 'Der Password Vault verwahrt laut Video die primären Zugangsdaten und stellt daraus abgeleitete, temporäre Zugangsdaten aus — die Primärdaten werden nie direkt weitergegeben.',
    },
    {
      q: 'What happens to ephemeral credentials after the technician’s session ends, per the video?',
      options: [
        'They can be deleted, since they were only ever temporarily assigned',
        'They automatically become the technician’s new permanent password',
        'They are stored forever for later reuse',
        'They are shared with the next technician who needs access',
      ],
      correct: 0,
      why: 'Ephemere Zugangsdaten sind laut Video nur temporär zugewiesen und können nach der Sitzung gelöscht werden — für den nächsten Bedarf wird ein neuer Satz erzeugt.',
    },
  ],
  '111': [
    {
      q: 'How does the video’s traffic-light grid represent a qualitative risk assessment?',
      options: [
        'It rates factors like impact, rate of occurrence, and cost of controls as low/medium/high rather than exact numbers',
        'It calculates an exact dollar figure for every risk',
        'It only ever produces a single overall percentage',
        'Qualitative assessment requires no evaluation of individual factors',
      ],
      correct: 0,
      why: 'Die Ampel-Darstellung im Video bewertet Faktoren wie Impact, Häufigkeit und Kontrollkosten als niedrig/mittel/hoch, statt exakte Zahlen zu berechnen.',
    },
    {
      q: 'How does the video distinguish likelihood from probability?',
      options: [
        'Likelihood is typically a qualitative value (rare, possible, almost certain), while probability is a quantitative statistic',
        'Likelihood and probability are always calculated with the exact same formula',
        'Likelihood only applies to financial risks',
        'Probability is always a qualitative label, never a number',
      ],
      correct: 0,
      why: 'Likelihood ist laut Video meist ein qualitativer Wert (selten, möglich, fast sicher), während Probability eine quantitative Kennzahl ist — beide werden oft parallel verwendet.',
    },
    {
      q: 'How does the video define exposure factor (EF) in quantitative risk analysis?',
      options: [
        'The percentage of an asset’s value that would be lost due to a particular risk (e.g., 1.0 if the entire asset is lost)',
        'The total number of assets owned by the company',
        'A fixed constant that never changes between risks',
        'The exact dollar cost of a security control',
      ],
      correct: 0,
      why: 'Der Exposure Factor gibt laut Video den prozentualen Wertverlust eines Assets bei Eintritt eines Risikos an — 1,0 bedeutet Totalverlust.',
    },
    {
      q: 'Which impact category does the video place above all others in risk calculations?',
      options: [
        'Life — safety of people is prioritized above property and financial impact, since people cannot be replaced',
        'Financial impact is always the single highest priority',
        'Property impact always outweighs every other consideration',
        'Impact categories are never ranked in any order',
      ],
      correct: 0,
      why: 'Laut Video steht „Life" (Sicherheit von Menschen) an oberster Stelle der Impact-Kategorien — Vermögenswerte lassen sich ersetzen, Menschen nicht.',
    },
    {
      q: 'What role does the video assign to whoever is listed against a key risk indicator in the risk register?',
      options: [
        'They manage or are responsible for that particular risk',
        'They are automatically blamed if the risk is realized',
        'The risk owner has no defined responsibility at all',
        'Risk owners are only ever external auditors, never internal staff',
      ],
      correct: 0,
      why: 'Für jeden Key Risk Indicator im Risikoregister wird laut Video ein Owner benannt, der für dieses Risiko verantwortlich ist bzw. es steuert.',
    },
    {
      q: 'What balance does determining a risk threshold in the register involve, per the video?',
      options: [
        'Balancing how much time/money is spent resolving a risk against how much that risk would actually cost the company',
        'The threshold is always set at zero risk tolerance',
        'Risk thresholds are set randomly with no analysis',
        'Threshold only concerns the calendar date of the assessment',
      ],
      correct: 0,
      why: 'Laut Video muss der Risiko-Schwellenwert eine Balance finden zwischen Aufwand für die Risikominderung und den tatsächlichen Kosten, die das Risiko verursachen würde.',
    },
    {
      q: 'What does an "expansionary" risk appetite posture indicate, per the video’s qualitative categories?',
      options: [
        'A qualitative label an organization might assign when they are more willing to take on a given type of risk',
        'It means the organization refuses to accept any risk whatsoever',
        'Expansionary applies only to physical, not IT, risks',
        'It is a purely quantitative dollar figure, not a qualitative label',
      ],
      correct: 0,
      why: 'Risk-Appetite-Posture ist laut Video ein qualitatives Etikett (z. B. conservative, neutral, expansionary), das die grundsätzliche Risikobereitschaft für eine Risikoart beschreibt.',
    },
    {
      q: 'How does a "conservative" risk appetite posture differ from "expansionary," per the video?',
      options: [
        'A conservative posture reflects a lower willingness to take on that risk type, opposite to a more risk-tolerant expansionary stance',
        'Conservative and expansionary mean exactly the same thing',
        'Conservative only applies to financial risks',
        'A conservative posture is always assigned to a numeric value of zero',
      ],
      correct: 0,
      why: 'Eine „conservative"-Haltung bedeutet laut Video eine geringere Risikobereitschaft — das Gegenteil einer „expansionary"-Haltung.',
    },
    {
      q: 'Where does a "neutral" risk appetite posture sit relative to conservative and expansionary, per the video?',
      options: [
        'It represents a middle ground qualitative posture between a low and a high willingness to accept that risk type',
        'Neutral always equals a risk tolerance of exactly zero',
        'Neutral is not a valid risk appetite posture in this model',
        'Neutral only applies when no risk analysis has been done yet',
      ],
      correct: 0,
      why: 'Neutral steht laut Video als mittlere Einstufung zwischen conservative und expansionary innerhalb der qualitativen Risk-Appetite-Postures.',
    },
    {
      q: 'A loss event would cost $40,000 and is expected once every five years. What is the annualized loss expectancy (ALE)?',
      options: [
        '$8,000',
        '$40,000',
        '$200,000',
        '$5,000',
      ],
      correct: 0,
      why: 'ALE = SLE × ARO. Bei 40.000 US-Dollar Einzelschaden und einer jährlichen Rate von 0,2 ergibt sich 8.000 US-Dollar pro Jahr.',
    },
  ],
  '116': [
    {
      q: 'Who commonly oversees internal compliance checks within an organization, per the video?',
      options: [
        'A Chief Compliance Officer (CCO), responsible for ensuring the organization meets state, local, federal, and other requirements',
        'Internal compliance is always outsourced entirely to a third party',
        'No individual role is ever responsible for internal compliance',
        'Only the CEO personally checks compliance with no delegation',
      ],
      correct: 0,
      why: 'Interne Compliance wird laut Video oft von einem Chief Compliance Officer verantwortet, der die Einhaltung staatlicher, lokaler und föderaler Vorgaben sicherstellt.',
    },
    {
      q: 'What does external compliance reporting typically require, per the video?',
      options: [
        'Ongoing reports at intervals set by the external requirement, with penalties for missed or incorrect reporting',
        'External reporting is a one-time event with no recurring obligation',
        'External compliance never applies to third-party relationships',
        'External reports are never reviewed by anyone outside the company',
      ],
      correct: 0,
      why: 'Externe Compliance-Berichte müssen laut Video in festgelegten Intervallen erstellt werden — verpasste oder falsche Meldungen können Strafen nach sich ziehen.',
    },
    {
      q: 'What financial penalty range does the video cite for HIPAA non-compliance?',
      options: [
        'Up to $50,000 for basic violations, rising to $250,000 for intentional misuse for commercial gain',
        'A flat $10 fine regardless of the violation',
        'HIPAA violations never carry any financial penalty',
        'Fines are capped at exactly $1,000 in every case',
      ],
      correct: 0,
      why: 'Laut Video reichen HIPAA-Strafen von bis zu 50.000 $ bei einfachen Verstößen bis zu 250.000 $ bei vorsätzlichem Missbrauch zu kommerziellen Zwecken.',
    },
    {
      q: 'Besides fines, what other formal penalty does the video mention for HIPAA non-compliance?',
      options: [
        'Imprisonment, up to 10 years for the most serious violations',
        'A mandatory public apology with no other consequence',
        'Sanctions never accompany HIPAA violations',
        'Only a warning letter with no further action',
      ],
      correct: 0,
      why: 'Neben Geldstrafen nennt das Video bei schweren HIPAA-Verstößen auch Haftstrafen von bis zu 10 Jahren.',
    },
    {
      q: 'How did the Uber breach disclosure delay illustrate reputational damage, per the video?',
      options: [
        'Uber hid a breach for over a year and paid hackers to stay quiet, resulting in massive fines and lasting reputational harm once discovered',
        'Uber disclosed the breach immediately with no consequences',
        'Reputational damage only affects small companies, never large ones',
        'The delay had no measurable financial impact on Uber',
      ],
      correct: 0,
      why: 'Uber verschwieg den Breach laut Video über ein Jahr und zahlte die Angreifer für ihr Schweigen — als es herauskam, folgten hohe Strafen und Reputationsschaden.',
    },
    {
      q: 'What business impact does the video describe from losing a required license due to non-compliance?',
      options: [
        'It can be a significant economic hit, especially if that license is required to sell the company’s product',
        'Losing a license has no impact on a company’s ability to operate',
        'Licenses are automatically reinstated the next day for free',
        'Loss of license only affects individual employees, never the company',
      ],
      correct: 0,
      why: 'Der Verlust einer nötigen Lizenz kann laut Video die Fähigkeit, ein Produkt überhaupt zu verkaufen, empfindlich treffen — mit erheblichem wirtschaftlichem Schaden.',
    },
    {
      q: 'What happens contractually when a company falls out of compliance with an agreement between two private organizations, per the video?',
      options: [
        'The contract is considered breached, though it may be resolved between the two organizations without a legal proceeding',
        'Contractual non-compliance always requires a court case',
        'Contracts have no relationship to compliance requirements',
        'Contractual breaches are automatically void with no resolution process',
      ],
      correct: 0,
      why: 'Bei vertraglich geregelter Compliance zwischen zwei privaten Organisationen gilt der Vertrag laut Video als gebrochen — die Klärung kann aber auch ohne Gerichtsverfahren erfolgen.',
    },
    {
      q: 'How does the video distinguish "due care" from "due diligence"?',
      options: [
        'Due care refers to internal activities acting in good faith; due diligence refers to those same good-faith activities performed with a third party',
        'Due care and due diligence are identical terms used interchangeably with no distinction',
        'Due diligence only applies to internal activities, never third parties',
        'Due care only applies after a breach has already occurred',
      ],
      correct: 0,
      why: 'Laut Video bezeichnet Due Care interne Aktivitäten in gutem Glauben, während Due Diligence dieselbe Sorgfalt gegenüber Dritten beschreibt.',
    },
    {
      q: 'Who typically signs off to confirm compliance is in good standing, per the video?',
      options: [
        'The executive in charge of the compliance process, through attestation and acknowledgment',
        'Any random employee can provide this attestation',
        'Attestation is never required for compliance monitoring',
        'Only external auditors may ever attest to compliance status',
      ],
      correct: 0,
      why: 'Laut Video ist es meist die zuständige Führungskraft, die per Attestierung/Bestätigung den guten Compliance-Stand offiziell bescheinigt.',
    },
    {
      q: 'What combination of sources does compliance monitoring often draw on, per the video?',
      options: [
        'Internal tools plus interaction with third parties to gather enough information to confirm compliance',
        'Only external sources, never any internal tools',
        'Compliance monitoring never involves any third-party interaction',
        'Only a single annual manual review with no tools involved',
      ],
      correct: 0,
      why: 'Compliance-Monitoring nutzt laut Video sowohl interne Tools als auch den Austausch mit Dritten, um den tatsächlichen Compliance-Status zu bestätigen.',
    },
    {
      q: 'Why do many organizations automate compliance monitoring, per the video?',
      options: [
        'There is a large amount of compliance data to collect from people, third parties, and the organization, which automated systems compile into reports',
        'Automation is only used for marketing analytics, not compliance',
        'Manual monitoring is always sufficient and automation is discouraged',
        'Automated compliance monitoring is illegal in most jurisdictions',
      ],
      correct: 0,
      why: 'Da laut Video sehr viele Compliance-Daten aus verschiedenen Quellen zusammenkommen, automatisieren viele Organisationen die Sammlung und Reporterstellung.',
    },
  ],
  '119': [
    {
      q: 'What does a physical penetration test attempt, per the video?',
      options: [
        'Gaining access to the facility itself — through doors, windows, elevators, or any physical entry point',
        'Only testing password strength remotely',
        'Physical testing only occurs against cloud infrastructure',
        'It never involves attempting building entry',
      ],
      correct: 0,
      why: 'Ein physischer Pentest versucht laut Video, über Türen, Fenster, Aufzüge oder andere Wege tatsächlich ins Gebäude zu gelangen.',
    },
    {
      q: 'What role does the "red team" play in penetration testing, per the video?',
      options: [
        'They attack systems, look for vulnerabilities, and attempt to exploit them',
        'They only monitor traffic passively with no attacks',
        'The red team writes the final compliance report only',
        'Red teams never interact with the blue team',
      ],
      correct: 0,
      why: 'Das Red Team greift laut Video aktiv an, sucht Schwachstellen und versucht, diese auszunutzen.',
    },
    {
      q: 'What role does the "blue team" play, per the video?',
      options: [
        'They identify incoming attacks in real time and block them',
        'They perform the attacks against the organization',
        'The blue team has no role in penetration testing at all',
        'Blue team members only write documentation, never respond to attacks',
      ],
      correct: 0,
      why: 'Das Blue Team erkennt laut Video Angriffe in Echtzeit und blockiert sie — das defensive Gegenstück zum Red Team.',
    },
    {
      q: 'What is the benefit of integrating red and blue teams, per the video?',
      options: [
        'The red team constantly attacks, and findings are passed to the blue team to patch and better detect next time, creating continuous feedback',
        'Integration means only one team is needed and the other is disbanded',
        'Integrated testing removes the need for any patching afterward',
        'Red and blue teams cannot be integrated under any circumstances',
      ],
      correct: 0,
      why: 'Die Integration schafft laut Video einen kontinuierlichen Feedback-Kreislauf: Das Red Team findet Lücken, das Blue Team patcht und erkennt sie künftig besser.',
    },
    {
      q: 'What is an "unknown environment" (blind) test, per the video?',
      options: [
        'No information is provided to the pen tester, who must find everything on their own',
        'The tester receives full documentation of every system in advance',
        'It is identical to a known environment test',
        'Unknown environment tests are never used in practice',
      ],
      correct: 0,
      why: 'Bei einem Unknown-Environment- bzw. Blind-Test erhält der Tester laut Video keinerlei Vorabinformationen und muss alles selbst herausfinden.',
    },
  ],
}
