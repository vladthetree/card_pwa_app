# Vorschau: Floskel-Rewrite SY0-701-Karten

Gesamt bearbeitet: 407  |  Erfolgreich: 407  |  Fehlgeschlagen/übersprungen: 0

- `empty_distractor`: 65 Karten erfolgreich umgeschrieben
- `template_suffix`: 342 Karten erfolgreich umgeschrieben

## Stichprobe (20 Karten, vorher/nachher)

### Karte `1773526588615` — 03_Security_Architecture (empty_distractor)

**Front:**
```
Geoff wants to establish a contract with a company to have datacenter space that is equipped and ready to go so that he can bring his data to the location in the event of a disaster. What type of disaster recovery site is he looking for?
A: A hot site
B: A cold site
C: A warm site
D: An RTO site
```
**Vorher:**
```
>> CORRECT: C |

Ein Warm Site ist technisch ausgestattet, aber die aktuellen Daten fehlen noch und müssen erst eingespielt werden.

Nicht:
A | Ein Hot Site ist voll ausgestattet und kann fast ohne Zeitverlust den Betrieb übernehmen. Das unterscheidet „A hot site“ von „A warm site“.
B | Ein Cold Site ist im Wesentlichen ein leeres Gebäude mit Strom und Beleuchtung, aber ohne vorbereitete Systeme — Daten, Hardware und Personal müssen im Ernstfall erst noch dorthin gebracht werden, es steht also nicht sofort einsatzbereit zur Verfügung. Dieser Zweck weicht vom Szenario ab; dort ist „A warm site“ gemeint.
D | Bei „An RTO site“ fehlt die beschriebene Eigenschaft. Sie kennzeichnet „A warm site“.
```
**Nachher:**
```
>> CORRECT: C |

Ein Warm Site ist technisch ausgestattet, aber die aktuellen Daten fehlen noch und müssen erst eingespielt werden.

Nicht:
A | Ein Hot Site ist voll ausgestattet und kann fast ohne Zeitverlust den Betrieb übernehmen. Das unterscheidet „A hot site“ von „A warm site“.
B | Ein Cold Site ist im Wesentlichen ein leeres Gebäude mit Strom und Beleuchtung, aber ohne vorbereitete Systeme — Daten, Hardware und Personal müssen im Ernstfall erst noch dorthin gebracht werden, es steht also nicht sofort einsatzbereit zur Verfügung. Dieser Zweck weicht vom Szenario ab; dort ist „A warm site“ gemeint.
D | RTO bezeichnet eine Kennzahl für die maximal tolerierbare Ausfallzeit, keinen physischen Ausweichstandort.
```

### Karte `1773526588628` — 03_Security_Architecture (empty_distractor)

**Front:**
```
What IP address does a load balancer provide for external connections to connect to web servers in a load-balanced group?
A: The IP address for each server, in a prioritized order
B: The load balancer's IP address
C: The IP address for each server in a round-robin order
D: A virtual IP address
```
**Vorher:**
```
>> CORRECT: D |

Ein Load Balancer nutzt eine virtuelle IP-Adresse (VIP), um Anfragen von außen anzunehmen und sie intern auf die echten Server-IPs zu verteilen.

Nicht:
A | „The IP address for each server, in a prioritized order“ bezeichnet einen anderen Sachverhalt. Hier ist „A virtual IP address“ gemeint.
B | Hier geht es um „A virtual IP address“: Ein Load Balancer nutzt eine virtuelle IP-Adresse (VIP), um Anfragen von außen anzunehmen und sie intern auf die echten Server-IPs zu verteilen. „The load balancer's IP address“ beschreibt etwas anderes.
C | Der zentrale Hinweis lautet: Ein Load Balancer nutzt eine virtuelle IP-Adresse (VIP), um Anfragen von außen anzunehmen und sie intern auf die echten Server-IPs zu verteilen. Deshalb ist „A virtual IP address“ richtig und nicht „The IP address for each server in a round-robin order“.
```
**Nachher:**
```
>> CORRECT: D |

Ein Load Balancer nutzt eine virtuelle IP-Adresse (VIP), um Anfragen von außen anzunehmen und sie intern auf die echten Server-IPs zu verteilen.

Nicht:
A | „The IP address for each server, in a prioritized order“ bezeichnet einen anderen Sachverhalt. Hier ist „A virtual IP address“ gemeint.
B | Umgangssprachlich naheliegend, aber unpräzise: Die maßgebliche Fachbezeichnung für diese Adresse ist die virtuelle IP-Adresse (VIP), nicht schlicht „die IP des Load Balancers“.
C | Round-Robin beschreibt eine Verteilungsreihenfolge, keine Adressierungsmethode für externe Verbindungen.
```

### Karte `1773526588636` — 03_Security_Architecture (empty_distractor)

**Front:**
```
What element of the CIA triad is geographic dispersion intended to help with?
A: Confidentiality
B: Integrity
C: Assurance
D: Availability
```
**Vorher:**
```
>> CORRECT: D |

Die geografische Verteilung (Dispersion) stellt sicher, dass Dienste erreichbar (Availability) bleiben, selbst wenn ein ganzer Standort (z. B. Durch Stromausfall) wegbricht.

Nicht:
A | Access Controls begrenzen, wer bestimmte Daten überhaupt sehen darf — laut darf die Marketingabteilung ihre Präsentationen einsehen, aber keinen Zugriff auf die Buchhaltung haben. Das ist Confidentiality. Das unterscheidet „Confidentiality“ von „Availability“.
B | Integrität bedeutet, dass Daten nicht unbefugt oder unbemerkt verändert wurden. Im Szenario geht es stattdessen um „Availability“.
C | Für „Availability“ spricht: Die geografische Verteilung (Dispersion) stellt sicher, dass Dienste erreichbar (Availability) bleiben, selbst wenn ein ganzer Standort (z. Das trifft auf „Assurance“ nicht zu.
```
**Nachher:**
```
>> CORRECT: D |

Die geografische Verteilung (Dispersion) stellt sicher, dass Dienste erreichbar (Availability) bleiben, selbst wenn ein ganzer Standort (z. B. Durch Stromausfall) wegbricht.

Nicht:
A | Access Controls begrenzen, wer bestimmte Daten überhaupt sehen darf — laut darf die Marketingabteilung ihre Präsentationen einsehen, aber keinen Zugriff auf die Buchhaltung haben. Das ist Confidentiality. Das unterscheidet „Confidentiality“ von „Availability“.
B | Integrität bedeutet, dass Daten nicht unbefugt oder unbemerkt verändert wurden. Im Szenario geht es stattdessen um „Availability“.
C | „Assurance“ ist kein Bestandteil der klassischen CIA-Triade.
```

