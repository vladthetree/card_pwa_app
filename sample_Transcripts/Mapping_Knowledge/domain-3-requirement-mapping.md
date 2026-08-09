# Domain 3 — Objectives ↔ Transkript-Mapping (destilliert)

105 Requirements, je mit destilliertem Inhalt aus Messers Einzellektion + Cram-Video.
1 davon mit ⚠ markiertem Quellenkonflikt (Messer und Cram-Video widersprechen sich inhaltlich).

## Objective 3.1

### 3.1 > Cloud > Responsibility matrix
`req:sy0701:v7:3.1:architecture-and-infrastructure-concepts:cloud:responsibility-matrix`

**possibleQuestion1**

- Question: What is the purpose of a responsibility matrix in cloud security?
- A. To enforce firewall rules for network segmentation
- B. to manage third-party vendor agreements for data processing
- C. to define security and operational responsibilities between cloud providers and customers
- D. to track access logs for all infrastructure components
- Correct answer: to define security and operational responsibilities between cloud providers and customers
- Distractors: To enforce firewall rules for network segmentation | to manage third-party vendor agreements for data processing | to track access logs for all infrastructure components
- Source topic: `Zweck der Responsibility Matrix`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does IaaS stand for?
- A. Internet as a service
- B. Infrastructure as a Service
- C. integrated as a service
- D. information as a service
- Correct answer: Infrastructure as a Service
- Distractors: Internet as a service | integrated as a service | information as a service
- Source topic: `IaaS-Cloud-Servicemodell`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion3**

- Question: What does PaaS stand for?
- A. Platform as a Service
- B. product as a service
- C. process as a service
- D. program as a service
- Correct answer: Platform as a Service
- Distractors: product as a service | process as a service | program as a service
- Source topic: `PaaS-Cloud-Servicemodell`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion4**

- Question: What does SaaS stand for?
- A. Software and services
- B. Software as a Service
- C. system as a service
- D. solutions as a service in cloud computing
- Correct answer: Software as a Service
- Distractors: Software and services | system as a service | solutions as a service in cloud computing
- Source topic: `SaaS-Cloud-Servicemodell`
- Option source: transcript
- Mapping confidence: high

Messer erklärt, dass öffentliche Cloud-Anbieter eine Verantwortungsmatrix bereitstellen, die je Servicemodell (SaaS, PaaS, IaaS, On-Premises) zeigt, was Kunde und Anbieter verantworten, teils mit geteilter Zuständigkeit; Konten und Identitäten bleiben immer beim Kunden. Das Cram-Video nennt dasselbe Konzept „Shared Responsibility Model", ordnet On-Prem/Private Cloud zu 100% dem Kunden zu und untermauert es mit Produktbeispielen (IaaS: Azure VMs, EC2; PaaS: Azure SQL; SaaS: Office 365, Salesforce).

### 3.1 > Cloud > Hybrid considerations
`req:sy0701:v7:3.1:architecture-and-infrastructure-concepts:cloud:hybrid-considerations`

**possibleQuestion1**

- Question: Which security concern is unique to hybrid cloud environments?
- A. ensuring secure data transfer between on premises and cloud resources
- B. Lack of encryption support for sensitive data
- C. Guaranteed automatic compliance with all regulations
- D. hybrid clouds prevent insider threats by design which is security concern is unique to hybrid cloud environments unique to hybrid cloud
- Correct answer: ensuring secure data transfer between on premises and cloud resources
- Distractors: Lack of encryption support for sensitive data | Guaranteed automatic compliance with all regulations | hybrid clouds prevent insider threats by design which is security concern is unique to hybrid cloud environments unique to hybrid cloud
- Source topic: `Hybrid-Cloud-spezifisches Risiko`
- Option source: transcript
- Mapping confidence: high

Messer versteht unter Hybrid Cloud die Nutzung mehrerer Cloud-Anbieter gleichzeitig: mehr Flexibilität, aber deutlich mehr Komplexität, weil Einstellungen je Anbieter separat gepflegt werden müssen und Log-Formate sich unterscheiden. Das Cram-Video definiert Hybrid Cloud enger als Kombination aus Public und Private Cloud und behandelt Mehr-Anbieter-Nutzung separat als Multicloud.

### 3.1 > Cloud > Third-party vendors
`req:sy0701:v7:3.1:architecture-and-infrastructure-concepts:cloud:third-party-vendors`

**possibleQuestion1**

- Question: What is a primary security risk associated with third-party vendors in an organization's infrastructure?
- A. Third-party vendors always follow the organization's internal security policies Using third-party vendors eliminates the need for security audits
- B. Vendors cannot access any part of an in organization's infrastructure
- C. vendors may have weak security practices that expose the organization to attacks
- D. Was a primary security risk associated with third-party vendors in an organization's infrastructure
- Correct answer: vendors may have weak security practices that expose the organization to attacks
- Distractors: Third-party vendors always follow the organization's internal security policies Using third-party vendors eliminates the need for security audits | Vendors cannot access any part of an in organization's infrastructure | Was a primary security risk associated with third-party vendors in an organization's infrastructure
- Source topic: `Risiko durch Drittanbieter`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does CSP stand for?
- A. Cloud security program
- B. cloud system provider
- C. Cloud Service Provider
- D. cloud software provider
- Correct answer: Cloud Service Provider
- Distractors: Cloud security program | cloud system provider | cloud software provider
- Source topic: `Akronym CSP`
- Option source: transcript
- Mapping confidence: high

Messer weist darauf hin, dass neben dem Cloud-Anbieter weitere Dritte im Spiel sind (z.B. eine Drittanbieter-Firewall); empfohlen werden Vendor-Risk-Management und laufendes Monitoring. Das Cram-Video betont, dass der Cloud-Anbieter selbst ein Drittanbieter ist, und stellt Multi-Tenancy-Isolation als Kernrisiko dar.

### 3.1 > Infrastructure as code (IaC)
`req:sy0701:v7:3.1:architecture-and-infrastructure-concepts:infrastructure-as-code-iac`

**possibleQuestion1**

- Question: Which security advantage does infrastructure as code or IaC provide?
- A. IA eliminates the need for network firewalls
- B. IaC enforces consistent security configurations across deployments
- C. IA prevents unauthorized access by default
- D. IA requires manual configuration of security policies for each deployment
- Correct answer: IaC enforces consistent security configurations across deployments
- Distractors: IA eliminates the need for network firewalls | IA prevents unauthorized access by default | IA requires manual configuration of security policies for each deployment
- Source topic: `Vorteil von IaC`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does IaC stand for?
- A. Integrated as code
- B. infrastructure and application control
- C. Infrastructure as Code
- D. information as code
- Correct answer: Infrastructure as Code
- Distractors: Integrated as code | infrastructure and application control | information as code
- Source topic: `IaC-Akronym`
- Option source: transcript
- Mapping confidence: high

Laut Messer beschreibt IaC eine Anwendungsinstanz als Code statt als konkrete Hardware, mit dem Vorteil jederzeitiger Reproduzierbarkeit derselben Infrastruktur bei beliebigen Cloud-Anbietern. Das Cram-Video ergänzt: IaC ist deklarativ (kennt den Ist-Zustand) und idempotent (mehrfache Anwendung führt zum gleichen Zielzustand), wodurch Configuration Drift sinkt.

### 3.1 > Serverless
`req:sy0701:v7:3.1:architecture-and-infrastructure-concepts:serverless`

**possibleQuestion1**

- Question: Which security challenge is associated with serverless computing?
- A. the lack of control over the underlying infrastructure and runtime environment
- B. The need for dedicated physical servers for each application
- C. Serverless applications cannot be exploited by attackers
- D. serverless environments eliminate the need for identity and access management which security challenge is associated with serverless computing
- Correct answer: the lack of control over the underlying infrastructure and runtime environment
- Distractors: The need for dedicated physical servers for each application | Serverless applications cannot be exploited by attackers | serverless environments eliminate the need for identity and access management which security challenge is associated with serverless computing
- Source topic: `Serverless-Herausforderung`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt Serverless als Architektur ohne eigene Server, bei der die Anwendung in autonome Funktionen zerlegt wird, die bei Bedarf erzeugt und wieder entfernt werden. Das Cram-Video ergänzt: Ressourcen sind zustandslos, Server ephemer, typischerweise triggerbar (Function as a Service, Pay-as-you-go), mit automatischer Skalierung.

### 3.1 > Microservices
`req:sy0701:v7:3.1:architecture-and-infrastructure-concepts:microservices`

**possibleQuestion1**

- Question: What is a key security consideration when using microervices architecture?
- A. securing API communication between services to prevent unauthorized access
- B. Infrastructure as code (IaC)
- C. Serverless
- D. On-premises
- Correct answer: securing API communication between services to prevent unauthorized access
- Distractors: Infrastructure as code (IaC) | Serverless | On-premises
- Source topic: `Microservices-Sicherheit`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer stellt die monolithische Anwendung der Microservice-Architektur gegenüber, bei der einzelne Dienste getrennt in der Cloud laufen und der Client über ein API-Gateway geleitet wird — Vorteile sind Skalierbarkeit und Resilienz. Das Cram-Video beschreibt Microservices als feingranulare, lose gekoppelte Codemodule mit je einer diskreten Funktion, die die Angriffsfläche auf die exponierte API reduzieren.

### 3.1 > Network infrastructure > Physical isolation > Air-gapped
`req:sy0701:v7:3.1:architecture-and-infrastructure-concepts:network-infrastructure:physical-isolation:air-gapped`

**possibleQuestion1**

- Question: Which security measure involves completely disconnecting a system from external networks to prevent cyber threats?
- A. air-gapped
- B. logical segmentation
- C. software-defined networking
- D. on premises
- Correct answer: air-gapped
- Distractors: logical segmentation | software-defined networking | on premises
- Source topic: `Begriff für völlige Trennung`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: Which of the following best describes a security concern with network infrastructure?
- A. Network infrastructure does not require monitoring for anomalies
- B. A strong password policy eliminates all network threats
- C. Using wired networks prevents all cyber attacks
- D. unauthorized access to critical network devices can lead to data breaches
- Correct answer: unauthorized access to critical network devices can lead to data breaches
- Distractors: Network infrastructure does not require monitoring for anomalies | A strong password policy eliminates all network threats | Using wired networks prevents all cyber attacks
- Source topic: `Nutzen physischer Isolation`
- Option source: transcript
- Mapping confidence: high

Messer erklärt den Air Gap als physische Trennung zweier Geräte ohne jede Verbindung — Nachteil ist schlechte Skalierung. Das Cram-Video definiert Air Gap als physische Isolation von allen externen Verbindungen inklusive Internet und nennt Finanzwesen, Medizingeräte und militärische/industrielle Steuerungssysteme als Einsatzfelder.

### 3.1 > Network infrastructure > Logical segmentation
`req:sy0701:v7:3.1:architecture-and-infrastructure-concepts:network-infrastructure:logical-segmentation`

**possibleQuestion1**

- Question: What does VLAN stand for?
- A. Virtual Local Area Network
- B. virtual line access network
- C. variable local area network
- D. virtual long-d distanceance area network in network segmentation
- Correct answer: Virtual Local Area Network
- Distractors: virtual line access network | variable local area network | virtual long-d distanceance area network in network segmentation
- Source topic: `VLAN-Akronym`
- Option source: transcript
- Mapping confidence: high

Bei Messer ist logische Segmentierung (VLANs) die skalierbare Alternative zur physischen Trennung. Das Cram-Video zählt zusätzlich VPNs, Virtual Routing and Forwarding und ACL-basierte Subnetze dazu und ordnet auch SDN dieser Kategorie zu.

### 3.1 > Network infrastructure > SDN
`req:sy0701:v7:3.1:architecture-and-infrastructure-concepts:network-infrastructure:software-defined-networking-sdn`

**possibleQuestion1**

