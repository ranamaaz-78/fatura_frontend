import * as XLSX from 'xlsx'

export function centsToExcelAmount(cents: number): number {
  return Math.round(cents) / 100
}

export function downloadWorkbook(
  filename: string,
  sheets: { name: string; rows: Array<Array<string | number | null>> }[],
): void {
  const book = XLSX.utils.book_new()
  for (const sheet of sheets) {
    const safeName = sheet.name.slice(0, 31)
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(sheet.rows), safeName)
  }
  XLSX.writeFile(book, filename)
}

/** How a column is written in Excel: a real number with its own format, so it can be summed, sorted and filtered. */
export type ReportColumnFormat = 'text' | 'money' | 'count' | 'percent'

export type ReportSheetColumn = {
  header: string
  format: ReportColumnFormat
  /** Add this column up in a total row. */
  sum?: boolean
}

export type StyledReport = {
  filename: string
  /** The sheet and the big heading. */
  title: string
  /** Under the title: company, period, when it was made. */
  subtitle: string
  currency: string
  /** The numbers shown as tiles on screen, one line each: label, value and how to write the value. */
  summary: { label: string; value: string | number; format: ReportColumnFormat }[]
  summaryTitle: string
  tableTitle: string
  totalLabel: string
  columns: ReportSheetColumn[]
  /** One array per row, in the order of `columns`. Percent cells are given as 0-100. */
  rows: Array<Array<string | number | null>>
  /** More sheets, written as plain formatted tables (the sales per day, for instance). */
  extra?: { name: string; columns: ReportSheetColumn[]; rows: Array<Array<string | number | null>> }[]
}

const BRAND = 'FF1E3A8A'
const BRAND_SOFT = 'FFE8EEFB'
const LINE = 'FFD5DCE8'
const MUTED = 'FF64748B'

function currencySymbol(currency: string): string {
  try {
    const part = new Intl.NumberFormat('en', { style: 'currency', currency }).formatToParts(0).find((item) => item.type === 'currency')
    return (part?.value ?? currency).replace('US$', '$')
  } catch {
    return currency
  }
}

function numberFormat(format: ReportColumnFormat, symbol: string): string | undefined {
  if (format === 'money') return `#,##0.00 "${symbol}"`
  if (format === 'count') return '#,##0'
  if (format === 'percent') return '0.0%'
  return undefined
}

function cellValue(value: string | number | null, format: ReportColumnFormat): string | number | null {
  // 12.3 (percent) becomes 0.123 shown as 12.3%, rounded so floating point noise never reaches the cell.
  if (format === 'percent' && typeof value === 'number') return Math.round(value * 10) / 1000
  return value
}

function columnLetter(index: number): string {
  let letter = ''
  let number = index + 1
  while (number > 0) {
    const rest = (number - 1) % 26
    letter = String.fromCharCode(65 + rest) + letter
    number = Math.floor((number - 1) / 26)
  }
  return letter
}

/**
 * A report as a finished Excel sheet: a title, the summary figures, then the table with a styled header, widths that
 * fit, real number formats, light stripes, a filter on every column and a total row. Written with exceljs, which is
 * loaded only when someone exports.
 */
