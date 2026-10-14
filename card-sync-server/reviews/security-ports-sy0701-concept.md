# Security+ SY0-701: Ports & Protokolle

## Ziel

Ein eigenständiges Lern-Deck für die in Security+-Szenarien häufig gebrauchten Standardports. Die offizielle [SY0-701-V7-Zielliste](https://lecbyo.files.cmp.optimizely.com/download/cf25ec24b8a511ef9ecbb69c0f9687be) nennt in Ziel 4.5 Firewall-Ports/-Protokolle, sichere Protokollwahl, Portwahl und Transportmethoden, aber **keine abschließende Pflicht-Porttabelle**. Das Deck behauptet deshalb nicht, CompTIA verlange genau diese 20 Portkombinationen auswendig.

## Geprüftes didaktisches Konzept

- 20 Originalkarten, sechs Anwendungsfelder: Fernzugriff, Web, E-Mail, Identität, Basisdienste sowie Monitoring/VPN.
- Situationsfrage vor Zahlenabfrage: Warum braucht der Dienst diesen Port? Wohin fließt die Verbindung? TCP oder UDP? Welcher ähnlich klingende Dienst ist *nicht* gemeint?
- Pro Karte nur eine fachlich eindeutige Antwort; alle vier Optionen erhalten eine eigene, kurze Beurteilung. Kein wiederholter generischer Textblock.
- Standardport ist keine Sicherheitsgarantie und kein Beweis für den tatsächlich laufenden Dienst. Abweichende Konfigurationen sind möglich; die Fragen sagen deshalb ausdrücklich „Standard“ oder spezifizieren den Betriebsmodus.
- Stolperfallen werden bewusst getrennt: SMTP-Relay 25 vs. Submission 587; DNS über TCP **und** UDP 53; IMAP/POP3 mit implizitem TLS 993/995 vs. STARTTLS; RADIUS-Authentisierung 1812 vs. Accounting 1813; SNMP-Abfrage 161 vs. Trap 162; SFTP über SSH 22 vs. FTPS; IKE 500 vs. NAT-T 4500.
- Jede Karte ist per `(userId, cardId)` und Inhalts-Hash an einen geprüften Review-Eintrag gebunden. FSRS- und Lernhistorie bestehender Karten werden nicht verändert.
- Für 14 Karten zeigen elf unterschiedliche Modelle genau den geprüften Port- oder Transport-Unterschied; sechs reine Einzelport-Fakten bleiben ohne Diagramm. Die Darstellungen werden bei geänderter Frage oder Antwort automatisch ausgeblendet und erscheinen auch in „Karten verwalten“.

## Validierung und bewusste Grenzen

Port-/Transportfakten stammen aus [IANA](https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml), konkreten RFC-Abschnitten oder Herstellerdokumentation. Die Entscheidungen im zugehörigen JSON enthalten pro Karte genaue Fundstellen und gestützte Aussagen. Das Review-Gateway prüft Struktur, Belegrollen, alle Optionen, Quellenbindung und Revisionskohärenz vor dem Schreiben.

Das Deck ist auf die in dieser App verwendete **SY0-701**-Version zugeschnitten. Es ersetzt weder die offizielle Prüfungszielliste noch eine betriebliche Firewall-Policy. Eine spätere Erweiterung sollte erst nach demselben Quellen- und Grafik-Gate erfolgen; nicht jede Portkarte braucht eine Grafik.
