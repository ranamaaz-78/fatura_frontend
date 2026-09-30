import type {
  Category,
  ImportRow,
  Product,
  ProductInput,
  ProductList,
  ProductListParams,
  TaxRate,
} from '../types/catalog'
import { api, unwrap } from './api'

export function listTaxRates(): Promise<TaxRate[]> {
  return unwrap<TaxRate[]>(api.get('/app/tax-rates'))
}

export function createTaxRate(input: { name: string; rate: number }): Promise<TaxRate> {
  return unwrap<TaxRate>(api.post('/app/tax-rates', input))
}

export function updateTaxRate(id: number, input: { name: string; rate: number }): Promise<TaxRate> {
  return unwrap<TaxRate>(api.patch(`/app/tax-rates/${id}`, input))
}

export function deleteTaxRate(id: number): Promise<unknown> {
  return unwrap(api.delete(`/app/tax-rates/${id}`))
}

/** Recargo de equivalencia: the surcharge that some retailers pay on top of IVA. */
export function listRecargoRates(): Promise<TaxRate[]> {
  return unwrap<TaxRate[]>(api.get('/app/recargo-rates'))
}

export function createRecargoRate(input: { name: string; rate: number }): Promise<TaxRate> {
  return unwrap<TaxRate>(api.post('/app/recargo-rates', input))
}

export function updateRecargoRate(id: number, input: { name: string; rate: number }): Promise<TaxRate> {
  return unwrap<TaxRate>(api.patch(`/app/recargo-rates/${id}`, input))
}

export function deleteRecargoRate(id: number): Promise<unknown> {
  return unwrap(api.delete(`/app/recargo-rates/${id}`))
}

export function listCategories(): Promise<Category[]> {
  return unwrap<Category[]>(api.get('/app/categories'))
}

export function createCategory(name: string): Promise<Category> {
  return unwrap<Category>(api.post('/app/categories', { name }))
}

export function updateCategory(id: number, name: string): Promise<Category> {
  return unwrap<Category>(api.patch(`/app/categories/${id}`, { name }))
}

export function deleteCategory(id: number): Promise<unknown> {
  return unwrap(api.delete(`/app/categories/${id}`))
}

export function listProducts(params: ProductListParams): Promise<ProductList> {
  return unwrap<ProductList>(api.get('/app/products', { params }))
}

/** Every product, loaded once so the sale screen can filter without another request. */
export async function listAllProducts(): Promise<Product[]> {
  const first = await listProducts({ per_page: 100, page: 1 })
  const items = [...first.items]
  for (let page = 2; page <= first.meta.last_page; page += 1) {
    const next = await listProducts({ per_page: 100, page })
    items.push(...next.items)
  }
  return items
}

export function getProduct(id: number): Promise<Product> {
  return unwrap<Product>(api.get(`/app/products/${id}`))
}

export function createProduct(input: ProductInput): Promise<Product> {
  return unwrap<Product>(api.post('/app/products', input))
}

export function updateProduct(id: number, input: ProductInput): Promise<Product> {
  return unwrap<Product>(api.patch(`/app/products/${id}`, input))
}

export function deleteProduct(id: number): Promise<unknown> {
  return unwrap(api.delete(`/app/products/${id}`))
}

export function generateBarcode(): Promise<{ barcode: string }> {
  return unwrap<{ barcode: string }>(api.post('/app/products/barcode'))
}

export function importProducts(rows: ImportRow[]): Promise<{ created: number }> {
  return unwrap<{ created: number }>(api.post('/app/products/import', { rows }))
}
