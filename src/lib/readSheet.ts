import * as XLSX from 'xlsx'

/** The first sheet of an .xlsx, .xls or .csv file: its header row, and every row under it that is not blank. */
export function readSheet(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: 'array' })
    const first = workbook.SheetNames[0]
    if (!first) throw new Error('empty workbook')

    const matrix = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[first], {
      header: 1,
      blankrows: false,
      defval: '',
      raw: false,
    })

    const [headerRow = [], ...body] = matrix
    return {
      headers: headerRow.map((cell) => String(cell ?? '').trim()),
      rows: body.filter((row) => row.some((cell) => String(cell ?? '').trim() !== '')),
    }
  })
}
