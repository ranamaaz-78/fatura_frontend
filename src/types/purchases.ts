/** One product of a purchase: how many came in and what each piece cost (cents). */
export type PurchaseLine = {
  id: number
  product_id: number | null
  article: string
  /** The product's barcode, shown under the article. */
  barcode?: string | null
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
  /** IVA on the whole purchase: none, excluded (added on top of the prices) or included (already in them). */
  iva_mode?: 'none' | 'excluded' | 'included'
  iva_percent?: number
  base_cents?: number
  iva_cents?: number
  /** What is owed to the supplier, IVA included. */
  total_cents: number
  /** Only in the list. */
  items_count?: number
  is_voided: boolean
  /** True while it can still be changed: not cancelled and nothing paid for it in Supplier Payments (when opened). */
  can_edit?: boolean
  voided_at: string | null
  void_reason: string | null
  created_by_name?: string | null
  created_at: string | null
  /** Where this purchase stands in Supplier Payments (only when it is opened). */
  ledger_entry?: { id: number; number: string; paid_cents: number; owed_cents: number; payment_status: 'unpaid' | 'partial' | 'paid'; is_voided: boolean } | null
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
  iva_mode?: 'none' | 'excluded' | 'included'
  iva_percent?: number
  /** selling_price (cents) is sent only when the shop changed it with this delivery. */
  lines: { product_id: number; quantity: number; unit_cost: number; selling_price?: number }[]
}
