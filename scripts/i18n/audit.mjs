// Finds visible English that is not inside t(): JSX text, text props, text fields in objects, plain string
// lists, zod messages, thrown errors. Writes scripts/i18n/audit.json and prints a summary.
//
//   node scripts/i18n/audit.mjs            full report
//   node scripts/i18n/audit.mjs --count    only the number (used by check.mjs)
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, isTranslateCall, lineOf, parse, propName, rel, sourceFiles, stringValue, walk } from './lib.mjs'

export const TEXT_ATTRIBUTES = new Set([
  'placeholder', 'label', 'title', 'aria-label', 'aria-description', 'alt', 'hint', 'description', 'tooltip',
  'emptyText', 'subtitle', 'confirmLabel', 'actionLabel', 'helperText', 'legend', 'summary', 'content',
  'body', 'delta', 'note', 'caption', 'eyebrow', 'tag', 'cta', 'heading', 'text', 'message', 'name', 'unit', 'badge', 'error', 'loadingLabel', 'successMessage', 'confirmText', 'cancelLabel', 'emptyLabel', 'noResultsText', 'headline', 'kicker',
])

export const TEXT_PROPERTIES = new Set([
  'title', 'label', 'description', 'body', 'message', 'header', 'hint', 'placeholder', 'subtitle', 'tooltip',
  'heading', 'eyebrow', 'summary', 'question', 'answer', 'q', 'a', 'blurb', 'caption', 'actionLabel', 'cta',
  'note', 'tagline', 'confirmLabel', 'emptyText', 'text', 'hintText',
])

/** Names of constants whose string elements are shown to people (HERO_PROOF = ['...']). */
const SKIP_PROPERTIES_IN_CLASSES = /^(className|class|style|key|id|type|href|src|to|name|value|variant|tone|size|icon|path|url|role|autoComplete|inputMode|accept|pattern|htmlFor)$/