- Question: How does software-defined networking or SDN improve network security?
- A. It eliminates the need for security monitoring and logging
- B. it centralizes network control making security policies easier to manage
- C. It guarantees guarantees complete immunity to network-based attacks
- D. it ensures that all physical network devices are disconnected
- Correct answer: it centralizes network control making security policies easier to manage
- Distractors: It eliminates the need for security monitoring and logging | It guarantees guarantees complete immunity to network-based attacks | it ensures that all physical network devices are disconnected
- Source topic: `SDN-Sicherheitsnutzen`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does SDN stand for?
- A. Software-Defined Networking
- B. secure data networking
- C. systematic data network
- D. softwaredriven network
- Correct answer: Software-Defined Networking
- Distractors: secure data networking | systematic data network | softwaredriven network
- Source topic: `SDN-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer zerlegt Netzwerkgeräte in Data Plane, Control Plane und Management Plane — diese Trennung erlaubt es, physische Geräte als Software nachzubilden. Das Cram-Video beschreibt SDN als zentral programmierbare Netzarchitektur (SD-LAN/SD-WAN) mit Northbound-/Southbound-Schnittstellen (OpenFlow) und nennt MITM/interne DoS als Risiken der Ebenen-Trennung.

### 3.1 > On-premises
`req:sy0701:v7:3.1:architecture-and-infrastructure-concepts:on-premises`

**possibleQuestion1**

- Question: Which of the following is a key security consideration for on premises or on-prem infrastructure?
- A. On-prem infrastructure eliminates the need for network firewalls
- B. Cloud security controls automatically apply to on-prem environments
- C. fully responsible for securing their hardware and data
- D. on-prem environments do not require physical security controls
- Correct answer: fully responsible for securing their hardware and data
- Distractors: On-prem infrastructure eliminates the need for network firewalls | Cloud security controls automatically apply to on-prem environments | on-prem environments do not require physical security controls
- Source topic: `On-Prem-Verantwortung`
- Option source: transcript
- Mapping confidence: high

Messer stellt heraus, dass bei eigenem Rechenzentrum volle Kontrolle über Daten und Systeme besteht, dem aber Kosten und Aufwand (Kühlung, Personal, Beschaffung) gegenüberstehen. Das Cram-Video ergänzt den Budgetaspekt: On-Prem bedeutet hohe Vorabinvestitionen (Capex), Cloud verschiebt zu nutzungsbasiertem Opex.

### 3.1 > Centralized vs. decentralized
`req:sy0701:v7:3.1:architecture-and-infrastructure-concepts:centralized-vs-decentralized`

**possibleQuestion1**

- Question: Which statement best describes a security benefit of centralized network management over decentralized management?
- A. centralized management allows for uniform security policies and easier monitoring
- B. Infrastructure as code (IaC)
- C. Serverless
- D. Microservices
- Correct answer: centralized management allows for uniform security policies and easier monitoring
- Distractors: Infrastructure as code (IaC) | Serverless | Microservices
- Source topic: `Zentral vs. dezentral`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer beschreibt, dass dezentrale Technik die Absicherung erschwert; Zentralisierung bringt bessere Sichtbarkeit, schafft aber einen Single Point of Failure. Das Cram-Video argumentiert über Standorte: zentral senkt Kosten, vergrößert aber den Ausfall-Impact, dezentral ist teurer, begrenzt aber diesen Impact.

### 3.1 > Containerization
`req:sy0701:v7:3.1:architecture-and-infrastructure-concepts:containerization`

**possibleQuestion1**

- Question: Which security advantage does containerization provide?
- A. It ensures that all applications run on the same physical server
- B. It prevents unauthorized physical access to data centers
- C. It eliminates the need for encryption in cloud environments
- D. it isolates applications to the limit uh to limit the impact of security breaches
- Correct answer: it isolates applications to the limit uh to limit the impact of security breaches
- Distractors: It ensures that all applications run on the same physical server | It prevents unauthorized physical access to data centers | It eliminates the need for encryption in cloud environments
- Source topic: `Vorteil Containerisierung`
- Option source: transcript
- Mapping confidence: high

Messer erklärt Containerisierung als Weg, mehrere Anwendungen auf einer Hardware zu betreiben (Docker), wobei Container sich das Host-Betriebssystem teilen — im Unterschied zur Virtualisierung mit eigenem Gast-OS pro VM. Das Cram-Video betont geteilte OS-Kernel-Nutzung als Effizienzgewinn und die Praxis mit Kubernetes.

### 3.1 > Virtualization
`req:sy0701:v7:3.1:architecture-and-infrastructure-concepts:virtualization`

**possibleQuestion1**

- Question: Where an attacker gains access to the host system?
- A. virtual machine escape where an attacker gains access to the host system
- B. Infrastructure as code (IaC)
- C. Serverless
- D. Microservices
- Correct answer: virtual machine escape where an attacker gains access to the host system
- Distractors: Infrastructure as code (IaC) | Serverless | Microservices
- Source topic: `Virtualisierungsrisiko`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion2**

- Question: What does VDI stand for?
- A. virtual data interface
- B. virtual desktop internet
- C. Virtual Desktop Infrastructure
- D. virtual device integration
- Correct answer: Virtual Desktop Infrastructure
- Distractors: virtual data interface | virtual desktop internet | virtual device integration
- Source topic: `VDI-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt Virtualisierung als Standard im Rechenzentrum: der Hypervisor verteilt Ressourcen zwischen VMs, jede mit eigenem Gast-OS. Das Cram-Video ergänzt VM Escape und VM Sprawl als Risiken sowie die Unterscheidung Typ-1-Bare-Metal- vs. Typ-2-Hosted-Hypervisor.

### 3.1 > IoT
`req:sy0701:v7:3.1:architecture-and-infrastructure-concepts:iot`

**possibleQuestion1**

- Question: Which security challenge is associated with IoT or internet of things devices?
- A. IoT devices are always isolated from the internet by default
- B. IoT devices enforce strict password policies by default
- C. many IoT devices lack strong security controls making them vulnerable to attacks
- D. IoT devices cannot be remotely accessed by attackers
- Correct answer: many IoT devices lack strong security controls making them vulnerable to attacks
- Distractors: IoT devices are always isolated from the internet by default | IoT devices enforce strict password policies by default | IoT devices cannot be remotely accessed by attackers
- Source topic: `IoT-Schwäche`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does IoT stand for?
- A. Internet of technology
- B. information of things
- C. Internet of Things
- D. interconnection of tools
- Correct answer: Internet of Things
- Distractors: Internet of technology | information of things | interconnection of tools
- Source topic: `IoT-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt IoT als ins Netz integrierte Alltagsgeräte; Problem ist, dass Hersteller keine Sicherheitsfachleute sind und ein kompromittiertes IoT-Gerät vollen Netzzugang verschaffen kann. Das Cram-Video nennt begrenzte Rechenressourcen (Elliptic Curve wegen kleinerer Schlüssel) und eingeschränkte Patchbarkeit als prüfungsrelevant.

### 3.1 > ICS/SCADA
`req:sy0701:v7:3.1:architecture-and-infrastructure-concepts:industrial-control-systems-ics-supervisory-contr`

**possibleQuestion1**

- Question: Which of the following describes a key security concern with industrial control systems or ICS?
- A. ICS networks are always air-gapped and immune to attacks
- B. ICS systems automatically patch security vulnerabilities in real time
- C. ICS environments do not require authentication for access control
- D. ICS systems were often designed without built-in security making them vulnerable to cyber threats
- Correct answer: ICS systems were often designed without built-in security making them vulnerable to cyber threats
- Distractors: ICS networks are always air-gapped and immune to attacks | ICS systems automatically patch security vulnerabilities in real time | ICS environments do not require authentication for access control
- Source topic: `ICS-Sicherheitsproblem`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does ICS stand for?
- A. Integrated control systems
- B. Industrial Control System
- C. infrastructure control systems
- D. industrial communication systems
- Correct answer: Industrial Control System
- Distractors: Integrated control systems | infrastructure control systems | industrial communication systems
- Source topic: `ICS-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion3**

- Question: What does SCADA stand for?
- A. Supervisory control and data aggregation
- B. secure control and data acquisition
- C. supervisory command and data analysis
- D. Supervisory Control and Data Acquisition
- Correct answer: Supervisory Control and Data Acquisition
- Distractors: Supervisory control and data aggregation | secure control and data acquisition | supervisory command and data analysis
- Source topic: `SCADA-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer erklärt SCADA als Vernetzung großer Maschinen in Fertigung/Stromerzeugung zur zentralen Überwachung; charakteristisch ist vollständige Segmentierung nach außen wegen dramatischer möglicher Folgen. Das Cram-Video bestätigt: in der Regel kein direkter Internetzugang, Abtrennung vom übrigen Netz.

### 3.1 > Real-time operating system (RTOS)
`req:sy0701:v7:3.1:architecture-and-infrastructure-concepts:real-time-operating-system-rtos`

**possibleQuestion1**

- Question: Which of the following is a security risk associated with real time operating systems or RTOS?
- A. they often prioritize performance over security making them vulnerable to attacks
- B. RTS systems cannot be compromised due to their design
- C. RTOS automatically updates security patches in real time
- D. RTOS systems do not require access controls
- Correct answer: they often prioritize performance over security making them vulnerable to attacks
- Distractors: RTS systems cannot be compromised due to their design | RTOS automatically updates security patches in real time | RTOS systems do not require access controls
- Source topic: `RTOS-Risiko`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does RTOS stand for?
- A. Real time operations software
- B. Real-Time Operating System
- C. real time output service
- D. real time open system In embedded systems,
- Correct answer: Real-Time Operating System
- Distractors: Real time operations software | real time output service | real time open system In embedded systems,
- Source topic: `RTOS-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer grenzt RTOS gegen nicht-deterministische Desktop-Betriebssysteme ab; Beispiel ABS beim Bremsen, wo kein Warten möglich ist. Das Cram-Video ergänzt, dass Prozesse fehlschlagen, wenn sie nicht innerhalb der vorgegebenen Zeit fertig werden, und empfiehlt Isolation/Firewall/IDS-IPS bei nicht patchbaren Systemen.

### 3.1 > Embedded systems
`req:sy0701:v7:3.1:architecture-and-infrastructure-concepts:embedded-systems`

**possibleQuestion1**

- Question: Why are embedded systems considered a security risk?
- A. They enforce strict multifactor authentication by default
- B. they often have limited security controls and cannot be easily updated
- C. Uh sorry up cannot be easily updated Embedded systems are automatically protected from all network threats
- D. they are isolated from all external connections by default
- Correct answer: they often have limited security controls and cannot be easily updated
- Distractors: They enforce strict multifactor authentication by default | Uh sorry up cannot be easily updated Embedded systems are automatically protected from all network threats | they are isolated from all external connections by default
- Source topic: `Embedded-Risiko`
- Option source: transcript
- Mapping confidence: high

Messer definiert Embedded Systems als geschlossene, zweckgebaute Hardware-Software-Einheiten ohne App-Store oder OS-Zugang, Beispiele Verkehrsampeln und medizinische Geräte. Das Cram-Video bezeichnet sie als die technische Komponente in IoT-Geräten und fordert Patchen wie bei einem Computer oder zusätzliche Schutzschichten.

### 3.1 > High availability
`req:sy0701:v7:3.1:architecture-and-infrastructure-concepts:high-availability`

**possibleQuestion1**

