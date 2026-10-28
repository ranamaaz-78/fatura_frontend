/** One product of a purchase: how many came in and what each piece cost (cents). */
export type PurchaseLine = {
  id: number
  product_id: number | null
  article: string
  quantity: number
  unit_cost: number
  total_cents: number
}

/** One delivery from a supplier (a batch). Saving it adds the pieces to the stock. */
export type Purchase = {
  id: number
  number: string
  supplier_id: number | null
  supplier_name: string
  /** YYYY-MM-DD */
  purchased_on: string
  supplier_invoice_no: string | null
  notes: string | null
  total_cents: number
  /** Only in the list. */
  items_count?: number
  is_voided: boolean
  voided_at: string | null
  void_reason: string | null
  created_by_name?: string | null
  created_at: string | null
  /** Only when the purchase is opened. */
  lines?: PurchaseLine[]
}

export type PurchaseStatus = 'all' | 'active' | 'voided'

export type PurchaseListParams = {
  page?: number
  per_page?: number
  search?: string
  supplier_id?: number
  from?: string
  to?: string
  status?: PurchaseStatus
  /** Also send the lines of each purchase (the export needs them). */
  with_lines?: boolean
}

export type PurchaseList = {
  items: Purchase[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
  stats: { month_count: number; month_cents: number; month_suppliers: number }
}

export type PurchaseInput = {
  supplier_id: number
  purchased_on: string
  supplier_invoice_no: string | null
  notes: string | null
  lines: { product_id: number; quantity: number; unit_cost: number }[]
}
