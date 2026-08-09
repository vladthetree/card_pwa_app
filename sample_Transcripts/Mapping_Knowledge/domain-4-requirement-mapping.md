# Domain 4 — Objectives ↔ Transkript-Mapping (destilliert)

200 Requirements, je mit destilliertem Inhalt aus Messers Einzellektion + Cram-Video.
5 davon mit ⚠ markiertem Quellenkonflikt (Messer und Cram-Video widersprechen sich inhaltlich).

## Objective 4.1

### 4.1 > Secure baselines > Establish
`req:sy0701:v7:4.1:secure-baselines:establish`

**possibleQuestion1**

- Question: What is the primary purpose of establishing a secure baseline in cyber security?
- A. To ensure that all systems operate without any security controls
- B. to remove access restrictions for easier system management
- C. to define the minimum required security settings for all systems
- D. to disable encryption to improve system performance The primary purpose of establishing a secure baseline in cyber security
- Correct answer: to define the minimum required security settings for all systems
- Distractors: To ensure that all systems operate without any security controls | to remove access restrictions for easier system management | to disable encryption to improve system performance The primary purpose of establishing a secure baseline in cyber security
- Source topic: `Zweck Secure Baseline`
- Option source: transcript
- Mapping confidence: high

Messer betont, dass man Baselines nicht selbst erfinden muss: App-Entwickler, OS-Hersteller und Appliance-Hersteller liefern fertige Grundgerüste, die man anpasst; Beispiel Microsofts Security Compliance Toolkit mit über 3.000 Gruppenrichtlinien-Einstellungen. Das Cram-Video ergänzt die Begriffshierarchie Control → Benchmark → Baseline und beschreibt „Establish" als Phase aus Asset-Identifikation, Threat Modeling und Risikobewertung.

### 4.1 > Secure baselines > Deploy
`req:sy0701:v7:4.1:secure-baselines:deploy`

**possibleQuestion1**

- Question: What is an important step when deploying a secure baseline?
- A. Removing all security updates to speed up deployment
- B. Allowing unrestricted administrative access to systems Disabling monitoring tools to prevent false alerts
- C. ensuring system settings match security policies before deployment
- D. An important step when deploying a secure baseline
- Correct answer: ensuring system settings match security policies before deployment
- Distractors: Removing all security updates to speed up deployment | Allowing unrestricted administrative access to systems Disabling monitoring tools to prevent false alerts | An important step when deploying a secure baseline
- Source topic: `Baseline-Deployment`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt das Ausrollen der Einstellungen über zentrale Konsolen, Gruppenrichtlinien oder MDM und hält Automatisierung für unverzichtbar bei vielen Geräten. Das Cram-Video nennt Automatisierung als wichtigsten Punkt der Deploy-Phase und listet Konfigurationsmanagement-Tools, CI/CD-Pipelines und Infrastructure as Code.

### 4.1 > Secure baselines > Maintain
`req:sy0701:v7:4.1:secure-baselines:maintain`

**possibleQuestion1**

- Question: Why is it important to maintain a secure baseline over time?
- A. to keep systems protected through regular updates and patches
- B. to eliminate the need for security audits and assessments
- C. to allow systems to operate without encryption for faster performance
- D. to prevent security configurations from being changed under any circumstances
- Correct answer: to keep systems protected through regular updates and patches
- Distractors: to eliminate the need for security audits and assessments | to allow systems to operate without encryption for faster performance | to prevent security configurations from being changed under any circumstances
- Source topic: `Baseline-Pflege`
- Option source: transcript
- Mapping confidence: high

Laut Messer ändern sich Baselines selten, müssen aber bei neuen Schwachstellen oder Updates aktualisiert werden; er empfiehlt Testen vor Rollout und Auditieren danach. Das Cram-Video fasst Maintain als Kampf gegen Configuration Drift: regelmäßige Scans, Patch-Management und periodisches Baseline-Review.

### 4.1 > Hardening targets > Mobile devices
`req:sy0701:v7:4.1:hardening-targets:mobile-devices`

**possibleQuestion1**

- Question: Which of the following is an effective method for hardening mobile devices?
- A. Disabling automatic updates to prevent system changes
- B. allowing unrestricted installation of third-party apps
- C. using strong authentication and remote wipe
- D. disabling encryption to improve performance
- Correct answer: using strong authentication and remote wipe
- Distractors: Disabling automatic updates to prevent system changes | allowing unrestricted installation of third-party apps | disabling encryption to improve performance
- Source topic: `Mobile Hardening`
- Option source: transcript
- Mapping confidence: high

Messer nennt Hardening Guides der Hersteller, Patches und Datensegmentierung zur Trennung von Firmen- und Privatdaten, verwaltet über MDM. Das Cram-Video ergänzt starke Passwörter, App-Management, Mindest-OS-Version, Remote Wipe und Abschalten ungenutzter Gerätefunktionen.

### 4.1 > Hardening targets > Workstations
`req:sy0701:v7:4.1:hardening-targets:workstations`

**possibleQuestion1**

- Question: What is a key security measure for hardening workstations?
- A. applying patches and disabling unneeded services
- B. allowing unrestricted administrator access for all users
- C. disabling firewalls to increase network speed
- D. enabling guest accounts for convenience
- Correct answer: applying patches and disabling unneeded services
- Distractors: allowing unrestricted administrator access for all users | disabling firewalls to increase network speed | enabling guest accounts for convenience
- Source topic: `Workstation-Hardening`
- Option source: transcript
- Mapping confidence: high

Messer behandelt Workstations mit regelmäßigen gebündelten Updates und Entfernen nicht genutzter Software. Das Cram-Video ergänzt starke Anmeldedaten, Deaktivieren nicht benötigter Dienste, Least Privilege, Anti-Malware und eine Host-Firewall gegen laterale Bewegung.

### 4.1 > Hardening targets > Switches
`req:sy0701:v7:4.1:hardening-targets:switches`

**possibleQuestion1**

- Question: What is a recommended practice for securing network switches, allowing open access to all VLANs, disable unused ports and use MAC filtering, configuring all ports to operate in promiscuous mode, or disabling logging to improve performance?
- A. disabling unused ports and using MAC filtering
- B. Mobile devices
- C. Workstations
- D. Routers
- Correct answer: disabling unused ports and using MAC filtering
- Distractors: Mobile devices | Workstations | Routers
- Source topic: `Switch-Absicherung`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer behandelt Switches gemeinsam mit Routern/Firewalls: eingebettetes zweckgebundenes OS, Default-Zugangsdaten ändern, echte Authentifizierung, seltene aber wichtige Herstellerpatches. Das Cram-Video ergänzt starke Passwörter, Firmware-Updates, ACLs und Segmentierung.

### 4.1 > Hardening targets > Routers
`req:sy0701:v7:4.1:hardening-targets:routers`

**possibleQuestion1**

- Question: Which of the following is an essential security measure for hardening routers?
- A. Using default manufacturer settings for quick setup
- B. changing default credentials and disabling unnecessary services
- C. disabling encryption to improve network speed
- D. allowing remote administration from any IP address
- Correct answer: changing default credentials and disabling unnecessary services
- Distractors: Using default manufacturer settings for quick setup | disabling encryption to improve network speed | allowing remote administration from any IP address
- Source topic: `Router-Hardening`
- Option source: transcript
- Mapping confidence: high

Router werden in beiden Quellen nicht getrennt von Switches behandelt, sondern in derselben Kategorie „Netzwerkinfrastruktur" — es gibt keine router-spezifischen Aussagen, dieselben Härtungspunkte gelten.

### 4.1 > Hardening targets > Cloud infrastructure
`req:sy0701:v7:4.1:hardening-targets:cloud-infrastructure`

**possibleQuestion1**

- Question: What is an important security consideration for cloud infrastructure?
- A. implementing strong identity and access management controls
- B. allowing unrestricted access to all cloud services
- C. disabling encryption to reduce processing overhead
- D. allowing all applications to run with administrative privileges
- Correct answer: implementing strong identity and access management controls
- Distractors: allowing unrestricted access to all cloud services | disabling encryption to reduce processing overhead | allowing all applications to run with administrative privileges
- Source topic: `Cloud-Absicherung`
- Option source: transcript
- Mapping confidence: high

Messer setzt bei der zentralen Cloud-Management-Workstation an, die besonders abgesichert sein muss, dazu Least Privilege, EDR und Backups zu einem zweiten Anbieter. Das Cram-Video nennt IAM, Verschlüsselung, Logging/Monitoring und gehärtete VM-Images aus dem Cloud-Marketplace.

### 4.1 > Hardening targets > Servers
`req:sy0701:v7:4.1:hardening-targets:servers`

**possibleQuestion1**

- Question: Which security control is essential for hardening servers?
- A. Enabling all ports for unrestricted connectivity
- B. using default administrator credentials for all accounts
- C. enforcing lease privilege and disabling unnecessary services
- D. disabling logging to improve server performance
- Correct answer: enforcing lease privilege and disabling unnecessary services
- Distractors: Enabling all ports for unrestricted connectivity | using default administrator credentials for all accounts | disabling logging to improve server performance
- Source topic: `Server-Hardening`
- Option source: transcript
- Mapping confidence: high

Messer nennt Sicherheitspatches, Passwortrichtlinien, Least Privilege, Deaktivieren ungenutzter Konten und EDR/Antivirus. Das Cram-Video ergänzt Configuration Baseline via VM-Image, Schließen nicht benötigter Ports, Full Disk Encryption und geordnetes Patch-Management.

### 4.1 > Hardening targets > ICS/SCADA
`req:sy0701:v7:4.1:hardening-targets:ics-scada`

**possibleQuestion1**

- Question: What is a major security risk associated with industrial control systems and SCADA?
- A. ICS and SCADA often lack built-in security making them vulnerable
- B. They're always isolated from the internet and cannot be accessed remotely
- C. SCADA systems automatically update their security patches
- D. ICS networks do not require authentication for remote access
- Correct answer: ICS and SCADA often lack built-in security making them vulnerable
- Distractors: They're always isolated from the internet and cannot be accessed remotely | SCADA systems automatically update their security patches | ICS networks do not require authentication for remote access
- Source topic: `ICS/SCADA-Risiko`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does OT stand for?
- A. Operational Technology
- B. organizational technology
- C. optical transmission
- D. operational transmission
- Correct answer: Operational Technology
- Distractors: organizational technology | optical transmission | operational transmission
- Source topic: `OT-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer erklärt SCADA als Kombination aus Netzwerk und Plattformen zur Industrieanlagen-Steuerung, typischerweise per Air Gap vom Rest der Organisation getrennt. Das Cram-Video nennt Segmentierung, physische Sicherheit, Change Management und laufende Überwachung.

### 4.1 > Hardening targets > Embedded systems
`req:sy0701:v7:4.1:hardening-targets:embedded-systems`

**possibleQuestion1**

- Question: How can embedded systems be hardened against security threats?
- A. By allowing all devices to communicate without authentication
- B. By keeping default settings to simplify maintenance
- C. by storing encryption keys in unprotected locations
- D. disabling unnecessary functions and applying firmware updates
- Correct answer: disabling unnecessary functions and applying firmware updates
- Distractors: By allowing all devices to communicate without authentication | By keeping default settings to simplify maintenance | by storing encryption keys in unprotected locations
- Source topic: `Embedded Hardening`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt Embedded Systems als Zweckgeräte mit eingeschränktem OS-Zugriff und seltenen Patches, empfiehlt eigenes Netzsegment mit Firewall. Das Cram-Video ergänzt sichere Programmierpraktiken, aktuelle Firmware, Code Reviews und Secure Boot.

### 4.1 > Hardening targets > RTOS
`req:sy0701:v7:4.1:hardening-targets:rtos`

**possibleQuestion1**

- Question: Which of the following is a security challenge associated with real time operating systems?
- A. RTOS often prioritizes performance over security increasing vulnerability
- B. RTOS systems are immune to malware due to their specialized design
- C. RTOS systems automatically apply security patches in real time
- D. RTOS does not require authentication for access control
- Correct answer: RTOS often prioritizes performance over security increasing vulnerability
- Distractors: RTOS systems are immune to malware due to their specialized design | RTOS systems automatically apply security patches in real time | RTOS does not require authentication for access control
- Source topic: `RTOS-Risiko`
- Option source: transcript
- Mapping confidence: high

Messer erklärt RTOS als deterministisches System für Industrie-/Militärtechnik und Fahrzeuge, mit Isolation vom übrigen Netz und minimalem Diensteumfang als Härtung. Das Cram-Video nennt RTOS nur zusammen mit Embedded Systems ohne eigene Inhalte.

### 4.1 > Hardening targets > IoT devices
`req:sy0701:v7:4.1:hardening-targets:iot-devices`

**possibleQuestion1**

- Question: Which of the following best describes a major security risk associated with IoT devices?
- A. IoT devices cannot be accessed remotely making them inherently secure
- B. IoT devices automatically update firmware with the latest security patches
- C. vulnerable to attacks
- D. IoT devices do not require encryption for secure communication
- Correct answer: vulnerable to attacks
- Distractors: IoT devices cannot be accessed remotely making them inherently secure | IoT devices automatically update firmware with the latest security patches | IoT devices do not require encryption for secure communication
- Source topic: `IoT-Risiko`
- Option source: transcript
- Mapping confidence: high

Messer weist darauf hin, dass IoT-Hersteller keine Sicherheitsexperten sind, daher hohe Patch-Priorität und eigenes Netzsegment als Schadensbegrenzung. Das Cram-Video nennt starke Passwörter, Firmware-Updates, Netzsegmentierung und sichere Kommunikationsprotokolle.

### 4.1 > Wireless devices > Site surveys
`req:sy0701:v7:4.1:wireless-devices:installation-considerations:site-surveys`

**possibleQuestion1**

- Question: What is the purpose of a wireless site survey?
- A. to analyze signal strength, interference, and coverage for optimal deployment
- B. Heat maps
- C. Establish
- D. Deploy
- Correct answer: to analyze signal strength, interference, and coverage for optimal deployment
- Distractors: Heat maps | Establish | Deploy
- Source topic: `Site Survey`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion2**

- Question: What does WAP stand for?
- A. Wireless Access Point
- B. Heat maps
- C. Establish
- D. Deploy
- Correct answer: Wireless Access Point
- Distractors: Heat maps | Establish | Deploy
- Source topic: `WAP-Akronym`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer beschreibt den Site Survey als Erfassung vorhandener Access Points zur Kanalwahl ohne Kollisionen, regelmäßig zu wiederholen. Das Cram-Video definiert ihn als Begehung mit tragbarem Gerät, Signalstärken werden in einen Gebäudeplan eingetragen.

### 4.1 > Wireless devices > Heat maps ⚠ QUELLENKONFLIKT
`req:sy0701:v7:4.1:wireless-devices:installation-considerations:heat-maps`

**possibleQuestion1**

- Question: What is a heat map represent in a wireless network assessment?
- A. a visual representation of wireless signal strength and coverage areas
- B. a list of all devices connected to a wireless network
- C. a graphical display of network security logs
- D. a real-time encryption key tracking system
- Correct answer: a visual representation of wireless signal strength and coverage areas
- Distractors: a list of all devices connected to a wireless network | a graphical display of network security logs | a real-time encryption key tracking system
- Source topic: `Heat Map`
- Option source: transcript
- Mapping confidence: high

Messer zeigt eine Heat Map als visuelle Signalstärke-Darstellung (bei ihm Gelb/Rot = stark). Das Cram-Video nutzt die umgekehrte Farbkonvention (Grün/Blau = stark) und nennt AP-Platzierung, Troubleshooting und Kapazitätsplanung als Anwendungen — die Farbzuordnung widerspricht sich zwischen den Quellen.

### 4.1 > Mobile solutions > MDM
`req:sy0701:v7:4.1:mobile-solutions:mobile-device-management-mdm`

**possibleQuestion1**

- Question: What is the primary function of mobile device management or MDM in an enterprise environment?
- A. to enforce security policies and remotely manage mobile devices
- B. BYOD
- C. COPE
- D. CYOD
- Correct answer: to enforce security policies and remotely manage mobile devices
- Distractors: BYOD | COPE | CYOD
- Source topic: `MDM-Funktion`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion2**

- Question: What does MDM stand for?
- A. Mobile data monitoring
- B. Mobile Device Management
- C. manage device module
- D. mobile distribution management
- Correct answer: Mobile Device Management
- Distractors: Mobile data monitoring | manage device module | mobile distribution management
- Source topic: `MDM-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt MDM als zentrale Verwaltung mit Richtlinien-Rollout, Funktionssteuerung und Segmentierung des Geschäftsbereichs. Das Cram-Video vertieft: Passwörter, Gerätesperre, Geofencing, App-Allowlists, Remote/Selective Wipe und Erkennen gerooteter Geräte, eingebettet in Unified Endpoint Management.

### 4.1 > Mobile solutions > BYOD
`req:sy0701:v7:4.1:mobile-solutions:deployment-models:bring-your-own-device-byod`

**possibleQuestion1**

- Question: Which of the following best describes the bring your own device or BYOD deployment model?
- A. employees use personal devices for work under security policies
- B. Only corporateowned devices are allowed on the network
- C. Employees must use company provided devices with no personal use allowed
- D. organizations do not allow mobile devices to connect to their network
- Correct answer: employees use personal devices for work under security policies
- Distractors: Only corporateowned devices are allowed on the network | Employees must use company provided devices with no personal use allowed | organizations do not allow mobile devices to connect to their network
- Source topic: `BYOD`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does BYOD stand for?
- A. Bring Your Own Device
- B. build your own device
- C. bring your office device
- D. bring your own data
- Correct answer: Bring Your Own Device
- Distractors: build your own device | bring your office device | bring your own data
- Source topic: `Akronym BYOD`
- Option source: transcript
- Mapping confidence: high

Messer definiert BYOD als privates Gerät für privat und dienstlich, mit Herausforderung MDM-Konformität bei Privatsphärenschutz. Das Cram-Video nennt BYOD als verbreitetstes Modell, fordert Acceptable-Use-Policy und Mobile Application Management mit Selective Wipe.

### 4.1 > Mobile solutions > COPE
`req:sy0701:v7:4.1:mobile-solutions:deployment-models:corporate-owned-personally-enabled-cope`

**possibleQuestion1**

- Question: How does the corporateowned personally enabled or cope deployment model differ from BYOD?
- A. Employees bring their own devices without company management
- B. Employees have complete control over all security settings
- C. devices are strictly limited to corporate use with no personal functionality
- D. company owned devices with limited personal use allowed
- Correct answer: company owned devices with limited personal use allowed
- Distractors: Employees bring their own devices without company management | Employees have complete control over all security settings | devices are strictly limited to corporate use with no personal functionality
- Source topic: `COPE vs. BYOD`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does COPE stand for?
- A. Corporateowned organizational provided
- B. companyowned personally managed
- C. corporate organized personally enabled
- D. Corporate-Owned, Personally Enabled
- Correct answer: Corporate-Owned, Personally Enabled
- Distractors: Corporateowned organizational provided | companyowned personally managed | corporate organized personally enabled
- Source topic: `Akronym COPE`
- Option source: transcript
- Mapping confidence: high

Messer erklärt COPE als firmengekauftes, zugewiesenes Gerät mit erlaubter Privatnutzung und getrennter Partition. Das Cram-Video hält COPE für managementfreundlicher als BYOD, da die Firma Apps einschränken und vollständig wipen darf.

### 4.1 > Mobile solutions > CYOD ⚠ QUELLENKONFLIKT
`req:sy0701:v7:4.1:mobile-solutions:deployment-models:choose-your-own-device-cyod`

**possibleQuestion1**

- Question: Which mobile device deployment model allows employees to select from a list of company approved devices?
- A. choose your own device or CYOD
- B. bring your own device
- C. BYOD corporate owned personally enabled
- D. cope mobile device management MDM
- Correct answer: choose your own device or CYOD
- Distractors: bring your own device | BYOD corporate owned personally enabled | cope mobile device management MDM
- Source topic: `CYOD`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does CYOD stand for?
- A. Choose your own desktop
- B. Choose Your Own Device
- C. choose your own data
- D. customize your own device
- Correct answer: Choose Your Own Device
- Distractors: Choose your own desktop | choose your own data | customize your own device
- Source topic: `Akronym CYOD`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt CYOD als firmeneigenes Gerät mit Auswahlrecht des Nutzers. Das Cram-Video beschreibt es als Auswahl aus freigegebener Liste, aber mit Mitarbeiter als Käufer — die Quellen widersprechen sich beim Eigentum.

### 4.1 > Mobile solutions > Connection methods > Cellular
`req:sy0701:v7:4.1:mobile-solutions:connection-methods:cellular`

**possibleQuestion1**

- Question: Which mobile connection method provides the most secure and reliable remote network access?
- A. Public Wi-Fi
- B. unencrypted Bluetooth
- C. cellular
- D. open wireless hotspots
- Correct answer: cellular
- Distractors: Public Wi-Fi | unencrypted Bluetooth | open wireless hotspots
- Source topic: `sicherste Mobilverbindung`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt Mobilfunk (4G/5G) mit Risiken durch unkontrollierten Übertragungsweg wie Traffic-Monitoring und Standortverfolgung. Das Cram-Video ergänzt 5G-Details (Standalone vs. Non-Standalone), Diameter-Protokoll als Angriffsziel und SMS als schwachen zweiten Faktor.

### 4.1 > Mobile solutions > Connection methods > Wi-Fi
`req:sy0701:v7:4.1:mobile-solutions:connection-methods:wi-fi`

**possibleQuestion1**

- Question: What is a common security risk when connecting to public Wi-Fi networks?
- A. Stronger encryption than cellular networks
- B. man-in-the-middle or MITM attacks that intercept data
- C. guaranteed protection against unauthorized access
- D. automatic enforcement of corporate security policies
- Correct answer: man-in-the-middle or MITM attacks that intercept data
- Distractors: Stronger encryption than cellular networks | guaranteed protection against unauthorized access | automatic enforcement of corporate security policies
- Source topic: `Public-WLAN-Risiko`
- Option source: transcript
- Mapping confidence: high

Messer nennt Mitlauschen, On-Path-Angriffe und Interferenz als WLAN-Bedrohungen, empfiehlt VPN in unverschlüsselten Netzen. Das Cram-Video ergänzt Evil Twin, Disassociation-Angriffe, Jamming sowie Wi-Fi Direct vs. Ad-hoc und Captive Portals.

### 4.1 > Mobile solutions > Connection methods > Bluetooth
`req:sy0701:v7:4.1:mobile-solutions:connection-methods:bluetooth`

**possibleQuestion1**

- Question: Which of the following is a security concern when using Bluetooth connections?
- A. Bluetooth signals are immune to eavesdropping Bluetooth connections automatically use end-to-end encryption
- B. devices can be vulnerable to unauthorized pairing and interception
- C. Bluetooth devices do not require authentication for pairing
- D. which the following is a security concern when using Bluetooth connections
- Correct answer: devices can be vulnerable to unauthorized pairing and interception
- Distractors: Bluetooth signals are immune to eavesdropping Bluetooth connections automatically use end-to-end encryption | Bluetooth devices do not require authentication for pairing | which the following is a security concern when using Bluetooth connections
- Source topic: `Bluetooth-Risiko`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt Bluetooth als PAN-Technik mit Pairing-Risiko bei unbekannten Geräten. Das Cram-Video unterscheidet Bluejacking, Bluesnarfing und Bluebugging und kritisiert den vierstelligen Pairing-Code als Security by Obscurity.

### 4.1 > Wireless security settings > WPA3
`req:sy0701:v7:4.1:wireless-security-settings:wi-fi-protected-access-3-wpa3`

**possibleQuestion1**

