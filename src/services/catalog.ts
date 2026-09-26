import type {
  Category,
  ImportRow,
  Product,
  ProductInput,
  ProductList,
  ProductListParams,
} from '../types/catalog'
import { api, unwrap } from './api'

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
