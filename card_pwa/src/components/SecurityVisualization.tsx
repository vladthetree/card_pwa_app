import { ArrowDown, ArrowRight, Ban, ExternalLink, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { SecurityVisual } from '../utils/securityVisuals'

const tag = 'font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ds-muted'

function Box({ title, children, accent = '' }: { title: string; children: ReactNode; accent?: string }) {
  return <div className={`min-w-0 border bg-ds-floor p-3 ${accent || 'border-ds-border'}`}><div className={tag}>{title}</div><div className="mt-2 text-sm font-semibold text-ds-fg">{children}</div></div>
}

function Arrow({ caption }: { caption?: string }) {
  return <div className="flex items-center justify-center gap-1 text-[--brand-primary]" aria-hidden="true"><ArrowDown size={16} className="sm:hidden" /><ArrowRight size={16} className="hidden sm:block" />{caption && <span className="font-mono text-[10px] text-ds-muted">{caption}</span>}</div>
}

function Tokenization() {
  return <div data-diagram="tokenization" className="grid gap-3 md:grid-cols-[1.2fr_auto_1fr] md:items-center">
    <div className="border-2 border-dashed border-rose-500/60 bg-rose-500/5 p-3">
      <div className="flex items-center gap-2"><LockKeyhole size={15} className="text-rose-600" /><span className={tag}>Geschützter Token-Dienst</span></div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Box title="Originalwert" accent="border-rose-500/40"><span className="break-all font-mono">kunde@example.test</span></Box>
        <span className="text-rose-600" aria-label="ist zugeordnet zu">↔</span>
        <Box title="Token" accent="border-rose-500/40"><span className="font-mono">tok_8F2A</span></Box>
      </div>
      <p className="mt-2 text-xs text-ds-muted">Nur hier ist die Zuordnung bekannt.</p>
    </div>
    <Arrow caption="nur Token" />
    <div className="border-2 border-emerald-600/60 bg-emerald-500/5 p-3">
      <div className="flex items-center gap-2"><ShieldCheck size={15} className="text-emerald-700" /><span className={tag}>Anwendung / Tabelle</span></div>
      <div className="mt-3 border border-emerald-600/40 bg-ds-floor px-3 py-4 font-mono text-lg font-bold text-ds-fg">tok_8F2A</div>
      <p className="mt-2 text-xs text-ds-muted">Das Original steht nicht im Anwendungsdatensatz.</p>
    </div>
    <p className="text-xs text-ds-muted md:col-span-3">Schematisches Beispiel einer <strong>reversiblen</strong> Tokenisierung; irreversible Tokens brauchen keine abrufbare Zuordnung.</p>
  </div>
}

function Symmetric() {
  return <div data-diagram="symmetric">
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch">
      <Box title="Sender · verschlüsselt">HALLO<div className="mt-3 flex items-center gap-1 font-mono text-xs text-[--brand-primary]"><KeyRound size={13} /> geheimer Schlüssel K</div></Box>
      <Arrow />
      <Box title="Übertragungsweg"><span className="font-mono text-lg">X7Q…</span><div className="text-xs font-normal text-ds-muted">schematisches Chiffrat</div></Box>
      <Arrow />
      <Box title="Empfänger · entschlüsselt">HALLO<div className="mt-3 flex items-center gap-1 font-mono text-xs text-[--brand-primary]"><KeyRound size={13} /> derselbe Schlüssel K</div></Box>
    </div>
    <div className="mt-3 border-l-2 border-[--brand-primary] pl-3 text-sm font-semibold text-ds-fg">K = K auf beiden Seiten. Auf dem Übertragungsweg liegt nur das Chiffrat.</div>
  </div>
}

function Asymmetric() {
  return <div data-diagram="asymmetric" className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
    <Box title="Absender">HALLO<div className="mt-2 flex items-center gap-1 text-xs text-emerald-700"><KeyRound size={13} /> öffentlicher Schlüssel des Empfängers</div></Box>
    <Arrow caption="verschlüsselt" />
    <Box title="Übertragung"><span className="font-mono">X7Q…</span><div className="text-xs font-normal text-ds-muted">schematisches Chiffrat</div></Box>
    <Arrow caption="entschlüsselt" />
    <Box title="Empfänger">HALLO<div className="mt-2 flex items-center gap-1 text-xs text-rose-700"><KeyRound size={13} /> eigener privater Schlüssel</div></Box>
  </div>
}

function Masking() {
  return <div data-diagram="masking" className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
    <Box title="Geschützter vollständiger Wert" accent="border-rose-500/50"><span className="font-mono">1234 5678 9012 1234</span><div className="text-xs font-normal text-ds-muted">fiktive Beispielnummer</div></Box>
    <Arrow caption="Anzeige" />
    <Box title="Sicht für normalen Nutzer" accent="border-emerald-600/50"><span className="bg-zinc-800 px-1 font-mono text-white">•••• •••• ••••</span><span className="ml-1 font-mono">1234</span><div className="text-xs font-normal text-ds-muted">Nur die letzten vier Ziffern sind sichtbar.</div></Box>
  </div>
}

function ZeroTrust() {
  return <div data-diagram="zero-trust" className="grid gap-2 sm:grid-cols-[1fr_auto_1.2fr_auto_1fr] sm:items-center">
    <Box title="Anfrage">Login mit Zugangsdaten<div className="text-xs font-normal text-ds-muted">Auch gestohlene Daten können gültig sein.</div></Box>
    <Arrow />
    <div className="border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3"><div className={tag}>Prüfung pro Zugriff</div><div className="mt-2 grid grid-cols-2 gap-1 text-xs font-semibold text-ds-fg"><span className="border border-ds-border p-1">Identität</span><span className="border border-ds-border p-1">Gerät</span><span className="border border-ds-border p-1">Kontext</span><span className="border border-ds-border p-1">Richtlinie</span></div></div>
    <Arrow />
    <Box title="Nur freigegebene Ressource">Dateiserver<div className="text-xs font-normal text-ds-muted">Kein pauschaler Netzzugang.</div></Box>
  </div>
}

function Pep() {
  return <div data-diagram="pep" className="mx-auto max-w-3xl">
    <div className="mx-auto w-fit border border-ds-border bg-ds-floor px-4 py-2 text-center"><div className={tag}>Policy Engine</div><div className="text-sm font-semibold text-ds-fg">entscheidet: erlauben / verweigern</div></div>
    <div className="flex justify-center text-[--brand-primary]"><ArrowDown size={20} aria-hidden="true" /></div>
    <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_1.2fr_auto_1fr]">
      <Box title="Valerie">Zugriff?</Box><ArrowDown size={16} className="mx-auto text-[--brand-primary] sm:hidden" aria-hidden="true" /><ArrowRight size={16} className="hidden text-[--brand-primary] sm:block" aria-hidden="true" />
      <div className="border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3 text-center"><div className={tag}>Policy Enforcement Point</div><div className="text-sm font-bold text-ds-fg">Tor / Durchsetzung</div></div>
      <div className="flex flex-col items-stretch gap-1 sm:flex-row sm:items-center"><ArrowDown size={16} className="mx-auto text-[--brand-primary] sm:hidden" aria-hidden="true" /><ArrowRight size={16} className="hidden shrink-0 text-[--brand-primary] sm:block" aria-hidden="true" /><Box title="Ressource">Dateiserver</Box></div>
    </div>
  </div>
}

function Segmentation() {
  return <div data-diagram="segmentation" className="grid gap-3 md:grid-cols-[1fr_1.2fr_1fr] md:items-stretch">
    <Box title="Zone 1 · kompromittiert" accent="border-rose-600">Arbeitsplatz<div className="mt-1 text-xs font-normal text-ds-muted">Angreifer hat Zugriff auf diesen Host.</div></Box>
    <div className="border-2 border-dashed border-rose-700 bg-rose-500/5 p-3 text-center">
      <div className={tag}>Segmentgrenze · Regelprüfung</div>
      <div className="mt-3 flex items-center justify-center gap-2 font-semibold text-rose-800"><Ban size={20} /> Direkter Datenbankzugriff: blockiert</div>
      <div className="mt-2 border-t border-rose-700/30 pt-2 text-xs text-ds-muted">Nur ausdrücklich erlaubter Verkehr überschreitet die Grenze.</div>
    </div>
    <Box title="Zone 2 · geschützt" accent="border-emerald-700">Datenbank<div className="mt-1 text-xs font-normal text-ds-muted">Nicht automatisch vom Arbeitsplatz aus erreichbar.</div></Box>
  </div>
}

function Risk() {
  const [selected, setSelected] = useState({ likelihood: 2, impact: 3 })
  const levels = ['niedrig', 'mittel', 'hoch'] as const
  const rating = (likelihood: number, impact: number) => {
    const score = likelihood * impact
    return score >= 9 ? 'sehr hoch' : score >= 6 ? 'hoch' : score >= 3 ? 'mittel' : 'niedrig'
  }
  return <div data-diagram="risk" className="mx-auto max-w-lg">
    <p className="mb-3 text-sm text-ds-fg"><strong>Beispiel: Ausfall eines wichtigen Dienstes.</strong> Wähle Eintrittswahrscheinlichkeit und Auswirkung in der Matrix.</p>
    <div className="grid grid-cols-[5.5rem_1fr] gap-2 sm:grid-cols-[7rem_1fr]">
      <div className="flex items-center justify-end text-right font-mono text-[10px] font-bold uppercase leading-tight text-ds-muted">Eintritts-<br />wahrscheinlichkeit</div>
      <div className="grid grid-cols-3 gap-1 text-center font-mono text-[10px] text-ds-muted"><span>gering</span><span>mittel</span><span>hoch</span></div>
      {[3, 2, 1].map(likelihood => <div className="contents" key={likelihood}>
        <div className="flex items-center justify-end pr-1 text-right font-mono text-[10px] text-ds-muted">{levels[likelihood - 1]}</div>
        <div className="grid grid-cols-3 gap-1">
          {[1, 2, 3].map(impact => {
            const active = selected.likelihood === likelihood && selected.impact === impact
            const level = rating(likelihood, impact)
            return <button key={impact} type="button" aria-pressed={active} aria-label={`Wahrscheinlichkeit ${levels[likelihood - 1]}, Auswirkung ${levels[impact - 1]}: Risiko ${level}`} onClick={() => setSelected({ likelihood, impact })} className={`min-h-12 border p-1 text-center text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--brand-primary] ${active ? 'border-2 border-rose-700 bg-rose-500/20 text-rose-800' : 'border-ds-border bg-ds-floor text-ds-muted'}`}>
              {active ? <span aria-hidden="true">● </span> : null}{level}
            </button>
          })}
        </div>
      </div>)}
      <div />
      <div className="text-center font-mono text-[10px] font-bold uppercase text-ds-muted">Auswirkung →</div>
    </div>
    <p className="mt-3 border-l-2 border-rose-600 pl-3 text-sm text-ds-fg" aria-live="polite">Markierter Fall: <strong>{['geringe', 'mittlere', 'hohe'][selected.likelihood - 1]} Wahrscheinlichkeit × {['geringe', 'mittlere', 'hohe'][selected.impact - 1]} Auswirkung → Risikostufe {rating(selected.likelihood, selected.impact)}.</strong></p>
    <p className="mt-2 text-xs text-ds-muted">Qualitatives Beispiel, keine universelle Rechenformel oder verbindliche Risikoklasse.</p>
  </div>
}

function Rto() {
  const [recoveryHour, setRecoveryHour] = useState(3.5)
  const onTime = recoveryHour <= 4
  return <div data-diagram="rto">
    <div className="flex justify-between gap-2 font-mono text-xs font-bold text-ds-fg"><span>08:00<br />Ausfall</span><span className="text-right">12:00<br />RTO-Grenze (+4 h)</span></div>
    <div className="relative mt-3 h-11 border border-ds-border bg-ds-floor" aria-label="Zeitachse von 08:00 bis 13:00 Uhr">
      <div className="absolute inset-y-0 left-0 w-4/5 bg-emerald-500/15" aria-hidden="true" />
      <div className="absolute inset-y-0 left-4/5 border-l-2 border-dashed border-rose-700" data-marker="rto-deadline" aria-hidden="true" />
      <div className="absolute inset-y-0 border-l-[3px] border-sky-700" style={{ left: `${recoveryHour / 5 * 100}%` }} data-marker="actual-recovery" aria-hidden="true"><span className={`absolute -top-6 whitespace-nowrap font-mono text-[10px] font-bold text-sky-800 ${onTime ? 'left-1' : 'right-1'}`}>Dienst wieder da</span></div>
      <span className="absolute bottom-1 left-2 text-[10px] text-ds-muted">Zielbereich</span>
    </div>
    <div className="mt-1 flex justify-between font-mono text-[10px] text-ds-muted"><span>08:00</span><span>13:00</span></div>
    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Wiederherstellungszeit wählen">
      <button type="button" aria-pressed={recoveryHour === 3.5} onClick={() => setRecoveryHour(3.5)} className={`border px-3 py-1 text-xs font-semibold ${onTime ? 'border-emerald-700 bg-emerald-500/15' : 'border-ds-border'}`}>11:30 · rechtzeitig</button>
      <button type="button" aria-pressed={recoveryHour === 4.5} onClick={() => setRecoveryHour(4.5)} className={`border px-3 py-1 text-xs font-semibold ${!onTime ? 'border-rose-700 bg-rose-500/15' : 'border-ds-border'}`}>12:30 · zu spät</button>
    </div>
    <p className="mt-3 border-l-2 border-[--brand-primary] pl-3 text-sm font-semibold text-ds-fg" aria-live="polite">{onTime ? 'Wiederherstellung 11:30: Ziel erreicht, 30 Minuten vor der RTO-Grenze.' : 'Wiederherstellung 12:30: Ziel verfehlt, 30 Minuten nach der RTO-Grenze.'}</p>
    <p className="mt-2 text-xs text-ds-muted">Die RTO begrenzt die Wiederherstellungszeit; RPO betrifft den tolerierbaren Datenverlust.</p>
  </div>
}

function Playbook() {
  return <div data-diagram="playbook">
    <div className="grid gap-2 md:grid-cols-[1fr_auto_1.3fr_auto_1fr] md:items-center">
      <Box title="Auslöser">Alarm: verdächtige Anmeldung</Box>
      <Arrow />
      <div className="border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3"><div className={tag}>Playbook · Entscheidung</div><div className="mt-2 text-sm font-semibold text-ds-fg">Vorfall bestätigt?</div><div className="mt-1 text-xs text-ds-muted">Ereignis und betroffene Systeme prüfen.</div></div>
      <Arrow caption="ja" />
      <Box title="Vorgegebene Handlung" accent="border-rose-600">Betroffene Systeme isolieren</Box>
    </div>
    <div className="mt-3 grid gap-2 border-l-2 border-ds-border pl-3 text-xs text-ds-fg sm:grid-cols-2"><span><strong>Nein:</strong> Befund dokumentieren und beobachten.</span><span><strong>Nach Eindämmung:</strong> Dienst kontrolliert wiederherstellen und prüfen.</span></div>
  </div>
}

function Collision() {
  return <div data-diagram="collision" className="mx-auto max-w-3xl">
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <Box title="Datei A" accent="border-sky-700"><span className="font-mono">Inhalt A</span><div className="mt-2 text-xs font-normal text-ds-muted">A ≠ B</div></Box>
      <div className="flex items-center justify-center font-mono text-sm font-bold text-ds-fg">≠</div>
      <Box title="Datei B" accent="border-amber-700"><span className="font-mono">Inhalt B</span><div className="mt-2 text-xs font-normal text-ds-muted">anderer Inhalt</div></Box>
    </div>
    <div className="my-2 grid grid-cols-2 gap-2 text-center text-[--brand-primary]" aria-hidden="true"><ArrowDown className="mx-auto" size={20} /><ArrowDown className="mx-auto" size={20} /></div>
    <div className="grid grid-cols-2 gap-2"><Box title="Hash(A)"><span className="font-mono">h</span></Box><Box title="Hash(B)"><span className="font-mono">h</span></Box></div>
    <p className="mt-3 border-l-2 border-rose-700 pl-3 text-sm font-semibold text-ds-fg">A ≠ B, aber Hash(A) = Hash(B): gleicher Digest trotz verschiedener Inhalte.</p>
    <p className="mt-1 text-xs text-ds-muted">Schematische Darstellung; h ist kein berechneter Hashwert.</p>
  </div>
}

function Wildcard() {
  return <div data-diagram="wildcard" className="mx-auto max-w-3xl">
    <div className="border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3 text-center"><div className={tag}>Zertifikat · DNS-Name</div><div className="mt-1 font-mono text-lg font-bold text-ds-fg">*.example.com</div><div className="mt-1 text-xs text-ds-muted">* ersetzt genau das linke Label.</div></div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <div className="border border-emerald-700 bg-emerald-500/10 p-3"><div className={tag}>✓ Passt</div><div className="mt-2 break-all font-mono text-sm font-semibold text-ds-fg">sales.example.com<br />support.example.com</div></div>
      <div className="border border-rose-700 bg-rose-500/10 p-3"><div className={tag}>✕ Passt nicht allein durch *</div><div className="mt-2 break-all font-mono text-sm font-semibold text-ds-fg">example.com<br />api.sales.example.com</div></div>
    </div>
  </div>
}

function FileIntegrity() {
  return <div data-diagram="file-integrity" className="mx-auto max-w-3xl">
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
      <Box title="Referenz · zuvor gespeichert" accent="border-emerald-700">Datei: Version 1<div className="mt-2 font-mono text-xs">Digest h₁</div></Box>
      <div className="flex items-center justify-center font-mono text-lg font-bold text-rose-700">≠</div>
      <Box title="Aktuell · nach Änderung" accent="border-rose-700">Datei: Version 2<div className="mt-2 font-mono text-xs">Digest h₂</div></Box>
    </div>
    <div className="mt-3 border-l-2 border-rose-700 bg-rose-500/5 p-3 text-sm text-ds-fg"><strong>h₁ ≠ h₂ → Alarm:</strong> Änderung erkannt. Die Überwachung hat die Änderung nicht blockiert.</div>
    <p className="mt-1 text-xs text-ds-muted">Schematische Digest-Symbole, keine berechneten Hashwerte.</p>
  </div>
}