- Question: What is a key security improvement in Wi-Fi protected access 3 or WPA3 over WPA2?
- A. WPA3 uses stronger encryption with simultaneous simultaneous authentication of equals
- B. WPA3 eliminates the need for authentication in wireless networks WPA3 increases network speed by disabling encryption
- C. Or WPA3 only works on wired networks and does not support wireless encryption
- D. Was a key security improvement in Wi-Fi protected access 3 over WPA2
- Correct answer: WPA3 uses stronger encryption with simultaneous simultaneous authentication of equals
- Distractors: WPA3 eliminates the need for authentication in wireless networks WPA3 increases network speed by disabling encryption | Or WPA3 only works on wired networks and does not support wireless encryption | Was a key security improvement in Wi-Fi protected access 3 over WPA2
- Source topic: `WPA3 vs. WPA2`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What is a key security consideration when configuring wireless devices?
- A. enabling WPA3 encryption to protect data in transit
- B. Using open networks to allow easy access for all users
- C. disabling mech address filtering for better compatibility
- D. keeping default SSIDs to simplify network identification
- Correct answer: enabling WPA3 encryption to protect data in transit
- Distractors: Using open networks to allow easy access for all users | disabling mech address filtering for better compatibility | keeping default SSIDs to simplify network identification
- Source topic: `WLAN-Gerätekonfiguration`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion3**

- Question: What does SAE stand for?
- A. Secure authentication exchange
- B. simple authentication element
- C. Simultaneous Authentication of Equals
- D. server assisted encryption in authentication methods
- Correct answer: Simultaneous Authentication of Equals
- Distractors: Secure authentication exchange | simple authentication element | server assisted encryption in authentication methods
- Source topic: `SAE-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion4**

- Question: What does WPA stand for?
- A. Wireless protection algorithm
- B. Wi-Fi Protected Access
- C. wireless privacy access
- D. wired protected access
- Correct answer: Wi-Fi Protected Access
- Distractors: Wireless protection algorithm | wireless privacy access | wired protected access
- Source topic: `WPA-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer motiviert WPA3 über die WPA2-Handshake-Schwäche (Offline-Cracking); WPA3 nutzt GCMP und SAE/Dragonfly mit individuellen Sessionkeys. Das Cram-Video ergänzt 256-Bit-GCMP, Perfect Forward Secrecy und WPA3-Enterprise mit AES-256/ECDHE.

### 4.1 > Wireless security settings > AAA/RADIUS
`req:sy0701:v7:4.1:wireless-security-settings:aaa-remote-authentication-dial-in-user-service-r`

**possibleQuestion1**

- Question: Which of the following best describes the role of the radius protocol?
- A. it provides centralized authentication and authorization for remote users
- B. It encrypts all network traffic automatically using wafer encryption technology
- C. It is used for securing web applications against attacks
- D. prevents wireless devices from connecting to networks
- Correct answer: it provides centralized authentication and authorization for remote users
- Distractors: It encrypts all network traffic automatically using wafer encryption technology | It is used for securing web applications against attacks | prevents wireless devices from connecting to networks
- Source topic: `RADIUS-Rolle`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What is the primary function of AAA authentication, authorization and accounting in remote access security?
- A. To force users to sign in using either authentication
- B. authorization an accounting method
- C. To disable encryption for faster authentication to allow anonymous users to authenticate without credentials
- D. to enforce identity verification, permissions and activity tracking
- Correct answer: to enforce identity verification, permissions and activity tracking
- Distractors: To force users to sign in using either authentication | authorization an accounting method | To disable encryption for faster authentication to allow anonymous users to authenticate without credentials
- Source topic: `AAA`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion3**

- Question: What does RADIUS stand for?
- A. Remote access dial-in user service
- B. Remote Authentication Dial-In User Service
- C. regional authentication dialin user service
- D. remote access data user interface service
- Correct answer: Remote Authentication Dial-In User Service
- Distractors: Remote access dial-in user service | regional authentication dialin user service | remote access data user interface service
- Source topic: `RADIUS-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer erklärt AAA (Identification, Authentication, Authorization, Accounting) und RADIUS als weit verbreiteten zentralen Authentifizierungsserver trotz „Dial-in" im Namen. Das Cram-Video ergänzt: RADIUS nutzt UDP und verschlüsselt nur das Passwort, TACACS+ nutzt TCP und verschlüsselt die ganze Sitzung.

### 4.1 > Wireless security settings > Cryptographic protocols
`req:sy0701:v7:4.1:wireless-security-settings:cryptographic-protocols`

**possibleQuestion1**

- Question: Which cryptographic protocol is commonly used to secure web communications?
- A. Secure file transfer protocol SFTP
- B. simple network management protocol SNMP
- C. transport layer security
- D. TLS internet protocol security IPSC
- Correct answer: transport layer security
- Distractors: Secure file transfer protocol SFTP | simple network management protocol SNMP | TLS internet protocol security IPSC
- Source topic: `Krypto-Protokoll für Web`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does CCMP stand for?
- A. Counter Mode with Cipher Block Chaining Message Authentication Code Protocol
- B. WPA3
- C. AAA/RADIUS
- D. Authentication protocols
- Correct answer: Counter Mode with Cipher Block Chaining Message Authentication Code Protocol
- Distractors: WPA3 | AAA/RADIUS | Authentication protocols
- Source topic: `Akronym CCMP`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion3**

- Question: What does PSK stand for?
- A. Public shared key
- B. private shared key
- C. Pre-Shared Key
- D. password shared key
- Correct answer: Pre-Shared Key
- Distractors: Public shared key | private shared key | password shared key
- Source topic: `PSK-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion4**

- Question: What does TKIP stand for?
- A. Temporal Key Integrity Protocol
- B. transient key integrity protocol
- C. temporal key information protocol
- D. transitional key integrity protocol
- Correct answer: Temporal Key Integrity Protocol
- Distractors: transient key integrity protocol | temporal key information protocol | transitional key integrity protocol
- Source topic: `TKIP-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion5**

- Question: What does WEP stand for?
- A. Wireless encryption protocol
- B. wired equivalent protection
- C. wireless equivalent protection
- D. Wired Equivalent Privacy
- Correct answer: Wired Equivalent Privacy
- Distractors: Wireless encryption protocol | wired equivalent protection | wireless equivalent protection
- Source topic: `WEP-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer legt Verschlüsselung plus Message Integrity Check (MIC) als Grundanforderung fest, historisch WPA2, dann WPA3 mit GCMP. Das Cram-Video nennt konkret CCMP (WPA2, AES 128-Bit), abgelöst durch GCMP-256 in WPA3.

### 4.1 > Wireless security settings > Authentication protocols
`req:sy0701:v7:4.1:wireless-security-settings:authentication-protocols`

**possibleQuestion1**

- Question: Which of the following is a widely used authentication protocol for network access control?
- A. File transfer protocol FTP
- B. dynamic host configuration protocol DHCP
- C. hypertext transfer protocol secure HTTPS
- D. extensible authentication protocol or EAP
- Correct answer: extensible authentication protocol or EAP
- Distractors: File transfer protocol FTP | dynamic host configuration protocol DHCP | hypertext transfer protocol secure HTTPS
- Source topic: `Auth-Protokoll für NAC`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does CHAP stand for?
- A. Controlled handshake authentication protocol
- B. continuous handshake authentication protocol
- C. Challenge-Handshake Authentication Protocol
- D. comprehensive handshake authentication process
- Correct answer: Challenge-Handshake Authentication Protocol
- Distractors: Controlled handshake authentication protocol | continuous handshake authentication protocol | comprehensive handshake authentication process
- Source topic: `Akronym CHAP`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion3**

- Question: What does LEAP stand for?
- A. Lightweight encryption and authentication protocol
- B. local extensible authentication protocol
- C. lightweight extensible authorization protocol
- D. Lightweight Extensible Authentication Protocol
- Correct answer: Lightweight Extensible Authentication Protocol
- Distractors: Lightweight encryption and authentication protocol | local extensible authentication protocol | lightweight extensible authorization protocol
- Source topic: `LEAP-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion4**

- Question: What does MS-CHAP stand for?
- A. Microsoft Challenge-Handshake Authentication Protocol
- B. WPA3
- C. AAA/RADIUS
- D. Cryptographic protocols
- Correct answer: Microsoft Challenge-Handshake Authentication Protocol
- Distractors: WPA3 | AAA/RADIUS | Cryptographic protocols
- Source topic: `MS-CHAP-Akronym`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion5**

- Question: What does PAP stand for?
- A. Private access protocol
- B. public authentication process
- C. protected access protocol
- D. Password Authentication Protocol
- Correct answer: Password Authentication Protocol
- Distractors: Private access protocol | public authentication process | protected access protocol
- Source topic: `PAP-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion6**

- Question: What does PEAP stand for?
- A. P EAP public extensible authentication protocol
- B. Protected Extensible Authentication Protocol
- C. private extensible authentication protocol
- D. password extensible authentication protocol
- Correct answer: Protected Extensible Authentication Protocol
- Distractors: P EAP public extensible authentication protocol | private extensible authentication protocol | password extensible authentication protocol
- Source topic: `PEAP-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer unterscheidet Pre-Shared Key von zentraler 802.1X-Authentifizierung mit EAP, Supplicant/Authenticator/Authentication Server. Das Cram-Video ergänzt PEAP, das historische LEAP, unsicheres WPS und Enterprise Mode mit Zertifikaten.

### 4.1 > Application security > Input validation
`req:sy0701:v7:4.1:application-security:input-validation`

**possibleQuestion1**

- Question: Why is input validation important for application security?
- A. It disables encryption to speed up data processing
- B. it prevents injection attacks by validating input data
- C. It allows users to execute arbitrary code on the server
- D. it ensures that all data is stored in plain text for better performance
- Correct answer: it prevents injection attacks by validating input data
- Distractors: It disables encryption to speed up data processing | It allows users to execute arbitrary code on the server | it ensures that all data is stored in plain text for better performance
- Source topic: `Input Validation`
- Option source: transcript
- Mapping confidence: high

Messer definiert Input Validation als Prüfung aller Eingaben gegen erwartetes Format, mit Fuzzing als Gegentest. Das Cram-Video begründet es mit Verhinderung von Buffer/Integer Overflow und SQL Injection.

### 4.1 > Application security > Secure cookies
`req:sy0701:v7:4.1:application-security:secure-cookies`

Messer erklärt Cookies als Tracking-/Sitzungsdateien; ein Secure Cookie erlaubt Übertragung nur über HTTPS. Das Cram-Video ergänzt Session Hijacking bei Diebstahl und den HSTS-Header gegen unverschlüsselte Verbindungen.

### 4.1 > Application security > Static code analysis
`req:sy0701:v7:4.1:application-security:static-code-analysis`

**possibleQuestion1**

- Question: How does static code analysis improve application security?
- A. by identifying vulnerabilities in source code before execution
- B. Input validation
- C. Secure cookies
- D. Code signing
- Correct answer: by identifying vulnerabilities in source code before execution
- Distractors: Input validation | Secure cookies | Code signing
- Source topic: `Static Code Analysis`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer beschreibt SAST als Codeprüfung auf Schwachstellen wie Buffer Overflows, mit Grenzen bei Implementierungsfehlern und False Positives. Das Cram-Video ergänzt: SAST braucht Quellcode und prüft „von innen nach außen", im Gegensatz zu dynamischer Analyse.

### 4.1 > Application security > Code signing
`req:sy0701:v7:4.1:application-security:code-signing`

**possibleQuestion1**

- Question: What is the main purpose of code signing in software security?
- A. to verify software authent authenticity and integrity with digital signatures
- B. Input validation
- C. Secure cookies
- D. Static code analysis
- Correct answer: to verify software authent authenticity and integrity with digital signatures
- Distractors: Input validation | Secure cookies | Static code analysis
- Source topic: `Code Signing`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer erklärt Code Signing als digitale Signatur zum Nachweis von Herkunft und Unverändertheit, beglaubigt von einer CA. Das Cram-Video führt es als Secure-Coding-Praxis neben Allow-/Blocklists auf.

### 4.1 > Sandboxing
`req:sy0701:v7:4.1:sandboxing`

**possibleQuestion1**

- Question: What is the primary function of sandboxing in cyber security?
- A. To allow unrestricted access to system resources for testing purposes To execute untrusted code directly on production servers
- B. to isolate untrusted applications in a controlled environment to prevent threats
- C. to disable all security features in an application for debugging
- D. Whereas the primary function of sandboxing in cyber security
- Correct answer: to isolate untrusted applications in a controlled environment to prevent threats
- Distractors: To allow unrestricted access to system resources for testing purposes To execute untrusted code directly on production servers | to disable all security features in an application for debugging | Whereas the primary function of sandboxing in cyber security
- Source topic: `Sandboxing`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt Laufzeit- und Entwicklungs-Sandbox, Beispiel Browser ohne Zugriff auf die Camera Roll auf Mobilgeräten. Das Cram-Video nennt isolierte VMs zum Testen, Anti-Malware-Sandboxing (Office-365 Safe Attachments) und chroot jail unter Linux.

### 4.1 > Monitoring
`req:sy0701:v7:4.1:monitoring`

**possibleQuestion1**

- Question: Why is continuous monitoring important in cyber security?
- A. It eliminates the need for firewalls and intrusion detection systems
- B. It allows all users to access system logs without restrictions
- C. It ensures that security vulnerabilities are only addressed after an attack occurs
- D. it helps detect and respond to security threats in real time
- Correct answer: it helps detect and respond to security threats in real time
- Distractors: It eliminates the need for firewalls and intrusion detection systems | It allows all users to access system logs without restrictions | It ensures that security vulnerabilities are only addressed after an attack occurs
- Source topic: `Continuous Monitoring`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt in Anwendungen eingebautes Monitoring zur Erkennung von Angriffsversuchen wie SQL Injection. Das Cram-Video stellt SIEM als zentrales Werkzeug vor: Aggregation, Normalisierung und automatisches/manuelles Untersuchen verschiedener Quellen.

## Objective 4.2

### 4.2 > Acquisition/procurement process
`req:sy0701:v7:4.2:acquisition-procurement-process`

**possibleQuestion1**

- Question: What is a key security consideration at the acquisition and procurement process?
- A. Purchasing the cheapest solution without assessing security impact
- B. evaluating vendors for security compliance and potential risks
- C. Avoiding software updates to prevent system changes
- D. granting full administrative privileges to all new software installations
- Correct answer: evaluating vendors for security compliance and potential risks
- Distractors: Purchasing the cheapest solution without assessing security impact | Avoiding software updates to prevent system changes | granting full administrative privileges to all new software installations
- Source topic: `Beschaffung`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt Beschaffung als formalen Ablauf: Bedarfsmeldung, Budgetprüfung, Freigaben, Verhandlung, Lieferung und Aufnahme ins Asset-Tracking-System. Das Cram-Video ergänzt die Sicherheitssicht: Anbieter-Reputation, gültige Lizenzen, Baseline-/Golden-Image-Konfigurationen und Risiken wie infizierte Firmware.

### 4.2 > Assignment/accounting > Ownership
`req:sy0701:v7:4.2:assignment-accounting:ownership`

**possibleQuestion1**

- Question: Why is asset ownership important in cyber security?
- A. it assigns responsibility for the protection and management of an asset
- B. It ensures that all employees have unrestricted access to critical data
- C. It allows assets to be shared freely without tracking usage
- D. it eliminates the need for access control policies
- Correct answer: it assigns responsibility for the protection and management of an asset
- Distractors: It ensures that all employees have unrestricted access to critical data | It allows assets to be shared freely without tracking usage | it eliminates the need for access control policies
- Source topic: `Asset Ownership`
- Option source: transcript
- Mapping confidence: high

Laut Messer hinterlegt das Tracking-System einen zugewiesenen Eigentümer für gezielte Ansprache bei Änderungen. Das Cram-Video formuliert Ownership allgemeiner: wer für das Asset verantwortlich ist — Person, Abteilung oder Team.

### 4.2 > Assignment/accounting > Classification
`req:sy0701:v7:4.2:assignment-accounting:classification`

**possibleQuestion1**

- Question: What is the purpose of data classification in organization?
- A. to categorize data based on sensitivity and access requirements
- B. Ownership
- C. Acquisition/procurement process
- D. Inventory
- Correct answer: to categorize data based on sensitivity and access requirements
- Distractors: Ownership | Acquisition/procurement process | Inventory
- Source topic: `Datenklassifizierung`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer versteht Klassifizierung technisch-buchhalterisch: Gerätetyp und Hardware vs. Software für die Steuerlast. Das Cram-Video meint Einstufung nach Sensitivität, die passende Zugriffskontrollen erst ermöglicht.

### 4.2 > Monitoring/asset tracking > Inventory
`req:sy0701:v7:4.2:monitoring-asset-tracking:inventory`

**possibleQuestion1**

- Question: Why is asset inventory management important in cyber security?
- A. it helps track and manage IT resources to identify unauthorized devices
- B. It allows unrestricted connection of personal devices to the corporate network
- C. It ensures that all software licenses remain unused
- D. it eliminates the need for security controls on older assets
- Correct answer: it helps track and manage IT resources to identify unauthorized devices
- Distractors: It allows unrestricted connection of personal devices to the corporate network | It ensures that all software licenses remain unused | it eliminates the need for security controls on older assets
- Source topic: `Asset-Inventar`
- Option source: transcript
- Mapping confidence: high

Messer nutzt das Tracking-System für Bestandslisten und Standorte über den gesamten Lebenszyklus. Das Cram-Video definiert Inventory als aktuellen Nachweis aller Assets in einer CMDB mit jährlichen Audits und Asset-Tags.

### 4.2 > Monitoring/asset tracking > Enumeration ⚠ QUELLENKONFLIKT
`req:sy0701:v7:4.2:monitoring-asset-tracking:enumeration`

**possibleQuestion1**

- Question: What is the primary function of asset enumeration in cyber security?
- A. To delete all inactive network devices automatically to identify and catalog devices
- B. to identify and catalog devices, services and configurations on a network
- C. To encrypt all network traffic without user intervention
- D. to prevent IT teams from tracking hardware usage is the primary function of asset enumeration in cyber security
- Correct answer: to identify and catalog devices, services and configurations on a network
- Distractors: To delete all inactive network devices automatically to identify and catalog devices | To encrypt all network traffic without user intervention | to prevent IT teams from tracking hardware usage is the primary function of asset enumeration in cyber security
- Source topic: `Asset Enumeration`
- Option source: transcript
- Mapping confidence: high

Messer versteht Enumeration als Aufschlüsselung eines Assets in Bestandteile (CPU, Speicher, Peripherie). Das Cram-Video legt es anders aus: regelmäßiges Identifizieren aller Netzgeräte per Scans, um blinde Flecken zu vermeiden.

### 4.2 > Disposal/decommissioning > Sanitization
`req:sy0701:v7:4.2:disposal-decommissioning:sanitization`

**possibleQuestion1**

- Question: What is the purpose of sanitation in the disposal and decommissioning process?
- A. removed from a device before disposal or reuse
- B. Destruction
- C. Certification
- D. Data retention
- Correct answer: removed from a device before disposal or reuse
- Distractors: Destruction | Certification | Data retention
- Source topic: `Sanitization`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer erklärt Sanitization als Entfernen von Unternehmensdaten vor Recycling oder Weitergabe, per Secure-Delete-Werkzeug. Das Cram-Video ergänzt, dass Daten auch forensisch nicht wiederherstellbar sein dürfen.

### 4.2 > Disposal/decommissioning > Destruction
`req:sy0701:v7:4.2:disposal-decommissioning:destruction`

**possibleQuestion1**

- Question: Which method ensures that a storage device is permanently destroyed and cannot be recovered?
- A. physical destruction like shredding or crushing
- B. encrypting the device to prevent unauthorized access
- C. reformatting the device to erase data
- D. storing the device
- Correct answer: physical destruction like shredding or crushing
- Distractors: encrypting the device to prevent unauthorized access | reformatting the device to erase data | storing the device
- Source topic: `Destruction`
- Option source: transcript
- Mapping confidence: high

Messer nennt physische Zerstörung (Shredder, Bohrer, Degaussing) für garantiert unlesbare Daten. Das Cram-Video beschreibt Destruction knapp als physische Zerstörung über jede Wiederherstellbarkeit hinaus.

### 4.2 > Disposal/decommissioning > Certification
`req:sy0701:v7:4.2:disposal-decommissioning:certification`

**possibleQuestion1**

- Question: What is the purpose of certification in the context of data disposal?
- A. to verify that the data was properly sanitized or destroyed per security standards
- B. destroyed per security standards to ensure that device is returned to its original manufacturer for resale
- C. To guarantee that the data is accessible for future audits
- D. to provide a backup of the data for recovery purposes
- Correct answer: to verify that the data was properly sanitized or destroyed per security standards
- Distractors: destroyed per security standards to ensure that device is returned to its original manufacturer for resale | To guarantee that the data is accessible for future audits | to provide a backup of the data for recovery purposes
- Source topic: `Certification`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt das Certificate of Destruction als Nachweis eines Drittanbieters über vollzogene Vernichtung. Das Cram-Video beschreibt Certification als dokumentierten Compliance-Nachweis samt verwendeter Methode.

### 4.2 > Disposal/decommissioning > Data retention
`req:sy0701:v7:4.2:disposal-decommissioning:data-retention`

**possibleQuestion1**

- Question: Why is data retention an important consideration in the disposal process?
- A. It allows data to be stored indefinitely for future use
- B. It enables unrestricted access to all data regardless of its age
- C. It speeds up the disposal process by ignoring legal legal requirements
- D. kept for required compliance periods before secure disposal
- Correct answer: kept for required compliance periods before secure disposal
- Distractors: It allows data to be stored indefinitely for future use | It enables unrestricted access to all data regardless of its age | It speeds up the disposal process by ignoring legal legal requirements
- Source topic: `Data Retention`
- Option source: transcript
- Mapping confidence: high

Messer stellt Aufbewahrung als Gegenstück zur Vernichtung dar, oft regulatorisch erzwungen, aber auch Best Practice für Backups. Das Cram-Video betont die Gegenrichtung: länger als nötig gehaltene Daten erhöhen das Risiko bei Diebstahl oder Rechtsstreit.

## Objective 4.3

### 4.3 > Identification methods > Vulnerability scan
`req:sy0701:v7:4.3:identification-methods:vulnerability-scan`

**possibleQuestion1**

- Question: What is the primary function of a vulnerability scan in cyber security?
- A. to identify and assess potential weaknesses in a system or network
- B. Static analysis
- C. Dynamic analysis
- D. Package monitoring
- Correct answer: to identify and assess potential weaknesses in a system or network
- Distractors: Static analysis | Dynamic analysis | Package monitoring
- Source topic: `Vulnerability Scan`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer definiert den Schwachstellenscan als Prüfung ohne tatsächlichen Exploit, mit nach Schweregrad gestaffelter Ausgabe, die manuell nachgeprüft werden muss. Das Cram-Video ergänzt Scan-Varianten: credentialed/non-credentialed, intrusive/non-intrusive, Konfigurations-Review.

### 4.3 > App security > Static analysis
`req:sy0701:v7:4.3:identification-methods:application-security:static-analysis`

**possibleQuestion1**

- Question: What is the primary goal of static analysis in application security?
- A. to analyze the application source code without execution to identify vulnerabilities
- B. Dynamic analysis
- C. Package monitoring
- D. Vulnerability scan
- Correct answer: to analyze the application source code without execution to identify vulnerabilities
- Distractors: Dynamic analysis | Package monitoring | Vulnerability scan
- Source topic: `Static Analysis`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer beschreibt SAST als Quellcodeprüfung, die Buffer Overflows findet, aber keine Auth-/Krypto-Implementierungsfehler. Das Cram-Video betont Prüfung ohne Ausführung, Zugriff auf Quellcode nötig.

### 4.3 > App security > Dynamic analysis
`req:sy0701:v7:4.3:identification-methods:application-security:dynamic-analysis`

**possibleQuestion1**

- Question: How does dynamic analysis help improve application security?
- A. by analyzing the application during execution to detect real-time vulnerabilities
- B. by verifying that the application's code is compliant with industry standards
- C. by creating a backup of the application's source code for disaster recovery
- D. by encrypting the application's data to ensure privacy
- Correct answer: by analyzing the application during execution to detect real-time vulnerabilities
- Distractors: by verifying that the application's code is compliant with industry standards | by creating a backup of the application's source code for disaster recovery | by encrypting the application's data to ensure privacy
- Source topic: `Dynamic Analysis`
- Option source: transcript
- Mapping confidence: high

Messer setzt dynamische Analyse mit Fuzzing gleich: zufällige Eingaben provozieren unerwartete Reaktionen, meist automatisiert. Das Cram-Video ordnet Fuzzing als Teilmenge von DAST ein, das ohne Quellcode „von außen nach innen" testet.

### 4.3 > App security > Package monitoring ⚠ QUELLENKONFLIKT
`req:sy0701:v7:4.3:identification-methods:application-security:package-monitoring`

**possibleQuestion1**

- Question: What is the purpose of package monitoring in application security?
- A. to monitor user login activity for potential brute force attacks
- B. to control access to specific network services based on security policies
- C. to test the application's response to simulated security breaches
- D. to track and analyze third-party dependencies for vulnerabilities
- Correct answer: to track and analyze third-party dependencies for vulnerabilities
- Distractors: to monitor user login activity for potential brute force attacks | to control access to specific network services based on security policies | to test the application's response to simulated security breaches
- Source topic: `Package Monitoring`
- Option source: transcript
- Mapping confidence: high

Messer versteht darunter Vertrauensprüfung von Installationspaketen (Herkunft, Testlauf im Labor). Das Cram-Video legt den Schwerpunkt anders: Nachverfolgen genutzter Drittanbieter-/Open-Source-Bibliotheken auf bekannte Schwachstellen.

### 4.3 > Threat feed > OSINT
`req:sy0701:v7:4.3:identification-methods:threat-feed:open-source-intelligence-osint`

**possibleQuestion1**

- Question: What does open- source intelligence or OSINT involve in cyber security?
- A. collecting public info from open sources to identify potential threats
- B. Proprietary/third-party
- C. Information-sharing org
- D. Dark web
- Correct answer: collecting public info from open sources to identify potential threats
- Distractors: Proprietary/third-party | Information-sharing org | Dark web
- Source topic: `OSINT`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion2**

- Question: What does OSINT stand for?
- A. Open system internal technology
- B. Open-Source Intelligence
- C. operational source information
- D. online system integration
- Correct answer: Open-Source Intelligence
- Distractors: Open system internal technology | operational source information | online system integration
- Source topic: `OSINT-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer nennt OSINT als frei zugängliche Information aus Foren, Social Media und Regierungsquellen. Das Cram-Video nennt kostenlose Threat-Intelligence-Quellen und ordnet passive Reconnaissance ebenfalls hier ein.

