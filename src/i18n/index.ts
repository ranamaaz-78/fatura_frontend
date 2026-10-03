import { en } from './en'
import { es } from './es'

export type Locale = 'en' | 'es'

export const LOCALES: { code: Locale; label: string; short: string }[] = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'es', label: 'Español', short: 'ES' },
]

const STORAGE_KEY = 'locale'
/** Set while we change language because the account says so, so a stale value can never loop. */
const ADOPT_FLAG = 'locale-adopt'

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'es'
}

function readStored(): Locale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isLocale(stored) ? stored : 'en'
  } catch {
    return 'en'
  }
}

let current: Locale = readStored()

if (typeof document !== 'undefined') document.documentElement.lang = current

export function getLocale(): Locale {
  return current
}

/** The BCP 47 tag the browser's Intl APIs want. */
export function intlLocale(): string {
  return current === 'es' ? 'es-ES' : 'en-US'
}

/**
 * Remember the language and reload, so every screen, table of labels and cache is rebuilt in it. Module-level
 * text (tab names, wizard steps) is read once at load, which is why the page is reloaded and not patched.
 */
export function setLocale(next: Locale): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, next)
    window.sessionStorage.removeItem(ADOPT_FLAG)
  } catch {
    /* private window: the choice lasts until the tab closes */
  }

  if (next === current) return

  current = next
  window.location.reload()
}

/**
 * The signed-in account has a language. If this browser is showing another one, switch once. Returns true
 * when the page is about to reload.
 */
export function adoptLocale(next: Locale | null | undefined): boolean {
  if (!isLocale(next) || next === current) {
    try {
      window.sessionStorage.removeItem(ADOPT_FLAG)
    } catch {
      /* ignore */
    }
    return false
  }

  try {
    // Already tried this one in this tab: do not loop.
    if (window.sessionStorage.getItem(ADOPT_FLAG) === next) return false
    window.sessionStorage.setItem(ADOPT_FLAG, next)
    window.localStorage.setItem(STORAGE_KEY, next)
  } catch {
    return false
  }

  current = next
  window.location.reload()
  return true
}

export type Vars = Record<string, string | number>

function lookup(key: string, fallback: string): string {
  if (current === 'es') return es[key] ?? en[key] ?? fallback
  return en[key] ?? fallback
}

function fill(text: string, vars?: Vars): string {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match))
}

/** The text for `key` in the current language; `fallback` is the English source. `{name}` is replaced from `vars`. */
export function t(key: string, fallback: string, vars?: Vars): string {
  return fill(lookup(key, fallback), vars)
}

/** Singular or plural by count. The text holds both forms: `'{count} day|{count} days'`. */
export function tp(key: string, fallback: string, count: number, vars?: Vars): string {
  const forms = lookup(key, fallback).split('|')
  const form = count === 1 ? forms[0] : (forms[1] ?? forms[0])
  return fill(form, { count, ...vars })
}
