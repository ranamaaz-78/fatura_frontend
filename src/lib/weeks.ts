export type MonthWeek = {
  /** 1-based: week 1 is days 1-7, week 2 days 8-14, and so on. The last one runs to the end of the month. */
  index: number
  /** YYYY-MM-DD, inclusive. */
  from: string
  to: string
}

function iso(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** The days of a "YYYY-MM" month. */
export function daysInMonth(month: string): number {
  const [year, number] = month.split('-').map(Number)
  return new Date(year, number, 0).getDate()
}

/** First and last day of a "YYYY-MM" month. */
export function monthRange(month: string): { from: string; to: string } {
  const [year, number] = month.split('-').map(Number)
  return { from: iso(year, number, 1), to: iso(year, number, daysInMonth(month)) }
}

/** The weeks of a "YYYY-MM" month: 7-day blocks from the 1st, the last one cut at the month's end (so 4 or 5 of them). */
export function weeksOfMonth(month: string): MonthWeek[] {
  const [year, number] = month.split('-').map(Number)
  const last = daysInMonth(month)
  const weeks: MonthWeek[] = []

  for (let start = 1, index = 1; start <= last; start += 7, index += 1) {
    weeks.push({ index, from: iso(year, number, start), to: iso(year, number, Math.min(start + 6, last)) })
  }

  return weeks
}