- Question: What is the primary goal of high availability in IT security?
- A. ensuring continuous system uptime and minimizing downtime due to failures or attacks
- B. eliminating the need for network security monitoring
- C. preventing users from accessing critical systems during security updates
- D. automatically blocking all incoming network traffic
- Correct answer: ensuring continuous system uptime and minimizing downtime due to failures or attacks
- Distractors: eliminating the need for network security monitoring | preventing users from accessing critical systems during security updates | automatically blocking all incoming network traffic
- Source topic: `Ziel von Hochverfügbarkeit`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does HA stand for?
- A. hybrid access
- B. high authentication
- C. hardware abstraction
- D. High Availability
- Correct answer: High Availability
- Distractors: hybrid access | high authentication | hardware abstraction
- Source topic: `HA-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt High Availability als Betrieb, der beim Ausfall eines Teils sofort weiterläuft (im Unterschied zu bloßer Redundanz, die erst eingebaut werden muss) — teuer wegen doppelter Infrastruktur. Das Cram-Video streift HA hier nur beiläufig und behandelt es ausführlich erst unter 3.4 (Load Balancing/Clustering).

### 3.1 > Considerations > Availability
`req:sy0701:v7:3.1:considerations:availability`

**possibleQuestion1**

- Question: Which term describes an organization's ability to keep systems operational and accessible during disruptions?
- A. availability
- B. scalability
- C. ease of deployment
- D. responsiveness
- Correct answer: availability
- Distractors: scalability | ease of deployment | responsiveness
- Source topic: `Begriff Verfügbarkeit`
- Option source: transcript
- Mapping confidence: high

Messer definiert Verfügbarkeit als Erwartung, dass Systeme laufen, wenn man sie braucht, gemessen über Uptime-Prozentwerte wie 99,999%. Das Cram-Video formuliert es als Zugänglichkeit für autorisierte Nutzer bei Bedarf, mit Zielwerten aus dem Geschäftsbedarf abgeleitet.

### 3.1 > Considerations > Resilience
`req:sy0701:v7:3.1:considerations:resilience`

**possibleQuestion1**

- Question: What is a primary goal of resilience in cyber security?
- A. To reduce the cost of deploying security tools
- B. to eliminate all security vulnerabilities in an organization to prevent unauthorized access through physical isolation
- C. to ensure systems can recover quickly from disruptions or cyber attacks
- D. cyber attacks with the primary goal of resilience in cyber security
- Correct answer: to ensure systems can recover quickly from disruptions or cyber attacks
- Distractors: To reduce the cost of deploying security tools | to eliminate all security vulnerabilities in an organization to prevent unauthorized access through physical isolation | cyber attacks with the primary goal of resilience in cyber security
- Source topic: `Ziel von Resilienz`
- Option source: transcript
- Mapping confidence: high

Messer betrachtet Resilienz aus der Wiederherstellungsperspektive: wie schnell läuft alles nach einem Ausfall wieder (MTTR als Maß). Das Cram-Video definiert Resilienz als Teilmenge der Verfügbarkeit — Fähigkeit, Störungen ohne Verfügbarkeitsverlust zu verkraften, z.B. via WAF vor einer Legacy-Anwendung.

### 3.1 > Considerations > Cost
`req:sy0701:v7:3.1:considerations:cost`

**possibleQuestion1**

- Question: Why is cost an important factor when implementing cyber security solutions?
- A. organizations must balance security needs with budget constraints
- B. Higher cost always guarantees better security
- C. Cyber security solutions should only implemented if they're free
- D. spending more on security eliminates all cyber threats
- Correct answer: organizations must balance security needs with budget constraints
- Distractors: Higher cost always guarantees better security | Cyber security solutions should only implemented if they're free | spending more on security eliminates all cyber threats
- Source topic: `Kostenfaktor`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt Kosten als erste Frage bei jeder Technologieeinführung: Installations-, Wartungs- und Ersatzkosten. Das Cram-Video listet Hardware, Software, Lizenzen, Personal auf und betont die Balance zwischen Kosten, Sicherheit und Funktionalität.

### 3.1 > Considerations > Responsiveness
`req:sy0701:v7:3.1:considerations:responsiveness`

**possibleQuestion1**

- Question: Which factor is critical in evaluating the responsiveness of a cyber security solution?
- A. the number of employees trained in cyber security awareness
- B. the amount of data stored in organization servers
- C. the ability to detect and mitigate threats in real time
- D. the overall cost of implementing a firewall
- Correct answer: the ability to detect and mitigate threats in real time
- Distractors: the number of employees trained in cyber security awareness | the amount of data stored in organization servers | the overall cost of implementing a firewall
- Source topic: `Responsiveness-Kriterium`
- Option source: transcript
- Mapping confidence: high

Messer erklärt Responsiveness als schnelle Antwort auf eine Dienstanfrage, schwer quantifizierbar, da Transaktionen aus mehreren Schritten bestehen. Das Cram-Video beschreibt es als Fähigkeit, zeitnah auf Nutzeranfragen zu reagieren, mit Abwägung zwischen Performance und Kosten.

### 3.1 > Considerations > Scalability
`req:sy0701:v7:3.1:considerations:scalability`

**possibleQuestion1**

- Question: What does scalability refer to in cyber security architecture?
- A. the ability to expand security measures as the organization grows
- B. the use of encryption to protect sensitive data
- C. the immediate responsiveness of an intrusion detection system
- D. the ease of deploying new security patches
- Correct answer: the ability to expand security measures as the organization grows
- Distractors: the use of encryption to protect sensitive data | the immediate responsiveness of an intrusion detection system | the ease of deploying new security patches
- Source topic: `Skalierbarkeit`
- Option source: transcript
- Mapping confidence: high

Messer erklärt schwankende Nutzung und Elastizität als Grund, Kapazität dynamisch statt maximal von vornherein zu bauen. Das Cram-Video unterscheidet vertikale (scale up) von horizontaler Skalierung (scale out, in der Cloud bevorzugt) und ordnet Skalierbarkeit als Schutz der Verfügbarkeit ein.

### 3.1 > Considerations > Ease of deployment
`req:sy0701:v7:3.1:considerations:ease-of-deployment`

**possibleQuestion1**

- Question: Why is ease of deployment an important consideration in implementing security solutions?
- A. Complex deployment pro uh complex deployment processes ensure maximum security
- B. The more difficult a solution is to dis deploy the more secure it is
- C. Ease of deployment is not a concern as long as a system is secure
- D. security solution should be easy to configure and integrate without disrupting business operations
- Correct answer: security solution should be easy to configure and integrate without disrupting business operations
- Distractors: Complex deployment pro uh complex deployment processes ensure maximum security | The more difficult a solution is to dis deploy the more secure it is | Ease of deployment is not a concern as long as a system is secure
- Source topic: `Einfache Einführung`
- Option source: transcript
- Mapping confidence: high

Messer erinnert daran, dass hinter einer Anwendung viele Bausteine stecken, deren Ausrollen Hardware, Budget und Change-Control-Prozess berücksichtigen muss. Das Cram-Video versteht es als Komplexität und Aufwand der Umsetzung: so viel wie nötig, aber kein Over-Engineering.

### 3.1 > Considerations > Risk transference
`req:sy0701:v7:3.1:considerations:risk-transference`

**possibleQuestion1**

- Question: What is an example of risk transference in cyber security?
- A. purchasing cyber security insurance to cover potential data breaches
- B. accepting all risks without taking preventive measures
- C. eliminating all risks by shutting down the system
- D. ignoring vulnerabilities due to budget constraints
- Correct answer: purchasing cyber security insurance to cover potential data breaches
- Distractors: accepting all risks without taking preventive measures | eliminating all risks by shutting down the system | ignoring vulnerabilities due to budget constraints
- Source topic: `Beispiel Risikotransfer`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt Risikotransfer als Übertragung auf Dritte, typischerweise Cyberversicherung gegen Ransomware, die finanzielle Verluste teilweise ausgleicht. Das Cram-Video nennt auch Sicherheitsverträge und begründet Transfer damit, dass manche Risiken intern zu teuer sind.

### 3.1 > Considerations > Ease of recovery
`req:sy0701:v7:3.1:considerations:ease-of-recovery`

**possibleQuestion1**

- Question: Which factor is crucial for ensuring ease of recovery after a cyber security incident?
- A. Relying on outdated software to prevent compatibility issues
- B. keeping all network devices connected from each other disconnected from each other
- C. maintaining regular backups and a tested disaster recovery plan
- D. disabling encryption to speed up system performance
- Correct answer: maintaining regular backups and a tested disaster recovery plan
- Distractors: Relying on outdated software to prevent compatibility issues | keeping all network devices connected from each other disconnected from each other | disabling encryption to speed up system performance
- Source topic: `Wiederherstellbarkeit`
- Option source: transcript
- Mapping confidence: high

Messer argumentiert, dass eine längere Wiederherstellung mehr kostet, Beispiel Neuinstallation (1h) vs. Image-Backup (10min). Das Cram-Video bezeichnet Wiederherstellungszeit als entscheidend für Verfügbarkeit und Resilienz, komplexe Lösungen brauchen zusätzliche Investitionen in Automatisierung.

### 3.1 > Considerations > Patch availability
`req:sy0701:v7:3.1:considerations:patch-availability`

**possibleQuestion1**

- Question: Why is patch availability important in cyber security?
- A. fixed before attackers can exploit them
- B. It eliminates the need for network firewalls
- C. It prevents the need for authentication on secure systems
- D. it removes the need for intrusion detection systems
- Correct answer: fixed before attackers can exploit them
- Distractors: It eliminates the need for network firewalls | It prevents the need for authentication on secure systems | it removes the need for intrusion detection systems
- Source topic: `Verfügbarkeit von Patches`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt Patchen als Routine (monatliche Microsoft-Patches), erst getestet, dann ausgerollt. Das Cram-Video reduziert den Punkt auf die Bewertung, wie häufig gepatcht werden muss und wie reaktionsschnell der Hersteller-Support ist.

### 3.1 > Considerations > Inability to patch
`req:sy0701:v7:3.1:considerations:inability-to-patch`

Messer beschreibt Fälle ohne Patch-Möglichkeit, typisch bei eingebetteten Systemen ohne Internetzugang — empfiehlt zusätzliche Sicherheit drumherum wie eine Firewall. Das Cram-Video ergänzt: In Hochverfügbarkeitsszenarien ist Patchen wegen nötiger Ausfallzeit manchmal nicht machbar, Segmentierung/IDS als Alternative.

### 3.1 > Considerations > Power
`req:sy0701:v7:3.1:considerations:power`

**possibleQuestion1**

- Question: Why is power availability a critical consideration for IT security?
- A. Uninterrupted power supply increases the risk of cyber attacks
- B. power failures lead to downtime, data corruption and security vulnerabilities
- C. Systems with stable power do not require additional security controls
- D. cyber threats only target systems with backup power sources
- Correct answer: power failures lead to downtime, data corruption and security vulnerabilities
- Distractors: Uninterrupted power supply increases the risk of cyber attacks | Systems with stable power do not require additional security controls | cyber threats only target systems with backup power sources
- Source topic: `Stromversorgung als Faktor`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does PDU stand for?
- A. Power Distribution Unit
- B. Availability
- C. Resilience
- D. Cost
- Correct answer: Power Distribution Unit
- Distractors: Availability | Resilience | Cost
- Source topic: `PDU-Akronym`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer betont, dass ohne Strom keine Technologie läuft und Stromversorgung oft unüberwacht bleibt; Backup via USV oder Generator nötig. Das Cram-Video ergänzt Strom als Betriebskostenblock, den energieeffiziente Lösungen senken und der in der Public Cloud im Servicepreis enthalten ist.

### 3.1 > Considerations > Compute
`req:sy0701:v7:3.1:considerations:compute`

**possibleQuestion1**

- Question: What is a security concern related to compute resources in an organization?
- A. insufficient compute power can hinder security tools like encryption and monitoring
- B. More compute power uh eliminates the need for security updates
- C. Compute power has no impact on security posture
- D. increased compute power reduces the risk of phishing attacks
- Correct answer: insufficient compute power can hinder security tools like encryption and monitoring
- Distractors: More compute power uh eliminates the need for security updates | Compute power has no impact on security posture | increased compute power reduces the risk of phishing attacks
- Source topic: `Compute-Ressourcen`
- Option source: transcript
- Mapping confidence: high

Messer erklärt Compute als die eigentliche Verarbeitungskomponente einer Anwendungsinstanz, skalierbar auf den benötigten Rechenbedarf. Das Cram-Video betont Compute als Treiber laufender Kosten und Architekturwahl (z.B. Container wegen höherer Dichte).

## Objective 3.2

### 3.2 > Infra considerations > Device placement
`req:sy0701:v7:3.2:infrastructure-considerations:device-placement`

**possibleQuestion1**

- Question: Why is proper device placement important in network security?
- A. To increase network latency for improved security
- B. to prevent users from accessing security controls
- C. to eliminate the need for encryption and transit
- D. positioned for maximum protection
- Correct answer: positioned for maximum protection
- Distractors: To increase network latency for improved security | to prevent users from accessing security controls | to eliminate the need for encryption and transit
- Source topic: `Geräteplatzierung`
- Option source: transcript
- Mapping confidence: high

Messer behandelt Geräteplatzierung nur indirekt über Firewalls, Honeypots, Jump-Server und Load Balancer. Das Cram-Video definiert Device Placement explizit als Entscheidung, wo ein Gerät ans Netz angebunden wird, beeinflusst von Zweck, Netz-Layout, Traffic-Fluss und Vorgaben.

### 3.2 > Infra considerations > Security zones
`req:sy0701:v7:3.2:infrastructure-considerations:security-zones`

**possibleQuestion1**

- Question: What is the purpose of security zones in network architecture?
- A. To eliminate the need for firewalls and intrusion detection systems
- B. to segment the network into different trust levels for better security control
- C. To ensure all devices communicate over a single unprotected network
- D. to allow unrestricted access between internal and external systems with the purpose of security zones in network architecture
- Correct answer: to segment the network into different trust levels for better security control
- Distractors: To eliminate the need for firewalls and intrusion detection systems | To ensure all devices communicate over a single unprotected network | to allow unrestricted access between internal and external systems with the purpose of security zones in network architecture
- Source topic: `Zweck von Security Zones`
- Option source: transcript
- Mapping confidence: high

Messer erklärt Sicherheitszonen als logische Gruppierung nach Nutzung/Zugriffsart (trusted/untrusted), Regeln werden auf Zonennamen formuliert. Das Cram-Video betont Zonen als Eindämmungsbereiche gegen laterale Bewegung und nennt Intranet, Extranet und Screened Subnet (DMZ).

### 3.2 > Infra considerations > Attack surface
`req:sy0701:v7:3.2:infrastructure-considerations:attack-surface`

**possibleQuestion1**

- Question: Which of the following best describes an attack surface?
- A. the total number of vulnerabilities and entry points that can be exploited
- B. Device placement
- C. Security zones
- D. Connectivity
- Correct answer: the total number of vulnerabilities and entry points that can be exploited
- Distractors: Device placement | Security zones | Connectivity
- Source topic: `Definition Angriffsfläche`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer beschreibt die Angriffsfläche als Summe aller Einstiegspunkte (Code, offene Ports, Authentifizierung, menschliche Fehler); Ziel ist Verkleinerung. Das Cram-Video fasst sie als Gesamtheit der Threat Vectors mit Patching, Segmentierung und Hardening als Gegenmaßnahmen.

### 3.2 > Infra considerations > Connectivity
`req:sy0701:v7:3.2:infrastructure-considerations:connectivity`

**possibleQuestion1**

- Question: How does connectivity impact network security?
- A. More connections reduce the need for encryption
- B. more connections increase potential entry points for attackers
- C. Increased connectivity eliminates the need for network segmentation
- D. connectivity has no impact on security risks
- Correct answer: more connections increase potential entry points for attackers
- Distractors: More connections reduce the need for encryption | Increased connectivity eliminates the need for network segmentation | connectivity has no impact on security risks
- Source topic: `Konnektivität und Risiko`
- Option source: transcript
- Mapping confidence: high

Messer zählt Konnektivität zur Angriffsfläche: Verkabelung physisch/logisch schützen, Anwendungsebenen-Verschlüsselung, verschlüsselte Anbindung von Außenstellen. Das Cram-Video definiert Connectivity als Fähigkeit zum Datenaustausch und fordert sichere Anbindung über Filterung, Segmentierung und Sicherheitszonen.

### 3.2 > Selection of effective controls
`req:sy0701:v7:3.2:selection-of-effective-controls`

Bei Messer kommt der Begriff nicht explizit vor, nur implizit als Auswahl zwischen Technologien. Das Cram-Video behandelt es als Methode: Assets identifizieren, Schwachstellen über Scans und Threat Modeling (STRIDE, PASTA) ermitteln, Kontrollen auf Umgebung und Branche zuschneiden.

### 3.2 > Failure modes > Fail-open
`req:sy0701:v7:3.2:infrastructure-considerations:failure-modes:fail-open`

**possibleQuestion1**

- Question: What is the primary characteristic of a fail open security control?
- A. It completely shuts down access when a failure occurs
- B. It restricts users from accessing public resources
- C. it allows access when a system fails prioritizing availability over security
- D. it encrypts all network traffic before shutting down with the primary characteristic of a fail open security control
- Correct answer: it allows access when a system fails prioritizing availability over security
- Distractors: It completely shuts down access when a failure occurs | It restricts users from accessing public resources | it encrypts all network traffic before shutting down with the primary characteristic of a fail open security control
- Source topic: `Fail-open-Verhalten`
- Option source: transcript
- Mapping confidence: high

Messer erklärt: Bei Fail-open fließt Verkehr trotz Geräteausfall weiter, ohne Sicherheitsprüfung, aber verfügbar — hält das für meist bevorzugt. Das Cram-Video ergänzt, dass die Entscheidung in der Designphase fällt und Fail-open für verfügbarkeitskritische Systeme sinnvoll ist.

### 3.2 > Failure modes > Fail-closed
`req:sy0701:v7:3.2:infrastructure-considerations:failure-modes:fail-closed`

**possibleQuestion1**

- Question: What happens when a security system is configured to fail closed?
- A. it blocks access to maintain security when a failure occurs
- B. Fail-open
- C. Device placement
- D. Security zones
- Correct answer: it blocks access to maintain security when a failure occurs
- Distractors: Fail-open | Device placement | Security zones
- Source topic: `Fail-closed-Verhalten`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Bei Messer bedeutet Fail-closed, dass mit dem Geräteausfall auch die Netzverbindung unterbrochen wird. Das Cram-Video beschreibt es als „nichts kommt durch" und passend für sicherheits-/safety-orientierte Systeme wie in der Fertigung.

### 3.2 > Device attribute > Active vs. passive
`req:sy0701:v7:3.2:infrastructure-considerations:device-attribute:active-vs-passive`

**possibleQuestion1**

- Question: What is a key difference between active and passive security devices?
- A. Passive devices actively prevent attacks while active devices only generate alerts
- B. active devices take immediate action to block threats while passive devices only monitor and log activity
- C. Active devices rely on user intervention while passive devices operate independently
- D. passive devices do not require network connectivity while active devices do is the key difference between active and passive security devices
- Correct answer: active devices take immediate action to block threats while passive devices only monitor and log activity
- Distractors: Passive devices actively prevent attacks while active devices only generate alerts | Active devices rely on user intervention while passive devices operate independently | passive devices do not require network connectivity while active devices do is the key difference between active and passive security devices
- Source topic: `Aktiv vs. passiv`
- Option source: transcript
- Mapping confidence: high

Messer versteht Active Monitoring als inline arbeitendes IPS in Echtzeit, Passive Monitoring als reine Verkehrskopie ohne Blockmöglichkeit (IDS-Design). Das Cram-Video nutzt active/passive zusätzlich für TAPs: Active braucht Strom und trennt Ports physisch, Passive kopiert nur und übersteht Stromausfälle.

### 3.2 > Device attribute > Inline vs. tap/monitor
`req:sy0701:v7:3.2:infrastructure-considerations:device-attribute:inline-vs-tap-monitor`

**possibleQuestion1**

- Question: What is a key characteristic of an inline security device compared to a tap monitor device?
- A. an inline device actively analyzing black blocks traffic in real time while a tap monitor device only observes traffic
- B. A tap monitor device blocks unauthorized network connections
- C. Inline devices are used exclusively for physical security measures tap monitor devices require user intervention to function
- D. A key characteristic of an inline security device compared to a tap monitor device
- Correct answer: an inline device actively analyzing black blocks traffic in real time while a tap monitor device only observes traffic
- Distractors: A tap monitor device blocks unauthorized network connections | Inline devices are used exclusively for physical security measures tap monitor devices require user intervention to function | A key characteristic of an inline security device compared to a tap monitor device
- Source topic: `Inline vs. Tap/Monitor`
- Option source: transcript
- Mapping confidence: high

Messer zeigt Inline als IPS zwischen Firewall und Core-Switch, das schädlichen Verkehr direkt entfernt; bei Tap/Monitor erzeugt ein SPAN-Port eine Kopie nur zur Analyse. Das Cram-Video nennt inline auch „in-band" und Tap „out-of-band".

### 3.2 > Network appliances > Jump server
`req:sy0701:v7:3.2:infrastructure-considerations:network-appliances:jump-server`

**possibleQuestion1**

- Question: What is the primary function of a jump server in network security?
- A. it provides a secure intermediary system for accessing critical resources
- B. It balances traffic between multiple servers to improve performance
- C. It filters web traffic to enforce security policies
- D. it monitors network activity but does not intervene in attacks
- Correct answer: it provides a secure intermediary system for accessing critical resources
- Distractors: It balances traffic between multiple servers to improve performance | It filters web traffic to enforce security policies | it monitors network activity but does not intervene in attacks
- Source topic: `Funktion Jump Server`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt den Jump-Server als von außen erreichbares, gehärtetes System für den zweistufigen Zugriffsweg ins interne Netz — Härtung ist kritisch. Das Cram-Video ergänzt, dass er üblicherweise in einem Screened Subnet steht.

### 3.2 > Network appliances > Proxy server
`req:sy0701:v7:3.2:infrastructure-considerations:network-appliances:proxy-server`

**possibleQuestion1**

- Question: How does a proxy server enhance network security?
- A. It balances network traffic across multiple servers
- B. It detects and prevents intrusion attempts in real time
- C. It physically isolates sensitive systems from external networks
- D. it acts as an intermediary between users and web resources to filter and monitor traffic
- Correct answer: it acts as an intermediary between users and web resources to filter and monitor traffic
- Distractors: It balances network traffic across multiple servers | It detects and prevents intrusion attempts in real time | It physically isolates sensitive systems from external networks
- Source topic: `Funktion Proxy`
- Option source: transcript
- Mapping confidence: high

Messer erklärt den Proxy als Vermittler für Caching, URL-Filterung und Content-Scanning, unterscheidet explizit/transparent, Forward/Reverse Proxy. Das Cram-Video nennt Forward Proxy zur Filterung ausgehenden Verkehrs und Reverse Proxy im Screened Subnet für eingehenden Verkehr.

### 3.2 > Network appliances > IPS/IDS
`req:sy0701:v7:3.2:infrastructure-considerations:network-appliances:intrusion-prevention-system-ips-intrusion-detect`

**possibleQuestion1**

- Question: What is the key difference between an intrusion detection system or IDS and an intrusion prevention system or IPS?
- A. an IDS monitors and alerts on suspicious activity
- B. An IDS blocks unauthorized access to applications while an IPS does not
- C. An IDS performs encryption while an IPS only detects malware Or an IPS passively observes traffic while an IDS actively mitigates attacks
- D. Whereas the key difference between an IDS intrusion detection system and an IPS intrusion prevention system
- Correct answer: an IDS monitors and alerts on suspicious activity
- Distractors: An IDS blocks unauthorized access to applications while an IPS does not | An IDS performs encryption while an IPS only detects malware Or an IPS passively observes traffic while an IDS actively mitigates attacks | Whereas the key difference between an IDS intrusion detection system and an IPS intrusion prevention system
- Source topic: `IDS vs. IPS`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What is the primary function of an intrusion prevention system or IPS?
- A. to actively detect and block malicious network activity in real time
- B. Jump server
- C. Proxy server
- D. Load balancer
- Correct answer: to actively detect and block malicious network activity in real time
- Distractors: Jump server | Proxy server | Load balancer
- Source topic: `Funktion IPS`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion3**

- Question: What does HIDS stand for?
- A. Host-Based Intrusion Detection System
- B. hybrid intrusion detection system
- C. host integrated detection system
- D. hierarchical intrusion detection system
- Correct answer: Host-Based Intrusion Detection System
- Distractors: hybrid intrusion detection system | host integrated detection system | hierarchical intrusion detection system
- Source topic: `HIDS-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion4**