function SignedLogs() {
  return <div data-diagram="signed-logs" className="mx-auto max-w-4xl">
    <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_1.2fr] md:items-center">
      <Box title="Log-Inhalt">Ereignisse<div className="mt-1 text-xs font-normal text-ds-muted">Änderung ändert den Digest.</div></Box>
      <Arrow caption="hashen" />
      <Box title="Digest"><span className="font-mono">H(Log)</span></Box>
      <Arrow caption="signieren" />
      <div className="border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3"><div className={tag}>Renees privater Schlüssel</div><div className="mt-2 text-sm font-semibold text-ds-fg">Digitale Signatur über den Digest</div></div>
    </div>
    <div className="mt-3 grid gap-2 border-l-2 border-emerald-700 bg-emerald-500/5 p-3 text-sm text-ds-fg sm:grid-cols-2"><span><strong>Prüfung 1:</strong> Log erneut hashen; Digest muss passen.</span><span><strong>Prüfung 2:</strong> Signatur mit Renees öffentlichem Schlüssel prüfen.</span></div>
    <p className="mt-2 text-xs text-ds-muted">Ein Hash ohne Signatur zeigt für sich allein nicht, wer das Log bestätigt hat.</p>
  </div>
}

function DataController() {
  return <div data-diagram="data-controller" className="mx-auto max-w-3xl">
    <div className="grid gap-2 md:grid-cols-[1.2fr_auto_1fr] md:items-center">
      <div className="border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3"><div className={tag}>Controller · entscheidet</div><div className="mt-2 grid gap-1 text-sm font-semibold text-ds-fg"><span>Wozu? → Zweck</span><span>Wie? → Mittel</span></div></div>
      <Arrow caption="beauftragt" />
      <Box title="Processor · führt aus">Verarbeitet personenbezogene Daten im Auftrag des Controllers.</Box>
    </div>
    <p className="mt-3 border-l-2 border-[--brand-primary] pl-3 text-sm text-ds-fg">Nicht das bloße Speichern oder Transportieren macht eine Stelle zum Controller, sondern die Entscheidung über Zweck und Mittel.</p>
  </div>
}

function Availability() {
  return <div data-diagram="availability" className="mx-auto max-w-3xl">
    <p className="mb-3 text-xs text-ds-muted">Schematisches Wartungsbeispiel; Uhrzeiten sind nicht Teil der Karte.</p>
    <div className="grid grid-cols-[5rem_1fr] items-center gap-x-2 gap-y-3 text-sm sm:grid-cols-[7rem_1fr]">
      <span className="font-mono text-xs font-bold text-ds-fg">Geplant</span><div className="flex h-9 border border-ds-border"><span className="flex w-1/4 items-center justify-center bg-rose-500/15 text-[10px]">Wartung</span><span className="flex flex-1 items-center justify-center bg-emerald-500/15 text-[10px]">Dienst erreichbar</span></div>
      <span className="font-mono text-xs font-bold text-ds-fg">Tatsächlich</span><div className="flex h-9 border border-ds-border"><span className="flex w-1/4 items-center justify-center bg-rose-500/15 text-[10px]">Wartung</span><span className="flex w-1/4 items-center justify-center border-x-2 border-rose-700 bg-rose-500/30 text-[10px] font-bold">Verlängerung</span><span className="flex flex-1 items-center justify-center bg-emerald-500/15 text-[10px]">Dienst erreichbar</span></div>
    </div>
    <p className="mt-3 border-l-2 border-rose-700 pl-3 text-sm font-semibold text-ds-fg">Während der Verlängerung können Berechtigte den Dienst nicht rechtzeitig nutzen → Verfügbarkeit betroffen.</p>
  </div>
}

function DnsPoisoning() {
  return <div data-diagram="dns-poisoning" className="mx-auto max-w-3xl">
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="border border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>Korrekter DNS-Eintrag</div><div className="mt-2 break-all font-mono text-sm text-ds-fg">portal.example → 192.0.2.10</div><div className="mt-2 text-xs text-ds-muted">Ziel: echter Server</div></div>
      <div className="border-2 border-rose-700 bg-rose-500/5 p-3"><div className={tag}>Vergifteter DNS-Eintrag</div><div className="mt-2 break-all font-mono text-sm font-bold text-ds-fg">portal.example → 198.51.100.20</div><div className="mt-2 text-xs text-ds-muted">Ziel: falscher Server</div></div>
    </div>
    <p className="mt-3 border-l-2 border-rose-700 pl-3 text-sm font-semibold text-ds-fg">Gleicher legitimer Name, aber manipulierte Zieladresse: Nutzer werden fehlgeleitet.</p>
    <p className="mt-1 text-xs text-ds-muted">Beispieladressen aus reservierten Dokumentationsbereichen.</p>
  </div>
}

function OnPath() {
  return <div data-diagram="on-path" className="mx-auto max-w-4xl">
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
      <Box title="Client">Anfrage an entfernten Server</Box>
      <Arrow />
      <div className="border-2 border-rose-700 bg-rose-500/5 p-3"><div className={tag}>Angreifer · Zwischenstation</div><div className="mt-2 text-sm font-semibold text-ds-fg">Empfängt und leitet weiter</div></div>
      <Arrow />
      <Box title="Entferntes Ziel">Server</Box>
    </div>
    <div className="mt-3 grid gap-2 text-xs text-ds-fg sm:grid-cols-2"><div className="border-l-2 border-rose-700 pl-3"><strong>Durchgeleiteter Verkehr:</strong> Die Zwischenstation sieht, dass Daten übertragen werden.</div><div className="border-l-2 border-emerald-700 pl-3"><strong>Verschlüsselter Inhalt:</strong> Nicht allein durch die Zwischenposition im Klartext lesbar.</div></div>
  </div>
}

function Csrf() {
  return <div data-diagram="csrf" className="mx-auto max-w-4xl">
    <div className="grid gap-2 md:grid-cols-[1fr_auto_1.2fr_auto_1fr] md:items-center">
      <Box title="Fremde Seite" accent="border-rose-700">Veranlasst eine unerwünschte Aktion</Box>
      <Arrow caption="stößt an" />
      <div className="border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3"><div className={tag}>Browser des angemeldeten Nutzers</div><div className="mt-2 text-sm font-semibold text-ds-fg">Sendet Anfrage + bestehendes Sitzungscookie</div></div>
      <Arrow caption="Anfrage" />
      <Box title="Vertrauenswürdige Website">Sieht die authentifizierte Anfrage.</Box>
    </div>
    <p className="mt-3 border-l-2 border-rose-700 pl-3 text-sm font-semibold text-ds-fg">Der Angreifer nutzt das Vertrauen der Website in die Sitzung des Nutzers – nicht das Vertrauen des Nutzers in fremden Code (XSS).</p>
  </div>
}

function RiskTransfer() {
  return <div data-diagram="risk-transfer" className="mx-auto max-w-3xl">
    <Box title="Vorfall · schematisches Kostenbeispiel">100.000 € Schaden</Box>
    <div className="my-2 text-center text-[--brand-primary]" aria-hidden="true"><ArrowDown size={20} className="mx-auto" /></div>
    <div className="flex h-12 border border-ds-border text-xs font-semibold"><div className="flex w-[70%] items-center justify-center bg-sky-500/20 px-1 text-center">70.000 € · vertraglich gedeckt</div><div className="flex w-[30%] items-center justify-center border-l border-ds-border bg-rose-500/15 px-1 text-center">30.000 € · verbleiben</div></div>
    <p className="mt-3 border-l-2 border-[--brand-primary] pl-3 text-sm text-ds-fg"><strong>Transfer:</strong> Vereinbarte finanzielle Folgen gehen an die Versicherung. Der Vorfall selbst und ungedeckte Folgen bleiben möglich.</p>
    <p className="mt-1 text-xs text-ds-muted">Die Beträge sind nur ein Rechenbeispiel, keine Aussage zu einem realen Vertrag.</p>
  </div>
}

function RiskAvoid() {
  return <div data-diagram="risk-avoid" className="mx-auto max-w-3xl">
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><Box title="Vorher" accent="border-rose-700">Webdienst online<div className="mt-1 text-xs font-normal text-ds-muted">Bekannte SQL-Injection-Stelle erreichbar.</div></Box><Arrow caption="stoppen" /><Box title="Bis zur Behebung" accent="border-emerald-700">Dienst offline<div className="mt-1 text-xs font-normal text-ds-muted">Keine Anfragen an diesen Dienst.</div></Box></div>
    <p className="mt-3 border-l-2 border-[--brand-primary] pl-3 text-sm font-semibold text-ds-fg">Die riskante Aktivität wird ausgesetzt. Weiterbetrieb mit einem Schutzfilter wäre dagegen Mitigation, nicht Vermeidung.</p>
  </div>
}

function VersionControl() {
  return <div data-diagram="version-control" className="mx-auto max-w-3xl">
    <div className="grid grid-cols-3 items-center gap-2 text-center">
      {['Commit v1', 'Commit v2', 'Commit v3'].map((version, index) => <div key={version} className={`relative border p-3 font-mono text-xs font-bold ${index === 2 ? 'border-2 border-emerald-700 bg-emerald-500/10 text-ds-fg' : 'border-ds-border bg-ds-floor text-ds-muted'}`}>{index > 0 && <span className="absolute -left-3 top-1/2 -translate-y-1/2 bg-ds-panel text-[--brand-primary]" aria-hidden="true">→</span>}{version}</div>)}
    </div>
    <div className="mt-2 flex justify-end pr-[15%] text-emerald-700" aria-hidden="true"><ArrowDown size={20} /></div>
    <div className="ml-auto w-fit border-2 border-emerald-700 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-ds-fg">Deployment: bewusst v3 gewählt</div>
    <p className="mt-3 border-l-2 border-[--brand-primary] pl-3 text-sm text-ds-fg">Die Historie zeigt, welche Fassung aktuell ist und welche bereitgestellt wurde. Git stellt neue Versionen nicht von selbst bereit.</p>
  </div>
}

function BluetoothAttacks() {
  return <div data-diagram="bluetooth-attacks" className="mx-auto max-w-3xl">
    <div className="mx-auto w-fit border-2 border-[--brand-primary] bg-[--brand-primary-08] px-5 py-3 text-center"><div className={tag}>Bluetooth-Telefon</div><div className="mt-1 text-sm font-bold text-ds-fg">Nachrichten · gespeicherte Daten</div></div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <div className="border border-sky-700 bg-sky-500/5 p-3"><div className={tag}>Bluejacking</div><div className="mt-2 text-sm font-semibold text-ds-fg">Angreifer → Telefon</div><div className="mt-1 text-xs text-ds-muted">Unaufgeforderte Nachricht kommt an.</div></div>
      <div className="border-2 border-rose-700 bg-rose-500/5 p-3"><div className={tag}>Bluesnarfing</div><div className="mt-2 text-sm font-semibold text-ds-fg">Telefon → Angreifer</div><div className="mt-1 text-xs text-ds-muted">Gespeicherte Daten werden entwendet.</div></div>
    </div>
    <p className="mt-3 border-l-2 border-[--brand-primary] pl-3 text-sm text-ds-fg">Die Pfeilrichtung zeigt den Unterschied: Nachricht zum Gerät oder Daten vom Gerät.</p>
  </div>
}

function Reconnaissance() {
  return <div data-diagram="reconnaissance" className="mx-auto max-w-3xl">
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="border-2 border-rose-700 bg-rose-500/5 p-3"><div className={tag}>Aktiv · Nmap</div><div className="mt-2 font-mono text-sm font-bold text-ds-fg">Tester → Scan-Pakete → Ziel</div><div className="mt-2 text-xs text-ds-muted">Der Tester kontaktiert das Ziel unmittelbar.</div></div>
      <div className="border-2 border-sky-700 bg-sky-500/5 p-3"><div className={tag}>Passiv · Shodan</div><div className="mt-2 font-mono text-sm font-bold text-ds-fg">Tester → bestehender Index</div><div className="mt-2 text-xs text-ds-muted">Keine eigene Anfrage des Testers an das Ziel.</div></div>
    </div>
    <p className="mt-3 border-l-2 border-[--brand-primary] pl-3 text-sm text-ds-fg">Entscheidend ist, ob <strong>dieser Tester</strong> das Ziel selbst abfragt. Ein externer Index kann zuvor eigene Scans durchgeführt haben.</p>
  </div>
}

function AllowList() {
  const [added, setAdded] = useState(false)
  return <div data-diagram="allow-list" className="mx-auto max-w-3xl">
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
      <Box title="Erlaubt">updates.vendor.test</Box><Arrow caption="Regel" />
      <div className={`border-2 p-3 ${added ? 'border-emerald-700 bg-emerald-500/10' : 'border-rose-700 bg-rose-500/10'}`}><div className={tag}>Neue benötigte Adresse</div><div className="mt-2 break-all font-mono text-sm font-bold text-ds-fg">cdn.vendor.test</div><div className="mt-1 text-sm font-semibold text-ds-fg">{added ? '✓ Update erreichbar' : '✕ Update blockiert'}</div></div>
    </div>
    <button type="button" aria-pressed={added} onClick={() => setAdded(value => !value)} className="mt-3 border border-ds-border px-3 py-2 text-xs font-semibold text-ds-fg hover:bg-ds-floor">{added ? 'Neuen Eintrag wieder entfernen' : 'Benötigte Adresse zur Allowlist hinzufügen'}</button>
    <p className="mt-3 border-l-2 border-[--brand-primary] pl-3 text-sm text-ds-fg" aria-live="polite">{added ? 'Regel gepflegt: beide nötigen Ziele sind erreichbar.' : 'Regel noch nicht gepflegt: selbst ein legitimes Updateziel bleibt gesperrt.'}</p>
    <p className="mt-1 text-xs text-ds-muted">Beispieldomains; die Grafik zeigt die Pflegefolge, keine konkrete Anbieterregel.</p>
  </div>
}

function FileEncryption() {
  return <div data-diagram="file-encryption" className="mx-auto max-w-4xl">
    <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr] md:items-center"><div className="border border-ds-border bg-ds-floor p-3"><div className={tag}>Freigabe A</div><div className="mt-2 border-2 border-[--brand-primary] p-2 font-mono text-sm font-bold text-ds-fg">🔒 bericht.enc</div></div><Arrow caption="Datei kopieren" /><div className="border border-ds-border bg-ds-floor p-3"><div className={tag}>Freigabe B</div><div className="mt-2 border-2 border-[--brand-primary] p-2 font-mono text-sm font-bold text-ds-fg">🔒 bericht.enc</div></div></div>
    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><div className="border-l-2 border-emerald-700 pl-3 text-ds-fg"><strong>Alice:</strong> passender Dateischlüssel → lesen möglich.</div><div className="border-l-2 border-rose-700 pl-3 text-ds-fg"><strong>Bob:</strong> kein Dateischlüssel → Inhalt bleibt geschützt.</div></div>
    <p className="mt-2 text-xs text-ds-muted">Schematisch: die verschlüsselte Datei wird unverändert kopiert. Reine Datenträgerverschlüsselung schützt dagegen den Datenträger, nicht automatisch eine herauskopierte Datei.</p>
  </div>
}

function ZeroTrustPolicy() {
  return <div data-diagram="zero-trust-policy" className="mx-auto max-w-4xl">
    <div className="grid gap-2 md:grid-cols-[1.1fr_auto_1fr_auto_1fr] md:items-center">
      <div className="border border-ds-border bg-ds-floor p-3"><div className={tag}>Eingaben zur Anfrage</div><div className="mt-2 grid grid-cols-2 gap-1 text-xs text-ds-fg"><span>Richtlinie</span><span>Identität</span><span>Gerätezustand</span><span>Bedrohungsdaten</span></div></div>
      <Arrow caption="bewerten" />
      <div className="border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3"><div className={tag}>Policy Engine</div><div className="mt-2 text-sm font-bold text-ds-fg">Vertrauenslage → erlauben / verweigern</div></div>
      <Arrow caption="Entscheid" />
      <Box title="PEP am Dienst">setzt die Entscheidung durch</Box>
    </div>
    <p className="mt-3 border-l-2 border-[--brand-primary] pl-3 text-sm text-ds-fg">Ein gültiger Login allein ist nicht die Freigabe: Der Kontext fließt in die Entscheidung ein; die Engine entscheidet, der PEP erzwingt.</p>
  </div>
}

function Backout() {
  return <div data-diagram="backout" className="mx-auto max-w-3xl">
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><Box title="Vor dem Change" accent="border-emerald-700">Version 1 funktioniert<div className="mt-1 text-xs font-normal text-ds-muted">Rückweg vorab dokumentiert.</div></Box><Arrow caption="Änderung" /><Box title="Neuer Stand" accent="border-rose-700">Version 2 schlägt fehl</Box></div>
    <div className="mt-3 border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3 text-sm text-ds-fg"><strong>Backout auslösen:</strong> definierte Schritte und gesicherte Fassung verwenden → Version 1 wiederherstellen.</div>
    <p className="mt-2 text-xs text-ds-muted">Impact-Analyse schätzt Folgen vorher; der Backout-Plan beschreibt die Rückkehr nach einem Fehlschlag.</p>
  </div>
}

