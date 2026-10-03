// Shared helpers for the i18n tools: find the source files, parse them, walk the tree.
import fs from 'node:fs'
import path from 'node:path'
import { parseAst } from 'rolldown/parseAst'

export const ROOT = path.resolve(import.meta.dirname, '..', '..')
export const SRC = path.join(ROOT, 'src')

/** Files the translators care about. Developer-only pages and the dictionaries themselves are skipped. */
export function sourceFiles(dir = SRC, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['i18n', 'dev', 'assets'].includes(entry.name)) continue
      sourceFiles(full, out)
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      out.push(full)
    }
  }
  return out
}

export function parse(file) {
  const code = fs.readFileSync(file, 'utf8')
  return { code, ast: parseAst(code, { lang: file.endsWith('.tsx') ? 'tsx' : 'ts' }) }
}

/** Depth-first walk. visit(node, parent, key, ancestors) may return false to skip the children. */
export function walk(node, visit, parent = null, key = null, ancestors = []) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach((child, index) => walk(child, visit, parent, key, ancestors, index))
    return
  }
  if (typeof node.type === 'string') {
    if (visit(node, parent, key, ancestors) === false) return
    ancestors = [...ancestors, node]
    parent = node
  }
  for (const name of Object.keys(node)) {
    if (name === 'type' || name === 'start' || name === 'end') continue
    walk(node[name], visit, parent, name, ancestors)
  }
}

export function lineOf(code, offset) {
  let line = 1
  for (let i = 0; i < offset; i++) if (code.charCodeAt(i) === 10) line++
  return line
}

/** The plain text of a string literal or an expression-free template literal, else null. */
export function stringValue(node) {
  if (!node) return null
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0 && node.quasis.length === 1) {
    return node.quasis[0].value.cooked
  }
  return null
}

export function propName(property) {
  if (property.type !== 'Property' || property.computed) return null
  if (property.key.type === 'Identifier') return property.key.name
  if (property.key.type === 'Literal') return String(property.key.value)
  return null
}

export function isTranslateCall(node) {
  return node.type === 'CallExpression' && node.callee.type === 'Identifier' && (node.callee.name === 't' || node.callee.name === 'tp')
}

export function rel(file) {
  return path.relative(SRC, file).replaceAll('\\', '/')
}

/** Escape text for a single-quoted TS string. */
export function quote(text) {
  return "'" + text.replaceAll('\\', '\\\\').replaceAll("'", "\\'").replaceAll('\n', '\\n') + "'"
}
