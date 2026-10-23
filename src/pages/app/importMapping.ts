import { t } from '../../i18n'
/** Every product field the import wizard can fill from a spreadsheet column. */
export const IMPORT_FIELDS = [
  'barcode',
  'short_code',
  'article',
  'description',
  'category',
  'supplier',
  'brand',
  'quantity',
  'minimum_stock',
  'buying_price',
  'iva_percent',
  'selling_price',
] as const

export type ImportField = (typeof IMPORT_FIELDS)[number]

export type ColumnMap = Record<ImportField, number | null>

/**
 * The column headings of the demo sheet, in both languages whatever language the app is in ("Article / Artículo"):
 * the people who fill it in may read either, and the importer knows each of them.
 */
const SHEET_LABELS: Record<ImportField, { en: string; es: string }> = {
  article: { en: 'Article', es: 'Artículo' },
  description: { en: 'Description', es: 'Descripción' },
  category: { en: 'Category', es: 'Categoría' },
  supplier: { en: 'Supplier', es: 'Proveedor' },
  brand: { en: 'Brand', es: 'Marca' },
  short_code: { en: 'Short code', es: 'Código corto' },
  barcode: { en: 'Barcode', es: 'Código de barras' },
  quantity: { en: 'Quantity', es: 'Cantidad' },
  minimum_stock: { en: 'Minimum stock', es: 'Stock mínimo' },
  buying_price: { en: 'Buying price', es: 'Precio de compra' },
  iva_percent: { en: 'IVA %', es: 'IVA %' },
  selling_price: { en: 'Selling price', es: 'Precio de venta' },
}

/** "Article / Artículo": what the demo sheet writes at the top of each column. */
export function sheetHeader(field: ImportField): string {
  const label = SHEET_LABELS[field]
  return label.en === label.es ? label.en : `${label.en} / ${label.es}`
}

/**
 * Spanish headers are in here too, because the catalogs these companies already
 * keep are usually written that way.
 */
const ALIASES: Record<ImportField, string[]> = {
  barcode: ['barcode', 'bar code', 'ean', 'ean13', 'codigo de barras', 'cod barras', 'codbar'],
  buying_price: ['buying price', 'buy price', 'cost', 'cost price', 'purchase price', 'coste', 'precio compra', 'precio de compra', 'compra'],
  selling_price: ['selling price', 'sale price', 'sell price', 'price', 'pvp', 'precio venta', 'precio de venta', 'venta'],
  iva_percent: ['iva', '% iva', 'iva %', 'vat', 'tax', 'tax rate', 'impuesto'],
  minimum_stock: ['minimum stock', 'min stock', 'reorder point', 'reorder', 'stock minimo', 'stock mínimo', 'minimo'],
  quantity: ['quantity', 'qty', 'stock', 'cantidad', 'units'],
  category: ['category', 'categoria', 'familia', 'family', 'group'],
  supplier: ['supplier', 'proveedor', 'proveedor nombre', 'vendor', 'supplier name', 'supplier code'],
  brand: ['brand', 'marca', 'maker', 'manufacturer'],
  short_code: ['short code', 'shortcode', 'codigo corto', 'código corto', 'image code', 'imagecode', 'image', 'photo', 'img', 'imagen'],
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
  'short_code',
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

    for (const alias of [sheetHeader(field), ...ALIASES[field]]) {
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
  article: 'Article',
  description: t('sales.description', 'Description'),
  category: 'Category',
  supplier: 'Supplier',
  brand: 'Brand',
  short_code: 'Short code',
  barcode: 'Bar code',
  quantity: 'Quantity',
  minimum_stock: 'Minimum stock',
  buying_price: 'Buying price',
  iva_percent: '% IVA',
  selling_price: 'Selling price',
}

export const REQUIRED_FIELDS: ImportField[] = ['article', 'buying_price', 'selling_price']
