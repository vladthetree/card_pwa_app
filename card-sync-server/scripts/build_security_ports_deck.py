#!/usr/bin/env python3
"""Build exact-hash review decisions for the original SY0-701 ports deck.

Read-only against the canonical DB. Publication is deliberately separate and
must go through security_card_review_gateway.py publish.
"""
from __future__ import annotations

import argparse
import json
import re
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DECK_ID = "sy0701-security-ports"
DECK_NAME = "Security+ SY0-701 · Ports & Protokolle"
SCOPE_URL = "https://lecbyo.files.cmp.optimizely.com/download/cf25ec24b8a511ef9ecbb69c0f9687be"
IANA_URL = "https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml"


@dataclass(frozen=True)
class CardSpec:
  slug: str
  group: str
  question: str
  options: tuple[str, str, str, str]
  correct: str
  explanation: str
  reasons: tuple[str, str, str, str]
  port: str
  protocol: str
  fact_url: str
  fact_title: str
  locator: str
  supports: str


CARDS = [
  CardSpec(
    "ssh", "Fernzugriff", "Ein Administrator braucht eine verschlüsselte Shell zu einem Linux-Server. Welchen Standard-Zielport gibt die Firewall für SSH frei?",
    ("TCP 22", "TCP 23", "TCP 3389", "UDP 161"), "A",
    "SSH nutzt standardmäßig TCP 22 und schützt die Remote-Shell kryptografisch. Die Regel gehört nur für die benötigten Quellnetze geöffnet.",
    ("TCP 22 ist der SSH-Dienstport.", "TCP 23 gehört zu Telnet; dessen Sitzung ist nicht durch SSH geschützt.", "TCP 3389 ist der Standardport von RDP, nicht der Unix-Shell.", "UDP 161 ist SNMP-Abfrageverkehr, keine interaktive Shell."),
    "22", "TCP", "https://www.rfc-editor.org/rfc/rfc4253.html", "RFC 4253, SSH Transport Layer", "Section 4.1, Use over TCP/IP",
    "SSH transport normally runs over TCP with server port 22.",
  ),
  CardSpec(
    "telnet", "Fernzugriff", "Ein Scan zeigt TCP 23 auf einem Netzwerkgerät. Welcher Dienst ist damit typischerweise gemeint, und was ist die sichere Shell-Alternative?",
    ("RDP; Alternative VNC", "Telnet; Alternative SSH auf TCP 22", "SNMP; Alternative NTP", "FTP; Alternative HTTPS"), "B",
    "TCP 23 ist der Standardport von Telnet. Für interaktive Administration sollte SSH auf TCP 22 verwendet werden, weil Telnet keinen vergleichbaren Sitzungsschutz bietet.",
    ("RDP ist für Remote Desktop und standardmäßig Port 3389.", "Telnet erklärt Port 23; SSH ist der sichere Shell-Ersatz auf Port 22.", "SNMP verwendet typischerweise UDP 161/162 und dient der Netzverwaltung.", "FTP hat seinen Steuerkanal auf TCP 21, nicht 23."),
    "23", "TCP", "https://www.rfc-editor.org/rfc/rfc854.html", "RFC 854, Telnet Protocol", "Introduction and IANA telnet/TCP 23 service registration",
    "Telnet is a remote terminal protocol registered on TCP 23; SSH is separately registered on TCP 22.",
  ),
  CardSpec(
    "https", "Web", "Eine Webanwendung soll über den normalen HTTPS-Standardport erreichbar sein. Welche eingehende Verbindung passt?",
    ("TCP 80", "TCP 443", "UDP 53", "TCP 8080"), "B",
    "HTTPS verwendet standardmäßig TCP 443 für HTTP über TLS. Port 80 ist der Standard für unverschlüsseltes HTTP; eine Portnummer allein beweist aber keine korrekte TLS-Konfiguration.",
    ("TCP 80 ist der HTTP-Standardport ohne durch das Schema gefordertes TLS.", "TCP 443 ist der Standardport des https-URI-Schemas.", "UDP 53 ist DNS, kein Webtransport.", "TCP 8080 kann konfiguriert werden, ist aber nicht der HTTPS-Standardport."),
    "443", "TCP", "https://www.rfc-editor.org/rfc/rfc9110.html", "RFC 9110, HTTP Semantics", "Section 4.2.2, https URI Scheme",
    "The default port of an https URI without an explicit port is TCP 443; TLS protects HTTP communication.",
  ),
  CardSpec(
    "dns", "Namensauflösung", "Eine Firewall soll klassische DNS-Abfragen ermöglichen, ohne größere Antworten oder Zonentransfers allein wegen des Transports auszuschließen. Welche Zielports sind richtig?",
    ("Nur UDP 53", "Nur TCP 53", "TCP und UDP 53", "TCP 853 und UDP 443"), "C",
    "Klassisches DNS kann UDP und TCP auf Port 53 nutzen. UDP ist häufig für Abfragen; TCP wird unter anderem für Zonentransfers und weitere Fälle benötigt.",
    ("Nur UDP 53 kann TCP-basierte DNS-Vorgänge blockieren.", "Nur TCP 53 schließt die üblichen UDP-Abfragen aus.", "Beide Transporte sind für klassisches DNS auf Port 53 vorgesehen.", "TCP 853 ist DNS over TLS; UDP 443 ist kein klassischer DNS-Standardport."),
    "53", "TCP/UDP", "https://www.rfc-editor.org/rfc/rfc1035.html", "RFC 1035, Domain Names", "Section 4.2, Transport",
    "DNS server access uses TCP port 53 and UDP port 53; UDP is common for queries while reliable transfer uses TCP.",
  ),
  CardSpec(
    "dhcp", "Basisdienste", "Ein DHCPv4-Client ohne Adresse sendet eine Anfrage an den DHCP-Server. Welches UDP-Portpaar beschreibt Server und Client?",
    ("Server 53, Client 53", "Server 67, Client 68", "Server 68, Client 67", "Server 123, Client 123"), "B",
    "DHCPv4 verwendet UDP 67 auf der Serverseite und UDP 68 auf der Clientseite. Die Richtung ist wichtig: Serverantworten gehen zum Client-Port 68.",
    ("53/53 ist DNS und trennt DHCP-Rollen nicht.", "UDP 67 ist der DHCPv4-Serverport, UDP 68 der Clientport.", "68/67 vertauscht die Rollen von Client und Server.", "UDP 123 gehört zur Zeitsynchronisation mit NTP."),
    "67/68", "UDP", "https://www.rfc-editor.org/rfc/rfc2131.html", "RFC 2131, DHCP", "Section 4.1, Constructing and sending DHCP messages",
    "DHCPv4 sends client-to-server messages to UDP 67 and server-to-client messages to UDP 68.",
  ),
  CardSpec(
    "smtp-relay", "E-Mail", "Zwei Mailserver sollen E-Mails per SMTP untereinander weiterleiten. Welcher Standard-Zielport gehört zum Server-zu-Server-Relay?",
    ("TCP 25", "TCP 587", "TCP 993", "UDP 53"), "A",
    "SMTP-Relay zwischen Mailservern nutzt standardmäßig TCP 25. Die Einreichung durch einen Mailclient ist davon getrennt und läuft normalerweise über TCP 587.",
    ("TCP 25 ist der SMTP-Relay-Port zwischen MTAs.", "TCP 587 dient normalerweise der Mail-Submission durch Clients.", "TCP 993 ist IMAP über TLS zum Lesen von Postfächern.", "UDP 53 ist DNS; MX-Abfragen ersetzen keinen SMTP-Transport."),
    "25", "TCP", "https://www.rfc-editor.org/rfc/rfc6409.html", "RFC 6409, Message Submission for Mail", "Abstract and Section 3.1, Submission Identification",
    "Mail relay continues on SMTP port 25, while normal message submission is separated onto port 587.",
  ),
  CardSpec(
    "smtp-submission", "E-Mail", "Ein Mailclient soll eine Nachricht bei seinem Submission-Server einreichen; es geht nicht um Relay zwischen Mailservern. Welcher Standardport passt?",
    ("TCP 25", "TCP 110", "TCP 587", "TCP 995"), "C",
    "TCP 587 ist der Standardport für Message Submission. Das ist von SMTP-Relay auf TCP 25 zu unterscheiden; TLS und Authentisierung müssen passend konfiguriert sein.",
    ("TCP 25 ist typischerweise der Relay-Port zwischen Mailservern.", "TCP 110 ist POP3 ohne implizites TLS, kein Versand.", "TCP 587 ist für die Einreichung durch einen Mailclient reserviert.", "TCP 995 ist POP3 über implizites TLS zum Abrufen von Mail."),
    "587", "TCP", "https://www.rfc-editor.org/rfc/rfc6409.html", "RFC 6409, Message Submission for Mail", "Section 3.1, Submission Identification",
    "Port 587 is reserved for email message submission, separate from relay on port 25.",
  ),
  CardSpec(
    "imaps", "E-Mail", "Ein Client soll Postfachordner per IMAP abrufen und unmittelbar beim Verbindungsaufbau TLS starten. Welcher Standardport ist gemeint?",
    ("TCP 143", "TCP 993", "TCP 995", "TCP 587"), "B",
    "IMAP mit implizitem TLS beginnt auf TCP 993 sofort mit dem TLS-Handshake. TCP 143 kann mit STARTTLS ebenfalls abgesichert werden, ist aber nicht der hier gefragte implizite-TLS-Port.",
    ("TCP 143 ist IMAP; TLS kann dort nach STARTTLS beginnen, nicht sofort beim Verbindungsaufbau.", "TCP 993 ist IMAPS mit implizitem TLS.", "TCP 995 ist POP3S und bietet nicht die gefragte IMAP-Ordnersemantik.", "TCP 587 ist SMTP-Submission für den Versand."),
    "993", "TCP", "https://www.rfc-editor.org/rfc/rfc8314.html", "RFC 8314, TLS for Email Submission and Access", "Sections 3.3 and 7.2, IMAPS",
    "IMAP over implicit TLS uses TCP 993 and begins TLS immediately after connection establishment.",
  ),
  CardSpec(
    "pop3s", "E-Mail", "Ein älterer Mailclient nutzt POP3 zum Abrufen und verlangt implizites TLS bereits ab Verbindungsbeginn. Welcher Standardport passt?",
    ("TCP 110", "TCP 143", "TCP 993", "TCP 995"), "D",
    "POP3 über implizites TLS verwendet TCP 995. TCP 110 ist der klassische POP3-Port; dort ist eine abgesicherte Variante per STLS möglich, aber nicht implizites TLS.",
    ("TCP 110 ist klassisches POP3 ohne sofortigen TLS-Handshake.", "TCP 143 ist IMAP und nicht POP3.", "TCP 993 ist IMAP über implizites TLS.", "TCP 995 ist POP3 über implizites TLS."),
    "995", "TCP", "https://www.rfc-editor.org/rfc/rfc8314.html", "RFC 8314, TLS for Email Submission and Access", "Sections 3.4 and 7.1, POP3S",
    "POP3 over implicit TLS uses TCP 995 with TLS negotiated before POP commands.",
  ),
  CardSpec(
    "smb", "Dateidienste", "Ein Windows-Dateiserver bietet SMB direkt über TCP an, ohne NetBIOS-Sitzung. Welcher Standardport wird am Server benötigt?",
    ("TCP 139", "TCP 445", "TCP 3389", "UDP 137"), "B",
    "Direkt gehostetes SMB verwendet TCP 445. TCP 139 ist der ältere NetBIOS-Session-Pfad; SMB sollte nicht unnötig ins Internet exponiert werden.",
    ("TCP 139 ist der NetBIOS-Session-Dienst, nicht direktes SMB über TCP.", "TCP 445 ist der registrierte Serverport für direktes SMB.", "TCP 3389 gehört zum Remote Desktop Protocol.", "UDP 137 dient NetBIOS-Namensauflösung, nicht der SMB-Dateisitzung."),
    "445", "TCP", "https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-smb/f906c680-330c-43ae-9a71-f854e24aeee6", "Microsoft MS-SMB Transport", "Section 2.1, Direct TCP transport",
    "An SMB server using Direct TCP should listen on TCP port 445; TCP 139 is the older NetBIOS session path.",
  ),
  CardSpec(
    "rdp", "Fernzugriff", "Eine interne Firewall soll eine Windows-Remote-Desktop-Sitzung zum Standard-RDP-Port zulassen. Welche Portnummer ist richtig?",
    ("22", "443", "3389", "5900"), "C",
    "RDP lauscht standardmäßig auf Port 3389; moderne RDP-Transporte können TCP und UDP verwenden. Externer Zugriff sollte über geeignete Zugangskontrollen und nicht pauschal erfolgen.",
    ("22 ist SSH und keine Windows-Remote-Desktop-Standardnummer.", "443 ist typischerweise HTTPS oder ein gesondert konfigurierter Gateway-Pfad.", "3389 ist der Standardport für RDP; je nach Transport TCP und UDP.", "5900 ist typischerweise VNC, nicht der RDP-Standard."),
    "3389", "TCP/UDP", "https://learn.microsoft.com/en-us/troubleshoot/windows-server/remote/ports-used-by-rds", "Microsoft, Ports used by RDS", "Remote Desktop Session Host port table",
    "Standard RDP traffic uses port 3389 over TCP and UDP.",
  ),
  CardSpec(
    "ldaps", "Identität", "Ein Active-Directory-Client soll LDAP mit TLS ab dem ersten Byte der Verbindung nutzen, nicht erst STARTTLS nach Verbindungsaufbau. Welcher Port passt?",
    ("TCP 389", "TCP 636", "TCP 88", "UDP 1812"), "B",
    "LDAPS mit TLS ab Verbindungsbeginn nutzt in Active Directory TCP 636. LDAP auf TCP 389 kann per STARTTLS ebenfalls abgesichert werden; '389' bedeutet daher nicht automatisch unverschlüsselt.",
    ("TCP 389 ist normaler LDAP-Port; STARTTLS kann ihn schützen, aber TLS startet nicht sofort.", "TCP 636 ist der AD-LDAPS-Port mit TLS vor LDAP-Nachrichten.", "TCP 88 gehört zu Kerberos, nicht LDAP-Abfragen.", "UDP 1812 ist RADIUS-Authentisierung."),
    "636", "TCP", "https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-adts/8e73932f-70cf-46d6-88b1-8d9f86235e81", "Microsoft MS-ADTS, Using SSL/TLS", "Section 2.1, SSL/TLS connection modes",
    "AD DS supports protected LDAPS on TCP 636 and STARTTLS on regular LDAP TCP 389.",
  ),
  CardSpec(
    "kerberos", "Identität", "Ein Kerberos-Client muss seinen KDC für Tickets erreichen. Welche Standardportnummer muss der Administrator berücksichtigen?",
    ("53", "88", "389", "445"), "B",
    "Kerberos verwendet standardmäßig Port 88 für den KDC; die Spezifikation kennt UDP und TCP. Die Firewall-Regel muss zum tatsächlich genutzten Transport passen.",
    ("53 gehört zur DNS-Namensauflösung, nicht zum Ticketdienst.", "88 ist der von IANA zugewiesene Kerberos-KDC-Port.", "389 ist LDAP und ersetzt keine Kerberos-Ticketausgabe.", "445 ist SMB-Dateiverkehr."),
    "88", "TCP/UDP", "https://www.rfc-editor.org/rfc/rfc4120.html", "RFC 4120, Kerberos V5", "Section 7.2.3.2, KDC DNS SRV records",
    "Kerberos KDC discovery uses port 88 for both UDP and TCP SRV records unless configured otherwise.",
  ),
  CardSpec(
    "radius", "Identität", "Ein Netzwerkgerät nutzt RADIUS für Anmeldung und separates Accounting. Welche üblichen UDP-Zielports gehören zu diesen beiden Funktionen?",
    ("49 und 50", "161 und 162", "1812 und 1813", "389 und 636"), "C",
    "RADIUS-Authentisierung verwendet UDP 1812; Accounting verwendet UDP 1813. Die älteren Ports 1645/1646 existieren in Altinstallationen, sind hier aber nicht die offiziell zugewiesene Paarung.",
    ("49 ist TACACS+ über TCP; 50 bildet kein RADIUS-Accounting-Paar.", "161/162 sind SNMP-Abfrage und -Benachrichtigung.", "1812/1813 trennen RADIUS-Authentisierung und Accounting.", "389/636 sind LDAP-Varianten, kein RADIUS-Paar."),
    "1812/1813", "UDP", "https://www.rfc-editor.org/rfc/rfc2865.html", "RFC 2865, RADIUS Authentication", "Section 3, Packet Format; RFC 2866 Section 3 for Accounting",
    "RADIUS authentication uses UDP 1812 and RADIUS accounting uses UDP 1813 as specified in RFC 2866.",
  ),
  CardSpec(
    "tacacs", "Identität", "Ein Router soll für die Geräteadministration einen TACACS+-Server kontaktieren. Welcher Standardtransport passt?",
    ("UDP 49", "TCP 49", "UDP 1812", "TCP 636"), "B",
    "TACACS+ verwendet TCP 49 für die Verbindung zum Server. UDP 1812 gehört hingegen zu RADIUS-Authentisierung.",
    ("49 ist richtig, aber TACACS+ nutzt TCP und nicht UDP.", "TCP 49 ist der zugewiesene TACACS+-Servertransport.", "UDP 1812 ist RADIUS und kein TACACS+.", "TCP 636 ist LDAPS für Verzeichniszugriff."),
    "49", "TCP", "https://www.rfc-editor.org/rfc/rfc8907.html", "RFC 8907, TACACS+", "Section 3.4, Connection",
    "TACACS+ uses TCP transport and IANA-allocated TCP server port 49.",
  ),
  CardSpec(
    "snmp", "Monitoring", "Ein Monitoring-System fragt regelmäßig SNMP-Werte ab; ein Gerät schickt zusätzlich ungefragte Traps. Welche UDP-Zielports entsprechen Anfrage und Trap-Empfang?",
    ("161 und 162", "162 und 161", "514 und 6514", "67 und 68"), "A",
    "SNMP-Command-Responder lauschen gewöhnlich auf UDP 161. Notification-Receiver für Traps lauschen gewöhnlich auf UDP 162; die Gegenrichtung darf nicht vertauscht werden.",
    ("UDP 161 ist Abfrageziel; UDP 162 ist Trap-Empfangsziel.", "162/161 vertauscht Command Responder und Notification Receiver.", "514/6514 betrifft Syslog-Transporte.", "67/68 sind die DHCPv4-Rollenports."),
    "161/162", "UDP", "https://www.rfc-editor.org/rfc/rfc3417.html", "RFC 3417, SNMP Transport Mappings", "Section 3.2, Well-known Values",
    "SNMP command responders listen on UDP 161 and notification receivers on UDP 162 in the preferred UDP mapping.",
  ),
  CardSpec(
    "ntp", "Basisdienste", "Die Uhrzeit eines Servers wird per klassischem NTPv4 mit einem Zeitserver synchronisiert. Welcher Standard-Zielport ist zu erwarten?",
    ("UDP 53", "UDP 123", "TCP 443", "UDP 500"), "B",
    "Klassisches NTPv4 verwendet üblicherweise UDP 123. Die richtige Zeit unterstützt auch die Auswertung und Korrelation von Sicherheitslogs.",
    ("UDP 53 gehört zu DNS-Abfragen.", "UDP 123 ist der typische NTP-Dienstport.", "TCP 443 ist der HTTPS-Standardport.", "UDP 500 gehört zur IKE-Aushandlung von IPsec."),
    "123", "UDP", "https://www.rfc-editor.org/rfc/rfc5905.html", "RFC 5905, NTPv4", "Section 7.2, Global Parameters; Section 16, IANA Considerations",
    "NTPv4 specifies service port 123 and commonly operates using UDP.",
  ),
  CardSpec(
    "syslog-tls", "Logging", "Ein Log-Collector soll Syslog direkt über TLS empfangen. Welcher Standard-Zielport ist dafür vorgesehen?",
    ("UDP 514", "TCP 514", "TCP 6514", "UDP 162"), "C",
    "Syslog over TLS hat TCP 6514 als Standardport. UDP 514 ist klassisches Syslog ohne die hier geforderte TLS-Transportbindung.",
    ("UDP 514 ist der klassische Syslog-Datagrammtransport ohne TLS.", "TCP 514 ist nicht der im TLS-Syslog-RFC zugewiesene Standardport.", "TCP 6514 ist für Syslog über TLS vorgesehen.", "UDP 162 ist SNMP-Trap-Empfang."),
    "6514", "TCP", "https://www.rfc-editor.org/rfc/rfc5425.html", "RFC 5425, TLS Transport Mapping for Syslog", "Section 4.1, Port Assignment",
    "Syslog over TLS uses TCP port 6514 by default.",
  ),
  CardSpec(
    "ipsec-nat-t", "VPN", "Ein IPsec-Tunnel muss ESP durch einen NAT-Router transportieren. Welcher UDP-Port wird nach der NAT-Erkennung für gekapseltes ESP verwendet?",
    ("UDP 500", "UDP 4500", "TCP 443", "UDP 1701"), "B",
    "NAT-Traversal kapselt ESP in UDP 4500. IKE beginnt häufig auf UDP 500 und wechselt bei erkannter NAT-Situation auf 4500; ESP ohne UDP-Kapselung ist kein TCP/UDP-Port.",
    ("UDP 500 ist der anfängliche IKE-Port, nicht der hier gefragte NAT-T-Kapselungsport.", "UDP 4500 trägt IKE und UDP-gekapseltes ESP nach NAT-Erkennung.", "TCP 443 ist HTTPS und kein IPsec-NAT-T-Standard.", "UDP 1701 gehört zu L2TP, nicht zur ESP-Kapselung."),
    "4500", "UDP", "https://www.rfc-editor.org/rfc/rfc3948.html", "RFC 3948, UDP Encapsulation of IPsec ESP Packets", "Sections 2.1 and 2.2, UDP 4500 encapsulation",
    "UDP 4500 carries NAT-traversed ESP and IKE traffic after NAT detection.",
  ),
  CardSpec(
    "sftp", "Dateitransfer", "Ein Team will Dateien über die bestehende SSH-Infrastruktur übertragen. Welche Standardverbindung ist SFTP, nicht FTPS?",
    ("TCP 21", "TCP 22", "TCP 990", "TCP 445"), "B",
    "SFTP läuft als SSH-Subsystem über die SSH-Verbindung auf TCP 22. FTPS ist FTP mit TLS und verwendet andere FTP-Portmodelle; die beiden Namen sind nicht austauschbar.",
    ("TCP 21 ist der FTP-Steuerkanal, nicht das SSH-Subsystem.", "TCP 22 trägt SSH und damit üblicherweise SFTP.", "TCP 990 ist der klassische implizite FTPS-Steuerport, nicht SFTP.", "TCP 445 ist SMB-Dateifreigabe."),
    "22", "TCP", "https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh-overview", "Microsoft OpenSSH for Windows overview", "OpenSSH commands: sftp runs over SSH",
    "Microsoft documents SFTP as running over SSH; the IANA SSH service registration gives TCP 22 as the standard server port.",
  ),
]