### Karte `1773536533013` — 03_Security_Architecture (empty_distractor)

**Front:**
```
What failure mode is typically preferred for in-line network taps?
A: Fail-open
B: Fail over
C: Fail-closed
D: Fail-reset
```
**Vorher:**
```
>> CORRECT: A |

In-line Taps sollten 'Fail-open' sein, damit der Verkehr bei Ausfall weiterfließt (Verfügbarkeit).

Nicht:
B | Der Unterschied liegt in der beschriebenen Funktion. Sie gehört zu „Fail-open“, nicht zu „Fail over“.
C | Fail-closed verweigert den Zugriff, wenn eine Sicherheitskomponente ausfällt oder keine eindeutige Entscheidung treffen kann. Damit gehört „Fail-closed“ fachlich in einen anderen Bereich als „Fail-open“.
D | Hier geht es um „Fail-open“: In-line Taps sollten 'Fail-open' sein, damit der Verkehr bei Ausfall weiterfließt (Verfügbarkeit). „Fail-reset“ beschreibt etwas anderes.
```
**Nachher:**
```
>> CORRECT: A |

In-line Taps sollten 'Fail-open' sein, damit der Verkehr bei Ausfall weiterfließt (Verfügbarkeit).

Nicht:
B | Failover bezeichnet den Wechsel auf ein Ersatzsystem, keinen Failure-Mode für Inline-Geräte.
C | Fail-closed verweigert den Zugriff, wenn eine Sicherheitskomponente ausfällt oder keine eindeutige Entscheidung treffen kann. Damit gehört „Fail-closed“ fachlich in einen anderen Bereich als „Fail-open“.
D | „Fail-reset“ ist kein gebräuchlicher Failure-Mode für Netzwerk-Taps.
```

### Karte `1773536533022` — 03_Security_Architecture (empty_distractor)

**Front:**
```
Which of the following is a common part of technology capacity planning for resilience?
A: Cross-training staff
B: Using load balancers
C: Using multiple geographically diverse datacenters
D: Deploying uninterruptible power supplies
```
**Vorher:**
```
>> CORRECT: B |

Load Balancer verteilen die Last und halten Systeme bei Serverausfällen kapazitätsstabil.

Nicht:
A | Die passende Zuordnung ist „Using load balancers“. „Cross-training staff“ besitzt die beschriebene Funktion nicht.
C | Für „Using load balancers“ spricht: Load Balancer verteilen die Last und halten Systeme bei Serverausfällen kapazitätsstabil. Das trifft auf „Using multiple geographically diverse datacenters“ nicht zu.
D | Hier geht es um „Using load balancers“: Load Balancer verteilen die Last und halten Systeme bei Serverausfällen kapazitätsstabil. „Deploying uninterruptible power supplies“ beschreibt etwas anderes.
```
**Nachher:**
```
>> CORRECT: B |

Load Balancer verteilen die Last und halten Systeme bei Serverausfällen kapazitätsstabil.

Nicht:
A | Cross-Training von Personal betrifft organisatorische Resilienz, nicht die technische Kapazitätsplanung.
C | Geografisch verteilte Rechenzentren erhöhen die Ausfallsicherheit, sind aber kein klassisches Element der Kapazitätsplanung selbst.
D | USVs überbrücken kurze Stromausfälle, sind aber kein Instrument der Kapazitätsplanung.
```

### Karte `1773536533032` — 03_Security_Architecture (empty_distractor)

**Front:**
```
Valentine has containerized her applications. What will not be part of the container?
A: The operating system
B: The application
C: Needed libraries
D: Configuration files
```
**Vorher:**
```
>> CORRECT: A |

Container teilen sich den Kernel des Hosts und enthalten kein volles OS.

Nicht:
B | Das genannte Merkmal führt zu „The operating system“. Bei „The application“ wäre ein anderer Hinweis zu erwarten.
C | Hier geht es um „The operating system“: Container teilen sich den Kernel des Hosts und enthalten kein volles OS. „Needed libraries“ beschreibt etwas anderes.
D | Die passende Zuordnung ist „The operating system“. „Configuration files“ besitzt die beschriebene Funktion nicht.
```
**Nachher:**
```
>> CORRECT: A |

Container teilen sich den Kernel des Hosts und enthalten kein volles OS.

Nicht:
B | Die Anwendung selbst ist gerade der Grund, warum der Container existiert, und damit fester Bestandteil.
C | Benötigte Bibliotheken werden im Container mitgeliefert, damit die Anwendung eigenständig lauffähig ist.
D | Konfigurationsdateien gehören typischerweise zum Container, um das Anwendungsverhalten festzulegen.
```

### Karte `1773536533038` — 03_Security_Architecture (empty_distractor)

**Front:**
```
Kirk's organization contracts with a cloud service provider. Kirk is concerned about third-party vendors that his cloud service provider uses. How can Kirk best address these concerns?
A: Through direct contracts with the third-party vendors
B: By requiring regular audits of third-party vendors
C: Through the contract with his cloud service provider
D: By performing vulnerability scans of the third-party vendors
```
**Vorher:**
```
>> CORRECT: C |

Man kann nur mit seinem Vertragspartner Regelungen für dessen Subunternehmer treffen.

Nicht:
A | Die Organisation braucht hier „Through the contract with his cloud service provider“. Mit „Through direct contracts with the third-party vendors“ bliebe die genannte Anforderung offen.
B | Für dieses Szenario wird „Through the contract with his cloud service provider“ benötigt; „By requiring regular audits of third-party vendors“ greift an einer anderen Stelle an.
D | „Through the contract with his cloud service provider“ beantwortet den konkreten Bedarf des Szenarios; „By performing vulnerability scans of the third-party vendors“ dagegen nicht.
```
**Nachher:**
```
>> CORRECT: C |

Man kann nur mit seinem Vertragspartner Regelungen für dessen Subunternehmer treffen.

Nicht:
A | Direkte Verträge mit den Subunternehmern des Providers bestehen normalerweise gar nicht – Kirk hat keine eigene Vertragsbeziehung zu ihnen.
B | Eigene Audits bei den Subunternehmern des Providers erfordern in der Regel eine vertragliche Grundlage, die erst über den Hauptvertrag entsteht.
D | Schwachstellenscans bei fremden Subunternehmern sind ohne deren Zustimmung rechtlich und praktisch kaum durchführbar.
```

### Karte `1773618881060` — 03_Security_Architecture (empty_distractor)

