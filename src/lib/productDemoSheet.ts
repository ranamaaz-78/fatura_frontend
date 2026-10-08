import * as XLSX from 'xlsx'
import { t } from '../i18n'
import { FIELD_LABELS, IMPORT_FIELDS, REQUIRED_FIELDS, type ImportField } from '../pages/app/importMapping'

type SampleRow = Record<ImportField, string | number>

/**
 * Three obvious test products. Prices are plain amounts (12.50), the way a
 * person types them in Excel; the import turns them into cents.
 */
const SAMPLES: SampleRow[] = [
  {
    sr_number: 'SAMPLE-001',
    article: 'Sample Product 1 - USB Cable',
    description: '',
    category: 'Cables',
    supplier: '',
    brand: 'Demo Brand',
    image_code: 'sample-1',
    barcode: '8412345678905',
    quantity: 25,
    minimum_stock: 5,
    buying_price: 2.5,
    iva_percent: 21,
    selling_price: 5,
  },
  {
    sr_number: 'SAMPLE-002',
    article: 'Sample Product 2 - Wireless Mouse',
    description: '',
    category: 'Peripherals',
    supplier: '',
    brand: 'Demo Brand',
    image_code: 'sample-2',
    barcode: '',
    quantity: 10,
    minimum_stock: 3,
    buying_price: 8,
    iva_percent: 21,
    selling_price: 15.9,
  },
  {
    sr_number: 'SAMPLE-003',
    article: 'Sample Product 3 - HDMI Adapter',
    description: '',
    category: 'Cables',
    supplier: '',
    brand: 'Demo Brand',
    image_code: '',
    barcode: '',
    quantity: 0,
    minimum_stock: 2,
    buying_price: 4.2,
    iva_percent: 21,
    selling_price: 9.99,
  },
]

const HINTS: Record<ImportField, string> = {
  sr_number: 'Your own reference or SKU. Must be unique.',
  article: 'Product name.',
  description: 'Optional.',
  category: 'Created automatically if it does not exist yet.',
  supplier: 'Must already exist in your suppliers list. Leave empty if unsure.',
  brand: 'Optional.',
  image_code: 'Optional. Name of a picture in your image folder.',
  barcode: 'Leave empty and a barcode is generated for you. Must be unique.',
  quantity: 'Whole number. Empty counts as 0.',
  minimum_stock: 'Whole number. Empty counts as 0.',
  buying_price: 'What you pay, without IVA. Example: 2.50',
  iva_percent: 'A rate from your settings, for example 21, 10 or 4.',
  selling_price: 'Must be higher than the buying price, without IVA.',
}

const COLUMN_WIDTH: Record<ImportField, number> = {
  sr_number: 14,
  article: 36,
  description: 44,
  category: 14,
  supplier: 14,
  brand: 14,
  image_code: 12,
  barcode: 16,
  quantity: 10,
  minimum_stock: 14,
  buying_price: 13,
  iva_percent: 8,
  selling_price: 13,
}

/**
 * Builds the template workbook: sheet 1 is exactly what the importer reads
 * (header row + 3 sample products), sheet 2 explains each column.
 */
export function downloadProductDemoSheet(): void {
  const headers = IMPORT_FIELDS.map((field) => FIELD_LABELS[field])
  const demoNote = t('import.demoRowNote', 'Demo row: delete it before importing your real catalog.')
  const body = SAMPLES.map((sample) =>
    IMPORT_FIELDS.map((field) => (field === 'description' ? demoNote : sample[field])),
  )

  const products = XLSX.utils.aoa_to_sheet([headers, ...body])
  products['!cols'] = IMPORT_FIELDS.map((field) => ({ wch: COLUMN_WIDTH[field] }))

  const guide = XLSX.utils.aoa_to_sheet([
    [t('import.demoColumn', 'Column'), t('import.demoRequired', 'Required'), t('import.demoHelp', 'How to fill it')],
    ...IMPORT_FIELDS.map((field) => [
      FIELD_LABELS[field],
      REQUIRED_FIELDS.includes(field) ? t('common.yes', 'Yes') : t('common.no', 'No'),
      HINTS[field],
    ]),
    [],
    [t('import.demoNote', 'Keep the Products sheet first, delete the 3 sample rows, then add your own products.')],
  ])
  guide['!cols'] = [{ wch: 18 }, { wch: 10 }, { wch: 70 }]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, products, t('import.demoSheetName', 'Products'))
  XLSX.utils.book_append_sheet(workbook, guide, t('import.demoGuideName', 'How to fill'))

  XLSX.writeFile(workbook, 'products-demo-sheet.xlsx')
}