### 4.3 > Threat feed > Proprietary/third-party
`req:sy0701:v7:4.3:identification-methods:threat-feed:proprietary-third-party`

**possibleQuestion1**

- Question: What is a threat feed in cyber security?
- A. A list of security policies and guidelines for employees
- B. a stream of updates on current and emerging cyber security threats
- C. a network device that blocks potential threats in real time
- D. a tool used to encrypt and protect sensitive data during transmission Whereas a threat feed in cyber security
- Correct answer: a stream of updates on current and emerging cyber security threats
- Distractors: A list of security policies and guidelines for employees | a network device that blocks potential threats in real time | a tool used to encrypt and protect sensitive data during transmission Whereas a threat feed in cyber security
- Source topic: `proprietär vs. Third-Party`
- Option source: transcript
- Mapping confidence: high
- Quality flags: scope-mismatch

Messer beschreibt kommerzielle Anbieter mit Blick über viele Organisationen zur Trend-Vorwarnung. Das Cram-Video beschreibt sie als geschlossene, kostenpflichtige Vendor-Feeds (Beispiele Tenable, Shodan).

### 4.3 > Threat feed > Information-sharing org
`req:sy0701:v7:4.3:identification-methods:threat-feed:information-sharing-organization`

**possibleQuestion1**

- Question: What is the purpose of an information sharing organization in cyber security?
- A. to enable organizations to share threat intel and security best practices
- B. to store sensitive data for organizations without encryption
- C. To prevent organizations from sharing any security related information
- D. to distribute malware and exploit vulnerabilities in organizations
- Correct answer: to enable organizations to share threat intel and security best practices
- Distractors: to store sensitive data for organizations without encryption | To prevent organizations from sharing any security related information | to distribute malware and exploit vulnerabilities in organizations
- Source topic: `Information-Sharing-Org`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does AIS stand for?
- A. Advanced intrusion sharing
- B. authenticated indicator system
- C. Automated Indicator Sharing
- D. automated intrusion sharing
- Correct answer: Automated Indicator Sharing
- Distractors: Advanced intrusion sharing | authenticated indicator system | automated intrusion sharing
- Source topic: `Akronym AIS`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion3**

- Question: What does STIX stand for?
- A. Structured Threat Information Expression
- B. standard threat information exchange
- C. secure threat information exchange
- D. structured threat indicator exchange
- Correct answer: Structured Threat Information Expression
- Distractors: standard threat information exchange | secure threat information exchange | structured threat indicator exchange
- Source topic: `STIX-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion4**

- Question: What does TAXII stand for?
- A. Trusted automatic trusted automated exchange of indicator info
- B. Trusted automated exchange of indicator info
- C. trusted access exchange of indicator information
- D. Trusted Automated Exchange of Intelligence Information
- Correct answer: Trusted Automated Exchange of Intelligence Information
- Distractors: Trusted automatic trusted automated exchange of indicator info | Trusted automated exchange of indicator info | trusted access exchange of indicator information
- Source topic: `TAXII-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer nennt die Cyber Threat Alliance als Beispiel, die Meldungen standardisiert und mit Schweregrad versieht. Das Cram-Video ergänzt CISA-Listen, das Automated-Indicator-Sharing-Programm sowie STIX und TAXII.

### 4.3 > Threat feed > Dark web
`req:sy0701:v7:4.3:identification-methods:threat-feed:dark-web`

**possibleQuestion1**

- Question: What is a common risk associated when accessing information on the dark web?
- A. Guaranteed protection from all types of cyber attacks
- B. exposure to illegal content, cyber crime, and harmful software
- C. Complete anonymity for the organization accessing the dark web
- D. immediate access to fully encrypted safe information or is a common risk associated
- Correct answer: exposure to illegal content, cyber crime, and harmful software
- Distractors: Guaranteed protection from all types of cyber attacks | Complete anonymity for the organization accessing the dark web | immediate access to fully encrypted safe information or is a common risk associated
- Source topic: `Dark-Web-Risiko`
- Option source: transcript
- Mapping confidence: high
- Quality flags: scope-mismatch

Messer beschreibt das Dark Web als Overlay-Netz mit Spezialsoftware-Zugang für Hackerforen und Marktplätze. Das Cram-Video nennt konkret den Tor-Browser und .onion-Adressen mit Vorsichtshinweis.

### 4.3 > Penetration testing
`req:sy0701:v7:4.3:identification-methods:penetration-testing`

**possibleQuestion1**

- Question: What is the primary goal of penetration testing in cyber security?
- A. to identify vulnerabilities and weaknesses in a system by simulating attacks
- B. Bug bounty program
- C. System/process audit
- D. Reporting
- Correct answer: to identify vulnerabilities and weaknesses in a system by simulating attacks
- Distractors: Bug bounty program | System/process audit | Reporting
- Source topic: `Pentest-Ziel`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer beschreibt den Pentest als echten Exploit-Test mit vorab festgelegten Rules of Engagement. Das Cram-Video ergänzt Known/Partially known/Unknown Environment und Red/Blue/Purple/White Team.

### 4.3 > Bug bounty program
`req:sy0701:v7:4.3:identification-methods:responsible-disclosure-program:bug-bounty-program`

**possibleQuestion1**

- Question: What is a bug bounty program?
- A. a program where organizations reward reports of security vulnerabilities
- B. Penetration testing
- C. System/process audit
- D. Reporting
- Correct answer: a program where organizations reward reports of security vulnerabilities
- Distractors: Penetration testing | System/process audit | Reporting
- Source topic: `Bug Bounty`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer beschreibt Bug Bounties als Belohnung für Schwachstellenfunde, veröffentlicht erst nach dem Fix. Das Cram-Video nennt Prämienhöhen und bettet es in Responsible-Disclosure-Programme mit 60-90-Tage-Fristen ein.

### 4.3 > System/process audit
`req:sy0701:v7:4.3:identification-methods:system-process-audit`

**possibleQuestion1**

- Question: What is the goal of a system or process audit in cyber security?
- A. To increase system performance by disabling security measures
- B. To monitor employee productivity and access to nonsensitive systems
- C. to remove all outdated security logs from the system
- D. to evaluate security controls, find vulnerabilities and ensure compliance
- Correct answer: to evaluate security controls, find vulnerabilities and ensure compliance
- Distractors: To increase system performance by disabling security measures | To monitor employee productivity and access to nonsensitive systems | to remove all outdated security logs from the system
- Source topic: `System-/Prozess-Audit`
- Option source: transcript
- Mapping confidence: high

Messer (aus der Audits-Lektion) beschreibt das Cybersecurity-Audit als Untersuchung von Infrastruktur und Richtlinien, intern oder extern. Das Cram-Video benennt System-/Prozessaudits explizit als Identifikationsmethode mit Scans, Dokumentenprüfung und Interviews.

### 4.3 > Analysis > False positive
`req:sy0701:v7:4.3:analysis:confirmation:false-positive`

**possibleQuestion1**

- Question: What is a false positive in vulnerability scanning?
- A. not
- B. False negative
- C. Prioritize
- D. CVSS
- Correct answer: not
- Distractors: False negative | Prioritize | CVSS
- Source topic: `False Positive`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer definiert False Positive als gemeldete, aber nicht existierende Schwachstelle, reduziert durch aktuelle Signaturen. Das Cram-Video nennt auch unauthentifizierte Scans als Ursache und stellt True Positive gegenüber.

### 4.3 > Analysis > False negative
`req:sy0701:v7:4.3:analysis:confirmation:false-negative`

Messer bewertet False Negative (existierende, aber unentdeckte Schwachstelle) als schlimmer als False Positive. Das Cram-Video definiert den Begriff gleichlautend.

### 4.3 > Analysis > Prioritize
`req:sy0701:v7:4.3:analysis:prioritize`

**possibleQuestion1**

- Question: What is the primary goal of vulnerability response and remediation?
- A. to identify, prioritize and fix vulnerabilities to reduce risk exposure
- B. False positive
- C. False negative
- D. CVSS
- Correct answer: to identify, prioritize and fix vulnerabilities to reduce risk exposure
- Distractors: False positive | False negative | CVSS
- Source topic: `Priorisierung`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high
- Quality flags: distractor-issue

Messer priorisiert nach Schweregrad und verweist auf öffentliche Listen mit gesetzten Prioritäten. Das Cram-Video priorisiert nach Schwere und Ausnutzungswahrscheinlichkeit mit Kontext aus Zero Trust und Defense in Depth.

### 4.3 > Analysis > CVSS
`req:sy0701:v7:4.3:analysis:common-vulnerability-scoring-system-cvss`

**possibleQuestion1**

- Question: What is the common vulnerability scoring system provide?
- A. CVS a list of all known vulnerabilities with corresponding fixes
- B. a list of industry best practices for vulnerability management
- C. a tool for scanning systems for vulnerabilities in real time
- D. a standardized method for rating the severity of vulnerabilities
- Correct answer: a standardized method for rating the severity of vulnerabilities
- Distractors: CVS a list of all known vulnerabilities with corresponding fixes | a list of industry best practices for vulnerability management | a tool for scanning systems for vulnerabilities in real time
- Source topic: `CVSS`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does CVSS stand for?
- A. Common Vulnerability Scoring System
- B. cyber security vulnerability scoring standard
- C. common virus scanning system
- D. critical vulnerability severity scale
- Correct answer: Common Vulnerability Scoring System
- Distractors: cyber security vulnerability scoring standard | common virus scanning system | critical vulnerability severity scale
- Source topic: `Akronym CVSS`
- Option source: transcript
- Mapping confidence: high

Messer erklärt CVSS als Wert 0-10 aus der National Vulnerability Database, oft mit mehreren Versionen parallel. Das Cram-Video nennt die drei Hauptmetriken Exploitability, Impact und Scope.

### 4.3 > Analysis > CVE
`req:sy0701:v7:4.3:analysis:common-vulnerability-enumeration-cve`

**possibleQuestion1**

- Question: What is the common vulnerability enumeration or CVE?
- A. a database assigning unique IDs to known cyber security vulnerabilities
- B. A list of organizations offering vulnerability scanning services
- C. A method for tracking unpatched vulnerabilities across all systems
- D. tool for scanning systems for vulnerabilities in real time
- Correct answer: a database assigning unique IDs to known cyber security vulnerabilities
- Distractors: A list of organizations offering vulnerability scanning services | A method for tracking unpatched vulnerabilities across all systems | tool for scanning systems for vulnerabilities in real time
- Source topic: `CVE`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does CVE stand for?
- A. Common Vulnerabilities and Exposures
- B. False positive
- C. False negative
- D. Prioritize
- Correct answer: Common Vulnerabilities and Exposures
- Distractors: False positive | False negative | Prioritize
- Source topic: `Akronym CVE`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer nutzt die CVE-Datenbank als Nachschlagewerk, gegengeprüft mit NVD und Herstellerdatenbanken. Das Cram-Video beschreibt CVE als Liste öffentlich bekannter Schwachstellen, gepflegt von MITRE.

### 4.3 > Analysis > Vulnerability classification
`req:sy0701:v7:4.3:analysis:vulnerability-classification`

**possibleQuestion1**

- Question: What is vulnerability classification?
- A. A method for patching vulnerabilities in real time
- B. The process of ignoring vulnerabilities that do not have immediate solutions
- C. a way of sorting vulnerabilities by their appearance in reports
- D. categorizing vulnerabilities by type, severity, and impact
- Correct answer: categorizing vulnerabilities by type, severity, and impact
- Distractors: A method for patching vulnerabilities in real time | The process of ignoring vulnerabilities that do not have immediate solutions | a way of sorting vulnerabilities by their appearance in reports
- Source topic: `Klassifizierung`
- Option source: transcript
- Mapping confidence: high

Messer zeigt Klassifizierung praktisch nach Schweregrad und betroffener Objektklasse (Apps, Webanwendungen, Netzwerkgeräte). Das Cram-Video benennt es explizit als Einordnung nach Schwere und Auswirkung zur Priorisierung.

### 4.3 > Analysis > Exposure factor
`req:sy0701:v7:4.3:analysis:exposure-factor`

**possibleQuestion1**

- Question: What is the exposure factor measure in risk management?
- A. the number of potential threats to an asset
- B. the likelihood of a vulnerability being exploited
- C. percentage of asset loss from a specific threat
- D. the severity of an attack on a system network
- Correct answer: percentage of asset loss from a specific threat
- Distractors: the number of potential threats to an asset | the likelihood of a vulnerability being exploited | the severity of an attack on a system network
- Source topic: `Exposure Factor`
- Option source: transcript
- Mapping confidence: high

Messer quantifiziert den Exposure Factor als Prozentwert der Auswirkung einer Schwachstelle. Das Cram-Video definiert ihn als Prozentsatz des Wertverlusts eines Assets bei Risikoeintritt.

### 4.3 > Analysis > Environmental variables
`req:sy0701:v7:4.3:analysis:environmental-variables`

Messer bezieht dies auf die Systemumgebung: öffentlich erreichbar vs. isoliertes Labor bestimmt Priorität. Das Cram-Video listet konkrete Variablen: Asset-Kritikalität, Netztopologie, Datensensitivität, externe Abhängigkeiten.

### 4.3 > Analysis > Industry/organizational impact
`req:sy0701:v7:4.3:analysis:industry-organizational-impact`

**possibleQuestion1**

- Question: What does industry or organizational impact refer to in risk management?
- A. the potential consequences
- B. False positive
- C. False negative
- D. Prioritize
- Correct answer: the potential consequences
- Distractors: False positive | False negative | Prioritize
- Source topic: `Branchen-/Org-Impact`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer zeigt anhand realer Vorfälle (Klinikkette, Energieversorger), dass derselbe Exploit branchenabhängig unterschiedlich wirkt. Im Cram-Video-Abschnitt taucht dieser Punkt nicht als eigener Begriff auf, nur sinngemäß in Umgebungsvariablen.

### 4.3 > Analysis > Risk tolerance
`req:sy0701:v7:4.3:analysis:risk-tolerance`

**possibleQuestion1**

- Question: What is meant by risk tolerance in cyber security?
- A. willing to accept to meet goals
- B. The time it takes for an organization to recover from a cyber attack
- C. The cost of mitigating vulnerabilities across the entire organization
- D. the likelihood that a vulnerability will be detected
- Correct answer: willing to accept to meet goals
- Distractors: The time it takes for an organization to recover from a cyber attack | The cost of mitigating vulnerabilities across the entire organization | the likelihood that a vulnerability will be detected
- Source topic: `Risikotoleranz`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt Risikotoleranz als akzeptiertes Restrisiko während der Patch-Testphase, abhängig von Verbreitung und Ausnutzbarkeit. Das Cram-Video setzt es mit Risk Appetite gleich und leitet die vier Risikoantworten ab.

### 4.3 > Vuln response > Patching
`req:sy0701:v7:4.3:vulnerability-response-and-remediation:patching`

**possibleQuestion1**

- Question: What is the purpose of patching in vulnerability management?
- A. to apply updates and fixes to address known software or hardware vulnerabilities
- B. Insurance
- C. Segmentation
- D. Compensating controls
- Correct answer: to apply updates and fixes to address known software or hardware vulnerabilities
- Distractors: Insurance | Segmentation | Compensating controls
- Source topic: `Patching`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer beschreibt Patchen in festen Zyklen, mit außerplanmäßigen Releases bei Zero-Days. Das Cram-Video unterscheidet Software-Patches von Firmware-Patches und Treiber-Updates.

### 4.3 > Vuln response > Insurance
`req:sy0701:v7:4.3:vulnerability-response-and-remediation:insurance`

**possibleQuestion1**

- Question: How does insurance relate to vulnerability management?
- A. It eliminates the need for other security measures such as patching and network segmentation
- B. it helps reduce financial loss from attacks but doesn't replace risk management
- C. It ensures that all security systems are automatically updated and patched
- D. is used to secure only physical assets not digital systems
- Correct answer: it helps reduce financial loss from attacks but doesn't replace risk management
- Distractors: It eliminates the need for other security measures such as patching and network segmentation | It ensures that all security systems are automatically updated and patched | is used to secure only physical assets not digital systems
- Source topic: `Cyber-Versicherung`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt Cyberversicherung als Risikoverlagerung, die Umsatzverluste und Klagekosten abdeckt, aber nicht alles. Das Cram-Video ordnet Insurance ausdrücklich als Risikotransfer ein.

### 4.3 > Vuln response > Segmentation
`req:sy0701:v7:4.3:vulnerability-response-and-remediation:segmentation`

**possibleQuestion1**

- Question: What is the purpose of network segmentation in cyber security?
- A. to divide a network into smaller segments to reduce the impact of a potential breach
- B. Patching
- C. Insurance
- D. Compensating controls
- Correct answer: to divide a network into smaller segments to reduce the impact of a potential breach
- Distractors: Patching | Insurance | Compensating controls
- Source topic: `Segmentierung`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer erklärt Segmentierung als Begrenzung des Wirkungsradius, bis hin zum Air-Gap bei fehlendem Patch. Das Cram-Video beschreibt es knapp als Verschieben auf ein isoliertes Segment zur Reduktion der Exponierung.

### 4.3 > Vuln response > Compensating controls
`req:sy0701:v7:4.3:vulnerability-response-and-remediation:compensating-controls`

**possibleQuestion1**

- Question: What are compensating controls in security?
- A. alternative security measures implemented when the primary control cannot be applied
- B. Patching
- C. Insurance
- D. Segmentation
- Correct answer: alternative security measures implemented when the primary control cannot be applied
- Distractors: Patching | Insurance | Segmentation
- Source topic: `Compensating Controls`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer nennt Dienst abschalten, Firewall-Regeln oder ACLs als Ersatz, wenn Patchen nicht möglich ist. Das Cram-Video bringt als Beispiel eine WAF mit OWASP Core Rule Set gegen fehlende Eingabevalidierung.

### 4.3 > Vuln response > Exceptions/exemptions
`req:sy0701:v7:4.3:vulnerability-response-and-remediation:exceptions-and-exemptions`

Messer beschreibt Ausnahmen als Entscheidung eines Komitees, wenn ein Patch-Konflikt vorliegt und die Ausnutzung unwahrscheinlich ist. Das Cram-Video bezeichnet dies als faktische Risikoakzeptanz, die sorgfältig abzuwägen ist.

### 4.3 > Validation > Rescanning
`req:sy0701:v7:4.3:validation-of-remediation:rescanning`

**possibleQuestion1**

- Question: What does rescanning involve in vulnerability management?
- A. resolved
- B. Audit
- C. Verification
- D. Vulnerability scan
- Correct answer: resolved
- Distractors: Audit | Verification | Vulnerability scan
- Source topic: `Rescanning`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer empfiehlt einen erneuten Scan nach dem Patch zur Bestätigung der Behebung. Das Cram-Video bezeichnet Rescanning als häufigste, aber am wenigsten gründliche Validierungsmethode.

### 4.3 > Validation > Audit
`req:sy0701:v7:4.3:validation-of-remediation:audit`

**possibleQuestion1**

- Question: Why is an audit important in vulnerability management?
- A. to make sure that all network devices are disconnected during security checks
- B. to verify the effectiveness of security controls, compliance and remediation actions
- C. to ensure that no security measures are applied and operations run more efficiently
- D. to prevent users from accessing the system until audit processes are complete
- Correct answer: to verify the effectiveness of security controls, compliance and remediation actions
- Distractors: to make sure that all network devices are disconnected during security checks | to ensure that no security measures are applied and operations run more efficiently | to prevent users from accessing the system until audit processes are complete
- Source topic: `Audit`
- Option source: transcript
- Mapping confidence: high

Der Bezug zur Remediation-Validierung findet sich bei Messer nur in der Vulnerability-Remediation-Lektion (stichprobenartiges Auditieren nach Rollout), nicht in der separaten Audits-Lektion. Das Cram-Video benennt Audit explizit als vertiefte Prüfung des Prozesses, die auch das „Wie" hinterfragt.

### 4.3 > Validation > Verification
`req:sy0701:v7:4.3:validation-of-remediation:verification`

**possibleQuestion1**

- Question: What is the purpose of verification in vulnerability management?
- A. remediated and security measures work
- B. To check whether the vulnerability scanning tools are working correctly
- C. to verify the financial cost of remediation efforts
- D. to make sure all users are informed about security updates
- Correct answer: remediated and security measures work
- Distractors: To check whether the vulnerability scanning tools are working correctly | to verify the financial cost of remediation efforts | to make sure all users are informed about security updates
- Source topic: `Verification`
- Option source: transcript
- Mapping confidence: high

Messer versteht Verification als automatisierte oder manuelle Bestätigung des erfolgreichen Patch-Abschlusses. Das Cram-Video definiert es enger als aktives Nachtesten, ob die Schwachstelle noch ausnutzbar ist.

