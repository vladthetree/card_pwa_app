// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRoot } from 'react-dom/client'
import { SecurityVisualization } from '../../components/SecurityVisualization'
import {
  getSecurityVisualForCard,
  SECURITY_VISUALS,
  SECURITY_VISUAL_CARD_IDS,
} from '../../utils/securityVisuals'

describe('Security-Prinzipien Visualisierungen', () => {
  it('zeigt die SAM/Shadow-Grafik nur zur unveränderten, korrekt verschlüsselten Karte', () => {
    const front = 'What two files are commonly attacked using offline brute‐force attacks?\nA: The Windows Registry and the Linux /etc/passwd file\nB: The Windows SAM and the Linux /etc/passwd file\nC: The Windows SAM and the Linux /etc/shadow file\nD: The Windows Registry and the Linux /etc/shadow file'
    const card = { id: '1772662005110', front, back: '>> CORRECT: C |\n\nThe Windows Security Account Manager (SAM) file and the /etc/shadow file for Linux systems both contain passwords.' }
    const visual = getSecurityVisualForCard(card)
    expect(visual?.diagram).toBe('sam-shadow')
    expect(getSecurityVisualForCard({ ...card, back: '>> CORRECT: D |' })).toBeNull()
    expect(getSecurityVisualForCard({ ...card, front: 'Andere Frage' })).toBeNull()
    const html = renderToStaticMarkup(createElement(SecurityVisualization, { visual: visual! }))
    expect(html).toContain('SAM gehört zur Registry')
    expect(html).toContain('/etc/passwd')
    expect(html).toContain('/etc/shadow')
    expect(html).toContain('Passwort-Hashes')
  })

  it('verlinkt die Typosquatting-Grafik auf eine erreichbare Fachquelle statt auf das entfernte CISA-PDF', () => {
    expect(SECURITY_VISUALS['newinfo-domain2-61ef94df4d140b849ec8'].source)
      .toBe('https://attack.mitre.org/techniques/T1583/001/')
  })

  it('bindet die drei neuen Port-Vergleiche an ihre unveränderten Fragen und Antwortschlüssel', () => {
    const cases = [
      { id: 'sy0701-ports-smb', diagram: 'port-smb', key: 'B', front: 'Ein Windows-Dateiserver bietet SMB direkt über TCP an, ohne NetBIOS-Sitzung. Welcher Standardport wird am Server benötigt?\nA: TCP 139\nB: TCP 445\nC: TCP 3389\nD: UDP 137' },
      { id: 'sy0701-ports-tacacs', diagram: 'port-tacacs', key: 'B', front: 'Ein Router soll für die Geräteadministration einen TACACS+-Server kontaktieren. Welcher Standardtransport passt?\nA: UDP 49\nB: TCP 49\nC: UDP 1812\nD: TCP 636' },
      { id: 'sy0701-ports-syslog-tls', diagram: 'port-syslog-tls', key: 'C', front: 'Ein Log-Collector soll Syslog direkt über TLS empfangen. Welcher Standard-Zielport ist dafür vorgesehen?\nA: UDP 514\nB: TCP 514\nC: TCP 6514\nD: UDP 162' },
    ]
    for (const { id, diagram, key, front } of cases) {
      const card = { id, front, back: `>> CORRECT: ${key} |\n\nBegründung` }
      expect(getSecurityVisualForCard(card)?.diagram).toBe(diagram)
      expect(getSecurityVisualForCard(card)?.condenseDistractors).toBe(true)
      expect(getSecurityVisualForCard({ ...card, front: `${front} ` })).toBeNull()
      expect(getSecurityVisualForCard({ ...card, back: `>> CORRECT: ${key === 'B' ? 'C' : 'B'} |` })).toBeNull()
    }
  })

  it('bindet PKI, Hardware-Vertrauen und die ergänzten Ports an die geprüften Originalkarten', () => {
    const cases = [
      { id: 'newinfo-domain1-efe5e2748078a12d85fb', diagram: 'csr-flow', key: 'D', front: 'Ilya wants to create a certificate signing request. Which of the following is not a typical part of a CSR?\nA: The common name of the server\nB: The organization’s legal name\nC: A contact email address\nD: The organization’s phone number' },
      { id: 'newinfo-domain1-f461e5231b8ca0ebd7da', diagram: 'certificate-identity', key: 'C', front: 'Wayne wants to allow systems to claim identities as part of his AAA process. Which of the following is most commonly used to identify both individuals and systems?\nA: Tokens\nB: Smartcards\nC: Certificates\nD: Usernames' },
      { id: 'newinfo-domain1-c89e3ac97690fcf35909', diagram: 'key-establishment', key: 'C', front: 'Diffie-Hellman and RSA are both examples of what important encryption-related solution?\nA: Rekeying\nB: Certificate revocation protocols\nC: Key exchange algorithms\nD: Key generation algorithms' },
      { id: 'newinfo-domain1-2ece3ae2f15f612d554a', diagram: 'hardware-trust', key: 'C', front: 'Jason knows that his Apple system uses a separate portion of its SoC (system on chip) to store keys and biometric information. What is this specialized component called?\nA: A TPM\nB: A HSM\nC: A secure enclave\nD: A screened subnet' },
      { id: 'newinfo-domain1-7955d58f09209cab6c63', diagram: 'hardware-trust', key: 'C', front: 'What hardware component is used to generate, store, and manage cryptographic keys?\nA: A CPU\nB: A NSA\nC: A TPM\nD: A CCA' },
      { id: 'sy0701-ports-kerberos', diagram: 'port-kerberos', key: 'B', front: 'Ein Kerberos-Client muss seinen KDC für Tickets erreichen. Welche Standardportnummer muss der Administrator berücksichtigen?\nA: 53\nB: 88\nC: 389\nD: 445' },
      { id: 'sy0701-ports-ntp', diagram: 'port-ntp', key: 'B', front: 'Die Uhrzeit eines Servers wird per klassischem NTPv4 mit einem Zeitserver synchronisiert. Welcher Standard-Zielport ist zu erwarten?\nA: UDP 53\nB: UDP 123\nC: TCP 443\nD: UDP 500' },
      { id: 'sy0701-ports-rdp', diagram: 'port-rdp', key: 'C', front: 'Eine interne Firewall soll eine Windows-Remote-Desktop-Sitzung zum Standard-RDP-Port zulassen. Welche Portnummer ist richtig?\nA: 22\nB: 443\nC: 3389\nD: 5900' },
    ]
    for (const { id, diagram, key, front } of cases) {
      const card = { id, front, back: `>> CORRECT: ${key} |\n\nGeprüfte Erklärung` }
      expect(getSecurityVisualForCard(card)?.diagram).toBe(diagram)
      expect(getSecurityVisualForCard({ ...card, front: `${front} ` })).toBeNull()
      expect(getSecurityVisualForCard({ ...card, back: '>> CORRECT: A |' })).toBeNull()
    }
  })

  it('bindet die vier weiteren Grafiken an die bestehenden Karten, ohne Antworten zu ändern', () => {
    const cases = [
      { id: 'newinfo-domain2-cf11779f8e878b239ae2', diagram: 'configuration-review', key: 'B', front: 'Ryan needs to verify that no unnecessary ports and services are available on his systems, but he cannot run a vulnerability scanner. What is his best option?\nA: Passive network traffic capture to detect services\nB: A configuration review\nC: Active network traffic capture to detect services\nD: Log review' },
      { id: 'newinfo-domain1-7ba057a1288ccbb97e5a', diagram: 'cert-expiry-revocation', key: 'D', front: 'Annie notices that her browser shows that the certificate for the site she is visiting is not valid. After performing some checks, she sees that the certificate is on the CA’s certificate revocation list. Which of the following is not a reason for a certificate to be on a CRL?\nA: The CA is compromised.\nB: The certificate’s private key was compromised.\nC: The certificate was signed with a stolen key.\nD: The certificate expired.' },
      { id: 'newinfo-domain1-a334fe0cbb3fb36d6648', diagram: 'bitlocker-escrow', key: 'C', front: 'Yasmine submits the Windows BitLocker key to a central repository after she encryptions the machine. The central repository allows files to be uploaded, but not read, and is protected with access requiring special permissions. What type of solution is Yasmine’s company using?\nA: A hardware security module\nB: Perfect forward secrecy\nC: Key escrow\nD: Private keys' },
      { id: 'newinfo-domain2-c48e51ffd457b1e0b13e', diagram: 'aws-security-group', key: 'B', front: 'Amanda is assessing the potential for issues with her organization’s recently adopted IaaS vendor. What cloud vulnerability should she worry about if her system administrators do not effectively manage security groups in AWS?\nA: Insecure APIs\nB: Misconfigurations\nC: Malicious insiders\nD: MFA‐based attacks' },
    ]
    for (const { id, diagram, key, front } of cases) {
      const card = { id, front, back: `>> CORRECT: ${key} |\n\nUnveränderte Erklärung` }
      expect(getSecurityVisualForCard(card)?.diagram).toBe(diagram)
      expect(getSecurityVisualForCard({ ...card, front: `${front} ` })).toBeNull()
      expect(getSecurityVisualForCard({ ...card, back: '>> CORRECT: A |' })).toBeNull()
    }
  })

  it('referenziert genau 188 verschiedene bestehende Karten, ohne deren Inhalte zu speichern', () => {
    expect(SECURITY_VISUAL_CARD_IDS).toHaveLength(188)
    expect(new Set(SECURITY_VISUAL_CARD_IDS).size).toBe(188)
    expect(new Set(Object.values(SECURITY_VISUALS).map(visual => visual.diagram)).size).toBe(142)
    for (const visual of Object.values(SECURITY_VISUALS)) {
      expect(visual.source).toMatch(/^https:\/\//)
      expect(visual.title.trim()).not.toBe('')
      expect(visual.conclusion.trim()).not.toBe('')
      expect(visual).not.toHaveProperty('front')
      expect(visual).not.toHaveProperty('back')
    }
  })

  it('bindet die Grafik an die Frage und richtige Option, nicht an den Erklärungstext', () => {
    const id = 'newinfo-domain1-5fd591ee19f1274007bd'
    const front = 'Charles wants to reduce the threat scope of compromised credentials. What type of the following security controls is best suited to meeting this need?\nA: Single sign-on\nB: Federation\nC: Zero trust\nD: Multifactor authentication (MFA)'
    expect(getSecurityVisualForCard({ id, front, back: '>> CORRECT: C |\n\nNeue Erklärung.' })).not.toBeNull()
    expect(getSecurityVisualForCard({ id, front, back: '>> CORRECT: D |\n\nAndere Lösung.' })).toBeNull()
    expect(getSecurityVisualForCard({ id, front: 'Andere Frage', back: '>> CORRECT: C |' })).toBeNull()
    expect(getSecurityVisualForCard({ id: 'fremde-karte', front: '', back: '' })).toBeNull()
  })

  it('zeigt für Tokenisierung eine getrennte Zuordnung und für symmetrische Verschlüsselung denselben Schlüssel auf beiden Seiten', () => {
    const tokenHtml = renderToStaticMarkup(createElement(SecurityVisualization, {
      visual: SECURITY_VISUALS['newinfo-domain1-3d6df44d578bd822949e'],
    }))
    const symmetricHtml = renderToStaticMarkup(createElement(SecurityVisualization, {
      visual: SECURITY_VISUALS['newinfo-domain1-5aa73588278d71677b81'],
    }))
    expect(tokenHtml).toContain('data-diagram="tokenization"')
    expect(tokenHtml).toContain('Geschützter Token-Dienst')
    expect(tokenHtml).toContain('Anwendung / Tabelle')
    expect(tokenHtml).toContain('kunde@example.test')
    expect(symmetricHtml).toContain('data-diagram="symmetric"')
    expect(symmetricHtml).toContain('geheimer Schlüssel K')
    expect(symmetricHtml).toContain('derselbe Schlüssel K')
    expect(symmetricHtml).toContain('Übertragungsweg')
    expect(tokenHtml).toContain('Fachquelle')
  })

  it('lässt nur Grafiken mit einem kartenbezogenen, sichtbaren Fachunterschied durch das Grafik-Gate', () => {
    // Die Aussagen hier sind absichtlich pro Diagramm festgelegt: Ein neues generisches
    // Ablaufdiagramm erfüllt den Gate-Test nicht allein durch Titel und Quellenlink.
    const visualEvidence: Record<string, string[]> = {
      'zero-trust': ['Prüfung pro Zugriff', 'Identität', 'Gerät', 'Kein pauschaler Netzzugang'],
      pep: ['Policy Engine', 'entscheidet: erlauben / verweigern', 'Policy Enforcement Point', 'Tor / Durchsetzung'],
      symmetric: ['Sender · verschlüsselt', 'geheimer Schlüssel K', 'derselbe Schlüssel K', 'Übertragungsweg'],
      asymmetric: ['öffentlicher Schlüssel des Empfängers', 'eigener privater Schlüssel', 'schematisches Chiffrat'],
      tokenization: ['Geschützter Token-Dienst', 'kunde@example.test', 'tok_8F2A', 'Anwendung / Tabelle', 'Nur hier ist die Zuordnung bekannt'],
      masking: ['1234 5678 9012 1234', '•••• •••• ••••', 'Nur die letzten vier Ziffern sind sichtbar'],
      segmentation: ['Zone 1 · kompromittiert', 'Segmentgrenze · Regelprüfung', 'Direkter Datenbankzugriff: blockiert', 'Zone 2 · geschützt'],
      risk: ['Eintritts-', 'Auswirkung →', 'aria-pressed="true"', 'Markierter Fall:', 'Qualitatives Beispiel'],
      rto: ['Ausfall', 'RTO-Grenze (+4 h)', 'data-marker="rto-deadline"', 'data-marker="actual-recovery"', 'Ziel erreicht'],
      playbook: ['Alarm: verdächtige Anmeldung', 'Vorfall bestätigt?', 'Betroffene Systeme isolieren', 'Nein:', 'Nach Eindämmung:'],
      collision: ['A ≠ B', 'Hash(A)', 'Hash(B)', 'Hash(A) = Hash(B)', 'kein berechneter Hashwert'],
      wildcard: ['*.example.com', 'sales.example.com', 'support.example.com', 'api.sales.example.com', 'Passt nicht allein'],
      'file-integrity': ['Referenz · zuvor gespeichert', 'Aktuell · nach Änderung', 'h₁ ≠ h₂ → Alarm', 'nicht blockiert'],
      'signed-logs': ['H(Log)', 'Renees privater Schlüssel', 'Digitale Signatur', 'Renees öffentlichem Schlüssel', 'Hash ohne Signatur'],
      'data-controller': ['Controller · entscheidet', 'Wozu? → Zweck', 'Wie? → Mittel', 'Processor · führt aus', 'beauftragt'],
      availability: ['Geplant', 'Tatsächlich', 'Verlängerung', 'Dienst erreichbar', 'Verfügbarkeit betroffen'],
      'dns-poisoning': ['Korrekter DNS-Eintrag', 'Vergifteter DNS-Eintrag', 'portal.example', '192.0.2.10', '198.51.100.20'],
      'on-path': ['Angreifer · Zwischenstation', 'Empfängt und leitet weiter', 'Durchgeleiteter Verkehr', 'Verschlüsselter Inhalt'],
      csrf: ['Fremde Seite', 'Browser des angemeldeten Nutzers', 'Sitzungscookie', 'Vertrauenswürdige Website', 'XSS'],
      'risk-transfer': ['100.000 € Schaden', '70.000 € · vertraglich gedeckt', '30.000 € · verbleiben', 'ungedeckte Folgen'],
      'risk-avoid': ['Webdienst online', 'SQL-Injection-Stelle erreichbar', 'Dienst offline', 'Weiterbetrieb mit einem Schutzfilter'],
      'version-control': ['Commit v1', 'Commit v2', 'Commit v3', 'Deployment: bewusst v3 gewählt', 'nicht von selbst'],
      'bluetooth-attacks': ['Bluejacking', 'Angreifer → Telefon', 'Bluesnarfing', 'Telefon → Angreifer', 'Daten werden entwendet'],
      reconnaissance: ['Aktiv · Nmap', 'Tester → Scan-Pakete → Ziel', 'Passiv · Shodan', 'Tester → bestehender Index', 'Keine eigene Anfrage'],
      'allow-list': ['Erlaubt', 'cdn.vendor.test', 'Update blockiert', 'Benötigte Adresse zur Allowlist hinzufügen'],
      'file-encryption': ['Freigabe A', 'bericht.enc', 'Freigabe B', 'Alice:', 'Bob:', 'unverändert kopiert'],
      'zero-trust-policy': ['Gerätezustand', 'Bedrohungsdaten', 'Policy Engine', 'Vertrauenslage', 'PEP am Dienst'],
      backout: ['Version 1 funktioniert', 'Version 2 schlägt fehl', 'Backout auslösen', 'Version 1 wiederherstellen'],
      ddos: ['Host A', 'Host B', 'Host C', 'Paketflut', 'Dienst überlastet', 'DDoS'],
      permissions: ['/etc · chmod 777', 'Eigentümer', 'Gruppe', 'Alle anderen', '7 = 4+2+1'],
      'privilege-escalation': ['root', 'Rechteausweitung nach Exploit', 'Webanwendung / niedrige Rechte'],
      'data-subject': ['Data Subject', 'personenbezogene Daten', 'Artikel 17:', 'prüft Voraussetzungen', 'mögliche Ausnahmen'],
      sla: ['Service Level Agreement', '99,9 % Verfügbarkeit', 'Bei Verfehlung:', 'vereinbarte Abhilfe'],
      bia: ['Kritische Funktion', 'Auftragsdatenbank', 'Business Impact Analysis', 'Wiederherstellungsziele'],
      'continuous-risk': ['Änderung 1', 'Änderung 2', 'Änderung 3', 'Risikoprüfung', 'Kein einmaliges Prüfdatum'],
      'bc-documents': ['BC-Policy · Wozu?', 'BC-Plan · Wie reagieren?', 'Runbook · Einzelschritte', 'Prioritäten, Rollen'],
      'gap-analysis': ['Soll · Zielprofil', 'Ist · aktuelle Kontrollen', 'Nur Passwortanmeldung', 'MFA für Administratorkonten fehlt'],
      dependencies: ['Identität ✓', 'Datenbank ✕', 'Anwendung installiert', 'Start dennoch blockiert'],
      'change-impact': ['09:00', '10:00', '40 Minuten Ausfall', 'Nutzer können in dieser Zeit keine Aufträge bearbeiten'],
      'signed-update': ['privater Signaturschlüssel', 'öffentlichem Schlüssel prüfen', 'keine gültige neue Signatur erzeugen'],
      'dns-reflection': ['gefälschte Quell-IP = Opfer', 'Resolver A', 'Resolver B', 'Resolver C', 'gebündelte DNS-Antworten'],
      'virus-spread': ['infizierte Datei', 'Kopien / Weitergabe', 'Rechner A', 'Rechner B', 'Rechner C'],
      'concurrent-sessions': ['10:00 · Berlin', '10:00 · New York', 'auffällige Parallelität', 'VPN'],
      'exposure-factor': ['30 % Verlust', '100.000 €', 'Exposure Factor', '30.000 €'],
      'risk-threshold': ['festgelegte Schwelle', 'Behandlung erforderlich', 'keine allgemeingültige Skala'],
      'risk-appetite': ['Konservativ · enger Bereich', 'Expansionary · breiterer Bereich', 'keine festen Grenzwerte'],
      'edr-ransomware': ['EDR: erkennen, untersuchen, eindämmen', 'Backup: Daten wiederherstellen', 'Versicherung: gedeckte Kosten'],
      'key-stretch': ['Ohne Kostenfaktor', 'viele aufwendige Rechenschritte', 'jede Offline-Vermutung', 'nicht die Zahl möglicher Passwörter'],
      'password-storage': ['Passwort + Salt', 'gespeicherter Verifier', 'keine Entschlüsselung', 'Wer den Schlüssel erlangt'],
      'sam-shadow': ['Registry = Oberbegriff', 'SAM-Hive', 'SAM gehört zur Registry', '/etc/passwd', '/etc/shadow', 'Passwort-Hashes'],
      'configuration-review': ['Dienst B · aktiv', 'bleibt ungenutzt', '✓ sichtbar', 'kein Ereignis', 'Firewall-Regeln'],
      'cert-expiry-revocation': ['notAfter erreicht', 'Kein neuer CRL-Eintrag nötig', 'Schlüssel kompromittiert', 'Seriennummer in CRL'],
      'bitlocker-escrow': ['BitLocker-Laufwerk', 'Wiederherstellungsschlüssel', 'Geschütztes Repository', 'berechtigte Person'],
      'aws-security-group': ['Admin-Netz', '0.0.0.0/0', 'Security Group', 'gleicher Port', 'kundenseitig gesetzten Quellregel'],
      'port-smb': ['TCP 445', 'NetBIOS Session', 'TCP 139', 'UDP 137'],
      'port-tacacs': ['TACACS+', 'TCP 49', 'RADIUS', 'UDP 1812', 'UDP 49'],
      'port-syslog-tls': ['UDP 514', 'TCP 514', 'TCP 6514', 'TLS-Handshake'],
      'cert-revocation': ['Privater Schlüssel', 'Certificate Revocation List', 'Seriennummer #42 · revoked', 'nicht mehr vertrauen'],
      ocsp: ['OCSP-Anfrage', 'OCSP-Responder', 'good', 'revoked', 'unknown', 'Client direkt eine CRL'],
      'root-trust': ['Root of Trust', 'signierter Bootloader', 'signierter OS-Code', 'Vertrauenskette bricht'],
      honeypot: ['sucht scheinbar verwundbaren Dienst', 'Honeypot · Köder', 'Angriffsversuche werden protokolliert', 'nicht der Köder'],
      'ntlm-relay': ['NTLM-Challenge', 'leitet Authentisierung weiter', 'sieht scheinbar das Opfer', 'nicht das Klartextpasswort'],
      'identity-proofing': ['Amtlich ausgestellter Ausweis', 'Ist das Dokument echt und gültig?', 'Gehört es zur antragstellenden Person?', 'Selbst angelegte E-Mail-Adresse'],
      'known-environment': ['Unknown', 'Partially known', 'Known environment', 'Architektur + Dienste + Konfigurationen', 'Drittpartei'],
      'soc2-assurance': ['Dienstleister', 'Unabhängiger Service Auditor', 'über einen Zeitraum · Type 2', 'kein SOC-2-Type-2-Bericht'],
      typosquatting: ['auktion.example', 'aukton.example', 'echten Webserver-Log', 'fremde Domain'],
      'out-of-cycle': ['10:00 ✓', '10:15 !', '10:30 !', '11:00 ✓', 'stündlich', 'zusätzliche Ausführungen'],
      'agentless-surface': ['installierter Agent', 'eigener Angriffspfad', 'kein lokaler Agent', 'weder „ressourcenfrei“ noch „unangreifbar“'],
      'full-disk': ['Full-Disk Encryption', 'System 🔒', 'Daten 🔒', 'Rest offen', 'ausgeschaltet'],
      bollards: ['Parkplatz · Fahrzeug', 'Aufprallweg blockiert', 'Backup-Generator · geschützt', 'Tempohügel'],
      'risk-budget': ['bis zu 10 Mio. $ / Jahr', 'Risk Appetite', 'Einzelrisiko akzeptieren', 'Organisationskontext'],
      'chain-custody': ['Beweisstück E-17', 'Übergabe', 'Beide Personen, Zeitpunkt und Zweck', 'gesicherter Schrank'],
      tabletop: ['Szenario auf Papier', 'IT: Wer isoliert?', 'Leitung: Wer informiert?', 'Tatsächlichen Failover'],
      containment: ['Malware erkannt · noch vorhanden', 'Netzwerkverbindung', 'Ausbreitung begrenzt', 'Beseitigen: folgt'],
      dmarc: ['From: bank.example', 'SPF/DKIM', 'p=reject', 'Zurückweisung', 'Alignment'],
      'acl-order': ['HTTP · TCP 80', 'HTTPS · TCP 443', 'STOP: blockiert', 'STOP: erlaubt', 'unerreichbar'],
      'partial-environment': ['Unknown', 'Partially known', '✓ Ziele, OS, Software', '? Konfigurationen, Details', 'Known'],
      'policy-standard': ['Policy · Absicht / Richtung', 'Standard · verbindliche Regel', 'Verfahren · konkrete Schritte', 'Freigabe dokumentieren'],
      'policy-exception': ['Interne Policy', 'Abweichung beantragt', 'Change-Control', 'Ablaufdatum', 'gesetzlichen Anforderungen'],
      'risk-acceptance': ['Handykamera', 'Telefone vollständig verbieten', 'Telefone bleiben erlaubt', 'Kamerarisiko bleibt bestehen'],
      'load-balancer-vip': ['Internet-Client', 'Virtuelle IP · VIP', 'Pool-Server A', 'Pool-Server B', 'Management-IP'],
      'vlan-boundary': ['Ein physischer Switch', 'VLAN 10', 'VLAN 20', 'logische Broadcast-Domänen', 'Kein Air Gap'],
      'backup-rpo': ['00:00', '06:00', 'knapp 6 Stunden Datenverlust', '12- oder 24-Stunden-Abstand'],
      'power-bridge': ['Netzstrom', 'USV sofort', 'Generator startet', 'kurze Unterspannung'],
      'parallel-test': ['Primärsystem → echte Nutzer', 'Ausweichsystem → Testlast', 'Failover-Test', 'Produktivlast'],
      'physical-isolation': ['Unternehmensnetz', 'Kein Netzpfad', 'ICS / SCADA', 'Ein VLAN'],
      'least-privilege': ['Bericht prüfen', 'Lesen ✓', 'Löschen ✕', 'Admin ✕'],
      'legal-hold': ['Normaler Lebenszyklus', 'Aufbewahrungsfrist endet → löschen', 'Löschung gestoppt', 'Nur Daten im Umfang'],
      'mail-dlp': ['Ausgehende E-Mail', 'SSN:', 'DLP-Regel', 'warnen oder blockieren', 'FDE'],
      'secure-cookie': ['Set-Cookie:', 'https://example.test', 'http://example.test', 'nicht mitgesendet', 'Speicherung'],
      'siem-correlation': ['VPN-Log', 'Identitäts-Log', 'Konto Alex', 'SIEM korreliert', 'Alarm'],
      'forensic-timeline': ['System A · korrekte Uhr', 'System B · Uhr +5 min', 'tatsächlich 08:57', 'Korrigiert: Kopie → Login'],
      'round-robin': ['1 → Server A', '2 → Server B', '3 → Server C', '4 → Server A', 'nicht gemessen'],
      'span-tap': ['SPAN · Switch spiegelt eine Kopie', 'Originalverkehr läuft', 'Kopie zum Monitor-Port', 'Inline-Tap', 'nicht inline'],
      'data-state': ['At rest · gespeichert', 'In transit · unterwegs', 'In use · verarbeitet', 'Anmeldedaten'],
      'vm-snapshot': ['VM sauber · Snapshot S1', 'Malware / spätere Änderungen', 'Revert zu S1', 'legitime Änderungen'],
      'offsite-backup': ['Primärstandort · Störung', 'Entfernter Backup-Standort', 'Rückholen per Download oder Transport', 'Wiederherstellungsplan'],
      'replica-recovery': ['Betriebsbereite Replik', 'Replik übernimmt', 'Band-Backup', 'Rückspielvorgang'],
      'air-gap-ca': ['Online-PKI', 'Kein Netzpfad', 'Offline-Root-CA', 'USB nur kontrolliert'],
      'dot1x-port': ['Vor Authentisierung', 'EAPOL → unkontrollierter Port', 'Normaler Datenverkehr ✕', 'Kontrollierter Port freigegeben'],
      'phishing-ticket': ['infosec@example.com', 'Ticket #42', 'Keine automatische Phishing-Abwehr', 'Blockierregel'],
      'network-flow': ['Quelle', 'Ziel', 'Port', 'Protokoll', '48 MB', 'NXLog'],
      'snmp-bandwidth': ['SNMP-Interface-Zähler', '09:15 · Peak', 'PRTG/Cacti', 'keine Exfiltration'],
      'lessons-learned': ['Recovery abgeschlossen', 'Danach · Lessons Learned', 'Wo stockte die Reaktion?', 'Playbook'],
      'cis-baseline': ['CIS-Benchmark wählen', 'Zuerst: Eignung prüfen', 'benötigten Dienst abschalten', 'testen → ausrollen'],
      'dr-sites': ['Cold Site', 'Warm Site', 'Hot Site', 'IT und Daten erst einrichten', 'Rasche Umschaltung möglich'],
      'ip-hash': ['10.0.0.8', 'Pool-Index 2', 'Backend B', 'NAT'],
      'path-diversity': ['Gemeinsame Trasse', 'Ein Bagger trifft beide', 'Getrennte Trassen', 'Südweg'],
      'fail-closed': ['fail-closed', 'Sensor ✕ ╳ Ziel', 'fail-open', 'Bypass'],
      'exercise-spectrum': ['Tabletop', 'Simulation', 'Übungsumgebung', 'Live-Failover'],
      'backup-vs-replication': ['Wiederherstellungspunkte', '08:00', 'Replikation', 'Fehler replizieren'],
      'cloud-responsibility': ['IaaS-Provider', 'Physische Hosts', 'Gastbetriebssystem', 'IaaS-Beispiel'],
      'cluster-vs-balancer': ['ein logischer Dienst', 'Knoten A', 'vorgeschalteter Verteiler', 'VIP'],
      'air-gap-device': ['Physischer Air Gap', 'Kein Switch', 'Nur logische Trennung', 'Wechselmedien'],
      'same-factor': ['PIN + Passwort', 'Wissen + Wissen', 'Hardware-Token', 'Wissen + Besitz'],
      'scan-outcomes': ['Schwachstelle vorhanden', 'False Negative', 'False Positive', 'Patch zurückportiert'],
      'alert-tuning': ['Rohereignisse', 'Tippfehler', 'Abgestimmte Regel', 'Muster: prüfen'],
      'forensic-image-hash': ['Originalmedium', 'Hash H₁', 'Forensisches Image', 'H₁ = H₂'],
      'iptables-rule': ['INPUT', 'TCP', '10.0.10.0/24', '22 · SSH', 'DROP'],
      'wifi-heatmap': ['AP ●', 'schwach', 'stark nahe AP', 'keine real gemessenen dBm-Werte'],
      'saml-vs-oauth': ['XML-Assertion', 'Service Provider', 'Access Token', 'Nutzerpasswort'],
      'edr-hash-match': ['Threat-Intel-IoC', '9f2a', 'EDR auf Endpunkt', 'Treffer'],
      'custody-video': ['Videodatei V-17', 'Entnahmeprotokoll', 'Wer? Wann? Warum?', 'Ermittler quittiert'],
      'rbac-abac': ['RBAC · Rolle', 'Rolle „HR“', 'ABAC · Attribute', 'Standort = London'],
      'csr-flow': ['Privater Schlüssel bleibt hier', 'PKCS #10 · CSR', 'Öffentlicher Schlüssel', 'Telefonnummer: keine definierte CSR-Pflichtangabe'],
      'certificate-identity': ['Person', 'System', 'CA-signiertes Zertifikat', 'Identität + öffentlicher Schlüssel + Gültigkeit'],
      'key-establishment': ['Diffie-Hellman · Key Agreement', 'RSA · Key Transport', 'gemeinsames Geheimnis K', 'Schlüsseletablierung / Key Exchange'],
      'hardware-trust': ['TPM · Plattformmodul', 'Secure Enclave · Apple-SoC', 'HSM · separates Sicherheitsmodul', 'nicht austauschbar'],
      'port-kerberos': ['Kerberos-Client', 'TCP oder UDP · Port 88', 'KDC', '88 · Kerberos'],
      'port-ntp': ['NTP-Client', 'Anfrage · UDP 123', 'NTP-Zeitserver', 'Logs und Ereignisse besser korrelierbar'],
      'port-rdp': ['Direkte RDP-Sitzung', 'TCP/UDP 3389', 'Gesonderter Gateway-Pfad', 'HTTPS 443'],
      'port-remote': ['SSH · TCP 22', 'verschlüsselte Shell', 'Telnet · TCP 23', 'offene Terminalsitzung'],
      'port-web': ['http:// · TCP 80', 'https:// · TCP 443', 'Browser → TLS → HTTP', 'keine Aussage über jeden'],
      'port-dns': ['DNS · UDP 53', 'DNS · TCP 53', 'Zonentransfers', 'nur UDP'],
      'port-dhcp': ['Client · UDP 68', 'Anfrage an UDP 67', 'DHCPv4-Server · UDP 67', 'Antwort: Server UDP 67 → Client UDP 68'],
      'port-mail': ['Mailclient', 'Submission · TCP 587', 'Submission-Server', 'Relay · TCP 25', 'Ziel-Mailserver'],
      'port-mail-access': ['IMAPS · TCP 993', 'POP3S · TCP 995', 'TLS sofort', '143/110'],
      'port-ldap': ['LDAP · TCP 389 + STARTTLS', 'AD-LDAPS · TCP 636', 'TLS sofort', 'nicht zwangsläufig ungeschützt'],
      'port-radius': ['RADIUS-Authentisierung', 'UDP 1812', 'RADIUS-Accounting', 'UDP 1813'],
      'port-snmp': ['Abfrage · UDP 161 am Gerät', 'Manager →', 'Trap · UDP 162 am Manager', 'Gerät →'],
      'port-ipsec': ['IKE-Start · UDP 500', 'NAT erkannt', 'NAT-T · UDP 4500', 'gekapseltes ESP'],
      'port-sftp': ['SFTP · SSH-Familie', 'SSH TCP 22', 'FTPS · FTP-Familie', 'anderes Portmodell'],
    }
    for (const visual of Object.values(SECURITY_VISUALS)) {
      const html = renderToStaticMarkup(createElement(SecurityVisualization, { visual }))
      expect(html).toContain(`data-diagram="${visual.diagram}"`)
      expect(visualEvidence[visual.diagram], `Kein Grafik-Gate für ${visual.diagram}`).toBeDefined()
      for (const evidence of visualEvidence[visual.diagram]) {
        expect(html, `${visual.diagram}: ${evidence}`).toContain(evidence)
      }
      expect(html).toContain(`href="${visual.source}"`)
      for (const additional of visual.additionalSources ?? []) expect(html).toContain(`href="${additional.url}"`)
    }
    expect(Object.keys(visualEvidence).sort()).toEqual([...new Set(Object.values(SECURITY_VISUALS).map(visual => visual.diagram))].sort())
  })

  it('macht bei Risiko und RTO die Wirkung einer geänderten Annahme sichtbar', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    try {
      await act(async () => root.render(createElement(SecurityVisualization, {
        visual: SECURITY_VISUALS['newinfo-domain5-13158da28a877eb4bafe'],
      })))
      expect(container.textContent).toContain('Risikostufe hoch')
      const lowRisk = container.querySelector<HTMLButtonElement>('button[aria-label="Wahrscheinlichkeit niedrig, Auswirkung niedrig: Risiko niedrig"]')
      expect(lowRisk).not.toBeNull()
      await act(async () => lowRisk?.click())
      expect(lowRisk?.getAttribute('aria-pressed')).toBe('true')
      expect(container.textContent).toContain('Risikostufe niedrig')

      await act(async () => root.render(createElement(SecurityVisualization, {
        visual: SECURITY_VISUALS['newinfo-domain5-0fda65849012414ec2ef'],
      })))
      expect(container.textContent).toContain('Ziel erreicht')
      const late = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('12:30'))
      expect(late).toBeDefined()
      await act(async () => late?.click())
      expect(late?.getAttribute('aria-pressed')).toBe('true')
      expect(container.textContent).toContain('Ziel verfehlt')
      expect(container.querySelector('[data-marker="actual-recovery"]')?.getAttribute('style')).toContain('90%')
    } finally {
      await act(async () => root.unmount())
      container.remove()
    }
  })

  it('zeigt bei der Allowlist die Folge einer gepflegten neuen Adresse', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    try {
      await act(async () => root.render(createElement(SecurityVisualization, {
        visual: SECURITY_VISUALS['newinfo-domain1-202bf7113bff1e0d27f5'],
      })))
      expect(container.textContent).toContain('Update blockiert')
      const button = container.querySelector<HTMLButtonElement>('button[aria-pressed]')
      expect(button).not.toBeNull()
      await act(async () => button?.click())
      expect(button?.getAttribute('aria-pressed')).toBe('true')
      expect(container.textContent).toContain('Update erreichbar')
    } finally {
      await act(async () => root.unmount())
      container.remove()
    }
  })
})
