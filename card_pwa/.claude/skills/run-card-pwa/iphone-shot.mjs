// iPhone-Emulation mit echten Safe-Area-Insets (CDP Emulation.setSafeAreaInsetsOverride).
// Aufruf: NODE_PATH=... node iphone-shot.mjs <outPrefix> [steps...]
// Steps: click:<text> wait:<ms> eval:<js> shot:<name>
import puppeteer from 'puppeteer-core'

const CHROMIUM = process.env.CHROMIUM || '/usr/bin/chromium'
const APP_URL = process.env.APP_URL || 'http://localhost:5173'
const outPrefix = process.argv[2] || '/tmp/iphone'
const steps = process.argv.slice(3)

const browser = await puppeteer.launch({
  executablePath: CHROMIUM,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
})

const page = await browser.newPage()
await page.emulate({
  viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
})

const session = await page.createCDPSession()
let insetsOk = false
try {
  await session.send('Emulation.setSafeAreaInsetsOverride', {
    insets: { top: 59, left: 0, bottom: 34, right: 0, topMax: 59, leftMax: 0, bottomMax: 34, rightMax: 0 },
  })
  insetsOk = true
} catch (err) {
  console.log('CDP setSafeAreaInsetsOverride FAILED:', err.message)
}

await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 60_000 })
await new Promise(r => setTimeout(r, 3500))

console.log('insets override:', insetsOk)
console.log('env probe:', await page.evaluate(() => {
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;padding-bottom:env(safe-area-inset-bottom,0px);padding-top:env(safe-area-inset-top,0px)'
  document.body.appendChild(el)
  const cs = getComputedStyle(el)
  const res = { top: cs.paddingTop, bottom: cs.paddingBottom, innerHeight: window.innerHeight, screenH: window.screen.height }
  el.remove()
  return res
}))

async function clickByText(text) {
  const ok = await page.evaluate(t => {
    const nodes = [...document.querySelectorAll('button, a, [role="button"], [role="tab"]')]
    const el = nodes.find(n => (n.innerText || n.getAttribute('aria-label') || n.title || '').trim().includes(t))
    if (!el) return false
    el.click()
    return true
  }, text)
  console.log(ok ? `ok click: ${text}` : `WARN click missing: ${text}`)
}

for (const step of steps) {
  const idx = step.indexOf(':')
  const kind = idx === -1 ? step : step.slice(0, idx)
  const arg = idx === -1 ? '' : step.slice(idx + 1)
  if (kind === 'click') await clickByText(arg)
  else if (kind === 'wait') await new Promise(r => setTimeout(r, Number(arg) || 500))
  else if (kind === 'eval') console.log('eval →', JSON.stringify(await page.evaluate(arg)))
  else if (kind === 'shot') {
    const p = `${outPrefix}-${arg}.png`
    await page.screenshot({ path: p })
    console.log('shot:', p)
  }
}

await browser.close()
