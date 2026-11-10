import type { PaymentPeriod } from '../types/sales'

/** YYYY-MM-DD, written from the local calendar (never through UTC, which can move a date by one day). */
export function isoDay(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseIso(day: string): Date {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(year ?? 1970, (month ?? 1) - 1, date ?? 1)
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/** Monday of the week the date is in (the server counts weeks from Monday). */
function mondayOf(date: Date): Date {
  const shift = (date.getDay() + 6) % 7
  return addDays(date, -shift)
}

export type DayRange = { from: string; to: string }

/** The dates a report period covers, as the server reads them. `all` has no range. */
export function periodRange(period: PaymentPeriod, from: string, to: string, today = new Date()): DayRange | null {
  if (period === 'day') return { from: isoDay(today), to: isoDay(today) }
  if (period === 'week') {
    const monday = mondayOf(today)
    return { from: isoDay(monday), to: isoDay(addDays(monday, 6)) }
  }
  if (period === 'month') {
    return { from: isoDay(new Date(today.getFullYear(), today.getMonth(), 1)), to: isoDay(new Date(today.getFullYear(), today.getMonth() + 1, 0)) }
  }
  if (period === 'custom' && from && to) return { from, to }
  return null
}

/** The stretch right before the current one, of the same kind (last month, last week, yesterday, or the same number of days). */
export function previousRange(period: PaymentPeriod, from: string, to: string, today = new Date()): DayRange | null {
  const current = periodRange(period, from, to, today)
  if (!current) return null

  if (period === 'month') {
    const start = parseIso(current.from)
    return { from: isoDay(new Date(start.getFullYear(), start.getMonth() - 1, 1)), to: isoDay(new Date(start.getFullYear(), start.getMonth(), 0)) }
  }

  const start = parseIso(current.from)
  const end = parseIso(current.to)
  const length = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
  const previousEnd = addDays(start, -1)
  return { from: isoDay(addDays(previousEnd, -(length - 1))), to: isoDay(previousEnd) }
}

/** How much a number moved, in percent. Null when there is nothing to compare with (a zero before, something now). */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / Math.abs(previous)) * 100
}

/** The average of each value and the ones before it (a window of 7 days is the usual smoothing for daily sales). */
export function movingAverage(values: number[], window = 7): number[] {
  return values.map((_value, index) => {
    const slice = values.slice(Math.max(0, index - window + 1), index + 1)
    return Math.round(slice.reduce((sum, item) => sum + item, 0) / slice.length)
  })
}

export function cumulative(values: number[]): number[] {
  let running = 0
  return values.map((value) => {
    running += value
    return running
  })
}

/** The sales of each weekday added up, Monday first (index 0) to Sunday (index 6). */
export function weekdayTotals(points: { day: string; value: number }[]): number[] {
  const totals = [0, 0, 0, 0, 0, 0, 0]
  for (const point of points) {
    const weekday = (parseIso(point.day).getDay() + 6) % 7
    totals[weekday] = (totals[weekday] ?? 0) + point.value
  }
  return totals
}

/** Every day of the range, with the value of the day (zero when nothing happened), so two periods line up day by day. */
export function fillDays(range: DayRange, points: { day: string; value: number }[]): { day: string; value: number }[] {
  const byDay = new Map(points.map((point) => [point.day, point.value]))
  const out: { day: string; value: number }[] = []
  const end = parseIso(range.to)
  for (let cursor = parseIso(range.from); cursor <= end; cursor = addDays(cursor, 1)) {
    const key = isoDay(cursor)
    out.push({ day: key, value: byDay.get(key) ?? 0 })
  }
  return out
}

/** Open money by how long it has been open: 0-30, 31-60, 61-90 and over 90 days. */
export function agingBuckets(rows: { days: number; cents: number }[]): number[] {
  const buckets = [0, 0, 0, 0]
  for (const row of rows) {
    const index = row.days <= 30 ? 0 : row.days <= 60 ? 1 : row.days <= 90 ? 2 : 3
    buckets[index] = (buckets[index] ?? 0) + row.cents
  }
  return buckets
}