### 4.3 > Reporting
`req:sy0701:v7:4.3:reporting`

**possibleQuestion1**

- Question: Where is the primary purpose of reporting in vulnerability management?
- A. To track the number of system outages caused by vulnerabilities
- B. to ensure that all users are informed about their personal vulnerabilities
- C. to prevent external vendors from accessing sensitive data
- D. to communicate vulnerability status, remediation and impact to stakeholders
- Correct answer: to communicate vulnerability status, remediation and impact to stakeholders
- Distractors: To track the number of system outages caused by vulnerabilities | to ensure that all users are informed about their personal vulnerabilities | to prevent external vendors from accessing sensitive data
- Source topic: `Reporting (Vuln Mgmt)`
- Option source: transcript
- Mapping confidence: high

Messer nennt ein Reporting-System ab hunderten Systemen als nötig, mit Zahlen zu gepatchten/ungepatchten Systemen und Exceptions. Das Cram-Video sieht Reporting als Abschlussphase mit Findings, Maßnahmen und Lessons Learned an Stakeholder.

## Objective 4.4

### 4.4 > Monitoring resources > Systems
`req:sy0701:v7:4.4:monitoring-computing-resources:systems`

**possibleQuestion1**

- Question: What is the purpose of privileged access management or PAM tools?
- A. To provide encryption services for privileged user passwords
- B. to control and monitor access to critical systems and data by privileged users
- C. to automatically assign permissions based on the users's department
- D. to create backup accounts for system administrators in case of password loss
- Correct answer: to control and monitor access to critical systems and data by privileged users
- Distractors: To provide encryption services for privileged user passwords | to automatically assign permissions based on the users's department | to create backup accounts for system administrators in case of password loss
- Source topic: `Systeme überwachen`
- Option source: transcript
- Mapping confidence: high

Messer nennt Authentifizierungen/Logins mit Herkunftsort, laufende Dienste und installierte Softwareversionen als Überwachungspunkte. Das Cram-Video ergänzt klassische Gerätemetriken (CPU, Speicher, Netzwerk) gegen eine Baseline.

### 4.4 > Monitoring resources > Applications
`req:sy0701:v7:4.4:monitoring-computing-resources:applications`

**possibleQuestion1**

- Question: What is the goal of monitoring applications in a network?
- A. to ensure that all applications are running in offline mode for better security
- B. to detect vulnerabilities, errors and performance issues within the application
- C. to prevent users from accessing any installed applications
- D. to configure all applications to automatically disable logging
- Correct answer: to detect vulnerabilities, errors and performance issues within the application
- Distractors: to ensure that all applications are running in offline mode for better security | to prevent users from accessing any installed applications | to configure all applications to automatically disable logging
- Source topic: `Anwendungen überwachen`
- Option source: transcript
- Mapping confidence: high

Messer betont Verfügbarkeitsprüfung und übertragene Datenmenge als Hinweis auf Exfiltration. Das Cram-Video nennt Antwortzeiten, Ressourcenverbrauch und Fehlerlogs als typische Metriken.

### 4.4 > Monitoring resources > Infrastructure
`req:sy0701:v7:4.4:monitoring-computing-resources:infrastructure`

**possibleQuestion1**

- Question: Why is monitoring infrastructure important in cyber security?
- A. functioning securely
- B. Systems
- C. Applications
- D. Log aggregation
- Correct answer: functioning securely
- Distractors: Systems | Applications | Log aggregation
- Source topic: `Infrastruktur überwachen`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer nennt Remote-Access-Systeme und Firewalls/IPS als ergiebige Quellen, ein Angriffs-Peak als Vorwarnung. Das Cram-Video misst Infrastruktur-Gesundheit an Traffic, Bandbreite, Latenz und Paketverlust.

### 4.4 > Activities > Log aggregation
`req:sy0701:v7:4.4:activities:log-aggregation`

**possibleQuestion1**

- Question: What is log aggregation in the context of monitoring activities?
- A. The automatic deletion of outdated logs to improve storage capacity
- B. The process of monitoring user activity across all systems
- C. the process of collecting system logs into a central repository for analysis
- D. the isolation of logs from critical systems to prevent unauthorized access
- Correct answer: the process of collecting system logs into a central repository for analysis
- Distractors: The automatic deletion of outdated logs to improve storage capacity | The process of monitoring user activity across all systems | the isolation of logs from critical systems to prevent unauthorized access
- Source topic: `Log-Aggregation`
- Option source: transcript
- Mapping confidence: high

Beide Quellen begründen Aggregation mit unterschiedlichen Log-Formaten verschiedener Systeme, zusammengeführt in einem SIEM. Das Cram-Video ergänzt die Normalisierung auf ein gemeinsames Event-Schema.

### 4.4 > Activities > Alerting
`req:sy0701:v7:4.4:activities:alerting`

**possibleQuestion1**

- Question: What is the purpose of alerting in security monitoring?
- A. to notify admins of potential security events needing attention
- B. To silence all notifications to avoid unnecessary disturbances
- C. to automatically apply security patches without user consent
- D. to display irrelevant information to confuse attackers
- Correct answer: to notify admins of potential security events needing attention
- Distractors: To silence all notifications to avoid unnecessary disturbances | to automatically apply security patches without user consent | to display irrelevant information to confuse attackers
- Source topic: `Alerting`
- Option source: transcript
- Mapping confidence: high

Messer will sofortige Benachrichtigung bei Auffälligkeiten wie Authentifizierungsfehlern oder Datenabfluss. Das Cram-Video erklärt Alerts aus vordefinierten Regeln oder Anomalieerkennung (UEBA), Beispiel impossible travel.

### 4.4 > Activities > Scanning
`req:sy0701:v7:4.4:activities:scanning`

**possibleQuestion1**

- Question: Why is scanning important in vulnerability management?
- A. to identify system and application vulnerabilities needing remediation
- B. Log aggregation
- C. Alerting
- D. Reporting
- Correct answer: to identify system and application vulnerabilities needing remediation
- Distractors: Log aggregation | Alerting | Reporting
- Source topic: `Scanning`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer beschreibt permanentes Scannen aller Geräte nach OS-Version, Treibern und Anomalien. Das Cram-Video definiert Scanning als proaktive Suche nach Schwachstellen, Malware und Fehlkonfigurationen.

### 4.4 > Activities > Reporting
`req:sy0701:v7:4.4:activities:reporting`

**possibleQuestion1**

- Question: What is the main purpose of reporting in security monitoring?
- A. to provide detailed analysis of incidents, vulnerabilities and performance to stakeholders
- B. Log aggregation
- C. Alerting
- D. Scanning
- Correct answer: to provide detailed analysis of incidents, vulnerabilities and performance to stakeholders
- Distractors: Log aggregation | Alerting | Scanning
- Source topic: `Reporting (Monitoring)`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer stellt „actionable reports" in den Mittelpunkt: welche Geräte nicht konform sind und was zu tun ist. Das Cram-Video betont Adressatengerechtigkeit — Details für Sicherheitsteams, Zusammenfassungen fürs Management.

### 4.4 > Activities > Archiving
`req:sy0701:v7:4.4:activities:archiving`

**possibleQuestion1**

- Question: Why is archiving logs important in security operations?
- A. to store historical data for compliance audits and future analysis
- B. To remove all logs older than one week to save space
- C. To prevent access to logs for non-administrative users
- D. to ensure logs are deleted automatically after a specific time period
- Correct answer: to store historical data for compliance audits and future analysis
- Distractors: To remove all logs older than one week to save space | To prevent access to logs for non-administrative users | to ensure logs are deleted automatically after a specific time period
- Source topic: `Archivierung`
- Option source: transcript
- Mapping confidence: high

Messer begründet lange Aufbewahrung mit der durchschnittlichen Erkennungszeit von rund neun Monaten laut IBM-Report. Das Cram-Video ergänzt lückenlosen Audit-Trail und Forensik als Zweck der Archivierung.

### 4.4 > Activities > Quarantine
`req:sy0701:v7:4.4:activities:alert-response-and-remediation-validation:quarantine`

**possibleQuestion1**

- Question: What is the primary purpose of quarantine in alert response and remediation?
- A. to isolate potentially malicious files or devices to prevent further damage
- B. Log aggregation
- C. Alerting
- D. Scanning
- Correct answer: to isolate potentially malicious files or devices to prevent further damage
- Distractors: Log aggregation | Alerting | Scanning
- Source topic: `Quarantäne`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer nennt Quarantäne als häufigste Reaktion: Isolation vom Netz gegen weitere Ausbreitung. Das Cram-Video zeigt die Bandbreite von Datei-Quarantäne bis komplettem System via EDR/XDR.

### 4.4 > Activities > Alert tuning
`req:sy0701:v7:4.4:activities:alert-response-and-remediation-validation:alert-tuning`

**possibleQuestion1**

- Question: What is alert tuning in the context of security operations?
- A. the use of alert thresholds to reduce false positives and highlight relevant alerts
- B. The act of rerouting all security alerts to network centers to minimize minor threats and forward major threats to audit logs
- C. The automatic categorization of all alerts as high priority threats
- D. the use of encryption to secure all alerts before transmission
- Correct answer: the use of alert thresholds to reduce false positives and highlight relevant alerts
- Distractors: The act of rerouting all security alerts to network centers to minimize minor threats and forward major threats to audit logs | The automatic categorization of all alerts as high priority threats | the use of encryption to secure all alerts before transmission
- Source topic: `Alert Tuning`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt Alert-Tuning als Balance zwischen False Positives und False Negatives, die Zeit braucht. Das Cram-Video nennt intensives Nachjustieren in den ersten ein bis zwei Monaten nach Rollout.

### 4.4 > Tools > SCAP
`req:sy0701:v7:4.4:tools:security-content-automation-protocol-scap`

**possibleQuestion1**

- Question: What is the purpose of the security content automation protocol or SCAP?
- A. to standardize security in info format and automate compliance management
- B. Benchmarks
- C. Agents/agentless
- D. SIEM
- Correct answer: to standardize security in info format and automate compliance management
- Distractors: Benchmarks | Agents/agentless | SIEM
- Source topic: `SCAP`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion2**

- Question: What does SCAP stand for?
- A. Security Content Automation Protocol
- B. system control automation program
- C. secure content analysis process
- D. security configuration assessment protocol
- Correct answer: Security Content Automation Protocol
- Distractors: system control automation program | secure content analysis process | security configuration assessment protocol
- Source topic: `SCAP-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer begründet SCAP mit uneinheitlicher Schwachstellenbenennung verschiedener Geräte, gepflegt vom NIST. Das Cram-Video beschreibt SCAP als offene Standards für Automatisierung, Standardisierung und Compliance.

### 4.4 > Tools > Benchmarks
`req:sy0701:v7:4.4:tools:benchmarks`

**possibleQuestion1**

- Question: How do security benchmarks help improve an organization security posture?
- A. they offer best practices for securing systems and networks
- B. SCAP
- C. Agents/agentless
- D. SIEM
- Correct answer: they offer best practices for securing systems and networks
- Distractors: SCAP | Agents/agentless | SIEM
- Source topic: `Benchmarks`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer erklärt Benchmarks als Best-Practice-Sammlungen, z.B. vom Center for Internet Security. Das Cram-Video schärft die Begriffskette: Control (neutral) → Benchmark (Technologie) → Baseline (System).

### 4.4 > Tools > Agents/agentless
`req:sy0701:v7:4.4:tools:agents-agentless`

**possibleQuestion1**

- Question: What is the difference between agent-based and agentless security monitoring?
- A. Agentless monitoring is more secure than agent-based monitoring Agent-based monitoring is always less effective than agentless monitoring
- B. Agent-based monitoring is only used for external networks while agentless is used internally
- C. agent-based need software on the systems
- D. Agent list does not
- Correct answer: agent-based need software on the systems
- Distractors: Agentless monitoring is more secure than agent-based monitoring Agent-based monitoring is always less effective than agentless monitoring | Agent-based monitoring is only used for external networks while agentless is used internally | Agent list does not
- Source topic: `Agent vs. agentless`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt Agent (dauerhaft installiert, Updates nötig) vs. agentenlose Prüfung (kein Wartungsaufwand, kein 24/7-Schutz). Das Cram-Video betrachtet dasselbe Paar im Log-Kontext: Agenten kontrollierbarer, aber ressourcenhungriger.

### 4.4 > Tools > SIEM
`req:sy0701:v7:4.4:tools:security-information-and-event-management-siem`

**possibleQuestion1**

- Question: What is the main function of a security information and event management or SIEM system?
- A. To encrypt all network traffic to ensure secure communications
- B. to limit access to sensitive data by restricting user login attempts
- C. to collect and analyze event data to detect and respond to threats
- D. to block all incoming network traffic from untrusted sources
- Correct answer: to collect and analyze event data to detect and respond to threats
- Distractors: To encrypt all network traffic to ensure secure communications | to limit access to sensitive data by restricting user login attempts | to block all incoming network traffic from untrusted sources
- Source topic: `SIEM-Rolle`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does SIEM stand for?
- A. Security Information and Event Management
- B. SCAP
- C. Benchmarks
- D. Agents/agentless
- Correct answer: Security Information and Event Management
- Distractors: SCAP | Benchmarks | Agents/agentless
- Source topic: `SIEM-Akronym`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer beschreibt das SIEM als zentrale Log-Datenbank mit Korrelation über Datentypen und Langzeit-Forensik. Das Cram-Video ergänzt Normalisierung, SOAR-Kopplung, UEBA und NTP-Zeitsynchronisation.

### 4.4 > Tools > Antivirus
`req:sy0701:v7:4.4:tools:antivirus`

**possibleQuestion1**

- Question: Where's the primary role of antivirus software in cyber security?
- A. to detect, block and remove malware like viruses, worms and Trojans
- B. SCAP
- C. Benchmarks
- D. Agents/agentless
- Correct answer: to detect, block and remove malware like viruses, worms and Trojans
- Distractors: SCAP | Benchmarks | Agents/agentless
- Source topic: `Antivirus`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion2**

- Question: What does AV stand for?
- A. Antivirus
- B. audio verification
- C. automated validation access viewer
- D. In endpoint security,
- Correct answer: Antivirus
- Distractors: audio verification | automated validation access viewer | In endpoint security,
- Source topic: `Akronym AV`
- Option source: transcript
- Mapping confidence: high

Messer streift Antivirus nur kurz als Erkennung bekannter Schadsoftware, vertieft erst in 4.5. Das Cram-Video ist ausführlicher: Echtzeitschutz, mehrschichtige Erkennung, Sandboxing und cloudbasierte Threat Intelligence.

### 4.4 > Tools > DLP
`req:sy0701:v7:4.4:tools:data-loss-prevention-dlp`

**possibleQuestion1**

- Question: How does data loss prevention or DLP help protect sensitive data?
- A. by restricting sensitive data movement inside and outside the network
- B. by providing automatic backups of all system files
- C. by encrypting all data in transit between devices
- D. by blocking access to non-essential systems during business hours
- Correct answer: by restricting sensitive data movement inside and outside the network
- Distractors: by providing automatic backups of all system files | by encrypting all data in transit between devices | by blocking access to non-essential systems during business hours
- Source topic: `DLP (Tool)`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does DLP stand for?
- A. Data Loss Prevention
- B. SCAP
- C. Benchmarks
- D. Agents/agentless
- Correct answer: Data Loss Prevention
- Distractors: SCAP | Benchmarks | Agents/agentless
- Source topic: `Akronym DLP`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer erklärt DLP als Echtzeit-Erkennung/Blockierung sensibler Daten via Appliance, Endpoint oder Cloud. Das Cram-Video beschreibt DLP als System mit detektiven/präventiven/korrektiven Fähigkeiten und mitwanderndem Dokumentenschutz.

### 4.4 > Tools > SNMP traps
`req:sy0701:v7:4.4:tools:simple-network-management-protocol-snmp-traps`

**possibleQuestion1**

- Question: What is the purpose of simple network management protocol or SNMP traps?
- A. to send alerts to management systems about network device events or issues
- B. SCAP
- C. Benchmarks
- D. Agents/agentless
- Correct answer: to send alerts to management systems about network device events or issues
- Distractors: SCAP | Benchmarks | Agents/agentless
- Source topic: `SNMP Traps`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion2**

- Question: What does SNMP stand for?
- A. Simple Network Management Protocol
- B. Secure Network Monitoring Protocol
- C. Simple Node Management Protocol
- D. System Network Management Protocol
- Correct answer: Simple Network Management Protocol
- Distractors: Secure Network Monitoring Protocol | Simple Node Management Protocol | System Network Management Protocol
- Source topic: `SNMP-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer erklärt SNMP-Polling (UDP 161) und den proaktiven Trap (UDP 162) bei Auslösebedingung. Das Cram-Video betont, dass SNMPv1/v2 Passwörter im Klartext senden, v3 verschlüsselt.

### 4.4 > Tools > NetFlow
`req:sy0701:v7:4.4:tools:netflow`

**possibleQuestion1**

- Question: What is net flow used for in network security?
- A. to monitor and analyze traffic to detect unusual patterns or threats
- B. threats to encrypt network traffic to prevent unauthorized interception
- C. To manage and prioritize network bandwidth for better performance
- D. to block all traffic that originates from unknown IP addresses
- Correct answer: to monitor and analyze traffic to detect unusual patterns or threats
- Distractors: threats to encrypt network traffic to prevent unauthorized interception | To manage and prioritize network bandwidth for better performance | to block all traffic that originates from unknown IP addresses
- Source topic: `NetFlow`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt NetFlow-Probes, die Metriken an einen Collector senden für Top-10-Konversationen und -Endpunkte. Das Cram-Video grenzt NetFlow von Wireshark ab: nur Zähler/Statistiken, keine Paketinhalte.

### 4.4 > Tools > Vulnerability scanners
`req:sy0701:v7:4.4:tools:vulnerability-scanners`

**possibleQuestion1**

- Question: What is the main purpose of vulnerability scanners in cyber security?
- A. to identify and assess vulnerabilities so that they can be remediated
- B. SCAP
- C. Benchmarks
- D. Agents/agentless
- Correct answer: to identify and assess vulnerabilities so that they can be remediated
- Distractors: SCAP | Benchmarks | Agents/agentless
- Source topic: `Vulnerability Scanner`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer betont minimalinvasives Arbeiten ohne Exploit-Ausführung, mit Portscan und Ergebnisverifikation. Das Cram-Video betont monatliche Scans als Normalbild-Etablierung und Regressionserkennung.

## Objective 4.5

### 4.5 > Firewall > Rules
`req:sy0701:v7:4.5:firewall:rules`

**possibleQuestion1**

- Question: What is the purpose of firewall rules in network security?
- A. to eliminate all external traffic to prevent network access
- B. to automatically assign IP addresses to connected devices
- C. to define allowed network traffic based on specific conditions
- D. to encrypt all traffic passing through the firewall
- Correct answer: to define allowed network traffic based on specific conditions
- Distractors: to eliminate all external traffic to prevent network access | to automatically assign IP addresses to connected devices | to encrypt all traffic passing through the firewall
- Source topic: `Firewall-Regeln`
- Option source: transcript
- Mapping confidence: high

Messer zeigt, dass Regeln von oben nach unten abgearbeitet werden bis zum Implicit Deny am Ende. Das Cram-Video ergänzt den Begriff „rule-based access control" mit Mindestinhalt Quelle/Ziel/Port/Aktion.

### 4.5 > Firewall > Access lists
`req:sy0701:v7:4.5:firewall:access-lists`

**possibleQuestion1**

- Question: What is the role of access control lists or ACL's in firewall configuration?
- A. to define rules to allow or deny traffic by IPs, subnets and protocols
- B. subnets and protocols to automatically update firewall rules every time a security breach occurs
- C. to detect unauthorized access attempts and block them
- D. to encrypt all incoming and outgoing data packets
- Correct answer: to define rules to allow or deny traffic by IPs, subnets and protocols
- Distractors: subnets and protocols to automatically update firewall rules every time a security breach occurs | to detect unauthorized access attempts and block them | to encrypt all incoming and outgoing data packets
- Source topic: `ACLs`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt die ACL als anderen Namen für die Firewall-Regelbasis mit Kriterien wie IP, Port, Tageszeit. Das Cram-Video unterscheidet Standard- von Extended-ACLs.

### 4.5 > Firewall > Ports/protocols
`req:sy0701:v7:4.5:firewall:ports-protocols`

**possibleQuestion1**

- Question: How are ports and protocols used in firewall configuration?
- A. To determine the encryption standards applied to network communications
- B. to control traffic based on port numbers and communication protocols
- C. to restrict physical access to network hardware
- D. to allow all network traffic by default without any filtering
- Correct answer: to control traffic based on port numbers and communication protocols
- Distractors: To determine the encryption standards applied to network communications | to restrict physical access to network hardware | to allow all network traffic by default without any filtering
- Source topic: `Ports/Protokolle`
- Option source: transcript
- Mapping confidence: high

Messer erklärt, dass klassische Firewalls nach Portnummern entscheiden, NGFW nach der Anwendung selbst. Das Cram-Video stellt TCP, UDP und ICMP gegenüber und rät, ICMP Echo zu deaktivieren.

### 4.5 > Firewall > Screened subnets
`req:sy0701:v7:4.5:firewall:screened-subnets`

**possibleQuestion1**

- Question: What is the purpose of a screen subnet in network security?
- A. to isolate internal networks from the internet using an intermediate firewall
- B. Rules
- C. Access lists
- D. Ports/protocols
- Correct answer: to isolate internal networks from the internet using an intermediate firewall
- Distractors: Rules | Access lists | Ports/protocols
- Source topic: `Screened Subnet`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer beschreibt das Screened Subnet als eigenes Segment für aus dem Internet erreichbare Dienste, getrennt vom internen Netz. Das Cram-Video nennt DMZ als Synonym und grenzt ab, was hinein gehört und was nicht.

### 4.5 > IDS/IPS > Trends
`req:sy0701:v7:4.5:ids-ips:trends`

**possibleQuestion1**

- Question: What is a trend in intrusion detection systems or IDS and intrusion prevention systems or IPS?
- A. The shift away from automated responses to manual review of all security incidents
- B. the increasing use of machine learning and AI to detect and respond to network threats
- C. the move to allow all types of network traffic without inspection
- D. the removal of signaturebased detection methods in favor of heristic analysis
- Correct answer: the increasing use of machine learning and AI to detect and respond to network threats
- Distractors: The shift away from automated responses to manual review of all security incidents | the move to allow all types of network traffic without inspection | the removal of signaturebased detection methods in favor of heristic analysis
- Source topic: `IDS/IPS "Trends"`
- Option source: transcript
- Mapping confidence: high
- Quality flags: scope-mismatch

Das verlinkte Messer-Video (063) verwendet den Begriff „Trends" nicht direkt, behandelt aber verwandte IPS/IDS-Konzepte. Das Cram-Video erklärt Trends direkt als Muster/Anomalien über Zeit gegen eine Baseline, synonym mit verhaltensbasierter Erkennung.

### 4.5 > IDS/IPS > Signatures
`req:sy0701:v7:4.5:ids-ips:signatures`

**possibleQuestion1**

- Question: What is the role of signatures in IDS and IPS systems?
- A. to match known attack patterns to detect malicious traffic
- B. Trends
- C. Rules
- D. Access lists
- Correct answer: to match known attack patterns to detect malicious traffic
- Distractors: Trends | Rules | Access lists
- Source topic: `Signaturen`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Die Signaturthematik behandelt Messer eher in der Firewall-Lektion (Video 089): tausende geladene Signaturen mit Feinjustierung gegen False Positives. Das Cram-Video definiert signaturbasierte Erkennung als vordefinierte Muster bekannter Angriffe.