- Question: What does IDS stand for?
- A. Intrusion detection service
- B. intrusion data system
- C. integrated detection system
- D. Intrusion Detection System
- Correct answer: Intrusion Detection System
- Distractors: Intrusion detection service | intrusion data system | integrated detection system
- Source topic: `IDS-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion5**

- Question: What does IPS stand for?
- A. Intrusion Prevention System
- B. intrusion protection service
- C. internal protection system
- D. intrusion prevention service
- Correct answer: Intrusion Prevention System
- Distractors: intrusion protection service | internal protection system | intrusion prevention service
- Source topic: `IPS-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion6**

- Question: What does NIDS stand for?
- A. Network-Based Intrusion Detection System
- B. network integrated detection service
- C. non-intrusive detection system
- D. network interface detection system
- Correct answer: Network-Based Intrusion Detection System
- Distractors: network integrated detection service | non-intrusive detection system | network interface detection system
- Source topic: `NIDS-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion7**

- Question: What does NIPS stand for?
- A. Network security solutions
- B. Network integrated prevention service
- C. Network-Based Intrusion Prevention System
- D. network intrusion protection system non-intrusive prevention system
- Correct answer: Network-Based Intrusion Prevention System
- Distractors: Network security solutions | Network integrated prevention service | network intrusion protection system non-intrusive prevention system
- Source topic: `NIPS-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion8**

- Question: What does WIDS stand for?
- A. Wireless Intrusion Detection System
- B. wireless integration detection service
- C. wideband intrusion detection system
- D. wireless interface detection suite
- Correct answer: Wireless Intrusion Detection System
- Distractors: wireless integration detection service | wideband intrusion detection system | wireless interface detection suite
- Source topic: `WIDS-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion9**

- Question: What does WIPS stand for?
- A. wireless intrusion detection service
- B. Wireless Intrusion Prevention System
- C. wideband intrusion prevention service
- D. wireless integration protection suite
- Correct answer: Wireless Intrusion Prevention System
- Distractors: wireless intrusion detection service | wideband intrusion prevention service | wireless integration protection suite
- Source topic: `WIPS-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer definiert das IPS als Echtzeitprüfung mit sofortigem Blocken, IDS erkennt und alarmiert nur. Das Cram-Video unterscheidet zusätzlich hostbasiert vs. netzbasiert sowie behavior-/heuristikbasiert vs. signaturbasiert.

### 3.2 > Network appliances > Load balancer
`req:sy0701:v7:3.2:infrastructure-considerations:network-appliances:load-balancer`

**possibleQuestion1**

- Question: How does a load balancer improve network security and performance?
- A. It acts as an intermediary between users and web servers to filter content
- B. it distributes traffic across multiple servers to prevent overload and mitigate DOS attacks
- C. It passively monitors network traffic without intervention
- D. it prevents unauthorized remote access to critical systems
- Correct answer: it distributes traffic across multiple servers to prevent overload and mitigate DOS attacks
- Distractors: It acts as an intermediary between users and web servers to filter content | It passively monitors network traffic without intervention | it prevents unauthorized remote access to critical systems
- Source topic: `Load Balancer`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt den Load Balancer als Lastverteiler mit Fehlertoleranz, TCP-/SSL-Offloading, Active/Active und Active/Passive. Das Cram-Video ergänzt Verfügbarkeitsprüfungen der Backends, virtuelle IP und Scheduling-Verfahren (Round-Robin, Affinity/Sticky Session).

### 3.2 > Network appliances > Sensors
`req:sy0701:v7:3.2:infrastructure-considerations:network-appliances:sensors`

**possibleQuestion1**

- Question: What is the function of sensors in network security?
- A. they collect and analyze data to detect potential threats in real time
- B. They enforce security policies by blocking all incoming connections
- C. They provide physical security by controlling access to server rooms
- D. they eliminate the need for encryption in data transmission
- Correct answer: they collect and analyze data to detect potential threats in real time
- Distractors: They enforce security policies by blocking all incoming connections | They provide physical security by controlling access to server rooms | they eliminate the need for encryption in data transmission
- Source topic: `Funktion von Sensoren`
- Option source: transcript
- Mapping confidence: high

Messer erklärt, dass Netzgeräte bereits Sensoren mitbringen und Daten in einem zentralen Collector/SIEM zusammenlaufen. Das Cram-Video ordnet Sensoren dem IDS/IPS-Kontext zu: sie melden Änderungen der Verkehrsmuster.

### 3.2 > Port security > 802.1X
`req:sy0701:v7:3.2:infrastructure-considerations:port-security:802-1x`

Messer stellt 802.1X als Standard für Nutzer-/Geräteauthentifizierung am Netz vor (Supplicant, Authenticator, Authentication Server). Das Cram-Video deckt sich damit, betont RADIUS und das Ziel, nur konforme Geräte zuzulassen.

### 3.2 > Port security > Extensible Authentication
`req:sy0701:v7:3.2:infrastructure-considerations:port-security:extensible-authentication`

**possibleQuestion1**

- Question: Which authentication framework is used to support multiple authentication methods including uh including smart cards and biometrics extensible authentication protocol or EAP 802.1x layer 7 firewall or web application firewall or WF?
- A. extensible authentication protocol
- B. 802.1X
- C. Device placement
- D. Security zones
- Correct answer: extensible authentication protocol
- Distractors: 802.1X | Device placement | Security zones
- Source topic: `Framework für Smartcards/Biometrie`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion2**

- Question: What does EAP stand for?
- A. Encrypted access protocol
- B. extended authorization protocol
- C. enhanced authentication process
- D. Extensible Authentication Protocol
- Correct answer: Extensible Authentication Protocol
- Distractors: Encrypted access protocol | extended authorization protocol | enhanced authentication process
- Source topic: `EAP-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt EAP als Authentifizierungs-Framework für unterschiedliche Netztypen, meist mit 802.1X kombiniert. Das Cram-Video nennt Varianten PEAP, LEAP, EAP-FAST, EAP-TLS und EAP-TTLS.

### 3.2 > Firewall types > WAF
`req:sy0701:v7:3.2:infrastructure-considerations:firewall-types:web-application-firewall-waf`

**possibleQuestion1**

- Question: Which type of firewall is specifically designed to protect web applications from threats like SQL injection and cross-site scripting?
- A. Next generation firewall
- B. web application firewall
- C. unified threat management
- D. layer 4 firewall
- Correct answer: web application firewall
- Distractors: Next generation firewall | unified threat management | layer 4 firewall
- Source topic: `Schutz von Webanwendungen`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does WAF stand for?
- A. Web access framework
- B. Web Application Firewall
- C. wide area filter
- D. website authentication facility
- Correct answer: Web Application Firewall
- Distractors: Web access framework | wide area filter | website authentication facility
- Source topic: `WAF-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer grenzt die WAF von UTM/NGFW ab: sie analysiert Eingaben in Webanwendungen und erkennt z.B. SQL Injection. Das Cram-Video beschreibt sie als Filter für HTTP-Verkehr gegen XSS/CSRF/SQLi und die OWASP Top 10, oft mit OWASP Core Rule Sets.

