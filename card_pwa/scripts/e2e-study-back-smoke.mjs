#!/usr/bin/env node
/**
 * E2E-Smoke: M2 Drag-Match + Zurück-Navigation (Bug-Repro 2026-06-11).
 *
 * Prüft genau das gemeldete Szenario:
 *   1. Lern-Session starten.
 *   2. Drag-Match-Karte per ECHTEM Drag in die Drop-Zone beantworten
 *      (Tap darf NICHT als Antwort zählen — wird mitgeprüft).
 *   3. Nach dem Bewerten mountet die Folgekarte (kein schwarzer Screen).
 *   4. Zurück-Pfeil (oben links) → der Homescreen MUSS erscheinen.
 *   Mehrere Runden, weil der historische Hänger intermittierend war.
 *
 * Voraussetzungen: laufende App (default https://127.0.0.1:8444, override via
 * E2E_APP_URL), Chromium unter /usr/bin/chromium (override via E2E_CHROMIUM),
 * devDependency puppeteer-core. Aufruf: npm run e2e:study
 */
import puppeteer from 'puppeteer-core'

const APP = process.env.E2E_APP_URL || 'https://127.0.0.1:8444'
const CHROMIUM = process.env.E2E_CHROMIUM || '/usr/bin/chromium'
const ROUNDS = Number(process.env.E2E_ROUNDS || 4)
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

let failures = 0
const fail = (msg) => { failures++; console.error(`FAIL  ${msg}`) }
const ok = (msg) => console.log(`ok    ${msg}`)

const browser = await puppeteer.launch({
  executablePath: CHROMIUM,
  headless: 'new',
  args: ['--no-sandbox', '--ignore-certificate-errors'],
  defaultViewport: { width: 400, height: 800 },
})
const page = await browser.newPage()
page.on('pageerror', err => fail(`pageerror: ${err.message}`))

const bodyText = () => page.evaluate(() => document.body.innerText)
const onHome = async () => /Subdecks|Noch keine Decks/i.test(await bodyText())
const inSession = async () => page.evaluate(() => !!document.querySelector('[data-testid="study-back-button"]'))
const cardBlank = async () => page.evaluate(() => {
  const area = document.querySelector('.card-no-select')
  return !area || area.innerText.trim().length < 10
})

async function waitFor(check, timeoutMs, label) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await check()) return true
    await sleep(250)
  }
  fail(`Timeout (${timeoutMs}ms): ${label}`)
  return false
}

async function enterSession() {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await page.evaluate(() => {
        const quest = [...document.querySelectorAll('button')].find(b => /Karten starten/i.test(b.innerText))
        if (quest) { quest.click(); return }
        const deck = [...document.querySelectorAll('button, [role=button]')].find(b => /Subdecks/i.test(b.innerText || ''))
        deck?.click()
      })
      await sleep(2000)
      await page.evaluate(() => {
        const lern = [...document.querySelectorAll('button')].find(b => /^(Lernen|Study)\b/i.test(b.innerText.trim()))
        lern?.click()
      })
      await sleep(2000)
      if (await inSession()) return true
    } catch (err) {
      // SW-Auto-Update kann die Seite einmalig neu laden — Kontextverlust ist
      // dann erwartbar; nach dem Reload erneut versuchen.
      if (!/Execution context was destroyed/i.test(String(err))) throw err
      await waitFor(onHome, 30000, 'Homescreen nach SW-Reload')
    }
  }
  return false
}

// Eine Drag-Match-Karte in der Session finden: Karten so lange normal
// beantworten/bewerten, bis das DRAG-MATCH-Badge auftaucht (max. limit Karten).
async function advanceToDragMatch(limit = 8) {
  for (let i = 0; i < limit; i++) {
    if (await page.evaluate(() => /DRAG-MATCH/.test(document.body.innerText))) return true
    // Tap-MC-Option oder Flip, dann bewerten
    const clicked = await page.evaluate(() => {
      const opt = [...document.querySelectorAll('button')].find(b => /^[A-E][):.]/.test(b.innerText.trim()))
      if (opt) { opt.click(); return true }
      return false
    })
    if (!clicked) {
      await page.evaluate(() => {
        document.querySelector('.card-no-select')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
    }
    await sleep(2200)
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => /Gut|Nochmal|Schwer|Leicht/i.test(b.innerText))
      btn?.click()
    })
    await sleep(1500)
    if (await cardBlank()) { fail('Kartenbereich leer beim Vorblättern'); return false }
  }
  return false
}

