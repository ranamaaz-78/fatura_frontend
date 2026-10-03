// Collects every translatable string the code already knows about: t('key', 'English') calls and the
// { labelKey: 'key', fallback: 'English' } tables. Writes scripts/i18n/catalog.en.json.
//
//   node scripts/i18n/extract.mjs          write the catalog and report problems
//   node scripts/i18n/extract.mjs --quiet  same, with less output (used by check.mjs)
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, SRC, isTranslateCall, parse, propName, rel, sourceFiles, stringValue, walk } from './lib.mjs'

const KEY_PROPS = ['key', 'labelKey', 'titleKey', 'nameKey']

export function readEnglishDictionary() {
  // en.ts is `export const en = { 'key': 'text', ... }`: read it as data.
  const code = fs.readFileSync(path.join(SRC, 'i18n', 'en.ts'), 'utf8')
  const dictionary = {}
  const pattern = /^\s*'((?:[^'\\]|\\.)*)':\s*'((?:[^'\\]|\\.)*)',?\s*$/gm
  for (const match of code.matchAll(pattern)) {
    dictionary[match[1].replaceAll("\\'", "'")] = match[2].replaceAll("\\'", "'").replaceAll('\\n', '\n').replaceAll('\\\\', '\\')
  }
  return dictionary
}

export function extract() {
  const used = new Map() // key -> [{ fallback, file }]
  const add = (key, fallback, file) => {
    if (!used.has(key)) used.set(key, [])
    used.get(key).push({ fallback, file })
  }

  for (const file of sourceFiles()) {
    const { ast } = parse(file)
    walk(ast, (node) => {
      if (isTranslateCall(node)) {
        const key = stringValue(node.arguments[0])
        const fallback = stringValue(node.arguments[1])
        if (key !== null && fallback !== null) add(key, fallback, rel(file))
      }

      if (node.type === 'ObjectExpression') {
        const props = new Map(node.properties.map((property) => [propName(property), property]))
        const fallback = props.has('fallback') ? stringValue(props.get('fallback').value) : null
        if (fallback === null) return
        for (const name of KEY_PROPS) {
          if (props.has(name)) {
            const key = stringValue(props.get(name).value)
            if (key !== null) add(key, fallback, rel(file))
          }
        }
      }
    })
  }

  const dictionary = readEnglishDictionary()
  const catalog = {}
  const conflicts = {}

  for (const [key, uses] of used) {
    const fallbacks = [...new Set(uses.map((use) => use.fallback))]
    // What English readers see today: the dictionary wins, else the first fallback.
    catalog[key] = dictionary[key] ?? fallbacks[0]
    if (fallbacks.length > 1 || (key in dictionary && fallbacks.some((text) => text !== dictionary[key]))) {
      conflicts[key] = { dictionary: dictionary[key] ?? null, fallbacks, files: [...new Set(uses.map((use) => use.file))] }
    }
  }

  // Dictionary entries nothing mentions by literal (they may be read through a variable key).
  const unused = Object.keys(dictionary).filter((key) => !used.has(key))
  for (const key of unused) catalog[key] = dictionary[key]

  return { catalog, conflicts, unused }
}

if (import.meta.url === `file://${process.argv[1].replaceAll('\\', '/')}` || process.argv[1]?.endsWith('extract.mjs')) {
  const { catalog, conflicts, unused } = extract()
  const sorted = Object.fromEntries(Object.entries(catalog).sort(([a], [b]) => a.localeCompare(b)))
  fs.writeFileSync(path.join(ROOT, 'scripts', 'i18n', 'catalog.en.json'), JSON.stringify(sorted, null, 2) + '\n')
  fs.writeFileSync(path.join(ROOT, 'scripts', 'i18n', 'conflicts.json'), JSON.stringify(conflicts, null, 2) + '\n')

  console.log(`${Object.keys(sorted).length} strings in the catalog (${unused.length} only in the dictionary)`)
  console.log(`${Object.keys(conflicts).length} keys with more than one English text`)
  if (!process.argv.includes('--quiet')) {
    for (const [key, info] of Object.entries(conflicts)) console.log(`  ${key}: ${JSON.stringify(info.dictionary ?? info.fallbacks)}`)
  }
}