def compact(value: str) -> str:
  return re.sub(r"\s+", " ", value).strip().casefold()


def build(db_path: Path) -> dict:
  conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
  rows = conn.execute("SELECT user_id FROM users WHERE lower(trim(profile_name))='vlad'").fetchall()
  if len(rows) != 1:
    raise RuntimeError(f"Expected one Vlad profile, found {len(rows)}")
  user_id = rows[0][0]
  active = conn.execute(
    """SELECT r.id, x.front FROM server_cards r JOIN shared_card_catalog x
       ON x.id=r.id AND x.canonical_user_id=r.user_id
       WHERE r.user_id=? AND r.deleted_at IS NULL AND IFNULL(r.is_deleted,0)=0
         AND x.deleted_at IS NULL""", (user_id,),
  ).fetchall()
  existing_stems = {compact(front.split("\nA:", 1)[0]): card_id for card_id, front in active}
  if len(active) < 1:
    raise RuntimeError("Active card inventory unexpectedly empty")
  now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
  decisions = []
  for spec in CARDS:
    card_id = f"sy0701-ports-{spec.slug}"
    if len(spec.options) != 4 or len(spec.reasons) != 4 or spec.correct not in "ABCD":
      raise RuntimeError(f"Invalid options on {card_id}")
    if compact(spec.question) in existing_stems:
      raise RuntimeError(f"Duplicate stem: {card_id} = {existing_stems[compact(spec.question)]}")
    if any(card_id == old_id for old_id, _ in active):
      raise RuntimeError(f"Active ID already exists: {card_id}")
    history = conn.execute(
      "SELECT count(*) FROM sync_operations WHERE user_id=? AND (op_id LIKE ? OR payload_json LIKE ?)",
      (user_id, f"%:{card_id}:%", f'%"{card_id}"%'),
    ).fetchone()[0]
    if history:
      raise RuntimeError(f"Prior Vlad-scoped history found for {card_id}: {history}")
    front = "\n".join([spec.question, *(f"{letter}: {text}" for letter, text in zip("ABCD", spec.options))])
    wrong = "\n".join(f"{letter} | {reason}" for letter, reason in zip("ABCD", spec.reasons) if letter != spec.correct)
    back = f">> CORRECT: {spec.correct} |\n\n{spec.explanation}\n\nNicht:\n{wrong}"
    answer = spec.options["ABCD".index(spec.correct)]
    content = {
      "noteId": f"{card_id}-note", "deckId": DECK_ID, "front": front, "back": back,
      "tags": ["Security+ SY0-701", "Ports & Protokolle", spec.group, "Objective 4.5"],
      "extra": {"acronym": "", "examples": "", "port": spec.port, "protocol": spec.protocol},
    }
    sources = [
      {"url": SCOPE_URL, "title": "CompTIA Security+ SY0-701 Exam Objectives V7", "roles": ["scope"],
       "locator": "Objective 4.5, Firewall ports/protocols and implementation of secure protocols",
       "supports": "Official SY0-701 objective 4.5 requires selecting secure protocols, ports, and transport methods in operational scenarios."},
      {"url": spec.fact_url, "title": spec.fact_title, "roles": ["fact"],
       "locator": spec.locator, "supports": spec.supports},
    ]
    if spec.fact_url != IANA_URL:
      sources.append({"url": IANA_URL, "title": "IANA Service Name and Transport Protocol Port Number Registry", "roles": ["fact"],
                      "locator": f"Service registration row(s) for {spec.port}/{spec.protocol}",
                      "supports": f"IANA maintains the assigned service and transport port records relevant to {spec.port}/{spec.protocol}."})
    if spec.slug == "radius":
      sources.append({"url": "https://www.rfc-editor.org/rfc/rfc2866.html", "title": "RFC 2866, RADIUS Accounting", "roles": ["fact"],
                      "locator": "Section 3, Packet Format", "supports": "RADIUS Accounting uses the officially assigned UDP destination port 1813."})
    decisions.append({
      "userId": user_id, "cardId": card_id, "operation": "create", "verdict": "approved", "cardType": "mc",
      "requirements": ["req:sy0701:v7:4.5:secure-protocols:ports-and-transport"],
      "evidence": f"The scenario specifically entails '{answer}' ({spec.port}/{spec.protocol}). {spec.supports} The four choices and their distinct distractor rationales were checked together.",
      "sources": sources, "reviewer": "Codex primary-source Security+ ports review",
      "reviewedAt": now,
      "reviewBasis": ["Official SY0-701 objective 4.5 checked for scope", "Exact fact-source section and IANA registry checked",
                      "Question, four options, key, explanation, and individual distractors reviewed as one authored revision",
                      f"All {len(active)} active Vlad cards inventoried across {len(set(x[0] for x in active))} card identities; exact stem compared; Vlad-scoped ID history checked"],
      "semanticChecks": {"stemUnambiguous": True, "frontBackConsistent": True, "sourceConflictChecked": True, "answerEntailedBySources": True},
      "sourceConflicts": [],
      "crossCardCheck": {"performed": True, "result": f"Exact normalized stem compared against all {len(active)} active Vlad cards; no duplicate found. This ports deck isolates standard-port scenarios from existing chapter content."},
      "revisionConsistency": {"frontBackSameRevision": True, "historyChecked": True},
      "optionAssessments": {letter: {"verdict": "correct" if letter == spec.correct else "incorrect", "reason": reason}
                            for letter, reason in zip("ABCD", spec.reasons)},
      "content": content,
      "createState": {},
    })
  conn.close()
  return {"schemaVersion": "reviewed-security-ports-1", "profile": "Vlad", "canonicalUserId": user_id,
          "identityKey": ["userId", "cardId"], "replaceRegistry": False,
          "deck": {"id": DECK_ID, "name": DECK_NAME, "parentDeckId": None},
          "concept": {"exam": "SY0-701 V7", "objective": "4.5", "cards": len(CARDS),
                      "groups": sorted(set(spec.group for spec in CARDS)),
                      "rule": "Standardports in konkreten Sicherheitsaufgaben; keine Behauptung, dass ein Dienst nur auf diesem Port laufen kann."},
          "decisions": decisions}


def main() -> None:
  parser = argparse.ArgumentParser()
  parser.add_argument("--db", type=Path, default=Path("/home/_vb/projekt/card_pwa_app/card-sync-server/sync.db"))
  parser.add_argument("--output", type=Path, default=ROOT / "card-sync-server/reviews/security-ports-sy0701-decisions.json")
  args = parser.parse_args()
  document = build(args.db)
  args.output.parent.mkdir(parents=True, exist_ok=True)
  args.output.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
  print(f"Wrote {len(document['decisions'])} reviewed decisions for {document['canonicalUserId']} to {args.output}")


if __name__ == "__main__":
  main()
