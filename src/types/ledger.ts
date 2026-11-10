export type PaymentStatus = 'unpaid' | 'partial' | 'paid'

/** One payment made to the supplier against a ledger entry. */
export type LedgerPayment = {
  id: number
  /** YYYY-MM-DD */
  paid_on: string
  amount_cents: number
  payment_method_id: number | null
  payment_method_name: string | null
  note: string | null
  created_by_name?: string | null
}

/**
 * One entry of the supplier ledger: something bought from a supplier, in words, for an amount, and what has been paid
 * against it. A record book only: no products, no stock.
 */
export type LedgerEntry = {
  id: number
  number: string
  supplier_id: number | null
  supplier_name: string
  /** YYYY-MM-DD */
  bill_date: string
  description: string
  reference: string | null
  notes: string | null
  amount_cents: number
  paid_cents: number
  owed_cents: number
  payment_status: PaymentStatus
  is_voided: boolean
  voided_at: string | null
  void_reason: string | null
  created_by_name?: string | null
  created_at: string | null
  /** The day of the last payment, and how many payments there are. */
  last_paid_on?: string | null
  payments_count?: number
  /** Only when the entry is opened. */
  payments?: LedgerPayment[]
}

export type LedgerStatus = 'all' | 'active' | 'voided'

export type LedgerListParams = {
  page?: number
  per_page?: number
  search?: string
  supplier_id?: number
  from?: string
  to?: string
  status?: LedgerStatus
  payment?: 'all' | PaymentStatus
}

export type LedgerList = {
  items: LedgerEntry[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
  stats: { owed_cents: number; month_bought_cents: number; month_paid_cents: number; open_count: number }
}

export type LedgerInput = {
  supplier_id: number
  /** YYYY-MM-DD */
  bill_date: string
  description: string
  reference: string | null
  notes: string | null
  amount_cents: number
  /** What was paid when it was written down (0 or missing = nothing yet) and how. */
  paid_cents?: number
  payment_method_id?: number | null
}

export type LedgerPaymentInput = {
  amount_cents: number
  paid_on: string
  payment_method_id: number
  note: string | null
}

/** A supplier in the "by supplier" view. */
export type LedgerSupplierRow = {
  supplier_id: number
  supplier_name: string
  entries_count: number
  bought_cents: number
  paid_cents: number
  owed_cents: number
  last_bill_date: string | null
  last_paid_on: string | null
  /** The date of the oldest entry that is not fully paid. */
  oldest_open_on: string | null
}

/** One line of a supplier's account: a purchase (bought) or a payment (paid), with the balance after it. */
export type LedgerTransaction = {
  date: string
  type: 'bill' | 'payment'
  number: string
  details: string
  reference: string | null
  bought_cents: number
  paid_cents: number
  balance_cents: number
}

export type LedgerStatement = {
  supplier: { id: number; name: string; code: string }
  from: string | null
  to: string | null
  /** What was owed when the period began, what was bought and paid in it, and what is owed at its end. */
  opening_cents: number
  bought_cents: number
  paid_cents: number
  closing_cents: number
  /** Everything owed to this supplier today, whatever the dates. */
  owed_cents: number
  transactions: LedgerTransaction[]
  entries: LedgerEntry[]
}
