// The translation gate. Exits 1 when Spanish is incomplete or inconsistent.
//
//   npm run i18n:check
//
//   - every key the code uses has a Spanish text, none empty
//   - {placeholders}, :placeholders and pipe plurals match the English
//   - no Spanish text for a key that no longer exists
//   - no new hard-coded English outside the allow-list below
import fs from 'node:fs'
import path from 'node:path'
import { ROOT } from './lib.mjs'
import { extract } from './extract.mjs'
import { audit } from './audit.mjs'

const { catalog } = extract()
const es = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'i18n', 'es.json'), 'utf8'))
const problems = []

const tokens = (text) => [...text.matchAll(/\{(\w+)\}|(?<![A-Za-z]):([a-z_]+)/g)].map((m) => m[1] ?? `:${m[2]}`).sort().join(',')
const forms = (text) => text.split('|').length

for (const [key, text] of Object.entries(catalog)) {
  const spanish = es[key]
  if (spanish === undefined) problems.push(`missing   ${key}  ("${text.slice(0, 60)}")`)
  else if (spanish.trim() === '') problems.push(`empty     ${key}`)
  else {
    if (tokens(spanish) !== tokens(text)) problems.push(`tokens    ${key}  en=[${tokens(text)}] es=[${tokens(spanish)}]`)
    if (forms(spanish) !== forms(text)) problems.push(`plural    ${key}  en has ${forms(text)} form(s), es has ${forms(spanish)}`)
  }
}
for (const key of Object.keys(es)) if (!(key in catalog)) problems.push(`unused    ${key}`)

/** Visible strings that read the same in both languages, or are not shown to people. */
const ALLOW_FILES = ['lib/printFonts.ts', 'lib/printLabels.ts', 'components/ui/BarcodeSvg.tsx', 'main.tsx']
const ALLOW_TEXT = /^(WhatsApp|PDF|IVA|· IVA|mm\)?|\.pdf|F-2026\/0185\.pdf|N\.I\.F \/ N\.I\.E|Albarán|Bearer \$\{\}|xMidYMid meet)$|must be used within|^empty workbook$/
const hardCoded = audit().filter((f) => !ALLOW_FILES.includes(f.file) && !ALLOW_TEXT.test(f.text))
for (const f of hardCoded) problems.push(`hardcoded ${f.file}:${f.line}  ${f.kind}  "${f.text.slice(0, 70)}"`)

if (problems.length) {
  console.log(problems.join('\n'))
  console.log(`\n${problems.length} problem(s)`)
  process.exit(1)
}
console.log(`i18n ok: ${Object.keys(catalog).length} strings, all translated`)