**Front:**
```
Jaime has deployed smart lighting and thermostats to her new buildings. What technique will have the largest impact if she wants to harden the devices?
A: Applying an industry standard baseline configuration
B: Moving the devices to a separate security zone
C: Fully patching the devices when they are deployed
D: Vulnerability scanning, then remediating the devices on a regular basis
```
**Vorher:**
```
>> CORRECT: B |

Die Isolation unsicherer IoT (Internet of Things)-Geräte in einer eigenen Sicherheitszone bietet den effektivsten Schutz für das Restnetz.

Nicht:
A | Die Hinweise im Szenario führen zu „Moving the devices to a separate security zone“. Für „Applying an industry standard baseline configuration“ fehlt ein entsprechender Anhaltspunkt.
C | Für dieses Szenario wird „Moving the devices to a separate security zone“ benötigt; „Fully patching the devices when they are deployed“ greift an einer anderen Stelle an.
D | Die Anforderung wird durch „Moving the devices to a separate security zone“ erfüllt. „Vulnerability scanning, then remediating the devices on a regular basis“ löst die beschriebene Aufgabe nicht.
```
**Nachher:**
```
>> CORRECT: B |

Die Isolation unsicherer IoT (Internet of Things)-Geräte in einer eigenen Sicherheitszone bietet den effektivsten Schutz für das Restnetz.

Nicht:
A | Eine Baseline-Konfiguration härtet einzelne Geräte, isoliert sie aber nicht vom übrigen Netz.
C | Vollständiges Patchen bei Bereitstellung schützt nicht vor später entdeckten Schwachstellen, für die IoT-Geräte oft keine Updates mehr erhalten.
D | Regelmäßiges Scannen und Beheben setzt patchbare Geräte voraus – viele Smart-Geräte lassen sich aber gar nicht zuverlässig patchen.
```

### Karte `1773794837297` — 03_Security_Architecture (empty_distractor)

**Front:**
```
An IDS is an example of what type of network device?
A: Active
B: Air gapped
C: Fail-closed
D: Passive
```
**Vorher:**
```
>> CORRECT: D |

Ein IDS (Intrusion Detection System) ist ein passiver Beobachter, der nur Alarme auslöst, ohne den Datenfluss zu stoppen.

Nicht:
A | Das ausschlaggebende Merkmal gehört zu „Passive“ und nicht zu „Active“.
B | Bei „Air gapped“ fehlt die beschriebene Eigenschaft. Sie kennzeichnet „Passive“.
C | Fail-closed verweigert den Zugriff, wenn eine Sicherheitskomponente ausfällt oder keine eindeutige Entscheidung treffen kann. Für den vorliegenden Fall bleibt „Passive“ die passende Antwort.
```
**Nachher:**
```
>> CORRECT: D |

Ein IDS (Intrusion Detection System) ist ein passiver Beobachter, der nur Alarme auslöst, ohne den Datenfluss zu stoppen.

Nicht:
A | Aktive Systeme greifen selbst in den Datenfluss ein – ein IDS beobachtet nur und meldet, ohne einzugreifen.
B | Air Gapped beschreibt eine physisch getrennte Netzwerkumgebung, keine Geräteklasse wie aktiv/passiv.
C | Fail-closed verweigert den Zugriff, wenn eine Sicherheitskomponente ausfällt oder keine eindeutige Entscheidung treffen kann. Für den vorliegenden Fall bleibt „Passive“ die passende Antwort.
```

### Karte `1773794837306` — 03_Security_Architecture (empty_distractor)

**Front:**
```
Katie is considering deploying embedded devices. Which of the following limitations is most commonly associated with embedded devices?
A: Compute limitations
B: Responsiveness limitations
C: Availability issues
D: Cost issues
```
**Vorher:**
```
>> CORRECT: A |

Eingebettete Systeme haben durch ihre spezialisierte Bauweise oft nur minimale Rechenleistung (Compute) zur Verfügung.

Nicht:
B | Das genannte Merkmal führt zu „Compute limitations“. Bei „Responsiveness limitations“ wäre ein anderer Hinweis zu erwarten.
C | Der zentrale Hinweis lautet: Eingebettete Systeme haben durch ihre spezialisierte Bauweise oft nur minimale Rechenleistung (Compute) zur Verfügung. Deshalb ist „Compute limitations“ richtig und nicht „Availability issues“.
D | Das genannte Merkmal führt zu „Compute limitations“. Bei „Cost issues“ wäre ein anderer Hinweis zu erwarten.
```
**Nachher:**
```
>> CORRECT: A |

Eingebettete Systeme haben durch ihre spezialisierte Bauweise oft nur minimale Rechenleistung (Compute) zur Verfügung.

Nicht:
B | Reaktionsgeschwindigkeit ist meist eine Folge begrenzter Rechenleistung, aber nicht die primär genannte Einschränkung.
C | Verfügbarkeitsprobleme sind kein typisches Kernmerkmal eingebetteter Systeme.
D | Kostenfragen betreffen die Anschaffung, nicht die technische Leistungsfähigkeit des Geräts.
```

### Karte `1772662005004` — 02_Threats_Vulnerabilities_Mitigations (template_suffix)