### 3.2 > Firewall types > UTM
`req:sy0701:v7:3.2:infrastructure-considerations:firewall-types:unified-threat-management-utm`

**possibleQuestion1**

- Question: Which type of security appliance combines multiple security functions such as firewall, intrusion prevention, and antivirus in a single solution?
- A. Next generation firewall web application firewall
- B. unified threat management
- C. 802.1x which security appliance combines multiple security functions such as firewall
- D. intrusion prevention and antivirus Security appliance
- Correct answer: unified threat management
- Distractors: Next generation firewall web application firewall | 802.1x which security appliance combines multiple security functions such as firewall | intrusion prevention and antivirus Security appliance
- Source topic: `Kombiniertes Security-Appliance`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does UTM stand for?
- A. Unified Threat Management
- B. WAF
- C. NGFW
- D. Layer 4/Layer 7
- Correct answer: Unified Threat Management
- Distractors: WAF | NGFW | Layer 4/Layer 7
- Source topic: `UTM-Akronym`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer bezeichnet UTM als ältere All-in-One-Appliance mit vielen Funktionen, Nachteil ist Leistungseinbruch bei mehreren aktiven Funktionen. Das Cram-Video bewertet UTM als gut für kleine/mittlere Unternehmen, aber begrenzt skalierbar.

### 3.2 > Firewall types > NGFW
`req:sy0701:v7:3.2:infrastructure-considerations:firewall-types:next-generation-firewall-ngfw`

**possibleQuestion1**

- Question: What is a key advantage of a next generation firewall compared to traditional firewalls and next generation firewall NGFW?
- A. NGFW is only used for physical security purposes NGFW blocks uh blocks all network traffic by default without customization
- B. NGFW replaces the need for encryption in network communications
- C. NGFW or next generation firewall includes deep packet inspection and advanced threat detection beyond simple port filtering
- D. There's a key advantage of next generation firewall NGFW compared to traditional firewalls
- Correct answer: NGFW or next generation firewall includes deep packet inspection and advanced threat detection beyond simple port filtering
- Distractors: NGFW is only used for physical security purposes NGFW blocks uh blocks all network traffic by default without customization | NGFW replaces the need for encryption in network communications | There's a key advantage of next generation firewall NGFW compared to traditional firewalls
- Source topic: `Vorteil NGFW`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does NGFW stand for?
- A. Next generation file wrapper
- B. Next-Generation Firewall
- C. next gateway firewall
- D. new generation firewall
- Correct answer: Next-Generation Firewall
- Distractors: Next generation file wrapper | next gateway firewall | new generation firewall
- Source topic: `NGFW-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt die NGFW als Layer-7-Firewall mit vollständigem Paket-Decode zur Anwendungserkennung unabhängig vom Port. Das Cram-Video ergänzt Anwendungs-Inspection, Intrusion Prevention und externe Threat-Intelligence-Feeds.

### 3.2 > Firewall types > Layer 4/Layer 7
`req:sy0701:v7:3.2:infrastructure-considerations:firewall-types:layer-4-layer-7`

**possibleQuestion1**

- Question: Which type of firewall operates at both layer 4 and layer 7 of the OSI model for advanced traffic filtering?
- A. Layer 4/Layer 7 firewall
- B. WAF
- C. UTM
- D. NGFW
- Correct answer: Layer 4/Layer 7 firewall
- Distractors: WAF | UTM | NGFW
- Source topic: `Firewall auf L4 und L7`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high
- Quality flags: distractor-issue

Messer stellt klassische Layer-4-Firewalls (Portnummern) den Layer-7-NGFWs (Anwendungserkennung) gegenüber. Das Cram-Video sortiert weitere Typen nach Schichten und kontrastiert stateless mit stateful Filterung.

### 3.2 > Secure comm/access > VPN
`req:sy0701:v7:3.2:secure-communication-access:virtual-private-network-vpn`

**possibleQuestion1**

- Question: What does L2TP stand for?
- A. Level two tunneling protocol
- B. layer 2 transport protocol
- C. link two tunneling process
- D. Layer 2 Tunneling Protocol
- Correct answer: Layer 2 Tunneling Protocol
- Distractors: Level two tunneling protocol | layer 2 transport protocol | link two tunneling process
- Source topic: `L2TP-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does PPTP stand for?
- A. Private point tunneling protocol
- B. Point-to-Point Tunneling Protocol
- C. peer-to-peer tunneling protocol
- D. public point tunneling protocol
- Correct answer: Point-to-Point Tunneling Protocol
- Distractors: Private point tunneling protocol | peer-to-peer tunneling protocol | public point tunneling protocol
- Source topic: `PPTP-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion3**

- Question: What does VPN stand for?
- A. Virtual public network
- B. verified private network
- C. Virtual Private Network
- D. virtual protected network
- Correct answer: Virtual Private Network
- Distractors: Virtual public network | verified private network | virtual protected network
- Source topic: `VPN-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer definiert das VPN als Verschlüsselung privater Daten für Transport über ein öffentliches Netz, Endpunkt ist der VPN-Konzentrator. Das Cram-Video unterscheidet Full Tunnel von Split Tunnel.

### 3.2 > Secure comm/access > Remote access
`req:sy0701:v7:3.2:secure-communication-access:remote-access`

**possibleQuestion1**

- Question: Which security mechanism allows users to securely connect to a private network from an external location?
- A. software-defined WAN SDWAN
- B. remote access
- C. IPSSE secure access server edge
- D. SASSE which security mechanism allows users to securely connect to a private network from an external location
- Correct answer: remote access
- Distractors: software-defined WAN SDWAN | IPSSE secure access server edge | SASSE which security mechanism allows users to securely connect to a private network from an external location
- Source topic: `Verbindung ins Firmennetz von außen`
- Option source: transcript
- Mapping confidence: high
- Quality flags: ambiguous

Bei Messer ist der typische Remote-Access-Fall das SSL/TLS-VPN eines einzelnen Geräts, im Gegensatz zu IPsec-Site-to-Site. Das Cram-Video sieht Remote Access ebenfalls als vom Nutzergerät initiierte Verbindung, zugeordnet zum IPsec-Transportmodus.

### 3.2 > Tunneling > TLS
`req:sy0701:v7:3.2:secure-communication-access:tunneling:transport-layer-security-tls`

**possibleQuestion1**

- Question: What does TLS stand for?
- A. Transport link security
- B. transmission layer security
- C. transfer level security
- D. Transport Layer Security
- Correct answer: Transport Layer Security
- Distractors: Transport link security | transmission layer security | transfer level security
- Source topic: `TLS-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer erklärt, dass ein SSL/TLS-VPN über Port 443 läuft und Firewalls problemlos passiert, für Remote-Zugriff einzelner Geräte. Das Cram-Video behandelt TLS als VPN-Tunnelprotokoll nur am Rande (TLS-Tunnel in PEAP/EAP-TLS).

### 3.2 > Tunneling > IPSec
`req:sy0701:v7:3.2:secure-communication-access:tunneling:internet-protocol-security-ipsec`

**possibleQuestion1**

- Question: Which security protocol is used to establish encrypted tunnels for secure data transmission between networks?
- A. Transport layer security
- B. internet protocol security
- C. virtual private network
- D. software-defined WAN SDWAN
- Correct answer: internet protocol security
- Distractors: Transport layer security | virtual private network | software-defined WAN SDWAN
- Source topic: `Verschlüsselte Tunnel zwischen Netzen`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does AH stand for?
- A. Authenticated handshake
- B. Authentication Header
- C. authorization header
- D. access header Network security
- Correct answer: Authentication Header
- Distractors: Authenticated handshake | authorization header | access header Network security
- Source topic: `Akronym AH`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion3**

- Question: What does ESP stand for?
- A. Encapsulating Security Payload
- B. encrypted security protocol
- C. enhanced security payload
- D. encapsulated signal processing
- Correct answer: Encapsulating Security Payload
- Distractors: encrypted security protocol | enhanced security payload | encapsulated signal processing
- Source topic: `ESP-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion4**

- Question: What does IKE stand for?
- A. Internal key exchange
- B. Internet Key Exchange
- C. immediate key exchange
- D. interactive key exchange
- Correct answer: Internet Key Exchange
- Distractors: Internal key exchange | immediate key exchange | interactive key exchange
- Source topic: `IKE-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion5**

- Question: What does IPSec stand for?
- A. Internal protocol security
- B. Internet Protocol Security
- C. integrated protocol security
- D. interconnected protocol security
- Correct answer: Internet Protocol Security
- Distractors: Internal protocol security | integrated protocol security | interconnected protocol security
- Source topic: `IPSec-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer zeigt die IPsec-Kapselung Schritt für Schritt (Header/Trailer, neuer äußerer IP-Header), typisch zwischen Standorten. Das Cram-Video ergänzt die Protokolle AH und ESP sowie die Modi Transport und Tunnel.

### 3.2 > Secure comm/access > SD-WAN
`req:sy0701:v7:3.2:secure-communication-access:software-defined-wide-area-network-sd-wan`

**possibleQuestion1**

- Question: How does software-defined wide area network or SDWAN improve network security?
- A. by dynamically routing traffic over multiple secure connections and enforcing security policies
- B. VPN
- C. Remote access
- D. SASE
- Correct answer: by dynamically routing traffic over multiple secure connections and enforcing security policies
- Distractors: VPN | Remote access | SASE
- Source topic: `Nutzen SD-WAN`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

**possibleQuestion2**

- Question: What does SD-WAN stand for?
- A. Softwardriven wide area network
- B. standard defined wide area network
- C. software distributed wide area network
- D. Software-Defined Wide Area Network
- Correct answer: Software-Defined Wide Area Network
- Distractors: Softwardriven wide area network | standard defined wide area network | software distributed wide area network
- Source topic: `SD-WAN-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer erklärt SD-WAN als SDN im WAN, das dynamische direkte Verbindungen zu Cloud-Diensten ermöglicht statt Umweg über das Rechenzentrum. Das Cram-Video ergänzt mehrere Transportwege (MPLS, LTE, Breitband) und Absicherung über IPsec/NGFW/Mikrosegmentierung.

### 3.2 > Secure comm/access > SASE
`req:sy0701:v7:3.2:secure-communication-access:secure-access-service-edge-sase`

**possibleQuestion1**

- Question: What is a key security benefit of secure access service edge or SASS?
- A. it integrates cloud delivered security services with wide area networking
- B. It replaces traditional firewalls with endpoint security software
- C. It eliminates the need for virtual private networks
- D. prevents all insider threats by default
- Correct answer: it integrates cloud delivered security services with wide area networking
- Distractors: It replaces traditional firewalls with endpoint security software | It eliminates the need for virtual private networks | prevents all insider threats by default
- Source topic: `Nutzen SASE`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does SASE stand for?
- A. Secure access service environment
- B. secure application service edge
- C. Secure Access Service Edge
- D. security and access service edge
- Correct answer: Secure Access Service Edge
- Distractors: Secure access service environment | secure application service edge | security and access service edge
- Source topic: `SASE-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer stellt SASE als nächste VPN-Generation dar, die Sicherheitsfunktionen in die Cloud verlagert statt zu einem einzelnen Konzentrator. Das Cram-Video beschreibt SASE als Cloud-Bündelung von Firewall, Secure Web Gateway, CASB und DLP nahe an Zero Trust.

## Objective 3.3

### 3.3 > Data types > Regulated
`req:sy0701:v7:3.3:data-types:regulated`

**possibleQuestion1**

- Question: Which type of data is subject to uh is subject to government or industry regulations such as GDPR or HIPPA?
- A. regulated data
- B. trade secret
- C. intellectual property
- D. human readable data
- Correct answer: regulated data
- Distractors: trade secret | intellectual property | human readable data
- Source topic: `Daten unter GDPR/HIPAA`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does PHI stand for?
- A. Public health information
- B. personal hospital information
- C. Protected Health Information
- D. personal health information
- Correct answer: Protected Health Information
- Distractors: Public health information | personal hospital information | personal health information
- Source topic: `PHI-Akronym`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion3**