function Ddos() {
  return <div data-diagram="ddos" className="mx-auto max-w-3xl">
    <div className="grid gap-2 sm:grid-cols-[1.2fr_auto_1fr] sm:items-center"><div className="grid grid-cols-3 gap-1">{['Host A', 'Host B', 'Host C'].map(host => <div key={host} className="border border-rose-700 bg-rose-500/5 p-2 text-center font-mono text-[10px] font-bold text-ds-fg">{host}<br />infiziert</div>)}</div><Arrow caption="Paketflut" /><div className="border-2 border-rose-700 bg-rose-500/15 p-3 text-center"><div className={tag}>Externes Ziel</div><div className="mt-2 text-sm font-bold text-ds-fg">Dienst überlastet</div></div></div>
    <p className="mt-3 border-l-2 border-rose-700 pl-3 text-sm text-ds-fg"><strong>Verteilt + Dienstverweigerung = DDoS.</strong> Die Rechner können Teil eines Botnets sein; die Karte fragt nach dem Angriff auf das Ziel.</p>
  </div>
}

function Permissions() {
  return <div data-diagram="permissions" className="mx-auto max-w-lg">
    <div className="border-2 border-rose-700 bg-rose-500/5 p-3 text-center font-mono text-lg font-bold text-ds-fg">/etc · chmod 777</div>
    <div className="mt-2 grid grid-cols-[1fr_repeat(3,auto)] gap-1 text-xs text-ds-fg"><span />{['Lesen', 'Schreiben', 'Ausführen'].map(action => <span key={action} className="px-1 text-center font-bold">{action}</span>)}{['Eigentümer', 'Gruppe', 'Alle anderen'].map(role => <div key={role} className="contents"><span className="border border-ds-border p-2 font-semibold">{role}</span>{[0, 1, 2].map(index => <span key={index} className="border border-rose-700 bg-rose-500/10 p-2 text-center font-bold">✓</span>)}</div>)}</div>
    <p className="mt-3 border-l-2 border-rose-700 pl-3 text-sm text-ds-fg">Jede <strong>7 = 4+2+1</strong>: Lesen, Schreiben und Ausführen. Dreimal 7 gibt diese Rechte auch „allen anderen“.</p>
  </div>
}

function PrivilegeEscalation() {
  return <div data-diagram="privilege-escalation" className="mx-auto max-w-md">
    <div className="border-2 border-rose-700 bg-rose-500/10 p-3 text-center"><div className={tag}>Hohes Privileg</div><div className="mt-1 font-mono text-lg font-bold text-ds-fg">root</div></div>
    <div className="py-2 text-center font-mono text-sm font-bold text-rose-700">↑ Rechteausweitung nach Exploit</div>
    <div className="border border-ds-border bg-ds-floor p-3 text-center"><div className={tag}>Einstieg</div><div className="mt-1 text-sm font-semibold text-ds-fg">Webanwendung / niedrige Rechte</div></div>
    <p className="mt-3 text-xs text-ds-muted">Die Web-Schwachstelle ermöglicht den Einstieg; der Sprung nach oben ist die vertikale Privilege Escalation.</p>
  </div>
}

function DataSubject() {
  return <div data-diagram="data-subject" className="mx-auto max-w-3xl">
    <div className="grid gap-2 md:grid-cols-[1fr_auto_1.2fr] md:items-center"><div className="border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3"><div className={tag}>Betroffene Person · Data Subject</div><div className="mt-2 text-sm font-semibold text-ds-fg">Name · Adresse · weitere personenbezogene Daten</div></div><Arrow caption="Datenbezug" /><Box title="Controller">verarbeitet oder lässt im Auftrag verarbeiten</Box></div>
    <div className="mt-3 border-l-2 border-[--brand-primary] bg-ds-floor p-3 text-sm text-ds-fg"><strong>Artikel 17:</strong> Die betroffene Person kann Löschung beantragen → Controller prüft Voraussetzungen und mögliche Ausnahmen → löscht, wenn der Anspruch besteht.</div>
    <p className="mt-1 text-xs text-ds-muted">Die Person wird nicht dadurch zum Controller oder Processor, dass ihre Daten verarbeitet werden.</p>
  </div>
}

function Sla() {
  return <div data-diagram="sla" className="mx-auto max-w-3xl">
    <div className="border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3"><div className={tag}>Service Level Agreement · Vertrag</div><div className="mt-2 grid gap-2 sm:grid-cols-2"><div className="border border-ds-border bg-ds-floor p-2 text-sm text-ds-fg"><strong>Messbares Ziel:</strong> z. B. 99,9 % Verfügbarkeit</div><div className="border border-ds-border bg-ds-floor p-2 text-sm text-ds-fg"><strong>Bei Verfehlung:</strong> vereinbarte Abhilfe / Sanktion</div></div></div>
    <p className="mt-3 border-l-2 border-[--brand-primary] pl-3 text-sm text-ds-fg">Ziel und Folge stehen in derselben Vereinbarung zwischen Kunde und Anbieter. Ein interner Team-KPI allein ist keine Anbieterpflicht.</p>
  </div>
}

function Bia() {
  return <div data-diagram="bia" className="mx-auto max-w-4xl">
    <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_1.2fr] md:items-center"><Box title="Kritische Funktion">Bestellungen abwickeln</Box><Arrow caption="braucht" /><Box title="Abhängiges System">Auftragsdatenbank</Box><Arrow caption="bei Ausfall" /><div className="border-2 border-rose-700 bg-rose-500/5 p-3"><div className={tag}>Business Impact Analysis</div><div className="mt-2 text-sm font-semibold text-ds-fg">Folgen + Wiederherstellungsziele beurteilen</div></div></div>
    <p className="mt-3 text-xs text-ds-muted">Schematisches Beispiel: Die BIA beginnt bei der Geschäftsaufgabe und verfolgt, welche Systeme sie benötigt und was deren Ausfall bewirkt.</p>
  </div>
}

function ContinuousRisk() {
  return <div data-diagram="continuous-risk" className="mx-auto max-w-3xl">
    <div className="grid grid-cols-3 gap-2">{['Änderung 1', 'Änderung 2', 'Änderung 3'].map(change => <div key={change} className="border border-ds-border bg-ds-floor p-2 text-center text-xs text-ds-fg"><div className="font-mono font-bold">{change}</div><div className="my-2 border-t border-ds-border" /><div>Risikoprüfung<br />vor Release</div></div>)}</div>
    <div className="mt-2 flex justify-between font-mono text-[10px] text-ds-muted"><span>Pipeline läuft weiter →</span><span>nächste Änderung, neue Prüfung</span></div>
    <p className="mt-3 border-l-2 border-[--brand-primary] pl-3 text-sm text-ds-fg">Kein einmaliges Prüfdatum: Jede relevante Änderung bekommt erneut eine Bewertung im laufenden CI/CD-Prozess.</p>
  </div>
}

function BcDocuments() {
  return <div data-diagram="bc-documents" className="mx-auto max-w-3xl">
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center"><Box title="BC-Policy · Wozu?">Kritische Dienste sollen weiterlaufen</Box><Arrow caption="konkretisiert" /><Box title="BC-Plan · Wie reagieren?">Prioritäten, Rollen, Ersatzverfahren</Box><Arrow caption="verweist auf" /><Box title="Runbook · Einzelschritte">Datenbank-Restore ausführen</Box></div>
    <p className="mt-3 border-l-2 border-[--brand-primary] pl-3 text-sm text-ds-fg">Der Plan liegt zwischen Absicht und detaillierter Handlungsanweisung: Er beschreibt die Reaktion, ohne selbst jeden technischen Schritt zu enthalten.</p>
  </div>
}

function GapAnalysis() {
  return <div data-diagram="gap-analysis" className="mx-auto max-w-3xl">
    <div className="grid grid-cols-[1fr_1fr] gap-2 text-center text-xs font-bold text-ds-fg"><span>Soll · Zielprofil</span><span>Ist · aktuelle Kontrollen</span></div>
    <div className="mt-2 grid grid-cols-[1fr_1fr] gap-2"><Box title="Kontrollziel">Administratoren nutzen MFA</Box><Box title="Vorhanden" accent="border-rose-700">Nur Passwortanmeldung</Box></div>
    <div className="mt-2 border-2 border-rose-700 bg-rose-500/10 p-3 text-sm font-bold text-ds-fg">Lücke: MFA für Administratorkonten fehlt → Maßnahme planen</div>
    <p className="mt-2 text-xs text-ds-muted">Beispiel eines Soll-Ist-Vergleichs; eine Bestandsliste ohne Zielprofil zeigt die Lücke noch nicht.</p>
  </div>
}

function Dependencies() {
  return <div data-diagram="dependencies" className="mx-auto max-w-3xl">
    <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">{['Identität ✓', 'Netz ✓', 'Zeit ✓', 'Datenbank ✕'].map(item => <div key={item} className={`border-2 p-3 font-bold text-ds-fg ${item.includes('✕') ? 'border-rose-700 bg-rose-500/10' : 'border-emerald-700 bg-emerald-500/10'}`}>{item}</div>)}</div>
    <div className="py-2 text-center font-mono text-sm text-[--brand-primary]">↓ erforderliche Dienste</div>
    <div className="border-2 border-rose-700 bg-rose-500/10 p-3 text-center text-sm font-bold text-ds-fg">Anwendung installiert · Start dennoch blockiert</div>
    <p className="mt-2 text-xs text-ds-muted">Schematisches Beispiel: Die fehlende Datenbank ist eine Betriebsabhängigkeit, kein Fehler des Anwendungspakets.</p>
  </div>
}

function ChangeImpact() {
  return <div data-diagram="change-impact" className="mx-auto max-w-3xl">
    <div className="grid grid-cols-4 text-center font-mono text-xs text-ds-muted"><span>09:00</span><span>09:20</span><span>09:40</span><span>10:00</span></div>
    <div className="mt-1 grid grid-cols-4 border border-ds-border text-center text-xs font-bold text-ds-fg"><div className="bg-emerald-500/10 p-3">online</div><div className="col-span-2 bg-rose-500/15 p-3">Change · Dienst nicht erreichbar</div><div className="bg-emerald-500/10 p-3">online</div></div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2"><Box title="Technische Schätzung">40 Minuten Ausfall</Box><Box title="Geschäftliche Wirkung" accent="border-rose-700">Nutzer können in dieser Zeit keine Aufträge bearbeiten</Box></div>
    <p className="mt-2 text-xs text-ds-muted">Illustrative Zeitachse: Impact-Analyse bewertet betroffene Zeit und Funktionen vor Freigabe des Changes.</p>
  </div>
}

function SignedUpdate() {
  return <div data-diagram="signed-update" className="mx-auto max-w-3xl">
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><Box title="Herausgeber · geheim">Update + privater Signaturschlüssel → Signatur</Box><Arrow caption="liefert" /><Box title="Client · öffentlich">Update + Signatur mit öffentlichem Schlüssel prüfen</Box></div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="border-2 border-emerald-700 bg-emerald-500/10 p-3 text-sm font-bold text-ds-fg">Gültige Signatur → Update akzeptieren</div><div className="border-2 border-rose-700 bg-rose-500/10 p-3 text-sm font-bold text-ds-fg">Nur öffentlicher Schlüssel → keine gültige neue Signatur erzeugen</div></div>
    <p className="mt-2 text-xs text-ds-muted">Signaturprüfung beweist nicht, dass ein vom Herausgeber selbst signiertes Update fehlerfrei ist.</p>
  </div>
}

function DnsReflection() {
  return <div data-diagram="dns-reflection" className="mx-auto max-w-3xl">
    <div className="border-2 border-rose-700 bg-rose-500/10 p-3 text-center text-sm font-bold text-ds-fg">Angreifer sendet kleine DNS-Anfragen · gefälschte Quell-IP = Opfer</div>
    <div className="mt-2 grid grid-cols-3 gap-2">{['Resolver A', 'Resolver B', 'Resolver C'].map(name => <div key={name} className="border border-ds-border bg-ds-floor p-3 text-center text-xs font-bold text-ds-fg">{name}<div className="mt-1 font-normal text-ds-muted">große Antwort ↓</div></div>)}</div>
    <div className="mt-2 border-2 border-rose-700 bg-rose-500/15 p-3 text-center text-sm font-bold text-ds-fg">Opfer erhält gebündelte DNS-Antworten → Überlastung</div>
    <p className="mt-2 text-xs text-ds-muted">Reflexion = Antwort an die gefälschte Adresse; Verstärkung = Antwort größer als Anfrage.</p>
  </div>
}

function VirusSpread() {
  return <div data-diagram="virus-spread" className="mx-auto max-w-3xl">
    <div className="mx-auto w-fit border-2 border-rose-700 bg-rose-500/10 p-3 text-center text-sm font-bold text-ds-fg">Gemeinsamer Speicher · infizierte Datei</div>
    <div className="py-2 text-center font-mono text-xs text-rose-700">Kopien / Weitergabe ↓</div>
    <div className="grid grid-cols-3 gap-2">{['Rechner A', 'Rechner B', 'Rechner C'].map(name => <div key={name} className="border border-rose-700 bg-rose-500/5 p-3 text-center text-xs font-bold text-ds-fg">{name}<div className="mt-1 font-normal">Datei übernommen</div></div>)}</div>
    <p className="mt-2 text-xs text-ds-muted">Der Virus hängt an einem Wirt wie einer Datei; die Grafik zeigt die Weiterverbreitung, nicht einen autonomen Wurm.</p>
  </div>
}

function ConcurrentSessions() {
  return <div data-diagram="concurrent-sessions" className="mx-auto max-w-3xl">
    <div className="grid gap-2 sm:grid-cols-2"><Box title="Konto Alex · Sitzung 1">10:00 · Berlin · aktiv</Box><Box title="Konto Alex · Sitzung 2" accent="border-rose-700">10:00 · New York · aktiv</Box></div>
    <div className="mt-3 border-2 border-rose-700 bg-rose-500/10 p-3 text-sm font-bold text-ds-fg">Gleiche Identität + gleiche Zeit + ferne Orte → auffällige Parallelität</div>
    <p className="mt-2 text-xs text-ds-muted">Anomaliesignal, kein Beweis: VPN, Proxies und Geolokalisierungsfehler prüfen.</p>
  </div>
}

function ExposureFactor() {
  return <div data-diagram="exposure-factor" className="mx-auto max-w-3xl">
    <div className="flex h-12 border border-ds-border text-center text-xs font-bold text-ds-fg"><div className="flex w-[30%] items-center justify-center bg-rose-500/20">30 % Verlust</div><div className="flex w-[70%] items-center justify-center bg-emerald-500/10">70 % verbleiben</div></div>
    <div className="mt-3 grid gap-2 sm:grid-cols-3"><Box title="Wert">100.000 €</Box><Box title="Exposure Factor">30 %</Box><Box title="Single Loss Expectancy">30.000 €</Box></div>
    <p className="mt-2 text-xs text-ds-muted">Beispiel: SLE = Wert × EF. Der EF ist der Anteil, nicht die Eintrittshäufigkeit oder der jährliche Verlust.</p>
  </div>
}

function RiskThreshold() {
  return <div data-diagram="risk-threshold" className="mx-auto max-w-3xl">
    <div className="grid grid-cols-[3fr_2fr] border border-ds-border text-center text-xs font-bold text-ds-fg"><div className="bg-emerald-500/10 p-3">Risiko im akzeptierten Bereich</div><div className="bg-rose-500/10 p-3">Behandlung erforderlich</div></div>
    <div className="grid grid-cols-[3fr_2fr] font-mono text-xs text-ds-muted"><span>niedrig → festgelegte Schwelle</span><span className="border-l-2 border-rose-700 pl-2">→ höher</span></div>
    <p className="mt-3 border-l-2 border-[--brand-primary] pl-3 text-sm text-ds-fg">Die Organisation legt die Schwelle fest; ein Risiko oberhalb löst eine Reaktion aus, nicht automatisch eine bestimmte Maßnahme.</p>
    <p className="mt-1 text-xs text-ds-muted">Die Breite der Bereiche ist nur illustrativ, keine allgemeingültige Skala.</p>
  </div>
}

function RiskAppetite() {
  return <div data-diagram="risk-appetite" className="mx-auto max-w-3xl space-y-2">
    <div><div className={tag}>Konservativ · enger Bereich</div><div className="mt-1 flex h-8 border border-ds-border"><span className="w-1/4 bg-emerald-500/15" /><span className="w-3/4 bg-rose-500/10" /></div></div>
    <div><div className={tag}>Expansionary · breiterer Bereich</div><div className="mt-1 flex h-8 border border-ds-border"><span className="w-3/4 bg-emerald-500/15" /><span className="w-1/4 bg-rose-500/10" /></div></div>
    <div className="flex gap-4 text-xs text-ds-fg"><span>🟩 akzeptierter Risikobereich</span><span>🟥 außerhalb der Bereitschaft</span></div>
    <p className="text-xs text-ds-muted">Schematischer Vergleich, keine festen Grenzwerte: Risikobereitschaft hängt von Zielen und Kontext der Organisation ab.</p>
  </div>
}

function EdrRansomware() {
  return <div data-diagram="edr-ransomware" className="mx-auto max-w-4xl">
    <div className="grid gap-2 sm:grid-cols-3"><Box title="1 · Laufender Angriff" accent="border-rose-700">Infektion beginnt<div className="mt-2 text-xs font-normal">EDR: erkennen, untersuchen, eindämmen</div></Box><Box title="2 · Nach dem Schaden">Backup: Daten wiederherstellen</Box><Box title="3 · Finanzielle Folgen">Versicherung: gedeckte Kosten abfedern</Box></div>
    <p className="mt-3 border-l-2 border-[--brand-primary] pl-3 text-sm text-ds-fg">EDR greift an Endpunkten während der Angriffskette ein; Backup und Versicherung ersetzen diese frühe Erkennung nicht.</p>
  </div>
}

