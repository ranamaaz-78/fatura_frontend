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
 * A sale line is priced net of IVA. Discount comes off that base, then IVA is
 * added, and each step is rounded to the cent once.
 */
export function lineTotals(
  quantity: number,
  unitCents: number,
  discountPercent: number,
  ivaPercent: number,
): { base: number; tax: number; total: number } {
  const base = Math.round(quantity * unitCents * (1 - discountPercent / 100))
  const tax = Math.round(base * (ivaPercent / 100))
  return { base, tax, total: base + tax }
}

/**
 * Splits a discount over amounts in proportion to their size, to the cent, so the shares add up
 * to exactly the discount. Leftover cents go to the largest remainders, earlier items first.
 * The server uses the same rule, which is why the form's totals match the issued document.
 */
export function allocateDiscount(bases: number[], discountCents: number): number[] {
  const total = bases.reduce((sum, base) => sum + base, 0)
  const shares = bases.map(() => 0)
  if (discountCents <= 0 || total <= 0) return shares

  const remainders = bases.map(() => 0)
  let given = 0
  bases.forEach((base, index) => {
    const exact = discountCents * base
    shares[index] = Math.floor(exact / total)
    remainders[index] = exact % total
    given += shares[index]
  })

  const order = bases.map((_base, index) => index).sort((a, b) => remainders[b] - remainders[a] || a - b)
  for (let i = 0; i < discountCents - given; i++) shares[order[i]] += 1

  return shares
}

/** Split a gross amount into the net price. Catalog selling prices are already net. */
export function netOfIva(sellingCents: number, ivaPercent: number): number {
  if (ivaPercent <= 0) return sellingCents
  return Math.round(sellingCents / (1 + ivaPercent / 100))
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