### 4.5 > Web filter > Agent-based
`req:sy0701:v7:4.5:web-filter:agent-based`

**possibleQuestion1**

- Question: What is the primary function of agent-based web filtering?
- A. to install agents on devices to monitor and restrict web traffic locally
- B. Centralized proxy
- C. URL scanning
- D. Content categorization
- Correct answer: to install agents on devices to monitor and restrict web traffic locally
- Distractors: Centralized proxy | URL scanning | Content categorization
- Source topic: `Agent-based Web Filter`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer erklärt agentenbasierte Filter als lokale Entscheidung auf dem Endgerät, zentral verwaltet. Das Cram-Video hebt den Nutzen für Work-from-anywhere hervor, warnt aber vor leichterer Abschaltbarkeit.

### 4.5 > Web filter > Centralized proxy
`req:sy0701:v7:4.5:web-filter:centralized-proxy`

**possibleQuestion1**

- Question: What is the role of a centralized proxy in web filtering?
- A. to act as an intermediary to enforce security policies between users and web services
- B. Agent-based
- C. URL scanning
- D. Content categorization
- Correct answer: to act as an intermediary to enforce security policies between users and web services
- Distractors: Agent-based | URL scanning | Content categorization
- Source topic: `Zentraler Proxy`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion2**

- Question: What does SWG stand for?
- A. Secure Web Gateway
- B. Agent-based
- C. URL scanning
- D. Content categorization
- Correct answer: Secure Web Gateway
- Distractors: Agent-based | URL scanning | Content categorization
- Source topic: `SWG-Akronym`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer beschreibt den Proxy als Mittler mit Caching- und Zugangskontrollfunktion. Das Cram-Video betont zentrale Verwaltbarkeit gegen Performance-Overhead.

### 4.5 > Web filter > URL scanning
`req:sy0701:v7:4.5:web-filter:universal-resource-locator-url-scanning`

**possibleQuestion1**

- Question: What is the purpose of URL scanning in web filtering?
- A. to monitor and record all visited websites for future reference
- B. to encrypt URLs to prevent exposure of web browsing activity
- C. to examine URLs for malicious content, phishing or inappropriate material before access
- D. to block URLs that are part of an organization's internet
- Correct answer: to examine URLs for malicious content, phishing or inappropriate material before access
- Distractors: to monitor and record all visited websites for future reference | to encrypt URLs to prevent exposure of web browsing activity | to block URLs that are part of an organization's internet
- Source topic: `URL Scanning`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does URL stand for?
- A. Unilateral resource locator
- B. Unilateral resource link
- C. uniform reference locator
- D. Uniform Resource Locator
- Correct answer: Uniform Resource Locator
- Distractors: Unilateral resource locator | Unilateral resource link | uniform reference locator
- Source topic: `URL-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer erklärt Filterung nach URL/URI mit Allow-/Blocklisten und Gruppierung ähnlicher URLs. Das Cram-Video beschreibt URL Scanning als Abgleich gegen Blacklists bösartiger Websites.

### 4.5 > Web filter > Content categorization
`req:sy0701:v7:4.5:web-filter:content-categorization`

**possibleQuestion1**

- Question: How does content categorization enhance web filtering?
- A. by classifying web content into categories to apply specific access rules
- B. By analyzing the size of content to determine if it should be accessed
- C. blocked By applying a universal rule that blocks all external content regardless of category
- D. by limiting web access to internal company resources only
- Correct answer: by classifying web content into categories to apply specific access rules
- Distractors: By analyzing the size of content to determine if it should be accessed | blocked By applying a universal rule that blocks all external content regardless of category | by limiting web access to internal company resources only
- Source topic: `Content-Kategorisierung`
- Option source: transcript
- Mapping confidence: high

Messer nennt über 50 Website-Kategorien für granulare Steuerung. Das Cram-Video nennt Beispielkategorien und weist auf erweiterbare Admin-Konfiguration hin.

### 4.5 > Web filter > Block rules
`req:sy0701:v7:4.5:web-filter:block-rules`

**possibleQuestion1**

- Question: What are block rules in web filtering?
- A. Rules that enable unrestricted access to all websites and web content
- B. Rules that can automatically update filtering policies without user intervention
- C. Rules that only monitor and log web traffic without taking any action
- D. rules that prevent access to specific sites, content, or categories per security policies
- Correct answer: rules that prevent access to specific sites, content, or categories per security policies
- Distractors: Rules that enable unrestricted access to all websites and web content | Rules that can automatically update filtering policies without user intervention | Rules that only monitor and log web traffic without taking any action
- Source topic: `Block Rules`
- Option source: transcript
- Mapping confidence: high

Messer zeigt Block-Regeln auf Domain- oder Kategorieebene mit drei Aktionsstufen. Das Cram-Video ergänzt, dass Administratoren eigene Regeln definieren.

### 4.5 > Web filter > Reputation
`req:sy0701:v7:4.5:web-filter:reputation`

**possibleQuestion1**

- Question: How does reputation-based web filtering work?
- A. It scans websites for content that meets a predefined reputation score
- B. It blocks websites only from specific geographic locations based on reputation
- C. it evaluates website reputation using history feedback and security issues
- D. it grants access to websites with a history of high traffic and low security concerns
- Correct answer: it evaluates website reputation using history feedback and security issues
- Distractors: It scans websites for content that meets a predefined reputation score | It blocks websites only from specific geographic locations based on reputation | it grants access to websites with a history of high traffic and low security concerns
- Source topic: `Reputation-Filter`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt Reputationsfilterung mit automatisierten Risikostufen, manuell überschreibbar. Das Cram-Video spricht von Reputationsdatenbanken mit Trust-Scores basierend auf historischem Verhalten.

### 4.5 > OS security > Group Policy
`req:sy0701:v7:4.5:operating-system-security:group-policy`

**possibleQuestion1**

- Question: How does group policy contribute to operating system security?
- A. By allowing users to run certain groups of software types without restrictions
- B. by enforcing security settings and configurations across network systems
- C. by disabling all network communications between systems
- D. by preventing unauthorized access to physical hardware only
- Correct answer: by enforcing security settings and configurations across network systems
- Distractors: By allowing users to run certain groups of software types without restrictions | by disabling all network communications between systems | by preventing unauthorized access to physical hardware only
- Source topic: `Group Policy`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does GPO stand for?
- A. General policy object
- B. Group Policy Object
- C. global policy organization
- D. group protection object
- Correct answer: Group Policy Object
- Distractors: General policy object | global policy organization | group protection object
- Source topic: `GPO-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer stellt Group Policy als Überlagerung über Active Directory dar, verwaltet über den Group Policy Editor. Das Cram-Video verweist auf GPOs mit Firewall- und Passwortrichtlinien, auch von Drittanbietern.

### 4.5 > OS security > SELinux
`req:sy0701:v7:4.5:operating-system-security:selinux`

**possibleQuestion1**

- Question: What does SE Linux provide in terms of operating system security?
- A. Encryption tool that protects system data in transit and at rest
- B. A firewall that filters incoming network traffic based on predefined rules
- C. a mandatory access control system that restricts process and user interactions with resources
- D. an antivirus feature to detect and remove malware
- Correct answer: a mandatory access control system that restricts process and user interactions with resources
- Distractors: Encryption tool that protects system data in transit and at rest | A firewall that filters incoming network traffic based on predefined rules | an antivirus feature to detect and remove malware
- Source topic: `SELinux`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does SELinux stand for?
- A. Security-Enhanced Linux
- B. Group Policy
- C. Rules
- D. Access lists
- Correct answer: Security-Enhanced Linux
- Distractors: Group Policy | Rules | Access lists
- Source topic: `SELinux-Akronym`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer erklärt, dass SELinux Mandatory Access Control statt Discretionary Access Control bringt, zentral administriert. Das Cram-Video beschreibt es als Kernel-Sicherheitsmodul, auch unter Android und eingebetteten Systemen.

### 4.5 > Secure protocols > Protocol selection
`req:sy0701:v7:4.5:implementation-of-secure-protocols:protocol-selection`

**possibleQuestion1**

- Question: Why is the implementation of secure protocols essential in network security?
- A. to ensure secure confidential data transmission across the network
- B. Port selection
- C. Transport method
- D. Rules
- Correct answer: to ensure secure confidential data transmission across the network
- Distractors: Port selection | Transport method | Rules
- Source topic: `Protokollauswahl`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer rät, unsichere Protokolle durch sichere Gegenstücke zu ersetzen (SSH statt Telnet etc.). Das Cram-Video nennt Vertraulichkeit, Integrität, Authentifizierung als Merkmale und AH vs. ESP bei IPsec.

### 4.5 > Secure protocols > Port selection
`req:sy0701:v7:4.5:implementation-of-secure-protocols:port-selection`

**possibleQuestion1**

- Question: What is an important consideration when selecting a port for network communication?
- A. commonly targeted by attackers
- B. Protocol selection
- C. Transport method
- D. Rules
- Correct answer: commonly targeted by attackers
- Distractors: Protocol selection | Transport method | Rules
- Source topic: `Portauswahl`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer warnt, dass der Port allein keine Verschlüsselung garantiert — Verifikation per Paketmitschnitt nötig. Das Cram-Video empfiehlt, Port-Protokoll-Zuordnungen nach Anwendungsfall zu lernen.

### 4.5 > Secure protocols > Transport method
`req:sy0701:v7:4.5:implementation-of-secure-protocols:transport-method`

**possibleQuestion1**

- Question: Why is transport method selection crucial in secure communications?
- A. It ensures that data is never encrypted during transmission
- B. It improves the speed of the network connections by ignoring encryption
- C. It restricts the types of devices that can access the network
- D. it determines secure data transmission method and prevents unauthorized access
- Correct answer: it determines secure data transmission method and prevents unauthorized access
- Distractors: It ensures that data is never encrypted during transmission | It improves the speed of the network connections by ignoring encryption | It restricts the types of devices that can access the network
- Source topic: `Transportmethode`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt Verschlüsselung auf Netzwerkebene unabhängig von der Anwendung, z.B. VPN-Tunnel. Das Cram-Video ergänzt IPsec-Modi: Transport (Host-zu-Host) vs. Tunnel (Gateway-zu-Gateway).

### 4.5 > DNS filtering
`req:sy0701:v7:4.5:dns-filtering`

**possibleQuestion1**

- Question: What is the main function of DNS filtering in network security?
- A. to block access to malicious websites by filtering DNS requests
- B. File integrity monitoring
- C. DLP
- D. NAC
- Correct answer: to block access to malicious websites by filtering DNS requests
- Distractors: File integrity monitoring | DLP | NAC
- Source topic: `DNS-Filtering`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high
- Quality flags: distractor-issue

Messer erklärt DNS-Filterung als Contentfilterung über den DNS-Server ohne NGFW/Proxy, wirkt auch bei Malware-C2-Anfragen. Das Cram-Video beschreibt dieselbe Mechanik mit Ersatzantwort und mahnt zur False-Positive-Kontrolle.

### 4.5 > Email security > DMARC
`req:sy0701:v7:4.5:email-security:domain-based-message-authentication-reporting-an`

**possibleQuestion1**

- Question: What is the purpose of domain-based message authentication, reporting and conformance or DMARC?
- A. to authenticate and report emails to prevent spoofing and phishing
- B. to automatically remove all email attachments from incoming emails
- C. was the purpose of domain-based message authentication reporting and conformance
- D. DMARC
- Correct answer: to authenticate and report emails to prevent spoofing and phishing
- Distractors: to automatically remove all email attachments from incoming emails | was the purpose of domain-based message authentication reporting and conformance | DMARC
- Source topic: `DMARC`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does DMARC stand for?
- A. Domain message authentication report and conformance
- B. domain-based mail authentication reporting and conformance
- C. Digital mail authentication reporting and control
- D. Domain-based Message Authentication, Reporting, and Conformance
- Correct answer: Domain-based Message Authentication, Reporting, and Conformance
- Distractors: Domain message authentication report and conformance | domain-based mail authentication reporting and conformance | Digital mail authentication reporting and control
- Source topic: `Akronym DMARC`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt DMARC als DNS-TXT-Record, der festlegt, wie mit nicht validierbaren Mails umgegangen wird, plus Compliance-Reports. Das Cram-Video nennt die drei Policies none/quarantine/reject als Bindeglied von SPF und DKIM.

### 4.5 > Email security > DKIM
`req:sy0701:v7:4.5:email-security:domainkeys-identified-mail-dkim`

**possibleQuestion1**

- Question: What does domain keys identified mail or DKIM provide for email security?
- A. It encrypts email content and attachments for confidentiality
- B. It blocks phishing emails by detecting and removing malicious links in email messages
- C. it adds a digital signature to verify sender identity and message integrity
- D. Or it creates temporary email addresses to prevent spam
- Correct answer: it adds a digital signature to verify sender identity and message integrity
- Distractors: It encrypts email content and attachments for confidentiality | It blocks phishing emails by detecting and removing malicious links in email messages | Or it creates temporary email addresses to prevent spam
- Source topic: `DKIM`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does DKIM stand for?
- A. Domain key internet mail
- B. DomainKeys Identified Mail
- C. data keys in mail
- D. digital keys for internet messaging
- Correct answer: DomainKeys Identified Mail
- Distractors: Domain key internet mail | data keys in mail | digital keys for internet messaging
- Source topic: `Akronym DKIM`
- Option source: transcript
- Mapping confidence: high

Messer erklärt DKIM als digitale Signatur des Transportvorgangs, validiert über den öffentlichen Schlüssel im DNS. Das Cram-Video fasst DKIM als Signaturprüfung der Nachricht selbst zusammen.

### 4.5 > Email security > SPF
`req:sy0701:v7:4.5:email-security:sender-policy-framework-spf`

**possibleQuestion1**

- Question: What is the function of sender policy framework or SPF in email security?
- A. to define authorized mail servers to prevent domain spoofing
- B. to filter and delete emails based on their content type to prevent email attachments from being delivered to external recipients
- C. to analyze email metadata and flag suspicious senders
- D. was the function of sender policy framework
- Correct answer: to define authorized mail servers to prevent domain spoofing
- Distractors: to filter and delete emails based on their content type to prevent email attachments from being delivered to external recipients | to analyze email metadata and flag suspicious senders | was the function of sender policy framework
- Source topic: `SPF`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does SPF stand for?
- A. Sender Policy Framework
- B. secure postmail format
- C. standard protocol framework
- D. sender protection feature
- Correct answer: Sender Policy Framework
- Distractors: secure postmail format | standard protocol framework | sender protection feature
- Source topic: `SPF-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer erklärt SPF als DNS-TXT-Record, der autorisierte Sende-Server einer Domain festlegt. Das Cram-Video beschreibt SPF als Whitelist autorisierter Sende-IPs zur Absenderverifikation.

### 4.5 > Email security > Gateway
`req:sy0701:v7:4.5:email-security:gateway`

**possibleQuestion1**

- Question: What is a gateway in the context of network security?
- A. A server that stores all incoming and outgoing emails for backup purposes
- B. a device or software that connects two networks and filters traffic
- C. A tool that encrypts all data being transmitted over the network
- D. a firewall that blocks all incoming traffic from untrusted networks
- Correct answer: a device or software that connects two networks and filters traffic
- Distractors: A server that stores all incoming and outgoing emails for backup purposes | A tool that encrypts all data being transmitted over the network | a firewall that blocks all incoming traffic from untrusted networks
- Source topic: `Gateway`
- Option source: transcript
- Mapping confidence: high
- Quality flags: scope-mismatch

Messer beschreibt das Mail-Gateway als Torwächter im Screened Subnet, der Herkunft prüft. Das Cram-Video beschreibt das Gateway als ersten Verteidigungslinie gegen Malware, Viren und Spam.

### 4.5 > File integrity monitoring
`req:sy0701:v7:4.5:file-integrity-monitoring`

**possibleQuestion1**

- Question: What is the primary purpose of file integrity monitoring or FIM in cyber security?
- A. to detect unauthorized changes to files and directories
- B. to prevent unauthorized users from accessing files in real time
- C. to encrypt files before they're stored on disk
- D. to automatically delete sensitive files after a certain period of time
- Correct answer: to detect unauthorized changes to files and directories
- Distractors: to prevent unauthorized users from accessing files in real time | to encrypt files before they're stored on disk | to automatically delete sensitive files after a certain period of time
- Source topic: `FIM`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does FIM stand for?
- A. File Integrity Monitoring
- B. file inspection management
- C. file integrity management
- D. file information management
- Correct answer: File Integrity Monitoring
- Distractors: file inspection management | file integrity management | file information management
- Source topic: `FIM-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer begründet FIM mit unveränderlichen Programmdateien, geprüft per SFC (Windows) oder Tripwire (Linux). Das Cram-Video erklärt die Baseline-Hash-Mechanik und ordnet FIM der Configuration Enforcement zu.

### 4.5 > DLP
`req:sy0701:v7:4.5:dlp`

**possibleQuestion1**

- Question: How does data loss prevention or DLP help protect sensitive information?
- A. by blocking unauthorized transfer or sharing of sensitive data
- B. DNS filtering
- C. File integrity monitoring
- D. NAC
- Correct answer: by blocking unauthorized transfer or sharing of sensitive data
- Distractors: DNS filtering | File integrity monitoring | NAC
- Source topic: `DLP`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer unterscheidet data in use/motion/at rest bei DLP mit Praxisbeispielen (USB-Verbot, Boeing-Vorfall). Das Cram-Video ergänzt Policy-Aktionen wie Sensitivity Labels und den Grundsatz, dass Schutz am Dokument haftet.

### 4.5 > NAC
`req:sy0701:v7:4.5:network-access-control-nac`

**possibleQuestion1**

- Question: What is the main purpose of network access control or NAC in cyber security?
- A. to enforce security policies and control device access to the network
- B. DNS filtering
- C. File integrity monitoring
- D. DLP
- Correct answer: to enforce security policies and control device access to the network
- Distractors: DNS filtering | File integrity monitoring | DLP
- Source topic: `NAC`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion2**

- Question: What does NAC stand for?
- A. Network authentication control
- B. network allocation control
- C. network administrative control
- D. Network Access Control
- Correct answer: Network Access Control
- Distractors: Network authentication control | network allocation control | network administrative control
- Source topic: `NAC-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer erklärt NAC über Posture Assessment (Zertifikat, Virenschutz, Verschlüsselung) mit Quarantäne-VLAN bei Nichtkonformität. Das Cram-Video schildert dasselbe Muster mit Boundary-Netz und Remediation-Service.

### 4.5 > EDR/XDR
`req:sy0701:v7:4.5:endpoint-detection-and-response-edr-extended-det`

**possibleQuestion1**

- Question: What is the main difference between endpoint detection and response or EDR and extended detection response or XDR?
- A. EDR is focused on cloud security while XDR is focused on local device protection
- B. XDR provides only real-time thread detection while EDR provides long-term analysis and reporting
- C. XDR integrates data from multiple security layers
- D. EDR focuses on endpoints only EDR is used primarily for threat hunting while XDR is used only for preventing malware infections
- Correct answer: XDR integrates data from multiple security layers
- Distractors: EDR is focused on cloud security while XDR is focused on local device protection | XDR provides only real-time thread detection while EDR provides long-term analysis and reporting | EDR focuses on endpoints only EDR is used primarily for threat hunting while XDR is used only for preventing malware infections
- Source topic: `EDR vs. XDR`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does EDR stand for?
- A. Endpoint Detection and Response
- B. endpoint data recovery
- C. enhanced data response
- D. enterprise detection and reporting in endpoint security
- Correct answer: Endpoint Detection and Response
- Distractors: endpoint data recovery | enhanced data response | enterprise detection and reporting in endpoint security
- Source topic: `EDR-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion3**

- Question: What does XDR stand for?
- A. Extended Detection and Response
- B. DNS filtering
- C. File integrity monitoring
- D. DLP
- Correct answer: Extended Detection and Response
- Distractors: DNS filtering | File integrity monitoring | DLP
- Source topic: `XDR-Akronym`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer beschreibt EDR als Agent mit Verhaltensanalyse und automatisierter Reaktion, XDR mit breiteren korrelierten Datenquellen. Das Cram-Video kontrastiert EDR (ein Gerät) mit XDR (Endpunkte, Cloud, E-Mail, Mobile).

### 4.5 > User behavior analytics
`req:sy0701:v7:4.5:user-behavior-analytics`

**possibleQuestion1**

- Question: How do user behavior analytics or UBA enhance cyber security?
- A. by analyzing user behavior to detect activities that may indicate a security breach
- B. by blocking unauthorized users from accessing the network based on their login attempts
- C. by monitoring system performance to identify areas for optimization
- D. by encrypting user data before it's transmitted over the network
- Correct answer: by analyzing user behavior to detect activities that may indicate a security breach
- Distractors: by blocking unauthorized users from accessing the network based on their login attempts | by monitoring system performance to identify areas for optimization | by encrypting user data before it's transmitted over the network
- Source topic: `UBA`
- Option source: transcript
- Mapping confidence: high

Messer führt UBA als XDR-Datenquelle ein, die eine Baseline aus Nutzerverhalten bildet. Das Cram-Video nennt konkrete Datenpunkte und stuft UBA als weitgehend synonym mit UEBA ein.

## Objective 4.6

### 4.6 > Provisioning/de-provisioning
`req:sy0701:v7:4.6:provisioning-de-provisioning-user-accounts`

**possibleQuestion1**

- Question: What is the purpose of provisioning and deprovisioning user accounts in an organization?
- A. to ensure users have proper access when joining or leaving the organization
- B. Permission assignments
- C. Identity proofing
- D. Federation
- Correct answer: to ensure users have proper access when joining or leaving the organization
- Distractors: Permission assignments | Identity proofing | Federation
- Source topic: `Provisioning/Deprovisioning`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer beschreibt den IAM-Lebenszyklus von Kontoerstellung bis Deaktivierung inklusive Änderungen bei Rollenwechsel. Das Cram-Video betont Automatisierung und sofortiges De-Provisioning bei Austritt gegen Zugriffsfenster.

### 4.6 > Permission assignments
`req:sy0701:v7:4.6:permission-assignments-and-implications`

**possibleQuestion1**

- Question: What is the impact of incorrect permission assignments in an organization?
- A. It ensures that no user can have can access sensitive data without proper authorization
- B. It allows for better tracking of system performance
- C. it can lead to unauthorized access, data breaches and compromised systems
- D. it limits users to only accessing public information
- Correct answer: it can lead to unauthorized access, data breaches and compromised systems
- Distractors: It ensures that no user can have can access sensitive data without proper authorization | It allows for better tracking of system performance | it limits users to only accessing public information
- Source topic: `falsche Rechtevergabe`
- Option source: transcript
- Mapping confidence: high

Messer betont Rechte exakt für die Aufgabe, meist über Gruppen zugewiesen. Das Cram-Video unterscheidet direkte, Gruppen- und Rollenzuweisung, wobei direkte Zuweisung Permission Creep fördert.

### 4.6 > Identity proofing
`req:sy0701:v7:4.6:identity-proofing`

**possibleQuestion1**

- Question: What is the purpose of identity proofing in the context of cyber security?
- A. who they claim to be before granting access to a system
- B. Provisioning/de-provisioning
- C. Permission assignments
- D. Federation
- Correct answer: who they claim to be before granting access to a system
- Distractors: Provisioning/de-provisioning | Permission assignments | Federation
- Source topic: `Identity Proofing`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion2**