**Front:**
```
Which SY0-701 concept best matches this description?

An organization grants a managed service provider privileged remote access and therefore applies strong authentication, monitoring, and contractual controls to that provider.
A: Supply chain — Managed service providers (MSPs)
B: Supply chain — Vendors
C: Supply chain — Suppliers
D: Open service ports
```
**Vorher:**
```
>> CORRECT: A |

Messer beschreibt MSPs als bezahlte Dritte, die das Netzwerk überwachen; wer den MSP kompromittiert, hat auch Zugriff auf dessen Kunden – Beispiel Target-Angriff 2013 über einen HVAC-Dienstleister. Das Cram-Video fasst MSPs, Vendors und Suppliers zusammen und nennt fehlendes Vendor-Risk-Management als Kernrisiko.

Prüfpunkt: Damit ist „Supply chain — Managed service providers (MSPs)“ gemeint.

Nicht:
B | Messer nennt „Vendors" nicht als eigenen Begriff, behandelt aber die Herstellerseite: Bedrohungen gelangen „durch die Vordertür", indem Dritte sich in gelieferte Geräte einnisten. Das beschreibt „Supply chain — Vendors“ und nicht „Supply chain — Managed service providers (MSPs)“.
C | „Suppliers" wird von Messer nicht als eigener Fachbegriff eingeführt; sein Beispiel ist gefälschte Hardware (nachgemachte Cisco-Switches 2020). Das Cram-Video behandelt Suppliers gemeinsam mit MSPs und Vendors: kompromittierte Systeme beim Zulieferer führen zu Angriffen auf dessen Kunden. Das beschreibt „Supply chain — Suppliers“ und nicht „Supply chain — Managed service providers (MSPs)“.
D | Messer erklärt, dass jeder Dienst eigene offene Ports braucht und damit die Angriffsfläche vergrößert; kennt ein Angreifer eine Schwachstelle im Dienst, wird der Port zum Einstieg – daher Patchen und port-/anwendungsbezogene Firewalls. Das beschreibt „Open service ports“ und nicht „Supply chain — Managed service providers (MSPs)“.
```
**Nachher:**
```
>> CORRECT: A |

Messer beschreibt MSPs als bezahlte Dritte, die das Netzwerk überwachen; wer den MSP kompromittiert, hat auch Zugriff auf dessen Kunden – Beispiel Target-Angriff 2013 über einen HVAC-Dienstleister. Das Cram-Video fasst MSPs, Vendors und Suppliers zusammen und nennt fehlendes Vendor-Risk-Management als Kernrisiko.

Nicht:
B | Messer nennt „Vendors" nicht als eigenen Begriff, behandelt aber die Herstellerseite: Bedrohungen gelangen „durch die Vordertür", indem Dritte sich in gelieferte Geräte einnisten. Vendors bezeichnet allgemein Hersteller und Zulieferer, nicht speziell den Fall eines beauftragten Dienstleisters mit Zugriff auf die eigene Umgebung.
C | „Suppliers" wird von Messer nicht als eigener Fachbegriff eingeführt; sein Beispiel ist gefälschte Hardware (nachgemachte Cisco-Switches 2020). Das Cram-Video behandelt Suppliers gemeinsam mit MSPs und Vendors: kompromittierte Systeme beim Zulieferer führen zu Angriffen auf dessen Kunden. Suppliers liefern Komponenten oder Produkte, verwalten aber nicht laufend fremde IT-Umgebungen wie ein MSP.
D | Messer erklärt, dass jeder Dienst eigene offene Ports braucht und damit die Angriffsfläche vergrößert; kennt ein Angreifer eine Schwachstelle im Dienst, wird der Port zum Einstieg – daher Patchen und port-/anwendungsbezogene Firewalls. Offene Dienstports sind ein technisches Detail einzelner Systeme, keine Kategorie der Lieferkette.
```

### Karte `1786384200007` — 1.2 Security Concepts (template_suffix)

**Front:**
```
Which type of sensor detects heat signatures for security monitoring?
A: Sensors — Pressure
B: Sensors — Infrared
C: Sensors — Microwave
D: Sensors — Ultrasonic
```
**Vorher:**
```
>> CORRECT: B |

Infrarotsensoren erfassen Infrarotstrahlung sowohl in hellen als auch in dunklen Bereichen und brauchen dafür kein zusätzliches Licht; sie stecken in Kameras ebenso wie in klassischen Bewegungsmeldern, wo es nicht um Video, sondern nur um „bewegt sich da etwas" geht. Infrarot eignet sich gut für relativ begrenzte Flächen. Das Cram-Video präzisiert, dass Wärmesignaturen von Menschen, Tieren oder Objekten erkannt werden.

Prüfpunkt: Damit ist „Sensors — Infrared“ gemeint.

Nicht:
A | Drucksensoren registrieren die Kraftänderung, wenn sich jemand über eine Fläche bewegt, und können daraufhin alarmieren. Das Cram-Video konkretisiert typische Formen (Person läuft über einen Boden oder tritt auf eine Matte) und den Einsatz in Zutrittssystemen. Das beschreibt „Sensors — Pressure“ und nicht „Sensors — Infrared“.
C | Für große zu überwachende Flächen eignet sich Mikrowellentechnik: Sie erkennt Bewegung über deutlich größere Distanzen als Infrarot und ist dafür effizienter. Das Cram-Video ergänzt, dass Mikrowellensensoren oft mit anderen Sensortypen kombiniert werden, um Fehlalarme zu reduzieren. Das beschreibt „Sensors — Microwave“ und nicht „Sensors — Infrared“.
D | Ultraschallsensoren senden Schallsignale aus und werten deren Reflexion aus; damit erkennen sie Bewegung und können zusätzlich Kollisionen erkennen, etwa auf Parkplätzen oder in Ladezonen. Das beschreibt „Sensors — Ultrasonic“ und nicht „Sensors — Infrared“.
```
**Nachher:**
```
>> CORRECT: B |

Infrarotsensoren erfassen Infrarotstrahlung sowohl in hellen als auch in dunklen Bereichen und brauchen dafür kein zusätzliches Licht; sie stecken in Kameras ebenso wie in klassischen Bewegungsmeldern, wo es nicht um Video, sondern nur um „bewegt sich da etwas" geht. Infrarot eignet sich gut für relativ begrenzte Flächen. Das Cram-Video präzisiert, dass Wärmesignaturen von Menschen, Tieren oder Objekten erkannt werden.

Nicht:
A | Drucksensoren registrieren die Kraftänderung, wenn sich jemand über eine Fläche bewegt, und können daraufhin alarmieren. Das Cram-Video konkretisiert typische Formen (Person läuft über einen Boden oder tritt auf eine Matte) und den Einsatz in Zutrittssystemen. Drucksensoren reagieren auf Gewichtsveränderung am Boden, nicht auf Wärmestrahlung wie Infrarot.
C | Für große zu überwachende Flächen eignet sich Mikrowellentechnik: Sie erkennt Bewegung über deutlich größere Distanzen als Infrarot und ist dafür effizienter. Das Cram-Video ergänzt, dass Mikrowellensensoren oft mit anderen Sensortypen kombiniert werden, um Fehlalarme zu reduzieren. Mikrowellensensoren decken größere Distanzen ab, arbeiten aber nach einem anderen Prinzip als die Wärmeerkennung von Infrarot.
D | Ultraschallsensoren senden Schallsignale aus und werten deren Reflexion aus; damit erkennen sie Bewegung und können zusätzlich Kollisionen erkennen, etwa auf Parkplätzen oder in Ladezonen. Ultraschallsensoren werten reflektierte Schallwellen aus, nicht Infrarotstrahlung.
```

### Karte `1786384200035` — 2.1 Threat Actors (template_suffix)

