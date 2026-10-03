import { intlLocale, t } from '../i18n'

/** `_locale` is kept so older call sites still compile; the language always comes from the app setting. */
export function formatCurrency(value: number, currency: string, _locale?: string, decimals = 2): string {
  return new Intl.NumberFormat(intlLocale(), {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/** Headline prices drop a trailing `.00` so "$20" reads as a price, not a total. */
export function formatPlanPrice(value: number, currency: string): string {
  return formatCurrency(value, currency, undefined, Number.isInteger(value) ? 0 : 2)
}

export function formatNumber(value: number, decimals: number): string {
  return new Intl.NumberFormat(intlLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatDate(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear())
  return `${day}/${month}/${year}`
}

export function formatDateTime(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${formatDate(date)} ${hours}:${minutes}`
}

/** "1 October 2026" / "1 de octubre de 2026". */
export function formatLongDate(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat(intlLocale(), { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

/** A month name in the current language, from "2026-10". */
export function formatMonth(value: string, style: 'short' | 'long' = 'short'): string {
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat(intlLocale(), { month: style }).format(new Date(year, (month ?? 1) - 1, 1))
}

export function formatPercent(value: number): string {
  return `${formatNumber(value, 2)}%`
}

/** A billing interval as a person reads it: "month", "quarter", "year". */
export function formatInterval(interval: string): string {
  if (interval === 'month') return t('plan.interval.month', 'month')
  if (interval === 'quarter') return t('plan.interval.quarter', 'quarter')
  if (interval === 'year') return t('plan.interval.year', 'year')
  return interval
}