function KeyStretch() {
  return <div data-diagram="key-stretch" className="mx-auto max-w-3xl">
    <div className="grid gap-2 sm:grid-cols-2"><Box title="Ohne Kostenfaktor">ein Passwortversuch → eine schnelle Berechnung</Box><Box title="Mit Key Stretching" accent="border-[--brand-primary]">ein Passwortversuch → viele aufwendige Rechenschritte</Box></div>
    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><div className="border-l-2 border-rose-700 pl-3 text-ds-fg">Angreifer: jede Offline-Vermutung kostet mehr Rechenzeit.</div><div className="border-l-2 border-emerald-700 pl-3 text-ds-fg">Verifier: ein Login muss dieselbe Berechnung einmal ausführen.</div></div>
    <p className="mt-2 text-xs text-ds-muted">Schematisch, keine festen Geschwindigkeiten: Der Kostenfaktor erhöht den Aufwand pro Versuch, nicht die Zahl möglicher Passwörter.</p>
  </div>
}

function PasswordStorage() {
  return <div data-diagram="password-storage" className="mx-auto max-w-4xl">
    <div className="grid gap-2 sm:grid-cols-2"><div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>Passwort-Verifier · bevorzugt</div><div className="mt-2 font-mono text-xs text-ds-fg">Passwort + Salt → teurer Hash → gespeicherter Verifier</div><div className="mt-2 text-xs text-ds-muted">Optional: getrennt gespeicherter geheimer Zusatzwert (Pepper).</div><div className="mt-2 text-sm font-semibold text-ds-fg">Prüfen durch erneutes Hashen; keine Entschlüsselung.</div></div><div className="border-2 border-rose-700 bg-rose-500/5 p-3"><div className={tag}>Symmetrisch verschlüsselte Kopie</div><div className="mt-2 font-mono text-xs text-ds-fg">Passwort → Verschlüsselung → Chiffrat + Schlüssel</div><div className="mt-2 text-sm font-semibold text-ds-fg">Wer den Schlüssel erlangt, kann Passwörter wiederherstellen.</div></div></div>
    <p className="mt-2 text-xs text-ds-muted">Salt ist nicht geheim; der optionale Pepper muss vom gespeicherten Verifier getrennt bleiben.</p>
  </div>
}

function SamShadow() {
  return <div data-diagram="sam-shadow" className="grid gap-3 sm:grid-cols-2">
    <div className="min-w-0 border border-ds-border bg-ds-floor p-3">
      <div className={tag}>Windows · lokales Konto</div>
      <div className="mt-3 border border-ds-border px-3 py-2 text-sm text-ds-muted">Registry = Oberbegriff für mehrere Hives</div>
      <div className="mt-2 border-2 border-emerald-700 bg-emerald-500/10 px-3 py-2">
        <div className="font-mono text-sm font-bold text-ds-fg">✓ SAM-Hive</div>
        <div className="mt-1 text-xs text-ds-fg">Konkrete lokale Kontodatenbank mit Passwort-Hashes</div>
      </div>
      <p className="mt-2 text-xs text-ds-muted">SAM gehört zur Registry. „Registry“ allein benennt das gesuchte Ziel nicht präzise.</p>
    </div>
    <div className="min-w-0 border border-ds-border bg-ds-floor p-3">
      <div className={tag}>Linux · lokales Konto</div>
      <div className="mt-3 border border-ds-border px-3 py-2 text-sm text-ds-muted"><span className="font-mono">/etc/passwd</span> = Kontodaten; Passwortfeld meist „x“</div>
      <div className="mt-2 border-2 border-emerald-700 bg-emerald-500/10 px-3 py-2">
        <div className="font-mono text-sm font-bold text-ds-fg">✓ /etc/shadow</div>
        <div className="mt-1 text-xs text-ds-fg">Passwort-Hash und Angaben zur Passwortgültigkeit</div>
      </div>
      <p className="mt-2 text-xs text-ds-muted">Bei Shadow-Passwörtern liegt der Hash nicht im allgemein lesbaren <span className="font-mono">/etc/passwd</span>.</p>
    </div>
    <div className="border-l-2 border-[--brand-primary] pl-3 text-sm font-semibold text-ds-fg sm:col-span-2">Für den Offline-Angriff auf lokale Passwort-Hashes: <span className="font-mono">SAM + /etc/shadow</span>.</div>
  </div>
}

function CertRevocation() {
  return <div data-diagram="cert-revocation" className="mx-auto max-w-3xl">
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><Box title="Vorfall">Privater Schlüssel zu Zertifikat #42 kompromittiert</Box><Arrow caption="CA sperrt" /><div className="border-2 border-rose-700 bg-rose-500/10 p-3"><div className={tag}>Certificate Revocation List</div><div className="mt-2 font-mono text-sm font-bold text-ds-fg">Seriennummer #42 · revoked</div></div></div>
    <div className="mt-3 border-l-2 border-rose-700 pl-3 text-sm text-ds-fg">Prüfender Client findet #42 in der aktuellen CRL → Zertifikat nicht mehr vertrauen.</div>
    <p className="mt-2 text-xs text-ds-muted">Danach neues Schlüsselpaar und Ersatzzertifikat ausstellen. Nur den Hostnamen zu ändern beseitigt den kompromittierten Schlüssel nicht.</p>
  </div>
}

function Ocsp() {
  return <div data-diagram="ocsp" className="mx-auto max-w-3xl">
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><Box title="Client fragt">OCSP-Anfrage: Status der Zertifikatsseriennummer #42?</Box><Arrow caption="an" /><Box title="OCSP-Responder">antwortet zu genau diesem Zertifikat</Box></div>
    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold text-ds-fg"><span className="border border-emerald-700 bg-emerald-500/10 p-2">good</span><span className="border border-rose-700 bg-rose-500/10 p-2">revoked</span><span className="border border-ds-border bg-ds-floor p-2">unknown</span></div>
    <p className="mt-2 text-xs text-ds-muted">OCSP liefert einen Online-Status. Er bedeutet nicht, dass der Client direkt eine CRL herunterlädt; „good“ beweist nicht jede andere Eigenschaft des Zertifikats.</p>
  </div>
}

function RootTrust() {
  return <div data-diagram="root-trust" className="mx-auto max-w-4xl">
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center"><Box title="Vertrauensanker" accent="border-emerald-700">Root of Trust</Box><Arrow caption="prüft" /><Box title="Nächste Stufe">signierter Bootloader</Box><Arrow caption="prüft" /><Box title="Weitere Stufe">signierter OS-Code</Box></div>
    <div className="mt-3 border-2 border-rose-700 bg-rose-500/5 p-3 text-sm font-semibold text-ds-fg">Signatur einer Stufe ungültig? → Vertrauenskette bricht an dieser Stelle ab.</div>
    <p className="mt-2 text-xs text-ds-muted">Schematische Kette: Der Vertrauensanker wird nicht erst durch eine spätere Bootstufe legitimiert.</p>
  </div>
}

function Honeypot() {
  return <div data-diagram="honeypot" className="mx-auto max-w-3xl">
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><Box title="Angreifer">sucht scheinbar verwundbaren Dienst</Box><Arrow caption="interagiert" /><div className="border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3"><div className={tag}>Honeypot · Köder</div><div className="mt-2 text-sm font-bold text-ds-fg">Attrappe ohne Produktivdaten</div><div className="mt-1 text-xs text-ds-muted">Angriffsversuche werden protokolliert.</div></div></div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="border-l-2 border-emerald-700 pl-3 text-sm text-ds-fg">Analyse: verwendete Befehle, Werkzeuge, Verhaltensmuster</div><div className="border-l-2 border-rose-700 pl-3 text-sm text-ds-fg">Produktivdienst: nicht der Köder</div></div>
  </div>
}

function NtlmRelay() {
  return <div data-diagram="ntlm-relay" className="mx-auto max-w-4xl">
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center"><Box title="Opfer">antwortet auf NTLM-Challenge</Box><Arrow caption="Antwort" /><div className="border-2 border-rose-700 bg-rose-500/10 p-3"><div className={tag}>Angreifer</div><div className="mt-2 text-sm font-bold text-ds-fg">leitet Authentisierung weiter</div></div><Arrow caption="Relay" /><Box title="Zieldienst">sieht scheinbar das Opfer</Box></div>
    <p className="mt-3 border-l-2 border-[--brand-primary] pl-3 text-sm text-ds-fg">Der Angreifer benötigt nicht das Klartextpasswort. Dienst- oder Kanalbindung und Signierung können diese Weitergabe verhindern.</p>
    <p className="mt-1 text-xs text-ds-muted">Schematischer Angriff unter verwundbaren Konfigurationen; NTLM-Nutzung allein garantiert keinen erfolgreichen Relay.</p>
  </div>
}

function IdentityProofing() {
  return <div data-diagram="identity-proofing" className="mx-auto max-w-4xl">
    <div className="grid gap-2 sm:grid-cols-3"><Box title="1 · Evidenz">Amtlich ausgestellter Ausweis</Box><Box title="2 · Validierung">Ist das Dokument echt und gültig?</Box><Box title="3 · Verifikation">Gehört es zur antragstellenden Person?</Box></div>
    <div className="mt-3 border-l-2 border-rose-700 pl-3 text-sm text-ds-fg">Selbst angelegte E-Mail-Adresse → zeigt Kontozugang, aber keine verifizierte reale Identität.</div>
    <p className="mt-2 text-xs text-ds-muted">Ein Ausweis ist geeignete Evidenz, aber die bloße Vorlage ersetzt Validierung und Personenabgleich nicht.</p>
  </div>
}

function KnownEnvironment() {
  return <div data-diagram="known-environment" className="mx-auto max-w-4xl">
    <div className="grid gap-2 sm:grid-cols-3"><div className="border border-ds-border bg-ds-floor p-3"><div className={tag}>Unknown</div><div className="mt-2 text-sm text-ds-fg">Keine internen Unterlagen → Umgebung erst erkunden</div></div><div className="border border-ds-border bg-ds-floor p-3"><div className={tag}>Partially known</div><div className="mt-2 text-sm text-ds-fg">Einige Unterlagen → Lücken selbst schließen</div></div><div className="border-2 border-emerald-700 bg-emerald-500/10 p-3"><div className={tag}>Known environment</div><div className="mt-2 text-sm font-bold text-ds-fg">Architektur + Dienste + Konfigurationen bekannt → gezielt testen</div></div></div>
    <p className="mt-3 border-l-2 border-[--brand-primary] pl-3 text-sm text-ds-fg">Mehr Vorwissen reduziert reine Entdeckungsarbeit. „Drittpartei“ beschreibt dagegen, <em>wer</em> testet, nicht wie viel bekannt ist.</p>
  </div>
}

function Soc2Assurance() {
  return <div data-diagram="soc2-assurance" className="mx-auto max-w-3xl">
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><Box title="Dienstleister">stellt Systembeschreibung und Nachweise bereit</Box><Arrow caption="prüft" /><div className="border-2 border-emerald-700 bg-emerald-500/10 p-3"><div className={tag}>Unabhängiger Service Auditor</div><div className="mt-2 text-sm font-bold text-ds-fg">prüft Kontrollen über einen Zeitraum · Type 2</div></div></div>
    <div className="mt-3 border border-ds-border bg-ds-floor p-3 text-sm text-ds-fg">Ergebnis: SOC-2-Type-2-Bericht mit Prüferurteil und Testergebnissen.</div>
    <p className="mt-2 text-xs text-ds-muted">Eine Selbstauskunft oder ein einzelner Penetrationstest ist kein SOC-2-Type-2-Bericht.</p>
  </div>
}

function Typosquatting() {
  return <div data-diagram="typosquatting" className="mx-auto max-w-3xl">
    <div className="grid gap-2 sm:grid-cols-2"><div className="border-2 border-emerald-700 bg-emerald-500/10 p-3"><div className={tag}>Echte Adresse</div><div className="mt-2 font-mono text-sm font-bold text-ds-fg">auktion.example</div><div className="mt-2 text-xs text-ds-fg">Besuch erscheint im echten Webserver-Log.</div></div><div className="border-2 border-rose-700 bg-rose-500/10 p-3"><div className={tag}>Vertippte Adresse</div><div className="mt-2 font-mono text-sm font-bold text-ds-fg">aukton.example</div><div className="mt-2 text-xs text-ds-fg">Ähnliche, fremde Domain → echter Server sieht keinen Besuch.</div></div></div>
    <p className="mt-2 text-xs text-ds-muted">Fiktive Domains. Die fehlenden Einträge im echten Server-Log passen zum Besuch einer anderen Website.</p>
  </div>
}

function OutOfCycle() {
  return <div data-diagram="out-of-cycle" className="mx-auto max-w-3xl">
    <div className="grid grid-cols-4 gap-2 text-center text-xs text-ds-fg">{['10:00 ✓', '10:15 !', '10:30 !', '11:00 ✓'].map((time, index) => <div key={time} className={`border-2 p-3 font-mono font-bold ${index === 1 || index === 2 ? 'border-rose-700 bg-rose-500/10' : 'border-emerald-700 bg-emerald-500/10'}`}>{time}</div>)}</div>
    <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2"><div className="border-l-2 border-emerald-700 pl-3 text-ds-fg">Soll: Skript startet stündlich.</div><div className="border-l-2 border-rose-700 pl-3 text-ds-fg">Ist: zusätzliche Ausführungen innerhalb einer Stunde.</div></div>
    <p className="mt-2 text-xs text-ds-muted">Zeitplanabweichung prüfen: Fehlkonfiguration oder Missbrauch sind möglich. Es fehlen keine Logs; es gibt zu viele Ereignisse.</p>
  </div>
}

function AgentlessSurface() {
  return <div data-diagram="agentless-surface" className="mx-auto max-w-4xl">
    <div className="grid gap-2 sm:grid-cols-2"><div className="border-2 border-rose-700 bg-rose-500/5 p-3"><div className={tag}>Agentbasiert</div><div className="mt-2 border border-rose-700 p-2 text-center text-sm font-semibold text-ds-fg">Endpunkt: installierter Agent ← eigener Angriffspfad</div><div className="mt-2 text-xs text-ds-muted">Agent muss aktualisiert und abgesichert werden.</div></div><div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>Agentless</div><div className="mt-2 border border-emerald-700 p-2 text-center text-sm font-semibold text-ds-fg">Endpunkt: kein lokaler Agent</div><div className="mt-2 text-xs text-ds-muted">Kontrollsystem und Zugriffsweg bleiben vorhanden.</div></div></div>
    <p className="mt-3 border-l-2 border-[--brand-primary] pl-3 text-sm text-ds-fg">Nur die lokale Agent-Komponente entfällt. Agentless bedeutet weder „ressourcenfrei“ noch „unangreifbar“.</p>
  </div>
}

function FullDisk() {
  return <div data-diagram="full-disk" className="mx-auto max-w-3xl">
    <div className="grid gap-2 sm:grid-cols-2"><div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>Full-Disk Encryption</div><div className="mt-2 grid grid-cols-3 gap-1 text-center text-xs font-semibold text-ds-fg">{['System 🔒', 'Daten 🔒', 'Weitere Bereiche 🔒'].map(part => <span key={part} className="border border-emerald-700 p-2">{part}</span>)}</div></div><div className="border-2 border-rose-700 bg-rose-500/5 p-3"><div className={tag}>Selektive Verschlüsselung</div><div className="mt-2 grid grid-cols-3 gap-1 text-center text-xs font-semibold text-ds-fg"><span className="border border-rose-700 p-2">System offen</span><span className="border border-emerald-700 p-2">Datei 🔒</span><span className="border border-rose-700 p-2">Rest offen</span></div></div></div>
    <p className="mt-3 border-l-2 border-[--brand-primary] pl-3 text-sm text-ds-fg">Gerät gestohlen und ausgeschaltet → ohne Entsperrschlüssel bleibt der ganze verschlüsselte Datenträger geschützt.</p>
    <p className="mt-1 text-xs text-ds-muted">Schematisch: Startbereiche können ausgenommen sein. Im laufenden oder nur gesperrten Zustand hängt der Schutz zusätzlich von Schlüsselverwaltung und Systemkonfiguration ab.</p>
  </div>
}

function Bollards() {
  return <div data-diagram="bollards" className="mx-auto max-w-xl">
    <div className="border border-ds-border bg-ds-floor p-3 text-center text-sm font-semibold text-ds-fg">Parkplatz · Fahrzeug ↓</div>
    <div className="py-2 text-center font-mono text-sm font-bold text-rose-700">↓ Fahrweg</div>
    <div className="flex justify-center gap-3 border-y-2 border-rose-700 bg-rose-500/10 py-3" aria-label="Reihe massiver Poller als Aufprallgrenze">{[1, 2, 3, 4].map(post => <span key={post} className="h-7 w-5 rounded-t-md border-2 border-rose-700 bg-ds-panel" />)}</div>
    <div className="py-2 text-center font-mono text-sm font-bold text-rose-700">✕ Aufprallweg blockiert</div>
    <div className="border-2 border-emerald-700 bg-emerald-500/10 p-3 text-center text-sm font-bold text-ds-fg">Backup-Generator · geschützt</div>
    <p className="mt-2 text-xs text-ds-muted">Nur geeignet dimensionierte und verankerte Poller halten einen Fahrzeugaufprall ab; ein Tempohügel reduziert höchstens die Geschwindigkeit.</p>
  </div>
}

function RiskBudget() {
  return <div data-diagram="risk-budget" className="mx-auto max-w-3xl">
    <div className="border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3"><div className={tag}>Organisationsweite Risikobereitschaft</div><div className="mt-2 text-2xl font-bold text-ds-fg">bis zu 10 Mio. $ / Jahr</div><div className="mt-1 text-xs text-ds-muted">Beispielwert aus der Frage · zur Unterstützung strategischer Ziele</div></div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2"><Box title="Risk Appetite">Wie viel Gesamtrisiko will die Organisation tragen?</Box><Box title="Einzelrisiko akzeptieren">Soll genau dieses Risiko ohne weitere Behandlung verbleiben?</Box></div>
    <p className="mt-2 text-xs text-ds-muted">Der Zahlenwert allein sagt nicht, ob die Haltung konservativ oder expansiv ist; dazu braucht es Organisationskontext.</p>
  </div>
}

