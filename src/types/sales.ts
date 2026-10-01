/** abono is closed to new documents; older rows still load with it. */
export type SaleType = 'factura' | 'albaran' | 'quotation' | 'proforma' | 'abono'

export type IssuableType = Exclude<SaleType, 'abono'>

export type PaymentStatus = 'pending' | 'partial' | 'paid'

export type SaleDisplayStatus = PaymentStatus | 'voided'

export function isSaleVoided(document: { voided_at?: string | null; is_voided?: boolean }): boolean {
  return Boolean(document.is_voided || document.voided_at)
}

export function isSaleConverted(document: {
  converted_at?: string | null
  is_converted?: boolean
}): boolean {
  return Boolean(document.is_converted || document.converted_at)
}

/** An open quotation that has run past its week. The server decides; this only reads it. */
export function isSaleExpired(document: { is_expired?: boolean; type?: string; expires_at?: string | null; converted_at?: string | null }): boolean {
  if (document.is_expired !== undefined) return document.is_expired
  return Boolean(
    document.type === 'quotation' && !document.converted_at && document.expires_at && new Date(document.expires_at).getTime() < Date.now(),
  )
}

/** Whole days until a quotation expires; 0 on its last day, negative once it is over. */
export function quoteDaysLeft(expiresAt: string): number {
  const end = new Date(expiresAt)
  const today = new Date()
  const endDay = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  const nowDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((endDay - nowDay) / 86_400_000)
}

export function saleDisplayStatus(document: {
  payment_status: PaymentStatus
  voided_at?: string | null
  is_voided?: boolean
}): SaleDisplayStatus {
  return isSaleVoided(document) ? 'voided' : document.payment_status
}

export type CompanyPaymentMethod = {
  id: number
  name: string
  is_active: boolean
  sort_order: number
  documents_count?: number
  settlements_count?: number
}

export type Customer = {
  id: number
  code: string
  name: string
  company_name: string | null
  phone: string | null
  nif: string | null
  nie: string | null
  address: string | null
  is_active: boolean
  documents_count?: number
}

export type CustomerInput = {
  name: string
  company_name: string | null
  phone: string | null
  nif: string | null
  nie: string | null
  address?: string | null
}

export type DiscountType = 'percent' | 'amount'

export type SaleLine = {
  id?: number
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
  /** This line's share of the bill discount. base_cents and tax_cents are already net of it. */
  bill_discount_cents?: number
  settled_quantity?: number
  remaining_quantity?: number
}

export type SaleSettlementLine = {
  line_id: number
  quantity: number
  unit_price: number
  total_cents: number
}

export type SaleSettlement = {
  id: number
  payment_method_id: number
  payment_method: { id: number; name: string } | null
  total_cents: number
  created_at: string
  lines?: SaleSettlementLine[]
}

export type SaleSettleInput = {
  payment_method_id: number
  lines: { line_id: number; quantity: number; unit_price: number }[]
}

export type SaleSettlementQtyInput = {
  lines: { line_id: number; quantity: number }[]
}

export type SaleDocument = {
  id: number
  type: SaleType
  number: string
  issued_at: string
  /** Quotations only: the last moment they can still be edited or converted. */
  expires_at?: string | null
  is_expired?: boolean
  payment_status: PaymentStatus
  payment_method_id: number | null
  payment_method: { id: number; name: string } | null
  voided_at: string | null
  void_reason: string | null
  is_voided: boolean
  converted_to_id: number | null
  converted_at: string | null
  is_converted: boolean
  converted_to?: { id: number; type: SaleType; number: string } | null
  customer_id: number | null
  client_code: string | null
  client_name: string
  client_company: string | null
  client_phone: string | null
  client_nif: string | null
  client_nie: string | null
  client_address: string | null
  notes: string | null
  base_cents: number
  tax_cents: number
  /** A discount on the whole bill. base_cents is the taxable base after it. */
  discount_type: DiscountType | null
  /** The percent, or the amount in cents, depending on discount_type. */
  discount_value: number | null
  discount_cents: number
  /** Recargo de equivalencia on an invoice: the rate it was issued with, and its amount. */
  recargo_percent: number | null
  recargo_cents: number
  total_cents: number
  settled_cents: number
  is_partial: boolean
  lines?: SaleLine[]
  settlements?: SaleSettlement[]
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
  payment_method_id?: number | null
  /** A discount on the whole bill: a percent, or an amount in cents. Not on proformas. */
  discount_type?: DiscountType | null
  discount_value?: number | null
  /** A rate from Settings. The server works out the amount. Invoices only. */
  recargo_rate_id?: number | null
  customer_id: number | null
  save_customer: boolean
  client_name: string
  client_company: string | null
  client_phone: string | null
  client_nif: string | null
  client_nie: string | null
  client_address: string | null
  lines: SaleLineInput[]
}

export type SaleListParams = {
  search?: string
  type?: SaleType
  payment_status?: PaymentStatus
  display_status?: SaleDisplayStatus
  page?: number
  per_page?: number
}

export type SaleList = {
  items: SaleDocument[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
  counts: { all: number; pending: number; paid: number; partial: number; voided: number }
  stats: {
    total_cents: number
    paid_count: number
    paid_cents: number
    pending_count: number
    pending_cents: number
    settled_cents: number
    month_count: number
    month_cents: number
    client_count: number
  }
}

export type PaymentStatusBadge = 'received' | 'pending' | 'partial'

export type PaymentEntry = {
  id: string
  kind: 'document' | 'settlement'
  status: PaymentStatusBadge
  document_id: number
  document_type: SaleType
  document_number: string
  customer_id: number | null
  client_code: string | null
  client_name: string
  client_company: string | null
  payment_method_id: number | null
  payment_method: { id: number; name: string } | null
  amount_cents: number
  outstanding_cents: number
  paid_at: string | null
}

export type PaymentPeriod = 'all' | 'month' | 'week' | 'day' | 'custom'

export type PaymentListParams = {
  search?: string
  period?: PaymentPeriod
  from?: string
  to?: string
  status?: PaymentStatusBadge | 'all'
  payment_method_id?: string
  page?: number
  per_page?: number
}

export type PaymentList = {
  items: PaymentEntry[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
  counts: { all: number; month: number; week: number; day: number }
  stats: {
    received_cents: number
    received_count: number
    pending_cents: number
    pending_count: number
    outstanding_cents: number
    outstanding_count: number
    client_count: number
  }
}