**Front:**
```
Which SY0-701 concept best matches this description?

The attacker seeks to make a target service unavailable rather than steal money or information.
A: Motivations — Revenge
B: Motivations — Service disruption
C: Motivations — Financial gain
D: Motivations — Blackmail
```
**Vorher:**
```
>> CORRECT: B |

Bei Messer zieht sich Dienststörung durch fast alle Akteure: Nationalstaaten stören Dienste anderer Regierungen, unskilled attacker wollen Betrieb stören, Hacktivisten setzen gezielt Denial of Service ein. Das Cram-Video definiert es als Angriffe, die Ausfälle oder Störungen wesentlicher Dienste herbeiführen sollen.

Prüfpunkt: Damit ist „Motivations — Service disruption“ gemeint.

Nicht:
A | Messer nennt Rache als typisches Motiv des Innentäters, der sich gegen die eigene Organisation richtet (oft gemeinsam mit finanziellem Gewinn genannt). Das beschreibt „Motivations — Revenge“ und nicht „Motivations — Service disruption“.
C | Messer ordnet finanziellen Gewinn dem Innentäter (neben Rache) und vor allem der organisierten Kriminalität zu, die ausschließlich auf Profit aus ist und dafür Daten weiterverkauft oder Ransomware betreibt. Das beschreibt „Motivations — Financial gain“ und nicht „Motivations — Service disruption“.
D | Erpressung wird in der Messer-Lektion nicht als eigenes Motiv benannt; sie taucht dort nur indirekt über Ransomware der organisierten Kriminalität auf. Das beschreibt „Motivations — Blackmail“ und nicht „Motivations — Service disruption“.
```
**Nachher:**
```
>> CORRECT: B |

Bei Messer zieht sich Dienststörung durch fast alle Akteure: Nationalstaaten stören Dienste anderer Regierungen, unskilled attacker wollen Betrieb stören, Hacktivisten setzen gezielt Denial of Service ein. Das Cram-Video definiert es als Angriffe, die Ausfälle oder Störungen wesentlicher Dienste herbeiführen sollen.

Nicht:
A | Messer nennt Rache als typisches Motiv des Innentäters, der sich gegen die eigene Organisation richtet (oft gemeinsam mit finanziellem Gewinn genannt). Rache ist ein persönliches Motiv, meist des Innentäters, nicht speziell das Stören eines Dienstes.
C | Messer ordnet finanziellen Gewinn dem Innentäter (neben Rache) und vor allem der organisierten Kriminalität zu, die ausschließlich auf Profit aus ist und dafür Daten weiterverkauft oder Ransomware betreibt. Finanzieller Gewinn zielt auf Profit, nicht primär auf das Stören eines Dienstes.
D | Erpressung wird in der Messer-Lektion nicht als eigenes Motiv benannt; sie taucht dort nur indirekt über Ransomware der organisierten Kriminalität auf. Erpressung zielt auf eine Zahlung, nicht direkt auf die Störung eines Dienstes selbst.
```

### Karte `1786384200056` — 2.4 Indicators of Malicious Activity (template_suffix)

**Front:**
```
What type of attack occurs when an application writes more data to a memory buffer than it was designed to hold, potentially allowing arbitrary code execution?
A: Application attacks — Buffer overflow
B: Application attacks — Privilege escalation
C: Application attacks — Injection
D: Application attacks — Forgery
```
**Vorher:**
```
>> CORRECT: A |

Messer erklärt den Buffer Overflow als Schreiben über die reservierte Speichergrenze hinaus, Folge fehlender Eingabeprüfung; reproduzierbare Overflows werden zur mächtigen Waffe. Das Cram-Video nennt ASLR und Data Execution Prevention als Gründe, warum diese Angriffe seltener geworden sind.

Prüfpunkt: Damit ist „Application attacks — Buffer overflow“ gemeint.

Nicht:
B | Messer erklärt vertikale (zum Administrator) und horizontale (zu einem anderen gleichrangigen Nutzer) Rechteausweitung; Beispiel CVE-2023-29336, eine Windows-Win32k-Lücke mit SYSTEM-Rechten. Das Cram-Video ergänzt erzwungene Authentifizierung bei Rechteerhöhung (UAC/sudo) als Mitigation. Das beschreibt „Application attacks — Privilege escalation“ und nicht „Application attacks — Buffer overflow“.
C | Messer beschreibt Injection als Einschleusen von Schadcode in ungeprüfte Eingabefelder, SQL-Injection als häufigste Variante. Das Cram-Video ergänzt eine Gegenmaßnahmenkette: Eingabevalidierung, Stored Procedures, eingeschränkte DB-Konten und eine WAF mit OWASP-Top-10-Regelsatz. Das beschreibt „Application attacks — Injection“ und nicht „Application attacks — Buffer overflow“.
D | Messer erklärt Cross-Site Request Forgery (CSRF/XSRF): Die Website vertraut dem eingeloggten Browser, der Angreifer bringt ihn dazu, Aktionen im Namen des Nutzers auszuführen; Schutz sind kryptografische Anti-Forgery-Tokens. Das beschreibt „Application attacks — Forgery“ und nicht „Application attacks — Buffer overflow“.
```
**Nachher:**
```
>> CORRECT: A |

Messer erklärt den Buffer Overflow als Schreiben über die reservierte Speichergrenze hinaus, Folge fehlender Eingabeprüfung; reproduzierbare Overflows werden zur mächtigen Waffe. Das Cram-Video nennt ASLR und Data Execution Prevention als Gründe, warum diese Angriffe seltener geworden sind.

Nicht:
B | Messer erklärt vertikale (zum Administrator) und horizontale (zu einem anderen gleichrangigen Nutzer) Rechteausweitung; Beispiel CVE-2023-29336, eine Windows-Win32k-Lücke mit SYSTEM-Rechten. Das Cram-Video ergänzt erzwungene Authentifizierung bei Rechteerhöhung (UAC/sudo) als Mitigation. Rechteausweitung nutzt bereits vorhandenen Zugriff, um höhere Rechte zu erlangen, statt gezielt einen Speicherpuffer zu überschreiben.
C | Messer beschreibt Injection als Einschleusen von Schadcode in ungeprüfte Eingabefelder, SQL-Injection als häufigste Variante. Das Cram-Video ergänzt eine Gegenmaßnahmenkette: Eingabevalidierung, Stored Procedures, eingeschränkte DB-Konten und eine WAF mit OWASP-Top-10-Regelsatz. Injection schleust Schadcode über ungeprüfte Eingabefelder ein, statt gezielt einen Speicherpuffer zu überlaufen.
D | Messer erklärt Cross-Site Request Forgery (CSRF/XSRF): Die Website vertraut dem eingeloggten Browser, der Angreifer bringt ihn dazu, Aktionen im Namen des Nutzers auszuführen; Schutz sind kryptografische Anti-Forgery-Tokens. CSRF missbraucht die Vertrauensbeziehung des Browsers, hat aber mit einem Speicherüberlauf nichts zu tun.
```

### Karte `1786384200084` — 3.3 Protecting Data (template_suffix)