function ChainCustody() {
  return <div data-diagram="chain-custody" className="mx-auto max-w-4xl">
    <div className="grid gap-2 sm:grid-cols-3"><Box title="08:10 · Sicherstellung">Beweisstück E-17<div className="mt-1 text-xs font-normal">Sammler:in signiert · Hash H1</div></Box><Box title="09:05 · Übergabe">E-17 → Analyst:in<div className="mt-1 text-xs font-normal">Beide Personen, Zeitpunkt und Zweck im Protokoll</div></Box><Box title="11:20 · Verwahrung">E-17 → gesicherter Schrank<div className="mt-1 text-xs font-normal">Zugriff und Siegel dokumentiert</div></Box></div>
    <p className="mt-3 border-l-2 border-[--brand-primary] pl-3 text-sm text-ds-fg">Die durchgehende <strong>Besitz- und Übergabekette</strong> macht nachvollziehbar, wer wann mit E-17 umging. Ein bloßes Inventar zeigt das nicht.</p>
  </div>
}

function Tabletop() {
  return <div data-diagram="tabletop" className="mx-auto max-w-4xl grid gap-2 sm:grid-cols-2">
    <div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>Tabletop · Szenario auf Papier</div><div className="mt-2 text-sm font-bold">„Ransomware trifft den Dateiserver“</div><div className="mt-2 grid grid-cols-2 gap-2 text-xs"><span className="border border-ds-border p-2">IT: Wer isoliert?</span><span className="border border-ds-border p-2">Leitung: Wer informiert?</span></div><p className="mt-2 text-xs">Diskussion → Entscheidungen und Lücken notieren.</p></div>
    <div className="border-2 border-dashed border-rose-700/60 p-3"><div className={tag}>Nicht Teil dieser Übung</div><div className="mt-3 text-sm font-semibold">✕ Produktivsystem abschalten<br />✕ Tatsächlichen Failover auslösen</div><p className="mt-2 text-xs text-ds-muted">Ein Live-Test würde Systeme und Betriebsabläufe tatsächlich verändern.</p></div>
  </div>
}

function Containment() {
  return <div data-diagram="containment" className="mx-auto max-w-4xl">
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr]"><div className="border-2 border-rose-700 bg-rose-500/10 p-3"><div className={tag}>Betroffener Endpunkt</div><strong>Malware erkannt · noch vorhanden</strong></div><div className="flex items-center justify-center border-2 border-dashed border-rose-700 px-3 text-center text-xs font-bold text-rose-700">✕ Netzwerkverbindung<br />getrennt</div><Box title="Übriges Netz" accent="border-emerald-700">Ausbreitung begrenzt</Box></div>
    <div className="mt-3 grid grid-cols-3 gap-1 text-center text-xs"><span className="border border-ds-border p-2">Erkennen ✓</span><span className="border-2 border-rose-700 bg-rose-500/10 p-2 font-bold">Eindämmen: isolieren</span><span className="border border-ds-border p-2">Beseitigen: folgt</span></div>
  </div>
}

function Dmarc() {
  return <div data-diagram="dmarc" className="mx-auto max-w-4xl">
    <div className="grid gap-2 sm:grid-cols-2"><Box title="Mail behauptet">From: bank.example<div className="mt-1 text-xs font-normal">SPF/DKIM liefern keine bestandene, zur From-Domain ausgerichtete Prüfung.</div></Box><Box title="Policy der From-Domain" accent="border-rose-700"><code>p=reject</code><div className="mt-1 text-xs font-normal">Veröffentlichte Anweisung für DMARC-Fail.</div></Box></div>
    <div className="mt-2 border-2 border-rose-700 bg-rose-500/10 p-3 text-center text-sm font-bold">DMARC-Fail + p=reject → Empfänger wird um Zurückweisung gebeten</div><p className="mt-2 text-xs text-ds-muted">SPF- oder DKIM-Erfolg ohne Alignment genügt nicht. Die letztliche Behandlung liegt beim empfangenden System.</p>
  </div>
}

function AclOrder() {
  return <div data-diagram="acl-order" className="mx-auto max-w-4xl">
    <div className="grid grid-cols-[auto_1fr_1fr] gap-1 text-xs sm:text-sm"><span /> <strong>HTTP · TCP 80</strong><strong>HTTPS · TCP 443</strong>
      <span className="border border-ds-border p-2">1 · deny tcp … eq http</span><span className="border-2 border-rose-700 bg-rose-500/10 p-2 font-bold">Treffer → STOP: blockiert</span><span className="border border-ds-border p-2">kein Treffer ↓</span>
      <span className="border border-ds-border p-2">2 · permit ip any any</span><span className="border border-ds-border p-2 text-ds-muted">nicht mehr geprüft</span><span className="border-2 border-emerald-700 bg-emerald-500/10 p-2 font-bold">Treffer → STOP: erlaubt</span>
      <span className="border border-ds-border p-2">3 · deny tcp … eq https</span><span className="col-span-2 border border-dashed border-ds-border p-2 text-center text-ds-muted">Für beide Pakete unerreichbar</span></div>
    <p className="mt-2 text-xs text-ds-muted">Die ACL wird von oben nach unten geprüft; nach dem ersten passenden Eintrag endet die Prüfung.</p>
  </div>
}

function PartialEnvironment() {
  return <div data-diagram="partial-environment" className="mx-auto max-w-4xl">
    <div className="grid gap-2 sm:grid-cols-3"><Box title="Unknown">Ziele und Aufbau unbekannt</Box><div className="border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3"><div className={tag}>Partially known · hier</div><div className="mt-2 text-sm font-bold">✓ Ziele, OS, Software<br />? Konfigurationen, Details</div></div><Box title="Known">Architektur und Konfigurationen vorab offen</Box></div>
    <p className="mt-3 border-l-2 border-[--brand-primary] pl-3 text-sm text-ds-fg">Das Team startet mit einigen Informationen, muss die fehlenden Details aber selbst ermitteln.</p>
  </div>
}

function PolicyStandard() {
  return <div data-diagram="policy-standard" className="mx-auto max-w-4xl grid gap-2 sm:grid-cols-3"><Box title="Policy · Absicht / Richtung">Änderungen müssen geprüft und genehmigt werden.</Box><Box title="Standard · verbindliche Regel">Beispiel: Freigabe durch benannte Rolle vor Deployment.</Box><Box title="Verfahren · konkrete Schritte">Ticket öffnen → Risiko prüfen → Freigabe dokumentieren.</Box></div>
}

function PolicyException() {
  return <div data-diagram="policy-exception" className="mx-auto max-w-4xl">
    <div className="grid gap-2 sm:grid-cols-3"><Box title="Interne Policy">Normalfall: Regel einhalten</Box><Box title="Abweichung beantragt" accent="border-rose-700">Grund, Risiko und Kompensation dokumentieren</Box><Box title="Befugte Freigabe" accent="border-emerald-700">Change-Control · Ablaufdatum · Nachprüfung</Box></div>
    <div className="mt-2 border border-rose-700 bg-rose-500/5 p-2 text-xs font-bold">Grenze: Eine interne Ausnahme setzt keine gesetzlichen Anforderungen außer Kraft.</div>
  </div>
}

function RiskAcceptance() {
  return <div data-diagram="risk-acceptance" className="mx-auto max-w-4xl">
    <div className="grid gap-2 sm:grid-cols-2"><Box title="Erkanntes Risiko">Handykamera kann vertrauliche Inhalte aufnehmen.</Box><Box title="Vermeidung · nicht gewählt">Telefone vollständig verbieten.</Box></div>
    <div className="mt-2 border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3 text-sm font-bold">Management entscheidet: Telefone bleiben erlaubt → Kamerarisiko bleibt bestehen und wird bewusst getragen.</div>
    <p className="mt-2 text-xs text-ds-muted">Akzeptanz ist eine dokumentierte Risikoentscheidung, keine Beseitigung des Risikos.</p>
  </div>
}

function LoadBalancerVip() {
  return <div data-diagram="load-balancer-vip" className="mx-auto max-w-4xl">
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1.3fr] sm:items-center"><Box title="Internet-Client">Ziel: 203.0.113.10</Box><Arrow /><Box title="Virtuelle IP · VIP" accent="border-[--brand-primary]">203.0.113.10<div className="text-xs font-normal">öffentlicher Einstieg</div></Box><Arrow /><div className="space-y-1"><Box title="Pool-Server A">10.0.0.11</Box><Box title="Pool-Server B">10.0.0.12</Box></div></div>
    <p className="mt-2 text-xs text-ds-muted">Beispieladressen: Der Client wählt nicht selbst die reale Serveradresse; eine eigene Management-IP ist etwas anderes als die VIP.</p>
  </div>
}

function VlanBoundary() {
  return <div data-diagram="vlan-boundary" className="mx-auto max-w-4xl"><div className="border-2 border-ds-border p-3"><div className={tag}>Ein physischer Switch · gemeinsame Hardware</div><div className="mt-2 grid gap-2 sm:grid-cols-2"><Box title="VLAN 10" accent="border-sky-700">Arbeitsplatz A + Server A</Box><Box title="VLAN 20" accent="border-emerald-700">Arbeitsplatz B + Server B</Box></div><div className="mt-2 border-t border-dashed border-rose-700 pt-2 text-center text-xs font-bold">Getrennte logische Broadcast-Domänen · Verkehr dazwischen braucht Routing</div></div><p className="mt-2 text-xs text-ds-muted">Kein Air Gap: Beide VLANs laufen auf derselben physischen Infrastruktur.</p></div>
}

function BackupRpo() {
  return <div data-diagram="backup-rpo" className="mx-auto max-w-4xl"><div className="grid grid-cols-3 gap-1 text-center text-xs font-bold"><span className="border border-ds-border p-3">00:00<br />Backup ✓</span><span className="border border-ds-border p-3">06:00<br />Backup ✓</span><span className="border-2 border-rose-700 bg-rose-500/10 p-3">kurz vor 12:00<br />Ausfall ✕</span></div><div className="mt-2 border-l-2 border-rose-700 pl-3 text-sm font-semibold">Wiederherstellbar bis 06:00 → knapp 6 Stunden Datenverlust</div><p className="mt-2 text-xs text-ds-muted">12- oder 24-Stunden-Abstand würde das 6-Stunden-RPO verfehlen. Schematisch: Laufzeit und erfolgreiche Fertigstellung der Sicherung sind zusätzlich zu berücksichtigen.</p></div>
}

function PowerBridge() {
  return <div data-diagram="power-bridge" className="mx-auto max-w-4xl"><div className="grid grid-cols-3 gap-1 text-center text-xs sm:text-sm"><div className="border border-ds-border p-2">Netzstrom ✕<br />Ausfall beginnt</div><div className="border-2 border-sky-700 bg-sky-500/10 p-2 font-bold">USV sofort<br />kurze Überbrückung</div><div className="border-2 border-emerald-700 bg-emerald-500/10 p-2 font-bold">Generator startet<br />längere Versorgung</div></div><div className="mt-2 flex h-5"><div className="w-1/3 bg-ds-floor" /><div className="w-1/3 bg-sky-500/20" /><div className="w-1/3 bg-emerald-500/20" /></div><p className="mt-2 text-xs text-ds-muted">Die USV kann auch kurze Unterspannung abfangen; ein Generator liefert erst nach dem Anlauf und bei ausreichendem Brennstoff längerfristig Energie.</p></div>
}

function ParallelTest() {
  return <div data-diagram="parallel-test" className="mx-auto max-w-4xl grid gap-2 sm:grid-cols-2"><div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>Paralleltest</div><div className="mt-2 text-sm font-bold">Primärsystem → echte Nutzer ✓</div><div className="mt-2 text-sm font-bold">Ausweichsystem → Testlast ✓</div><p className="mt-2 text-xs">Produktivlast bleibt am Primärstandort.</p></div><div className="border border-ds-border p-3"><div className={tag}>Failover-Test</div><div className="mt-2 text-sm font-bold">Primärsystem → Übergabe</div><div className="mt-2 text-sm font-bold">Ausweichsystem → Produktivlast</div><p className="mt-2 text-xs">Prüft die tatsächliche Umschaltung, mit höherem Betriebsrisiko.</p></div></div>
}

function PhysicalIsolation() {
  return <div data-diagram="physical-isolation" className="mx-auto max-w-4xl grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><Box title="Unternehmensnetz">Internet / Büro-PCs<div className="text-xs font-normal">eigene Switches und Kabel</div></Box><div className="border-2 border-dashed border-rose-700 px-4 py-5 text-center text-sm font-bold text-rose-700">✕ Kein Netzpfad<br />keine Verbindung</div><Box title="ICS / SCADA" accent="border-emerald-700">Steuerungsnetz<div className="text-xs font-normal">physisch getrennte Infrastruktur</div></Box><p className="text-xs text-ds-muted sm:col-span-3">Ein VLAN auf demselben Switch wäre nur eine logische Trennung. Schematisch; Wartungsmedien und lokale Zugänge bleiben gesondert abzusichern.</p></div>
}

function LeastPrivilege() {
  return <div data-diagram="least-privilege" className="mx-auto max-w-4xl"><div className="grid gap-2 sm:grid-cols-[1fr_1.5fr]"><Box title="Rolle · Bericht prüfen">Benötigt: Bericht lesen</Box><div className="grid grid-cols-3 gap-1 text-center text-xs"><span className="border-2 border-emerald-700 bg-emerald-500/10 p-3 font-bold">Lesen ✓</span><span className="border border-rose-700 bg-rose-500/5 p-3">Löschen ✕</span><span className="border border-rose-700 bg-rose-500/5 p-3">Admin ✕</span></div></div><p className="mt-2 text-xs text-ds-muted">Berechtigungen folgen der Aufgabe, nicht dem technisch möglichen Maximum.</p></div>
}

function LegalHold() {
  return <div data-diagram="legal-hold" className="mx-auto max-w-4xl"><div className="grid gap-2 sm:grid-cols-2"><Box title="Normaler Lebenszyklus">Aufbewahrungsfrist endet → löschen</Box><div className="border-2 border-rose-700 bg-rose-500/10 p-3"><div className={tag}>Relevante Daten unter Legal Hold</div><div className="mt-2 text-sm font-bold">Aufbewahrungsfrist endet → Löschung gestoppt</div><div className="mt-2 text-xs">E-Mails und Dokumente im festgelegten Umfang bewahren.</div></div></div><p className="mt-2 text-xs text-ds-muted">Nur Daten im Umfang des Holds; die konkrete Pflicht und Dauer richten sich nach dem Fall und geltendem Recht.</p></div>
}

function MailDlp() {
  return <div data-diagram="mail-dlp" className="mx-auto max-w-4xl"><div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr]"><Box title="Ausgehende E-Mail">„Kundin · SSN: 123-45-6789“</Box><Arrow caption="Inhalt prüfen" /><div className="border-2 border-rose-700 bg-rose-500/10 p-3"><div className={tag}>DLP-Regel · SSN-Muster</div><div className="mt-2 text-sm font-bold">Treffer → Versand warnen oder blockieren</div></div></div><p className="mt-2 text-xs text-ds-muted">Fiktive Beispielnummer. FDE schützt den Datenträger, prüft aber keine ausgehenden Nachrichteninhalte.</p></div>
}

function SecureCookie() {
  return <div data-diagram="secure-cookie" className="mx-auto max-w-4xl"><div className="border border-ds-border bg-ds-floor p-2 font-mono text-xs">Set-Cookie: sid=abc; Secure</div><div className="mt-2 grid gap-2 sm:grid-cols-2"><Box title="https://example.test" accent="border-emerald-700">Cookie wird mitgesendet ✓</Box><Box title="http://example.test" accent="border-rose-700">Cookie wird nicht mitgesendet ✕</Box></div><p className="mt-2 text-xs text-ds-muted">Secure betrifft den Übertragungsweg, nicht Verschlüsselung bei der Speicherung. Browser-Sonderfälle für localhost sind hier nicht dargestellt.</p></div>
}

function SiemCorrelation() {
  return <div data-diagram="siem-correlation" className="mx-auto max-w-4xl"><div className="grid gap-2 sm:grid-cols-2"><Box title="VPN-Log · 09:01">5 Fehlanmeldungen · Konto Alex</Box><Box title="Identitäts-Log · 09:03">Erfolgreiche Anmeldung · Konto Alex</Box></div><div className="mt-2 border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3 text-center text-sm font-bold">SIEM korreliert Konto + Zeitfenster → Alarm mit beiden Ereignissen</div><p className="mt-2 text-xs text-ds-muted">Schematisches Muster: Ein Einzel-Log zeigt nicht denselben Zusammenhang über beide Quellen.</p></div>
}

function ForensicTimeline() {
  return <div data-diagram="forensic-timeline" className="mx-auto max-w-4xl"><div className="grid gap-2 sm:grid-cols-2"><Box title="System A · korrekte Uhr">09:00 · Login</Box><Box title="System B · Uhr +5 min">09:02 angezeigt · Datei kopiert<div className="text-xs font-normal">tatsächlich 08:57</div></Box></div><div className="mt-2 border-2 border-rose-700 bg-rose-500/10 p-3 text-sm font-bold">Ohne Offset: Login → Kopie &nbsp;|&nbsp; Korrigiert: Kopie → Login</div><p className="mt-2 text-xs text-ds-muted">Illustrative Zeitwerte: Die Reihenfolge kippt, wenn Logs verschiedener Systeme ungeprüft kombiniert werden.</p></div>
}

function RoundRobin() {
  return <div data-diagram="round-robin" className="mx-auto max-w-4xl"><div className="grid grid-cols-4 gap-1 text-center text-xs sm:text-sm">{['1 → Server A', '2 → Server B', '3 → Server C', '4 → Server A'].map(step => <div key={step} className="border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3 font-bold">{step}</div>)}</div><p className="mt-2 text-xs text-ds-muted">Neue Verbindungen laufen zyklisch durch die Liste; die aktuelle Serverlast wird in diesem einfachen Modell nicht gemessen.</p></div>
}

