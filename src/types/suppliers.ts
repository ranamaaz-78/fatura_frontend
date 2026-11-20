export type Supplier = {
  id: number
  code: string
  name: string
  company_name: string | null
  phone: string | null
  email?: string | null
  nif: string | null
  nie: string | null
  /** A private note about the supplier; never printed. */
  remarks?: string | null
  is_active: boolean
  products_count?: number
}

export type SupplierInput = {
  name: string
  company_name: string | null
  phone: string | null
  email?: string | null
  nif: string | null
  nie: string | null
  remarks?: string | null
}
