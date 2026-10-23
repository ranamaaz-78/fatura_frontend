import * as XLSX from 'xlsx'
import { IMPORT_FIELDS, sheetHeader, type ImportField } from '../pages/app/importMapping'
import type { ReportRow } from '../types/reports'
import { centsToExcelAmount } from './exportReport'
import { COLUMN_WIDTH } from './productDemoSheet'

export type StockBand = 'out' | 'low' | 'ok'

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

/** One stock row as the Products import sheet reads it: prices are plain amounts (12.50), not cents. */
function cell(row: ReportRow, field: ImportField): string | number {
  switch (field) {
    case 'quantity':
    case 'minimum_stock':
    case 'iva_percent':
      return Number(row[field] ?? 0)
    case 'buying_price':
      return centsToExcelAmount(Number(row.buying_price_cents ?? 0))
    case 'selling_price':
      return centsToExcelAmount(Number(row.selling_price_cents ?? 0))
    default:
      return text(row[field])
  }
}

/** The products that are out of stock, low and/or still in stock, in the same columns (and headings) as the demo import sheet. */
export function stockSheetRows(rows: ReportRow[], bands: StockBand[]): ReportRow[] {
  return rows.filter((row) => bands.includes(row.band as StockBand))
}

export function downloadStockSheet(rows: ReportRow[], bands: StockBand[], sheetName: string, fileName: string): number {
  const picked = stockSheetRows(rows, bands)
  const sheet = XLSX.utils.aoa_to_sheet([
    IMPORT_FIELDS.map((field) => sheetHeader(field)),
    ...picked.map((row) => IMPORT_FIELDS.map((field) => cell(row, field))),
  ])
  sheet['!cols'] = IMPORT_FIELDS.map((field) => ({ wch: COLUMN_WIDTH[field] }))

  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, sheetName.slice(0, 31))
  XLSX.writeFile(book, fileName)

  return picked.length
}