- Question: What does IAM stand for?
- A. Identity and account management
- B. information and access management
- C. identity access mechanism
- D. Identity and Access Management
- Correct answer: Identity and Access Management
- Distractors: Identity and account management | information and access management | identity access mechanism
- Source topic: `IAM-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer definiert Identity Proofing als Resolution und Validation bei Kontoerstellung, gefolgt von Attestation. Das Cram-Video nennt Dokumentenprüfung, wissensbasierte Fragen, Biometrie und Out-of-Band-Verifikation.

### 4.6 > Federation
`req:sy0701:v7:4.6:federation`

**possibleQuestion1**

- Question: What is federation in identity management?
- A. The process of creating multiple user accounts for each organization to separate data access
- B. The act of merging multiple databases into a single unified system
- C. The use of a single au authentication method for all internal and external users
- D. the process of linking and sharing user identity information across systems or organizations
- Correct answer: the process of linking and sharing user identity information across systems or organizations
- Distractors: The process of creating multiple user accounts for each organization to separate data access | The act of merging multiple databases into a single unified system | The use of a single au authentication method for all internal and external users
- Source topic: `Federation`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does IdP stand for?
- A. Identity Provider
- B. identification process
- C. identity protocol
- D. identification provider
- Correct answer: Identity Provider
- Distractors: identification process | identity protocol | identification provider
- Source topic: `IdP-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer erklärt Federation als Anmeldung mit bestehenden Drittanbieter-Konten ohne lokale Datenbank. Das Cram-Video definiert Federation als Vertrauensverbund von Domänen, nicht zwingend bidirektional.

### 4.6 > SSO > LDAP
`req:sy0701:v7:4.6:single-sign-on-sso:lightweight-directory-access-protocol-ldap`

**possibleQuestion1**

- Question: What is the role of lightweight directory access protocol or LDAP in identity management?
- A. used to query and modify directory services to store user and authentication information
- B. OAuth
- C. SAML
- D. Provisioning/de-provisioning
- Correct answer: used to query and modify directory services to store user and authentication information
- Distractors: OAuth | SAML | Provisioning/de-provisioning
- Source topic: `LDAP`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion2**

- Question: Where's the advantage of single sign on or SSO in an organization's security system?
- A. It forces users to authenticate every time they access any application for increased security
- B. It stores all user passwords in one location for easier access management
- C. it allows users to authenticate once to access multiple applications without repeated login
- D. it eliminates the need for network segmentation firewalls
- Correct answer: it allows users to authenticate once to access multiple applications without repeated login
- Distractors: It forces users to authenticate every time they access any application for increased security | It stores all user passwords in one location for easier access management | it eliminates the need for network segmentation firewalls
- Source topic: `SSO-Vorteil`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion3**

- Question: What does LDAP stand for?
- A. Local directory access protocol light data access protocol
- B. Lightweight Directory Access Protocol
- C. logical directory administration protocol
- D. is the full form of LDAP LDAP
- Correct answer: Lightweight Directory Access Protocol
- Distractors: Local directory access protocol light data access protocol | logical directory administration protocol | is the full form of LDAP LDAP
- Source topic: `LDAP-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion4**

- Question: What does SSO stand for?
- A. Single sign off
- B. simple sign on
- C. secure sign on
- D. Single Sign-On
- Correct answer: Single Sign-On
- Distractors: Single sign off | simple sign on | secure sign on
- Source topic: `SSO-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer stellt LDAP als Zugriffsprotokoll für Verzeichnisdatenbanken vor mit Distinguished Names und Baumstruktur. Das Cram-Video weist darauf hin, dass LDAP allein nicht authentifiziert, sondern mit einem Auth-Dienst gekoppelt wird.

### 4.6 > SSO > OAuth
`req:sy0701:v7:4.6:single-sign-on-sso:open-authorization-oauth`

**possibleQuestion1**

- Question: What does open authorization or OAuth provide in access management?
- A. It stores encrypted user credentials for secure access to applications
- B. it lets third-party applications access user resources without sharing passwords
- C. It authenticates users using multifactor authentication for increased security
- D. encrypts email messages to ensure confidentiality during transmission
- Correct answer: it lets third-party applications access user resources without sharing passwords
- Distractors: It stores encrypted user credentials for secure access to applications | It authenticates users using multifactor authentication for increased security | encrypts email messages to ensure confidentiality during transmission
- Source topic: `OAuth`
- Option source: transcript
- Mapping confidence: high
- Quality flags: chunk-boundary

**possibleQuestion2**

- Question: What does OAuth stand for?
- A. online authorization
- B. open authentication
- C. organized authorization
- D. Open Authorization
- Correct answer: Open Authorization
- Distractors: online authorization | open authentication | organized authorization
- Source topic: `OAuth-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt OAuth als Autorisierungs-Framework nach der Authentifizierung, oft mit OpenID kombiniert. Das Cram-Video nennt OAuth 2.0 als offenen Standard für Drittanbieter-Logins ohne Passwortpreisgabe.

### 4.6 > SSO > SAML
`req:sy0701:v7:4.6:single-sign-on-sso:security-assertions-markup-language-saml`

**possibleQuestion1**

- Question: What is the role of security assertions markup language or SAML in single signon or SSO?
- A. It stores encrypted passwords to prevent unauthorized access
- B. It automatically generates user roles and permissions for SSO applications
- C. it enables exchange of authentication and authorization data between identity and service providers
- D. it provides a secure way to connect all applications within a closed network
- Correct answer: it enables exchange of authentication and authorization data between identity and service providers
- Distractors: It stores encrypted passwords to prevent unauthorized access | It automatically generates user roles and permissions for SSO applications | it provides a secure way to connect all applications within a closed network
- Source topic: `Rolle von SAML bei SSO`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does SAML stand for?
- A. Secure assertion markup language
- B. simple assertion markup language
- C. secure access markup language
- D. Security Assertion Markup Language
- Correct answer: Security Assertion Markup Language
- Distractors: Secure assertion markup language | simple assertion markup language | secure access markup language
- Source topic: `SAML-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer schildert den SAML-Ablauf mit Client, Resource Server und Authorization Server und nennt fehlende Mobile-Eignung als Schwäche. Das Cram-Video beschreibt SAML als XML-Format zwischen Identity Provider und Service Provider.

### 4.6 > Interoperability
`req:sy0701:v7:4.6:interoperability`

**possibleQuestion1**

- Question: What does interoperability in cyber security refer to?
- A. the ability of systems, devices or apps to work together and exchange information securely
- B. The process of isolating systems to prevent them from interacting with external networks
- C. The process of creating backups to ensure data availability across different systems
- D. the use of proprietary software to ensure security access security across all devices
- Correct answer: the ability of systems, devices or apps to work together and exchange information securely
- Distractors: The process of isolating systems to prevent them from interacting with external networks | The process of creating backups to ensure data availability across different systems | the use of proprietary software to ensure security access security across all devices
- Source topic: `Interoperabilität`
- Option source: transcript
- Mapping confidence: high

Messer behandelt Interoperabilität als Auswahlkriterium: Technologien müssen zum vorhandenen Bestand passen. Das Cram-Video fasst es als reibungsloses Zusammenspiel von Identity Providern und Anwendungen zusammen.

### 4.6 > Attestation ⚠ QUELLENKONFLIKT
`req:sy0701:v7:4.6:attestation`

**possibleQuestion1**

- Question: What is the purpose of attestation in security?
- A. To enforce encryption policies for user data during transmission
- B. to verify system integrity to ensure it hasn't been altered or tampered with
- C. to monitor and restrict access based on user authentication level
- D. to store audit logs for all security incidents for analysis
- Correct answer: to verify system integrity to ensure it hasn't been altered or tampered with
- Distractors: To enforce encryption policies for user data during transmission | to monitor and restrict access based on user authentication level | to store audit logs for all security incidents for analysis
- Source topic: `Zweck von Attestation`
- Option source: transcript
- Mapping confidence: high

Die Quellen meinen Unterschiedliches: Messer versteht Attestation als Identitätsnachweis (Reisepass, Bonitätsdaten). Das Cram-Video meint Device Attestation via Hardware Root of Trust/TPM als Zero-Trust-Baustein.

### 4.6 > Access controls > Mandatory
`req:sy0701:v7:4.6:access-controls:mandatory`

**possibleQuestion1**

- Question: What is the primary goal of mandatory access control or MAC?
- A. to enforce access restrictions via system policies that users can't override
- B. Discretionary
- C. Role-based
- D. Rule-based
- Correct answer: to enforce access restrictions via system policies that users can't override
- Distractors: Discretionary | Role-based | Rule-based
- Source topic: `MAC (Zugriffsmodell)`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion2**

- Question: What is the purpose of an agreement type in a security program?
- A. to formally define the terms and conditions agreed upon between parties engaged in a transaction or collaboration
- B. Discretionary
- C. Role-based
- D. Rule-based
- Correct answer: to formally define the terms and conditions agreed upon between parties engaged in a transaction or collaboration
- Distractors: Discretionary | Role-based | Rule-based
- Source topic: `Ziel von MAC`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer beschreibt MAC als Label-Modell für hochsichere Umgebungen, nur der Administrator vergibt Rechte. Das Cram-Video formuliert, dass Objekt und Subjekt Labels tragen und das System danach entscheidet.

### 4.6 > Access controls > Discretionary
`req:sy0701:v7:4.6:access-controls:discretionary`

**possibleQuestion1**

- Question: What is the key characteristic of discretionary access control or DAC?
- A. it allows owners of resources to decide who has access to their resources
- B. Mandatory
- C. Role-based
- D. Rule-based
- Correct answer: it allows owners of resources to decide who has access to their resources
- Distractors: Mandatory | Role-based | Rule-based
- Source topic: `Merkmal von DAC`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion2**

- Question: What does DAC stand for?
- A. Distributed access control
- B. direct authorization control
- C. Discretionary Access Control
- D. digital access check
- Correct answer: Discretionary Access Control
- Distractors: Distributed access control | direct authorization control | digital access check
- Source topic: `Akronym DAC`
- Option source: transcript
- Mapping confidence: high

Bei Messer bestimmt der Datenersteller selbst über Zugriff — flexibel, aber weniger sicher. Das Cram-Video nennt NTFS mit DACL als Praxisbeispiel.

### 4.6 > Access controls > Role-based
`req:sy0701:v7:4.6:access-controls:role-based`

**possibleQuestion1**

- Question: What does role-based access control or RBAC rely on for assigning permissions?
- A. It assigns permissions based on a user's role in the organization
- B. Mandatory
- C. Discretionary
- D. Rule-based
- Correct answer: It assigns permissions based on a user's role in the organization
- Distractors: Mandatory | Discretionary | Rule-based
- Source topic: `RBAC (Rolle)`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion2**

- Question: What is the purpose of having documented procedures in a security program?
- A. to guide employees on how to handle sensitive data and security incidents
- B. Mandatory
- C. Discretionary
- D. Rule-based
- Correct answer: to guide employees on how to handle sensitive data and security incidents
- Distractors: Mandatory | Discretionary | Rule-based
- Source topic: `Grundlage von RBAC (role-based)`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer erklärt RBAC als Gruppen nach Jobfunktion mit implizit vererbten Rechten. Das Cram-Video betont RBAC als nicht-diskretionär, da Nutzer ihre Rechte nicht eigenmächtig ändern können.

### 4.6 > Access controls > Rule-based
`req:sy0701:v7:4.6:access-controls:rule-based`

**possibleQuestion1**

- Question: What is rule-based access control or RBAC?
- A. It allows users to define their own access rules based on individual preferences
- B. It provides unrestricted access to users during specific time intervals
- C. it enforces access based on predefined rules and policies, not users or roles
- D. it dynamically adjusts permissions based on user location within the network
- Correct answer: it enforces access based on predefined rules and policies, not users or roles
- Distractors: It allows users to define their own access rules based on individual preferences | It provides unrestricted access to users during specific time intervals | it dynamically adjusts permissions based on user location within the network
- Source topic: `RBAC (Regel)`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt systemseitig durchgesetzte, vom Administrator erstellte Regeln, z.B. Zeitfenster. Das Cram-Video nennt Firewall-Regeln/ACLs als Musterbeispiel mit global gleichen Regeln.

### 4.6 > Access controls > Attribute-based
`req:sy0701:v7:4.6:access-controls:attribute-based`

**possibleQuestion1**

- Question: What does attribute-based access control use to determine access?
- A. It uses attributes like user traits, environment, and resources to determine access
- B. Mandatory
- C. Discretionary
- D. Role-based
- Correct answer: It uses attributes like user traits, environment, and resources to determine access
- Distractors: Mandatory | Discretionary | Role-based
- Source topic: `Grundlage von ABAC`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer stellt ABAC als modernstes Modell mit vielen kombinierbaren Kriterien dar. Das Cram-Video beschreibt es enger als Steuerung anhand von Kontoattributen wie Abteilung.

### 4.6 > Access controls > Time-of-day restrictions
`req:sy0701:v7:4.6:access-controls:time-of-day-restrictions`

**possibleQuestion1**

- Question: What is the function of time of day restrictions in access control?
- A. To allow unrestricted access during business hours and block access at all other times
- B. to limit access to systems or resources based on the time of day or specific hours
- C. To grant temporary access to external users based on the devices timestamp
- D. Or to prevent system access during maintenance periods regardless of the user's role
- Correct answer: to limit access to systems or resources based on the time of day or specific hours
- Distractors: To allow unrestricted access during business hours and block access at all other times | To grant temporary access to external users based on the devices timestamp | Or to prevent system access during maintenance periods regardless of the user's role
- Source topic: `Time-of-day-Restriktionen`
- Option source: transcript
- Mapping confidence: high

Messer nennt Zeitbeschränkungen als modellübergreifende Zusatzoption mit Zeitzonen-Berücksichtigung. Das Cram-Video verbindet sie mit Schichtmodellen gegen nächtlichen Datendiebstahl.

### 4.6 > Access controls > Least privilege
`req:sy0701:v7:4.6:access-controls:least-privilege`

**possibleQuestion1**

- Question: What is the principle of least privilege ensure in access control?
- A. It grants users full access to all systems to increase productivity
- B. It allows users to modify access permissions for other users
- C. it ensures users get only the minimum access needed to do their tasks
- D. it limits access based on user roles regardless of necessity
- Correct answer: it ensures users get only the minimum access needed to do their tasks
- Distractors: It grants users full access to all systems to increase productivity | It allows users to modify access permissions for other users | it limits access based on user roles regardless of necessity
- Source topic: `Least Privilege`
- Option source: transcript
- Mapping confidence: high

Messer führt Least Privilege als modellübergreifende Best Practice ein, die Schadenswirkung von Malware begrenzt. Das Cram-Video ergänzt Need to Know als verwandtes Prinzip.

### 4.6 > MFA > Implementations > Biometrics
`req:sy0701:v7:4.6:multifactor-authentication:implementations:biometrics`

**possibleQuestion1**

- Question: What is the primary advantage of using biometrics for authentication?
- A. biometrics provide a unique hard torelicate verification using physical traits
- B. Biometrics are easy to implement and can be used to monitor employee productivity
- C. Biometric data can be reset with ease if compromised
- D. biometrics require no training for users to operate
- Correct answer: biometrics provide a unique hard torelicate verification using physical traits
- Distractors: Biometrics are easy to implement and can be used to monitor employee productivity | Biometric data can be reset with ease if compromised | biometrics require no training for users to operate
- Source topic: `FRR-Biometrie-Kennzahl`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What is an example of implementation of multifactor authentication or MFA?
- A. requiring both a password and a fingerprint scan to log in
- B. Hard/soft tokens
- C. Security keys
- D. Provisioning/de-provisioning
- Correct answer: requiring both a password and a fingerprint scan to log in
- Distractors: Hard/soft tokens | Security keys | Provisioning/de-provisioning
- Source topic: `Vorteil Biometrie`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer behandelt Biometrie kurz als „something you are" mit Warnung vor Umgehbarkeit. Das Cram-Video geht tiefer: Fehlerkennzahlen wie Crossover Error Rate, FAR vs. FRR.

### 4.6 > MFA > Implementations > Hard/soft tokens
`req:sy0701:v7:4.6:multifactor-authentication:implementations:hard-soft-authentication-tokens`

**possibleQuestion1**

- Question: What is the difference between hard and soft authentication tokens?
- A. Soft tokens require a physical device while hard tokens are software applications
- B. physical devices
- C. Soft tokens are softwarebased applications for authentication Hard tokens are used for password recovery while soft tokens manage encryption keys
- D. there is no difference between hard and soft tokens in terms of functionality
- Correct answer: physical devices
- Distractors: Soft tokens require a physical device while hard tokens are software applications | Soft tokens are softwarebased applications for authentication Hard tokens are used for password recovery while soft tokens manage encryption keys | there is no difference between hard and soft tokens in terms of functionality
- Source topic: `Hard- vs. Soft-Token`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does HOTP stand for?
- A. hashed onetime password
- B. HMAC based on one-time passcode
- C. high order time password
- D. HMAC-Based One-Time Password
- Correct answer: HMAC-Based One-Time Password
- Distractors: hashed onetime password | HMAC based on one-time passcode | high order time password
- Source topic: `HOTP-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion3**

- Question: What does TOTP stand for?
- A. temporary onetime password
- B. Time-Based One-Time Password
- C. times timed onetime passcode
- D. timed operator password
- Correct answer: Time-Based One-Time Password
- Distractors: temporary onetime password | times timed onetime passcode | timed operator password
- Source topic: `TOTP-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer nennt Hardware-Tokens mit rotierenden Zahlen und Software-Tokens auf dem Smartphone. Das Cram-Video erklärt HOTP (Zähler) und TOTP (Zeit) als technische Grundlage, standardisiert über OATH.

### 4.6 > MFA > Implementations > Security keys
`req:sy0701:v7:4.6:multifactor-authentication:implementations:security-keys`

**possibleQuestion1**

- Question: What is the primary function of security keys in authentication?
- A. Security keys store encrypted passwords for easy retrieval during login
- B. Security keys enable encrypted email communication without authentication
- C. Security keys allow users to bypass security policies for testing purposes
- D. a physical device used to verify identity often in two-factor authentication
- Correct answer: a physical device used to verify identity often in two-factor authentication
- Distractors: Security keys store encrypted passwords for easy retrieval during login | Security keys enable encrypted email communication without authentication | Security keys allow users to bypass security policies for testing purposes
- Source topic: `Funktion Security Keys`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt den USB-Sicherheitsschlüssel mit personenspezifischem Zertifikat als „something you have". Das Cram-Video nennt den YubiKey mit FIPS-140-2-Validierung als Beispiel.

### 4.6 > MFA > Factors > Something you know
`req:sy0701:v7:4.6:multifactor-authentication:factors:something-you-know`

**possibleQuestion1**

- Question: Which of the following is the example of something you know in authentication?
- A. A fingerprint scan that uniquely identifies you
- B. a physical card token used to generate login codes
- C. a password or pin that you must input during login
- D. your current geographical location used to verify access
- Correct answer: a password or pin that you must input during login
- Distractors: A fingerprint scan that uniquely identifies you | a physical card token used to generate login codes | your current geographical location used to verify access
- Source topic: `"something you know"`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does MFA stand for?
- A. Multifactor Authentication
- B. multifunction access
- C. multifaceted access
- D. multiple factor au authorization
- Correct answer: Multifactor Authentication
- Distractors: multifunction access | multifaceted access | multiple factor au authorization
- Source topic: `MFA-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer nennt Passwort, PIN und Entsperrmuster als verbreitetsten Faktor. Das Cram-Video ergänzt wissensbasierte Authentifizierung mit statischen und dynamischen Fragen im Proofing-Kontext.

### 4.6 > MFA > Factors > Something you have
`req:sy0701:v7:4.6:multifactor-authentication:factors:something-you-have`

**possibleQuestion1**

- Question: What is an example of something you have as a factor in authentication?
- A. a smartphone that generates authentication codes for login
- B. a password that you type into a login form
- C. a voice pattern used to authenticate your identity
- D. a retina scan that identifies you based on your eye characteristics
- Correct answer: a smartphone that generates authentication codes for login
- Distractors: a password that you type into a login form | a voice pattern used to authenticate your identity | a retina scan that identifies you based on your eye characteristics
- Source topic: `"something you have"`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does PIV stand for?
- A. Public identity verification
- B. personal identification validation
- C. Personal Identity Verification
- D. private identity verification
- Correct answer: Personal Identity Verification
- Distractors: Public identity verification | personal identification validation | private identity verification
- Source topic: `PIV-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer zählt Smartcard, USB-Schlüssel, Hardware-/Software-Tokens und SMS-Codes dazu. Das Cram-Video fasst es als „vertrauenswürdiges Gerät" mit Authenticator-Apps.

### 4.6 > MFA > Factors > Something you are
`req:sy0701:v7:4.6:multifactor-authentication:factors:something-you-are`

**possibleQuestion1**

- Question: Which of the following is an example of something you are as a factor in authentication?
- A. A smart card that you carry for authentication purposes
- B. a password that only you know
- C. unique to you
- D. a code sent to your phone that you enter during login
- Correct answer: unique to you
- Distractors: A smart card that you carry for authentication purposes | a password that only you know | a code sent to your phone that you enter during login
- Source topic: `"something you are"`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt diesen Faktor als biometrisch und schwer änderbar. Das Cram-Video grenzt ihn von verwandten Konzepten wie „something you can do" (Unterschrift) ab.

### 4.6 > MFA > Factors > Somewhere you are
`req:sy0701:v7:4.6:multifactor-authentication:factors:somewhere-you-are`

**possibleQuestion1**

- Question: What is the purpose of somewhere you are as an authentication factor?
- A. to authenticate a user based on their physical location often using GPS or IP address
- B. Something you know
- C. Something you have
- D. Something you are
- Correct answer: to authenticate a user based on their physical location often using GPS or IP address
- Distractors: Something you know | Something you have | Something you are
- Source topic: `"somewhere you are"`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer erklärt Standort als Faktor über kombinierte Quellen wie IP und GPS. Das Cram-Video beschreibt dynamische/bedingte Authentifizierung, die bei unerwartetem Ort einen stärkeren Faktor erzwingt.

### 4.6 > Password > Best practices > Length
`req:sy0701:v7:4.6:password-concepts:password-best-practices:length`

**possibleQuestion1**

- Question: Why is password length important in securing accounts?
- A. Shorter passwords are easier to remember for users
- B. harder to crack through brute force
- C. Short passwords reduce the complexity of password storage
- D. password length has no impact on security
- Correct answer: harder to crack through brute force
- Distractors: Shorter passwords are easier to remember for users | Short passwords reduce the complexity of password storage | password length has no impact on security
- Source topic: `Bedeutung Passwortlänge`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What is the recommended password length for maximum security?
- A. 6 to 8 characters only eight characters
- B. any length as long as it's memorable
- C. at least 12 characters
- D. The recommended password length for maximum security
- Correct answer: at least 12 characters
- Distractors: 6 to 8 characters only eight characters | any length as long as it's memorable | The recommended password length for maximum security
- Source topic: `empfohlene Passwortlänge`
- Option source: transcript
- Mapping confidence: high

Messer nennt acht Zeichen als idealisierte Mindestlänge, empfiehlt aber Phrasen für mehr Länge. Das Cram-Video ist konkreter: ideal 12 oder mehr Zeichen wegen des steigenden Work Factor.

### 4.6 > Password > Best practices > Complexity
`req:sy0701:v7:4.6:password-concepts:password-best-practices:complexity`

**possibleQuestion1**

- Question: What does password complexity refer to in security?
- A. Making passwords 30 plus characters and using a third party passwords saving application to recall them
- B. Using the same password across multiple systems for consistency and reliability
- C. using a mix of characters, uppercase and lowercase letters, numbers, and symbols
- D. avoiding the use of special characters in passwords to reduce complexity
- Correct answer: using a mix of characters, uppercase and lowercase letters, numbers, and symbols
- Distractors: Making passwords 30 plus characters and using a third party passwords saving application to recall them | Using the same password across multiple systems for consistency and reliability | avoiding the use of special characters in passwords to reduce complexity
- Source topic: `Definition Passwortkomplexität`
- Option source: transcript
- Mapping confidence: high
- Quality flags: near-duplicate

