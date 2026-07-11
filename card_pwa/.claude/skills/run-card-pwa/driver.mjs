#!/usr/bin/env node
/**
 * driver.mjs — headless harness for the Card_PWA web app (Vite + React PWA).
 *
 * Drives the running app with puppeteer-core + system Chromium. Each run is a
 * fresh browser (empty IndexedDB), loads APP_URL, waits for the home screen to
 * settle, then executes the STEP arguments in order.
 *
 * Steps (in order after load):
 *   dump              print <title>, url, first 800 chars of body text, and all data-testids
 *   shot[:path]       viewport screenshot PNG (default ./card-pwa-shot.png, cwd)
 *   click:<text>      click first button/[role=button]/a whose innerText OR aria-label OR title contains <text>
 *   focus:<css>       focus & click the element matching CSS selector <css>
 *   type:<text>       type <text> into the currently focused element
 *   eval:<js>         run <js> in the page, JSON-print the result
 *   wait:<ms>         sleep <ms>
 * No steps → runs `dump` then `shot`.
 *
 * Env:
 *   APP_URL   default http://localhost:5173  (prod: https://127.0.0.1:8444)
 *   CHROMIUM  default /usr/bin/chromium
 *   VIEWPORT  default 1280x900  (mobile: 400x800)
 *   TOUCH     "1" emulates a touch device (pointer:coarse) — required for the app's
 *             handset layout / mobile writing mode (useHandsetLayout gate)
 *   HEADLESS  default new       (set to "false" to attach a real window under xvfb)
 *
 * Examples:
 *   node driver.mjs                                   # dump + screenshot of home
 *   node driver.mjs shot:/tmp/home.png
 *   VIEWPORT=400x800 node driver.mjs shot:/tmp/mobile.png
 *   node driver.mjs click:Filter click:Lernvideos wait:1500 shot:/tmp/videos.png
 *   node driver.mjs 'eval:[...document.querySelectorAll("[data-testid]")].map(e=>e.dataset.testid)'
 */
import puppeteer from 'puppeteer-core'

const APP = process.env.APP_URL || process.env.E2E_APP_URL || 'http://localhost:5173'
const CHROMIUM = process.env.CHROMIUM || process.env.E2E_CHROMIUM || '/usr/bin/chromium'
const [vw, vh] = (process.env.VIEWPORT || '1280x900').split('x').map(Number)
const TOUCH = process.env.TOUCH === '1'
const HEADLESS = process.env.HEADLESS === 'false' ? false : 'new'
const sleep = ms => new Promise(r => setTimeout(r, ms))

const steps = process.argv.slice(2)
if (steps.length === 0) steps.push('dump', 'shot')

const browser = await puppeteer.launch({
  executablePath: CHROMIUM,
  headless: HEADLESS,
  args: ['--no-sandbox', '--disable-gpu', '--ignore-certificate-errors'],
  defaultViewport: { width: vw || 1280, height: vh || 900, isMobile: TOUCH, hasTouch: TOUCH },
})
const page = await browser.newPage()
const problems = []
page.on('pageerror', e => problems.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') problems.push('console.error: ' + m.text()) })

const bodyText = () => page.evaluate(() => document.body.innerText)
const looksLikeHome = async () => /Deine Decks|Your decks|Noch keine Decks|No decks|Subdecks/i.test(await bodyText())

async function waitFor(check, timeoutMs, label) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try { if (await check()) return true } catch { /* context may be swapped by SW reload */ }
    await sleep(250)
  }
  console.error(`WARN  timeout (${timeoutMs}ms): ${label}`)
  return false
}

