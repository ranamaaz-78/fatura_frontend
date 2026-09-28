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
