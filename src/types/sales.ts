export type SaleType = 'factura' | 'albaran' | 'abono'

export type PaymentStatus = 'pending' | 'paid'

export type Customer = {
  id: number
  code: string
  name: string
  company_name: string | null
  phone: string | null
  nif: string | null
  nie: string | null
  is_active: boolean
  documents_count?: number
}

export type CustomerInput = {
  name: string
  company_name: string | null
  phone: string | null
  nif: string | null
  nie: string | null
}

export type SaleLine = {
  position: number
  product_id: number | null
  sr_number: string | null
  article: string
  description: string | null
  quantity: number
  unit_price: number
  discount_percent: number
  iva_percent: number
  base_cents: number
  tax_cents: number
  total_cents: number
}

export type SaleDocument = {
  id: number
  type: SaleType
  number: string
  issued_at: string
  payment_status: PaymentStatus
  customer_id: number | null
  client_code: string | null
  client_name: string
  client_company: string | null
  client_phone: string | null
  client_nif: string | null
  client_nie: string | null
  notes: string | null
  base_cents: number
  tax_cents: number
  total_cents: number
  lines?: SaleLine[]
}

export type SaleLineInput = {
  product_id: number | null
  sr_number: string | null
  article: string
  description: string | null
  quantity: number
  unit_price: number
  discount_percent: number
  iva_percent: number
}

export type SaleInput = {
  type: SaleType
  issued_at: string
  payment_status: PaymentStatus
  customer_id: number | null
  save_customer: boolean
  client_name: string
  client_company: string | null
  client_phone: string | null
  client_nif: string | null
  client_nie: string | null
  notes: string | null
  lines: SaleLineInput[]
}