**Front:**
```
Which type of data is subject to is subject to government or industry regulations such as GDPR or HIPAA?
A: Data types — Regulated
B: Data types — Human- and non-human-readable
C: Data types — Financial information
D: Data types — Trade secret
```
**Vorher:**
```
>> CORRECT: A |

Messer definiert regulierte Daten als Daten, bei denen eine dritte Partei die Schutzregeln vorgibt (z.B. PCI für Kreditkartendaten), zusätzlich diktieren Gesetze Speicherdauer. Das Cram-Video ergänzt PII, PHI und Finanzdaten als Beispiele mit empfindlichen Bußgeldern bei Nichteinhaltung.

Prüfpunkt: Damit ist „Data types — Regulated“ gemeint.

Nicht:
B | Messer unterscheidet direkt lesbare Daten von nicht-menschenlesbaren (kodiert, Barcode) und nennt Mischformen als üblich. Das Cram-Video definiert nicht-menschenlesbar als Daten, die erst durch Software interpretierbar werden (Maschinencode, verschlüsselte Daten). Das beschreibt „Data types — Human- and non-human-readable“ und nicht „Data types — Regulated“.
C | Für Messer zählen sowohl unternehmensinterne Finanzkennzahlen als auch persönliche Bankdaten zu sensiblen Daten. Das Cram-Video nennt Anlagedaten, Kontodetails und Kreditkartennummern, geregelt durch Gramm-Leach-Bliley oder PCI DSS. Das beschreibt „Data types — Financial information“ und nicht „Data types — Regulated“.
D | Messer beschreibt Geschäftsgeheimnisse als organisationseigene, von Wettbewerbern begehrte Verfahren. Das Cram-Video präzisiert: nicht registrierbar, gelten unbegrenzt solange Geheimhaltung gewahrt bleibt, Voraussetzungen sind wirtschaftlicher Wert und aktive Vertraulichkeitsmaßnahmen. Das beschreibt „Data types — Trade secret“ und nicht „Data types — Regulated“.
```
**Nachher:**
```
>> CORRECT: A |

Messer definiert regulierte Daten als Daten, bei denen eine dritte Partei die Schutzregeln vorgibt (z.B. PCI für Kreditkartendaten), zusätzlich diktieren Gesetze Speicherdauer. Das Cram-Video ergänzt PII, PHI und Finanzdaten als Beispiele mit empfindlichen Bußgeldern bei Nichteinhaltung.

Nicht:
B | Messer unterscheidet direkt lesbare Daten von nicht-menschenlesbaren (kodiert, Barcode) und nennt Mischformen als üblich. Das Cram-Video definiert nicht-menschenlesbar als Daten, die erst durch Software interpretierbar werden (Maschinencode, verschlüsselte Daten). Menschen-/nicht-menschenlesbar beschreibt das Datenformat, nicht die externe Regulierung durch Dritte.
C | Für Messer zählen sowohl unternehmensinterne Finanzkennzahlen als auch persönliche Bankdaten zu sensiblen Daten. Das Cram-Video nennt Anlagedaten, Kontodetails und Kreditkartennummern, geregelt durch Gramm-Leach-Bliley oder PCI DSS. Finanzinformationen sind ein Dateninhalt, Regulated Data die übergeordnete Kategorie extern vorgeschriebener Schutzregeln.
D | Messer beschreibt Geschäftsgeheimnisse als organisationseigene, von Wettbewerbern begehrte Verfahren. Das Cram-Video präzisiert: nicht registrierbar, gelten unbegrenzt solange Geheimhaltung gewahrt bleibt, Voraussetzungen sind wirtschaftlicher Wert und aktive Vertraulichkeitsmaßnahmen. Ein Geschäftsgeheimnis wird intern geschützt, während regulierte Daten ihre Schutzregeln von einer externen Partei vorgeschrieben bekommen.
```

### Karte `1786384200112` — 4.1 Security Techniques (template_suffix)

**Front:**
```
What is a major security risk associated with industrial control systems and SCADA?
A: Hardening targets — ICS/SCADA
B: Hardening targets — IoT devices
C: Hardening targets — RTOS
D: Hardening targets — Routers
```
**Vorher:**
```
>> CORRECT: A |

Messer erklärt SCADA als Kombination aus Netzwerk und Plattformen zur Industrieanlagen-Steuerung, typischerweise per Air Gap vom Rest der Organisation getrennt. Das Cram-Video nennt Segmentierung, physische Sicherheit, Change Management und laufende Überwachung.

Prüfpunkt: Damit ist „Hardening targets — ICS/SCADA“ gemeint.

Nicht:
B | Messer weist darauf hin, dass IoT-Hersteller keine Sicherheitsexperten sind, daher hohe Patch-Priorität und eigenes Netzsegment als Schadensbegrenzung. Das Cram-Video nennt starke Passwörter, Firmware-Updates, Netzsegmentierung und sichere Kommunikationsprotokolle. Das beschreibt „Hardening targets — IoT devices“ und nicht „Hardening targets — ICS/SCADA“.
C | Messer erklärt RTOS als deterministisches System für Industrie-/Militärtechnik und Fahrzeuge, mit Isolation vom übrigen Netz und minimalem Diensteumfang als Härtung. Das Cram-Video nennt RTOS nur zusammen mit Embedded Systems ohne eigene Inhalte. Das beschreibt „Hardening targets — RTOS“ und nicht „Hardening targets — ICS/SCADA“.
D | Router werden in beiden Quellen nicht getrennt von Switches behandelt, sondern in derselben Kategorie „Netzwerkinfrastruktur" — es gibt keine router-spezifischen Aussagen, dieselben Härtungspunkte gelten. Das beschreibt „Hardening targets — Routers“ und nicht „Hardening targets — ICS/SCADA“.
```
**Nachher:**
```
>> CORRECT: A |

Messer erklärt SCADA als Kombination aus Netzwerk und Plattformen zur Industrieanlagen-Steuerung, typischerweise per Air Gap vom Rest der Organisation getrennt. Das Cram-Video nennt Segmentierung, physische Sicherheit, Change Management und laufende Überwachung.

Nicht:
B | Messer weist darauf hin, dass IoT-Hersteller keine Sicherheitsexperten sind, daher hohe Patch-Priorität und eigenes Netzsegment als Schadensbegrenzung. Das Cram-Video nennt starke Passwörter, Firmware-Updates, Netzsegmentierung und sichere Kommunikationsprotokolle. IoT-Geräte sind Alltagsgeräte im Netz, ICS/SCADA speziell industrielle Steuerungssysteme mit Air-Gap-Trennung.
C | Messer erklärt RTOS als deterministisches System für Industrie-/Militärtechnik und Fahrzeuge, mit Isolation vom übrigen Netz und minimalem Diensteumfang als Härtung. Das Cram-Video nennt RTOS nur zusammen mit Embedded Systems ohne eigene Inhalte. RTOS ist das zeitkritische Betriebssystem auf einem Gerät, ICS/SCADA die übergeordnete industrielle Steuerungsarchitektur.
D | Router werden in beiden Quellen nicht getrennt von Switches behandelt, sondern in derselben Kategorie „Netzwerkinfrastruktur" — es gibt keine router-spezifischen Aussagen, dieselben Härtungspunkte gelten. Router gehören zur allgemeinen Netzwerkinfrastruktur, ICS/SCADA speziell zur Steuerung industrieller Anlagen.
```