- Question: What does PII stand for?
- A. Personally Identifiable Information
- B. public identif identifiable information
- C. private information identifier
- D. personal identification information
- Correct answer: Personally Identifiable Information
- Distractors: public identif identifiable information | private information identifier | personal identification information
- Source topic: `PII-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer definiert regulierte Daten als Daten, bei denen eine dritte Partei die Schutzregeln vorgibt (z.B. PCI für Kreditkartendaten), zusätzlich diktieren Gesetze Speicherdauer. Das Cram-Video ergänzt PII, PHI und Finanzdaten als Beispiele mit empfindlichen Bußgeldern bei Nichteinhaltung.

### 3.3 > Data types > Trade secret
`req:sy0701:v7:3.3:data-types:trade-secret`

Messer beschreibt Geschäftsgeheimnisse als organisationseigene, von Wettbewerbern begehrte Verfahren. Das Cram-Video präzisiert: nicht registrierbar, gelten unbegrenzt solange Geheimhaltung gewahrt bleibt, Voraussetzungen sind wirtschaftlicher Wert und aktive Vertraulichkeitsmaßnahmen.

### 3.3 > Data types > Intellectual property
`req:sy0701:v7:3.3:data-types:intellectual-property`

**possibleQuestion1**

- Question: Which term refers to legally protected creations such as patents, trademarks, and copyrights?
- A. Regulated data
- B. trade secret
- C. intellectual property
- D. financial information
- Correct answer: intellectual property
- Distractors: Regulated data | trade secret | financial information
- Source topic: `Patente, Marken, Copyright`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt IP als Daten, die anders geschützt werden (Urheber-/Markenrecht). Das Cram-Video behandelt Schutzformen: Marke (10 Jahre), Patent (~20 Jahre), Geschäftsgeheimnis und Urheberrecht (automatisch, bis 70 Jahre nach Tod).

### 3.3 > Data types > Legal information
`req:sy0701:v7:3.3:data-types:legal-information`

**possibleQuestion1**

- Question: Which type of data includes contracts, agreements, and other documents that have legal significance, trade secret, intellectual property, non-human readable data, or legal information?
- A. legal information
- B. Regulated
- C. Trade secret
- D. Intellectual property
- Correct answer: legal information
- Distractors: Regulated | Trade secret | Intellectual property
- Source topic: `Verträge und Vereinbarungen`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer schildert den Zielkonflikt: Gerichtsakten sind teils öffentlich, enthalten aber PII, die separat gespeichert wird. Das Cram-Video listet privilegierte Kommunikation, Verträge, Gerichtsakten und Aufsichtsmeldungen als Beispiele.

### 3.3 > Data types > Financial information
`req:sy0701:v7:3.3:data-types:financial-information`

**possibleQuestion1**

- Question: Which of the following best describes financial information in the context of security?
- A. Any public information found in open- source intelligence
- B. OSINT Only cryptocurrency transactions and blockchain records
- C. data that includes banking details, credit card numbers, and financial statements
- D. data related to intellectual property such as patents and copyrights
- Correct answer: data that includes banking details, credit card numbers, and financial statements
- Distractors: Any public information found in open- source intelligence | OSINT Only cryptocurrency transactions and blockchain records | data related to intellectual property such as patents and copyrights
- Source topic: `Bank-/Kartendaten`
- Option source: transcript
- Mapping confidence: high

Für Messer zählen sowohl unternehmensinterne Finanzkennzahlen als auch persönliche Bankdaten zu sensiblen Daten. Das Cram-Video nennt Anlagedaten, Kontodetails und Kreditkartennummern, geregelt durch Gramm-Leach-Bliley oder PCI DSS.

### 3.3 > Data types > Human- and non-human-readable
`req:sy0701:v7:3.3:data-types:humanand-non-human-readable`

**possibleQuestion1**

- Question: Which of the following is a example of nonhuman readable data?
- A. encrypted binary code used for system authentication
- B. legal contracts written in plain text
- C. a trade secret document stored as a PDF
- D. a company's financial statement
- Correct answer: encrypted binary code used for system authentication
- Distractors: legal contracts written in plain text | a trade secret document stored as a PDF | a company's financial statement
- Source topic: `Nicht menschenlesbare Daten`
- Option source: transcript
- Mapping confidence: high

Messer unterscheidet direkt lesbare Daten von nicht-menschenlesbaren (kodiert, Barcode) und nennt Mischformen als üblich. Das Cram-Video definiert nicht-menschenlesbar als Daten, die erst durch Software interpretierbar werden (Maschinencode, verschlüsselte Daten).

### 3.3 > Data classifications > Sensitive
`req:sy0701:v7:3.3:data-classifications:sensitive`

**possibleQuestion1**

- Question: Which type of data classification applies to information that could cause harm if disclosed but is not highly sensitive?
- A. sensitive data
- B. Confidential
- C. Public
- D. Restricted
- Correct answer: sensitive data
- Distractors: Confidential | Public | Restricted
- Source topic: `Klassifikation „sensitive"`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high
- Quality flags: ambiguous

Messer führt „sensitive" als Klassifikationsstufe für IP, PII und PHI ein. Das Cram-Video beschreibt sensible Daten als Oberbegriff über private, vertrauliche und restricted Daten mit Schadenspotenzial bei Offenlegung.

### 3.3 > Data classifications > Confidential
`req:sy0701:v7:3.3:data-classifications:confidential`

**possibleQuestion1**

- Question: Which classification label is typically uh applied to data that should only be accessed by authorized personnel due to its importance?
- A. Public restricted
- B. confidential
- C. private
- D. Data that should only be accessed by authorized personnel due to its importance
- Correct answer: confidential
- Distractors: Public restricted | private | Data that should only be accessed by authorized personnel due to its importance
- Source topic: `Klassifikation „confidential"`
- Option source: transcript
- Mapping confidence: high
- Quality flags: ambiguous

Messer stuft „confidential" oberhalb von sensitive ein: zusätzliche Zugriffsberechtigung nötig. Das Cram-Video definiert sie als Daten für einen festgelegten Personenkreis (Gehaltsdaten, interne Memos) mit rollenbasierter Beschränkung.

### 3.3 > Data classifications > Public
`req:sy0701:v7:3.3:data-classifications:public`

**possibleQuestion1**

- Question: Which classification applies to data that is intended for general distribution and does not require security controls?
- A. public
- B. sensitive
- C. confidential
- D. critical
- Correct answer: public
- Distractors: sensitive | confidential | critical
- Source topic: `Klassifikation „public"`
- Option source: transcript
- Mapping confidence: high

Messer nennt „public" bzw. „unclassified" als für jeden einsehbare Daten. Das Cram-Video nennt Broschüren und Pressemitteilungen als Beispiele ohne Datenschutzbedenken.

### 3.3 > Data classifications > Restricted
`req:sy0701:v7:3.3:data-classifications:restricted`

**possibleQuestion1**

- Question: Which type of data classification is used for information that requires strict access control and should not be widely shared?
- A. Public
- B. restricted
- C. confidential private
- D. Strict access control and should not be widely shared
- Correct answer: restricted
- Distractors: Public | confidential private | Strict access control and should not be widely shared
- Source topic: `Klassifikation „restricted"`
- Option source: transcript
- Mapping confidence: high
- Quality flags: ambiguous

Messer behandelt „restricted" nur im Sammelbegriff mit private/classified. Das Cram-Video ist präziser: Zugriff durch externe Vorschriften begrenzt (z.B. PHI unter HIPAA).

### 3.3 > Data classifications > Private
`req:sy0701:v7:3.3:data-classifications:private`

**possibleQuestion1**

- Question: Which type of data classification applies to personally identifiable information such as social security numbers and medical records?
- A. private
- B. public
- C. confidential
- D. restricted personally identifiable information such as social security numbers and medical records
- Correct answer: private
- Distractors: public | confidential | restricted personally identifiable information such as social security numbers and medical records
- Source topic: `Klassifikation für PII`
- Option source: transcript
- Mapping confidence: high

Bei Messer taucht „private" nur als eine von drei gleichrangigen Bezeichnungen auf, ohne eigene Definition. Das Cram-Video definiert private Daten als Informationen über eine Einzelperson, insbesondere PII und PHI.

### 3.3 > Data classifications > Critical
`req:sy0701:v7:3.3:data-classifications:critical`

**possibleQuestion1**

- Question: Which classification is assigned to data that if lost or compromised would have a severe impact on business operations?
- A. Severe impact confidential
- B. critical
- C. public
- D. sensitive Severe impact
- Correct answer: critical
- Distractors: Severe impact confidential | public | sensitive Severe impact
- Source topic: `Klassifikation „critical"`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt „critical" als Daten, die immer verfügbar sein müssen. Das Cram-Video definiert kritische Daten als für eine Kernfunktion unverzichtbar, Beispiele Finanzunterlagen und Steuerungssysteme.

### 3.3 > Data states > Data at rest
`req:sy0701:v7:3.3:general-data-considerations:data-states:data-at-rest`

**possibleQuestion1**

- Question: What are three primary states of data in cyber security?
- A. Data at risk data encrypted and data processed data in motion data in cloud and data on premises
- B. data at rest, data in transit, and data in use
- C. Or data backed up data stored and data archived
- D. The three primary states of data in cyber security
- Correct answer: data at rest, data in transit, and data in use
- Distractors: Data at risk data encrypted and data processed data in motion data in cloud and data on premises | Or data backed up data stored and data archived | The three primary states of data in cyber security
- Source topic: `Gespeicherte Daten`
- Option source: transcript
- Mapping confidence: high

Messer definiert Data at Rest als alle Daten auf einem Speichermedium, geschützt über Full-Disk-, Datenbank- oder Dateiverschlüsselung. Das Cram-Video ergänzt Cloud-Storage-Encryption, BitLocker/dm-crypt und Transparent Data Encryption.

### 3.3 > Data states > Data in transit
`req:sy0701:v7:3.3:general-data-considerations:data-states:data-in-transit`

**possibleQuestion1**

- Question: Which security measure is most important for protecting data in transit?
- A. encrypting data using protocols like TLS or IPSC
- B. Data at rest
- C. Data in use
- D. Regulated
- Correct answer: encrypting data using protocols like TLS or IPSC
- Distractors: Data at rest | Data in use | Regulated
- Source topic: `Schutz übertragener Daten`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer bezeichnet über das Netz übertragene Daten als Data in Transit, geschützt durch TLS oder Site-to-Site-VPN. Das Cram-Video hebt TLS/HTTPS als Standardweg hervor.

### 3.3 > Data states > Data in use
`req:sy0701:v7:3.3:general-data-considerations:data-states:data-in-use`

**possibleQuestion1**

- Question: Which of the following best describes data in use?
- A. Data stored in encryption database for later access
- B. Uh data transferred securely over a network
- C. data actively being processed by applications, memory or CPUs
- D. data saved on external media and not currently accessed which best describes data in use
- Correct answer: data actively being processed by applications, memory or CPUs
- Distractors: Data stored in encryption database for later access | Uh data transferred securely over a network | data saved on external media and not currently accessed which best describes data in use
- Source topic: `Daten in Verarbeitung`
- Option source: transcript
- Mapping confidence: high

Messer definiert Data in Use als Daten im RAM/CPU, fast immer entschlüsselt und daher Angriffsziel (Beispiel Target 2013). Das Cram-Video verweist auf Credential Guard, das Passwort-Hashes im Arbeitsspeicher verschlüsselt.

### 3.3 > General data considerations > Data sovereignty
`req:sy0701:v7:3.3:general-data-considerations:data-sovereignty`

**possibleQuestion1**

- Question: What does data sovereignty sorry what does data sovereignty refer to in cyber security?
- A. subject to the laws and regulations of the country where it was collected or stored
- B. Geolocation
- C. Regulated
- D. Trade secret
- Correct answer: subject to the laws and regulations of the country where it was collected or stored
- Distractors: Geolocation | Regulated | Trade secret
- Source topic: `Datensouveränität`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer erklärt Datensouveränität: Für gespeicherte Daten gelten die Gesetze des Speicherlandes, manche Gesetze (DSGVO) schreiben den Speicherort vor. Das Cram-Video ergänzt, dass ein Umzug in die USA DSGVO-Pflichten nicht aufhebt.

### 3.3 > General data considerations > Geolocation
`req:sy0701:v7:3.3:general-data-considerations:geolocation`

