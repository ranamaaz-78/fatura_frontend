/**
 * What a price, percentage or amount field lets through while someone types: digits and one decimal
 * separator, nothing else. "1,234.56" (pasted) keeps its last separator as the decimal one.
 */
export function onlyDecimal(value: string): string {
  const cleaned = value.replace(/[^\d.,]/g, '')
  const comma = cleaned.lastIndexOf(',')
  const dot = cleaned.lastIndexOf('.')

  if (comma >= 0 && dot >= 0) {
    const decimal = Math.max(comma, dot)
    const whole = cleaned.slice(0, decimal).replace(/[.,]/g, '')
    return `${whole}${cleaned[decimal]}${cleaned.slice(decimal + 1).replace(/[.,]/g, '')}`
  }

  const first = cleaned.search(/[.,]/)
  if (first < 0) return cleaned
  return cleaned.slice(0, first + 1) + cleaned.slice(first + 1).replace(/[.,]/g, '')
}

/** Whole numbers only: quantities, copies, user limits. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}