### Karte `1786384200144` — 4.4 Security Monitoring (template_suffix)

**Front:**
```
Which SY0-701 concept best matches this description?

To identify system and application vulnerabilities needing remediation.
A: Activities — Scanning
B: Activities — Alerting
C: Activities — Reporting
D: Activities — Log aggregation
```
**Vorher:**
```
>> CORRECT: A |

Messer beschreibt permanentes Scannen aller Geräte nach OS-Version, Treibern und Anomalien. Das Cram-Video definiert Scanning als proaktive Suche nach Schwachstellen, Malware und Fehlkonfigurationen.

Prüfpunkt: Damit ist „Activities — Scanning“ gemeint.

Nicht:
B | Messer will sofortige Benachrichtigung bei Auffälligkeiten wie Authentifizierungsfehlern oder Datenabfluss. Das Cram-Video erklärt Alerts aus vordefinierten Regeln oder Anomalieerkennung (UEBA), Beispiel impossible travel. Das beschreibt „Activities — Alerting“ und nicht „Activities — Scanning“.
C | Messer stellt „actionable reports" in den Mittelpunkt: welche Geräte nicht konform sind und was zu tun ist. Das Cram-Video betont Adressatengerechtigkeit — Details für Sicherheitsteams, Zusammenfassungen fürs Management. Das beschreibt „Activities — Reporting“ und nicht „Activities — Scanning“.
D | Beide Quellen begründen Aggregation mit unterschiedlichen Log-Formaten verschiedener Systeme, zusammengeführt in einem SIEM. Das Cram-Video ergänzt die Normalisierung auf ein gemeinsames Event-Schema. Das beschreibt „Activities — Log aggregation“ und nicht „Activities — Scanning“.
```
**Nachher:**
```
>> CORRECT: A |

Messer beschreibt permanentes Scannen aller Geräte nach OS-Version, Treibern und Anomalien. Das Cram-Video definiert Scanning als proaktive Suche nach Schwachstellen, Malware und Fehlkonfigurationen.

Nicht:
B | Messer will sofortige Benachrichtigung bei Auffälligkeiten wie Authentifizierungsfehlern oder Datenabfluss. Das Cram-Video erklärt Alerts aus vordefinierten Regeln oder Anomalieerkennung (UEBA), Beispiel impossible travel. Alerting benachrichtigt bei bereits erkannten Auffälligkeiten, Scanning sucht dagegen proaktiv nach Schwachstellen und Fehlkonfigurationen.
C | Messer stellt „actionable reports" in den Mittelpunkt: welche Geräte nicht konform sind und was zu tun ist. Das Cram-Video betont Adressatengerechtigkeit — Details für Sicherheitsteams, Zusammenfassungen fürs Management. Reporting fasst Ergebnisse für Adressaten zusammen, Scanning ist dagegen die proaktive Suche selbst.
D | Beide Quellen begründen Aggregation mit unterschiedlichen Log-Formaten verschiedener Systeme, zusammengeführt in einem SIEM. Das Cram-Video ergänzt die Normalisierung auf ein gemeinsames Event-Schema. Log-Aggregation führt bereits vorhandene Daten zusammen, Scanning sucht dagegen aktiv nach neuen Schwachstellen.
```

### Karte `1786384200173` — 4.6 Identity and Access Management (template_suffix)

**Front:**
```
Which SY0-701 concept best matches this description?

A smartphone that generates authentication codes for login.
A: Factors — Something you know
B: Factors — Something you are
C: Factors — Somewhere you are
D: Factors — Something you have
```
**Vorher:**
```
>> CORRECT: D |

Messer zählt Smartcard, USB-Schlüssel, Hardware-/Software-Tokens und SMS-Codes dazu. Das Cram-Video fasst es als „vertrauenswürdiges Gerät" mit Authenticator-Apps.

Prüfpunkt: Damit ist „Factors — Something you have“ gemeint.

Nicht:
A | Messer nennt Passwort, PIN und Entsperrmuster als verbreitetsten Faktor. Das Cram-Video ergänzt wissensbasierte Authentifizierung mit statischen und dynamischen Fragen im Proofing-Kontext. Das beschreibt „Factors — Something you know“ und nicht „Factors — Something you have“.
B | Messer beschreibt diesen Faktor als biometrisch und schwer änderbar. Das Cram-Video grenzt ihn von verwandten Konzepten wie „something you can do" (Unterschrift) ab. Das beschreibt „Factors — Something you are“ und nicht „Factors — Something you have“.
C | Messer erklärt Standort als Faktor über kombinierte Quellen wie IP und GPS. Das Cram-Video beschreibt dynamische/bedingte Authentifizierung, die bei unerwartetem Ort einen stärkeren Faktor erzwingt. Das beschreibt „Factors — Somewhere you are“ und nicht „Factors — Something you have“.
```
**Nachher:**
```
>> CORRECT: D |

Messer zählt Smartcard, USB-Schlüssel, Hardware-/Software-Tokens und SMS-Codes dazu. Das Cram-Video fasst es als „vertrauenswürdiges Gerät" mit Authenticator-Apps.

Nicht:
A | Messer nennt Passwort, PIN und Entsperrmuster als verbreitetsten Faktor. Das Cram-Video ergänzt wissensbasierte Authentifizierung mit statischen und dynamischen Fragen im Proofing-Kontext. Wissen wie Passwort oder PIN ist ein eigener Faktor, Something you have meint dagegen einen physischen Besitzgegenstand.
B | Messer beschreibt diesen Faktor als biometrisch und schwer änderbar. Das Cram-Video grenzt ihn von verwandten Konzepten wie „something you can do" (Unterschrift) ab. Biometrische Merkmale sind ein eigener Faktor, Something you have meint dagegen einen physischen Besitzgegenstand.
C | Messer erklärt Standort als Faktor über kombinierte Quellen wie IP und GPS. Das Cram-Video beschreibt dynamische/bedingte Authentifizierung, die bei unerwartetem Ort einen stärkeren Faktor erzwingt. Der Standort ist ein Kontextfaktor, Something you have meint dagegen konkret einen physischen Besitzgegenstand.
```