function SpanTap() {
  return <div data-diagram="span-tap" className="mx-auto max-w-4xl"><div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>SPAN · Switch spiegelt eine Kopie</div><div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold"><span>Quelle</span><span>→ Switch →</span><span>Ziel · Originalverkehr läuft</span></div><div className="mt-1 border-l-2 border-dashed border-sky-700 pl-3 text-xs">↳ Kopie zum Monitor-Port → Sensor ✕ (ausgefallen)</div></div><div className="mt-2 border border-rose-700 bg-rose-500/5 p-3 text-xs"><strong>Inline-Tap:</strong> Quelle → Tap ✕ → Ziel; ein Fehler im Pfad kann den Verkehr beeinflussen.</div><p className="mt-2 text-xs text-ds-muted">Der Switch ist aktiv; nur der gespiegelte Überwachungspfad ist nicht inline.</p></div>
}

function DataState() {
  return <div data-diagram="data-state" className="mx-auto max-w-4xl grid gap-2 sm:grid-cols-3"><Box title="At rest · gespeichert">Datensatz liegt in der Datenbank.</Box><Box title="In transit · unterwegs">Datensatz wird zum Server übertragen.</Box><Box title="In use · verarbeitet">Server prüft Anmeldedaten im Speicher.</Box><p className="text-xs text-ds-muted sm:col-span-3">Der Zustand hängt vom aktuellen Vorgang ab, nicht davon, ob die Daten grundsätzlich in einer Cloud liegen.</p></div>
}

function VmSnapshot() {
  return <div data-diagram="vm-snapshot" className="mx-auto max-w-4xl"><div className="grid grid-cols-3 gap-1 text-center text-xs sm:text-sm"><div className="border-2 border-emerald-700 bg-emerald-500/10 p-2 font-bold">08:00<br />VM sauber · Snapshot S1</div><div className="border border-rose-700 bg-rose-500/5 p-2">10:00<br />Malware / spätere Änderungen</div><div className="border-2 border-emerald-700 bg-emerald-500/10 p-2 font-bold">Revert zu S1<br />Zustand von 08:00</div></div><div className="mt-2 border-l-2 border-rose-700 pl-3 text-sm font-semibold">Auch legitime Änderungen nach S1 können dabei verloren gehen.</div><p className="mt-2 text-xs text-ds-muted">Ein Snapshot ist kein Ersatz für ein unabhängiges Backup.</p></div>
}

function OffsiteBackup() {
  return <div data-diagram="offsite-backup" className="mx-auto max-w-4xl grid gap-2 sm:grid-cols-2"><Box title="Primärstandort · Störung" accent="border-rose-700">Server und lokale Kopie betroffen</Box><div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>Entfernter Backup-Standort</div><div className="mt-2 text-sm font-bold">Kopie vorhanden ✓</div><div className="mt-2 border-t border-emerald-700 pt-2 text-xs">Rückholen per Download oder Transport → zusätzliche Zeit</div></div><p className="text-xs text-ds-muted sm:col-span-2">Geografische Trennung schützt nur bei passend gewähltem Standort; Abrufzeit gehört zum Wiederherstellungsplan.</p></div>
}

function ReplicaRecovery() {
  return <div data-diagram="replica-recovery" className="mx-auto max-w-4xl grid gap-2 sm:grid-cols-2"><div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>Betriebsbereite Replik</div><div className="mt-2 text-sm font-bold">Primärsystem ✕ → Replik übernimmt</div><div className="mt-2 text-xs">Daten sind bereits auf dem Zielsystem vorhanden.</div></div><div className="border border-ds-border p-3"><div className={tag}>Band-Backup</div><div className="mt-2 text-sm font-bold">Medium holen → Daten einlesen → Dienst starten</div><div className="mt-2 text-xs">Rückspielvorgang vor der Nutzung nötig.</div></div><p className="text-xs text-ds-muted sm:col-span-2">Schematischer Vergleich bei verfügbarer, funktionsfähiger Replik; tatsächliche RTO hängt von Architektur und Tests ab.</p></div>
}

function AirGapCa() {
  return <div data-diagram="air-gap-ca" className="mx-auto max-w-4xl grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><Box title="Online-PKI">Signaturanfrage vorbereiten</Box><div className="border-2 border-dashed border-rose-700 px-3 py-4 text-center text-xs font-bold">✕ Kein Netzpfad<br />USB nur kontrolliert</div><Box title="Offline-Root-CA" accent="border-emerald-700">Zertifikat lokal signieren<div className="text-xs font-normal">keine Netzwerkverbindung</div></Box><p className="text-xs text-ds-muted sm:col-span-3">Der Datenträger überbrückt die Trennung manuell; er muss selbst geprüft und geschützt werden.</p></div>
}

function Dot1xPort() {
  return <div data-diagram="dot1x-port" className="mx-auto max-w-4xl"><div className="grid gap-2 sm:grid-cols-2"><div className="border-2 border-rose-700 bg-rose-500/5 p-3"><div className={tag}>Vor Authentisierung</div><div className="mt-2 text-sm font-bold">EAPOL → unkontrollierter Port ✓</div><div className="mt-1 text-sm">Normaler Datenverkehr ✕</div></div><div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>Nach erfolgreicher Prüfung</div><div className="mt-2 text-sm font-bold">Kontrollierter Port freigegeben ✓</div><div className="mt-1 text-sm">Zugelassener Datenverkehr ✓</div></div></div><p className="mt-2 text-xs text-ds-muted">Das anfängliche EAPOL-Fenster dient der Authentisierung, nicht Port- oder Schwachstellenscans.</p></div>
}

function PhishingTicket() {
  return <div data-diagram="phishing-ticket" className="mx-auto max-w-4xl"><div className="grid gap-2 sm:grid-cols-2"><Box title="Eingang · verdächtige E-Mail">infosec@example.com → Ticket #42</Box><Box title="Ticket-Funktionen">Zuständigkeit · Status · ähnliche Meldungen verknüpfen</Box></div><div className="mt-2 border-2 border-rose-700 bg-rose-500/5 p-3 text-xs font-bold">Keine automatische Phishing-Abwehr: Ticketanlage allein blockiert keine Domain und löscht keine Mail.</div><p className="mt-2 text-xs text-ds-muted">Erst geprüfte Regeln oder angebundene Reaktionssysteme können solche Maßnahmen auslösen.</p></div>
}

function NetworkFlow() {
  return <div data-diagram="network-flow" className="mx-auto max-w-4xl"><div className="overflow-x-auto border border-ds-border"><table className="w-full min-w-[28rem] text-left text-xs"><thead className="bg-ds-floor"><tr>{['Quelle', 'Ziel', 'Port', 'Protokoll', 'Bytes'].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody><tr className="border-t border-ds-border"><td className="p-2">10.0.0.8</td><td className="p-2">203.0.113.9</td><td className="p-2">443</td><td className="p-2">TCP</td><td className="p-2 font-bold">48 MB</td></tr></tbody></table></div><div className="mt-2 grid gap-2 sm:grid-cols-2"><div className="border-2 border-emerald-700 bg-emerald-500/5 p-2 text-xs">NetFlow / IPFIX / sFlow: Verkehrsmetadaten und Volumen</div><div className="border border-rose-700 bg-rose-500/5 p-2 text-xs">NXLog: Log-Sammlung, kein Flow-Messverfahren</div></div><p className="mt-2 text-xs text-ds-muted">Fiktive Beispielwerte; Flow-Daten zeigen nicht automatisch den vollständigen Paketinhalt.</p></div>
}

function SnmpBandwidth() {
  return <div data-diagram="snmp-bandwidth" className="mx-auto max-w-4xl"><div className={tag}>SNMP-Interface-Zähler · Bytes pro Intervall</div><div className="mt-2 flex h-24 items-end justify-around gap-2 border-b-2 border-ds-border">{[16, 22, 20, 85, 27].map((height, i) => <div key={i} style={{ height: `${height}%` }} className={`w-1/6 border ${i === 3 ? 'border-rose-700 bg-rose-500/30' : 'border-sky-700 bg-sky-500/20'}`} />)}</div><div className="mt-1 flex justify-around text-[10px]"><span>09:00</span><span>09:05</span><span>09:10</span><span className="font-bold text-rose-700">09:15 · Peak</span><span>09:20</span></div><p className="mt-2 text-xs text-ds-muted">PRTG/Cacti können so einen Bandbreitenanstieg sichtbar machen. Der Peak allein beweist noch keine Exfiltration.</p></div>
}

function LessonsLearned() {
  return <div data-diagram="lessons-learned" className="mx-auto max-w-4xl"><div className="grid gap-2 sm:grid-cols-2"><Box title="Recovery abgeschlossen">Dienst wieder verfügbar ✓</Box><div className="border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3"><div className={tag}>Danach · Lessons Learned</div><div className="mt-2 text-sm font-bold">Was geschah? Wo stockte die Reaktion? Was ändern wir?</div></div></div><div className="mt-2 border-l-2 border-emerald-700 pl-3 text-xs">Ergebnis → Playbook und Vorbereitung für den nächsten Vorfall verbessern.</div></div>
}

function CisBaseline() {
  return <div data-diagram="cis-baseline" className="mx-auto max-w-4xl"><div className="grid gap-1 sm:grid-cols-3"><Box title="CIS-Benchmark wählen">Passend zur Linux-Distribution</Box><div className="border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3"><div className={tag}>Zuerst: Eignung prüfen</div><div className="mt-2 text-sm font-bold">Beispiel: Würde eine Empfehlung einen benötigten Dienst abschalten?</div></div><Box title="Erst danach">Abweichung begründen → testen → ausrollen</Box></div><p className="mt-2 text-xs text-ds-muted">Die Benchmark ist ein Ausgangspunkt, keine blind zu übernehmende Konfiguration.</p></div>
}

function DrSites() {
  const rows = [
    ['Cold', 'Gebäude + Versorgung', 'IT und Daten erst einrichten', 'border-ds-border'],
    ['Warm', 'Teilweise IT-Ausstattung', 'Daten / Konfiguration ergänzen', 'border-amber-700'],
    ['Hot', 'IT + Daten vorbereitet', 'Rasche Umschaltung möglich', 'border-emerald-700'],
  ]
  return <div data-diagram="dr-sites" className="grid gap-2 sm:grid-cols-3">{rows.map(([name, ready, missing, border]) => <div key={name} className={`border-2 ${border} bg-ds-floor p-3`}><div className={tag}>{name} Site</div><div className="mt-2 text-sm font-bold">{ready}</div><div className="mt-2 border-t border-ds-border pt-2 text-xs">{missing}</div></div>)}<p className="text-xs text-ds-muted sm:col-span-3">Bereitschaft nimmt von Cold → Warm → Hot zu; konkrete Ausrüstung ist vertraglich und technisch zu prüfen.</p></div>
}

function IpHash() {
  return <div data-diagram="ip-hash"><div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><Box title="Anfrage 1 · 10.0.0.8">Hash(Quell-IP) → Pool-Index 2</Box><Arrow /><Box title="Backend B" accent="border-emerald-700">Sitzung landet auf B</Box><Box title="Anfrage 2 · 10.0.0.8">gleiche Quell-IP → gleicher Hash</Box><Arrow /><Box title="Backend B" accent="border-emerald-700">erneut B, solange Pool stabil</Box></div><p className="mt-2 text-xs text-ds-muted">Bei Pool-Änderung oder gemeinsamem NAT ist diese Zuordnung nicht garantiert.</p></div>
}

function PathDiversity() {
  return <div data-diagram="path-diversity"><div className="grid gap-2 sm:grid-cols-2"><div className="border-2 border-rose-700 bg-rose-500/5 p-3 text-sm"><strong>Gemeinsame Trasse</strong><div className="mt-2">Leitung A ══╳══ Ziel</div><div>Leitung B ══╳══ Ziel</div><div className="mt-2 text-xs">Ein Bagger trifft beide.</div></div><div className="border-2 border-emerald-700 bg-emerald-500/5 p-3 text-sm"><strong>Getrennte Trassen</strong><div className="mt-2">Nordweg ══╳══ Ziel</div><div>Südweg ═════ Ziel ✓</div><div className="mt-2 text-xs">Der zweite Weg bleibt erreichbar.</div></div></div></div>
}

function FailClosed() {
  return <div data-diagram="fail-closed" className="grid gap-2 sm:grid-cols-2"><div className="border-2 border-rose-700 bg-rose-500/5 p-3"><div className={tag}>Inline IPS · fail-closed</div><div className="mt-2 text-sm font-bold">Quelle → Sensor ✕ ╳ Ziel</div><p className="mt-2 text-xs">Bei Sensorausfall stoppt auch der Datenpfad.</p></div><div className="border border-ds-border p-3"><div className={tag}>Kontrast · fail-open</div><div className="mt-2 text-sm font-bold">Quelle → Bypass → Ziel</div><p className="mt-2 text-xs">Verkehr läuft weiter, aber ohne diese Prüfung.</p></div></div>
}

function ExerciseSpectrum() {
  return <div data-diagram="exercise-spectrum" className="grid gap-2 sm:grid-cols-3"><Box title="Tabletop">Team bespricht Entscheidungen am Szenario.</Box><div className="border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3"><div className={tag}>Simulation</div><div className="mt-2 text-sm font-bold">Teams führen Reaktionen in einer Übungsumgebung aus.</div></div><Box title="Live-Failover">Produktivlast tatsächlich umschalten.</Box><p className="text-xs text-ds-muted sm:col-span-3">Nähe zum realen Betrieb und möglicher Eingriff nehmen nach rechts zu; eine Simulation ist kein zwingender Produktiv-Failover.</p></div>
}

function BackupVsReplication() {
  return <div data-diagram="backup-vs-replication" className="grid gap-2 sm:grid-cols-2"><div className="border border-ds-border p-3"><div className={tag}>Backup · Wiederherstellungspunkte</div><div className="mt-2 text-sm font-bold">08:00 ● &nbsp; 12:00 ● &nbsp; 16:00 ●</div><div className="mt-2 text-xs">Ausfall → passenden Stand auswählen → zurückspielen.</div></div><div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>Replikation · laufende Übernahme</div><div className="mt-2 text-sm font-bold">Primärsystem ⇢ Replik ⇢ Failover</div><div className="mt-2 text-xs">Schneller nutzbar, kann aber auch Löschung/Fehler replizieren.</div></div></div>
}

function CloudResponsibility() {
  return <div data-diagram="cloud-responsibility" className="grid gap-2 sm:grid-cols-2"><div className="border-2 border-sky-700 bg-sky-500/5 p-3"><div className={tag}>IaaS-Provider · Sicherheit der Cloud</div><div className="mt-2 text-sm font-bold">Rechenzentrum<br />Physische Hosts<br />Virtualisierung</div></div><div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>Kunde · Sicherheit in der Cloud</div><div className="mt-2 text-sm font-bold">Gastbetriebssystem<br />Anwendungen<br />Zugriffskonfiguration</div></div><p className="text-xs text-ds-muted sm:col-span-2">IaaS-Beispiel: Bei anderen Cloud-Diensten verschiebt sich die Grenze.</p></div>
}

function ClusterVsBalancer() {
  return <div data-diagram="cluster-vs-balancer" className="grid gap-2 sm:grid-cols-2"><div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>Cluster · ein logischer Dienst</div><div className="mt-2 border border-emerald-700 p-2 text-sm font-bold">Knoten A ⇄ Knoten B ⇄ Knoten C</div><div className="mt-2 text-xs">Koordination / Failover innerhalb der Dienstgruppe.</div></div><div className="border border-ds-border p-3"><div className={tag}>Load Balancer · vorgeschalteter Verteiler</div><div className="mt-2 text-sm font-bold">Client → VIP → Server A | B | C</div><div className="mt-2 text-xs">Wählt das Ziel für eingehende Anfragen.</div></div></div>
}

function AirGapDevice() {
  return <div data-diagram="air-gap-device" className="grid gap-2 sm:grid-cols-2"><div className="border-2 border-emerald-700 p-3"><div className={tag}>Physischer Air Gap</div><div className="mt-2 text-sm font-bold">Büronetz ╳ Offline-Gerät</div><div className="mt-2 text-xs">Kein Switch, Kabel oder Funkpfad.</div></div><div className="border border-rose-700 p-3"><div className={tag}>Nur logische Trennung</div><div className="mt-2 text-sm font-bold">VLAN 10 ↔ Switch ↔ VLAN 20</div><div className="mt-2 text-xs">Gemeinsame Infrastruktur ist kein Air Gap.</div></div><p className="text-xs text-ds-muted sm:col-span-2">Wechselmedien können die Grenze dennoch überbrücken und müssen gesondert kontrolliert werden.</p></div>
}

function SameFactor() {
  return <div data-diagram="same-factor" className="grid gap-2 sm:grid-cols-2"><div className="border-2 border-rose-700 bg-rose-500/5 p-3"><div className={tag}>PIN + Passwort</div><div className="mt-2 text-sm font-bold">Wissen + Wissen → 1 Faktorkategorie</div></div><div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>Passwort + Hardware-Token</div><div className="mt-2 text-sm font-bold">Wissen + Besitz → 2 Faktorkategorien</div></div></div>
}

function ScanOutcomes() {
  return <div data-diagram="scan-outcomes" className="overflow-x-auto"><table className="w-full min-w-[28rem] border-collapse text-center text-xs"><thead><tr><th className="border p-2">Wirklichkeit \ Scan</th><th className="border p-2">Alarm</th><th className="border p-2">Kein Alarm</th></tr></thead><tbody><tr><th className="border p-2">Schwachstelle vorhanden</th><td className="border border-emerald-700 p-3">Treffer ✓</td><td className="border-2 border-rose-700 bg-rose-500/10 p-3 font-bold">False Negative<br />Lücke übersehen</td></tr><tr><th className="border p-2">Keine ausnutzbare Lücke</th><td className="border-2 border-amber-700 bg-amber-500/10 p-3 font-bold">False Positive<br />z. B. Patch zurückportiert</td><td className="border border-emerald-700 p-3">Korrekt unauffällig ✓</td></tr></tbody></table></div>
}

function AlertTuning() {
  return <div data-diagram="alert-tuning" className="grid gap-2 sm:grid-cols-2"><div className="border border-ds-border p-3"><div className={tag}>Rohereignisse</div><div className="mt-2 text-sm">Tippfehler · Tippfehler · Tippfehler<br /><strong>Viele Fehlversuche + ungewöhnlicher Kontext</strong></div></div><div className="border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3"><div className={tag}>Abgestimmte Regel</div><div className="mt-2 text-sm">Einzelne harmlose Fehler: niedrige Priorität<br /><strong>Muster: prüfen / alarmieren</strong></div></div><p className="text-xs text-ds-muted sm:col-span-2">Grenzwerte sind organisationsabhängig; Tuning heißt nicht, die Erkennung pauschal abzuschalten.</p></div>
}

function ForensicImageHash() {
  return <div data-diagram="forensic-image-hash" className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><Box title="Originalmedium">Hash H₁ = a7c9…</Box><Arrow caption="forensisch abbilden" /><Box title="Forensisches Image" accent="border-emerald-700">Hash H₂ = a7c9…</Box><div className="border-l-2 border-emerald-700 pl-3 text-sm font-bold sm:col-span-3">H₁ = H₂ → Kopie stimmt zum Prüfzeitpunkt mit dem Original überein.</div><p className="text-xs text-ds-muted sm:col-span-3">Schematische Hash-Kürzel; Hashverfahren, Zeitpunkte und Beweiskette dokumentieren.</p></div>
}

function IptablesRule() {
  return <div data-diagram="iptables-rule"><div className="grid grid-cols-2 gap-1 sm:grid-cols-5">{[['Kette', 'INPUT'], ['Protokoll', 'TCP'], ['Quelle', '10.0.10.0/24'], ['Zielport', '22 · SSH'], ['Aktion', 'DROP']].map(([label, value]) => <div key={label} className="border-2 border-[--brand-primary] bg-[--brand-primary-08] p-2"><div className={tag}>{label}</div><div className="mt-1 break-all font-mono text-xs font-bold">{value}</div></div>)}</div><p className="mt-2 text-xs text-ds-muted">Nur Pakete, die alle Bedingungen treffen, werden verworfen. Frühere Firewall-Regeln können zuerst greifen.</p></div>
}

function WifiHeatmap() {
  const cells = ['bg-emerald-500/50', 'bg-emerald-500/40', 'bg-amber-500/40', 'bg-rose-500/40', 'bg-emerald-500/40', 'bg-amber-500/40', 'bg-rose-500/40', 'bg-rose-500/50', 'bg-amber-500/30', 'bg-rose-500/40', 'bg-rose-500/50', 'bg-rose-500/60']
  return <div data-diagram="wifi-heatmap"><div className="grid max-w-lg grid-cols-4 gap-1 border-2 border-ds-border p-2">{cells.map((color, i) => <div key={i} className={`flex aspect-[2/1] items-center justify-center border border-ds-border ${color} text-xs font-bold`}>{i === 0 ? 'AP ●' : i === 11 ? 'schwach' : ''}</div>)}</div><div className="mt-2 text-xs">🟩 stark nahe AP &nbsp; 🟨 mittel &nbsp; 🟥 schwach am Rand</div><p className="mt-1 text-xs text-ds-muted">Schematischer Grundriss, keine real gemessenen dBm-Werte.</p></div>
}

function SamlVsOauth() {
  return <div data-diagram="saml-vs-oauth" className="grid gap-2 sm:grid-cols-2"><div className="border-2 border-sky-700 bg-sky-500/5 p-3"><div className={tag}>SAML · Identitätsaussage</div><div className="mt-2 text-sm font-bold">Identity Provider → XML-Assertion → Service Provider</div><div className="mt-2 text-xs">Authn / Attribute / ggf. Autorisierungsentscheidung.</div></div><div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>OAuth · delegierter Zugriff</div><div className="mt-2 text-sm font-bold">Authorization Server → Access Token → App → API</div><div className="mt-2 text-xs">Begrenzter Zugriff auf Ressource ohne Nutzerpasswort.</div></div></div>
}

function EdrHashMatch() {
  return <div data-diagram="edr-hash-match" className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><Box title="Threat-Intel-IoC">Malware-Hash: 9f2a…</Box><Arrow caption="abgleichen" /><Box title="EDR auf Endpunkt" accent="border-rose-700">Lokale Datei: 9f2a… → Treffer</Box><p className="text-xs text-ds-muted sm:col-span-3">Ein Hash-Treffer identifiziert den Dateiinhalt, nicht automatisch den Kontext oder die Absicht.</p></div>
}

function CustodyVideo() {
  return <div data-diagram="custody-video" className="grid gap-2 sm:grid-cols-3"><Box title="Kamerasystem">Videodatei V-17 exportiert</Box><div className="border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3"><div className={tag}>Entnahmeprotokoll</div><div className="mt-2 text-sm font-bold">Wer? Wann? Warum?<br />Hash / Datenträger</div></div><Box title="Gesicherte Verwahrung">Übergabe an Ermittler quittiert</Box><p className="text-xs text-ds-muted sm:col-span-3">Jede weitere Übergabe erhält einen eigenen Eintrag; die Kameraaufnahme wird nicht nur kopiert.</p></div>
}

function RbacAbac() {
  return <div data-diagram="rbac-abac" className="grid gap-2 sm:grid-cols-2"><div className="border-2 border-sky-700 bg-sky-500/5 p-3"><div className={tag}>RBAC · Rolle</div><div className="mt-2 text-sm font-bold">Nutzer → Rolle „HR“ → Personalakte lesen</div></div><div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>ABAC · Attribute</div><div className="mt-2 text-sm font-bold">Standort = London + Ressource = intern → Zugriff prüfen</div></div><p className="text-xs text-ds-muted sm:col-span-2">Praxislösungen können Rollen und Attribute kombinieren; die Karte prüft die hervorgehobene Entscheidungsbasis.</p></div>
}

function CsrFlow() {
  return <div data-diagram="csr-flow" className="mx-auto max-w-4xl">
    <div className="grid gap-2 md:grid-cols-[1fr_auto_1.25fr_auto_1fr] md:items-center">
      <div className="border-2 border-sky-700 bg-sky-500/5 p-3"><div className={tag}>Antragsteller</div><div className="mt-2 text-sm font-bold">Schlüsselpaar erzeugen</div><div className="mt-2 border border-sky-700 px-2 py-1 font-mono text-xs">Privater Schlüssel bleibt hier</div></div>
      <Arrow caption="signiert" />
      <div className="border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3"><div className={tag}>PKCS #10 · CSR</div><div className="mt-2 grid grid-cols-2 gap-1 text-xs font-semibold"><span className="border border-ds-border p-1">Subject / Name</span><span className="border border-ds-border p-1">Öffentlicher Schlüssel</span><span className="border border-ds-border p-1">optionale Attribute</span><span className="border border-ds-border p-1">Signatur</span></div></div>
      <Arrow caption="prüfen" />
      <Box title="Certification Authority" accent="border-emerald-700">Zertifikat ausstellen</Box>
    </div>
    <div className="mt-3 border-2 border-dashed border-rose-700 bg-rose-500/5 p-2 text-center text-xs font-bold">Telefonnummer: keine definierte CSR-Pflichtangabe</div>
  </div>
}

function CertificateIdentity() {
  return <div data-diagram="certificate-identity" className="mx-auto max-w-4xl">
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1.4fr_auto_1fr] sm:items-center">
      <div className="grid gap-2"><Box title="Person">alice@example.test</Box><Box title="System">vpn.example.test</Box></div>
      <Arrow caption="Identifier" />
      <div className="border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3 text-center"><div className={tag}>CA-signiertes Zertifikat</div><div className="mt-2 text-sm font-bold">Identität + öffentlicher Schlüssel + Gültigkeit</div><div className="mt-2 font-mono text-xs">Signatur der CA ✓</div></div>
      <Arrow caption="bindet" />
      <Box title="Öffentlicher Schlüssel" accent="border-emerald-700">Verifizierbare Zuordnung</Box>
    </div>
    <p className="mt-2 text-xs text-ds-muted">Die CA-Signatur bestätigt die Bindung; sie macht einen Benutzernamen oder ein Token nicht selbst zum Zertifikat.</p>
  </div>
}

