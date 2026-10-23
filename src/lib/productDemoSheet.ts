import * as XLSX from 'xlsx'
import { t } from '../i18n'
import { downloadFileName, fileDate } from './fileName'
import { IMPORT_FIELDS, REQUIRED_FIELDS, sheetHeader, type ImportField } from '../pages/app/importMapping'

type SampleRow = Record<ImportField, string | number>

/**
 * Three obvious test products. Prices are plain amounts (12.50), the way a
 * person types them in Excel; the import turns them into cents.
 */
const SAMPLES: SampleRow[] = [
  {
    article: 'Sample Product 1 - USB Cable',
    description: '',
    category: 'Cables',
    supplier: '',
    brand: 'Demo Brand',
    short_code: 'sample-1',
    barcode: '8412345678905',
    quantity: 25,
    minimum_stock: 5,
    buying_price: 2.5,
    iva_percent: 21,
    selling_price: 5,
  },
  {
    article: 'Sample Product 2 - Wireless Mouse',
    description: '',
    category: 'Peripherals',
    supplier: '',
    brand: 'Demo Brand',
    short_code: 'sample-2',
    barcode: '',
    quantity: 20,
    minimum_stock: 3,
    buying_price: 8,
    iva_percent: 21,
    selling_price: 15.9,
  },
  {
    article: 'Sample Product 3 - HDMI Adapter',
    description: '',
    category: 'Cables',
    supplier: '',
    brand: 'Demo Brand',
    short_code: '',
    barcode: '',
    quantity: 0,
    minimum_stock: 2,
    buying_price: 4.2,
    iva_percent: 21,
    selling_price: 9.99,
  },
]

const HINTS: Record<ImportField, string> = {
  article: 'Product name.',
  description: 'Optional.',
  category: 'Created automatically if it does not exist yet.',
  supplier: 'Must already exist in your suppliers list. Leave empty if unsure.',
  brand: 'Optional.',
  short_code: 'Optional. A short code for the product. A picture in your image folder with the same name is shown for it.',
  barcode: 'Leave empty and a barcode is generated for you. Must be unique.',
  quantity: 'Whole number. Empty counts as 0.',
  minimum_stock: 'Whole number. Empty counts as 0.',
  buying_price: 'What you pay, without IVA. Example: 2.50',
  iva_percent: 'A rate from your settings, for example 21, 10 or 4.',
  selling_price: 'Must be higher than the buying price, without IVA.',
}

export const COLUMN_WIDTH: Record<ImportField, number> = {
  article: 36,
  description: 46,
  category: 22,
  supplier: 20,
  brand: 16,
  short_code: 24,
  barcode: 28,
  quantity: 10,
  minimum_stock: 26,
  buying_price: 26,
  iva_percent: 10,
  selling_price: 24,
}

/**
 * Builds the template workbook: sheet 1 is exactly what the importer reads
 * (header row + 3 sample products), sheet 2 explains each column.
 */
export function downloadProductDemoSheet(companyName?: string | null): void {
  // Both languages in every heading: "Article / Artículo". The importer recognises either one, or both.
  const headers = IMPORT_FIELDS.map((field) => sheetHeader(field))
  const demoNote = t('import.demoRowNote', 'Demo row: delete it before importing your real catalog.')
  const body = SAMPLES.map((sample) =>
    IMPORT_FIELDS.map((field) => (field === 'description' ? demoNote : sample[field])),
  )

  const products = XLSX.utils.aoa_to_sheet([headers, ...body])
  products['!cols'] = IMPORT_FIELDS.map((field) => ({ wch: COLUMN_WIDTH[field] }))

  const guide = XLSX.utils.aoa_to_sheet([
    [t('import.demoColumn', 'Column'), t('import.demoRequired', 'Required'), t('import.demoHelp', 'How to fill it')],
    ...IMPORT_FIELDS.map((field) => [
      sheetHeader(field),
      REQUIRED_FIELDS.includes(field) ? t('common.yes', 'Yes') : t('common.no', 'No'),
      HINTS[field],
    ]),
    [],
    [t('import.demoNote', 'Keep the Products sheet first, delete the 3 sample rows, then add your own products.')],
  ])
  guide['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 70 }]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, products, t('import.demoSheetName', 'Products'))
  XLSX.utils.book_append_sheet(workbook, guide, t('import.demoGuideName', 'How to fill'))

  // Company - Product import template - 2026-10-19.xlsx
  XLSX.writeFile(workbook, downloadFileName([companyName, t('import.templateName', 'Product import template'), fileDate()], 'xlsx'))
}