**possibleQuestion2**

- Question: Which of the following is a password best practice for ensuring security?
- A. using a combination of upper and lowerase letters, numbers, and special characters
- B. Using a long word from the dictionary that is easy to remember without writing it down
- C. Maintaining the same password across applications to ensure consistency and reliability
- D. Or only writing your password down on your physical device not storing it digitally
- Correct answer: using a combination of upper and lowerase letters, numbers, and special characters
- Distractors: Using a long word from the dictionary that is easy to remember without writing it down | Maintaining the same password across applications to ensure consistency and reliability | Or only writing your password down on your physical device not storing it digitally
- Source topic: `Passwort-Best-Practice`
- Option source: transcript
- Mapping confidence: high

Messer begründet Komplexität mit Entropie gegen Spraying und Brute-Force. Das Cram-Video formuliert die Regel operational: mindestens drei von vier Zeichengruppen.

### 4.6 > Password > Best practices > Reuse
`req:sy0701:v7:4.6:password-concepts:password-best-practices:reuse`

Messer empfiehlt ein eigenes Passwort pro Konto, durchgesetzt über die Passworthistorie. Das Cram-Video rechnet vor: bei zwölf gemerkten Passwörtern ist das erste erst beim 13. Wechsel wieder nutzbar.

### 4.6 > Password > Best practices > Expiration
`req:sy0701:v7:4.6:password-concepts:password-best-practices:expiration`

**possibleQuestion1**

- Question: What is the recommended practice for password expiration?
- A. Passwords should never expire as this increases convenience for users
- B. Passwords should expire only after 5 years
- C. Passwords should expire after 10 years for minimal management
- D. passwords should be changed periodically to reduce risk
- Correct answer: passwords should be changed periodically to reduce risk
- Distractors: Passwords should never expire as this increases convenience for users | Passwords should expire only after 5 years | Passwords should expire after 10 years for minimal management
- Source topic: `Passwort-Ablauf`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt Ablauf typischerweise nach 30-90 Tagen mit Vorwarnhinweisen. Das Cram-Video behandelt Expiration in diesem Block nicht ausdrücklich, nur Historie und Mindestalter.

### 4.6 > Password > Best practices > Age
`req:sy0701:v7:4.6:password-concepts:password-best-practices:age`

**possibleQuestion1**

- Question: What is the main reason to track password age in an organization?
- A. to enforce stronger passwords over time
- B. to make it easier for users to recall their passwords over extended periods
- C. periodically updated to reduce risk of being compromised
- D. to allow passwords to remain unchanged for as long as possible
- Correct answer: periodically updated to reduce risk of being compromised
- Distractors: to enforce stronger passwords over time | to make it easier for users to recall their passwords over extended periods | to allow passwords to remain unchanged for as long as possible
- Source topic: `Passwort-Alter tracken`
- Option source: transcript
- Mapping confidence: high
- Quality flags: near-duplicate

Messer erklärt das Passwortalter als Timer seit dem letzten Setzen. Das Cram-Video behandelt das Mindestalter als Ergänzung zur Historie gegen schnelles Umgehen der Wiederverwendungssperre.

### 4.6 > Password > Password managers
`req:sy0701:v7:4.6:password-concepts:password-managers`

**possibleQuestion1**

- Question: What is the primary function of a password manager?
- A. to securely store and manage passwords for various accounts
- B. Passwordless
- C. Provisioning/de-provisioning
- D. Permission assignments
- Correct answer: to securely store and manage passwords for various accounts
- Distractors: Passwordless | Provisioning/de-provisioning | Permission assignments
- Source topic: `Passwort-Manager`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer beschreibt den Passwortmanager als verschlüsselte Datenbank mit Gesundheitsübersicht und Passwortgenerierung. Das Cram-Video nennt konkrete Produkte (LastPass, KeePass, 1Password).

### 4.6 > Password > Passwordless
`req:sy0701:v7:4.6:password-concepts:passwordless`

**possibleQuestion1**

- Question: What is passwordless authentication?
- A. an authentication method without traditional passwords using biometrics or tokens instead
- B. Password managers
- C. Provisioning/de-provisioning
- D. Permission assignments
- Correct answer: an authentication method without traditional passwords using biometrics or tokens instead
- Distractors: Password managers | Provisioning/de-provisioning | Permission assignments
- Source topic: `Passwordless Authentication`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer nennt Gesichtserkennung und PIN als Beispiele, oft noch mit Passwort-Fallback. Das Cram-Video stellt FIDO2 und Windows Hello for Business mit TPM-geschützten Schlüsseln vor.

### 4.6 > PAM tools > Just-in-time permissions
`req:sy0701:v7:4.6:privileged-access-management-tools:just-in-time-permissions`

**possibleQuestion1**

- Question: What are just in time permissions?
- A. permissions granted to users only when necessary often with expirations
- B. Password vaulting
- C. Ephemeral credentials
- D. Provisioning/de-provisioning
- Correct answer: permissions granted to users only when necessary often with expirations
- Distractors: Password vaulting | Ephemeral credentials | Provisioning/de-provisioning
- Source topic: `PAM (Privilegien)`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer erklärt zeitlich begrenzte Adminrechte über eine zentrale Clearingstelle mit automatischem Ablauf. Das Cram-Video ordnet dies unter Privileged Access Management mit Aktivierungsfristen von Minuten bis Stunden.

### 4.6 > PAM tools > Password vaulting
`req:sy0701:v7:4.6:privileged-access-management-tools:password-vaulting`

**possibleQuestion1**

- Question: What is the primary function of password vaultting?
- A. to securely store and manage passwords in encrypted repository
- B. Just-in-time permissions
- C. Ephemeral credentials
- D. Provisioning/de-provisioning
- Correct answer: to securely store and manage passwords in encrypted repository
- Distractors: Just-in-time permissions | Ephemeral credentials | Provisioning/de-provisioning
- Source topic: `Password Vaulting`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer beschreibt den Password Vault als Clearingstelle, die primäre Zugangsdaten nie herausgibt. Das Cram-Video ergänzt das Auschecken privilegierter Zugangsdaten bei Bedarf, auch für Notfälle.

### 4.6 > PAM tools > Ephemeral credentials
`req:sy0701:v7:4.6:privileged-access-management-tools:ephemeral-credentials`

**possibleQuestion1**

- Question: What are ephemeral credentials used for?
- A. to provide temporary access to systems often with an expiration time
- B. Just-in-time permissions
- C. Password vaulting
- D. Provisioning/de-provisioning
- Correct answer: to provide temporary access to systems often with an expiration time
- Distractors: Just-in-time permissions | Password vaulting | Provisioning/de-provisioning
- Source topic: `Ephemeral Credentials`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer erklärt, dass der JIT-Prozess vorübergehende, nach Sitzungsende gelöschte Zugangsdaten erzeugt. Das Cram-Video betont das kurze Ablaufzeitfenster, das unbefugten Zugriff minimiert.

## Objective 4.7

### 4.7 > Use cases > User provisioning
`req:sy0701:v7:4.7:use-cases-of-automation-and-scripting:user-provisioning`

**possibleQuestion1**

- Question: What is the goal of user provisioning in an organization?
- A. to assign appropriate access rights and permissions to users based on their roles
- B. to create backup accounts for employees in case they forget their credentials
- C. to monitor users behavior and generate security reports
- D. to remove all permissions for users
- Correct answer: to assign appropriate access rights and permissions to users based on their roles
- Distractors: to create backup accounts for employees in case they forget their credentials | to monitor users behavior and generate security reports | to remove all permissions for users
- Source topic: `User Provisioning`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt automatisiertes On-/Offboarding: Skripte legen Konten an und weisen Standard-Ressourcenzugriff zu. Das Cram-Video ergänzt, dass Automatisierung beider Lebenszyklus-Enden Zugriffskontrolle konsistent hält und Least Privilege wahrt.

### 4.7 > Use cases > Resource provisioning
`req:sy0701:v7:4.7:use-cases-of-automation-and-scripting:resource-provisioning`

**possibleQuestion1**

- Question: What is the purpose of resource provisioning in IT security?
- A. to allocate and manage resources like storage and servers
- B. User provisioning
- C. Guard rails
- D. Security groups
- Correct answer: to allocate and manage resources like storage and servers
- Distractors: User provisioning | Guard rails | Security groups
- Source topic: `Resource Provisioning`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer nennt den Begriff nicht eigenständig, nur im Onboarding-Kontext. Das Cram-Video behandelt es explizit: Automatisierung erstellt/entsorgt Ressourcen wie VMs und reduziert Configuration Drift.

### 4.7 > Use cases > Guard rails
`req:sy0701:v7:4.7:use-cases-of-automation-and-scripting:guard-rails`

**possibleQuestion1**

- Question: What are the guard rails in the context of security operations?
- A. Physical barriers designed to protect the organization's hardware from external threats
- B. temporary settings applied to control user behavior
- C. controls that block all external traffic to the network
- D. predefined policies that prevent harmful actions while allowing flexibility
- Correct answer: predefined policies that prevent harmful actions while allowing flexibility
- Distractors: Physical barriers designed to protect the organization's hardware from external threats | temporary settings applied to control user behavior | controls that block all external traffic to the network
- Source topic: `Guard Rails`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt Guardrails als automatisierte Eingabeprüfung, die Schaden am Zielsystem verhindert. Das Cram-Video betont richtlinienbasierte Cloud-Guardrails gegen zu große Ressourcen mit Exception-Prozess.

### 4.7 > Use cases > Security groups
`req:sy0701:v7:4.7:use-cases-of-automation-and-scripting:security-groups`

**possibleQuestion1**

- Question: What is the purpose of security groups in identity management?
- A. to group users with similar security needs to simplify management
- B. to monitor and track user activities across systems
- C. to assign individual permissions to each user manually
- D. to enforce encryption standards for each group individually based on business needs
- Correct answer: to group users with similar security needs to simplify management
- Distractors: to monitor and track user activities across systems | to assign individual permissions to each user manually | to enforce encryption standards for each group individually based on business needs
- Source topic: `Security Groups`
- Option source: transcript
- Mapping confidence: high

Messer empfiehlt automatisierte Gruppenpflege mit Alarm bei Admin-Gruppen-Aufnahme. Das Cram-Video hebt hervor, dass dies Permission Creep bei Rollenwechseln verhindert.

### 4.7 > Use cases > Ticket creation
`req:sy0701:v7:4.7:use-cases-of-automation-and-scripting:ticket-creation`

**possibleQuestion1**

- Question: What is the role of ticket creation in a security incident management process?
- A. to document and track security issues for resolution and auditing
- B. User provisioning
- C. Resource provisioning
- D. Guard rails
- Correct answer: to document and track security issues for resolution and auditing
- Distractors: User provisioning | Resource provisioning | Guard rails
- Source topic: `Ticket-Erstellung`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer nennt automatische Umwandlung von E-Mails in zugewiesene Tickets als Helpdesk-Beispiel. Das Cram-Video ordnet Ticketerstellung als Auslöser des Incident-Response-Prozesses ein.

### 4.7 > Use cases > Escalation
`req:sy0701:v7:4.7:use-cases-of-automation-and-scripting:escalation`

**possibleQuestion1**

- Question: What is the purpose of escalation in incident response to escalate incidents to authorities or specialized teams when necessary?
- A. to escalate incidents to authorities or specialized teams when necessary
- B. User provisioning
- C. Resource provisioning
- D. Guard rails
- Correct answer: to escalate incidents to authorities or specialized teams when necessary
- Distractors: User provisioning | Resource provisioning | Guard rails
- Source topic: `Eskalation`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer beschreibt automatische Eskalation an Techniker, wenn ein Skript ein Problem nicht selbst lösen kann. Das Cram-Video beschreibt regelbasiertes Routing an zuständige Teams zur Verkürzung der Reaktionszeit.

### 4.7 > Use cases > Enabling/disabling services
`req:sy0701:v7:4.7:use-cases-of-automation-and-scripting:enabling-disabling-services-and-access`

**possibleQuestion1**

- Question: What does enabling or disabling services and access mean in security operations?
- A. The manual process of resetting user passwords for all employees
- B. The use of encryption to protect access to sensitive information
- C. the process of granting or revoking access to services based on policies and roles
- D. the blocking of all external network connections to improve security and access
- Correct answer: the process of granting or revoking access to services based on policies and roles
- Distractors: The manual process of resetting user passwords for all employees | The use of encryption to protect access to sensitive information | the blocking of all external network connections to improve security and access
- Source topic: `Dienste/Zugriff (de)aktivieren`
- Option source: transcript
- Mapping confidence: high

Messer illustriert dies mit zeitlich befristeter Diensteaktivierung ohne menschliches Zutun. Das Cram-Video fasst es breiter als Härtungsmaßnahme mit templatisierten Skripten.

### 4.7 > Use cases > CI and testing
`req:sy0701:v7:4.7:use-cases-of-automation-and-scripting:continuous-integration-and-testing`

Messer streift dies nur kurz als automatisches Ausrollen von Code-Updates. Das Cram-Video nennt Automatisierung als Pflicht für CI/CD, damit Schwachstellen nicht in die Produktion gelangen.

### 4.7 > Use cases > Integrations/APIs
`req:sy0701:v7:4.7:use-cases-of-automation-and-scripting:integrations-and-application-programming-interfa`

**possibleQuestion1**

- Question: How do integrations in application programming interfaces or APIs contribute to security operations?
- A. They store sensitive user credentials for secure access to applications
- B. they enable security tools to communicate and share data
- C. They block on block unauthorized access to web services and applications
- D. they encrypt all communication between systems to prevent data leaks
- Correct answer: they enable security tools to communicate and share data
- Distractors: They store sensitive user credentials for secure access to applications | They block on block unauthorized access to web services and applications | they encrypt all communication between systems to prevent data leaks
- Source topic: `API-Integrationen`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does API stand for?
- A. Application program interaction
- B. automated process interface
- C. Application Programming Interface
- D. advanced protocol interface
- Correct answer: Application Programming Interface
- Distractors: Application program interaction | automated process interface | advanced protocol interface
- Source topic: `Akronym API`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt, dass Automatisierung Geräte direkt über APIs programmatisch steuert statt manueller Anmeldung. Das Cram-Video ergänzt Echtzeit-Orchestrierung und standardbasierte APIs (REST) als Auswahlkriterium.

### 4.7 > Benefits > Efficiency/time saving
`req:sy0701:v7:4.7:benefits:efficiency-time-saving`

**possibleQuestion1**

- Question: How does automation contribute to time savings in security operations?
- A. By eliminating by eliminating the need for security audits
- B. By increasing the number of alerts that need to be manually reviewed
- C. by streamlining repetitive tasks such as patch management and log analysis
- D. by decreasing system performance to allow more time for security tasks
- Correct answer: by streamlining repetitive tasks such as patch management and log analysis
- Distractors: By eliminating by eliminating the need for security audits | By increasing the number of alerts that need to be manually reviewed | by decreasing system performance to allow more time for security tasks
- Source topic: `Zeitersparnis durch Automatisierung`
- Option source: transcript
- Mapping confidence: high
- Quality flags: near-duplicate

**possibleQuestion2**

- Question: What is a key benefit of automation in security operations?
- A. It increases efficiency by reducing manual operations
- B. It makes security management more complex and timeconuming
- C. It completely removes the need for security personnel
- D. it decreases the importance of monitoring network traffic
- Correct answer: It increases efficiency by reducing manual operations
- Distractors: It makes security management more complex and timeconuming | It completely removes the need for security personnel | it decreases the importance of monitoring network traffic
- Source topic: `Nutzen Automatisierung`
- Option source: transcript
- Mapping confidence: high

Messer betont fehlerfreie, beliebig wiederholbare Skriptausführung als Zeitersparnis. Das Cram-Video ergänzt die ROI-Überlegung: Zeitaufwand der Aufgabe vs. Automatisierungsaufwand.

### 4.7 > Benefits > Enforcing baselines
`req:sy0701:v7:4.7:benefits:enforcing-baselines`

**possibleQuestion1**

- Question: Why is enforcing baselines important in security operations?
- A. it ensures secure consistent system and network configurations organizationwide
- B. Efficiency/time saving
- C. Standard infrastructure configurations
- D. Scaling securely
- Correct answer: it ensures secure consistent system and network configurations organizationwide
- Distractors: Efficiency/time saving | Standard infrastructure configurations | Scaling securely
- Source topic: `Baselines durchsetzen`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messers Beispiel ist ein Skript, das neue Patches erkennt und automatisch ausrollt. Das Cram-Video beschreibt konsistente Durchsetzung über die Infrastruktur mit schnellem Erkennen von Abweichungen.

### 4.7 > Benefits > Standard infrastructure configurations
`req:sy0701:v7:4.7:benefits:standard-infrastructure-configurations`

**possibleQuestion1**

- Question: How do standard infrastructure configurations improve security?
- A. it ensures uniform system configurations to simplify security management
- B. Efficiency/time saving
- C. Enforcing baselines
- D. Scaling securely
- Correct answer: it ensures uniform system configurations to simplify security management
- Distractors: Efficiency/time saving | Enforcing baselines | Scaling securely
- Source topic: `Standardkonfigurationen`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer berichtet von Skripten, die viele Systeme identisch aufsetzen, z.B. Standard-Router-Konfigurationen. Das Cram-Video ergänzt Beispiele von einfacher VM-Konfiguration bis Kubernetes-Clustern.

### 4.7 > Benefits > Scaling securely
`req:sy0701:v7:4.7:benefits:scaling-in-a-secure-manner`

**possibleQuestion1**

- Question: Which of the following is a key consideration when handling data securely?
- A. applied based on data sensitivity
- B. allowing unrestricted access to all data for ease of use
- C. avoiding data backups to reduce storage costs
- D. disabling authentication requirements for faster data retrieval is a key consideration when handling data securely
- Correct answer: applied based on data sensitivity
- Distractors: allowing unrestricted access to all data for ease of use | avoiding data backups to reduce storage costs | disabling authentication requirements for faster data retrieval is a key consideration when handling data securely
- Source topic: `sicheres Skalieren`
- Option source: transcript
- Mapping confidence: high

Messer warnt, dass Skalierungsskripte auch Firewalls und Sicherheitsgeräte einbeziehen müssen. Das Cram-Video ergänzt, dass Sicherheitsmaßnahmen konsistent bleiben, ohne dass Personal mitwachsen muss.

### 4.7 > Benefits > Employee retention
`req:sy0701:v7:4.7:benefits:employee-retention`

**possibleQuestion1**

- Question: What role does employee retention play in cyber security?
- A. retained
- B. Efficiency/time saving
- C. Enforcing baselines
- D. Standard infrastructure configurations
- Correct answer: retained
- Distractors: Efficiency/time saving | Enforcing baselines | Standard infrastructure configurations
- Source topic: `Mitarbeiterbindung`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high
- Quality flags: distractor-issue

Messer argumentiert, Automatisierung befreie IT-Mitarbeiter von langweiligen Routineaufgaben. Das Cram-Video verknüpft dies explizit mit höheren Verbleibquoten und Arbeitszufriedenheit.

### 4.7 > Benefits > Reaction time
`req:sy0701:v7:4.7:benefits:reaction-time`

**possibleQuestion1**

- Question: Why is a fast reaction time important in security incident management?
- A. a quick response helps to mitigate the impact of security incidents
- B. A fast reaction time can lead to incorrect decisions and larger breaches
- C. A delayed reaction time increases the cost of security tools
- D. a rapid response is unnecessary if the incident is not immediately affecting the system
- Correct answer: a quick response helps to mitigate the impact of security incidents
- Distractors: A fast reaction time can lead to incorrect decisions and larger breaches | A delayed reaction time increases the cost of security tools | a rapid response is unnecessary if the incident is not immediately affecting the system
- Source topic: `Reaktionszeit`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt Dauerüberwachung mit sofortiger automatischer Behebung rund um die Uhr. Das Cram-Video ergänzt teilautomatisierte Reaktionsverbesserung durch schnellere Erkennung.

### 4.7 > Benefits > Workforce multiplier
`req:sy0701:v7:4.7:benefits:workforce-multiplier`

**possibleQuestion1**

- Question: What is a workforce multiplier in the context of security operations?
- A. Increasing the number of security staff to handle security tasks manually
- B. Deploying a larger number of non-technical personnel to manage security tools
- C. using tools and automation to extend the abilities of a limited security team
- D. allowing employees to perform security related tasks without training
- Correct answer: using tools and automation to extend the abilities of a limited security team
- Distractors: Increasing the number of security staff to handle security tasks manually | Deploying a larger number of non-technical personnel to manage security tools | allowing employees to perform security related tasks without training
- Source topic: `Workforce Multiplier`
- Option source: transcript
- Mapping confidence: high

Den Begriff nennt Messer nicht; sinngemäß entspricht ihm, dass Skripte manuelle Überwachung ersetzen. Das Cram-Video definiert ihn ausdrücklich: mehr Systeme betreuen ohne zusätzliches Personal.

### 4.7 > Other considerations > Complexity
`req:sy0701:v7:4.7:other-considerations:complexity`

**possibleQuestion1**

- Question: Why is complexity an important consideration in security operations?
- A. Complexity makes it easier to predict and automate system behaviors
- B. greater complexity makes systems harder to manage and more vulnerable
- C. Complex systems are typically more secure due to their size and infrastructure
- D. Or complexity improves the speed of incident response
- Correct answer: greater complexity makes systems harder to manage and more vulnerable
- Distractors: Complexity makes it easier to predict and automate system behaviors | Complex systems are typically more secure due to their size and infrastructure | Or complexity improves the speed of incident response
- Source topic: `Komplexität`
- Option source: transcript
- Mapping confidence: high

Messer weist auf hohen Testaufwand wegen des Zusammenspiels mit anderen Systemen hin. Das Cram-Video ergänzt, dass unternehmensweite Automatisierung Monate bis Jahre braucht.

### 4.7 > Other considerations > Cost
`req:sy0701:v7:4.7:other-considerations:cost`

**possibleQuestion1**

- Question: What is a critical factor to consider when evaluating the cost of a security solution?
- A. balance security benefits with implementation and maintenance costs
- B. only the initial setup cost of the solution ignoring long-term expenses
- C. the size of the security team needed to monitor the solution after implementation
- D. the geographic location of the vendor providing the security solution
- Correct answer: balance security benefits with implementation and maintenance costs
- Distractors: only the initial setup cost of the solution ignoring long-term expenses | the size of the security team needed to monitor the solution after implementation | the geographic location of the vendor providing the security solution
- Source topic: `Kostenbewertung`
- Option source: transcript
- Mapping confidence: high

Messer betont, dass jemand die Skripte schreiben muss, was Zeit kostet. Das Cram-Video ergänzt Anfangsinvestitionen in Tools und laufende SaaS-Kosten, die Ersparnis auffressen können.

### 4.7 > Other considerations > Single point of failure
`req:sy0701:v7:4.7:other-considerations:single-point-of-failure`

**possibleQuestion1**

- Question: What is the risk of having a single point of failure in a network or system?
- A. Single points of failure are easier to secure because there's only one component to manage
- B. A single point of failure increases the redundancy of critical systems
- C. failure of a single component can disrupt service affecting security and availability
- D. Or single points of failure are only a concern for physical hardware not digital systems
- Correct answer: failure of a single component can disrupt service affecting security and availability
- Distractors: Single points of failure are easier to secure because there's only one component to manage | A single point of failure increases the redundancy of critical systems | Or single points of failure are only a concern for physical hardware not digital systems
- Source topic: `Single Point of Failure`
- Option source: transcript
- Mapping confidence: high

Messer stellt fest, dass ein Skript selbst zum Single Point of Failure werden kann. Das Cram-Video verlagert den Fokus auf Abhängigkeit von einer einzelnen Automatisierungsplattform.