export async function downloadStyledReport(report: StyledReport): Promise<void> {
  const ExcelJS = (await import('exceljs')).default
  const symbol = currencySymbol(report.currency)
  const book = new ExcelJS.Workbook()
  book.creator = 'YK Digital Solutions'
  book.created = new Date()

  const sheet = book.addWorksheet(report.title.slice(0, 31), {
    views: [{ showGridLines: false }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  const columnCount = Math.max(report.columns.length, 2)
  const lastColumn = columnLetter(columnCount - 1)
  const thin = { style: 'thin' as const, color: { argb: LINE } }
  const border = { top: thin, left: thin, bottom: thin, right: thin }

  // ---- title
  sheet.mergeCells(`A1:${lastColumn}1`)
  const title = sheet.getCell('A1')
  title.value = report.title
  title.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } }
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } }
  title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  sheet.getRow(1).height = 34

  sheet.mergeCells(`A2:${lastColumn}2`)
  const subtitle = sheet.getCell('A2')
  subtitle.value = report.subtitle
  subtitle.font = { name: 'Calibri', size: 10, italic: true, color: { argb: MUTED } }
  subtitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  sheet.getRow(2).height = 20

  // ---- summary figures
  let row = 4
  const sectionHeading = (text: string) => {
    sheet.mergeCells(`A${row}:${lastColumn}${row}`)
    const cell = sheet.getCell(`A${row}`)
    cell.value = text.toUpperCase()
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: BRAND } }
    cell.border = { bottom: { style: 'medium', color: { argb: BRAND } } }
    sheet.getRow(row).height = 20
    row += 1
  }

  sectionHeading(report.summaryTitle)
  for (const item of report.summary) {
    const label = sheet.getCell(`A${row}`)
    label.value = item.label
    label.font = { name: 'Calibri', size: 11, color: { argb: 'FF334155' } }
    label.border = border
    label.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_SOFT } }

    const value = sheet.getCell(`B${row}`)
    value.value = cellValue(item.value, item.format)
    value.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } }
    value.alignment = { horizontal: 'right' }
    value.border = border
    const format = numberFormat(item.format, symbol)
    if (format) value.numFmt = format
    row += 1
  }

  // ---- the table
  row += 1
  sectionHeading(report.tableTitle)

  const headerRow = row
  report.columns.forEach((column, index) => {
    const cell = sheet.getCell(row, index + 1)
    cell.value = column.header
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } }
    cell.alignment = { vertical: 'middle', horizontal: column.format === 'text' ? 'left' : 'right', wrapText: true }
    cell.border = border
  })
  sheet.getRow(row).height = 24
  row += 1

  const firstData = row
  report.rows.forEach((values, rowIndex) => {
    report.columns.forEach((column, index) => {
      const cell = sheet.getCell(row, index + 1)
      cell.value = cellValue(values[index] ?? null, column.format)
      cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF0F172A' } }
      cell.border = border
      cell.alignment = { vertical: 'middle', horizontal: column.format === 'text' ? 'left' : 'right' }
      const format = numberFormat(column.format, symbol)
      if (format) cell.numFmt = format
      if (rowIndex % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F9FC' } }
    })
    row += 1
  })
  const lastData = row - 1

  // A filter on every column of the table, and a total row when there is something to add up.
  if (report.rows.length > 0) {
    sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: lastData, column: report.columns.length } }
  }

  if (report.rows.length > 0 && report.columns.some((column) => column.sum)) {
    report.columns.forEach((column, index) => {
      const cell = sheet.getCell(row, index + 1)
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_SOFT } }
      cell.border = { top: { style: 'medium', color: { argb: BRAND } }, left: thin, bottom: thin, right: thin }
      cell.alignment = { vertical: 'middle', horizontal: column.format === 'text' ? 'left' : 'right' }

      if (index === 0) {
        cell.value = report.totalLabel
      } else if (column.sum) {
        const letter = columnLetter(index)
        const total = report.rows.reduce((sum, values) => sum + (typeof values[index] === 'number' ? (values[index] as number) : 0), 0)
        cell.value = { formula: `SUM(${letter}${firstData}:${letter}${lastData})`, result: cellValue(total, column.format) as number }
        const format = numberFormat(column.format, symbol)
        if (format) cell.numFmt = format
      }
    })
    sheet.getRow(row).height = 22
  }

  // ---- widths: wide enough for the longest thing in the column, not wider than reads well
  const widthOf = (value: string | number | null, format: ReportColumnFormat): number => {
    if (value === null) return 0
    if (typeof value === 'number') return format === 'money' ? value.toFixed(2).length + 6 : String(value).length + 2
    return value.length
  }
  report.columns.forEach((column, index) => {
    const longest = Math.max(column.header.length + 3, ...report.rows.map((values) => widthOf(values[index] ?? null, column.format)))
    const summaryWidth = index <= 1 ? Math.max(0, ...report.summary.map((item) => (index === 0 ? item.label.length : String(item.value).length + 6))) : 0
    sheet.getColumn(index + 1).width = Math.min(48, Math.max(12, Math.max(longest, summaryWidth) + 2))
  })

  // ---- more sheets: plain formatted tables
  for (const extra of report.extra ?? []) {
    const other = book.addWorksheet(extra.name.slice(0, 31), { views: [{ showGridLines: false, state: 'frozen', ySplit: 1 }] })
    extra.columns.forEach((column, index) => {
      const cell = other.getCell(1, index + 1)
      cell.value = column.header
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } }
      cell.alignment = { horizontal: column.format === 'text' ? 'left' : 'right', vertical: 'middle' }
      cell.border = border
      other.getColumn(index + 1).width = Math.min(40, Math.max(14, column.header.length + 4))
    })
    other.getRow(1).height = 22
    extra.rows.forEach((values, rowIndex) => {
      extra.columns.forEach((column, index) => {
        const cell = other.getCell(rowIndex + 2, index + 1)
        cell.value = cellValue(values[index] ?? null, column.format)
        cell.font = { name: 'Calibri', size: 11 }
        cell.border = border
        cell.alignment = { horizontal: column.format === 'text' ? 'left' : 'right' }
        const format = numberFormat(column.format, symbol)
        if (format) cell.numFmt = format
        if (rowIndex % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F9FC' } }
      })
    })
    if (extra.rows.length > 0) {
      other.autoFilter = { from: { row: 1, column: 1 }, to: { row: extra.rows.length + 1, column: extra.columns.length } }
    }
  }

  const buffer = await book.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = report.filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}
