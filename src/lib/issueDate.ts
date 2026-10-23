/**
 * The date of a new document. Numbers carry the month (F-202610/00002), so an invoice, delivery note or proforma can be
 * dated today's month up to now, or an earlier month on its last day only. Never the future. The server enforces the
 * same rule; this keeps the date field from offering anything else.
 *
 * Values are `datetime-local` strings: YYYY-MM-DDTHH:mm in the person's own time.
 */

const pad = (value: number) => String(value).padStart(2, '0')

function format(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function nowLocal(): string {
  return format(new Date())
}

/** The last day of the month of `value` at 23:59, e.g. 2026-09-30T23:59. */
export function lastDayOfMonth(value: string): string {
  const date = new Date(value)
  return format(new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59))
}

/** Only the date of a datetime-local value, as dd/mm/yyyy. */
export function shortDate(value: string): string {
  const date = new Date(value)
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}

/** True when the value is in an earlier month than today. */
export function isPastMonth(value: string): boolean {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  return date.getFullYear() * 12 + date.getMonth() < now.getFullYear() * 12 + now.getMonth()
}

/**
 * The nearest date the rules allow: the future comes back to now, and a day of a past month moves to that month's last
 * day. A value that is not a full date yet (the person is still typing) is left alone.
 */
export function snapIssueDate(value: string): string {
  const date = new Date(value)
  if (value === '' || Number.isNaN(date.getTime())) return value
  if (date.getTime() > Date.now()) return nowLocal()
  if (isPastMonth(value) && date.getDate() !== new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()) {
    return lastDayOfMonth(value)
  }
  return value
}

/** The value with its UTC offset (2026-10-31T23:59:00+05:00), so the server reads the month as the person sees it. */
export function withOffset(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const minutes = -date.getTimezoneOffset()
  const sign = minutes >= 0 ? '+' : '-'
  const abs = Math.abs(minutes)
  return `${value}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}
