// Render academix-pitch.html → academix-pitch.pdf using Playwright (Chromium).
// Run: node docs/pitch/render-pdf.mjs
import { chromium } from 'playwright'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const htmlPath = resolve(__dirname, 'academix-pitch.html')
const outPath = resolve(__dirname, 'academix-pitch.pdf')

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' })
// Give fonts a moment to load
await page.waitForTimeout(500)
await page.pdf({
  path: outPath,
  format: 'A4',
  landscape: true,
  printBackground: true,
  margin: { top: 0, bottom: 0, left: 0, right: 0 },
  preferCSSPageSize: true,
})
await browser.close()
console.log(`Wrote ${outPath}`)