Messer beschreibt Geolokalisierung als Kombination aus GPS, WLAN- und Mobilfunkdaten zur Standortsteuerung des Datenzugriffs. Das Cram-Video ordnet Standort als Kontextfaktor moderner MFA ein („somewhere you are").

### 3.3 > Methods to secure data > Geographic restrictions
`req:sy0701:v7:3.3:methods-to-secure-data:geographic-restrictions`

**possibleQuestion1**

- Question: What is the purpose of geographic restrictions in cyber security?
- A. to limit access to data based on physical location and jurisdiction
- B. to prevent data from being stored on cloud services
- C. to allow access to data from any location without restrictions
- D. to encrypt data for secure transmission
- Correct answer: to limit access to data based on physical location and jurisdiction
- Distractors: to prevent data from being stored on cloud services | to allow access to data from any location without restrictions | to encrypt data for secure transmission
- Source topic: `Geografische Zugriffsbeschränkung`
- Option source: transcript
- Mapping confidence: high

Messer versteht darunter Richtlinienentscheidungen anhand von Datenstandort und Nutzerstandort (Geofencing). Das Cram-Video definiert es als Sperren von Zugriffen aus bestimmten Ländern oder IP-Bereichen.

### 3.3 > Methods to secure data > Encryption
`req:sy0701:v7:3.3:methods-to-secure-data:encryption`

**possibleQuestion1**

- Question: Which security measure converts data into an unreadable format to prevent it from unauthorized access?
- A. Masking obfuscation
- B. encryption
- C. segmentation
- D. Converts data into an unreadable format to protect it from unauthorized access
- Correct answer: encryption
- Distractors: Masking obfuscation | segmentation | Converts data into an unreadable format to protect it from unauthorized access
- Source topic: `Umwandlung in unlesbares Format`
- Option source: transcript
- Mapping confidence: high

Messer erklärt Verschlüsselung als Umwandlung von Klartext in Ciphertext, Prinzip „confusion". Das Cram-Video trennt symmetrische (Bulk-Daten) von asymmetrischer Verschlüsselung (Transaktionen, Signaturen).

### 3.3 > Methods to secure data > Hashing
`req:sy0701:v7:3.3:methods-to-secure-data:hashing`

**possibleQuestion1**

- Question: What is the purpose of hashing in data security?
- A. to create a unique fixed length representation of data for integrity ve verification
- B. Geographic restrictions
- C. Encryption
- D. Masking
- Correct answer: to create a unique fixed length representation of data for integrity ve verification
- Distractors: Geographic restrictions | Encryption | Masking
- Source topic: `Zweck von Hashing`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer beschreibt einen Hash als nicht rekonstruierbaren Fingerabdruck für Passwortspeicherung und Integritätsprüfung. Das Cram-Video ergänzt: Einwegfunktion mit fixer Ausgabelänge, Anwendung bei Datei-Transfers.

### 3.3 > Methods to secure data > Masking
`req:sy0701:v7:3.3:methods-to-secure-data:masking`

**possibleQuestion1**

- Question: Which method is used to hide part of data uh part of a data value to protect sensitive information?
- A. Hashing encryption
- B. masking
- C. tokenization
- D. Hide part of a data value to protect sensitive information
- Correct answer: masking
- Distractors: Hashing encryption | tokenization | Hide part of a data value to protect sensitive information
- Source topic: `Teilweises Verbergen von Werten`
- Option source: transcript
- Mapping confidence: high

Messer ordnet Data Masking als Obfuskationsform ein: Teile der Originaldaten werden ausgeblendet (z.B. Kreditkarte mit Sternchen). Das Cram-Video nennt die Datenbankschicht als üblichen Umsetzungsort.

### 3.3 > Methods to secure data > Tokenization
`req:sy0701:v7:3.3:methods-to-secure-data:tokenization`

**possibleQuestion1**

- Question: Which data protection technique replaces sensitive information with a nonsensitive equivalent?
- A. tokenization
- B. encryption
- C. masking segmentation
- D. Replaces sensitive information with a nonsensitive equivalent
- Correct answer: tokenization
- Distractors: encryption | masking segmentation | Replaces sensitive information with a nonsensitive equivalent
- Source topic: `Ersatz durch unkritisches Äquivalent`
- Option source: transcript
- Mapping confidence: high

Messer erklärt Tokenisierung als Ersetzen sensibler Daten durch ein nicht rückführbares Token, z.B. beim mobilen Bezahlen. Das Cram-Video ergänzt: Original liegt in einem Vault, stärker als Verschlüsselung, da Schlüssel nicht lokal liegen.

### 3.3 > Methods to secure data > Obfuscation
`req:sy0701:v7:3.3:methods-to-secure-data:obfuscation`

**possibleQuestion1**

- Question: Which of the following is a common method to secure data?
- A. allowing unrestricted access to all users
- B. using encryption, access controls, and data masking
- C. storing data in plain text for easy retrieval
- D. disabling authentication for efficiency
- Correct answer: using encryption, access controls, and data masking
- Distractors: allowing unrestricted access to all users | storing data in plain text for easy retrieval | disabling authentication for efficiency
- Source topic: `Ziel von Obfuskation`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt Obfuskation als Umwandlung von Verständlichem in schwer Erkennbares, z.B. Quellcode-Verschleierung. Das Cram-Video führt Obfuskation als Oberbegriff, unter den auch Data Masking fällt.

### 3.3 > Methods to secure data > Segmentation
`req:sy0701:v7:3.3:methods-to-secure-data:segmentation`

**possibleQuestion1**

- Question: How does segmentation enhance security in a network?
- A. by dividing the network into isolated sections to limit unauthorized access
- B. by replacing sensitive data with non-sensitive equivalents
- C. by making data difficult to interpret for unauthorized users
- D. by encrypting network traffic during transmission
- Correct answer: by dividing the network into isolated sections to limit unauthorized access
- Distractors: by replacing sensitive data with non-sensitive equivalents | by making data difficult to interpret for unauthorized users | by encrypting network traffic during transmission
- Source topic: `Segmentierung als Datenschutzmaßnahme`
- Option source: transcript
- Mapping confidence: high

Messer begründet Segmentierung damit, dass Angreifer sonst mit einem Einbruch Zugriff auf alles hätten; Aufteilen erlaubt abgestufte Sicherheit. Das Cram-Video spricht von Datenpartitionierung, wodurch bei einem Breach nur ein Segment betroffen ist.

### 3.3 > Methods to secure data > Permission restrictions
`req:sy0701:v7:3.3:methods-to-secure-data:permission-restrictions`

**possibleQuestion1**

- Question: What is the purpose of permission restrictions in data security?
- A. to enforce access controls based on user roles and responsibilities
- B. Geographic restrictions
- C. Encryption
- D. Hashing
- Correct answer: to enforce access controls based on user roles and responsibilities
- Distractors: Geographic restrictions | Encryption | Hashing
- Source topic: `Berechtigungsbeschränkungen`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer beschreibt Berechtigungsbeschränkungen als Kombination aus sicherer Authentifizierung und Gruppen-/Dateiberechtigungen. Das Cram-Video setzt Permission Restrictions mit Access Control gleich und nennt RBAC als gängige Umsetzung.

## Objective 3.4

### 3.4 > High availability > Load balancing vs. clustering
`req:sy0701:v7:3.4:high-availability:load-balancing-vs-clustering`

**possibleQuestion1**

- Question: What is a key difference between load balancing and clustering in high availability architecture?
- A. Clustering improves network performance while load balancing only handles database operations Load balancing encrypts all data in transit whereas clustering does not
- B. load balancing distributes traffic across multiple servers while clustering ensures failover redundancy
- C. clustering is used for external network traffic while load balancing is only for internal systems
- D. There's a key difference between load balancing and clustering in high availability architecture
- Correct answer: load balancing distributes traffic across multiple servers while clustering ensures failover redundancy
- Distractors: Clustering improves network performance while load balancing only handles database operations Load balancing encrypts all data in transit whereas clustering does not | clustering is used for external network traffic while load balancing is only for internal systems | There's a key difference between load balancing and clustering in high availability architecture
- Source topic: `Load Balancing vs. Clustering`
- Option source: transcript
- Mapping confidence: high

Messer trennt Clustering (Server kennen sich, gemeinsamer Shared Storage) von Load Balancing (zentraler Verteiler, Server wissen nichts voneinander). Das Cram-Video ergänzt die Praxis: Load Balancer vorn bei Webfarmen, Clustering hinten bei Datenbanken mit ungerader Knotenzahl.

### 3.4 > Site considerations > Hot
`req:sy0701:v7:3.4:site-considerations:hot`

**possibleQuestion1**

- Question: Which type of disaster recovery site is fully operational and can take over immediately in the event of a failure?
- A. Cold site
- B. a hot site
- C. warm site geographically dispersed site
- D. Fully operational and can take over immediately in the event of a failure
- Correct answer: a hot site
- Distractors: Cold site | warm site geographically dispersed site | Fully operational and can take over immediately in the event of a failure
- Source topic: `Sofort übernahmefähiger Standort`
- Option source: transcript
- Mapping confidence: high

Laut Messer ist ein Hot Site eine exakte, permanent synchronisierte Kopie des eigenen Rechenzentrums. Das Cram-Video betont: höchste Kosten, aber geringster Aufwand im Ernstfall, praktisch sofortiger Cutover.

### 3.4 > Site considerations > Cold
`req:sy0701:v7:3.4:site-considerations:cold`

**possibleQuestion1**

- Question: Which disaster disaster recovery site requires the most time and effort to become operational after a failure?
- A. Hot site
- B. warm site
- C. a cold site
- D. geographically dispersed site
- Correct answer: a cold site
- Distractors: Hot site | warm site | geographically dispersed site
- Source topic: `Standort mit größtem Aufwand`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt den Cold Site als im Wesentlichen leeres Gebäude mit Strom/Beleuchtung, alles andere muss mitgebracht werden. Das Cram-Video ordnet ein: niedrige Kosten, hoher Wiederherstellungsaufwand.

### 3.4 > Site considerations > Warm
`req:sy0701:v7:3.4:site-considerations:warm`

**possibleQuestion1**

- Question: Which type of disaster recovery site has some preconfigured infrastructure but requires additional setup before full operation?
- A. Cold site
- B. hot site
- C. geographically dispersed site
- D. a warm site
- Correct answer: a warm site
- Distractors: Cold site | hot site | geographically dispersed site
- Source topic: `Teilweise vorbereiteter Standort`
- Option source: transcript
- Mapping confidence: high

Der Warm Site liegt bei Messer zwischen kalt und heiß: Teil der Ausrüstung steht bereits. Das Cram-Video konkretisiert vorinstallierte Hardware und vorkonfigurierte Bandbreite, nur Software/Daten müssen noch eingespielt werden.

### 3.4 > Site considerations > Geographic dispersion
`req:sy0701:v7:3.4:site-considerations:geographic-dispersion`

**possibleQuestion1**

- Question: What is the primary benefit of geographic dispersion in disaster recovery planning?
- A. It reduces the impact of localized disasters by distributing resources across multiple locations
- B. Hot
- C. Cold
- D. Warm
- Correct answer: It reduces the impact of localized disasters by distributing resources across multiple locations
- Distractors: Hot | Cold | Warm
- Source topic: `Nutzen geografischer Streuung`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer begründet geografische Streuung mit großflächigen Ereignissen wie Hurrikanen, die einen nahen Ausweichstandort mittreffen würden. Das Cram-Video nennt Public-Cloud-Anbieter als Vorbild (Ost-/Westküste) und fordert Offsite-Backups.

### 3.4 > Platform diversity
`req:sy0701:v7:3.4:platform-diversity`

**possibleQuestion1**

- Question: What is a security benefit of platform diversity in an organization's IT environment?
- A. it reduces the risk of widespread compromise by limiting reliance on a single system
- B. Multi-cloud systems
- C. Continuity of operations
- D. Load balancing vs. clustering
- Correct answer: it reduces the risk of widespread compromise by limiting reliance on a single system
- Distractors: Multi-cloud systems | Continuity of operations | Load balancing vs. clustering
- Source topic: `Nutzen von Plattformvielfalt`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer argumentiert über OS-spezifische Schwachstellen: bewusster Mix verschiedener Betriebssysteme verteilt das Risiko. Das Cram-Video fasst Plattformvielfalt breiter (OS, Hersteller, Cloud-Anbieter) als Schutz gegen Vendor-Lock-in und plattformspezifische Zero-Days.

### 3.4 > Multi-cloud systems
`req:sy0701:v7:3.4:multi-cloud-systems`

**possibleQuestion1**

- Question: What is a primary advantage of using a multicloud system?
- A. it enhances redundancy and reduces dependency on a single cloud provider
- B. It eliminates the need for on premises security controls
- C. It ensures that all data is automatically encrypted without additional configuration
- D. prevents all types of cyber attacks by default whereas a primary advantage of multicloud system
- Correct answer: it enhances redundancy and reduces dependency on a single cloud provider
- Distractors: It eliminates the need for on premises security controls | It ensures that all data is automatically encrypted without additional configuration | prevents all types of cyber attacks by default whereas a primary advantage of multicloud system
- Source topic: `Vorteil Multi-Cloud`
- Option source: transcript
- Mapping confidence: high

Messer weist darauf hin, dass der Ausfall eines Cloud-Anbieters die anderen normalerweise nicht betrifft, daher vergleichbare Dienste bei mehreren Providern vorhalten. Das Cram-Video ergänzt schnelles Failover per DNS-Umschaltung oder Global Server Load Balancing.

### 3.4 > Continuity of operations
`req:sy0701:v7:3.4:continuity-of-operations`

**possibleQuestion1**

- Question: What best describes continuity of operations planning?
- A. Eliminating the need for backup systems and redundancy
- B. using a single cloud provider to store all company data
- C. ensuring critical business functions can continue during and after a disaster or disruption
- D. preventing unauthorized employees from accessing public resources
- Correct answer: ensuring critical business functions can continue during and after a disaster or disruption
- Distractors: Eliminating the need for backup systems and redundancy | using a single cloud provider to store all company data | preventing unauthorized employees from accessing public resources
- Source topic: `Continuity of Operations`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does COOP stand for?
- A. Contingency operations plan
- B. Continuity of Operations
- C. corporate operational outreach plan
- D. central operations overhaul plan
- Correct answer: Continuity of Operations
- Distractors: Contingency operations plan | corporate operational outreach plan | central operations overhaul plan
- Source topic: `Akronym COOP`
- Option source: transcript
- Mapping confidence: high

Messer definiert COOP als Rückfallverfahren, wenn Technik gar nicht verfügbar ist: manuelle Transaktionsabwicklung, Papierbelege. Das Cram-Video versteht Kontinuität als Planung von Verfahren zur Aufrechterhaltung kritischer Geschäftsfunktionen.

### 3.4 > Capacity planning > People
`req:sy0701:v7:3.4:capacity-planning:people`

**possibleQuestion1**

- Question: How does capacity planning impact personnel in an organization?
- A. It eliminates the need for IT security staff by automating all processes
- B. It focuses only on the hardware upgrades and does not impact personnel
- C. It reduces the importance of user awareness training
- D. it ensures the organization has enough trained staff to manage security operations effectively
- Correct answer: it ensures the organization has enough trained staff to manage security operations effectively
- Distractors: It eliminates the need for IT security staff by automating all processes | It focuses only on the hardware upgrades and does not impact personnel | It reduces the importance of user awareness training
- Source topic: `Kapazitätsplanung Personal`
- Option source: transcript
- Mapping confidence: high

Messer betont Menschen als am schwersten skalierbare Ressource (Einstellung/Einarbeitung zeit- und kostenintensiv). Das Cram-Video fokussiert auf passende Fähigkeiten für sicheren Betrieb und Incident Response sowie Arbeitslast und Fluktuation.

### 3.4 > Capacity planning > Technology
`req:sy0701:v7:3.4:capacity-planning:technology`

**possibleQuestion1**

- Question: Which factor should be considered when planning technology capacity for cyber security?
- A. Eliminating redundant security controls to cut costs
- B. scalability of security infrastructure to handle increasing workloads
- C. limiting access to security updates to reduce bandwidth usage
- D. using older hardware to maintain legacy compatibility
- Correct answer: scalability of security infrastructure to handle increasing workloads
- Distractors: Eliminating redundant security controls to cut costs | limiting access to security updates to reduce bandwidth usage | using older hardware to maintain legacy compatibility
- Source topic: `Kapazitätsplanung Technologie`
- Option source: transcript
- Mapping confidence: high

Messer fordert mitwachsende Technik (Load Balancer, mehrere DB-Server, Cloud-Ressourcen). Das Cram-Video meint vor allem Sicherheitswerkzeuge selbst: Firewalls, IDS/IPS, ausreichende Lizenzen und Automatisierung.

### 3.4 > Capacity planning > Infrastructure
`req:sy0701:v7:3.4:capacity-planning:infrastructure`

**possibleQuestion1**

- Question: Why is infrastructure an important component of capacity planning?
- A. It prevents the need for cloud computing and security architecture
- B. It eliminates the necessity for data encryption
- C. it ensures that network storage and compute resources can support security requirements
- D. it reduces the reliance on firewalls and intrusion detection systems
- Correct answer: it ensures that network storage and compute resources can support security requirements
- Distractors: It prevents the need for cloud computing and security architecture | It eliminates the necessity for data encryption | it reduces the reliance on firewalls and intrusion detection systems
- Source topic: `Kapazitätsplanung Infrastruktur`
- Option source: transcript
- Mapping confidence: high

Messer vergleicht die langsame On-Prem-Bereitstellung mit der schnellen Cloud-Bereitstellung neuer Instanzen. Das Cram-Video beschreibt Infrastruktur als ausreichende Systemressourcen für Spitzenlasten samt Elastizität, z.B. bei DDoS.

### 3.4 > Testing > Tabletop exercises
`req:sy0701:v7:3.4:testing:tabletop-exercises`

**possibleQuestion1**

- Question: What is the primary purpose of a tabletop exercise in cyber security testing?
- A. to conduct a discussion-based walkthrough of incident response procedures
- B. to simulate a live attack on the organization's network
- C. to physically test disaster recovery systems in real time to perform a full failover to backup infrastructure
- D. The primary purpose of a tabletop exercise in cyber security testing
- Correct answer: to conduct a discussion-based walkthrough of incident response procedures
- Distractors: to simulate a live attack on the organization's network | to physically test disaster recovery systems in real time to perform a full failover to backup infrastructure | The primary purpose of a tabletop exercise in cyber security testing
- Source topic: `Zweck Tabletop Exercise`
- Option source: transcript
- Mapping confidence: high

Messer stellt die Tabletop-Übung als kostengünstige Alternative zum echten Umzug dar: Wiederherstellungsschritte werden am Tisch durchgesprochen. Das Cram-Video nennt sie auch „structured walkthrough".

### 3.4 > Testing > Fail over
`req:sy0701:v7:3.4:testing:fail-over`

**possibleQuestion1**

- Question: What does a failover test evaluate in an IT environment?
- A. the security of data stored on external devices
- B. the effectiveness of user authentication policies
- C. the encryption strength of data in transit
- D. the ability of a system to switch to a backup or redundant system during a failure
- Correct answer: the ability of a system to switch to a backup or redundant system during a failure
- Distractors: the security of data stored on external devices | the effectiveness of user authentication policies | the encryption strength of data in transit
- Source topic: `Failover-Test`
- Option source: transcript
- Mapping confidence: high

Bei Messer prüft der Failover-Test, ob redundante Konfigurationen automatisch umschalten. Das Cram-Video beschreibt den Test als bewusstes Abschalten des Primärstandorts, um zu prüfen ob der Ausweichstandort übernimmt.

### 3.4 > Testing > Simulation
`req:sy0701:v7:3.4:testing:simulation`

**possibleQuestion1**

- Question: What is the main goal of a cyber security simulation exercise?
- A. to create a controlled environment for testing security incident responses
- B. to completely disable all network security controls for assessment
- C. to train employees on general IT usage policies to ensure all systems are permanently locked down
- D. which is the main goal of a cyber security simulation exercise
- Correct answer: to create a controlled environment for testing security incident responses
- Distractors: to completely disable all network security controls for assessment | to train employees on general IT usage policies to ensure all systems are permanently locked down | which is the main goal of a cyber security simulation exercise
- Source topic: `Ziel einer Simulation`
- Option source: transcript
- Mapping confidence: high

Messer versteht Simulation vor allem als Sicherheitstests wie simulierte Phishing-Angriffe. Das Cram-Video definiert Simulationen als funktionale Übungen in simulierter Umgebung, die die Produktion nicht berühren.

### 3.4 > Testing > Parallel processing ⚠ QUELLENKONFLIKT
`req:sy0701:v7:3.4:testing:parallel-processing`

**possibleQuestion1**

- Question: How does parallel processing support cyber security testing?
- A. By replacing traditional encryption with multi-threaded computation
- B. by running a secondary system alongside the primary one to validate functionality before full deployment
- C. by shutting down unnecessary security services for performance testing
- D. by removing the need for redundancy in system operations
- Correct answer: by running a secondary system alongside the primary one to validate functionality before full deployment
- Distractors: By replacing traditional encryption with multi-threaded computation | by shutting down unnecessary security services for performance testing | by removing the need for redundancy in system operations
- Source topic: `Parallel Processing im Test`
- Option source: transcript
- Mapping confidence: high

Die Quellen weichen ab: Messer erklärt es technisch als gleichzeitige Nutzung mehrerer CPUs/Kerne. Das Cram-Video versteht darunter eine Testform, bei der der Wiederherstellungsstandort während des Tests parallel zum Hauptstandort aktiviert wird.

### 3.4 > Backups > Onsite/offsite
`req:sy0701:v7:3.4:backups:onsite-offsite`

**possibleQuestion1**

- Question: What is a key security benefit of maintaining both on-site and off-site backups?
- A. It eliminates the need for encryption in backup storage It reduces the importance of access controls for critical data
- B. protected from local disasters while allowing fast recovery when needed
- C. it guarantees that all backups are immune to ransomware attacks
- D. Key security benefit of maintaining both on-site and off-site backups
- Correct answer: protected from local disasters while allowing fast recovery when needed
- Distractors: It eliminates the need for encryption in backup storage It reduces the importance of access controls for critical data | it guarantees that all backups are immune to ransomware attacks | Key security benefit of maintaining both on-site and off-site backups
- Source topic: `On-site + Off-site Backups`
- Option source: transcript
- Mapping confidence: high

Nach Messer sind Onsite-Backups sofort verfügbar und günstiger, Offsite-Backups von jedem Ort wiederherstellbar; viele kombinieren beides. Das Cram-Video nennt externe Festplatte vs. Cloud/entferntes Rechenzentrum als Beispiele.

### 3.4 > Backups > Frequency
`req:sy0701:v7:3.4:backups:frequency`

**possibleQuestion1**

- Question: Why is backup frequency an important consideration in data protection?
- A. more frequent backups reduce potential data loss in case of a system failure
- B. Frequent backups eliminate the need for disaster recovery planning
- C. A single backup is always sufficient for long-term data security
- D. Or frequent backups slow down the system and should be avoided
- Correct answer: more frequent backups reduce potential data loss in case of a system failure
- Distractors: Frequent backups eliminate the need for disaster recovery planning | A single backup is always sufficient for long-term data security | Or frequent backups slow down the system and should be avoided
- Source topic: `Backup-Frequenz`
- Option source: transcript
- Mapping confidence: high

Messer koppelt das Intervall an Datenmenge und Änderungsrate, mit mehreren Backup-Sets unterschiedlicher Intervalle. Das Cram-Video macht die Frequenz von Datenwichtigkeit und akzeptiertem Datenverlust (RTO/RPO) abhängig.

### 3.4 > Backups > Encryption
`req:sy0701:v7:3.4:backups:encryption`

**possibleQuestion1**

- Question: Why is it important to consider security during the installation of networking devices?
- A. To allow unrestricted access for easy troubleshooting
- B. to disable logging features to improve device performance
- C. to keep factory default credentials for faster setup
- D. configured with encryption and access controls
- Correct answer: configured with encryption and access controls
- Distractors: To allow unrestricted access for easy troubleshooting | to disable logging features to improve device performance | to keep factory default credentials for faster setup
- Source topic: `Backups verschlüsseln`
- Option source: transcript
- Mapping confidence: high

Messer motiviert Backup-Verschlüsselung mit dem Risiko gestohlener Sicherungsmedien, hält sie in der Cloud für nahezu zwingend. Das Cram-Video fasst knapp: sensible Backups dürfen nie im Klartext vorliegen.

### 3.4 > Backups > Snapshots
`req:sy0701:v7:3.4:backups:snapshots`

**possibleQuestion1**

- Question: What is a snapshot in the context of data backups?
- A. a point in time copy of a system or data used for quick recovery
- B. a long-term archival backup stored offsite for disaster recovery
- C. a log file that records all system changes for compliance tracking
- D. a real-time monitoring tool for detecting unauthorized access
- Correct answer: a point in time copy of a system or data used for quick recovery
- Distractors: a long-term archival backup stored offsite for disaster recovery | a log file that records all system changes for compliance tracking | a real-time monitoring tool for detecting unauthorized access
- Source topic: `Definition Snapshot`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt Snapshots als schnelle Systemsicherung mit einfachem Rollback, vergleichbar mit inkrementellen Backups. Das Cram-Video ergänzt sie als Point-in-Time-Kopien, verbreitet auch bei High-End-SANs.

### 3.4 > Backups > Recovery
`req:sy0701:v7:3.4:backups:recovery`

**possibleQuestion1**

- Question: What is the primary goal of a recovery plan in cyber security?
- A. To permanently shut down affected systems to prevent further attacks
- B. to restore systems and data to a functional state after an incident
- C. to encrypt all data to prevent unauthorized access
- D. to remove all backups to ensure no data leakage occurs
- Correct answer: to restore systems and data to a functional state after an incident
- Distractors: To permanently shut down affected systems to prevent further attacks | to encrypt all data to prevent unauthorized access | to remove all backups to ensure no data leakage occurs
- Source topic: `Ziel eines Recovery Plans`
- Option source: transcript
- Mapping confidence: high

Messer stellt das Testen der Wiederherstellung in den Mittelpunkt — der erfolgreiche Restore allein reicht nicht. Das Cram-Video definiert Recovery als Rückspielen mit Vorausplanung von Zielort und Zeitrahmen.

### 3.4 > Backups > Replication
`req:sy0701:v7:3.4:backups:replication`

**possibleQuestion1**

- Question: Which of the following best describes data replication in disaster recovery?
- A. the process of copying data to another system in real time or scheduled intervals for redundancy
- B. the encryption of backup data for secure storage
- C. the complete deletion of old data to prevent unauthorized access
- D. a method for restricting user access to sensitive files
- Correct answer: the process of copying data to another system in real time or scheduled intervals for redundancy
- Distractors: the encryption of backup data for secure storage | the complete deletion of old data to prevent unauthorized access | a method for restricting user access to sensitive files
- Source topic: `Definition Replikation`
- Option source: transcript
- Mapping confidence: high

Messer erklärt Replikation als nahezu Echtzeit-Kopie an einen oder mehrere Zielorte, wertvoll beim Hot Site. Das Cram-Video beschreibt sie als identische Kopien zur Redundanz, häufig mit Clustering kombiniert.

### 3.4 > Backups > Journaling
`req:sy0701:v7:3.4:backups:journaling`

**possibleQuestion1**

- Question: What is the purpose of journaling in data security?
- A. to keep a continuous log of changes to data for recovery and integrity verification
- B. Onsite/offsite
- C. Frequency
- D. Encryption
- Correct answer: to keep a continuous log of changes to data for recovery and integrity verification
- Distractors: Onsite/offsite | Frequency | Encryption
- Source topic: `Zweck von Journaling`
- Option source: transcript answer; requirement-sibling distractor fallback
- Mapping confidence: high

Messer erklärt Journaling als Schutz gegen Datenkorruption bei Stromausfall: Daten werden zuerst ins Journal, dann in die Datenbank geschrieben. Das Cram-Video nennt es Transaktionsprotokollierung für Point-in-Time- oder Roll-Forward-Recovery.

### 3.4 > Power > Generators
`req:sy0701:v7:3.4:power:generators`

**possibleQuestion1**

- Question: What is the role of generators in disaster recovery planning?
- A. To encrypt all system data before a power outage occurs
- B. to provide backup power in case of a primary power failure
- C. to permanently shut down non-essential systems during business hours
- D. to reduce the need for regular power supply maintenance Is the role of generators in disaster recovery planning
- Correct answer: to provide backup power in case of a primary power failure
- Distractors: To encrypt all system data before a power outage occurs | to permanently shut down non-essential systems during business hours | to reduce the need for regular power supply maintenance Is the role of generators in disaster recovery planning
- Source topic: `Rolle von Generatoren`
- Option source: transcript
- Mapping confidence: high

Messer positioniert den Generator als Langzeit-Stromversorgung mit ca. einer Minute Anlaufzeit, daher meist mit USV kombiniert. Das Cram-Video ergänzt Diesel/Benzin/Propan als Antrieb und Krankenhäuser/Rechenzentren als typische Nutzer.

### 3.4 > Power > UPS
`req:sy0701:v7:3.4:power:uninterruptible-power-supply-ups`

**possibleQuestion1**

- Question: What is the primary function of an interruptible power supply or UPS in cyber security?
- A. to provide temporary backup power to critical systems in case of an outage
- B. to eliminate the need for data backups by securing power supply
- C. to provide long-term power solutions without requiring additional resources
- D. The primary function of an uninterruptible power supply UPS in cyber security
- Correct answer: to provide temporary backup power to critical systems in case of an outage
- Distractors: to eliminate the need for data backups by securing power supply | to provide long-term power solutions without requiring additional resources | The primary function of an uninterruptible power supply UPS in cyber security
- Source topic: `Funktion einer USV`
- Option source: transcript
- Mapping confidence: high

**possibleQuestion2**

- Question: What does UPS stand for?
- A. Universal power system
- B. Uninterruptible Power Supply
- C. uninterrupted power source
- D. uninterrupted power supply
- Correct answer: Uninterruptible Power Supply
- Distractors: Universal power system | uninterrupted power source | uninterrupted power supply
- Source topic: `UPS-Akronym`
- Option source: transcript
- Mapping confidence: high

Messer beschreibt die USV als batteriegestützte Kurzzeitversorgung gegen Blackouts/Brownouts/Surges, unterscheidet Offline-, Line-Interactive- und Online-/Double-Conversion-Geräte. Das Cram-Video betont zusätzlich die Lieferung „sauberen" Stroms und die primäre Rolle als Standby für geordnetes Herunterfahren.
