export type TaxRate = {
  id: number
  name: string
  rate: number
}

export type Category = {
  id: number
  name: string
  products_count?: number
}

/** `buying_price` and `selling_price` are cents, the way the API sends them. */
export type Product = {
  id: number
  sr_number: string | null
  article: string
  description: string | null
  quantity: number
  category_id: number | null
  category?: string | null
  supplier_id: number | null
  supplier?: string | null
  brand: string | null
  image_code: string | null
  barcode: string
  barcode_generated: boolean
  buying_price: number
  /** The buying price before its latest change. Null until it has changed once. */
  last_buying_price: number | null
  selling_price: number
  margin_percent: number
  iva_percent: number
  minimum_stock: number
}

export type ProductStockFilter = 'all' | 'low' | 'out' | 'no_barcode'

export type ProductListParams = {
  page?: number
  search?: string
  category_id?: number | null
  stock?: ProductStockFilter
  per_page?: number
}

export type ProductList = {
  items: Product[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
  counts: { all: number; low: number; out: number; no_barcode: number }
  stock_value: number
}

export type ProductInput = {
  article: string
  description: string | null
  brand: string | null
  image_code: string | null
  sr_number: string | null
  barcode: string | null
  category_id: number | null
  supplier_id: number | null
  quantity: number
  minimum_stock: number
  buying_price: number
  selling_price: number
  iva_percent: number
}

/** One row of the import grid. Category travels as a name, not an id. */
export type ImportRow = {
  sr_number: string | null
  article: string
  description: string | null
  category: string | null
  supplier: string | null
  brand: string | null
  image_code: string | null
  barcode: string | null
  quantity: number
  minimum_stock: number
  buying_price: number
  iva_percent: number
  selling_price: number
}

export type ImportRowError = {
  row: number
  messages: string[]
}

/** A file in the product image folder. `file_url` is the authenticated stream. */
export type ProductImage = {
  uuid: string
  name: string
  mime: string
  size_bytes: number
  file_url: string
  created_at: string | null
}

export type ProductImageUploadError = {
  file: string
  message: string
}

export type ProductImageUpload = {
  images: ProductImage[]
  errors: ProductImageUploadError[]
}
