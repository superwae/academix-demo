// Render each page of academix-pitch.html as its own PNG so we can eyeball
// the design before committing the PDF.
// Run: node docs/pitch/render-previews.mjs
import { chromium } from 'playwright'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { mkdir } from 'node:fs/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const htmlPath = resolve(__dirname, 'academix-pitch.html')
const outDir = resolve(__dirname, 'previews')
await mkdir(outDir, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1400, height: 990 }, // ~A4 landscape at ~120dpi
  deviceScaleFactor: 1.5,
})
const page = await context.newPage()
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)

const count = await page.locator('.page').count()
console.log(`Found ${count} pages`)

for (let i = 0; i < count; i++) {
  const el = page.locator('.page').nth(i)
  const out = resolve(outDir, `page-${String(i + 1).padStart(2, '0')}.png`)
  await el.screenshot({ path: out })
  console.log(`  wrote ${out}`)
}

await browser.close()
