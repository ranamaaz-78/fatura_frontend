import { t } from '../../i18n'
/** Every product field the import wizard can fill from a spreadsheet column. */
export const IMPORT_FIELDS = [
  'sr_number',
  'article',
  'description',
  'category',
  'supplier',
  'brand',
  'image_code',
  'barcode',
  'quantity',
  'minimum_stock',
  'buying_price',
  'iva_percent',
  'selling_price',
] as const

export type ImportField = (typeof IMPORT_FIELDS)[number]

export type ColumnMap = Record<ImportField, number | null>

/**
 * Spanish headers are in here too, because the catalogs these companies already
 * keep are usually written that way.
 */
const ALIASES: Record<ImportField, string[]> = {
  barcode: ['barcode', 'bar code', 'ean', 'ean13', 'codigo de barras', 'cod barras', 'codbar'],
  buying_price: ['buying price', 'buy price', 'cost', 'cost price', 'purchase price', 'coste', 'precio compra', 'compra'],
  selling_price: ['selling price', 'sale price', 'sell price', 'price', 'pvp', 'precio venta', 'venta'],
  iva_percent: ['iva', '% iva', 'iva %', 'vat', 'tax', 'tax rate', 'impuesto'],
  minimum_stock: ['minimum stock', 'min stock', 'reorder point', 'reorder', 'stock minimo', 'minimo'],
  quantity: ['quantity', 'qty', 'stock', 'cantidad', 'units'],
  category: ['category', 'categoria', 'familia', 'family', 'group'],
  supplier: ['supplier', 'proveedor', 'proveedor nombre', 'vendor', 'supplier name', 'supplier code'],
  brand: ['brand', 'marca', 'maker', 'manufacturer'],
  image_code: ['image code', 'imagecode', 'image', 'photo', 'img', 'imagen'],
  sr_number: ['sr number', 'sr no', 'sr', 'serial', 'serial number', 'reference', 'ref', 'sku', 'codigo'],
  article: ['article', 'articulo', 'product', 'product name', 'item', 'name', 'nombre', 'denominacion'],
  description: ['description', 'desc', 'descripcion', 'detail', 'details'],
}

/**
 * Specific names are claimed first, so a sheet with both "Cost" and "Price"
 * does not let "Price" grab the buying column.
 */
const MATCH_ORDER: ImportField[] = [
  'barcode',
  'buying_price',
  'selling_price',
  'iva_percent',
  'minimum_stock',
  'quantity',
  'category',
  'supplier',
  'brand',
  'image_code',
  'sr_number',
  'article',
  'description',
]

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export function autoMapColumns(headers: string[]): ColumnMap {
  const normalized = headers.map(normalize)
  const used = new Set<number>()
  const map = Object.fromEntries(IMPORT_FIELDS.map((field) => [field, null])) as ColumnMap

  function claim(field: ImportField, matches: (header: string, alias: string) => boolean) {
    if (map[field] !== null) return

    for (const alias of ALIASES[field]) {
      const target = normalize(alias)
      const index = normalized.findIndex(
        (header, position) => !used.has(position) && header !== '' && matches(header, target),
      )
      if (index >= 0) {
        map[field] = index
        used.add(index)
        return
      }
    }
  }

  for (const field of MATCH_ORDER) claim(field, (header, alias) => header === alias)
  for (const field of MATCH_ORDER) claim(field, (header, alias) => header.includes(alias))

  return map
}

export const FIELD_LABELS: Record<ImportField, string> = {
  sr_number: 'Sr number',
  article: 'Article',
  description: t('sales.description', 'Description'),
  category: 'Category',
  supplier: 'Supplier',
  brand: 'Brand',
  image_code: 'Image code',
  barcode: 'Bar code',
  quantity: 'Quantity',
  minimum_stock: 'Minimum stock',
  buying_price: 'Buying price',
  iva_percent: '% IVA',
  selling_price: 'Selling price',
}

export const REQUIRED_FIELDS: ImportField[] = ['article', 'buying_price', 'selling_price']