// Start-Splash ist tap-gated (Motivationsspruch bleibt stehen, bis man tippt).
// Kann nach dem einmaligen SW-Install-Reload erneut auftauchen — deshalb vor
// jedem click/shot prüfen und ggf. wegklicken (wartet bis der Tap scharf ist).
async function dismissSplashIfPresent(maxWaitMs = 8000) {
  const attempt = () => page.evaluate(() => {
    const splash = document.querySelector('[data-testid="splash-continue"]')
    if (!splash) return 'gone'
    if (!document.querySelector('[data-testid="splash-continue-hint"]')) return 'not-ready'
    splash.click()
    return 'clicked'
  })
  const start = Date.now()
  for (;;) {
    let state
    try { state = await attempt() } catch { state = 'not-ready' /* context swap (SW reload) */ }
    if (state === 'gone') return
    if (state === 'clicked') { await sleep(400); return }
    if (Date.now() - start > maxWaitMs) { console.error('WARN  splash still tap-locked'); return }
    await sleep(250)
  }
}

async function clickText(text) {
  await dismissSplashIfPresent()
  const hit = await page.evaluate(needle => {
    const n = needle.toLowerCase()
    const nodes = [...document.querySelectorAll('button, [role=button], a')]
    const el = nodes.find(e =>
      (e.innerText || '').toLowerCase().includes(n) ||
      (e.getAttribute('aria-label') || '').toLowerCase().includes(n) ||
      (e.getAttribute('title') || '').toLowerCase().includes(n))
    if (!el) return false
    el.scrollIntoView({ block: 'center' })
    el.click()
    return true
  }, text)
  if (!hit) console.error(`WARN  click: no element matching "${text}"`)
  else console.log(`ok    click: ${text}`)
  await sleep(600)
  return hit
}

async function runStep(step) {
  const [cmd, ...rest] = step.split(':')
  const arg = rest.join(':')
  switch (cmd) {
    case 'dump': {
      const info = await page.evaluate(() => ({
        title: document.title,
        url: location.href,
        body: document.body.innerText.slice(0, 800),
        testids: [...document.querySelectorAll('[data-testid]')].map(e => e.getAttribute('data-testid')),
      }))
      console.log(JSON.stringify(info, null, 2))
      break
    }
    case 'shot': {
      await dismissSplashIfPresent()
      const path = arg || 'card-pwa-shot.png'
      await page.screenshot({ path })
      console.log(`ok    shot: ${path}`)
      break
    }
    case 'click': await clickText(arg); break
    case 'focus': {
      await dismissSplashIfPresent()
      const el = await page.$(arg)
      if (!el) { console.error(`WARN  focus: no element matching ${arg}`); break }
      await el.click()
      console.log(`ok    focus: ${arg}`)
      break
    }
    case 'type': await page.keyboard.type(arg); console.log(`ok    type: ${arg}`); await sleep(400); break
    case 'wait': await sleep(Number(arg) || 0); break
    case 'eval': {
      const result = await page.evaluate(a => {
        // eslint-disable-next-line no-eval
        const r = eval(a)
        return r === undefined ? null : r
      }, arg)
      console.log('eval →', JSON.stringify(result))
      break
    }
    default: console.error(`WARN  unknown step: ${step}`)
  }
}

console.log(`→ ${APP}  (${vw}x${vh}, chromium ${CHROMIUM})`)
await page.goto(APP, { waitUntil: 'networkidle2', timeout: 60000 })
await waitFor(looksLikeHome, 60000, 'home screen')
// First visit can trigger a one-time service-worker auto-reload; let it settle.
await sleep(3000)
await waitFor(looksLikeHome, 20000, 'home stable after SW setup')
// Start-Splash wegklicken, sobald der Tap scharf ist (kommt nach dem
// einmaligen SW-Install-Reload evtl. wieder — die Steps prüfen erneut).
await dismissSplashIfPresent(15000)

for (const step of steps) await runStep(step)

await browser.close()
if (problems.length) {
  console.error(`\n${problems.length} page problem(s):`)
  for (const p of problems.slice(0, 10)) console.error('  ' + p)
  process.exit(1)
}
console.log('\ndone.')
