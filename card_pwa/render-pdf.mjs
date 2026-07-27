// render-pdf.mjs — läuft aus card_pwa/ (node_modules), rendert Dateien im Repo-Root
import puppeteer from 'puppeteer-core'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const CHROMIUM = process.env.CHROMIUM || '/usr/bin/chromium'
const ROOT = path.resolve(import.meta.dirname, '..')
const SRC = path.join(ROOT, 'card-pwa-architektur.html')
const OUT = path.join(ROOT, 'card-pwa-architektur.pdf')

const browser = await puppeteer.launch({
  executablePath: CHROMIUM,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage()
await page.goto(pathToFileURL(SRC).href, { waitUntil: 'load' })

await page.waitForFunction(() => {
  const blocks = document.querySelectorAll('pre.mermaid, .mermaid')
  return blocks.length > 0 && [...blocks].every(b => b.querySelector('svg'))
}, { timeout: 30_000 })

await page.emulateMediaType('print')
await page.pdf({
  path: OUT,
  format: 'A4',
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  preferCSSPageSize: false,
})
await browser.close()
console.log(`geschrieben: ${OUT}`)