### Karte `1786384200207` — 4.9 Security Data Sources (template_suffix)

**Front:**
```
Which SY0-701 concept best matches this description?

Details of connections, protocols, and IP addresses.
A: Log data — Endpoint logs
B: Log data — Network logs
C: Log data — Application logs
D: Log data — Metadata
```
**Vorher:**
```
>> CORRECT: B |

Messer nennt Switches, Router, APs und VPN-Konzentratoren mit Beispiel eines blockierten SYN-Angriffs. Das Cram-Video ergänzt, dass die Protokollierung meist per Syslog an einen zentralen Server erfolgt.

Prüfpunkt: Damit ist „Log data — Network logs“ gemeint.

Nicht:
A | Messer nennt Login-, System- und Geräteverwaltungsprotokolle, korrelierbar im SIEM. Das Cram-Video zählt zusätzlich Server und VMs dazu und betont die Notwendigkeit der Zentralisierung. Das beschreibt „Log data — Endpoint logs“ und nicht „Log data — Network logs“.
C | Messer nennt Windows Event Viewer und /var/log als Fundorte, zusammengeführt in einem SIEM. Das Cram-Video beschreibt Anwendungslogs als Aufzeichnung von Nutzeraktionen, Fehlern und Anomalien. Das beschreibt „Log data — Application logs“ und nicht „Log data — Network logs“.
D | Messer zeigt vier Metadaten-Beispiele: E-Mail-Header, Fotos, Browser und Office-Dokumente. Das Cram-Video ergänzt Dateizeiten, Web-Meta-Tags und betont Log-Metadaten für SIEM-Korrelation. Das beschreibt „Log data — Metadata“ und nicht „Log data — Network logs“.
```
**Nachher:**
```
>> CORRECT: B |

Messer nennt Switches, Router, APs und VPN-Konzentratoren mit Beispiel eines blockierten SYN-Angriffs. Das Cram-Video ergänzt, dass die Protokollierung meist per Syslog an einen zentralen Server erfolgt.

Nicht:
A | Messer nennt Login-, System- und Geräteverwaltungsprotokolle, korrelierbar im SIEM. Das Cram-Video zählt zusätzlich Server und VMs dazu und betont die Notwendigkeit der Zentralisierung. Endpoint-Logs protokollieren Aktivität auf einzelnen Geräten, Network Logs dagegen den Datenverkehr über Netzwerkgeräte.
C | Messer nennt Windows Event Viewer und /var/log als Fundorte, zusammengeführt in einem SIEM. Das Cram-Video beschreibt Anwendungslogs als Aufzeichnung von Nutzeraktionen, Fehlern und Anomalien. Anwendungslogs zeichnen Nutzeraktionen einzelner Programme auf, Network Logs dagegen den Verkehr über Netzwerkgeräte.
D | Messer zeigt vier Metadaten-Beispiele: E-Mail-Header, Fotos, Browser und Office-Dokumente. Das Cram-Video ergänzt Dateizeiten, Web-Meta-Tags und betont Log-Metadaten für SIEM-Korrelation. Metadaten stecken in einzelnen Dateien, Network Logs protokollieren dagegen den Verkehr über Netzwerkgeräte.
```

### Karte `1786384200239` — 5.3 Third-party Risk (template_suffix)

**Front:**
```
Which SY0-701 concept best matches this description?

A decision-maker receives gifts from a bidder, creating a personal interest that could improperly influence vendor selection.
A: Agreement types — Non-disclosure agreement (NDA)
B: Vendor selection — Conflict of interest
C: Vendor selection — Due diligence
D: Agreement types — Service-level agreement (SLA)
```
**Vorher:**
```
>> CORRECT: B |

Messer nennt Beispiele wie Doppelarbeit für Wettbewerber oder Geschenke zum Vertragsabschluss. Das Cram-Video systematisiert weitere Kategorien: Kickbacks, Informationsmissbrauch und den „Revolving Door"-Fall.

Prüfpunkt: Damit ist „Vendor selection — Conflict of interest“ gemeint.

Nicht:
A | Messer unterscheidet unilaterale, bilaterale und multilaterale NDAs zum Schutz von Geschäftsgeheimnissen. Das Cram-Video ergänzt Einsatz gegenüber Anbietern und eigenen Mitarbeitern mit variierenden Laufzeiten. Das beschreibt „Agreement types — Non-disclosure agreement (NDA)“ und nicht „Vendor selection — Conflict of interest“.
C | Messer beschreibt Due Diligence als Untersuchung eines Unternehmens vor der Geschäftsaufnahme inklusive Background-Checks. Das Cram-Video ergänzt Prüfung von Finanzlage und Compliance als Grundlage für Due Care. Das beschreibt „Vendor selection — Due diligence“ und nicht „Vendor selection — Conflict of interest“.
D | Das SLA legt laut Messer Mindestbedingungen wie Verfügbarkeit fest, Beispiel maximale Ausfallzeit. Das Cram-Video ergänzt Vertragsstrafen und die interne Entsprechung OLA. Das beschreibt „Agreement types — Service-level agreement (SLA)“ und nicht „Vendor selection — Conflict of interest“.
```
**Nachher:**
```
>> CORRECT: B |

Messer nennt Beispiele wie Doppelarbeit für Wettbewerber oder Geschenke zum Vertragsabschluss. Das Cram-Video systematisiert weitere Kategorien: Kickbacks, Informationsmissbrauch und den „Revolving Door"-Fall.

Nicht:
A | Messer unterscheidet unilaterale, bilaterale und multilaterale NDAs zum Schutz von Geschäftsgeheimnissen. Das Cram-Video ergänzt Einsatz gegenüber Anbietern und eigenen Mitarbeitern mit variierenden Laufzeiten. Ein NDA schützt vertrauliche Informationen, Conflict of Interest betrifft dagegen persönliche Interessenkonflikte bei der Anbieterauswahl.
C | Messer beschreibt Due Diligence als Untersuchung eines Unternehmens vor der Geschäftsaufnahme inklusive Background-Checks. Das Cram-Video ergänzt Prüfung von Finanzlage und Compliance als Grundlage für Due Care. Due Diligence prüft einen Anbieter vor Geschäftsbeginn, Conflict of Interest betrifft dagegen persönliche Interessenkonflikte der Entscheider.
D | Das SLA legt laut Messer Mindestbedingungen wie Verfügbarkeit fest, Beispiel maximale Ausfallzeit. Das Cram-Video ergänzt Vertragsstrafen und die interne Entsprechung OLA. Ein SLA legt Leistungskennzahlen fest, Conflict of Interest betrifft dagegen persönliche Interessenkonflikte bei der Anbieterauswahl.
```