function KeyEstablishment() {
  return <div data-diagram="key-establishment" className="mx-auto grid max-w-4xl gap-2 sm:grid-cols-2">
    <div className="border-2 border-sky-700 bg-sky-500/5 p-3"><div className={tag}>Diffie-Hellman · Key Agreement</div><div className="mt-2 text-sm font-bold">Alice ⇄ öffentliche Beiträge ⇄ Bob</div><div className="mt-3 border border-sky-700 p-2 text-center font-mono text-xs">beide leiten gemeinsames Geheimnis K ab</div></div>
    <div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>RSA · Key Transport</div><div className="mt-2 text-sm font-bold">Sender → mit Empfänger-Public-Key geschützt → Empfänger</div><div className="mt-3 border border-emerald-700 p-2 text-center font-mono text-xs">Empfänger gewinnt Schlüsselmaterial mit Private Key</div></div>
    <div className="border-l-2 border-[--brand-primary] pl-3 text-sm font-bold sm:col-span-2">Gemeinsamer Oberbegriff: Schlüsseletablierung / Key Exchange</div>
  </div>
}

function HardwareTrust() {
  return <div data-diagram="hardware-trust" className="mx-auto grid max-w-4xl gap-2 sm:grid-cols-3">
    <div className="border-2 border-sky-700 bg-sky-500/5 p-3"><div className={tag}>TPM · Plattformmodul</div><div className="mt-2 text-sm font-bold">PC / Gerät</div><div className="mt-2 border border-sky-700 p-2 text-xs">Schlüssel · Plattformmesswerte · Attestierung</div></div>
    <div className="border-2 border-[--brand-primary] bg-[--brand-primary-08] p-3"><div className={tag}>Secure Enclave · Apple-SoC</div><div className="mt-2 text-sm font-bold">isoliert vom Hauptprozessor</div><div className="mt-2 border border-[--brand-primary] p-2 text-xs">Schlüsseloperationen · biometrische Schutzdaten</div></div>
    <div className="border border-ds-border bg-ds-floor p-3"><div className={tag}>HSM · separates Sicherheitsmodul</div><div className="mt-2 text-sm font-bold">Server / Appliance / Cloud</div><div className="mt-2 border border-ds-border p-2 text-xs">zentral geschützte kryptografische Operationen</div></div>
    <p className="text-xs text-ds-muted sm:col-span-3">Gemeinsames Ziel, verschiedene Bauform und Einsatzgrenze: Die Bezeichnungen sind nicht austauschbar.</p>
  </div>
}

function PortKerberos() {
  return <div data-diagram="port-kerberos" className="mx-auto max-w-3xl"><div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><Box title="Kerberos-Client">Ticket anfordern</Box><Arrow caption="TCP oder UDP · Port 88" /><Box title="KDC" accent="border-emerald-700">AS / TGS · Tickets ausgeben</Box></div><div className="mt-2 grid grid-cols-3 gap-1 text-center font-mono text-[10px]"><span className="border border-rose-700 p-1">53 · DNS</span><span className="border-2 border-emerald-700 bg-emerald-500/10 p-1 font-bold">88 · Kerberos</span><span className="border border-rose-700 p-1">389 · LDAP</span></div></div>
}

function PortNtp() {
  return <div data-diagram="port-ntp" className="mx-auto max-w-3xl"><div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><Box title="NTP-Client">lokale Uhr korrigieren</Box><Arrow caption="Anfrage · UDP 123" /><Box title="NTP-Zeitserver" accent="border-emerald-700">Zeitstempel austauschen</Box></div><div className="mt-3 border-l-2 border-[--brand-primary] pl-3 text-sm font-bold">Gemeinsame Zeitbasis → Logs und Ereignisse besser korrelierbar</div><p className="mt-1 text-xs text-ds-muted">Klassischer NTPv4-Pfad; moderne abgesicherte Varianten ergänzen Authentisierung.</p></div>
}

function PortRdp() {
  return <div data-diagram="port-rdp" className="mx-auto grid max-w-4xl gap-2 sm:grid-cols-2"><div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>Direkte RDP-Sitzung</div><div className="mt-2 text-sm font-bold">Windows-Client → TCP/UDP 3389 → RDP-Host</div><p className="mt-2 text-xs">Standardport des Remote Desktop Protocol.</p></div><div className="border border-ds-border bg-ds-floor p-3"><div className={tag}>Gesonderter Gateway-Pfad</div><div className="mt-2 text-sm font-bold">Client → HTTPS 443 → RD Gateway → RDP-Host</div><p className="mt-2 text-xs">443 kann den Gateway-Zugang tragen, ersetzt aber nicht die direkte RDP-Standardnummer.</p></div><p className="text-xs text-ds-muted sm:col-span-2">22 gehört zu SSH; 5900 wird typischerweise VNC zugeordnet.</p></div>
}

function PortRemote() {
  return <div data-diagram="port-remote" className="grid gap-2 sm:grid-cols-2"><div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>SSH · TCP 22</div><div className="mt-2 text-sm font-bold">Admin → 🔒 verschlüsselte Shell → Server</div><p className="mt-2 text-xs">Hostauthentisierung, Integrität und vertraulicher Kanal.</p></div><div className="border-2 border-rose-700 bg-rose-500/5 p-3"><div className={tag}>Telnet · TCP 23</div><div className="mt-2 text-sm font-bold">Admin → offene Terminalsitzung → Server</div><p className="mt-2 text-xs">Kein vergleichbarer SSH-Sitzungsschutz.</p></div></div>
}

function PortWeb() {
  return <div data-diagram="port-web" className="grid gap-2 sm:grid-cols-2"><div className="border border-rose-700 bg-rose-500/5 p-3"><div className={tag}>http:// · TCP 80</div><div className="mt-2 text-sm font-bold">Browser → HTTP → Webserver</div><p className="mt-2 text-xs">Das Schema fordert keine TLS-Schicht.</p></div><div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>https:// · TCP 443</div><div className="mt-2 text-sm font-bold">Browser → TLS → HTTP → Webserver</div><p className="mt-2 text-xs">TLS schützt Transport und authentisiert den Server bei korrekter Einrichtung.</p></div><p className="text-xs text-ds-muted sm:col-span-2">Standardports, keine Aussage über jeden individuell konfigurierten Webdienst.</p></div>
}

function PortDns() {
  return <div data-diagram="port-dns" className="grid gap-2 sm:grid-cols-2"><div className="border-2 border-sky-700 bg-sky-500/5 p-3"><div className={tag}>DNS · UDP 53</div><div className="mt-2 text-sm font-bold">Client ⇢ DNS-Server</div><p className="mt-2 text-xs">Häufiger Weg für gewöhnliche Anfragen und Antworten.</p></div><div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>DNS · TCP 53</div><div className="mt-2 text-sm font-bold">Client / Nameserver ⇄ DNS-Server</div><p className="mt-2 text-xs">Unter anderem für Zonentransfers und Antworten, die TCP brauchen.</p></div><p className="text-xs text-ds-muted sm:col-span-2">Gleicher Zielport, zwei Transporte: „nur UDP“ wäre kein vollständiger klassischer DNS-Pfad.</p></div>
}

function PortDhcp() {
  return <div data-diagram="port-dhcp" className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><Box title="Client · UDP 68">Noch keine IP-Adresse</Box><Arrow caption="Anfrage an UDP 67" /><Box title="DHCPv4-Server · UDP 67" accent="border-emerald-700">Adresse anbieten</Box><div className="border-t-2 border-[--brand-primary] pt-2 text-center text-sm font-bold sm:col-span-3">Antwort: Server UDP 67 → Client UDP 68</div><p className="text-xs text-ds-muted sm:col-span-3">Server- und Client-Port bezeichnen die Rollen, nicht zwei alternative DHCP-Serverports.</p></div>
}

function PortMail() {
  return <div data-diagram="port-mail" className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center"><Box title="Mailclient">Nachricht verfassen</Box><Arrow caption="Submission · TCP 587" /><Box title="Submission-Server">Annahme / Richtlinien</Box><Arrow caption="Relay · TCP 25" /><Box title="Ziel-Mailserver" accent="border-emerald-700">Nachricht empfangen</Box><p className="text-xs text-ds-muted sm:col-span-5">Zwei SMTP-Rollen in einer Kette: 587 ist normalerweise Client-Einreichung, 25 der Transport zwischen Mailservern.</p></div>
}

function PortMailAccess() {
  return <div data-diagram="port-mail-access" className="grid gap-2 sm:grid-cols-2"><div className="border-2 border-sky-700 bg-sky-500/5 p-3"><div className={tag}>IMAPS · TCP 993</div><div className="mt-2 text-sm font-bold">Client → TLS sofort → IMAP-Postfach</div><p className="mt-2 text-xs">Ordner und Nachrichten auf dem Server verwalten.</p></div><div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>POP3S · TCP 995</div><div className="mt-2 text-sm font-bold">Client → TLS sofort → POP3-Abruf</div><p className="mt-2 text-xs">Nachrichten abrufen; anderes Postfachmodell als IMAP.</p></div><p className="text-xs text-ds-muted sm:col-span-2">143/110 können nach STARTTLS abgesichert werden; gefragt ist hier der sofortige TLS-Handshake.</p></div>
}

function PortLdap() {
  return <div data-diagram="port-ldap" className="grid gap-2 sm:grid-cols-2"><div className="border border-ds-border p-3"><div className={tag}>LDAP · TCP 389 + STARTTLS</div><div className="mt-2 text-sm font-bold">Verbinden → STARTTLS → geschütztes LDAP</div></div><div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>AD-LDAPS · TCP 636</div><div className="mt-2 text-sm font-bold">Verbinden → TLS sofort → LDAP</div></div><p className="text-xs text-ds-muted sm:col-span-2">389 ist nicht zwangsläufig ungeschützt; entscheidend ist, wann TLS beginnt.</p></div>
}

