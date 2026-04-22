/**
 * Migrate directional Tailwind classes to logical ones so the UI mirrors
 * correctly under <html dir="rtl">.
 *
 * Replacements (word-boundary aware, with modifier support):
 *   ml-X  → ms-X       pl-X → ps-X      text-left  → text-start
 *   mr-X  → me-X       pr-X → pe-X      text-right → text-end
 *   left-X → start-X   right-X → end-X
 *
 * Also handles common responsive / state variants (sm:, md:, lg:, hover:,
 * focus:, etc.) via the word-boundary regex.
 *
 * Usage: node scripts/migrate-to-logical-tailwind.mjs
 *
 * The script only rewrites files inside `src/` with extensions tsx/ts/jsx/js.
 * It prints a summary of the changes.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { glob } from 'node:fs/promises'

const PAIRS = [
  { from: /\bml-/g, to: 'ms-' },
  { from: /\bmr-/g, to: 'me-' },
  { from: /\bpl-/g, to: 'ps-' },
  { from: /\bpr-/g, to: 'pe-' },
  { from: /\btext-left\b/g, to: 'text-start' },
  { from: /\btext-right\b/g, to: 'text-end' },
  // left-/right- as position utilities (left-0, right-4, etc.).
  // Guard against partial matches like "top-left" by requiring start-of-word.
  { from: /(?<![\w-])left-/g, to: 'start-' },
  { from: /(?<![\w-])right-/g, to: 'end-' },
  // Negative margins
  { from: /-ml-/g, to: '-ms-' },
  { from: /-mr-/g, to: '-me-' },
]

function migrate(content) {
  let out = content
  let changes = 0
  for (const { from, to } of PAIRS) {
    const before = out
    out = out.replace(from, to)
    if (out !== before) {
      changes += before.match(from)?.length ?? 0
    }
  }
  return { out, changes }
}

const patterns = [
  'src/**/*.tsx',
  'src/**/*.ts',
  'src/**/*.jsx',
  'src/**/*.js',
]

let totalFiles = 0
let totalChanges = 0

for (const pattern of patterns) {
  for await (const entry of glob(pattern)) {
    // Skip i18n locale JSON etc.
    if (entry.includes('node_modules')) continue
    const content = await readFile(entry, 'utf8')
    const { out, changes } = migrate(content)
    if (changes > 0) {
      await writeFile(entry, out, 'utf8')
      console.log(`  ${entry} — ${changes} replacements`)
      totalFiles += 1
      totalChanges += changes
    }
  }
}

console.log('')
console.log(`Done: ${totalChanges} replacements in ${totalFiles} files.`)