### 4.7 > Other considerations > Technical debt
`req:sy0701:v7:4.7:other-considerations:technical-debt`

**possibleQuestion1**

- Question: What is technical debt in the context of security?
- A. the accumulated cost of delaying updates or improvements increasing future challenges
- B. Complexity
- C. Single point of failure
- D. Ongoing supportability
- Correct answer: the accumulated cost of delaying updates or improvements increasing future challenges
- Distractors: Complexity | Single point of failure | Ongoing supportability
- Source topic: `Technische Schuld`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer beschreibt technische Schulden als Symptom- statt Ursachenbehebung durch ein Skript. Das Cram-Video sieht die Ursache in Werkzeug-Evolution: Skripte müssen mitgepflegt werden.

### 4.7 > Other considerations > Ongoing supportability
`req:sy0701:v7:4.7:other-considerations:ongoing-supportability`

**possibleQuestion1**

- Question: Why is ongoing supportability important in the context of security systems?
- A. updated and maintained to handle emerging threats
- B. It reduces the need for compliance audits and regulations
- C. Supportability allows the organization to completely automate its security processes without human oversight
- D. ongoing support ensures that all employees are trained
- Correct answer: updated and maintained to handle emerging threats
- Distractors: It reduces the need for compliance audits and regulations | Supportability allows the organization to completely automate its security processes without human oversight | ongoing support ensures that all employees are trained
- Source topic: `Supportability`
- Option source: transcript
- Mapping confidence: high

Messer weist darauf hin, dass Skripte bei OS- oder Sprachänderungen dauerhaft angepasst werden müssen. Das Cram-Video ergänzt Training, Dokumentation und Monitoring als Wartungsbestandteile.

## Objective 4.8

### 4.8 > Process > Preparation
`req:sy0701:v7:4.8:process:preparation`

Messer beschreibt Vorbereitung als alles vor dem Vorfall: Kontaktlisten, „Incident Go Bag", Referenzmaterial und Richtlinien nach NIST SP 800-61. Das Cram-Video fasst die Phase knapper: IR-Pläne schreiben, Konfigurationen dokumentieren, Team aufstellen.

### 4.8 > Process > Detection
`req:sy0701:v7:4.8:process:detection`

**possibleQuestion1**

- Question: Which action is typically performed during the detection phase of an incident response?
- A. Identify the root cause of the incident
- B. analyze system logs and alerts
- C. Contain the spread of the incident
- D. restore systems to their normal state
- Correct answer: analyze system logs and alerts
- Distractors: Identify the root cause of the incident | Contain the spread of the incident | restore systems to their normal state
- Source topic: `IR-Phase Detection`
- Option source: transcript
- Mapping confidence: high

Messer betont, echte Kompromittierungen von Scan-Rauschen zu trennen, mit Logs und IPS-Meldungen als Quellen. Das Cram-Video ergänzt die Werkzeugebene: SIEM, SOAR, XDR, IDS/IPS und UEBA.

### 4.8 > Process > Analysis
`req:sy0701:v7:4.8:process:analysis`

**possibleQuestion1**

- Question: What is the main objective of the analysis phase in incident response?
- A. to understand the impact and scope of the incident
- B. Preparation
- C. Detection
- D. Containment
- Correct answer: to understand the impact and scope of the incident
- Distractors: Preparation | Detection | Containment
- Source topic: `IR-Phase Analysis`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer behandelt „Analysis" nicht als eigene Phase, nur in der NIST-Aufzählung; inhaltlich am nächsten liegt der Sandbox-Abschnitt. Das Cram-Video definiert die Phase klar: prüfen, ob wirklich ein Vorfall vorliegt, inklusive Triage.

### 4.8 > Process > Containment
`req:sy0701:v7:4.8:process:containment`

Bei Messer nur in der Phasenliste benannt; sachlich entspricht es dem schnellen Stoppen eines laufenden Angriffs. Das Cram-Video liefert die Definition: Schaden begrenzen, z.B. infizierten Host vom Netz trennen.

### 4.8 > Process > Eradication
`req:sy0701:v7:4.8:process:eradication`

**possibleQuestion1**

- Question: What is the goal of the eradication phase in incident response?
- A. to remove any malicious code and vulnerabilities
- B. Preparation
- C. Detection
- D. Analysis
- Correct answer: to remove any malicious code and vulnerabilities
- Distractors: Preparation | Detection | Analysis
- Source topic: `IR-Phase Eradication`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer verwendet den Begriff nur in der NIST-Liste, packt die Inhalte in seinen „Recovery Mode": Schadsoftware entfernen, Konten deaktivieren. Das Cram-Video definiert Eradication als Entfernen aller Artefakte bis zum vollständigen Wipe.

### 4.8 > Process > Recovery
`req:sy0701:v7:4.8:process:recovery`

**possibleQuestion1**

- Question: Which of the following is a key action in the recovery phase of incident response?
- A. Isolate affected systems from the network
- B. Analyze the attack to determine its scope
- C. Restore systems and services to normal operations
- D. remove malicious actors from the network
- Correct answer: Restore systems and services to normal operations
- Distractors: Isolate affected systems from the network | Analyze the attack to determine its scope | remove malicious actors from the network
- Source topic: `IR-Phase Recovery`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt Recovery als Backup-Rückspielung oder Neuinstallation mit Abdichten gegen Rückkehr. Das Cram-Video formuliert es als Rückkehr in den Normalbetrieb unter Adressierung der Grundursache.

### 4.8 > Process > Lessons learned
`req:sy0701:v7:4.8:process:lessons-learned`

Messer verankert dies im zeitnahen Post-Incident-Meeting mit klaren Leitfragen. Das Cram-Video ordnet der Phase zusätzlich die Root-Cause-Analyse mit Folgen für Dokumentation und Training zu.

### 4.8 > Training
`req:sy0701:v7:4.8:training`

**possibleQuestion1**

- Question: What is the primary purpose of training in security operations?
- A. to test the effectiveness of security policies
- B. to ensure employees understand their role in security
- C. to create new security technologies
- D. to improve response time during an incident
- Correct answer: to ensure employees understand their role in security
- Distractors: to test the effectiveness of security policies | to create new security technologies | to improve response time during an incident
- Source topic: `Training`
- Option source: transcript
- Mapping confidence: high

Messer betont, dass Training vor dem Vorfall abgeschlossen sein muss, „on-the-job"-Training ist zu spät. Das Cram-Video ergänzt, dass ein IR-Team aus Fachleuten verschiedener Bereiche mit intensivem Training besteht.

### 4.8 > Testing > Tabletop exercise
`req:sy0701:v7:4.8:testing:tabletop-exercise`

**possibleQuestion1**

- Question: What is the primary goal of a tabletop exercise in security testing?
- A. to evaluate the response plan's effectiveness
- B. Simulation
- C. Preparation
- D. Detection
- Correct answer: to evaluate the response plan's effectiveness
- Distractors: Simulation | Preparation | Detection
- Source topic: `Tabletop-Übung`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer stellt die Tabletop-Übung als kostengünstige Vorstufe zum vollständigen Drill dar, ohne Produktionssysteme anzufassen. Das Cram-Video ergänzt den Ablauf mit vorab verteilten Plankopien und dem Koordinator, der das Szenario enthüllt.

### 4.8 > Testing > Simulation
`req:sy0701:v7:4.8:testing:simulation`

**possibleQuestion1**

- Question: Which of the following best describes a simulation in security operations testing?
- A. A theoretical discussion about handling a cyber attack
- B. a live exercise to test security systems against attacks
- C. a review of past incidents to improve response procedures
- D. a written test to assess individual security knowledge
- Correct answer: a live exercise to test security systems against attacks
- Distractors: A theoretical discussion about handling a cyber attack | a review of past incidents to improve response procedures | a written test to assess individual security knowledge
- Source topic: `Definition Simulation`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: Which activity is performed during testing in security operations?
- A. creating incident response plans
- B. real-time simulations of breaches
- C. designing security policies
- D. analyzing historical security data
- Correct answer: real-time simulations of breaches
- Distractors: creating incident response plans | designing security policies | analyzing historical security data
- Source topic: `Aktivität beim Testing`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt Simulation als tatsächlich durchgeführten Testangriff wie Phishing-Mails an die Belegschaft. Das Cram-Video grenzt ab: einzelne Reaktionsmaßnahmen werden an nicht-kritischen Funktionen wirklich ausgeführt.

### 4.8 > Root cause analysis
`req:sy0701:v7:4.8:root-cause-analysis`

**possibleQuestion1**

- Question: What is the purpose of root cause analysis in incident response?
- A. to identify the source of a security incident
- B. to conduct real-time security testing
- C. to analyze the consequences of a cyber attack to recover lost
- D. damaged data The purpose of a root cause analysis in incident response
- Correct answer: to identify the source of a security incident
- Distractors: to conduct real-time security testing | to analyze the consequences of a cyber attack to recover lost | damaged data The purpose of a root cause analysis in incident response
- Source topic: `Root Cause Analysis`
- Option source: transcript
- Mapping confidence: high

Messer erklärt, dass ein Vorfall aus vielen kleineren Ereignissen besteht und oft mehrere statt einer Ursache hat, auch menschliche Fehler. Das Cram-Video ergänzt einen Bericht mit umsetzbaren Empfehlungen für Stakeholder.

### 4.8 > Threat hunting
`req:sy0701:v7:4.8:threat-hunting`

**possibleQuestion1**

- Question: Which of the following best describes threat hunting?
- A. Monitoring systems for known security vulnerabilities from external sources
- B. the process uh the proactive search for potential threats and security breaches
- C. performing vulnerability assessments on networks
- D. a process of patching vulnerabilities as they arise
- Correct answer: the process uh the proactive search for potential threats and security breaches
- Distractors: Monitoring systems for known security vulnerabilities from external sources | performing vulnerability assessments on networks | a process of patching vulnerabilities as they arise
- Source topic: `Threat Hunting`
- Option source: transcript
- Mapping confidence: high

Messer fasst Threat Hunting als proaktives Auffinden von Schwachstellen vor dem Angreifer zusammen. Das Cram-Video setzt den Akzent auf „Presumption of Compromise" und externe Threat Intelligence (Advisories vs. Bulletins).

### 4.8 > Digital forensics > Legal hold
`req:sy0701:v7:4.8:digital-forensics:legal-hold`

**possibleQuestion1**

- Question: What is the purpose of a legal hold in digital forensics?
- A. to preserve evidence by preventing data deletion or alteration
- B. Chain of custody
- C. Acquisition
- D. Reporting
- Correct answer: to preserve evidence by preventing data deletion or alteration
- Distractors: Chain of custody | Acquisition | Reporting
- Source topic: `Legal Hold`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer beschreibt den Legal Hold als anwaltlich ausgelöste Aufbewahrungspflicht, verwaltet vom Data Custodian. Das Cram-Video ergänzt Write-Protect/Legal Hold in der Cloud zur Unveränderlichkeit.

### 4.8 > Digital forensics > Chain of custody
`req:sy0701:v7:4.8:digital-forensics:chain-of-custody`

**possibleQuestion1**

- Question: What is the chain of custody referred to in digital forensics?
- A. The process of collecting evidence from multiple sources
- B. the chronological documentation of the possession of evidence
- C. the process of securely transporting evidence to court
- D. the technical tools used to analyze the evidence
- Correct answer: the chronological documentation of the possession of evidence
- Distractors: The process of collecting evidence from multiple sources | the process of securely transporting evidence to court | the technical tools used to analyze the evidence
- Source topic: `Chain of Custody`
- Option source: transcript
- Mapping confidence: high

Messer begründet die Chain of Custody mit unveränderten Daten trotz mehrerer Zugriffe, digital via Hashes belegt. Das Cram-Video ergänzt die zu dokumentierenden Felder und die Konsequenz bei Unterbrechung: Beweismittel wird meist verworfen.

### 4.8 > Digital forensics > Acquisition
`req:sy0701:v7:4.8:digital-forensics:acquisition`

Messer nennt Datenträger, Speicher und Logs als Quellen, oft an unauffälligen Orten. Das Cram-Video ergänzt die Order of Volatility als Reihenfolgeregel für die Sicherung.

### 4.8 > Digital forensics > Reporting
`req:sy0701:v7:4.8:digital-forensics:reporting`

**possibleQuestion1**

- Question: What is the main purpose of reporting in digital forensics?
- A. to detail how evidence was acquired and analyzed
- B. to present the evidence in a court of law
- C. to prevent evidence tampering during investigations
- D. to summarize the legal hold process
- Correct answer: to detail how evidence was acquired and analyzed
- Distractors: to present the evidence in a court of law | to prevent evidence tampering during investigations | to summarize the legal hold process
- Source topic: `Forensik-Reporting`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt den Bericht als Pflichtdokumentation des gesamten Erhebungswegs zur Integritätsprüfung. Das Cram-Video nennt typische Bestandteile: Executive Summary, Tool-Liste, Befunde, Empfehlungen.

### 4.8 > Digital forensics > Preservation
`req:sy0701:v7:4.8:digital-forensics:preservation`

**possibleQuestion1**

- Question: What does preservation of digital evidence ensure in digital forensics?
- A. The destruction and of s the destruction of sensitive data during investigations
- B. the integrity and authenticity of evidence over time
- C. the transfer of evidence to an external party
- D. the reporting of evidence to law enforcement
- Correct answer: the integrity and authenticity of evidence over time
- Distractors: The destruction and of s the destruction of sensitive data during investigations | the transfer of evidence to an external party | the reporting of evidence to law enforcement
- Source topic: `Preservation`
- Option source: transcript
- Mapping confidence: high

Messer stellt heraus, dass man mit Kopien arbeitet und bei Mobilgeräten wegen Fernlöschung besonders vorsichtig sein muss. Das Cram-Video ergänzt WORM-Medien, unveränderlichen Cloud-Speicher und Hash-Vergleiche.

### 4.8 > Digital forensics > E-discovery
`req:sy0701:v7:4.8:digital-forensics:e-discovery`

**possibleQuestion1**

- Question: What is the focus of eiscocovery in digital forensics?
- A. the search and retrieval of relevant digital evidence for legal cases
- B. The preservation of digital of digital evidence during an investigation
- C. the identification of data breaches in enterprise systems
- D. the creation of new security policies based on forensic findings
- Correct answer: the search and retrieval of relevant digital evidence for legal cases
- Distractors: The preservation of digital of digital evidence during an investigation | the identification of data breaches in enterprise systems | the creation of new security policies based on forensic findings
- Source topic: `E-Discovery`
- Option source: transcript
- Mapping confidence: high

Messer definiert E-Discovery als reine Beschaffung ohne Analyseanspruch. Das Cram-Video nennt die längere Prozesskette und grenzt E-Discovery-Firmen von spezialisierten Forensikern ab.

## Objective 4.9

### 4.9 > Log data > Firewall logs
`req:sy0701:v7:4.9:log-data:firewall-logs`

**possibleQuestion1**

- Question: Which of the following is most commonly found in firewall logs?
- A. User login details
- B. traffic blocked or allowed based on security rules
- C. file transfers and email metadata
- D. network vulnerabilities detected during scans
- Correct answer: traffic blocked or allowed based on security rules
- Distractors: User login details | file transfers and email metadata | network vulnerabilities detected during scans
- Source topic: `Firewall-Logs`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt die Firewall als detailreichste Log-Quelle mit Quell-/Ziel-IP, Ports und Entscheidung, NGFW zusätzlich mit Anwendung. Das Cram-Video ergänzt, dass auch interner Ost-West-Verkehr erfasst wird, sofern er die Firewall passiert.

### 4.9 > Log data > Application logs
`req:sy0701:v7:4.9:log-data:application-logs`

**possibleQuestion1**

- Question: What type of information is typically captured in application logs?
- A. Network traffic and connection details
- B. system errors and user access attempts
- C. user activities and application performance issues
- D. firewall rule application and exceptions
- Correct answer: user activities and application performance issues
- Distractors: Network traffic and connection details | system errors and user access attempts | firewall rule application and exceptions
- Source topic: `Application-Logs`
- Option source: transcript
- Mapping confidence: high

Messer nennt Windows Event Viewer und /var/log als Fundorte, zusammengeführt in einem SIEM. Das Cram-Video beschreibt Anwendungslogs als Aufzeichnung von Nutzeraktionen, Fehlern und Anomalien.

### 4.9 > Log data > Endpoint logs
`req:sy0701:v7:4.9:log-data:endpoint-logs`

**possibleQuestion1**

- Question: What is the primary function of endpoint logs in a security context?
- A. to monitor application performance to track user interactions with the operating system
- B. to record activities and events on user devices
- C. to capture network traffic across an entire organization
- D. Whereas the primary function of endpoint logs in a security context
- Correct answer: to record activities and events on user devices
- Distractors: to monitor application performance to track user interactions with the operating system | to capture network traffic across an entire organization | Whereas the primary function of endpoint logs in a security context
- Source topic: `Endpoint-Logs`
- Option source: transcript
- Mapping confidence: high

Messer nennt Login-, System- und Geräteverwaltungsprotokolle, korrelierbar im SIEM. Das Cram-Video zählt zusätzlich Server und VMs dazu und betont die Notwendigkeit der Zentralisierung.

### 4.9 > Log data > OS-specific security logs
`req:sy0701:v7:4.9:log-data:os-specific-security-logs`

**possibleQuestion1**

- Question: Which type of logs are specifically tailored to the security features of an operating system?
- A. Application program interface logs
- B. OS specific security logs
- C. network topology logs
- D. IPS IDS logs
- Correct answer: OS specific security logs
- Distractors: Application program interface logs | network topology logs | IPS IDS logs
- Source topic: `OS-spezifische Security-Logs`
- Option source: transcript
- Mapping confidence: high

Messer erklärt betriebssystemeigene Sicherheitsprotokolle für Brute-Force-Versuche und Authentifizierung, mit Warnung vor Datenflut. Das Cram-Video benennt Security Event Log (Windows) und Syslog (Linux) konkret.

### 4.9 > Log data > IPS/IDS logs
`req:sy0701:v7:4.9:log-data:ips-ids-logs`

**possibleQuestion1**

- Question: What is the purpose of IPS and IDS logs?
- A. to record malicious or suspicious activities detected
- B. Firewall logs
- C. Application logs
- D. Endpoint logs
- Correct answer: to record malicious or suspicious activities detected
- Distractors: Firewall logs | Application logs | Endpoint logs
- Source topic: `IPS/IDS-Logs`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer zeigt ein Snort-Beispiel mit Zeitstempel, Alarmklasse und Priorität. Das Cram-Video hebt hervor: IPS protokolliert blockierte Bedrohungen, IDS nur erkannte und alarmierte.

### 4.9 > Log data > Network logs
`req:sy0701:v7:4.9:log-data:network-logs`

**possibleQuestion1**

- Question: Which of the following is typically recorded in network logs?
- A. Malicious code detected by antivirus software
- B. user login and password attempts segmented by security group
- C. details of connections, protocols, and IP addresses
- D. file modifications and access times
- Correct answer: details of connections, protocols, and IP addresses
- Distractors: Malicious code detected by antivirus software | user login and password attempts segmented by security group | file modifications and access times
- Source topic: `Netzwerk-Logs`
- Option source: transcript
- Mapping confidence: high

Messer nennt Switches, Router, APs und VPN-Konzentratoren mit Beispiel eines blockierten SYN-Angriffs. Das Cram-Video ergänzt, dass die Protokollierung meist per Syslog an einen zentralen Server erfolgt.

### 4.9 > Log data > Metadata
`req:sy0701:v7:4.9:log-data:metadata`

**possibleQuestion1**

- Question: What does metadata in security logs provide information about?
- A. The contents of the data being accessed
- B. the who, what, where, and when of data interaction
- C. the data backup frequency and status
- D. the error rates of security tools and software
- Correct answer: the who, what, where, and when of data interaction
- Distractors: The contents of the data being accessed | the data backup frequency and status | the error rates of security tools and software
- Source topic: `Metadaten`
- Option source: transcript
- Mapping confidence: high

Messer zeigt vier Metadaten-Beispiele: E-Mail-Header, Fotos, Browser und Office-Dokumente. Das Cram-Video ergänzt Dateizeiten, Web-Meta-Tags und betont Log-Metadaten für SIEM-Korrelation.

### 4.9 > Data sources > Vulnerability scans
`req:sy0701:v7:4.9:data-sources:vulnerability-scans`

**possibleQuestion1**

- Question: What is the primary purpose of vulnerability scans in security operations?
- A. To monitor system performance in real time
- B. To analyze user behavior for potential threats
- C. to assess the integrity of security patches
- D. to identify security weaknesses and vulnerabilities
- Correct answer: to identify security weaknesses and vulnerabilities
- Distractors: To monitor system performance in real time | To analyze user behavior for potential threats | to assess the integrity of security patches
- Source topic: `Vulnerability Scans`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt Scan-Reports, die fehlende Firewalls und Fehlkonfigurationen aufdecken. Das Cram-Video ordnet Scans als ergänzende Quelle ein, ob ungepatchte Schwächen ausgenutzt wurden.

### 4.9 > Data sources > Automated reports
`req:sy0701:v7:4.9:data-sources:automated-reports`

**possibleQuestion1**

- Question: What is an advantage of using automated reports in security monitoring?
- A. They provide real-time user behavior analysis
- B. They help automate incident response actions for an organization
- C. they generate consistent timely analysis of security data
- D. they reduce the need for network vulnerability scans
- Correct answer: they generate consistent timely analysis of security data
- Distractors: They provide real-time user behavior analysis | They help automate incident response actions for an organization | they reduce the need for network vulnerability scans
- Source topic: `Automatisierte Reports`
- Option source: transcript
- Mapping confidence: high

Messer nennt das Problem, dass automatisierte Berichte oft ignoriert werden, und mahnt zur Balance zwischen Inhalt und Aufwand. Das Cram-Video sieht sie als High-Level-Überblick zur Priorisierung von Ermittlungen.

### 4.9 > Data sources > Dashboards
`req:sy0701:v7:4.9:data-sources:dashboards`

**possibleQuestion1**

- Question: What is the role of dashboards in security operations?
- A. to provide a visual interface for monitoring security metrics
- B. Vulnerability scans
- C. Automated reports
- D. Packet captures
- Correct answer: to provide a visual interface for monitoring security metrics
- Distractors: Vulnerability scans | Automated reports | Packet captures
- Source topic: `Dashboards`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer beschreibt Dashboards als Sofort-Zusammenfassung ohne Langzeitdaten, typisch für ein SOC. Das Cram-Video ergänzt die zentrale Sicht auf Sicherheitsmetriken, wobei Trends auf laufende Angriffe hindeuten.

### 4.9 > Data sources > Packet captures
`req:sy0701:v7:4.9:data-sources:packet-captures`

**possibleQuestion1**

- Question: What type of information is captured in packet captures?
- A. real-time user activity logs
- B. captured network traffic like headers and payloads
- C. system configuration and software vulnerability details
- D. application performance metrics and error reports
- Correct answer: captured network traffic like headers and payloads
- Distractors: real-time user activity logs | system configuration and software vulnerability details | application performance metrics and error reports
- Source topic: `Packet Captures`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does PCAP stand for?
- A. Packet Capture
- B. packet content analysis
- C. protocol capture
- D. packet communication analysis
- Correct answer: Packet Capture
- Distractors: packet content analysis | protocol capture | packet communication analysis
- Source topic: `PCAP-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer nennt Wireshark als Werkzeug für Mitschnitte bis auf Bit-/Byte-Ebene, mit einem HTTP-GET-Beispiel. Das Cram-Video betont die Bottom-up-Sicht auf Protokollebene, meist erst bei genauer Ursachenklärung eingesetzt.
