import { formatCurrency } from './format'

export function formatCents(cents: number, currency: string): string {
  return formatCurrency(cents / 100, currency, 'en-US')
}

/** Cents back to the text an amount input shows, always with two decimals. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2)
}

/**
 * Reads a number that may use either separator, so "1.234,56" and "1,234.56"
 * both come back as 1234.56.
 */
export function parseNumber(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (value === null || value === undefined) return null

  const clean = value.replace(/[^\d,.-]/g, '')
  if (clean === '' || clean === '-') return null

  const lastComma = clean.lastIndexOf(',')
  const lastDot = clean.lastIndexOf('.')
  let normalized = clean

  if (lastComma >= 0 && lastDot >= 0) {
    // Whichever separator comes last is the decimal one.
    normalized =
      lastComma > lastDot
        ? clean.replace(/\./g, '').replace(',', '.')
        : clean.replace(/,/g, '')
  } else if (lastComma >= 0) {
    normalized = clean.replace(',', '.')
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function parseAmountToCents(value: string | number | null | undefined): number | null {
  const parsed = parseNumber(value)
  return parsed === null ? null : Math.round(parsed * 100)
}

/**
 * The one pricing rule for the catalog: cost plus margin, then IVA on top.
 * Rounded once so a chain of steps cannot drift.
 */
export function sellingPriceCents(
  buyingCents: number,
  marginPercent: number,
  ivaPercent: number,
): number {
  return Math.round(buyingCents * (1 + marginPercent / 100) * (1 + ivaPercent / 100))
}