/** Does this string read like a sentence or a label a person sees? */
export function isHumanText(text) {
  const value = text.trim()
  if (value.length < 2 || !/[A-Za-zÀ-ɏ]/.test(value)) return false
  if (/^(https?:|mailto:|tel:|\/|#|\.\/|\.\.\/|data:)/.test(value)) return false
  if (/^[a-z]+(\.[a-z0-9_]+)+$/i.test(value) && !value.includes(' ')) return false // an i18n key
  if (/^#[0-9a-f]{3,8}$/i.test(value)) return false
  // Tailwind and other class lists: tokens made only of class-ish characters, at least one with - : / [ ].
  const tokens = value.split(/\s+/)
  if (tokens.every((token) => /^[a-z0-9:\/\[\]().%#!_,-]+$/i.test(token)) && tokens.some((token) => /[-:\/\[\]]/.test(token)) && !/^[A-Z]/.test(value)) return false
  // identifiers: camelCase, snake_case, kebab-case, a lone lower-case word
  if (!value.includes(' ') && (/^[a-z][a-zA-Z0-9]*$/.test(value) || /^[a-z0-9]+([_-][a-z0-9]+)+$/.test(value))) return false
  if (/^[A-Z_]+$/.test(value) && !value.includes(' ') && value.length < 4) return false // IVA, NIF
  return true
}

function insideTranslate(ancestors) {
  return ancestors.some((node) => isTranslateCall(node))
}

export function audit() {
  const findings = []

  for (const file of sourceFiles()) {
    const { code, ast } = parse(file)
    const add = (kind, node, text, extra = {}) =>
      findings.push({ file: rel(file), line: lineOf(code, node.start), kind, text: text.replace(/\s+/g, ' ').trim(), start: node.start, end: node.end, ...extra })

    walk(ast, (node, parent, key, ancestors) => {
      if (insideTranslate(ancestors)) return false

      if (node.type === 'JSXText') {
        const text = node.value.replace(/\s+/g, ' ').trim()
        if (text && /[A-Za-zÀ-ɏ]{2,}/.test(text) && !/^[^A-Za-z]*$/.test(text)) add('jsx-text', node, text)
        return
      }

      if (node.type === 'JSXAttribute' && node.name.type === 'JSXIdentifier' && TEXT_ATTRIBUTES.has(node.name.name)) {
        const value = node.value
        const text = value ? (value.type === 'Literal' ? value.value : value.type === 'JSXExpressionContainer' ? stringValue(value.expression) : null) : null
        if (typeof text === 'string' && isHumanText(text)) add('jsx-attribute', node, text, { name: node.name.name })
        return
      }

      if (node.type === 'Property' && !node.computed) {
        const name = propName(node)
        if (name && TEXT_PROPERTIES.has(name) && !SKIP_PROPERTIES_IN_CLASSES.test(name)) {
          const text = stringValue(node.value)
          if (text !== null && isHumanText(text)) add('object-field', node, text, { name })
          // template literal with words around ${}
          if (node.value.type === 'TemplateLiteral' && node.value.expressions.length > 0) {
            const words = node.value.quasis.map((q) => q.value.cooked).join('')
            if (/[A-Za-z]{3,}/.test(words)) add('template', node, words.replace(/\s+/g, ' '), { name })
          }
        }
      }

      // const FOO = ['Text', 'Text'] and { points: ['a', 'b'] }
      if (node.type === 'ArrayExpression' && node.elements.length > 0) {
        const strings = node.elements.map(stringValue)
        if (strings.every((text) => text !== null && isHumanText(text) && text.includes(' ') || (text !== null && /^[A-Z][a-z]/.test(text)))) {
          const owner = parent?.type === 'VariableDeclarator' ? 'const' : parent?.type === 'Property' ? propName(parent) : null
          if (owner === 'const' || (owner && TEXT_PROPERTIES.has(owner)) || owner === 'points' || owner === 'features') {
            node.elements.forEach((element) => add('string-list', element, stringValue(element)))
          }
        }
      }

      // zod: .min(8, 'Use at least 8 characters.') / z.email('Enter a valid ...')
      if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
        const method = node.callee.property?.name
        if (['min', 'max', 'email', 'regex', 'length', 'nonempty', 'url', 'refine'].includes(method)) {
          for (const arg of node.arguments) {
            const text = stringValue(arg)
            if (text !== null && isHumanText(text) && text.includes(' ')) add('zod', arg, text)
          }
        }
      }

      // 'Foo' in `cond ? 'Foo' : 'Bar'`, `x && 'Foo'`, `return 'Foo'`, and a sentence passed to a function
      if (node.type === 'Literal' && typeof node.value === 'string' && parent) {
        const text = node.value
        const words = text.trim().split(/\s+/).length
        const display = words >= 2 || /^[A-Z][a-z]{3,}/.test(text.trim())
        if (display && isHumanText(text)) {
          const isBranch = parent.type === 'ConditionalExpression' && key !== 'test'
          const isOperand = parent.type === 'LogicalExpression' && key === 'right'
          const isReturn = parent.type === 'ReturnStatement'
          const isArrow = parent.type === 'ArrowFunctionExpression' && key === 'body'
          const callName = parent.type === 'CallExpression' ? (parent.callee.name ?? parent.callee.property?.name) : null
          const isArg = callName && !['t', 'tp', 'cn', 'clsx', 'getItem', 'setItem', 'removeItem', 'querySelector', 'querySelectorAll', 'addEventListener', 'includes', 'startsWith', 'endsWith', 'get', 'has', 'set', 'open', 'append', 'replace', 'replaceAll', 'split', 'join', 'test', 'match', 'delete', 'add', 'from', 'indexOf', 'createElement', 'toLocaleString', 'toLocaleDateString'].includes(callName) && words >= 2
          const cn = ancestors.some((a) => a.type === 'CallExpression' && ['cn', 'clsx'].includes(a.callee.name))
          const alreadyListed = findings.some((f) => f.start === node.start)
          if ((isBranch || isOperand || isReturn || isArrow || isArg) && !cn && !alreadyListed) add('literal', node, text, { context: isBranch ? 'branch' : isOperand ? 'operand' : isReturn ? 'return' : isArrow ? 'arrow' : callName })
        }
      }

      // `${n} days left`: words around the values, anywhere a person might read them
      if (node.type === 'TemplateLiteral' && node.expressions.length > 0 && parent?.type !== 'TaggedTemplateExpression') {
        const words = node.quasis.map((q) => q.value.cooked).join('~').replace(/\s+/g, ' ')
        const cn = ancestors.some((a) => a.type === 'CallExpression' && ['cn', 'clsx', 'get', 'post', 'patch', 'delete', 'put', 'getItem', 'setItem', 'querySelector'].includes(a.callee.name ?? a.callee.property?.name))
        const pathLike = /^[/~]|^https?:|^[a-z]+[:=?&/]|rgba?\(|translate|px|calc\(|var\(|mm;/.test(words.trim())
        const english = words.split('~').some((part) => /[A-Za-z]{3,}\s[A-Za-z]{2,}|^\s*[A-Z][a-z]{3,}/.test(part.trim()))
        if (english && !cn && !pathLike && !findings.some((f) => f.start === node.start)) add('template-any', node, words.replaceAll('~', '${}'))
      }

      if (node.type === 'NewExpression' && node.callee.type === 'Identifier' && node.callee.name === 'Error') {
        const text = stringValue(node.arguments[0])
        if (text !== null && isHumanText(text)) add('error', node.arguments[0], text)
      }
    })
  }

  return findings
}

if (process.argv[1]?.endsWith('audit.mjs')) {
  const findings = audit()

  if (process.argv.includes('--count')) {
    console.log(findings.length)
  } else {
    fs.writeFileSync(path.join(ROOT, 'scripts', 'i18n', 'audit.json'), JSON.stringify(findings, null, 2) + '\n')

    const byKind = {}
    const byFile = {}
    for (const finding of findings) {
      byKind[finding.kind] = (byKind[finding.kind] ?? 0) + 1
      byFile[finding.file] = (byFile[finding.file] ?? 0) + 1
    }
    console.log(`${findings.length} hard-coded strings`)
    console.log(JSON.stringify(byKind))
    for (const [file, count] of Object.entries(byFile).sort((a, b) => b[1] - a[1])) console.log(String(count).padStart(4), file)
  }
}
