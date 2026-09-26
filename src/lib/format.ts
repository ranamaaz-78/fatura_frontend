export function formatCurrency(value: number, currency: string, locale: string, decimals = 2): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/** Headline prices drop a trailing `.00` so "$20" reads as a price, not a total. */
export function formatPlanPrice(value: number, currency: string): string {
  return formatCurrency(value, currency, 'en-US', Number.isInteger(value) ? 0 : 2)
}

export function formatNumber(value: number, decimals: number): string {
  return new Intl.NumberFormat(undefined, {
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

export function formatPercent(value: number): string {
  return `${formatNumber(value, 2)}%`
}
