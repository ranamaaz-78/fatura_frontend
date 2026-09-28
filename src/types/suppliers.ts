export type Supplier = {
  id: number
  code: string
  name: string
  company_name: string | null
  phone: string | null
  nif: string | null
  nie: string | null
  is_active: boolean
  products_count?: number
}

export type SupplierInput = {
  name: string
  company_name: string | null
  phone: string | null
  nif: string | null
  nie: string | null
}