function PortRadius() {
  return <div data-diagram="port-radius" className="grid gap-2 sm:grid-cols-2"><div className="border-2 border-sky-700 bg-sky-500/5 p-3"><div className={tag}>RADIUS-Authentisierung</div><div className="mt-2 text-sm font-bold">Netzgerät → UDP 1812 → RADIUS-Server</div><p className="mt-2 text-xs">Darf dieser Nutzer hinein?</p></div><div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>RADIUS-Accounting</div><div className="mt-2 text-sm font-bold">Netzgerät → UDP 1813 → RADIUS-Server</div><p className="mt-2 text-xs">Nutzung und Sitzungsdaten erfassen.</p></div></div>
}

function PortSnmp() {
  return <div data-diagram="port-snmp" className="grid gap-2 sm:grid-cols-2"><div className="border-2 border-sky-700 bg-sky-500/5 p-3"><div className={tag}>Abfrage · UDP 161 am Gerät</div><div className="mt-2 text-sm font-bold">Manager → „Wert?“ → Gerät</div></div><div className="border-2 border-amber-700 bg-amber-500/5 p-3"><div className={tag}>Trap · UDP 162 am Manager</div><div className="mt-2 text-sm font-bold">Gerät → „Ereignis!“ → Manager</div></div><p className="text-xs text-ds-muted sm:col-span-2">Die Zielrichtung ist umgekehrt: 161 für die Befragung des Geräts, 162 für dessen Benachrichtigung.</p></div>
}

function PortIpsec() {
  return <div data-diagram="port-ipsec" className="grid gap-2 sm:grid-cols-3"><Box title="IKE-Start · UDP 500">Tunnelparameter aushandeln</Box><div className="border-2 border-amber-700 bg-amber-500/5 p-3"><div className={tag}>NAT erkannt</div><div className="mt-2 text-sm font-bold">Direktes ESP hätte Probleme am NAT.</div></div><Box title="NAT-T · UDP 4500" accent="border-emerald-700">IKE + gekapseltes ESP</Box><p className="text-xs text-ds-muted sm:col-span-3">ESP ohne Kapselung hat selbst keinen TCP- oder UDP-Port.</p></div>
}

function PortSftp() {
  return <div data-diagram="port-sftp" className="grid gap-2 sm:grid-cols-2"><div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>SFTP · SSH-Familie</div><div className="mt-2 text-sm font-bold">Dateiclient → SSH TCP 22 → SFTP-Subsystem</div></div><div className="border border-rose-700 bg-rose-500/5 p-3"><div className={tag}>FTPS · FTP-Familie</div><div className="mt-2 text-sm font-bold">FTP-Steuerkanal + TLS; anderes Portmodell</div></div><p className="text-xs text-ds-muted sm:col-span-2">SFTP ist nicht die TLS-Variante von FTP. Port 22 ist der Standard des darunterliegenden SSH-Dienstes.</p></div>
}

function PortSmb() {
  return <div data-diagram="port-smb" className="grid gap-2 sm:grid-cols-2">
    <div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>Direktes SMB · TCP 445</div><div className="mt-2 text-sm font-bold">Client → TCP 445 → SMB-Server</div><p className="mt-2 text-xs">SMB ohne NetBIOS-Transportschicht.</p></div>
    <div className="border border-ds-border bg-ds-floor p-3"><div className={tag}>Älterer NetBIOS-Weg · TCP 139</div><div className="mt-2 text-sm font-bold">Client → NetBIOS Session → SMB</div><p className="mt-2 text-xs">UDP 137 ist NetBIOS Name Service, keine SMB-Sitzung.</p></div>
    <p className="text-xs text-ds-muted sm:col-span-2">Zwei Transportwege für SMB, nicht zwei Bezeichnungen für denselben direkten Port. TCP 3389 ist RDP.</p>
  </div>
}

function PortTacacs() {
  return <div data-diagram="port-tacacs" className="grid gap-2 sm:grid-cols-2">
    <div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>TACACS+ · Geräteadministration</div><div className="mt-2 text-sm font-bold">Netzgerät → TCP 49 → TACACS+-Server</div><p className="mt-2 text-xs">Richtiger Dienst, richtiger Transport und Port.</p></div>
    <div className="border border-ds-border bg-ds-floor p-3"><div className={tag}>RADIUS · anderer AAA-Dienst</div><div className="mt-2 text-sm font-bold">Netzgerät → UDP 1812 → RADIUS-Server</div><p className="mt-2 text-xs">Auch Authentisierung, aber nicht TACACS+.</p></div>
    <p className="text-xs text-ds-muted sm:col-span-2">UDP 49 ist trotz gleicher Nummer nicht TACACS+ nach RFC 8907. TCP 636 bezeichnet LDAPS.</p>
  </div>
}

function PortSyslogTls() {
  return <div data-diagram="port-syslog-tls" className="grid gap-2 sm:grid-cols-3">
    <div className="border border-ds-border bg-ds-floor p-3"><div className={tag}>Syslog über UDP</div><div className="mt-2 text-sm font-bold">Sender → UDP 514 → Empfänger</div><p className="mt-2 text-xs">Kein TLS-Handshake.</p></div>
    <div className="border border-ds-border bg-ds-floor p-3"><div className={tag}>TCP 514</div><div className="mt-2 text-sm font-bold">TCP allein ≠ TLS</div><p className="mt-2 text-xs">Nicht der Standardport aus RFC 5425.</p></div>
    <div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>Syslog über TLS</div><div className="mt-2 text-sm font-bold">Sender → TCP 6514 → TLS-Handshake → Syslog</div><p className="mt-2 text-xs">TLS-Transport nach RFC 5425.</p></div>
    <p className="text-xs text-ds-muted sm:col-span-3">Entscheidend ist der gefragte Transport mit TLS, nicht bloß das Wort „Syslog“. UDP 162 gehört zu SNMP-Traps.</p>
  </div>
}

function ConfigurationReview() {
  return <div data-diagram="configuration-review" className="mx-auto max-w-4xl">
    <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-1 text-center text-[10px] sm:gap-2 sm:text-xs">
      <div className="min-w-0 border border-ds-border bg-ds-floor p-1 font-semibold sm:p-2">Systemzustand</div>
      <div className="min-w-0 border border-ds-border bg-ds-floor p-1 font-semibold sm:p-2">Konfiguration prüfen</div>
      <div className="min-w-0 border border-ds-border bg-ds-floor p-1 font-semibold sm:p-2">Traffic / Logs</div>
      <div className="min-w-0 border border-ds-border p-1 text-left sm:p-2">Dienst A · aktiv<br /><span className="text-ds-muted">wird genutzt</span></div>
      <div className="min-w-0 border border-emerald-700 bg-emerald-500/10 p-1 font-bold sm:p-2">✓ sichtbar</div>
      <div className="min-w-0 border border-emerald-700 bg-emerald-500/10 p-1 font-bold sm:p-2">✓ beobachtet</div>
      <div className="min-w-0 border-2 border-[--brand-primary] p-1 text-left font-semibold sm:p-2">Dienst B · aktiv<br /><span className="font-normal text-ds-muted">bleibt ungenutzt</span></div>
      <div className="min-w-0 border-2 border-emerald-700 bg-emerald-500/10 p-1 font-bold sm:p-2">✓ sichtbar</div>
      <div className="min-w-0 border-2 border-rose-700 bg-rose-500/10 p-1 font-bold sm:p-2">– kein Ereignis</div>
    </div>
    <p className="mt-2 text-xs text-ds-muted">Schematisches Beispiel: Ein fehlendes Paket oder Log beweist nicht, dass kein Dienst aktiv ist. Für tatsächliche Netzwerkerreichbarkeit auch Firewall-Regeln prüfen.</p>
  </div>
}

function CertExpiryRevocation() {
  return <div data-diagram="cert-expiry-revocation" className="mx-auto max-w-4xl space-y-3">
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center"><Box title="Normaler Ablauf">Zertifikat gültig</Box><Arrow caption="Zeit vergeht" /><Box title="notAfter erreicht" accent="border-amber-700">Gültigkeit endet</Box><Arrow caption="Prüfung" /><Box title="Ungültig">Kein neuer CRL-Eintrag nötig</Box></div>
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center"><Box title="Vorzeitiger Widerruf">Zertifikat noch innerhalb der Laufzeit</Box><Arrow caption="Schlüssel kompromittiert" /><Box title="CA handelt" accent="border-rose-700">Seriennummer in CRL</Box><Arrow caption="Prüfung" /><Box title="Ungültig">Schon vor notAfter</Box></div>
    <p className="text-xs text-ds-muted">Ablauf und Widerruf sind getrennte Prüfpfade. Ein bereits widerrufenes Zertifikat kann später zusätzlich ablaufen.</p>
  </div>
}

function BitlockerEscrow() {
  return <div data-diagram="bitlocker-escrow" className="mx-auto max-w-4xl">
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><div className="border border-ds-border bg-ds-floor p-3"><div className={tag}>Windows-Gerät</div><div className="mt-2 text-sm font-bold">BitLocker-Laufwerk · verschlüsselt</div><p className="mt-2 text-xs text-ds-muted">Ohne passenden Recovery-Protektor im Notfall gesperrt.</p></div><Arrow caption="Recovery-Information sichern" /><div className="border-2 border-emerald-700 bg-emerald-500/10 p-3"><div className={tag}>Geschütztes Repository</div><div className="mt-2 text-sm font-bold">Wiederherstellungsschlüssel · getrennt verwahrt</div><p className="mt-2 text-xs">Abruf nur nach festgelegter Berechtigung.</p></div></div>
    <div className="mt-3 border-l-2 border-[--brand-primary] pl-3 text-sm text-ds-fg">Bei Recovery: berechtigte Person → Repository → Schlüssel → Laufwerk entsperren.</div>
    <p className="mt-2 text-xs text-ds-muted">Die Grafik zeigt Key Escrow/Recovery, nicht den normalen Entsperrvorgang oder ein HSM.</p>
  </div>
}

function AwsSecurityGroup() {
  return <div data-diagram="aws-security-group" className="mx-auto grid max-w-4xl gap-2 sm:grid-cols-2">
    <div className="border-2 border-emerald-700 bg-emerald-500/5 p-3"><div className={tag}>Begrenzte Ingress-Regel · Beispiel</div><div className="mt-2 text-sm font-bold">Admin-Netz → Security Group → EC2</div><div className="mt-2 border border-emerald-700 px-2 py-1 font-mono text-xs">Quelle: Admin-Netz · Port: Verwaltungsdienst</div><p className="mt-2 text-xs">Nur die benötigte Quelle darf passieren.</p></div>
    <div className="border-2 border-rose-700 bg-rose-500/5 p-3"><div className={tag}>Zu breite Ingress-Regel · Beispiel</div><div className="mt-2 text-sm font-bold">Internet → Security Group → EC2</div><div className="mt-2 border border-rose-700 px-2 py-1 font-mono text-xs">Quelle: 0.0.0.0/0 · gleicher Port</div><p className="mt-2 text-xs">Die Regel öffnet denselben Dienst für wesentlich mehr Quellen.</p></div>
    <p className="text-xs text-ds-muted sm:col-span-2">Die beiden Pfade unterscheiden sich nur in der kundenseitig gesetzten Quellregel. Das Beispiel zeigt eine Fehlkonfiguration, keinen Defekt der AWS-API.</p>
  </div>
}

const diagrams = { 'zero-trust': ZeroTrust, pep: Pep, symmetric: Symmetric, asymmetric: Asymmetric, tokenization: Tokenization, masking: Masking, segmentation: Segmentation, risk: Risk, rto: Rto, playbook: Playbook, collision: Collision, wildcard: Wildcard, 'file-integrity': FileIntegrity, 'signed-logs': SignedLogs, 'data-controller': DataController, availability: Availability, 'dns-poisoning': DnsPoisoning, 'on-path': OnPath, csrf: Csrf, 'risk-transfer': RiskTransfer, 'risk-avoid': RiskAvoid, 'version-control': VersionControl, 'bluetooth-attacks': BluetoothAttacks, reconnaissance: Reconnaissance, 'allow-list': AllowList, 'file-encryption': FileEncryption, 'zero-trust-policy': ZeroTrustPolicy, backout: Backout, ddos: Ddos, permissions: Permissions, 'privilege-escalation': PrivilegeEscalation, 'data-subject': DataSubject, sla: Sla, bia: Bia, 'continuous-risk': ContinuousRisk, 'bc-documents': BcDocuments, 'gap-analysis': GapAnalysis, dependencies: Dependencies, 'change-impact': ChangeImpact, 'signed-update': SignedUpdate, 'dns-reflection': DnsReflection, 'virus-spread': VirusSpread, 'concurrent-sessions': ConcurrentSessions, 'exposure-factor': ExposureFactor, 'risk-threshold': RiskThreshold, 'risk-appetite': RiskAppetite, 'edr-ransomware': EdrRansomware, 'key-stretch': KeyStretch, 'password-storage': PasswordStorage, 'sam-shadow': SamShadow, 'cert-revocation': CertRevocation, ocsp: Ocsp, 'root-trust': RootTrust, honeypot: Honeypot, 'ntlm-relay': NtlmRelay, 'identity-proofing': IdentityProofing, 'known-environment': KnownEnvironment, 'soc2-assurance': Soc2Assurance, typosquatting: Typosquatting, 'out-of-cycle': OutOfCycle, 'agentless-surface': AgentlessSurface, 'full-disk': FullDisk, bollards: Bollards, 'risk-budget': RiskBudget, 'chain-custody': ChainCustody, tabletop: Tabletop, containment: Containment, dmarc: Dmarc, 'acl-order': AclOrder, 'partial-environment': PartialEnvironment, 'policy-standard': PolicyStandard, 'policy-exception': PolicyException, 'risk-acceptance': RiskAcceptance, 'load-balancer-vip': LoadBalancerVip, 'vlan-boundary': VlanBoundary, 'backup-rpo': BackupRpo, 'power-bridge': PowerBridge, 'parallel-test': ParallelTest, 'physical-isolation': PhysicalIsolation, 'least-privilege': LeastPrivilege, 'legal-hold': LegalHold, 'mail-dlp': MailDlp, 'secure-cookie': SecureCookie, 'siem-correlation': SiemCorrelation, 'forensic-timeline': ForensicTimeline, 'round-robin': RoundRobin, 'span-tap': SpanTap, 'data-state': DataState, 'vm-snapshot': VmSnapshot, 'offsite-backup': OffsiteBackup, 'replica-recovery': ReplicaRecovery, 'air-gap-ca': AirGapCa, 'dot1x-port': Dot1xPort, 'phishing-ticket': PhishingTicket, 'network-flow': NetworkFlow, 'snmp-bandwidth': SnmpBandwidth, 'lessons-learned': LessonsLearned, 'cis-baseline': CisBaseline, 'dr-sites': DrSites, 'ip-hash': IpHash, 'path-diversity': PathDiversity, 'fail-closed': FailClosed, 'exercise-spectrum': ExerciseSpectrum, 'backup-vs-replication': BackupVsReplication, 'cloud-responsibility': CloudResponsibility, 'cluster-vs-balancer': ClusterVsBalancer, 'air-gap-device': AirGapDevice, 'same-factor': SameFactor, 'scan-outcomes': ScanOutcomes, 'alert-tuning': AlertTuning, 'forensic-image-hash': ForensicImageHash, 'iptables-rule': IptablesRule, 'wifi-heatmap': WifiHeatmap, 'saml-vs-oauth': SamlVsOauth, 'edr-hash-match': EdrHashMatch, 'custody-video': CustodyVideo, 'rbac-abac': RbacAbac, 'csr-flow': CsrFlow, 'certificate-identity': CertificateIdentity, 'key-establishment': KeyEstablishment, 'hardware-trust': HardwareTrust, 'port-kerberos': PortKerberos, 'port-ntp': PortNtp, 'port-rdp': PortRdp, 'port-remote': PortRemote, 'port-web': PortWeb, 'port-dns': PortDns, 'port-dhcp': PortDhcp, 'port-mail': PortMail, 'port-mail-access': PortMailAccess, 'port-ldap': PortLdap, 'port-radius': PortRadius, 'port-snmp': PortSnmp, 'port-ipsec': PortIpsec, 'port-sftp': PortSftp, 'port-smb': PortSmb, 'port-tacacs': PortTacacs, 'port-syslog-tls': PortSyslogTls, 'configuration-review': ConfigurationReview, 'cert-expiry-revocation': CertExpiryRevocation, 'bitlocker-escrow': BitlockerEscrow, 'aws-security-group': AwsSecurityGroup }

export function SecurityVisualization({ visual }: { visual: SecurityVisual }) {
  const Diagram = diagrams[visual.diagram]
  return <section className="mt-5 border-t border-ds-border pt-4" aria-label="Visualisierung des Sicherheitsprinzips">
    <div className="mb-4"><span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[--brand-primary]">Prinzip als Modell</span><h3 className="mt-1 text-base font-semibold text-ds-fg">{visual.title}</h3></div>
    <figure><Diagram /><figcaption className="mt-3 border-l-2 border-[--brand-primary] pl-3 text-sm leading-relaxed text-ds-fg">{visual.conclusion}</figcaption></figure>
    <a href={visual.source} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] text-[--brand-primary] underline-offset-2 hover:underline">Fachquelle <ExternalLink size={11} aria-hidden="true" /></a>
    {visual.additionalSources?.map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="ml-3 mt-3 inline-flex items-center gap-1 font-mono text-[10px] text-[--brand-primary] underline-offset-2 hover:underline">{source.label} <ExternalLink size={11} aria-hidden="true" /></a>)}
  </section>
}