async function answerDragMatchByDrag() {
  const coords = await page.evaluate(() => {
    const opt = document.querySelector('[data-testid^="dragmatch-option-"]')
    const zone = document.querySelector('[data-testid="dragmatch-dropzone"]')
    if (!opt || !zone) return null
    const o = opt.getBoundingClientRect(), z = zone.getBoundingClientRect()
    return { ox: o.x + o.width / 2, oy: o.y + o.height / 2, zx: z.x + z.width / 2, zy: z.y + z.height / 2 }
  })
  if (!coords) { fail('Drag-Match-Elemente nicht gefunden'); return false }
  await page.mouse.move(coords.ox, coords.oy)
  await page.mouse.down()
  for (let s = 1; s <= 12; s++) {
    await page.mouse.move(
      coords.ox + (coords.zx - coords.ox) * s / 12,
      coords.oy + (coords.zy - coords.oy) * s / 12,
    )
    await sleep(20)
  }
  await page.mouse.up()
  return waitFor(
    () => page.evaluate(() => {
      const zone = document.querySelector('[data-testid="dragmatch-dropzone"]')
      return !zone || !/ZIEHEN/i.test(zone.innerText)
    }),
    3000,
    'Drag wurde gewertet',
  )
}

// ── Ablauf ────────────────────────────────────────────────────────────────────
await page.goto(APP, { waitUntil: 'networkidle2', timeout: 60000 })
if (!(await waitFor(onHome, 60000, 'Homescreen nach Erststart/Sync'))) process.exit(1)
ok('Homescreen geladen')
// Erstbesuch: SW installiert sich und kann die Seite einmal automatisch neu
// laden (Auto-Update-Politik). Kurz abwarten, bis das durch ist.
await sleep(5000)
await waitFor(onHome, 30000, 'Homescreen stabil nach SW-Setup')

for (let round = 1; round <= ROUNDS; round++) {
  console.log(`\n— Runde ${round}/${ROUNDS}`)
  if (!(await enterSession())) { fail('Session-Start'); break }
  ok('Session gestartet')

  if (!(await advanceToDragMatch())) {
    console.log('      (keine Drag-Match-Karte in Reichweite — Runde nutzt aktuelle Karte)')
  } else {
    // Tap darf NICHT antworten:
    await page.evaluate(() => {
      document.querySelector('[data-testid^="dragmatch-option-"]')?.click()
    })
    await sleep(700)
    const tapAnswered = await page.evaluate(() => {
      const zone = document.querySelector('[data-testid="dragmatch-dropzone"]')
      return !zone || !/ZIEHEN/i.test(zone.innerText)
    })
    if (tapAnswered) fail('Tap auf Option hat als Antwort gezählt (muss Drag-only sein)')
    else ok('Tap zählt nicht als Antwort')

    if (await answerDragMatchByDrag()) ok('Drag in Drop-Zone gewertet')
    await sleep(2200) // Auto-Flip zur Auflösung
    if (await cardBlank()) fail('Karte nach Auflösung verschwunden')
    else ok('Auflösung sichtbar')
  }

  // DER Bug-Pfad: Zurück-Pfeil → Homescreen muss erscheinen.
  await page.evaluate(() => {
    document.querySelector('[data-testid="study-back-button"]')?.click()
  })
  if (await waitFor(onHome, 4000, `Runde ${round}: Zurück-Pfeil führt zum Homescreen`)) {
    ok('Zurück-Pfeil → Homescreen')
  } else {
    await page.screenshot({ path: `/tmp/e2e-back-stuck-round${round}.png` })
  }
}

await browser.close()
if (failures > 0) {
  console.error(`\n${failures} Fehler.`)
  process.exit(1)
}
console.log(`\nAlle Prüfungen grün (${ROUNDS} Runden).`)
