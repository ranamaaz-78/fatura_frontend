// Wraps the hard-coded English the audit finds in t('key', 'English').
//
//   node scripts/i18n/codemod.mjs --dry      show what would change
//   node scripts/i18n/codemod.mjs            rewrite the files
//
// Only the safe cases are rewritten: JSX text, text props, text fields in objects, string lists, zod messages and
// thrown errors. Template literals, plurals and ternaries are left for a person.
import fs from 'node:fs'
import path from 'node:path'
import { SRC, parse, quote, rel } from './lib.mjs'
import { audit } from './audit.mjs'
import { extract } from './extract.mjs'

const DRY = process.argv.includes('--dry')

/** Names, units and terms that read the same in both languages. */
const KEEP = new Set(['IVA', 'PDF', 'WhatsApp', 'mm', 'mm)', '.pdf', '· IVA', 'F-2026/0185.pdf', 'N.I.F / N.I.E', 'Albarán', 'NIF/NIE/CIF:', 'Geist'])
const SKIP_FILES = ['lib/printFonts.ts', 'components/ui/BarcodeSvg.tsx']
const KINDS = new Set(['jsx-text', 'jsx-attribute', 'object-field', 'string-list', 'zod', 'error'])

const { catalog } = extract()
const byText = new Map()
for (const [key, text] of Object.entries(catalog)) if (!byText.has(text)) byText.set(text, key)
const used = new Set(Object.keys(catalog))

function baseName(file) {
  const name = path.basename(file).replace(/\.(tsx|ts)$/, '')
  return name.charAt(0).toLowerCase() + name.slice(1)
}

function slug(text) {
  const words = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
  let out = ''
  for (const word of words) {
    if ((out + '_' + word).length > 42 && out) break
    out = out ? out + '_' + word : word
  }
  return out || 'text'
}

const created = {}

function keyFor(file, text) {
  if (byText.has(text)) return byText.get(text)
  const base = `${baseName(file)}.${slug(text)}`
  let key = base
  let n = 2
  while (used.has(key)) key = `${base}_${n++}`
  used.add(key)
  byText.set(text, key)
  created[key] = text
  return key
}

function importPath(file) {
  const target = path.relative(path.dirname(file), path.join(SRC, 'i18n')).replaceAll('\\', '/')
  return target.startsWith('.') ? target : `./${target}`
}

function withImport(file, code, ast, edits) {
  const imports = ast.body.filter((node) => node.type === 'ImportDeclaration')
  const existing = imports.find((node) => /\/i18n(\/index)?$/.test(node.source.value))

  if (existing) {
    const names = existing.specifiers.filter((s) => s.type === 'ImportSpecifier').map((s) => s.local.name)
    if (names.includes('t')) return
    const text = code.slice(existing.start, existing.end)
    if (existing.specifiers.length && text.includes('{')) {
      edits.push({ start: existing.start, end: existing.end, text: text.replace('{', '{ t,').replace('{ t, ', '{ t, ') })
    } else {
      edits.push({ start: existing.end, end: existing.end, text: `\nimport { t } from '${importPath(file)}'` })
    }
    return
  }

  const last = imports.at(-1)
  const insertAt = last ? last.end : 0
  edits.push({ start: insertAt, end: insertAt, text: `${last ? '\n' : ''}import { t } from '${importPath(file)}'${last ? '' : '\n'}` })
}

// Errors a person can actually see (a failed export) are translated; hook and boot errors are for developers.
const VISIBLE_ERROR_FILES = ['lib/downloadSheetImage.ts', 'lib/exportSaleSheet.tsx']
const findings = audit().filter(
  (f) => KINDS.has(f.kind) && !KEEP.has(f.text) && !SKIP_FILES.includes(f.file) && (f.kind !== 'error' || VISIBLE_ERROR_FILES.includes(f.file)),
)
const byFile = new Map()
for (const finding of findings) {
  if (!byFile.has(finding.file)) byFile.set(finding.file, [])
  byFile.get(finding.file).push(finding)
}

let total = 0
for (const [relative, list] of byFile) {
  const file = path.join(SRC, relative)
  const { code, ast } = parse(file)
  const edits = []

  for (const finding of list) {
    const raw = code.slice(finding.start, finding.end)
    const text = finding.text
    let replacement

    if (finding.kind === 'jsx-text') {
      const lead = raw.match(/^\s*/)[0]
      const trail = raw.match(/\s*$/)[0]
      replacement = `${lead}{t(${quote(keyFor(file, text))}, ${quote(text)})}${trail}`
    } else if (finding.kind === 'jsx-attribute') {
      // name="Text" or name={'Text'}
      const name = finding.name
      replacement = `${name}={t(${quote(keyFor(file, text))}, ${quote(text)})}`
    } else if (finding.kind === 'object-field') {
      const colon = raw.indexOf(':')
      const head = raw.slice(0, colon + 1)
      replacement = `${head} t(${quote(keyFor(file, text))}, ${quote(text)})`
    } else {
      // string-list items, zod and error arguments are the bare literal
      replacement = `t(${quote(keyFor(file, text))}, ${quote(text)})`
    }

    edits.push({ start: finding.start, end: finding.end, text: replacement })
    total++
  }

  withImport(file, code, ast, edits)

  if (DRY) {
    console.log(`${relative}: ${list.length}`)
    continue
  }

  let out = code
  for (const edit of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, edit.start) + edit.text + out.slice(edit.end)
  fs.writeFileSync(file, out)
}

console.log(`${DRY ? 'would wrap' : 'wrapped'} ${total} strings in ${byFile.size} files; ${Object.keys(created).length} new keys`)
if (!DRY) fs.writeFileSync(path.join(SRC, '..', 'scripts', 'i18n', 'created-keys.json'), JSON.stringify(created, null, 2) + '\n')
void rel
